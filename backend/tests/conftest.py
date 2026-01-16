import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from uuid import uuid4
from main import app
from src.snowball.infrastructure.db import get_session
from src.snowball.adapters.api.routes import get_current_user
from src.snowball.domain.entities import User, UserId

# Use in-memory SQLite for testing
sqlite_file_name = "database.db"
sqlite_url = "sqlite://"

engine = create_engine(
    sqlite_url, 
    connect_args={"check_same_thread": False}, 
    poolclass=StaticPool
)

@pytest.fixture(name="session")
def session_fixture():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)

@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    # Create a stable user for the duration of the test client's life (one test function)
    test_user_id = UserId(uuid4())
    test_user = User(id=test_user_id, email="test@example.com", password_hash="hash")

    def get_current_user_override():
        return test_user

    app.dependency_overrides[get_session] = get_session_override
    app.dependency_overrides[get_current_user] = get_current_user_override

    client = TestClient(app, base_url="http://testserver/api/v1")
    yield client
    app.dependency_overrides.clear()
