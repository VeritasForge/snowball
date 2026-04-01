import { useAuthStore, refreshAccessToken } from './auth';

export const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const token = localStorage.getItem('access_token');

    // 토큰이 있을 때만 Authorization 헤더 추가 (Bearer null 방지)
    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let res = await fetch(url, { ...options, headers });

    // 401 에러 시 토큰 갱신 후 재시도
    if (res.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
            res = await fetch(url, {
                ...options,
                headers: {
                    ...(options.headers as Record<string, string>),
                    'Authorization': `Bearer ${newToken}`
                }
            });
        } else {
            // 갱신 실패 시 로그아웃하여 게스트 모드로 전환 (강제 리다이렉트 없음)
            useAuthStore.getState().logout();
        }
    }

    return res;
};
