# ChemCalc — Full-Site Visual Translation Blueprint

*Produced by Atlas, 2026-09-05. Status: approved by Leo. Corrected 2026-09-05 (same day) after Leo flagged that BoatMD/Help/Donate are live, existing features — see §1 and §4. No building has started yet — this supersedes the MEKP-only scope in the Project Record.*

Grounded directly in: the live Magic Patterns artifact (editor `igj1coepi9s4kwq41co9iw`, all 45 source files read), the real `lpedreros/Chemcalc` repo (calculator scripts, `style.css`, Library includes, `docs/memory/PROJECT_CONTEXT.md` / `ARCHITECTURE.md`, page HTML), and the Project Record's failure history.

---

## 1. What "translate the look" actually means here

Leo's directive: *"translate the look and feel of what magic patterns did and inject our functionality... all I want is the live site to look like what MP did, while working correctly."*

Three things follow directly from reading the actual source, that weren't obvious from the directive alone — the third one was missed in the first pass of this blueprint and corrected after Leo flagged it:

- **This is a full theme change, not a reskin.** The live site is currently a dark theme (`#1c1c1e` background, light-blue `#89CFF0` accents, Bootstrap 4.5.2). The Magic Patterns design is a light theme (`#EFF2F1` paper background, near-black `#04141A` header/footer bands, orange `#E1861C` + teal `#0F7A85` accents, Inter + IBM Plex Mono). Every page's CSS changes, not just component layout. That's the real size of this job.
- **MP's own "calculator logic" is decorative and must be thrown away, not ported.** MP's `useMekpCalculator` hook recommends MEKP % using thresholds like "72°F → 1.75%." The real, frozen `calculateMEKP()` uses completely different Celsius breakpoints (29.4°C→1.0%, 23.9°C→1.5%, 18.3°C→2.0%, 15.6°C→2.5%, else 3.0%). Same story for Awlgrip (`data/paints.ts` invents 3 fixed application methods per product; the real `awlgripscript.js` has 6 products with per-product conditional ratios, one driven by a live slider) and Fiberglass (`data/fabrics.ts`'s simple weight/ratio model vs. the real `clothcalc.js`'s resin-type branching, density math, cost calc, and Arrhenius-approximated working time). **Every MP file under `hooks/`, and every calculation inside `data/paints.ts` / `data/fabrics.ts` / `useMekpCalculator.ts`, is reference for layout only — none of it is a source of truth for math.**
- **BoatMD, the floating Help button, and Donate are real, live, working features today — not net-new.** The first pass of this blueprint mischaracterized these as undecided new functionality. They're not: `/Library/Chatbot.lbi` loads a real `chatbot.js` sitewide that hits the YouTube Data API for repair tutorials and recommends real affiliate products; `/Library/HelpButton.lbi` puts a floating "?" on every page that opens a per-page modal with real, page-specific written content (`helpContentGuest`/`helpContentFree` variants — it's tier-gated, and the Estimator's version includes a sales pitch, not just instructions); Donate is a real PayPal form (`about.html`, business ID on file). MP's versions of all three are decorative demos: canned chat suggestions with no backend, one generic paragraph of help text per page, and a plain `#donate` anchor. **These three get the same treatment as calculator math — real function preserved underneath MP's new visual treatment, not rebuilt from MP's placeholder version and not skipped.**

## 2. Requirements (non-negotiable for every page)

- Real calculator math (`logic/calculators.js` and per-calculator scripts) is untouched. MP components define layout and interaction only; the real functions get wired behind them.
- Real Supabase data (affiliate/custom materials, profiles, estimates, task_presets) replaces every MP static data file it overlaps with. Nothing from `data/kits.ts`, `data/services.ts` (numbers), or `data/paints.ts`/`fabrics.ts` (values) ships as live content — see §4.
- The real BoatMD chatbot (YouTube + affiliate product results), the real per-page Help modal (including its guest/free/Pro content variants), the real inline help-icon/help-popover tooltips on the Estimator, and the real PayPal Donate flow all keep working exactly as today, restyled to match MP's floating-action-cluster look.
- Site stays vanilla HTML/CSS/JS, multi-page, Dreamweaver Library includes for shared chrome — per `PROJECT_CONTEXT.md`'s "no inline CSS/JS, strict separation" rule. No React, no client router, no build step gets introduced into the live site.
- Stripe, Trello handoff, affiliate links, auth/Pro gating, print letterhead output all keep working exactly as today, underneath the new look.
- Standing process fix stays in force, applied per page: no page is reported "done" on the builder's own word. Independent verification (Sentinel, or Helm reading the real device file) confirms the real file before it's presented as complete.

## 3. Reconciling the tech

| MP has | Real site has | Resolution |
|---|---|---|
| Tailwind utility classes, custom `tailwind.config.js` tokens | Hand-written `style.css`, currently hardcoded hex values, no token system | Translate MP's Tailwind tokens (ink/paper/signal/sea palette, Inter/IBM Plex Mono, shadow/timing values) into a small set of CSS custom properties added to `style.css` once, in Phase 0. Every page then references the same variables instead of new hardcoded hex per page — this is what makes the light-theme change maintainable instead of a page-by-page copy-paste job. |
| React Router SPA, one persistent `<SiteHeader>`/`<SiteFooter>`/`<FloatingActions>` | Separate static HTML pages, Library-include chrome (`nav.lbi`, `Footer.lbi`, `Chatbot.lbi`, `HelpButton.lbi`) | Header/footer/mobile-menu/floating-action-cluster get rebuilt **once** as updated Library includes (visual match to MP's `SiteHeader`/`SiteFooter`/`FloatingActions`), not per page. No routing changes — links stay real `<a href>` page loads. Sticky header, mobile-menu toggle, and the Donate/BoatMD/Help button cluster become vanilla JS in the shared includes, matching MP's look but keeping the real `chatbot.js`/help-modal/PayPal logic underneath. |
| Framer Motion (modal open/close transitions) | No animation library | Recreate the specific transitions used (fade + scale/translate on the Help and BoatMD panels, ~200-240ms, MP's easing curve) in plain CSS transitions/keyframes. Framer Motion itself is not needed — it's used for exactly two small popovers, not page transitions. |
| lucide-react icon components | No icon system | Pull the small fixed set of icons actually used (flask, menu/X, user, printer, thermometer, beaker, percent, ruler, star, search, chevron, chat bubble, heart-handshake, etc. — under 30 total across the whole design) as inline SVGs, sized/stroked to match. No icon library dependency needed for that small a set. |
| `components/ui/*` (FieldCard, Select, NumberField, Button, MixResultPanel) | No shared component layer | These become CSS patterns/classes in `style.css` (`.field-card`, `.mp-select`, `.mix-result-panel`, etc.), reused across calculator pages via consistent markup — the vanilla-HTML equivalent of a shared component. |

## 4. Where MP's placeholder data/logic gets replaced

| MP file/component | Real source it must be replaced with | Note |
|---|---|---|
| `data/kits.ts` (32 sample items, `kitCatalogSize = 140`) | Supabase `affiliate_materials` (157 live products) + `custom_materials` | Kits page keeps MP's search/filter/star UI pattern, but the list, categories, and star-persistence come from Supabase (star-sync already exists for Pro users per `PROJECT_CONTEXT.md`) — not a hardcoded array. |
| `data/paints.ts`, `data/fabrics.ts` | `awlgripscript.js` / `clothcalc.js` ratio and conversion logic | Layout only, as above — see §1. |
| `hooks/useMekpCalculator.ts` and its % thresholds | `calculateMEKP()` in the real calculator script | Layout/interaction pattern only. |
| `FloatingActions.tsx`'s "Ask BoatMD" chat (hardcoded canned suggestions, no backend) | Real `chatbot.js`/`chatbot_standalone.js` (`/Library/Chatbot.lbi`, sitewide) — YouTube tutorial search + real affiliate product recommendations | Restyle the toggle button and panel to match MP's `FloatingActions` chat popover; keep the real request/response flow (typing indicator, video results, product links) underneath. |
| `FloatingActions.tsx`'s Help "?" panel / `HelpFab.tsx` (one generic `HelpContent` object per page) | Real `/Library/HelpButton.lbi` + per-page `helpModal` (guest/free/Pro content variants, sales-pitch framing on Estimator) | Restyle the floating "?" button and modal to match MP's panel; keep the real tiered content and copy — do not replace it with MP's single generic paragraph per page. |
| `FloatingActions.tsx`'s `href="#donate"` link | Real PayPal donation form (`about.html`, live business account) | Restyle only. The real form/flow is unchanged; MP's anchor is a placeholder. |
| *(No MP equivalent)* | Real inline `help-icon`/`help-popover` field-level tooltips on the Estimator (`estimate.js`) | MP's Estimator has no per-field contextual help — this is real functionality with no mockup counterpart. Preserve it as-is, restyled to the new visual language, when Estimator is built in Phase 4. |
| `data/services.ts` (services list, showcase images, hero image) | Real service copy already on `services.html`/`about.html`; showcase images are MP-generated stock, not ChemCalc's own repair photos | Confirm with Leo whether to source real project photos or keep placeholder imagery until they're available — flagging as a content gap, not assuming either way. |
| `data/legal.ts` | Real `legal.html`/`terms.html`/`privacy.html` copy already on the live site (more specific and already correct — covers Pro billing, affiliate disclosure, etc.) | Keep the real copy; adopt MP's layout only. Do not ship MP's legal placeholder text. |
| `pages/Estimator.tsx`'s hardcoded labor/material/history sample rows | Supabase `estimate_list`, `task_presets`, Trello integration | The single biggest data gap — see §6, Phase 4. |
| Header subtitle "Powered by Think & Engage" (MP) and the live site's own "Powered by" header/about copy | Brand rule confirmed 2026-08-24: must read **"A Think & Engage Brand,"** never "Powered by" | Neither MP nor the current live site has this right yet. Fix it during translation — it's a one-line copy change in the header/footer includes and `about.html`, and an easy win to land correctly the first time. |

## 5. Phased plan — why this order

**Phase 0 — Foundations (build once, not per page).** CSS custom-property token system in `style.css` (colors, fonts, shadows) translated from `tailwind.config.js`; rebuilt `nav.lbi`/`Footer.lbi` with the new header/footer/mobile-menu; rebuilt `Chatbot.lbi`/`HelpButton.lbi`/Donate as the new floating-action cluster (real chatbot/help/PayPal logic underneath, MP's visual treatment on top); icon set as inline SVGs. Doing this once up front is what prevents six rounds of "fix the header again on every page" — the exact failure pattern already logged for MEKP.

**Phase 1 — Pilot: MEKP only, all the way through.** One calculator, taken through independent verification and Leo's actual approval on testing.chemcalc.co, before touching anything else. This is the cheapest place to catch a repeat of the June/August failure pattern (claimed-but-unwritten fixes, or a verification bar that doesn't match what Leo actually wants) — at 1 page of cost instead of 15.

**Phase 2 — Remaining 3 calculators** (Awlgrip, Epifanes, Fiberglass), same pattern as the pilot, once it's proven.

**Phase 3 — Marketing/info pages:** Home, Calculators index, Services, About, Kits. Kits gets extra care since it's swapping a 32-item static array for a live 157-product Supabase-backed catalog with search/filter/star.

**Phase 4 — Estimator.** Sequenced last among the functional pages deliberately: it's the most feature-dense, most revenue-relevant (Pro subscription gate), and the page where MP's version diverges furthest from real functionality (MP ships a simplified single-view demo with hardcoded sample rows and no field-level help; the real page has auth/Pro gating, Supabase-backed task presets, Trello handoff, PDF export, inline field tooltips, and a working print letterhead). Doing this after the team has a proven rhythm from Phases 1–3 reduces risk on the page that can least afford a repeat of the "looked done, wasn't" failure.

**Phase 5 — Remainder:** Contact, Legal pages (real copy, MP layout), NotFound, and the already-logged known issues (orphaned `mekp-init.js`, asymmetric header/footer on `estimate.html`/`history.html`/`trello-setup.html`/`awlgrip-safety.html`, `head-common.lbi` not wired sitewide, orphaned CSS rules) — cheap to fix once the new chrome is standard everywhere.

**Phase 6 — Sentinel's full-site QA regression**, then Leo's full-site review on testing.chemcalc.co, then merge/promote.

**Phase 7 — Deferred, post-launch: dark mode toggle.** Raised by Leo 2026-09-07, deliberately deferred rather than folded into Phases 0-6 — see the decision note right after this table for the reasoning and the actual design intent.

## 5a. Deferred decision: dark mode toggle (2026-09-07)

**Raised by Leo**, motivated by mobile battery savings (OLED/AMOLED panels draw meaningfully less power on dark pixels — an LCD panel's backlight runs regardless of pixel color, so the benefit is real but device-dependent). **Leo's explicit intent, corrected on the record:** if built, this is a properly-optimized dark theme — dark surfaces throughout (cards, panels, backgrounds), not the light "paper" card look with just a dark page background — specifically because a half-measure (light cards on a dark shell) would blunt the actual OLED battery benefit that's the point of building it.

**Decision: wait until Phase 6 is complete before scoping or building this.** Reasoning:
- The whole point of Phases 0-6 is moving the site from its *current* dark theme to the *approved* light MP theme. A dark-mode toggle is a genuine second theme on top of that finished light theme, not a step along the way to it.
- Building it now would mean re-touching every phase's work again later: Phases 2-5 will keep surfacing colors/components that aren't in the token system yet (a few non-tokenized spots are already known — see §6), so a dark palette built today would need repeated patching as each later phase lands, instead of being designed once against the complete, final token inventory.
- It roughly doubles the design and QA surface (contrast checks, per-component states, every page) for whatever phases are still ahead — directly working against this project's per-page revision caps and gated pace (§7), which exist specifically to prevent this kind of mid-flight scope growth.

**When Phase 6 is done, scoping this properly means:** a full dark-value set for every `--chrome-*` token (not just inverted accents — genuinely dark surfaces per Leo's intent above), a full audit of anything still using hardcoded (non-token) colors by that point, a toggle mechanism + persistence (e.g. `prefers-color-scheme` default + a manual override remembered per visitor), and its own contrast/accessibility pass in the dark variant specifically — same phased, gated, independently-verified treatment as every calculator page got, not a single one-shot build.

## 6. Risks specific to this translation

- **Scale multiplies the known failure mode.** The exact pattern that burned six rounds on MEKP alone (claimed fixes never actually written to Leo's file) is now possible on ~15 pages instead of 1. The standing independent-verification rule has to be applied per page, not spot-checked at the end.
- **Verification-bar mismatch.** MEKP was independently verified as matching its mockup and Leo still rejected it. "Matches the Magic Patterns source" and "Leo approves it" are not proven to be the same bar. Every phase needs a real Leo checkpoint on testing.chemcalc.co, not just an internal verification pass, before moving to the next phase.
- **MP's placeholder math leaking into production.** Covered in §1/§4 — one of the two highest-severity risks, since it would silently change what customers are told to mix.
- **MP's placeholder chatbot/help/donate leaking into production.** The same failure shape as the math risk, just discovered later: if Forge builds from MP's `FloatingActions.tsx` as if it were the spec, the real YouTube-backed chatbot, the real tiered help content, and the real PayPal form all get quietly replaced by non-functional decoration. This was missed in the first pass of this blueprint and is exactly the kind of gap independent verification (§2, §7) needs to check for explicitly on every page, not just calculator output.
- **Full theme swap, not a patch.** Dark → light touches every page's CSS, not just the pages being actively worked. Regression risk on pages not yet in scope for a given phase (they still load the shared `style.css`) needs a smoke check each phase, not just at the end.
- **Chrome inconsistency already exists and could get worse before it gets better.** Header/footer asymmetry is already logged as a known issue from the sitewide-chrome port. Doing chrome (including the chat/help/donate cluster) once in Phase 0, not per-page, is what prevents compounding it.
- **Print output.** MP has its own print approach (`@media print` + a dedicated `PrintSummary` component per calculator). The real site has a working print letterhead system (`print_style_fix_v4.css`, `estimate.html`'s print header block, `.help-icon`/`.help-popover` already correctly hidden from print) that must not be lost or overwritten by MP's simpler print pattern — the print output should keep the real, working structure with only cosmetic updates.
- **Legal/content pages.** Real legal copy is already correct and site-specific; MP's `data/legal.ts` is generic placeholder text. Layout-only translation, not a content replacement.
- **Known non-tokenized colors, relevant to the eventual dark-mode work (§5a):** Estimator's own non-modal UI (`.est-table`, `.help-icon`, `.repair-task-table`, `.deposit-*`, `.view-toggle-wrap`), `history.html`'s dashboard (`.hist-*`, `.status-*`), and pre-existing semantic status colors (`#e05252` red / `#2E9A5C` green) all still use hardcoded hex rather than `--chrome-*` tokens as of 2026-09-07. Whoever scopes Phase 7 needs a fresh audit at that time, not this list assumed still-current.

## 7. Revision limits & milestones for this piece of work

- **Per-page cap:** 2 correction rounds per page before work stops and the team re-checks the approach with Leo, rather than iterating indefinitely (what happened on MEKP).
- **Gate, don't batch, sign-off:** Leo reviews and approves at the end of every phase (not just once at the very end) — Phase 1's pilot approval in particular is a hard gate before Phase 2 starts.
- **Independent verification is mandatory per page**, not sampled — Sentinel or Helm confirms the real device file before any page is called done, and that verification explicitly checks that real chatbot/help/donate/calculator behavior survived, not just that the layout matches MP.
- **No page is "done" until:** independently verified against the real file (function AND look), reviewed live on testing.chemcalc.co by Leo, and passes Sentinel's QA for that page (output-parity, print, affiliate links on a live server, auth-pill states, chatbot/help/donate still functional).
- **Milestone checkpoints:** end of Phase 0 (chrome, tokens, and floating-action cluster approved), end of Phase 1 (pilot calculator approved — go/no-go for the rest), end of Phase 2 (all 4 calculators live on testing), end of Phase 3 (marketing pages live on testing), end of Phase 4 (Estimator live on testing — highest-scrutiny checkpoint), end of Phase 6 (full-site Sentinel QA + Leo sign-off + merge). **Phase 7 (dark mode toggle) is explicitly out of scope for these milestones — see §5a — and gets its own scoping pass, revision cap, and sign-off gate when it's actually taken up.**

---

**Approved by Leo, 2026-09-05.** Next step: connect the device folder so Forge can begin Phase 0.

**Addendum, 2026-09-07 (Atlas):** Dark mode toggle backlog item added — §5 (Phase 7) and §5a. Phase 2 (Fiberglass Cloth Saturation / `clothcalc.html`) grounding is complete and a Forge dispatch is in progress — see `claude/Atlas_ClothCalc_Phase2_Kickoff.md` and `docs/Clothcalc_Phase2_MP_Reference.md` (repo).
