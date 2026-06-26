// =============================================================================
// AI SUPPORT LAYER — explanation, summarization, drafting.
//
// HARD RULES (enforced by prompt + by design):
//   * AI is a SUPPORT system, never a decision maker.
//   * AI must NEVER invent facts. It may only restate, summarize, or explain
//     the structured data it is given.
//   * If a field is missing, the output must say "unknown" — not guess.
//
// If ANTHROPIC_API_KEY is unset, every function falls back to a deterministic
// generator that ONLY restates provided structured data. This guarantees the
// "never invent" property holds even with no model available.
// =============================================================================

const config = require('../config');

const SYSTEM_GUARDRAIL = `You are a careful assistant for "Project Evergreen", a transparency-first
marketplace for sustainable cosmetics and personal-care products.

ABSOLUTE RULES — follow them exactly:
1. Only use the structured data provided in the user message. Never add facts,
   ingredients, benefits, certifications, or claims that are not present there.
2. If a piece of information is missing, say "unknown" or "not provided".
   Do NOT guess, estimate, or infer beyond the data.
3. Never make medical or health claims (no "cures", "treats", "safe for everyone").
   You may neutrally restate a declared concern level for an ingredient.
4. Be plain, concise, and honest. No marketing hype, no dark patterns.
5. When unsure, say so. Trust matters more than completeness.`;

async function callClaude(userPrompt, maxTokens = 600) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.ai.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.ai.model,
      max_tokens: maxTokens,
      system: SYSTEM_GUARDRAIL,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI provider error ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return (data.content || []).map((c) => c.text || '').join('').trim();
}

const enabled = () => Boolean(config.ai.apiKey);

// --- Deterministic, fact-only fallbacks -------------------------------------

function fallbackIngredientSummary(ingredients) {
  if (!ingredients || ingredients.length === 0) {
    return 'Ingredient data is unknown — the brand has not provided a structured ingredient list for this product.';
  }
  const named = ingredients.map((i) => {
    const role = i.role ? ` (${i.role})` : '';
    const concern =
      i.concern_level && i.concern_level !== 'unknown'
        ? `, declared concern level: ${i.concern_level}`
        : ', concern level: unknown';
    return `• ${i.name}${role}${concern}`;
  });
  return `This product lists ${ingredients.length} ingredient(s):\n${named.join('\n')}\n\nNote: this is a plain restatement of the data provided by the brand. No additional claims are made.`;
}

function fallbackConcerns(ingredients) {
  const flagged = (ingredients || []).filter(
    (i) => ['moderate', 'high'].includes(i.concern_level)
  );
  if (!ingredients || ingredients.length === 0) {
    return 'Concern assessment is unknown — no ingredient data was provided.';
  }
  if (flagged.length === 0) {
    return 'No ingredients are flagged with a moderate or high concern level in the provided data. Ingredients without a declared concern level are shown as "unknown".';
  }
  return `The following ingredients carry a declared concern level:\n${flagged
    .map((i) => `• ${i.name}: ${i.concern_level}${i.note ? ` — ${i.note}` : ''}`)
    .join('\n')}\nThis reflects only the brand-provided data; absence of a flag means "unknown", not "safe".`;
}

function fallbackDescription(product) {
  const parts = [`${product.name || 'This product'}`];
  if (product.category) parts.push(`is a ${product.category} product`);
  if (product.origin_country) parts.push(`made in ${product.origin_country}`);
  let out = parts.join(' ') + '.';
  if (product.packaging_type) out += ` Packaging: ${product.packaging_type}.`;
  out += ' (Auto-generated from structured data; fields not provided are omitted rather than guessed.)';
  return out;
}

// --- Public API -------------------------------------------------------------

async function summarizeIngredients(ingredients) {
  if (!enabled()) return { text: fallbackIngredientSummary(ingredients), source: 'deterministic' };
  const prompt = `Summarize these cosmetic ingredients in plain language for a shopper. Group by function if helpful. Mark anything not provided as "unknown".\n\nIngredients (JSON):\n${JSON.stringify(
    ingredients,
    null,
    2
  )}`;
  try {
    return { text: await callClaude(prompt), source: 'ai' };
  } catch (e) {
    return { text: fallbackIngredientSummary(ingredients), source: 'deterministic_fallback', error: e.message };
  }
}

async function explainConcerns(ingredients) {
  if (!enabled()) return { text: fallbackConcerns(ingredients), source: 'deterministic' };
  const prompt = `Neutrally explain any potential concerns based ONLY on the declared concern levels below. Do not invent risks. If no concern level is declared for an ingredient, treat it as "unknown".\n\nIngredients (JSON):\n${JSON.stringify(
    ingredients,
    null,
    2
  )}`;
  try {
    return { text: await callClaude(prompt), source: 'ai' };
  } catch (e) {
    return { text: fallbackConcerns(ingredients), source: 'deterministic_fallback', error: e.message };
  }
}

async function draftDescription(product) {
  if (!enabled()) return { text: fallbackDescription(product), source: 'deterministic' };
  const prompt = `Draft a short, honest product description (max 60 words) using ONLY these structured fields. Omit any field that is missing rather than inventing it. No health claims.\n\nProduct (JSON):\n${JSON.stringify(
    product,
    null,
    2
  )}`;
  try {
    return { text: await callClaude(prompt, 300), source: 'ai' };
  } catch (e) {
    return { text: fallbackDescription(product), source: 'deterministic_fallback', error: e.message };
  }
}

module.exports = { summarizeIngredients, explainConcerns, draftDescription, enabled };
