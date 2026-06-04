from http import HTTPStatus
from fastapi.testclient import TestClient
from main import app
from src.snowball.adapters.api.routes import get_current_user

def test_finance_lookup_missing_auth(client: TestClient):
    app.dependency_overrides.pop(get_current_user, None)
    response = client.get("/finance/lookup?code=005930")
    assert response.status_code == HTTPStatus.UNAUTHORIZED

def test_finance_search_missing_auth(client: TestClient):
    app.dependency_overrides.pop(get_current_user, None)
    response = client.get("/finance/search?q=삼성")
    assert response.status_code == HTTPStatus.UNAUTHORIZED

def test_users_sync_missing_auth(client: TestClient):
    app.dependency_overrides.pop(get_current_user, None)
    response = client.post("/users/sync", json={"accounts": []})
    assert response.status_code == HTTPStatus.UNAUTHORIZED
