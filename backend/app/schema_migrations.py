"""Explicit catalog upgrades; API startup only creates missing tables.

The seller UUID migration targets PostgreSQL and keeps every product linked to
its original supplier. Run it through python -m app.setup_catalog.
"""

from uuid import uuid4

from sqlalchemy import Text, inspect, text
from sqlalchemy.engine import Connection, Engine

from .models.product import seed_seller_id


def _upgrade_seller_ids(connection: Connection) -> None:
    inspector = inspect(connection)
    has_products = inspector.has_table("products")
    foreign_keys = inspector.get_foreign_keys("products") if has_products else []
    sellers = connection.execute(text("SELECT id, name, contact FROM sellers ORDER BY id")).mappings().all()

    connection.execute(text("ALTER TABLE sellers ADD COLUMN seller_id UUID"))
    used_ids = set()
    for seller in sellers:
        seller_id = seed_seller_id(seller["name"], seller["contact"])
        # Earlier PostgreSQL uniqueness allowed repeated names with NULL contact.
        # Preserve those separate rows and all their product references.
        while seller_id in used_ids:
            seller_id = uuid4()
        used_ids.add(seller_id)
        connection.execute(text("UPDATE sellers SET seller_id = :seller_id WHERE id = :old_id"),
                           {"seller_id": seller_id, "old_id": seller["id"]})

    if has_products:
        connection.execute(text("ALTER TABLE products ADD COLUMN seller_uuid_v2 UUID"))
        connection.execute(text(
            "UPDATE products SET seller_uuid_v2 = sellers.seller_id "
            "FROM sellers WHERE products.seller_id = sellers.id"
        ))
        if connection.execute(text("SELECT COUNT(*) FROM products WHERE seller_uuid_v2 IS NULL")).scalar_one():
            raise RuntimeError("Seller migration stopped: every product must reference an existing seller.")
        quote = connection.dialect.identifier_preparer.quote
        for foreign_key in foreign_keys:
            if foreign_key["constrained_columns"] == ["seller_id"]:
                connection.execute(text(f"ALTER TABLE products DROP CONSTRAINT {quote(foreign_key['name'])}"))
        connection.execute(text("ALTER TABLE products DROP COLUMN seller_id"))
        connection.execute(text("ALTER TABLE products RENAME COLUMN seller_uuid_v2 TO seller_id"))

    # PostgreSQL drops the old primary key with its integer column. Other tables
    # unexpectedly referencing it cause an error and roll back the transaction.
    connection.execute(text("ALTER TABLE sellers DROP COLUMN id"))
    connection.execute(text("ALTER TABLE sellers ALTER COLUMN seller_id SET NOT NULL"))
    connection.execute(text("ALTER TABLE sellers ADD PRIMARY KEY (seller_id)"))
    if has_products:
        connection.execute(text("ALTER TABLE products ALTER COLUMN seller_id SET NOT NULL"))
        connection.execute(text(
            "ALTER TABLE products ADD CONSTRAINT fk_products_seller_id "
            "FOREIGN KEY (seller_id) REFERENCES sellers (seller_id)"
        ))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_products_seller_id ON products (seller_id)"))


def upgrade_catalog_schema(engine: Engine) -> None:
    """Upgrade supported earlier tables atomically, without refreshing catalog data."""
    with engine.begin() as connection:
        inspector = inspect(connection)
        if inspector.has_table("sellers"):
            column_types = {column["name"]: column["type"] for column in inspector.get_columns("sellers")}
            columns = set(column_types)
            if "id" in columns and "seller_id" not in columns:
                if connection.dialect.name != "postgresql":
                    raise RuntimeError("The existing integer seller ID migration requires PostgreSQL.")
                if "contact" not in columns:
                    raise RuntimeError("The legacy sellers table is missing its contact column.")
                _upgrade_seller_ids(connection)
            elif "seller_id" not in columns:
                raise RuntimeError("The sellers table has no supported seller identity column.")

            if "contact" in columns and "contact_phone" not in columns:
                connection.execute(text("ALTER TABLE sellers RENAME COLUMN contact TO contact_phone"))
                columns.add("contact_phone")
                column_types["contact_phone"] = column_types["contact"]
            if connection.dialect.name == "postgresql":
                quote = connection.dialect.identifier_preparer.quote
                for constraint in inspect(connection).get_unique_constraints("sellers"):
                    if set(constraint["column_names"]) == {"name", "contact_phone"}:
                        connection.execute(text(f"ALTER TABLE sellers DROP CONSTRAINT {quote(constraint['name'])}"))
                if not isinstance(column_types["name"], Text):
                    connection.execute(text("ALTER TABLE sellers ALTER COLUMN name TYPE TEXT"))
                if "contact_phone" in columns and not isinstance(column_types["contact_phone"], Text):
                    connection.execute(text("ALTER TABLE sellers ALTER COLUMN contact_phone TYPE TEXT"))

            location_type = "JSONB" if connection.dialect.name == "postgresql" else "JSON"
            for name, column_type in (("contact_phone", "TEXT"), ("contact_email", "TEXT"),
                                      ("website_url", "TEXT"), ("seller_location", location_type)):
                if name not in columns:
                    connection.execute(text(f"ALTER TABLE sellers ADD COLUMN {name} {column_type}"))

        inspector = inspect(connection)
        if inspector.has_table("products"):
            columns = {column["name"] for column in inspector.get_columns("products")}
            if "description" not in columns:
                connection.execute(text("ALTER TABLE products ADD COLUMN description TEXT"))
