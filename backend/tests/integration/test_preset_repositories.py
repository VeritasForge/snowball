"""SqlAlchemyPresetRepository integration tests (Happy/Boundary/Error)."""
import pytest
from sqlmodel import Session, select
from uuid import uuid4

from src.snowball.adapters.db.models import PresetItemModel, UserModel
from src.snowball.adapters.db.repositories import SqlAlchemyPresetRepository
from src.snowball.domain.entities import Preset, PresetItem, UserId
from src.snowball.domain.enums import AssetCategory


@pytest.fixture
def preset_repo(session: Session):
    return SqlAlchemyPresetRepository(session)


@pytest.fixture
def sample_user(session: Session):
    user = UserModel(email="preset_user@test.com", password_hash="hash")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _three_fund_items():
    return [
        PresetItem(name="SPY", code="SPY", category=AssetCategory.STOCK, target_weight=60),
        PresetItem(name="TLT", code="TLT", category=AssetCategory.BOND, target_weight=30),
        PresetItem(name="GLD", code="GLD", category=AssetCategory.COMMODITY, target_weight=10),
    ]


def test_save_new_preset_returns_with_id(preset_repo, sample_user):
    # [Happy] 신규 저장 → id 채워짐, items 모두 보존
    saved = preset_repo.save(Preset(
        name="3-Fund",
        user_id=UserId(sample_user.id),
        items=_three_fund_items(),
    ))
    assert saved.id is not None
    assert saved.name == "3-Fund"
    assert saved.created_at is not None
    assert len(saved.items) == 3
    assert all(isinstance(i.category, AssetCategory) for i in saved.items)


def test_get_returns_preset_with_items_eager_loaded(preset_repo, sample_user):
    # [Happy] get → items eager loaded + AssetCategory coercion 작동
    original = preset_repo.save(Preset(
        name="2-Item",
        user_id=UserId(sample_user.id),
        items=[
            PresetItem(name="A", category=AssetCategory.STOCK, target_weight=50),
            PresetItem(name="B", category=AssetCategory.BOND, target_weight=50),
        ],
    ))
    fetched = preset_repo.get(original.id)
    assert fetched is not None
    assert len(fetched.items) == 2
    assert {i.name for i in fetched.items} == {"A", "B"}


def test_get_returns_none_for_missing_id(preset_repo):
    # [Boundary] 존재 안 함 → None
    assert preset_repo.get(99999) is None


def test_list_by_user_orders_by_created_at_desc(preset_repo, sample_user):
    # [Boundary] 최신순 정렬 (created_at DESC)
    p1 = preset_repo.save(Preset(
        name="First", user_id=UserId(sample_user.id),
        items=[PresetItem(name="X", category=AssetCategory.STOCK, target_weight=100)],
    ))
    p2 = preset_repo.save(Preset(
        name="Second", user_id=UserId(sample_user.id),
        items=[PresetItem(name="Y", category=AssetCategory.BOND, target_weight=100)],
    ))
    results = preset_repo.list_by_user(UserId(sample_user.id))
    assert len(results) == 2
    # Second was saved later → appears first
    assert results[0].name == "Second"
    assert results[1].name == "First"


def test_list_by_user_returns_empty_when_no_presets(preset_repo, sample_user):
    # [Boundary] 빈 리스트
    assert preset_repo.list_by_user(UserId(sample_user.id)) == []


def test_list_by_user_filters_by_user(preset_repo, sample_user, session):
    # [Boundary] 다른 사용자의 preset은 제외
    other_user = UserModel(email="other@test.com", password_hash="x")
    session.add(other_user)
    session.commit()
    session.refresh(other_user)
    preset_repo.save(Preset(
        name="Mine", user_id=UserId(sample_user.id),
        items=[PresetItem(name="A", category=AssetCategory.STOCK, target_weight=100)],
    ))
    preset_repo.save(Preset(
        name="Other's", user_id=UserId(other_user.id),
        items=[PresetItem(name="B", category=AssetCategory.BOND, target_weight=100)],
    ))
    results = preset_repo.list_by_user(UserId(sample_user.id))
    assert len(results) == 1
    assert results[0].name == "Mine"


def test_delete_removes_preset_and_cascades_items(preset_repo, sample_user, session):
    # [Happy] cascade delete: items 함께 제거
    saved = preset_repo.save(Preset(
        name="ToDelete", user_id=UserId(sample_user.id),
        items=[PresetItem(name="X", category=AssetCategory.STOCK, target_weight=100)],
    ))
    pid = saved.id
    preset_repo.delete(pid)
    assert preset_repo.get(pid) is None
    remaining = session.exec(
        select(PresetItemModel).where(PresetItemModel.preset_id == pid)
    ).all()
    assert remaining == []


def test_delete_nonexistent_is_noop(preset_repo):
    # [Boundary] 없는 id 삭제 → 예외 없음
    preset_repo.delete(99999)


def test_user_delete_cascades_to_presets(preset_repo, sample_user, session):
    # [Happy] FK ondelete=CASCADE — user 삭제 시 presets 자동 삭제
    preset_repo.save(Preset(
        name="Cascade Test", user_id=UserId(sample_user.id),
        items=[PresetItem(name="A", category=AssetCategory.STOCK, target_weight=100)],
    ))
    user_model = session.get(UserModel, sample_user.id)
    session.delete(user_model)
    session.commit()
    assert preset_repo.list_by_user(UserId(sample_user.id)) == []


def test_save_existing_id_replaces_items(preset_repo, sample_user):
    # [Boundary] id 있는 preset save → name + items 전체 교체
    original = preset_repo.save(Preset(
        name="V1", user_id=UserId(sample_user.id),
        items=[PresetItem(name="X", category=AssetCategory.STOCK, target_weight=100)],
    ))
    original.name = "V2"
    original.items = [
        PresetItem(name="Y", category=AssetCategory.BOND, target_weight=50),
        PresetItem(name="Z", category=AssetCategory.CASH, target_weight=50),
    ]
    updated = preset_repo.save(original)
    assert updated.name == "V2"
    assert len(updated.items) == 2
    assert {i.name for i in updated.items} == {"Y", "Z"}


def test_save_with_phantom_id_creates_new(preset_repo, sample_user):
    # [Boundary] id 있지만 DB에 없음 → 신규 생성 path (다른 repos 패턴과 일치)
    phantom = Preset(
        id=99999,
        name="Phantom",
        user_id=UserId(sample_user.id),
        items=[PresetItem(name="P", category=AssetCategory.STOCK, target_weight=100)],
    )
    saved = preset_repo.save(phantom)
    assert saved.id is not None
    assert saved.name == "Phantom"
    assert len(saved.items) == 1
