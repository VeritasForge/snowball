from fastapi.testclient import TestClient
from sqlmodel import Session, select
from unittest.mock import patch, MagicMock
from src.snowball.adapters.db.models import AccountModel, AssetModel
from src.snowball.adapters.api.routes import get_market_data
from src.snowball.domain.ports import MarketDataProvider

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
    # The response is AccountCalculatedResponse. Assets list.
    asset_after = data["assets"][0]
    
    # Verify State Changes
    assert data["cash"] == 10000.0 # 20k - 10k
    assert asset_after["quantity"] == 1
    assert asset_after["avg_price"] == 10000.0

# --- New Tests for Financial Data ---

def test_finance_lookup_mocked(client: TestClient):
    # Mocking MarketDataProvider
    mock_provider = MagicMock(spec=MarketDataProvider)
    mock_provider.fetch_asset_info.return_value = {"name": "Mock Samsung", "price": 70000, "category": "주식"}
    
    from main import app
    app.dependency_overrides[get_market_data] = lambda: mock_provider
    
    response = client.get("/finance/lookup?code=005930")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Mock Samsung"
    assert data["price"] == 70000
    
    app.dependency_overrides.pop(get_market_data)

def test_finance_lookup_not_found(client: TestClient):
    mock_provider = MagicMock(spec=MarketDataProvider)
    mock_provider.fetch_asset_info.return_value = None
    
    from main import app
    app.dependency_overrides[get_market_data] = lambda: mock_provider
    
    response = client.get("/finance/lookup?code=INVALID")
    assert response.status_code == 404
    
    app.dependency_overrides.pop(get_market_data)

def test_update_all_prices_mocked(client: TestClient):
    # 1. Create an asset with code
    acc_res = client.post("/accounts", json={"name": "Price Update Acc", "cash": 0})
    acc_id = acc_res.json()["id"]
    client.post("/assets", json={
        "account_id": acc_id,
        "name": "Old Price Stock",
        "code": "005930",
        "current_price": 50000
    })
    
    # 2. Mock MarketDataProvider
    mock_provider = MagicMock(spec=MarketDataProvider)
    mock_provider.fetch_price.return_value = 80000 # New Price
    
    from main import app
    app.dependency_overrides[get_market_data] = lambda: mock_provider
    
    # 3. Call update endpoint
    response = client.post("/assets/update-all-prices")
    assert response.status_code == 200
    assert response.json()["updated_count"] == 1
    
    # 4. Verify DB update
    list_res = client.get("/accounts")
    accounts = list_res.json()
    target_acc = next(a for a in accounts if a["id"] == acc_id)
    asset = target_acc["assets"][0]
    
    assert asset["current_price"] == 80000
    
    app.dependency_overrides.pop(get_market_data)

def test_infer_category():
    from src.snowball.domain.services import infer_category
    
    # Stocks
    assert infer_category("삼성전자", "005930") == "주식"
    assert infer_category("APPLE", "AAPL") == "주식"
    
    # Bonds
    assert infer_category("KOSEF 국고채 10년", "148070") == "채권"
    assert infer_category("TIGER 미국채10년선물", "305080") == "채권"
    assert infer_category("SHY", "SHY") == "채권"
    
    # Raw Materials
    assert infer_category("KODEX 골드선물(H)", "132030") == "원자재"
    assert infer_category("WTI Crude Oil", "OIL") == "원자재"
    
    # Cash
    assert infer_category("KODEX 미국달러선물", "261240") == "현금"
    assert infer_category("BIL", "BIL") == "현금"
