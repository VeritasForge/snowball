import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAccounts } from '../../src/lib/hooks/useAccounts';
import { usePortfolioStore } from '../../src/lib/store';
import { useAuthStore } from '../../src/lib/auth';
import type { Account } from '../../src/types';

const originalFetch = global.fetch;

function makeAccount(id: number, name: string): Account {
  return {
    id, name, cash: 0, assets: [],
    total_asset_value: 0, total_invested_value: 0,
    total_pl_amount: 0, total_pl_rate: 0,
  };
}

describe('useAccounts.replaceAccount + lastMutationRef race guard (B3.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({ user: null, token: null, refreshToken: null, isAuthenticated: false });
    usePortfolioStore.getState().reset();
    global.fetch = originalFetch;
    useAuthStore.setState({
      isAuthenticated: true, token: 'valid-token', refreshToken: 'valid-refresh',
      user: { id: '1', email: 'test@example.com' },
    });
    localStorage.setItem('access_token', 'valid-token');
  });

  test('[Happy] replaceAccount swaps the matching account by id, leaves others', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => [makeAccount(1, 'A'), makeAccount(2, 'B')],
    });
    const { result } = renderHook(() => useAccounts(false));
    await act(async () => { await result.current.fetchAccounts(); });
    expect(result.current.accounts).toHaveLength(2);

    const fresh: Account = { ...makeAccount(1, 'A-applied'), cash: 999 };
    act(() => { result.current.replaceAccount(fresh); });

    expect(result.current.accounts.find(a => a.id === 1)?.name).toBe('A-applied');
    expect(result.current.accounts.find(a => a.id === 1)?.cash).toBe(999);
    expect(result.current.accounts.find(a => a.id === 2)?.name).toBe('B');  // untouched
  });

  test('[Boundary] replaceAccount with an unknown id leaves the list unchanged', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => [makeAccount(1, 'A')],
    });
    const { result } = renderHook(() => useAccounts(false));
    await act(async () => { await result.current.fetchAccounts(); });

    act(() => { result.current.replaceAccount(makeAccount(99, 'ghost')); });

    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].name).toBe('A');
  });

  test('[Error] a fetch in-flight that resolves AFTER replaceAccount does not clobber it', async () => {
    // Initial load: account 1 = "A"
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => [makeAccount(1, 'A')],
    });
    const { result } = renderHook(() => useAccounts(false));
    await act(async () => { await result.current.fetchAccounts(); });

    // Now stage a SLOW poll that returns the stale "A" snapshot, but only
    // resolves after we apply a mutation mid-flight.
    let resolveStale: (v: unknown) => void = () => {};
    const stalePromise = new Promise((r) => { resolveStale = r; });
    global.fetch = vi.fn().mockReturnValue(stalePromise);

    await act(async () => {
      const polling = result.current.fetchAccounts();        // in-flight (stale snapshot)
      result.current.replaceAccount({ ...makeAccount(1, 'A-applied'), cash: 777 });  // mutation wins
      resolveStale({ ok: true, status: 200, json: async () => [makeAccount(1, 'A')] });
      await polling;
    });

    // The stale poll must NOT overwrite the applied account.
    await waitFor(() => {
      expect(result.current.accounts.find(a => a.id === 1)?.name).toBe('A-applied');
      expect(result.current.accounts.find(a => a.id === 1)?.cash).toBe(777);
    });
  });
});
