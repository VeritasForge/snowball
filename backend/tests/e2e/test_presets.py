"""Preset endpoints e2e (Happy/Boundary/Error) — Plan B2.5.

Auth comes from the conftest `client` fixture, which overrides
get_current_user with a single fixed user (no real JWT). Wrong-owner cases
use a second client bound to a different user id, mirroring the established
pattern in test_routes_error_cases.py.

Rate-limit note: with no real Bearer token, user_id_key_func falls back to
the client IP, so every request shares one limiter key. The autouse
_reset_limiter fixture clears counters before each test so a single test's
intentional 429 (TestPresetRateLimit) does not bleed into the others.
"""
from http import HTTPStatus
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from main import app
from src.snowball.infrastructure.db import get_session
from src.snowball.adapters.api.routes import get_current_user, limiter
from src.snowball.domain.entities import User, UserId


@pytest.fixture(autouse=True)
def _reset_limiter():
    # Clear per-key counters so IP-shared keys don't leak across tests.
    limiter.reset()
    yield


def _make_user_client(session, user_id: UserId) -> TestClient:
    """TestClient bound to a specific user (for wrong-owner / 404-unified)."""
    user = User(id=user_id, email=f"{user_id}@test.com", password_hash="hash")
    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_current_user] = lambda: user
    return TestClient(app, base_url="http://testserver/api/v1")


def _three_fund(name: str = "3-Fund") -> dict:
    return {
        "name": name,
        "items": [
            {"name": "SPY ETF", "code": "SPY", "category": "주식", "target_weight": 60},
            {"name": "TLT", "code": "TLT", "category": "채권", "target_weight": 30},
            {"name": "GLD", "code": "GLD", "category": "원자재", "target_weight": 10},
        ],
    }


class TestPresetCRUD:
    def test_create_list_delete_full_flow(self, client: TestClient):
        # [Happy] create → 201 + id + items, then list, then delete
        r1 = client.post("/presets", json=_three_fund())
        assert r1.status_code == HTTPStatus.CREATED
        body = r1.json()
        assert body["id"] is not None
        assert body["name"] == "3-Fund"
        assert len(body["items"]) == 3
        # aggregate child has no surfaced id → None, not a fake placeholder
        assert body["items"][0]["id"] is None
        assert body["created_at"]  # non-empty isoformat
        preset_id = body["id"]

        r2 = client.get("/presets")
        assert r2.status_code == HTTPStatus.OK
        assert any(p["id"] == preset_id for p in r2.json())

        r3 = client.delete(f"/presets/{preset_id}")
        assert r3.status_code == HTTPStatus.OK
        assert r3.json() == {"ok": True}

        r4 = client.get("/presets")
        assert all(p["id"] != preset_id for p in r4.json())

    def test_list_empty_initially(self, client: TestClient):
        # [Boundary] no presets yet → empty list
        r = client.get("/presets")
        assert r.status_code == HTTPStatus.OK
        assert r.json() == []

    def test_create_codeless_item_roundtrips_null_code(self, client: TestClient):
        # [Boundary] code-less item → code serialized as null
        r = client.post("/presets", json={
            "name": "Cashy",
            "items": [{"name": "현금", "category": "현금", "target_weight": 100}],
        })
        assert r.status_code == HTTPStatus.CREATED
        assert r.json()["items"][0]["code"] is None


class TestPresetValidation:
    def test_create_rejects_empty_items(self, client: TestClient):
        # [Error] min_length=1 → 422
        r = client.post("/presets", json={"name": "X", "items": []})
        assert r.status_code == HTTPStatus.UNPROCESSABLE_ENTITY

    def test_create_rejects_extra_user_id(self, client: TestClient):
        # [Error] extra='forbid' blocks mass-assignment → 422
        r = client.post("/presets", json={
            "name": "X",
            "items": [{"name": "A", "category": "주식", "target_weight": 100}],
            "user_id": str(uuid4()),
        })
        assert r.status_code == HTTPStatus.UNPROCESSABLE_ENTITY

    def test_create_rejects_duplicate_match_key(self, client: TestClient):
        # [Error] no_duplicate_match_key validator → 422
        r = client.post("/presets", json={
            "name": "X",
            "items": [
                {"name": "A", "code": "SPY", "category": "주식", "target_weight": 50},
                {"name": "B", "code": "SPY", "category": "주식", "target_weight": 50},
            ],
        })
        assert r.status_code == HTTPStatus.UNPROCESSABLE_ENTITY


class TestApplyPreset:
    def test_apply_to_empty_account_creates_all(self, client: TestClient):
        # [Happy] empty account → created_count == N, updated_count 0
        acc = client.post("/accounts", json={"name": "Acc", "cash": 0}).json()
        preset_id = client.post("/presets", json={
            "name": "P", "items": [
                {"name": "SPY", "code": "SPY", "category": "주식", "target_weight": 60},
                {"name": "TLT", "code": "TLT", "category": "채권", "target_weight": 40},
            ],
        }).json()["id"]

        r = client.post(f"/presets/{preset_id}/apply/{acc['id']}")
        assert r.status_code == HTTPStatus.OK
        body = r.json()
        assert body["created_count"] == 2
        assert body["updated_count"] == 0
        assert body["weight_sum"] == 100.0
        assert len(body["account"]["assets"]) == 2

    def test_apply_overwrites_matching_asset_by_code(self, client: TestClient):
        # [Happy] code match → target_weight overwritten, avg/quantity preserved
        acc = client.post("/accounts", json={"name": "Acc", "cash": 0}).json()
        client.post("/assets", json={
            "account_id": acc["id"], "name": "SPY ETF", "code": "SPY",
            "category": "주식", "target_weight": 20,
            "avg_price": 580, "quantity": 10, "current_price": 600,
        })
        preset_id = client.post("/presets", json={
            "name": "P", "items": [
                {"name": "SPY ETF", "code": "SPY", "category": "주식", "target_weight": 70},
            ],
        }).json()["id"]

        r = client.post(f"/presets/{preset_id}/apply/{acc['id']}")
        assert r.status_code == HTTPStatus.OK
        body = r.json()
        assert body["updated_count"] == 1
        assert body["created_count"] == 0
        spy = next(a for a in body["account"]["assets"] if a["code"] == "SPY")
        assert spy["target_weight"] == 70
        assert spy["avg_price"] == 580  # preserved
        assert spy["quantity"] == 10

    def test_apply_name_match_for_codeless_item(self, client: TestClient):
        # [Boundary] code-less item matches existing asset by name
        acc = client.post("/accounts", json={"name": "Acc", "cash": 0}).json()
        client.post("/assets", json={
            "account_id": acc["id"], "name": "현금", "category": "현금", "target_weight": 5,
        })
        preset_id = client.post("/presets", json={
            "name": "P", "items": [{"name": "현금", "category": "현금", "target_weight": 15}],
        }).json()["id"]

        r = client.post(f"/presets/{preset_id}/apply/{acc['id']}")
        assert r.status_code == HTTPStatus.OK
        body = r.json()
        assert body["updated_count"] == 1
        cash = next(a for a in body["account"]["assets"] if a["name"] == "현금")
        assert cash["target_weight"] == 15

    def test_apply_404_on_missing_preset(self, client: TestClient):
        # [Error] missing preset → 404
        acc = client.post("/accounts", json={"name": "Acc", "cash": 0}).json()
        r = client.post(f"/presets/99999/apply/{acc['id']}")
        assert r.status_code == HTTPStatus.NOT_FOUND

    def test_apply_404_on_missing_account(self, client: TestClient):
        # [Error] missing account → 404
        preset_id = client.post("/presets", json={
            "name": "P", "items": [{"name": "X", "category": "주식", "target_weight": 100}],
        }).json()["id"]
        r = client.post(f"/presets/{preset_id}/apply/99999")
        assert r.status_code == HTTPStatus.NOT_FOUND


class TestPresetIDOR:
    def test_delete_missing_returns_404(self, client: TestClient):
        # [Error] missing preset → 404
        r = client.delete("/presets/99999")
        assert r.status_code == HTTPStatus.NOT_FOUND

    def test_delete_other_users_preset_returns_404(self, session):
        # [Error] 404-unified (NOT 403) — wrong-owner indistinguishable from missing
        user_a, user_b = UserId(uuid4()), UserId(uuid4())
        client_a = _make_user_client(session, user_a)
        pid = client_a.post("/presets", json={
            "name": "A's", "items": [{"name": "X", "category": "주식", "target_weight": 100}],
        }).json()["id"]

        client_b = _make_user_client(session, user_b)
        r = client_b.delete(f"/presets/{pid}")
        assert r.status_code == HTTPStatus.NOT_FOUND

    def test_apply_other_users_preset_returns_404(self, session):
        # [Error] wrong-owner preset → 404
        user_a, user_b = UserId(uuid4()), UserId(uuid4())
        client_a = _make_user_client(session, user_a)
        pid = client_a.post("/presets", json={
            "name": "A's", "items": [{"name": "X", "category": "주식", "target_weight": 100}],
        }).json()["id"]

        client_b = _make_user_client(session, user_b)
        acc_b = client_b.post("/accounts", json={"name": "B's", "cash": 0}).json()
        r = client_b.post(f"/presets/{pid}/apply/{acc_b['id']}")
        assert r.status_code == HTTPStatus.NOT_FOUND

    def test_apply_other_users_account_returns_404(self, session):
        # [Error] wrong-owner account → 404 (AccountNotFoundError branch)
        user_a, user_b = UserId(uuid4()), UserId(uuid4())
        client_a = _make_user_client(session, user_a)
        acc_a = client_a.post("/accounts", json={"name": "A's", "cash": 0}).json()

        client_b = _make_user_client(session, user_b)
        pid = client_b.post("/presets", json={
            "name": "B's", "items": [{"name": "X", "category": "주식", "target_weight": 100}],
        }).json()["id"]
        r = client_b.post(f"/presets/{pid}/apply/{acc_a['id']}")
        assert r.status_code == HTTPStatus.NOT_FOUND


class TestPresetRateLimit:
    def test_post_presets_rate_limited_after_10(self, client: TestClient):
        # [Error] 10/minute on POST → the 11th request is 429
        body = {"name": "X", "items": [{"name": "A", "category": "주식", "target_weight": 100}]}
        statuses = [client.post("/presets", json=body).status_code for _ in range(10)]
        assert all(s == HTTPStatus.CREATED for s in statuses)
        eleventh = client.post("/presets", json=body)
        assert eleventh.status_code == HTTPStatus.TOO_MANY_REQUESTS
