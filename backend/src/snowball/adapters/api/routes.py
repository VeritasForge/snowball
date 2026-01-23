from typing import List, Annotated
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session
from uuid import UUID

from ...infrastructure.db import get_session
from ..db.repositories import SqlAlchemyAccountRepository, SqlAlchemyAssetRepository, SqlAlchemyAuthRepository
from ..external.market_data import RealMarketDataProvider
from ...use_cases.portfolio import CalculatePortfolioUseCase
from ...use_cases.trade import ExecuteTradeUseCase
from ...use_cases.assets import UpdateAssetPricesUseCase, FetchAssetInfoUseCase
from ...use_cases.auth import RegisterUserUseCase, LoginUseCase
from ...use_cases.sync import SyncPortfolioUseCase
from ...infrastructure.security import PasswordHasher, JWTService
from ...domain.entities import Account, Asset, User, UserId
from ...domain.exceptions import EntityNotFoundException, InsufficientFundsException, InvalidActionException
from .dtos import (
    AccountCreate, AccountUpdate, AccountCalculatedResponse,
    AssetCreate, AssetUpdate, AssetResponse, ExecuteActionRequest,
    AccountResponse, UserRegister, UserLogin, TokenResponse, UserResponse,
    RefreshTokenRequest
)

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# --- Dependencies ---
def get_account_repo(session: Session = Depends(get_session)):
    return SqlAlchemyAccountRepository(session)

def get_asset_repo(session: Session = Depends(get_session)):
    return SqlAlchemyAssetRepository(session)

def get_auth_repo(session: Session = Depends(get_session)):
    return SqlAlchemyAuthRepository(session)

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
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    user = auth_repo.get_by_id(UserId(UUID(user_id)))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# --- Routes ---

@router.post("/auth/register", response_model=UserResponse, status_code=201)
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
        raise HTTPException(400, str(e))

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
        raise HTTPException(401, str(e))

@router.post("/auth/refresh", response_model=TokenResponse)
def refresh_token(
    data: RefreshTokenRequest,
    jwt_service: Annotated[JWTService, Depends(get_jwt_service)]
):
    new_access_token = jwt_service.refresh_access_token(data.refresh_token)
    if not new_access_token:
        raise HTTPException(401, "Invalid or expired refresh token")
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
        assets_response.append({
            "id": asset_ent.id,
            "account_id": asset_ent.account_id,
            "name": asset_ent.name,
            "code": asset_ent.code,
            "category": asset_ent.category,
            "target_weight": asset_ent.target_weight,
            "current_price": asset_ent.current_price,
            "avg_price": asset_ent.avg_price,
            "quantity": asset_ent.quantity,
            
            "current_value": item.current_value,
            "invested_amount": item.invested_amount,
            "pl_amount": item.pl_amount,
            "pl_rate": item.pl_rate,
            "current_weight": item.current_weight,
            "target_value": item.target_value,
            "diff_value": item.diff_value,
            "action": item.action,
            "action_quantity": item.action_quantity
        })

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
    accounts = account_repo.list_by_user(current_user.id)
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
        raise HTTPException(404, "Account not found")
    
    if existing.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

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
        raise HTTPException(404, "Account not found")

    if existing.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

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
        raise HTTPException(404, "Account not found")

    if account.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

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
        raise HTTPException(404, "Asset not found")
    
    account = account_repo.get(existing.account_id)
    if account and account.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

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
        raise HTTPException(404, "Asset not found")

    account = account_repo.get(existing.account_id)
    if account and account.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

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
    if asset:
        account = account_repo.get(asset.account_id)
        if account and account.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")

    use_case = ExecuteTradeUseCase(asset_repo, account_repo)
    try:
        result = use_case.execute(req.asset_id, req.action_quantity, req.price)
        return map_calculation_result(result)
    except EntityNotFoundException as e:
        raise HTTPException(404, str(e))
    except (InsufficientFundsException, InvalidActionException) as e:
        raise HTTPException(400, str(e))

@router.post("/assets/update-all-prices")
def update_all_prices(
    asset_repo: Annotated[SqlAlchemyAssetRepository, Depends(get_asset_repo)],
    account_repo: Annotated[SqlAlchemyAccountRepository, Depends(get_account_repo)],
    market_data: Annotated[RealMarketDataProvider, Depends(get_market_data)]
):
    use_case = UpdateAssetPricesUseCase(asset_repo, account_repo, market_data)
    count = use_case.execute()
    return {"ok": True, "updated_count": count}

@router.get("/finance/lookup")
def lookup_asset(
    code: str,
    market_data: Annotated[RealMarketDataProvider, Depends(get_market_data)]
):
    use_case = FetchAssetInfoUseCase(market_data)
    info = use_case.execute(code)
    if not info:
        raise HTTPException(404, "Asset info not found")
    return info
