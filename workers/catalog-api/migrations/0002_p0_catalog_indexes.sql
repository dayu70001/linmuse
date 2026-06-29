-- P0 D1 indexes for linmuse.com catalog read reduction.
--
-- This migration is intentionally narrow:
--   * preserve the existing catalog sort expression and result order
--   * improve visible catalog list/count access paths
--   * speed up background source_fingerprint duplicate checks
--
-- Do not apply remotely until reviewed.

CREATE INDEX IF NOT EXISTS idx_products_visible_catalog_sort
ON products (
  status,
  is_active,
  CAST(substr(product_code, 8) AS INTEGER) DESC,
  imported_at DESC,
  created_at DESC,
  product_code DESC
);

CREATE INDEX IF NOT EXISTS idx_products_visible_category_catalog_sort
ON products (
  status,
  is_active,
  category,
  CAST(substr(product_code, 8) AS INTEGER) DESC,
  imported_at DESC,
  created_at DESC,
  product_code DESC
);

CREATE INDEX IF NOT EXISTS idx_products_visible_category
ON products (status, is_active, category);

CREATE INDEX IF NOT EXISTS idx_products_source_fingerprint
ON products (source_fingerprint);
