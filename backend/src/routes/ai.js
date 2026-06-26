const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncH } = require('../middleware/error');
const { getFullProduct } = require('../services/products');
const ai = require('../services/ai');

const router = express.Router();

// Every response includes `source` so the UI can label AI vs deterministic
// output, and a fixed disclaimer reinforcing that AI never invents facts.
const DISCLAIMER =
  'AI assistance is a support layer only. It summarizes brand-provided data and never invents facts; missing data is shown as "unknown".';

// GET /api/ai/products/:idOrSlug/ingredient-summary  (public)
router.get(
  '/products/:idOrSlug/ingredient-summary',
  asyncH(async (req, res) => {
    const product = await getFullProduct(req.params.idOrSlug);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    const result = await ai.summarizeIngredients(product.ingredients);
    res.json({ ...result, disclaimer: DISCLAIMER });
  })
);

// GET /api/ai/products/:idOrSlug/concerns  (public)
router.get(
  '/products/:idOrSlug/concerns',
  asyncH(async (req, res) => {
    const product = await getFullProduct(req.params.idOrSlug);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    const result = await ai.explainConcerns(product.ingredients);
    res.json({ ...result, disclaimer: DISCLAIMER });
  })
);

// POST /api/ai/draft-description  (brand only) — helps brands write listings.
// Body: the structured product fields the brand has entered so far.
router.post(
  '/draft-description',
  requireRole('brand', 'admin'),
  asyncH(async (req, res) => {
    const result = await ai.draftDescription(req.body || {});
    res.json({ ...result, disclaimer: DISCLAIMER });
  })
);

module.exports = router;
