from typing import Sequence

from pydantic import BaseModel, ConfigDict

from ...domain.enums import AssetCategory


class AssetBase(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    code: str | None = None
    category: AssetCategory = AssetCategory.STOCK
    target_weight: float = 0.0
    current_price: float = 0.0
    avg_price: float = 0.0
    quantity: float = 0.0


class AssetCreate(AssetBase):
    account_id: int


class AssetUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str | None = None
    code: str | None = None
    category: AssetCategory | None = None
    target_weight: float | None = None
    current_price: float | None = None
    avg_price: float | None = None
    quantity: float | None = None


class AssetResponse(AssetBase):
    id: int
    account_id: int


class AccountCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = "내 포트폴리오"
    cash: float = 0.0


class AccountUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str | None = None
    cash: float | None = None


class AccountResponse(BaseModel):
    id: int
    name: str
    cash: float
    assets: Sequence[AssetResponse] = []


class AssetCalculatedResponse(AssetResponse):
    current_value: float
    invested_amount: float
    pl_amount: float
    pl_rate: float
    current_weight: float
    target_value: float
    diff_value: float
    action: str
    action_quantity: int


class AccountCalculatedResponse(AccountResponse):
    total_asset_value: float
    total_invested_value: float
    total_pl_amount: float
    total_pl_rate: float
    assets: Sequence[AssetCalculatedResponse]


class ExecuteActionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    asset_id: int
    action_quantity: int
    price: float


class UserRegister(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str
    password: str


class UserLogin(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    email: str
    created_at: str


class AssetInfoResponse(BaseModel):
    """Response for GET /finance/lookup."""
    name: str
    price: float
    category: AssetCategory


class TickerSearchResult(BaseModel):
    """One result item for GET /finance/search."""
    name: str
    code: str
    market: str
