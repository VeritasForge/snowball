import { describe, test, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePortfolioData } from '../../src/lib/hooks/usePortfolioData';
import { useAuthStore } from '../../src/lib/auth';
import { usePortfolioStore } from '../../src/lib/store';

// Mock global fetch
const originalFetch = global.fetch;
const originalLocation = window.location;

describe('fetchWithAuth - 게스트 사용자 리다이렉트 방지', () => {
  beforeEach(() => {
    // Reset all mocks and storage
    vi.clearAllMocks();
    localStorage.clear();

    // Reset stores to initial state
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false
    });

    usePortfolioStore.getState().reset();

    // Mock window.location
    delete (window as any).location;
    window.location = { ...originalLocation, href: 'http://localhost:3000/' } as any;

    // Reset fetch
    global.fetch = originalFetch;
  });

  test('게스트 사용자(토큰 없음) - 401 응답 시 리다이렉트 안 함', async () => {
    // Given: 토큰 없음, isAuthenticated = false
    localStorage.clear();
    useAuthStore.setState({
      isAuthenticated: false,
      token: null,
      refreshToken: null,
      user: null
    });

    // Mock fetch to return 401
    const mockFetch = vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
      text: async () => 'Unauthorized',
      json: async () => ({ detail: 'Unauthorized' })
    });
    global.fetch = mockFetch;

    // When: Hook renders and tries to fetch accounts
    const { result } = renderHook(() => usePortfolioData());

    // Wait for initial fetch to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Then: 리다이렉트 발생하지 않음 (guest mode should show guest portfolio)
    expect(window.location.href).toBe('http://localhost:3000/');
    expect(window.location.href).not.toContain('/auth');

    // Guest should still see guest portfolio
    expect(result.current.isGuest).toBe(true);
    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].name).toBe('게스트 포트폴리오');
  });

  test('인증된 사용자 - 토큰 갱신 실패 시 리다이렉트 발생', async () => {
    // Given: isAuthenticated = true, 유효하지 않은 토큰
    useAuthStore.setState({
      isAuthenticated: true,
      token: 'invalid-token',
      refreshToken: 'invalid-refresh',
      user: { id: '1', email: 'test@example.com' }
    });

    localStorage.setItem('access_token', 'invalid-token');
    localStorage.setItem('refresh_token', 'invalid-refresh');

    // Mock fetch to return 401 for both initial request and refresh
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ // First call to /accounts
        status: 401,
        ok: false,
        text: async () => 'Unauthorized',
        json: async () => ({ detail: 'Unauthorized' })
      })
      .mockResolvedValueOnce({ // Refresh token call
        status: 401,
        ok: false,
        text: async () => 'Invalid refresh token',
        json: async () => ({ detail: 'Invalid refresh token' })
      });

    global.fetch = mockFetch;

    // Track window.location changes
    let redirected = false;
    Object.defineProperty(window.location, 'href', {
      set: (value) => {
        if (value.includes('/auth')) {
          redirected = true;
        }
      },
      get: () => redirected ? 'http://localhost:3000/auth' : 'http://localhost:3000/'
    });

    // When: Hook renders and tries to fetch accounts
    const { result } = renderHook(() => usePortfolioData());

    // Wait for fetch attempts
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    }, { timeout: 3000 });

    // Then: /auth로 리다이렉트
    await waitFor(() => {
      expect(redirected).toBe(true);
    }, { timeout: 3000 });
  });

  test('인증된 사용자 - 토큰 갱신 성공 시 재시도', async () => {
    // Given: isAuthenticated = true, 만료된 토큰
    useAuthStore.setState({
      isAuthenticated: true,
      token: 'expired-token',
      refreshToken: 'valid-refresh',
      user: { id: '1', email: 'test@example.com' }
    });

    localStorage.setItem('access_token', 'expired-token');
    localStorage.setItem('refresh_token', 'valid-refresh');

    // When: 첫 요청 401, 갱신 성공, 재시도 200
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ // First attempt - 401
        status: 401,
        ok: false,
        text: async () => 'Token expired',
        json: async () => ({ detail: 'Token expired' })
      })
      .mockResolvedValueOnce({ // Refresh token call - success
        status: 200,
        ok: true,
        json: async () => ({ access_token: 'new-token' })
      })
      .mockResolvedValueOnce({ // Retry with new token - success
        status: 200,
        ok: true,
        json: async () => ([
          {
            id: 1,
            name: 'Test Account',
            cash: 1000000,
            assets: [],
            total_asset_value: 1000000,
            total_invested_value: 0,
            total_pl_amount: 0,
            total_pl_rate: 0
          }
        ])
      });

    global.fetch = mockFetch;

    // Render hook
    const { result } = renderHook(() => usePortfolioData());

    // Wait for all fetches to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    // Then: 요청 성공
    // Note: May be called more times due to re-renders, but at least 3 times
    expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].name).toBe('Test Account');

    // No redirect should happen
    expect(window.location.href).not.toContain('/auth');
  });
});

describe('게스트 모드 접근 E2E', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false
    });
    usePortfolioStore.getState().reset();
  });

  test('처음 방문 사용자 - 게스트 포트폴리오 표시', async () => {
    // Given: localStorage 초기화
    localStorage.clear();

    // When: Hook renders
    const { result } = renderHook(() => usePortfolioData());

    // Wait for initial render
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Then: 게스트 UI 표시, 리다이렉트 없음
    expect(result.current.isGuest).toBe(true);
    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].name).toBe('게스트 포트폴리오');
    expect(window.location.href).not.toContain('/auth');
  });
});
