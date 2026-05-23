"""Unit tests for specific route handler branches that can't be triggered via normal DB operations.

Covers cases where an asset exists but its account has been deleted (cascade-prevented scenarios).
Uses mocking to isolate the route handler logic.
"""
import pytest
from http import HTTPStatus
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from uuid import uuid4
from main import app
from src.snowball.infrastructure.db import get_session
from src.snowball.adapters.api.routes import get_current_user, get_asset_repo, get_account_repo
from src.snowball.adapters.db.repositories import SqlAlchemyAssetRepository, SqlAlchemyAccountRepository
from src.snowball.domain.entities import User, UserId, Asset, Account


@pytest.fixture
def current_user():
    return User(id=UserId(uuid4()), email="test@test.com", password_hash="h")


@pytest.fixture
def mock_asset_repo():
    return MagicMock(spec=SqlAlchemyAssetRepository)


@pytest.fixture
def mock_account_repo():
    return MagicMock(spec=SqlAlchemyAccountRepository)


@pytest.fixture
def client_with_mocks(current_user, mock_asset_repo, mock_account_repo):
    """Client with both repos mocked directly."""
    app.dependency_overrides[get_current_user] = lambda: current_user
    app.dependency_overrides[get_asset_repo] = lambda: mock_asset_repo
    app.dependency_overrides[get_account_repo] = lambda: mock_account_repo
    client = TestClient(app, base_url="http://testserver/api/v1")
    yield client
    app.dependency_overrides.clear()


class TestUpdateAssetAccountNotFound:
    # [Error] Update asset where account lookup returns None → 404
    def test_update_asset_returns_404_when_account_not_found(
        self, client_with_mocks, current_user, mock_asset_repo, mock_account_repo
    ):
        # Given: asset exists but its account is gone
        asset = Asset(id=10, account_id=99, name="S", quantity=0, avg_price=0)
        mock_asset_repo.get.return_value = asset
        mock_account_repo.get.return_value = None  # account missing

        # When
        response = client_with_mocks.patch("/assets/10", json={"name": "New"})
        # Then
        assert response.status_code == HTTPStatus.NOT_FOUND


class TestDeleteAssetAccountNotFound:
    # [Error] Delete asset where account lookup returns None → 404
    def test_delete_asset_returns_404_when_account_not_found(
        self, client_with_mocks, current_user, mock_asset_repo, mock_account_repo
    ):
        # Given: asset exists but its account is gone
        asset = Asset(id=20, account_id=99, name="S", quantity=0, avg_price=0)
        mock_asset_repo.get.return_value = asset
        mock_account_repo.get.return_value = None  # account missing

        # When
        response = client_with_mocks.delete("/assets/20")
        # Then
        assert response.status_code == HTTPStatus.NOT_FOUND


class TestExecuteTradeAccountNotFound:
    # [Error] Execute trade where account lookup returns None → 404
    def test_execute_trade_returns_404_when_account_not_found(
        self, client_with_mocks, current_user, mock_asset_repo, mock_account_repo
    ):
        # Given: asset exists but its account is gone
        asset = Asset(id=30, account_id=99, name="S", quantity=0, avg_price=0)
        mock_asset_repo.get.return_value = asset
        mock_account_repo.get.return_value = None  # account missing

        # When
        response = client_with_mocks.post(
            "/assets/execute",
            json={"asset_id": 30, "action_quantity": 1, "price": 100}
        )
        # Then
        assert response.status_code == HTTPStatus.NOT_FOUND


class TestExecuteTradeEntityNotFoundException:
    # [Error] Execute trade where use_case raises EntityNotFoundException → 404
    def test_execute_trade_returns_404_on_entity_not_found_from_use_case(
        self, client_with_mocks, current_user, mock_asset_repo, mock_account_repo
    ):
        # Given: asset and account found for ownership check, but use_case raises EntityNotFoundException
        asset = Asset(id=40, account_id=1, name="S", quantity=0, avg_price=0)
        account = Account(id=1, name="Acc", user_id=current_user.id, cash=10000)
        mock_asset_repo.get.return_value = asset
        mock_account_repo.get.return_value = account

        from src.snowball.domain.exceptions import EntityNotFoundException
        with patch(
            "src.snowball.adapters.api.routes.ExecuteTradeUseCase"
        ) as MockUseCase:
            MockUseCase.return_value.execute.side_effect = EntityNotFoundException("Entity gone")
            response = client_with_mocks.post(
                "/assets/execute",
                json={"asset_id": 40, "action_quantity": 1, "price": 100}
            )
        # Then
        assert response.status_code == HTTPStatus.NOT_FOUND
