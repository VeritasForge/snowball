import pytest
from unittest.mock import Mock
from snowball.use_cases.auth import RegisterUserUseCase, LoginUseCase
from snowball.domain.ports import AuthRepository
from snowball.domain.entities import User, UserId
from snowball.infrastructure.security import PasswordHasher, JWTService
from uuid import uuid4

class TestRegisterUserUseCase:
    def test_should_register_new_user(self):
        # Given
        repo = Mock(spec=AuthRepository)
        repo.get_by_email.return_value = None
        # Mock save to return the user passed to it (simulate persistence)
        repo.save.side_effect = lambda u: u
        
        hasher = Mock(spec=PasswordHasher)
        hasher.get_password_hash.return_value = "hashed_secret"
        
        use_case = RegisterUserUseCase(repo, hasher)
        
        # When
        user = use_case.execute("test@example.com", "password123")
        
        # Then
        assert user.email == "test@example.com"
        assert user.password_hash == "hashed_secret"
        repo.save.assert_called_once()

    def test_should_raise_error_if_email_exists(self):
        # Given
        repo = Mock(spec=AuthRepository)
        repo.get_by_email.return_value = User(id=UserId(uuid4()), email="test@example.com", password_hash="hash")
        hasher = Mock(spec=PasswordHasher)
        
        use_case = RegisterUserUseCase(repo, hasher)
        
        # When/Then
        with pytest.raises(ValueError, match="Email already registered"):
            use_case.execute("test@example.com", "password123")

class TestLoginUseCase:
    def test_should_return_token_on_success(self):
        # Given
        repo = Mock(spec=AuthRepository)
        user = User(id=UserId(uuid4()), email="test@example.com", password_hash="hashed_secret")
        repo.get_by_email.return_value = user
        
        hasher = Mock(spec=PasswordHasher)
        hasher.verify_password.return_value = True
        
        jwt_service = Mock(spec=JWTService)
        jwt_service.create_access_token.return_value = "token"
        
        use_case = LoginUseCase(repo, hasher, jwt_service)
        
        # When
        result = use_case.execute("test@example.com", "password123")
        
        # Then
        assert result["access_token"] == "token"

    def test_should_raise_error_if_user_not_found(self):
        # Given
        repo = Mock(spec=AuthRepository)
        repo.get_by_email.return_value = None
        hasher = Mock(spec=PasswordHasher)
        jwt_service = Mock(spec=JWTService)
        
        use_case = LoginUseCase(repo, hasher, jwt_service)
        
        # When/Then
        with pytest.raises(ValueError, match="Invalid credentials"):
            use_case.execute("test@example.com", "password123")
            
    def test_should_raise_error_if_password_mismatch(self):
        # Given
        repo = Mock(spec=AuthRepository)
        user = User(id=UserId(uuid4()), email="test@example.com", password_hash="hashed_secret")
        repo.get_by_email.return_value = user
        
        hasher = Mock(spec=PasswordHasher)
        hasher.verify_password.return_value = False
        jwt_service = Mock(spec=JWTService)
        
        use_case = LoginUseCase(repo, hasher, jwt_service)
        
        # When/Then
        with pytest.raises(ValueError, match="Invalid credentials"):
            use_case.execute("test@example.com", "wrongpassword")
