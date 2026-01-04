import pytest
from sqlmodel import Session
from src.snowball.adapters.db.repositories import SqlAlchemyAccountRepository, SqlAlchemyAssetRepository
from src.snowball.domain.entities import Account, Asset

def test_account_repository(session: Session):
    # Given: A repository instance
    repo = SqlAlchemyAccountRepository(session)

    # When: Saving a new account
    acc = Account(name="Test Repo", cash=100.0)
    saved = repo.save(acc)

    # Then: ID is generated and fields match
    assert saved.id is not None
    assert saved.name == "Test Repo"

    # When: Retrieving by ID
    fetched = repo.get(saved.id)

    # Then: Account is found
    assert fetched is not None
    assert fetched.name == "Test Repo"

    # When: Listing all accounts
    all_accs = repo.list_all()
    # Then: List contains the account
    assert len(all_accs) == 1

    # When: Updating the account
    fetched.cash = 200.0
    repo.save(fetched)
    updated = repo.get(saved.id)
    # Then: Updates are persisted
    assert updated.cash == 200.0

    # When: Deleting the account
    repo.delete(saved.id)
    # Then: Account is gone
    assert repo.get(saved.id) is None

def test_asset_repository(session: Session):
    # Given: Account and Asset repositories
    acc_repo = SqlAlchemyAccountRepository(session)
    asset_repo = SqlAlchemyAssetRepository(session)

    # And: An existing account
    acc = Account(name="Asset Holder", cash=0)
    acc = acc_repo.save(acc)

    # When: Saving a new asset
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

    # Then: ID generated and linked to account
    assert saved.id is not None
    assert saved.account_id == acc.id

    # When: Retrieving by ID
    fetched = asset_repo.get(saved.id)
    # Then: Asset matches
    assert fetched.name == "Samsung"

    # When: Listing by Account ID
    all_assets = asset_repo.list_by_account(acc.id)
    # Then: List is correct
    assert len(all_assets) == 1

    # When: Deleting asset
    asset_repo.delete(saved.id)
    # Then: Asset is gone
    assert asset_repo.get(saved.id) is None

def test_cascade_delete(session: Session):
    # Given: Account with an Asset
    acc_repo = SqlAlchemyAccountRepository(session)
    asset_repo = SqlAlchemyAssetRepository(session)

    acc = acc_repo.save(Account(name="Cascade", cash=0))
    asset = asset_repo.save(Asset(account_id=acc.id, name="Dep", quantity=0))

    # When: Account is deleted
    acc_repo.delete(acc.id)

    # Then: Asset should be gone (Assuming cascade is configured in DB model or Logic)
    # Note: In-memory sqlite with SQLModel might behave differently regarding cascade
    # if foreign key constraints aren't enforced or defined.
    # The models definition needs to support cascade.
    # However, for integration test, we verify expected behavior.
    assert asset_repo.get(asset.id) is None
