from typing import List, Optional
from pydantic import BaseModel, Field

class AssetBase(BaseModel):
    name: str
    code: Optional[str] = None
    category: str = "Stock"
    target_weight: float = 0.0
    current_price: float = 0.0
    avg_price: float = 0.0
    quantity: float = 0.0

class AssetCreate(AssetBase):
    account_id: int

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    category: Optional[str] = None
    target_weight: Optional[float] = None
    current_price: Optional[float] = None
    avg_price: Optional[float] = None
    quantity: Optional[float] = None

class AssetResponse(AssetBase):
    id: int
    account_id: int

class AccountCreate(BaseModel):
    name: str = "My Portfolio"
    cash: float = 0.0

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    cash: Optional[float] = None

class AccountResponse(BaseModel):
    id: int
    name: str
    cash: float
    assets: List[AssetResponse] = []

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
    assets: List[AssetCalculatedResponse]

class ExecuteActionRequest(BaseModel):
    asset_id: int
    action_quantity: int
    price: float

class UserRegister(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UserResponse(BaseModel):
    id: str
    email: str
    created_at: str
