from abc import ABC, abstractmethod
from typing import List, Optional
from .entities import Account, Asset, User, UserId

class AuthRepository(ABC):
    @abstractmethod
    def get_by_email(self, email: str) -> Optional[User]:
        raise NotImplementedError

    @abstractmethod
    def save(self, user: User) -> User:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, user_id: UserId) -> Optional[User]:
        raise NotImplementedError

class AccountRepository(ABC):
    @abstractmethod
    def get(self, account_id: int) -> Optional[Account]:
        raise NotImplementedError

    @abstractmethod
    def list_all(self) -> List[Account]:
        raise NotImplementedError

    @abstractmethod
    def list_by_user(self, user_id: UserId) -> List[Account]:
        raise NotImplementedError

    @abstractmethod
    def save(self, account: Account) -> Account:
        raise NotImplementedError

    @abstractmethod
    def delete(self, account_id: int) -> None:
        raise NotImplementedError

class AssetRepository(ABC):
    @abstractmethod
    def get(self, asset_id: int) -> Optional[Asset]:
        raise NotImplementedError

    @abstractmethod
    def save(self, asset: Asset) -> Asset:
        raise NotImplementedError

    @abstractmethod
    def delete(self, asset_id: int) -> None:
        raise NotImplementedError

    @abstractmethod
    def list_by_account(self, account_id: int) -> List[Asset]:
        raise NotImplementedError

class MarketDataProvider(ABC):
    @abstractmethod
    def fetch_price(self, code: str) -> Optional[float]:
        """Fetch current price for a given ticker code."""
        raise NotImplementedError

    @abstractmethod
    def fetch_asset_info(self, code: str) -> Optional[dict]:
        """Fetch name, price, and category for a given code."""
        raise NotImplementedError
