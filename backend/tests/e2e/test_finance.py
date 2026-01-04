from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from src.snowball.domain.ports import MarketDataProvider
from src.snowball.adapters.api.routes import get_market_data

def test_finance_lookup_success(client: TestClient):
    mock_provider = MagicMock(spec=MarketDataProvider)
    mock_provider.fetch_asset_info.return_value = {
        "name": "Mock Samsung",
        "price": 70000,
        "category": "주식"
    }

    from main import app
    app.dependency_overrides[get_market_data] = lambda: mock_provider

    response = client.get("/finance/lookup?code=005930")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Mock Samsung"
    assert data["price"] == 70000
    assert data["category"] == "주식"

    app.dependency_overrides.pop(get_market_data)

def test_finance_lookup_not_found(client: TestClient):
    mock_provider = MagicMock(spec=MarketDataProvider)
    mock_provider.fetch_asset_info.return_value = None

    from main import app
    app.dependency_overrides[get_market_data] = lambda: mock_provider

    response = client.get("/finance/lookup?code=INVALID")
    assert response.status_code == 404

    app.dependency_overrides.pop(get_market_data)
