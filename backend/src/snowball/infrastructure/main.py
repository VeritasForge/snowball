from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import select

from .db import create_db_and_tables, get_session
from .security import PasswordHasher
from ..adapters.db.models import AccountModel, UserModel
from ..adapters.api.routes import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    # Create default user and account if none exists
    session_gen = get_session()
    session = next(session_gen)
    try:
        # Check for default user
        default_user = session.exec(select(UserModel).where(UserModel.email == "admin@example.com")).first()
        if not default_user:
            hasher = PasswordHasher()
            default_user = UserModel(
                email="admin@example.com",
                password_hash=hasher.get_password_hash("admin1234")
            )
            session.add(default_user)
            session.commit()
            session.refresh(default_user)

        # Check for default account
        if not session.exec(select(AccountModel)).first():
            default_acc = AccountModel(
                name="기본 포트폴리오", 
                cash=0,
                user_id=default_user.id
            )
            session.add(default_acc)
            session.commit()
    finally:
        session.close()
    yield

def create_app() -> FastAPI:
    app = FastAPI(lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    app.include_router(router, prefix="/api/v1")
    return app
