from fastapi.testclient import TestClient
from sqlmodel import Session, select
from models import Account, Asset

def test_create_account(client: TestClient):
    response = client.post(
        "/accounts",
        json={"name": "Test Portfolio", "cash": 10000}
    )
    data = response.json()
    assert response.status_code == 200
    assert data["name"] == "Test Portfolio"
    assert data["cash"] == 10000.0
    assert data["id"] is not None

def test_calculate_logic_scenario(client: TestClient):
    """
    User Scenario:
    - 2 Assets, 50% target each.
    - Current Price: 10,000 KRW each.
    - Cash: 21,000 KRW.
    
    Expected:
    - Total Asset: 21,000
    - Target per Asset: 10,500
    - Action Qty: 1 (since 10,500 / 10,000 = 1.05 -> floor to 1)
    - Remaining Cash (Implied): 1,000
    """
    
    # 1. Create Account
    acc_res = client.post("/accounts", json={"name": "Scenario Acc", "cash": 21000})
    acc_id = acc_res.json()["id"]
    
    # 2. Add Asset A
    client.post("/assets", json={
        "account_id": acc_id,
        "name": "Asset A",
        "target_weight": 50.0,
        "current_price": 10000,
        "quantity": 0,
        "avg_price": 0
    })
    
    # 3. Add Asset B
    client.post("/assets", json={
        "account_id": acc_id,
        "name": "Asset B",
        "target_weight": 50.0,
        "current_price": 10000,
        "quantity": 0,
        "avg_price": 0
    })
    
    # 4. Get Calculated Account
    list_res = client.get("/accounts")
    accounts = list_res.json()
    my_acc = next(a for a in accounts if a["id"] == acc_id)
    
    # Assertions
    assert my_acc["total_asset_value"] == 21000.0
    assert len(my_acc["assets"]) == 2
    
    for asset in my_acc["assets"]:
        assert asset["target_value"] == 10500.0
        assert asset["diff_value"] == 10500.0
        assert asset["action"] == "BUY"
        # Since diff is 10,500 and price is 10,000 -> qty should be 1
        assert asset["action_quantity"] == 1

def test_execute_trade(client: TestClient):
    # Setup: Cash 20,000, Price 10,000. Buy 1.
    acc_res = client.post("/accounts", json={"name": "Trade Acc", "cash": 20000})
    acc_id = acc_res.json()["id"]
    
    asset_res = client.post("/assets", json={
        "account_id": acc_id,
        "name": "Stock",
        "current_price": 10000,
        "quantity": 0
    })
    asset_id = asset_res.json()["id"]
    
    # Execute BUY 1
    exec_res = client.post("/assets/execute", json={
        "asset_id": asset_id,
        "action_quantity": 1,
        "price": 10000
    })
    assert exec_res.status_code == 200
    
    data = exec_res.json()
    asset_after = data["assets"][0]
    
    # Verify State Changes
    assert data["cash"] == 10000.0 # 20k - 10k
    assert asset_after["quantity"] == 1
    assert asset_after["avg_price"] == 10000.0

