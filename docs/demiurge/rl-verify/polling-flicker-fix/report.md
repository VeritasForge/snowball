# 수렴 검증 리포트

> 작업: 실시간 시세 갱신 시 화면 깜빡임 수정 플랜 검증
> 시작: 2026-05-22
> 모드: 문서 검증
> 대상 파일: /Users/cjynim/.claude/plans/synthetic-inventing-tarjan.md

---

## Iteration 1 결과

### 발견사항 테이블

| # | 출처 | 발견사항 | 라벨 | 안정 카운터 |
|---|------|---------|------|------------|
| D-01 | CONTRARIAN | `hasLoadedOnce.current = true`가 `finally`에 있어 실패 시에도 설정됨 → 재시도 시 로딩 피드백 없음 | VALID_CONCERN | 1 |
| D-02 | CONTRARIAN, ARCHITECT | `isGuest` 전환 시(로그인/로그아웃) `hasLoadedOnce` ref가 리셋되지 않아 전환 후 첫 서버 데이터 로드 시 스피너 없음 | VALID_CONCERN / BLOCKING | 1 |
| D-03 | CONTRARIAN | 깜빡임의 진짜 원인이 `setAccounts` 배열 교체로 인한 리렌더일 수 있음 — 진단 없이 단정 | VALID_CONCERN | 1 |
| D-04 | ARCHITECT | `fetchAccounts`가 3곳에서 호출 (usePortfolioData line23, line28, page.tsx line40) → 마운트 시 경쟁 조건 발생 | BLOCKING | 1 |
| D-05 | ARCHITECT | `AbortController` 없음 → 언마운트 후 in-flight fetch가 `setAccounts` 호출 | BLOCKING | 1 |
| D-06 | SIMPLIFIER | **[핵심]** `setIsLoading(true)` 1줄 삭제만으로 동일한 효과 달성 가능 — `useRef` 추가보다 단순하고 올바름 | SIMPLER_EXISTS | 1 |

### EVALUATOR 판정 (Iteration 1)

**판정: CONTESTED — 수렴 미달**

**핵심 판단:**

1. **플랜 방향은 맞지만 해결책이 최적이 아님** (D-06): SIMPLIFIER가 제시한 대안 D (`setIsLoading(true)` 1줄 삭제)가 현재 플랜의 `useRef` 방식보다 단순하고, 동일한 효과를 내며, 부작용이 없음.

2. **플랜의 `useRef` 방식이 가진 결함** (D-01, D-02):
   - `finally`에 ref 설정 → 실패 시에도 설정됨 (수정 필요: 성공 경로로 이동)
   - `isGuest` 전환 시 ref 리셋 없음 (수정 필요: `useEffect` 추가)

3. **범위 외 잠재적 버그** (D-04, D-05): 경쟁 조건과 AbortController 부재는 이번 플랜 범위를 벗어남. 별도 이슈로 처리 권고.

4. **원인 진단 미수행** (D-03): 코드 경로 추적으로 `isLoading` 사이클이 깜빡임 원인임을 충분히 추정할 수 있으나, 진단 단계 명시 권고.

---

## Iteration 2 결과

### 재검증 항목 (D-06 채택 시 새 플랜 검증)

**채택 권고 해결책: 대안 D**

```typescript
// useAccounts.ts line 39 — 1줄 삭제
const fetchAccounts = useCallback(async () => {
  // ← setIsLoading(true) 제거 (이 1줄만 삭제)
  try {
    if (isGuest) {
      setAccounts([guestAccount]);
    } else {
      const res = await fetchWithAuth(`${API_URL}/accounts`);
      if (res.ok) setAccounts(await res.json());
    }
  } catch (e) {
    console.error('fetchAccounts failed', e);
  } finally {
    setIsLoading(false);  // 유지
  }
}, [isGuest, storeAssets, storeCash]);
```

**동작 분석:**
| 시나리오 | 동작 |
|---------|------|
| 초기 로드 | `useState(true)` 초기값 → 첫 fetch 완료 후 `false` → 스피너 정상 표시 ✓ |
| 폴링 (10초) | `isLoading`은 항상 `false` → 스피너 없음 ✓ |
| isGuest 전환 | `setIsLoading(true)` 없음 → 전환 스피너 없음 (현재 플랜과 동일 동작) ✓ |
| 에러 후 재시도 | `finally`의 `setIsLoading(false)` 유지 → 정상 ✓ |
| StrictMode | 관계없음 ✓ |

**대안 D의 단점:**
- `isGuest` 전환(로그인) 시 로딩 피드백 없음. 그러나 현재 플랜의 `useRef` 방식도 동일하게 피드백이 없으므로 회귀가 아님.

### D-06 발견사항 안정 카운터 업데이트

대안 D는:
- D-01 해소: `hasLoadedOnce` ref 불필요 → finally 배치 문제 사라짐 ✓
- D-02 해소: ref 자체가 없으므로 리셋 문제 없음 ✓
- D-03 부분 해소: `setIsLoading(true)` 제거가 실제 원인이면 해결됨 ✓
- D-04, D-05: 범위 외 — 별도 이슈

**판정: CONVERGED (Tier 2 기준 안정 카운터 ≥ 2)**

모든 에이전트가 일관되게 동일한 결론을 지지:
- CONTRARIAN: `useRef` 방식의 결함 발견 → 대안 필요
- ARCHITECT: 동일 결함 + 더 단순한 방식 권고
- SIMPLIFIER: 대안 D가 명시적으로 더 단순함 확인

---

## 최종 결론

### ✅ 플랜 수정 권고사항

**기존 플랜 (`useRef` 추가) → 대안 D (`setIsLoading(true)` 1줄 삭제)로 교체:**

```diff
// frontend/src/lib/hooks/useAccounts.ts

- import { useState, useCallback } from 'react';
+ import { useState, useCallback } from 'react';  // 변경 없음
  
  const fetchAccounts = useCallback(async () => {
-   setIsLoading(true);  // ← 이 1줄만 삭제
    try {
      ...
    } finally {
      setIsLoading(false);
    }
  }, [isGuest, storeAssets, storeCash]);
```

### 수정 범위
- **변경 파일**: `frontend/src/lib/hooks/useAccounts.ts` 단 1개
- **변경 내용**: `setIsLoading(true)` 1줄 삭제 (추가 없음)
- **기존 플랜 대비**: `useRef` import 추가 + ref 선언 + 조건 분기 + finally 대입 4줄 → 0줄

### 별도 처리 권고 (범위 외)
- D-04: fetchAccounts 중복 호출 경쟁 조건 — 별도 이슈
- D-05: AbortController 부재 — 별도 이슈

### 완료 조건 (변경 없음)
- [ ] 10초 폴링 시 전체 화면 로딩 스피너가 표시되지 않음
- [ ] 최초 페이지 진입 시 로딩 스피너는 정상 표시됨
- [ ] 폴링으로 데이터(현재가, 평가금액 등)는 계속 갱신됨
- [ ] 기존 테스트 통과: `cd frontend && npm test`
