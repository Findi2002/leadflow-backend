const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { asyncH } = require('../middleware/error');

const router = express.Router();

// POST /api/orders  { items: [{product_id, quantity}], shipping_name, shipping_address }
// Prices and stock are read server-side; the client price is never trusted.
router.post(
  '/',
  requireAuth,
  asyncH(async (req, res) => {
    const { items, shipping_name, shipping_address } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }

    const order = await db.withTransaction(async (client) => {
      let total = 0;
      const lines = [];
      for (const item of items) {
        const qty = Math.max(1, parseInt(item.quantity) || 1);
        // Lock the row to prevent overselling under concurrency.
        const { rows } = await client.query(
          `SELECT id, name, price_cents, currency, inventory_qty, status
           FROM products WHERE id=$1 FOR UPDATE`,
          [item.product_id]
        );
        const p = rows[0];
        if (!p || p.status !== 'published') {
          throw Object.assign(new Error(`Product unavailable: ${item.product_id}`), { status: 422 });
        }
        if (p.inventory_qty < qty) {
          throw Object.assign(new Error(`Not enough stock for "${p.name}" (have ${p.inventory_qty}).`), { status: 422 });
        }
        await client.query('UPDATE products SET inventory_qty = inventory_qty - $1 WHERE id=$2', [qty, p.id]);
        total += p.price_cents * qty;
        lines.push({ product_id: p.id, product_name: p.name, unit_price_cents: p.price_cents, quantity: qty });
      }

      const orderRes = await client.query(
        `INSERT INTO orders (user_id, total_cents, status, shipping_name, shipping_address)
         VALUES ($1,$2,'paid',$3,$4) RETURNING *`,
        [req.user.sub, total, shipping_name || null, shipping_address || null]
      );
      const created = orderRes.rows[0];
      for (const l of lines) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, unit_price_cents, quantity)
           VALUES ($1,$2,$3,$4,$5)`,
          [created.id, l.product_id, l.product_name, l.unit_price_cents, l.quantity]
        );
      }
      return { ...created, items: lines };
    });

    res.status(201).json({ order });
  })
);

// GET /api/orders  — current user's orders
router.get(
  '/',
  requireAuth,
  asyncH(async (req, res) => {
    const { rows } = await db.query('SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC', [req.user.sub]);
    res.json({ items: rows });
  })
);

// GET /api/orders/:id — with line items (owner only)
router.get(
  '/:id',
  requireAuth,
  asyncH(async (req, res) => {
    const { rows } = await db.query('SELECT * FROM orders WHERE id=$1 AND user_id=$2', [req.params.id, req.user.sub]);
    if (!rows[0]) return res.status(404).json({ error: 'Order not found.' });
    const items = await db.query('SELECT * FROM order_items WHERE order_id=$1', [req.params.id]);
    res.json({ order: { ...rows[0], items: items.rows } });
  })
);

module.exports = router;
