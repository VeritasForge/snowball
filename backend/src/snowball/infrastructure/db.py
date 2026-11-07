import os

from sqlmodel import SQLModel, create_engine, Session
from ..adapters.db.models import AccountModel, AssetModel # Import models so metadata is registered

DEFAULT_DATABASE_URL = "postgresql://user:password@localhost:5432/snowball_db"


def resolve_database_url(raw: str | None) -> str:
    """DATABASE_URL 환경변수를 SQLAlchemy가 받는 형태로 정리한다.

    호스팅 서비스는 `postgres://` 스킴을 주는 경우가 있는데 SQLAlchemy 2.x는
    `postgresql://` 만 인식하므로 바꿔 준다. 값이 없으면 로컬 개발용 기본값을 쓴다.
    """
    url = raw or DEFAULT_DATABASE_URL
    if url.startswith("postgres://"):
        return "postgresql://" + url[len("postgres://"):]
    return url


DATABASE_URL = resolve_database_url(os.environ.get("DATABASE_URL"))

# SQL_ECHO=0 이면 SQL 로그를 끈다(운영). 기본값은 기존 개발 동작과 같다.
# pool_pre_ping: 서버리스에서 오래 쉰 연결이 끊겨 있어도 첫 요청이 실패하지 않게 한다.
engine = create_engine(  # pragma: no cover
    DATABASE_URL,
    echo=os.environ.get("SQL_ECHO", "1") == "1",
    pool_pre_ping=True,
)

def get_session():  # pragma: no cover
    with Session(engine) as session:
        yield session

def create_db_and_tables():  # pragma: no cover
    SQLModel.metadata.create_all(engine)
