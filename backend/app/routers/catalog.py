from fastapi import APIRouter, HTTPException

from ..models.product import Product
from ..services.catalog_repo import get_product, load_catalog

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("", response_model=list[Product])
def list_catalog() -> list[Product]:
    """Return the full furniture catalog."""
    return load_catalog()


@router.get("/{product_id}", response_model=Product)
def get_one(product_id: str) -> Product:
    """Return a single product by id, or 404 if it does not exist."""
    product = get_product(product_id)
    if product is None:
        raise HTTPException(status_code=404, detail=f"No product with id {product_id!r}")
    return product
