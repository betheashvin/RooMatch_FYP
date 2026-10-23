"""Read the authoritative furniture catalog from the configured database.

The editor and both engines receive the same Product/Seller models, including
supplier details and the product-specific listing URL.
"""

from sqlmodel import Session, select

from ..database import get_engine
from ..models.catalog import CatalogProduct, CatalogSeller
from ..models.product import Product, Seller


def _to_product(record: CatalogProduct, seller: CatalogSeller) -> Product:
    values = record.model_dump(exclude={"seller_id", "sort_order"})
    values["seller"] = Seller.model_validate(seller.model_dump())
    return Product.model_validate(values)


def _catalog_query():
    return select(CatalogProduct, CatalogSeller).join(
        CatalogSeller, CatalogProduct.seller_id == CatalogSeller.seller_id,
    )


def load_catalog() -> list[Product]:
    """Read a fresh ordered catalog, including supplier and asset URL metadata."""
    with Session(get_engine()) as session:
        rows = session.exec(_catalog_query().order_by(CatalogProduct.sort_order, CatalogProduct.id)).all()
        return [_to_product(record, seller) for record, seller in rows]


def get_product(product_id: str) -> Product | None:
    """Query one product by its stable ID without reading the whole catalog."""
    with Session(get_engine()) as session:
        row = session.exec(_catalog_query().where(CatalogProduct.id == product_id)).one_or_none()
        return _to_product(*row) if row else None
