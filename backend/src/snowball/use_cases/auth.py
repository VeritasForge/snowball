from ..domain.ports import AuthRepository
from ..domain.entities import User, UserId
from ..infrastructure.security import PasswordHasher, JWTService
from uuid import uuid4

class RegisterUserUseCase:
    def __init__(self, repo: AuthRepository, hasher: PasswordHasher):
        self.repo = repo
        self.hasher = hasher

    def execute(self, email: str, password: str) -> User:
        if self.repo.get_by_email(email):
            raise ValueError("Email already registered")
        
        hashed_password = self.hasher.get_password_hash(password)
        new_user = User(
            id=UserId(uuid4()),
            email=email,
            password_hash=hashed_password
        )
        return self.repo.save(new_user)

class LoginUseCase:
    def __init__(self, repo: AuthRepository, hasher: PasswordHasher, jwt_service: JWTService):
        self.repo = repo
        self.hasher = hasher
        self.jwt_service = jwt_service

    def execute(self, email: str, password: str) -> dict[str, str]:
        user = self.repo.get_by_email(email)
        if not user:
            raise ValueError("Invalid credentials")

        if not self.hasher.verify_password(password, user.password_hash):
            raise ValueError("Invalid credentials")

        token_data = {"sub": str(user.id), "email": user.email}
        access_token = self.jwt_service.create_access_token(data=token_data)
        refresh_token = self.jwt_service.create_refresh_token(data=token_data)

        return {"access_token": access_token, "refresh_token": refresh_token}
