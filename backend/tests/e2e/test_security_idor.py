from http import HTTPStatus
from uuid import uuid4
from fastapi.testclient import TestClient
from main import app
from src.snowball.infrastructure.db import get_session
from src.snowball.adapters.api.routes import get_current_user
from src.snowball.domain.entities import User, UserId

def test_idor_update_account_missing_authorization(session):
    # Setup test accounts
    user_a_id = UserId(uuid4())
    user_b_id = UserId(uuid4())

    def get_user_b():
        return User(id=user_b_id, email="b@example.com", password_hash="hash")

    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_current_user] = get_user_b
    client_b = TestClient(app, base_url="http://testserver/api/v1")

    # Manually insert account for User A
    from src.snowball.adapters.db.models import AccountModel

    acc = AccountModel(name="User A Account", cash=1000.0, user_id=user_a_id)
    session.add(acc)
    session.commit()
    session.refresh(acc)
    acc_id = acc.id

    # User B tries to update User A's account
    response = client_b.patch(f"/accounts/{acc_id}", json={"name": "Hacked Account"})

    app.dependency_overrides.clear()

    print("Response status:", response.status_code)
    print("Response json:", response.json())

    assert response.status_code == HTTPStatus.FORBIDDEN
