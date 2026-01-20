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
