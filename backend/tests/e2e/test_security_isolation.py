from http import HTTPStatus
from uuid import uuid4
from fastapi.testclient import TestClient
from main import app
from src.snowball.infrastructure.db import get_session
from src.snowball.adapters.api.routes import get_current_user
from src.snowball.domain.entities import User, UserId

def test_accounts_should_be_isolated_between_users(session):
    # Given: User A exists and has created an account
    user_a_id = UserId(uuid4())
    def get_user_a():
        return User(id=user_a_id, email="a@example.com", password_hash="hash")

    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_current_user] = get_user_a
    client_a = TestClient(app, base_url="http://testserver/api/v1")

    response_a = client_a.post("/accounts", json={"name": "User A Account", "cash": 100})
    assert response_a.status_code == HTTPStatus.OK

    # And: User B exists (different from User A)
    user_b_id = UserId(uuid4())
    def get_user_b():
        return User(id=user_b_id, email="b@example.com", password_hash="hash")

    app.dependency_overrides[get_current_user] = get_user_b
    client_b = TestClient(app, base_url="http://testserver/api/v1")

    # When: User B requests to list their accounts
    response_b = client_b.get("/accounts")

    # Then: The request succeeds
    assert response_b.status_code == HTTPStatus.OK

    # And: The list is empty (User A's account is not visible)
    accounts = response_b.json()
    assert len(accounts) == 0, "Security Vulnerability: User B can see User A's accounts!"

    # Cleanup
    app.dependency_overrides.clear()

def test_idor_should_prevent_updating_others_account(session):
    # Given: User A exists and has created an account
    user_a_id = UserId(uuid4())
    def get_user_a():
        return User(id=user_a_id, email="a@example.com", password_hash="hash")

    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_current_user] = get_user_a
    client_a = TestClient(app, base_url="http://testserver/api/v1")

    response_a = client_a.post("/accounts", json={"name": "User A Account", "cash": 100})
    account_id = response_a.json()["id"]

    # And: User B exists
    user_b_id = UserId(uuid4())
    def get_user_b():
        return User(id=user_b_id, email="b@example.com", password_hash="hash")

    app.dependency_overrides[get_current_user] = get_user_b
    client_b = TestClient(app, base_url="http://testserver/api/v1")

    # When: User B tries to update User A's account
    response_b = client_b.patch(f"/accounts/{account_id}", json={"name": "Hacked Account"})

    # Then: The request is forbidden or unauthorized
    assert response_b.status_code in [HTTPStatus.FORBIDDEN, HTTPStatus.UNAUTHORIZED], f"IDOR Vulnerability: User B could update User A's account! Status: {response_b.status_code}"

    # Cleanup
    app.dependency_overrides.clear()

def test_idor_should_prevent_updating_others_asset(session):
    # Given: User A exists and has an account with an asset
    user_a_id = UserId(uuid4())
    def get_user_a():
        return User(id=user_a_id, email="a@example.com", password_hash="hash")

    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_current_user] = get_user_a
    client_a = TestClient(app, base_url="http://testserver/api/v1")

    res_account = client_a.post("/accounts", json={"name": "User A Account", "cash": 100})
    account_id = res_account.json()["id"]

    res_asset = client_a.post("/assets", json={
        "account_id": account_id,
        "name": "AAPL",
        "code": "AAPL",
        "category": "Stock",
        "target_weight": 1.0,
        "current_price": 100.0,
        "avg_price": 100.0,
        "quantity": 10
    })
    asset_id = res_asset.json()["id"]

    # And: User B exists
    user_b_id = UserId(uuid4())
    def get_user_b():
        return User(id=user_b_id, email="b@example.com", password_hash="hash")

    app.dependency_overrides[get_current_user] = get_user_b
    client_b = TestClient(app, base_url="http://testserver/api/v1")

    # When: User B tries to update User A's asset
    res_b = client_b.patch(f"/assets/{asset_id}", json={"name": "Hacked Asset"})

    # Then: The request is forbidden or unauthorized
    assert res_b.status_code in [HTTPStatus.FORBIDDEN, HTTPStatus.UNAUTHORIZED], f"IDOR Vulnerability: User B could update User A's asset! Status: {res_b.status_code}"

    # Cleanup
    app.dependency_overrides.clear()
