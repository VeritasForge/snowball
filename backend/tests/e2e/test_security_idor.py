from http import HTTPStatus
from uuid import uuid4
from src.snowball.adapters.db.models import UserModel, AccountModel
from src.snowball.infrastructure.security import PasswordHasher

def test_idor_update_account(client, session):
    """
    Test that a user cannot update another user's account.
    This should return 403 Forbidden.
    """
    # 1. Create Victim User
    victim_user_id = uuid4()
    victim_user = UserModel(
        id=victim_user_id,
        email="victim@example.com",
        password_hash=PasswordHasher.get_password_hash("password")
    )
    session.add(victim_user)

    # 2. Create Victim Account
    victim_account = AccountModel(
        name="Victim Account",
        cash=1000.0,
        user_id=victim_user_id
    )
    session.add(victim_account)
    session.commit()
    session.refresh(victim_account)

    # 3. Attacker (client is authenticated as a different user) tries to update victim account
    response = client.patch(f"/accounts/{victim_account.id}", json={"name": "Hacked"})

    # 4. Assert 403 Forbidden
    assert response.status_code == HTTPStatus.FORBIDDEN

def test_idor_delete_account(client, session):
    """
    Test that a user cannot delete another user's account.
    This should return 403 Forbidden.
    """
    # 1. Create Victim User
    victim_user_id = uuid4()
    victim_user = UserModel(
        id=victim_user_id,
        email="victim2@example.com",
        password_hash=PasswordHasher.get_password_hash("password")
    )
    session.add(victim_user)

    # 2. Create Victim Account
    victim_account = AccountModel(
        name="Victim Account 2",
        cash=1000.0,
        user_id=victim_user_id
    )
    session.add(victim_account)
    session.commit()
    session.refresh(victim_account)

    # 3. Attacker tries to delete victim account
    response = client.delete(f"/accounts/{victim_account.id}")

    # 4. Assert 403 Forbidden
    assert response.status_code == HTTPStatus.FORBIDDEN
