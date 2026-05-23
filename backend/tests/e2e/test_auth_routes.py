"""E2E tests for auth routes: register, login, refresh, sync."""
from http import HTTPStatus
from fastapi.testclient import TestClient
from src.snowball.infrastructure.security import JWTService


class TestRegisterRoute:
    # [Happy] Valid registration returns created user
    def test_register_success(self, client: TestClient):
        # Given
        payload = {"email": "newuser@example.com", "password": "securepassword"}
        # When
        response = client.post("/auth/register", json=payload)
        # Then
        assert response.status_code == HTTPStatus.CREATED
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert "id" in data

    # [Error] Registering with duplicate email returns 400
    def test_register_duplicate_email_returns_400(self, client: TestClient):
        # Given: user already registered
        payload = {"email": "duplicate@example.com", "password": "password"}
        client.post("/auth/register", json=payload)
        # When: register again with same email
        response = client.post("/auth/register", json=payload)
        # Then
        assert response.status_code == HTTPStatus.BAD_REQUEST


class TestLoginRoute:
    # [Happy] Valid credentials return tokens
    def test_login_success_returns_tokens(self, client: TestClient):
        # Given: registered user
        client.post("/auth/register", json={"email": "login@example.com", "password": "mypassword"})
        # When
        response = client.post("/auth/login", json={"email": "login@example.com", "password": "mypassword"})
        # Then
        assert response.status_code == HTTPStatus.OK
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    # [Error] Wrong password returns 401
    def test_login_wrong_password_returns_401(self, client: TestClient):
        # Given: registered user
        client.post("/auth/register", json={"email": "user401@example.com", "password": "correct"})
        # When
        response = client.post("/auth/login", json={"email": "user401@example.com", "password": "wrong"})
        # Then
        assert response.status_code == HTTPStatus.UNAUTHORIZED

    # [Error] Non-existent user returns 401
    def test_login_unknown_user_returns_401(self, client: TestClient):
        # When
        response = client.post("/auth/login", json={"email": "ghost@example.com", "password": "pw"})
        # Then
        assert response.status_code == HTTPStatus.UNAUTHORIZED


class TestRefreshRoute:
    # [Happy] Valid refresh token returns new access token
    def test_refresh_with_valid_refresh_token(self, client: TestClient):
        # Given: registered and logged in user
        client.post("/auth/register", json={"email": "refresh@example.com", "password": "pw"})
        login_resp = client.post("/auth/login", json={"email": "refresh@example.com", "password": "pw"})
        refresh_token = login_resp.json()["refresh_token"]
        # When
        response = client.post("/auth/refresh", json={"refresh_token": refresh_token})
        # Then
        assert response.status_code == HTTPStatus.OK
        data = response.json()
        assert "access_token" in data
        assert data["refresh_token"] == refresh_token  # original refresh token kept

    # [Error] Invalid refresh token returns 401
    def test_refresh_with_invalid_token_returns_401(self, client: TestClient):
        # When
        response = client.post("/auth/refresh", json={"refresh_token": "garbage.token.here"})
        # Then
        assert response.status_code == HTTPStatus.UNAUTHORIZED

    # [Error] Access token used as refresh token returns 401
    def test_refresh_with_access_token_returns_401(self, client: TestClient):
        # Given: an access token (type != "refresh")
        access_token = JWTService.create_access_token({"sub": "some-user-id"})
        # When
        response = client.post("/auth/refresh", json={"refresh_token": access_token})
        # Then
        assert response.status_code == HTTPStatus.UNAUTHORIZED


class TestSyncRoute:
    # [Happy] Sync endpoint returns ok placeholder
    def test_sync_returns_ok(self, client: TestClient):
        # When
        response = client.post("/users/sync", json={"accounts": []})
        # Then
        assert response.status_code == HTTPStatus.OK
        assert response.json()["ok"] is True
