from abc import ABC, abstractmethod
from typing import List, Optional
from .entities import Account, Asset, User, UserId

class AuthRepository(ABC):
    @abstractmethod
    def get_by_email(self, email: str) -> Optional[User]:
        pass

    @abstractmethod
    def save(self, user: User) -> User:
        pass

    @abstractmethod
    def get_by_id(self, user_id: UserId) -> Optional[User]:
        pass

class AccountRepository(ABC):
    @abstractmethod
    def get(self, account_id: int) -> Optional[Account]:
        pass

    @abstractmethod
    def list_all(self) -> List[Account]:
        pass

    @abstractmethod
    def save(self, account: Account) -> Account:
        pass

    @abstractmethod
    def delete(self, account_id: int) -> None:
        pass

class AssetRepository(ABC):
    @abstractmethod
    def get(self, asset_id: int) -> Optional[Asset]:
        pass

    @abstractmethod
    def save(self, asset: Asset) -> Asset:
        pass

    @abstractmethod
    def delete(self, asset_id: int) -> None:
        pass

    @abstractmethod
    def list_by_account(self, account_id: int) -> List[Asset]:
        pass

class MarketDataProvider(ABC):
    @abstractmethod
    def fetch_price(self, code: str) -> Optional[float]:
        """Fetch current price for a given ticker code."""
        pass

    @abstractmethod
    def fetch_asset_info(self, code: str) -> Optional[dict]:
        """Fetch name, price, and category for a given code."""
        pass
