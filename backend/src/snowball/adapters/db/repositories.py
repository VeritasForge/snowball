from uuid import UUID
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from ...domain.ports import (
    AbstractPresetRepository,
    AccountRepository,
    AssetRepository,
    AuthRepository,
)
from ...domain.entities import Account, Asset, Preset, PresetItem, User, UserId
from ...domain.enums import AssetCategory
from .models import AccountModel, AssetModel, PresetItemModel, PresetModel, UserModel

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

    def get_by_email(self, email: str) -> User | None:
        statement = select(UserModel).where(UserModel.email == email)
        model = self.session.exec(statement).first()
        if model:
            return self._to_entity(model)
        return None

    def get_by_id(self, user_id: UserId) -> User | None:
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
        if model.account_id is None:
            raise ValueError(f"Asset {model.id} has no account_id")
        return Asset(
            id=model.id,
            account_id=model.account_id,
            name=model.name,
            code=model.code,
            # Plan A3.5 — sa_column=Column(String) returns raw str from DB.
            # Explicit coercion enforces the AssetCategory type contract.
            category=AssetCategory(model.category),
            target_weight=model.target_weight,
            current_price=model.current_price,
            avg_price=model.avg_price,
            quantity=model.quantity
        )

    def get(self, account_id: int) -> Account | None:
        model = self.session.get(AccountModel, account_id)
        if model:
            return self._to_entity(model)
        return None

    def list_all(self) -> list[Account]:
        statement = select(AccountModel)
        models = self.session.exec(statement).all()
        return [self._to_entity(m) for m in models]

    def list_by_user(self, user_id: UserId) -> list[Account]:
        statement = select(AccountModel).where(AccountModel.user_id == user_id)
        models = self.session.exec(statement).all()
        return [self._to_entity(m) for m in models]

    def list_by_user_with_assets(self, user_id: UserId) -> list[Account]:
        statement = (
            select(AccountModel)
            .where(AccountModel.user_id == user_id)
            .options(selectinload(AccountModel.assets))
        )
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
        if model.account_id is None:
            raise ValueError(f"Asset {model.id} has no account_id")
        return Asset(
            id=model.id,
            account_id=model.account_id,
            name=model.name,
            code=model.code,
            # Plan A3.5 — explicit AssetCategory coercion (sa_column=String
            # returns raw str otherwise; enforces enum type contract).
            category=AssetCategory(model.category),
            target_weight=model.target_weight,
            current_price=model.current_price,
            avg_price=model.avg_price,
            quantity=model.quantity
        )

    def get(self, asset_id: int) -> Asset | None:
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

    def list_by_account(self, account_id: int) -> list[Asset]:
        statement = select(AssetModel).where(AssetModel.account_id == account_id)
        models = self.session.exec(statement).all()
        return [self._to_entity(m) for m in models]

    def list_all_with_code(self) -> list[Asset]:
        statement = select(AssetModel).where(
            AssetModel.code != None,
            AssetModel.code != ""
        )
        models = self.session.exec(statement).all()
        return [self._to_entity(m) for m in models]


class SqlAlchemyPresetRepository(AbstractPresetRepository):
    """Plan B1.5 — preset CRUD with eager-loaded items.

    Conversion details:
    - PresetItem domain has no preset_id (child of aggregate); FK is
      injected at to_model time from the parent.
    - AssetCategory(value) coercion in _to_item_entity for the same
      reason as SqlAlchemyAssetRepository._to_entity (sa_column=String
      returns raw str otherwise).
    - save() with id-but-not-in-DB falls through to create (mirrors
      AccountRepository/AssetRepository behavior on phantom ids).
    """

    def __init__(self, session: Session):
        self.session = session

    def _to_item_entity(self, model: PresetItemModel) -> PresetItem:
        return PresetItem(
            name=model.name,
            code=model.code,
            category=AssetCategory(model.category),
            target_weight=model.target_weight,
        )

    def _to_entity(self, model: PresetModel) -> Preset:
        return Preset(
            id=model.id,
            name=model.name,
            user_id=UserId(model.user_id),
            created_at=model.created_at,
            items=[self._to_item_entity(im) for im in model.items],
        )

    def get(self, preset_id: int) -> Preset | None:
        statement = (
            select(PresetModel)
            .where(PresetModel.id == preset_id)
            .options(selectinload(PresetModel.items))
        )
        model = self.session.exec(statement).first()
        return self._to_entity(model) if model else None

    def list_by_user(self, user_id: UserId) -> list[Preset]:
        statement = (
            select(PresetModel)
            .where(PresetModel.user_id == user_id)
            .options(selectinload(PresetModel.items))
            .order_by(PresetModel.created_at.desc())
        )
        models = self.session.exec(statement).all()
        return [self._to_entity(m) for m in models]

    def save(self, preset: Preset) -> Preset:
        existing = (
            self.session.get(PresetModel, preset.id) if preset.id else None
        )
        if existing:
            # Update name + replace items wholesale (simpler than diff)
            existing.name = preset.name
            for old_item in list(existing.items):
                self.session.delete(old_item)
            self.session.flush()
            for item in preset.items:
                self.session.add(PresetItemModel(
                    preset_id=existing.id,
                    name=item.name,
                    code=item.code,
                    category=item.category,
                    target_weight=item.target_weight,
                ))
            self.session.commit()
            self.session.refresh(existing)
            return self._to_entity(existing)

        # Create new
        model = PresetModel(name=preset.name, user_id=preset.user_id)
        self.session.add(model)
        self.session.flush()  # populate model.id
        for item in preset.items:
            self.session.add(PresetItemModel(
                preset_id=model.id,
                name=item.name,
                code=item.code,
                category=item.category,
                target_weight=item.target_weight,
            ))
        self.session.commit()
        self.session.refresh(model)
        return self._to_entity(model)

    def delete(self, preset_id: int) -> None:
        model = self.session.get(PresetModel, preset_id)
        if model:
            self.session.delete(model)
            self.session.commit()
