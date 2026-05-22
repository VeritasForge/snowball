import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
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
