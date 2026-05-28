from dataclasses import dataclass, field
from typing import NewType
from datetime import datetime
from uuid import UUID, uuid4

from .enums import AssetCategory

UserId = NewType("UserId", UUID)


@dataclass(frozen=True)
class Password:
    value: str


@dataclass
class User:
    email: str
    password_hash: str
    id: UserId = field(default_factory=lambda: UserId(uuid4()))
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Asset:
    name: str
    account_id: int
    id: int | None = None
    code: str | None = None
    category: AssetCategory = AssetCategory.STOCK
    target_weight: float = 0.0
    current_price: float = 0.0
    avg_price: float = 0.0
    quantity: float = 0.0


@dataclass
class Account:
    name: str
    user_id: UserId
    cash: float = 0.0
    id: int | None = None
    assets: list[Asset] = field(default_factory=list)


@dataclass
class AssetCalculationResult:
    asset: Asset
    current_value: float
    invested_amount: float
    pl_amount: float
    pl_rate: float
    current_weight: float
    target_value: float
    diff_value: float
    action: str  # BUY, SELL, HOLD
    action_quantity: int


@dataclass
class PortfolioCalculationResult:
    account: Account
    total_asset_value: float
    total_invested_value: float
    total_pl_amount: float
    total_pl_rate: float
    assets: list[AssetCalculationResult]


@dataclass
class PresetItem:
    """Portfolio allocation preset item — stores ticker metadata + target weight.

    preset_id is intentionally NOT part of the domain entity: PresetItem is
    a child entity within the Preset aggregate. It is never queried
    independently, so the parent FK is a persistence concern handled by
    the repository (asymmetry with Asset.account_id is by design).
    """
    name: str
    category: AssetCategory
    target_weight: float
    code: str | None = None


@dataclass
class Preset:
    """Saved portfolio allocation strategy, user-scoped.

    Stores only target weights + ticker metadata (no avg_price, quantity,
    or current_price). Apply use case (B2.3) overlays the preset onto a
    specific account.
    """
    name: str
    user_id: UserId
    id: int | None = None
    created_at: datetime | None = None
    items: list[PresetItem] = field(default_factory=list)
