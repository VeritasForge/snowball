from http import HTTPStatus
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from src.snowball.domain.ports import MarketDataProvider
from src.snowball.adapters.api.routes import get_market_data

def test_finance_lookup_success(client: TestClient):
    # Given: Mocked market data provider finding an asset
    mock_provider = MagicMock(spec=MarketDataProvider)
    mock_provider.fetch_asset_info.return_value = {
        "name": "Mock Samsung",
        "price": 70000,
        "category": "주식"
    }

    from main import app
    app.dependency_overrides[get_market_data] = lambda: mock_provider

    # When: Calling lookup endpoint with valid code
    response = client.get("/finance/lookup?code=005930")

    # Then: Returns asset info
    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert data["name"] == "Mock Samsung"
    assert data["price"] == 70000
    assert data["category"] == "주식"

    app.dependency_overrides.pop(get_market_data)

def test_finance_lookup_not_found(client: TestClient):
    # Given: Mocked provider returning None
    mock_provider = MagicMock(spec=MarketDataProvider)
    mock_provider.fetch_asset_info.return_value = None

    from main import app
    app.dependency_overrides[get_market_data] = lambda: mock_provider

    # When: Calling lookup with invalid code
    response = client.get("/finance/lookup?code=INVALID")

    # Then: 404 Not Found
    assert response.status_code == HTTPStatus.NOT_FOUND

    app.dependency_overrides.pop(get_market_data)


def test_finance_search_success(client):
    # Given
    mock_provider = MagicMock(spec=MarketDataProvider)
    mock_provider.search_by_name.return_value = [
        {"name": "삼성전자", "code": "005930", "market": "KOSPI"},
        {"name": "삼성SDI", "code": "006400", "market": "KOSPI"},
    ]
    from main import app
    app.dependency_overrides[get_market_data] = lambda: mock_provider

    # When
    response = client.get("/finance/search?q=삼성")

    # Then
    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert len(data) == 2
    assert data[0]["name"] == "삼성전자"
    assert data[0]["code"] == "005930"
    assert data[0]["market"] == "KOSPI"
    app.dependency_overrides.pop(get_market_data)


def test_finance_search_empty_results(client):
    # Given
    mock_provider = MagicMock(spec=MarketDataProvider)
    mock_provider.search_by_name.return_value = []
    from main import app
    app.dependency_overrides[get_market_data] = lambda: mock_provider

    # When
    response = client.get("/finance/search?q=없는종목")

    # Then
    assert response.status_code == HTTPStatus.OK
    assert response.json() == []
    app.dependency_overrides.pop(get_market_data)


def test_finance_search_query_too_short(client):
    # When: q is 1 character (too short)
    response = client.get("/finance/search?q=삼")
    # Then: 400 Bad Request
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_finance_search_query_too_long(client):
    # When: q exceeds 20 characters
    response = client.get("/finance/search?q=" + "삼" * 21)
    # Then: 400 Bad Request
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_finance_search_provider_error(client):
    # Given
    import requests as req_lib
    mock_provider = MagicMock(spec=MarketDataProvider)
    mock_provider.search_by_name.side_effect = req_lib.HTTPError("Naver API failed")
    from main import app
    app.dependency_overrides[get_market_data] = lambda: mock_provider

    # When
    response = client.get("/finance/search?q=삼성")

    # Then: 500 Internal Server Error
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    app.dependency_overrides.pop(get_market_data)
