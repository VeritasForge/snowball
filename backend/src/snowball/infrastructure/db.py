from sqlmodel import SQLModel, create_engine, Session
from ..adapters.db.models import AccountModel, AssetModel # Import models so metadata is registered

import os
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    if os.getenv("ENVIRONMENT") == "production":
        raise ValueError("DATABASE_URL environment variable must be set in production.")
    DATABASE_URL = "postgresql://user:password@localhost:5432/snowball_db" # fallback to local dev db if not provided


# engine = create_engine(DATABASE_URL, echo=True)
# Note: For production use env vars. Keeping simple for refactor.
# Using sqlite for dev/test ease if postgres not up, but context says postgres.
# I will stick to what was in database.py
engine = create_engine(DATABASE_URL, echo=True)  # pragma: no cover

def get_session():  # pragma: no cover
    with Session(engine) as session:
        yield session

def create_db_and_tables():  # pragma: no cover
    SQLModel.metadata.create_all(engine)
