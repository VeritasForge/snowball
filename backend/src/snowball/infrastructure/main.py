from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import select

from .db import create_db_and_tables, get_session
from ..adapters.db.models import AccountModel
from ..adapters.api.routes import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    # Create default account if none exists
    session_gen = get_session()
    session = next(session_gen)
    try:
        if not session.exec(select(AccountModel)).first():
            default_acc = AccountModel(name="기본 포트폴리오", cash=0)
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
    
    app.include_router(router)
    return app
