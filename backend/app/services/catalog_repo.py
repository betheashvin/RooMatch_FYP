"""Read the authoritative furniture catalog from the configured database.

The editor and both engines receive the same Product/Seller models, including
supplier details and the product-specific listing URL.
"""

from sqlmodel import Session, select

from ..database import get_engine
from ..models.catalog import CatalogProduct, CatalogProductImage, CatalogSeller
from ..models.product import Product, Seller


def _to_product(record: CatalogProduct, seller: CatalogSeller, images: list[str] | None = None) -> Product:
    values = record.model_dump(exclude={"seller_id", "sort_order"})
    values["seller"] = Seller.model_validate(seller.model_dump())
    return Product.model_validate(values)


def _catalog_query():
    return select(CatalogProduct, CatalogSeller).join(
        CatalogSeller, CatalogProduct.seller_id == CatalogSeller.seller_id,
    )

def _product_images(session: Session, product_ids: list[str]) -> dict[str, list[str]]:
    if not product_ids:
        return{}
    rows = session.exec(select(CatalogProductImage).where(CatalogProductImage.product_id.in_(product_ids),)
                        .order_by(CatalogProductImage.product_idin_(product_ids),CatalogProductImage.sort_order)).all()
    images: dict[str, list[str]] = defaultdict(list)
    for row in rows:
        images[row.product_id].append(row.image_url)
        return dict(images)

    
def load_catalog() -> list[Product]:
    """Read a fresh ordered catalog, including supplier and asset URL metadata."""
    with Session(engine if engine is not None else get_engine()) as session:
        rows = session.exec(_catalog_query().order_by(CatalogProduct.sort_order, CatalogProduct.id)).all()
        images = _product_images(session, [record.id for record, _seller in rows])
        return [_to_product(record, seller, images.get(record.id)) for record, seller in rows]


def get_product(product_id: str) -> Product | None:
    """Query one product by its stable ID without reading the whole catalog."""
    with Session(engine if engine is not None else get_engine()) as session:
        row = session.exec(_catalog_query().where(CatalogProduct.id == product_id)).one_or_none()
        if row is None:
            return None
        record, seller = row
        images = _product_images(session, [record.id])
        return _to_product(record, seller, images.get(record.id))
