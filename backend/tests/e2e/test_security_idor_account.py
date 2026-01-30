from http import HTTPStatus
from fastapi.testclient import TestClient
from sqlmodel import Session
from src.snowball.adapters.db.models import UserModel, AccountModel
from uuid import uuid4

def test_should_prevent_account_update_idor(client: TestClient, session: Session):
    # Given: A victim user and account exist in the DB
    victim_id = uuid4()
    victim = UserModel(id=victim_id, email="victim@example.com", password_hash="hash")
    session.add(victim)

    victim_account = AccountModel(name="Victim Savings", cash=1000.0, user_id=victim_id)
    session.add(victim_account)
    session.commit()
    session.refresh(victim_account)

    # When: The attacker (current client user) tries to update the victim's account
    response = client.patch(f"/accounts/{victim_account.id}", json={"name": "Hacked"})

    # Then: It should be forbidden
    assert response.status_code == HTTPStatus.FORBIDDEN

def test_should_prevent_account_delete_idor(client: TestClient, session: Session):
    # Given: A victim user and account exist in the DB
    victim_id = uuid4()
    victim = UserModel(id=victim_id, email="victim2@example.com", password_hash="hash")
    session.add(victim)

    victim_account = AccountModel(name="Victim Checking", cash=500.0, user_id=victim_id)
    session.add(victim_account)
    session.commit()
    session.refresh(victim_account)

    # When: The attacker tries to delete the victim's account
    response = client.delete(f"/accounts/{victim_account.id}")

    # Then: It should be forbidden
    assert response.status_code == HTTPStatus.FORBIDDEN

    # And: The account should still exist
    refreshed_account = session.get(AccountModel, victim_account.id)
    assert refreshed_account is not None
