"""Relational catalog tables, including the revised SELLER entity."""

from uuid import UUID, uuid4

from pydantic import JsonValue
from sqlalchemy import CheckConstraint, Column, Enum, JSON, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel

from .product import Category


def json_column(nullable: bool = False) -> Column:
    return Column(JSON().with_variant(JSONB(), "postgresql"), nullable=nullable)


class CatalogSeller(SQLModel, table=True):
    __tablename__ = "sellers"

    seller_id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(sa_column=Column(Text, nullable=False, index=True))
    contact_phone: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    contact_email: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    website_url: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    seller_location: dict[str, JsonValue] | None = Field(default=None, sa_column=json_column(nullable=True))


class CatalogProduct(SQLModel, table=True):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("price_pkr >= 0", name="ck_product_price_nonnegative"),
        CheckConstraint("width_cm > 0 AND depth_cm > 0 AND height_cm > 0", name="ck_product_dimensions_positive"),
        CheckConstraint("sort_order >= 0", name="ck_product_sort_order_nonnegative"),
    )

    id: str = Field(primary_key=True, max_length=128)
    name: str = Field(max_length=255)
    description: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    category: Category = Field(sa_column=Column(
        Enum(Category, values_callable=lambda enum: [item.value for item in enum],
             native_enum=False, create_constraint=True, validate_strings=True,
             name="furniture_category"),
        nullable=False, index=True,
    ))
    price_pkr: int = Field(ge=0)
    width_cm: float = Field(gt=0)
    depth_cm: float = Field(gt=0)
    height_cm: float = Field(gt=0)
    style_tags: list[str] = Field(default_factory=list, sa_column=json_column())
    attributes: dict[str, str] = Field(default_factory=dict, sa_column=json_column())
    color: str | None = Field(default=None, max_length=128)
    # Local public paths or hosted URLs; image/GLB files are served separately.
    image: str | None = Field(default=None, max_length=2048)
    glb_url: str | None = Field(default=None, max_length=2048)
    style_embedding: list[float] | None = Field(default=None, sa_column=json_column(nullable=True))
    seller_id: UUID = Field(foreign_key="sellers.seller_id", index=True)
    listing_url: str | None = Field(default=None, max_length=2048)
    sort_order: int = Field(default=0, ge=0, index=True)
