# Polling Flicker Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 10초 폴링 시 `setIsLoading(true)`가 호출되어 전체 화면이 로딩 스피너로 교체되는 깜빡임 현상을 제거한다.

**Architecture:** `useAccounts` 훅의 `fetchAccounts`에서 `setIsLoading(true)` 1줄을 삭제하고, `setAccounts` 호출 2곳을 `startTransition`으로 감싸 비긴급(non-urgent) 폴링 업데이트로 처리한다. `isLoading`의 `true` 초기값이 최초 로딩 스피너를 보장하므로 추가 변경 없이 초기 로딩 UX는 유지된다. (Vercel rules: `rendering-usetransition-loading`, `rerender-transitions`)

**Tech Stack:** React 19.2.3 (async startTransition 지원), TypeScript, Vitest, @testing-library/react

---

## Root Cause

```
setInterval(fetchAccounts, 10000)     ← 10초마다 실행
  → setIsLoading(true)               ← ❌ 전체 화면이 스피너로 교체됨 (깜빡!)
  → GET /accounts
  → setAccounts(newData)
  → setIsLoading(false)              ← 다시 원래 화면으로 돌아옴
```

`page.tsx:99`의 `if (isLoading) return <Spinner />` 때문에 `isLoading`이 `true`가 되는 순간 전체 UI가 사라진다. `isLoading`은 최초 진입 시 딱 한 번만 `true`여야 한다.

---

## File Structure

| 역할 | 파일 |
|------|------|
| **수정** | `frontend/src/lib/hooks/useAccounts.ts` |
| **신규** | `frontend/tests/hooks/useAccounts.test.ts` |
| 참고 (수정 없음) | `frontend/src/app/page.tsx:99` |

---

## Vercel Rules Applied

| Rule | 적용 내용 |
|------|-----------|
| `rendering-usetransition-loading` | 수동 `setIsLoading(true/false)` 패턴 대신 `useTransition`의 `isPending`으로 전환 가능. 여기서는 초기 로딩 스피너(`isLoading` 초기값 `true`)는 유지하고, 폴링 업데이트만 `startTransition`으로 처리 |
| `rerender-transitions` | 폴링 데이터는 비긴급 업데이트 — `startTransition(() => setAccounts(data))`으로 감싸면 React가 사용자 입력(클릭, 타이핑)을 폴링 리렌더보다 우선 처리 |
| `state-decouple-implementation` (composition) | 이미 올바름: `useAccounts`가 상태 관리, `page.tsx`가 UI만 담당. 패턴 유지 |

> **React 19 참고**: React 19에서는 `startTransition(async () => {...})` 지원. 단, `finally`의 `setIsLoading(false)` 타이밍을 보존하기 위해 `await res.json()`은 `startTransition` 바깥에서 처리한다.

---

## Task 1: 테스트 작성 (RED)

**Files:**
- Create: `frontend/tests/hooks/useAccounts.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// frontend/tests/hooks/useAccounts.test.ts
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAccounts } from '../../src/lib/hooks/useAccounts';
import { usePortfolioStore } from '../../src/lib/store';
import { useAuthStore } from '../../src/lib/auth';

const originalFetch = global.fetch;

describe('useAccounts — 폴링 깜빡임 수정', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({ user: null, token: null, refreshToken: null, isAuthenticated: false });
    usePortfolioStore.getState().reset();
    global.fetch = originalFetch;
  });

  // [Happy] 초기 로딩: isLoading은 true로 시작하고 첫 fetch 완료 후 false가 된다
  test('[Happy] 초기 마운트 시 isLoading이 true이고 fetch 완료 후 false가 된다', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ id: 1, name: '테스트 계좌', cash: 0, assets: [], total_asset_value: 0, total_invested_value: 0, total_pl_amount: 0, total_pl_rate: 0 }],
    });

    useAuthStore.setState({ isAuthenticated: true, token: 'valid-token', refreshToken: 'valid-refresh', user: { id: '1', email: 'test@example.com' } });
    localStorage.setItem('access_token', 'valid-token');

    const { result } = renderHook(() => useAccounts(false));

    // 초기값: true
    expect(result.current.isLoading).toBe(true);

    // 첫 fetch 수동 호출 후 false
    await act(async () => { await result.current.fetchAccounts(); });
    expect(result.current.isLoading).toBe(false);
  });

  // [Boundary] 폴링: fetchAccounts 재호출 시 isLoading이 true가 되지 않는다 (핵심 버그 검증)
  test('[Boundary] 폴링 시 fetchAccounts를 재호출해도 isLoading이 true가 되지 않는다', async () => {
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
    expect(result.current.isLoading).toBe(false);

    // 폴링 시뮬레이션: 두 번째 호출 중 isLoading이 true가 되면 안 됨
    const loadingValues: boolean[] = [];
    await act(async () => {
      const promise = result.current.fetchAccounts();
      // 동기적으로 이미 변경된 값 캡처
      loadingValues.push(result.current.isLoading);
      await promise;
    });

    // 폴링 중에도 isLoading은 false 유지
    expect(loadingValues).not.toContain(true);
    expect(result.current.isLoading).toBe(false);
  });

  // [Error] fetch 실패 시에도 isLoading이 false로 정상 리셋된다
  test('[Error] fetch 실패 시 isLoading이 false로 리셋된다', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    useAuthStore.setState({ isAuthenticated: true, token: 'valid-token', refreshToken: 'valid-refresh', user: { id: '1', email: 'test@example.com' } });
    localStorage.setItem('access_token', 'valid-token');

    const { result } = renderHook(() => useAccounts(false));

    await act(async () => { await result.current.fetchAccounts(); });

    // 에러 후에도 isLoading은 false (finally 보장)
    expect(result.current.isLoading).toBe(false);
  });

  // [Happy] accounts가 폴링 후 최신 데이터로 갱신된다
  test('[Happy] 폴링 호출 시 accounts가 새 데이터로 갱신된다', async () => {
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

    await act(async () => { await result.current.fetchAccounts(); });
    expect(result.current.accounts[0].cash).toBe(100);

    await act(async () => { await result.current.fetchAccounts(); });
    expect(result.current.accounts[0].cash).toBe(999);
  });
});
```

- [ ] **Step 2: 테스트를 실행하여 FAIL 확인**

```bash
cd frontend && npx vitest run tests/hooks/useAccounts.test.ts
```

예상 결과: `[Boundary]` 테스트가 FAIL — 현재 코드에서 `setIsLoading(true)` 가 폴링 시 `true`를 설정하기 때문.

---

## Task 2: 구현 (GREEN)

**Files:**
- Modify: `frontend/src/lib/hooks/useAccounts.ts:1,36-63`

- [ ] **Step 3: `useAccounts.ts` 수정**

현재 코드 (`frontend/src/lib/hooks/useAccounts.ts`):
```typescript
import { useState, useCallback } from 'react';
// ...
export function useAccounts(isGuest: boolean) {
  const storeAssets = usePortfolioStore(state => state.assets);
  const storeCash = usePortfolioStore(state => state.cash);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);                                    // ← 삭제
    try {
      if (isGuest) {
        const totalAssets = storeAssets.reduce((sum, a) => sum + a.currentPrice * a.quantity, 0);
        const totalValue = totalAssets + storeCash;
        const guestAssets = storeAssets.map(a => calculateAsset(a, totalValue));
        const totalInvested = storeAssets.reduce((sum, a) => sum + a.avgPrice * a.quantity, 0);
        const totalPl = totalAssets - totalInvested;
        const guestAccount: Account = {
          id: -1, name: '게스트 포트폴리오', cash: storeCash,
          assets: guestAssets, total_asset_value: totalValue,
          total_invested_value: totalInvested, total_pl_amount: totalPl,
          total_pl_rate: totalInvested > 0 ? (totalPl / totalInvested) * 100 : 0,
        };
        setAccounts([guestAccount]);                       // ← startTransition으로 감싸기
      } else {
        const res = await fetchWithAuth(`${API_URL}/accounts`);
        if (res.ok) setAccounts(await res.json());         // ← await 분리 + startTransition으로 감싸기
      }
    } catch (e) {
      console.error('fetchAccounts failed', e);
    } finally {
      setIsLoading(false);
    }
  }, [isGuest, storeAssets, storeCash]);

  return { accounts, setAccounts, isLoading, fetchAccounts };
}
```

수정 후:
```typescript
import { useState, useCallback, useTransition } from 'react';
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

export function useAccounts(isGuest: boolean) {
  const storeAssets = usePortfolioStore(state => state.assets);
  const storeCash = usePortfolioStore(state => state.cash);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, startTransition] = useTransition();

  const fetchAccounts = useCallback(async () => {
    try {
      if (isGuest) {
        const totalAssets = storeAssets.reduce((sum, a) => sum + a.currentPrice * a.quantity, 0);
        const totalValue = totalAssets + storeCash;
        const guestAssets = storeAssets.map(a => calculateAsset(a, totalValue));
        const totalInvested = storeAssets.reduce((sum, a) => sum + a.avgPrice * a.quantity, 0);
        const totalPl = totalAssets - totalInvested;
        const guestAccount: Account = {
          id: -1, name: '게스트 포트폴리오', cash: storeCash,
          assets: guestAssets, total_asset_value: totalValue,
          total_invested_value: totalInvested, total_pl_amount: totalPl,
          total_pl_rate: totalInvested > 0 ? (totalPl / totalInvested) * 100 : 0,
        };
        startTransition(() => setAccounts([guestAccount]));
      } else {
        const res = await fetchWithAuth(`${API_URL}/accounts`);
        if (res.ok) {
          const data = await res.json();
          startTransition(() => setAccounts(data));
        }
      }
    } catch (e) {
      console.error('fetchAccounts failed', e);
    } finally {
      setIsLoading(false);
    }
  }, [isGuest, storeAssets, storeCash]);

  return { accounts, setAccounts, isLoading, fetchAccounts };
}
```

- [ ] **Step 4: 새 테스트 실행하여 PASS 확인**

```bash
cd frontend && npx vitest run tests/hooks/useAccounts.test.ts
```

예상 결과: 4개 테스트 모두 PASS.

- [ ] **Step 5: 기존 테스트 전체 실행하여 회귀 없음 확인**

```bash
cd frontend && npm test
```

예상 결과: 모든 기존 테스트 PASS. 특히 `usePortfolioData.test.ts`의 `isLoading` 관련 어서션이 통과해야 한다.

---

## Task 3: 타입 체크 및 커밋

- [ ] **Step 6: TypeScript 타입 체크**

```bash
cd frontend && npx tsc --noEmit
```

예상 결과: 에러 없음. `useTransition`은 React 19 타입에 포함되어 있다.

- [ ] **Step 7: 커밋**

```bash
git add frontend/src/lib/hooks/useAccounts.ts frontend/tests/hooks/useAccounts.test.ts
git commit -m "fix(frontend): remove setIsLoading on poll, wrap setAccounts with startTransition

- Delete setIsLoading(true) from fetchAccounts — useState(true) initial value
  already handles the first-load spinner; re-calling it on every 10s poll
  caused a full-screen flicker
- Wrap setAccounts calls with startTransition (Vercel rerender-transitions rule)
  so polling updates are non-urgent and don't block user interactions"
```

---

## Task 4: 브라우저 시각 검증

- [ ] **Step 8: 개발 서버 실행**

```bash
cd frontend && npm run dev
```

- [ ] **Step 9: 브라우저에서 검증**

1. `http://localhost:3000` 접속
2. 최초 진입 시 로딩 스피너가 표시되는지 확인 ✓
3. 대시보드 로드 완료 후 10초 대기
4. 10초 후 화면 깜빡임(전체 스피너)이 없는지 확인 ✓
5. 폴링 중 버튼 클릭 시 즉각 반응하는지 확인 ✓

---

## Completion Criteria

- [ ] `frontend/src/lib/hooks/useAccounts.ts`에 `setIsLoading(true)` 라인이 `fetchAccounts` 내에 없음
- [ ] `useTransition` import 및 `const [, startTransition] = useTransition()` 선언 추가됨
- [ ] `setAccounts` 호출 2곳(isGuest 분기, 서버 데이터 분기)이 모두 `startTransition`으로 감싸짐
- [ ] 10초 폴링 시 전체 화면 로딩 스피너가 표시되지 않음 (브라우저 육안 확인)
- [ ] 최초 페이지 진입 시 로딩 스피너가 정상 표시됨 (브라우저 육안 확인)
- [ ] `cd frontend && npm test` 전체 통과

---

## Out of Scope (별도 이슈)

아래 문제는 이번 수정 범위 밖이며 별도 이슈로 처리한다:

| 문제 | 설명 |
|------|------|
| 마운트 시 경쟁 조건 | `fetchAccounts`가 `usePortfolioData.ts:23`, `usePortfolioData.ts:28`, `page.tsx:40` 3곳에서 동시 호출 |
| AbortController 부재 | 컴포넌트 언마운트 후 in-flight fetch가 `setAccounts` 호출 |
