from http import HTTPStatus
from uuid import uuid4
from fastapi.testclient import TestClient
from main import app
from src.snowball.infrastructure.db import get_session
from src.snowball.adapters.api.routes import get_current_user
from src.snowball.domain.entities import User, UserId

def test_accounts_mutation_idor(session):
    # Given: User A exists and has created an account
    user_a_id = UserId(uuid4())
    def get_user_a():
        return User(id=user_a_id, email="a@example.com", password_hash="hash")

    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_current_user] = get_user_a
    client_a = TestClient(app, base_url="http://testserver/api/v1")

    response_a = client_a.post("/accounts", json={"name": "User A Account", "cash": 100})
    assert response_a.status_code == HTTPStatus.OK
    account_id = response_a.json()["id"]

    # And: User B exists (different from User A)
    user_b_id = UserId(uuid4())
    def get_user_b():
        return User(id=user_b_id, email="b@example.com", password_hash="hash")

    app.dependency_overrides[get_current_user] = get_user_b
    client_b = TestClient(app, base_url="http://testserver/api/v1")

    # When: User B requests to update User A's account
    response_update = client_b.patch(f"/accounts/{account_id}", json={"name": "Hacked Name"})

    # Then: The request fails with 403 Forbidden
    assert response_update.status_code == HTTPStatus.FORBIDDEN

    # When: User B requests to delete User A's account
    response_delete = client_b.delete(f"/accounts/{account_id}")

    # Then: The request fails with 403 Forbidden
    assert response_delete.status_code == HTTPStatus.FORBIDDEN

    # Cleanup
    app.dependency_overrides.clear()

def test_assets_mutation_idor(session):
    # Given: User A exists and has created an account and an asset
    user_a_id = UserId(uuid4())
    def get_user_a():
        return User(id=user_a_id, email="a@example.com", password_hash="hash")

    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_current_user] = get_user_a
    client_a = TestClient(app, base_url="http://testserver/api/v1")

    response_a_acc = client_a.post("/accounts", json={"name": "User A Account", "cash": 100})
    account_id = response_a_acc.json()["id"]

    response_a_asset = client_a.post("/assets", json={
        "account_id": account_id,
        "name": "User A Asset",
        "code": "A",
        "category": "Stock",
        "target_weight": 1.0,
        "current_price": 100,
        "avg_price": 100,
        "quantity": 1
    })
    asset_id = response_a_asset.json()["id"]

    # And: User B exists (different from User A)
    user_b_id = UserId(uuid4())
    def get_user_b():
        return User(id=user_b_id, email="b@example.com", password_hash="hash")

    app.dependency_overrides[get_current_user] = get_user_b
    client_b = TestClient(app, base_url="http://testserver/api/v1")

    # When: User B requests to create an asset under User A's account
    response_create = client_b.post("/assets", json={
        "account_id": account_id,
        "name": "Hacked Asset",
        "code": "H",
        "category": "Stock",
        "target_weight": 1.0,
        "current_price": 100,
        "avg_price": 100,
        "quantity": 1
    })

    # Then: The request fails with 403 Forbidden
    assert response_create.status_code == HTTPStatus.FORBIDDEN

    # When: User B requests to update User A's asset
    response_update = client_b.patch(f"/assets/{asset_id}", json={"name": "Hacked Asset Name"})

    # Then: The request fails with 403 Forbidden
    assert response_update.status_code == HTTPStatus.FORBIDDEN

    # When: User B requests to delete User A's asset
    response_delete = client_b.delete(f"/assets/{asset_id}")

    # Then: The request fails with 403 Forbidden
    assert response_delete.status_code == HTTPStatus.FORBIDDEN

    # Cleanup
    app.dependency_overrides.clear()
