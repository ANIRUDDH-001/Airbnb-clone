"""python -m app.seed [--reset] — create tables and load demo data into DATABASE_URL."""

import argparse

from sqlalchemy.orm import Session

from app import models  # noqa: F401
from app.core.clock import today_ist
from app.core.config import get_settings
from app.core.db import Base, make_engine
from app.seed.run import seed_if_empty


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the demo database")
    parser.add_argument("--reset", action="store_true", help="drop every table first")
    args = parser.parse_args()
    engine = make_engine(get_settings().database_url)
    if args.reset:
        Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        created = seed_if_empty(db, today_ist())
    print("Seeded demo data" if created else "Database already has data (use --reset to reseed)")


if __name__ == "__main__":
    main()
