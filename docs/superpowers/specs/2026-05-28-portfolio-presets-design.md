# 포트폴리오 프리셋 저장/불러오기 기능 설계

**작성일**: 2026-05-28
**개정일**: 2026-05-28 (ce-doc-review 6-persona feedback 반영)
**작성자**: brainstorming session (Claude Sonnet 4.6 + 사용자)
**관련 컴포넌트**: `AssetTable`, `Home` (page.tsx)

---

## 1. 배경 및 목적

스노우볼 사용자는 AssetTable에서 종목별 목표비중(target_weight)을 입력해 자산 배분을 정의한다. 현재는 매번 수동으로 입력해야 하며, 동일한 배분 전략(예: S&P500 3-Fund, All-Weather Portfolio)을 여러 계좌에 적용하거나 재사용할 방법이 없다.

본 기능은 **자산 배분 비중을 프리셋으로 저장하고, 다른 계좌나 시점에 재사용할 수 있게** 한다.

### 1.1 작업 분할 — Plan A 선행 / Plan B 본기능

ce-doc-review 결과에 따라 본 작업은 **두 단위로 분리**한다. Plan A 배포·관찰 후 Plan B를 시작한다.

| Plan | 범위 | 독립 배포·롤백 |
|------|------|---------|
| **Plan A** | `AssetCategory` StrEnum 마이그레이션 (기존 Asset 코드, DB, 테스트) + Alembic 도입 + 데이터 audit | ✅ 단독으로 배포·롤백 가능 |
| **Plan B** | 프리셋 저장/불러오기/적용 기능 (이 spec의 §3.2~§9 대부분) | ✅ Plan A 완료 후 시작 |

> Plan A의 회귀가 Plan B 출시를 막지 않도록 분리. 본 spec은 두 plan을 함께 기술하되 §3.1·§8에서 단계 분리를 명확히 한다.

---

## 2. 요구사항

### 2.1 기능 요구사항

| ID | 요구사항 | Plan |
|----|----------|------|
| FR-1 | 사용자는 현재 계좌의 자산 목록을 프리셋으로 저장할 수 있다 | B |
| FR-2 | 프리셋에는 **종목명·코드·분류·목표비중**만 저장된다 (평단가·수량·현재가 제외) | B |
| FR-3 | 프리셋은 **사용자 범위**다 — 한 사용자의 어떤 계좌에도 적용 가능 | B |
| FR-4 | 사용자는 자신의 프리셋 목록을 조회/삭제할 수 있다 | B |
| FR-5 | 프리셋을 계좌에 적용 시 **덧써쓰기** 방식 — 기존 자산은 유지, 일치하는 종목은 비중 업데이트, 신규 종목은 추가 | B |
| FR-6 | 프리셋 관리 UI는 AssetTable 툴바의 `📂 프리셋 관리` 버튼으로 진입하는 전용 모달 | B |
| FR-7 | 프리셋 저장/적용 시 `target_weight` 합계가 100%를 넘거나 미달해도 **저장·적용 모두 허용**한다. 사용자 인지 수단은 (a) AssetTable 잔여비중 표시(`초과 N.N%` / `잔여 N.N%`), (b) Apply 응답의 `weight_sum` 기반 warning toast(§5.3.1). **현재 코드베이스에 `RebalancingService` 또는 runtime ratio sum 검증 로직은 존재하지 않으며, 본 작업에서도 추가하지 않는다** — UI feedback이 유일한 gate (의도된 MVP 선택, §11 참고) | B |
| FR-8 | Apply 실행 전 **confirm 단계**를 거친다 — "X개 업데이트, Y개 신규 추가" 표시 후 사용자가 확인 | B |
| FR-9 | Apply 응답에 매칭 결과 메타가 포함된다 — `updated_count`, `created_count` | B |

### 2.2 비기능 요구사항

| ID | 요구사항 | Plan |
|----|----------|------|
| NFR-1 | 모든 프리셋 데이터는 서버 DB에 영속 저장 (localStorage 미사용) | B |
| NFR-2 | 모든 API는 JWT 인증 필수 | B |
| NFR-3 | IDOR 방지 — 모든 프리셋·계좌 접근 시 user_id 검증, 응답 코드 정책 통일 (§4.4) | B |
| NFR-4 | 백엔드 테스트 커버리지 100% 유지 | A, B |
| NFR-5 | React 19 / Next.js 16 컴포넌트는 Vercel best-practices 준수 (`bundle-dynamic-imports`, `architecture-avoid-boolean-props`, `rerender-functional-setstate`) | B |
| NFR-6 | per-user rate limiting — 프리셋 쓰기 엔드포인트(POST/DELETE/Apply) | B |
| NFR-7 | 모달 a11y 준수 — `aria-modal`, focus trap, Escape, `role=tablist` | B |
| NFR-8 | Plan A 배포 전 prod DB의 `asset.category` 값 audit 필수 | A |

### 2.3 범위 외 (Out of Scope)

- 프리셋 공유 (사용자 간) — user-scope MVP 선택, account-scope 확장 경로는 §11에 명시
- 프리셋 추천 (관리자 제공)
- 프리셋 버전 관리
- Apply 후 undo (대신 FR-8 confirm으로 사전 방지)
- 프리셋에 cash 비중 포함

---

## 3. 데이터 모델

### 3.1 [Plan A] AssetCategory StrEnum 도입 + 마이그레이션

현재 코드베이스는 `category: str = "주식"` magic string을 사용 중. 하드코딩된 값은 5개(`주식`, `채권`, `원자재`, `현금`, `기타`).

> **주의 (rl-verify 1차 발견)**: `해외주식`은 `tests/integration/test_repositories.py:163` 테스트 fixture에만 존재하며 prod 데이터로 확인된 바 없다. `market_data.py:63`의 `# 해외주식: FinanceDataReader` 는 주석일 뿐 런타임 값이 아님. 따라서 enum 멤버 추가는 **prod audit 결과를 보고 결정**한다 (§3.1.2).

```python
# backend/src/snowball/domain/enums.py (신규)
from enum import StrEnum

class AssetCategory(StrEnum):
    STOCK     = "주식"
    BOND      = "채권"
    COMMODITY = "원자재"
    CASH      = "현금"
    OTHER     = "기타"
    # FOREIGN_STOCK = "해외주식" — audit 결과 prod에 존재할 경우에만 추가
```

#### 3.1.1 SQLModel 컬럼 명시 (필수) + 명시적 read coercion

SQLAlchemy의 Enum 자동 매핑은 native PG ENUM을 생성하거나 member name(`STOCK`)을 저장하려 시도해 기존 VARCHAR 값(`주식`)과 호환되지 않는다. **반드시 plain String 컬럼으로 선언**한다:

```python
from sqlalchemy import String, Column
from sqlmodel import Field, SQLModel

class AssetModel(SQLModel, table=True):
    ...
    category: AssetCategory = Field(
        default=AssetCategory.STOCK,
        sa_column=Column(String, nullable=False, default=AssetCategory.STOCK.value),
    )
```

> **중요 (rl-verify 1차 발견 P0)**: `Column(String)`은 **read 시 raw `str`을 반환**한다. SQLModel은 enum 자동 역변환을 수행하지 않는다. `isinstance(asset.category, AssetCategory)` 는 False가 된다.
>
> StrEnum 동등성(`"주식" == AssetCategory.STOCK` → True)에 의존하면 동작은 하지만 타입 안전성·자동완성이 깨진다. **모든 repository `_to_entity`는 명시적으로 coercion**한다:

```python
# adapters/db/repositories.py — 명시적 coercion 패턴 (필수)
def _to_entity(self, model: AssetModel) -> Asset:
    return Asset(
        ...
        category=AssetCategory(model.category),  # ← 명시적 coercion
        ...
    )
```

DTO 레이어도 동일하게 Pydantic이 enum coercion하므로 boundary에서만 검증되고 타입 안전.

#### 3.1.2 사전 데이터 audit (배포 전 필수) — 강화된 체크

```sql
-- 모든 환경에서 실행. 결과는 모두 PR 본문에 첨부.
SELECT DISTINCT category, COUNT(*) FROM asset GROUP BY category;
SELECT COUNT(*) FROM asset WHERE category IS NULL;
SELECT COUNT(*) FROM asset WHERE category != TRIM(category);
SELECT COUNT(*) FROM asset WHERE category = '';

-- rl-verify 2차 발견 P1 (N1-A): partial unique index 마이그레이션 실패 방지
-- account 내 동일 code 자산이 이미 존재하는지 확인
SELECT account_id, code, COUNT(*) AS dup_count
FROM asset
WHERE code IS NOT NULL
GROUP BY account_id, code
HAVING COUNT(*) > 1;
```

> **dup_count 결과가 0행이 아니면**: A3의 `uq_asset_account_code` partial unique index 마이그레이션이 실패한다. 대응:
> 1. 수동 데이터 검토 → 둘 중 하나를 다른 code로 변경하거나 합산 (domain 룰 "ticker는 유일"에 따라 어차피 수정 필요)
> 2. backfill migration으로 정규화 후 A3 진행
> 3. 결과를 PR 본문에 audit 결과와 함께 첨부

각 결과에 대한 대응:

| 케이스 | 대응 |
|--------|------|
| 모든 DISTINCT 값이 enum 멤버 일치 | 그대로 진행 |
| 알 수 없는 값 발견 (예: `펀드`) | **결정 트리**: ≤5개 유형 → enum 멤버 추가 (PR 내 처리). >5개 또는 의미 불명확 → 별도 Plan A0 backfill 마이그레이션 작성 후 진행 |
| NULL 존재 | backfill `UPDATE asset SET category='주식' WHERE category IS NULL` |
| trailing whitespace | backfill `UPDATE asset SET category=TRIM(category)` |
| 빈 문자열 | backfill `UPDATE asset SET category='주식' WHERE category=''` |

#### 3.1.2-bis DB CHECK constraint — TOCTOU race 차단

audit→deploy 간 새로운 invalid 값이 들어오는 race를 막기 위해, **AssetCategory 코드 변경과 동일 PR에서 DB CHECK constraint를 추가**한다:

```python
# Alembic migration
op.create_check_constraint(
    "ck_asset_category_enum",
    "asset",
    "category IN ('주식', '채권', '원자재', '현금', '기타')",  # audit 결과 반영
)
```

기존 PATCH endpoint(`routes.py:285`)도 동일 PR에서 `category: AssetCategory` 타입으로 변경되어 추가 invalid 값 유입 차단.

#### 3.1.3 마이그레이션 도구 — Alembic 도입 (전체 recipe)

현재 `infrastructure/db.py`의 `SQLModel.metadata.create_all`은 새 테이블만 생성하며 기존 컬럼 변경을 지원하지 않는다. Plan A에서 **Alembic을 새로 도입**한다.

**필수 단계 (rl-verify 1차 발견 보강)**:

1. **`pyproject.toml`** dependencies에 `alembic` 추가
2. **`backend/alembic/`** 디렉토리 생성, `alembic.ini` 작성. `sqlalchemy.url`은 환경변수(`%(DATABASE_URL)s`) 참조
3. **`backend/alembic/env.py`** 작성:
   ```python
   from src.snowball.adapters.db.models import *  # ← 모든 model 모듈 명시 import
   from sqlmodel import SQLModel
   target_metadata = SQLModel.metadata
   context.configure(
       ...,
       target_metadata=target_metadata,
       user_module_prefix='sqlmodel.sql.sqltypes.',  # ← SQLModel custom types
       render_as_batch=True,  # ← SQLite batch mode
   )
   ```
4. **`backend/alembic/script.py.mako`** 템플릿에 `import sqlmodel` 추가 (AutoString 등 custom 타입 NameError 방지)
5. **기존 prod/staging DB에 `alembic stamp head`** 실행 (baseline 적용 — 테이블 재생성 막음)
6. autogenerate 결과는 **항상 수동 검토**. column type 변경, server defaults, indexes, CHECK constraint는 자주 누락됨

**테스트/dev 환경의 `create_all` 유지**: 회귀 가드로 CI에 `alembic upgrade head && python -c "from alembic.autogenerate import compare_metadata; ..."` 또는 단순히 `alembic check` 추가하여 metadata와 migration 동기화 검증.

Plan B에서 `preset`, `preset_item` 테이블 추가는 Alembic으로 진행한다. **모든 마이그레이션은 `downgrade()` 구현 필수** — CI에서 `alembic upgrade head && alembic downgrade -1 && alembic upgrade head` 회귀 테스트.

#### 3.1.4 마이그레이션 범위 — Plan A

| 파일 | 변경 |
|------|------|
| `domain/enums.py` | **신규** — `AssetCategory` (audit 결과 반영한 멤버 set) |
| `domain/entities.py` | `Asset.category: str` → `AssetCategory` + `Optional[X]` → `X \| None` 전체 적용 |
| `domain/services.py` | `infer_category()` 반환 타입 `str` → `AssetCategory`, 내부 분기 enum 상수 사용 |
| `adapters/db/models.py` | `AssetModel.category` SQLModel 컬럼 명시 (§3.1.1), `Optional[X]` → `X \| None` |
| `adapters/db/repositories.py` | `_to_entity` 명시적 `AssetCategory(value)` coercion (§3.1.1) |
| `adapters/api/dtos.py` | `category: str`/`Optional[str]` → `AssetCategory`/`AssetCategory \| None` 전체 + `model_config = ConfigDict(extra='forbid')` |
| `adapters/api/routes.py` | PATCH endpoint의 `update.category` 타입을 `AssetCategory \| None` |
| `use_cases/sync.py` | `"주식"` 기본값 → `AssetCategory.STOCK` |
| `pyproject.toml` | `alembic` 추가 |
| `backend/alembic/` | **신규** — 디렉토리/`env.py`/`script.py.mako`/baseline migration |
| `backend/alembic/versions/*` | (1) baseline (no-op stamp 대상), (2) CHECK constraint 추가, (3) (선택) audit 결과 backfill |

#### 3.1.5 테스트 코드 영향 — Plan A

| 파일 | 변경 |
|------|------|
| `tests/unit/domain/test_services.py` | parametrize 문자열 → `AssetCategory.X` 상수 |
| `tests/unit/use_cases/test_asset_use_cases.py` | mock 데이터 `"category": "주식"` → `AssetCategory.STOCK` |
| `tests/integration/test_repositories.py` | `category="주식"` → `AssetCategory.STOCK`, 기존 `"해외주식"` 케이스는 `AssetCategory.FOREIGN_STOCK` |
| `tests/unit/scripts/test_manage.py` | `category="주식"` → `AssetCategory.STOCK` |
| `tests/e2e/test_finance.py` | JSON 응답 비교는 그대로 (StrEnum이 `"주식"`으로 직렬화) |

### 3.2 [Plan B] 도메인 엔티티

```python
# backend/src/snowball/domain/entities.py (추가)
from .enums import AssetCategory

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

### 3.3 [Plan B] DB 모델

> **rl-verify 1차 발견 P1**: FK에 `ondelete='CASCADE'` 명시 — ORM-only cascade는 raw SQL 또는 lazy-load 미스 시 orphan 발생 위험

```python
# backend/src/snowball/adapters/db/models.py (추가)
from sqlalchemy import String, Column, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from .enums import AssetCategory

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

`UserModel.presets` 역방향 관계도 추가 (cascade delete).

> 동일 PR에서 `preset_item.category`에도 CHECK constraint 추가 (§3.1.2-bis와 동일 정신):
> ```python
> op.create_check_constraint("ck_preset_item_category_enum", "preset_item", "category IN (...)")
> ```

### 3.4 [Plan B] Repository 포트 + 어댑터

```python
# backend/src/snowball/domain/ports.py (추가)
class AbstractPresetRepository(ABC):
    @abstractmethod
    def save(self, preset: Preset) -> Preset: ...
    @abstractmethod
    def get(self, preset_id: int) -> Preset | None: ...
    @abstractmethod
    def list_by_user(self, user_id: UserId) -> list[Preset]: ...
    @abstractmethod
    def delete(self, preset_id: int) -> None: ...
```

```python
# backend/src/snowball/adapters/db/repositories.py (추가)
class SqlAlchemyPresetRepository(AbstractPresetRepository):
    # _to_entity / _to_model 변환 시:
    #   - PresetItemModel.preset_id ↔ 도메인 PresetItem (도메인은 preset_id 없음)
    #   - UserModel.user_id: UUID → Preset.user_id: UserId 캐스팅
```

### 3.5 [Plan B] 마이그레이션 범위

| 파일 | 변경 |
|------|------|
| `domain/entities.py` | PresetItem, Preset 추가 |
| `domain/ports.py` | `AbstractPresetRepository` 추가 |
| `adapters/db/models.py` | PresetModel, PresetItemModel 추가 + UserModel.presets 역관계 |
| `adapters/db/repositories.py` | `SqlAlchemyPresetRepository` 추가 |
| `adapters/api/dtos.py` | PresetCreate/Response/ApplyResult 추가 (§4.2) |
| `adapters/api/routes.py` | 4개 엔드포인트 추가 (§4.1) + per-user limiter |
| `use_cases/presets.py` | **신규** — CreatePresetUseCase, ListPresetsUseCase, DeletePresetUseCase, ApplyPresetUseCase |
| `backend/alembic/versions/` | preset, preset_item 테이블 생성 마이그레이션 |

---

## 4. API 설계

### 4.1 엔드포인트

| Method | Path | 설명 | Rate Limit |
|--------|------|------|------------|
| `GET` | `/api/v1/presets` | 내 프리셋 목록 (items eager-loaded) | 60/minute |
| `POST` | `/api/v1/presets` | 프리셋 생성 | 10/minute |
| `DELETE` | `/api/v1/presets/{preset_id}` | 프리셋 삭제 | 30/minute |
| `POST` | `/api/v1/presets/{preset_id}/apply/{account_id}` | 계좌에 적용 (덧써쓰기) | 30/minute |

> **rl-verify 2차 발견 P1 (N1-S — 사전 vuln 명시)**: `JWTService.decode_token`은 token type(access vs refresh)을 검증하지 않는다. 즉, refresh token도 본 미들웨어 및 `get_current_user`를 통과한다. 이는 본 spec이 도입한 결함이 아닌 사전 존재 vuln이지만, Plan B가 인증 surface를 확장하므로 **B2 작업 안에서 함께 fix**한다:
>
> ```python
> # security.py decode_token 수정
> payload = jwt.decode(token, KEY, algorithms=[ALG])
> if payload.get("type") != "access":
>     return None  # refresh token으로 access 시도 차단
> return payload
> ```
>
> 변경 영향: refresh endpoint (`/auth/refresh`)는 별도 decode 경로를 사용하므로 영향 없음. 회귀 테스트로 "refresh token으로 보호된 endpoint 호출 → 401" 추가.

#### Per-user rate limiting 구현 (rl-verify 1차 발견 P0 해결)

slowapi의 `key_func`는 FastAPI `Depends(get_current_user)`를 받지 못한다 (key_func는 middleware 단계에서 호출되며 dependency injection 미해결 상태). 따라서 다음 패턴을 사용한다:

```python
# infrastructure/security.py 또는 middleware 추가
async def user_id_middleware(request: Request, call_next):
    """JWT를 가볍게 decode하여 request.state.user_id에 저장.
    실패 시 silently skip (rate limit fallback이 처리)."""
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        try:
            payload = JWTService().decode_token(auth[7:])
            if payload and "sub" in payload:
                request.state.user_id = payload["sub"]
        except Exception:
            pass  # 실패 시 user_id 미설정
    return await call_next(request)

# main.py — limiter middleware 보다 먼저 등록
app.middleware("http")(user_id_middleware)
```

```python
# adapters/api/routes.py
def user_id_key_func(request: Request) -> str:
    """Authenticated user의 id, fallback IP."""
    user_id = getattr(request.state, "user_id", None)
    return user_id or get_remote_address(request)

@router.post("/presets", response_model=PresetResponse)
@limiter.limit("10/minute", key_func=user_id_key_func)
def create_preset(request: Request, ...):  # Request 인자 필수
    ...
```

> 기존 `/finance/*` route의 `get_remote_address` 패턴은 그대로 유지 (unauthenticated이므로 user 없음). preset route만 `user_id_key_func` 사용.

### 4.2 DTOs

```python
from pydantic import BaseModel, ConfigDict, Field, field_validator

# Request — mass-assignment 방지를 위해 모두 extra='forbid'
class PresetItemCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str  = Field(min_length=1, max_length=200)
    code: str | None = Field(default=None, max_length=20, pattern=r'^[A-Za-z0-9._-]+$')
    category: AssetCategory
    target_weight: float = Field(ge=0, le=100)

    @field_validator("code", mode="before")
    @classmethod
    def normalize_empty_code(cls, v):
        # 빈 문자열은 None으로 정규화 (매칭 로직 일관성)
        if v == "":
            return None
        return v

class PresetCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")  # ← user_id 등 mass-assignment 차단
    name: str = Field(min_length=1, max_length=100)
    items: list[PresetItemCreate] = Field(min_length=1, max_length=50)

    @field_validator("items")
    @classmethod
    def no_duplicate_match_key(cls, items):
        # 같은 매칭 key (code 우선, 없으면 name)가 2회 이상 등장 → 거부
        keys = [(item.code, item.name) if item.code else (None, item.name) for item in items]
        seen = set()
        for k in keys:
            sig = k[0] if k[0] is not None else f"name:{k[1]}"
            if sig in seen:
                raise ValueError(f"중복된 종목 매칭 키: {sig}")
            seen.add(sig)
        return items

# Response
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
    account: AccountCalculatedResponse  # 기존 형식
    updated_count: int                   # 매칭되어 업데이트된 자산 수
    created_count: int                   # 신규 생성된 자산 수
    weight_sum: float                    # 적용 후 target_weight 합계 (UI warning용)
```

#### Use Case binding 규칙 (mass-assignment 방지)

```python
# use_cases/presets.py
class CreatePresetUseCase:
    def execute(self, dto: PresetCreate, current_user: User) -> Preset:
        # ❌ Preset(**dto.model_dump()) 금지
        # ✅ 명시적 필드 바인딩, user_id는 server-derived
        items = [PresetItem(name=i.name, code=i.code,
                            category=i.category, target_weight=i.target_weight)
                 for i in dto.items]
        preset = Preset(name=dto.name, user_id=current_user.id, items=items)
        return self.repo.save(preset)
```

### 4.3 적용(apply) 알고리즘 — 결정성 + 중복 방지

> **rl-verify 1차 발견 P0 해결 (ADV-2, SEC-7)**: preset 자체가 duplicate code를 가질 때 신규 자산 중복 생성 문제를 §4.2 Pydantic validator(`no_duplicate_match_key`)로 입력 단계에서 차단. 알고리즘 자체는 단순화.

```
입력: preset_id, account_id (current_user 인증됨)
DTO validation 완료: preset.items에 중복 매칭 key 없음 (§4.2)

[0] 소유권 검증 (§4.4 정책)
    - preset_id 조회 실패 OR preset.user_id != current_user.id → 404
    - account_id 조회 실패 OR account.user_id != current_user.id → 404
    (두 검증을 같은 transaction에서 일관된 timing으로 수행 — timing-oracle 차단)

[1] 매칭 (결정성 보장):
    프리셋의 각 item에 대해 다음 순서로 시도:
      a. item.code가 not None → account.assets 중 code 일치 자산 검색
                                  (DB ORDER BY id ASC, LIMIT 1)
      b. (a) 실패 + item.code is None → account.assets 중 name 일치 자산 검색
                                          (DB ORDER BY id ASC, LIMIT 1)
      c. (a) 실패 + item.code is not None (= 같은 ticker 자산이 계좌에 없음)
         → name 매칭으로 fallback 시도 (tier-2): code-less existing asset이
            preset의 named asset에 대응할 수 있음
            예: existing {name=SPY ETF, code=None} ↔ preset {name=SPY ETF, code=SPY}
            매칭되면 신규 생성 대신 기존 자산 업데이트 (orphan 방지)
      d. 이미 다른 item에 매칭된 자산은 후속 매칭에서 제외 (1:1 보장)

[2] 업데이트 vs 신규 생성:
    매칭됨   → asset.target_weight ← item.target_weight
              매칭이 (c) tier-2 fallback 경로면 asset.code ← item.code 도 backfill
              그 외에는 asset.name, asset.category, asset.code 보존
              asset.avg_price, quantity, current_price 항상 보존
              updated_count += 1

    매칭 안됨 → 신규 Asset 생성 (avg_price=0, quantity=0, current_price=0)
              created_count += 1
              ※ 신규 생성 직전 account.assets에 동일 code 존재 검증 — 있으면 500 internal
                (Pydantic validator + 1:1 매칭으로 이론상 도달 불가, defensive)

[3] CalculatePortfolioUseCase 실행

[4] weight_sum = sum(asset.target_weight for asset in account.assets)

[5] ApplyPresetResponse 반환 (account + updated_count + created_count + weight_sum)
```

#### ambiguous_match 응답 스키마 (rl-verify 1차 발견 P0 — SEC-1 정보 leak 해결)

§4.2 Pydantic validator로 대부분의 ambiguity는 입력 단계에서 차단되지만, 잔존 가능성(예: 계좌 내 동일 code 자산이 2개 존재 — 도메인 룰 위반 상태)을 위해 응답 스키마 명시:

```json
{
  "error": "ambiguous_match",
  "item_indices": [2, 5],          // preset.items 배열 인덱스만
  "conflict_counts": [3, 2]         // 각 item당 충돌하는 계좌 자산 수
}
```

> ❌ asset name/code는 응답에 echo하지 않음. ❌ item 원본 값도 echo하지 않음. FE는 "프리셋 #3에서 충돌 발생 (계좌에 동일 종목 3개 존재)" 같은 일반 메시지로 표시.

#### 도메인 invariant 검증 (Plan A에서 함께)

`account.assets`의 `(code, account_id)` 중복은 도메인 룰 위반(`.claude/rules/snowball-domain.md`: "한 계좌 내 ticker는 유일"). 이를 DB 레벨에서 강제하기 위해 Plan A에서 partial unique index 추가:

```python
op.create_index(
    "uq_asset_account_code",
    "asset",
    ["account_id", "code"],
    unique=True,
    postgresql_where=sa.text("code IS NOT NULL"),
    sqlite_where=sa.text("code IS NOT NULL"),  # SQLite도 partial index 지원
)
```

### 4.4 보안 — 응답 코드 정책

| 케이스 | 응답 | 이유 |
|--------|------|------|
| 프리셋 not found | 404 Not Found | 존재 정보 노출 방지 |
| 프리셋 wrong owner | **404 Not Found** | existence oracle 차단 |
| 계좌 not found | 404 Not Found | 동일 |
| 계좌 wrong owner | **404 Not Found** | 동일 |
| `target_weight` 음수 or > 100 | 400 (Pydantic) | 입력 검증 |
| `items` 빈 배열 / 51개 이상 | 400 (Pydantic) | 입력 검증 |
| `name`/`code` 길이·패턴 위반 | 400 (Pydantic) | 입력 검증 |
| 멀티 매치 충돌 | 400 `ambiguous_match` | §4.3 [2] |
| Rate limit 초과 | 429 Too Many Requests | slowapi |
| target_weight 합계 > 100% | 200 OK + apply 응답에 warning 메타 | FR-7 |

> **변경점:** wrong-owner는 401/403 대신 **404 통일**. preset_id 시퀀셜 enumeration으로 타 사용자 preset 존재 여부를 탐지할 수 없게 함.

---

## 5. 프론트엔드 설계

### 5.1 신규 파일

```
frontend/src/
├── components/
│   └── PresetManagerModal.tsx     # 프리셋 관리 모달
└── lib/hooks/
    └── usePresets.ts              # 프리셋 CRUD 훅
```

### 5.2 usePresets 훅

```typescript
export function usePresets(options?: { onError?: (msg: string) => void }) {
  const [presets, setPresets] = useState<Preset[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPresets = async () => { /* GET /presets */ }
  const createPreset = async (name: string, items: PresetItemInput[]) => {
    // POST /presets
    // 성공: setPresets(prev => [...prev, newPreset])  // rerender-functional-setstate
  }
  const deletePreset = async (presetId: number) => { /* DELETE */ }
  const applyPreset  = async (presetId: number, accountId: number)
    : Promise<ApplyResult> => { /* POST /presets/:id/apply/:accountId */ }
    // ApplyResult = { account, updated_count, created_count }

  return { presets, isLoading, error, fetchPresets, createPreset, deletePreset, applyPreset }
}
```

### 5.3 PresetManagerModal 컴포넌트

```typescript
// architecture-avoid-boolean-props: isOpen prop 없음, 부모가 조건부 마운트
interface PresetManagerModalProps {
  account: Account              // 현재 계좌 (저장 시 items 추출 + 적용 대상)
  isGuest: boolean              // 게스트 모드 비활성화 표시용
  onClose: () => void
  onApplied: (updated: Account) => void
  showToast: (msg: string, type?: 'info' | 'error') => void
}

// 책임:
// - 내부에서 usePresets 훅 호출
// - 불러오기 탭: presets 목록 렌더링, 각 행 적용 버튼 클릭 → applyPreset 호출 → onApplied
// - 저장 탭: 이름 입력 + chip 미리보기 + 저장 버튼 클릭 → createPreset 호출
// - 삭제: 인라인 confirm row replace 패턴 (AssetRow와 동일 정신)
```

#### 5.3.1 화면 상태 명세 (5개)

| 상태 | 표현 |
|------|------|
| 불러오기 탭 로딩 | 중앙 스피너 + "프리셋을 불러오는 중..." |
| 불러오기 탭 빈 목록 | "저장된 프리셋이 없습니다." + "저장 탭에서 첫 프리셋을 만들어보세요" 링크 |
| 불러오기 탭 fetch 에러 | 인라인 에러 메시지 + 재시도 버튼 |
| 저장 탭 입력 불가 | 저장 버튼 비활성 — 사유: (a) 계좌에 종목 0개, (b) 이름 빈 문자열, (c) 이름 100자 초과 (입력 하단 카운터 빨강) |
| 정상 | 모든 입력 유효 — 저장/적용 버튼 활성 |

#### 5.3.1-bis 인라인 인터랙션 상태 (button/row-level)

| 상태 | 표현 |
|------|------|
| Apply 진행 중 | 해당 행의 적용 버튼 → 스피너 + "적용 중..." (다른 적용 버튼도 disabled, 모달 닫기 비활성) |
| 삭제 confirm 중 | 해당 row replace → "삭제하시겠습니까?" + [확인][취소] (AssetRow와 동일 패턴) |
| Rate limit (429) | 영향받는 버튼 disabled, `Retry-After` 헤더 값까지 (sessionStorage에 timestamp 저장 → 새로고침 후에도 유지) |
| 이름 길이 카운터 | `[...name].length` 사용 (code point 기준 — Python `len()`과 일치, JS `String.length` UTF-16 미스매치 방지) |

#### 5.3.2 Apply Confirm 단계 (FR-8)

```
사용자가 적용 버튼 클릭 → 즉시 API 호출하지 않음
↓
모달 내 confirm bar 표시:
  "이 프리셋을 ISA 계좌에 적용합니다."
  "기존 종목 X개의 비중이 업데이트되고, 신규 Y개가 추가됩니다."
  [적용] [취소]
↓
[적용] 클릭 → API 호출 → 결과 표시
```

매칭 카운트는 클라이언트에서 사전 계산 (계좌 자산 vs 프리셋 items을 §4.3 알고리즘으로 dry-run).

#### 5.3.3 Chip 정의

read-only pill (Tailwind `inline-flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-xs font-bold`) — 표시 형식: `종목명 N.N%`

`target_weight == 0` 또는 NaN인 자산도 chip에 포함 (사용자가 의도적으로 0으로 둘 수 있음), 단 빨간 테두리로 강조.

#### 5.3.4 접근성 (NFR-7)

- `<dialog>` 또는 `role="dialog" aria-modal="true" aria-labelledby="..."`
- 모달 open 시 첫 focusable 요소(닫기 X 버튼)에 focus
- focus trap: 모달 외부 tab 이동 방지
- Escape 키로 닫기
- 탭 스위처: `role="tablist"`, 각 탭은 `role="tab" aria-selected="..."`
- 모달 close 시 trigger 버튼(`📂 프리셋 관리`)에 focus 복귀

#### 5.3.5 계좌 전환 처리 (in-flight mutation 보호)

사용자가 모달을 연 채로 AccountTabs에서 계좌를 전환할 수 있다. 처리 방침:

- 모달은 내부 `pendingMutation: boolean` ref/state로 in-flight 요청 추적
- 모달이 열려있는 동안 `activeAccountId` 변경 감지 (`useEffect` dep)
- **자동 닫기 정책**:
  - `pendingMutation === false` → 즉시 모달 닫기 + toast `"계좌가 변경되어 프리셋 모달을 닫았습니다"`
  - `pendingMutation === true` → 현재 요청 await 후 결과 처리, 그 다음 닫기. 토스트는 결과별로:
    - 저장 완료: `"저장 완료 후 계좌가 변경되어 모달이 닫혔습니다"`
    - 적용 완료: `"적용 완료. 다른 계좌로 이동했습니다"`
    - 실패: `"요청 중단됨 (계좌 변경)"`

### 5.4 AssetTable 변경

```diff
interface AssetTableProps {
  ...
+ onOpenPresetManager: () => void
}

// 툴바 (실시간 시세 버튼 옆)
+ <button
+   onClick={onOpenPresetManager}
+   disabled={isGuest}
+   className={isGuest ? 'opacity-50 cursor-not-allowed' : '...'}
+   title={isGuest ? '로그인 후 사용 가능합니다' : '프리셋 관리'}
+ >
+   📂 프리셋 관리
+ </button>
```

게스트 모드에서는 버튼 자체를 disabled (D5 — 기존 isGuest 가드 패턴과 일치).

### 5.5 통합 위치 — `frontend/src/app/page.tsx` (`Home` 컴포넌트)

> **수정점**: 이전 spec에서 언급한 `DashboardClient`는 실제로 존재하지 않는다. 실제 dashboard orchestration은 `frontend/src/app/page.tsx`의 `Home` 컴포넌트가 담당. (CLAUDE.md 문구가 stale)

**선행 작업**: `usePortfolioData` 훅에 `replaceAccount` 액션 추가. 기존 훅은 `setAccounts`를 export하지 않으므로 단일 책임 액션으로 노출 (기존 `addAsset`, `updateAsset`, `deleteAsset` 패턴과 일관).

> **rl-verify 2차 발견 P1 high (N1-V)**: `page.tsx`의 10초 auto-refresh와 Apply가 race를 일으킬 수 있다. 시나리오:
> 1. T=0s — auto-refresh 발사, GET /accounts 요청 (pre-Apply snapshot)
> 2. T=1s — 사용자가 Apply 클릭, POST .../apply 성공
> 3. T=2s — `replaceAccount(updated)` 호출, optimistic state 반영
> 4. T=3s — T=0s 요청의 응답 도착, **pre-Apply snapshot으로 덮어쓰여 적용 결과가 사라진 것처럼 보임**
>
> 해결: `replaceAccount` 내부에서 in-flight fetchAccounts를 abort하고, mutation timestamp guard를 추가한다:

```typescript
// frontend/src/lib/hooks/useAccounts.ts (수정)
const lastMutationRef = useRef(0)  // 마지막 mutation 시각

// fetchAccounts 내부에서 응답 처리 직전 가드:
const fetchStartedAt = Date.now()
const data = await response.json()
if (fetchStartedAt < lastMutationRef.current) {
  return  // stale snapshot 폐기
}
setAccounts(data)

// replaceAccount는 mutation 시각 기록
const replaceAccount = useCallback((updated: Account) => {
  lastMutationRef.current = Date.now()
  abortInFlightFetch?.()  // 진행 중인 auto-refresh abort
  setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a))
}, [])
```

```typescript
// frontend/src/lib/hooks/usePortfolioData.ts (export)
return {
  accounts, fetchAccounts, isGuest, isLoading,
  addAsset, updateAsset, deleteAsset, updateCash, fetchAssetInfo,
  createAccount, updateAccountName, deleteAccount,
  replaceAccount,  // ← 신규 export, race-safe
}
```

테스트: vitest에서 "Apply → 직후 auto-refresh 응답 (pre-Apply state) → optimistic state 유지" 케이스 추가.

```tsx
// frontend/src/app/page.tsx
import dynamic from 'next/dynamic'

// bundle-dynamic-imports: 초기 번들에서 제외
// rl-verify 1차 발견: Next.js 16 권장 형태로 단순화 (.then(mod => mod.X))
const PresetManagerModal = dynamic(() =>
  import('@/components/PresetManagerModal').then(mod => mod.PresetManagerModal)
)

export default function Home() {
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false)
  const { accounts, isGuest, replaceAccount, ... } = usePortfolioData(...)
  const [activeAccountId, setActiveAccountId] = useState<number | null>(null)

  const activeAccount = accounts.find(a => a.id === activeAccountId)

  return (
    <>
      {/* ... 기존 컴포넌트들 ... */}
      <AssetTable
        ...
        isGuest={isGuest}
        onOpenPresetManager={() => setIsPresetModalOpen(true)}
      />

      {/* architecture-avoid-boolean-props: 조건부 마운트 */}
      {isPresetModalOpen && activeAccount && (
        <PresetManagerModal
          account={activeAccount}
          isGuest={isGuest}
          onClose={() => setIsPresetModalOpen(false)}
          onApplied={replaceAccount}        // ← 단일 액션 호출
          showToast={showToast}
        />
      )}
    </>
  )
}
```

### 5.6 적용 Vercel 룰

| 룰 | 적용 위치 |
|----|----------|
| `bundle-dynamic-imports` | `PresetManagerModal` import 시 `next/dynamic` (Next.js 16 권장 `.then(mod => mod.X)` 형태) |
| `architecture-avoid-boolean-props` | `isOpen` prop 제거, 부모가 조건부 마운트 |
| `rerender-functional-setstate` | `usePresets`의 모든 setState, `usePortfolioData.replaceAccount` 내부 |
| `client-swr-dedup` | 검토 — usePresets는 화면 마운트에 1회 호출이므로 SWR 도입 보류 (single fetch) |

> `react19-no-forwardref`는 본 작업에서 React Context 사용 surface가 없어 미적용. 적용 룰 표에서 제외.

### 5.7 PresetManagerModal 데이터 페칭 결정 (rationale)

다른 컴포넌트(`DonutChart`, `AssetTable`)는 pure presentational — 모든 데이터는 props로 받는다. PresetManagerModal은 **내부에서 `usePresets` 훅 호출**한다. 이유:

1. 모달은 조건부 마운트되므로 fetch lifecycle ≡ 모달 lifecycle (정확한 scoping)
2. preset 데이터는 다른 컴포넌트와 공유되지 않음 (lift-up 이득 없음)
3. 모달 닫힌 상태에서 fetch 안 함 (always-on hook의 낭비 방지)

account / showToast / onClose / onApplied는 props로 받음 — 외부 상태는 모두 inversion of control. 이는 "feature 컴포넌트" 패턴 (smart child for self-contained feature).

---

## 6. 에러 처리

### 6.1 Backend

§4.4 정책 표 참고. 추가 정책:
- 모든 5xx 에러는 `logger.error` + 사용자에게는 generic 메시지
- 마이그레이션 audit 실패 시 startup hook에서 명시적 에러 로그

### 6.2 Frontend

| 시나리오 | 처리 |
|---------|------|
| `fetchPresets` 실패 | 모달 내 인라인 에러 + 재시도 버튼 |
| `createPreset` 400 (validation) | 인라인 필드 에러 표시 |
| `createPreset` 그 외 실패 | `showToast('프리셋 저장 실패', 'error')` |
| `deletePreset` 실패 | `showToast('삭제 실패', 'error')` + 목록 새로고침 |
| `applyPreset` 400 `ambiguous_match` | confirm 단계에서 차단 + 충돌 자산 표시 |
| `applyPreset` 그 외 실패 | `showToast('프리셋 적용 실패', 'error')` |
| `applyPreset` 성공, 합계 ≠ 100% | 모달 닫기 + `showToast('적용 완료. 목표비중 합계가 N%입니다', 'info')` |
| `applyPreset` 성공, 합계 == 100% | 모달 닫기 + `showToast('적용 완료', 'info')` |
| Rate limit (429) | `showToast('잠시 후 다시 시도해주세요', 'error')` |

---

## 7. 테스트 전략

### 7.1 [Plan A] 마이그레이션 검증

```
unit/domain/test_services.py         (기존 + StrEnum 상수로 교체)
unit/use_cases/test_asset_use_cases.py
integration/test_repositories.py     (해외주식 케이스 포함)
unit/scripts/test_manage.py

신규: tests/unit/domain/test_enums.py
  [Happy]    AssetCategory 모든 멤버 값 검증 (6개)
  [Boundary] StrEnum equality vs str ("주식" == AssetCategory.STOCK)
  [Error]    잘못된 값으로 enum 생성 → ValueError

회귀: 모든 기존 e2e/integration 테스트 PASS
배포 전: prod DB `SELECT DISTINCT category` 결과 PR 첨부
```

### 7.2 [Plan B] 신기능 TDD (Happy/Boundary/Error)

```
unit/domain/test_preset_entities.py
  [Happy]    PresetItem 정상 생성 (AssetCategory enum 값)
  [Boundary] target_weight=0, code=None, items=[]
  [Error]    target_weight 음수 → 검증 실패 (Pydantic DTO 레벨)

unit/use_cases/test_preset_use_cases.py
  [Happy]    create / list / delete / apply 정상 흐름
  [Boundary] apply 시 code 없는 item → name으로 매칭
             apply 시 기존 자산 있음 → target_weight만 업데이트, name/category 보존
             apply 시 기존 자산 없음 → 신규 생성
             apply 시 1:1 매칭 — 두 item이 같은 자산 후보면 첫 item만 매칭
  [Error]    멀티 매치 → ambiguous_match 예외
             소유자 불일치 → 404 에러 (NOT 403)

integration/test_preset_repositories.py
  [Happy]    DB 저장·조회·삭제
  [Boundary] items 1개 / 50개 (max)
  [Error]    cascade delete 동작 검증 (preset 삭제 시 items 동시 삭제)

e2e/test_presets.py
  [Happy]    CRUD + apply 전체 플로우 (JWT 포함)
             apply 응답에 updated_count, created_count 포함
  [Boundary] 빈 list, single item 프리셋
  [Error]    타인 preset 접근 → 404 (NOT 403)
             타인 account에 apply → 404
             없는 preset_id → 404
             없는 account_id → 404
             rate limit 초과 → 429
             items max+1 → 400
             name max+1 → 400
             code 패턴 위반 → 400
             ambiguous_match → 400
```

### 7.3 Frontend (Vitest)

```
tests/hooks/usePresets.test.ts
  [Happy]    fetch / create / delete / apply 정상 응답 처리
  [Boundary] 빈 목록 반환
             apply 응답의 updated/created count 노출
  [Error]    API 실패 → 에러 상태 + onError 호출
             429 → 적절한 toast 메시지

tests/components/PresetManagerModal.test.tsx
  [Happy]    불러오기 탭: 목록 렌더링, 적용 버튼 클릭 → confirm → onApplied 호출
             저장 탭: 이름 입력, 저장 버튼 클릭 → createPreset 호출
             a11y: aria-modal, role=tablist, Escape 닫기
  [Boundary] 프리셋 0개 → 빈 상태 메시지
             account.assets 0개 → 저장 버튼 비활성
             이름 100자 초과 → 카운터 빨강 + 버튼 비활성
             계좌 전환 → 모달 자동 닫힘
             게스트 모드 → 트리거 버튼 disabled
  [Error]    apply 실패 → showToast('적용 실패', 'error') 호출 확인
             ambiguous_match → confirm 단계에서 차단 + 충돌 표시
```

---

## 8. 마이그레이션·롤아웃

### 8.1 단계별 배포 (각 stage = 1 PR)

```
[A1] Alembic 도입 + user_id middleware
  - pyproject.toml에 alembic 추가
  - backend/alembic/ (env.py, script.py.mako, alembic.ini) 작성
  - baseline migration (no-op schema)
  - 기존 prod/staging DB에 `alembic stamp head` 실행
  - user_id middleware 추가 (Plan B 대비)
  - merge + 배포 + 관찰 (스키마 변경 없음, 회귀 위험 거의 0)

[A2] Audit + backfill (코드 변경 없음)
  - 모든 환경에서 §3.1.2 강화된 audit 실행
  - 결과를 PR description에 첨부
  - 필요 시 backfill migration (NULL/whitespace/unknown 정규화)
  - downgrade() 포함, CI에서 upgrade/downgrade/upgrade 검증

[A3] AssetCategory StrEnum + DB CHECK + partial unique index
  - domain/enums.py 신규
  - 기존 Asset/Service/Model/DTO/Test 코드 마이그레이션
  - DB CHECK constraint + asset (account_id, code) partial unique index 마이그레이션
  - 기존 테스트 100% PASS, 커버리지 100%
  - merge + 배포 + 1-2일 관찰

[B1] Preset 테이블 + 도메인 + Repository
  - preset, preset_item 테이블 Alembic migration (FK ondelete=CASCADE + CHECK)
  - downgrade() 포함
  - PresetItem/Preset 도메인 엔티티 + AbstractPresetRepository + SqlAlchemyPresetRepository
  - integration test 100% (CRUD + cascade)
  - merge + 배포

[B2] Use cases + API 엔드포인트 + rate limiting
  - 4개 Use case (Create/List/Delete/Apply)
  - 4개 endpoint + per-user rate limiter (key_func=user_id_key_func)
  - 404-unified 정책 + ambiguous_match 응답
  - unit + e2e 테스트 100%
  - merge + 배포 (FE 없어도 backend 안정 동작 가능)

[B3] Frontend (usePresets + Modal + AssetTable + page.tsx)
  - usePortfolioData에 replaceAccount 추가
  - usePresets, PresetManagerModal, AssetTable 변경, page.tsx 통합
  - vitest 100%, a11y 수동 검증
  - merge + 배포
```

### 8.2 롤백 시나리오

| 단계 | 회귀 발견 시 |
|------|-------------|
| A1 | `alembic stamp <prev>` + PR revert |
| A2 | backfill 결과 보존 후 PR revert (audit 데이터는 손실 없음) |
| A3 | PR revert. CHECK constraint도 downgrade()에서 제거 |
| B1 | PR revert. preset/preset_item 테이블 downgrade()로 drop |
| B2 | API PR revert. B1 DB 스키마는 unused 상태로 유지 가능 |
| B3 | FE PR revert. Backend API는 그대로 동작 (외부 호출 없음) |

> 각 stage 사이에 짧은 관찰 윈도우(최소 1시간) 후 다음 stage 진행. A3 → B1 사이는 1-2일 권장.

---

## 9. 완료 조건 (stage별 — §8.1과 1:1 매칭)

### A1 완료조건 — Alembic 도입
- [ ] `pyproject.toml`에 `alembic` 추가
- [ ] `backend/alembic/{env.py,script.py.mako,alembic.ini}` 작성 (§3.1.3 recipe 전체 적용)
- [ ] baseline migration (no-op) + `downgrade()` 구현
- [ ] CI에 `alembic upgrade head && alembic downgrade -1 && alembic upgrade head` 회귀 테스트 추가
- [ ] CI에 metadata-vs-migration 드리프트 검증 (`compare_metadata` 또는 `alembic check`)
- [ ] user_id middleware (§4.1) 추가 + 단위 테스트
- [ ] 기존 prod/staging DB에 `alembic stamp head` 실행 — runbook 첨부
- [ ] 기존 테스트 100% 통과

### A2 완료조건 — Audit + backfill
- [ ] 모든 환경에서 §3.1.2 강화된 audit 4개 쿼리 실행, 결과 PR 첨부
- [ ] 결과에 따른 결정 트리 (§3.1.2) 적용
- [ ] 필요 시 backfill migration 추가 (NULL/whitespace/unknown 정규화) + downgrade()
- [ ] backfill 후 audit 재실행 결과도 첨부 (idempotency 확인)

### A3 완료조건 — AssetCategory StrEnum
- [ ] `domain/enums.py`에 `AssetCategory` 정의 (audit 결과 반영한 멤버 set)
- [ ] 기존 Asset/Service/Model/DTO/routes 코드 모두 `AssetCategory` + `X | None` 적용 (§3.1.4)
- [ ] `_to_entity`에 명시적 `AssetCategory(value)` coercion 적용 (§3.1.1)
- [ ] DTO에 `model_config = ConfigDict(extra='forbid')` 적용
- [ ] DB CHECK constraint 마이그레이션 + `asset (account_id, code) WHERE code IS NOT NULL` partial unique index 마이그레이션 (모두 downgrade 포함)
- [ ] 기존 테스트 4개 파일 enum 상수로 교체
- [ ] `tests/unit/domain/test_enums.py` 신규 (3-카테고리)
- [ ] 백엔드 테스트 100% 통과, 커버리지 100%
- [ ] 1-2일 관찰 후 회귀 0건

### B1 완료조건 — Preset 도메인 + Repository
- [ ] `Preset`, `PresetItem` 도메인 엔티티 + `AbstractPresetRepository` 포트
- [ ] `SqlAlchemyPresetRepository` (명시적 `_to_entity` coercion, preset_id↔entity 변환)
- [ ] `preset`, `preset_item` 테이블 Alembic migration (FK ondelete=CASCADE + CHECK + downgrade)
- [ ] integration test (CRUD + cascade delete + downgrade)
- [ ] 백엔드 커버리지 100% 유지

### B2 완료조건 — Use cases + API + Rate limiting
- [ ] `use_cases/presets.py`에 CreatePresetUseCase, ListPresetsUseCase, DeletePresetUseCase, ApplyPresetUseCase
- [ ] 4개 endpoint + per-user rate limiter (key_func=user_id_key_func, §4.1)
- [ ] 404-unified 정책 (preset/account 모두 not-found OR wrong-owner → 404)
- [ ] `ambiguous_match` 응답 스키마 (item_indices만, asset name/code echo 금지)
- [ ] Pydantic `extra='forbid'` + `no_duplicate_match_key` validator + 명시적 user_id 바인딩
- [ ] e2e test: CRUD + apply 전체 + 모든 §4.4 에러 케이스
- [ ] 백엔드 커버리지 100%

### B3 완료조건 — Frontend
- [ ] `usePortfolioData.replaceAccount` 추가 (functional setState + auto-refresh race guard — §5.5 N1-V)
- [ ] vitest 회귀 테스트: Apply 후 stale auto-refresh 응답이 optimistic state 덮어쓰지 않음
- [ ] `usePresets` 훅 (fetch/create/delete/apply, error state, onError)
- [ ] `PresetManagerModal` 컴포넌트:
  - [ ] 불러오기 탭 (목록, 적용, 삭제 confirm)
  - [ ] 저장 탭 (이름 입력 with code-point counter, chip 미리보기)
  - [ ] Apply confirm 단계 (client-side dry-run으로 X update / Y create 표시)
  - [ ] `pendingMutation` 기반 계좌 전환 보호 (§5.3.5)
  - [ ] a11y: `aria-modal`, focus trap, Escape, `role=tablist`, focus 복귀
  - [ ] 429 처리: `Retry-After` 헤더 + sessionStorage cooldown
- [ ] `AssetTable` 툴바에 `📂 프리셋 관리` 버튼 (isGuest → disabled + tooltip)
- [ ] `frontend/src/app/page.tsx` 통합 (dynamic import + 조건부 마운트 + replaceAccount 콜백)
- [ ] vitest 100% 통과
- [ ] 수동 검증:
  - [ ] 프리셋 저장 → 다른 계좌에 적용 → updated/created 카운트 확인
  - [ ] 합계 ≠ 100% warning toast 확인
  - [ ] 게스트 모드 버튼 disabled 확인
  - [ ] 계좌 전환 시 in-flight save 처리 확인
  - [ ] Escape/Tab 키보드 a11y 확인
  - [ ] 429 후 refresh 시 cooldown 유지 확인

---

## 10. 금지 사항

- ❌ `Optional[X]` 사용 → ✅ `X | None`
- ❌ `category` magic string → ✅ `AssetCategory` StrEnum
- ❌ SA의 native Enum 자동 매핑에 의존 → ✅ `sa_column=Column(String)` 명시
- ❌ `create_all`로 컬럼 타입 변경 → ✅ Alembic migration
- ❌ wrong-owner 403 응답 → ✅ 404 통일 (existence oracle 방지)
- ❌ apply 시 매칭된 자산의 name/category 덮어쓰기 → ✅ target_weight만 업데이트
- ❌ apply 멀티 매치 silent 진행 → ✅ 400 `ambiguous_match`
- ❌ 프리셋에 평단가·수량·현재가 저장 → ✅ 종목명·코드·분류·비중만
- ❌ `PresetManagerModal`을 정적 import → ✅ `next/dynamic`
- ❌ `isOpen` boolean prop → ✅ 부모 조건부 마운트
- ❌ `setPresets([...presets, x])` → ✅ `setPresets(prev => [...prev, x])`
- ❌ 게스트 모드에서 프리셋 버튼 활성화 → ✅ disabled + tooltip
- ❌ Apply 즉시 실행 → ✅ confirm 단계 거침
- ❌ rate limit 없이 apply 노출 → ✅ per-user 30/minute
- ❌ name/code 길이 무제한 → ✅ Pydantic Field + DB 컬럼 max_length

---

## 11. 고려 사항

### 성능
- 프리셋 목록 조회 시 `items` eager loading (N+1 방지)
- 프론트엔드: `PresetManagerModal`은 동적 import로 초기 번들 미포함

### 보안
- IDOR 방지 + 404 unified 정책 (NFR-3)
- per-user rate limiting (NFR-6)
- 입력 검증 — Pydantic Field + DB max_length 이중 방어
- **사전 존재 어드바이저리** (본 작업 범위 외, 별도 추적 권장):
  - `main.py`의 CORS `allow_origins=["*"]` + `allow_credentials=True` 불일치
  - `main.py` lifespan의 시드 admin 계정 (`admin@example.com` / `admin1234`)

### UX 트레이드오프
- **Apply는 비파괴적이지만 사용자 의도(target_weight 편집)는 덮어씀** — FR-8 confirm으로 안전망
- **합계 != 100% silent 허용 vs 강제 검증** — 작업 중 strategy 보존 우선, 적용 시 warning toast로 인지 (FR-7)

### 확장성 — 미래 작업 (out-of-scope 명시)
- account-scope preset 확장: `Preset` 테이블에 `account_id` nullable FK 추가 (null = user-scope 호환)
- 프리셋 공유: `is_public` boolean 추가
- Dry-run 모드: apply use case에 `dry_run: bool = False` 파라미터 추가
- 위 노트는 현재 plan의 추상화 결정에 영향을 주지 않는다 — 단순 마이그레이션 경로만 표시

### Premise 보강
본 plan은 greenfield (origin 요구사항 doc 없음). 추후 검증 시그널:
- 사용자 1인당 평균 계좌 수 ≥ 2이면 user-range preset 유효
- 동일 종목 set이 여러 계좌에 반복 등장 빈도 ≥ 30%이면 가치 확인됨
- 위 시그널이 부정적이면 "duplicate this account" 단일 액션 MVP로 후퇴 검토

---

## 12. 제약 사항

- 백엔드: Python 3.12, FastAPI, SQLModel, Alembic, pytest 100% 커버리지
- 프론트엔드: React 19, Next.js 16, Vitest, Vercel best-practices
- DB: 기존 PostgreSQL/SQLite 호환
- 인증: 기존 JWT 인프라 재사용
- Plan A 선행 — Plan B는 Plan A 배포 + 관찰 완료 후 시작

---

## 13. 참고 자료

- 사용자 피드백 메모리:
  - `feedback-python-typing-style.md` — Optional 금지, StrEnum 사용
  - `feedback-vercel-skills-timing.md` — React/Next.js 설계 시 스킬 호출
  - `feedback-plan-validation-mandatory.md` — spec/plan 작성 후 2단계 검증 필수
- 프로젝트 규칙: `.claude/rules/python-domain-types.md` (StrEnum)
- Vercel 룰: `bundle-dynamic-imports`, `architecture-avoid-boolean-props`, `rerender-functional-setstate`
- 기존 패턴: API envelope 없음 (`snowball-api-no-envelope-pattern`)
- 도메인 패턴: `docs/solutions/security/idor-prevention.md`
- 도메인 룰: `.claude/rules/snowball-domain.md` (Total ratio ~100% 제약 — FR-7에서 명시적으로 완화)
- 본 spec 검증 이력: ce-doc-review 6-persona (coherence/feasibility/design/security/scope/adversarial) — 2026-05-28
