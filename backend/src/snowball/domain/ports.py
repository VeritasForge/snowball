from abc import ABC, abstractmethod

from .entities import Account, Asset, Preset, User, UserId


class AuthRepository(ABC):
    @abstractmethod
    def get_by_email(self, email: str) -> User | None:
        raise NotImplementedError

    @abstractmethod
    def save(self, user: User) -> User:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, user_id: UserId) -> User | None:
        raise NotImplementedError


class AccountRepository(ABC):
    @abstractmethod
    def get(self, account_id: int) -> Account | None:
        raise NotImplementedError

    @abstractmethod
    def list_all(self) -> list[Account]:
        raise NotImplementedError

    @abstractmethod
    def list_by_user(self, user_id: UserId) -> list[Account]:
        raise NotImplementedError

    @abstractmethod
    def save(self, account: Account) -> Account:
        raise NotImplementedError

    @abstractmethod
    def delete(self, account_id: int) -> None:
        raise NotImplementedError


class AssetRepository(ABC):
    @abstractmethod
    def get(self, asset_id: int) -> Asset | None:
        raise NotImplementedError

    @abstractmethod
    def save(self, asset: Asset) -> Asset:
        raise NotImplementedError

    @abstractmethod
    def delete(self, asset_id: int) -> None:
        raise NotImplementedError

    @abstractmethod
    def list_by_account(self, account_id: int) -> list[Asset]:
        raise NotImplementedError


class AbstractPresetRepository(ABC):
    """Plan B1.2 — user-scoped preset CRUD.

    Mirrors AccountRepository pattern (save/get/list_by_user/delete).
    items are eager-loaded via the Preset.items collection.
    """

    @abstractmethod
    def save(self, preset: Preset) -> Preset:
        raise NotImplementedError

    @abstractmethod
    def get(self, preset_id: int) -> Preset | None:
        raise NotImplementedError

    @abstractmethod
    def list_by_user(self, user_id: UserId) -> list[Preset]:
        raise NotImplementedError

    @abstractmethod
    def delete(self, preset_id: int) -> None:
        raise NotImplementedError


class MarketDataProvider(ABC):
    @abstractmethod
    def fetch_price(self, code: str) -> float | None:
        """Fetch current price for a given ticker code."""
        raise NotImplementedError

    @abstractmethod
    def fetch_asset_info(self, code: str) -> dict | None:
        """Fetch name, price, and category for a given code."""
        raise NotImplementedError

    @abstractmethod
    async def search_by_name(self, query: str) -> list[dict]:
        """Search KRX stocks by name. Returns [{name, code, market}]."""
        raise NotImplementedError
