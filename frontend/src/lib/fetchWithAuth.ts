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
            // 갱신 실패 시 인증 상태 확인
            const isAuthenticated = useAuthStore.getState().isAuthenticated;

            // 인증된 사용자만 로그아웃 + 리다이렉트
            if (isAuthenticated) {
                useAuthStore.getState().logout();
                window.location.href = '/auth';
            }
            // 게스트 사용자는 401 응답 그대로 반환 (호출자가 처리)
        }
    }

    return res;
};
