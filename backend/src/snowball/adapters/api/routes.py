from typing import List, Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ...infrastructure.db import get_session
from ..db.repositories import SqlAlchemyAccountRepository, SqlAlchemyAssetRepository
from ..external.market_data import RealMarketDataProvider
from ...use_cases.portfolio import CalculatePortfolioUseCase
from ...use_cases.trade import ExecuteTradeUseCase
from ...use_cases.assets import UpdateAssetPricesUseCase, FetchAssetInfoUseCase
from ...domain.entities import Account, Asset
from ...domain.exceptions import EntityNotFoundException, InsufficientFundsException, InvalidActionException
from .dtos import (
    AccountCreate, AccountUpdate, AccountCalculatedResponse, 
    AssetCreate, AssetUpdate, AssetResponse, ExecuteActionRequest, 
    AccountResponse
)

router = APIRouter()

# --- Dependencies ---
def get_account_repo(session: Session = Depends(get_session)):
    return SqlAlchemyAccountRepository(session)

def get_asset_repo(session: Session = Depends(get_session)):
    return SqlAlchemyAssetRepository(session)

def get_market_data():
    return RealMarketDataProvider()

# --- Routes ---

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
    account_repo: Annotated[SqlAlchemyAccountRepository, Depends(get_account_repo)]
):
    accounts = account_repo.list_all()
    use_case = CalculatePortfolioUseCase()
    return [map_calculation_result(use_case.execute(acc)) for acc in accounts]

@router.post("/accounts", response_model=AccountResponse)
def create_account(
    account: AccountCreate,
    account_repo: Annotated[SqlAlchemyAccountRepository, Depends(get_account_repo)]
):
    entity = Account(name=account.name, cash=account.cash)
    saved = account_repo.save(entity)
    return saved

@router.patch("/accounts/{account_id}", response_model=AccountResponse)
def update_account(
    account_id: int,
    update: AccountUpdate,
    account_repo: Annotated[SqlAlchemyAccountRepository, Depends(get_account_repo)]
):
    existing = account_repo.get(account_id)
    if not existing:
        raise HTTPException(404, "Account not found")
    
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
    account_repo: Annotated[SqlAlchemyAccountRepository, Depends(get_account_repo)]
):
    existing = account_repo.get(account_id)
    if not existing:
        raise HTTPException(404, "Account not found")
    account_repo.delete(account_id)
    return {"ok": True}

@router.post("/assets", response_model=AssetResponse)
def create_asset(
    asset: AssetCreate,
    asset_repo: Annotated[SqlAlchemyAssetRepository, Depends(get_asset_repo)]
):
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
    asset_repo: Annotated[SqlAlchemyAssetRepository, Depends(get_asset_repo)]
):
    existing = asset_repo.get(asset_id)
    if not existing:
        raise HTTPException(404, "Asset not found")
    
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
    asset_repo: Annotated[SqlAlchemyAssetRepository, Depends(get_asset_repo)]
):
    existing = asset_repo.get(asset_id)
    if not existing:
        raise HTTPException(404, "Asset not found")
    asset_repo.delete(asset_id)
    return {"ok": True}

@router.post("/assets/execute", response_model=AccountCalculatedResponse)
def execute_trade(
    req: ExecuteActionRequest,
    asset_repo: Annotated[SqlAlchemyAssetRepository, Depends(get_asset_repo)],
    account_repo: Annotated[SqlAlchemyAccountRepository, Depends(get_account_repo)]
):
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
