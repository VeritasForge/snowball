from typing import Optional
from ..domain.ports import AssetRepository, MarketDataProvider, AccountRepository
from ..domain.services import infer_category
from ..domain.entities import Asset

class UpdateAssetPricesUseCase:
    def __init__(self, asset_repo: AssetRepository, account_repo: AccountRepository, market_data: MarketDataProvider):
        self.asset_repo = asset_repo
        self.account_repo = account_repo
        self.market_data = market_data

    def execute(self) -> int:
        # We need to iterate all assets. 
        # The Repo should probably have `list_all_assets` or similar.
        # But `AssetRepository` in ports.py only has `list_by_account`.
        # I should probably update `AssetRepository` port to include `list_all_with_code`.
        # Or iterate accounts then assets. Iterate accounts is safer for now.
        
        accounts = self.account_repo.list_all()
        updated_count = 0
        
        for account in accounts:
            assets = self.asset_repo.list_by_account(account.id)
            for asset in assets:
                if not asset.code:
                    continue
                new_price = self.market_data.fetch_price(asset.code)
                if new_price is not None:
                    asset.current_price = new_price
                    self.asset_repo.save(asset)
                    updated_count += 1
        return updated_count

class FetchAssetInfoUseCase:
    def __init__(self, market_data: MarketDataProvider):
        self.market_data = market_data

    def execute(self, code: str) -> Optional[dict]:
        info = self.market_data.fetch_asset_info(code)
        if info:
            # Ensure category is inferred if not present or if we want to enforce our logic
            if "category" not in info or not info["category"]:
                info["category"] = infer_category(info["name"], code)
            else:
                # Re-infer to be safe/consistent with our rules? 
                # The main.py logic called infer_category inside fetch_asset_info strategies.
                # Let's trust the provider to return it or use service if missing.
                pass
        return info
