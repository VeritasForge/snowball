"""AssetCategory StrEnum tests (Happy/Boundary/Error)."""
import pytest

from src.snowball.domain.enums import AssetCategory


class TestAssetCategoryMembers:
    def test_all_expected_members_exist(self):
        # [Happy] 5 members 정의 + 값 일치
        assert AssetCategory.STOCK.value == "주식"
        assert AssetCategory.BOND.value == "채권"
        assert AssetCategory.COMMODITY.value == "원자재"
        assert AssetCategory.CASH.value == "현금"
        assert AssetCategory.OTHER.value == "기타"

    def test_member_count(self):
        # [Happy] 5개 정확히
        assert len(AssetCategory) == 5

    def test_strenum_equals_raw_str(self):
        # [Boundary] StrEnum은 str과 동등 비교
        assert AssetCategory.STOCK == "주식"
        assert "주식" == AssetCategory.STOCK

    def test_strenum_str_returns_value(self):
        # [Boundary] str(member) → value (PEP 663)
        assert str(AssetCategory.STOCK) == "주식"
        assert str(AssetCategory.BOND) == "채권"

    def test_isinstance_str(self):
        # [Boundary] StrEnum 인스턴스는 str
        assert isinstance(AssetCategory.STOCK, str)

    def test_construction_from_value(self):
        # [Boundary] 문자열 값으로 enum 생성
        assert AssetCategory("주식") is AssetCategory.STOCK
        assert AssetCategory("기타") is AssetCategory.OTHER

    def test_invalid_value_raises(self):
        # [Error] 잘못된 값 → ValueError
        with pytest.raises(ValueError):
            AssetCategory("알수없음")
