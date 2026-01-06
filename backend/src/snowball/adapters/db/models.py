from typing import List, Optional
from datetime import datetime
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel, Relationship

class UserModel(SQLModel, table=True):
    __tablename__ = "user"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    accounts: List["AccountModel"] = Relationship(back_populates="user", sa_relationship_kwargs={"cascade": "all, delete"})

class AccountModel(SQLModel, table=True):
    __tablename__ = "account"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    cash: float = 0.0
    user_id: UUID = Field(foreign_key="user.id", index=True)
    
    user: Optional[UserModel] = Relationship(back_populates="accounts")
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
