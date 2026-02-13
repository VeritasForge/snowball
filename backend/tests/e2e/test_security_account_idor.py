import pytest
from uuid import uuid4
from src.snowball.adapters.db.models import UserModel, AccountModel
from src.snowball.domain.entities import UserId
from http import HTTPStatus

def test_update_account_idor(client, session):
    # 1. Create Victim User
    victim_id = uuid4()
    victim = UserModel(
        id=victim_id,
        email="victim@example.com",
        password_hash="secret"
    )
    session.add(victim)
    session.commit()

    # 2. Create Victim Account
    victim_account = AccountModel(
        name="Victim Savings",
        cash=1000.0,
        user_id=victim_id
    )
    session.add(victim_account)
    session.commit()
    session.refresh(victim_account)

    # 3. Attacker (client) tries to update Victim's account
    # client is authenticated as "test_user" (Attacker) by default conftest
    response = client.patch(
        f"/accounts/{victim_account.id}",
        json={"name": "Hacked Account"}
    )

    # 4. Verify Vulnerability IS BLOCKED
    # If secure, this should be 403 Forbidden.
    assert response.status_code == HTTPStatus.FORBIDDEN

    # Verify DB did NOT change
    session.refresh(victim_account)
    assert victim_account.name == "Victim Savings"

def test_delete_account_idor(client, session):
    # 1. Create Victim User
    victim_id = uuid4()
    victim = UserModel(
        id=victim_id,
        email="victim2@example.com",
        password_hash="secret"
    )
    session.add(victim)
    session.commit()

    # 2. Create Victim Account
    victim_account = AccountModel(
        name="Victim Savings 2",
        cash=1000.0,
        user_id=victim_id
    )
    session.add(victim_account)
    session.commit()
    session.refresh(victim_account)

    # 3. Attacker (client) tries to delete Victim's account
    response = client.delete(f"/accounts/{victim_account.id}")

    # 4. Verify Vulnerability IS BLOCKED
    assert response.status_code == HTTPStatus.FORBIDDEN

    # Verify Account still exists
    # We need to use a new session or clear cache if necessary, but here it should be fine
    account_in_db = session.get(AccountModel, victim_account.id)
    assert account_in_db is not None
