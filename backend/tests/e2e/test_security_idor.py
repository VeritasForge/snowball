from uuid import uuid4
from fastapi.testclient import TestClient
from sqlmodel import Session
from src.snowball.domain.entities import UserId
from src.snowball.adapters.db.models import AccountModel, UserModel
from src.snowball.infrastructure.security import PasswordHasher

def test_idor_update_account(client: TestClient, session: Session):
    # 1. Create a "victim" user
    victim_user_id = uuid4()
    victim_user = UserModel(
        id=victim_user_id,
        email="victim@example.com",
        password_hash="hash"
    )
    session.add(victim_user)
    session.commit()

    # 2. Create an account for the victim
    victim_account = AccountModel(
        name="Victim Portfolio",
        cash=1000.0,
        user_id=victim_user_id
    )
    session.add(victim_account)
    session.commit()
    session.refresh(victim_account)

    # 3. The 'client' is authenticated as 'test_user' (defined in conftest.py)
    # We try to update the victim's account
    response = client.patch(f"/accounts/{victim_account.id}", json={"name": "Hacked Portfolio"})

    # 4. Assert - Expecting 403 Forbidden now
    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized"

    # Verify database was NOT changed
    session.refresh(victim_account)
    assert victim_account.name == "Victim Portfolio"

def test_idor_create_asset(client: TestClient, session: Session):
    # 1. Create a "victim" user and account
    victim_user_id = uuid4()
    victim_user = UserModel(
        id=victim_user_id,
        email="victim2@example.com",
        password_hash="hash"
    )
    session.add(victim_user)

    victim_account = AccountModel(
        name="Victim Portfolio 2",
        cash=1000.0,
        user_id=victim_user_id
    )
    session.add(victim_account)
    session.commit()
    session.refresh(victim_account)

    # 2. Try to create an asset in the victim's account
    asset_data = {
        "account_id": victim_account.id,
        "name": "Malicious Asset",
        "code": "BAD",
        "category": "Stock",
        "target_weight": 0.5,
        "current_price": 100.0,
        "avg_price": 100.0,
        "quantity": 10
    }

    response = client.post("/assets", json=asset_data)

    # 3. Assert - Expecting 403
    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized"
