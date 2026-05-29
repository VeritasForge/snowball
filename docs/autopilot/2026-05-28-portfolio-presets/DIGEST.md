# 📒 Autopilot Run Digest — portfolio-presets (B2.4 → B3.2)

*2026-05-29 ~10:46 · 소요 ~35분 · plan: docs/superpowers/plans/2026-05-28-portfolio-presets.md*

## TL;DR
- ✅ **5개 task 완주** (B2.4, B2.5, B2.6, B3.1, B3.2) / 검증 명령 exit 0
- ✅ Backend **303 passed**, Frontend **305 passed**, 양쪽 coverage **100%** (line+branch), tsc 0
- 🤔 검토 권고 결정 **2개** (아래)
- 🚧 차단 **0건** — 남은 B3.3~B3.6은 fresh context 인계 (pending, not blocked)

## 🤔 한 번 더 봐주세요 (다관점 분기·정책 결정)

### #1. PresetItemResponse.id = `int | None` (항상 null) — 유지 vs 제거
- **위치**: judgment #10/#12, `backend/src/snowball/adapters/api/dtos.py:181`
- **컨텍스트**: 도메인 `PresetItem`은 aggregate child라 자체 id 없음 → 응답 id를 어떻게 처리?
- **분기점**: 내 결정은 `int | None = None`(frontend `id?: number` 계약 정합, forward-compat). 그러나 code-review의 cleanup finder는 "항상 null이면 페이로드 노이즈 → 필드 제거가 더 정직"이라 반박.
- **내 결정**: 유지 (`int | None`).
- **근거**: frontend가 `id?: number`로 이미 선언 → null 수용·향후 실제 id 노출 시 non-breaking. placeholder 0(거짓 식별자)은 양측 모두 거부.
- 👉 제거가 낫다고 보면: `dtos.py` PresetItemResponse에서 `id` 필드 삭제 + `frontend/src/types.ts` PresetItem.id 삭제 (둘 다 optional이라 non-breaking).

### #2. 404-unified(preset) vs 403(기존 account/asset) 정책 불일치
- **위치**: judgment #11, `backend/src/snowball/adapters/api/routes.py` (delete_preset/apply_preset)
- **컨텍스트**: preset 라우트는 wrong-owner에 404(IDOR existence-oracle 차단), 기존 account/asset은 403.
- **분기점**: 한 라우터에 두 정책 공존 — 의도적이나 유지보수 비용. cleanup finder도 동일 지적.
- **내 결정**: preset은 404-unified 유지, account/asset 403은 스코프 외로 미변경.
- **근거**: 404-unified가 보안 우월(존재 누설 차단). 전체 통일은 기존 403 단정 e2e 회귀 유발 → 별도 마이그레이션 task로 분리.
- 👉 통일을 원하면: account/asset 라우트의 403→404 마이그레이션 + `test_routes_error_cases.py` 단정 갱신을 별도 task로. 패턴 문서: `docs/solutions/security/idor-prevention.md`.

## ✅ 자신 있게 한 결정 (간략)
- [#13] B3.1 race guard를 `startTransition` **콜백 내부**로 이동 — deferred-commit 윈도우 차단 (code-review P1, julik-races 관점). 다관점이 자가검토 누락분 포착.
- [B2.4] use case `execute()` **keyword-only** 호출 — plan의 positional 예시 대신 실제 시그니처 준수 (TypeError 방지).
- [B2.4] apply는 `CalculatePortfolioUseCase().execute(result.account)` 재계산 — `ApplyResult.account`가 raw Account라서 (plan의 `result.calc`는 실제 코드에 없음).
- [B2.4] `AmbiguousMatchError` import/handler **미작성** — 단일-pass 매칭으로 use case가 raise 안 함 (plan은 작성하라 했으나 실제 코드엔 없음).
- [B2.4] `List[PresetResponse]`→`list[...]` — 사용자 modern-typing 규칙 준수.
- [B2.5] e2e는 실제 conftest 패턴(`_make_user_client`, dependency-override 단일 user) 따름 — plan의 `auth_token`/401 가정 폐기. 429는 `limiter.reset()` autouse로 결정적.

## 🚧 차단 (사용자 결정 필요)
없음. 남은 task는 pending (B3.3~B3.6).

## 📊 통계
- 판단 지점: 총 **4** (높음 0 / 중간 4 / 낮음 0) — #10~#13
- 다관점 호출: code-review **2회** (B2.4 = 3 finder angle, B3.1 = 1 race 리뷰어) / ce-learnings-researcher **1회** / rl-verify 0
- 외부 조사: 0 (학습 데이터 + 1차 출처 코드로 충분)
- 커밋: 4개 (`342e1a2` B2.4/2.5, `b182adf` B3.1, `6648479` B3.2 + 본 docs 커밋 예정)
- ce-compound side effects: **없음** — 본 런은 ce-compound headless 미실행(mid-plan), 학습은 `idor-prevention.md` 직접 작성(CLAUDE.md/AGENTS.md 자동 편집 없음). git diff 확인 불요.
- 토큰: /goal 미설정 — 미측정

## 📚 학습
- 추가: `docs/solutions/security/idor-prevention.md` — 404-unified IDOR + per-user rate limiting(slowapi key_func) + mass-assignment 차단 + dependency-override e2e/429 테스트 전략. **CLAUDE.md:394의 phantom @import도 이 파일 생성으로 해소**.
- 참조: ce-learnings-researcher가 "load-bearing 보안/테스트 규약이 코드에만 있고 docs/solutions/ 미문서화"라고 플래그 → 캡처 완료.

## 🔗 상세 / 다음 액션
- raw: `run.log` (judgment #10~#13)
- PR 초안: `PR-DESCRIPTION-B.md` (백엔드 B1+B2 — 머지는 Plan A 선행 USER-ACTION)
- **다음 세션**: HANDOFF.md 재진입 → B3.3(usePresets 훅 + 429 cooldown) → B3.4(PresetManagerModal + a11y) → B3.5(AssetTable 버튼 + dynamic import) → B3.6(검증 + smoke)
- 검토 후 잘못된 결정: 직접 수정 + 하니스 업데이트
- 공유용 HTML 원하면: `/md-to-html`
