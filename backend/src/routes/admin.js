const express = require('express');
const db = require('../db');
const { requireRole } = require('../middleware/auth');
const { asyncH } = require('../middleware/error');
const { rescoreAndPersist } = require('../services/products');

const router = express.Router();
router.use(requireRole('admin'));

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---- Brands moderation ------------------------------------------------------
router.get(
  '/brands',
  asyncH(async (req, res) => {
    const status = req.query.status;
    const params = [];
    let where = '';
    if (status) { params.push(status); where = 'WHERE verification_status=$1'; }
    const { rows } = await db.query(`SELECT * FROM brands ${where} ORDER BY created_at DESC`, params);
    res.json({ items: rows });
  })
);

// PATCH /api/admin/brands/:id/verification { status, note }
router.patch(
  '/brands/:id/verification',
  asyncH(async (req, res) => {
    const { status, note } = req.body || {};
    if (!['pending', 'verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be pending | verified | rejected.' });
    }
    const { rows } = await db.query(
      `UPDATE brands SET verification_status=$1, verification_note=$2 WHERE id=$3 RETURNING *`,
      [status, note || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Brand not found.' });
    res.json({ brand: rows[0] });
  })
);

// ---- Product moderation -----------------------------------------------------
router.get(
  '/products',
  asyncH(async (req, res) => {
    const status = req.query.status || 'pending_review';
    const { rows } = await db.query(
      `SELECT p.*, b.name AS brand_name FROM products p JOIN brands b ON b.id=p.brand_id
       WHERE p.status=$1 ORDER BY p.updated_at DESC`,
      [status]
    );
    res.json({ items: rows });
  })
);

// PATCH /api/admin/products/:id/moderate { decision: 'publish'|'reject'|'archive', note }
router.patch(
  '/products/:id/moderate',
  asyncH(async (req, res) => {
    const map = { publish: 'published', reject: 'rejected', archive: 'archived' };
    const status = map[req.body.decision];
    if (!status) return res.status(400).json({ error: 'decision must be publish | reject | archive.' });
    // Always rescore on publish so the public snapshot reflects current data.
    if (status === 'published') await rescoreAndPersist(req.params.id);
    const { rows } = await db.query(
      `UPDATE products SET status=$1, updated_at=now() WHERE id=$2 RETURNING id, name, status`,
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Product not found.' });
    res.json({ product: rows[0] });
  })
);

// ---- Categories -------------------------------------------------------------
router.post(
  '/categories',
  asyncH(async (req, res) => {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required.' });
    const { rows } = await db.query('INSERT INTO categories (name, slug) VALUES ($1,$2) RETURNING *', [name, slugify(name)]);
    res.status(201).json({ category: rows[0] });
  })
);

router.delete(
  '/categories/:id',
  asyncH(async (req, res) => {
    await db.query('DELETE FROM categories WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  })
);

// ---- Scoring rules ----------------------------------------------------------
router.get(
  '/scoring-rules',
  asyncH(async (_req, res) => {
    const { rows } = await db.query('SELECT * FROM scoring_rules ORDER BY created_at DESC');
    res.json({ items: rows });
  })
);

// POST /api/admin/scoring-rules { name, rules, activate? }
// Creating a rule set lets admins tune scoring without code changes. Existing
// products are NOT silently re-scored; admin triggers a rescore explicitly.
router.post(
  '/scoring-rules',
  asyncH(async (req, res) => {
    const { name, rules, activate } = req.body || {};
    if (!name || !rules) return res.status(400).json({ error: 'name and rules are required.' });
    const created = await db.withTransaction(async (client) => {
      if (activate) await client.query('UPDATE scoring_rules SET is_active=false');
      const { rows } = await client.query(
        'INSERT INTO scoring_rules (name, rules, is_active) VALUES ($1,$2,$3) RETURNING *',
        [name, JSON.stringify(rules), Boolean(activate)]
      );
      return rows[0];
    });
    res.status(201).json({ scoring_rule: created });
  })
);

// POST /api/admin/rescore-all — apply the active rules to every published product
router.post(
  '/rescore-all',
  asyncH(async (_req, res) => {
    const { rows } = await db.query(`SELECT id FROM products WHERE status='published'`);
    for (const r of rows) await rescoreAndPersist(r.id);
    res.json({ ok: true, rescored: rows.length });
  })
);

module.exports = router;
