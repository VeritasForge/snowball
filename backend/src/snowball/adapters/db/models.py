from typing import List, Optional
from sqlmodel import Field, SQLModel, Relationship

class AccountModel(SQLModel, table=True):
    __tablename__ = "account"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    cash: float = 0.0
    
    assets: List["AssetModel"] = Relationship(back_populates="account", sa_relationship_kwargs={"cascade": "all, delete"})

class AssetModel(SQLModel, table=True):
    __tablename__ = "asset"
    id: Optional[int] = Field(default=None, primary_key=True)
    account_id: Optional[int] = Field(default=None, foreign_key="account.id")
    name: str
    code: Optional[str] = None
    category: str = "주식"
    target_weight: float = 0.0
    current_price: float = 0.0
    avg_price: float = 0.0
    quantity: float = 0.0
    
    account: Optional[AccountModel] = Relationship(back_populates="assets")
