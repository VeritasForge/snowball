"""E2E tests for error/edge cases in routes that aren't covered by other test files."""
from http import HTTPStatus
from uuid import uuid4
from fastapi.testclient import TestClient
from main import app
from src.snowball.infrastructure.db import get_session
from src.snowball.adapters.api.routes import get_current_user
from src.snowball.domain.entities import User, UserId


def _make_user_client(session, user_id: UserId):
    """Helper: returns a TestClient for a given user."""
    user = User(id=user_id, email=f"{user_id}@test.com", password_hash="hash")

    def override_session():
        return session

    def override_user():
        return user

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = override_user
    return TestClient(app, base_url="http://testserver/api/v1")


class TestAccountRouteEdgeCases:
    # [Error] Update account with cash field (not name) succeeds
    def test_update_account_updates_cash_field(self, client: TestClient):
        # Given: existing account
        acc = client.post("/accounts", json={"name": "Acc", "cash": 100}).json()
        # When: update only cash
        response = client.patch(f"/accounts/{acc['id']}", json={"cash": 999.99})
        # Then
        assert response.status_code == HTTPStatus.OK
        assert response.json()["cash"] == 999.99

    # [Error] Update non-existent account returns 404
    def test_update_nonexistent_account_returns_404(self, client: TestClient):
        # When
        response = client.patch("/accounts/99999", json={"name": "x"})
        # Then
        assert response.status_code == HTTPStatus.NOT_FOUND

    # [Error] Delete account that belongs to another user returns 403
    def test_delete_account_of_other_user_returns_403(self, session):
        # Given: User A creates an account
        user_a = UserId(uuid4())
        user_b = UserId(uuid4())
        client_a = _make_user_client(session, user_a)
        acc = client_a.post("/accounts", json={"name": "A's acc", "cash": 0}).json()

        # When: User B tries to delete it
        client_b = _make_user_client(session, user_b)
        response = client_b.delete(f"/accounts/{acc['id']}")
        app.dependency_overrides.clear()

        # Then
        assert response.status_code == HTTPStatus.FORBIDDEN

    # [Error] Update account that belongs to another user returns 403
    def test_update_account_of_other_user_returns_403(self, session):
        # Given: User A creates an account
        user_a = UserId(uuid4())
        user_b = UserId(uuid4())
        client_a = _make_user_client(session, user_a)
        acc = client_a.post("/accounts", json={"name": "A's acc", "cash": 100}).json()

        # When: User B tries to update it
        client_b = _make_user_client(session, user_b)
        response = client_b.patch(f"/accounts/{acc['id']}", json={"name": "Hacked"})
        app.dependency_overrides.clear()

        # Then
        assert response.status_code == HTTPStatus.FORBIDDEN


class TestAssetRouteEdgeCases:
    # [Error] Create asset for non-existent account returns 404
    def test_create_asset_for_nonexistent_account_returns_404(self, client: TestClient):
        # When
        response = client.post("/assets", json={"account_id": 99999, "name": "S", "target_weight": 10})
        # Then
        assert response.status_code == HTTPStatus.NOT_FOUND

    # [Error] Create asset for another user's account returns 403
    def test_create_asset_on_other_users_account_returns_403(self, session):
        # Given: User A creates an account
        user_a = UserId(uuid4())
        user_b = UserId(uuid4())
        client_a = _make_user_client(session, user_a)
        acc = client_a.post("/accounts", json={"name": "A's acc", "cash": 0}).json()

        # When: User B tries to add asset to it
        client_b = _make_user_client(session, user_b)
        response = client_b.post("/assets", json={"account_id": acc["id"], "name": "S", "target_weight": 10})
        app.dependency_overrides.clear()

        # Then
        assert response.status_code == HTTPStatus.FORBIDDEN

    # [Error] Update non-existent asset returns 404
    def test_update_nonexistent_asset_returns_404(self, client: TestClient):
        # When
        response = client.patch("/assets/99999", json={"name": "x"})
        # Then
        assert response.status_code == HTTPStatus.NOT_FOUND

    # [Error] Update asset when account not found returns 404
    def test_update_asset_when_account_gone_returns_404(self, session):
        # Given: Create user, account, asset; then directly delete account model
        user_id = UserId(uuid4())
        client = _make_user_client(session, user_id)
        acc = client.post("/accounts", json={"name": "Acc", "cash": 0}).json()
        asset = client.post("/assets", json={"account_id": acc["id"], "name": "S", "target_weight": 10}).json()

        # Directly remove account from DB without going through API
        from src.snowball.adapters.db.models import AccountModel
        model = session.get(AccountModel, acc["id"])
        session.delete(model)
        session.commit()

        # When: update asset whose account is gone
        response = client.patch(f"/assets/{asset['id']}", json={"name": "New"})
        app.dependency_overrides.clear()

        # Then
        assert response.status_code == HTTPStatus.NOT_FOUND

    # [Error] Update asset belonging to another user's account returns 403
    def test_update_asset_of_other_users_account_returns_403(self, session):
        # Given
        user_a = UserId(uuid4())
        user_b = UserId(uuid4())
        client_a = _make_user_client(session, user_a)
        acc = client_a.post("/accounts", json={"name": "A's", "cash": 0}).json()
        asset = client_a.post("/assets", json={"account_id": acc["id"], "name": "S", "target_weight": 10}).json()

        # When: User B tries to update
        client_b = _make_user_client(session, user_b)
        response = client_b.patch(f"/assets/{asset['id']}", json={"name": "Hacked"})
        app.dependency_overrides.clear()

        # Then
        assert response.status_code == HTTPStatus.FORBIDDEN

    # [Error] Delete non-existent asset returns 404
    def test_delete_nonexistent_asset_returns_404(self, client: TestClient):
        # When
        response = client.delete("/assets/99999")
        # Then
        assert response.status_code == HTTPStatus.NOT_FOUND

    # [Error] Delete asset when account not found returns 404
    def test_delete_asset_when_account_gone_returns_404(self, session):
        # Given
        user_id = UserId(uuid4())
        client = _make_user_client(session, user_id)
        acc = client.post("/accounts", json={"name": "Acc", "cash": 0}).json()
        asset = client.post("/assets", json={"account_id": acc["id"], "name": "S", "target_weight": 10}).json()

        # Remove account directly
        from src.snowball.adapters.db.models import AccountModel
        model = session.get(AccountModel, acc["id"])
        session.delete(model)
        session.commit()

        # When
        response = client.delete(f"/assets/{asset['id']}")
        app.dependency_overrides.clear()

        # Then
        assert response.status_code == HTTPStatus.NOT_FOUND

    # [Error] Delete asset belonging to another user returns 403
    def test_delete_asset_of_other_users_account_returns_403(self, session):
        # Given
        user_a = UserId(uuid4())
        user_b = UserId(uuid4())
        client_a = _make_user_client(session, user_a)
        acc = client_a.post("/accounts", json={"name": "A's", "cash": 0}).json()
        asset = client_a.post("/assets", json={"account_id": acc["id"], "name": "S", "target_weight": 10}).json()

        # When: User B tries to delete
        client_b = _make_user_client(session, user_b)
        response = client_b.delete(f"/assets/{asset['id']}")
        app.dependency_overrides.clear()

        # Then
        assert response.status_code == HTTPStatus.FORBIDDEN


class TestTradeRouteEdgeCases:
    # [Error] Execute trade where account not found returns 404
    def test_execute_trade_account_not_found_returns_404(self, session):
        # Given: Create asset, then remove its account
        user_id = UserId(uuid4())
        client = _make_user_client(session, user_id)
        acc = client.post("/accounts", json={"name": "Acc", "cash": 10000}).json()
        asset = client.post("/assets", json={"account_id": acc["id"], "name": "S", "current_price": 100}).json()

        # Remove account directly
        from src.snowball.adapters.db.models import AccountModel
        model = session.get(AccountModel, acc["id"])
        session.delete(model)
        session.commit()

        # When
        response = client.post("/assets/execute", json={"asset_id": asset["id"], "action_quantity": 1, "price": 100})
        app.dependency_overrides.clear()

        # Then
        assert response.status_code == HTTPStatus.NOT_FOUND

    # [Error] Execute trade on another user's asset returns 403
    def test_execute_trade_on_other_users_asset_returns_403(self, session):
        # Given
        user_a = UserId(uuid4())
        user_b = UserId(uuid4())
        client_a = _make_user_client(session, user_a)
        acc = client_a.post("/accounts", json={"name": "A's", "cash": 10000}).json()
        asset = client_a.post("/assets", json={"account_id": acc["id"], "name": "S", "current_price": 100}).json()

        # When: User B tries to execute trade
        client_b = _make_user_client(session, user_b)
        response = client_b.post(
            "/assets/execute",
            json={"asset_id": asset["id"], "action_quantity": 1, "price": 100}
        )
        app.dependency_overrides.clear()

        # Then
        assert response.status_code == HTTPStatus.FORBIDDEN

    # [Error] Execute trade with invalid action raises 400
    def test_execute_trade_invalid_action_returns_400(self, client: TestClient):
        # Given: Account with asset but no holdings to sell
        acc = client.post("/accounts", json={"name": "Acc", "cash": 1000}).json()
        asset = client.post("/assets", json={"account_id": acc["id"], "name": "S", "current_price": 100}).json()

        # When: Try to sell 5 units when holding 0
        response = client.post("/assets/execute", json={
            "asset_id": asset["id"],
            "action_quantity": -5,
            "price": 100
        })
        # Then
        assert response.status_code == HTTPStatus.BAD_REQUEST
