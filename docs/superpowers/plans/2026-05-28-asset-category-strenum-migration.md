# AssetCategory StrEnum 마이그레이션 (Plan A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 `category: str` magic string을 `AssetCategory` StrEnum으로 마이그레이션하고, Alembic을 도입하며, Plan B (Preset 기능)의 인프라(`user_id_middleware`, DB CHECK constraint, partial unique index)를 함께 준비한다.

**Architecture:** 3 stage로 분할 배포. A1은 Alembic 도입 + middleware (스키마 변경 0건), A2는 prod data audit + 필요 시 backfill, A3는 StrEnum + CHECK + partial unique index. 각 stage = 1 PR = 독립 배포·롤백 가능. SQLModel `sa_column=Column(String)`으로 기존 VARCHAR 호환 유지하되 repository `_to_entity`에서 명시적 `AssetCategory(value)` coercion.

**Tech Stack:** Python 3.12, FastAPI, SQLModel, SQLAlchemy 2.x, Alembic (신규), PyJWT, slowapi, pytest 100% coverage.

**Origin Spec:** `docs/superpowers/specs/2026-05-28-portfolio-presets-design.md`

---

## File Structure

### A1 단계 — 신규/수정 파일

| 파일 | 책임 |
|------|------|
| `backend/pyproject.toml` | alembic 의존성 추가 |
| `backend/alembic.ini` (신규) | Alembic 설정, DB URL은 환경변수 |
| `backend/alembic/env.py` (신규) | metadata = SQLModel.metadata, model imports, batch mode |
| `backend/alembic/script.py.mako` (신규) | `import sqlmodel` 포함 템플릿 |
| `backend/alembic/versions/0001_baseline.py` (신규) | no-op baseline migration |
| `backend/src/snowball/infrastructure/security.py` | (참고용 — A1에서는 미수정. JWT type check는 B2) |
| `backend/src/snowball/adapters/api/middleware.py` (신규) | `user_id_middleware` |
| `backend/src/snowball/infrastructure/main.py` | middleware 등록 |
| `backend/tests/unit/infrastructure/test_middleware.py` (신규) | middleware JWT decode + fallback 테스트 |
| `backend/tests/unit/infrastructure/test_alembic.py` (신규) | upgrade/downgrade round-trip + metadata drift 테스트 |
| `.github/workflows/ci.yml` 또는 `Makefile` | CI에 alembic round-trip 추가 |

### A2 단계 — 신규 파일

| 파일 | 책임 |
|------|------|
| `backend/alembic/versions/0002_backfill_asset_category.py` (조건부 신규) | NULL/whitespace/empty 정규화 |
| `docs/superpowers/plans/audit-results-YYYYMMDD.md` (신규) | audit 4개 쿼리 결과 + 결정 |

### A3 단계 — 신규/수정 파일

| 파일 | 책임 |
|------|------|
| `backend/src/snowball/domain/enums.py` (신규) | `AssetCategory` StrEnum |
| `backend/src/snowball/domain/entities.py` | `Asset.category` 타입 + `Optional[X]` → `X \| None` |
| `backend/src/snowball/domain/services.py` | `infer_category()` 반환 타입 + 내부 분기 enum 사용 |
| `backend/src/snowball/adapters/db/models.py` | `AssetModel.category` `sa_column=Column(String)` + `Optional` 정리 |
| `backend/src/snowball/adapters/db/repositories.py` | `_to_entity` 명시적 `AssetCategory(...)` coercion |
| `backend/src/snowball/adapters/api/dtos.py` | `category` 타입 변경 + `ConfigDict(extra='forbid')` |
| `backend/src/snowball/adapters/api/routes.py` | PATCH endpoint `update.category` 타입 |
| `backend/src/snowball/use_cases/sync.py` | `"주식"` → `AssetCategory.STOCK` |
| `backend/alembic/versions/0003_asset_category_constraints.py` (신규) | CHECK + partial unique index |
| `backend/tests/unit/domain/test_enums.py` (신규) | AssetCategory 3-카테고리 테스트 |
| `backend/tests/unit/domain/test_services.py` | parametrize 문자열 → enum 상수 |
| `backend/tests/unit/use_cases/test_asset_use_cases.py` | mock category → enum |
| `backend/tests/integration/test_repositories.py` | category 인자 → enum |
| `backend/tests/unit/scripts/test_manage.py` | category 인자 → enum |

---

## A1 단계 — Alembic 도입 + user_id middleware

### Task A1.1: alembic 의존성 추가

**Files:**
- Modify: `backend/pyproject.toml`

- [ ] **Step 1: Add alembic to dependencies**

`backend/pyproject.toml`의 `[project] dependencies` 배열 끝에 추가:

```toml
dependencies = [
    # ... 기존 항목들 ...
    "alembic>=1.13.0",
]
```

- [ ] **Step 2: Install**

```bash
cd backend && uv sync
```

Expected: alembic이 설치되고 `uv run alembic --version`이 1.13 이상 출력.

- [ ] **Step 3: Verify CLI available**

```bash
cd backend && uv run alembic --version
```

Expected: `1.13.x` 또는 그 이상.

- [ ] **Step 4: Commit**

```bash
git add backend/pyproject.toml backend/uv.lock
git commit -m "chore(deps): add alembic for schema migrations"
```

---

### Task A1.2: Alembic 디렉토리 초기화

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`
- Create: `backend/alembic/versions/` (빈 디렉토리, `.gitkeep` 포함)

- [ ] **Step 1: Init via CLI**

```bash
cd backend && uv run alembic init alembic
```

Expected: `alembic/`, `alembic.ini` 생성됨.

- [ ] **Step 2: Edit `backend/alembic.ini` — DB URL을 환경변수로 변경**

`sqlalchemy.url = ...` 줄을 다음으로 교체:

```ini
sqlalchemy.url = %(DATABASE_URL)s
```

`[alembic]` 섹션 상단의 `script_location = alembic` 확인 (기본값 유지).

- [ ] **Step 3: Overwrite `backend/alembic/env.py` 전체 내용**

`backend/alembic/env.py`를 다음으로 완전히 교체:

```python
"""Alembic environment configuration for snowball.

SQLModel + Alembic recipe:
- Import all model modules so metadata is populated
- target_metadata = SQLModel.metadata
- user_module_prefix = sqlmodel.sql.sqltypes. (for AutoString rendering)
- render_as_batch=True (SQLite ALTER limitations)
- compare_type=True, compare_server_default=True (catch column type changes)
"""

import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel
from alembic import context

# Import all model modules so they register with SQLModel.metadata.
# This MUST happen before target_metadata is referenced.
import sqlmodel.sql.sqltypes  # noqa: F401
from src.snowball.adapters.db.models import (  # noqa: F401
    UserModel,
    AccountModel,
    AssetModel,
)

config = context.config

# DATABASE_URL 환경변수에서 sqlalchemy.url 주입
db_url = os.environ.get("DATABASE_URL")
if db_url:
    config.set_main_option("sqlalchemy.url", db_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        user_module_prefix="sqlmodel.sql.sqltypes.",
        render_as_batch=True,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            user_module_prefix="sqlmodel.sql.sqltypes.",
            render_as_batch=True,
            compare_type=True,
            compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 4: Edit `backend/alembic/script.py.mako` — `import sqlmodel` 추가**

기존 import 영역 (보통 `from alembic import op` 다음 줄)에 다음 추가:

```mako
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes  # noqa: F401  (SQLModel AutoString 등)
${imports if imports else ""}
```

- [ ] **Step 5: Confirm directory structure**

```bash
ls backend/alembic/
```

Expected: `env.py`, `script.py.mako`, `README`, `versions/`.

- [ ] **Step 6: Commit**

```bash
git add backend/alembic.ini backend/alembic/
git commit -m "chore(db): initialize alembic with SQLModel-aware env.py"
```

---

### Task A1.3: Baseline migration (no-op)

**Files:**
- Create: `backend/alembic/versions/0001_baseline.py`

- [ ] **Step 1: Generate baseline migration via CLI**

```bash
cd backend && DATABASE_URL="sqlite:///:memory:" uv run alembic revision -m "baseline" --rev-id 0001_baseline
```

Expected: `backend/alembic/versions/0001_baseline_baseline.py` 생성됨.

- [ ] **Step 2: Rename file (옵션) 후 edit — upgrade/downgrade는 pass**

생성된 파일을 다음으로 교체:

```python
"""baseline (no-op)

Existing schema is assumed already created via SQLModel.metadata.create_all
in prior deployments. This baseline records the starting point so future
migrations can be linearized.

Revision ID: 0001_baseline
Revises:
Create Date: 2026-05-28
"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes  # noqa: F401

revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """No-op — baseline migration represents existing schema."""
    pass


def downgrade() -> None:
    """No-op — baseline has no reverse."""
    pass
```

- [ ] **Step 3: Test upgrade against in-memory SQLite (스키마 변경 없음)**

```bash
cd backend && DATABASE_URL="sqlite:///:memory:" uv run alembic upgrade head
```

Expected: `INFO [alembic.runtime.migration] Running upgrade -> 0001_baseline, baseline` 로그, 에러 없음.

- [ ] **Step 4: Test downgrade**

```bash
cd backend && DATABASE_URL="sqlite:///:memory:" uv run alembic downgrade base
```

Expected: 에러 없음.

- [ ] **Step 5: Commit**

```bash
git add backend/alembic/versions/0001_baseline.py
git commit -m "chore(db): add baseline alembic migration (no-op)"
```

---

### Task A1.4: CI alembic round-trip 테스트

**Files:**
- Modify: `backend/Makefile` (또는 CI config)
- Create: `backend/tests/unit/infrastructure/test_alembic.py`

- [ ] **Step 1: Write failing test for alembic round-trip**

`backend/tests/unit/infrastructure/test_alembic.py` 신규 작성:

```python
"""Alembic round-trip + metadata drift tests.

Catches:
- Migration that fails to upgrade
- Migration with broken downgrade
- Schema drift between SQLModel.metadata and migrations
"""
import subprocess
import os
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[3]


def _run_alembic(args: list[str], db_url: str = "sqlite:///:memory:") -> subprocess.CompletedProcess:
    env = {**os.environ, "DATABASE_URL": db_url}
    return subprocess.run(
        ["uv", "run", "alembic"] + args,
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
    )


def test_alembic_upgrade_head_succeeds():
    # [Happy] alembic upgrade head — 모든 migration 적용 성공
    result = _run_alembic(["upgrade", "head"])
    assert result.returncode == 0, f"upgrade failed: {result.stderr}"


def test_alembic_round_trip_upgrade_downgrade_upgrade():
    # [Boundary] upgrade head → downgrade -1 → upgrade head — 모든 downgrade 구현됐는지
    r1 = _run_alembic(["upgrade", "head"])
    assert r1.returncode == 0, r1.stderr
    r2 = _run_alembic(["downgrade", "-1"])
    assert r2.returncode == 0, r2.stderr
    r3 = _run_alembic(["upgrade", "head"])
    assert r3.returncode == 0, r3.stderr


def test_alembic_downgrade_to_base_succeeds():
    # [Boundary] downgrade base — 전체 reverse 가능 (cross-migration 가정 검증)
    _run_alembic(["upgrade", "head"])
    result = _run_alembic(["downgrade", "base"])
    assert result.returncode == 0, f"downgrade base failed: {result.stderr}"


def test_alembic_check_no_drift():
    # [Error] alembic check — SQLModel.metadata vs migration 차이 0건
    _run_alembic(["upgrade", "head"])
    result = _run_alembic(["check"])
    # alembic check returns 0 if no diff, non-zero otherwise
    assert result.returncode == 0, (
        "Schema drift detected between SQLModel.metadata and migrations:\n"
        f"{result.stdout}\n{result.stderr}"
    )
```

- [ ] **Step 2: Run test to verify it fails (현재 alembic check가 drift 발견할 가능성)**

```bash
cd backend && uv run pytest tests/unit/infrastructure/test_alembic.py -v
```

Expected: `test_alembic_upgrade_head_succeeds` PASS (no-op baseline), `test_alembic_check_no_drift` 가 FAIL — baseline에 schema가 없는데 SQLModel.metadata에는 있으므로 drift 감지됨.

> **참고**: A1에서는 baseline이 no-op이므로 drift는 의도된 상태. 이 테스트는 A3 완료 후에 통과시킬 것. 지금은 xfail 처리.

- [ ] **Step 3: Mark drift test as xfail until A3 completes**

`test_alembic_check_no_drift` 직전에:

```python
import pytest

@pytest.mark.xfail(reason="A3 완료 전까지는 baseline이 no-op이라 drift 발생 의도됨", strict=False)
def test_alembic_check_no_drift():
    ...
```

- [ ] **Step 4: Run all alembic tests**

```bash
cd backend && uv run pytest tests/unit/infrastructure/test_alembic.py -v
```

Expected: 3개 PASS + 1개 XFAIL.

- [ ] **Step 5: Commit**

```bash
git add backend/tests/unit/infrastructure/test_alembic.py
git commit -m "test(db): add alembic round-trip + drift check (xfail until A3)"
```

---

### Task A1.5: user_id_middleware 구현

**Files:**
- Create: `backend/src/snowball/adapters/api/middleware.py`
- Create: `backend/tests/unit/infrastructure/test_middleware.py`

- [ ] **Step 1: Write failing test**

`backend/tests/unit/infrastructure/test_middleware.py` 신규:

```python
"""user_id_middleware: JWT 가벼운 decode로 request.state.user_id 설정.

slowapi의 key_func가 FastAPI Depends를 받지 못하므로,
middleware 단계에서 user_id를 request.state에 미리 저장하여
per-user rate limiting을 가능케 한다.
"""
import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from uuid import uuid4

from src.snowball.adapters.api.middleware import user_id_middleware
from src.snowball.infrastructure.security import JWTService


@pytest.fixture
def app_with_middleware():
    app = FastAPI()
    app.middleware("http")(user_id_middleware)

    @app.get("/echo-user")
    def echo(request: Request):
        return {"user_id": getattr(request.state, "user_id", None)}

    return TestClient(app)


class TestUserIdMiddleware:
    def test_valid_jwt_sets_request_state_user_id(self, app_with_middleware):
        # [Happy] 유효 JWT → request.state.user_id 설정
        user_id = str(uuid4())
        token = JWTService().create_access_token({"sub": user_id})
        response = app_with_middleware.get(
            "/echo-user", headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        assert response.json()["user_id"] == user_id

    def test_missing_authorization_header_no_user_id(self, app_with_middleware):
        # [Boundary] Authorization 헤더 없음 → user_id 미설정 (None)
        response = app_with_middleware.get("/echo-user")
        assert response.status_code == 200
        assert response.json()["user_id"] is None

    def test_malformed_bearer_no_user_id(self, app_with_middleware):
        # [Boundary] Bearer prefix 없음 → user_id 미설정
        response = app_with_middleware.get(
            "/echo-user", headers={"Authorization": "NotBearer xxx"}
        )
        assert response.status_code == 200
        assert response.json()["user_id"] is None

    def test_invalid_jwt_signature_no_user_id(self, app_with_middleware):
        # [Error] 잘못된 서명 JWT → decode 실패 → user_id 미설정 (forge 차단)
        response = app_with_middleware.get(
            "/echo-user", headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.fake.signature"}
        )
        assert response.status_code == 200
        assert response.json()["user_id"] is None

    def test_expired_jwt_no_user_id(self, app_with_middleware, monkeypatch):
        # [Error] 만료 JWT → decode 실패 → user_id 미설정
        # JWTService의 expiry를 0초로 짧게 만들어 즉시 만료 토큰 생성
        import jwt
        from datetime import datetime, timedelta, timezone
        from src.snowball.infrastructure.security import JWTService
        payload = {
            "sub": str(uuid4()),
            "type": "access",
            "exp": datetime.now(timezone.utc) - timedelta(seconds=1),
        }
        expired_token = jwt.encode(
            payload, JWTService.SECRET_KEY, algorithm=JWTService.ALGORITHM
        )
        response = app_with_middleware.get(
            "/echo-user", headers={"Authorization": f"Bearer {expired_token}"}
        )
        assert response.status_code == 200
        assert response.json()["user_id"] is None
```

- [ ] **Step 2: Run test — expect FAIL (middleware 없음)**

```bash
cd backend && uv run pytest tests/unit/infrastructure/test_middleware.py -v
```

Expected: 모든 테스트 ImportError 또는 ModuleNotFoundError로 실패.

- [ ] **Step 3: Implement middleware**

`backend/src/snowball/adapters/api/middleware.py` 신규:

```python
"""HTTP middleware for snowball.

user_id_middleware: 가벼운 JWT decode로 request.state.user_id를 설정.
slowapi key_func가 FastAPI Depends()를 받지 못하므로 middleware에서 미리 처리.

decode 실패(서명/만료/형식 등) 시 silently skip — 인증 자체는
get_current_user 의존성이 별도로 검증하므로 보안 영향 없음.
"""
from fastapi import Request

from ...infrastructure.security import JWTService


async def user_id_middleware(request: Request, call_next):
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        token = auth[7:].strip()
        try:
            payload = JWTService().decode_token(token)
            if payload and "sub" in payload:
                request.state.user_id = payload["sub"]
        except Exception:
            # decode 실패 시 user_id 미설정 (rate limiter는 IP로 fallback)
            pass
    return await call_next(request)
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd backend && uv run pytest tests/unit/infrastructure/test_middleware.py -v
```

Expected: 5/5 PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/snowball/adapters/api/middleware.py backend/tests/unit/infrastructure/test_middleware.py
git commit -m "feat(api): add user_id_middleware for per-user rate limiting"
```

---

### Task A1.6: middleware 등록 + 통합 확인

**Files:**
- Modify: `backend/src/snowball/infrastructure/main.py`

- [ ] **Step 1: Read current main.py middleware setup**

```bash
cd backend && grep -n "middleware\|app =\|CORSMiddleware" src/snowball/infrastructure/main.py
```

CORSMiddleware 등록 위치 확인 후 그 다음 줄에 user_id_middleware 등록.

- [ ] **Step 2: Add middleware registration**

`backend/src/snowball/infrastructure/main.py`의 CORSMiddleware 등록 다음에 추가:

```python
from ..adapters.api.middleware import user_id_middleware

# ... existing app, CORSMiddleware ...

app.middleware("http")(user_id_middleware)
```

> **주의**: FastAPI/Starlette의 `app.middleware()` 등록은 **역순**으로 실행되므로, user_id_middleware는 limiter middleware(있다면) 와 무관하게 `@limiter.limit` 데코레이터가 request에 도달하기 전에 항상 먼저 실행된다. key_func는 request-time에 호출되므로 순서 무관.

- [ ] **Step 3: Verify with quick smoke test**

```bash
cd backend && uv run uvicorn main:app --port 8001 &
sleep 2
curl -s http://localhost:8001/api/v1/accounts -H "Authorization: Bearer invalid"
kill %1
```

Expected: 401 (인증 실패) — middleware는 decode 실패해도 silently 통과, get_current_user가 401 반환.

- [ ] **Step 4: All backend tests still pass**

```bash
cd backend && uv run pytest -v
```

Expected: 모든 기존 테스트 + 새 middleware 테스트 모두 PASS, coverage 100%.

- [ ] **Step 5: Commit**

```bash
git add backend/src/snowball/infrastructure/main.py
git commit -m "feat(app): register user_id_middleware in FastAPI app"
```

---

### Task A1.7: 기존 prod/staging DB stamp head runbook

**Files:**
- Create: `backend/docs/alembic-runbook.md`

> A1을 배포하기 전, **기존 운영 DB에 `alembic stamp head`**를 실행해야 한다. 그렇지 않으면 alembic이 "현재 schema가 baseline 이전 상태"로 판단하고 추후 migration이 충돌할 수 있다.

- [ ] **Step 1: Write runbook**

`backend/docs/alembic-runbook.md` 신규:

```markdown
# Alembic Runbook

## 최초 배포 (Plan A1 도입 시)

기존 DB에 schema가 이미 존재하는 환경(prod, staging)에 alembic을 도입할 때:

```bash
# 1. 환경변수 설정
export DATABASE_URL="postgresql://..."

# 2. baseline migration을 "이미 적용됨"으로 stamp
cd backend && uv run alembic stamp head

# 3. 확인
uv run alembic current
# 출력: 0001_baseline (head)
```

이 단계 없이 `alembic upgrade head`를 실행하면 baseline의 `op.create_table(...)` 들이 기존 테이블에 충돌하지 않지만 (baseline은 no-op), 후속 migration이 "stamp가 안 됨" 상태로 판단되어 적용 안 될 수 있다.

## 매 배포

```bash
cd backend && uv run alembic upgrade head
```

## 롤백

```bash
cd backend && uv run alembic downgrade -1
```

## 신규 migration 생성

```bash
cd backend && uv run alembic revision --autogenerate -m "설명"
```

**autogenerate 결과는 반드시 수동 검토.** column type 변경, server defaults, indexes, CHECK constraint는 자주 누락된다.
```

- [ ] **Step 2: Commit**

```bash
git add backend/docs/alembic-runbook.md
git commit -m "docs(db): add alembic runbook for initial deploy + ops"
```

---

### Task A1.8: A1 완료 검증

- [ ] **Step 1: Run full test suite**

```bash
cd backend && uv run pytest --cov-fail-under=100 -v
```

Expected: 모든 테스트 PASS, coverage ≥ 100%.

- [ ] **Step 2: Verify alembic CLI works**

```bash
cd backend && DATABASE_URL="sqlite:///:memory:" uv run alembic current
```

Expected: 빈 출력 (in-memory DB는 stamp 없음) 또는 head.

- [ ] **Step 3: A1 stage 종료 — merge & deploy**

PR을 만들고 머지 후 prod/staging에 다음 순서로 배포:

1. 코드 배포
2. 즉시 `alembic stamp head` 실행 (Task A1.7 runbook 참고)
3. 1시간 관찰

---

## A2 단계 — Audit + 필요 시 backfill

### Task A2.1: 강화된 audit 실행 + 결과 캡처

**Files:**
- Create: `docs/superpowers/plans/audit-results-YYYYMMDD.md`

- [ ] **Step 1: Run 5 audit queries on each environment**

각 환경 (dev / staging / prod)에 대해 다음을 실행하고 결과 캡처:

```sql
-- 1. DISTINCT 값 + 카운트
SELECT DISTINCT category, COUNT(*) FROM asset GROUP BY category;

-- 2. NULL 존재
SELECT COUNT(*) FROM asset WHERE category IS NULL;

-- 3. trailing whitespace
SELECT COUNT(*) FROM asset WHERE category != TRIM(category);

-- 4. 빈 문자열
SELECT COUNT(*) FROM asset WHERE category = '';

-- 5. (account_id, code) duplicate (partial unique index 실패 방지)
SELECT account_id, code, COUNT(*) AS dup_count
FROM asset
WHERE code IS NOT NULL
GROUP BY account_id, code
HAVING COUNT(*) > 1;
```

- [ ] **Step 2: Document results**

`docs/superpowers/plans/audit-results-YYYYMMDD.md` 신규 (날짜는 실행일):

```markdown
# Audit Results — asset.category + (account_id, code)

**Date:** YYYY-MM-DD
**Environments:** dev, staging, prod

## Query 1: DISTINCT category values

### prod
| category | count |
|----------|-------|
| ... | ... |

### staging
...

### dev
...

## Query 2: NULL category

prod: N rows
staging: N rows
dev: N rows

## Query 3: trailing whitespace

prod: N rows
...

## Query 4: empty string

prod: N rows
...

## Query 5: duplicate (account_id, code)

prod: N rows
staging: N rows
dev: N rows

## Decision

[다음 중 선택]
- 모든 값이 enum 멤버와 일치 + NULL/whitespace/empty/duplicate 0건 → A3 진행
- 알 수 없는 값 N개 (≤5) → enum에 추가 후 A3 진행
- 알 수 없는 값 N개 (>5) 또는 의미 불명확 → A2 backfill migration 필요
- NULL/whitespace/empty 존재 → A2 backfill migration 필요
- duplicate (account_id, code) 존재 → 수동 정리 또는 backfill 필요
```

- [ ] **Step 3: Commit results document**

```bash
git add docs/superpowers/plans/audit-results-*.md
git commit -m "docs(db): capture asset.category audit results pre-A3"
```

---

### Task A2.2: (조건부) Backfill migration

> 이 task는 A2.1 결과에 따라 **조건부**로 진행한다. 모든 audit 결과가 clean이면 스킵.

**Files:**
- Create: `backend/alembic/versions/0002_backfill_asset_category.py` (조건부)

- [ ] **Step 1: Generate migration skeleton**

```bash
cd backend && DATABASE_URL="sqlite:///:memory:" uv run alembic revision -m "backfill asset.category" --rev-id 0002_backfill
```

- [ ] **Step 2: Edit migration**

생성된 `backend/alembic/versions/0002_backfill_*.py` 내용을 audit 결과에 맞춰 작성:

```python
"""backfill asset.category

Normalize NULL/whitespace/empty values + map unknown values to known enum.

Revision ID: 0002_backfill
Revises: 0001_baseline
"""
from alembic import op
import sqlalchemy as sa


revision = "0002_backfill"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # NULL → '주식' (audit Query 2 결과에 따라)
    op.execute("UPDATE asset SET category = '주식' WHERE category IS NULL")
    # trim whitespace
    op.execute("UPDATE asset SET category = TRIM(category) WHERE category != TRIM(category)")
    # empty string → '주식'
    op.execute("UPDATE asset SET category = '주식' WHERE category = ''")
    # 알 수 없는 값 처리 (audit 결과에 맞춰 추가)
    # 예: op.execute("UPDATE asset SET category = '주식' WHERE category = '펀드'")


def downgrade() -> None:
    # Best-effort: 원복 불가 (NULL이었던 row를 다시 NULL로 만들 수 없음).
    # 의도적 no-op + 경고 로그.
    op.execute("SELECT 'WARNING: 0002_backfill downgrade is best-effort no-op'")
```

- [ ] **Step 3: Test on copy of staging DB**

staging DB snapshot을 dump해서 로컬에 import 후:

```bash
cd backend && DATABASE_URL="postgresql://localhost/staging_copy" uv run alembic upgrade head
```

- [ ] **Step 4: Re-run audit queries — idempotency 확인**

A2.1의 query 2/3/4가 모두 0 반환하는지 확인. 결과를 audit-results 문서에 추가:

```markdown
## Post-backfill verification

NULL count: 0 ✅
whitespace count: 0 ✅
empty count: 0 ✅
```

- [ ] **Step 5: Commit + deploy**

```bash
git add backend/alembic/versions/0002_backfill*.py docs/superpowers/plans/audit-results-*.md
git commit -m "fix(db): backfill asset.category to normalize NULL/whitespace/empty"
```

PR merge 후 staging/prod에서 `alembic upgrade head` 실행.

---

## A3 단계 — AssetCategory StrEnum + CHECK + partial unique index

### Task A3.1: AssetCategory enum 정의 + 테스트

**Files:**
- Create: `backend/src/snowball/domain/enums.py`
- Create: `backend/tests/unit/domain/test_enums.py`

- [ ] **Step 1: Write failing tests**

`backend/tests/unit/domain/test_enums.py` 신규:

```python
"""AssetCategory StrEnum tests (Happy/Boundary/Error)."""
import pytest
from src.snowball.domain.enums import AssetCategory


class TestAssetCategoryMembers:
    def test_all_expected_members_exist(self):
        # [Happy] 모든 멤버 정의됨
        assert AssetCategory.STOCK.value == "주식"
        assert AssetCategory.BOND.value == "채권"
        assert AssetCategory.COMMODITY.value == "원자재"
        assert AssetCategory.CASH.value == "현금"
        assert AssetCategory.OTHER.value == "기타"

    def test_strenum_equals_raw_str(self):
        # [Boundary] StrEnum은 str과 동등 비교 가능
        assert AssetCategory.STOCK == "주식"
        assert "주식" == AssetCategory.STOCK

    def test_strenum_str_returns_value(self):
        # [Boundary] str(member) → value (StrEnum 기본 동작)
        assert str(AssetCategory.STOCK) == "주식"

    def test_isinstance_str(self):
        # [Boundary] StrEnum은 str 인스턴스
        assert isinstance(AssetCategory.STOCK, str)

    def test_construction_from_value(self):
        # [Boundary] 문자열 값으로 enum 생성
        assert AssetCategory("주식") is AssetCategory.STOCK

    def test_invalid_value_raises(self):
        # [Error] 잘못된 값 → ValueError
        with pytest.raises(ValueError):
            AssetCategory("알수없음")
```

- [ ] **Step 2: Run — expect ImportError**

```bash
cd backend && uv run pytest tests/unit/domain/test_enums.py -v
```

Expected: ImportError on `from src.snowball.domain.enums import AssetCategory`.

- [ ] **Step 3: Create enum module**

`backend/src/snowball/domain/enums.py` 신규:

```python
"""Domain enums.

AssetCategory: 자산 분류. magic string 사용 금지 — 항상 이 enum 참조.
"""
from enum import StrEnum


class AssetCategory(StrEnum):
    STOCK     = "주식"
    BOND      = "채권"
    COMMODITY = "원자재"
    CASH      = "현금"
    OTHER     = "기타"
    # 향후 audit 결과에 따라 멤버 추가 가능 (FOREIGN_STOCK = "해외주식" 등)
```

> A2.1 audit 결과에 따라 추가 멤버를 여기에 정의. 본 plan은 기본 5개로 진행.

- [ ] **Step 4: Run — expect PASS**

```bash
cd backend && uv run pytest tests/unit/domain/test_enums.py -v
```

Expected: 6/6 PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/snowball/domain/enums.py backend/tests/unit/domain/test_enums.py
git commit -m "feat(domain): add AssetCategory StrEnum"
```

---

### Task A3.2: domain/entities.py — Asset.category 타입 변경 + Optional 정리

**Files:**
- Modify: `backend/src/snowball/domain/entities.py`

- [ ] **Step 1: Read current file**

```bash
cd backend && cat src/snowball/domain/entities.py
```

- [ ] **Step 2: Apply changes**

`backend/src/snowball/domain/entities.py`를 다음으로 교체:

```python
from dataclasses import dataclass, field
from typing import NewType
from datetime import datetime
from uuid import UUID, uuid4

from .enums import AssetCategory

UserId = NewType("UserId", UUID)


@dataclass(frozen=True)
class Password:
    value: str


@dataclass
class User:
    email: str
    password_hash: str
    id: UserId = field(default_factory=lambda: UserId(uuid4()))
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Asset:
    name: str
    account_id: int
    id: int | None = None
    code: str | None = None
    category: AssetCategory = AssetCategory.STOCK
    target_weight: float = 0.0
    current_price: float = 0.0
    avg_price: float = 0.0
    quantity: float = 0.0


@dataclass
class Account:
    name: str
    user_id: UserId
    cash: float = 0.0
    id: int | None = None
    assets: list[Asset] = field(default_factory=list)


@dataclass
class AssetCalculationResult:
    asset: Asset
    current_value: float
    invested_amount: float
    pl_amount: float
    pl_rate: float
    current_weight: float
    target_value: float
    diff_value: float
    action: str  # BUY, SELL, HOLD
    action_quantity: int


@dataclass
class PortfolioCalculationResult:
    account: Account
    total_asset_value: float
    total_invested_value: float
    total_pl_amount: float
    total_pl_rate: float
    assets: list[AssetCalculationResult]
```

- [ ] **Step 3: Run domain tests — 일부는 fail 예상**

```bash
cd backend && uv run pytest tests/unit/domain/ -v
```

Expected: test_services 등 기존 magic string 테스트는 통과 (StrEnum이 str과 동등), 새 enum 테스트도 PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/snowball/domain/entities.py
git commit -m "feat(domain): switch Asset.category to AssetCategory, modernize Optional"
```

---

### Task A3.3: domain/services.py — infer_category 반환 타입 변경

**Files:**
- Modify: `backend/src/snowball/domain/services.py`
- Modify: `backend/tests/unit/domain/test_services.py`

- [ ] **Step 1: Update infer_category**

`backend/src/snowball/domain/services.py`를 다음으로 교체:

```python
from .enums import AssetCategory


def infer_category(name: str, code: str) -> AssetCategory:
    """Infer asset category based on name and code keywords."""
    name_upper = name.upper()

    bond_keywords = [
        "채권", "국고채", "단기채", "중기채", "회사채", "전단채", "국채", "미국채",
        "BOND", "TREASURY", "TIPS", "TLT", "IEF", "SHY", "BND", "AGG", "JNK", "HYG",
    ]
    if any(k in name_upper for k in bond_keywords):
        return AssetCategory.BOND

    raw_keywords = [
        "골드", "금선물", "은선물", "구리", "원유", "콩", "옥수수", "농산물",
        "GOLD", "SILVER", "OIL", "COMMODITY", "GLD", "IAU", "SLV", "DBC", "PDBC", "USO",
    ]
    if any(k in name_upper for k in raw_keywords):
        return AssetCategory.COMMODITY

    cash_keywords = ["달러선물", "USDOLLAR", "SHV", "BIL"]
    if any(k in name_upper for k in cash_keywords):
        return AssetCategory.CASH

    return AssetCategory.STOCK
```

- [ ] **Step 2: Update test_services.py parametrize to use enum**

`backend/tests/unit/domain/test_services.py`를 다음으로 교체:

```python
import pytest
from src.snowball.domain.enums import AssetCategory
from src.snowball.domain.services import infer_category


@pytest.mark.parametrize("name,code,expected", [
    ("삼성전자", "005930", AssetCategory.STOCK),
    ("APPLE", "AAPL", AssetCategory.STOCK),
    ("KOSEF 국고채 10년", "148070", AssetCategory.BOND),
    ("TIGER 미국채10년선물", "305080", AssetCategory.BOND),
    ("SHY", "SHY", AssetCategory.BOND),
    ("KODEX 골드선물(H)", "132030", AssetCategory.COMMODITY),
    ("WTI Crude Oil", "OIL", AssetCategory.COMMODITY),
    ("KODEX 미국달러선물", "261240", AssetCategory.CASH),
    ("BIL", "BIL", AssetCategory.CASH),
])
def test_infer_category_happy_path(name, code, expected):
    # [Happy]
    assert infer_category(name, code) == expected


@pytest.mark.parametrize("name,code,expected", [
    ("", "", AssetCategory.STOCK),            # Empty defaults
    ("shy", "shy", AssetCategory.BOND),       # Case insensitive
    ("Gold", "GOLD", AssetCategory.COMMODITY),
    ("Gold Bond", "", AssetCategory.BOND),    # Priority Bond > Commodity
])
def test_infer_category_edge_cases(name, code, expected):
    # [Boundary]
    assert infer_category(name, code) == expected


def test_infer_category_returns_assetcategory_type():
    # [Error/contract] 반환 타입이 AssetCategory여야 (str이 아니라)
    result = infer_category("삼성전자", "005930")
    assert isinstance(result, AssetCategory)
```

- [ ] **Step 3: Run tests — expect PASS**

```bash
cd backend && uv run pytest tests/unit/domain/test_services.py -v
```

Expected: 13/13 PASS + isinstance 테스트도 PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/snowball/domain/services.py backend/tests/unit/domain/test_services.py
git commit -m "feat(domain): infer_category returns AssetCategory enum"
```

---

### Task A3.4: adapters/db/models.py — sa_column + nullable=False

**Files:**
- Modify: `backend/src/snowball/adapters/db/models.py`

- [ ] **Step 1: Update model**

`backend/src/snowball/adapters/db/models.py`를 다음으로 교체:

```python
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import String, Column
from sqlmodel import Field, SQLModel, Relationship

from ...domain.enums import AssetCategory


class UserModel(SQLModel, table=True):
    __tablename__ = "user"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    accounts: list["AccountModel"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete"},
    )


class AccountModel(SQLModel, table=True):
    __tablename__ = "account"
    id: int | None = Field(default=None, primary_key=True)
    name: str
    cash: float = 0.0
    user_id: UUID = Field(foreign_key="user.id", index=True)

    user: UserModel | None = Relationship(back_populates="accounts")
    assets: list["AssetModel"] = Relationship(
        back_populates="account",
        sa_relationship_kwargs={"cascade": "all, delete"},
    )


class AssetModel(SQLModel, table=True):
    __tablename__ = "asset"
    id: int | None = Field(default=None, primary_key=True)
    account_id: int | None = Field(default=None, foreign_key="account.id")
    name: str
    code: str | None = None
    category: AssetCategory = Field(
        default=AssetCategory.STOCK,
        sa_column=Column(String, nullable=False, default=AssetCategory.STOCK.value),
    )
    target_weight: float = 0.0
    current_price: float = 0.0
    avg_price: float = 0.0
    quantity: float = 0.0

    account: AccountModel | None = Relationship(back_populates="assets")
```

- [ ] **Step 2: Run integration tests — 일부 typing 오류 예상**

```bash
cd backend && uv run pytest tests/integration/test_repositories.py -v
```

Expected: 일부 fail — `category="주식"` 인자가 여전히 str이지만 SQLModel은 호환 처리. 실제 fail은 `isinstance(asset.category, AssetCategory)` 가정하는 곳에서 발생 (다음 task에서 해결).

- [ ] **Step 3: Commit**

```bash
git add backend/src/snowball/adapters/db/models.py
git commit -m "feat(db): AssetModel.category uses AssetCategory + explicit sa_column"
```

---

### Task A3.5: adapters/db/repositories.py — _to_entity 명시적 coercion

**Files:**
- Modify: `backend/src/snowball/adapters/db/repositories.py`

- [ ] **Step 1: Locate _to_entity functions**

```bash
cd backend && grep -n "_to_entity\|_to_asset_entity\|category=" src/snowball/adapters/db/repositories.py
```

- [ ] **Step 2: Add explicit AssetCategory coercion in all locations**

`_to_entity` (`SqlAlchemyAssetRepository`)와 `_to_asset_entity` (`SqlAlchemyAccountRepository`)에서 `category=model.category` 부분을 `category=AssetCategory(model.category)`로 변경.

파일 상단 import 추가:

```python
from ...domain.enums import AssetCategory
```

각 변환 함수:

```python
def _to_entity(self, model: AssetModel) -> Asset:
    if model.account_id is None:
        raise ValueError("AssetModel has no account_id")
    return Asset(
        id=model.id,
        account_id=model.account_id,
        name=model.name,
        code=model.code,
        category=AssetCategory(model.category),  # ← 명시적 coercion
        target_weight=model.target_weight,
        current_price=model.current_price,
        avg_price=model.avg_price,
        quantity=model.quantity,
    )
```

`_to_asset_entity` 도 동일하게 수정.

- [ ] **Step 3: Add regression test for coercion**

`backend/tests/integration/test_repositories.py`에 추가:

```python
def test_repo_returns_assetcategory_type_not_str(session, sample_account):
    # [Error contract] _to_entity는 AssetCategory 인스턴스를 반환해야
    # (sa_column=Column(String)은 raw str을 반환하므로 명시적 coercion 필수)
    from src.snowball.domain.enums import AssetCategory
    from src.snowball.adapters.db.repositories import SqlAlchemyAssetRepository

    repo = SqlAlchemyAssetRepository(session)
    asset = repo.save(Asset(
        name="Test", account_id=sample_account.id,
        category=AssetCategory.BOND,
    ))
    reloaded = repo.get(asset.id)
    assert isinstance(reloaded.category, AssetCategory)
    assert reloaded.category is AssetCategory.BOND
```

- [ ] **Step 4: Run all repository tests**

```bash
cd backend && uv run pytest tests/integration/ -v
```

Expected: 모든 테스트 PASS, 새 isinstance 테스트 포함.

- [ ] **Step 5: Commit**

```bash
git add backend/src/snowball/adapters/db/repositories.py backend/tests/integration/test_repositories.py
git commit -m "feat(repo): explicit AssetCategory(value) coercion in _to_entity"
```

---

### Task A3.6: adapters/api/dtos.py — category 타입 + extra='forbid'

**Files:**
- Modify: `backend/src/snowball/adapters/api/dtos.py`

- [ ] **Step 1: Read current DTOs**

```bash
cd backend && cat src/snowball/adapters/api/dtos.py
```

- [ ] **Step 2: Apply changes**

상단 import에 추가:

```python
from pydantic import BaseModel, ConfigDict
from ...domain.enums import AssetCategory
```

기존 `Optional[str]` → `str | None`, 기존 `category: str = "주식"` → `category: AssetCategory = AssetCategory.STOCK`, 모든 request DTO (Create/Update)에 `model_config = ConfigDict(extra="forbid")` 추가.

예시 (전체 적용):

```python
class AssetBase(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    code: str | None = None
    category: AssetCategory = AssetCategory.STOCK
    target_weight: float = 0.0
    current_price: float = 0.0
    avg_price: float = 0.0
    quantity: float = 0.0


class AssetCreate(AssetBase):
    account_id: int


class AssetUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str | None = None
    code: str | None = None
    category: AssetCategory | None = None
    target_weight: float | None = None
    current_price: float | None = None
    avg_price: float | None = None
    quantity: float | None = None


class AssetResponse(AssetBase):
    id: int
    account_id: int


class AssetCalculatedResponse(AssetResponse):
    current_value: float
    invested_amount: float
    pl_amount: float
    pl_rate: float
    current_weight: float
    target_value: float
    diff_value: float
    action: str
    action_quantity: int
```

(다른 DTOs — Account/User/Auth는 그대로, Optional만 `| None` 으로 변환)

- [ ] **Step 3: Add test for extra='forbid' rejection**

`backend/tests/unit/adapters/test_dtos.py` 신규 (없으면):

```python
import pytest
from pydantic import ValidationError
from src.snowball.adapters.api.dtos import AssetCreate, AssetUpdate
from src.snowball.domain.enums import AssetCategory


def test_asset_create_rejects_extra_fields():
    # [Error] extra='forbid' — 모르는 필드는 거부
    with pytest.raises(ValidationError):
        AssetCreate(
            account_id=1, name="Test", category=AssetCategory.STOCK,
            user_id="forged-uuid",  # ← extra 필드
        )


def test_asset_update_rejects_extra_fields():
    with pytest.raises(ValidationError):
        AssetUpdate(target_weight=10, account_id=2)  # account_id는 update 대상 아님


def test_asset_create_accepts_assetcategory_value_string():
    # [Boundary] 문자열 "주식"도 AssetCategory로 coerce되어 허용
    dto = AssetCreate(account_id=1, name="Test", category="주식")
    assert dto.category is AssetCategory.STOCK
```

- [ ] **Step 4: Run DTO + API tests**

```bash
cd backend && uv run pytest tests/unit/adapters/ tests/e2e/ -v
```

Expected: 모든 테스트 PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/snowball/adapters/api/dtos.py backend/tests/unit/adapters/test_dtos.py
git commit -m "feat(api): DTOs use AssetCategory + extra='forbid'"
```

---

### Task A3.7: adapters/api/routes.py — PATCH endpoint update.category 타입

**Files:**
- Modify: `backend/src/snowball/adapters/api/routes.py`

- [ ] **Step 1: PATCH endpoint은 이미 update.category를 그대로 위임**

`AssetUpdate.category`가 `AssetCategory | None`이 되었으므로 routes.py에 별도 변경은 거의 없음. 단, `update.category is not None: existing.category = update.category` 가 enum 인스턴스를 그대로 저장하는지 확인.

```bash
cd backend && grep -n "update.category" src/snowball/adapters/api/routes.py
```

기존:
```python
if update.category is not None: existing.category = update.category
```

→ 변경 불필요 (enum 인스턴스가 그대로 entity field에 할당됨).

- [ ] **Step 2: Run e2e tests including PATCH**

```bash
cd backend && uv run pytest tests/e2e/test_assets.py -v
```

Expected: 모든 PATCH 관련 테스트 PASS.

- [ ] **Step 3: (변경 없으면 commit 스킵)**

이 task는 검증만. 다음 task로 진행.

---

### Task A3.8: use_cases/sync.py — 기본값 enum 사용

**Files:**
- Modify: `backend/src/snowball/use_cases/sync.py`

- [ ] **Step 1: Locate hardcoded "주식"**

```bash
cd backend && grep -n '"주식"' src/snowball/use_cases/sync.py
```

기존:
```python
category=local_asset.get("category", "주식"),
```

- [ ] **Step 2: Update**

상단 import 추가:
```python
from ..domain.enums import AssetCategory
```

해당 라인 수정:
```python
category=AssetCategory(local_asset.get("category", AssetCategory.STOCK.value)),
```

- [ ] **Step 3: Run sync tests**

```bash
cd backend && uv run pytest tests/unit/use_cases/test_sync.py -v
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/snowball/use_cases/sync.py
git commit -m "feat(sync): use AssetCategory.STOCK as default"
```

---

### Task A3.9: 나머지 기존 테스트 마이그레이션

**Files:**
- Modify: `backend/tests/unit/use_cases/test_asset_use_cases.py`
- Modify: `backend/tests/integration/test_repositories.py`
- Modify: `backend/tests/unit/scripts/test_manage.py`

- [ ] **Step 1: Bulk replace `"주식"` etc. with enum constants**

각 파일에서 mock 데이터/argument의 `"주식"`, `"채권"` 등을 `AssetCategory.STOCK`, `AssetCategory.BOND` 등으로 교체.

상단 import 추가:
```python
from src.snowball.domain.enums import AssetCategory
```

예시 (test_asset_use_cases.py):
```python
mock_market.fetch_asset_info.return_value = {
    "name": "Samsung",
    "price": 70000.0,
    "category": AssetCategory.STOCK,
}
```

(JSON 응답 비교 테스트는 그대로 — StrEnum이 "주식"으로 직렬화되므로 문자열 비교 통과)

- [ ] **Step 2: Run full test suite**

```bash
cd backend && uv run pytest -v
```

Expected: 모든 테스트 PASS, coverage 100%.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/
git commit -m "test: migrate existing tests to AssetCategory enum constants"
```

---

### Task A3.10: CHECK constraint + partial unique index migration

**Files:**
- Create: `backend/alembic/versions/0003_asset_category_constraints.py`

- [ ] **Step 1: Generate migration**

```bash
cd backend && DATABASE_URL="sqlite:///:memory:" uv run alembic revision -m "asset category check + partial unique" --rev-id 0003_asset_constraints
```

- [ ] **Step 2: Edit migration**

생성된 파일 내용:

```python
"""asset category check + partial unique on (account_id, code)

Revision ID: 0003_asset_constraints
Revises: 0002_backfill (또는 0001_baseline if no backfill)
Create Date: 2026-05-28
"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes  # noqa: F401


revision = "0003_asset_constraints"
down_revision = "0002_backfill"  # backfill 안 했으면 "0001_baseline"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # CHECK constraint — audit 결과 enum 멤버에 맞춰 작성
    op.create_check_constraint(
        "ck_asset_category_enum",
        "asset",
        "category IN ('주식', '채권', '원자재', '현금', '기타')",
    )

    # Partial unique index — code가 NULL이 아닌 경우 (account_id, code) 유일
    op.create_index(
        "uq_asset_account_code",
        "asset",
        ["account_id", "code"],
        unique=True,
        postgresql_where=sa.text("code IS NOT NULL"),
        sqlite_where=sa.text("code IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_asset_account_code", table_name="asset")
    op.drop_constraint("ck_asset_category_enum", "asset", type_="check")
```

- [ ] **Step 3: Test round-trip**

```bash
cd backend && DATABASE_URL="sqlite:///:memory:" uv run alembic upgrade head
cd backend && DATABASE_URL="sqlite:///:memory:" uv run alembic downgrade -1
cd backend && DATABASE_URL="sqlite:///:memory:" uv run alembic upgrade head
```

Expected: 모두 성공.

- [ ] **Step 4: Verify CI alembic_check test now passes**

`test_alembic_check_no_drift`의 xfail 마커 제거:

```python
# 기존
@pytest.mark.xfail(reason="A3 완료 전까지는 baseline이 no-op이라 drift 발생 의도됨", strict=False)
def test_alembic_check_no_drift():
# 수정 — 마커 제거
def test_alembic_check_no_drift():
```

```bash
cd backend && uv run pytest tests/unit/infrastructure/test_alembic.py -v
```

Expected: 4/4 PASS (xfail 없이).

- [ ] **Step 5: Commit**

```bash
git add backend/alembic/versions/0003_asset_constraints.py backend/tests/unit/infrastructure/test_alembic.py
git commit -m "feat(db): add CHECK + partial unique constraints for asset table"
```

---

### Task A3.11: A3 완료 검증 + 배포

- [ ] **Step 1: Full test suite + 100% coverage**

```bash
cd backend && uv run pytest --cov-fail-under=100 -v
```

Expected: 모든 PASS, coverage 100%.

- [ ] **Step 2: Type check**

```bash
cd backend && uv run mypy src/
```

Expected: 0 errors (또는 기존 baseline 유지).

- [ ] **Step 3: PR merge & deploy A3**

1. 배포 전 audit 5개 query 한 번 더 실행 (drift 없는지)
2. `alembic upgrade head` 실행
3. 1-2일 관찰

- [ ] **Step 4: 회귀 0건 확인**

dashboard/asset list/CRUD/PATCH 모든 경로 수동 smoke 테스트. 회귀 발생 시 PR revert 후 downgrade.

---

## A 완료 → B 시작 게이트

A3까지 prod 배포 + 1-2일 관찰 후 회귀 0건이면 Plan B (`docs/superpowers/plans/2026-05-28-portfolio-presets.md`)로 진행한다.

---

## 완료 조건 종합

- [ ] **A1**: alembic 설치/init, baseline migration, round-trip 테스트, user_id_middleware 등록, 기존 prod에 `alembic stamp head`
- [ ] **A2**: 5개 audit query 실행 + 결과 PR 첨부, 필요 시 backfill migration
- [ ] **A3**: AssetCategory enum, 모든 계층 마이그레이션, repository 명시적 coercion, DTO `extra='forbid'`, CHECK + partial unique index migration, 전체 테스트 100% PASS
- [ ] Plan A 배포 후 1-2일 관찰 회귀 0건

---

## 하지 말 것

- ❌ `Optional[X]` 사용 → ✅ `X | None`
- ❌ `category="주식"` magic string → ✅ `AssetCategory.STOCK`
- ❌ SQLAlchemy native Enum 매핑 의존 → ✅ `sa_column=Column(String)` 명시
- ❌ `_to_entity`에서 `category=model.category` (raw str 반환) → ✅ `AssetCategory(model.category)` 명시 coercion
- ❌ `create_all`로 컬럼 타입 변경 → ✅ Alembic migration
- ❌ baseline migration에서 `op.create_table()` 작성 → ✅ no-op (기존 schema 이미 존재)
- ❌ 배포 전 `alembic stamp head` 누락 → ✅ runbook 따라 stamp 먼저
- ❌ audit 결과 무시하고 A3 진행 → ✅ NULL/whitespace/empty/duplicate 모두 처리 후 진행
- ❌ Alembic migration에 `downgrade()` 미구현 → ✅ 모든 migration에 downgrade (best-effort no-op이라도 명시)
