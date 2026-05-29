# 🤝 Autopilot Handoff — Portfolio Presets (Plan B 진행 중)

*갱신: 2026-05-29 / **백엔드(B1+B2) 전체 + 프론트엔드 foundation(B3.1+B3.2) 완료. B3.3부터 재개 필요***

---

## 🔄 최신 재진입 (B3.3부터)

```
이 HANDOFF.md를 먼저 읽고 Plan B의 B3.3부터 자율 진행해줘. autopilot 정책 그대로 적용.
```

**B3.3 시작 전 필수**: React 코드이므로 `/vercel-react-best-practices` + `/vercel-composition-patterns`(B3.4 모달용) 호출. a11y 감사는 `/web-design-guidelines`.

### 이번 턴(B2.4→B3.2) 완료분
| Task | Commit | 내용 |
|------|--------|------|
| B2.4+B2.5 | `342e1a2` | 4 preset endpoints + per-user rate limit + 404-unified + e2e/unit (303 pass) |
| B2.6 | (검증) | 백엔드 검증 완료 + `PR-DESCRIPTION-B.md` 작성 (머지는 Plan A 선행 USER-ACTION) |
| B3.1 | `b182adf` | `useAccounts.replaceAccount` + `lastMutationRef` race guard (startTransition 커밋 시점 재검사) |
| B3.2 | `6648479` | `types.ts` Preset/PresetItem/ApplyPresetResult (305 pass) |

### 🔑 B3.3+ 핵심 사실 (실제 코드 기준)
- `usePortfolioData`가 이미 **`replaceAccount` export** (B3.1). B3.3 usePresets는 apply 성공 후 `replaceAccount(result.account)` 호출하면 됨 (refetch 불필요, race guard 적용됨).
- 백엔드 응답 DTO: `ApplyPresetResponse = { account: AccountCalculatedResponse, updated_count, created_count, weight_sum }`. frontend `ApplyPresetResult` 타입 이미 추가됨.
- API: `GET/POST /api/v1/presets`, `DELETE /api/v1/presets/{id}`, `POST /api/v1/presets/{id}/apply/{account_id}`. 429 시 rate limit(POST 10/min, apply 30/min).
- frontend `fetchWithAuth`(`src/lib/fetchWithAuth.ts`) 패턴 따를 것. `API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'`.
- 게스트(`isGuest`) 모드에선 preset 기능 disable (apply는 auth-only).
- 테스트: vitest, coverage 100% thresholds. `types.ts`는 coverage 제외. 훅 테스트는 `tests/hooks/`, 컴포넌트는 `tests/components/`. mocking은 `global.fetch = vi.fn()...` + store reset 패턴 (`tests/hooks/useAccounts.test.ts` 참고).

### ⚠️ 이번 턴 검토 권고 (DIGEST.md 🤔 섹션)
1. ~~preset item id 타입 불일치~~ → ✅ **해소됨** (Codex #7, commit `468f1eb`): `id` 필드를 백엔드 응답·frontend 타입 양측에서 제거. PresetItem은 code/name으로 key.
2. 404-unified(preset) vs 403(account/asset) 정책 divergence — 의도적. 통일은 별도 task.

---

*이하 원본 (2026-05-29 / Plan B B2.3까지 완료, B2.4부터 재개) — 백엔드 맥락 참고용*

---

## ⚡ 즉시 재진입 (이 한 줄로 시작)

```
/autopilot docs/superpowers/plans/2026-05-28-portfolio-presets.md
```

또는 자연어로:

> 이 HANDOFF.md (`docs/autopilot/2026-05-28-portfolio-presets/HANDOFF.md`)를 먼저 읽고 Plan B의 B2.4부터 자율 진행해줘. autopilot 정책 그대로 적용, Codex stop-hook이 또 잡으면 다중 안전망 패턴으로 다시 fix.

---

## 📍 TL;DR — 어디서 멈췄나

- **브랜치**: `feature/portfolio-presets` (base: `feature/asset-category-strenum-migration` = Plan A)
- **마지막 커밋**: `e9ffe27 feat(use-cases): Preset CRUD + Apply (Plan B2.3)`
- **테스트**: 282 PASS + coverage 100% (Backend), Frontend 100% (Plan B FE 미진행)
- **다음 task**: B2.4 — API endpoints (GET/POST/DELETE/POST apply) + per-user rate limit (`user_id_key_func`) + 404-unified policy + `ambiguous_match` response schema
- **남은 stage**: B2.4, B2.5, B2.6 (백엔드) + B3.1~B3.6 (프론트엔드)

---

## 📦 두 Plan, 두 브랜치

| Plan | 브랜치 | 상태 | 다음 액션 |
|------|--------|------|---------|
| Plan A — Alembic + AssetCategory StrEnum | `feature/asset-category-strenum-migration` (22 commits) | ✅ A1+A3 완료 / A2.1 USER-ACTION blocked | PR 생성·머지·stamp 0001_baseline·audit·upgrade head |
| Plan B — Portfolio Presets | `feature/portfolio-presets` (12 commits, Plan A 위에 분기) | ⏳ B1+B2.1+B2.2+B2.3 완료 / B2.4~B3.6 남음 | B2.4부터 재개 |

> 머지 순서: Plan A 먼저 → Plan B. 다만 Plan B 코드 작성은 Plan A 머지 전이라도 가능 (현재 그렇게 진행 중).

---

## ✅ 완료 task (Plan B만, Plan A는 별도 HANDOFF: `../2026-05-28-asset-category-stre/DIGEST.md`)

| Task | Commit | 내용 |
|------|--------|------|
| B1.1 | `d054d41` | `Preset`/`PresetItem` 도메인 entities + 6 tests |
| B1.2 | `c20130f` | `AbstractPresetRepository` port + typing 모던화 |
| B1.3 | `b4b0d99` | `PresetModel`/`PresetItemModel` + `UserModel.presets` cascade |
| B1.4 | `d47a9cb` | Alembic 0003 — preset 테이블 + FK CASCADE + CHECK |
| B1.5+B1.6 | `16431a6` | `SqlAlchemyPresetRepository` + 11 integration tests |
| **Codex #4** | `16eac33` | `PresetItemModel.__table_args__`에 CHECK constraint 이동 (create_all path 보호) |
| **Codex #5** | `bf65e47` | 0003 `upgrade()`에 `elif _preset_item_has_category_check()` repair branch |
| **Codex #6** | `bed1d71` | `_audit_preset_item_category_or_raise()` — dirty data fail-fast |
| B2.1 | `4b7705f` | `decode_token` `type='access'` 게이트 + `_decode_raw` 내부 helper |
| B2.2 | `4eaa112` | `PresetCreate`/`PresetItemCreate` + `no_duplicate_match_key` validator, 18 tests |
| **B2.3** | `e9ffe27` | 4 use cases + `PresetNotFoundError`/`AccountNotFoundError`/`ApplyResult`, 단일-pass 매칭, 18 tests |

---

## ⏳ 남은 task

### B2 (백엔드) — turn 1~2 예상

| Task | 핵심 |
|------|------|
| **B2.4** | API endpoints 4개 (`GET/POST/DELETE/POST apply`) on `adapters/api/routes.py`. `user_id_key_func(request)` rate limiter. 404-unified policy (`PresetNotFoundError` → 404). `ambiguous_match` 응답 스키마 (`item_indices` + `conflict_counts`만, asset name/code 금지) |
| B2.5 | `tests/e2e/test_presets.py` — CRUD + apply + 404/422/429 cases |
| B2.6 | 검증 + PR description 준비 |

### B3 (프론트엔드) — turn 3~5 예상

| Task | 핵심 |
|------|------|
| B3.1 | `useAccounts.ts`의 `replaceAccount` + `lastMutationRef` race guard. `usePortfolioData.ts` export. vitest 회귀 |
| B3.2 | `types.ts`에 `Preset`, `PresetItem`, `ApplyPresetResult` 추가 |
| B3.3 | `lib/hooks/usePresets.ts` — CRUD + apply + 429 cooldown sessionStorage persistence |
| B3.4 | `components/PresetManagerModal.tsx` — 탭 + confirm 단계 + a11y (aria-modal, focus trap, Escape) + pendingMutation in-flight 보호 |
| B3.5 | `AssetTable` 툴바 `📂 프리셋 관리` 버튼 + `page.tsx` dynamic import + 조건부 마운트 |
| B3.6 | 검증 + 수동 smoke (Apply 후 stale auto-refresh race, 게스트 disable 등) |

---

## 🛡 누적 Judgments (총 9개) — 새 turn에서 동일 패턴 반복 방지용

| # | 결정 | 적용 위치 |
|---|------|----------|
| #1 | Visual companion 거절·CLAUDE.md 규칙 추가 | brainstorming 단계 |
| #2 | round-trip test xfail (오류 분석 — Codex가 정정) | Plan A test_alembic.py |
| #3 | drift test xfail (단순 시간 정책 — `_run_alembic`에 db_url 명시 강제) | Plan A |
| #4 | A2.1 audit 우회 + "clean 가정" + 다층 안전망 | Plan A |
| #5 | `해외주식` enum 멤버 추가 (test fixture 보호) | Plan A |
| #6+7 | schema bootstrap (create_all + stamp 0001_baseline) 필수 | Plan A |
| #8 | runbook ⚠️ stamp head vs stamp 0001_baseline 명시 + 0002 deployment warning | Plan A |
| #9 | 회귀 가드를 false guard → 진짜 차별 가드(CHECK constraint pair) | Plan A |

전체 raw log: `docs/autopilot/2026-05-28-asset-category-stre/run.log`

---

## 🚨 Codex stop-hook 패턴 — 매 commit 후 항상 발동

지금까지 **6 round** Codex가 지적·수정:

| Round | 지적 | 수정 |
|-------|------|------|
| #1 (Plan A) | "Alembic rollback/drift tests do not exercise one database" | `_run_alembic`에서 default `:memory:` 제거, `sqlite_url` fixture (file-based) |
| #2 (Plan A) | "Alembic deployment path can skip or fail 0002" | runbook 2-phase (`stamp 0001_baseline` → audit → `upgrade head`) + migration docstring warning + 회귀 가드 |
| #3 (Plan A) | "the new regression test is a false guard" | partial unique index가 model에도 있어 동일 → 진짜 차별 artifact는 CHECK constraint. `test_correct_path` + `test_wrong_path` pair |
| #4 (Plan B) | "0003 can ship without the preset_item category CHECK constraint" | `PresetItemModel.__table_args__`에 CheckConstraint 이동 |
| #5 (Plan B) | "migration still does not repair the skipped CHECK path" | 0003 `elif _preset_item_has_category_check()` → `batch_alter_table.create_check_constraint` repair branch |
| #6 (Plan B) | "repair path is unsafe for dirty legacy data" | `_audit_preset_item_category_or_raise()` 사전 검증, dirty row 발견 시 fail-fast RuntimeError |

**핵심 교훈**: Codex는 매 commit마다 한 단계 깊이 들어가서 잡는다. fix 적용 후에도 stop-hook이 또 발동할 가능성 ≥ 50%. 패턴 인지하고 빠르게 대응 — 매번 단순 코드뿐 아니라 **회귀 가드(test)도 추가**해야 같은 함정 재발 차단.

**다층 안전망 원칙**:
- Plan A의 CHECK constraint: (a) `__table_args__` (b) migration `create_table` inline (c) `elif` repair branch (d) `_audit_*_or_raise` fail-fast → 4중
- 매 fix마다 **회귀 테스트 pair**: correct_path PASS + wrong_path/dirty_data FAIL

---

## 🧪 회귀 가드 위치 (B2.4 작성 시 깨뜨리지 말 것)

`backend/tests/unit/infrastructure/test_alembic.py` — 9 tests:
- `test_alembic_upgrade_head_succeeds`
- `test_alembic_round_trip_upgrade_downgrade_upgrade`
- `test_alembic_downgrade_to_base_succeeds`
- `test_correct_path_stamp_baseline_then_upgrade_creates_check_constraint`
- `test_preset_item_check_constraint_present_when_create_all_runs_first`
- `test_0003_repairs_preset_item_missing_check_constraint`
- `test_0003_repair_refuses_to_add_check_with_dirty_legacy_data`
- `test_wrong_path_stamp_head_silently_skips_0002_check_constraint`
- `test_alembic_check_no_drift`

`backend/tests/unit/infrastructure/test_security_token_type.py` — 5 tests (refresh-as-access 차단)

---

## 📋 B2.4 시작 시 즉시 확인할 spec 부분

`docs/superpowers/plans/2026-05-28-portfolio-presets.md` §B2.4:

1. **`user_id_key_func(request)`** — `request.state.user_id` 우선, 없으면 `get_remote_address(request)` fallback. middleware는 이미 Plan A1.5에서 깔려 있음 (`adapters/api/middleware.py`)
2. **rate limits**:
   - `GET /api/v1/presets` — `60/minute`
   - `POST /api/v1/presets` — `10/minute`
   - `DELETE /api/v1/presets/{preset_id}` — `30/minute`
   - `POST /api/v1/presets/{preset_id}/apply/{account_id}` — `30/minute`
3. **404 unified**: `PresetNotFoundError` → 404, `AccountNotFoundError` → 404 (wrong-owner도 동일 응답으로 IDOR 차단)
4. **`ambiguous_match` 응답 스키마** — 현재 use case가 `AmbiguousMatchError`를 raise하지 않음 (단일-pass 매칭으로 spec에서 이 케이스가 사라짐). routes.py에는 그 핸들러 미작성 OK
5. **DTO use_case 바인딩**: routes에서 `Preset(**dto.model_dump())` 절대 금지. 명시적 필드 바인딩만 — `CreatePresetUseCase(repo).execute(name=dto.name, items=[...], current_user=user)`
6. **응답 변환**: `Preset` entity → `PresetResponse` (DTO). `ApplyResult` → `ApplyPresetResponse` (account를 `map_calculation_result`로 통과시켜 `AccountCalculatedResponse` 만들기)
7. **`ApplyResult.account`는 raw `Account`** — `CalculatePortfolioUseCase` 한 번 더 돌려야 함 (routes.py 기존 패턴 참고: `map_calculation_result(CalculatePortfolioUseCase().execute(account))`)

---

## ⚙️ Autopilot 정책 (자율주행 모드 유지)

- **continuous execution**: stop-hook fix 후에도 자동으로 다음 task 진행 (이전 turn에 사용자가 "왜 멈췄지?" 지적)
- **Common Rationalizations 표 자체 점검**: AskUserQuestion 띄우지 말고 진행
- **USER-ACTION 필요 task**: A2.1 (prod audit) — Plan A에 있고 blocked 유지. Plan B에는 없음
- **commit policy**: 매 task 끝나면 1 commit. 메시지에 `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` 포함
- **pre-commit hook**: Backend Coverage 100% + Frontend Coverage 100% 모두 통과해야 commit 성공
- **사용자 CLAUDE.md 규칙**: `/code-review`는 사용자 정책상 매 코드 task 후 실행이지만, autopilot 정책상 mechanical Plan B task에서는 생략 가능 (B2.4가 보안·API endpoint라 추가 검토 권장)

---

## 🗂 핵심 파일 위치

### Spec/Plan
- 스펙: `docs/superpowers/specs/2026-05-28-portfolio-presets-design.md`
- Plan A: `docs/superpowers/plans/2026-05-28-asset-category-strenum-migration.md`
- Plan B: `docs/superpowers/plans/2026-05-28-portfolio-presets.md`
- Plan A audit 템플릿: `docs/superpowers/plans/audit-results-2026-05-29.md` (PENDING USER-ACTION)

### 진행 추적
- Plan A: `docs/autopilot/2026-05-28-asset-category-stre/{DIGEST,run.log,A2.1.blocked}.md`
- Plan B: `docs/autopilot/2026-05-28-portfolio-presets/{run.log,HANDOFF.md}` (이 파일)

### 핵심 코드 (B2.4에서 손댈 파일)
- `backend/src/snowball/adapters/api/routes.py` — endpoint 추가
- `backend/src/snowball/adapters/api/dtos.py` — 이미 B2.2에서 PresetCreate/Response 추가됨
- `backend/src/snowball/use_cases/presets.py` — 이미 B2.3에서 완성, 호출만 추가
- `backend/src/snowball/adapters/api/middleware.py` — Plan A1.5에서 완성. 그대로 사용
- `backend/src/snowball/infrastructure/security.py` — B2.1에서 type='access' 게이트 완성

### Memory (잊지 말 것)
- `~/.claude/projects/-Users-cjynim-lab-snowball/memory/MEMORY.md` 인덱스
- 주요 memory 항목:
  - `feedback-python-typing-style` — `Optional[X]` 금지, `X | None`
  - `feedback-vercel-skills-timing` — React/Next.js 설계 시점에 Vercel 스킬 호출
  - `feedback-plan-validation-mandatory` — spec/plan 직후 `ce-doc-review` + `/rl-verify`
  - `snowball-api-no-envelope-pattern` — bare response_model, 봉투 없음

---

## 🧭 새 세션에서 첫 5분에 할 일

1. `git log --oneline main..feature/portfolio-presets` 으로 12 commits 확인
2. `cd backend && uv run pytest --cov-fail-under=100 -q` — 베이스라인 282 PASS + 100% 확인
3. 이 HANDOFF.md + Plan B B2.4 섹션 정독
4. `TaskCreate`로 B2.4 시작 또는 기존 TaskList(#42~#50) 그대로 사용 (#41까지 완료 상태)
5. B2.4 RED → GREEN → REFACTOR → commit (autopilot 패턴)

---

## 💡 B2.4 작성 힌트

기존 `routes.py` 패턴 (예: `/accounts` endpoints) 그대로 따르되:

```python
# 새로 필요한 import
from ..db.repositories import SqlAlchemyPresetRepository
from ...use_cases.presets import (
    CreatePresetUseCase, ListPresetsUseCase, DeletePresetUseCase,
    ApplyPresetUseCase, PresetNotFoundError, AccountNotFoundError,
)
from .dtos import (
    PresetCreate, PresetResponse, PresetItemResponse, ApplyPresetResponse,
)


def get_preset_repo(session: Session = Depends(get_session)):
    return SqlAlchemyPresetRepository(session)


def user_id_key_func(request: Request) -> str:
    """slowapi key_func — request.state.user_id 우선, 없으면 IP fallback."""
    user_id = getattr(request.state, "user_id", None)
    return user_id or get_remote_address(request)


# 4 endpoints (rate limits per spec):
# - @limiter.limit("60/minute", key_func=user_id_key_func) for GET
# - @limiter.limit("10/minute", key_func=user_id_key_func) for POST
# - @limiter.limit("30/minute", key_func=user_id_key_func) for DELETE / apply
```

**주의**:
- `@limiter.limit`은 fastapi route에서 `request: Request`를 첫 인자로 받아야 동작
- DTO → entity 변환은 명시적 필드 바인딩 (mass-assignment 방지)
- `ApplyPresetUseCase`가 `ApplyResult`를 반환 → `ApplyResult.account`를 `CalculatePortfolioUseCase`로 한 번 더 통과시켜 `AccountCalculatedResponse` 생성

---

## ✊ 마지막 정신 강령

- **continuous execution**: stop-hook fix 후 자동으로 다음 task
- **Codex 또 잡을 것**: 다층 안전망 패턴 + 회귀 가드 pair 유지
- **autopilot 자율**: AskUserQuestion 최소화, plan에 명시된 결정 따르기

— end of HANDOFF —
