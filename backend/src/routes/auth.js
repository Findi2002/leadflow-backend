const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { sign, requireAuth } = require('../middleware/auth');
const { asyncH } = require('../middleware/error');

const router = express.Router();

const publicUser = (u) => ({ id: u.id, email: u.email, full_name: u.full_name, role: u.role });

// POST /api/auth/register  { email, password, full_name, role? }
router.post(
  '/register',
  asyncH(async (req, res) => {
    const { email, password, full_name, role } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password are required.' });
    if (password.length < 8) return res.status(400).json({ error: 'password must be at least 8 characters.' });
    // Customers and brands may self-register. Admins are seeded, never self-served.
    const safeRole = role === 'brand' ? 'brand' : 'customer';
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [email.toLowerCase().trim(), hash, full_name || null, safeRole]
    );
    const user = rows[0];
    res.status(201).json({ token: sign(user), user: publicUser(user) });
  })
);

// POST /api/auth/login  { email, password }
router.post(
  '/login',
  asyncH(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password are required.' });
    const { rows } = await db.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase().trim()]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    res.json({ token: sign(user), user: publicUser(user) });
  })
);

// GET /api/auth/me
router.get(
  '/me',
  requireAuth,
  asyncH(async (req, res) => {
    const { rows } = await db.query('SELECT * FROM users WHERE id=$1', [req.user.sub]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found.' });
    // Include the brand owned by this user, if any (handy for the brand dashboard).
    const brand = await db.query('SELECT * FROM brands WHERE owner_user_id=$1', [req.user.sub]);
    res.json({ user: publicUser(rows[0]), brand: brand.rows[0] || null });
  })
);

module.exports = router;
