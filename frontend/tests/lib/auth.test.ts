import { describe, test, expect, vi, beforeEach } from 'vitest';
import { useAuthStore, refreshAccessToken } from '../../src/lib/auth';

const originalFetch = global.fetch;

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    });
    global.fetch = originalFetch;
  });

  test('[Happy] login이 상태와 localStorage를 업데이트한다', () => {
    const user = { id: '1', email: 'test@example.com' };
    useAuthStore.getState().login(user, 'access-token', 'refresh-token');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(user);
    expect(state.token).toBe('access-token');
    expect(state.refreshToken).toBe('refresh-token');
    expect(localStorage.getItem('access_token')).toBe('access-token');
    expect(localStorage.getItem('refresh_token')).toBe('refresh-token');
  });

  test('[Happy] logout이 상태와 localStorage를 초기화한다', () => {
    useAuthStore.getState().login({ id: '1', email: 'test@example.com' }, 'token', 'refresh');
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(localStorage.getItem('portfolio-storage')).toBeNull();
  });

  test('[Happy] setToken이 token을 업데이트한다', () => {
    useAuthStore.getState().setToken('new-access-token');
    expect(useAuthStore.getState().token).toBe('new-access-token');
  });

  test('[Boundary] logout 후 상태가 null/false로 초기화된다', () => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: '1', email: 'x@y.com' }, token: 'tok', refreshToken: 'ref' });
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
  });
});

describe('refreshAccessToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({ user: null, token: null, refreshToken: null, isAuthenticated: false });
    global.fetch = originalFetch;
  });

  test('[Boundary] refresh_token이 없으면 null을 반환한다', async () => {
    localStorage.clear();
    const result = await refreshAccessToken();
    expect(result).toBeNull();
  });

  test('[Happy] refresh_token이 있고 API 성공 시 새 access_token을 반환한다', async () => {
    localStorage.setItem('refresh_token', 'valid-refresh');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'new-access-token' }),
    });

    const result = await refreshAccessToken();
    expect(result).toBe('new-access-token');
    expect(localStorage.getItem('access_token')).toBe('new-access-token');
    expect(useAuthStore.getState().token).toBe('new-access-token');
  });

  test('[Error] API 응답이 ok=false 이면 null을 반환한다', async () => {
    localStorage.setItem('refresh_token', 'invalid-refresh');
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });

    const result = await refreshAccessToken();
    expect(result).toBeNull();
  });

  test('[Error] 네트워크 에러 시 null을 반환한다', async () => {
    localStorage.setItem('refresh_token', 'some-refresh');
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await refreshAccessToken();
    expect(result).toBeNull();
  });
});
