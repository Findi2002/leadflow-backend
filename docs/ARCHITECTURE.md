# Project Evergreen — Architecture

## 1. Project structure

```
.
├── backend/                  Node.js + Express API
│   ├── db/
│   │   ├── schema.sql        PostgreSQL schema (source of truth)
│   │   ├── migrate.js        Applies schema.sql (idempotent)
│   │   └── seed.js           Realistic demo data + a deliberately incomplete product
│   └── src/
│       ├── index.js          App entry, route mounting
│       ├── config.js         Env-driven config
│       ├── db.js             pg Pool + withTransaction helper
│       ├── middleware/       auth (JWT + role guards), error handling
│       ├── services/
│       │   ├── scoring.js    Explainable transparency + sustainability scoring
│       │   ├── ai.js         AI support layer + deterministic fallback
│       │   └── products.js   Hydrate product + relations, (re)score + persist
│       └── routes/           auth, products, brands, orders, admin, ai
├── frontend/                 Next.js (App Router) + Tailwind
│   ├── app/                  pages: home, products, products/[id], login,
│   │                         register, brand/dashboard, checkout, admin
│   ├── components/           Nav, ProductCard, ScoreBar (explainable score UI)
│   └── lib/api.js            fetch wrapper, auth session, cart
├── docker-compose.yml        Local PostgreSQL
└── docs/ARCHITECTURE.md      This file
```

## 2. Data model

Core tables (see `backend/db/schema.sql`):

- **users** — `id, email, password_hash, full_name, role(customer|brand|admin)`
- **brands** — `id, owner_user_id, name, slug, verification_status(pending|verified|rejected)`
- **products** — `id, brand_id, category_id, name, slug, description, price_cents,
  inventory_qty, packaging_type, packaging_recyclable, origin_country,
  data_sources[], allergens[], allergens_declared, transparency_score,
  transparency_breakdown(jsonb), sustainability_score, sustainability_breakdown(jsonb), status`
- **product_ingredients** — structured INCI list: `position, name, role, concern_level, source`
- **certifications** — admin-curated trusted list with a `trust_weight`
- **product_certifications** — M:N join
- **product_attributes** — flexible structured tags (e.g. `sustainability/vegan=true`)
- **orders** / **order_items** — order with denormalized line-item snapshots
- **scoring_rules** — admin-tunable JSON weights; one active row drives the scorer

Design choices:
- Scores are **persisted snapshots** (fast public reads) but always **recomputable**
  from the relations via `services/products.rescoreAndPersist()`.
- "Unknown" is modeled explicitly: nullable `packaging_recyclable`, an
  `allergens_declared` flag distinct from an empty `allergens` array, and a
  per-ingredient `concern_level` default of `'unknown'`.

## 3. Scoring (the core differentiator)

`services/scoring.js` produces, for each product, a `0..100` score **and** a
`breakdown` array. Each factor is `{ label, awarded, possible, reason }` — so the
score is fully auditable. Missing data appears as a `0/possible` factor whose
reason starts with `unknown` or `MISSING`, never as a silent penalty.

- **Transparency** rewards data *completeness & provenance*: description,
  structured ingredients, per-ingredient sources & roles, certifications, declared
  `data_sources` (highest weight — provenance is the heart of transparency),
  packaging info, origin, and allergen disclosure.
- **Sustainability** rewards *substance*: trusted certifications (weighted by the
  admin-set `trust_weight`, capped), recyclable packaging, positive sustainability
  attributes (vegan, palm-oil-free, refillable…), and known origin.

Weights live in `DEFAULT_RULES` but can be overridden by the active row in the
`scoring_rules` table, so admins can tune the rules without code changes. The
admin endpoint `POST /api/admin/rescore-all` reapplies the active rules.

## 4. AI support layer

`services/ai.js`. **AI is a support system, never a decision-maker.** Hard rules,
enforced both by a strict system prompt and by architecture:

1. Only use the structured data passed in — never add facts.
2. Missing info → say `unknown`. No guessing/inference.
3. No medical/health claims.
4. If `ANTHROPIC_API_KEY` is unset, a **deterministic, fact-only fallback** runs.
   It can only *restate* the provided structured data, so the "never invent"
   guarantee holds even with no model available.

Every AI response carries a `source` field (`ai` / `deterministic` /
`deterministic_fallback`) and a fixed disclaimer, surfaced in the UI.

## 5. Auth & roles

JWT (HS256) with bcrypt password hashing. Three roles:
- **customer** — browse, order.
- **brand** — register a brand, manage products/inventory, view orders.
- **admin** — verify brands, moderate products, manage categories & scoring rules.

Self-registration is limited to `customer` / `brand`; admins are seeded.
Middleware: `requireAuth`, `requireRole(...roles)`.

## 6. Trust & safety guarantees in flows

- Publishing a product **requires** at least one `data_source` (422 otherwise).
- Orders compute totals and check stock **server-side** under a `SELECT ... FOR UPDATE`
  row lock to prevent overselling; the client-supplied price is never trusted.
- Product moderation: brand `draft → submit → pending_review → admin publish/reject`.

## 7. Phased build strategy

- **Phase 1 — Basic marketplace:** products + users + browsing/search. ✅
- **Phase 2 — Brand portal:** registration, product CRUD, inventory, orders view. ✅
- **Phase 3 — Transparency scoring:** explainable transparency + sustainability
  scores, admin-tunable rules. ✅
- **Phase 4 — AI explanation layer:** ingredient summaries, concern explanations,
  description drafting, with strict no-invention guardrails. ✅

### Natural next steps (post-MVP)
- Real payment provider + S3-compatible image uploads (currently image URLs).
- Brand analytics, reviews, and richer allergen/ingredient knowledge base.
- Move token storage to httpOnly cookies; add refresh tokens & rate limiting.
