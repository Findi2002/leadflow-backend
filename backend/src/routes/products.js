const express = require('express');
const db = require('../db');
const { asyncH } = require('../middleware/error');
const { getFullProduct } = require('../services/products');

const router = express.Router();

// GET /api/products
// Query: q, category, brand, min_transparency, min_sustainability,
//        certification (slug), sort, page, page_size
router.get(
  '/',
  asyncH(async (req, res) => {
    const {
      q,
      category,
      brand,
      min_transparency,
      min_sustainability,
      certification,
      sort = 'newest',
    } = req.query;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(60, Math.max(1, parseInt(req.query.page_size) || 24));

    const where = [`p.status = 'published'`];
    const params = [];
    const add = (clause, value) => {
      params.push(value);
      where.push(clause.replace('$$', `$${params.length}`));
    };

    if (q) add(`to_tsvector('simple', coalesce(p.name,'')||' '||coalesce(p.description,'')) @@ plainto_tsquery('simple', $$)`, q);
    if (category) add(`cat.slug = $$`, category);
    if (brand) add(`b.slug = $$`, brand);
    if (min_transparency) add(`p.transparency_score >= $$`, parseInt(min_transparency));
    if (min_sustainability) add(`p.sustainability_score >= $$`, parseInt(min_sustainability));
    if (certification) {
      params.push(certification);
      where.push(`EXISTS (SELECT 1 FROM product_certifications pc
        JOIN certifications c ON c.id = pc.certification_id
        WHERE pc.product_id = p.id AND c.slug = $${params.length})`);
    }

    const sortMap = {
      newest: 'p.created_at DESC',
      price_asc: 'p.price_cents ASC',
      price_desc: 'p.price_cents DESC',
      transparency: 'p.transparency_score DESC NULLS LAST',
      sustainability: 'p.sustainability_score DESC NULLS LAST',
    };
    const orderBy = sortMap[sort] || sortMap.newest;

    const whereSql = where.join(' AND ');
    const countQ = await db.query(
      `SELECT count(*) FROM products p
       JOIN brands b ON b.id=p.brand_id
       LEFT JOIN categories cat ON cat.id=p.category_id
       WHERE ${whereSql}`,
      params
    );
    const total = parseInt(countQ.rows[0].count);

    params.push(pageSize, (page - 1) * pageSize);
    const { rows } = await db.query(
      `SELECT p.id, p.name, p.slug, p.price_cents, p.currency, p.image_url,
              p.transparency_score, p.sustainability_score, p.origin_country,
              p.packaging_type, b.name AS brand_name, b.slug AS brand_slug,
              b.verification_status AS brand_verification, cat.name AS category_name
       FROM products p
       JOIN brands b ON b.id=p.brand_id
       LEFT JOIN categories cat ON cat.id=p.category_id
       WHERE ${whereSql}
       ORDER BY ${orderBy}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ items: rows, total, page, page_size: pageSize, pages: Math.ceil(total / pageSize) });
  })
);

// GET /api/products/:idOrSlug  — full transparency view
router.get(
  '/:idOrSlug',
  asyncH(async (req, res) => {
    const product = await getFullProduct(req.params.idOrSlug);
    if (!product || product.status !== 'published') {
      return res.status(404).json({ error: 'Product not found.' });
    }
    res.json({ product });
  })
);

// GET /api/categories — convenience for filter UI
router.get(
  '/meta/categories',
  asyncH(async (_req, res) => {
    const { rows } = await db.query('SELECT * FROM categories ORDER BY name');
    res.json({ items: rows });
  })
);

// GET /api/products/meta/certifications — convenience for filter UI
router.get(
  '/meta/certifications',
  asyncH(async (_req, res) => {
    const { rows } = await db.query('SELECT * FROM certifications ORDER BY name');
    res.json({ items: rows });
  })
);

module.exports = router;
