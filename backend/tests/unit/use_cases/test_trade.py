import pytest
from unittest.mock import MagicMock
from src.snowball.use_cases.trade import ExecuteTradeUseCase
from src.snowball.domain.ports import AssetRepository, AccountRepository
from src.snowball.domain.entities import Account, Asset
from src.snowball.domain.exceptions import EntityNotFoundException, InsufficientFundsException, InvalidActionException

def test_execute_trade_buy_happy_path():
    # Setup
    mock_asset_repo = MagicMock(spec=AssetRepository)
    mock_account_repo = MagicMock(spec=AccountRepository)

    account = Account(id=1, name="Test Acc", cash=20000)
    asset = Asset(
        id=1, account_id=1, name="Stock", code="S",
        target_weight=50.0, current_price=10000, quantity=0, avg_price=0
    )

    mock_asset_repo.get.return_value = asset
    mock_account_repo.get.return_value = account

    use_case = ExecuteTradeUseCase(mock_asset_repo, mock_account_repo)

    # Execute Buy 1 @ 10000
    result = use_case.execute(asset_id=1, action_quantity=1, price=10000)

    # Verify
    assert account.cash == 10000.0
    assert asset.quantity == 1
    assert asset.avg_price == 10000.0

    mock_asset_repo.save.assert_called_with(asset)
    mock_account_repo.save.assert_called_with(account)

def test_execute_trade_sell_happy_path():
    # Setup
    mock_asset_repo = MagicMock(spec=AssetRepository)
    mock_account_repo = MagicMock(spec=AccountRepository)

    account = Account(id=1, name="Test Acc", cash=0)
    asset = Asset(
        id=1, account_id=1, name="Stock", code="S",
        target_weight=50.0, current_price=10000, quantity=2, avg_price=10000
    )

    mock_asset_repo.get.return_value = asset
    mock_account_repo.get.return_value = account

    use_case = ExecuteTradeUseCase(mock_asset_repo, mock_account_repo)

    # Execute Sell 1 @ 12000 (Profit)
    result = use_case.execute(asset_id=1, action_quantity=-1, price=12000)

    # Verify
    assert account.cash == 12000.0
    assert asset.quantity == 1
    assert asset.avg_price == 10000.0 # Avg price doesn't change on sell

    mock_asset_repo.save.assert_called_with(asset)
    mock_account_repo.save.assert_called_with(account)

def test_execute_trade_insufficient_funds():
    mock_asset_repo = MagicMock(spec=AssetRepository)
    mock_account_repo = MagicMock(spec=AccountRepository)

    account = Account(id=1, name="Poor Acc", cash=5000)
    asset = Asset(id=1, account_id=1, name="Stock", quantity=0, avg_price=0)

    mock_asset_repo.get.return_value = asset
    mock_account_repo.get.return_value = account

    use_case = ExecuteTradeUseCase(mock_asset_repo, mock_account_repo)

    # Try to buy 1 @ 10000
    with pytest.raises(InsufficientFundsException):
        use_case.execute(asset_id=1, action_quantity=1, price=10000)

def test_execute_trade_insufficient_quantity():
    mock_asset_repo = MagicMock(spec=AssetRepository)
    mock_account_repo = MagicMock(spec=AccountRepository)

    account = Account(id=1, name="Acc", cash=0)
    asset = Asset(id=1, account_id=1, name="Stock", quantity=1)

    mock_asset_repo.get.return_value = asset
    mock_account_repo.get.return_value = account

    use_case = ExecuteTradeUseCase(mock_asset_repo, mock_account_repo)

    # Try to sell 2
    with pytest.raises(InvalidActionException):
        use_case.execute(asset_id=1, action_quantity=-2, price=10000)

def test_execute_trade_asset_not_found():
    mock_asset_repo = MagicMock(spec=AssetRepository)
    mock_account_repo = MagicMock(spec=AccountRepository)

    mock_asset_repo.get.return_value = None

    use_case = ExecuteTradeUseCase(mock_asset_repo, mock_account_repo)

    with pytest.raises(EntityNotFoundException):
        use_case.execute(asset_id=999, action_quantity=1, price=100)
