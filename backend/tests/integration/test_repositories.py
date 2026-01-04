import pytest
from sqlmodel import Session
from src.snowball.adapters.db.repositories import SqlAlchemyAccountRepository, SqlAlchemyAssetRepository
from src.snowball.domain.entities import Account, Asset

def test_account_repository(session: Session):
    repo = SqlAlchemyAccountRepository(session)

    # Create
    acc = Account(name="Test Repo", cash=100.0)
    saved = repo.save(acc)
    assert saved.id is not None
    assert saved.name == "Test Repo"

    # Get
    fetched = repo.get(saved.id)
    assert fetched is not None
    assert fetched.name == "Test Repo"

    # List
    all_accs = repo.list_all()
    assert len(all_accs) == 1

    # Update
    fetched.cash = 200.0
    repo.save(fetched)
    updated = repo.get(saved.id)
    assert updated.cash == 200.0

    # Delete
    repo.delete(saved.id)
    assert repo.get(saved.id) is None

def test_asset_repository(session: Session):
    acc_repo = SqlAlchemyAccountRepository(session)
    asset_repo = SqlAlchemyAssetRepository(session)

    # Setup Account
    acc = Account(name="Asset Holder", cash=0)
    acc = acc_repo.save(acc)

    # Create Asset
    asset = Asset(
        account_id=acc.id,
        name="Samsung",
        code="005930",
        target_weight=20.0,
        current_price=50000,
        quantity=10,
        avg_price=45000
    )
    saved = asset_repo.save(asset)
    assert saved.id is not None
    assert saved.account_id == acc.id

    # Get
    fetched = asset_repo.get(saved.id)
    assert fetched.name == "Samsung"

    # List by Account
    all_assets = asset_repo.list_by_account(acc.id)
    assert len(all_assets) == 1

    # Delete
    asset_repo.delete(saved.id)
    assert asset_repo.get(saved.id) is None

def test_cascade_delete(session: Session):
    # If account is deleted, assets should be deleted (if cascade is set up in DB models)
    # Looking at models, we need to check if cascade is set.
    # Let's verify via test.

    acc_repo = SqlAlchemyAccountRepository(session)
    asset_repo = SqlAlchemyAssetRepository(session)

    acc = acc_repo.save(Account(name="Cascade", cash=0))
    asset = asset_repo.save(Asset(account_id=acc.id, name="Dep", quantity=0))

    acc_repo.delete(acc.id)

    # Asset should be gone
    assert asset_repo.get(asset.id) is None
