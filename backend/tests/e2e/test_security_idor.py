from http import HTTPStatus
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session
from src.snowball.adapters.db.models import UserModel, AccountModel, AssetModel
from src.snowball.infrastructure.db import get_session
from src.snowball.adapters.api.routes import get_current_user
from main import app

@pytest.fixture(name="security_test_data")
def security_test_data_fixture(session: Session):
    owner = UserModel(email="owner@example.com", password_hash="hash")
    attacker = UserModel(email="attacker@example.com", password_hash="hash")
    session.add(owner)
    session.add(attacker)
    session.commit()
    session.refresh(owner)
    session.refresh(attacker)

    account = AccountModel(name="Owner Acc", cash=1000.0, user_id=owner.id)
    session.add(account)
    session.commit()
    session.refresh(account)

    asset = AssetModel(
        account_id=account.id,
        name="Owner Asset",
        quantity=10,
        current_price=100
    )
    session.add(asset)
    session.commit()
    session.refresh(asset)

    return {"owner": owner, "attacker": attacker, "account": account, "asset": asset}

def test_update_account_security(session: Session, security_test_data):
    # Override get_session
    app.dependency_overrides[get_session] = lambda: session
    client = TestClient(app, base_url="http://testserver/api/v1")

    account = security_test_data["account"]
    attacker = security_test_data["attacker"]
    owner = security_test_data["owner"]

    try:
        # Case 1: Unauthorized (No Token) - Should be 401
        # If dependency is missing, it will return 200 (Fail)
        # Note: If dependency is present but we don't send token, it returns 401.
        # We need to ensure that the real get_current_user is used (or at least the dependency chain starts)
        # But we haven't overridden get_current_user yet.
        # However, real get_current_user needs JWTService.
        # If we don't mock JWTService, it might fail with 500 or something else if we send a token.
        # If we send NO token, OAuth2PasswordBearer raises 401.
        res = client.patch(f"/accounts/{account.id}", json={"name": "Anon"})
        assert res.status_code == HTTPStatus.UNAUTHORIZED

        # Case 2: Forbidden (Attacker) - Should be 403
        app.dependency_overrides[get_current_user] = lambda: attacker
        res = client.patch(f"/accounts/{account.id}", json={"name": "Hacked"})
        assert res.status_code == HTTPStatus.FORBIDDEN

        # Case 3: Authorized (Owner) - Should be 200
        app.dependency_overrides[get_current_user] = lambda: owner
        res = client.patch(f"/accounts/{account.id}", json={"name": "Legit"})
        assert res.status_code == HTTPStatus.OK
        assert res.json()["name"] == "Legit"

    finally:
        app.dependency_overrides.clear()

def test_delete_account_security(session: Session, security_test_data):
    app.dependency_overrides[get_session] = lambda: session
    client = TestClient(app, base_url="http://testserver/api/v1")

    account = security_test_data["account"]
    attacker = security_test_data["attacker"]

    try:
        # Case 1: Unauthorized
        res = client.delete(f"/accounts/{account.id}")
        assert res.status_code == HTTPStatus.UNAUTHORIZED

        # Case 2: Forbidden
        app.dependency_overrides[get_current_user] = lambda: attacker
        res = client.delete(f"/accounts/{account.id}")
        assert res.status_code == HTTPStatus.FORBIDDEN

    finally:
        app.dependency_overrides.clear()

def test_create_asset_security(session: Session, security_test_data):
    app.dependency_overrides[get_session] = lambda: session
    client = TestClient(app, base_url="http://testserver/api/v1")

    account = security_test_data["account"]
    attacker = security_test_data["attacker"]
    owner = security_test_data["owner"]

    payload = {
        "account_id": account.id,
        "name": "New Asset",
        "quantity": 1,
        "current_price": 100
    }

    try:
        # Unauthorized
        res = client.post("/assets", json=payload)
        assert res.status_code == HTTPStatus.UNAUTHORIZED

        # Forbidden
        app.dependency_overrides[get_current_user] = lambda: attacker
        res = client.post("/assets", json=payload)
        assert res.status_code == HTTPStatus.FORBIDDEN

        # Authorized
        app.dependency_overrides[get_current_user] = lambda: owner
        res = client.post("/assets", json=payload)
        assert res.status_code == HTTPStatus.OK

    finally:
        app.dependency_overrides.clear()

def test_update_asset_security(session: Session, security_test_data):
    app.dependency_overrides[get_session] = lambda: session
    client = TestClient(app, base_url="http://testserver/api/v1")

    asset = security_test_data["asset"]
    attacker = security_test_data["attacker"]
    owner = security_test_data["owner"]

    try:
        # Unauthorized
        res = client.patch(f"/assets/{asset.id}", json={"name": "Updated"})
        assert res.status_code == HTTPStatus.UNAUTHORIZED

        # Forbidden
        app.dependency_overrides[get_current_user] = lambda: attacker
        res = client.patch(f"/assets/{asset.id}", json={"name": "Hacked"})
        assert res.status_code == HTTPStatus.FORBIDDEN

        # Authorized
        app.dependency_overrides[get_current_user] = lambda: owner
        res = client.patch(f"/assets/{asset.id}", json={"name": "Legit"})
        assert res.status_code == HTTPStatus.OK

    finally:
        app.dependency_overrides.clear()

def test_delete_asset_security(session: Session, security_test_data):
    app.dependency_overrides[get_session] = lambda: session
    client = TestClient(app, base_url="http://testserver/api/v1")

    asset = security_test_data["asset"]
    attacker = security_test_data["attacker"]

    try:
        # Unauthorized
        res = client.delete(f"/assets/{asset.id}")
        assert res.status_code == HTTPStatus.UNAUTHORIZED

        # Forbidden
        app.dependency_overrides[get_current_user] = lambda: attacker
        res = client.delete(f"/assets/{asset.id}")
        assert res.status_code == HTTPStatus.FORBIDDEN

    finally:
        app.dependency_overrides.clear()

def test_execute_trade_security(session: Session, security_test_data):
    app.dependency_overrides[get_session] = lambda: session
    client = TestClient(app, base_url="http://testserver/api/v1")

    asset = security_test_data["asset"]
    attacker = security_test_data["attacker"]
    owner = security_test_data["owner"]

    payload = {
        "asset_id": asset.id,
        "action_quantity": 1,
        "price": 100
    }

    try:
        # Unauthorized
        res = client.post("/assets/execute", json=payload)
        assert res.status_code == HTTPStatus.UNAUTHORIZED

        # Forbidden
        app.dependency_overrides[get_current_user] = lambda: attacker
        res = client.post("/assets/execute", json=payload)
        assert res.status_code == HTTPStatus.FORBIDDEN

        # Authorized
        app.dependency_overrides[get_current_user] = lambda: owner
        res = client.post("/assets/execute", json=payload)
        assert res.status_code == HTTPStatus.OK

    finally:
        app.dependency_overrides.clear()
