from src.snowball.infrastructure.db import DEFAULT_DATABASE_URL, resolve_database_url


def test_환경변수가_없으면_로컬_기본값을_쓴다():
    assert resolve_database_url(None) == DEFAULT_DATABASE_URL
    assert resolve_database_url("") == DEFAULT_DATABASE_URL


def test_postgres_스킴은_sqlalchemy가_받는_postgresql로_바꾼다():
    assert (
        resolve_database_url("postgres://u:p@host/db?sslmode=require")
        == "postgresql://u:p@host/db?sslmode=require"
    )


def test_postgresql_스킴은_그대로_둔다():
    url = "postgresql://u:p@host/db?sslmode=require"
    assert resolve_database_url(url) == url
