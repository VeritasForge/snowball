"""JWT decode_token type='access' enforcement (Plan B2.1).

Refresh tokens (7d TTL) must not pass the access endpoint gate.
Tokens without `type` claim must also be rejected — defense in depth
against pre-Plan-B tokens or hand-crafted payloads.
"""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
import pytest

from src.snowball.infrastructure.security import JWTService


class TestJWTServiceDecodeTokenType:
    def test_decode_access_token_returns_payload(self):
        # [Happy] access token → payload returned
        svc = JWTService()
        token = svc.create_access_token({"sub": str(uuid4())})
        payload = svc.decode_token(token)
        assert payload is not None
        assert payload.get("type") == "access"

    def test_decode_refresh_token_returns_none(self):
        # [Error] refresh token used as access token → None (gate enforced)
        svc = JWTService()
        refresh = svc.create_refresh_token({"sub": str(uuid4())})
        assert svc.decode_token(refresh) is None

    def test_decode_token_without_type_claim_returns_none(self):
        # [Error] hand-crafted JWT without `type` → None
        token = jwt.encode(
            {
                "sub": str(uuid4()),
                "exp": datetime.now(timezone.utc) + timedelta(hours=1),
            },
            JWTService.SECRET_KEY,
            algorithm=JWTService.ALGORITHM,
        )
        assert JWTService().decode_token(token) is None

    def test_decode_token_with_unknown_type_returns_none(self):
        # [Boundary] type='magic-link' etc — only 'access' allowed
        token = jwt.encode(
            {
                "sub": str(uuid4()),
                "type": "magic-link",
                "exp": datetime.now(timezone.utc) + timedelta(hours=1),
            },
            JWTService.SECRET_KEY,
            algorithm=JWTService.ALGORITHM,
        )
        assert JWTService().decode_token(token) is None

    def test_refresh_access_token_endpoint_still_works(self):
        # [Boundary] separate refresh path must keep accepting refresh tokens
        svc = JWTService()
        refresh = svc.create_refresh_token({"sub": str(uuid4())})
        new_access = svc.refresh_access_token(refresh)
        assert new_access is not None
        # And the freshly-minted access token must decode as 'access'
        payload = svc.decode_token(new_access)
        assert payload is not None
        assert payload.get("type") == "access"
