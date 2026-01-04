from typing import List
from ..domain.entities import Account, AssetCalculationResult, PortfolioCalculationResult

class CalculatePortfolioUseCase:
    def execute(self, account: Account) -> PortfolioCalculationResult:
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
                action_qty = int(diff / a.current_price)
                
            action = "HOLD"
            if action_qty > 0: action = "BUY"
            elif action_qty < 0: action = "SELL"
            
            calc_assets.append(AssetCalculationResult(
                asset=a,
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
        
        # Sort by ID if available, else name
        calc_assets.sort(key=lambda x: x.asset.id if x.asset.id else x.asset.name)

        return PortfolioCalculationResult(
            account=account,
            total_asset_value=total_asset_value,
            total_invested_value=total_invest_value,
            total_pl_amount=total_pl,
            total_pl_rate=total_pl_rate,
            assets=calc_assets
        )
