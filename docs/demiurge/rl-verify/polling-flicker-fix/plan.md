# 수렴 검증 플랜

## 대상
- **작업 설명**: 실시간 시세 갱신 시 화면 깜빡임 수정 — `useAccounts.ts`에 `hasLoadedOnce` ref 추가
- **모드**: 문서 검증
- **대상 파일 경로**: `/Users/cjynim/.claude/plans/synthetic-inventing-tarjan.md`

## Tier
**Tier 2** (표준 검증) — 단일 파일 수정이지만 React 상태 관리 패턴과 폴링 동작에 대한 기술적 판단 검증 필요. CONTRARIAN + EVALUATOR 필수.

## 검증 항목
| # | 항목 | 검증 방법 | 사용 Agent/Skill |
|---|------|----------|-----------------|
| 1 | 깜빡임 원인 진단 정확성 | `setIsLoading(true)` → `if (isLoading) return <Spinner>` 경로가 실제 깜빡임 원인인지 코드 추적 | systematic-debugging (superpowers) |
| 2 | `useRef` 해결책 타당성 | `hasLoadedOnce` ref가 React에서 올바르게 동작하는지, 경쟁 조건(race condition) 가능성 여부 | frontend-design (compound skill), contrarian (ouroboros) |
| 3 | 미처 고려 못한 엣지 케이스 | 로그아웃 후 재로그인, 계좌 전환, isGuest 전환 등 `hasLoadedOnce`가 false로 리셋되지 않는 시나리오 | contrarian (ouroboros) |
| 4 | 단순성 — 더 나은 대안 존재 여부 | `useRef` 대신 더 간단하거나 React 관용적인 해법이 있는지 | code-simplicity-reviewer (compound) |
| 5 | 완료 조건의 측정 가능성 | 완료 조건이 실제로 검증 가능한지 | systematic-debugging (superpowers) |

## 검증 관점 및 Agent 할당
| 관점 | 역할 | 사용 Agent/Skill | 필수 여부 |
|------|------|-----------------|----------|
| 반론 / 엣지 케이스 발굴 | CONTRARIAN | contrarian (ouroboros) | 필수 |
| 프론트엔드 React 패턴 타당성 | ARCHITECT | frontend-design (compound skill) | 필수 |
| 디버깅 경로 검증 | ARCHITECT | systematic-debugging (superpowers skill) | 권장 |
| 최소 대안 제시 | SIMPLIFIER | code-simplicity-reviewer (compound) | 권장 |
| 종합 판정 | EVALUATOR | convergence-evaluator (demiurge agent) | 필수 |

## Agent별 상세 프롬프트

### 관점 1: 반론 / 엣지 케이스 발굴 (CONTRARIAN)
- Agent: `compound-engineering:ce-adversarial-document-reviewer`
- 대상 파일: `/Users/cjynim/.claude/plans/synthetic-inventing-tarjan.md`
- 프롬프트:
  ```
  아래 플랜을 적대적 관점으로 검토하라. "왜 틀린가?"를 중심으로 반론과 반례를 구성하라.

  검토 대상 코드 컨텍스트:
  - frontend/src/lib/hooks/useAccounts.ts: useAccounts 훅, hasLoadedOnce ref 추가 예정
  - frontend/src/app/page.tsx:99: if (isLoading) return <LoadingSpinner />

  반드시 다음을 검토하라:
  1. `hasLoadedOnce.current`가 훅 인스턴스 레벨에서 관리될 때, 아래 시나리오에서 예상치 못한 동작이 발생하는가?
     - 로그아웃 → 재로그인 시 (isGuest 상태 전환)
     - 계좌 목록이 비어있을 때 (빈 accounts 배열 반환)
     - 첫 fetchAccounts 호출이 실패(네트워크 에러)했을 때 hasLoadedOnce=true가 되면?
     - useAccounts 훅이 재마운트되는 경우 (React StrictMode)
  2. `setIsLoading(false)`가 finally에서 항상 호출되는데, 첫 로딩 실패 시 `isLoading`이 false가 되고 이후에 로딩 스피너가 다시 표시되지 않는 문제가 있는가?
  3. 이 플랜이 놓친 다른 깜빡임 원인이 있는가? (setAccounts 전체 교체로 인한 리렌더링 등)

  발견사항을 [VALID_CONCERN], [MINOR_CONCERN], [NO_ISSUE] 중 하나로 라벨링하라.
  ```

### 관점 2: React 패턴 타당성 (ARCHITECT)
- Agent: `compound-engineering:ce-julik-frontend-races-reviewer`
- 대상 파일: `/Users/cjynim/.claude/plans/synthetic-inventing-tarjan.md`
- 프롬프트:
  ```
  아래 React 훅 변경 플랜을 React 관용적 패턴과 비동기 타이밍 관점에서 검토하라.

  변경 내용:
  - useRef로 hasLoadedOnce를 관리
  - fetchAccounts가 useCallback으로 감싸져 있고 [isGuest, storeAssets, storeCash] 의존성을 가짐
  - 폴링: setInterval(() => fetchAccounts(), 10000)

  검토 항목:
  1. useRef는 이 사용 사례에서 React 관용적인가? useState(false)로 관리하는 것과 비교했을 때 어떤가?
  2. useCallback 의존성 [isGuest, storeAssets, storeCash]가 변경될 때 hasLoadedOnce ref는 리셋되어야 하는가, 유지되어야 하는가?
     - 예: isGuest가 false → true로 바뀌면(로그아웃), hasLoadedOnce가 true인 채로 남아있어 재로그인 후 첫 로딩 스피너가 표시되지 않을 수 있음
  3. React 18의 StrictMode(개발 환경)에서 useEffect가 두 번 실행될 때 hasLoadedOnce가 처음 실행에서 true가 되어 두 번째 실행에서 isLoading이 true로 설정되지 않는 문제가 있는가?
  4. 비동기 경쟁 조건: 두 번의 fetchAccounts 호출이 겹칠 때(예: 초기 로드 중 10초 폴링 트리거), hasLoadedOnce 처리가 올바른가?

  각 항목을 [BLOCKING], [WARNING], [OK] 중 하나로 라벨링하라.
  ```

### 관점 3: 최소 대안 (SIMPLIFIER)
- Agent: `compound-engineering:ce-code-simplicity-reviewer`
- 대상 파일: `/Users/cjynim/.claude/plans/synthetic-inventing-tarjan.md`
- 프롬프트:
  ```
  아래 플랜의 해결책(`useRef`로 hasLoadedOnce 추가)이 가장 단순한 접근인지 검토하라.

  현재 플랜: useAccounts.ts에 useRef(false)로 hasLoadedOnce 추가 후 fetchAccounts 내 조건부 setIsLoading(true) 처리

  다음 대안과 비교하라:
  1. page.tsx에서 if 조건 변경: `if (isLoading && accounts.length === 0)` — accounts가 있으면 로딩 스피너 미표시
  2. useAccounts에서 useState로 `hasLoadedOnce` 관리 (ref 대신)
  3. isLoading 초기값을 false로 설정하고, 첫 fetchAccounts 결과 수신 후 별도 처리
  4. isLoading을 아예 제거하고 accounts.length === 0을 초기 로딩 감지에 사용

  각 대안에 대해: 장점, 단점, 엣지 케이스를 분석하라.
  현재 플랜의 접근법과 비교하여 더 단순한 해법이 있는지 결론 내려라.

  결론: [SIMPLER_ALTERNATIVE_EXISTS] 또는 [CURRENT_IS_SIMPLEST]로 라벨링하라.
  ```

### convergence-evaluator (공통)
- Agent: convergence-evaluator (demiurge agent)
- 별도 프롬프트 불필요 — agent 정의에 판정 라벨 기준, 안정 카운터 규칙, report.md 갱신 형식이 내장되어 있음
- 입력: 위 검증 Agent들의 출력 전체 + `docs/demiurge/rl-verify/polling-flicker-fix/report.md` 경로

## 수렴/완료 기준
- [ ] Tier 2: 모든 발견사항의 안정 카운터 >= 2 (판정 라벨 2회 연속 동일)
- [ ] 새로운 발견 0건
- [ ] CONTESTED 항목 0건
- [ ] BLOCKING 항목 0건

## 하지 말 것
- 검증 대상 플랜 파일을 수정하지 마 (수정은 검증 완료 후 /organize 통해 사용자 동의 하에)
- 추측으로 수렴했다고 판단하지 마 — 실제 코드 확인 근거 필요
- subagent를 background로 실행하지 마
- 수렴하지 않았는데 COMPLETE를 출력하지 마
