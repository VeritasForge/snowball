"""Preset use cases — Plan B2.3.

Public:
- CreatePresetUseCase    : POST /presets
- ListPresetsUseCase     : GET /presets
- DeletePresetUseCase    : DELETE /presets/{id}
- ApplyPresetUseCase     : POST /presets/{id}/apply/{account_id}

Exceptions:
- PresetNotFoundError   : 404-unified (not found OR wrong owner)
- AccountNotFoundError  : 404-unified (not found OR wrong owner)

Mass-assignment is closed at this layer: CreatePresetUseCase explicitly
binds Preset.user_id = current_user.id regardless of caller intent.
"""
from dataclasses import dataclass

from ..domain.entities import Account, Asset, Preset, PresetItem, User
from ..domain.ports import (
    AbstractPresetRepository,
    AccountRepository,
    AssetRepository,
)


class PresetNotFoundError(Exception):
    """Raised when a preset is missing OR not owned by current user.

    Same exception for both states so the API surface returns a unified
    404 — preset_id enumeration cannot distinguish "doesn't exist" from
    "belongs to someone else".
    """


class AccountNotFoundError(Exception):
    """Same 404-unified policy for the apply target account."""


@dataclass
class ApplyResult:
    """Internal result carrier — API layer converts to ApplyPresetResponse."""
    account: Account
    updated_count: int
    created_count: int
    weight_sum: float


class CreatePresetUseCase:
    def __init__(self, preset_repo: AbstractPresetRepository):
        self.preset_repo = preset_repo

    def execute(
        self,
        *,
        name: str,
        items: list[PresetItem],
        current_user: User,
    ) -> Preset:
        # user_id is SERVER-DERIVED — caller cannot inject another user
        preset = Preset(name=name, user_id=current_user.id, items=list(items))
        return self.preset_repo.save(preset)


class ListPresetsUseCase:
    def __init__(self, preset_repo: AbstractPresetRepository):
        self.preset_repo = preset_repo

    def execute(self, *, current_user: User) -> list[Preset]:
        return self.preset_repo.list_by_user(current_user.id)


class DeletePresetUseCase:
    def __init__(self, preset_repo: AbstractPresetRepository):
        self.preset_repo = preset_repo

    def execute(self, *, preset_id: int, current_user: User) -> None:
        preset = self.preset_repo.get(preset_id)
        if preset is None or preset.user_id != current_user.id:
            raise PresetNotFoundError(f"Preset {preset_id} not found")
        self.preset_repo.delete(preset_id)


class ApplyPresetUseCase:
    """Overlay a preset onto an account.

    Algorithm (Plan §4.3 of spec, with rl-verify refinements):
    For each preset item, find a matching existing asset in the account:
      1. If item.code is set, try code match first
      2. If item.code is None, try name match
      3. Tier-2 fallback: item.code set but no code match → try name
         match and BACKFILL asset.code from item (orphan repair)
    Matched assets get target_weight updated; name/category/code/
    avg_price/quantity/current_price preserved (sole exception: tier-2
    backfills code). Unmatched items become NEW assets with sentinel
    zeros for avg/quantity/current.

    1:1 invariant: an asset matched by an earlier item is excluded from
    subsequent matches (subsequent items fall through to create).
    """

    def __init__(
        self,
        preset_repo: AbstractPresetRepository,
        account_repo: AccountRepository,
        asset_repo: AssetRepository,
    ):
        self.preset_repo = preset_repo
        self.account_repo = account_repo
        self.asset_repo = asset_repo

    @staticmethod
    def _match_for_item(
        item: PresetItem,
        available: list[Asset],
        consumed: set[int],
    ) -> Asset | None:
        """Find the best-matching unconsumed asset for one preset item.

        Single-pass walk over `available` (already sorted id-ASC for
        determinism). For each candidate not yet consumed:
        - remember the FIRST code-equal asset (only meaningful when
          item.code is set)
        - remember the FIRST NAME-equal asset that is a VALID name match:
          when the item carries a code, only a CODE-LESS existing asset
          qualifies (spec §4.3.c "code-less existing asset") — a coded
          asset with a DIFFERENT code is a different instrument that merely
          shares a name, so matching it would update the wrong ticker. When
          the item is code-less, any name-equal asset qualifies (spec b).
        Then return code_match if any, else name_match, else None.

        Caller detects the tier-2 orphan-repair case (code backfill) via
        `not matched.code and item.code is not None` (falsy code = '' or None,
        consistent with the frontend dry-run's `!a.code`).
        """
        code_match: Asset | None = None
        name_match: Asset | None = None
        for a in available:
            if id(a) in consumed:
                continue
            if (
                code_match is None
                and item.code  # truthy: '' / None item code = code-less (match frontend `if (item.code)`)
                and a.code == item.code
            ):
                code_match = a
            if (
                name_match is None
                and a.name == item.name
                and (not item.code or not a.code)  # either falsy code = code-less
            ):
                name_match = a
        return code_match if code_match is not None else name_match

    def execute(
        self,
        *,
        preset_id: int,
        account_id: int,
        current_user: User,
    ) -> ApplyResult:
        preset = self.preset_repo.get(preset_id)
        if preset is None or preset.user_id != current_user.id:
            raise PresetNotFoundError(f"Preset {preset_id} not found")

        account = self.account_repo.get(account_id)
        if account is None or account.user_id != current_user.id:
            raise AccountNotFoundError(f"Account {account_id} not found")

        # 1:1 matching with id-ASC tiebreak (deterministic). We track
        # consumed assets by `id(obj)` rather than `asset.id` so phantom
        # objects (asset.id None) are still bounded to a single match.
        available = sorted(account.assets, key=lambda a: a.id or 0)
        consumed: set[int] = set()
        updated_count = 0
        created_count = 0

        for item in preset.items:
            matched = self._match_for_item(item, available, consumed)
            # tier-2 = orphan repair ONLY: a CODE-LESS existing asset name-matched
            # by a coded item gets its code backfilled (spec §4.3: "code-less
            # existing asset이 매칭되면"). A name-matched asset that already has a
            # different real code keeps it — overwriting would corrupt a real
            # holding's ticker on a mere name collision.
            # tier-2 orphan backfill: matched asset is code-less ('' or None) and
            # the item carries a real code. All-truthy checks keep parity with the
            # frontend dry-run (`if (item.code)` / `!a.code`) for empty strings.
            tier_2 = matched is not None and not matched.code and bool(item.code)

            if matched is not None:
                # Update path — target_weight always, code backfill on tier-2
                matched.target_weight = item.target_weight
                if tier_2:
                    matched.code = item.code
                self.asset_repo.save(matched)
                consumed.add(id(matched))
                updated_count += 1
            else:
                # Create path — sentinel zeros for avg/quantity/current
                new_asset = Asset(
                    name=item.name,
                    account_id=account.id,  # type: ignore[arg-type]
                    code=item.code,
                    category=item.category,
                    target_weight=item.target_weight,
                    current_price=0.0,
                    avg_price=0.0,
                    quantity=0.0,
                )
                self.asset_repo.save(new_asset)
                created_count += 1

        # Refresh account state and compute the recap
        refreshed = self.account_repo.get(account_id)
        # account_repo.get returns Account | None; after a successful apply
        # the account must still exist. None here would be a concurrent
        # delete — surface as 404 for consistency with the entry guard.
        if refreshed is None:  # pragma: no cover  (race; integration handles)
            raise AccountNotFoundError(f"Account {account_id} not found")
        weight_sum = sum(a.target_weight for a in refreshed.assets)
        return ApplyResult(
            account=refreshed,
            updated_count=updated_count,
            created_count=created_count,
            weight_sum=weight_sum,
        )
