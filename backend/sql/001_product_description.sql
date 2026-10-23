-- Run in the Neon SQL Editor only if the products table already exists.
-- Fresh databases get this column from python -m app.seed_catalog.
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
