from ..domain.ports import AuthRepository, AccountRepository, AssetRepository
from ..domain.entities import Account, Asset, UserId
from typing import List, Dict, Any

class SyncPortfolioUseCase:
    def __init__(self, account_repo: AccountRepository, asset_repo: AssetRepository):
        self.account_repo = account_repo
        self.asset_repo = asset_repo

    def execute(self, user_id: UserId, local_accounts: List[Dict[str, Any]]):
        """
        Sync local storage data to server.
        If server has no accounts, migrate local data.
        If server has accounts, for now we prioritize server data (Spec FR-004).
        """
        existing_accounts = self.account_repo.list_all() # Should filter by user_id in real implementation
        # Note: list_all currently doesn't filter by user_id. 
        # For simplicity in this refactor, we assume list_all returns all and we filter.
        user_accounts = [acc for acc in existing_accounts if acc.user_id == user_id]

        if not user_accounts and local_accounts:
            # Migrate local data
            for local_acc in local_accounts:
                new_acc = Account(
                    name=local_acc.get("name", "마이그레이션된 계좌"),
                    cash=local_acc.get("cash", 0),
                    user_id=user_id
                )
                saved_acc = self.account_repo.save(new_acc)
                
                for local_asset in local_acc.get("assets", []):
                    new_asset = Asset(
                        account_id=saved_acc.id,
                        name=local_asset.get("name", ""),
                        code=local_asset.get("code"),
                        category=local_asset.get("category", "주식"),
                        target_weight=local_asset.get("targetWeight", 0),
                        current_price=local_asset.get("currentPrice", 0),
                        avg_price=local_asset.get("avgPrice", 0),
                        quantity=local_asset.get("quantity", 0)
                    )
                    self.asset_repo.save(new_asset)
            
            return self.account_repo.list_all() # Refresh list
        
        return user_accounts
