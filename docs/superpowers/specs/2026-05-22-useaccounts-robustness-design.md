---
title: useAccounts 강건성 개선 설계
date: 2026-05-22
status: approved
---

# useAccounts 강건성 개선 설계

## 배경

폴링 깜빡임 수정(PR #18e17f9) 이후 코드 리뷰에서 4가지 문제군이 발견됐다.

1. **동시 fetch 레이스** — AbortController 없어서 스테일 응답이 최신 데이터를 덮어씀
2. **non-ok HTTP 에러 처리 부재** — 500/503 응답 시 spinner는 사라지지만 에러 UI 없음
3. **폴링 interval 리셋** — `storeAssets/storeCash`가 `useCallback` deps에 있어 Zustand 변경마다 `fetchAccounts` 재생성 → `setInterval` 리셋
4. **테스트 공백** — `res.ok=false`, `isGuest=true` 경로 미테스트

---

## 완료 조건

- [ ] `fetchAccounts` 동시 호출 시 이전 요청 abort, `onError` 미호출
- [ ] `res.ok=false` 시 `onError` 호출 + `isLoading=false` + 기존 `accounts` 유지
- [ ] `storeAssets` 변경 후에도 `fetchAccounts` 참조 불변 (vitest로 검증)
- [ ] 마운트 시 `fetchAccounts` 1회만 호출
- [ ] `npm test` 전체 통과 (신규 9개 포함)

---

## 금지사항

- `useAccounts` 반환 시그니처(`accounts`, `setAccounts`, `isLoading`, `fetchAccounts`) 변경 금지 — `useAssetActions`, `usePortfolioData` 호환 유지
- `finally` 블록 재도입 금지 — success/error 비대칭 처리가 의도적임
- `useFetch` 같은 범용 추상화 도입 금지 (YAGNI)
- `page.tsx` 폴링 `setInterval` 로직 수정 금지 — deps 안정화로 자연 해결

---

## 고려사항

- `fetchWithAuth`는 이미 `options: RequestInit`을 받으므로 `signal` 전달 가능 (기존 수정 불필요)
- 401 재시도 시 두 번째 `fetch`도 `options`를 spread하므로 `signal` 자동 전달됨
- React 18.3+에서 `startTransition`이 named export로 제공됨 — `package.json`의 React 버전 확인 필요
- AbortError(`DOMException`, name `'AbortError'`)는 에러가 아니므로 catch에서 early return
- `usePortfolioData`의 `useEffect([isGuest, token])` dep에서 `fetchAccounts`를 제거해야 deps warning 없음

---

## 제약사항

- `useAssetActions`의 `UseAssetActionsOptions.fetchAccounts: () => Promise<void>` 타입 유지
- `usePortfolioData`의 `onError` prop은 optional (`onError?: (msg: string) => void`) — 하위 호환

---

## 스킬 매핑

| Task | 스킬 |
|------|------|
| 전체 구현 | tdd-developer agent |
| 코드 리뷰 | /compound-engineering:ce-code-review |
| 완료 | /superpowers:finishing-a-development-branch |

---

## 설계

### 1. `useAccounts` 훅 재작성

**파일**: `frontend/src/lib/hooks/useAccounts.ts`

#### 시그니처 변경

```typescript
export function useAccounts(
  isGuest: boolean,
  onError?: (msg: string) => void
)
```

`onError`는 optional. 기존 호출부 `useAccounts(isGuest)` 호환 유지.

#### 내부 변경

```typescript
import { useState, useCallback, useEffect, useRef, startTransition } from 'react';
// useTransition 제거 — startTransition을 named export로 직접 import

const abortRef = useRef<AbortController | null>(null);

// storeAssets/storeCash를 ref로 포워딩 (deps에서 제거)
const storeAssetsRef = useRef(storeAssets);
const storeCashRef = useRef(storeCash);
useEffect(() => {
  storeAssetsRef.current = storeAssets;
  storeCashRef.current = storeCash;
});

const fetchAccounts = useCallback(async (): Promise<void> => {
  // AbortController: 이전 요청 취소
  abortRef.current?.abort();
  const controller = new AbortController();
  abortRef.current = controller;

  try {
    if (isGuest) {
      const assets = storeAssetsRef.current;
      const cash = storeCashRef.current;
      // ... 게스트 계좌 계산 ...
      startTransition(() => {
        setAccounts([guestAccount]);
        setIsLoading(false);
      });
    } else {
      const res = await fetchWithAuth(`${API_URL}/accounts`, { signal: controller.signal });
      if (res.ok) {
        const data: Account[] = await res.json();
        startTransition(() => {
          setAccounts(data);
          setIsLoading(false);
        });
      } else {
        onError?.('데이터를 불러오지 못했습니다.');
        setIsLoading(false);
      }
    }
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') return;
    console.error('fetchAccounts failed', e instanceof Error ? e.message : e);
    onError?.('네트워크 오류가 발생했습니다.');
    setIsLoading(false);
  }
}, [isGuest]); // storeAssets/storeCash deps 제거
```

**효과**:
- `fetchAccounts` 참조가 `isGuest` 바뀔 때만 변경 → `page.tsx setInterval` 리셋 없어짐
- AbortController로 동시 요청 방지
- `onError`로 에러를 호출부로 위임 (훅이 UI 관심사 보유 안 함)

---

### 2. `usePortfolioData` 수정

**파일**: `frontend/src/lib/hooks/usePortfolioData.ts`

```diff
-export const usePortfolioData = () => {
+export const usePortfolioData = (options?: { onError?: (msg: string) => void }) => {
   ...
-  const { accounts, setAccounts, isLoading, fetchAccounts } = useAccounts(isGuest);
+  const { accounts, setAccounts, isLoading, fetchAccounts } = useAccounts(isGuest, options?.onError);
```

`onError` optional prop 추가. 기존 `usePortfolioData()` 호출부 호환 유지.

`useEffect([isGuest, token])` deps에서 `fetchAccounts`를 제거하고 `eslint-disable` 또는 `useEffectEvent`(React 19)로 처리:

```typescript
// fetchAccounts는 isGuest 변경 시 이미 재생성되므로 deps에서 제외해도 안전
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => { fetchAccounts(); }, [isGuest, token]);
```

---

### 3. `page.tsx` 수정

**파일**: `frontend/src/app/page.tsx`

```diff
  const {
    accounts, fetchAccounts, isGuest, isLoading,
    ...
-  } = usePortfolioData();
+  } = usePortfolioData({ onError: (msg) => showToast(msg, 'error') });

- useEffect(() => { fetchAccounts(); }, [fetchAccounts]);  // ← 이중 호출 제거
```

#### showToast 타이머 정리

```diff
+ const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (message: string, type: 'info' | 'error' = 'info') => {
+   if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
-   setTimeout(() => setToast({ message: '', type: 'info' }), 3000);
+   toastTimerRef.current = setTimeout(() => setToast({ message: '', type: 'info' }), 3000);
  };
+ useEffect(() => () => {
+   if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
+ }, []);
```

---

### 4. 테스트 보완

**파일**: `frontend/tests/hooks/useAccounts.test.ts`

기존 4개 테스트에 `// Given / // When / // Then` 구조 주석 추가.

신규 5개 추가:

| # | 카테고리 | 내용 |
|---|---------|------|
| 5 | `[Error]` | `res.ok=false` (HTTP 500) → `isLoading=false`, `accounts=[]`, `onError` 호출됨 |
| 6 | `[Happy]` | `isGuest=true` + store에 자산 있을 때 게스트 계좌 반환 + `fetchWithAuth` 미호출 |
| 7 | `[Boundary]` | `isGuest=true` + 빈 store → 0값 게스트 계좌 (crash 없음) |
| 8 | `[Boundary]` | AbortController: `fetchAccounts` 두 번 호출, 첫 번째 abort → `onError` 1회만 호출 (두 번째 실패만) |
| 9 | `[Boundary]` | `storeAssets` 변경 후에도 `fetchAccounts` 참조 불변 |

---

## Task List

### Task 1 — React 버전 확인 및 startTransition named export 검증

**완료 조건**: `package.json`의 React 버전이 18.3+ 임을 확인하고 `import { startTransition } from 'react'` 가 컴파일되는지 검증  
**스킬 매핑**: Bash (직접 확인)

### Task 2 — `useAccounts` 훅 재작성 (TDD: RED)

**완료 조건**: 새 테스트 케이스 5개 작성 완료, 전부 FAIL  
**스킬 매핑**: tdd-developer

### Task 3 — `useAccounts` 훅 재작성 (TDD: GREEN)

**완료 조건**: 기존 4개 + 신규 5개 총 9개 테스트 PASS  
**스킬 매핑**: tdd-developer

### Task 4 — `usePortfolioData` + `page.tsx` 수정

**완료 조건**: `onError` prop 연결 완료, `useEffect([fetchAccounts])` 제거, showToast 타이머 정리, 전체 테스트 통과  
**스킬 매핑**: tdd-developer

### Task 5 — 최종 검증

**완료 조건**: `npm test` 전체 통과, `npx tsc --noEmit` 통과, 개발 서버 수동 확인  
**스킬 매핑**: verify
