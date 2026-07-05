# 🌿 Evergreen Master Roadmap

**Status:** Living document · v1.0
**Owner:** Founding team
**Scope:** Strategy, phasing, domains, MVP priorities, and technical guardrails for Project Evergreen.

> **Relationship to the existing codebase:** This repository already contains a working
> marketplace prototype (`backend/` + `frontend/`, see [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md)).
> Some of that prototype intentionally goes *beyond* the MVP defined here (checkout, user
> accounts, brand dashboard). This roadmap **re-scopes the MVP toward trust and discovery
> first**. Already-built "Later" features are kept as dormant prototype code — proven,
> but not the current focus. Nothing in this document implies deleting them.

---

## 1. Executive Summary

Evergreen is not "another shop". It is being built as five things at once, layered on
top of each other:

| Layer | What it means |
|---|---|
| **A marketplace** | A curated place to discover and (eventually) buy consumer products that are better in ingredients, materials, packaging, production, health impact, and sustainability. |
| **A transparency platform** | Every product carries structured, sourced data — ingredients, certifications, packaging, origin — with *explainable* scores and honest `unknown` states. No black boxes. |
| **A product verification system** | Claims are not taken at face value. Evergreen defines standards, collects evidence, and verifies brands and products against them. |
| **A consumer trust layer** | Badges, scores, and explanations that a shopper can rely on anywhere — on Evergreen first, and eventually wherever products are sold. |
| **A global product discovery infrastructure** | Long-term: structured product data, standards, and verification exposed as APIs and embeddable services — the "trust rails" other commerce runs on. |

**The sequencing insight that drives this roadmap:** trust is the product. Transactions
are downstream of trust. Therefore we build *credibility and data quality before
commerce volume*, and commerce before platform/API ambitions.

**Guiding principle (see §6):** Evergreen does not compete with Amazon on everything.
Evergreen competes on trust, clarity, transparency, product quality, better
alternatives, and confidence in purchasing decisions.

---

## 2. Product Development Phases

### Phase 1: MVP — Trustable Marketplace Prototype

| | |
|---|---|
| **Goal** | Prove that a transparency-first product presentation creates visible, felt trust — with real visitors and real brand interest, before building commerce machinery. |
| **Why it matters** | Everything downstream (brand acquisition, standards, monetization) depends on one question: *do people believe Evergreen?* The MVP exists to answer that with the smallest possible surface. |

**Core features**
- Homepage that communicates the mission in one screen
- Marketplace category pages + product listing grid
- Product detail page with structured data, badges, and the transparency explanation ("Why this score?")
- Badge system (v0: manually assigned, rule-documented)
- Brand Interest Form (the supply-side funnel — no self-serve portal yet)
- About / Mission page + basic legal pages (imprint, privacy, terms)
- Static/mock or hand-curated product data (10–50 products, deeply structured)

**What should NOT be built yet**
- Checkout, payments, carts *(prototype exists in code — keep dormant)*
- User accounts and login for shoppers *(same)*
- Self-serve brand dashboard *(same — brand intake goes through the Interest Form + manual onboarding)*
- Automated verification, evidence pipelines
- AI recommendations/personalization
- Public APIs, mobile apps, i18n

**Dependencies**
- Brand identity + design system basics (logo, palette, typography, component kit)
- Legal basics for operating a public site in the launch jurisdiction
- A written v0 of Evergreen Standards (even 2 pages) so badges are defensible

**Definition of Done**
- [ ] 10–50 fully structured products live, each with explainable badges/scores and honest `unknown` fields
- [ ] A first-time visitor can explain back "what Evergreen is" after 60 seconds on the site
- [ ] ≥ 20 qualified brand inquiries through the Interest Form
- [ ] Transparency explanation tested with real users (≥ 10 interviews) — people *understand* the scores
- [ ] Legal pages reviewed; no unverifiable health/eco claims anywhere on the site

---

### Phase 2: V1 — Real Brand & Product System

| | |
|---|---|
| **Goal** | Replace curated/mock data with a real ingestion pipeline: verified brands submit real products through a structured intake, and Evergreen operates a functioning catalog with moderation. |
| **Why it matters** | The MVP proves demand-side belief; V1 proves supply-side willingness. If brands won't do the work of structured disclosure, the model must be adjusted *now*, before scaling. |

**Core features**
- Brand onboarding flow (application → review → verified profile)
- Brand portal v1: product submission with structured fields, mandatory data sources, draft → review → publish
- Admin & operations console: brand verification queue, product moderation, category management
- Manufacturer/brand public profiles
- Real search + filters over the live catalog
- Basic order capability (limited pilot: small catalog, simple fulfillment — reactivate and harden the existing prototype checkout)
- User accounts (needed for orders; kept minimal)

**What should NOT be built yet**
- Automated evidence verification (still human-in-the-loop)
- Scoring beyond the v0/v1 rules (no ML scoring)
- Personalization, recommendations
- Multi-market/i18n, APIs, loyalty programs

**Dependencies**
- Phase 1 DoD met (esp. brand pipeline from the Interest Form)
- Payment provider + basic merchant agreements (legal)
- Written moderation SOPs so admin decisions are consistent

**Definition of Done**
- [ ] ≥ 10 verified brands have self-submitted products through the portal
- [ ] 100% of published products passed the moderation flow with mandatory provenance
- [ ] First real orders fulfilled end-to-end; refund path exercised at least once
- [ ] Admin can run the marketplace day-to-day without engineering intervention

---

### Phase 3: V2 — Transparency Engine

| | |
|---|---|
| **Goal** | Turn transparency from editorial effort into a *system*: formalized Evergreen Standards, an Evidence Engine that stores and links proof to claims, and versioned, auditable scoring. |
| **Why it matters** | This is the moat. Anyone can build a shop; almost no one has structured, evidence-linked, explainable product-trust data. V2 converts Evergreen's manual credibility into scalable infrastructure. |

**Core features**
- Evergreen Standards v1: published criteria per category (ingredients, packaging, production, labor)
- Evidence Engine v1: document upload (certificates, lab results, audits), linkage of each claim/badge to evidence records, expiry & re-verification dates
- Badge system v2: badges derived from standards + evidence, with public "how this badge was earned" pages
- Scoring rules versioning: every product shows *which rule set* scored it; historical scores auditable
- Ingredient/material knowledge base (INCI-level data, concern references with citations)
- Public transparency reports (what % of catalog is fully verified, where the gaps are)

**What should NOT be built yet**
- Fully automated verification decisions (evidence is machine-assisted, human-approved)
- Third-party API access to the trust data (design for it, don't ship it)
- Global expansion mechanics

**Dependencies**
- V1 operating smoothly (real catalog + moderation)
- Advisory input (regulatory/certification expertise) for Standards v1
- Storage infrastructure for evidence documents (S3-compatible, retention policy)

**Definition of Done**
- [ ] Every badge on the site is traceable to a standard + evidence record or explicitly marked "brand-declared, not yet verified"
- [ ] Standards v1 published publicly and versioned
- [ ] ≥ 50% of catalog upgraded from "declared" to "evidence-backed"
- [ ] An external skeptic can audit any score end-to-end from the public UI

---

### Phase 4: V3 — User Intelligence & Personalization

| | |
|---|---|
| **Goal** | Help each user make *their* best decision: allergen and values-based matching, comparisons, alternatives, and AI explanations tuned to the individual — always grounded in verified data. |
| **Why it matters** | Trust data becomes dramatically more valuable when it is personal ("safe for *your* allergies", "matches *your* values"). This deepens retention and differentiates beyond any generic shop. |

**Core features**
- User profiles: allergen lists, ingredient avoid-lists, values preferences (vegan, plastic-free, …)
- Personal compatibility indicators on every product ("contains 1 ingredient you avoid")
- Product comparison (full transparency side-by-side)
- "Better alternative" suggestions grounded in structured data (rule-based first, ML later)
- AI layer v2: personalized plain-language explanations with strict no-invention guardrails; brand-side AI assistance for structured submissions
- Reviews with verified-purchase and substance requirements (no astroturf)

**What should NOT be built yet**
- Black-box recommendation engines that can't explain themselves (violates the core principle)
- Selling user data or ad-targeting of any kind — ever
- Social-network features

**Dependencies**
- V2 Transparency Engine live (personalization must be grounded in verified data)
- Privacy review (profiles contain health-adjacent data → GDPR sensitivity, data minimization)
- Sufficient catalog breadth for alternatives to exist

**Definition of Done**
- [ ] Users with a saved profile see compatibility signals across the whole catalog
- [ ] Every recommendation displays its reason ("suggested because: fragrance-free, verified plastic-free")
- [ ] Measurable retention lift for profile users vs. anonymous
- [ ] Privacy audit passed; profile data exportable and deletable by the user

---

### Phase 5: Global Scale — Evergreen as Infrastructure

| | |
|---|---|
| **Goal** | Make Evergreen's trust layer available beyond evergreen.example: multi-market operation, and the data/standards/verification exposed as products of their own (APIs, embeddable badges, certification services). |
| **Why it matters** | The end-state is not "a big shop" but *the reference layer for product trust*. Infrastructure revenue (APIs, verification services) compounds and is defensible in a way retail margin is not. |

**Core features**
- Internationalization: languages, currencies, regional regulation mapping (EU first, then beyond)
- Public API v1: read access to structured product/trust data for partners
- Embeddable trust badge (verified, tamper-resistant) for brand sites and other retailers
- Evergreen verification as a service for brands (paid, standards-based)
- Data partnerships (research institutions, NGOs, retailers)
- Scaled operations: SLAs, on-call, compliance program, localized legal entities as needed

**What should NOT be built yet** *(i.e., traps to avoid even at this stage)*
- Racing Amazon on logistics, price, or catalog breadth
- Diluting standards to grow supply faster
- White-labeling that hides the Evergreen identity behind others' brands

**Dependencies**
- V2/V3 mature; standards respected externally
- Legal/regulatory groundwork per market (claims law differs by jurisdiction)
- Funding/revenue base sufficient for multi-market operations

**Definition of Done**
- [ ] Operating in ≥ 3 markets/languages with localized legal compliance
- [ ] ≥ 1 external partner consuming the API or embedding badges in production
- [ ] Verification-as-a-service generating revenue independent of marketplace GMV
- [ ] Evergreen standards cited/used outside Evergreen's own properties

---

## 3. Evergreen Core Domains

> Format per domain: **Purpose · Key components · MVP scope · V1/V2/V3 scope · Risks · Dependencies · Open decisions.**

### 3.1 Foundation

- **Purpose:** The technical and organizational bedrock — repo structure, environments, CI/CD, hosting, observability, documentation culture.
- **Key components:** Monorepo (`backend/`, `frontend/`, `docs/`), PostgreSQL, deploy pipeline, staging/production split, error tracking, backups, ADRs (architecture decision records).
- **MVP scope:** Single environment + one-command local setup (exists); static hosting for the MVP site; manual deploys acceptable.
- **V1/V2/V3 scope:** V1: CI/CD, staging, backups, monitoring. V2: evidence storage (S3), audit logging. V3: multi-region readiness, SLOs.
- **Risks:** Overengineering early (k8s before customers); under-engineering late (no backups when evidence documents arrive).
- **Dependencies:** None — this is the root.
- **Open decisions:** Hosting provider; when to introduce TypeScript; monorepo tooling as the team grows.

### 3.2 Legal & Governance

- **Purpose:** Operate lawfully and make the trust claims themselves legally defensible — Evergreen's product *is* claims about products.
- **Key components:** Company formation, terms, privacy (GDPR), imprint, marketplace/merchant agreements, claims-compliance review (EU Green Claims / cosmetics regulation), internal governance for standards decisions.
- **MVP scope:** Imprint, privacy policy, terms for an informational site; a "no health claims" editorial rule; disclaimer pattern for `unknown`/declared-not-verified data.
- **V1/V2/V3 scope:** V1: merchant contracts, payment/consumer law (returns, withdrawal). V2: standards governance charter, evidence retention policy. V3: per-market legal entities/compliance.
- **Risks:** Greenwashing accusations if badge language overpromises; EU Green Claims Directive tightening rules on environmental claims; liability for third-party product data.
- **Dependencies:** Brand identity (claim wording), Standards (what badges assert).
- **Open decisions:** Jurisdiction of incorporation; legal review cadence; how liability for brand-declared data is contractually shifted to brands.

### 3.3 Brand Identity

- **Purpose:** Make "Evergreen" itself mean trust — naming, voice, visual identity, and the promise the name carries.
- **Key components:** Name/trademark, logo, color/typography, tone-of-voice guide (honest, calm, no hype), messaging hierarchy, domain.
- **MVP scope:** Working identity: logo, palette (the green system in the prototype), voice rules ("we say unknown", "no dark patterns"), consistent copy on Home/About.
- **V1/V2/V3 scope:** V1: brand guidelines doc for partners. V2: badge visual language as sub-brand. V3: trademark protection in target markets, co-branding rules.
- **Risks:** Generic "eco-brand" look-alike identity; trademark conflicts (evergreen is a common word); voice drift toward marketing hype as growth pressure rises.
- **Dependencies:** Legal (trademark).
- **Open decisions:** Final name/domain confirmation; whether badges get a distinct sub-brand name.

### 3.4 Design System

- **Purpose:** One reusable component language so every surface (shop, portal, admin, badges) feels like the same trustworthy product — and ships fast.
- **Key components:** Tokens (color, type, spacing), core components (cards, buttons, forms, score displays), the `ScoreBar`/badge/`unknown`-state patterns, accessibility rules.
- **MVP scope:** Tailwind token set + ~10 components (exists in prototype: card, btn, input, ScoreBar, ProductCard, pills); explicit visual pattern for `unknown`.
- **V1/V2/V3 scope:** V1: form/table patterns for portal & admin. V2: evidence/verification UI patterns, public badge kit. V3: embeddable widget theming, RTL/i18n-ready components.
- **Risks:** Component drift across pages; accessibility debt (score colors need text equivalents, not color alone).
- **Dependencies:** Brand identity.
- **Open decisions:** Whether to extract a shared package once portal/admin grow; Storybook or lighter documentation.

### 3.5 Marketplace

- **Purpose:** The consumer-facing discovery and (later) purchasing experience — the front door of Evergreen.
- **Key components:** Homepage, category pages, listing grid, product detail, search/filters, cart/checkout (later), order management (later).
- **MVP scope:** Home, categories, grid, product detail, basic search + filters. **No checkout** — product pages may link out to brand shops or show "coming soon".
- **V1/V2/V3 scope:** V1: pilot checkout + orders (reactivate hardened prototype). V2: transparency-first browsing (filter by evidence-backed badges). V3: comparisons, alternatives, personalization; multi-market storefronts.
- **Risks:** Building shop mechanics before the trust layer proves itself; conversion-optimizing into dark patterns.
- **Dependencies:** Product Data, Badge System, Design System.
- **Open decisions:** Marketplace model for V1 pilot (own merchant-of-record vs. commission vs. affiliate/link-out); category taxonomy v1.

### 3.6 Product Data

- **Purpose:** The structured heart of Evergreen — products as data objects (ingredients, materials, packaging, origin, sources), not marketing text.
- **Key components:** Product schema (exists: products, product_ingredients, product_attributes, certifications, data_sources), category taxonomy, data quality rules, `unknown` semantics, import/curation tooling.
- **MVP scope:** Hand-curated products in the existing schema (or static JSON mirroring it); mandatory `data_sources`; explicit `unknown` for every missing field.
- **V1/V2/V3 scope:** V1: brand-submitted data with validation. V2: ingredient knowledge base, evidence linkage, versioned product data. V3: API-grade data contracts, bulk import, cross-market variants.
- **Risks:** Garbage-in (brands submitting junk) — mitigated by moderation + provenance rules; schema churn breaking published scores.
- **Dependencies:** Foundation (DB), Standards (what fields matter).
- **Open decisions:** Adopting external ingredient databases (licensing?); product versioning strategy; barcode/GTIN support timing.

### 3.7 Transparency System

- **Purpose:** The explainability machinery: scores, breakdowns, and the guarantee that every rating can be audited by anyone.
- **Key components:** Scoring engine (exists: per-factor breakdowns), admin-tunable rule sets, score versioning, public "Why this score?" UI, transparency reports.
- **MVP scope:** Existing transparency + sustainability scoring with visible breakdowns; a public methodology page in plain language.
- **V1/V2/V3 scope:** V1: rule-set governance (who may change weights, changelog). V2: scores derived from standards + evidence; historical audit. V3: category-specific scoring models, third-party auditability, API exposure.
- **Risks:** Score gaming by brands (optimizing fields without substance); perceived arbitrariness if weights change silently.
- **Dependencies:** Product Data, Standards, Evidence Engine (V2+).
- **Open decisions:** Public changelog format for rule changes; whether scores are comparable across categories or per-category only.

### 3.8 Evergreen Standards

- **Purpose:** The written definition of "better" — the criteria products and brands are measured against. This is Evergreen's constitution.
- **Key components:** Category criteria (ingredients, packaging, production, labor, health), threshold definitions, exclusion lists, versioning, public publication, governance process.
- **MVP scope:** Standards v0: a short public document (2–5 pages) defining what MVP badges mean and what is excluded (e.g., specific ingredient classes).
- **V1/V2/V3 scope:** V1: per-category criteria used in moderation. V2: Standards v1 formally versioned + evidence requirements per criterion. V3: external advisory board, market-specific addenda, standards licensed/cited externally.
- **Risks:** Standards too strict → empty catalog; too loose → greenwashing platform. Credibility depends on getting this balance right and evolving transparently.
- **Dependencies:** Legal (claims law), domain expertise.
- **Open decisions:** Advisory structure (scientists/regulators?); how public the deliberation process is; grandfathering when standards tighten.

### 3.9 Badge System

- **Purpose:** Compress complex verified data into instantly readable trust signals — the visual currency of Evergreen.
- **Key components:** Badge taxonomy (e.g., Verified Brand, Evidence-Backed, Plastic-Free Packaging, Full Ingredient Disclosure), earning rules, visual system, badge detail pages ("how this was earned"), revocation.
- **MVP scope:** 3–6 badges, manually assigned per documented rules; every badge links to a plain-language explanation page; explicit visual distinction between "verified" and "brand-declared".
- **V1/V2/V3 scope:** V1: badges assigned via moderation workflow. V2: badges derived from standards + evidence with expiry/re-verification. V3: embeddable off-platform badges (tamper-resistant), badge API.
- **Risks:** Badge inflation (too many → meaningless); legal exposure if a badge overstates verification; visual clutter on product cards.
- **Dependencies:** Standards, Design System, Evidence Engine (V2+).
- **Open decisions:** Final MVP badge set; naming convention; whether brands can display badges off-platform before V3 safeguards exist.

### 3.10 Evidence Engine

- **Purpose:** The proof layer — storing, linking, and lifecycle-managing the documents and data that back every claim and badge.
- **Key components:** Document storage (certificates, lab results, audits), claim↔evidence linkage model, verification workflow (submit → review → accept/reject), expiry & re-verification scheduling, audit trail.
- **MVP scope:** None built. Manual: curators keep evidence notes in the `data_sources` fields and internal docs. (Design the schema on paper only.)
- **V1/V2/V3 scope:** V1: evidence upload in brand portal, reviewed by admins. V2: full engine — typed evidence records, linkage to badges/criteria, expiries, public verification status. V3: machine-assisted checks (OCR, registry lookups), external auditor access.
- **Risks:** Storing sensitive brand documents (security/NDA); forged certificates; review bottleneck as catalog grows.
- **Dependencies:** Foundation (S3 storage), Standards (what counts as evidence), Admin & Operations (review capacity).
- **Open decisions:** Which certificate registries can be checked automatically; evidence confidentiality tiers (public summary vs. private document); retention duration.

### 3.11 Brand Portal

- **Purpose:** The supply-side product: where brands apply, submit structured data, upload evidence, and manage their presence.
- **Key components:** Application/onboarding, product submission forms (structured, source-mandatory), evidence upload (V1+), inventory/orders (V1+), AI-assisted data entry, status dashboards.
- **MVP scope:** **Interest Form only** (name, company, product types, why Evergreen). The existing prototype dashboard stays dormant; onboarding is manual/concierge.
- **V1/V2/V3 scope:** V1: reactivate + extend the prototype portal (submission → review pipeline). V2: evidence upload, badge status tracking, re-verification reminders. V3: API submission, multi-market listings, analytics for brands.
- **Risks:** Too much friction → brands don't finish submissions (mitigate with concierge onboarding + AI assistance); too little friction → data quality collapses.
- **Dependencies:** Product Data schema, Admin workflows, Auth.
- **Open decisions:** Concierge-first vs. self-serve-first in V1; whether early brands get white-glove data entry done *for* them (recommended).

### 3.12 Customer Portal

- **Purpose:** The shopper's own space — orders, preferences, allergen profiles, saved products — powering personalization later.
- **Key components:** Account, order history, allergen/avoid-lists, values preferences, saved/compare lists, data export & deletion.
- **MVP scope:** None. No accounts in MVP (prototype auth stays dormant). Newsletter capture is the only identity touchpoint.
- **V1/V2/V3 scope:** V1: minimal accounts for orders. V2: saved products, basic preferences. V3: full profiles driving compatibility signals and personalization.
- **Risks:** Health-adjacent data (allergies) raises GDPR sensitivity; building accounts before there's a reason to have one.
- **Dependencies:** Marketplace (orders), Legal (privacy), AI Layer (V3 personalization).
- **Open decisions:** Social login vs. email-only; where profile data lives relative to order data (separation for privacy).

### 3.13 Admin & Operations

- **Purpose:** The internal control room: verification queues, moderation, catalog management, standards administration, and day-to-day marketplace operations.
- **Key components:** Brand verification queue, product moderation, category & certification management, scoring-rule administration, ops runbooks/SOPs, support tooling.
- **MVP scope:** Minimal: content is curated by the team directly (repo/DB); the existing prototype admin page suffices for internal use.
- **V1/V2/V3 scope:** V1: real moderation console + SOPs (extend prototype). V2: evidence review workflows, re-verification queues, audit logs. V3: multi-market ops, role hierarchies, SLA dashboards.
- **Risks:** Moderation becoming the scaling bottleneck; inconsistent decisions without SOPs; single-admin bus factor.
- **Dependencies:** Brand Portal (what enters the queue), Standards (decision criteria).
- **Open decisions:** When to hire dedicated ops; internal tool build-vs-buy (Retool-style vs. own admin).

### 3.14 Trust & Compliance

- **Purpose:** Protect the integrity of the platform itself: fraud prevention, claim compliance, security, and the processes that keep Evergreen honest.
- **Key components:** Claims review (no illegal health/eco claims), counterfeit/fraud detection, security practices (authn/z, secrets, backups), incident response, GDPR processes, internal ethics rules (no dark patterns, no data selling).
- **MVP scope:** Editorial claims checklist; HTTPS/basic security hygiene; privacy-compliant analytics (or none); documented "honesty rules" (unknown-first, no hype).
- **V1/V2/V3 scope:** V1: merchant KYC-lite, payment fraud basics, rate limiting, httpOnly-cookie auth. V2: evidence-forgery countermeasures, security audit, vulnerability disclosure policy. V3: compliance program per market, certifications (e.g., ISO 27001) as partners demand.
- **Risks:** A single greenwashing scandal or data breach could destroy the core asset (trust) permanently.
- **Dependencies:** Legal, Evidence Engine, Foundation.
- **Open decisions:** Analytics stack choice (privacy-first); when to commission the first external security audit.

### 3.15 AI Layer

- **Purpose:** AI as a *support* system — explaining, summarizing, and assisting data entry. Never a decision-maker, never a fact-inventor.
- **Key components:** Ingredient plain-language summaries, concern explanations, brand-side structured-data assistance, (V3) personalized explanations — all with no-invention guardrails and deterministic fallbacks (exists in prototype).
- **MVP scope:** Optional: the existing summary/concern endpoints on product pages, clearly labeled, with the deterministic fallback as default posture.
- **V1/V2/V3 scope:** V1: AI-assisted brand submissions (extract structure from INCI lists/PDFs, human-confirmed). V2: evidence-document assistance (summarize certificates for reviewers). V3: personalized, profile-aware explanations; alternative-finding with stated reasons.
- **Risks:** Hallucinated claims = legal + trust catastrophe (mitigated by grounding-only prompts, fallbacks, human confirmation); over-reliance eroding the human verification brand promise.
- **Dependencies:** Product Data (grounding), Trust & Compliance (guardrail review).
- **Open decisions:** Model/provider strategy and cost ceiling; whether AI outputs are cached/versioned for auditability (recommended).

### 3.16 Growth Engine

- **Purpose:** Sustainable demand- and supply-side growth that never purchases scale at the cost of trust.
- **Key components:** Content/SEO (transparency explainers, ingredient guides), newsletter, brand-sourcing outreach, PR around standards/reports, referral mechanics (later), community (later).
- **MVP scope:** Newsletter capture, About/Mission storytelling, 3–5 cornerstone content pieces (e.g., "How our scores work"), Brand Interest Form outreach loop.
- **V1/V2/V3 scope:** V1: SEO on category/product pages, brand co-marketing. V2: public transparency reports as PR engine, ingredient-guide content moat. V3: multi-market growth playbooks, partnerships, API-led distribution.
- **Risks:** Paid-growth temptation before retention exists; hype-toned marketing contradicting the calm/honest brand voice.
- **Dependencies:** Brand Identity (voice), Marketplace (something to land on).
- **Open decisions:** Content language strategy (DE/EN first?); newsletter tooling; how much founder-led vs. brand-led storytelling.

### 3.17 Business Model

- **Purpose:** How Evergreen sustains itself without corrupting incentives — revenue must reward trust, not undermine it.
- **Key components:** Candidate streams: marketplace commission, brand verification fees, premium brand services (analytics, placement *clearly labeled*), verification-as-a-service, data/API licensing. Explicit non-streams: selling user data, pay-for-score, hidden sponsorship.
- **MVP scope:** No revenue. Validate willingness-to-pay signals via the Brand Interest Form (ask about budget for verification/listing).
- **V1/V2/V3 scope:** V1: pilot commission and/or flat listing fee. V2: paid verification tiers (fee for *process*, never for *outcome*). V3: API licensing, verification-as-a-service, multi-market pricing.
- **Risks:** The central conflict: brands pay Evergreen while Evergreen judges brands. Must be firewalled (fees buy review capacity, never results) and publicly documented.
- **Dependencies:** Standards & Evidence (what verification fees buy), Legal (fee structures).
- **Open decisions:** Commission vs. SaaS-fee weighting; publishing the revenue-integrity policy publicly (recommended); investor strategy vs. bootstrap.

### 3.18 Global Expansion

- **Purpose:** Take the trust layer beyond the launch market — more languages, jurisdictions, categories, and ultimately infrastructure customers.
- **Key components:** i18n/l10n, multi-currency, per-market regulation mapping (claims, cosmetics, consumer law), localized standards addenda, market-entry playbooks, partnerships.
- **MVP scope:** None operationally. One decision only: build with i18n-*ready* patterns (no hardcoded copy in components where avoidable).
- **V1/V2/V3 scope:** V1: single market, done well. V2: regulation mapping research for market #2–3. V3/Global: staged market entries, localized catalogs, regional evidence requirements, global API.
- **Risks:** Premature expansion diluting ops quality; regulatory differences making badges non-portable across markets.
- **Dependencies:** Everything — expansion multiplies every other domain's complexity.
- **Open decisions:** Launch market (DACH? EU-wide English?); category expansion order (cosmetics → food? household?); expansion trigger metrics.

---

## 4. MVP Priority Map

> Note: items marked ⏸ already exist as working prototype code in this repo and are
> deliberately **paused**, not deleted. They resume in later phases.

### Must Have

| Item | Status | Notes |
|---|---|---|
| Homepage | 🔄 exists, re-focus | Sharpen mission messaging per this roadmap |
| Marketplace category pages | 🆕 build | Category taxonomy v1 needed |
| Product listing grid | ✅ exists | |
| Product detail page | ✅ exists | Already includes transparency data + scores |
| Badge system | 🆕 build | v0: manual, rule-documented, 3–6 badges |
| Transparency explanation | 🔄 exists, extend | "Why this score?" exists; add a public methodology page |
| Brand Interest Form | 🆕 build | Replaces self-serve signup as the MVP supply funnel |
| About / Mission page | 🆕 build | |
| Basic legal pages | 🆕 build | Imprint, privacy, terms |

### Should Have

| Item | Status |
|---|---|
| Basic search | ✅ exists |
| Basic filters | ✅ exists |
| Manufacturer/brand profile | ✅ exists (public brand page) |
| Product comparison placeholder | 🆕 build (static "coming soon" is fine) |
| Newsletter capture | 🆕 build |

### Later

| Item | Status |
|---|---|
| User accounts | ⏸ prototype exists — dormant until V1 |
| Checkout | ⏸ prototype exists — dormant until V1 pilot |
| Payments | 🚫 not built — V1 |
| Automated verification | 🚫 not built — V2+ |
| AI recommendations | 🚫 not built — V3 |
| Full brand dashboard | ⏸ prototype exists — dormant until V1 |
| APIs | 🚫 not built — Global phase |

---

## 5. Technical Implementation Notes

**The first stage must avoid overengineering.** The MVP's job is to prove trust, not
to demonstrate architecture. Concretely:

1. **Static/mock product data first.** Hand-curate 10–50 deeply structured products.
   It is fine to serve them from static JSON or the existing seed pipeline — *depth of
   data beats breadth of system*. The existing PostgreSQL schema is the target shape;
   don't add tables for hypothetical features.
2. **Reusable components.** Everything visual goes through the design-system
   components (`ProductCard`, `ScoreBar`, badge components, `unknown`-state pattern).
   No page-specific one-off styling that will fork the visual language.
3. **Clear schema planning.** Schema changes are cheap now and expensive later — when
   in doubt, write the schema down (as in `backend/db/schema.sql`) even for features
   not yet built (e.g., sketch the Evidence Engine tables on paper/in docs before V2,
   don't create them).
4. **Simple admin assumptions.** Assume 1–2 trusted humans operate everything.
   No role hierarchies, no workflow engines, no permission matrices. A moderation
   queue and a checklist beat an "ops platform".
5. **No premature checkout/payment implementation.** The prototype checkout stays
   dormant. Payments introduce PCI/legal/refund complexity that contributes nothing
   to the MVP's core question ("do people trust this?").
6. **No complex backend before product logic is stable.** No microservices, no
   queues, no caching layers, no search infrastructure. One Express app + Postgres
   (already built) is more than enough until well into V1. Elasticsearch, evidence
   pipelines, and APIs come only when their phase arrives.
7. **Bias to reversible decisions.** Prefer choices that can be changed in a day
   (copy, weights, badges) over ones that can't (public API contracts, published
   standards versions). Irreversible decisions get written down first (ADRs).

---

## 6. Strategic Product Principle

> **Evergreen should not compete with Amazon on everything.**
> **Evergreen should compete on trust, clarity, transparency, product quality,
> better alternatives, and confidence in purchasing decisions.**

Implications, applied:

- **Never** compete on: catalog breadth, price aggression, delivery speed, dark-pattern
  conversion optimization, ad-driven ranking.
- **Always** compete on: verified data, explainable scores, honest `unknown` states,
  curated quality, standards nobody else is willing to hold, and the calm confidence
  a buyer feels when the platform has *nothing to hide*.
- **Decision test:** when a feature/tradeoff is debated, ask — *"does this make a
  skeptical customer trust us more, or just transact more?"* If it only does the
  latter, it is not an Evergreen priority.

---

## Appendix: Phase ↔ Domain matrix (summary)

| Domain | MVP | V1 | V2 | V3 | Global |
|---|---|---|---|---|---|
| Foundation | local setup, static hosting | CI/CD, staging | evidence storage, audit logs | scale hardening | multi-region |
| Legal & Governance | site basics, claims rules | merchant/consumer law | standards governance | privacy (profiles) | per-market entities |
| Brand Identity | logo, voice, palette | partner guidelines | badge sub-brand | — | trademarks abroad |
| Design System | core kit + unknown pattern | portal/admin patterns | badge & evidence UI | comparison UI | embeddable/i18n |
| Marketplace | discovery only | pilot checkout | evidence-first browsing | comparison, alternatives | multi-market |
| Product Data | curated, deep | brand-submitted | knowledge base, versioning | — | API contracts |
| Transparency System | scores + methodology page | rule governance | evidence-derived, audited | per-category models | API exposure |
| Evergreen Standards | v0 (short, public) | moderation criteria | v1 formal + evidence reqs | — | market addenda |
| Badge System | manual, 3–6 badges | workflow-assigned | evidence-derived + expiry | — | embeddable |
| Evidence Engine | — (paper design) | upload + human review | full engine | machine-assisted | auditor access |
| Brand Portal | Interest Form only | submission portal | evidence + status | analytics | API submission |
| Customer Portal | — (newsletter only) | minimal accounts | saved items, prefs | full profiles | localized |
| Admin & Operations | team-as-admin | moderation console + SOPs | review workflows | — | multi-market ops |
| Trust & Compliance | claims checklist, hygiene | KYC-lite, auth hardening | security audit | privacy audit | compliance program |
| AI Layer | optional summaries | submission assistance | reviewer assistance | personalization | — |
| Growth Engine | content + newsletter | SEO, co-marketing | reports as PR | retention loops | market playbooks |
| Business Model | — (signal gathering) | pilot fees/commission | paid verification | premium services | API licensing |
| Global Expansion | i18n-ready habits | — | market research | — | staged entries |
