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

  // [Error] fetch 실패 시에도 isLoading이 false로 정상 리셋된다
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
});
