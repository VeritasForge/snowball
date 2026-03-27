from http import HTTPStatus
from uuid import uuid4
from fastapi.testclient import TestClient
from main import app
from src.snowball.infrastructure.db import get_session
from src.snowball.adapters.api.routes import get_current_user
from src.snowball.domain.entities import User, UserId

def test_idor_update_account(session):
    # Setup users
    user_a_id = UserId(uuid4())
    def get_user_a(): return User(id=user_a_id, email="a@example.com", password_hash="hash")

    user_b_id = UserId(uuid4())
    def get_user_b(): return User(id=user_b_id, email="b@example.com", password_hash="hash")

    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_current_user] = get_user_a
    client = TestClient(app, base_url="http://testserver/api/v1")

    # User A creates account
    res = client.post("/accounts", json={"name": "User A Account", "cash": 100})
    account_id = res.json()["id"]

    # User B tries to update User A's account
    app.dependency_overrides[get_current_user] = get_user_b
    res_b = client.patch(f"/accounts/{account_id}", json={"name": "Hacked", "cash": 9999})

    assert res_b.status_code == HTTPStatus.FORBIDDEN, f"VULNERABLE! Status: {res_b.status_code}"

def test_idor_delete_account(session):
    # Setup users
    user_a_id = UserId(uuid4())
    def get_user_a(): return User(id=user_a_id, email="a@example.com", password_hash="hash")

    user_b_id = UserId(uuid4())
    def get_user_b(): return User(id=user_b_id, email="b@example.com", password_hash="hash")

    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_current_user] = get_user_a
    client = TestClient(app, base_url="http://testserver/api/v1")

    # User A creates account
    res = client.post("/accounts", json={"name": "User A Account", "cash": 100})
    account_id = res.json()["id"]

    # User B tries to delete User A's account
    app.dependency_overrides[get_current_user] = get_user_b
    res_b = client.delete(f"/accounts/{account_id}")

    assert res_b.status_code == HTTPStatus.FORBIDDEN, f"VULNERABLE! Status: {res_b.status_code}"

def test_idor_create_asset(session):
    # Setup users
    user_a_id = UserId(uuid4())
    def get_user_a(): return User(id=user_a_id, email="a@example.com", password_hash="hash")

    user_b_id = UserId(uuid4())
    def get_user_b(): return User(id=user_b_id, email="b@example.com", password_hash="hash")

    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_current_user] = get_user_a
    client = TestClient(app, base_url="http://testserver/api/v1")

    # User A creates account
    res = client.post("/accounts", json={"name": "User A Account", "cash": 100})
    account_id = res.json()["id"]

    # User B tries to create asset in User A's account
    app.dependency_overrides[get_current_user] = get_user_b
    res_b = client.post(
        "/assets",
        json={
            "account_id": account_id,
            "name": "Hacked Asset",
            "code": "HACK",
            "category": "Stock",
            "target_weight": 0.5,
            "current_price": 100,
            "avg_price": 100,
            "quantity": 10
        }
    )

    assert res_b.status_code == HTTPStatus.FORBIDDEN, f"VULNERABLE! Status: {res_b.status_code}"

def test_idor_update_asset(session):
    # Setup users
    user_a_id = UserId(uuid4())
    def get_user_a(): return User(id=user_a_id, email="a@example.com", password_hash="hash")

    user_b_id = UserId(uuid4())
    def get_user_b(): return User(id=user_b_id, email="b@example.com", password_hash="hash")

    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_current_user] = get_user_a
    client = TestClient(app, base_url="http://testserver/api/v1")

    # User A creates account and asset
    res_acc = client.post("/accounts", json={"name": "User A Account", "cash": 100})
    account_id = res_acc.json()["id"]
    res_ass = client.post("/assets", json={
        "account_id": account_id,
        "name": "Asset A",
        "code": "A",
        "category": "Stock",
        "target_weight": 0.5,
        "current_price": 100,
        "avg_price": 100,
        "quantity": 10
    })
    asset_id = res_ass.json()["id"]

    # User B tries to update User A's asset
    app.dependency_overrides[get_current_user] = get_user_b
    res_b = client.patch(f"/assets/{asset_id}", json={"name": "Hacked", "quantity": 9999})

    assert res_b.status_code == HTTPStatus.FORBIDDEN, f"VULNERABLE! Status: {res_b.status_code}"

def test_idor_delete_asset(session):
    # Setup users
    user_a_id = UserId(uuid4())
    def get_user_a(): return User(id=user_a_id, email="a@example.com", password_hash="hash")

    user_b_id = UserId(uuid4())
    def get_user_b(): return User(id=user_b_id, email="b@example.com", password_hash="hash")

    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_current_user] = get_user_a
    client = TestClient(app, base_url="http://testserver/api/v1")

    # User A creates account and asset
    res_acc = client.post("/accounts", json={"name": "User A Account", "cash": 100})
    account_id = res_acc.json()["id"]
    res_ass = client.post("/assets", json={
        "account_id": account_id,
        "name": "Asset A",
        "code": "A",
        "category": "Stock",
        "target_weight": 0.5,
        "current_price": 100,
        "avg_price": 100,
        "quantity": 10
    })
    asset_id = res_ass.json()["id"]

    # User B tries to delete User A's asset
    app.dependency_overrides[get_current_user] = get_user_b
    res_b = client.delete(f"/assets/{asset_id}")

    assert res_b.status_code == HTTPStatus.FORBIDDEN, f"VULNERABLE! Status: {res_b.status_code}"

def test_idor_execute_trade(session):
    # Setup users
    user_a_id = UserId(uuid4())
    def get_user_a(): return User(id=user_a_id, email="a@example.com", password_hash="hash")

    user_b_id = UserId(uuid4())
    def get_user_b(): return User(id=user_b_id, email="b@example.com", password_hash="hash")

    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_current_user] = get_user_a
    client = TestClient(app, base_url="http://testserver/api/v1")

    # User A creates account and asset
    res_acc = client.post("/accounts", json={"name": "User A Account", "cash": 100})
    account_id = res_acc.json()["id"]
    res_ass = client.post("/assets", json={
        "account_id": account_id,
        "name": "Asset A",
        "code": "A",
        "category": "Stock",
        "target_weight": 0.5,
        "current_price": 100,
        "avg_price": 100,
        "quantity": 10
    })
    asset_id = res_ass.json()["id"]

    # User B tries to execute trade on User A's asset
    app.dependency_overrides[get_current_user] = get_user_b
    res_b = client.post("/assets/execute", json={"asset_id": asset_id, "action_quantity": -10, "price": 50})

    assert res_b.status_code == HTTPStatus.FORBIDDEN, f"VULNERABLE! Status: {res_b.status_code}"
