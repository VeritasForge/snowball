from typing import List, Optional
from sqlmodel import Field, SQLModel, Relationship

# --- Base Models (Pydantic only, shared fields) ---

class AccountBase(SQLModel):
    name: str = Field(default="내 포트폴리오")
    cash: float = Field(default=0.0, description="Available cash")

class AssetBase(SQLModel):
    name: str
    code: Optional[str] = None
    category: str = Field(default="주식") # 주식, 채권, 원자재 등
    target_weight: float = Field(default=0.0) # 목표 비중 (%)
    
    current_price: float = Field(default=0.0)
    avg_price: float = Field(default=0.0) # 평단가
    quantity: float = Field(default=0.0) # 보유 수량

# --- Table Models (DB only) ---

class Account(AccountBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    assets: List["Asset"] = Relationship(back_populates="account", sa_relationship_kwargs={"cascade": "all, delete"})

class Asset(AssetBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    account_id: Optional[int] = Field(default=None, foreign_key="account.id")
    account: Optional[Account] = Relationship(back_populates="assets")

# --- API Request Schemas ---

class AccountCreate(AccountBase):
    pass

class AccountUpdate(SQLModel):
    name: Optional[str] = None
    cash: Optional[float] = None

class AssetCreate(AssetBase):
    account_id: int

class AssetUpdate(SQLModel):
    name: Optional[str] = None
    code: Optional[str] = None
    category: Optional[str] = None
    target_weight: Optional[float] = None
    current_price: Optional[float] = None
    avg_price: Optional[float] = None
    quantity: Optional[float] = None

class ExecuteActionRequest(SQLModel):
    asset_id: int
    action_quantity: int # 양수: 매수, 음수: 매도
    price: float # 체결 단가

# --- API Response Schemas (Calculated) ---

# Inherit from AssetBase (NOT Asset) to avoid Relationship fields
class AssetCalculated(AssetBase):
    id: int
    account_id: int
    
    current_value: float
    invested_amount: float
    pl_amount: float
    pl_rate: float
    current_weight: float
    target_value: float
    diff_value: float
    action: str # BUY, SELL, HOLD
    action_quantity: int

class AccountCalculated(AccountBase):
    id: int
    
    total_asset_value: float # 주식+현금
    total_invested_value: float # 주식 평가금
    total_pl_amount: float
    total_pl_rate: float
    assets: List[AssetCalculated]