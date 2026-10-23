"""The furniture catalog schema.

One `Product` is one real, locally-buyable item. Dimensions are the footprint
the spatial-validation engine depends on, so they MUST be accurate (see the
project doc, section 6.3). `style_embedding` is the precomputed CLIP vector used
by the recommendation engine's style-similarity feature; it is filled in later
(step 4), so it is optional here.
"""

from enum import Enum
import json
from uuid import NAMESPACE_URL, UUID, uuid4, uuid5

from pydantic import BaseModel, Field, JsonValue


class Category(str, Enum):
    """Living-room categories for the MVP. Extend as the catalog grows."""

    sofa = "sofa"
    loveseat = "loveseat"
    armchair = "armchair"
    coffee_table = "coffee_table"
    side_table = "side_table"
    tv_console = "tv_console"
    bookshelf = "bookshelf"
    rug = "rug"
    lighting = "lighting"
    ottoman = "ottoman"


def seed_seller_id(name: str, contact_phone: str | None = None,
                   contact_email: str | None = None) -> UUID:
    """Stable identity for imports and legacy sellers without an explicit UUID."""
    identity = json.dumps(["roomatch:seller", name, contact_phone, contact_email],
                          ensure_ascii=False, separators=(",", ":"))
    return uuid5(NAMESPACE_URL, identity)


class Seller(BaseModel):
    """Curated supplier details, matching the SELLER entity in docs/erd_v2.md."""

    seller_id: UUID = Field(default_factory=uuid4)
    name: str
    contact_phone: str | None = None  # phone / WhatsApp
    contact_email: str | None = None
    website_url: str | None = None  # supplier website, shared by its products
    seller_location: dict[str, JsonValue] | None = None  # address / coordinates


class Product(BaseModel):
    id: str
    name: str
    description: str | None = None
    category: Category
    price_pkr: int = Field(ge=0)

    # Footprint used by the spatial-validation engine — must be accurate.
    width_cm: float = Field(gt=0)
    depth_cm: float = Field(gt=0)
    height_cm: float = Field(gt=0)

    style_tags: list[str] = []
    # Sub-type hints that a footprint cannot express, e.g. {"seats": "3"} on a
    # sofa or {"shape": "coffee"} on a table. Optional and free-form so adding a
    # category or a variant never needs a schema change; the recommendation
    # engine falls back to dimension-derived inference when a key is absent.
    attributes: dict[str, str] = {}
    color: str | None = None
    image: str | None = None  # top-down thumbnail, e.g. /products/<id>.jpg
    glb_url: str | None = None  # optional 3D model for the viewer, e.g. /models/<id>.glb
    listing_url: str | None = None  # product page, separate from the seller website

    seller: Seller
    style_embedding: list[float] | None = None  # precomputed CLIP vector (step 4)
