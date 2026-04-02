import pytest
from uuid import uuid4
from sqlmodel import Session
from src.snowball.adapters.db.repositories import SqlAlchemyAccountRepository, SqlAlchemyAssetRepository
from src.snowball.domain.entities import Account, Asset, UserId
from src.snowball.adapters.db.models import UserModel

@pytest.fixture
def account_repo(session: Session):
    return SqlAlchemyAccountRepository(session)

@pytest.fixture
def asset_repo(session: Session):
    return SqlAlchemyAssetRepository(session)

@pytest.fixture
def test_user(session: Session):
    user = UserModel(email="test@test.com", password_hash="hash")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@pytest.fixture
def sample_account(account_repo, test_user):
    acc = Account(name="Fixture Acc", user_id=UserId(test_user.id), cash=100.0)
    return account_repo.save(acc)

def test_should_create_new_account(account_repo, test_user):
    # Given: Account details
    acc = Account(name="New Account", user_id=UserId(test_user.id), cash=500.0)

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


def test_list_all_with_code_returns_only_assets_with_code(asset_repo, sample_account):
    # Given: one asset with code, one without
    asset_repo.save(Asset(account_id=sample_account.id, name="삼성전자", code="005930", quantity=10))
    asset_repo.save(Asset(account_id=sample_account.id, name="현금성자산", code=None, quantity=0))

    # When
    result = asset_repo.list_all_with_code()

    # Then
    assert len(result) == 1
    assert result[0].code == "005930"
    assert result[0].name == "삼성전자"


def test_list_all_with_code_excludes_empty_string_code(asset_repo, sample_account):
    # Given: asset with empty string code
    asset_repo.save(Asset(account_id=sample_account.id, name="빈코드자산", code="", quantity=0))

    # When
    result = asset_repo.list_all_with_code()

    # Then
    assert len(result) == 0


def test_list_by_user_with_assets_returns_accounts_with_assets(session, account_repo, asset_repo):
    # Given
    from src.snowball.adapters.db.models import UserModel
    user = UserModel(email="joined@test.com", password_hash="h")
    session.add(user)
    session.commit()
    session.refresh(user)

    acc = account_repo.save(Account(name="내계좌", cash=100000.0, user_id=UserId(user.id)))
    asset_repo.save(Asset(account_id=acc.id, name="애플", code="AAPL",
                          category="해외주식", target_weight=100.0,
                          current_price=180.0, avg_price=150.0, quantity=5.0))

    # When
    result = account_repo.list_by_user_with_assets(UserId(user.id))

    # Then
    assert len(result) == 1
    assert result[0].name == "내계좌"
    assert len(result[0].assets) == 1
    assert result[0].assets[0].code == "AAPL"


def test_list_by_user_with_assets_only_returns_current_user_accounts(session, account_repo):
    # Given — 두 유저, 각각 계좌 1개
    from src.snowball.adapters.db.models import UserModel
    from uuid import uuid4
    user_a = UserModel(email="a@test.com", password_hash="h")
    user_b = UserModel(email="b@test.com", password_hash="h")
    session.add(user_a)
    session.add(user_b)
    session.commit()
    session.refresh(user_a)
    session.refresh(user_b)

    account_repo.save(Account(name="A계좌", cash=0.0, user_id=UserId(user_a.id)))
    account_repo.save(Account(name="B계좌", cash=0.0, user_id=UserId(user_b.id)))

    # When
    result = account_repo.list_by_user_with_assets(UserId(user_a.id))

    # Then
    assert len(result) == 1
    assert result[0].name == "A계좌"
