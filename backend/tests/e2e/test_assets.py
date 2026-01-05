from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from src.snowball.domain.ports import MarketDataProvider
from src.snowball.adapters.api.routes import get_market_data

def test_should_create_asset(client: TestClient):
    # Given: Existing account
    acc_res = client.post("/accounts", json={"name": "Asset Acc", "cash": 0})
    acc_id = acc_res.json()["id"]

    # When: Creating asset
    response = client.post("/assets", json={
        "account_id": acc_id,
        "name": "Tesla",
        "code": "TSLA",
        "target_weight": 10.0
    })

    # Then: Returns created asset
    assert response.status_code == 200
    assert response.json()["name"] == "Tesla"

def test_should_update_asset(client: TestClient):
    # Given: Existing asset
    acc_res = client.post("/accounts", json={"name": "Update Acc", "cash": 0})
    acc_id = acc_res.json()["id"]
    asset_res = client.post("/assets", json={"account_id": acc_id, "name": "A", "target_weight": 10})
    asset_id = asset_res.json()["id"]

    # When: Updating asset
    response = client.patch(f"/assets/{asset_id}", json={"target_weight": 50.0})

    # Then: Returns updated asset
    assert response.status_code == 200
    assert response.json()["target_weight"] == 50.0

def test_should_delete_asset(client: TestClient):
    # Given: Existing asset
    acc_res = client.post("/accounts", json={"name": "Del Acc", "cash": 0})
    acc_id = acc_res.json()["id"]
    asset_res = client.post("/assets", json={"account_id": acc_id, "name": "D", "target_weight": 10})
    asset_id = asset_res.json()["id"]

    # When: Deleting asset
    response = client.delete(f"/assets/{asset_id}")

    # Then: Returns success
    assert response.status_code == 200

    # And: Asset is gone (Implicitly checked by not being in account list or 404 on get if endpoint existed)
    # We check account list
    list_res = client.get("/accounts")
    acc = next(a for a in list_res.json() if a["id"] == acc_id)
    assert len(acc["assets"]) == 0

def test_should_update_all_prices(client: TestClient):
    # Given: Asset with old price
    acc_res = client.post("/accounts", json={"name": "Price Acc", "cash": 0})
    acc_id = acc_res.json()["id"]
    client.post("/assets", json={"account_id": acc_id, "name": "Old", "code": "005930", "current_price": 100})

    # And: Mocked Market Data
    mock_provider = MagicMock(spec=MarketDataProvider)
    mock_provider.fetch_price.return_value = 200

    from main import app
    app.dependency_overrides[get_market_data] = lambda: mock_provider

    # When: Updating all prices
    response = client.post("/assets/update-all-prices")

    # Then: Updates count is returned
    assert response.status_code == 200
    assert response.json()["updated_count"] == 1

    app.dependency_overrides.pop(get_market_data)

def test_should_execute_trade(client: TestClient):
    # Given: Account with cash and asset
    acc_res = client.post("/accounts", json={"name": "Trade Acc", "cash": 1000})
    acc_id = acc_res.json()["id"]
    asset_res = client.post("/assets", json={"account_id": acc_id, "name": "S", "current_price": 100})
    asset_id = asset_res.json()["id"]

    # When: Executing BUY
    response = client.post("/assets/execute", json={
        "asset_id": asset_id,
        "action_quantity": 1,
        "price": 100
    })

    # Then: Returns updated account/assets
    assert response.status_code == 200
    assert response.json()["cash"] == 900.0

def test_should_fail_trade_insufficient_funds(client: TestClient):
    # Given: Poor account
    acc_res = client.post("/accounts", json={"name": "Poor Acc", "cash": 0})
    acc_id = acc_res.json()["id"]
    asset_res = client.post("/assets", json={"account_id": acc_id, "name": "S", "current_price": 100})
    asset_id = asset_res.json()["id"]

    # When: Executing BUY
    response = client.post("/assets/execute", json={
        "asset_id": asset_id,
        "action_quantity": 1,
        "price": 100
    })

    # Then: Returns 400
    assert response.status_code == 400

def test_should_fail_trade_not_found(client: TestClient):
    # Given: Invalid ID

    # When: Executing Trade
    response = client.post("/assets/execute", json={
        "asset_id": 9999,
        "action_quantity": 1,
        "price": 100
    })

    # Then: Returns 404
    assert response.status_code == 404
