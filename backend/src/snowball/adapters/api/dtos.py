from typing import Sequence

from pydantic import BaseModel, ConfigDict, Field, field_validator

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


# ─────────────────────────────────────────────────────────────────────────────
# Plan B2.2 — Preset DTOs
# ─────────────────────────────────────────────────────────────────────────────


class PresetItemCreate(BaseModel):
    """Request DTO for one item in a preset save payload."""
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=200)
    code: str | None = Field(
        default=None, max_length=20, pattern=r"^[A-Za-z0-9._-]+$"
    )
    category: AssetCategory
    target_weight: float = Field(ge=0, le=100)

    @field_validator("code", mode="before")
    @classmethod
    def normalize_empty_code(cls, v):
        # '' → None so matching logic only checks code on real tickers
        if v == "":
            return None
        return v


class PresetCreate(BaseModel):
    """Request DTO for POST /presets. user_id is server-derived
    (extra='forbid' blocks mass-assignment of forged user_id)."""
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=100)
    items: list[PresetItemCreate] = Field(min_length=1, max_length=50)

    @field_validator("items")
    @classmethod
    def no_duplicate_match_key(cls, items):
        # Matching key = code if present, else 'name:<name>'. Two items
        # sharing the same key would collide in the apply algorithm
        # (B2.3) so reject at DTO level for clearer errors.
        seen: set[str] = set()
        for item in items:
            sig = item.code if item.code is not None else f"name:{item.name}"
            if sig in seen:
                raise ValueError(f"중복된 종목 매칭 키: {sig}")
            seen.add(sig)
        return items


class PresetItemResponse(BaseModel):
    """Response DTO for one item inside a preset.

    `id` is Optional: PresetItem is a child of the Preset aggregate and the
    domain entity does not surface its own id (B1.1). Returned as None rather
    than a fake placeholder; the frontend type mirrors this (`id?: number`).
    """
    id: int | None = None
    name: str
    code: str | None
    category: AssetCategory
    target_weight: float


class PresetResponse(BaseModel):
    """Response DTO for GET /presets and POST /presets."""
    id: int
    name: str
    created_at: str
    items: list[PresetItemResponse]


class ApplyPresetResponse(BaseModel):
    """Response DTO for POST /presets/{id}/apply/{account_id}.

    Carries the recomputed account + match-result metadata so the
    frontend can show "X updated, Y created" toast without a second
    round-trip.
    """
    account: AccountCalculatedResponse
    updated_count: int
    created_count: int
    weight_sum: float
