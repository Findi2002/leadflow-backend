// Shared product data-access helpers: hydrate a product with all its structured
// relations, and (re)compute + persist its explainable scores.

const db = require('../db');
const { computeTransparency, computeSustainability } = require('./scoring');

async function getActiveRules() {
  const { rows } = await db.query(
    'SELECT rules FROM scoring_rules WHERE is_active = true ORDER BY created_at DESC LIMIT 1'
  );
  return rows[0] ? rows[0].rules : null;
}

async function loadRelations(productId) {
  const [ingredients, certifications, attributes] = await Promise.all([
    db.query('SELECT * FROM product_ingredients WHERE product_id=$1 ORDER BY position', [productId]),
    db.query(
      `SELECT c.* FROM certifications c
       JOIN product_certifications pc ON pc.certification_id = c.id
       WHERE pc.product_id = $1`,
      [productId]
    ),
    db.query('SELECT * FROM product_attributes WHERE product_id=$1', [productId]),
  ]);
  return {
    ingredients: ingredients.rows,
    certifications: certifications.rows,
    attributes: attributes.rows,
  };
}

// Returns a fully hydrated product (with brand + relations + scores) or null.
async function getFullProduct(idOrSlug) {
  const byId = /^[0-9a-f-]{36}$/i.test(idOrSlug);
  const { rows } = await db.query(
    `SELECT p.*, b.name AS brand_name, b.slug AS brand_slug,
            b.verification_status AS brand_verification, cat.name AS category_name
     FROM products p
     JOIN brands b ON b.id = p.brand_id
     LEFT JOIN categories cat ON cat.id = p.category_id
     WHERE ${byId ? 'p.id' : 'p.slug'} = $1`,
    [idOrSlug]
  );
  const product = rows[0];
  if (!product) return null;
  const rel = await loadRelations(product.id);
  return { ...product, ...rel };
}

// Recompute both scores from current relations and persist the snapshot.
async function rescoreAndPersist(productId) {
  const product = await getFullProduct(productId);
  if (!product) return null;
  const rules = await getActiveRules();
  const t = computeTransparency(product, product.ingredients, product.certifications, rules);
  const s = computeSustainability(product, product.certifications, product.attributes, rules);
  await db.query(
    `UPDATE products SET transparency_score=$1, transparency_breakdown=$2,
       sustainability_score=$3, sustainability_breakdown=$4, scored_at=now(), updated_at=now()
     WHERE id=$5`,
    [t.score, JSON.stringify(t.breakdown), s.score, JSON.stringify(s.breakdown), productId]
  );
  return { transparency: t, sustainability: s };
}

module.exports = { getFullProduct, loadRelations, rescoreAndPersist, getActiveRules };
