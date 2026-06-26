-- =============================================================================
-- PROJECT EVERGREEN — Database Schema (PostgreSQL)
-- A trusted marketplace for transparent, sustainable consumer products.
--
-- Design principles encoded in this schema:
--   * Structured product data is first-class (ingredients, certs, attributes).
--   * "unknown / missing" is a valid, explicit state — never silently hidden.
--   * Every transparency / sustainability score is DERIVED and EXPLAINABLE;
--     we persist the score AND the breakdown that produced it.
--   * Data provenance is mandatory: products must declare their data_sources.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'brand', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE product_status AS ENUM ('draft', 'pending_review', 'published', 'rejected', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'paid', 'fulfilled', 'cancelled', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- Users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     TEXT,
  role          user_role NOT NULL DEFAULT 'customer',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Brands / Merchants
-- A brand is owned by exactly one user (role = 'brand'). Admin verifies it.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brands (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  description         TEXT,
  website             TEXT,
  country             TEXT,
  verification_status verification_status NOT NULL DEFAULT 'pending',
  verification_note   TEXT,                       -- admin-facing reason for status
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Categories (admin-managed)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name  TEXT NOT NULL,
  slug  TEXT NOT NULL UNIQUE
);

-- -----------------------------------------------------------------------------
-- Certifications reference table (admin-curated, trusted list)
-- Products link to these; arbitrary free-text certs are NOT trusted/scored.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS certifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  issuer        TEXT,
  description   TEXT,
  -- weight (0..1) used by the sustainability scorer; admin-tunable rule.
  trust_weight  NUMERIC(3,2) NOT NULL DEFAULT 0.5,
  category      TEXT  -- e.g. 'organic', 'cruelty_free', 'packaging', 'fair_trade'
);

-- -----------------------------------------------------------------------------
-- Products
-- Scores are persisted as a snapshot for fast reads, but always recomputable.
-- *_breakdown columns store the explainable factor list (no black boxes).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id            UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  description         TEXT,
  price_cents         INTEGER NOT NULL DEFAULT 0,
  currency            TEXT NOT NULL DEFAULT 'EUR',
  inventory_qty       INTEGER NOT NULL DEFAULT 0,
  image_url           TEXT,

  -- Transparency-first structured fields
  packaging_type      TEXT,        -- e.g. 'glass', 'recycled_pet', 'unknown'
  packaging_recyclable BOOLEAN,    -- NULL = unknown (explicit)
  origin_country      TEXT,
  -- Provenance is MANDATORY for publishing (enforced in app layer + below).
  data_sources        TEXT[] NOT NULL DEFAULT '{}',
  -- Explicit allergen risk flags. Empty array + allergens_declared=true means
  -- "brand states none". allergens_declared=false means "unknown".
  allergens           TEXT[] NOT NULL DEFAULT '{}',
  allergens_declared  BOOLEAN NOT NULL DEFAULT false,

  -- Computed, explainable scores (0..100) + their breakdown.
  transparency_score   INTEGER,
  transparency_breakdown JSONB NOT NULL DEFAULT '[]',
  sustainability_score INTEGER,
  sustainability_breakdown JSONB NOT NULL DEFAULT '[]',
  scored_at           TIMESTAMPTZ,

  status              product_status NOT NULL DEFAULT 'draft',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
-- Simple full-text search for the MVP (no Elasticsearch yet).
CREATE INDEX IF NOT EXISTS idx_products_search
  ON products USING gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(description,'')));

-- -----------------------------------------------------------------------------
-- Ingredients (structured, per-product, ordered as on the label)
-- Each row carries its own provenance + a risk flag so "unknown" is explicit.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_ingredients (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  position     INTEGER NOT NULL DEFAULT 0,   -- order on the INCI list
  name         TEXT NOT NULL,                -- INCI / common name
  inci_name    TEXT,
  role         TEXT,                         -- e.g. 'emollient', 'preservative'
  concern_level TEXT NOT NULL DEFAULT 'unknown', -- 'none'|'low'|'moderate'|'high'|'unknown'
  note         TEXT,
  source       TEXT                          -- per-ingredient provenance
);
CREATE INDEX IF NOT EXISTS idx_ingredients_product ON product_ingredients(product_id);

-- -----------------------------------------------------------------------------
-- Product <-> Certification (many-to-many)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_certifications (
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  certification_id UUID NOT NULL REFERENCES certifications(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, certification_id)
);

-- -----------------------------------------------------------------------------
-- Free-form structured attributes (sustainability tags, etc.)
-- e.g. ('sustainability','vegan','true'), ('sustainability','palm_oil_free','true')
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_attributes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  group_name  TEXT NOT NULL,   -- e.g. 'sustainability', 'packaging'
  key         TEXT NOT NULL,   -- e.g. 'vegan'
  value       TEXT NOT NULL,   -- e.g. 'true' / 'recycled' / 'unknown'
  source      TEXT
);
CREATE INDEX IF NOT EXISTS idx_attributes_product ON product_attributes(product_id);

-- -----------------------------------------------------------------------------
-- Orders + line items
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  total_cents  INTEGER NOT NULL DEFAULT 0,
  currency     TEXT NOT NULL DEFAULT 'EUR',
  status       order_status NOT NULL DEFAULT 'pending',
  shipping_name    TEXT,
  shipping_address TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);

CREATE TABLE IF NOT EXISTS order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name    TEXT NOT NULL,         -- denormalized snapshot
  unit_price_cents INTEGER NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- -----------------------------------------------------------------------------
-- Scoring rules (admin-managed). Kept simple/auditable for the MVP: a single
-- active row of JSON weights the scorer reads. Lets admins tune the rules
-- without code changes, while every score stays explainable.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scoring_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT false,
  rules       JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
