from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime

@dataclass
class Asset:
    name: str
    account_id: int
    id: Optional[int] = None
    code: Optional[str] = None
    category: str = "주식"
    target_weight: float = 0.0
    current_price: float = 0.0
    avg_price: float = 0.0
    quantity: float = 0.0

@dataclass
class Account:
    name: str
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
