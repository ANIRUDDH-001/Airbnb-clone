from collections.abc import Iterator
from pathlib import Path
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session


class Base(DeclarativeBase):
    pass


def make_engine(url: str) -> Engine:
    if url.startswith("sqlite:///") and ":memory:" not in url:
        Path(url.removeprefix("sqlite:///")).parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(url, connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def _configure_sqlite(dbapi_connection, _connection_record) -> None:
        cursor = dbapi_connection.cursor()
        # SQLite ignores foreign keys unless this is set on every connection.
        cursor.execute("PRAGMA foreign_keys=ON")
        # WAL lets readers and the writer work side by side, and is what Litestream replicates from.
        cursor.execute("PRAGMA journal_mode=WAL")
        # Wait for a lock instead of failing at once; Litestream briefly holds one while checkpointing.
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()

    return engine


def get_db(request: Request) -> Iterator[Session]:
    session: Session = request.app.state.sessionmaker()
    try:
        yield session
    finally:
        session.close()


DbSession = Annotated[Session, Depends(get_db)]
