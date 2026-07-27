-- Migration 025 — Custom product barcode
-- Lets each product carry its own barcode/SKU value (e.g. a supplier EAN) that is
-- managed from the product form (create/edit/clear) and encoded on the printed
-- barcode price-tag. Billing resolves a scanned barcode straight to the product.
-- When empty, the label falls back to the product id.

ALTER TABLE products
  ADD COLUMN barcode VARCHAR(64) NULL AFTER slug;

CREATE INDEX idx_products_barcode ON products (barcode);
