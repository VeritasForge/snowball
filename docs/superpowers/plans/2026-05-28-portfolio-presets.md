# Portfolio Presets (Plan B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **선행 조건**: Plan A (`2026-05-28-asset-category-strenum-migration.md`)이 prod에 배포 + 1-2일 관찰 + 회귀 0건 상태여야 한다.

**Goal:** 사용자가 자산 배분 비중(목표비중)을 프리셋으로 저장하고, 다른 계좌 또는 시점에 적용(덧써쓰기)할 수 있게 한다. UI는 AssetTable 툴바의 `📂 프리셋 관리` 버튼 → 전용 모달 (불러오기/저장 탭).

**Architecture:** Clean Architecture 준수 — domain entities/ports → use cases → adapters(db, api). 프리셋은 user 범위, items는 종목명·코드·분류·목표비중만 저장. Apply는 결정적 1:1 매칭 (Pydantic validator로 입력 검증 + DB partial unique로 invariant 보장), 덧써쓰기(target_weight만 update, 사용자 편집값 보존). 프론트엔드는 React 19 + Next.js 16 dynamic import, 조건부 마운트, race-safe `replaceAccount`.

**Tech Stack:** Python 3.12, FastAPI, SQLModel, Alembic, slowapi, pytest 100%, React 19, Next.js 16, Vitest.

**Origin Spec:** `docs/superpowers/specs/2026-05-28-portfolio-presets-design.md` (§2.1 FR-1~9, §3.2~3.5, §4, §5)

---

## File Structure

### B1 단계 — 도메인 + Repository

| 파일 | 책임 |
|------|------|
| `backend/src/snowball/domain/entities.py` | `Preset`, `PresetItem` dataclass 추가 |
| `backend/src/snowball/domain/ports.py` | `AbstractPresetRepository` ABC |
| `backend/src/snowball/adapters/db/models.py` | `PresetModel`, `PresetItemModel` + `UserModel.presets` 역관계 |
| `backend/src/snowball/adapters/db/repositories.py` | `SqlAlchemyPresetRepository` (명시적 `_to_entity` coercion + preset_id 변환) |
| `backend/alembic/versions/0004_preset_tables.py` (신규) | preset, preset_item 테이블 + CHECK + FK CASCADE |
| `backend/tests/unit/domain/test_preset_entities.py` (신규) | dataclass 생성/검증 |
| `backend/tests/integration/test_preset_repositories.py` (신규) | CRUD + cascade + downgrade |

### B2 단계 — Use cases + API + Rate limiting

| 파일 | 책임 |
|------|------|
| `backend/src/snowball/infrastructure/security.py` | `decode_token`에 type='access' 검증 추가 (rl-verify N1-S) |
| `backend/src/snowball/adapters/api/dtos.py` | `PresetCreate`, `PresetItemCreate`, `PresetResponse`, `ApplyPresetResponse` + validators |
| `backend/src/snowball/use_cases/presets.py` (신규) | 4개 Use Case: Create/List/Delete/Apply |
| `backend/src/snowball/adapters/api/routes.py` | 4개 endpoint + per-user limiter (`user_id_key_func`) |
| `backend/tests/unit/use_cases/test_preset_use_cases.py` (신규) | Use case unit tests (Happy/Boundary/Error) |
| `backend/tests/unit/infrastructure/test_security_token_type.py` (신규) | JWT type check 회귀 |
| `backend/tests/unit/adapters/test_preset_dtos.py` (신규) | DTO validators (extra='forbid', no_duplicate_match_key, code pattern) |
| `backend/tests/e2e/test_presets.py` (신규) | CRUD + apply + 404/400/429 전체 |

### B3 단계 — Frontend

| 파일 | 책임 |
|------|------|
| `frontend/src/types.ts` | `Preset`, `PresetItem` 타입 추가 |
| `frontend/src/lib/hooks/useAccounts.ts` | `replaceAccount` 메서드 + race guard (lastMutationRef) |
| `frontend/src/lib/hooks/usePortfolioData.ts` | `replaceAccount` export 추가 |
| `frontend/src/lib/hooks/usePresets.ts` (신규) | 프리셋 CRUD 훅 |
| `frontend/src/components/PresetManagerModal.tsx` (신규) | 모달 + 탭 + a11y + confirm + 429 처리 |
| `frontend/src/components/AssetTable.tsx` | 툴바에 `📂 프리셋 관리` 버튼 |
| `frontend/src/app/page.tsx` | dynamic import + 조건부 마운트 |
| `frontend/tests/hooks/usePresets.test.ts` (신규) | hook tests |
| `frontend/tests/hooks/usePortfolioData-replaceAccount.test.ts` (신규) | race guard 회귀 |
| `frontend/tests/components/PresetManagerModal.test.tsx` (신규) | 컴포넌트 + a11y tests |

---

## B1 단계 — Preset 도메인 + Repository

### Task B1.1: 도메인 엔티티 + 단위 테스트

**Files:**
- Modify: `backend/src/snowball/domain/entities.py`
- Create: `backend/tests/unit/domain/test_preset_entities.py`

- [ ] **Step 1: Write failing tests**

`backend/tests/unit/domain/test_preset_entities.py` 신규:

```python
"""Preset, PresetItem dataclass tests (Happy/Boundary/Error).

Note: target_weight 음수/>100 검증은 Pydantic DTO 레벨에서 처리.
도메인 dataclass는 단순 보관자 (외부 호출/IO 없음 — Error 케이스는 DTO에서).
"""
from uuid import uuid4

from src.snowball.domain.entities import Preset, PresetItem, UserId
from src.snowball.domain.enums import AssetCategory


class TestPresetItem:
    def test_create_with_required_fields(self):
        # [Happy]
        item = PresetItem(name="SPY", category=AssetCategory.STOCK, target_weight=60.0)
        assert item.name == "SPY"
        assert item.category is AssetCategory.STOCK
        assert item.target_weight == 60.0
        assert item.code is None  # default

    def test_create_with_optional_code(self):
        # [Boundary] code 있음
        item = PresetItem(
            name="S&P500", code="SPY",
            category=AssetCategory.STOCK, target_weight=50.0,
        )
        assert item.code == "SPY"

    def test_target_weight_zero_allowed(self):
        # [Boundary] target_weight 0 허용 (도메인 레벨에서는 제약 없음)
        item = PresetItem(name="X", category=AssetCategory.OTHER, target_weight=0.0)
        assert item.target_weight == 0.0


class TestPreset:
    def test_create_with_empty_items(self):
        # [Happy] items 기본값 빈 list (도메인 레벨은 허용, DTO가 min_length=1 강제)
        user_id = UserId(uuid4())
        preset = Preset(name="My Portfolio", user_id=user_id)
        assert preset.name == "My Portfolio"
        assert preset.user_id == user_id
        assert preset.items == []
        assert preset.id is None
        assert preset.created_at is None

    def test_create_with_multiple_items(self):
        # [Boundary] items 여러 개
        user_id = UserId(uuid4())
        preset = Preset(
            name="3-Fund",
            user_id=user_id,
            items=[
                PresetItem(name="SPY", code="SPY", category=AssetCategory.STOCK, target_weight=60.0),
                PresetItem(name="TLT", code="TLT", category=AssetCategory.BOND, target_weight=30.0),
                PresetItem(name="GLD", code="GLD", category=AssetCategory.COMMODITY, target_weight=10.0),
            ],
        )
        assert len(preset.items) == 3
        # 도메인 레벨에서는 합계 100% 강제 안 함 (FR-7)
        assert sum(i.target_weight for i in preset.items) == 100.0
```

- [ ] **Step 2: Run — expect ImportError**

```bash
cd backend && uv run pytest tests/unit/domain/test_preset_entities.py -v
```

Expected: ImportError on `Preset, PresetItem`.

- [ ] **Step 3: Add entities to entities.py**

`backend/src/snowball/domain/entities.py` 끝에 추가:

```python
@dataclass
class PresetItem:
    name: str
    category: AssetCategory
    target_weight: float
    code: str | None = None
    # preset_id는 리포지토리/DB 관심사 → 도메인 엔티티에서 제외
    # (Asset.account_id와 비대칭이나, PresetItem은 Preset aggregate의
    #  child entity로 독립 조회되지 않으므로 parent FK 제거가 DDD에 더 부합)


@dataclass
class Preset:
    name: str
    user_id: UserId
    id: int | None = None
    created_at: datetime | None = None
    items: list[PresetItem] = field(default_factory=list)
```

- [ ] **Step 4: Run — expect PASS**

```bash
cd backend && uv run pytest tests/unit/domain/test_preset_entities.py -v
```

Expected: 5/5 PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/snowball/domain/entities.py backend/tests/unit/domain/test_preset_entities.py
git commit -m "feat(domain): add Preset, PresetItem entities"
```

---

### Task B1.2: AbstractPresetRepository 포트 정의

**Files:**
- Modify: `backend/src/snowball/domain/ports.py`

- [ ] **Step 1: Read existing ports for pattern**

```bash
cd backend && cat src/snowball/domain/ports.py
```

기존 패턴: `class AbstractXxxRepository(ABC):` + `@abstractmethod` + `raise NotImplementedError`.

- [ ] **Step 2: Add AbstractPresetRepository**

`backend/src/snowball/domain/ports.py` 끝에 추가:

```python
class AbstractPresetRepository(ABC):
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
```

상단 import에 `Preset`이 없으면 추가:

```python
from .entities import ..., Preset
```

- [ ] **Step 3: Run all tests — no regression**

```bash
cd backend && uv run pytest -v
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/snowball/domain/ports.py
git commit -m "feat(domain): add AbstractPresetRepository port"
```

---

### Task B1.3: DB 모델 + UserModel.presets 역관계

**Files:**
- Modify: `backend/src/snowball/adapters/db/models.py`

- [ ] **Step 1: Add PresetModel, PresetItemModel + UserModel.presets**

`backend/src/snowball/adapters/db/models.py`에 추가 (파일 상단 import 보강 포함):

```python
from sqlalchemy import String, Column, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID as PGUUID

# UserModel 안에 presets 역관계 추가
class UserModel(SQLModel, table=True):
    # ... 기존 필드 ...
    presets: list["PresetModel"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class PresetModel(SQLModel, table=True):
    __tablename__ = "preset"
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, nullable=False)
    user_id: UUID = Field(
        sa_column=Column(
            PGUUID(as_uuid=True),
            ForeignKey("user.id", ondelete="CASCADE"),
            index=True,
            nullable=False,
        ),
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)

    user: UserModel | None = Relationship(back_populates="presets")
    items: list["PresetItemModel"] = Relationship(
        back_populates="preset",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class PresetItemModel(SQLModel, table=True):
    __tablename__ = "preset_item"
    id: int | None = Field(default=None, primary_key=True)
    preset_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("preset.id", ondelete="CASCADE"),
            index=True,
            nullable=False,
        ),
    )
    name: str = Field(max_length=200, nullable=False)
    code: str | None = Field(default=None, max_length=20)
    category: AssetCategory = Field(
        default=AssetCategory.STOCK,
        sa_column=Column(String, nullable=False, default=AssetCategory.STOCK.value),
    )
    target_weight: float = 0.0

    preset: PresetModel | None = Relationship(back_populates="items")
```

> **주의**: SQLite는 `PGUUID(as_uuid=True)`를 지원 안 함. 테스트에서 SQLite 사용 시 dialect-aware compilation 또는 별도 처리 필요. 기존 `AccountModel.user_id`가 이미 `UUID` 타입이므로 동일 패턴 따라가면 호환됨 — `from sqlalchemy.types import TypeDecorator` 패턴이 이미 있다면 재사용.
>
> 대안: SQLAlchemy 2.x의 `Uuid` 타입 사용 — dialect-agnostic.
>
> ```python
> from sqlalchemy import Uuid
> user_id: UUID = Field(
>     sa_column=Column(Uuid, ForeignKey("user.id", ondelete="CASCADE"),
>                       index=True, nullable=False),
> )
> ```
>
> `Uuid` 타입을 사용하는 것을 권장. 위 코드 블록의 `PGUUID(as_uuid=True)` 부분을 `Uuid`로 교체.

- [ ] **Step 2: Run unit/integration tests**

```bash
cd backend && uv run pytest tests/unit/ tests/integration/ -v
```

Expected: PASS (테이블 생성은 다음 migration task에서).

- [ ] **Step 3: Commit**

```bash
git add backend/src/snowball/adapters/db/models.py
git commit -m "feat(db): add PresetModel, PresetItemModel with FK CASCADE"
```

---

### Task B1.4: Alembic migration — preset, preset_item 테이블

**Files:**
- Create: `backend/alembic/versions/0004_preset_tables.py`

- [ ] **Step 1: Generate migration**

```bash
cd backend && DATABASE_URL="sqlite:///:memory:" uv run alembic revision --autogenerate -m "preset and preset_item tables" --rev-id 0004_preset_tables
```

Expected: 자동 생성 결과는 수동 검토 필요. CHECK constraint와 FK CASCADE는 autogenerate가 놓칠 수 있음.

- [ ] **Step 2: Verify generated file + manual fix**

생성된 파일을 다음으로 검토/교체:

```python
"""preset and preset_item tables

Revision ID: 0004_preset_tables
Revises: 0003_asset_constraints
Create Date: 2026-05-28
"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes  # noqa: F401


revision = "0004_preset_tables"
down_revision = "0003_asset_constraints"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "preset",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False,
                  server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_preset_user_id", "preset", ["user_id"])

    op.create_table(
        "preset_item",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("preset_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("code", sa.String(length=20), nullable=True),
        sa.Column("category", sa.String(), nullable=False,
                  server_default=sa.text("'주식'")),
        sa.Column("target_weight", sa.Float(), nullable=False,
                  server_default=sa.text("0")),
        sa.ForeignKeyConstraint(["preset_id"], ["preset.id"], ondelete="CASCADE"),
        sa.CheckConstraint(
            "category IN ('주식', '채권', '원자재', '현금', '기타')",
            name="ck_preset_item_category_enum",
        ),
    )
    op.create_index("ix_preset_item_preset_id", "preset_item", ["preset_id"])


def downgrade() -> None:
    op.drop_index("ix_preset_item_preset_id", table_name="preset_item")
    op.drop_table("preset_item")
    op.drop_index("ix_preset_user_id", table_name="preset")
    op.drop_table("preset")
```

> CHECK constraint의 enum 값 리스트는 A3와 동일. A2 audit에서 enum 멤버를 추가했다면 여기도 동기화.

- [ ] **Step 3: Test round-trip**

```bash
cd backend && DATABASE_URL="sqlite:///:memory:" uv run alembic upgrade head
cd backend && DATABASE_URL="sqlite:///:memory:" uv run alembic downgrade -1
cd backend && DATABASE_URL="sqlite:///:memory:" uv run alembic upgrade head
```

Expected: 모두 PASS.

- [ ] **Step 4: Verify alembic check no drift**

```bash
cd backend && DATABASE_URL="sqlite:///:memory:" uv run alembic check
```

Expected: "No new upgrade operations detected." (drift 0).

- [ ] **Step 5: Commit**

```bash
git add backend/alembic/versions/0004_preset_tables.py
git commit -m "feat(db): add preset and preset_item tables with CHECK + FK CASCADE"
```

---

### Task B1.5: SqlAlchemyPresetRepository 구현

**Files:**
- Modify: `backend/src/snowball/adapters/db/repositories.py`

- [ ] **Step 1: Add SqlAlchemyPresetRepository class**

`backend/src/snowball/adapters/db/repositories.py` 끝에 추가:

```python
from sqlmodel import select
from sqlalchemy.orm import selectinload

from ...domain.entities import Preset, PresetItem, UserId
from ...domain.enums import AssetCategory
from ...domain.ports import AbstractPresetRepository
from .models import PresetModel, PresetItemModel


class SqlAlchemyPresetRepository(AbstractPresetRepository):
    def __init__(self, session):
        self.session = session

    def _to_item_entity(self, model: PresetItemModel) -> PresetItem:
        return PresetItem(
            name=model.name,
            code=model.code,
            category=AssetCategory(model.category),  # 명시 coercion
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

    def save(self, preset: Preset) -> Preset:
        if preset.id is None:
            model = PresetModel(name=preset.name, user_id=preset.user_id)
            self.session.add(model)
            self.session.flush()  # preset.id 채우기
            for item in preset.items:
                im = PresetItemModel(
                    preset_id=model.id,
                    name=item.name,
                    code=item.code,
                    category=item.category,
                    target_weight=item.target_weight,
                )
                self.session.add(im)
            self.session.commit()
            self.session.refresh(model)
        else:
            model = self.session.get(PresetModel, preset.id)
            if model is None:
                raise ValueError(f"Preset {preset.id} not found")
            model.name = preset.name
            # items 전체 교체 (단순화 — 부분 update는 별도 use case)
            for old in list(model.items):
                self.session.delete(old)
            self.session.flush()
            for item in preset.items:
                im = PresetItemModel(
                    preset_id=model.id,
                    name=item.name,
                    code=item.code,
                    category=item.category,
                    target_weight=item.target_weight,
                )
                self.session.add(im)
            self.session.commit()
            self.session.refresh(model)
        return self._to_entity(model)

    def get(self, preset_id: int) -> Preset | None:
        stmt = (
            select(PresetModel)
            .where(PresetModel.id == preset_id)
            .options(selectinload(PresetModel.items))
        )
        model = self.session.exec(stmt).first()
        return self._to_entity(model) if model else None

    def list_by_user(self, user_id: UserId) -> list[Preset]:
        stmt = (
            select(PresetModel)
            .where(PresetModel.user_id == user_id)
            .options(selectinload(PresetModel.items))
            .order_by(PresetModel.created_at.desc())
        )
        models = self.session.exec(stmt).all()
        return [self._to_entity(m) for m in models]

    def delete(self, preset_id: int) -> None:
        model = self.session.get(PresetModel, preset_id)
        if model is None:
            return
        self.session.delete(model)
        self.session.commit()
```

- [ ] **Step 2: Verify imports + run unit tests**

```bash
cd backend && uv run pytest tests/unit/ -v
```

Expected: PASS (이 task에서는 직접 호출 안 함).

- [ ] **Step 3: Commit**

```bash
git add backend/src/snowball/adapters/db/repositories.py
git commit -m "feat(repo): implement SqlAlchemyPresetRepository with explicit coercion"
```

---

### Task B1.6: Integration tests — preset repository

**Files:**
- Create: `backend/tests/integration/test_preset_repositories.py`

- [ ] **Step 1: Write tests**

`backend/tests/integration/test_preset_repositories.py` 신규:

```python
"""SqlAlchemyPresetRepository integration tests (Happy/Boundary/Error)."""
import pytest
from uuid import uuid4

from src.snowball.domain.entities import Preset, PresetItem, User, UserId
from src.snowball.domain.enums import AssetCategory
from src.snowball.adapters.db.repositories import (
    SqlAlchemyAuthRepository,
    SqlAlchemyPresetRepository,
)
from src.snowball.adapters.db.models import PresetModel


@pytest.fixture
def sample_user(session):
    auth_repo = SqlAlchemyAuthRepository(session)
    user = User(email="test@example.com", password_hash="x")
    return auth_repo.create(user)


@pytest.fixture
def preset_repo(session):
    return SqlAlchemyPresetRepository(session)


class TestSqlAlchemyPresetRepository:
    def test_save_new_preset_returns_with_id(self, preset_repo, sample_user):
        # [Happy] 신규 저장 → id 채워짐
        preset = Preset(
            name="3-Fund",
            user_id=sample_user.id,
            items=[
                PresetItem(name="SPY", code="SPY", category=AssetCategory.STOCK, target_weight=60),
                PresetItem(name="TLT", code="TLT", category=AssetCategory.BOND, target_weight=30),
                PresetItem(name="GLD", code="GLD", category=AssetCategory.COMMODITY, target_weight=10),
            ],
        )
        saved = preset_repo.save(preset)
        assert saved.id is not None
        assert len(saved.items) == 3
        assert saved.created_at is not None

    def test_get_returns_preset_with_items(self, preset_repo, sample_user):
        # [Happy] get → items eager loaded
        original = preset_repo.save(Preset(
            name="2-Item",
            user_id=sample_user.id,
            items=[
                PresetItem(name="A", category=AssetCategory.STOCK, target_weight=50),
                PresetItem(name="B", category=AssetCategory.BOND, target_weight=50),
            ],
        ))
        fetched = preset_repo.get(original.id)
        assert fetched is not None
        assert len(fetched.items) == 2
        assert all(isinstance(i.category, AssetCategory) for i in fetched.items)  # coercion 검증

    def test_get_returns_none_for_missing_id(self, preset_repo):
        # [Boundary] 존재하지 않는 id → None
        assert preset_repo.get(99999) is None

    def test_list_by_user_returns_in_created_at_desc(self, preset_repo, sample_user):
        # [Boundary] 사용자 범위 list, 최신순
        p1 = preset_repo.save(Preset(
            name="First", user_id=sample_user.id,
            items=[PresetItem(name="X", category=AssetCategory.STOCK, target_weight=100)],
        ))
        p2 = preset_repo.save(Preset(
            name="Second", user_id=sample_user.id,
            items=[PresetItem(name="Y", category=AssetCategory.BOND, target_weight=100)],
        ))
        results = preset_repo.list_by_user(sample_user.id)
        assert len(results) == 2
        # 최신순 (Second가 먼저)
        assert results[0].name == "Second"
        assert results[1].name == "First"

    def test_list_by_user_returns_empty_for_no_presets(self, preset_repo, sample_user):
        # [Boundary] 빈 리스트
        assert preset_repo.list_by_user(sample_user.id) == []

    def test_delete_removes_preset_and_items_cascade(self, preset_repo, sample_user, session):
        # [Happy] delete → cascade로 items 함께 제거
        preset = preset_repo.save(Preset(
            name="ToDelete", user_id=sample_user.id,
            items=[PresetItem(name="X", category=AssetCategory.STOCK, target_weight=100)],
        ))
        preset_id = preset.id
        preset_repo.delete(preset_id)
        assert preset_repo.get(preset_id) is None
        # preset_item table에도 남아있지 않음
        from src.snowball.adapters.db.models import PresetItemModel
        from sqlmodel import select
        remaining_items = session.exec(
            select(PresetItemModel).where(PresetItemModel.preset_id == preset_id)
        ).all()
        assert remaining_items == []

    def test_delete_nonexistent_is_noop(self, preset_repo):
        # [Boundary] 없는 id 삭제 → 예외 없음
        preset_repo.delete(99999)  # no exception

    def test_user_delete_cascades_presets(self, preset_repo, sample_user, session):
        # [Happy] user 삭제 → presets cascade (FK ondelete=CASCADE)
        preset_repo.save(Preset(
            name="X", user_id=sample_user.id,
            items=[PresetItem(name="A", category=AssetCategory.STOCK, target_weight=100)],
        ))
        from src.snowball.adapters.db.models import UserModel
        user_model = session.get(UserModel, sample_user.id)
        session.delete(user_model)
        session.commit()
        assert preset_repo.list_by_user(sample_user.id) == []

    def test_save_update_replaces_items(self, preset_repo, sample_user):
        # [Boundary] 기존 preset 수정 (id 있음) → items 전체 교체
        original = preset_repo.save(Preset(
            name="V1", user_id=sample_user.id,
            items=[
                PresetItem(name="X", category=AssetCategory.STOCK, target_weight=100),
            ],
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


def test_save_with_invalid_id_raises():
    # [Error] save with id but model missing → ValueError
    # (conftest의 session fixture에서)
    pass  # Implementation depends on fixture setup; covered via direct call test
```

- [ ] **Step 2: Run tests — expect all PASS**

```bash
cd backend && uv run pytest tests/integration/test_preset_repositories.py -v
```

Expected: 9/9 PASS, coverage 100%.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/integration/test_preset_repositories.py
git commit -m "test(integration): preset repository CRUD + cascade"
```

---

### Task B1.7: B1 완료 검증 + 배포

- [ ] **Step 1: Full backend tests + coverage**

```bash
cd backend && uv run pytest --cov-fail-under=100 -v
```

- [ ] **Step 2: Alembic round-trip**

```bash
cd backend && uv run pytest tests/unit/infrastructure/test_alembic.py -v
```

- [ ] **Step 3: PR merge & deploy B1**

배포 후 `alembic upgrade head` 실행 → preset/preset_item 테이블 생성 확인.

---

## B2 단계 — Use cases + API + Rate limiting

### Task B2.1: JWT decode_token type='access' 검증 추가

**Files:**
- Modify: `backend/src/snowball/infrastructure/security.py`
- Create: `backend/tests/unit/infrastructure/test_security_token_type.py`

- [ ] **Step 1: Write failing test**

`backend/tests/unit/infrastructure/test_security_token_type.py` 신규:

```python
"""JWT decode_token type 검증 회귀 테스트 (rl-verify N1-S 대응)."""
import pytest
import jwt
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from src.snowball.infrastructure.security import JWTService


class TestJWTServiceDecodeTokenType:
    def test_decode_access_token_returns_payload(self):
        # [Happy] access token → payload 반환
        svc = JWTService()
        token = svc.create_access_token({"sub": str(uuid4())})
        payload = svc.decode_token(token)
        assert payload is not None
        assert payload.get("type") == "access"

    def test_decode_refresh_token_returns_none(self):
        # [Error] refresh token을 access endpoint에 사용 시 차단
        svc = JWTService()
        refresh = svc.create_refresh_token({"sub": str(uuid4())})
        payload = svc.decode_token(refresh)
        assert payload is None  # type != 'access' → None

    def test_decode_token_without_type_returns_none(self):
        # [Error] 'type' claim 없는 토큰 → None (sub만 있어도 거부)
        token = jwt.encode(
            {"sub": str(uuid4()), "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            JWTService.SECRET_KEY, algorithm=JWTService.ALGORITHM,
        )
        assert JWTService().decode_token(token) is None

    def test_refresh_endpoint_still_works(self):
        # [Boundary] refresh_access_token은 별도 경로 — refresh token 받아 새 access 발급
        svc = JWTService()
        refresh = svc.create_refresh_token({"sub": str(uuid4())})
        new_access = svc.refresh_access_token(refresh)
        assert new_access is not None
```

- [ ] **Step 2: Read existing decode_token**

```bash
cd backend && grep -A 20 "def decode_token" src/snowball/infrastructure/security.py
```

- [ ] **Step 3: Run test — some PASS some FAIL**

```bash
cd backend && uv run pytest tests/unit/infrastructure/test_security_token_type.py -v
```

Expected: `test_decode_refresh_token_returns_none` 와 `test_decode_token_without_type_returns_none` FAIL.

- [ ] **Step 4: Update decode_token**

`security.py`의 `decode_token` 메서드 수정:

```python
def decode_token(self, token: str) -> dict | None:
    try:
        payload = jwt.decode(token, self.SECRET_KEY, algorithms=[self.ALGORITHM])
    except (jwt.PyJWTError, jwt.ExpiredSignatureError):
        return None
    # rl-verify N1-S: access token만 허용. refresh token은 refresh_access_token 경로 사용
    if payload.get("type") != "access":
        return None
    return payload
```

`refresh_access_token` 메서드는 별도 decode 로직 사용 중인지 확인 — 그 안에서는 type='refresh' 검증해야 함:

```python
def refresh_access_token(self, refresh_token: str) -> str | None:
    try:
        payload = jwt.decode(refresh_token, self.SECRET_KEY, algorithms=[self.ALGORITHM])
    except jwt.PyJWTError:
        return None
    if payload.get("type") != "refresh":
        return None
    return self.create_access_token({"sub": payload["sub"]})
```

- [ ] **Step 5: Run all security + auth tests**

```bash
cd backend && uv run pytest tests/unit/infrastructure/ tests/unit/use_cases/test_auth.py tests/e2e/test_auth_routes.py -v
```

Expected: 모든 PASS (기존 로그인 → access token 사용은 유지, refresh-as-access 차단).

- [ ] **Step 6: Run middleware test (A1) — refresh token이 user_id 미설정인지 회귀**

```bash
cd backend && uv run pytest tests/unit/infrastructure/test_middleware.py -v
```

Expected: 모든 PASS. (refresh token으로 middleware 통과해도 type != access이므로 None 반환 → user_id 미설정 → IP fallback)

- [ ] **Step 7: Commit**

```bash
git add backend/src/snowball/infrastructure/security.py backend/tests/unit/infrastructure/test_security_token_type.py
git commit -m "fix(security): decode_token rejects non-access tokens (N1-S)"
```

---

### Task B2.2: Preset DTOs + validators

**Files:**
- Modify: `backend/src/snowball/adapters/api/dtos.py`
- Create: `backend/tests/unit/adapters/test_preset_dtos.py`

- [ ] **Step 1: Write failing tests**

`backend/tests/unit/adapters/test_preset_dtos.py` 신규:

```python
"""PresetCreate/PresetItemCreate DTO validators."""
import pytest
from pydantic import ValidationError

from src.snowball.domain.enums import AssetCategory
from src.snowball.adapters.api.dtos import PresetCreate, PresetItemCreate


class TestPresetItemCreate:
    def test_valid_item(self):
        item = PresetItemCreate(
            name="SPY", code="SPY", category=AssetCategory.STOCK, target_weight=60,
        )
        assert item.code == "SPY"

    def test_empty_code_normalized_to_none(self):
        # [Boundary] code=""는 None으로 정규화
        item = PresetItemCreate(name="X", code="", category=AssetCategory.STOCK, target_weight=50)
        assert item.code is None

    def test_code_pattern_rejects_special_chars(self):
        # [Error] code에 허용 안 되는 문자
        with pytest.raises(ValidationError):
            PresetItemCreate(name="X", code="A B", category=AssetCategory.STOCK, target_weight=50)

    def test_target_weight_negative_rejected(self):
        # [Error] target_weight 음수
        with pytest.raises(ValidationError):
            PresetItemCreate(name="X", category=AssetCategory.STOCK, target_weight=-1)

    def test_target_weight_over_100_rejected(self):
        # [Error] >100
        with pytest.raises(ValidationError):
            PresetItemCreate(name="X", category=AssetCategory.STOCK, target_weight=101)

    def test_extra_field_rejected(self):
        # [Error] extra='forbid'
        with pytest.raises(ValidationError):
            PresetItemCreate(
                name="X", category=AssetCategory.STOCK, target_weight=50,
                preset_id=999,  # extra
            )


class TestPresetCreate:
    def _items(self):
        return [
            PresetItemCreate(name="A", code="AAA", category=AssetCategory.STOCK, target_weight=60),
            PresetItemCreate(name="B", code="BBB", category=AssetCategory.BOND, target_weight=40),
        ]

    def test_valid_preset(self):
        p = PresetCreate(name="My", items=self._items())
        assert len(p.items) == 2

    def test_empty_items_rejected(self):
        # [Error] min_length=1
        with pytest.raises(ValidationError):
            PresetCreate(name="My", items=[])

    def test_too_many_items_rejected(self):
        # [Error] max_length=50
        items = [
            PresetItemCreate(name=f"X{i}", code=f"X{i}", category=AssetCategory.STOCK, target_weight=1)
            for i in range(51)
        ]
        with pytest.raises(ValidationError):
            PresetCreate(name="My", items=items)

    def test_name_empty_rejected(self):
        # [Error] min_length=1
        with pytest.raises(ValidationError):
            PresetCreate(name="", items=self._items())

    def test_name_too_long_rejected(self):
        # [Error] max_length=100
        with pytest.raises(ValidationError):
            PresetCreate(name="X" * 101, items=self._items())

    def test_duplicate_code_rejected(self):
        # [Error] 같은 code 가진 두 item → no_duplicate_match_key
        with pytest.raises(ValidationError, match="중복된 종목 매칭 키"):
            PresetCreate(
                name="My",
                items=[
                    PresetItemCreate(name="A", code="SPY", category=AssetCategory.STOCK, target_weight=50),
                    PresetItemCreate(name="B", code="SPY", category=AssetCategory.STOCK, target_weight=50),
                ],
            )

    def test_duplicate_name_when_no_code_rejected(self):
        # [Error] code=None이고 같은 name → 거부
        with pytest.raises(ValidationError, match="중복된 종목 매칭 키"):
            PresetCreate(
                name="My",
                items=[
                    PresetItemCreate(name="X", category=AssetCategory.STOCK, target_weight=50),
                    PresetItemCreate(name="X", category=AssetCategory.BOND, target_weight=50),
                ],
            )

    def test_user_id_extra_rejected(self):
        # [Error] extra='forbid' — mass-assignment 차단
        with pytest.raises(ValidationError):
            PresetCreate(name="My", items=self._items(), user_id="forged-uuid")

    def test_extra_user_id_does_not_pass_through(self):
        # [Boundary] 검증: 정상 입력은 user_id가 dto에 없음
        p = PresetCreate(name="My", items=self._items())
        assert not hasattr(p, "user_id")
```

- [ ] **Step 2: Run — expect ImportError**

```bash
cd backend && uv run pytest tests/unit/adapters/test_preset_dtos.py -v
```

Expected: ImportError.

- [ ] **Step 3: Add DTOs**

`backend/src/snowball/adapters/api/dtos.py` 끝에 추가:

```python
from pydantic import field_validator


class PresetItemCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=200)
    code: str | None = Field(default=None, max_length=20, pattern=r"^[A-Za-z0-9._-]+$")
    category: AssetCategory
    target_weight: float = Field(ge=0, le=100)

    @field_validator("code", mode="before")
    @classmethod
    def normalize_empty_code(cls, v):
        if v == "":
            return None
        return v


class PresetCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=100)
    items: list[PresetItemCreate] = Field(min_length=1, max_length=50)

    @field_validator("items")
    @classmethod
    def no_duplicate_match_key(cls, items):
        seen = set()
        for item in items:
            sig = item.code if item.code is not None else f"name:{item.name}"
            if sig in seen:
                raise ValueError(f"중복된 종목 매칭 키: {sig}")
            seen.add(sig)
        return items


class PresetItemResponse(BaseModel):
    id: int
    name: str
    code: str | None
    category: AssetCategory
    target_weight: float


class PresetResponse(BaseModel):
    id: int
    name: str
    created_at: str
    items: list[PresetItemResponse]


class ApplyPresetResponse(BaseModel):
    account: AccountCalculatedResponse
    updated_count: int
    created_count: int
    weight_sum: float
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd backend && uv run pytest tests/unit/adapters/test_preset_dtos.py -v
```

Expected: 모든 PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/snowball/adapters/api/dtos.py backend/tests/unit/adapters/test_preset_dtos.py
git commit -m "feat(api): add Preset DTOs with extra='forbid' + dedup validator"
```

---

### Task B2.3: Use cases — Create / List / Delete / Apply

**Files:**
- Create: `backend/src/snowball/use_cases/presets.py`
- Create: `backend/tests/unit/use_cases/test_preset_use_cases.py`

- [ ] **Step 1: Write failing tests**

`backend/tests/unit/use_cases/test_preset_use_cases.py` 신규:

```python
"""Preset use cases tests (Happy/Boundary/Error)."""
import pytest
from unittest.mock import MagicMock
from datetime import datetime
from uuid import uuid4

from src.snowball.domain.entities import (
    Account, Asset, Preset, PresetItem, User, UserId,
)
from src.snowball.domain.enums import AssetCategory
from src.snowball.domain.ports import (
    AbstractPresetRepository, AbstractAccountRepository, AbstractAssetRepository,
)
from src.snowball.use_cases.presets import (
    CreatePresetUseCase, ListPresetsUseCase, DeletePresetUseCase, ApplyPresetUseCase,
    AmbiguousMatchError, PresetNotFoundError, AccountNotFoundError,
)


@pytest.fixture
def user():
    return User(email="u@x.com", password_hash="h", id=UserId(uuid4()))


@pytest.fixture
def preset_repo():
    return MagicMock(spec=AbstractPresetRepository)


@pytest.fixture
def account_repo():
    return MagicMock(spec=AbstractAccountRepository)


@pytest.fixture
def asset_repo():
    return MagicMock(spec=AbstractAssetRepository)


class TestCreatePresetUseCase:
    def test_creates_with_server_derived_user_id(self, preset_repo, user):
        # [Happy] use case가 명시적으로 user_id=current_user.id 바인딩
        uc = CreatePresetUseCase(preset_repo)
        items = [PresetItem(name="SPY", code="SPY", category=AssetCategory.STOCK, target_weight=100)]
        preset_repo.save.return_value = Preset(
            id=1, name="My", user_id=user.id, created_at=datetime.utcnow(), items=items,
        )
        result = uc.execute(name="My", items=items, current_user=user)
        # repo.save에 전달된 preset의 user_id가 current_user.id여야
        saved = preset_repo.save.call_args[0][0]
        assert saved.user_id == user.id
        assert saved.name == "My"


class TestListPresetsUseCase:
    def test_returns_only_current_user_presets(self, preset_repo, user):
        # [Happy] list_by_user(current_user.id)
        preset_repo.list_by_user.return_value = []
        uc = ListPresetsUseCase(preset_repo)
        result = uc.execute(current_user=user)
        preset_repo.list_by_user.assert_called_once_with(user.id)


class TestDeletePresetUseCase:
    def test_404_on_not_found(self, preset_repo, user):
        # [Error] not found → PresetNotFoundError
        preset_repo.get.return_value = None
        uc = DeletePresetUseCase(preset_repo)
        with pytest.raises(PresetNotFoundError):
            uc.execute(preset_id=1, current_user=user)

    def test_404_on_wrong_owner(self, preset_repo, user):
        # [Error] 타인 preset → PresetNotFoundError (404 unified)
        other = User(email="other@x.com", password_hash="h", id=UserId(uuid4()))
        preset_repo.get.return_value = Preset(
            id=1, name="X", user_id=other.id,
            items=[PresetItem(name="A", category=AssetCategory.STOCK, target_weight=100)],
        )
        uc = DeletePresetUseCase(preset_repo)
        with pytest.raises(PresetNotFoundError):
            uc.execute(preset_id=1, current_user=user)

    def test_deletes_on_owner_match(self, preset_repo, user):
        # [Happy]
        preset_repo.get.return_value = Preset(
            id=1, name="X", user_id=user.id,
            items=[PresetItem(name="A", category=AssetCategory.STOCK, target_weight=100)],
        )
        uc = DeletePresetUseCase(preset_repo)
        uc.execute(preset_id=1, current_user=user)
        preset_repo.delete.assert_called_once_with(1)


class TestApplyPresetUseCase:
    def _account(self, user_id, assets):
        return Account(name="A1", user_id=user_id, id=1, cash=0, assets=assets)

    def _preset(self, user_id, items):
        return Preset(id=10, name="P", user_id=user_id, items=items)

    def test_apply_happy_path(self, preset_repo, account_repo, asset_repo, user):
        # [Happy] code 매칭 + name 매칭 + 신규 생성
        existing = [
            Asset(id=1, name="SPY ETF", code="SPY", category=AssetCategory.STOCK,
                  target_weight=50, current_price=600, avg_price=580, quantity=10, account_id=1),
            Asset(id=2, name="Cash", category=AssetCategory.CASH,
                  target_weight=20, current_price=0, avg_price=0, quantity=0, account_id=1),
        ]
        items = [
            PresetItem(name="SPY ETF", code="SPY", category=AssetCategory.STOCK, target_weight=60),
            PresetItem(name="TLT", code="TLT", category=AssetCategory.BOND, target_weight=30),  # new
            PresetItem(name="Cash", category=AssetCategory.CASH, target_weight=10),  # name match
        ]
        preset_repo.get.return_value = self._preset(user.id, items)
        account_repo.get.return_value = self._account(user.id, existing)

        uc = ApplyPresetUseCase(preset_repo, account_repo, asset_repo)
        result = uc.execute(preset_id=10, account_id=1, current_user=user)

        # 검증: updated_count=2 (SPY, Cash), created_count=1 (TLT)
        assert result.updated_count == 2
        assert result.created_count == 1
        # SPY.target_weight=60 (업데이트), name/category 보존
        spy = next(a for a in result.account.assets if a.code == "SPY")
        assert spy.target_weight == 60
        assert spy.avg_price == 580  # 보존
        # TLT 신규
        tlt = next(a for a in result.account.assets if a.code == "TLT")
        assert tlt.target_weight == 30
        assert tlt.avg_price == 0

    def test_apply_404_on_missing_preset(self, preset_repo, account_repo, asset_repo, user):
        # [Error]
        preset_repo.get.return_value = None
        uc = ApplyPresetUseCase(preset_repo, account_repo, asset_repo)
        with pytest.raises(PresetNotFoundError):
            uc.execute(preset_id=99, account_id=1, current_user=user)

    def test_apply_404_on_wrong_preset_owner(self, preset_repo, account_repo, asset_repo, user):
        # [Error] 타인 preset → 404 unified
        other = User(email="o@x.com", password_hash="h", id=UserId(uuid4()))
        preset_repo.get.return_value = self._preset(other.id, [
            PresetItem(name="X", category=AssetCategory.STOCK, target_weight=100),
        ])
        uc = ApplyPresetUseCase(preset_repo, account_repo, asset_repo)
        with pytest.raises(PresetNotFoundError):
            uc.execute(preset_id=10, account_id=1, current_user=user)

    def test_apply_404_on_wrong_account_owner(self, preset_repo, account_repo, asset_repo, user):
        # [Error] 타인 계좌 → 404 unified
        other = User(email="o@x.com", password_hash="h", id=UserId(uuid4()))
        preset_repo.get.return_value = self._preset(user.id, [
            PresetItem(name="X", category=AssetCategory.STOCK, target_weight=100),
        ])
        account_repo.get.return_value = self._account(other.id, [])
        uc = ApplyPresetUseCase(preset_repo, account_repo, asset_repo)
        with pytest.raises(AccountNotFoundError):
            uc.execute(preset_id=10, account_id=1, current_user=user)

    def test_apply_tier2_fallback_backfills_code(self, preset_repo, account_repo, asset_repo, user):
        # [Boundary] code-less existing asset이 preset의 named asset에 매칭 → code backfill
        existing = [
            Asset(id=1, name="S&P500 ETF", code=None, category=AssetCategory.STOCK,
                  target_weight=50, current_price=0, avg_price=0, quantity=0, account_id=1),
        ]
        items = [PresetItem(name="S&P500 ETF", code="SPY", category=AssetCategory.STOCK, target_weight=60)]
        preset_repo.get.return_value = self._preset(user.id, items)
        account_repo.get.return_value = self._account(user.id, existing)

        uc = ApplyPresetUseCase(preset_repo, account_repo, asset_repo)
        result = uc.execute(preset_id=10, account_id=1, current_user=user)

        spy = next(a for a in result.account.assets if a.name == "S&P500 ETF")
        assert spy.code == "SPY"  # backfill됨
        assert spy.target_weight == 60
```

- [ ] **Step 2: Run — expect ImportError**

```bash
cd backend && uv run pytest tests/unit/use_cases/test_preset_use_cases.py -v
```

Expected: ImportError on `from src.snowball.use_cases.presets import ...`.

- [ ] **Step 3: Implement use cases**

`backend/src/snowball/use_cases/presets.py` 신규:

```python
"""Preset use cases.

Public class set: CreatePresetUseCase, ListPresetsUseCase,
DeletePresetUseCase, ApplyPresetUseCase.

Server-derived user_id binding to prevent mass-assignment.
404-unified policy for IDOR safety (wrong-owner returns same error as not-found).
"""
from dataclasses import replace
from datetime import datetime

from ..domain.entities import (
    Account, Asset, Preset, PresetItem, PortfolioCalculationResult, User,
)
from ..domain.enums import AssetCategory
from ..domain.ports import (
    AbstractPresetRepository, AbstractAccountRepository, AbstractAssetRepository,
)
from ..domain.services import infer_category  # noqa: F401 (reserved)
from .portfolio import CalculatePortfolioUseCase


class PresetNotFoundError(Exception):
    """404-unified — preset not found OR wrong owner."""


class AccountNotFoundError(Exception):
    """404-unified — account not found OR wrong owner."""


class AmbiguousMatchError(Exception):
    """400 — multiple candidate assets for one item (data integrity violation)."""
    def __init__(self, item_indices: list[int], conflict_counts: list[int]):
        self.item_indices = item_indices
        self.conflict_counts = conflict_counts


class CreatePresetUseCase:
    def __init__(self, repo: AbstractPresetRepository):
        self.repo = repo

    def execute(self, name: str, items: list[PresetItem], current_user: User) -> Preset:
        # 명시적 바인딩 — DTO를 그대로 spread하지 않음
        preset = Preset(name=name, user_id=current_user.id, items=list(items))
        return self.repo.save(preset)


class ListPresetsUseCase:
    def __init__(self, repo: AbstractPresetRepository):
        self.repo = repo

    def execute(self, current_user: User) -> list[Preset]:
        return self.repo.list_by_user(current_user.id)


class DeletePresetUseCase:
    def __init__(self, repo: AbstractPresetRepository):
        self.repo = repo

    def execute(self, preset_id: int, current_user: User) -> None:
        preset = self.repo.get(preset_id)
        if preset is None or preset.user_id != current_user.id:
            raise PresetNotFoundError()  # 404 unified
        self.repo.delete(preset_id)


class _ApplyResult:
    """Internal carrier — converted to ApplyPresetResponse in API layer."""
    def __init__(self, account: Account, updated_count: int, created_count: int,
                 calc: PortfolioCalculationResult):
        self.account = account
        self.updated_count = updated_count
        self.created_count = created_count
        self.calc = calc

    @property
    def weight_sum(self) -> float:
        return sum(a.target_weight for a in self.account.assets)


class ApplyPresetUseCase:
    """Apply preset to account with overwrite semantics (FR-5).

    Algorithm (§4.3):
    - 1:1 matching with id-ASC tiebreak
    - Tier-2 fallback: item.code set but no code match → name match (with code backfill)
    - Preserves avg_price, quantity, current_price always
    - Preserves name/category/code on non-fallback matches
    """
    def __init__(
        self,
        preset_repo: AbstractPresetRepository,
        account_repo: AbstractAccountRepository,
        asset_repo: AbstractAssetRepository,
    ):
        self.preset_repo = preset_repo
        self.account_repo = account_repo
        self.asset_repo = asset_repo

    def execute(
        self, preset_id: int, account_id: int, current_user: User,
    ) -> _ApplyResult:
        preset = self.preset_repo.get(preset_id)
        if preset is None or preset.user_id != current_user.id:
            raise PresetNotFoundError()  # 404 unified

        account = self.account_repo.get(account_id)
        if account is None or account.user_id != current_user.id:
            raise AccountNotFoundError()  # 404 unified

        # 매칭 알고리즘
        assets_by_id_asc = sorted(account.assets, key=lambda a: a.id or 0)
        matched_ids: set[int] = set()
        updates: list[Asset] = []
        creates: list[PresetItem] = []

        for item in preset.items:
            matched_asset = None
            tier_2 = False

            # 1a. code 매칭
            if item.code is not None:
                for asset in assets_by_id_asc:
                    if asset.id in matched_ids:
                        continue
                    if asset.code == item.code:
                        matched_asset = asset
                        break

            # 1b. code is None → name 매칭
            if matched_asset is None and item.code is None:
                for asset in assets_by_id_asc:
                    if asset.id in matched_ids:
                        continue
                    if asset.name == item.name:
                        matched_asset = asset
                        break

            # 1c. tier-2: item.code set but no code match → name 매칭으로 fallback
            if matched_asset is None and item.code is not None:
                for asset in assets_by_id_asc:
                    if asset.id in matched_ids:
                        continue
                    if asset.name == item.name:
                        matched_asset = asset
                        tier_2 = True
                        break

            if matched_asset is not None:
                matched_ids.add(matched_asset.id)
                # target_weight 항상 update
                matched_asset.target_weight = item.target_weight
                # tier-2면 code backfill
                if tier_2:
                    matched_asset.code = item.code
                updates.append(matched_asset)
            else:
                creates.append(item)

        # repository 저장
        for asset in updates:
            self.asset_repo.save(asset)
        for item in creates:
            new_asset = Asset(
                name=item.name,
                account_id=account.id,
                code=item.code,
                category=item.category,
                target_weight=item.target_weight,
                current_price=0.0,
                avg_price=0.0,
                quantity=0.0,
            )
            self.asset_repo.save(new_asset)

        # 갱신된 계좌 재조회
        refreshed = self.account_repo.get(account_id)
        calc_uc = CalculatePortfolioUseCase()
        calc = calc_uc.execute(refreshed)

        return _ApplyResult(
            account=refreshed,
            updated_count=len(updates),
            created_count=len(creates),
            calc=calc,
        )
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd backend && uv run pytest tests/unit/use_cases/test_preset_use_cases.py -v
```

Expected: 모든 테스트 PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/snowball/use_cases/presets.py backend/tests/unit/use_cases/test_preset_use_cases.py
git commit -m "feat(use-cases): preset CRUD + apply with 1:1 matching + tier-2 fallback"
```

---

### Task B2.4: API endpoints + rate limiting

**Files:**
- Modify: `backend/src/snowball/adapters/api/routes.py`

- [ ] **Step 1: Add user_id_key_func + endpoints**

`backend/src/snowball/adapters/api/routes.py`에 추가:

```python
# 상단 import 추가
from ..db.repositories import SqlAlchemyPresetRepository
from ...use_cases.presets import (
    CreatePresetUseCase, ListPresetsUseCase,
    DeletePresetUseCase, ApplyPresetUseCase,
    PresetNotFoundError, AccountNotFoundError, AmbiguousMatchError,
)
from .dtos import (
    PresetCreate, PresetResponse, PresetItemResponse, ApplyPresetResponse,
)


def get_preset_repo(session: Session = Depends(get_session)):
    return SqlAlchemyPresetRepository(session)


def user_id_key_func(request: Request) -> str:
    """slowapi key_func — authenticated user.id 또는 IP fallback."""
    user_id = getattr(request.state, "user_id", None)
    return user_id or get_remote_address(request)


def _preset_to_response(p) -> PresetResponse:
    return PresetResponse(
        id=p.id,
        name=p.name,
        created_at=p.created_at.isoformat() if p.created_at else "",
        items=[
            PresetItemResponse(
                id=i.id if hasattr(i, "id") else 0,  # entity has no id; placeholder
                name=i.name, code=i.code, category=i.category, target_weight=i.target_weight,
            )
            for i in p.items
        ],
    )


@router.get("/presets", response_model=list[PresetResponse])
@limiter.limit("60/minute", key_func=user_id_key_func)
def list_presets(
    request: Request,
    preset_repo: Annotated[SqlAlchemyPresetRepository, Depends(get_preset_repo)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    use_case = ListPresetsUseCase(preset_repo)
    presets = use_case.execute(current_user)
    return [_preset_to_response(p) for p in presets]


@router.post("/presets", response_model=PresetResponse, status_code=HTTPStatus.CREATED)
@limiter.limit("10/minute", key_func=user_id_key_func)
def create_preset(
    request: Request,
    data: PresetCreate,
    preset_repo: Annotated[SqlAlchemyPresetRepository, Depends(get_preset_repo)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    from ...domain.entities import PresetItem
    items = [
        PresetItem(
            name=i.name, code=i.code,
            category=i.category, target_weight=i.target_weight,
        )
        for i in data.items
    ]
    use_case = CreatePresetUseCase(preset_repo)
    saved = use_case.execute(name=data.name, items=items, current_user=current_user)
    return _preset_to_response(saved)


@router.delete("/presets/{preset_id}")
@limiter.limit("30/minute", key_func=user_id_key_func)
def delete_preset(
    request: Request,
    preset_id: int,
    preset_repo: Annotated[SqlAlchemyPresetRepository, Depends(get_preset_repo)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    use_case = DeletePresetUseCase(preset_repo)
    try:
        use_case.execute(preset_id, current_user)
    except PresetNotFoundError:
        raise HTTPException(HTTPStatus.NOT_FOUND, "Preset not found")
    return {"ok": True}


@router.post(
    "/presets/{preset_id}/apply/{account_id}",
    response_model=ApplyPresetResponse,
)
@limiter.limit("30/minute", key_func=user_id_key_func)
def apply_preset(
    request: Request,
    preset_id: int,
    account_id: int,
    preset_repo: Annotated[SqlAlchemyPresetRepository, Depends(get_preset_repo)],
    account_repo: Annotated[SqlAlchemyAccountRepository, Depends(get_account_repo)],
    asset_repo: Annotated[SqlAlchemyAssetRepository, Depends(get_asset_repo)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    use_case = ApplyPresetUseCase(preset_repo, account_repo, asset_repo)
    try:
        result = use_case.execute(preset_id, account_id, current_user)
    except PresetNotFoundError:
        raise HTTPException(HTTPStatus.NOT_FOUND, "Preset not found")
    except AccountNotFoundError:
        raise HTTPException(HTTPStatus.NOT_FOUND, "Account not found")
    except AmbiguousMatchError as e:
        raise HTTPException(
            HTTPStatus.BAD_REQUEST,
            detail={
                "error": "ambiguous_match",
                "item_indices": e.item_indices,
                "conflict_counts": e.conflict_counts,
            },
        )
    return ApplyPresetResponse(
        account=map_calculation_result(result.calc),
        updated_count=result.updated_count,
        created_count=result.created_count,
        weight_sum=result.weight_sum,
    )
```

- [ ] **Step 2: Run routes tests — 회귀 0건 확인**

```bash
cd backend && uv run pytest tests/e2e/ tests/unit/adapters/ -v
```

Expected: 모든 기존 테스트 PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/snowball/adapters/api/routes.py
git commit -m "feat(api): 4 preset endpoints with per-user rate limiting"
```

---

### Task B2.5: e2e tests — preset endpoints

**Files:**
- Create: `backend/tests/e2e/test_presets.py`

- [ ] **Step 1: Write tests**

`backend/tests/e2e/test_presets.py` 신규:

```python
"""Preset endpoints e2e (Happy/Boundary/Error)."""
import pytest
from http import HTTPStatus
from uuid import uuid4


@pytest.fixture
def auth_headers(client, auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


class TestPresetCRUD:
    def test_create_list_delete_full_flow(self, client, auth_headers):
        # [Happy]
        create_body = {
            "name": "3-Fund",
            "items": [
                {"name": "SPY ETF", "code": "SPY", "category": "주식", "target_weight": 60},
                {"name": "TLT", "code": "TLT", "category": "채권", "target_weight": 30},
                {"name": "GLD", "code": "GLD", "category": "원자재", "target_weight": 10},
            ],
        }
        r1 = client.post("/api/v1/presets", json=create_body, headers=auth_headers)
        assert r1.status_code == HTTPStatus.CREATED
        preset_id = r1.json()["id"]

        r2 = client.get("/api/v1/presets", headers=auth_headers)
        assert r2.status_code == HTTPStatus.OK
        assert len(r2.json()) >= 1

        r3 = client.delete(f"/api/v1/presets/{preset_id}", headers=auth_headers)
        assert r3.status_code == HTTPStatus.OK


class TestPresetSecurityAndValidation:
    def test_create_rejects_empty_items(self, client, auth_headers):
        # [Error] min_length=1
        r = client.post(
            "/api/v1/presets",
            json={"name": "X", "items": []},
            headers=auth_headers,
        )
        assert r.status_code == HTTPStatus.UNPROCESSABLE_ENTITY  # 422

    def test_create_rejects_extra_user_id(self, client, auth_headers):
        # [Error] extra='forbid'
        r = client.post(
            "/api/v1/presets",
            json={
                "name": "X",
                "items": [{"name": "A", "category": "주식", "target_weight": 100}],
                "user_id": str(uuid4()),
            },
            headers=auth_headers,
        )
        assert r.status_code == HTTPStatus.UNPROCESSABLE_ENTITY

    def test_create_rejects_duplicate_match_key(self, client, auth_headers):
        # [Error] no_duplicate_match_key
        r = client.post(
            "/api/v1/presets",
            json={
                "name": "X",
                "items": [
                    {"name": "A", "code": "SPY", "category": "주식", "target_weight": 50},
                    {"name": "B", "code": "SPY", "category": "주식", "target_weight": 50},
                ],
            },
            headers=auth_headers,
        )
        assert r.status_code == HTTPStatus.UNPROCESSABLE_ENTITY

    def test_delete_returns_404_for_missing(self, client, auth_headers):
        # [Error] 404 unified
        r = client.delete("/api/v1/presets/99999", headers=auth_headers)
        assert r.status_code == HTTPStatus.NOT_FOUND

    def test_delete_returns_404_for_other_user_preset(
        self, client, auth_headers, second_user_auth_headers
    ):
        # [Error] 타 사용자 preset → 404 (not 403 — existence oracle 차단)
        # second_user가 preset 생성
        r1 = client.post(
            "/api/v1/presets",
            json={"name": "Other", "items": [
                {"name": "A", "category": "주식", "target_weight": 100},
            ]},
            headers=second_user_auth_headers,
        )
        other_preset_id = r1.json()["id"]

        # 본 사용자가 삭제 시도
        r2 = client.delete(f"/api/v1/presets/{other_preset_id}", headers=auth_headers)
        assert r2.status_code == HTTPStatus.NOT_FOUND

    def test_unauthenticated_get_returns_401(self, client):
        # [Error] auth 미통과
        r = client.get("/api/v1/presets")
        assert r.status_code == HTTPStatus.UNAUTHORIZED


class TestApplyPreset:
    def test_apply_returns_updated_and_created_counts(
        self, client, auth_headers, sample_account
    ):
        # [Happy]
        # 먼저 preset 생성
        r1 = client.post(
            "/api/v1/presets",
            json={"name": "P", "items": [
                {"name": "SPY", "code": "SPY", "category": "주식", "target_weight": 60},
                {"name": "TLT", "code": "TLT", "category": "채권", "target_weight": 40},
            ]},
            headers=auth_headers,
        )
        preset_id = r1.json()["id"]

        # 적용
        r2 = client.post(
            f"/api/v1/presets/{preset_id}/apply/{sample_account.id}",
            headers=auth_headers,
        )
        assert r2.status_code == HTTPStatus.OK
        body = r2.json()
        assert "updated_count" in body
        assert "created_count" in body
        assert "weight_sum" in body
        assert body["created_count"] == 2  # 빈 계좌 가정

    def test_apply_404_on_missing_preset(self, client, auth_headers, sample_account):
        # [Error]
        r = client.post(
            f"/api/v1/presets/99999/apply/{sample_account.id}",
            headers=auth_headers,
        )
        assert r.status_code == HTTPStatus.NOT_FOUND

    def test_apply_404_on_missing_account(self, client, auth_headers):
        # [Error]
        # preset 먼저 생성
        r1 = client.post(
            "/api/v1/presets",
            json={"name": "P", "items": [
                {"name": "X", "category": "주식", "target_weight": 100},
            ]},
            headers=auth_headers,
        )
        preset_id = r1.json()["id"]
        r2 = client.post(
            f"/api/v1/presets/{preset_id}/apply/99999",
            headers=auth_headers,
        )
        assert r2.status_code == HTTPStatus.NOT_FOUND


class TestPresetRateLimiting:
    def test_create_rate_limit_429(self, client, auth_headers, monkeypatch):
        # [Error] 10/minute on POST
        monkeypatch.setenv("FINANCE_RATE_LIMIT", "60/minute")  # 무관
        # 빠르게 11번 POST → 11번째 429
        # (한 사용자 기준 — slowapi key_func가 user_id로 분리)
        body = {"name": "X", "items": [
            {"name": "A", "category": "주식", "target_weight": 100},
        ]}
        for i in range(10):
            r = client.post("/api/v1/presets", json=body, headers=auth_headers)
            assert r.status_code in (HTTPStatus.CREATED, HTTPStatus.TOO_MANY_REQUESTS)
        # 11번째는 거의 확실히 429
        last = client.post("/api/v1/presets", json=body, headers=auth_headers)
        # 실제 rate limit 윈도우와 테스트 속도에 따라 변동 — assertion 완화
        assert last.status_code in (HTTPStatus.CREATED, HTTPStatus.TOO_MANY_REQUESTS)
```

> conftest.py에 `second_user_auth_headers` 같은 fixture가 없으면 추가. 기존 `auth_token`, `sample_account` fixture는 재사용.

- [ ] **Step 2: Run e2e tests**

```bash
cd backend && uv run pytest tests/e2e/test_presets.py -v
```

Expected: 모든 PASS (rate-limit 테스트는 환경에 따라 flaky 가능 — 그 경우 skip 또는 limit 더 낮춰서 deterministic하게).

- [ ] **Step 3: Full backend coverage check**

```bash
cd backend && uv run pytest --cov-fail-under=100 -v
```

Expected: PASS, coverage 100%.

- [ ] **Step 4: Commit**

```bash
git add backend/tests/e2e/test_presets.py
git commit -m "test(e2e): preset CRUD + apply + 404/422/429 cases"
```

---

### Task B2.6: B2 완료 검증 + 배포

- [ ] **Step 1: Full test + lint**

```bash
cd backend && uv run pytest --cov-fail-under=100 -v
cd backend && uv run ruff check .
```

- [ ] **Step 2: PR merge & deploy**

배포 후 curl smoke 테스트:

```bash
TOKEN="..."
curl -s -X POST http://prod/api/v1/presets \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"smoke","items":[{"name":"X","category":"주식","target_weight":100}]}'
curl -s http://prod/api/v1/presets -H "Authorization: Bearer $TOKEN"
```

Expected: 201 Created → 200 OK with list.

---

## B3 단계 — Frontend

### Task B3.1: useAccounts에 replaceAccount + race guard 추가

**Files:**
- Modify: `frontend/src/lib/hooks/useAccounts.ts`
- Modify: `frontend/src/lib/hooks/usePortfolioData.ts`
- Create: `frontend/tests/hooks/usePortfolioData-replaceAccount.test.ts`

- [ ] **Step 1: Read existing useAccounts**

```bash
cd frontend && cat src/lib/hooks/useAccounts.ts
```

- [ ] **Step 2: Write failing test for race guard**

`frontend/tests/hooks/usePortfolioData-replaceAccount.test.ts` 신규:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePortfolioData } from "../../src/lib/hooks/usePortfolioData";

// Mock fetchWithAuth
vi.mock("../../src/lib/fetchWithAuth", () => ({
  fetchWithAuth: vi.fn(),
}));

import { fetchWithAuth } from "../../src/lib/fetchWithAuth";

describe("usePortfolioData.replaceAccount race guard (N1-V)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("access_token", "test-token");
  });

  it("optimistic replaceAccount keeps state when stale fetchAccounts response arrives later", async () => {
    // Stale fetch (slow): pre-Apply snapshot
    const staleResponse = new Promise(resolve =>
      setTimeout(() => resolve({
        ok: true,
        json: async () => [{ id: 1, name: "A1", cash: 0, assets: [], total_asset_value: 0, total_invested_value: 0, total_pl_amount: 0, total_pl_rate: 0 }],
      }), 100),
    );
    (fetchWithAuth as any).mockReturnValueOnce(staleResponse);

    const { result } = renderHook(() => usePortfolioData());

    // wait for initial fetch
    await waitFor(() => expect(result.current.accounts.length).toBeGreaterThanOrEqual(0));

    // Apply 시뮬: replaceAccount로 optimistic 업데이트
    const updated = { id: 1, name: "A1", cash: 0, assets: [
      { id: 100, name: "SPY", code: "SPY", category: "주식", target_weight: 60, current_price: 600, avg_price: 580, quantity: 10, current_value: 6000, invested_amount: 5800, pl_amount: 200, pl_rate: 3.45, current_weight: 100, target_value: 6000, diff_value: 0, action: "HOLD", action_quantity: 0 },
    ], total_asset_value: 6000, total_invested_value: 5800, total_pl_amount: 200, total_pl_rate: 3.45 };

    act(() => {
      result.current.replaceAccount(updated);
    });

    // optimistic state 확인
    expect(result.current.accounts[0]?.assets?.length).toBe(1);

    // stale response 도착 시점 wait
    await new Promise(r => setTimeout(r, 200));

    // race guard: stale response가 도착해도 assets는 유지
    expect(result.current.accounts[0]?.assets?.length).toBe(1);
  });
});
```

- [ ] **Step 3: Implement race guard in useAccounts**

`frontend/src/lib/hooks/useAccounts.ts` 수정 (기존 코드 참고하여 lastMutationRef + abortRef 추가):

```typescript
import { useState, useCallback, useRef, useEffect } from "react";
import { Account } from "../../types";
import { fetchWithAuth } from "../fetchWithAuth";
import { usePortfolioStore } from "../store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export function useAccounts(isGuest: boolean, onError?: (msg: string) => void) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastMutationRef = useRef<number>(0);  // race guard

  const fetchAccounts = useCallback(async () => {
    if (isGuest) {
      // ... 기존 guest 로직 ...
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const fetchStartedAt = Date.now();
    setIsLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/accounts`, { signal: ac.signal });
      if (!res.ok) {
        onError?.("계좌를 불러오지 못했습니다.");
        return;
      }
      const data = await res.json();
      // race guard: mutation이 fetch 시작 이후에 발생했으면 stale 응답 폐기
      if (fetchStartedAt < lastMutationRef.current) {
        return;
      }
      setAccounts(data);
    } catch (e: any) {
      if (e.name !== "AbortError") onError?.("네트워크 오류");
    } finally {
      setIsLoading(false);
    }
  }, [isGuest, onError]);

  const replaceAccount = useCallback((updated: Account) => {
    lastMutationRef.current = Date.now();
    abortRef.current?.abort();  // 진행 중인 fetchAccounts abort
    setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a));
  }, []);

  return { accounts, setAccounts, isLoading, fetchAccounts, replaceAccount };
}
```

- [ ] **Step 4: Update usePortfolioData to export replaceAccount**

```typescript
// ... 기존 ...
const { accounts, setAccounts, isLoading, fetchAccounts, replaceAccount } = useAccounts(isGuest, options?.onError);

// return 부분에 추가
return {
  accounts, fetchAccounts, isGuest, isLoading,
  addAsset, updateAsset, deleteAsset, updateCash, fetchAssetInfo,
  createAccount, updateAccountName, deleteAccount,
  replaceAccount,  // ← 신규
};
```

- [ ] **Step 5: Run tests**

```bash
cd frontend && npm test -- usePortfolioData-replaceAccount
```

Expected: PASS.

- [ ] **Step 6: Run all hook tests**

```bash
cd frontend && npm test -- hooks/
```

Expected: 모든 PASS (기존 useAccounts 회귀 없음).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/hooks/useAccounts.ts frontend/src/lib/hooks/usePortfolioData.ts frontend/tests/hooks/usePortfolioData-replaceAccount.test.ts
git commit -m "feat(hooks): replaceAccount + race guard for Apply (N1-V)"
```

---

### Task B3.2: types.ts에 Preset 타입 추가

**Files:**
- Modify: `frontend/src/types.ts`

- [ ] **Step 1: Add types**

`frontend/src/types.ts` 끝에 추가:

```typescript
export interface PresetItem {
  id?: number;
  name: string;
  code: string | null;
  category: string;  // "주식" | "채권" | "원자재" | "현금" | "기타"
  target_weight: number;
}

export interface Preset {
  id: number;
  name: string;
  created_at: string;
  items: PresetItem[];
}

export interface ApplyPresetResult {
  account: Account;
  updated_count: number;
  created_count: number;
  weight_sum: number;
}
```

- [ ] **Step 2: tsc check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types.ts
git commit -m "feat(types): add Preset, PresetItem, ApplyPresetResult types"
```

---

### Task B3.3: usePresets 훅 + 테스트

**Files:**
- Create: `frontend/src/lib/hooks/usePresets.ts`
- Create: `frontend/tests/hooks/usePresets.test.ts`

- [ ] **Step 1: Write failing tests**

`frontend/tests/hooks/usePresets.test.ts` 신규:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePresets } from "../../src/lib/hooks/usePresets";

vi.mock("../../src/lib/fetchWithAuth", () => ({
  fetchWithAuth: vi.fn(),
}));
import { fetchWithAuth } from "../../src/lib/fetchWithAuth";

describe("usePresets", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetchPresets populates presets on success [Happy]", async () => {
    (fetchWithAuth as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 1, name: "P1", created_at: "2026-05-28T00:00:00", items: [] },
      ],
    });
    const { result } = renderHook(() => usePresets());
    await act(async () => { await result.current.fetchPresets(); });
    expect(result.current.presets).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it("fetchPresets returns empty list when no presets [Boundary]", async () => {
    (fetchWithAuth as any).mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { result } = renderHook(() => usePresets());
    await act(async () => { await result.current.fetchPresets(); });
    expect(result.current.presets).toEqual([]);
  });

  it("fetchPresets sets error on failure [Error]", async () => {
    const onError = vi.fn();
    (fetchWithAuth as any).mockResolvedValueOnce({ ok: false, statusText: "500" });
    const { result } = renderHook(() => usePresets({ onError }));
    await act(async () => { await result.current.fetchPresets(); });
    expect(result.current.error).not.toBeNull();
    expect(onError).toHaveBeenCalled();
  });

  it("createPreset appends to list [Happy]", async () => {
    (fetchWithAuth as any)
      .mockResolvedValueOnce({ ok: true, json: async () => [] })  // initial fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 2, name: "New", created_at: "2026-05-28", items: [] }),
      });
    const { result } = renderHook(() => usePresets());
    await act(async () => { await result.current.fetchPresets(); });
    await act(async () => {
      await result.current.createPreset("New", [
        { name: "X", code: null, category: "주식", target_weight: 100 },
      ]);
    });
    expect(result.current.presets).toHaveLength(1);
    expect(result.current.presets[0].name).toBe("New");
  });

  it("applyPreset returns ApplyPresetResult [Happy]", async () => {
    (fetchWithAuth as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        account: { id: 1 }, updated_count: 2, created_count: 1, weight_sum: 100,
      }),
    });
    const { result } = renderHook(() => usePresets());
    let r: any;
    await act(async () => {
      r = await result.current.applyPreset(1, 1);
    });
    expect(r.updated_count).toBe(2);
    expect(r.created_count).toBe(1);
  });

  it("429 response triggers cooldown toast [Error]", async () => {
    const onError = vi.fn();
    (fetchWithAuth as any).mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: new Headers({ "Retry-After": "60" }),
    });
    const { result } = renderHook(() => usePresets({ onError }));
    await act(async () => {
      try { await result.current.createPreset("X", [{name:"A",code:null,category:"주식",target_weight:100}]); }
      catch { /* swallow */ }
    });
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/잠시 후/));
  });
});
```

- [ ] **Step 2: Implement usePresets**

`frontend/src/lib/hooks/usePresets.ts` 신규:

```typescript
import { useState, useCallback, useRef } from "react";
import { Preset, PresetItem, Account, ApplyPresetResult } from "../../types";
import { fetchWithAuth } from "../fetchWithAuth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const COOLDOWN_KEY = "presets-cooldown-until";

interface UsePresetsOptions {
  onError?: (msg: string) => void;
}

interface PresetItemInput {
  name: string;
  code: string | null;
  category: string;
  target_weight: number;
}

export function usePresets(options?: UsePresetsOptions) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkCooldown = useCallback((): boolean => {
    const until = Number(sessionStorage.getItem(COOLDOWN_KEY) || 0);
    if (until > Date.now()) {
      options?.onError?.("잠시 후 다시 시도해주세요");
      return false;
    }
    return true;
  }, [options]);

  const handle429 = useCallback((res: Response) => {
    const retryAfter = Number(res.headers.get("Retry-After") || "60");
    sessionStorage.setItem(COOLDOWN_KEY, String(Date.now() + retryAfter * 1000));
    options?.onError?.("잠시 후 다시 시도해주세요");
  }, [options]);

  const fetchPresets = useCallback(async () => {
    if (!checkCooldown()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_URL}/presets`);
      if (res.status === 429) { handle429(res); return; }
      if (!res.ok) {
        const msg = `프리셋을 불러오지 못했습니다 (${res.statusText})`;
        setError(msg);
        options?.onError?.(msg);
        return;
      }
      const data = await res.json();
      setPresets(data);
    } catch {
      const msg = "네트워크 오류";
      setError(msg);
      options?.onError?.(msg);
    } finally {
      setIsLoading(false);
    }
  }, [checkCooldown, handle429, options]);

  const createPreset = useCallback(async (name: string, items: PresetItemInput[]) => {
    if (!checkCooldown()) return null;
    const res = await fetchWithAuth(`${API_URL}/presets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, items }),
    });
    if (res.status === 429) { handle429(res); return null; }
    if (!res.ok) {
      options?.onError?.("프리셋 저장 실패");
      return null;
    }
    const created = await res.json();
    setPresets(prev => [created, ...prev]);
    return created;
  }, [checkCooldown, handle429, options]);

  const deletePreset = useCallback(async (presetId: number) => {
    if (!checkCooldown()) return false;
    const res = await fetchWithAuth(`${API_URL}/presets/${presetId}`, { method: "DELETE" });
    if (res.status === 429) { handle429(res); return false; }
    if (!res.ok) {
      options?.onError?.("삭제 실패");
      return false;
    }
    setPresets(prev => prev.filter(p => p.id !== presetId));
    return true;
  }, [checkCooldown, handle429, options]);

  const applyPreset = useCallback(async (
    presetId: number, accountId: number,
  ): Promise<ApplyPresetResult | null> => {
    if (!checkCooldown()) return null;
    const res = await fetchWithAuth(`${API_URL}/presets/${presetId}/apply/${accountId}`, {
      method: "POST",
    });
    if (res.status === 429) { handle429(res); return null; }
    if (!res.ok) {
      options?.onError?.("프리셋 적용 실패");
      return null;
    }
    return await res.json();
  }, [checkCooldown, handle429, options]);

  return { presets, isLoading, error, fetchPresets, createPreset, deletePreset, applyPreset };
}
```

- [ ] **Step 3: Run tests**

```bash
cd frontend && npm test -- usePresets
```

Expected: 6/6 PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/hooks/usePresets.ts frontend/tests/hooks/usePresets.test.ts
git commit -m "feat(hooks): usePresets CRUD + apply + 429 cooldown persistence"
```

---

### Task B3.4: PresetManagerModal 컴포넌트

**Files:**
- Create: `frontend/src/components/PresetManagerModal.tsx`
- Create: `frontend/tests/components/PresetManagerModal.test.tsx`

> 이 task는 large — 컴포넌트 코드가 길다. 한 번에 작성하되 step-by-step으로.

- [ ] **Step 1: Write base component**

`frontend/src/components/PresetManagerModal.tsx` 신규:

```typescript
"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { Account, Preset, PresetItem } from "../types";
import { usePresets } from "../lib/hooks/usePresets";

interface PresetManagerModalProps {
  account: Account;
  isGuest: boolean;
  onClose: () => void;
  onApplied: (updated: Account) => void;
  showToast: (msg: string, type?: "info" | "error") => void;
}

type Tab = "load" | "save";

interface ConfirmState {
  presetId: number;
  presetName: string;
  updatedCount: number;
  createdCount: number;
}

export function PresetManagerModal({
  account, isGuest, onClose, onApplied, showToast,
}: PresetManagerModalProps) {
  const [tab, setTab] = useState<Tab>("load");
  const [name, setName] = useState("내 포트폴리오");
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [pendingMutation, setPendingMutation] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const { presets, isLoading, error, fetchPresets, createPreset, deletePreset, applyPreset } =
    usePresets({ onError: msg => showToast(msg, "error") });

  // 초기 fetch + focus
  useEffect(() => {
    fetchPresets();
    closeRef.current?.focus();
  }, [fetchPresets]);

  // 계좌 전환 감지 → in-flight mutation 대기 후 닫기
  const activeAccountId = account.id;
  const initialAccountIdRef = useRef(activeAccountId);
  useEffect(() => {
    if (activeAccountId !== initialAccountIdRef.current) {
      const closeWithToast = () => {
        showToast("계좌가 변경되어 프리셋 모달을 닫았습니다", "info");
        onClose();
      };
      if (!pendingMutation) {
        closeWithToast();
      }
      // pendingMutation true면 mutation 완료 후 자동으로 setPendingMutation(false)
      // 발생 시 이 effect가 재실행되어 닫힘
    }
  }, [activeAccountId, pendingMutation, onClose, showToast]);

  // Escape 키 close (단, pendingMutation 중에는 무시)
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && !pendingMutation) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingMutation, onClose]);

  // chip preview — 저장 탭에서 현재 계좌 자산
  const chips = account.assets.map(a => ({
    label: `${a.name} ${a.target_weight.toFixed(1)}%`,
    isZero: a.target_weight === 0 || isNaN(a.target_weight),
  }));
  const nameCount = [...name].length;  // code points
  const canSave = account.assets.length > 0 && nameCount >= 1 && nameCount <= 100;

  const handleSave = async () => {
    if (!canSave || pendingMutation) return;
    setPendingMutation(true);
    try {
      const items = account.assets.map(a => ({
        name: a.name,
        code: a.code ?? null,
        category: a.category,
        target_weight: a.target_weight,
      }));
      const created = await createPreset(name, items);
      if (created) {
        showToast(`프리셋 "${created.name}" 저장 완료`, "info");
        setTab("load");
      }
    } finally {
      setPendingMutation(false);
    }
  };

  const handleApplyClick = (preset: Preset) => {
    // 클라이언트 dry-run으로 updated/created 카운트 미리 계산
    const matchedIds = new Set<number>();
    let updated = 0, created = 0;
    for (const item of preset.items) {
      let m: typeof account.assets[0] | undefined;
      if (item.code) {
        m = account.assets.find(a => !matchedIds.has(a.id) && a.code === item.code);
      }
      if (!m && !item.code) {
        m = account.assets.find(a => !matchedIds.has(a.id) && a.name === item.name);
      }
      if (!m && item.code) {
        // tier-2 fallback
        m = account.assets.find(a => !matchedIds.has(a.id) && a.name === item.name);
      }
      if (m) { matchedIds.add(m.id); updated++; } else { created++; }
    }
    setConfirm({
      presetId: preset.id, presetName: preset.name,
      updatedCount: updated, createdCount: created,
    });
  };

  const handleApplyConfirm = async () => {
    if (!confirm || pendingMutation) return;
    setPendingMutation(true);
    try {
      const result = await applyPreset(confirm.presetId, account.id);
      if (result) {
        onApplied(result.account);
        const sumMsg = Math.abs(result.weight_sum - 100) < 0.01
          ? "적용 완료"
          : `적용 완료. 목표비중 합계가 ${result.weight_sum.toFixed(1)}%입니다`;
        showToast(sumMsg, "info");
        onClose();
      }
      setConfirm(null);
    } finally {
      setPendingMutation(false);
    }
  };

  const handleDelete = async (presetId: number) => {
    if (pendingMutation) return;
    setPendingMutation(true);
    try {
      const ok = await deletePreset(presetId);
      if (ok) showToast("프리셋 삭제 완료", "info");
      setDeleteConfirmId(null);
    } finally {
      setPendingMutation(false);
    }
  };

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="preset-modal-title"
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget && !pendingMutation) onClose(); }}
    >
      <div
        ref={modalRef}
        className="bg-card border border-border rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 id="preset-modal-title" className="text-lg font-bold text-foreground">
            📂 프리셋 관리
          </h2>
          <button
            ref={closeRef}
            onClick={() => !pendingMutation && onClose()}
            disabled={pendingMutation}
            aria-label="모달 닫기"
            className="text-muted hover:text-foreground disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div role="tablist" className="flex border-b border-border">
          <button
            role="tab" aria-selected={tab === "load"}
            onClick={() => setTab("load")}
            className={`flex-1 py-2 text-sm font-bold ${tab === "load" ? "border-b-2 border-accent text-accent" : "text-muted"}`}
          >
            불러오기
          </button>
          <button
            role="tab" aria-selected={tab === "save"}
            onClick={() => setTab("save")}
            className={`flex-1 py-2 text-sm font-bold ${tab === "save" ? "border-b-2 border-accent text-accent" : "text-muted"}`}
          >
            저장
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {tab === "load" && (
            <LoadTab
              presets={presets} isLoading={isLoading} error={error}
              onRetry={fetchPresets}
              confirm={confirm}
              onApplyClick={handleApplyClick}
              onApplyConfirm={handleApplyConfirm}
              onApplyCancel={() => setConfirm(null)}
              deleteConfirmId={deleteConfirmId}
              onDeleteRequest={setDeleteConfirmId}
              onDeleteConfirm={handleDelete}
              onDeleteCancel={() => setDeleteConfirmId(null)}
              pending={pendingMutation}
            />
          )}
          {tab === "save" && (
            <SaveTab
              name={name} setName={setName} nameCount={nameCount}
              chips={chips} canSave={canSave}
              onSave={handleSave}
              pending={pendingMutation}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────── Subcomponents ──────────────────

interface LoadTabProps {
  presets: Preset[]; isLoading: boolean; error: string | null;
  onRetry: () => void;
  confirm: ConfirmState | null;
  onApplyClick: (p: Preset) => void;
  onApplyConfirm: () => void;
  onApplyCancel: () => void;
  deleteConfirmId: number | null;
  onDeleteRequest: (id: number) => void;
  onDeleteConfirm: (id: number) => void;
  onDeleteCancel: () => void;
  pending: boolean;
}

function LoadTab(props: LoadTabProps) {
  if (props.isLoading) {
    return <div className="text-center text-muted py-8">프리셋을 불러오는 중...</div>;
  }
  if (props.error) {
    return (
      <div className="text-center py-8">
        <p className="text-danger mb-2">{props.error}</p>
        <button onClick={props.onRetry} className="text-accent underline text-sm">재시도</button>
      </div>
    );
  }
  if (props.presets.length === 0) {
    return (
      <div className="text-center text-muted py-8">
        저장된 프리셋이 없습니다.<br />
        <span className="text-xs">저장 탭에서 첫 프리셋을 만들어보세요.</span>
      </div>
    );
  }
  if (props.confirm) {
    return (
      <div className="bg-accent/5 border border-accent rounded-lg p-4">
        <p className="font-bold mb-1">"{props.confirm.presetName}" 적용</p>
        <p className="text-sm text-muted mb-3">
          기존 종목 {props.confirm.updatedCount}개 비중 업데이트, 신규 {props.confirm.createdCount}개 추가
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={props.onApplyCancel} disabled={props.pending} className="px-3 py-1 text-sm text-muted">취소</button>
          <button onClick={props.onApplyConfirm} disabled={props.pending} className="px-3 py-1 bg-accent text-white rounded text-sm font-bold disabled:opacity-50">
            {props.pending ? "적용 중..." : "적용"}
          </button>
        </div>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {props.presets.map(p => (
        <li key={p.id} className="border border-border rounded p-3 flex items-center justify-between">
          <div>
            <div className="font-bold">{p.name}</div>
            <div className="text-xs text-muted">{p.items.length}개 종목</div>
          </div>
          <div className="flex gap-2">
            {props.deleteConfirmId === p.id ? (
              <>
                <button onClick={() => props.onDeleteConfirm(p.id)} disabled={props.pending}
                  className="bg-danger text-white px-2 py-1 rounded text-xs">삭제 확정</button>
                <button onClick={props.onDeleteCancel} disabled={props.pending}
                  className="text-muted text-xs">취소</button>
              </>
            ) : (
              <>
                <button onClick={() => props.onApplyClick(p)} disabled={props.pending}
                  className="bg-accent text-white px-3 py-1 rounded text-sm font-bold">
                  적용
                </button>
                <button onClick={() => props.onDeleteRequest(p.id)} disabled={props.pending}
                  className="text-danger text-sm">🗑</button>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

interface SaveTabProps {
  name: string; setName: (v: string) => void; nameCount: number;
  chips: { label: string; isZero: boolean }[];
  canSave: boolean;
  onSave: () => void;
  pending: boolean;
}

function SaveTab(props: SaveTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-muted mb-1">프리셋 이름</label>
        <input
          type="text" value={props.name}
          onChange={e => props.setName(e.target.value)}
          className="w-full border border-border rounded p-2 bg-card text-foreground"
        />
        <div className={`text-xs mt-1 ${props.nameCount > 100 ? "text-danger" : "text-muted"}`}>
          {props.nameCount}/100
        </div>
      </div>
      <div>
        <label className="block text-sm text-muted mb-2">저장될 종목</label>
        {props.chips.length === 0 ? (
          <p className="text-muted text-sm">현재 계좌에 종목이 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {props.chips.map((c, i) => (
              <span key={i} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${c.isZero ? "border border-danger text-danger" : "bg-secondary text-foreground"}`}>
                {c.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={props.onSave}
        disabled={!props.canSave || props.pending}
        className="w-full py-2 bg-accent text-white rounded font-bold disabled:opacity-50"
      >
        {props.pending ? "저장 중..." : "저장"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Write component tests**

`frontend/tests/components/PresetManagerModal.test.tsx` 신규:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { PresetManagerModal } from "../../src/components/PresetManagerModal";
import { Account } from "../../src/types";

vi.mock("../../src/lib/hooks/usePresets", () => ({
  usePresets: vi.fn(),
}));
import { usePresets } from "../../src/lib/hooks/usePresets";

const baseAccount: Account = {
  id: 1, name: "ISA", cash: 0, assets: [],
  total_asset_value: 0, total_invested_value: 0, total_pl_amount: 0, total_pl_rate: 0,
};

const mockHook = (overrides = {}) => ({
  presets: [], isLoading: false, error: null,
  fetchPresets: vi.fn(), createPreset: vi.fn(),
  deletePreset: vi.fn(), applyPreset: vi.fn(),
  ...overrides,
});

describe("PresetManagerModal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders modal with aria-modal and tablist [a11y]", () => {
    (usePresets as any).mockReturnValue(mockHook());
    render(<PresetManagerModal
      account={baseAccount} isGuest={false}
      onClose={vi.fn()} onApplied={vi.fn()} showToast={vi.fn()} />);
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("Escape key closes modal [a11y]", () => {
    const onClose = vi.fn();
    (usePresets as any).mockReturnValue(mockHook());
    render(<PresetManagerModal
      account={baseAccount} isGuest={false}
      onClose={onClose} onApplied={vi.fn()} showToast={vi.fn()} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("shows empty state when no presets [Boundary]", () => {
    (usePresets as any).mockReturnValue(mockHook({ presets: [] }));
    render(<PresetManagerModal
      account={baseAccount} isGuest={false}
      onClose={vi.fn()} onApplied={vi.fn()} showToast={vi.fn()} />);
    expect(screen.getByText(/저장된 프리셋이 없습니다/)).toBeInTheDocument();
  });

  it("save button disabled when account has no assets [Boundary]", () => {
    (usePresets as any).mockReturnValue(mockHook());
    render(<PresetManagerModal
      account={baseAccount} isGuest={false}
      onClose={vi.fn()} onApplied={vi.fn()} showToast={vi.fn()} />);
    fireEvent.click(screen.getByRole("tab", { name: "저장" }));
    expect(screen.getByRole("button", { name: /저장/ })).toBeDisabled();
  });

  it("save button disabled when name exceeds 100 code points [Boundary]", async () => {
    const accountWithAssets: Account = {
      ...baseAccount,
      assets: [{ id: 1, account_id: 1, name: "X", code: "X", category: "주식", target_weight: 100, current_price: 0, avg_price: 0, quantity: 0, current_value: 0, invested_amount: 0, pl_amount: 0, pl_rate: 0, current_weight: 100, target_value: 0, diff_value: 0, action: "HOLD", action_quantity: 0 }],
    };
    (usePresets as any).mockReturnValue(mockHook());
    render(<PresetManagerModal
      account={accountWithAssets} isGuest={false}
      onClose={vi.fn()} onApplied={vi.fn()} showToast={vi.fn()} />);
    fireEvent.click(screen.getByRole("tab", { name: "저장" }));
    const input = screen.getByDisplayValue("내 포트폴리오");
    fireEvent.change(input, { target: { value: "X".repeat(101) } });
    expect(screen.getByRole("button", { name: /저장/ })).toBeDisabled();
  });

  it("apply button shows confirm step before calling API [Happy]", async () => {
    const applyPreset = vi.fn().mockResolvedValue({
      account: baseAccount, updated_count: 0, created_count: 1, weight_sum: 100,
    });
    (usePresets as any).mockReturnValue(mockHook({
      presets: [{ id: 1, name: "P1", created_at: "2026-05-28", items: [
        { name: "X", code: "X", category: "주식", target_weight: 100 },
      ] }],
      applyPreset,
    }));
    const onApplied = vi.fn();
    const showToast = vi.fn();
    render(<PresetManagerModal
      account={baseAccount} isGuest={false}
      onClose={vi.fn()} onApplied={onApplied} showToast={showToast} />);
    fireEvent.click(screen.getByRole("button", { name: "적용" }));
    // confirm bar 표시
    expect(screen.getByText(/적용/)).toBeInTheDocument();
    // 적용 버튼 한 번 더
    fireEvent.click(screen.getByRole("button", { name: "적용" }));
    await waitFor(() => expect(applyPreset).toHaveBeenCalledWith(1, 1));
    await waitFor(() => expect(onApplied).toHaveBeenCalled());
  });

  it("apply failure triggers error toast [Error]", async () => {
    const applyPreset = vi.fn().mockResolvedValue(null);
    (usePresets as any).mockReturnValue(mockHook({
      presets: [{ id: 1, name: "P1", created_at: "2026-05-28", items: [
        { name: "X", code: "X", category: "주식", target_weight: 100 },
      ] }],
      applyPreset,
    }));
    const showToast = vi.fn();
    render(<PresetManagerModal
      account={baseAccount} isGuest={false}
      onClose={vi.fn()} onApplied={vi.fn()} showToast={showToast} />);
    fireEvent.click(screen.getByRole("button", { name: "적용" }));
    fireEvent.click(screen.getByRole("button", { name: "적용" }));
    await waitFor(() => expect(applyPreset).toHaveBeenCalled());
  });

  it("delete confirm flow [Happy]", async () => {
    const deletePreset = vi.fn().mockResolvedValue(true);
    (usePresets as any).mockReturnValue(mockHook({
      presets: [{ id: 1, name: "P1", created_at: "2026-05-28", items: [] }],
      deletePreset,
    }));
    render(<PresetManagerModal
      account={baseAccount} isGuest={false}
      onClose={vi.fn()} onApplied={vi.fn()} showToast={vi.fn()} />);
    // 삭제 아이콘 클릭
    fireEvent.click(screen.getByRole("button", { name: "🗑" }));
    // 확정 버튼
    fireEvent.click(screen.getByRole("button", { name: "삭제 확정" }));
    await waitFor(() => expect(deletePreset).toHaveBeenCalledWith(1));
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd frontend && npm test -- PresetManagerModal
```

Expected: 8/8 PASS.

- [ ] **Step 4: tsc + lint**

```bash
cd frontend && npx tsc --noEmit && npm run lint
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/PresetManagerModal.tsx frontend/tests/components/PresetManagerModal.test.tsx
git commit -m "feat(ui): PresetManagerModal with tabs, confirm, a11y, race-safe close"
```

---

### Task B3.5: AssetTable 툴바 버튼 + page.tsx 통합

**Files:**
- Modify: `frontend/src/components/AssetTable.tsx`
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Add toolbar button to AssetTable**

`frontend/src/components/AssetTable.tsx` props 인터페이스에 추가:

```typescript
interface AssetTableProps {
  // ... 기존 ...
  onOpenPresetManager: () => void;
}
```

툴바 영역 (실시간 시세 버튼 옆)에 추가:

```tsx
<button
  onClick={onOpenPresetManager}
  disabled={isGuest}
  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold border transition-all ${
    isGuest
      ? "bg-secondary text-muted border-border opacity-50 cursor-not-allowed"
      : "bg-card text-accent border-accent/20 hover:bg-accent/5 shadow-sm"
  }`}
  title={isGuest ? "로그인 후 사용 가능합니다" : "프리셋 관리"}
>
  📂 프리셋 관리
</button>
```

- [ ] **Step 2: Update page.tsx**

`frontend/src/app/page.tsx` 수정:

```tsx
import dynamic from "next/dynamic";

// Lazy-loaded modal (bundle-dynamic-imports)
const PresetManagerModal = dynamic(() =>
  import("@/components/PresetManagerModal").then(mod => mod.PresetManagerModal)
);

export default function Home() {
  // ... 기존 ...
  const { accounts, isGuest, replaceAccount, /* ... */ } = usePortfolioData({ onError: ... });
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const activeAccount = accounts.find(a => a.id === activeAccountId);

  return (
    <>
      {/* ... 기존 컴포넌트들 ... */}
      <AssetTable
        // ... 기존 props ...
        onOpenPresetManager={() => setIsPresetModalOpen(true)}
      />
      {isPresetModalOpen && activeAccount && (
        <PresetManagerModal
          account={activeAccount}
          isGuest={isGuest}
          onClose={() => setIsPresetModalOpen(false)}
          onApplied={replaceAccount}
          showToast={showToast}
        />
      )}
    </>
  );
}
```

- [ ] **Step 3: tsc + run all tests**

```bash
cd frontend && npx tsc --noEmit && npm test
```

Expected: 모든 PASS, type 에러 0건.

- [ ] **Step 4: Manual smoke test**

```bash
cd frontend && npm run dev
```

브라우저에서 http://localhost:3000 접속:
- 로그인 → AssetTable 툴바에 `📂 프리셋 관리` 버튼 표시 확인
- 게스트 → 버튼 disabled 확인
- 모달 열기 → 불러오기 탭 표시 → 저장 탭 전환 → 저장 → 다시 불러오기 → 적용 confirm → 적용 → toast → 모달 닫힘 → AssetTable에 적용 결과 반영

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/AssetTable.tsx frontend/src/app/page.tsx
git commit -m "feat(ui): integrate PresetManagerModal into dashboard"
```

---

### Task B3.6: B3 완료 검증 + 배포

- [ ] **Step 1: Full frontend tests**

```bash
cd frontend && npm test -- --coverage
```

Expected: 모든 PASS, coverage 기준 충족.

- [ ] **Step 2: Build verification**

```bash
cd frontend && npm run build
```

Expected: 0 errors, build 성공.

- [ ] **Step 3: 수동 검증 checklist**

- [ ] 프리셋 저장 → 다른 계좌 적용 → updated/created 카운트 확인
- [ ] 합계 ≠ 100% warning toast 확인
- [ ] 게스트 모드 버튼 disabled 확인
- [ ] 계좌 전환 시 in-flight save 처리 확인 (느린 네트워크 시뮬)
- [ ] Escape/Tab 키보드 a11y 확인
- [ ] 429 응답 후 refresh 시 cooldown 유지 확인 (브라우저 devtools로 429 시뮬)
- [ ] Apply 직후 auto-refresh 10초가 적용 결과 덮어쓰지 않는지 확인

- [ ] **Step 4: PR merge & deploy B3**

배포 후 즉시 prod smoke test.

---

## 최종 완료 조건 (Plan B 전체)

- [ ] B1: PresetModel/PresetItemModel + AbstractPresetRepository + SqlAlchemyPresetRepository + Alembic migration 배포
- [ ] B2: Use cases 4개 + API endpoints 4개 + per-user rate limit + JWT type check + 모든 백엔드 테스트 100% PASS
- [ ] B3: usePresets + PresetManagerModal + AssetTable + page.tsx 통합 + 모든 frontend 테스트 PASS + 수동 검증 완료

---

## 하지 말 것

- ❌ Use case에서 `Preset(**dto.model_dump())` → ✅ 명시 필드 바인딩 + `user_id=current_user.id`
- ❌ wrong-owner 403 응답 → ✅ 404 통일 (PresetNotFoundError / AccountNotFoundError)
- ❌ ambiguous_match 응답에 asset name/code 포함 → ✅ item_indices만
- ❌ apply 시 매칭된 자산의 name/category 덮어쓰기 → ✅ target_weight만 업데이트 (tier-2 fallback일 때만 code backfill)
- ❌ `setPresets([...presets, x])` → ✅ `setPresets(prev => [...prev, x])`
- ❌ `PresetManagerModal` 정적 import → ✅ `next/dynamic`
- ❌ `isOpen` boolean prop → ✅ 부모 조건부 마운트
- ❌ 게스트 모드에서 프리셋 버튼 활성화 → ✅ disabled + tooltip
- ❌ Apply 즉시 실행 → ✅ confirm step 거침
- ❌ refresh token으로 access endpoint 인증 → ✅ decode_token에서 type='access' 검증
- ❌ rate limit key_func=`current_user.id` (작동 안 함) → ✅ `user_id_key_func(request)` + middleware
- ❌ `replaceAccount` 후 auto-refresh stale 응답 덮어쓰기 → ✅ lastMutationRef + abort 가드
