"""user_id_middleware tests.

slowapi의 key_func가 FastAPI Depends를 받지 못하므로,
middleware 단계에서 user_id를 request.state에 미리 저장하여
per-user rate limiting을 가능케 한다.

decode 실패(서명/만료/형식 등) 시 silently skip — 인증 자체는
get_current_user 의존성이 별도로 검증하므로 보안 영향 없음.
"""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from src.snowball.adapters.api.middleware import user_id_middleware
from src.snowball.infrastructure.security import JWTService


@pytest.fixture
def app_with_middleware():
    app = FastAPI()
    app.middleware("http")(user_id_middleware)

    @app.get("/echo-user")
    def echo(request: Request):
        return {"user_id": getattr(request.state, "user_id", None)}

    return TestClient(app)


class TestUserIdMiddleware:
    def test_valid_jwt_sets_request_state_user_id(self, app_with_middleware):
        # [Happy] 유효 access token → request.state.user_id 설정
        user_id = str(uuid4())
        token = JWTService.create_access_token({"sub": user_id})
        response = app_with_middleware.get(
            "/echo-user",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert response.json()["user_id"] == user_id

    def test_missing_authorization_header_no_user_id(self, app_with_middleware):
        # [Boundary] Authorization 헤더 없음 → user_id 미설정
        response = app_with_middleware.get("/echo-user")
        assert response.status_code == 200
        assert response.json()["user_id"] is None

    def test_malformed_bearer_no_user_id(self, app_with_middleware):
        # [Boundary] Bearer prefix 없음 → user_id 미설정
        response = app_with_middleware.get(
            "/echo-user",
            headers={"Authorization": "NotBearer xxx"},
        )
        assert response.status_code == 200
        assert response.json()["user_id"] is None

    def test_invalid_jwt_signature_no_user_id(self, app_with_middleware):
        # [Error] 잘못된 서명 → decode 실패 → user_id 미설정 (forge 차단)
        response = app_with_middleware.get(
            "/echo-user",
            headers={
                "Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.fake.signature"
            },
        )
        assert response.status_code == 200
        assert response.json()["user_id"] is None

    def test_expired_jwt_no_user_id(self, app_with_middleware):
        # [Error] 만료된 JWT → decode 실패 → user_id 미설정
        expired_payload = {
            "sub": str(uuid4()),
            "type": "access",
            "exp": datetime.now(timezone.utc) - timedelta(seconds=1),
        }
        expired_token = jwt.encode(
            expired_payload,
            JWTService.SECRET_KEY,
            algorithm=JWTService.ALGORITHM,
        )
        response = app_with_middleware.get(
            "/echo-user",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert response.status_code == 200
        assert response.json()["user_id"] is None
