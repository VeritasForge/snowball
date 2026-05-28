# Alembic Runbook

## 최초 배포 (Plan A1 도입 시) — **USER ACTION REQUIRED**

A1 PR이 머지된 직후, 기존 schema가 이미 존재하는 환경(prod, staging, dev with persistent DB)에 baseline migration이 적용되었음을 alembic에 알려줘야 한다. **이 단계를 빠뜨리면 후속 schema 마이그레이션이 충돌**한다.

```bash
# 1. DATABASE_URL 환경변수 설정 (해당 환경의 값)
export DATABASE_URL="postgresql://..."   # prod 예시
# 또는: export DATABASE_URL="sqlite:////path/to/local.db"  # dev

# 2. baseline migration을 "이미 적용됨"으로 stamp
cd backend && uv run alembic stamp head

# 3. 확인
uv run alembic current
# 출력 예: 0001_baseline (head)
```

> **왜 `stamp head`인가**: baseline migration은 `upgrade()`/`downgrade()` 모두 no-op이지만, alembic은 자체 `alembic_version` 테이블에서 현재 revision을 추적한다. `stamp head` 명령은 실제 schema 변경 없이 이 테이블만 `0001_baseline`으로 갱신한다.

매 환경(dev, staging, prod)마다 1회씩 실행. 신규 환경(빈 DB)에서는 `stamp head` 대신 `upgrade head`를 사용해도 무방하다 (baseline upgrade가 no-op이므로 결과는 동일).

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
