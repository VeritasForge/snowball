import pytest
from uuid import uuid4
from sqlmodel import Session
from src.snowball.adapters.db.repositories import (
    SqlAlchemyAccountRepository,
    SqlAlchemyAssetRepository,
    SqlAlchemyAuthRepository,
)
from src.snowball.domain.entities import Account, Asset, User, UserId
from src.snowball.adapters.db.models import UserModel, AssetModel

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


# ---------------------------------------------------------------------------
# SqlAlchemyAuthRepository tests
# ---------------------------------------------------------------------------

@pytest.fixture
def auth_repo(session: Session):
    return SqlAlchemyAuthRepository(session)


@pytest.fixture
def sample_user_model(session: Session):
    user = UserModel(email="auth_test@example.com", password_hash="hashed")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def test_auth_repo_get_by_email_returns_user(auth_repo, sample_user_model):
    # [Happy] get_by_email returns user when found
    # Given: user in DB (from fixture)
    # When
    result = auth_repo.get_by_email("auth_test@example.com")
    # Then
    assert result is not None
    assert result.email == "auth_test@example.com"


def test_auth_repo_get_by_email_returns_none_when_not_found(auth_repo):
    # [Boundary] get_by_email returns None when email not in DB
    # When
    result = auth_repo.get_by_email("nobody@example.com")
    # Then
    assert result is None


def test_auth_repo_get_by_id_returns_user(auth_repo, sample_user_model):
    # [Happy] get_by_id returns user when found
    # When
    result = auth_repo.get_by_id(UserId(sample_user_model.id))
    # Then
    assert result is not None
    assert result.email == "auth_test@example.com"


def test_auth_repo_get_by_id_returns_none_when_not_found(auth_repo):
    # [Boundary] get_by_id returns None for non-existent id
    # When
    result = auth_repo.get_by_id(UserId(uuid4()))
    # Then
    assert result is None


def test_auth_repo_save_creates_new_user(auth_repo):
    # [Happy] save creates a new user record in the DB
    # Given
    new_user = User(
        id=UserId(uuid4()),
        email="savetest@example.com",
        password_hash="hashvalue"
    )
    # When
    saved = auth_repo.save(new_user)
    # Then
    assert saved.email == "savetest@example.com"
    assert auth_repo.get_by_email("savetest@example.com") is not None


def test_auth_repo_save_updates_existing_user(auth_repo, sample_user_model):
    # [Happy] save updates password_hash of existing user
    # Given: fetch existing user entity
    user_entity = auth_repo.get_by_id(UserId(sample_user_model.id))
    assert user_entity is not None
    user_entity.password_hash = "newhash"
    # When
    updated = auth_repo.save(user_entity)
    # Then
    assert updated.password_hash == "newhash"
    refetched = auth_repo.get_by_id(UserId(sample_user_model.id))
    assert refetched.password_hash == "newhash"


# ---------------------------------------------------------------------------
# Account save (update) path
# ---------------------------------------------------------------------------

def test_account_save_updates_existing_account(account_repo, sample_account):
    # [Happy] save with existing id updates the record
    # Given: modify fields
    sample_account.name = "Updated Name"
    sample_account.cash = 9999.0
    # When
    updated = account_repo.save(sample_account)
    # Then
    assert updated.name == "Updated Name"
    assert updated.cash == 9999.0


# ---------------------------------------------------------------------------
# Account list_by_user
# ---------------------------------------------------------------------------

def test_list_by_user_returns_only_user_accounts(session, account_repo):
    # [Happy] list_by_user returns only accounts belonging to given user
    # Given
    user_a = UserModel(email="u_a@test.com", password_hash="h")
    user_b = UserModel(email="u_b@test.com", password_hash="h")
    session.add(user_a)
    session.add(user_b)
    session.commit()
    session.refresh(user_a)
    session.refresh(user_b)

    account_repo.save(Account(name="A", cash=0.0, user_id=UserId(user_a.id)))
    account_repo.save(Account(name="B", cash=0.0, user_id=UserId(user_b.id)))
    # When
    result = account_repo.list_by_user(UserId(user_a.id))
    # Then
    assert len(result) == 1
    assert result[0].name == "A"


# ---------------------------------------------------------------------------
# Asset save (update) path and _to_entity ValueError
# ---------------------------------------------------------------------------

def test_asset_save_updates_existing_asset(asset_repo, sample_account):
    # [Happy] save with existing id updates the record
    # Given
    asset = asset_repo.save(Asset(account_id=sample_account.id, name="Old", quantity=1))
    asset.name = "New Name"
    asset.quantity = 5
    # When
    updated = asset_repo.save(asset)
    # Then
    assert updated.name == "New Name"
    assert updated.quantity == 5


def test_asset_to_entity_raises_when_account_id_is_none(session, sample_account):
    # [Error] _to_entity raises ValueError if AssetModel has no account_id
    # Given: create AssetModel with no account_id directly
    bad_asset = AssetModel(
        name="Orphan",
        code="X",
        category="주식",
        target_weight=0,
        current_price=0,
        avg_price=0,
        quantity=0,
    )
    # account_id is nullable in the model, so set it to None explicitly
    bad_asset.account_id = None
    session.add(bad_asset)
    session.commit()
    session.refresh(bad_asset)

    # When: try to convert via _to_entity
    from src.snowball.adapters.db.repositories import SqlAlchemyAssetRepository
    repo = SqlAlchemyAssetRepository(session)
    with pytest.raises(ValueError, match="has no account_id"):
        repo._to_entity(bad_asset)


def test_account_to_asset_entity_raises_when_account_id_is_none(session, sample_account):
    # [Error] SqlAlchemyAccountRepository._to_asset_entity raises ValueError for None account_id
    from src.snowball.adapters.db.repositories import SqlAlchemyAccountRepository
    repo = SqlAlchemyAccountRepository(session)
    bad_asset = AssetModel(
        name="BadAsset",
        code="B",
        category="주식",
        target_weight=0,
        current_price=0,
        avg_price=0,
        quantity=0,
    )
    bad_asset.account_id = None
    session.add(bad_asset)
    session.commit()
    session.refresh(bad_asset)

    with pytest.raises(ValueError, match="has no account_id"):
        repo._to_asset_entity(bad_asset)


# ---------------------------------------------------------------------------
# Delete no-op branches (model not found → silent return)
# ---------------------------------------------------------------------------

def test_account_delete_nonexistent_id_is_no_op(account_repo):
    # [Boundary] Deleting account that doesn't exist does nothing (no error)
    # Given: id that was never created
    nonexistent_id = 999999
    # When / Then: no exception raised
    account_repo.delete(nonexistent_id)  # should be a no-op


def test_asset_delete_nonexistent_id_is_no_op(asset_repo):
    # [Boundary] Deleting asset that doesn't exist does nothing (no error)
    # When / Then
    asset_repo.delete(999999)  # should be a no-op


# ---------------------------------------------------------------------------
# Save with id but model not found in DB → falls through to create (116->127, 171->186)
# ---------------------------------------------------------------------------

def test_account_save_with_nonexistent_id_creates_new_record(account_repo, test_user):
    # [Boundary] When save() receives an account with an id not in DB, it creates a new record
    # (the 'if model:' branch is False, falls through to create path)
    # Given: account with an id that doesn't exist in DB
    phantom_account = Account(id=99999, name="Phantom", user_id=UserId(test_user.id), cash=0.0)
    # When
    saved = account_repo.save(phantom_account)
    # Then: a new record is created (with a new DB-generated id different from 99999, or same if DB allows)
    assert saved is not None
    assert saved.name == "Phantom"


def test_asset_save_with_nonexistent_id_creates_new_record(asset_repo, sample_account):
    # [Boundary] When save() receives an asset with an id not in DB, it creates a new record
    # Given
    phantom_asset = Asset(id=99999, account_id=sample_account.id, name="Phantom", quantity=0)
    # When
    saved = asset_repo.save(phantom_asset)
    # Then: record created
    assert saved is not None
    assert saved.name == "Phantom"
