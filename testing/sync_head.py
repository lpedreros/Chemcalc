#!/usr/bin/env python3
"""
sync_head.py -- keep the shared <head> block in sync across every real
ChemCalc page.

What it does:
  1. Reads Library/head-common.lbi.
  2. For each page in PAGES (below), finds the two markers
         <!-- HEAD-COMMON:START -->
         <!-- HEAD-COMMON:END -->
     and replaces everything between them with head-common.lbi's current
     content.
  3. Prints a summary: how many pages were updated, and -- as an error,
     not a silent skip -- any listed page where the markers weren't
     found.

Usage (from \\testing\\):
    python sync_head.py
    python sync_head.py --check     # report what would change, write nothing

To change the shared block: edit Library/head-common.lbi only, then
re-run this script. Never hand-edit the marked region on an individual
page -- the next run overwrites it.

Adding a page: add its filename to PAGES below, then wrap the block you
want synced in the two marker comments (on its own, once) before running
this script -- it errors on any listed page missing the markers rather
than silently skipping it, by design.
"""

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
HEAD_COMMON_PATH = ROOT / "Library" / "head-common.lbi"

START_MARKER = "<!-- HEAD-COMMON:START -->"
END_MARKER = "<!-- HEAD-COMMON:END -->"

# Every real page that carries the shared head block. products.html is a
# raw content fragment, not a page, and is deliberately excluded.
PAGES = [
    "about.html",
    "awlgrip.html",
    "awlgrip-safety.html",
    "calculators.html",
    "clothcalc.html",
    "contact.html",
    "cookie.html",
    "epifanespoly.html",
    "estimate.html",
    "history.html",
    "index.html",
    "kits.html",
    "legal.html",
    "mekp-safety.html",
    "mekpcalc.html",
    "privacy.html",
    "services.html",
    "terms.html",
    "trello-setup.html",
]


def sync_page(page_path: Path, head_common: str, check_only: bool) -> str:
    """Returns one of: 'updated', 'unchanged', 'missing-markers'."""
    original = page_path.read_text(encoding="utf-8")

    start_idx = original.find(START_MARKER)
    end_idx = original.find(END_MARKER)

    if start_idx == -1 or end_idx == -1 or end_idx < start_idx:
        return "missing-markers"

    before = original[: start_idx + len(START_MARKER)]
    after = original[end_idx:]  # starts at END_MARKER itself

    new_content = before + "\n" + head_common.rstrip("\n") + "\n" + after

    if new_content == original:
        return "unchanged"

    if not check_only:
        page_path.write_text(new_content, encoding="utf-8")
    return "updated"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Report what would change without writing any file.",
    )
    args = parser.parse_args()

    if not HEAD_COMMON_PATH.exists():
        print(f"ERROR: {HEAD_COMMON_PATH} not found.", file=sys.stderr)
        return 1

    head_common = HEAD_COMMON_PATH.read_text(encoding="utf-8")

    updated, unchanged, missing = [], [], []

    for name in PAGES:
        page_path = ROOT / name
        if not page_path.exists():
            missing.append((name, "file not found"))
            continue

        result = sync_page(page_path, head_common, args.check)
        if result == "updated":
            updated.append(name)
        elif result == "unchanged":
            unchanged.append(name)
        else:
            missing.append((name, "HEAD-COMMON:START/END markers not found"))

    verb = "Would update" if args.check else "Updated"
    print(f"{verb}: {len(updated)} page(s)")
    for name in updated:
        print(f"  - {name}")

    print(f"Already in sync: {len(unchanged)} page(s)")

    if missing:
        print(f"\nERROR: {len(missing)} page(s) could not be synced:", file=sys.stderr)
        for name, reason in missing:
            print(f"  - {name}: {reason}", file=sys.stderr)
        return 1

    print("\nAll listed pages are in sync with Library/head-common.lbi.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
