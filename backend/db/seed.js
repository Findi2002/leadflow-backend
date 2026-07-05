// Seeds Project Evergreen with realistic, transparency-first demo data.
// Safe to re-run: it truncates the marketplace tables first.
//
// Demo accounts (all password: "evergreen123"):
//   admin@evergreen.market     (admin)
//   hello@purepetal.eco        (brand owner — Pure Petal)
//   team@northleaf.bio         (brand owner — Northleaf)
//   shopper@example.com        (customer)

const bcrypt = require('bcryptjs');
const { pool, withTransaction } = require('../src/db');
const { rescoreAndPersist } = require('../src/services/products');

async function main() {
  const password_hash = await bcrypt.hash('evergreen123', 10);

  const productIds = await withTransaction(async (c) => {
    // Reset (children first via CASCADE).
    await c.query('TRUNCATE order_items, orders, product_ingredients, product_certifications, product_attributes, products, brands, categories, certifications, scoring_rules, users RESTART IDENTITY CASCADE');

    // --- Users ---
    const mkUser = (email, name, role) =>
      c.query('INSERT INTO users (email, password_hash, full_name, role) VALUES ($1,$2,$3,$4) RETURNING id',
        [email, password_hash, name, role]);
    const admin = (await mkUser('admin@evergreen.market', 'Evergreen Admin', 'admin')).rows[0];
    const petalOwner = (await mkUser('hello@purepetal.eco', 'Pure Petal Team', 'brand')).rows[0];
    const northOwner = (await mkUser('team@northleaf.bio', 'Northleaf Team', 'brand')).rows[0];
    await mkUser('shopper@example.com', 'Sam Shopper', 'customer');

    // --- Categories ---
    const mkCat = (name, slug) =>
      c.query('INSERT INTO categories (name, slug) VALUES ($1,$2) RETURNING id', [name, slug]);
    const skincare = (await mkCat('Skincare', 'skincare')).rows[0];
    const haircare = (await mkCat('Haircare', 'haircare')).rows[0];
    await mkCat('Body Care', 'body-care');

    // --- Certifications (trusted, admin-curated) ---
    const mkCert = async (name, slug, issuer, weight, category) =>
      (await c.query('INSERT INTO certifications (name, slug, issuer, trust_weight, category, description) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
        [name, slug, issuer, weight, category, `${name} certification issued by ${issuer}.`])).rows[0].id;
    const cosmos = await mkCert('COSMOS Organic', 'cosmos-organic', 'Ecocert', 0.9, 'organic');
    const leaping = await mkCert('Leaping Bunny', 'leaping-bunny', 'Cruelty Free International', 0.8, 'cruelty_free');
    const vegan = await mkCert('Vegan Society', 'vegan-society', 'The Vegan Society', 0.7, 'vegan');
    const fsc = await mkCert('FSC Packaging', 'fsc-packaging', 'Forest Stewardship Council', 0.6, 'packaging');

    // --- Active scoring rules row (mirrors code defaults; admin-tunable) ---
    await c.query('INSERT INTO scoring_rules (name, is_active, rules) VALUES ($1,$2,$3)', [
      'Default v1', true,
      JSON.stringify({
        transparency: { has_description: 8, has_ingredients: 24, ingredients_have_sources: 10, ingredients_have_roles: 8, has_certifications: 12, has_data_sources: 18, has_packaging_info: 8, has_origin_country: 6, allergens_declared: 6 },
        sustainability: { certifications_max: 45, recyclable_packaging: 20, sustainability_tags_max: 25, origin_known: 10 },
      }),
    ]);

    // --- Brands ---
    const mkBrand = (owner, name, slug, status, country, desc) =>
      c.query('INSERT INTO brands (owner_user_id, name, slug, description, website, country, verification_status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
        [owner, name, slug, desc, `https://${slug}.example`, country, status]);
    const petal = (await mkBrand(petalOwner.id, 'Pure Petal', 'pure-petal', 'verified', 'France', 'Small-batch botanical skincare with full ingredient disclosure.')).rows[0];
    const north = (await mkBrand(northOwner.id, 'Northleaf', 'northleaf', 'verified', 'Sweden', 'Refillable haircare designed for low waste.')).rows[0];
    // A pending brand so the admin queue isn't empty.
    await mkBrand(admin.id, 'Wildroot (Pending Review)', 'wildroot', 'pending', 'Germany', 'Applicant brand awaiting verification.');

    // --- Products (with full structured data) ---
    const ids = [];

    async function mkProduct(p) {
      const prod = (await c.query(
        `INSERT INTO products (brand_id, category_id, name, slug, description, price_cents, currency,
            inventory_qty, image_url, packaging_type, packaging_recyclable, origin_country,
            data_sources, allergens, allergens_declared, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'published') RETURNING id`,
        [p.brand, p.category, p.name, p.slug, p.description, p.price, 'EUR', p.qty, p.image,
         p.packaging, p.recyclable, p.origin, p.sources, p.allergens || [], p.allergens_declared]
      )).rows[0];
      let pos = 0;
      for (const ing of p.ingredients || []) {
        await c.query(
          `INSERT INTO product_ingredients (product_id, position, name, inci_name, role, concern_level, note, source)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [prod.id, pos++, ing.name, ing.inci || null, ing.role || null, ing.concern || 'unknown', ing.note || null, ing.source || null]
        );
      }
      for (const cid of p.certs || []) {
        await c.query('INSERT INTO product_certifications (product_id, certification_id) VALUES ($1,$2)', [prod.id, cid]);
      }
      for (const a of p.attrs || []) {
        await c.query('INSERT INTO product_attributes (product_id, group_name, key, value, source) VALUES ($1,$2,$3,$4,$5)',
          [prod.id, 'sustainability', a.key, a.value, a.source || 'brand declaration']);
      }
      ids.push(prod.id);
    }

    await mkProduct({
      brand: petal.id, category: skincare.id, name: 'Calendula Repair Serum', slug: 'calendula-repair-serum',
      description: 'A lightweight facial serum built around organic calendula extract. Every ingredient is disclosed with its function and source.',
      price: 3200, qty: 40, image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600',
      packaging: 'recycled_glass', recyclable: true, origin: 'France',
      sources: ['Brand INCI declaration', 'COSMOS certificate #FR-2024-118', 'Supplier spec sheets'],
      allergens: ['linalool'], allergens_declared: true,
      ingredients: [
        { name: 'Calendula Officinalis Flower Extract', inci: 'Calendula Officinalis Flower Extract', role: 'soothing botanical', concern: 'none', source: 'Supplier spec sheet' },
        { name: 'Glycerin', inci: 'Glycerin', role: 'humectant', concern: 'none', source: 'Supplier spec sheet' },
        { name: 'Sodium Hyaluronate', inci: 'Sodium Hyaluronate', role: 'hydration', concern: 'none', source: 'Supplier spec sheet' },
        { name: 'Linalool', inci: 'Linalool', role: 'fragrance component', concern: 'low', note: 'Declared EU allergen.', source: 'EU allergen list' },
      ],
      certs: [cosmos, leaping, vegan, fsc],
      attrs: [{ key: 'vegan', value: 'true' }, { key: 'palm_oil_free', value: 'true' }, { key: 'refillable', value: 'false' }],
    });

    await mkProduct({
      brand: north.id, category: haircare.id, name: 'Refillable Nettle Shampoo', slug: 'refillable-nettle-shampoo',
      description: 'A gentle daily shampoo sold in a refillable aluminium bottle to cut single-use plastic.',
      price: 1800, qty: 75, image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600',
      packaging: 'refillable_aluminium', recyclable: true, origin: 'Sweden',
      sources: ['Brand INCI declaration', 'Refill program audit 2024'],
      allergens: [], allergens_declared: true,
      ingredients: [
        { name: 'Water', inci: 'Aqua', role: 'solvent', concern: 'none', source: 'Brand declaration' },
        { name: 'Nettle Leaf Extract', inci: 'Urtica Dioica Leaf Extract', role: 'botanical', concern: 'none', source: 'Supplier spec sheet' },
        { name: 'Coco-Glucoside', inci: 'Coco-Glucoside', role: 'mild surfactant', concern: 'low', source: 'Supplier spec sheet' },
      ],
      certs: [leaping, vegan],
      attrs: [{ key: 'vegan', value: 'true' }, { key: 'refillable', value: 'true' }, { key: 'plastic_free', value: 'true' }],
    });

    // A deliberately INCOMPLETE product, to show "unknown" handling honestly.
    await mkProduct({
      brand: north.id, category: skincare.id, name: 'Everyday Hand Balm', slug: 'everyday-hand-balm',
      description: 'A simple hand balm. Ingredient sourcing data is still being collected.',
      price: 1200, qty: 120, image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600',
      packaging: 'unknown', recyclable: null, origin: null,
      sources: ['Brand INCI declaration'],
      allergens: [], allergens_declared: false,
      ingredients: [
        { name: 'Shea Butter', inci: 'Butyrospermum Parkii Butter', role: 'emollient', concern: 'none' },
        { name: 'Fragrance', inci: 'Parfum', role: 'fragrance', concern: 'unknown', note: 'Composition not disclosed by supplier.' },
      ],
      certs: [],
      attrs: [{ key: 'vegan', value: 'unknown' }],
    });

    return ids;
  });

  // Rescore outside the seeding transaction so each product gets its snapshot.
  for (const id of productIds) await rescoreAndPersist(id);

  console.log(`✓ Seeded ${productIds.length} products, brands, certs, users, and scoring rules.`);
  console.log('  Login with any account using password: evergreen123');
  await pool.end();
}

main().catch((e) => {
  console.error('Seed failed:', e.message);
  process.exit(1);
});
