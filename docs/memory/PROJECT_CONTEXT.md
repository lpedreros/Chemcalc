# ChemCalc — Project Context & Living Truth

**Version:** 4.0  
**Last updated:** 2026-08-27  
**Steward:** Atlas (Strategist)

## 1. Project Constancy of Purpose
The goal of ChemCalc is to provide accurate, reliable, and revenue-generating marine repair calculators. We optimize for:
1. **Stability & Accuracy:** Correctness over speed.
2. **Revenue:** Protecting and growing Stripe, affiliate, and service income.
3. **Maintainability:** Human-readable, modular logic to reduce AI dependence.

## 2. Authoritative Sources (One Source of Truth)
| Domain | Source of Truth |
|---|---|
| **Calculator Math** | `logic/calculators.js` (Tested and Frozen) |
| **Product Data** | Supabase `affiliate_materials` & `custom_materials` |
| **User & Estimates** | Supabase `profiles` & `estimate_list` |
| **Styles** | `css/style.css` (Shared visual system) |
| **Live Site** | [chemcalc.co](https://chemcalc.co) (Primary verification source) |

## 3. Non-Negotiable Rules (System Controls)
- **Inspect Before Change:** Always pull the LIVE version from `chemcalc.co` before modifying.
- **Strict Separation:** No inline CSS or JS. Keep files separate and modular.
- **Math Integrity:** Do not touch MEKP, Awlgrip, Epifanes, or Fiberglass Cloth math without IC approval.
- **UI Consistency:** 
  - Default to Imperial and Ounces.
  - Show Fahrenheit and Celsius simultaneously.
  - Use Imperial/Metric toggle switch.
  - Compact side-by-side fields on desktop.
- **Permissions:** No unauthorized writes to GitHub, Supabase, or production.

## 4. Architecture Snapshot
- **Backend:** Supabase (Auth, DB, RLS).
- **Frontend:** Vanilla JS / HTML / CSS.
- **Tracking:** `calc-tracker.js` populating `calculator_events`.
- **Integrations:** Stripe (Payments), Trello (Estimator), Amazon (Affiliates).

## 5. Active Migration State
- **Affiliate Data:** Migrated to Supabase (157 products).
- **Estimator:** Functional; uses mix of Supabase and legacy JS.
- **Next Focus:** Chatbot verification and `task_presets` table retirement.

## 6. Deming Learning Log (Active)
- *No systemic failures recorded in Version 4.0.*
