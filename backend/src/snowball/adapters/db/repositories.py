from typing import List, Optional
from sqlmodel import Session, select
from ...domain.ports import AccountRepository, AssetRepository
from ...domain.entities import Account, Asset
from .models import AccountModel, AssetModel

class SqlAlchemyAccountRepository(AccountRepository):
    def __init__(self, session: Session):
        self.session = session

    def _to_entity(self, model: AccountModel) -> Account:
        return Account(
            id=model.id,
            name=model.name,
            cash=model.cash,
            assets=[self._to_asset_entity(a) for a in model.assets]
        )

    def _to_asset_entity(self, model: AssetModel) -> Asset:
        return Asset(
            id=model.id,
            account_id=model.account_id,
            name=model.name,
            code=model.code,
            category=model.category,
            target_weight=model.target_weight,
            current_price=model.current_price,
            avg_price=model.avg_price,
            quantity=model.quantity
        )

    def get(self, account_id: int) -> Optional[Account]:
        model = self.session.get(AccountModel, account_id)
        if model:
            return self._to_entity(model)
        return None

    def list_all(self) -> List[Account]:
        statement = select(AccountModel)
        models = self.session.exec(statement).all()
        return [self._to_entity(m) for m in models]

    def save(self, account: Account) -> Account:
        if account.id:
            model = self.session.get(AccountModel, account.id)
            if model:
                model.name = account.name
                model.cash = account.cash
                # Update assets logic is complex if strictly following DDD (Root Aggregate).
                # For simplicity in this refactor, we assume assets are updated via AssetRepo 
                # or we just update Account fields here.
                # If we passed a full object with changed assets, we'd need to sync.
                # Let's assume this method primarily saves Account fields. 
                self.session.add(model)
                self.session.commit()
                self.session.refresh(model)
                return self._to_entity(model)
        
        # Create new
        model = AccountModel(name=account.name, cash=account.cash)
        self.session.add(model)
        self.session.commit()
        self.session.refresh(model)
        return self._to_entity(model)

    def delete(self, account_id: int) -> None:
        model = self.session.get(AccountModel, account_id)
        if model:
            self.session.delete(model)
            self.session.commit()

class SqlAlchemyAssetRepository(AssetRepository):
    def __init__(self, session: Session):
        self.session = session

    def _to_entity(self, model: AssetModel) -> Asset:
        return Asset(
            id=model.id,
            account_id=model.account_id,
            name=model.name,
            code=model.code,
            category=model.category,
            target_weight=model.target_weight,
            current_price=model.current_price,
            avg_price=model.avg_price,
            quantity=model.quantity
        )

    def get(self, asset_id: int) -> Optional[Asset]:
        model = self.session.get(AssetModel, asset_id)
        if model:
            return self._to_entity(model)
        return None

    def save(self, asset: Asset) -> Asset:
        if asset.id:
            model = self.session.get(AssetModel, asset.id)
            if model:
                model.name = asset.name
                model.code = asset.code
                model.category = asset.category
                model.target_weight = asset.target_weight
                model.current_price = asset.current_price
                model.avg_price = asset.avg_price
                model.quantity = asset.quantity
                # account_id usually doesn't change
                self.session.add(model)
                self.session.commit()
                self.session.refresh(model)
                return self._to_entity(model)
        
        # Create new
        model = AssetModel(
            account_id=asset.account_id,
            name=asset.name,
            code=asset.code,
            category=asset.category,
            target_weight=asset.target_weight,
            current_price=asset.current_price,
            avg_price=asset.avg_price,
            quantity=asset.quantity
        )
        self.session.add(model)
        self.session.commit()
        self.session.refresh(model)
        return self._to_entity(model)

    def delete(self, asset_id: int) -> None:
        model = self.session.get(AssetModel, asset_id)
        if model:
            self.session.delete(model)
            self.session.commit()

    def list_by_account(self, account_id: int) -> List[Asset]:
        statement = select(AssetModel).where(AssetModel.account_id == account_id)
        models = self.session.exec(statement).all()
        return [self._to_entity(m) for m in models]
