# 🌿 Project Evergreen

A trusted marketplace for **transparent, sustainable consumer products** — starting
with cosmetics and personal care.

Evergreen does **not** optimize for maximum scale first. It optimizes for **trust,
transparency, and structured product data**. Every product is analyzed and
structured; every score is explainable; missing data is shown honestly as
`unknown` rather than guessed or hidden.

> This repository was originally scaffolded as `leadflow-backend`. The Evergreen
> MVP lives in [`backend/`](backend) and [`frontend/`](frontend). The legacy
> LeadFlow files (`server.js`, root `package.json`) are unrelated and untouched.

---

## What's built (MVP)

| Layer | Status |
|------|--------|
| **PostgreSQL schema** | Users, Brands, Products, Ingredients, Certifications, ProductAttributes, Orders, Scoring rules — [`backend/db/schema.sql`](backend/db/schema.sql) |
| **Backend API** (Express) | Auth, Product, Merchant/Brand, Order, Admin, AI — [`backend/src`](backend/src) |
| **Explainable scoring** | Transparency + Sustainability, with per-factor breakdowns — [`backend/src/services/scoring.js`](backend/src/services/scoring.js) |
| **AI support layer** | Ingredient summaries, concern explanations, description drafting — never invents facts — [`backend/src/services/ai.js`](backend/src/services/ai.js) |
| **Frontend** (Next.js + Tailwind) | Home, listing, product detail, search/filters, auth, brand dashboard, checkout, admin — [`frontend/app`](frontend/app) |
| **Seed data** | Realistic brands/products incl. a deliberately *incomplete* one to show `unknown` handling — [`backend/db/seed.js`](backend/db/seed.js) |

The core differentiator is enforced end-to-end: **structured data is mandatory,
provenance (`data_sources`) is required to publish, and no score is a black box.**

---

## Tech stack

- **Frontend:** Next.js (App Router, React) + TailwindCSS
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Auth:** JWT (bcrypt-hashed passwords, role-based access: customer / brand / admin)
- **AI:** Anthropic Claude as an optional *support* layer, with a deterministic,
  fact-only fallback when no API key is set
- **Search:** simple Postgres full-text search (no Elasticsearch yet, by design)

---

## Quick start

### 1. Database
```bash
# Option A — Docker
docker compose up -d

# Option B — existing local Postgres
createdb evergreen
```

### 2. Backend
```bash
cd backend
cp .env.example .env          # adjust DATABASE_URL / JWT_SECRET as needed
npm install
npm run db:migrate            # apply schema.sql
npm run db:seed               # load demo data
npm run dev                   # http://localhost:4000
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev                   # http://localhost:3000
```

### Demo accounts (password: `evergreen123`)
| Email | Role |
|-------|------|
| `admin@evergreen.market` | admin |
| `hello@purepetal.eco` | brand (Pure Petal) |
| `team@northleaf.bio` | brand (Northleaf) |
| `shopper@example.com` | customer |

---

## API overview

`GET /api` returns the full route index. Highlights:

- **Auth:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- **Products (public):** `GET /api/products` (search/filter/sort), `GET /api/products/:idOrSlug`
- **Brand:** `POST /api/brands`, `POST /api/brands/me/products`, `PUT /api/brands/me/products/:id`,
  `POST /api/brands/me/products/:id/submit`
- **Orders:** `POST /api/orders` (stock-checked, prices verified server-side), `GET /api/orders`
- **Admin:** brand verification, product moderation, categories, tunable scoring rules, `rescore-all`
- **AI:** `GET /api/ai/products/:idOrSlug/ingredient-summary`, `.../concerns`, `POST /api/ai/draft-description`

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the data model, scoring
method, AI guardrails, and the phased build strategy.

---

## Principles encoded in the code

- **Transparency first** — `data_sources` is required to publish a product.
- **No black-box ratings** — every score ships with a `breakdown` of factors
  (points awarded / possible / reason). The UI lets shoppers expand "Why this score?".
- **Honest about gaps** — missing fields render as `unknown`, never invented.
- **AI is support, not a decision-maker** — it only restates/summarizes provided
  structured data and is prompted (and architecturally constrained) to never
  fabricate facts or make health claims.
- **No dark patterns** — final prices, server-verified; clear stock; no hidden info.
