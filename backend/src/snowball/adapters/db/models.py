from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, ForeignKey, Index, Integer, String, Uuid, text
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
    presets: list["PresetModel"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
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
    # Plan A3.10 — partial UNIQUE index on (account_id, code) where code
    # IS NOT NULL. Enforces snowball-domain.md invariant "ticker는
    # account 내에서 유일" without rejecting nullable code rows. Declared
    # here so SQLModel.metadata and Alembic stay in sync (drift gate).
    __table_args__ = (
        Index(
            "uq_asset_account_code",
            "account_id",
            "code",
            unique=True,
            sqlite_where=text("code IS NOT NULL"),
            postgresql_where=text("code IS NOT NULL"),
        ),
    )

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


class PresetModel(SQLModel, table=True):
    """Plan B1.3 — saved portfolio allocation strategy, user-scoped.

    FK to user.id has explicit ondelete='CASCADE' so raw SQL deletes
    of users also clean up presets (ORM-only cascade leaves orphans).
    """
    __tablename__ = "preset"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, nullable=False)
    user_id: UUID = Field(
        sa_column=Column(
            Uuid,
            ForeignKey("user.id", ondelete="CASCADE"),
            index=True,
            nullable=False,
        ),
    )
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    user: UserModel | None = Relationship(back_populates="presets")
    items: list["PresetItemModel"] = Relationship(
        back_populates="preset",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class PresetItemModel(SQLModel, table=True):
    """Plan B1.3 — child entity of PresetModel aggregate.

    Stores ticker metadata + target_weight only (no avg_price/quantity).
    category uses the same plain-String mapping as AssetModel for
    StrEnum compatibility (see A3.4 rationale).
    """
    __tablename__ = "preset_item"

    id: int | None = Field(default=None, primary_key=True)
    preset_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("preset.id", ondelete="CASCADE"),
            index=True,
            nullable=False,
        ),
    )
    name: str = Field(max_length=200, nullable=False)
    code: str | None = Field(default=None, max_length=20)
    category: AssetCategory = Field(
        default=AssetCategory.STOCK,
        sa_column=Column(String, nullable=False, default=AssetCategory.STOCK.value),
    )
    target_weight: float = 0.0

    preset: PresetModel | None = Relationship(back_populates="items")
