import pytest
from unittest.mock import MagicMock
from src.snowball.use_cases.trade import ExecuteTradeUseCase
from src.snowball.domain.ports import AssetRepository, AccountRepository
from uuid import uuid4
from src.snowball.domain.entities import Account, Asset, UserId
from src.snowball.domain.exceptions import EntityNotFoundException, InsufficientFundsException, InvalidActionException

def test_execute_trade_buy_happy_path():
    # Given: Account with cash and asset in DB
    mock_asset_repo = MagicMock(spec=AssetRepository)
    mock_account_repo = MagicMock(spec=AccountRepository)

    account = Account(id=1, name="Test Acc", user_id=UserId(uuid4()), cash=20000)
    asset = Asset(
        id=1, account_id=1, name="Stock", code="S",
        target_weight=50.0, current_price=10000, quantity=0, avg_price=0
    )

    mock_asset_repo.get.return_value = asset
    mock_account_repo.get.return_value = account

    use_case = ExecuteTradeUseCase(mock_asset_repo, mock_account_repo)

    # When: Buy 1 unit @ 10000
    result = use_case.execute(asset_id=1, action_quantity=1, price=10000)

    # Then: Cash decreased, Quantity increased, Avg price updated
    assert account.cash == 10000.0
    assert asset.quantity == 1
    assert asset.avg_price == 10000.0

    # And: Repositories saved changes
    mock_asset_repo.save.assert_called_with(asset)
    mock_account_repo.save.assert_called_with(account)

def test_execute_trade_sell_happy_path():
    # Given: Account holding asset
    mock_asset_repo = MagicMock(spec=AssetRepository)
    mock_account_repo = MagicMock(spec=AccountRepository)

    account = Account(id=1, name="Test Acc", user_id=UserId(uuid4()), cash=0)
    asset = Asset(
        id=1, account_id=1, name="Stock", code="S",
        target_weight=50.0, current_price=10000, quantity=2, avg_price=10000
    )

    mock_asset_repo.get.return_value = asset
    mock_account_repo.get.return_value = account

    use_case = ExecuteTradeUseCase(mock_asset_repo, mock_account_repo)

    # When: Sell 1 unit @ 12000 (Profit)
    result = use_case.execute(asset_id=1, action_quantity=-1, price=12000)

    # Then: Cash increased, Quantity decreased, Avg price unchanged
    assert account.cash == 12000.0
    assert asset.quantity == 1
    assert asset.avg_price == 10000.0

    # And: Repositories saved changes
    mock_asset_repo.save.assert_called_with(asset)
    mock_account_repo.save.assert_called_with(account)

def test_execute_trade_insufficient_funds():
    # Given: Poor account
    mock_asset_repo = MagicMock(spec=AssetRepository)
    mock_account_repo = MagicMock(spec=AccountRepository)

    account = Account(id=1, name="Poor Acc", user_id=UserId(uuid4()), cash=5000)
    asset = Asset(id=1, account_id=1, name="Stock", quantity=0, avg_price=0)

    mock_asset_repo.get.return_value = asset
    mock_account_repo.get.return_value = account

    use_case = ExecuteTradeUseCase(mock_asset_repo, mock_account_repo)

    # When: Buying more than cash allows
    # Then: raises InsufficientFundsException
    with pytest.raises(InsufficientFundsException):
        use_case.execute(asset_id=1, action_quantity=1, price=10000)

def test_execute_trade_insufficient_quantity():
    # Given: Account with 1 unit
    mock_asset_repo = MagicMock(spec=AssetRepository)
    mock_account_repo = MagicMock(spec=AccountRepository)

    account = Account(id=1, name="Acc", user_id=UserId(uuid4()), cash=0)
    asset = Asset(id=1, account_id=1, name="Stock", quantity=1)

    mock_asset_repo.get.return_value = asset
    mock_account_repo.get.return_value = account

    use_case = ExecuteTradeUseCase(mock_asset_repo, mock_account_repo)

    # When: Selling 2 units
    # Then: raises InvalidActionException
    with pytest.raises(InvalidActionException):
        use_case.execute(asset_id=1, action_quantity=-2, price=10000)

def test_execute_trade_asset_not_found():
    # Given: Asset does not exist
    mock_asset_repo = MagicMock(spec=AssetRepository)
    mock_account_repo = MagicMock(spec=AccountRepository)

    mock_asset_repo.get.return_value = None

    use_case = ExecuteTradeUseCase(mock_asset_repo, mock_account_repo)

    # When: Executing trade
    # Then: raises EntityNotFoundException
    with pytest.raises(EntityNotFoundException):
        use_case.execute(asset_id=999, action_quantity=1, price=100)


def test_execute_trade_account_not_found_for_asset():
    # [Error] Asset found but its account does not exist
    # Given
    mock_asset_repo = MagicMock(spec=AssetRepository)
    mock_account_repo = MagicMock(spec=AccountRepository)

    asset = Asset(id=1, account_id=99, name="Orphan", quantity=0, avg_price=0)
    mock_asset_repo.get.return_value = asset
    mock_account_repo.get.return_value = None  # account 99 does not exist

    use_case = ExecuteTradeUseCase(mock_asset_repo, mock_account_repo)
    # When / Then
    with pytest.raises(EntityNotFoundException):
        use_case.execute(asset_id=1, action_quantity=1, price=100)


def test_execute_trade_account_id_none_after_save_raises():
    # [Error] Account has no ID after save (defensive branch)
    # Given
    mock_asset_repo = MagicMock(spec=AssetRepository)
    mock_account_repo = MagicMock(spec=AccountRepository)

    # Account with no id (simulates broken save)
    account = Account(name="NoId Acc", user_id=UserId(uuid4()), cash=10000)  # id=None
    asset = Asset(id=1, account_id=None, name="S", quantity=0, avg_price=0)
    asset.account_id = 0  # truthy but won't resolve

    mock_asset_repo.get.return_value = asset
    mock_account_repo.get.return_value = account  # account.id is None

    use_case = ExecuteTradeUseCase(mock_asset_repo, mock_account_repo)
    # When / Then
    with pytest.raises(EntityNotFoundException, match="Account ID is None"):
        use_case.execute(asset_id=1, action_quantity=1, price=100)


def test_execute_trade_account_not_found_after_save_raises():
    # [Error] Account cannot be re-fetched after save
    # Given
    mock_asset_repo = MagicMock(spec=AssetRepository)
    mock_account_repo = MagicMock(spec=AccountRepository)

    account = Account(id=5, name="Acc", user_id=UserId(uuid4()), cash=10000)
    asset = Asset(id=1, account_id=5, name="S", quantity=0, avg_price=0)

    mock_asset_repo.get.return_value = asset
    # First get returns account, second get (after save) returns None
    mock_account_repo.get.side_effect = [account, None]

    use_case = ExecuteTradeUseCase(mock_asset_repo, mock_account_repo)
    # When / Then
    with pytest.raises(EntityNotFoundException, match="not found after save"):
        use_case.execute(asset_id=1, action_quantity=1, price=100)


def test_execute_trade_buy_resulting_in_zero_qty_skips_avg_price_update():
    # [Boundary] BUY where new_qty == 0 — avg price update skipped (defensive branch)
    # Scenario: asset starts with quantity = -1 (already shorted), buying 1 brings qty to 0
    # new_qty = -1 + 1 = 0 — passes the "< 0" check but skips the avg price update
    # Given
    mock_asset_repo = MagicMock(spec=AssetRepository)
    mock_account_repo = MagicMock(spec=AccountRepository)

    account = Account(id=1, name="Acc", user_id=UserId(uuid4()), cash=10000)
    asset = Asset(id=1, account_id=1, name="S", quantity=-1, avg_price=500, current_price=100)

    mock_asset_repo.get.return_value = asset
    mock_account_repo.get.return_value = account

    use_case = ExecuteTradeUseCase(mock_asset_repo, mock_account_repo)
    # When: Buy 1 unit to cover the short position
    use_case.execute(asset_id=1, action_quantity=1, price=100)
    # Then: avg_price NOT updated (new_qty == 0, skip branch taken)
    assert asset.avg_price == 500  # unchanged
    assert asset.quantity == 0
