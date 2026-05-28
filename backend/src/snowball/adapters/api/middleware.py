"""HTTP middleware for snowball.

user_id_middleware: 가벼운 JWT decode로 request.state.user_id를 설정한다.
slowapi key_func가 FastAPI Depends()를 받지 못하므로 middleware에서 미리 처리.

decode 실패(서명·만료·형식 등) 시 silently skip — 인증 자체는
get_current_user 의존성이 별도로 검증하므로 보안 영향 없음.
rate limiter는 user_id 미설정 시 IP fallback으로 동작한다.
"""
from fastapi import Request

from ...infrastructure.security import JWTService


async def user_id_middleware(request: Request, call_next):
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        token = auth[7:].strip()
        try:
            payload = JWTService.decode_token(token)
            if payload and "sub" in payload:
                request.state.user_id = payload["sub"]
        except Exception:  # pragma: no cover  (decode_token already swallows PyJWTError)
            # 방어적 catch — decode_token 내부에서 처리되지만 추가 안전망
            pass
    return await call_next(request)
