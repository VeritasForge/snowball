from typing import Optional
from ..domain.ports import AssetRepository, MarketDataProvider
from ..domain.services import infer_category
from ..domain.entities import Asset

class UpdateAssetPricesUseCase:
    def __init__(self, asset_repo: AssetRepository, market_data: MarketDataProvider):
        self.asset_repo = asset_repo
        self.market_data = market_data

    def execute(self) -> int:
        assets = self.asset_repo.list_all_with_code()
        updated_count = 0

        for asset in assets:
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
