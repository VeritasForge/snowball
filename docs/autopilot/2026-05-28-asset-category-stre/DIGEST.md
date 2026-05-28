# 📒 Autopilot Run Digest — 2026-05-28-asset-category-stre

*2026-05-29 00:55 · 소요 ~70분 · plan: docs/superpowers/plans/2026-05-28-asset-category-strenum-migration.md*

## TL;DR
- ✅ **Plan A 전 stage 종료 (19 commits)** — A1(Alembic+middleware) + A2.2(skip) + A3(StrEnum 마이그레이션). 218 PASS + 0 xfailed + coverage 100%
- 🚧 **A2.1 blocked (유지)** — prod DB audit은 사용자 액션. autopilot은 "audit clean" 가정으로 진행, A3.10 CHECK constraint가 안전망
- 🛠 **3건의 mid-flight 정정**: Codex stop-hook (file DB), audit 우회 정책, schema bootstrap 경로
- 다음 단계: A1+A3 PR 생성 → 사용자가 audit 실행해 prod 안전성 확인 → 머지 후 Plan B 시작

## 🤔 한 번 더 봐주세요

### #1. A2.1 audit 우회로 진행 (가장 중요)
- **위치**: `run.log [judgment #4]`, `A2.1.blocked.md`
- **컨텍스트**: prod DB audit이 USER-ACTION으로 BLOCKED 상태에서 사용자가 "이어서 진행" 명시 → autopilot이 "audit 결과는 clean"이라 작업 가정. 만약 prod에 stray category 값이 있으면 A3.10 CHECK constraint 마이그레이션이 prod에서 실패.
- **안전망**: (a) `AssetCategory`에 `FOREIGN_STOCK = "해외주식"` 멤버 미리 포함, (b) IF NOT EXISTS unique index, (c) CHECK constraint가 prod 마이그레이션 시점에 invalid 값 발견하면 명확한 에러로 차단.
- **내 결정**: 사용자 명시 지시 우선 + 다층 안전망. **PR merge 전 사용자가 audit 5 query 실행 권장**.
- 👉 prod에서 stray 값이 발견되면: enum에 멤버 추가 후 follow-up PR로 CHECK constraint 정의도 갱신 (`alembic/versions/0002_*.py:_CATEGORY_VALUES`).

### #2. `FOREIGN_STOCK` 멤버는 fixture 기반 (prod 미확인)
- **위치**: `backend/src/snowball/domain/enums.py`, judgment #5
- **컨텍스트**: rl-verify Iter 1의 DI-3 finding — "해외주식"은 `test_repositories.py:163` 단일 fixture에만 존재. ce-learnings-researcher가 prod 데이터 아닐 수 있다고 미리 알려줌.
- **내 결정**: enum에 포함하는 게 안전 (audit 결과 보기 전까지는 reserved member 유지). prod 미사용 확인되면 follow-up에서 제거.
- 👉 audit 결과 `해외주식` 없으면: `enums.py`에서 FOREIGN_STOCK 제거 + CHECK constraint values 동기화 + test fixture를 다른 멤버로 교체.

### #3. judgment #2의 round-trip 분석 오류 (이미 정정됨)
- **위치**: `run.log [judgment #2]` (틀린 분석) → `[judgment #3]` (Codex 지적), `[judgment #6+7]` (schema bootstrap)
- **무엇이 틀렸나**: 초기에 "single revision에서 `downgrade -1` 불가"로 분석 — 사실은 `sqlite:///:memory:` 가 매 subprocess마다 새 DB. Codex가 정확히 지적.
- **교훈**: 변수 격리(통제 실험) 원칙. 가설 검증 전 실험 환경 격리.
- 👉 후속 alembic 테스트 추가 시: 절대 `:memory:` 기본값 사용 금지 (현재 `_run_alembic`은 db_url 명시 강제).

### #4. test fixture가 prod-shaped (create_all + stamp)
- **위치**: `backend/tests/unit/infrastructure/test_alembic.py:sqlite_url`
- **무엇이 다른가**: 단순 빈 DB가 아니라 SQLModel.metadata.create_all → alembic stamp 0001_baseline 으로 시작. 이는 실제 prod 시나리오(기존 schema 존재)와 일치하지만 신규 환경(완전한 빈 DB)에서 직접 `alembic upgrade head`는 schema가 없어서 0002 ALTER 실패.
- **prod 운영 노트**: `backend/docs/alembic-runbook.md`에 따르면 신규 환경도 동일 경로 — `create_all` (lifespan에서 호출됨) 후 `alembic stamp head` 1회.
- 👉 신규 deploy 워크플로우 변경 시: runbook 갱신 필수.

## ✅ 자신 있게 한 결정 (간략 리스트)

### A1 stage
- [A1.1] alembic>=1.13.0 의존성 추가 — plan 명시
- [A1.2] env.py 전면 교체: `import sqlmodel`, model imports, `user_module_prefix`, `render_as_batch`, `compare_type`/`server_default`
- [A1.3] baseline migration no-op — 기존 schema 보존
- [A1.5] user_id_middleware decode 실패 silently swallow — 인증은 get_current_user
- [A1.6] main.py에 middleware 등록 (CORSMiddleware 이후)
- [A1.7] runbook에 `alembic stamp head` USER-ACTION 명시

### A3 stage
- [A3.1] AssetCategory StrEnum 5+1 멤버 (FOREIGN_STOCK 포함)
- [A3.2] Asset.category → AssetCategory + Optional → X | None
- [A3.3] infer_category 반환 타입 AssetCategory + parametrize에 enum 상수
- [A3.4] AssetModel.category sa_column=Column(String) — VARCHAR 호환 + sa_type contract
- [A3.5] repository _to_entity에 명시적 AssetCategory(value) coercion 2곳
- [A3.6] DTO category 타입 + 모든 request DTO에 `extra='forbid'` (mass-assignment 방지)
- [A3.7] routes.py PATCH endpoint 변경 불필요 — 검증만
- [A3.8] sync.py 기본값 AssetCategory.STOCK + Optional 정리
- [A3.9] 직접 생성 site만 enum 상수, dict literal/JSON site는 그대로
- [A3.10] CHECK constraint + partial unique index (IF NOT EXISTS), drift test 활성화

## 🚧 차단 (사용자 결정 필요)

- **A2.1** — `docs/autopilot/2026-05-28-asset-category-stre/A2.1.blocked.md`
  - 사유: prod/staging DB 접속자격이 autopilot 외부 의존
  - 필요 액션: 5 audit SQL 실행 + 결과 캡처 + 결정 트리 적용
  - 템플릿: `docs/superpowers/plans/audit-results-2026-05-29.md`

## 📊 통계

- 판단 지점: 총 7 (높음 2 / 중간 4 / 낮음 1)
- 다관점 호출: ce-learnings-researcher 1회 / Codex stop-hook 1회 (외부 review) / code-review 0회 / rl-verify 0회
- 외부 조사: 0회 (plan §3.1.3 권고가 1차 출처)
- 토큰: 미측정 (`/goal` 미설정)
- 커밋: 19건 (feature/asset-category-strenum-migration 브랜치)
- 파일 변경: 28 files, +1469/-88
- ce-compound side effects: **미실행** (Plan A 전체 완료 — 다음 단계 호출 권장)
- ⚠️ 자가 진단 실패: judgment #2 (변수 격리), judgment #3 (Codex가 잡음), judgment #6+7 (schema bootstrap 가정 오류). autopilot ROI(b) 항목 retrospective 자료.
- ✅ 안전망 동작: A2.1 우회 시 다층 방어(미리 enum 추가 + IF NOT EXISTS + CHECK constraint) — judgment #4의 위험 감소

## 📚 학습

- 추가 (예정, Plan A 전체 완료 후 `/ce-compound`로 누적):
  - `docs/solutions/backend/alembic-sqlmodel-env.md`
  - `docs/solutions/backend/strenum-domain-db-api-boundary.md`
  - `docs/solutions/backend/jwt-middleware-request-state.md`
  - `docs/solutions/backend/alembic-test-drift-gate.md`
- 참조 (Phase 1 결과):
  - `docs/solutions/financial/decimal-precision.md` (weak) — `_to_entity` 리팩터링 시 float cast 주의
  - `docs/solutions/testing/typed-test-fixtures.md` (weak) — fixture를 enum에 바인딩
  - `memory:snowball-api-no-envelope-pattern` — StrEnum bare string 직렬화 유지
  - `memory:verify-external-api-before-mocking` — drift gate hard PASS 정책

## 🔗 상세 / 다음 액션

- raw: `run.log`
- 차단: `A2.1.blocked.md`
- **사용자 다음 액션** (순서 권장):
  1. feature 브랜치 검토: `git log main..feature/asset-category-strenum-migration --oneline`
  2. **A2.1 audit 실행 권장** — `audit-results-2026-05-29.md` 채움. 결과에 따라:
     - 모두 clean → 그대로 진행
     - 알 수 없는 값/duplicate 발견 → enum/CHECK constraint 동기화 후 진행
  3. PR 생성: `gh pr create --base main --title "feat: Plan A — Alembic + AssetCategory StrEnum 마이그레이션"`
  4. **PR merge 후** 각 환경에서 USER-ACTION 실행:
     - `alembic stamp head` (기존 환경) — `backend/docs/alembic-runbook.md`
     - 또는 신규 환경에서는 `alembic upgrade head` (CHECK + index 적용)
  5. 1-2일 관찰 후 회귀 0건 확인 → Plan B 시작 (`docs/superpowers/plans/2026-05-28-portfolio-presets.md`)
- 잘못된 결정 발견: 직접 코드 수정 + 하니스 업데이트 (CLAUDE.md / rules / skill)
- HTML로 공유하려면: `/md-to-html DIGEST.md`
