from http import HTTPStatus
from uuid import uuid4
from fastapi.testclient import TestClient
from main import app
from src.snowball.infrastructure.db import get_session
from src.snowball.adapters.api.routes import get_current_user
from src.snowball.domain.entities import User, UserId

def test_idor_prevention_on_account_update(session):
    # Given: User A (Victim) exists and has an account
    user_a_id = UserId(uuid4())
    def get_user_a():
        return User(id=user_a_id, email="victim@example.com", password_hash="hash")

    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_current_user] = get_user_a
    client_a = TestClient(app, base_url="http://testserver/api/v1")

    # User A creates an account
    create_res = client_a.post("/accounts", json={"name": "Victim Account", "cash": 1000})
    assert create_res.status_code == HTTPStatus.OK
    account_id = create_res.json()["id"]

    # And: User B (Attacker) exists
    user_b_id = UserId(uuid4())
    def get_user_b():
        return User(id=user_b_id, email="attacker@example.com", password_hash="hash")

    app.dependency_overrides[get_current_user] = get_user_b
    client_b = TestClient(app, base_url="http://testserver/api/v1")

    # When: User B tries to update User A's account
    response = client_b.patch(f"/accounts/{account_id}", json={"name": "Hacked Account"})

    # Then: The request should be forbidden
    assert response.status_code == HTTPStatus.FORBIDDEN, \
        f"IDOR Vulnerability: User B could update User A's account! Status: {response.status_code}"

    # Cleanup
    app.dependency_overrides.clear()

def test_idor_prevention_on_account_delete(session):
    # Given: User A (Victim) exists and has an account
    user_a_id = UserId(uuid4())
    def get_user_a():
        return User(id=user_a_id, email="victim2@example.com", password_hash="hash")

    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_current_user] = get_user_a
    client_a = TestClient(app, base_url="http://testserver/api/v1")

    # User A creates an account
    create_res = client_a.post("/accounts", json={"name": "Victim Account 2", "cash": 1000})
    assert create_res.status_code == HTTPStatus.OK
    account_id = create_res.json()["id"]

    # And: User B (Attacker) exists
    user_b_id = UserId(uuid4())
    def get_user_b():
        return User(id=user_b_id, email="attacker2@example.com", password_hash="hash")

    app.dependency_overrides[get_current_user] = get_user_b
    client_b = TestClient(app, base_url="http://testserver/api/v1")

    # When: User B tries to delete User A's account
    response = client_b.delete(f"/accounts/{account_id}")

    # Then: The request should be forbidden
    assert response.status_code == HTTPStatus.FORBIDDEN, \
        f"IDOR Vulnerability: User B could delete User A's account! Status: {response.status_code}"

    # Cleanup
    app.dependency_overrides.clear()
