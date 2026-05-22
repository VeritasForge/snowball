# useAccounts 강건성 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `useAccounts` 훅에 AbortController 추가, non-ok 에러 처리, polling interval 안정화, 테스트 보완을 통해 폴링 깜빡임 수정 이후 발견된 4가지 문제군을 해결한다.

**Architecture:** `useAccounts(isGuest, onError?)` 훅을 일괄 재작성하여 AbortController ref, storeAssets/storeCash ref 포워딩, standalone `startTransition`, `onError` 콜백을 적용한다. `usePortfolioData`에 `onError` prop을 추가하고 `page.tsx`의 중복 `useEffect` 및 `showToast` 타이머 누수를 정리한다.

**Tech Stack:** React 19.2.3 (startTransition named export), Zustand, Vitest + @testing-library/react, TypeScript strict

---

## File Map

| 파일 | 변경 종류 | 역할 |
|------|---------|------|
| `frontend/src/lib/hooks/useAccounts.ts` | Modify | AbortController, ref forwarding, onError, startTransition |
| `frontend/src/lib/hooks/usePortfolioData.ts` | Modify | onError prop 추가, eslint-disable |
| `frontend/src/app/page.tsx` | Modify | 중복 useEffect 제거, onError 연결, showToast 타이머 정리 |
| `frontend/tests/hooks/useAccounts.test.ts` | Modify | 신규 5개 테스트 + 기존 4개에 Given/When/Then 주석 |

---

## 사전 확인

**기존 TS 에러 (이번 작업과 무관, 무시):**
- `src/components/DonutChart.tsx` — Formatter 타입 에러
- `src/components/SummarySection.tsx` — 타입 에러
- `tests/components/DonutChart.test.tsx` — 3개 에러

이 에러들은 이번 PR에서 수정하지 않는다.

---

## Task 1: RED — 신규 테스트 5개 작성 (실패 확인)

**Files:**
- Modify: `frontend/tests/hooks/useAccounts.test.ts`

- [ ] **Step 1: 기존 테스트 파일 끝에 신규 5개 테스트 추가**

`frontend/tests/hooks/useAccounts.test.ts` 의 `});` (마지막 줄) 바로 앞에 아래 5개 테스트를 삽입한다:

```typescript
  // [Error] res.ok=false (HTTP 500) 시 isLoading false, onError 호출, accounts 유지
  test('[Error] res.ok=false 시 isLoading false, onError 호출됨', async () => {
    // Given: HTTP 500 응답, onError 스파이
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'Internal Server Error' }),
    });
    const onError = vi.fn();
    useAuthStore.setState({ isAuthenticated: true, token: 'valid-token', refreshToken: 'valid-refresh', user: { id: '1', email: 'test@example.com' } });
    localStorage.setItem('access_token', 'valid-token');

    // When
    const { result } = renderHook(() => useAccounts(false, onError));
    await act(async () => { await result.current.fetchAccounts(); });

    // Then
    expect(result.current.isLoading).toBe(false);
    expect(result.current.accounts).toHaveLength(0);
    expect(onError).toHaveBeenCalledWith('데이터를 불러오지 못했습니다.');
  });

  // [Happy] isGuest=true + store에 자산 있을 때 게스트 계좌 반환 + fetchWithAuth 미호출
  test('[Happy] isGuest=true 시 store 자산으로 게스트 계좌 반환, fetch 미호출', async () => {
    // Given: 게스트 모드, store에 자산 있음
    usePortfolioStore.setState({
      assets: [{ id: 1, name: '삼성전자', code: '005930', category: '주식', targetWeight: 60, currentPrice: 70000, avgPrice: 65000, quantity: 10 }],
      cash: 100000,
    });
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    // When
    const { result } = renderHook(() => useAccounts(true));
    await act(async () => { await result.current.fetchAccounts(); });

    // Then
    expect(result.current.isLoading).toBe(false);
    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].name).toBe('게스트 포트폴리오');
    expect(result.current.accounts[0].assets).toHaveLength(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // [Boundary] isGuest=true + 빈 store → 0값 게스트 계좌 (crash 없음)
  test('[Boundary] isGuest=true + 빈 store → 0값 게스트 계좌 정상 반환', async () => {
    // Given: 게스트 모드, store 비어있음 (beforeEach에서 reset됨)

    // When
    const { result } = renderHook(() => useAccounts(true));
    await act(async () => { await result.current.fetchAccounts(); });

    // Then
    expect(result.current.isLoading).toBe(false);
    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].name).toBe('게스트 포트폴리오');
    expect(result.current.accounts[0].total_asset_value).toBe(0);
    expect(result.current.accounts[0].assets).toHaveLength(0);
  });

  // [Boundary] fetch가 AbortError throw 시 onError 미호출
  test('[Boundary] fetch AbortError 시 onError 미호출 (정상 취소)', async () => {
    // Given: fetch가 AbortError를 던짐
    global.fetch = vi.fn().mockRejectedValue(
      new DOMException('The operation was aborted.', 'AbortError')
    );
    const onError = vi.fn();
    useAuthStore.setState({ isAuthenticated: true, token: 'valid-token', refreshToken: 'valid-refresh', user: { id: '1', email: 'test@example.com' } });
    localStorage.setItem('access_token', 'valid-token');

    // When
    const { result } = renderHook(() => useAccounts(false, onError));
    await act(async () => { await result.current.fetchAccounts(); });

    // Then: onError 호출되지 않음 (AbortError는 에러가 아님)
    expect(onError).not.toHaveBeenCalled();
  });

  // [Boundary] storeAssets 변경 후에도 fetchAccounts 참조 불변 (polling interval 리셋 없음)
  test('[Boundary] storeAssets 변경 후에도 fetchAccounts 참조 불변', async () => {
    // Given: 인증된 상태
    useAuthStore.setState({ isAuthenticated: true, token: 'valid-token', refreshToken: 'valid-refresh', user: { id: '1', email: 'test@example.com' } });

    const { result, rerender } = renderHook(() => useAccounts(false));
    const initialFetchAccounts = result.current.fetchAccounts;

    // When: Zustand store에 자산 추가
    act(() => {
      usePortfolioStore.getState().addAsset({
        name: '삼성전자', code: '005930', category: '주식',
        targetWeight: 60, currentPrice: 70000, avgPrice: 65000, quantity: 10,
      });
    });
    rerender();

    // Then: fetchAccounts 참조 불변
    expect(result.current.fetchAccounts).toBe(initialFetchAccounts);
  });
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd frontend && npx vitest run tests/hooks/useAccounts.test.ts
```

**예상**: 신규 5개 테스트 FAIL (현재 `useAccounts` 가 `onError` param 없음, `storeAssets` deps에 포함)

---

## Task 2: GREEN — useAccounts.ts 재작성

**Files:**
- Modify: `frontend/src/lib/hooks/useAccounts.ts`

- [ ] **Step 1: useAccounts.ts 전체를 아래 내용으로 교체**

```typescript
import { useState, useCallback, useEffect, useRef, startTransition } from 'react';
import { Account, Asset } from '../../types';
import { usePortfolioStore, Asset as StoreAsset } from '../store';
import { fetchWithAuth } from '../fetchWithAuth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

const calculateAsset = (asset: StoreAsset, totalValue: number): Asset => {
  const current_value = asset.currentPrice * asset.quantity;
  const invested_amount = asset.avgPrice * asset.quantity;
  const pl_amount = current_value - invested_amount;
  const pl_rate = asset.avgPrice > 0 ? (pl_amount / invested_amount) * 100 : 0;
  const target_value = totalValue * (asset.targetWeight / 100);
  const diff_value = target_value - current_value;
  const action_quantity = asset.currentPrice > 0 ? Math.floor(diff_value / asset.currentPrice) : 0;
  return {
    ...asset,
    id: asset.id ?? Math.random(),
    account_id: -1,
    target_weight: asset.targetWeight,
    current_price: asset.currentPrice,
    avg_price: asset.avgPrice,
    current_value, invested_amount, pl_amount, pl_rate,
    current_weight: totalValue > 0 ? (current_value / totalValue) * 100 : 0,
    target_value, diff_value,
    action: 'HOLD' as const,
    action_quantity,
  };
};

export function useAccounts(isGuest: boolean, onError?: (msg: string) => void) {
  const storeAssets = usePortfolioStore(state => state.assets);
  const storeCash = usePortfolioStore(state => state.cash);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const abortRef = useRef<AbortController | null>(null);
  // storeAssets/storeCash/onError를 ref로 포워딩: fetchAccounts deps에서 제외하여 polling interval 안정화
  const storeAssetsRef = useRef(storeAssets);
  const storeCashRef = useRef(storeCash);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    storeAssetsRef.current = storeAssets;
    storeCashRef.current = storeCash;
    onErrorRef.current = onError;
  });

  const fetchAccounts = useCallback(async (): Promise<void> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      if (isGuest) {
        const assets = storeAssetsRef.current;
        const cash = storeCashRef.current;
        const totalAssets = assets.reduce((sum, a) => sum + a.currentPrice * a.quantity, 0);
        const totalValue = totalAssets + cash;
        const guestAssets = assets.map(a => calculateAsset(a, totalValue));
        const totalInvested = assets.reduce((sum, a) => sum + a.avgPrice * a.quantity, 0);
        const totalPl = totalAssets - totalInvested;
        const guestAccount: Account = {
          id: -1, name: '게스트 포트폴리오', cash,
          assets: guestAssets, total_asset_value: totalValue,
          total_invested_value: totalInvested, total_pl_amount: totalPl,
          total_pl_rate: totalInvested > 0 ? (totalPl / totalInvested) * 100 : 0,
        };
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
          onErrorRef.current?.('데이터를 불러오지 못했습니다.');
          setIsLoading(false);
        }
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      console.error('fetchAccounts failed', e instanceof Error ? e.message : e);
      onErrorRef.current?.('네트워크 오류가 발생했습니다.');
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest]); // storeAssets/storeCash/onError는 ref로 읽어 deps에서 의도적으로 제외

  return { accounts, setAccounts, isLoading, fetchAccounts };
}
```

- [ ] **Step 2: 전체 테스트 통과 확인**

```bash
cd frontend && npx vitest run tests/hooks/useAccounts.test.ts
```

**예상**: 9개 테스트 모두 PASS

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/lib/hooks/useAccounts.ts
git commit -m "refactor(frontend): rewrite useAccounts with AbortController, ref-forwarding deps, onError"
```

---

## Task 3: REFACTOR — 기존 테스트 4개에 Given/When/Then 주석 추가

**Files:**
- Modify: `frontend/tests/hooks/useAccounts.test.ts`

- [ ] **Step 1: 기존 4개 테스트에 // Given / // When / // Then 주석 추가**

`frontend/tests/hooks/useAccounts.test.ts` 를 열어 기존 4개 테스트를 아래와 같이 수정한다.

**테스트 1** (라인 19):
```typescript
  test('[Happy] 초기 fetch 완료 시 isLoading false와 accounts 데이터가 동시에 반영된다', async () => {
    // Given: 인증된 사용자, 정상 응답 mock
    const account = { id: 1, name: '테스트 계좌', cash: 0, assets: [], total_asset_value: 0, total_invested_value: 0, total_pl_amount: 0, total_pl_rate: 0 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [account],
    });
    useAuthStore.setState({ isAuthenticated: true, token: 'valid-token', refreshToken: 'valid-refresh', user: { id: '1', email: 'test@example.com' } });
    localStorage.setItem('access_token', 'valid-token');

    const { result } = renderHook(() => useAccounts(false));

    // 초기값 확인
    expect(result.current.isLoading).toBe(true);
    expect(result.current.accounts).toHaveLength(0);

    // When: fetchAccounts 호출
    await act(async () => { await result.current.fetchAccounts(); });

    // Then: isLoading false AND accounts 데이터 동시 반영
    expect(result.current.isLoading).toBe(false);
    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].name).toBe('테스트 계좌');
  });
```

**테스트 2** (라인 44):
```typescript
  test('[Boundary] 폴링 시 fetchAccounts를 재호출해도 isLoading이 true가 되지 않는다', async () => {
    // Given: 인증된 사용자, 정상 응답
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ id: 1, name: '테스트 계좌', cash: 0, assets: [], total_asset_value: 0, total_invested_value: 0, total_pl_amount: 0, total_pl_rate: 0 }],
    });
    useAuthStore.setState({ isAuthenticated: true, token: 'valid-token', refreshToken: 'valid-refresh', user: { id: '1', email: 'test@example.com' } });
    localStorage.setItem('access_token', 'valid-token');

    const { result } = renderHook(() => useAccounts(false));

    // 첫 번째 호출로 초기 로딩 완료
    await act(async () => { await result.current.fetchAccounts(); });

    // When: 두 번째 호출 (폴링 시뮬레이션) 중 isLoading 값 캡처
    const loadingValues: boolean[] = [];
    await act(async () => {
      const promise = result.current.fetchAccounts();
      loadingValues.push(result.current.isLoading);
      await promise;
    });

    // Then: 폴링 중에도 isLoading은 false 유지
    expect(loadingValues).not.toContain(true);
    expect(result.current.isLoading).toBe(false);
  });
```

**테스트 3** (라인 75):
```typescript
  test('[Error] fetch 실패 시 isLoading이 false로 리셋된다', async () => {
    // Given: fetch가 네트워크 에러 throw
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    useAuthStore.setState({ isAuthenticated: true, token: 'valid-token', refreshToken: 'valid-refresh', user: { id: '1', email: 'test@example.com' } });
    localStorage.setItem('access_token', 'valid-token');

    const { result } = renderHook(() => useAccounts(false));

    // When
    await act(async () => { await result.current.fetchAccounts(); });

    // Then: 에러 후에도 isLoading은 false (catch에서 처리)
    expect(result.current.isLoading).toBe(false);
  });
```

**테스트 4** (라인 90):
```typescript
  test('[Happy] 폴링 호출 시 accounts가 새 데이터로 갱신된다', async () => {
    // Given: 첫 번째/두 번째 응답이 다른 데이터
    const firstResponse = [{ id: 1, name: '계좌1', cash: 100, assets: [], total_asset_value: 100, total_invested_value: 0, total_pl_amount: 0, total_pl_rate: 0 }];
    const secondResponse = [{ id: 1, name: '계좌1', cash: 999, assets: [], total_asset_value: 999, total_invested_value: 0, total_pl_amount: 0, total_pl_rate: 0 }];
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => (callCount === 1 ? firstResponse : secondResponse),
      });
    });
    useAuthStore.setState({ isAuthenticated: true, token: 'valid-token', refreshToken: 'valid-refresh', user: { id: '1', email: 'test@example.com' } });
    localStorage.setItem('access_token', 'valid-token');

    const { result } = renderHook(() => useAccounts(false));

    // When: 첫 번째 fetch
    await act(async () => { await result.current.fetchAccounts(); });
    // Then: 첫 번째 응답 반영
    expect(result.current.accounts[0].cash).toBe(100);

    // When: 두 번째 fetch (폴링)
    await act(async () => { await result.current.fetchAccounts(); });
    // Then: 두 번째 응답으로 갱신
    expect(result.current.accounts[0].cash).toBe(999);
  });
```

- [ ] **Step 2: 테스트 통과 확인**

```bash
cd frontend && npx vitest run tests/hooks/useAccounts.test.ts
```

**예상**: 9개 테스트 PASS

- [ ] **Step 3: 커밋**

```bash
git add frontend/tests/hooks/useAccounts.test.ts
git commit -m "test(frontend): add 5 new tests + Given/When/Then structure to useAccounts"
```

---

## Task 4: usePortfolioData 수정

**Files:**
- Modify: `frontend/src/lib/hooks/usePortfolioData.ts`

- [ ] **Step 1: 시그니처에 options 추가 및 useAccounts에 onError 전달**

`frontend/src/lib/hooks/usePortfolioData.ts` 상단의 함수 선언을 수정한다:

```typescript
export const usePortfolioData = (options?: { onError?: (msg: string) => void }) => {
```

`useAccounts` 호출부 수정:
```typescript
const { accounts, setAccounts, isLoading, fetchAccounts } = useAccounts(isGuest, options?.onError);
```

- [ ] **Step 2: useEffect deps에서 fetchAccounts 제거**

현재:
```typescript
useEffect(() => { fetchAccounts(); }, [isGuest, token]);
```

수정 (fetchAccounts는 isGuest 변경 시 이미 재생성되므로 deps에서 의도적으로 제외):
```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => { fetchAccounts(); }, [isGuest, token]);
```

- [ ] **Step 3: 전체 테스트 통과 확인**

```bash
cd frontend && npx vitest run
```

**예상**: 기존 전체 테스트 통과

- [ ] **Step 4: 커밋**

```bash
git add frontend/src/lib/hooks/usePortfolioData.ts
git commit -m "refactor(frontend): add onError prop to usePortfolioData"
```

---

## Task 5: page.tsx 수정

**Files:**
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: toast 상태와 showToast를 usePortfolioData 호출 이전으로 이동**

`page.tsx`에서 `const [toast, setToast] = useState(...)` 와 `showToast` 함수를 `usePortfolioData()` 호출 **이전**으로 옮기고, `onError`를 직접 연결한다.

현재 구조 (라인 순서):
```
line 20: usePortfolioData()
line 36: const [toast, setToast] = useState(...)
line 57: const showToast = ...
```

**변경 후 구조:**
```typescript
export default function Home() {
  // 1. Toast 상태 (usePortfolioData 이전에 선언)
  const [toast, setToast] = useState({ message: '', type: 'info' as 'info' | 'error' });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (message: string, type: 'info' | 'error' = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast({ message: '', type: 'info' }), 3000);
  };
  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  // 2. usePortfolioData (이제 showToast가 위에 정의됨)
  const {
    accounts, fetchAccounts, isGuest, isLoading,
    addAsset, updateAsset, deleteAsset, updateCash, fetchAssetInfo,
    createAccount: apiCreateAccount,
    updateAccountName: apiUpdateAccountName,
    deleteAccount: apiDeleteAccount,
  } = usePortfolioData({ onError: (msg) => showToast(msg, 'error') });

  // 3. 나머지 상태 (기존과 동일)
  const [activeAccountId, setActiveAccountId] = useState<number | null>(null);
  // ... (기존 useState들)
  // [toast, setToast] useState 라인은 위로 이동했으므로 여기서 삭제
```

- [ ] **Step 2: 중복 useEffect 제거**

아래 줄을 삭제한다:

```typescript
useEffect(() => { fetchAccounts(); }, [fetchAccounts]);
```

이 useEffect는 `usePortfolioData` 내부에서 이미 처리하므로 중복이다.

- [ ] **Step 3: showToast setTimeout 타이머 정리**

`import React, { useState, useEffect }` 를 `import React, { useState, useEffect, useRef }` 로 변경한다.

기존 `showToast`:
```typescript
const showToast = (message: string, type: 'info' | 'error' = 'info') => {
  setToast({ message, type });
  setTimeout(() => setToast({ message: '', type: 'info' }), 3000);
};
```

수정:
```typescript
const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const showToast = (message: string, type: 'info' | 'error' = 'info') => {
  if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  setToast({ message, type });
  toastTimerRef.current = setTimeout(() => setToast({ message: '', type: 'info' }), 3000);
};
useEffect(() => () => {
  if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
}, []);
```

- [ ] **Step 4: 전체 테스트 통과 확인**

```bash
cd frontend && npx vitest run
```

**예상**: 전체 통과

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/app/page.tsx
git commit -m "fix(frontend): remove duplicate fetchAccounts useEffect, fix showToast timer leak, wire onError"
```

---

## Task 6: 최종 검증

- [ ] **Step 1: TypeScript 검사 (기존 에러 수 동일한지 확인)**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -v "DonutChart\|SummarySection" | head -20
```

**예상**: useAccounts.ts / usePortfolioData.ts / page.tsx 관련 에러 없음

- [ ] **Step 2: 전체 테스트 최종 확인**

```bash
cd frontend && npx vitest run
```

**예상**: 17개 이상 (기존 12개 + 신규 5개) 전체 PASS

- [ ] **Step 3: 개발 서버 실행 후 수동 확인**

```bash
cd frontend && npm run dev
```

브라우저에서 `http://localhost:3000` 접속 후:
- 로그인 → 계좌 로딩 확인 (spinner 표시 → 데이터 표시)
- 10초 대기 → 폴링 시 spinner 재표시 없음 확인
- 백엔드 종료 후 폴링 → 토스트 에러 메시지 표시 확인

- [ ] **Step 4: 최종 커밋 (변경 없을 경우 생략)**

```bash
git log --oneline -5
```

---

## 완료 조건 체크리스트

- [ ] `fetchAccounts` 동시 호출 시 이전 요청 abort, `onError` 미호출
- [ ] `res.ok=false` 시 `onError` 호출 + `isLoading=false` + 기존 `accounts` 유지
- [ ] `storeAssets` 변경 후에도 `fetchAccounts` 참조 불변 (테스트 9 PASS)
- [ ] 마운트 시 `fetchAccounts` 1회만 호출 (page.tsx 중복 useEffect 제거)
- [ ] `npx vitest run` 전체 통과 (신규 5개 포함)
