-- Product catalog image override
-- Allows an admin-approved product-specific image while keeping category visuals as fallback.

ALTER TABLE product_catalog_profiles
  ADD COLUMN IF NOT EXISTS image_url text;
