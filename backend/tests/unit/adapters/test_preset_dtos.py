"""PresetCreate / PresetItemCreate validators (Plan B2.2)."""
import pytest
from pydantic import ValidationError

from src.snowball.domain.enums import AssetCategory
from src.snowball.adapters.api.dtos import PresetCreate, PresetItemCreate


class TestPresetItemCreate:
    def test_valid_item(self):
        # [Happy]
        item = PresetItemCreate(
            name="SPY", code="SPY", category=AssetCategory.STOCK, target_weight=60,
        )
        assert item.code == "SPY"
        assert item.category is AssetCategory.STOCK

    def test_empty_code_normalized_to_none(self):
        # [Boundary] '' → None (matching consistency)
        item = PresetItemCreate(
            name="X", code="", category=AssetCategory.STOCK, target_weight=50,
        )
        assert item.code is None

    def test_code_omitted_defaults_to_none(self):
        # [Boundary] code 미전달
        item = PresetItemCreate(name="X", category=AssetCategory.STOCK, target_weight=50)
        assert item.code is None

    def test_code_pattern_rejects_special_chars(self):
        # [Error] code에 허용 안 되는 문자
        with pytest.raises(ValidationError):
            PresetItemCreate(
                name="X", code="A B", category=AssetCategory.STOCK, target_weight=50,
            )

    def test_target_weight_negative_rejected(self):
        # [Error] target_weight 음수
        with pytest.raises(ValidationError):
            PresetItemCreate(
                name="X", category=AssetCategory.STOCK, target_weight=-1,
            )

    def test_target_weight_over_100_rejected(self):
        # [Error] >100
        with pytest.raises(ValidationError):
            PresetItemCreate(
                name="X", category=AssetCategory.STOCK, target_weight=101,
            )

    def test_name_empty_rejected(self):
        # [Error] min_length=1
        with pytest.raises(ValidationError):
            PresetItemCreate(
                name="", category=AssetCategory.STOCK, target_weight=50,
            )

    def test_name_too_long_rejected(self):
        # [Error] max_length=200
        with pytest.raises(ValidationError):
            PresetItemCreate(
                name="X" * 201, category=AssetCategory.STOCK, target_weight=50,
            )

    def test_extra_field_rejected(self):
        # [Error] extra='forbid'
        with pytest.raises(ValidationError):
            PresetItemCreate(
                name="X", category=AssetCategory.STOCK, target_weight=50,
                preset_id=999,  # extra
            )


class TestPresetCreate:
    def _items(self):
        return [
            PresetItemCreate(name="A", code="AAA", category=AssetCategory.STOCK, target_weight=60),
            PresetItemCreate(name="B", code="BBB", category=AssetCategory.BOND, target_weight=40),
        ]

    def test_valid_preset(self):
        # [Happy]
        p = PresetCreate(name="My", items=self._items())
        assert len(p.items) == 2

    def test_empty_items_rejected(self):
        # [Error] min_length=1
        with pytest.raises(ValidationError):
            PresetCreate(name="My", items=[])

    def test_too_many_items_rejected(self):
        # [Error] max_length=50
        items = [
            PresetItemCreate(
                name=f"X{i}", code=f"X{i}",
                category=AssetCategory.STOCK, target_weight=1,
            )
            for i in range(51)
        ]
        with pytest.raises(ValidationError):
            PresetCreate(name="My", items=items)

    def test_name_empty_rejected(self):
        # [Error] min_length=1
        with pytest.raises(ValidationError):
            PresetCreate(name="", items=self._items())

    def test_name_too_long_rejected(self):
        # [Error] max_length=100
        with pytest.raises(ValidationError):
            PresetCreate(name="X" * 101, items=self._items())

    def test_duplicate_code_rejected(self):
        # [Error] 같은 code → no_duplicate_match_key
        with pytest.raises(ValidationError, match="중복된 종목 매칭 키"):
            PresetCreate(
                name="My",
                items=[
                    PresetItemCreate(name="A", code="SPY", category=AssetCategory.STOCK, target_weight=50),
                    PresetItemCreate(name="B", code="SPY", category=AssetCategory.STOCK, target_weight=50),
                ],
            )

    def test_duplicate_name_when_no_code_rejected(self):
        # [Error] code=None + same name → 거부
        with pytest.raises(ValidationError, match="중복된 종목 매칭 키"):
            PresetCreate(
                name="My",
                items=[
                    PresetItemCreate(name="X", category=AssetCategory.STOCK, target_weight=50),
                    PresetItemCreate(name="X", category=AssetCategory.BOND, target_weight=50),
                ],
            )

    def test_code_vs_no_code_same_name_allowed(self):
        # [Boundary] code='SPY' vs code=None,name='SPY' — 다른 매칭 키이므로 허용
        # (spec rl-verify NEW-2 — DTO에서 분리, apply 알고리즘이 1:1로 잡음)
        p = PresetCreate(
            name="My",
            items=[
                PresetItemCreate(name="A", code="SPY", category=AssetCategory.STOCK, target_weight=50),
                PresetItemCreate(name="SPY", category=AssetCategory.STOCK, target_weight=50),
            ],
        )
        assert len(p.items) == 2

    def test_user_id_extra_rejected(self):
        # [Error] extra='forbid' — mass-assignment 차단
        with pytest.raises(ValidationError):
            PresetCreate(name="My", items=self._items(), user_id="forged-uuid")
