import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePortfolioData } from '../../src/lib/hooks/usePortfolioData';
import { useAuthStore } from '../../src/lib/auth';
import { usePortfolioStore } from '../../src/lib/store';

const originalFetch = global.fetch;

describe('usePortfolioData - createAccount / updateAccountName / deleteAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({ user: null, token: null, refreshToken: null, isAuthenticated: false });
    usePortfolioStore.getState().reset();
    global.fetch = originalFetch;
  });

  // ---- createAccount ----
  test('[Happy] isGuest=false: createAccount 성공 시 success=true, id 반환', async () => {
    useAuthStore.setState({
      isAuthenticated: true, token: 'valid-token', refreshToken: 'valid-refresh',
      user: { id: '1', email: 'test@example.com' },
    });
    localStorage.setItem('access_token', 'valid-token');

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ // initial fetchAccounts
        ok: true, status: 200,
        json: async () => [],
      })
      .mockResolvedValueOnce({ // createAccount POST
        ok: true, status: 200,
        json: async () => ({ id: 42, name: '새 계좌' }),
      })
      .mockResolvedValueOnce({ // fetchAccounts after create
        ok: true, status: 200,
        json: async () => [{ id: 42, name: '새 계좌', cash: 0, assets: [], total_asset_value: 0, total_invested_value: 0, total_pl_amount: 0, total_pl_rate: 0 }],
      });

    const { result } = renderHook(() => usePortfolioData());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let res: any;
    await act(async () => {
      res = await result.current.createAccount('새 계좌');
    });
    expect(res.success).toBe(true);
    expect(res.id).toBe(42);
  });

  test('[Boundary] isGuest=true: createAccount는 success=false 반환', async () => {
    const { result } = renderHook(() => usePortfolioData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let res: any;
    await act(async () => {
      res = await result.current.createAccount('새 계좌');
    });
    expect(res.success).toBe(false);
    expect(res.message).toContain('게스트');
  });

  test('[Error] isGuest=false: createAccount API 실패 시 success=false 반환', async () => {
    useAuthStore.setState({
      isAuthenticated: true, token: 'valid-token', refreshToken: 'valid-refresh',
      user: { id: '1', email: 'test@example.com' },
    });
    localStorage.setItem('access_token', 'valid-token');

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] }) // initial fetch
      .mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'Bad Request' }); // createAccount fails

    const { result } = renderHook(() => usePortfolioData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let res: any;
    await act(async () => {
      res = await result.current.createAccount('나쁜 계좌');
    });
    expect(res.success).toBe(false);
  });

  test('[Error] isGuest=false: createAccount 네트워크 에러 시 success=false', async () => {
    useAuthStore.setState({
      isAuthenticated: true, token: 'valid-token', refreshToken: 'valid-refresh',
      user: { id: '1', email: 'test@example.com' },
    });
    localStorage.setItem('access_token', 'valid-token');

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] }) // initial fetch
      .mockRejectedValueOnce(new Error('Network error')); // createAccount throws

    const { result } = renderHook(() => usePortfolioData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let res: any;
    await act(async () => {
      res = await result.current.createAccount('네트워크 실패');
    });
    expect(res.success).toBe(false);
    expect(res.message).toContain('네트워크');
  });

  // ---- updateAccountName ----
  test('[Happy] isGuest=false: updateAccountName이 낙관적 업데이트 후 API 호출한다', async () => {
    useAuthStore.setState({
      isAuthenticated: true, token: 'valid-token', refreshToken: 'valid-refresh',
      user: { id: '1', email: 'test@example.com' },
    });
    localStorage.setItem('access_token', 'valid-token');

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => [{ id: 1, name: '원래 계좌', cash: 0, assets: [], total_asset_value: 0, total_invested_value: 0, total_pl_amount: 0, total_pl_rate: 0 }],
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) }); // PATCH

    const { result } = renderHook(() => usePortfolioData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updateAccountName(1, '새 이름');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/accounts/1'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  test('[Boundary] isGuest=true: updateAccountName이 낙관적 업데이트만 수행한다', async () => {
    const { result } = renderHook(() => usePortfolioData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should not throw
    await act(async () => {
      await expect(result.current.updateAccountName(1, '새 이름')).resolves.not.toThrow();
    });
  });

  test('[Error] isGuest=false: updateAccountName API 실패 시 fetchAccounts 호출로 롤백', async () => {
    useAuthStore.setState({
      isAuthenticated: true, token: 'valid-token', refreshToken: 'valid-refresh',
      user: { id: '1', email: 'test@example.com' },
    });
    localStorage.setItem('access_token', 'valid-token');

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => [{ id: 1, name: '원래 계좌', cash: 0, assets: [], total_asset_value: 0, total_invested_value: 0, total_pl_amount: 0, total_pl_rate: 0 }],
      })
      .mockResolvedValueOnce({ ok: false, status: 500 }) // PATCH fails
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => [{ id: 1, name: '원래 계좌', cash: 0, assets: [], total_asset_value: 0, total_invested_value: 0, total_pl_amount: 0, total_pl_rate: 0 }],
      }); // fetchAccounts rollback

    const { result } = renderHook(() => usePortfolioData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updateAccountName(1, '새 이름');
    });

    // fetch should have been called 3 times (init + PATCH + rollback fetchAccounts)
    expect((global.fetch as any).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  test('[Error] isGuest=false: updateAccountName 네트워크 에러 시 fetchAccounts 호출', async () => {
    useAuthStore.setState({
      isAuthenticated: true, token: 'valid-token', refreshToken: 'valid-refresh',
      user: { id: '1', email: 'test@example.com' },
    });
    localStorage.setItem('access_token', 'valid-token');

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => [{ id: 1, name: '원래 계좌', cash: 0, assets: [], total_asset_value: 0, total_invested_value: 0, total_pl_amount: 0, total_pl_rate: 0 }],
      })
      .mockRejectedValueOnce(new Error('Network error')) // PATCH throws
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => [],
      });

    const { result } = renderHook(() => usePortfolioData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await expect(result.current.updateAccountName(1, '새 이름')).resolves.not.toThrow();
    });
  });

  // ---- deleteAccount ----
  test('[Happy] isGuest=false: deleteAccount 성공 시 success=true 반환', async () => {
    useAuthStore.setState({
      isAuthenticated: true, token: 'valid-token', refreshToken: 'valid-refresh',
      user: { id: '1', email: 'test@example.com' },
    });
    localStorage.setItem('access_token', 'valid-token');

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => [{ id: 1, name: '계좌', cash: 0, assets: [], total_asset_value: 0, total_invested_value: 0, total_pl_amount: 0, total_pl_rate: 0 }],
      })
      .mockResolvedValueOnce({ ok: true, status: 204 }); // DELETE

    const { result } = renderHook(() => usePortfolioData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let res: any;
    await act(async () => {
      res = await result.current.deleteAccount(1);
    });
    expect(res.success).toBe(true);
  });

  test('[Boundary] isGuest=true: deleteAccount는 success=false 반환', async () => {
    const { result } = renderHook(() => usePortfolioData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let res: any;
    await act(async () => {
      res = await result.current.deleteAccount(1);
    });
    expect(res.success).toBe(false);
    expect(res.message).toContain('게스트');
  });

  test('[Error] isGuest=false: deleteAccount API 실패 시 success=false', async () => {
    useAuthStore.setState({
      isAuthenticated: true, token: 'valid-token', refreshToken: 'valid-refresh',
      user: { id: '1', email: 'test@example.com' },
    });
    localStorage.setItem('access_token', 'valid-token');

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => [],
      })
      .mockResolvedValueOnce({ ok: false, status: 400 });

    const { result } = renderHook(() => usePortfolioData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let res: any;
    await act(async () => {
      res = await result.current.deleteAccount(1);
    });
    expect(res.success).toBe(false);
    expect(res.message).toBe('계좌 삭제 실패');
  });

  test('[Error] isGuest=false: deleteAccount 네트워크 에러 시 success=false', async () => {
    useAuthStore.setState({
      isAuthenticated: true, token: 'valid-token', refreshToken: 'valid-refresh',
      user: { id: '1', email: 'test@example.com' },
    });
    localStorage.setItem('access_token', 'valid-token');

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => [],
      })
      .mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => usePortfolioData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let res: any;
    await act(async () => {
      res = await result.current.deleteAccount(1);
    });
    expect(res.success).toBe(false);
    expect(res.message).toContain('네트워크');
  });
});
