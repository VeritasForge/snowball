# 📒 Autopilot Run Digest — portfolio-presets (Plan B 전체 완료)

*2026-05-29 · plan: docs/superpowers/plans/2026-05-28-portfolio-presets.md*

## TL;DR
- ✅ **Plan B 전 task 완주** (B2.4·2.5·2.6 백엔드 + B3.1~B3.6 프론트엔드) + Codex stop-hook #7 대응
- ✅ Backend **303 passed**, Frontend **361 passed**, 양쪽 coverage **100%** (line+branch), tsc 0
- 🤔 검토 권고 결정 **1개** (404 vs 403 정책 — 의도적)
- 🚧 차단 0건 — 남은 건 **USER-ACTION**: 브라우저 수동 smoke + 배포(Plan A 선행 머지)

## 커밋 (이번 plan, feature/portfolio-presets)
| 커밋 | task |
|------|------|
| `342e1a2` | B2.4+B2.5 preset endpoints + per-user rate limit + e2e |
| `468f1eb` | Codex #7 — preset item id 타입 불일치 제거 (양측) |
| `b182adf` | B3.1 replaceAccount + lastMutationRef race guard |
| `6648479` | B3.2 frontend Preset 타입 |
| `f88c726` | B3.3 usePresets 훅 + 429 cooldown |
| `a0c8911` | B3.4 PresetManagerModal + a11y (focus trap/restore, tabpanel) |
| `baad551` | B3.5 AssetTable 버튼 + next/dynamic 통합 |

## 🤔 한 번 더 봐주세요
### #1. 404-unified(preset) vs 403(account/asset) 정책 divergence
- **위치**: judgment #11, `routes.py` delete_preset/apply_preset
- **컨텍스트**: preset 라우트는 wrong-owner에 404(IDOR existence-oracle 차단), 기존 account/asset은 403.
- **내 결정**: preset만 404-unified, account/asset은 미변경(스코프 외).
- **근거**: 404가 보안 우월. 전체 통일은 기존 403 단정 e2e 회귀 유발 → 별도 마이그레이션 task.
- 👉 통일 원하면: account/asset 403→404 + `test_routes_error_cases.py` 갱신. 패턴: `docs/solutions/security/idor-prevention.md`.

## 🔁 Codex stop-hook 라운드 (총 #7~#9 — 매 commit 후 발동)
- #7: preset item id 타입 불일치 → 양측 제거 (#14)
- #8: mutation 네트워크 reject 미처리 → try/catch swallow (#17)
- #9: **tier-2 매칭이 다른-code 자산을 hijack** (wrong ticker) → `_match_for_item` name-match를 code-less 한정 + 프론트 dry-run 동일 (#19). #18은 code 덮어쓰기만 막아 불완전했음 — spec §4.3(c) 정독으로 근본 수정.

## ✅ 다관점이 잡아낸 결함 (전부 수정)
- [#10→#14] preset item `id` 양측 제거 — `int|None`(null) vs frontend `id?:number` 타입 불일치(code-review #4 + Codex #7 수렴)
- [#13] B3.1 `startTransition` deferred-commit race 윈도우 — guard를 콜백 내부로 이동
- [#16] B3.4 dry-run 자산 id 미정렬 → 백엔드와 카운트 divergence(중복 이름) — `.sort((a,b)=>a.id-b.id)`
- [#16] B3.4 mount effect `[fetchPresets]` deps → 매 렌더 re-fetch + focus 강탈(mock이 가림) — `[]`-deps + opener focus 복원
- [#16] B3.4 tabs에 `role=tabpanel`/aria-controls 미연결 — 추가
- [#15] B3.3 Retry-After 비숫자 → `Number()`=NaN → cooldown 무력화 — `Number.isFinite` 가드
- [#17] B3.3 mutation이 네트워크 reject 미처리 → 모달 try/finally에서 unhandled rejection + silent 실패(Codex #8) — 3 mutation try/catch로 swallow(notify+falsy)

## 🚧 차단 / USER-ACTION
- **브라우저 수동 smoke** (B3.6, jsdom으로 대체 불가): 아래 체크리스트 참조.
- **배포·머지**: Plan A(`feature/asset-category-strenum-migration`) 먼저 머지 → 이 브랜치. PR 초안 `PR-DESCRIPTION-B.md`(백엔드). 프론트엔드 PR 별도.

### 수동 smoke 체크리스트 (`cd frontend && npm run dev` → localhost:3000)
- [ ] 로그인 → AssetTable 툴바에 `📂 프리셋 관리` 버튼 표시
- [ ] 게스트 → 버튼 disabled(흐림) 확인
- [ ] 모달 열기 → 불러오기 탭 → 저장 탭 전환 → 이름 입력 → 저장 → 불러오기 탭 복귀
- [ ] 프리셋 적용 → confirm(N개/M개) → 적용 → toast → 모달 닫힘 → AssetTable에 비중 반영(refetch 없이)
- [ ] 적용 직후 10초 폴링이 덮어쓰지 않는지(race guard) 확인
- [ ] 429 받으면 쿨다운 토스트 + 일정 시간 차단(sessionStorage 유지)
- [ ] 키보드: Tab이 모달 안에서 순환(focus trap), Escape로 닫기, 닫은 뒤 focus 원위치

## 📊 통계
- 판단 지점: 총 **8** (#10~#17, 전부 중간) — 코드 결정 5 + Codex 대응 2 + flaky 진단 1
- Codex stop-hook: #7 (item id 타입) + #8 (mutation 네트워크 reject) → 둘 다 fix
- 다관점 호출: code-review **4회**(B2.4 3-angle, B3.1/B3.3/B3.4 각 1) + ce-learnings-researcher 1회
- 발견 이슈(스코프 외): `Home.test.tsx` 6개 타이머 테스트가 parallel 부하에서 간헐 flaky(사전존재 brittleness, 내 코드 무관 — 통제실험 확인)
- 검증 명령: frontend 361 pass/100%/tsc0, backend 303 pass/100% — 전부 exit 0

## 📚 학습
- `docs/solutions/security/idor-prevention.md` — 404-unified + per-user rate limit + mass-assignment (CLAUDE.md:394 phantom @import 해소)
- `docs/solutions/frontend/lazy-modal-and-optimistic-apply.md` — race guard / dry-run 백엔드 미러 / Retry-After NaN 가드 / 모달 a11y focus 복원 / next/dynamic 테스트 / lcov FNDA coverage 테크닉

## 🔗 다음 액션
- raw: `run.log` (judgment #10~#16)
- **Plan B 코드 완료** — 남은 건 수동 smoke + (Plan A 선행) 배포뿐
- 검토: 🤔 #1(404/403) 정책만 확인하면 됨
- 공유용 HTML: `/md-to-html`
