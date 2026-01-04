from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from src.snowball.domain.ports import MarketDataProvider
from src.snowball.adapters.api.routes import get_market_data

def test_asset_crud(client: TestClient):
    # 1. Account
    acc_res = client.post("/accounts", json={"name": "Asset Acc", "cash": 0})
    acc_id = acc_res.json()["id"]

    # 2. Create Asset
    create_res = client.post("/assets", json={
        "account_id": acc_id,
        "name": "Tesla",
        "code": "TSLA",
        "category": "주식",
        "target_weight": 30.0,
        "current_price": 200,
        "quantity": 10,
        "avg_price": 150
    })
    assert create_res.status_code == 200
    asset_data = create_res.json()
    asset_id = asset_data["id"]
    assert asset_data["name"] == "Tesla"

    # 3. Update Asset
    update_res = client.patch(f"/assets/{asset_id}", json={
        "target_weight": 40.0,
        "current_price": 210
    })
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["target_weight"] == 40.0
    assert updated_data["current_price"] == 210.0

    # 4. Verify in Account List (Calculation Check)
    list_res = client.get("/accounts")
    accounts = list_res.json()
    acc = next(a for a in accounts if a["id"] == acc_id)
    asset_in_list = acc["assets"][0]
    assert asset_in_list["id"] == asset_id
    assert asset_in_list["current_weight"] > 0 # Since we have value

    # 5. Delete Asset
    del_res = client.delete(f"/assets/{asset_id}")
    assert del_res.status_code == 200

    # Verify Gone
    list_res = client.get("/accounts")
    acc = next(a for a in list_res.json() if a["id"] == acc_id)
    assert len(acc["assets"]) == 0

def test_update_all_prices_mocked(client: TestClient):
    # 1. Create Account & Asset
    acc_res = client.post("/accounts", json={"name": "Price Acc", "cash": 0})
    acc_id = acc_res.json()["id"]
    client.post("/assets", json={
        "account_id": acc_id,
        "name": "Old Stock",
        "code": "005930",
        "current_price": 50000
    })

    # 2. Mock MarketDataProvider
    mock_provider = MagicMock(spec=MarketDataProvider)
    # The use case likely iterates assets and calls fetch_price(code)
    # If fetch_price returns None, it skips.
    mock_provider.fetch_price.return_value = 80000

    from main import app
    app.dependency_overrides[get_market_data] = lambda: mock_provider

    # 3. Call update endpoint
    response = client.post("/assets/update-all-prices")
    assert response.status_code == 200
    assert response.json()["updated_count"] == 1

    # 4. Verify DB update via Account List
    list_res = client.get("/accounts")
    acc = next(a for a in list_res.json() if a["id"] == acc_id)
    asset = acc["assets"][0]
    assert asset["current_price"] == 80000

    app.dependency_overrides.pop(get_market_data)

def test_execute_trade_integration(client: TestClient):
    # Setup: Cash 20000. Price 10000.
    acc_res = client.post("/accounts", json={"name": "Trade Test", "cash": 20000})
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
    assert data["cash"] == 10000.0
    asset_after = data["assets"][0]
    assert asset_after["quantity"] == 1

    # Error Case: Insufficient Funds
    fail_res = client.post("/assets/execute", json={
        "asset_id": asset_id,
        "action_quantity": 10,
        "price": 10000
    })
    assert fail_res.status_code == 400

    # Error Case: Invalid Asset ID
    fail_res2 = client.post("/assets/execute", json={
        "asset_id": 99999,
        "action_quantity": 1,
        "price": 100
    })
    assert fail_res2.status_code == 404
