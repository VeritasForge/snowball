from sqlmodel import SQLModel, create_engine, Session
from ..adapters.db.models import AccountModel, AssetModel # Import models so metadata is registered

DATABASE_URL = "postgresql://user:password@localhost:5432/snowball_db"

# engine = create_engine(DATABASE_URL, echo=True) 
# Note: For production use env vars. Keeping simple for refactor.
# Using sqlite for dev/test ease if postgres not up, but context says postgres.
# I will stick to what was in database.py
engine = create_engine(DATABASE_URL, echo=True)

def get_session():
    with Session(engine) as session:
        yield session

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
