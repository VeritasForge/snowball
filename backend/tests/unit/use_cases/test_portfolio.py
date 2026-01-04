import pytest
from unittest.mock import MagicMock
from src.snowball.use_cases.portfolio import CalculatePortfolioUseCase
from src.snowball.domain.entities import Account, Asset, AssetCalculationResult, PortfolioCalculationResult
from src.snowball.domain.exceptions import EntityNotFoundException

def test_calculate_portfolio_happy_path():
    # Given:
    # - 2 Assets, 50% target each.
    # - Current Price: 10,000 KRW each.
    # - Cash: 21,000 KRW.
    # - Total Asset Value = 21,000 (Cash 21k, Assets 0 val)
    # - Target per Asset: 10,500

    account = Account(id=1, name="Scenario Acc", cash=21000)
    asset_a = Asset(
        id=1, account_id=1, name="Asset A", code="A",
        target_weight=50.0, current_price=10000, quantity=0, avg_price=0
    )
    asset_b = Asset(
        id=2, account_id=1, name="Asset B", code="B",
        target_weight=50.0, current_price=10000, quantity=0, avg_price=0
    )
    account.assets = [asset_a, asset_b]

    # When: Portfolio calculation is executed
    use_case = CalculatePortfolioUseCase()
    result = use_case.execute(account)

    # Then:
    # - Action Qty: 1 (since 10,500 / 10,000 = 1.05 -> floor to 1)
    assert result.total_asset_value == 21000.0
    assert len(result.assets) == 2

    for item in result.assets:
        assert isinstance(item, AssetCalculationResult)
        assert item.target_value == 10500.0
        assert item.diff_value == 10500.0
        assert item.action == "BUY"
        assert item.action_quantity == 1

def test_calculate_portfolio_zero_target_weight():
    # Given: Asset with 0 target weight held in portfolio
    account = Account(id=1, name="Zero Target", cash=0)
    asset = Asset(
        id=1, account_id=1, name="Junk", code="J",
        target_weight=0.0, current_price=100, quantity=10, avg_price=100
    )
    account.assets = [asset]

    # When: Portfolio calculation is executed
    use_case = CalculatePortfolioUseCase()
    result = use_case.execute(account)

    # Then: It should be sold completely
    item = result.assets[0]
    assert item.target_value == 0
    # Current value = 1000. Target = 0. Diff = -1000.
    assert item.diff_value == -1000.0
    assert item.action == "SELL"
    assert item.action_quantity == -10

def test_calculate_portfolio_hold_action():
    # Given: Asset well-balanced (diff less than 1 share price)
    # Cash 0. Asset 1 qty * 10000 price. Total 10000. Target 100%.
    # Target value 10000. Current value 10000. Diff 0.

    account = Account(id=1, name="Hold", cash=0)
    asset = Asset(
        id=1, account_id=1, name="Stock", code="S",
        target_weight=100.0, current_price=10000, quantity=1, avg_price=10000
    )
    account.assets = [asset]

    # When: Portfolio calculation is executed
    use_case = CalculatePortfolioUseCase()
    result = use_case.execute(account)

    # Then: Action should be HOLD
    item = result.assets[0]
    assert item.action == "HOLD"
    assert item.action_quantity == 0

def test_calculate_portfolio_negative_cash():
    # Given: Account with negative cash (Debt)
    account = Account(id=1, name="Debt", cash=-5000)
    asset = Asset(
        id=1, account_id=1, name="Stock", code="S",
        target_weight=100.0, current_price=10000, quantity=1, avg_price=10000
    )
    # Total Value = 10000 - 5000 = 5000.
    # Target Value = 5000.
    # Current Value = 10000.
    # Diff = 5000 - 10000 = -5000.

    account.assets = [asset]

    # When: Portfolio calculation is executed
    use_case = CalculatePortfolioUseCase()
    result = use_case.execute(account)

    # Then: Logic should handle it (Total Asset Value reduced)
    # Action might be HOLD or SELL depending on diff/price.
    # Diff -5000. Price 10000. Ratio -0.5. Floor to 0.
    assert result.total_asset_value == 5000.0
    item = result.assets[0]
    assert item.action_quantity == 0
    assert item.action == "HOLD"
