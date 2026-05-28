"""Unit tests for infrastructure/security.py — PasswordHasher and JWTService."""
import pytest
import time
from datetime import timedelta
from src.snowball.infrastructure.security import PasswordHasher, JWTService


class TestPasswordHasher:
    # [Happy] Correct password verifies successfully
    def test_verify_password_returns_true_for_correct_password(self):
        # Given
        plain = "mypassword123"
        hashed = PasswordHasher.get_password_hash(plain)
        # When
        result = PasswordHasher.verify_password(plain, hashed)
        # Then
        assert result is True

    # [Boundary] Hash is deterministically verifiable but not equal to plain
    def test_hash_is_not_equal_to_plain_password(self):
        # Given
        plain = "secret"
        # When
        hashed = PasswordHasher.get_password_hash(plain)
        # Then
        assert hashed != plain
        assert len(hashed) > 0

    # [Error] Wrong password does not verify
    def test_verify_password_returns_false_for_wrong_password(self):
        # Given
        hashed = PasswordHasher.get_password_hash("correct")
        # When
        result = PasswordHasher.verify_password("wrong", hashed)
        # Then
        assert result is False


class TestJWTServiceCreateAccessToken:
    # [Happy] Creates a valid access token that can be decoded
    def test_create_access_token_is_decodable(self):
        # Given
        data = {"sub": "user-id-123"}
        # When
        token = JWTService.create_access_token(data)
        payload = JWTService.decode_token(token)
        # Then
        assert payload is not None
        assert payload["sub"] == "user-id-123"
        assert payload["type"] == "access"

    # [Boundary] Custom expiry delta is respected
    def test_create_access_token_with_custom_expiry(self):
        # Given
        data = {"sub": "abc"}
        expires = timedelta(hours=1)
        # When
        token = JWTService.create_access_token(data, expires_delta=expires)
        payload = JWTService.decode_token(token)
        # Then
        assert payload is not None
        assert payload["sub"] == "abc"

    # [Error] Expired token returns None
    def test_decode_expired_access_token_returns_none(self):
        # Given: token that expires immediately
        data = {"sub": "expire-test"}
        token = JWTService.create_access_token(data, expires_delta=timedelta(seconds=-1))
        # When
        payload = JWTService.decode_token(token)
        # Then
        assert payload is None


class TestJWTServiceCreateRefreshToken:
    # [Happy] Creates a valid refresh token with correct type
    # Plan B2.1 — decode_token gates on type='access' so we use the
    # internal type-agnostic _decode_raw here. End-to-end the refresh
    # flow goes through refresh_access_token() (also tested separately).
    def test_create_refresh_token_carries_refresh_type(self):
        # Given
        data = {"sub": "user-id-456"}
        # When
        token = JWTService.create_refresh_token(data)
        payload = JWTService._decode_raw(token)
        # Then
        assert payload is not None
        assert payload["sub"] == "user-id-456"
        assert payload["type"] == "refresh"

    # [Error] decode_token() gates on type='access' — refresh rejected
    def test_create_refresh_token_rejected_by_decode_token(self):
        # Given
        token = JWTService.create_refresh_token({"sub": "user-id-456"})
        # When
        payload = JWTService.decode_token(token)
        # Then: refresh token must not pass the access-only gate
        assert payload is None

    # [Boundary] Refresh token differs from access token
    def test_refresh_token_differs_from_access_token(self):
        # Given
        data = {"sub": "same-user"}
        # When
        access = JWTService.create_access_token(data)
        refresh = JWTService.create_refresh_token(data)
        # Then
        assert access != refresh


class TestJWTServiceDecodeToken:
    # [Happy] Valid token decodes successfully
    def test_decode_valid_token_returns_payload(self):
        # Given
        data = {"sub": "decode-test"}
        token = JWTService.create_access_token(data)
        # When
        payload = JWTService.decode_token(token)
        # Then
        assert payload is not None
        assert payload["sub"] == "decode-test"

    # [Boundary] Empty string token returns None
    def test_decode_empty_string_returns_none(self):
        # When
        result = JWTService.decode_token("")
        # Then
        assert result is None

    # [Error] Garbage token returns None
    def test_decode_invalid_token_returns_none(self):
        # When
        result = JWTService.decode_token("not.a.valid.jwt")
        # Then
        assert result is None


class TestJWTServiceRefreshAccessToken:
    # [Happy] Valid refresh token generates new access token
    def test_refresh_access_token_returns_new_access_token(self):
        # Given
        data = {"sub": "refresh-user"}
        refresh = JWTService.create_refresh_token(data)
        # When
        new_access = JWTService.refresh_access_token(refresh)
        # Then
        assert new_access is not None
        payload = JWTService.decode_token(new_access)
        assert payload["sub"] == "refresh-user"
        assert payload["type"] == "access"

    # [Boundary] Access token (wrong type) returns None
    def test_refresh_access_token_rejects_access_token(self):
        # Given: an access token (type="access"), not a refresh token
        data = {"sub": "wrong-type"}
        access_token = JWTService.create_access_token(data)
        # When
        result = JWTService.refresh_access_token(access_token)
        # Then
        assert result is None

    # [Error] Invalid token returns None
    def test_refresh_access_token_with_garbage_returns_none(self):
        # When
        result = JWTService.refresh_access_token("garbage.token.here")
        # Then
        assert result is None
