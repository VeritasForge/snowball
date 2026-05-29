import os
import logging
import httpx
from typing import List, Annotated
from http import HTTPStatus
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlmodel import Session
from uuid import UUID

from ...infrastructure.db import get_session
from ..db.repositories import (
    SqlAlchemyAccountRepository, SqlAlchemyAssetRepository,
    SqlAlchemyAuthRepository, SqlAlchemyPresetRepository,
)
from ..external.market_data import RealMarketDataProvider
from ...use_cases.portfolio import CalculatePortfolioUseCase
from ...use_cases.trade import ExecuteTradeUseCase
from ...use_cases.assets import FetchAssetInfoUseCase, SearchAssetUseCase
from ...use_cases.auth import RegisterUserUseCase, LoginUseCase
from ...use_cases.sync import SyncPortfolioUseCase
from ...use_cases.presets import (
    CreatePresetUseCase, ListPresetsUseCase,
    DeletePresetUseCase, ApplyPresetUseCase,
    PresetNotFoundError, AccountNotFoundError,
)
from ...infrastructure.security import PasswordHasher, JWTService
from ...domain.entities import Account, Asset, Preset, PresetItem, User, UserId
from ...domain.exceptions import EntityNotFoundException, InsufficientFundsException, InvalidActionException
from .dtos import (
    AccountCreate, AccountUpdate, AccountCalculatedResponse,
    AssetCreate, AssetUpdate, AssetResponse, AssetCalculatedResponse,
    ExecuteActionRequest,
    AccountResponse, UserRegister, UserLogin, TokenResponse, UserResponse,
    RefreshTokenRequest, AssetInfoResponse, TickerSearchResult,
    PresetCreate, PresetResponse, PresetItemResponse, ApplyPresetResponse,
)

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
logger = logging.getLogger(__name__)

# Per-IP rate limiter for the unauthenticated finance proxy endpoints. These
# forward to an external API, so limit outbound amplification / abuse. The limit
# is read per request so tests (and ops) can override it via env.
limiter = Limiter(key_func=get_remote_address)


def _finance_rate_limit() -> str:
    return os.environ.get("FINANCE_RATE_LIMIT", "60/minute")

# --- Dependencies ---
def get_account_repo(session: Session = Depends(get_session)):
    return SqlAlchemyAccountRepository(session)

def get_asset_repo(session: Session = Depends(get_session)):
    return SqlAlchemyAssetRepository(session)

def get_auth_repo(session: Session = Depends(get_session)):
    return SqlAlchemyAuthRepository(session)

def get_preset_repo(session: Session = Depends(get_session)):
    return SqlAlchemyPresetRepository(session)

def get_market_data():
    return RealMarketDataProvider()

def get_password_hasher():
    return PasswordHasher()

def get_jwt_service():
    return JWTService()

def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    jwt_service: Annotated[JWTService, Depends(get_jwt_service)],
    auth_repo: Annotated[SqlAlchemyAuthRepository, Depends(get_auth_repo)]
) -> User:
    payload = jwt_service.decode_token(token)
    if not payload:
        raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Invalid token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Invalid token payload")
    
    user = auth_repo.get_by_id(UserId(UUID(user_id)))
    if not user:
        raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="User not found")
    return user

# --- Routes ---

@router.post("/auth/register", response_model=UserResponse, status_code=HTTPStatus.CREATED)
def register(
    data: UserRegister,
    repo: Annotated[SqlAlchemyAuthRepository, Depends(get_auth_repo)],
    hasher: Annotated[PasswordHasher, Depends(get_password_hasher)]
):
    use_case = RegisterUserUseCase(repo, hasher)
    try:
        user = use_case.execute(data.email, data.password)
        return UserResponse(id=str(user.id), email=user.email, created_at=user.created_at.isoformat())
    except ValueError as e:
        raise HTTPException(HTTPStatus.BAD_REQUEST, str(e))

@router.post("/auth/login", response_model=TokenResponse)
def login(
    data: UserLogin,
    repo: Annotated[SqlAlchemyAuthRepository, Depends(get_auth_repo)],
    hasher: Annotated[PasswordHasher, Depends(get_password_hasher)],
    jwt_service: Annotated[JWTService, Depends(get_jwt_service)]
):
    use_case = LoginUseCase(repo, hasher, jwt_service)
    try:
        tokens = use_case.execute(data.email, data.password)
        return TokenResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"]
        )
    except ValueError as e:
        raise HTTPException(HTTPStatus.UNAUTHORIZED, str(e))

@router.post("/auth/refresh", response_model=TokenResponse)
def refresh_token(
    data: RefreshTokenRequest,
    jwt_service: Annotated[JWTService, Depends(get_jwt_service)]
):
    new_access_token = jwt_service.refresh_access_token(data.refresh_token)
    if not new_access_token:
        raise HTTPException(HTTPStatus.UNAUTHORIZED, "Invalid or expired refresh token")
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=data.refresh_token  # 기존 refresh token 유지
    )

@router.post("/users/sync")
def sync_portfolio(
    local_data: dict,
    account_repo: Annotated[SqlAlchemyAccountRepository, Depends(get_account_repo)],
    asset_repo: Annotated[SqlAlchemyAssetRepository, Depends(get_asset_repo)],
    jwt_service: Annotated[JWTService, Depends(get_jwt_service)]
):
    # In a real app, we'd use a security dependency to get current_user
    # Simplified for now: assume token is validated or passed in body
    # This is a placeholder for actual token validation and user_id extraction
    use_case = SyncPortfolioUseCase(account_repo, asset_repo)
    # user_id = ... (from token)
    # return use_case.execute(user_id, local_data.get("accounts", []))
    return {"ok": True, "message": "Sync logic implemented (placeholder)"}

def map_calculation_result(result) -> AccountCalculatedResponse:
    # Flatten Account properties
    acc = result.account
    
    # Flatten Asset properties
    assets_response = []
    for item in result.assets:
        asset_ent = item.asset
        assets_response.append(AssetCalculatedResponse(
            id=asset_ent.id,
            account_id=asset_ent.account_id,
            name=asset_ent.name,
            code=asset_ent.code,
            category=asset_ent.category,
            target_weight=asset_ent.target_weight,
            current_price=asset_ent.current_price,
            avg_price=asset_ent.avg_price,
            quantity=asset_ent.quantity,
            current_value=item.current_value,
            invested_amount=item.invested_amount,
            pl_amount=item.pl_amount,
            pl_rate=item.pl_rate,
            current_weight=item.current_weight,
            target_value=item.target_value,
            diff_value=item.diff_value,
            action=item.action,
            action_quantity=item.action_quantity
        ))

    return AccountCalculatedResponse(
        id=acc.id,
        name=acc.name,
        cash=acc.cash,
        assets=assets_response,
        total_asset_value=result.total_asset_value,
        total_invested_value=result.total_invested_value,
        total_pl_amount=result.total_pl_amount,
        total_pl_rate=result.total_pl_rate
    )

@router.get("/accounts", response_model=List[AccountCalculatedResponse])
def list_accounts(
    account_repo: Annotated[SqlAlchemyAccountRepository, Depends(get_account_repo)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    accounts = account_repo.list_by_user_with_assets(current_user.id)
    use_case = CalculatePortfolioUseCase()
    return [map_calculation_result(use_case.execute(acc)) for acc in accounts]

@router.post("/accounts", response_model=AccountResponse)
def create_account(
    account: AccountCreate,
    account_repo: Annotated[SqlAlchemyAccountRepository, Depends(get_account_repo)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    entity = Account(name=account.name, cash=account.cash, user_id=current_user.id)
    saved = account_repo.save(entity)
    return saved

@router.patch("/accounts/{account_id}", response_model=AccountResponse)
def update_account(
    account_id: int,
    update: AccountUpdate,
    account_repo: Annotated[SqlAlchemyAccountRepository, Depends(get_account_repo)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    existing = account_repo.get(account_id)
    if not existing:
        raise HTTPException(HTTPStatus.NOT_FOUND, "Account not found")
    
    if existing.user_id != current_user.id:
        raise HTTPException(HTTPStatus.FORBIDDEN, "Forbidden")

    # Update fields
    if update.name is not None:
        existing.name = update.name
    if update.cash is not None:
        existing.cash = update.cash
        
    saved = account_repo.save(existing)
    return saved

@router.delete("/accounts/{account_id}")
def delete_account(
    account_id: int,
    account_repo: Annotated[SqlAlchemyAccountRepository, Depends(get_account_repo)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    existing = account_repo.get(account_id)
    if not existing:
        raise HTTPException(HTTPStatus.NOT_FOUND, "Account not found")

    if existing.user_id != current_user.id:
        raise HTTPException(HTTPStatus.FORBIDDEN, "Forbidden")

    account_repo.delete(account_id)
    return {"ok": True}

@router.post("/assets", response_model=AssetResponse)
def create_asset(
    asset: AssetCreate,
    asset_repo: Annotated[SqlAlchemyAssetRepository, Depends(get_asset_repo)],
    account_repo: Annotated[SqlAlchemyAccountRepository, Depends(get_account_repo)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    account = account_repo.get(asset.account_id)
    if not account:
        raise HTTPException(HTTPStatus.NOT_FOUND, "Account not found")
    if account.user_id != current_user.id:
        raise HTTPException(HTTPStatus.FORBIDDEN, "Forbidden")

    entity = Asset(
        account_id=asset.account_id,
        name=asset.name,
        code=asset.code,
        category=asset.category,
        target_weight=asset.target_weight,
        current_price=asset.current_price,
        avg_price=asset.avg_price,
        quantity=asset.quantity
    )
    saved = asset_repo.save(entity)
    return saved

@router.patch("/assets/{asset_id}", response_model=AssetResponse)
def update_asset(
    asset_id: int,
    update: AssetUpdate,
    asset_repo: Annotated[SqlAlchemyAssetRepository, Depends(get_asset_repo)],
    account_repo: Annotated[SqlAlchemyAccountRepository, Depends(get_account_repo)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    existing = asset_repo.get(asset_id)
    if not existing:
        raise HTTPException(HTTPStatus.NOT_FOUND, "Asset not found")
    
    account = account_repo.get(existing.account_id)
    if not account:
        raise HTTPException(HTTPStatus.NOT_FOUND, "Account not found")
    if account.user_id != current_user.id:
        raise HTTPException(HTTPStatus.FORBIDDEN, "Forbidden")

    if update.name is not None: existing.name = update.name
    if update.code is not None: existing.code = update.code
    if update.category is not None: existing.category = update.category
    if update.target_weight is not None: existing.target_weight = update.target_weight
    if update.current_price is not None: existing.current_price = update.current_price
    if update.avg_price is not None: existing.avg_price = update.avg_price
    if update.quantity is not None: existing.quantity = update.quantity
    
    saved = asset_repo.save(existing)
    return saved

@router.delete("/assets/{asset_id}")
def delete_asset(
    asset_id: int,
    asset_repo: Annotated[SqlAlchemyAssetRepository, Depends(get_asset_repo)],
    account_repo: Annotated[SqlAlchemyAccountRepository, Depends(get_account_repo)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    existing = asset_repo.get(asset_id)
    if not existing:
        raise HTTPException(HTTPStatus.NOT_FOUND, "Asset not found")

    account = account_repo.get(existing.account_id)
    if not account:
        raise HTTPException(HTTPStatus.NOT_FOUND, "Account not found")
    if account.user_id != current_user.id:
        raise HTTPException(HTTPStatus.FORBIDDEN, "Forbidden")

    asset_repo.delete(asset_id)
    return {"ok": True}

@router.post("/assets/execute", response_model=AccountCalculatedResponse)
def execute_trade(
    req: ExecuteActionRequest,
    asset_repo: Annotated[SqlAlchemyAssetRepository, Depends(get_asset_repo)],
    account_repo: Annotated[SqlAlchemyAccountRepository, Depends(get_account_repo)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    asset = asset_repo.get(req.asset_id)
    if not asset:
        raise HTTPException(HTTPStatus.NOT_FOUND, "Asset not found")

    account = account_repo.get(asset.account_id)
    if not account:
        raise HTTPException(HTTPStatus.NOT_FOUND, "Account not found")
    if account.user_id != current_user.id:
        raise HTTPException(HTTPStatus.FORBIDDEN, "Forbidden")

    use_case = ExecuteTradeUseCase(asset_repo, account_repo)
    try:
        result = use_case.execute(req.asset_id, req.action_quantity, req.price)
        return map_calculation_result(result)
    except EntityNotFoundException as e:
        raise HTTPException(HTTPStatus.NOT_FOUND, str(e))
    except (InsufficientFundsException, InvalidActionException) as e:
        raise HTTPException(HTTPStatus.BAD_REQUEST, str(e))


@router.get("/finance/lookup", response_model=AssetInfoResponse)
@limiter.limit(_finance_rate_limit)
def lookup_asset(
    request: Request,
    code: str,
    market_data: Annotated[RealMarketDataProvider, Depends(get_market_data)]
):
    use_case = FetchAssetInfoUseCase(market_data)
    info = use_case.execute(code)
    if not info:
        raise HTTPException(HTTPStatus.NOT_FOUND, "Asset info not found")
    return info


@router.get("/finance/search", response_model=List[TickerSearchResult])
@limiter.limit(_finance_rate_limit)
async def search_assets(
    request: Request,
    q: str,
    market_data: Annotated[RealMarketDataProvider, Depends(get_market_data)]
):
    if not (2 <= len(q) <= 20):
        raise HTTPException(HTTPStatus.BAD_REQUEST, "Query must be 2-20 characters")
    try:
        results = await SearchAssetUseCase(market_data).execute(q)
    except httpx.TimeoutException:
        logger.warning("Ticker search timed out for query=%r", q)
        raise HTTPException(HTTPStatus.GATEWAY_TIMEOUT, "Search timed out")
    except httpx.HTTPStatusError as exc:
        # Distinguish upstream rate-limiting from other upstream failures.
        if exc.response.status_code == HTTPStatus.TOO_MANY_REQUESTS:
            raise HTTPException(HTTPStatus.TOO_MANY_REQUESTS, "Search rate-limited; try again shortly")
        logger.warning("Ticker search upstream error %s for query=%r", exc.response.status_code, q)
        raise HTTPException(HTTPStatus.BAD_GATEWAY, "Search upstream error")
    except httpx.RequestError:
        # Connection/network errors (DNS, refused, reset) — upstream unreachable.
        logger.warning("Ticker search connection error for query=%r", q)
        raise HTTPException(HTTPStatus.SERVICE_UNAVAILABLE, "Search temporarily unavailable")
    except Exception:
        # Log the real cause for debugging; return a generic message to the user.
        logger.exception("Ticker search failed for query=%r", q)
        raise HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, "Search failed")
    return results


# ─────────────────────────────────────────────────────────────────────────────
# Plan B2.4 — Preset endpoints (per-user rate limiting + 404-unified IDOR)
# ─────────────────────────────────────────────────────────────────────────────


def user_id_key_func(request: Request) -> str:
    """slowapi key_func for authenticated routes.

    Keys by the authenticated user id (set on request.state by
    user_id_middleware from the JWT) so the limit is per-account, not
    per-IP. Falls back to client IP when user_id is absent (e.g. the
    token failed to decode) so anonymous abuse is still bounded.
    """
    user_id = getattr(request.state, "user_id", None)
    return user_id or get_remote_address(request)


def _preset_to_response(preset: Preset) -> PresetResponse:
    # PresetItem is an aggregate child with no surfaced id (B1.1) → id=None.
    return PresetResponse(
        id=preset.id,
        name=preset.name,
        created_at=preset.created_at.isoformat() if preset.created_at else "",
        items=[
            PresetItemResponse(
                name=item.name,
                code=item.code,
                category=item.category,
                target_weight=item.target_weight,
            )
            for item in preset.items
        ],
    )


@router.get("/presets", response_model=list[PresetResponse])
@limiter.limit("60/minute", key_func=user_id_key_func)
def list_presets(
    request: Request,
    preset_repo: Annotated[SqlAlchemyPresetRepository, Depends(get_preset_repo)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    use_case = ListPresetsUseCase(preset_repo)
    presets = use_case.execute(current_user=current_user)
    return [_preset_to_response(p) for p in presets]


@router.post("/presets", response_model=PresetResponse, status_code=HTTPStatus.CREATED)
@limiter.limit("10/minute", key_func=user_id_key_func)
def create_preset(
    request: Request,
    data: PresetCreate,
    preset_repo: Annotated[SqlAlchemyPresetRepository, Depends(get_preset_repo)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    # Explicit field binding — never spread the DTO into the entity. user_id
    # is server-derived inside the use case, blocking mass-assignment.
    items = [
        PresetItem(
            name=i.name,
            code=i.code,
            category=i.category,
            target_weight=i.target_weight,
        )
        for i in data.items
    ]
    use_case = CreatePresetUseCase(preset_repo)
    saved = use_case.execute(name=data.name, items=items, current_user=current_user)
    return _preset_to_response(saved)


@router.delete("/presets/{preset_id}")
@limiter.limit("30/minute", key_func=user_id_key_func)
def delete_preset(
    request: Request,
    preset_id: int,
    preset_repo: Annotated[SqlAlchemyPresetRepository, Depends(get_preset_repo)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    use_case = DeletePresetUseCase(preset_repo)
    try:
        use_case.execute(preset_id=preset_id, current_user=current_user)
    except PresetNotFoundError:
        # 404-unified: missing OR wrong-owner are indistinguishable to the caller.
        raise HTTPException(HTTPStatus.NOT_FOUND, "Preset not found")
    return {"ok": True}


@router.post(
    "/presets/{preset_id}/apply/{account_id}",
    response_model=ApplyPresetResponse,
)
@limiter.limit("30/minute", key_func=user_id_key_func)
def apply_preset(
    request: Request,
    preset_id: int,
    account_id: int,
    preset_repo: Annotated[SqlAlchemyPresetRepository, Depends(get_preset_repo)],
    account_repo: Annotated[SqlAlchemyAccountRepository, Depends(get_account_repo)],
    asset_repo: Annotated[SqlAlchemyAssetRepository, Depends(get_asset_repo)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    use_case = ApplyPresetUseCase(preset_repo, account_repo, asset_repo)
    try:
        result = use_case.execute(
            preset_id=preset_id, account_id=account_id, current_user=current_user,
        )
    except PresetNotFoundError:
        raise HTTPException(HTTPStatus.NOT_FOUND, "Preset not found")
    except AccountNotFoundError:
        raise HTTPException(HTTPStatus.NOT_FOUND, "Account not found")
    # ApplyResult.account is a raw Account — recompute the portfolio recap so
    # the frontend gets the same calculated shape as GET /accounts.
    calc = CalculatePortfolioUseCase().execute(result.account)
    return ApplyPresetResponse(
        account=map_calculation_result(calc),
        updated_count=result.updated_count,
        created_count=result.created_count,
        weight_sum=result.weight_sum,
    )
