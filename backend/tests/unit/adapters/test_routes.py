"""Unit tests for adapters/api/routes.py — dependency factories and get_current_user."""
import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from uuid import uuid4
from src.snowball.adapters.api.routes import (
    get_account_repo,
    get_asset_repo,
    get_auth_repo,
    get_market_data,
    get_password_hasher,
    get_jwt_service,
    get_current_user,
)
from src.snowball.adapters.db.repositories import (
    SqlAlchemyAccountRepository,
    SqlAlchemyAssetRepository,
    SqlAlchemyAuthRepository,
)
from src.snowball.adapters.external.market_data import RealMarketDataProvider
from src.snowball.infrastructure.security import PasswordHasher, JWTService
from src.snowball.domain.entities import User, UserId


class TestDependencyFactories:
    """[Happy] Factory functions return correct repository/service instances."""

    def test_get_account_repo_returns_correct_type(self):
        # Given
        mock_session = MagicMock()
        # When
        repo = get_account_repo(session=mock_session)
        # Then
        assert isinstance(repo, SqlAlchemyAccountRepository)

    def test_get_asset_repo_returns_correct_type(self):
        # Given
        mock_session = MagicMock()
        # When
        repo = get_asset_repo(session=mock_session)
        # Then
        assert isinstance(repo, SqlAlchemyAssetRepository)

    def test_get_auth_repo_returns_correct_type(self):
        # Given
        mock_session = MagicMock()
        # When
        repo = get_auth_repo(session=mock_session)
        # Then
        assert isinstance(repo, SqlAlchemyAuthRepository)

    def test_get_market_data_returns_correct_type(self):
        # When
        provider = get_market_data()
        # Then
        assert isinstance(provider, RealMarketDataProvider)

    def test_get_password_hasher_returns_correct_type(self):
        # When
        hasher = get_password_hasher()
        # Then
        assert isinstance(hasher, PasswordHasher)

    def test_get_jwt_service_returns_correct_type(self):
        # When
        service = get_jwt_service()
        # Then
        assert isinstance(service, JWTService)


class TestGetCurrentUser:
    """Tests for get_current_user dependency."""

    def _make_valid_token(self, user_id: str) -> str:
        return JWTService.create_access_token({"sub": user_id})

    # [Happy] Valid token with existing user returns user
    def test_returns_user_for_valid_token(self):
        # Given
        user_id = str(uuid4())
        token = self._make_valid_token(user_id)
        jwt_service = JWTService()
        mock_auth_repo = MagicMock(spec=SqlAlchemyAuthRepository)
        expected_user = User(id=UserId(uuid4()), email="test@example.com", password_hash="h")
        mock_auth_repo.get_by_id.return_value = expected_user
        # When
        result = get_current_user(token=token, jwt_service=jwt_service, auth_repo=mock_auth_repo)
        # Then
        assert result == expected_user

    # [Error] Invalid/garbage token raises 401
    def test_raises_401_for_invalid_token(self):
        # Given
        jwt_service = JWTService()
        mock_auth_repo = MagicMock(spec=SqlAlchemyAuthRepository)
        # When / Then
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(token="garbage.token", jwt_service=jwt_service, auth_repo=mock_auth_repo)
        assert exc_info.value.status_code == 401

    # [Error] Token with no 'sub' field raises 401
    def test_raises_401_when_token_has_no_sub(self):
        # Given: token with no 'sub'
        token = JWTService.create_access_token({"email": "no-sub@test.com"})
        jwt_service = JWTService()
        mock_auth_repo = MagicMock(spec=SqlAlchemyAuthRepository)
        # When / Then
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(token=token, jwt_service=jwt_service, auth_repo=mock_auth_repo)
        assert exc_info.value.status_code == 401

    # [Error] Valid token but user not found in DB raises 401
    def test_raises_401_when_user_not_in_db(self):
        # Given
        user_id = str(uuid4())
        token = self._make_valid_token(user_id)
        jwt_service = JWTService()
        mock_auth_repo = MagicMock(spec=SqlAlchemyAuthRepository)
        mock_auth_repo.get_by_id.return_value = None  # user not in DB
        # When / Then
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(token=token, jwt_service=jwt_service, auth_repo=mock_auth_repo)
        assert exc_info.value.status_code == 401
