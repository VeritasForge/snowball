import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Any
import jwt
import os

class PasswordHasher:
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        # bcrypt.checkpw requires bytes
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

    @staticmethod
    def get_password_hash(password: str) -> str:
        # bcrypt.hashpw requires bytes and returns bytes
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        return hashed.decode('utf-8')

class JWTService:
    SECRET_KEY = os.getenv("SECRET_KEY", "secret")
    ALGORITHM = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
    REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))

    @staticmethod
    def create_access_token(data: dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=JWTService.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, JWTService.SECRET_KEY, algorithm=JWTService.ALGORITHM)
        return encoded_jwt

    @staticmethod
    def create_refresh_token(data: dict[str, Any]) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=JWTService.REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, JWTService.SECRET_KEY, algorithm=JWTService.ALGORITHM)
        return encoded_jwt

    @staticmethod
    def decode_token(token: str) -> Optional[dict[str, Any]]:
        """Decode a token and accept ONLY type='access'.

        Plan B2.1 — refresh tokens (7d TTL) must not pass the access
        endpoint gate. Tokens without a `type` claim (legacy or
        hand-crafted) are also rejected. Use `_decode_raw` for
        type-agnostic decoding (e.g. refresh_access_token flow).
        """
        payload = JWTService._decode_raw(token)
        if payload is None:
            return None
        if payload.get("type") != "access":
            return None
        return payload

    @staticmethod
    def _decode_raw(token: str) -> Optional[dict[str, Any]]:
        """Type-agnostic JWT decode. Internal — callers should prefer
        decode_token() unless they explicitly need to inspect a
        non-access token (e.g. refresh flow).
        """
        try:
            return jwt.decode(
                token, JWTService.SECRET_KEY, algorithms=[JWTService.ALGORITHM]
            )
        except jwt.PyJWTError:
            return None

    @staticmethod
    def refresh_access_token(refresh_token: str) -> Optional[str]:
        """Refresh token으로 새 access token 발급"""
        payload = JWTService._decode_raw(refresh_token)
        if not payload:
            return None
        if payload.get("type") != "refresh":
            return None
        # 새 access token 생성 (sub 필드 유지)
        return JWTService.create_access_token({"sub": payload.get("sub")})
