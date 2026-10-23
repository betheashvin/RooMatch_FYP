"""SQLModel connections configured by backend/.env or process environment.

The same PostgreSQL code works with Neon and a local server. SQLite is only
used when explicitly configured, including isolated test databases.
"""

from functools import lru_cache
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import event
from sqlalchemy.engine import Engine, URL, make_url
from sqlalchemy.exc import ArgumentError
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


def database_url() -> URL:
    """Read settings without printing or embedding credentials in source."""
    load_dotenv(_ENV_FILE, override=False)
    raw = os.getenv("DATABASE_URL")
    if raw:
        try:
            url = make_url(raw)
            # Neon gives a normal PostgreSQL URI; choose the installed driver.
            if url.drivername in {"postgres", "postgresql", "postgresql+psycopg2"}:
                url = url.set(drivername="postgresql+psycopg")
            if url.get_backend_name() not in {"postgresql", "sqlite"}:
                raise RuntimeError("DATABASE_URL must use PostgreSQL or explicit test/development SQLite.")
            return url
        except (ArgumentError, ValueError):
            raise RuntimeError("DATABASE_URL is not a valid database connection URI. Check backend/.env.") from None

    if os.getenv("PGDATABASE") and os.getenv("PGUSER"):
        try:
            port = int(os.getenv("PGPORT", "5432"))
        except ValueError:
            raise RuntimeError("PGPORT must be an integer.") from None
        return URL.create(
            "postgresql+psycopg",
            username=os.getenv("PGUSER"),
            password=os.getenv("PGPASSWORD"),
            host=os.getenv("PGHOST", "127.0.0.1"),
            port=port,
            database=os.getenv("PGDATABASE"),
            query={"sslmode": os.getenv("PGSSLMODE", "prefer")},
        )
    raise RuntimeError("Set DATABASE_URL (or PGDATABASE/PGUSER) in backend/.env before starting the API.")


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    from sqlmodel import create_engine

    url = database_url()
    options = {"pool_pre_ping": True}
    if url.get_backend_name() == "sqlite":
        options["connect_args"] = {"check_same_thread": False}
        if url.database in {None, "", ":memory:"}:
            options["poolclass"] = StaticPool
    else:
        # Works with transaction poolers such as a Neon pooled endpoint.
        options["connect_args"] = {"connect_timeout": 10, "prepare_threshold": None}
    engine = create_engine(url, **options)
    if url.get_backend_name() == "sqlite":
        @event.listens_for(engine, "connect")
        def enable_foreign_keys(connection, _record):
            cursor = connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
    return engine


def create_schema(engine: Engine | None = None) -> None:
    # Import table models before asking SQLModel to create missing tables.
    from .models import catalog as _catalog_models  # noqa: F401

    SQLModel.metadata.create_all(engine or get_engine())


def get_session():
    """Dependency for future request handlers needing an explicit session."""
    with Session(get_engine()) as session:
        yield session


def check_connection() -> dict[str, str | bool]:
    """A read-only connection check suitable before creating catalog tables."""
    from sqlalchemy import inspect, text

    engine = get_engine()
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ok", "database": engine.dialect.name,
            "catalog_initialized": inspect(engine).has_table("products")}


if __name__ == "__main__":
    import json
    print(json.dumps(check_connection(), indent=2))
