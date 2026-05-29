"""Unit tests for preset route helpers (Plan B2.4).

Covers branches the e2e suite cannot reach deterministically:
- user_id_key_func truthy branch (request.state.user_id set) — e2e never
  sends a real JWT, so the IP fallback is the only branch exercised there.
- _preset_to_response empty created_at branch — the DB always stamps
  created_at, so the `else ""` path needs a hand-built entity.
"""
from types import SimpleNamespace
from uuid import uuid4

from src.snowball.adapters.api import routes
from src.snowball.adapters.api.routes import user_id_key_func, _preset_to_response
from src.snowball.domain.entities import Preset, PresetItem, UserId
from src.snowball.domain.enums import AssetCategory


class TestUserIdKeyFunc:
    def test_returns_user_id_when_set(self):
        # [Happy] authenticated request → keyed by user id, no IP fallback
        request = SimpleNamespace(state=SimpleNamespace(user_id="user-123"))
        assert user_id_key_func(request) == "user-123"

    def test_falls_back_to_ip_when_user_id_absent(self, monkeypatch):
        # [Boundary] no user_id on state → get_remote_address fallback
        monkeypatch.setattr(routes, "get_remote_address", lambda r: "9.9.9.9")
        request = SimpleNamespace(state=SimpleNamespace())  # no user_id attr
        assert user_id_key_func(request) == "9.9.9.9"

    def test_falls_back_to_ip_when_user_id_none(self, monkeypatch):
        # [Boundary] user_id explicitly None (falsy) → fallback
        monkeypatch.setattr(routes, "get_remote_address", lambda r: "8.8.8.8")
        request = SimpleNamespace(state=SimpleNamespace(user_id=None))
        assert user_id_key_func(request) == "8.8.8.8"


class TestPresetToResponse:
    def _preset(self, created_at):
        return Preset(
            id=7,
            name="P",
            user_id=UserId(uuid4()),
            created_at=created_at,
            items=[
                PresetItem(name="SPY", code="SPY", category=AssetCategory.STOCK, target_weight=60),
            ],
        )

    def test_serializes_created_at_isoformat(self):
        # [Happy] populated created_at → isoformat string
        from datetime import datetime
        resp = _preset_to_response(self._preset(datetime(2026, 5, 29, 12, 0, 0)))
        assert resp.created_at == "2026-05-29T12:00:00"
        assert resp.id == 7
        # aggregate child id is not surfaced
        assert resp.items[0].id is None
        assert resp.items[0].code == "SPY"

    def test_empty_string_when_created_at_none(self):
        # [Boundary] created_at None → "" (no AttributeError on .isoformat())
        resp = _preset_to_response(self._preset(None))
        assert resp.created_at == ""
