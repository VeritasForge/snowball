import pytest
from src.snowball.domain.services import infer_category

@pytest.mark.parametrize("name,code,expected", [
    ("삼성전자", "005930", "주식"),
    ("APPLE", "AAPL", "주식"),
    ("KOSEF 국고채 10년", "148070", "채권"),
    ("TIGER 미국채10년선물", "305080", "채권"),
    ("SHY", "SHY", "채권"),
    ("KODEX 골드선물(H)", "132030", "원자재"),
    ("WTI Crude Oil", "OIL", "원자재"),
    ("KODEX 미국달러선물", "261240", "현금"),
    ("BIL", "BIL", "현금"),
])
def test_infer_category_happy_path(name, code, expected):
    # Given: Asset name and code from parameters
    # When: Category is inferred
    result = infer_category(name, code)

    # Then: Matches expected category
    assert result == expected

@pytest.mark.parametrize("name,code,expected", [
    ("", "", "주식"),            # Empty defaults to Stock
    ("shy", "shy", "채권"),      # Case insensitive
    ("Gold", "GOLD", "원자재"),   # Case insensitive
    ("Gold Bond", "", "채권"),   # Priority check (Bond > Raw Material)
])
def test_infer_category_edge_cases(name, code, expected):
    # Given: Edge case input
    # When: Category is inferred
    result = infer_category(name, code)

    # Then: Matches expected behavior
    assert result == expected
