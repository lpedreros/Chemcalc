# tools/verify

Checks for proving that a change to the site's HTML/CSS changed only what you meant it to. Built during the 2026-10-02 design-system consolidation and reused since. Needs Python 3 (run on 3.12), `git`, and a Chromium browser (Chrome or Edge). No packages to install. Everything resolves paths from this folder, so it works from any checkout; `CHEMCALC_SITE` overrides the site folder (default `testing/`).

## What is here

| File | What it does |
|---|---|
| `serve.py` | Serves the site (or a frozen copy) and receives snapshots posted by the browser pages below. |
| `freeze.py` | Exports the site as it was at a git revision, to use as a baseline. |
| `harness.html` | Browser page. Snapshots every element's computed style, layout rectangle, `::before`/`::after`, slider thumb, and forced hover/active/focus/visited states, at several widths. |
| `compare_snaps.py` | Diffs two snapshot labels element by element. |
| `group_diffs.py` | Groups those differences by property so intended changes stand out. |
| `outside_chatbot.py` | Same comparison, ignoring the library chatbot panel (its open/closed state is per browser origin, so two ports can differ). |
| `aggregate.py` | Lists every distinct non-layout change across a whole run, to check against what you meant to change. |
| `func.html` + `func_compare.py` | Drives each calculator with scripted inputs and compares what it displays (text, visible elements, slider positions) between two trees. |
| `css_checks.py` | Static checks, no browser: `integrity`, `dead`, `orphans`, `inventory` (see below). |
| `text_parity.py` | Proves page text and links are verbatim between two revisions. |
| `patchlib.py` | CRLF-safe scripted edits that stop unless a pattern matches exactly once. |

## Before/after visual check

1. Freeze the baseline and serve both trees, each on its own port:
   ```
   python tools/verify/freeze.py <rev-before> <some-folder>      # prints the frozen folder
   python tools/verify/serve.py 8802 --root <that folder>        # baseline
   python tools/verify/serve.py 8801                             # your working tree
   ```
2. In the browser open, and wait until the page says `DONE`:
   ```
   http://127.0.0.1:8802/__harness.html?label=before&pages=index,about&widths=375,768,1440
   http://127.0.0.1:8801/__harness.html?label=after&pages=index,about&widths=375,768,1440
   ```
   Parameters: `label` (output folder under `snaps/`), `pages` (names without `.html`), `widths` (default 375,768,1440), `reveal=1` (also unhide everything a page hides until its script shows it: results, notes, advisories, slider rows; use it for the calculators).
3. Compare:
   ```
   python tools/verify/compare_snaps.py before after
   python tools/verify/group_diffs.py before after about-1440 --skip-rect
   python tools/verify/outside_chatbot.py before after
   ```
   Output goes to `tools/verify/snaps/` (git-ignored).

## Calculator behavior

Open `/__func.html?label=before` on the baseline server and `/__func.html?label=after` on the live one (optional `pages=`), then `python tools/verify/func_compare.py before after`.

## Static checks

- `css_checks.py integrity [--base REV]`: comments and braces balanced; selectors added/removed vs REV. A literal `*/` inside a comment body closes it early and swallows the rules after it.
- `css_checks.py dead [--base REV]`: classes the CSS names that no page uses, new since REV. Catches a compound selector (`.x:first-child`) still naming a class you removed from the markup.
- `css_checks.py orphans --base REV`: classes whose CSS you deleted but markup or JS still uses. An id that looks like a class name is reported too (e.g. `cloth-temp-advisory`, an element id); check the hit.
- `css_checks.py inventory`: duplicated declaration groups, i.e. candidates to share.
- `text_parity.py --pages privacy,terms --base REV [--map-headings h3:h2] [--skip-class legal-doc-sidebar]`: every heading, paragraph, list item, and link must match. Also run `python testing/sync_library.py --check` for the Library blocks.

## Reading results, and what this cannot see

- First capture the same tree twice and compare: it should be 0 differences. That is your noise floor.
- Capture the baseline with the same harness version as the "after"; a newer probe (e.g. the slider thumb) otherwise shows up as a difference.
- The harness waits for each page's element count to stop changing (some pages fill in data after load), switches transitions off before reading forced states (otherwise a fading hover reads its starting value), and strips the server port from URLs.
- Not covered: print layouts, real `:visited` rendering (browsers hide it from scripts), other browsers, and JS states the scripts do not drive.
