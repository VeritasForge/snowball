"""Preset use case tests (Plan B2.3) — Happy/Boundary/Error per spec.

Custom exceptions enforce 404-unified IDOR policy (PresetNotFoundError
and AccountNotFoundError fire on both "not found" and "wrong owner").
"""
from datetime import datetime
from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from src.snowball.domain.entities import (
    Account, Asset, Preset, PresetItem, User, UserId,
)
from src.snowball.domain.enums import AssetCategory
from src.snowball.domain.ports import (
    AbstractPresetRepository, AccountRepository, AssetRepository,
)
from src.snowball.use_cases.presets import (
    ApplyPresetUseCase,
    CreatePresetUseCase,
    DeletePresetUseCase,
    ListPresetsUseCase,
    PresetNotFoundError,
    AccountNotFoundError,
)


@pytest.fixture
def user():
    return User(email="u@x.com", password_hash="h", id=UserId(uuid4()))


@pytest.fixture
def other_user():
    return User(email="o@x.com", password_hash="h", id=UserId(uuid4()))


@pytest.fixture
def preset_repo():
    return MagicMock(spec=AbstractPresetRepository)


@pytest.fixture
def account_repo():
    return MagicMock(spec=AccountRepository)


@pytest.fixture
def asset_repo():
    return MagicMock(spec=AssetRepository)


# ─────────────────────────────────────────────────────────────────────────────
# CreatePresetUseCase
# ─────────────────────────────────────────────────────────────────────────────


class TestCreatePresetUseCase:
    def test_binds_user_id_from_current_user_not_input(self, preset_repo, user, other_user):
        # [Happy] use case must use current_user.id as Preset.user_id
        # regardless of any input (defense against mass-assignment if a
        # caller bypasses DTO layer in the future)
        items = [PresetItem(name="A", category=AssetCategory.STOCK, target_weight=100)]
        preset_repo.save.return_value = Preset(
            id=1, name="X", user_id=user.id,
            created_at=datetime.utcnow(), items=items,
        )

        uc = CreatePresetUseCase(preset_repo)
        uc.execute(name="X", items=items, current_user=user)

        saved_arg = preset_repo.save.call_args[0][0]
        assert saved_arg.user_id == user.id
        assert saved_arg.user_id != other_user.id

    def test_returns_repository_result(self, preset_repo, user):
        # [Happy] use case returns whatever repo.save returns
        items = [PresetItem(name="A", category=AssetCategory.STOCK, target_weight=100)]
        expected = Preset(
            id=42, name="X", user_id=user.id,
            created_at=datetime.utcnow(), items=items,
        )
        preset_repo.save.return_value = expected
        result = CreatePresetUseCase(preset_repo).execute(
            name="X", items=items, current_user=user,
        )
        assert result is expected


# ─────────────────────────────────────────────────────────────────────────────
# ListPresetsUseCase
# ─────────────────────────────────────────────────────────────────────────────


class TestListPresetsUseCase:
    def test_calls_repo_list_by_user_with_current_user_id(self, preset_repo, user):
        # [Happy]
        preset_repo.list_by_user.return_value = []
        ListPresetsUseCase(preset_repo).execute(current_user=user)
        preset_repo.list_by_user.assert_called_once_with(user.id)

    def test_returns_empty_list(self, preset_repo, user):
        # [Boundary] no presets
        preset_repo.list_by_user.return_value = []
        result = ListPresetsUseCase(preset_repo).execute(current_user=user)
        assert result == []


# ─────────────────────────────────────────────────────────────────────────────
# DeletePresetUseCase
# ─────────────────────────────────────────────────────────────────────────────


class TestDeletePresetUseCase:
    def test_404_on_not_found(self, preset_repo, user):
        # [Error]
        preset_repo.get.return_value = None
        with pytest.raises(PresetNotFoundError):
            DeletePresetUseCase(preset_repo).execute(preset_id=1, current_user=user)
        preset_repo.delete.assert_not_called()

    def test_404_unified_on_wrong_owner(self, preset_repo, user, other_user):
        # [Error] 404-unified — wrong owner does NOT leak existence
        preset_repo.get.return_value = Preset(
            id=1, name="X", user_id=other_user.id,
            items=[PresetItem(name="A", category=AssetCategory.STOCK, target_weight=100)],
        )
        with pytest.raises(PresetNotFoundError):
            DeletePresetUseCase(preset_repo).execute(preset_id=1, current_user=user)
        preset_repo.delete.assert_not_called()

    def test_deletes_when_owner_matches(self, preset_repo, user):
        # [Happy]
        preset_repo.get.return_value = Preset(
            id=1, name="X", user_id=user.id,
            items=[PresetItem(name="A", category=AssetCategory.STOCK, target_weight=100)],
        )
        DeletePresetUseCase(preset_repo).execute(preset_id=1, current_user=user)
        preset_repo.delete.assert_called_once_with(1)


# ─────────────────────────────────────────────────────────────────────────────
# ApplyPresetUseCase
# ─────────────────────────────────────────────────────────────────────────────


def _refresh_account_after_save(account_repo, account):
    """Helper — make account_repo.get return the (possibly mutated) account."""
    account_repo.get.return_value = account


class TestApplyPresetUseCase:
    def _setup(self, preset_repo, account_repo, asset_repo, user, items, existing_assets):
        preset = Preset(id=10, name="P", user_id=user.id, items=items)
        account = Account(id=1, name="A", user_id=user.id, cash=0, assets=existing_assets)
        preset_repo.get.return_value = preset
        account_repo.get.return_value = account
        # asset_repo.save mutates the asset in place and returns it (typical pattern)
        asset_repo.save.side_effect = lambda a: a
        return preset, account

    def test_apply_404_on_missing_preset(self, preset_repo, account_repo, asset_repo, user):
        # [Error]
        preset_repo.get.return_value = None
        uc = ApplyPresetUseCase(preset_repo, account_repo, asset_repo)
        with pytest.raises(PresetNotFoundError):
            uc.execute(preset_id=99, account_id=1, current_user=user)

    def test_apply_404_unified_on_wrong_preset_owner(
        self, preset_repo, account_repo, asset_repo, user, other_user,
    ):
        # [Error] 404-unified
        preset_repo.get.return_value = Preset(
            id=10, name="P", user_id=other_user.id,
            items=[PresetItem(name="X", category=AssetCategory.STOCK, target_weight=100)],
        )
        with pytest.raises(PresetNotFoundError):
            ApplyPresetUseCase(preset_repo, account_repo, asset_repo).execute(
                preset_id=10, account_id=1, current_user=user,
            )

    def test_apply_404_on_missing_account(
        self, preset_repo, account_repo, asset_repo, user,
    ):
        # [Error]
        preset_repo.get.return_value = Preset(
            id=10, name="P", user_id=user.id,
            items=[PresetItem(name="X", category=AssetCategory.STOCK, target_weight=100)],
        )
        account_repo.get.return_value = None
        with pytest.raises(AccountNotFoundError):
            ApplyPresetUseCase(preset_repo, account_repo, asset_repo).execute(
                preset_id=10, account_id=1, current_user=user,
            )

    def test_apply_404_unified_on_wrong_account_owner(
        self, preset_repo, account_repo, asset_repo, user, other_user,
    ):
        # [Error] 404-unified
        preset_repo.get.return_value = Preset(
            id=10, name="P", user_id=user.id,
            items=[PresetItem(name="X", category=AssetCategory.STOCK, target_weight=100)],
        )
        account_repo.get.return_value = Account(
            id=1, name="A", user_id=other_user.id, cash=0, assets=[],
        )
        with pytest.raises(AccountNotFoundError):
            ApplyPresetUseCase(preset_repo, account_repo, asset_repo).execute(
                preset_id=10, account_id=1, current_user=user,
            )

    def test_apply_code_match_updates_target_weight_only(
        self, preset_repo, account_repo, asset_repo, user,
    ):
        # [Happy] code match → update target_weight; name/category/code preserved;
        # avg_price/quantity/current_price preserved
        existing_spy = Asset(
            id=1, name="My SPY Note", code="SPY",
            category=AssetCategory.STOCK,  # user previously edited
            target_weight=50, current_price=600, avg_price=580, quantity=10,
            account_id=1,
        )
        items = [PresetItem(
            name="Preset Name Different", code="SPY",
            category=AssetCategory.OTHER, target_weight=60,
        )]
        self._setup(preset_repo, account_repo, asset_repo, user, items, [existing_spy])

        result = ApplyPresetUseCase(preset_repo, account_repo, asset_repo).execute(
            preset_id=10, account_id=1, current_user=user,
        )

        assert result.updated_count == 1
        assert result.created_count == 0
        # target_weight UPDATED, everything else PRESERVED
        assert existing_spy.target_weight == 60
        assert existing_spy.name == "My SPY Note"
        assert existing_spy.category is AssetCategory.STOCK
        assert existing_spy.code == "SPY"
        assert existing_spy.avg_price == 580
        assert existing_spy.quantity == 10
        assert existing_spy.current_price == 600

    def test_apply_name_match_when_item_code_is_none(
        self, preset_repo, account_repo, asset_repo, user,
    ):
        # [Boundary] item.code=None → name match
        existing_cash = Asset(
            id=1, name="Cash", code=None,
            category=AssetCategory.CASH, target_weight=0,
            current_price=0, avg_price=0, quantity=0, account_id=1,
        )
        items = [PresetItem(name="Cash", category=AssetCategory.CASH, target_weight=10)]
        self._setup(preset_repo, account_repo, asset_repo, user, items, [existing_cash])

        result = ApplyPresetUseCase(preset_repo, account_repo, asset_repo).execute(
            preset_id=10, account_id=1, current_user=user,
        )

        assert result.updated_count == 1
        assert existing_cash.target_weight == 10

    def test_apply_creates_new_when_no_match(
        self, preset_repo, account_repo, asset_repo, user,
    ):
        # [Happy] no match → new asset (avg=0/qty=0/current=0)
        items = [PresetItem(
            name="TLT", code="TLT",
            category=AssetCategory.BOND, target_weight=30,
        )]
        self._setup(preset_repo, account_repo, asset_repo, user, items, [])

        result = ApplyPresetUseCase(preset_repo, account_repo, asset_repo).execute(
            preset_id=10, account_id=1, current_user=user,
        )

        assert result.updated_count == 0
        assert result.created_count == 1
        # New Asset saved via asset_repo.save with sentinel zeros
        new_asset = asset_repo.save.call_args[0][0]
        assert new_asset.name == "TLT"
        assert new_asset.code == "TLT"
        assert new_asset.category is AssetCategory.BOND
        assert new_asset.target_weight == 30
        assert new_asset.avg_price == 0
        assert new_asset.quantity == 0
        assert new_asset.current_price == 0
        assert new_asset.account_id == 1

    def test_apply_tier2_fallback_backfills_code(
        self, preset_repo, account_repo, asset_repo, user,
    ):
        # [Boundary] item.code set + no code match + name match → tier-2
        # matched asset's code is BACKFILLED from item
        existing_codeless = Asset(
            id=1, name="S&P500 ETF", code=None,
            category=AssetCategory.STOCK, target_weight=50,
            current_price=0, avg_price=0, quantity=0, account_id=1,
        )
        items = [PresetItem(
            name="S&P500 ETF", code="SPY",
            category=AssetCategory.STOCK, target_weight=60,
        )]
        self._setup(preset_repo, account_repo, asset_repo, user, items, [existing_codeless])

        result = ApplyPresetUseCase(preset_repo, account_repo, asset_repo).execute(
            preset_id=10, account_id=1, current_user=user,
        )

        assert result.updated_count == 1
        assert result.created_count == 0
        # tier-2: code backfilled, target_weight updated
        assert existing_codeless.code == "SPY"
        assert existing_codeless.target_weight == 60

    def test_apply_one_to_one_matching_no_double_match(
        self, preset_repo, account_repo, asset_repo, user,
    ):
        # [Boundary] 두 item이 같은 자산 후보면 첫 item만 매칭 → 두 번째는 created
        # (DTO no_duplicate_match_key가 같은 code/name 중복은 막지만, 다른 매칭 키가
        #  결과적으로 같은 asset에 도달하는 케이스 — 알고리즘 1:1 보장)
        existing = Asset(
            id=1, name="ETF X", code="ABC",
            category=AssetCategory.STOCK, target_weight=50,
            current_price=0, avg_price=0, quantity=0, account_id=1,
        )
        # item[0] code match → matched first
        # item[1] code=None but name="ETF X" → would name-match same asset,
        #          but it's already taken → falls through to create
        items = [
            PresetItem(name="other-name", code="ABC", category=AssetCategory.STOCK, target_weight=40),
            PresetItem(name="ETF X", category=AssetCategory.STOCK, target_weight=10),
        ]
        self._setup(preset_repo, account_repo, asset_repo, user, items, [existing])

        result = ApplyPresetUseCase(preset_repo, account_repo, asset_repo).execute(
            preset_id=10, account_id=1, current_user=user,
        )

        assert result.updated_count == 1
        assert result.created_count == 1
        # existing got updated to 40
        assert existing.target_weight == 40

    def test_apply_tier2_skips_consumed_and_matches_next_name(
        self, preset_repo, account_repo, asset_repo, user,
    ):
        # [Boundary] tier-2 must skip an already-consumed CODE-LESS asset and walk
        # to the next code-less name candidate (consumed-skip branch). Both items
        # carry codes but tier-2 only matches code-less assets, so each backfills
        # a distinct orphan.
        a1 = Asset(
            id=1, name="X", code=None,
            category=AssetCategory.STOCK, target_weight=10,
            current_price=0, avg_price=0, quantity=0, account_id=1,
        )
        a2 = Asset(
            id=2, name="X", code=None,
            category=AssetCategory.STOCK, target_weight=20,
            current_price=0, avg_price=0, quantity=0, account_id=1,
        )
        items = [
            # item 0: code C1, no code match → tier-2 name "X" → a1 (id-ASC), backfill C1
            PresetItem(name="X", code="C1", category=AssetCategory.STOCK, target_weight=30),
            # item 1: code C2, no code match → tier-2 name "X" → a1 consumed → SKIP → a2, backfill C2
            PresetItem(name="X", code="C2", category=AssetCategory.STOCK, target_weight=40),
        ]
        self._setup(preset_repo, account_repo, asset_repo, user, items, [a1, a2])

        result = ApplyPresetUseCase(preset_repo, account_repo, asset_repo).execute(
            preset_id=10, account_id=1, current_user=user,
        )

        assert result.updated_count == 2
        assert result.created_count == 0
        assert (a1.target_weight, a1.code) == (30, "C1")
        assert (a2.target_weight, a2.code) == (40, "C2")  # consumed-skip → next orphan

    def test_apply_coded_item_does_not_hijack_differently_coded_asset(
        self, preset_repo, account_repo, asset_repo, user,
    ):
        # [Error/regression] a coded item that finds no code match must NOT
        # name-match an asset that already has a DIFFERENT real code (name
        # collision between two distinct tickers). It creates a new asset
        # instead — updating the wrong ticker's weight/code is data corruption.
        existing = Asset(
            id=1, name="삼성전자", code="005930",
            category=AssetCategory.STOCK, target_weight=50,
            current_price=0, avg_price=0, quantity=0, account_id=1,
        )
        items = [PresetItem(
            name="삼성전자", code="000660",  # different ticker, same name
            category=AssetCategory.STOCK, target_weight=70,
        )]
        self._setup(preset_repo, account_repo, asset_repo, user, items, [existing])

        result = ApplyPresetUseCase(preset_repo, account_repo, asset_repo).execute(
            preset_id=10, account_id=1, current_user=user,
        )

        assert result.updated_count == 0
        assert result.created_count == 1
        # the existing 005930 holding is untouched — not hijacked by 000660
        assert existing.target_weight == 50
        assert existing.code == "005930"

    def test_apply_weight_sum_returns_sum_of_target_weights(
        self, preset_repo, account_repo, asset_repo, user,
    ):
        # [Boundary] weight_sum for FR-7 frontend warning UI
        items = [
            PresetItem(name="A", code="A", category=AssetCategory.STOCK, target_weight=70),
            PresetItem(name="B", code="B", category=AssetCategory.BOND, target_weight=40),
        ]
        # 70+40=110 → over 100% (allowed per FR-7)
        preset_repo.get.return_value = Preset(id=10, name="P", user_id=user.id, items=items)
        # account_repo.get is called twice: once for ownership check, once for refresh
        # Both return same account; saved assets accumulate via asset_repo.save side_effect.
        saved_assets: list[Asset] = []

        def save_side_effect(a: Asset) -> Asset:
            # Simulate DB assigning id on first save
            if a.id is None:
                a.id = len(saved_assets) + 100
            saved_assets.append(a)
            return a
        asset_repo.save.side_effect = save_side_effect

        account_repo.get.side_effect = [
            Account(id=1, name="A", user_id=user.id, cash=0, assets=[]),
            # After apply: account refreshed with newly-saved assets
            Account(id=1, name="A", user_id=user.id, cash=0, assets=saved_assets),
        ]

        result = ApplyPresetUseCase(preset_repo, account_repo, asset_repo).execute(
            preset_id=10, account_id=1, current_user=user,
        )

        assert result.weight_sum == 110.0
