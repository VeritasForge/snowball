import pytest
from typer.testing import CliRunner
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool
from unittest.mock import patch

from scripts.manage import app
from src.snowball.adapters.db.models import UserModel
from src.snowball.infrastructure.security import PasswordHasher

runner = CliRunner()


@pytest.fixture(name="db_engine")
def db_engine_fixture():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    yield engine
    SQLModel.metadata.drop_all(engine)


def test_list_users_empty(db_engine):
    with patch("scripts.manage.engine", db_engine):
        result = runner.invoke(app, ["list-users"])
    assert result.exit_code == 0
    assert "등록된 사용자가 없습니다" in result.output


def test_list_users_shows_registered_users(db_engine):
    with Session(db_engine) as session:
        user = UserModel(email="alice@example.com", password_hash="hash")
        session.add(user)
        session.commit()

    with patch("scripts.manage.engine", db_engine):
        result = runner.invoke(app, ["list-users"])
    assert result.exit_code == 0
    assert "alice@example.com" in result.output
    assert "총 1명" in result.output


def test_reset_password_success(db_engine):
    original_hash = PasswordHasher.get_password_hash("oldpassword")
    with Session(db_engine) as session:
        user = UserModel(email="bob@example.com", password_hash=original_hash)
        session.add(user)
        session.commit()

    with patch("scripts.manage.engine", db_engine):
        result = runner.invoke(app, ["reset-password", "bob@example.com", "newpassword"])
    assert result.exit_code == 0
    assert "✅" in result.output
    assert "bob@example.com" in result.output

    # Verify password actually changed
    with Session(db_engine) as session:
        from sqlmodel import select
        db_user = session.exec(select(UserModel).where(UserModel.email == "bob@example.com")).first()
        assert PasswordHasher.verify_password("newpassword", db_user.password_hash)
        assert not PasswordHasher.verify_password("oldpassword", db_user.password_hash)


def test_reset_password_user_not_found(db_engine):
    with patch("scripts.manage.engine", db_engine):
        result = runner.invoke(app, ["reset-password", "nobody@example.com", "pw"])
    assert result.exit_code != 0
    assert "❌" in result.output
    assert "nobody@example.com" in result.output
