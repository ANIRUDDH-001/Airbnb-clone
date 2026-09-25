from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy.orm import sessionmaker
from starlette.middleware.sessions import SessionMiddleware

from app import models  # noqa: F401 — importing registers every table on Base.metadata
from app.core.clock import today_ist
from app.core.config import Settings, get_settings
from app.core.db import Base, make_engine
from app.core.errors import install_error_handlers
from app.routers import ROUTERS

SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    engine = make_engine(settings.database_url)
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        if settings.seed_on_startup:
            from app.seed.run import seed_if_empty

            with session_factory() as db:
                seed_if_empty(db, today_ist())
        yield
        engine.dispose()

    app = FastAPI(title="Airbnb Clone API", lifespan=lifespan)
    app.state.sessionmaker = session_factory
    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.session_secret,
        session_cookie="session",
        max_age=SESSION_MAX_AGE_SECONDS,
        same_site="lax",
        https_only=settings.cookie_secure,
    )
    install_error_handlers(app)
    for router in ROUTERS:
        app.include_router(router, prefix="/api")
    return app
