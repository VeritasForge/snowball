"""Unit tests for use_cases/sync.py — SyncPortfolioUseCase."""
import pytest
from unittest.mock import MagicMock
from uuid import uuid4
from src.snowball.use_cases.sync import SyncPortfolioUseCase
from src.snowball.domain.ports import AccountRepository, AssetRepository
from src.snowball.domain.entities import Account, Asset, UserId


def _make_account(id: int, user_id: UserId, name: str = "Acc") -> Account:
    return Account(id=id, name=name, user_id=user_id, cash=0.0)


class TestSyncPortfolioUseCase:
    # [Happy] Server has no accounts and local data exists → migrates local data
    def test_migrates_local_data_when_server_is_empty(self):
        # Given
        mock_account_repo = MagicMock(spec=AccountRepository)
        mock_asset_repo = MagicMock(spec=AssetRepository)
        user_id = UserId(uuid4())

        mock_account_repo.list_all.return_value = []  # no accounts on server

        saved_account = _make_account(id=1, user_id=user_id, name="내 계좌")
        mock_account_repo.save.return_value = saved_account
        mock_account_repo.list_all.side_effect = [
            [],  # first call: check existing
            [saved_account],  # second call (refresh list at end)
        ]

        local_accounts = [
            {
                "name": "내 계좌",
                "cash": 500000,
                "assets": [
                    {
                        "name": "삼성전자",
                        "code": "005930",
                        "category": "주식",
                        "targetWeight": 100.0,
                        "currentPrice": 70000,
                        "avgPrice": 65000,
                        "quantity": 5,
                    }
                ],
            }
        ]

        use_case = SyncPortfolioUseCase(mock_account_repo, mock_asset_repo)
        # When
        result = use_case.execute(user_id, local_accounts)
        # Then
        mock_account_repo.save.assert_called_once()
        mock_asset_repo.save.assert_called_once()
        assert result == [saved_account]

    # [Boundary] Server already has accounts → returns server accounts without migration
    def test_returns_server_accounts_when_they_exist(self):
        # Given
        mock_account_repo = MagicMock(spec=AccountRepository)
        mock_asset_repo = MagicMock(spec=AssetRepository)
        user_id = UserId(uuid4())

        existing = _make_account(id=10, user_id=user_id, name="서버 계좌")
        mock_account_repo.list_all.return_value = [existing]

        use_case = SyncPortfolioUseCase(mock_account_repo, mock_asset_repo)
        # When
        result = use_case.execute(user_id, local_accounts=[])
        # Then
        mock_account_repo.save.assert_not_called()
        mock_asset_repo.save.assert_not_called()
        assert result == [existing]

    # [Boundary] No server accounts and no local data → returns empty list
    def test_returns_empty_when_both_server_and_local_are_empty(self):
        # Given
        mock_account_repo = MagicMock(spec=AccountRepository)
        mock_asset_repo = MagicMock(spec=AssetRepository)
        user_id = UserId(uuid4())

        mock_account_repo.list_all.return_value = []

        use_case = SyncPortfolioUseCase(mock_account_repo, mock_asset_repo)
        # When
        result = use_case.execute(user_id, local_accounts=[])
        # Then
        mock_account_repo.save.assert_not_called()
        assert result == []

    # [Boundary] Local account with no assets still migrates account
    def test_migrates_account_with_no_assets(self):
        # Given
        mock_account_repo = MagicMock(spec=AccountRepository)
        mock_asset_repo = MagicMock(spec=AssetRepository)
        user_id = UserId(uuid4())

        saved_account = _make_account(id=2, user_id=user_id, name="빈 계좌")
        mock_account_repo.list_all.side_effect = [
            [],
            [saved_account],
        ]
        mock_account_repo.save.return_value = saved_account

        use_case = SyncPortfolioUseCase(mock_account_repo, mock_asset_repo)
        # When
        result = use_case.execute(user_id, local_accounts=[{"name": "빈 계좌", "cash": 0, "assets": []}])
        # Then
        mock_account_repo.save.assert_called_once()
        mock_asset_repo.save.assert_not_called()

    # [Error] Server save returns account with None id → raises ValueError
    def test_raises_if_saved_account_has_no_id(self):
        # Given
        mock_account_repo = MagicMock(spec=AccountRepository)
        mock_asset_repo = MagicMock(spec=AssetRepository)
        user_id = UserId(uuid4())

        mock_account_repo.list_all.return_value = []
        # Simulate save returning account with no ID
        no_id_account = Account(name="broken", user_id=user_id, cash=0.0)  # id=None
        mock_account_repo.save.return_value = no_id_account

        use_case = SyncPortfolioUseCase(mock_account_repo, mock_asset_repo)
        # When / Then
        with pytest.raises(ValueError, match="Failed to save account"):
            use_case.execute(user_id, local_accounts=[{"name": "계좌", "cash": 0, "assets": [{"name": "A"}]}])

    # [Boundary] Accounts from a different user are filtered out, triggering migration
    def test_filters_accounts_by_user_id(self):
        # Given
        mock_account_repo = MagicMock(spec=AccountRepository)
        mock_asset_repo = MagicMock(spec=AssetRepository)

        user_a = UserId(uuid4())
        user_b = UserId(uuid4())

        # Server only has user_b's account
        other_user_account = _make_account(id=99, user_id=user_b, name="B의 계좌")
        saved_account = _make_account(id=100, user_id=user_a, name="A의 계좌")

        mock_account_repo.list_all.side_effect = [
            [other_user_account],  # first call: check existing
            [saved_account],       # second call: refresh after migration
        ]
        mock_account_repo.save.return_value = saved_account

        local_accounts = [{"name": "A의 계좌", "cash": 0, "assets": []}]
        use_case = SyncPortfolioUseCase(mock_account_repo, mock_asset_repo)
        # When
        result = use_case.execute(user_a, local_accounts)
        # Then: migrated because user_a had no accounts
        mock_account_repo.save.assert_called_once()
