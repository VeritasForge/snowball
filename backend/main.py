from contextlib import asynccontextmanager
from typing import List
from fastapi import FastAPI, Depends, HTTPException, Body
from sqlmodel import Session, select
from fastapi.middleware.cors import CORSMiddleware
from database import create_db_and_tables, get_session
from models import (
    Account, AccountCreate, AccountUpdate, AccountCalculated,
    Asset, AssetCreate, AssetUpdate, AssetCalculated,
    ExecuteActionRequest
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    # Create default account if none exists
    session_gen = get_session()
    session = next(session_gen)
    try:
        if not session.exec(select(Account)).first():
            default_acc = Account(name="기본 포트폴리오", cash=0)
            session.add(default_acc)
            session.commit()
    finally:
        session.close()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Logic Helper ---
def calculate_portfolio(account: Account) -> AccountCalculated:
    assets = account.assets
    
    total_invest_value = sum(a.current_price * a.quantity for a in assets)
    total_asset_value = total_invest_value + account.cash
    
    total_invested_principal = sum(a.avg_price * a.quantity for a in assets)
    total_pl = total_invest_value - total_invested_principal
    total_pl_rate = (total_pl / total_invested_principal * 100) if total_invested_principal > 0 else 0
    
    calc_assets = []
    for a in assets:
        current_val = a.current_price * a.quantity
        invested_val = a.avg_price * a.quantity
        pl = current_val - invested_val
        pl_rate = (pl / invested_val * 100) if invested_val > 0 else 0
        
        current_weight = (current_val / total_asset_value * 100) if total_asset_value > 0 else 0
        target_val = total_asset_value * (a.target_weight / 100.0)
        diff = target_val - current_val
        
        action_qty = 0
        if a.current_price > 0:
            action_qty = int(diff / a.current_price) # Simple integer division logic
            
        action = "HOLD"
        if action_qty > 0: action = "BUY"
        elif action_qty < 0: action = "SELL"
        
        # Convert to calculated schema
        # model_dump to copy base fields
        a_dict = a.model_dump()
        calc_assets.append(AssetCalculated(
            **a_dict,
            current_value=current_val,
            invested_amount=invested_val,
            pl_amount=pl,
            pl_rate=pl_rate,
            current_weight=current_weight,
            target_value=target_val,
            diff_value=diff,
            action=action,
            action_quantity=action_qty
        ))
    
    # Sort assets by id (stable order)
    calc_assets.sort(key=lambda x: x.id)

    return AccountCalculated(
        **account.model_dump(),
        total_asset_value=total_asset_value,
        total_invested_value=total_invest_value,
        total_pl_amount=total_pl,
        total_pl_rate=total_pl_rate,
        assets=calc_assets
    )

# --- Endpoints ---

@app.get("/accounts", response_model=List[AccountCalculated])
def list_accounts(session: Session = Depends(get_session)):
    accounts = session.exec(select(Account)).all()
    return [calculate_portfolio(acc) for acc in accounts]

@app.post("/accounts", response_model=Account)
def create_account(account: AccountCreate, session: Session = Depends(get_session)):
    db_acc = Account.model_validate(account)
    session.add(db_acc)
    session.commit()
    session.refresh(db_acc)
    return db_acc

@app.patch("/accounts/{account_id}", response_model=Account)
def update_account(account_id: int, update: AccountUpdate, session: Session = Depends(get_session)):
    acc = session.get(Account, account_id)
    if not acc: raise HTTPException(404, "Account not found")
    
    data = update.model_dump(exclude_unset=True)
    acc.sqlmodel_update(data)
    session.add(acc)
    session.commit()
    session.refresh(acc)
    return acc

@app.delete("/accounts/{account_id}")
def delete_account(account_id: int, session: Session = Depends(get_session)):
    acc = session.get(Account, account_id)
    if not acc: raise HTTPException(404, "Account not found")
    
    # Check if it's the last account? (Optional logic, let frontend handle or allow empty)
    session.delete(acc)
    session.commit()
    return {"ok": True}

@app.post("/assets", response_model=Asset)
def create_asset(asset: AssetCreate, session: Session = Depends(get_session)):
    db_asset = Asset.model_validate(asset)
    session.add(db_asset)
    session.commit()
    session.refresh(db_asset)
    return db_asset

@app.patch("/assets/{asset_id}", response_model=Asset)
def update_asset(asset_id: int, update: AssetUpdate, session: Session = Depends(get_session)):
    asset = session.get(Asset, asset_id)
    if not asset: raise HTTPException(404, "Asset not found")
    
    data = update.model_dump(exclude_unset=True)
    asset.sqlmodel_update(data)
    session.add(asset)
    session.commit()
    session.refresh(asset)
    return asset

@app.delete("/assets/{asset_id}")
def delete_asset(asset_id: int, session: Session = Depends(get_session)):
    asset = session.get(Asset, asset_id)
    if not asset: raise HTTPException(404, "Asset not found")
    session.delete(asset)
    session.commit()
    return {"ok": True}

@app.post("/assets/execute", response_model=AccountCalculated)
def execute_trade(req: ExecuteActionRequest, session: Session = Depends(get_session)):
    """
    Executes a Buy or Sell.
    Updates Asset (qty, avg_price) and Account (cash).
    Returns re-calculated Account.
    """
    asset = session.get(Asset, req.asset_id)
    if not asset: raise HTTPException(404, "Asset not found")
    
    account = asset.account
    total_amount = abs(req.action_quantity) * req.price
    
    # 1. Update Cash
    if req.action_quantity > 0: # BUY
        if account.cash < total_amount:
            raise HTTPException(400, f"Not enough cash. Need {total_amount}, Have {account.cash}")
        account.cash -= total_amount
    else: # SELL
        account.cash += total_amount
        
    # 2. Update Asset
    new_qty = asset.quantity + req.action_quantity
    
    if new_qty < 0:
        raise HTTPException(400, "Cannot sell more than you hold.")
        
    if req.action_quantity > 0: # BUY: Update Avg Price
        old_val = asset.quantity * asset.avg_price
        new_val = req.action_quantity * req.price
        if new_qty > 0:
            asset.avg_price = (old_val + new_val) / new_qty
    # SELL: Avg Price doesn't change usually
    
    asset.quantity = new_qty
    
    session.add(account)
    session.add(asset)
    session.commit()
    session.refresh(account)
    
    # Return full calculated state
    return calculate_portfolio(account)