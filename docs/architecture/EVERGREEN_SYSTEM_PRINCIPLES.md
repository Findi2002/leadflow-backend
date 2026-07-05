# Evergreen System Principles

| | |
|---|---|
| **Document ID** | EVA-10 |
| **Status** | Active |
| **Version** | 1.0.0 |
| **Owner** | Architecture Guild (changes require founder-level approval) |
| **Last updated** | 2026-07-05 |

---

## 1. Purpose

State the **Tier-0 principles** ([EVA-01 §6.2](EVERGREEN_KNOWLEDGE_SYSTEM.md)) that
govern every design, product, and engineering decision at Evergreen. Principles are
not slogans: each carries binding implications and a decision test. When documents,
plans, or code conflict with a principle, the principle wins; when principles
appear to conflict with each other, §6.11 resolves precedence.

## 2. Scope

**In scope:** the principles, their implications, decision tests, and precedence.
**Out of scope:** domain-specific rules derived from them (owned by EVA-02…EVA-09
and the [Roadmap](../roadmap/EVERGREEN_MASTER_ROADMAP.md)).

## 3. Dependencies

- [EVA-01 Knowledge System](EVERGREEN_KNOWLEDGE_SYSTEM.md) — tier model and
  change governance (a principle change is always a MAJOR bump + ADR).

## 4. Related Documents

All EVA documents implement these principles; the [Architecture Index](README.md)
maps which document operationalizes which principle. The Roadmap's
*Strategic Product Principle* (§6 there) is the strategy-level statement of §6.1.

## 5. Definitions

This document owns: **Principle**, **Decision Test**, and the named principles
below. Other terms:
[EVA-01 §7](EVERGREEN_KNOWLEDGE_SYSTEM.md#7-canonical-terminology-registry).

## 6. Architecture (the principles)

### 6.1 Trust over Growth

Trust is the asset; growth that spends trust is a loss disguised as a win.

- **Implications:** no growth tactic may weaken verification, dilute Standards, or
  compromise the commercial firewall (badge/score outcomes are unpurchasable —
  [EVA-05 §6.6](EVERGREEN_BADGE_SYSTEM.md), Roadmap §3.17). Supply growth never
  outruns review capacity ([EVA-06 §7](EVERGREEN_EVIDENCE_ENGINE.md)).
- **Decision test:** *"Does this make a skeptical customer trust us more — or just
  transact more?"* (Roadmap §6). If only the latter, deprioritize.

### 6.2 Transparency over Marketing

Evergreen explains; it does not persuade.

- **Implications:** structured facts outrank prose everywhere
  ([EVA-03 §6.1](EVERGREEN_INFORMATION_ARCHITECTURE.md)); ranking factors are
  public; no hype vocabulary in product surfaces, badge names
  ([EVA-05 §6.6](EVERGREEN_BADGE_SYSTEM.md)), or documentation
  ([EVA-01 §6.8](EVERGREEN_KNOWLEDGE_SYSTEM.md)); the API serves the same
  unembellished truth as the site ([EVA-09 §6.1](EVERGREEN_API_CONCEPT.md)).
- **Decision test:** *"Would we be comfortable if the user saw exactly how this
  works?"* If the mechanism needs hiding, the mechanism is wrong.

### 6.3 Evidence over Claims

Assertions are inputs; only evaluated evidence changes what Evergreen endorses.

- **Implications:** the Declared/Reviewed/Evidence-Backed/Independently-Audited
  ladder ([EVA-06 §6.2](EVERGREEN_EVIDENCE_ENGINE.md)) is displayed, never
  flattened; no badge below `Reviewed` ([EVA-05 §6.2](EVERGREEN_BADGE_SYSTEM.md));
  verification decays with evidence expiry rather than persisting on reputation
  ([EVA-02 §6.7](EVERGREEN_PRODUCT_ARCHITECTURE.md)).
- **Decision test:** *"If this fact were challenged publicly, what would we show?"*
  If the answer is "the brand said so", it displays as exactly that.

### 6.4 Honest Unknown

Missing data is information. It is shown, filterable, and never guessed away.

- **Implications:** three-state data and explicit unknown-serialization everywhere
  ([EVA-04 §5](EVERGREEN_PRODUCT_SCHEMA.md),
  [EVA-03 §6.8](EVERGREEN_INFORMATION_ARCHITECTURE.md),
  [EVA-09 §6.1](EVERGREEN_API_CONCEPT.md)); scores factor unknowns visibly
  (prototype Score Breakdowns); AI outputs say "unknown" instead of inferring
  (§6.9); Criteria define unknown-handling explicitly
  ([EVA-07 §6.1](EVERGREEN_STANDARD_LIBRARY.md)).
- **Decision test:** *"Where did this value come from?"* If the honest answer is
  "nowhere", the display must say unknown.

### 6.5 Simple before Complex

Every layer of machinery must be earned by a measured need.

- **Implications:** the staged scalability path with explicit triggers
  ([EVA-08 §6.9](EVERGREEN_DATABASE_CONCEPT.md)); bounded contexts as modules
  before services ([EVA-02 §7](EVERGREEN_PRODUCT_ARCHITECTURE.md)); DB search
  before search infrastructure ([EVA-03 §6.4](EVERGREEN_INFORMATION_ARCHITECTURE.md));
  the Roadmap's anti-overengineering rules (§5 there) are this principle applied
  to the MVP.
- **Decision test:** *"What measurement demands this now?"* No measurement, no
  machinery.

### 6.6 Composable Architecture

Parts must be replaceable without rewriting the whole.

- **Implications:** layered platform with downward-only dependencies
  ([EVA-02 §6.1](EVERGREEN_PRODUCT_ARCHITECTURE.md)); single-writer entity groups
  with ID-only cross-references ([EVA-08 §6.1](EVERGREEN_DATABASE_CONCEPT.md));
  derived stores (search, caches, snapshots) always rebuildable from truth;
  one serialization layer behind all API tiers
  ([EVA-09 §7](EVERGREEN_API_CONCEPT.md)).
- **Decision test:** *"If we replaced this component in two years, what else would
  we be forced to rewrite?"* The answer should be: its callers' imports, not their
  logic.

### 6.7 Reversible Decisions

Optimize for changing your mind cheaply; treat irreversible choices differently.

- **Implications:** two-track decision process — reversible choices ship fast,
  irreversible ones (public API contracts, published Standard versions, permanent
  slugs, badge grants) get ADRs, review, and versioned immutability
  ([EVA-01 §6.6](EVERGREEN_KNOWLEDGE_SYSTEM.md),
  [EVA-07 §6.2](EVERGREEN_STANDARD_LIBRARY.md),
  [EVA-09 §6.6](EVERGREEN_API_CONCEPT.md)); Roadmap §5-7 is this principle at MVP
  scale.
- **Decision test:** *"What does undoing this cost in a year?"* Price the exit
  before entering.

### 6.8 Documentation First

If the design isn't written, it isn't decided.

- **Implications:** the knowledge system ([EVA-01](EVERGREEN_KNOWLEDGE_SYSTEM.md))
  governs all architecture change: no architectural change without a document
  change in the same PR; paper-design before build (the Evidence Engine was
  designed in [EVA-06](EVERGREEN_EVIDENCE_ENGINE.md) an entire phase before its
  construction — deliberately); Open Questions are honest and load-bearing.
- **Decision test:** *"Could a new engineer or AI agent reconstruct this decision
  and its why from the repo alone?"*

### 6.9 Human Review before Automation

Automation assists; accountable humans decide — especially about trust.

- **Implications:** machines screen, humans accept/reject evidence
  ([EVA-06 §6.5](EVERGREEN_EVIDENCE_ENGINE.md)); AI is support-only, never a
  decision-maker, never a fact source (Layer-3 rule,
  [EVA-02 §6.1](EVERGREEN_PRODUCT_ARCHITECTURE.md); prototype guardrails with
  deterministic fallback); automated verification arrives only as
  machine-*assisted* review, and each automation of a decision path requires an
  ADR demonstrating parity with human quality.
- **Decision test:** *"Who is accountable if this call is wrong?"* If no human owns
  the answer, the call stays human.

### 6.10 No Dark Patterns

Confidence, not pressure. The interface never manipulates.

- **Implications:** no urgency theater, no pre-narrowed "commercial" defaults, no
  hidden costs, no gated trust information
  ([EVA-03 §6.3/§6.8](EVERGREEN_INFORMATION_ARCHITECTURE.md)); privacy by design —
  profile data minimized, exportable, deletable, never sold or ad-targeted
  ([EVA-02 §6.8](EVERGREEN_PRODUCT_ARCHITECTURE.md), Roadmap §3.17 non-streams);
  server-verified prices (prototype precedent).
- **Decision test:** *"Does this help the user decide, or decide for them?"*

### 6.11 Precedence

When principles collide in a concrete decision:

1. **Integrity beats convenience:** §6.1–§6.4 (trust, transparency, evidence,
   honesty) outrank §6.5–§6.8 (engineering economics).
2. **Human accountability beats both** where they conflict with §6.9–§6.10
   (a simpler system that automates a trust decision is not simpler — it is wrong).
3. Remaining ties are resolved by ADR with the trade-off stated explicitly —
   an undocumented compromise of a principle is a defect, a documented one is a
   decision.

## 7. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Principles decay into wall art under delivery pressure | Slow drift to ordinary marketplace | Decision tests wired into review gates (EVA-01 §6.9); quarterly review reads sampled decisions against them |
| Over-literal application blocks pragmatic wins | Analysis paralysis | Precedence rules §6.11; reversible decisions ship fast §6.7 |
| Principle conflicts resolved ad hoc | Inconsistent culture | Conflicts require ADRs; precedents accumulate |

## 8. Future Evolution

Principles change rarely and only by founder-level decision + ADR + MAJOR version
(EVA-01 §6.4). Anticipated evolution: `Global` phase may add a
*Jurisdictional Honesty* principle (per-market legal divergence handled
transparently rather than by lowest common denominator) — deliberately not adopted
before multi-market operation makes it concrete.

## 9. Open Questions

1. Should the decision tests be embedded verbatim into PR/ADR templates as
   checklist prompts? (Leaning: yes, at V1 when CI checks arrive — EVA-01 §9.)
2. Does §6.9 need a quantified quality-parity bar for future automation ADRs
   (e.g., error-rate parity on a golden set), and who defines it?

## 10. Decision Log

| Date | Version | Change | Rationale |
|---|---|---|---|
| 2026-07-05 | 1.0.0 | Initial principles with precedence rules | Capstone codifying the rules the EVA set already embodies |

## 11. References

- [Roadmap §6](../roadmap/EVERGREEN_MASTER_ROADMAP.md) — strategic statement of §6.1
- [EVA-01](EVERGREEN_KNOWLEDGE_SYSTEM.md) — governance of principle changes
- All EVA documents — operationalization mapping in the [Architecture Index](README.md)
