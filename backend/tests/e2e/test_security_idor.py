from http import HTTPStatus
from uuid import uuid4
from fastapi.testclient import TestClient
from main import app
from src.snowball.infrastructure.db import get_session
from src.snowball.adapters.api.routes import get_current_user
from src.snowball.domain.entities import User, UserId

def test_idor_vulnerability(session):
    # Setup User A
    user_a_id = UserId(uuid4())
    def get_user_a(): return User(id=user_a_id, email="a@example.com", password_hash="hash")

    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_current_user] = get_user_a
    client_a = TestClient(app, base_url="http://testserver/api/v1")

    # User A creates an account
    response_a = client_a.post("/accounts", json={"name": "User A Account", "cash": 100})
    assert response_a.status_code == HTTPStatus.OK
    account_id = response_a.json()["id"]

    # Setup User B
    user_b_id = UserId(uuid4())
    def get_user_b(): return User(id=user_b_id, email="b@example.com", password_hash="hash")

    app.dependency_overrides[get_current_user] = get_user_b
    client_b = TestClient(app, base_url="http://testserver/api/v1")

    # User B tries to update User A's account
    response_b = client_b.patch(f"/accounts/{account_id}", json={"name": "Hacked"})
    assert response_b.status_code == HTTPStatus.FORBIDDEN, "Security Vulnerability: User B can update User A's account"

    # User B tries to delete User A's account
    response_b_delete = client_b.delete(f"/accounts/{account_id}")
    assert response_b_delete.status_code == HTTPStatus.FORBIDDEN, "Security Vulnerability: User B can delete User A's account"

    # Switch context back to User A for creating their asset
    app.dependency_overrides[get_current_user] = get_user_a
    client_a = TestClient(app, base_url="http://testserver/api/v1")

    # User A creates an asset in their account
    response_a_asset = client_a.post("/assets", json={
        "account_id": account_id,
        "name": "Tesla",
        "code": "TSLA",
        "target_weight": 10.0
    })
    assert response_a_asset.status_code == HTTPStatus.OK
    asset_id = response_a_asset.json()["id"]

    # Switch context back to User B
    app.dependency_overrides[get_current_user] = get_user_b
    client_b = TestClient(app, base_url="http://testserver/api/v1")

    # User B tries to create an asset in User A's account
    response_b_create_asset = client_b.post("/assets", json={
        "account_id": account_id,
        "name": "Hacked Asset",
        "code": "HACK",
        "target_weight": 10.0
    })
    assert response_b_create_asset.status_code == HTTPStatus.FORBIDDEN, "Security Vulnerability: User B can create asset in User A's account"

    # User B tries to update User A's asset
    response_b_update_asset = client_b.patch(f"/assets/{asset_id}", json={"name": "Hacked Asset Name"})
    assert response_b_update_asset.status_code == HTTPStatus.FORBIDDEN, "Security Vulnerability: User B can update User A's asset"

    # User B tries to execute trade on User A's asset
    response_b_execute = client_b.post("/assets/execute", json={
        "asset_id": asset_id,
        "action_quantity": 1,
        "price": 100
    })
    assert response_b_execute.status_code == HTTPStatus.FORBIDDEN, "Security Vulnerability: User B can trade User A's asset"

    # User B tries to delete User A's asset
    response_b_delete_asset = client_b.delete(f"/assets/{asset_id}")
    assert response_b_delete_asset.status_code == HTTPStatus.FORBIDDEN, "Security Vulnerability: User B can delete User A's asset"

    app.dependency_overrides.clear()
