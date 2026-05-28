# Alembic Runbook

## ⚠️ 가장 흔한 실수 — 절대 금지

| ❌ 위험한 명령 | 이유 | ✅ 올바른 명령 |
|----------|------|----------|
| `alembic stamp head` (기존 환경에서) | head는 항상 **최신 revision**(현재 `0002_asset_constraints`). 기존 환경을 head로 stamp하면 0002의 CHECK + partial unique index가 **silently skip** — invalid prod 데이터 검출 안 됨 | `alembic stamp 0001_baseline` (명시적 baseline) 후 `alembic upgrade head` 별도 실행 |
| `alembic upgrade head` (audit 없이 prod에서) | prod 데이터에 stray category 값 또는 duplicate `(account_id, code)`가 있으면 CHECK/index 추가가 **마이그레이션 실패** — partial deploy 위험 | audit 5 query 먼저 → 결과 clean 확인 → upgrade |

## 최초 배포 (Plan A 머지 직후) — **USER ACTION REQUIRED**

기존 schema가 이미 존재하는 환경(prod, staging, dev with persistent DB)은 다음 **2 phase**로 진행:

### Phase 1 — Baseline stamp (각 환경 1회)

A1+A2+A3가 한 PR에 포함되어 있으므로 `head`가 `0002`다. 기존 schema는 0001 baseline만 적용된 것으로 간주하고 **명시적으로 `0001_baseline` stamp**:

```bash
# 1. DATABASE_URL 환경변수 설정
export DATABASE_URL="postgresql://..."   # prod 예시

# 2. 명시적 baseline stamp — head 사용 금지
cd backend && uv run alembic stamp 0001_baseline

# 3. 확인
uv run alembic current
# 출력 예: 0001_baseline (head 아님 — head는 0002)
```

> **`stamp 0001_baseline` vs `stamp head`**: head는 항상 alembic 그래프의 끝(현재 `0002`). 기존 환경은 0002가 아직 적용 안 된 상태이므로 head로 stamp하면 0002를 "이미 했다"고 거짓 표시되어 **CHECK constraint와 partial unique index가 영원히 안 생긴다**. 명시적 revision id를 쓸 것.

### Phase 2 — Audit + upgrade (각 환경 1회, audit 결과 clean 확인 후)

`docs/superpowers/plans/2026-05-28-asset-category-strenum-migration.md` §A2.1의 5 query를 실행 후 결과를 `docs/superpowers/plans/audit-results-2026-05-29.md`에 채운다. 모두 clean이면:

```bash
cd backend && uv run alembic upgrade head
# 출력 예: Running upgrade 0001_baseline -> 0002_asset_constraints,
#         asset category check + partial unique (account_id, code)
```

**audit이 clean 아닌 경우** (NULL/whitespace/empty/unknown category 또는 duplicate (account_id, code) 존재):

1. backfill SQL 직접 실행해 데이터 정규화
2. enum 멤버 추가/제거가 필요하면 `domain/enums.py` + migration의 `_CATEGORY_VALUES` 동기화 후 코드 follow-up PR
3. 그 후 `alembic upgrade head` 재시도

## 신규 환경 (빈 DB, 처음 배포)

`lifespan`이 `create_db_and_tables()` (= `SQLModel.metadata.create_all`)를 호출해 schema를 만든다. AssetModel의 `__table_args__`에 정의된 partial unique index도 함께 생성됨. 그 다음:

```bash
# create_all로 schema 생긴 직후
cd backend && uv run alembic stamp 0001_baseline
cd backend && uv run alembic upgrade head
# 0002의 CREATE UNIQUE INDEX IF NOT EXISTS가 idempotent하게 동작
```

> 빈 DB에서 `stamp head` 사용은 무방하지만 일관성 위해 **모든 환경에서 동일한 phase 1→2 흐름**을 따를 것을 권장.

## 매 배포

A2 이후 신규 migration이 추가되면 배포 흐름에 다음 단계를 포함한다:

```bash
cd backend && DATABASE_URL="$DATABASE_URL" uv run alembic upgrade head
```

CI/CD 파이프라인에서 코드 배포 직후, 앱 부트 직전에 실행하는 것이 권장. transactional DDL 지원 DB(Postgres 등)에서는 실패 시 자동 rollback.

## 롤백

마지막 한 단계만:

```bash
cd backend && DATABASE_URL="$DATABASE_URL" uv run alembic downgrade -1
```

특정 revision으로:

```bash
cd backend && DATABASE_URL="$DATABASE_URL" uv run alembic downgrade <revision_id>
```

전체 reverse (개발용):

```bash
cd backend && DATABASE_URL="$DATABASE_URL" uv run alembic downgrade base
```

## 신규 migration 생성

### autogenerate 사용

```bash
cd backend && DATABASE_URL="sqlite:///:memory:" \
  uv run alembic revision --autogenerate -m "변경 사항 설명" --rev-id <NNNN_descriptor>
```

> **⚠️ autogenerate 결과는 반드시 수동 검토.** 자주 누락되는 항목:
> - column type 변경 (예: `String` → `Enum`)
> - server defaults
> - indexes (특히 partial index `WHERE` 절)
> - CHECK constraint
> - FK `ondelete` 옵션

생성된 `upgrade()` / `downgrade()` 양쪽을 모두 검토하고, `downgrade()`가 미구현이면 직접 작성한다. **모든 migration은 working downgrade를 갖는다**가 본 프로젝트 정책.

### 수동 작성

```bash
cd backend && DATABASE_URL="sqlite:///:memory:" \
  uv run alembic revision -m "설명" --rev-id <NNNN_descriptor>
```

빈 `upgrade()`/`downgrade()` 스켈레톤이 생성된다.

## 회귀 가드 (CI)

`backend/tests/unit/infrastructure/test_alembic.py`가 다음을 검증:

1. **upgrade head** — 모든 migration 적용 성공
2. **round-trip** — upgrade head → downgrade -1 → upgrade head 모두 성공 (xfail until A3.10)
3. **downgrade base** — 전체 reverse 성공
4. **drift check** — SQLModel.metadata vs migration head 차이 0건 (xfail until A3.10)

A3.10 이후 모든 테스트는 hard PASS가 되어야 한다. xfail이 unexpected pass 되면 strict=False라 무시되지만, 새 migration을 추가할 때 round-trip / drift가 fail하면 그것은 진짜 회귀 신호다.

## 환경별 DB URL

| 환경 | URL 형식 |
|------|---------|
| dev (local SQLite) | `sqlite:///./dev.db` |
| test (in-memory) | `sqlite:///:memory:` |
| staging | `postgresql://user:pass@host/db` (env에서 주입) |
| prod | `postgresql://user:pass@host/db` (env에서 주입) |

`alembic.ini`의 `sqlalchemy.url = %(DATABASE_URL)s` 라인이 환경변수를 참조하므로, alembic.ini는 어느 환경에도 commit할 수 있다 (비밀 누출 없음).

## 자주 묻는 질문

**Q. `alembic upgrade head`가 "Can't locate revision identified by '0001_baseline'"으로 실패한다.**
A. 기존 환경에서 `alembic stamp head`를 빠뜨린 경우. `stamp head` 실행 후 재시도.

**Q. test_alembic_round_trip이 unexpected pass 되었다.**
A. baseline 이후 추가 migration이 들어왔다는 신호. A3.10 시점이면 xfail 마커를 제거하고 hard PASS로 전환하면 된다.

**Q. `alembic check`가 drift를 발견한다.**
A. SQLModel.metadata에 정의된 model과 migration head의 schema가 다르다. autogenerate로 누락된 변경 사항을 보완.
