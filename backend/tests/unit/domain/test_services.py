import pytest

from src.snowball.domain.enums import AssetCategory
from src.snowball.domain.services import infer_category


@pytest.mark.parametrize("name,code,expected", [
    ("삼성전자", "005930", AssetCategory.STOCK),
    ("APPLE", "AAPL", AssetCategory.STOCK),
    ("KOSEF 국고채 10년", "148070", AssetCategory.BOND),
    ("TIGER 미국채10년선물", "305080", AssetCategory.BOND),
    ("SHY", "SHY", AssetCategory.BOND),
    ("KODEX 골드선물(H)", "132030", AssetCategory.COMMODITY),
    ("WTI Crude Oil", "OIL", AssetCategory.COMMODITY),
    ("KODEX 미국달러선물", "261240", AssetCategory.CASH),
    ("BIL", "BIL", AssetCategory.CASH),
])
def test_infer_category_happy_path(name, code, expected):
    # [Happy]
    result = infer_category(name, code)
    assert result == expected


@pytest.mark.parametrize("name,code,expected", [
    ("", "", AssetCategory.STOCK),              # Empty defaults to Stock
    ("shy", "shy", AssetCategory.BOND),         # Case insensitive
    ("Gold", "GOLD", AssetCategory.COMMODITY),  # Case insensitive
    ("Gold Bond", "", AssetCategory.BOND),      # Priority Bond > Commodity
])
def test_infer_category_edge_cases(name, code, expected):
    # [Boundary]
    result = infer_category(name, code)
    assert result == expected


def test_infer_category_returns_assetcategory_type():
    # [Error/contract] 반환 타입은 AssetCategory 인스턴스 (raw str 아님)
    result = infer_category("삼성전자", "005930")
    assert isinstance(result, AssetCategory)
