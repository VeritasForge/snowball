import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlmodel import select

from .db import create_db_and_tables, get_session
from .security import PasswordHasher
from ..adapters.db.models import AccountModel, UserModel
from ..adapters.api.middleware import user_id_middleware
from ..adapters.api.routes import router, limiter

def seed_default_data_enabled() -> bool:
    """SEED_DEFAULT_DATA=0 이면 시작할 때 기본 계정을 만들지 않는다(운영)."""
    return os.environ.get("SEED_DEFAULT_DATA", "1") != "0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    if not seed_default_data_enabled():
        yield
        return
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

def docs_enabled() -> bool:
    """ENABLE_DOCS=0 이면 /docs, /redoc, /openapi.json 을 닫는다(운영)."""
    return os.environ.get("ENABLE_DOCS", "1") != "0"


def create_app() -> FastAPI:
    docs = docs_enabled()
    app = FastAPI(
        lifespan=lifespan,
        docs_url="/docs" if docs else None,
        redoc_url="/redoc" if docs else None,
        openapi_url="/openapi.json" if docs else None,
    )

    # Per-IP rate limiting for the finance proxy endpoints (slowapi).
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # JWT → request.state.user_id for per-user rate limiting (Plan A1.5).
    # decode failures are silently swallowed; get_current_user still enforces auth.
    app.middleware("http")(user_id_middleware)

    app.include_router(router, prefix="/api/v1")
    return app
