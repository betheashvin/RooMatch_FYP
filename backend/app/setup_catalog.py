"""Create or upgrade catalog tables, import seed products, and verify database reads.

Run from backend/: python -m app.setup_catalog
Existing product records are preserved unless --update-existing is supplied.
"""

import argparse
import json
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session

from .database import create_schema, get_engine
from .schema_migrations import upgrade_catalog_schema
from .seed_catalog import DEFAULT_CATALOG, read_seed, seed_catalog
from .services.catalog_repo import _catalog_query, _to_product


def setup_catalog(path: Path = DEFAULT_CATALOG, *, update_existing: bool = False,
                  engine: Engine | None = None) -> dict:
    # Validate before connecting or changing any schema/data.
    expected = read_seed(path)
    engine = engine if engine is not None else get_engine()
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    upgrade_catalog_schema(engine)
    create_schema(engine)

    stats = seed_catalog(path, update_existing=update_existing, engine=engine)
    with Session(engine) as session:
        products = [_to_product(record, seller) for record, seller in session.exec(_catalog_query()).all()]
    actual_ids = {product.id for product in products}
    if not {product.id for product in expected}.issubset(actual_ids):
        raise RuntimeError("Catalog import verification failed: some products are missing from database reads.")

    return {"status": "ok", "database": engine.dialect.name, "products": len(products),
            "import": stats, "catalog_reads_verified": True}


def main() -> None:
    parser = argparse.ArgumentParser(description="Set up and verify the configured RooMatch catalog database.")
    parser.add_argument("--file", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--update-existing", action="store_true",
                        help="Replace matching product metadata with the seed values.")
    args = parser.parse_args()
    try:
        result = setup_catalog(args.file, update_existing=args.update_existing)
    except SQLAlchemyError as error:
        # Never echo the connection URI, password, or SQL parameters.
        raise SystemExit(f"Database setup failed ({type(error).__name__}). Check backend/.env and network access.") from None
    except (ValueError, RuntimeError) as error:
        raise SystemExit(str(error)) from None
    finally:
        if get_engine.cache_info().currsize:
            get_engine().dispose()
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
