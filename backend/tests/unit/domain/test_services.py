from src.snowball.domain.services import infer_category

def test_infer_category_happy_path():
    # Given: Common asset names and codes
    # When: infer_category is called
    # Then: Correct category is returned

    # Stocks
    assert infer_category("삼성전자", "005930") == "주식"
    assert infer_category("APPLE", "AAPL") == "주식"

    # Bonds
    assert infer_category("KOSEF 국고채 10년", "148070") == "채권"
    assert infer_category("TIGER 미국채10년선물", "305080") == "채권"
    assert infer_category("SHY", "SHY") == "채권"

    # Raw Materials
    assert infer_category("KODEX 골드선물(H)", "132030") == "원자재"
    assert infer_category("WTI Crude Oil", "OIL") == "원자재"

    # Cash
    assert infer_category("KODEX 미국달러선물", "261240") == "현금"
    assert infer_category("BIL", "BIL") == "현금"

def test_infer_category_edge_cases():
    # Given: Ambiguous or empty inputs

    # When: infer_category is called with empty strings
    # Then: Defaults to '주식'
    assert infer_category("", "") == "주식"

    # When: infer_category is called with mixed case
    # Then: Case insensitive match works
    assert infer_category("shy", "shy") == "채권"
    assert infer_category("Gold", "GOLD") == "원자재"

    # When: Name contains multiple keywords (Gold Bond)
    # Then: Priority order determines result (Bond checked before Raw Material?)
    # Implementation checks Bond first.
    assert infer_category("Gold Bond", "") == "채권"
