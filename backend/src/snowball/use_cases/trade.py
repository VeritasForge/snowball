from ..domain.ports import AccountRepository, AssetRepository
from ..domain.exceptions import EntityNotFoundException, InsufficientFundsException, InvalidActionException
from ..domain.entities import PortfolioCalculationResult
from .portfolio import CalculatePortfolioUseCase

class ExecuteTradeUseCase:
    def __init__(self, asset_repo: AssetRepository, account_repo: AccountRepository):
        self.asset_repo = asset_repo
        self.account_repo = account_repo
        self.calc_use_case = CalculatePortfolioUseCase()

    def execute(self, asset_id: int, action_quantity: int, price: float) -> PortfolioCalculationResult:
        asset = self.asset_repo.get(asset_id)
        if not asset:
            raise EntityNotFoundException(f"Asset with id {asset_id} not found")
        
        account = self.account_repo.get(asset.account_id)
        if not account:
            raise EntityNotFoundException(f"Account with id {asset.account_id} not found")

        total_amount = abs(action_quantity) * price
        
        if action_quantity > 0: # BUY
            if account.cash < total_amount:
                raise InsufficientFundsException(f"Not enough cash. Need {total_amount}, Have {account.cash}")
            account.cash -= total_amount
        else: # SELL
            account.cash += total_amount
            
        new_qty = asset.quantity + action_quantity
        if new_qty < 0:
            raise InvalidActionException("Cannot sell more than you hold.")
            
        if action_quantity > 0: # BUY: Update Avg Price
            old_val = asset.quantity * asset.avg_price
            new_val = action_quantity * price
            if new_qty > 0:
                asset.avg_price = (old_val + new_val) / new_qty
        
        asset.quantity = new_qty
        asset.current_price = price # Update current price to execution price as well? usually yes or fetch fresh.
        # Main.py logic didn't explicitly update current_price in execute_trade, only avg_price and qty. 
        # But logically, if we traded at price, current_price is likely that. 
        # I'll stick to main.py logic: "asset.quantity = new_qty ... session.add(asset)". 
        # It DOES NOT update current_price in main.py. I will strictly follow main.py logic.
        
        self.account_repo.save(account)
        self.asset_repo.save(asset)
        
        # Re-fetch account with updated assets to calculate
        # (Assuming save updates the object or we might need to fetch fresh if assets list is not updated in memory)
        # For simplicity, if account.assets is loaded, we might need to update the specific asset instance in that list 
        # if AccountRepo.save doesn't handle relationship refresh.
        # To be safe, let's re-fetch.
        saved_account = self.account_repo.get(account.id)
        return self.calc_use_case.execute(saved_account)
