"""Unit tests for adapters/external/market_data.py — RealMarketDataProvider."""
import pytest
import pandas as pd
from unittest.mock import patch, MagicMock
from src.snowball.adapters.external.market_data import RealMarketDataProvider


class TestScrapeNaverFinance:
    # [Happy] Valid response with name and price
    @patch("src.snowball.adapters.external.market_data.requests.get")
    @patch("src.snowball.adapters.external.market_data.BeautifulSoup")
    def test_returns_name_and_price_on_success(self, mock_bs, mock_get):
        # Given
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "<html></html>"
        mock_get.return_value = mock_response

        mock_soup = MagicMock()
        name_tag = MagicMock()
        name_tag.text = "삼성전자"
        price_tag = MagicMock()
        price_tag.text = "70,000"
        mock_soup.select_one.side_effect = lambda sel: name_tag if "h2" in sel else price_tag
        mock_bs.return_value = mock_soup

        provider = RealMarketDataProvider()
        # When
        result = provider.scrape_naver_finance("005930")
        # Then
        assert result is not None
        assert result["name"] == "삼성전자"
        assert result["price"] == 70000.0

    # [Boundary] HTTP status != 200 returns None
    @patch("src.snowball.adapters.external.market_data.requests.get")
    def test_returns_none_when_status_not_200(self, mock_get):
        # Given
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response
        provider = RealMarketDataProvider()
        # When
        result = provider.scrape_naver_finance("005930")
        # Then
        assert result is None

    # [Boundary] Name tag missing returns None
    @patch("src.snowball.adapters.external.market_data.requests.get")
    @patch("src.snowball.adapters.external.market_data.BeautifulSoup")
    def test_returns_none_when_name_tag_missing(self, mock_bs, mock_get):
        # Given
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "<html></html>"
        mock_get.return_value = mock_response

        mock_soup = MagicMock()
        mock_soup.select_one.return_value = None  # both tags missing
        mock_bs.return_value = mock_soup

        provider = RealMarketDataProvider()
        # When
        result = provider.scrape_naver_finance("005930")
        # Then
        assert result is None

    # [Error] Exception during scraping returns None
    @patch("src.snowball.adapters.external.market_data.requests.get")
    def test_returns_none_on_exception(self, mock_get):
        # Given
        mock_get.side_effect = Exception("Network error")
        provider = RealMarketDataProvider()
        # When
        result = provider.scrape_naver_finance("005930")
        # Then
        assert result is None


class TestFetchPrice:
    # [Happy] Numeric code uses Naver scraper and returns price
    def test_returns_price_for_numeric_code_via_naver(self):
        # Given
        provider = RealMarketDataProvider()
        with patch.object(provider, "scrape_naver_finance", return_value={"name": "삼성", "price": 70000.0}):
            # When
            result = provider.fetch_price("005930")
        # Then
        assert result == 70000.0

    # [Boundary] Empty code returns None immediately
    def test_returns_none_for_empty_code(self):
        # Given
        provider = RealMarketDataProvider()
        # When
        result = provider.fetch_price("")
        # Then
        assert result is None

    # [Boundary] Numeric code with Naver returning None falls through to FDR
    @patch("src.snowball.adapters.external.market_data.fdr")
    def test_numeric_code_naver_fails_falls_through_to_fdr(self, mock_fdr):
        # Given
        provider = RealMarketDataProvider()
        mock_df = pd.DataFrame({"Close": [50000.0]})
        mock_fdr.DataReader.return_value = mock_df
        with patch.object(provider, "scrape_naver_finance", return_value=None):
            # When
            result = provider.fetch_price("005930")
        # Then
        assert result == 50000.0

    # [Happy] Non-numeric code uses FDR and returns price
    @patch("src.snowball.adapters.external.market_data.fdr")
    def test_returns_price_for_non_numeric_code_via_fdr(self, mock_fdr):
        # Given
        mock_df = pd.DataFrame({"Close": [180.0]})
        mock_fdr.DataReader.return_value = mock_df
        provider = RealMarketDataProvider()
        # When
        result = provider.fetch_price("AAPL")
        # Then
        assert result == 180.0

    # [Boundary] FDR returns empty DataFrame returns None
    @patch("src.snowball.adapters.external.market_data.fdr")
    def test_returns_none_when_fdr_returns_empty_dataframe(self, mock_fdr):
        # Given
        mock_fdr.DataReader.return_value = pd.DataFrame()
        provider = RealMarketDataProvider()
        # When
        result = provider.fetch_price("UNKN")
        # Then
        assert result is None

    # [Boundary] FDR returns None returns None
    @patch("src.snowball.adapters.external.market_data.fdr")
    def test_returns_none_when_fdr_returns_none(self, mock_fdr):
        # Given
        mock_fdr.DataReader.return_value = None
        provider = RealMarketDataProvider()
        # When
        result = provider.fetch_price("UNKN")
        # Then
        assert result is None

    # [Error] FDR raises exception returns None
    @patch("src.snowball.adapters.external.market_data.fdr")
    def test_returns_none_when_fdr_raises_exception(self, mock_fdr):
        # Given
        mock_fdr.DataReader.side_effect = Exception("FDR error")
        provider = RealMarketDataProvider()
        # When
        result = provider.fetch_price("BADC")
        # Then
        assert result is None


class TestFetchAssetInfo:
    # [Happy] Numeric code with valid Naver data returns asset info
    def test_returns_info_for_numeric_code_via_naver(self):
        # Given
        provider = RealMarketDataProvider()
        with patch.object(
            provider, "scrape_naver_finance",
            return_value={"name": "삼성전자", "price": 70000.0}
        ):
            # When
            result = provider.fetch_asset_info("005930")
        # Then
        assert result is not None
        assert result["name"] == "삼성전자"

    # [Boundary] Numeric code where Naver fails falls through to FDR
    @patch("src.snowball.adapters.external.market_data.fdr")
    def test_numeric_code_naver_fails_uses_fdr(self, mock_fdr):
        # Given
        mock_df = pd.DataFrame({"Close": [50000.0]})
        mock_fdr.DataReader.return_value = mock_df
        provider = RealMarketDataProvider()
        with patch.object(provider, "scrape_naver_finance", return_value=None):
            # When
            result = provider.fetch_asset_info("000660")
        # Then
        assert result is not None
        assert result["price"] == 50000.0

    # [Happy] Non-numeric code uses FDR and returns info with uppercased name
    @patch("src.snowball.adapters.external.market_data.fdr")
    def test_returns_info_for_non_numeric_code_via_fdr(self, mock_fdr):
        # Given
        mock_df = pd.DataFrame({"Close": [180.0]})
        mock_fdr.DataReader.return_value = mock_df
        provider = RealMarketDataProvider()
        # When
        result = provider.fetch_asset_info("aapl")
        # Then
        assert result is not None
        assert result["name"] == "AAPL"
        assert result["price"] == 180.0

    # [Boundary] FDR returns empty DataFrame returns None
    @patch("src.snowball.adapters.external.market_data.fdr")
    def test_returns_none_when_fdr_empty(self, mock_fdr):
        # Given
        mock_fdr.DataReader.return_value = pd.DataFrame()
        provider = RealMarketDataProvider()
        # When
        result = provider.fetch_asset_info("UNKN")
        # Then
        assert result is None

    # [Error] FDR raises exception returns None
    @patch("src.snowball.adapters.external.market_data.fdr")
    def test_returns_none_when_fdr_raises(self, mock_fdr):
        # Given
        mock_fdr.DataReader.side_effect = Exception("FDR error")
        provider = RealMarketDataProvider()
        # When
        result = provider.fetch_asset_info("BADC")
        # Then
        assert result is None
