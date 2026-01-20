from dataclasses import dataclass, field
from typing import List, Optional, NewType
from datetime import datetime
from uuid import UUID, uuid4

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
    id: Optional[int] = None
    code: Optional[str] = None
    category: str = "Stock"
    target_weight: float = 0.0
    current_price: float = 0.0
    avg_price: float = 0.0
    quantity: float = 0.0

@dataclass
class Account:
    name: str
    user_id: UserId
    cash: float = 0.0
    id: Optional[int] = None
    assets: List[Asset] = field(default_factory=list)

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
    assets: List[AssetCalculationResult]
