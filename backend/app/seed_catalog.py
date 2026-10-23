"""Import the JSON seed manifest into PostgreSQL (or an explicit test engine).

Run from backend/: python -m app.seed_catalog
Existing products are kept unless --update-existing is explicitly requested.
Images/GLBs stay in frontend/public; only their URL strings are imported.
"""

import argparse
import json
from pathlib import Path
from uuid import UUID

from sqlalchemy.engine import Engine
from sqlmodel import Session, select

from .database import create_schema, get_engine
from .models.catalog import CatalogProduct, CatalogSeller
from .models.product import Product, Seller, seed_seller_id
from .schema_migrations import upgrade_catalog_schema

DEFAULT_CATALOG = Path(__file__).resolve().parent / "data" / "catalog.json"


def read_seed(path: Path = DEFAULT_CATALOG) -> list[Product]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise ValueError("The catalog seed must contain a JSON array of products.")
    # Validate the whole input before a single database record is changed.
    products = []
    sellers: dict[UUID, Seller] = {}
    for value in raw:
        # Accept earlier import files without keeping obsolete fields in the API.
        if isinstance(value, dict) and isinstance(value.get("seller"), dict):
            value = dict(value)
            seller = dict(value["seller"])
            seller.setdefault("contact_phone", seller.pop("contact", None))
            value.setdefault("listing_url", seller.pop("listing_url", None))
            if "seller_id" not in seller and "name" in seller:
                seller["seller_id"] = seed_seller_id(seller["name"], seller.get("contact_phone"),
                                                   seller.get("contact_email"))
            value["seller"] = seller
        product = Product.model_validate(value)
        previous = sellers.setdefault(product.seller.seller_id, product.seller)
        if previous != product.seller:
            raise ValueError("The catalog seed contains conflicting details for one seller_id.")
        products.append(product)
    ids = [product.id for product in products]
    if len(ids) != len(set(ids)):
        raise ValueError("The catalog seed contains duplicate product IDs.")
    return products


def seed_catalog(path: Path = DEFAULT_CATALOG, *, update_existing: bool = False,
                 engine: Engine | None = None) -> dict[str, int]:
    products = read_seed(path)
    stats = {"inserted": 0, "updated": 0, "skipped": 0, "sellers_inserted": 0}
    with Session(engine or get_engine()) as session:
        existing = {record.id: record for record in session.exec(select(CatalogProduct)).all()}
        sellers = {record.seller_id: record
                   for record in session.exec(select(CatalogSeller)).all()}
        for order, product in enumerate(products):
            record = existing.get(product.id)
            if record is not None and not update_existing:
                stats["skipped"] += 1
                continue
            seller = sellers.get(product.seller.seller_id)
            if seller is None:
                seller = CatalogSeller(**product.seller.model_dump())
                session.add(seller)
                session.flush()
                sellers[seller.seller_id] = seller
                stats["sellers_inserted"] += 1
            elif update_existing:
                for key, value in product.seller.model_dump().items():
                    setattr(seller, key, value)
                session.add(seller)
            values = product.model_dump(mode="json", exclude={"seller"})
            values.update(seller_id=seller.seller_id, sort_order=order)
            if record is None:
                session.add(CatalogProduct(**values))
                stats["inserted"] += 1
            else:
                for key, value in values.items():
                    setattr(record, key, value)
                session.add(record)
                stats["updated"] += 1
        # One transaction: a failed import never leaves a half-imported catalog.
        session.commit()
    return stats


def main() -> None:
    parser = argparse.ArgumentParser(description="Import catalog metadata into the configured RooMatch database.")
    parser.add_argument("--file", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--update-existing", action="store_true",
                        help="Replace matching product metadata with the seed values.")
    args = parser.parse_args()
    read_seed(args.file)
    engine = get_engine()
    upgrade_catalog_schema(engine)
    create_schema(engine)
    print(json.dumps(seed_catalog(args.file, update_existing=args.update_existing, engine=engine), indent=2))


if __name__ == "__main__":
    main()
