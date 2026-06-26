const express = require('express');
const db = require('../db');
const { requireRole } = require('../middleware/auth');
const { asyncH } = require('../middleware/error');
const { getFullProduct, rescoreAndPersist } = require('../services/products');

const router = express.Router();

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) +
  '-' + Math.random().toString(36).slice(2, 7);

// Resolve the brand owned by the authenticated user, or 404/403.
async function myBrand(req, res) {
  const { rows } = await db.query('SELECT * FROM brands WHERE owner_user_id=$1', [req.user.sub]);
  if (!rows[0]) {
    res.status(404).json({ error: 'No brand registered for this account yet.' });
    return null;
  }
  return rows[0];
}

// ---- Public brand profile ---------------------------------------------------
router.get(
  '/:slug',
  asyncH(async (req, res) => {
    const { rows } = await db.query('SELECT id, name, slug, description, website, country, verification_status, created_at FROM brands WHERE slug=$1', [req.params.slug]);
    if (!rows[0]) return res.status(404).json({ error: 'Brand not found.' });
    const products = await db.query(
      `SELECT id, name, slug, price_cents, currency, image_url, transparency_score, sustainability_score
       FROM products WHERE brand_id=$1 AND status='published' ORDER BY created_at DESC`,
      [rows[0].id]
    );
    res.json({ brand: rows[0], products: products.rows });
  })
);

// ---- Brand registration (role: brand) --------------------------------------
// POST /api/brands  { name, description, website, country }
router.post(
  '/',
  requireRole('brand', 'admin'),
  asyncH(async (req, res) => {
    const existing = await db.query('SELECT id FROM brands WHERE owner_user_id=$1', [req.user.sub]);
    if (existing.rows[0]) return res.status(409).json({ error: 'You already registered a brand.' });
    const { name, description, website, country } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Brand name is required.' });
    const { rows } = await db.query(
      `INSERT INTO brands (owner_user_id, name, slug, description, website, country)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.sub, name, slugify(name), description || null, website || null, country || null]
    );
    res.status(201).json({ brand: rows[0] });
  })
);

// ---- My products ------------------------------------------------------------
router.get(
  '/me/products',
  requireRole('brand', 'admin'),
  asyncH(async (req, res) => {
    const brand = await myBrand(req, res);
    if (!brand) return;
    const { rows } = await db.query('SELECT * FROM products WHERE brand_id=$1 ORDER BY created_at DESC', [brand.id]);
    res.json({ items: rows });
  })
);

// Create a product (draft). Body accepts the full structured payload.
router.post(
  '/me/products',
  requireRole('brand', 'admin'),
  asyncH(async (req, res) => {
    const brand = await myBrand(req, res);
    if (!brand) return;
    const product = await upsertProduct(brand.id, null, req.body || {});
    res.status(201).json({ product });
  })
);

// Update a product + its structured relations, then rescore.
router.put(
  '/me/products/:id',
  requireRole('brand', 'admin'),
  asyncH(async (req, res) => {
    const brand = await myBrand(req, res);
    if (!brand) return;
    const owned = await db.query('SELECT id FROM products WHERE id=$1 AND brand_id=$2', [req.params.id, brand.id]);
    if (!owned.rows[0]) return res.status(404).json({ error: 'Product not found for this brand.' });
    const product = await upsertProduct(brand.id, req.params.id, req.body || {});
    res.json({ product });
  })
);

// Submit for admin review. Enforces the mandatory provenance rule.
router.post(
  '/me/products/:id/submit',
  requireRole('brand', 'admin'),
  asyncH(async (req, res) => {
    const brand = await myBrand(req, res);
    if (!brand) return;
    const { rows } = await db.query('SELECT * FROM products WHERE id=$1 AND brand_id=$2', [req.params.id, brand.id]);
    const product = rows[0];
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    if (!product.data_sources || product.data_sources.length === 0) {
      return res.status(422).json({ error: 'Cannot submit: at least one data source is required (transparency rule).' });
    }
    await db.query(`UPDATE products SET status='pending_review', updated_at=now() WHERE id=$1`, [product.id]);
    res.json({ ok: true, status: 'pending_review' });
  })
);

// Update inventory only.
router.patch(
  '/me/products/:id/inventory',
  requireRole('brand', 'admin'),
  asyncH(async (req, res) => {
    const brand = await myBrand(req, res);
    if (!brand) return;
    const qty = parseInt(req.body.inventory_qty);
    if (Number.isNaN(qty) || qty < 0) return res.status(400).json({ error: 'inventory_qty must be a non-negative integer.' });
    const { rows } = await db.query(
      `UPDATE products SET inventory_qty=$1, updated_at=now() WHERE id=$2 AND brand_id=$3 RETURNING id, inventory_qty`,
      [qty, req.params.id, brand.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Product not found.' });
    res.json({ product: rows[0] });
  })
);

// Orders that contain this brand's products.
router.get(
  '/me/orders',
  requireRole('brand', 'admin'),
  asyncH(async (req, res) => {
    const brand = await myBrand(req, res);
    if (!brand) return;
    const { rows } = await db.query(
      `SELECT DISTINCT o.id, o.status, o.total_cents, o.currency, o.created_at, o.shipping_name
       FROM orders o
       JOIN order_items oi ON oi.order_id=o.id
       JOIN products p ON p.id=oi.product_id
       WHERE p.brand_id=$1 ORDER BY o.created_at DESC`,
      [brand.id]
    );
    res.json({ items: rows });
  })
);

// ---- shared upsert helper ---------------------------------------------------
async function upsertProduct(brandId, productId, body) {
  const {
    name, description, category_id, price_cents, currency, inventory_qty, image_url,
    packaging_type, packaging_recyclable, origin_country, data_sources,
    allergens, allergens_declared,
    ingredients, certification_ids, attributes,
  } = body;

  const id = await db.withTransaction(async (client) => {
    let pid = productId;
    if (!pid) {
      if (!name) throw Object.assign(new Error('Product name is required.'), { status: 400 });
      const ins = await client.query(
        `INSERT INTO products (brand_id, name, slug, description, category_id, price_cents, currency,
            inventory_qty, image_url, packaging_type, packaging_recyclable, origin_country,
            data_sources, allergens, allergens_declared, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'draft') RETURNING id`,
        [
          brandId, name, slugify(name), description || null, category_id || null,
          price_cents || 0, currency || 'EUR', inventory_qty || 0, image_url || null,
          packaging_type || null, packaging_recyclable ?? null, origin_country || null,
          data_sources || [], allergens || [], allergens_declared || false,
        ]
      );
      pid = ins.rows[0].id;
    } else {
      await client.query(
        `UPDATE products SET
           name=COALESCE($2,name), description=$3, category_id=$4, price_cents=COALESCE($5,price_cents),
           currency=COALESCE($6,currency), inventory_qty=COALESCE($7,inventory_qty), image_url=$8,
           packaging_type=$9, packaging_recyclable=$10, origin_country=$11,
           data_sources=COALESCE($12,data_sources), allergens=COALESCE($13,allergens),
           allergens_declared=COALESCE($14,allergens_declared), updated_at=now()
         WHERE id=$1`,
        [
          pid, name || null, description || null, category_id || null, price_cents ?? null,
          currency || null, inventory_qty ?? null, image_url || null, packaging_type || null,
          packaging_recyclable ?? null, origin_country || null, data_sources || null,
          allergens || null, allergens_declared ?? null,
        ]
      );
    }

    // Replace relations when explicitly provided.
    if (Array.isArray(ingredients)) {
      await client.query('DELETE FROM product_ingredients WHERE product_id=$1', [pid]);
      for (let i = 0; i < ingredients.length; i++) {
        const g = ingredients[i];
        await client.query(
          `INSERT INTO product_ingredients (product_id, position, name, inci_name, role, concern_level, note, source)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [pid, i, g.name, g.inci_name || null, g.role || null, g.concern_level || 'unknown', g.note || null, g.source || null]
        );
      }
    }
    if (Array.isArray(certification_ids)) {
      await client.query('DELETE FROM product_certifications WHERE product_id=$1', [pid]);
      for (const cid of certification_ids) {
        await client.query('INSERT INTO product_certifications (product_id, certification_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [pid, cid]);
      }
    }
    if (Array.isArray(attributes)) {
      await client.query('DELETE FROM product_attributes WHERE product_id=$1', [pid]);
      for (const a of attributes) {
        await client.query(
          'INSERT INTO product_attributes (product_id, group_name, key, value, source) VALUES ($1,$2,$3,$4,$5)',
          [pid, a.group_name || 'sustainability', a.key, String(a.value), a.source || null]
        );
      }
    }
    return pid;
  });

  await rescoreAndPersist(id);
  return getFullProduct(id);
}

module.exports = router;
