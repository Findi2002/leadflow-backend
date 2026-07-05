// =============================================================================
// Explainable scoring engine.
//
// CORE PRINCIPLE: no black-box ratings. Each scorer returns BOTH a 0..100 score
// AND a `breakdown` array of factors. Every factor says what it checked, how
// many points it awarded out of how many possible, and a human-readable reason.
// Missing data is never silently penalized into a vague number — it appears in
// the breakdown as an explicit "unknown / not provided" factor worth 0 points.
//
// The weights live in DEFAULT_RULES but can be overridden by the admin-managed
// `scoring_rules` table, so the rules stay tunable and auditable.
// =============================================================================

const DEFAULT_RULES = {
  transparency: {
    has_description: 8,
    has_ingredients: 24,
    ingredients_have_sources: 10,
    ingredients_have_roles: 8,
    has_certifications: 12,
    has_data_sources: 18, // provenance is the heart of "transparency"
    has_packaging_info: 8,
    has_origin_country: 6,
    allergens_declared: 6,
  },
  sustainability: {
    // points awarded per trusted certification, scaled by its trust_weight,
    // capped at this maximum.
    certifications_max: 45,
    recyclable_packaging: 20,
    sustainability_tags_max: 25, // e.g. vegan, palm_oil_free, refillable
    origin_known: 10,
  },
};

function factor(label, awarded, possible, reason) {
  return { label, awarded, possible, reason };
}

function finalize(breakdown) {
  const possible = breakdown.reduce((s, f) => s + f.possible, 0);
  const awarded = breakdown.reduce((s, f) => s + f.awarded, 0);
  const score = possible === 0 ? 0 : Math.round((awarded / possible) * 100);
  return { score, breakdown };
}

/**
 * @param product  { description, packaging_type, packaging_recyclable,
 *                   origin_country, data_sources[], allergens_declared }
 * @param ingredients [{ source, role }]
 * @param certifications [{ name, trust_weight }]
 * @param attributes [{ group_name, key, value }]
 */
function computeTransparency(product, ingredients, certifications, rules) {
  const w = (rules && rules.transparency) || DEFAULT_RULES.transparency;
  const b = [];

  b.push(
    product.description && product.description.trim().length > 20
      ? factor('Description', w.has_description, w.has_description, 'Product description provided.')
      : factor('Description', 0, w.has_description, 'No meaningful description provided.')
  );

  const ingCount = ingredients.length;
  b.push(
    ingCount > 0
      ? factor('Ingredient list', w.has_ingredients, w.has_ingredients, `${ingCount} structured ingredient(s) listed.`)
      : factor('Ingredient list', 0, w.has_ingredients, 'unknown — no structured ingredients provided.')
  );

  if (ingCount > 0) {
    const withSource = ingredients.filter((i) => i.source && i.source.trim()).length;
    const ratio = withSource / ingCount;
    b.push(
      factor(
        'Ingredient provenance',
        Math.round(w.ingredients_have_sources * ratio),
        w.ingredients_have_sources,
        `${withSource}/${ingCount} ingredients cite a data source.`
      )
    );
    const withRole = ingredients.filter((i) => i.role && i.role.trim()).length;
    b.push(
      factor(
        'Ingredient roles',
        Math.round(w.ingredients_have_roles * (withRole / ingCount)),
        w.ingredients_have_roles,
        `${withRole}/${ingCount} ingredients describe their function.`
      )
    );
  } else {
    b.push(factor('Ingredient provenance', 0, w.ingredients_have_sources, 'unknown — no ingredients to source.'));
    b.push(factor('Ingredient roles', 0, w.ingredients_have_roles, 'unknown — no ingredients to describe.'));
  }

  b.push(
    certifications.length > 0
      ? factor('Certifications', w.has_certifications, w.has_certifications, `${certifications.length} certification(s) linked.`)
      : factor('Certifications', 0, w.has_certifications, 'unknown — no certifications linked.')
  );

  const sources = product.data_sources || [];
  b.push(
    sources.length > 0
      ? factor('Data provenance', w.has_data_sources, w.has_data_sources, `Declares ${sources.length} data source(s).`)
      : factor('Data provenance', 0, w.has_data_sources, 'MISSING — no data sources declared (required for publishing).')
  );

  const hasPackaging =
    (product.packaging_type && product.packaging_type !== 'unknown') ||
    product.packaging_recyclable !== null;
  b.push(
    hasPackaging
      ? factor('Packaging info', w.has_packaging_info, w.has_packaging_info, `Packaging: ${product.packaging_type || 'recyclability stated'}.`)
      : factor('Packaging info', 0, w.has_packaging_info, 'unknown — packaging not described.')
  );

  b.push(
    product.origin_country
      ? factor('Country of origin', w.has_origin_country, w.has_origin_country, `Origin: ${product.origin_country}.`)
      : factor('Country of origin', 0, w.has_origin_country, 'unknown — origin not stated.')
  );

  b.push(
    product.allergens_declared
      ? factor('Allergen disclosure', w.allergens_declared, w.allergens_declared, 'Brand has explicitly declared allergen status.')
      : factor('Allergen disclosure', 0, w.allergens_declared, 'unknown — allergen status not declared.')
  );

  return finalize(b);
}

function computeSustainability(product, certifications, attributes, rules) {
  const w = (rules && rules.sustainability) || DEFAULT_RULES.sustainability;
  const b = [];

  // Certifications, weighted by admin-set trust_weight, capped.
  if (certifications.length > 0) {
    const raw = certifications.reduce((s, c) => s + Number(c.trust_weight || 0.5), 0);
    const awarded = Math.min(w.certifications_max, Math.round(raw * w.certifications_max * 0.5));
    b.push(
      factor(
        'Trusted certifications',
        awarded,
        w.certifications_max,
        `${certifications.length} cert(s): ${certifications.map((c) => c.name).join(', ')}.`
      )
    );
  } else {
    b.push(factor('Trusted certifications', 0, w.certifications_max, 'unknown — no trusted certifications.'));
  }

  if (product.packaging_recyclable === true) {
    b.push(factor('Recyclable packaging', w.recyclable_packaging, w.recyclable_packaging, 'Packaging declared recyclable.'));
  } else if (product.packaging_recyclable === false) {
    b.push(factor('Recyclable packaging', 0, w.recyclable_packaging, 'Packaging declared NOT recyclable.'));
  } else {
    b.push(factor('Recyclable packaging', 0, w.recyclable_packaging, 'unknown — recyclability not declared.'));
  }

  // Positive sustainability tags (value truthy), capped.
  const tags = (attributes || []).filter(
    (a) => a.group_name === 'sustainability' && /^(true|yes|1)$/i.test(String(a.value))
  );
  if (tags.length > 0) {
    const perTag = 8;
    const awarded = Math.min(w.sustainability_tags_max, tags.length * perTag);
    b.push(
      factor(
        'Sustainability attributes',
        awarded,
        w.sustainability_tags_max,
        `${tags.map((t) => t.key).join(', ')}.`
      )
    );
  } else {
    b.push(factor('Sustainability attributes', 0, w.sustainability_tags_max, 'unknown — no sustainability attributes set.'));
  }

  b.push(
    product.origin_country
      ? factor('Known origin', w.origin_known, w.origin_known, `Origin disclosed: ${product.origin_country}.`)
      : factor('Known origin', 0, w.origin_known, 'unknown — origin undisclosed (harder to assess footprint).')
  );

  return finalize(b);
}

module.exports = { computeTransparency, computeSustainability, DEFAULT_RULES };
