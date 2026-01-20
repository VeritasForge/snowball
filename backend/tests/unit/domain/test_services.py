import pytest
from src.snowball.domain.services import infer_category

@pytest.mark.parametrize("name,code,expected", [
    ("삼성전자", "005930", "Stock"),
    ("APPLE", "AAPL", "Stock"),
    ("KOSEF 국고채 10년", "148070", "Bond"),
    ("TIGER 미국채10년선물", "305080", "Bond"),
    ("SHY", "SHY", "Bond"),
    ("KODEX 골드선물(H)", "132030", "Commodity"),
    ("WTI Crude Oil", "OIL", "Commodity"),
    ("KODEX 미국달러선물", "261240", "Cash"),
    ("BIL", "BIL", "Cash"),
])
def test_infer_category_happy_path(name, code, expected):
    # Given: Asset name and code from parameters
    # When: Category is inferred
    result = infer_category(name, code)

    # Then: Matches expected category
    assert result == expected

@pytest.mark.parametrize("name,code,expected", [
    ("", "", "Stock"),            # Empty defaults to Stock
    ("shy", "shy", "Bond"),      # Case insensitive
    ("Gold", "GOLD", "Commodity"),   # Case insensitive
    ("Gold Bond", "", "Bond"),   # Priority check (Bond > Raw Material)
])
def test_infer_category_edge_cases(name, code, expected):
    # Given: Edge case input
    # When: Category is inferred
    result = infer_category(name, code)

    # Then: Matches expected behavior
    assert result == expected
