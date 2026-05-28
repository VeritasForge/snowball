from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, String
from sqlmodel import Field, Relationship, SQLModel

from ...domain.enums import AssetCategory


class UserModel(SQLModel, table=True):
    __tablename__ = "user"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    accounts: list["AccountModel"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete"},
    )


class AccountModel(SQLModel, table=True):
    __tablename__ = "account"
    id: int | None = Field(default=None, primary_key=True)
    name: str
    cash: float = 0.0
    user_id: UUID = Field(foreign_key="user.id", index=True)

    user: UserModel | None = Relationship(back_populates="accounts")
    assets: list["AssetModel"] = Relationship(
        back_populates="account",
        sa_relationship_kwargs={"cascade": "all, delete"},
    )


class AssetModel(SQLModel, table=True):
    __tablename__ = "asset"
    id: int | None = Field(default=None, primary_key=True)
    account_id: int | None = Field(default=None, foreign_key="account.id")
    name: str
    code: str | None = None
    # Plan A3.4 — explicit Column(String) keeps existing VARCHAR storage
    # compatible (no native PG ENUM creation). Repository _to_entity layer
    # (Plan A3.5) explicitly coerces back to AssetCategory.
    category: AssetCategory = Field(
        default=AssetCategory.STOCK,
        sa_column=Column(String, nullable=False, default=AssetCategory.STOCK.value),
    )
    target_weight: float = 0.0
    current_price: float = 0.0
    avg_price: float = 0.0
    quantity: float = 0.0

    account: AccountModel | None = Relationship(back_populates="assets")
