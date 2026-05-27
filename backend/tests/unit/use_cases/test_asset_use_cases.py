"""Unit tests for use_cases/assets.py — UpdateAssetPricesUseCase and FetchAssetInfoUseCase."""
import pytest
from unittest.mock import MagicMock, create_autospec
from src.snowball.use_cases.assets import UpdateAssetPricesUseCase, FetchAssetInfoUseCase, SearchAssetUseCase
from src.snowball.domain.ports import AssetRepository, MarketDataProvider
from src.snowball.adapters.db.repositories import SqlAlchemyAssetRepository
from src.snowball.domain.entities import Asset


def _make_asset_repo_mock():
    """MagicMock for the concrete asset repo (includes list_all_with_code)."""
    mock = MagicMock()
    return mock


class TestUpdateAssetPricesUseCase:
    # [Happy] Updates prices for all assets that have new prices available
    def test_updates_price_for_all_assets_with_valid_price(self):
        # Given
        mock_repo = _make_asset_repo_mock()
        mock_market = MagicMock(spec=MarketDataProvider)

        asset1 = Asset(name="Apple", account_id=1, code="AAPL", current_price=150.0)
        asset2 = Asset(name="Google", account_id=1, code="GOOGL", current_price=100.0)
        mock_repo.list_all_with_code.return_value = [asset1, asset2]
        mock_market.fetch_price.side_effect = [180.0, 120.0]

        use_case = UpdateAssetPricesUseCase(mock_repo, mock_market)
        # When
        count = use_case.execute()
        # Then
        assert count == 2
        assert asset1.current_price == 180.0
        assert asset2.current_price == 120.0
        assert mock_repo.save.call_count == 2

    # [Boundary] Asset with no price available is skipped (price is None)
    def test_skips_asset_when_price_not_available(self):
        # Given
        mock_repo = _make_asset_repo_mock()
        mock_market = MagicMock(spec=MarketDataProvider)

        asset = Asset(name="Unknown", account_id=1, code="UNKN", current_price=50.0)
        mock_repo.list_all_with_code.return_value = [asset]
        mock_market.fetch_price.return_value = None  # no price available

        use_case = UpdateAssetPricesUseCase(mock_repo, mock_market)
        # When
        count = use_case.execute()
        # Then: asset not saved, count = 0
        assert count == 0
        mock_repo.save.assert_not_called()

    # [Boundary] Mixed assets: one has price, one does not → only the valid one is updated
    def test_skips_asset_without_price_and_updates_others(self):
        # Given
        mock_repo = _make_asset_repo_mock()
        mock_market = MagicMock(spec=MarketDataProvider)

        asset_with_price = Asset(name="Apple", account_id=1, code="AAPL", current_price=150.0)
        asset_without_price = Asset(name="Unknown", account_id=1, code="UNKN", current_price=50.0)
        mock_repo.list_all_with_code.return_value = [asset_with_price, asset_without_price]
        # First asset gets a new price, second gets None
        mock_market.fetch_price.side_effect = [180.0, None]

        use_case = UpdateAssetPricesUseCase(mock_repo, mock_market)
        # When
        count = use_case.execute()
        # Then: only asset_with_price is updated
        assert count == 1
        assert asset_with_price.current_price == 180.0
        assert asset_without_price.current_price == 50.0  # unchanged
        assert mock_repo.save.call_count == 1

    # [Boundary] No assets with code returns count 0
    def test_returns_zero_when_no_assets_have_code(self):
        # Given
        mock_repo = _make_asset_repo_mock()
        mock_market = MagicMock(spec=MarketDataProvider)
        mock_repo.list_all_with_code.return_value = []

        use_case = UpdateAssetPricesUseCase(mock_repo, mock_market)
        # When
        count = use_case.execute()
        # Then
        assert count == 0


class TestFetchAssetInfoUseCase:
    # [Happy] Provider returns info with category already set
    def test_returns_info_with_existing_category(self):
        # Given
        mock_market = MagicMock(spec=MarketDataProvider)
        mock_market.fetch_asset_info.return_value = {
            "name": "Samsung",
            "price": 70000.0,
            "category": "주식"
        }
        use_case = FetchAssetInfoUseCase(mock_market)
        # When
        result = use_case.execute("005930")
        # Then
        assert result is not None
        assert result["category"] == "주식"

    # [Boundary] Provider returns info without category → category is inferred
    def test_infers_category_when_not_provided(self):
        # Given
        mock_market = MagicMock(spec=MarketDataProvider)
        mock_market.fetch_asset_info.return_value = {
            "name": "Apple",
            "price": 180.0,
            # no "category" key
        }
        use_case = FetchAssetInfoUseCase(mock_market)
        # When
        result = use_case.execute("AAPL")
        # Then: category is inferred (not None/empty)
        assert result is not None
        assert "category" in result
        assert result["category"]  # truthy

    # [Boundary] Provider returns info with empty category → category is inferred
    def test_infers_category_when_category_is_empty_string(self):
        # Given
        mock_market = MagicMock(spec=MarketDataProvider)
        mock_market.fetch_asset_info.return_value = {
            "name": "Gold",
            "price": 2000.0,
            "category": ""  # empty string
        }
        use_case = FetchAssetInfoUseCase(mock_market)
        # When
        result = use_case.execute("GLD")
        # Then
        assert result is not None
        assert result["category"]

    # [Error] Provider returns None → returns None
    def test_returns_none_when_provider_returns_none(self):
        # Given
        mock_market = MagicMock(spec=MarketDataProvider)
        mock_market.fetch_asset_info.return_value = None
        use_case = FetchAssetInfoUseCase(mock_market)
        # When
        result = use_case.execute("INVALID")
        # Then
        assert result is None


class TestSearchAssetUseCase:
    # [Happy] Provider returns results → use case returns them as-is
    def test_returns_results_from_provider(self):
        # Given
        mock_market = MagicMock(spec=MarketDataProvider)
        mock_market.search_by_name.return_value = [
            {"name": "삼성전자", "code": "005930", "market": "KOSPI"},
        ]
        use_case = SearchAssetUseCase(mock_market)
        # When
        result = use_case.execute("삼성")
        # Then
        assert result == [{"name": "삼성전자", "code": "005930", "market": "KOSPI"}]
        mock_market.search_by_name.assert_called_once_with("삼성")

    # [Boundary] Provider returns empty list → use case returns empty list
    def test_returns_empty_list_when_no_results(self):
        # Given
        mock_market = MagicMock(spec=MarketDataProvider)
        mock_market.search_by_name.return_value = []
        use_case = SearchAssetUseCase(mock_market)
        # When
        result = use_case.execute("없는종목")
        # Then
        assert result == []

    # [Error] Provider raises → use case propagates exception
    def test_propagates_exception_from_provider(self):
        # Given
        import requests as req_lib
        mock_market = MagicMock(spec=MarketDataProvider)
        mock_market.search_by_name.side_effect = req_lib.HTTPError("500")
        use_case = SearchAssetUseCase(mock_market)
        # When / Then
        with pytest.raises(req_lib.HTTPError):
            use_case.execute("삼성")
