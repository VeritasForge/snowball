import pytest
from sqlmodel import Session
from src.snowball.adapters.db.repositories import SqlAlchemyAccountRepository, SqlAlchemyAssetRepository
from src.snowball.domain.entities import Account, Asset

@pytest.fixture
def account_repo(session: Session):
    return SqlAlchemyAccountRepository(session)

@pytest.fixture
def asset_repo(session: Session):
    return SqlAlchemyAssetRepository(session)

@pytest.fixture
def sample_account(account_repo):
    acc = Account(name="Fixture Acc", cash=100.0)
    return account_repo.save(acc)

def test_should_create_new_account(account_repo):
    # Given: Account details
    acc = Account(name="New Account", cash=500.0)

    # When: Saving
    saved = account_repo.save(acc)

    # Then: ID is generated
    assert saved.id is not None
    assert saved.name == "New Account"

def test_should_get_account_by_id(account_repo, sample_account):
    # Given: Existing account (from fixture)

    # When: Retrieving by ID
    fetched = account_repo.get(sample_account.id)

    # Then: Account is returned
    assert fetched is not None
    assert fetched.id == sample_account.id

def test_should_list_all_accounts(account_repo, sample_account):
    # Given: Existing account

    # When: Listing all
    all_accs = account_repo.list_all()

    # Then: List is not empty
    assert len(all_accs) >= 1

def test_should_update_account_fields(account_repo, sample_account):
    # Given: Existing account with modified fields
    sample_account.cash = 999.0

    # When: Saving
    account_repo.save(sample_account)

    # Then: Changes are persisted
    updated = account_repo.get(sample_account.id)
    assert updated.cash == 999.0

def test_should_delete_account(account_repo, sample_account):
    # Given: Existing account

    # When: Deleting
    account_repo.delete(sample_account.id)

    # Then: Account is gone
    assert account_repo.get(sample_account.id) is None

def test_should_create_asset_linked_to_account(asset_repo, sample_account):
    # Given: Asset data linked to account
    asset = Asset(
        account_id=sample_account.id,
        name="Samsung",
        code="005930",
        current_price=50000,
        quantity=10
    )

    # When: Saving asset
    saved = asset_repo.save(asset)

    # Then: Asset is created
    assert saved.id is not None
    assert saved.account_id == sample_account.id

def test_should_list_assets_by_account(asset_repo, sample_account):
    # Given: Asset created for account
    asset = Asset(
        account_id=sample_account.id,
        name="Stock A",
        quantity=5
    )
    asset_repo.save(asset)

    # When: Listing by account ID
    assets = asset_repo.list_by_account(sample_account.id)

    # Then: Asset is in list
    assert len(assets) == 1
    assert assets[0].name == "Stock A"

def test_should_cascade_delete_assets_when_account_deleted(account_repo, asset_repo, sample_account):
    # Given: Account with an asset
    asset = asset_repo.save(Asset(account_id=sample_account.id, name="Dep", quantity=0))

    # When: Deleting account
    account_repo.delete(sample_account.id)

    # Then: Asset is also deleted (Simulated check, depends on DB constraint/Impl)
    # Note: As per previous integration test findings, we verify the expectation.
    assert asset_repo.get(asset.id) is None
