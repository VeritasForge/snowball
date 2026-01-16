from http import HTTPStatus
from uuid import uuid4
from fastapi.testclient import TestClient
from main import app
from src.snowball.infrastructure.db import get_session
from src.snowball.adapters.api.routes import get_current_user
from src.snowball.domain.entities import User, UserId

def test_accounts_should_be_isolated_between_users(session):
    # Setup User A
    user_a_id = UserId(uuid4())
    def get_user_a():
        return User(id=user_a_id, email="a@example.com", password_hash="hash")

    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_current_user] = get_user_a
    client_a = TestClient(app, base_url="http://testserver/api/v1")

    # User A creates an account
    response_a = client_a.post("/accounts", json={"name": "User A Account", "cash": 100})
    assert response_a.status_code == HTTPStatus.OK

    # Setup User B
    user_b_id = UserId(uuid4())
    def get_user_b():
        return User(id=user_b_id, email="b@example.com", password_hash="hash")

    app.dependency_overrides[get_current_user] = get_user_b
    client_b = TestClient(app, base_url="http://testserver/api/v1")

    # User B lists accounts
    response_b = client_b.get("/accounts")
    assert response_b.status_code == HTTPStatus.OK

    accounts = response_b.json()

    # Assert isolation
    # Fails if User B sees User A's account
    assert len(accounts) == 0, "Security Vulnerability: User B can see User A's accounts!"

    # Cleanup
    app.dependency_overrides.clear()
