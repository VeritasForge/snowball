from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from src.snowball.domain.ports import MarketDataProvider
from src.snowball.adapters.api.routes import get_market_data

def test_asset_crud(client: TestClient):
    # Given: A new account
    acc_res = client.post("/accounts", json={"name": "Asset Acc", "cash": 0})
    acc_id = acc_res.json()["id"]

    # When: Creating an asset
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

    # Then: Asset is created
    assert create_res.status_code == 200
    asset_data = create_res.json()
    asset_id = asset_data["id"]
    assert asset_data["name"] == "Tesla"

    # When: Updating the asset
    update_res = client.patch(f"/assets/{asset_id}", json={
        "target_weight": 40.0,
        "current_price": 210
    })

    # Then: Asset is updated
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["target_weight"] == 40.0
    assert updated_data["current_price"] == 210.0

    # When: Checking account list
    list_res = client.get("/accounts")
    accounts = list_res.json()
    acc = next(a for a in accounts if a["id"] == acc_id)
    asset_in_list = acc["assets"][0]

    # Then: Asset exists in account
    assert asset_in_list["id"] == asset_id
    assert asset_in_list["current_weight"] > 0

    # When: Deleting the asset
    del_res = client.delete(f"/assets/{asset_id}")
    assert del_res.status_code == 200

    # Then: Asset is removed from account
    list_res = client.get("/accounts")
    acc = next(a for a in list_res.json() if a["id"] == acc_id)
    assert len(acc["assets"]) == 0

def test_update_all_prices_mocked(client: TestClient):
    # Given: Account with an asset holding old price
    acc_res = client.post("/accounts", json={"name": "Price Acc", "cash": 0})
    acc_id = acc_res.json()["id"]
    client.post("/assets", json={
        "account_id": acc_id,
        "name": "Old Stock",
        "code": "005930",
        "current_price": 50000
    })

    # And: Mocked market data provider returning new price
    mock_provider = MagicMock(spec=MarketDataProvider)
    mock_provider.fetch_price.return_value = 80000

    from main import app
    app.dependency_overrides[get_market_data] = lambda: mock_provider

    # When: Calling update-all-prices endpoint
    response = client.post("/assets/update-all-prices")

    # Then: Success response and count
    assert response.status_code == 200
    assert response.json()["updated_count"] == 1

    # And: Asset price in DB is updated
    list_res = client.get("/accounts")
    acc = next(a for a in list_res.json() if a["id"] == acc_id)
    asset = acc["assets"][0]
    assert asset["current_price"] == 80000

    app.dependency_overrides.pop(get_market_data)

def test_execute_trade_integration(client: TestClient):
    # Given: Account and Asset set up for trading
    acc_res = client.post("/accounts", json={"name": "Trade Test", "cash": 20000})
    acc_id = acc_res.json()["id"]
    asset_res = client.post("/assets", json={
        "account_id": acc_id,
        "name": "Stock",
        "current_price": 10000,
        "quantity": 0
    })
    asset_id = asset_res.json()["id"]

    # When: Executing valid BUY trade
    exec_res = client.post("/assets/execute", json={
        "asset_id": asset_id,
        "action_quantity": 1,
        "price": 10000
    })

    # Then: Trade successful, cash and quantity updated
    assert exec_res.status_code == 200
    data = exec_res.json()
    assert data["cash"] == 10000.0
    asset_after = data["assets"][0]
    assert asset_after["quantity"] == 1

    # When: Executing invalid trade (Insufficient Funds)
    fail_res = client.post("/assets/execute", json={
        "asset_id": asset_id,
        "action_quantity": 10,
        "price": 10000
    })
    # Then: 400 Bad Request
    assert fail_res.status_code == 400

    # When: Executing trade for non-existent asset
    fail_res2 = client.post("/assets/execute", json={
        "asset_id": 99999,
        "action_quantity": 1,
        "price": 100
    })
    # Then: 404 Not Found
    assert fail_res2.status_code == 404
