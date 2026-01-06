from typing import List, Optional
from uuid import UUID
from sqlmodel import Session, select
from ...domain.ports import AccountRepository, AssetRepository, AuthRepository
from ...domain.entities import Account, Asset, User, UserId
from .models import AccountModel, AssetModel, UserModel

class SqlAlchemyAuthRepository(AuthRepository):
    def __init__(self, session: Session):
        self.session = session

    def _to_entity(self, model: UserModel) -> User:
        return User(
            id=UserId(model.id),
            email=model.email,
            password_hash=model.password_hash,
            created_at=model.created_at,
            updated_at=model.updated_at
        )

    def get_by_email(self, email: str) -> Optional[User]:
        statement = select(UserModel).where(UserModel.email == email)
        model = self.session.exec(statement).first()
        if model:
            return self._to_entity(model)
        return None

    def get_by_id(self, user_id: UserId) -> Optional[User]:
        model = self.session.get(UserModel, user_id)
        if model:
            return self._to_entity(model)
        return None

    def save(self, user: User) -> User:
        # Check if exists
        model = self.session.get(UserModel, user.id)
        if model:
            model.email = user.email
            model.password_hash = user.password_hash
            model.updated_at = user.updated_at
            self.session.add(model)
            self.session.commit()
            self.session.refresh(model)
            return self._to_entity(model)
        
        # Create new
        model = UserModel(
            id=user.id,
            email=user.email,
            password_hash=user.password_hash,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
        self.session.add(model)
        self.session.commit()
        self.session.refresh(model)
        return self._to_entity(model)

class SqlAlchemyAccountRepository(AccountRepository):
    def __init__(self, session: Session):
        self.session = session

    def _to_entity(self, model: AccountModel) -> Account:
        return Account(
            id=model.id,
            user_id=UserId(model.user_id),
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
                # user_id typically doesn't change, but we can update it if needed
                model.user_id = account.user_id
                self.session.add(model)
                self.session.commit()
                self.session.refresh(model)
                return self._to_entity(model)
        
        # Create new
        model = AccountModel(
            name=account.name, 
            cash=account.cash,
            user_id=account.user_id
        )
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
