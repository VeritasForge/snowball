"""Preset / PresetItem dataclass tests (Happy/Boundary).

Note: target_weight 음수/>100 검증은 Pydantic DTO 레벨에서 처리.
도메인 dataclass는 단순 보관자이므로 외부 IO/검증 부재 → Error 케이스는
DTO 테스트(B2.2)에서 다룸.
"""
from datetime import datetime
from uuid import uuid4

from src.snowball.domain.entities import Preset, PresetItem, UserId
from src.snowball.domain.enums import AssetCategory


class TestPresetItem:
    def test_create_with_required_fields(self):
        # [Happy] minimal fields
        item = PresetItem(name="SPY", category=AssetCategory.STOCK, target_weight=60.0)
        assert item.name == "SPY"
        assert item.category is AssetCategory.STOCK
        assert item.target_weight == 60.0
        assert item.code is None  # default

    def test_create_with_optional_code(self):
        # [Boundary] code 있음
        item = PresetItem(
            name="S&P500", code="SPY",
            category=AssetCategory.STOCK, target_weight=50.0,
        )
        assert item.code == "SPY"

    def test_target_weight_zero_allowed_in_domain(self):
        # [Boundary] 도메인 dataclass는 0 허용 (DTO가 ge=0으로 검증)
        item = PresetItem(name="X", category=AssetCategory.OTHER, target_weight=0.0)
        assert item.target_weight == 0.0


class TestPreset:
    def test_create_with_empty_items_in_domain(self):
        # [Happy] items 기본값 빈 list — DTO가 min_length=1 강제
        user_id = UserId(uuid4())
        preset = Preset(name="My Portfolio", user_id=user_id)
        assert preset.name == "My Portfolio"
        assert preset.user_id == user_id
        assert preset.items == []
        assert preset.id is None
        assert preset.created_at is None

    def test_create_with_multiple_items(self):
        # [Boundary] items 여러 개
        user_id = UserId(uuid4())
        preset = Preset(
            name="3-Fund",
            user_id=user_id,
            items=[
                PresetItem(name="SPY", code="SPY", category=AssetCategory.STOCK, target_weight=60.0),
                PresetItem(name="TLT", code="TLT", category=AssetCategory.BOND, target_weight=30.0),
                PresetItem(name="GLD", code="GLD", category=AssetCategory.COMMODITY, target_weight=10.0),
            ],
        )
        assert len(preset.items) == 3
        # 도메인 레벨에서는 합계 100% 강제 안 함 (FR-7)
        assert sum(i.target_weight for i in preset.items) == 100.0

    def test_preset_with_explicit_id_and_created_at(self):
        # [Boundary] id/created_at 있는 케이스 (repository에서 채워진 후 도메인 객체)
        user_id = UserId(uuid4())
        now = datetime.utcnow()
        preset = Preset(id=42, name="X", user_id=user_id, created_at=now)
        assert preset.id == 42
        assert preset.created_at is now
