from sqlmodel import SQLModel, create_engine, Session
import os
from ..adapters.db.models import AccountModel, AssetModel # Import models so metadata is registered

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    if os.getenv("ENVIRONMENT") == "production":
        raise ValueError("DATABASE_URL must be set in production")
    # Using sqlite for dev/test ease if postgres not up, but context says postgres.
    DATABASE_URL = "postgresql://user:password@localhost:5432/snowball_db"

engine = create_engine(DATABASE_URL, echo=True)

def get_session():
    with Session(engine) as session:
        yield session

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
