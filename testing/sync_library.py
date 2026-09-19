#!/usr/bin/env python3
"""
sync_library.py -- keep every Dreamweaver library item in sync across
every real ChemCalc page, without Dreamweaver.

WHY THIS EXISTS: six shared components (nav, icons, global-scripts,
Chatbot, Footer, HelpButton) are updated sitewide today by Dreamweaver's
Library feature. When the Creative Cloud subscription that Dreamweaver
comes with lapses, the alternative is a hand edit of every page that
uses each one, with nothing checking that none were missed. This script
replaces that update path.

What it does, in two independent parts:

  1. Dreamweaver library items. Scans every testing/*.html page for
     Dreamweaver's own markers:
         <!-- #BeginLibraryItem "/Library/X.lbi" --> ... <!-- #EndLibraryItem -->
     and, for each pair found, compares the block against Library/X.lbi.
     The opening marker names its own source file, so both the page list
     and the library-item list are DISCOVERED from the markers -- there
     is no hand-maintained list to fall out of date (an improvement on
     sync_head.py's PAGES constant, which the HEAD-COMMON block below
     still needs, since it predates marker adoption and isn't wrapped in
     one). Nothing about the markers changes, so Dreamweaver keeps
     working alongside this script -- deliberately: the tool can be
     proven while Dreamweaver is still available as a fallback.

  2. The HEAD-COMMON block. Unchanged in behaviour from sync_head.py:
     reads Library/head-common.lbi and replaces whatever sits between
         <!-- HEAD-COMMON:START --> ... <!-- HEAD-COMMON:END -->
     on each page in the hand-maintained PAGES list below. head-common.lbi
     is referenced by zero Dreamweaver markers -- it is driven entirely
     by this pair of markers instead -- so it keeps needing its own list.

Known drift, and how this script treats it (read why before changing any
of this -- each rule exists because of one specific, verified cause):

  - A leading `<meta http-equiv="Content-Type" ...>` line in a .lbi is a
    Dreamweaver artifact it inserts inconsistently: present in some
    pages' copies of a given item, absent in others, with no reliable
    rule for which (Chatbot.lbi's 17 blocks never have it; Footer.lbi's
    16 always do). Comparison treats "matches the .lbi exactly" and
    "matches the .lbi minus one leading Content-Type line" as equally in
    sync. In write mode this script PRESERVES whichever convention that
    specific block already used -- it never adds or removes that line.
  - A trailing-whitespace-only difference counts as in sync, not drift.
  - Suspected mojibake -- UTF-8 bytes that were at some point read back
    as Windows-1252, producing sequences like "\xc3\xa2\xe2\x82\xac\xe2\x80\x9d"
    for what should be a single em dash -- is reported as its own
    category, SUSPECTED_MOJIBAKE, never folded into ordinary drift.
    Detected by testing whether the block's text round-trips cleanly
    through cp1252-encode / utf-8-decode (the exact inverse of the
    mistake that produces it) into something different from itself.
    Fixing it automatically would mean guessing at the encoding history
    of one specific block; that is a decision for a human with the
    report in hand, not a heuristic run at sync time -- so write mode
    refuses to touch a block flagged this way (see --check output).

Usage (from \\testing\\):
    python sync_library.py --check     # report what would change, write nothing
    python sync_library.py             # write mode: sync every drifted block

To change a library item sitewide: edit the .lbi in Library/ only, then
re-run this script. Never hand-edit the marked region on an individual
page -- the next run overwrites it (for the Dreamweaver items) or, for
HEAD-COMMON, is simply undone the next time anyone runs this script.

Adding a new HEAD-COMMON page: add its filename to PAGES below, then
wrap the block you want synced in the two HEAD-COMMON marker comments
(on its own, once) before running this script -- it errors on any listed
page missing the markers rather than silently skipping it, by design.
Adding a new Dreamweaver library item needs no change here at all: wrap
the content in #BeginLibraryItem/#EndLibraryItem markers naming its .lbi
and this script finds it on the next run.
"""

import argparse
import re
import sys
from pathlib import Path
from typing import NamedTuple, Optional

ROOT = Path(__file__).resolve().parent
LIBRARY_DIR = ROOT / "Library"
HEAD_COMMON_PATH = LIBRARY_DIR / "head-common.lbi"

ENCODING = "utf-8"

# ── HEAD-COMMON block (unchanged from sync_head.py) ────────────────────
HEAD_START_MARKER = "<!-- HEAD-COMMON:START -->"
HEAD_END_MARKER = "<!-- HEAD-COMMON:END -->"

# Every real page that carries the shared head block. products.html is a
# raw content fragment, not a page, and is deliberately excluded. This
# list is NOT used for the Dreamweaver library items below -- those
# discover their own pages from the markers themselves.
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

# ── Dreamweaver library markers ─────────────────────────────────────────
# Parsed by content, not by line: these frequently sit on the same line
# as real content and as each other, e.g.
#   <!-- #EndLibraryItem --><!-- #BeginLibraryItem "/Library/nav.lbi" --><header ...>
# A line-based parser breaks on that. finditer() over the whole file text
# does not care where a newline falls.
MARKER_RE = re.compile(
    r'<!--\s*#BeginLibraryItem\s+"([^"]*)"\s*-->'
    r'|<!--\s*#EndLibraryItem\s*-->'
)

CONTENT_TYPE_LINE = '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">'


def read_text(path: Path) -> str:
    """Explicit UTF-8 read. Never let the platform default decide --
    that is exactly how mekpcalc.html's HelpButton block got mojibake
    into it in the first place (see the module docstring)."""
    return path.read_text(encoding=ENCODING)


def write_text(path: Path, content: str) -> None:
    """Explicit UTF-8 write. See read_text()."""
    path.write_text(content, encoding=ENCODING)


class Block(NamedTuple):
    """One #BeginLibraryItem/#EndLibraryItem pair found on one page."""
    page: str
    lbi_name: str  # e.g. "nav.lbi", from the marker's own "/Library/X.lbi"
    content: str  # exactly what sits between the two markers
    begin_start: int  # offset of "<!-- #Begin..." in the page text
    content_start: int  # offset right after the Begin marker's "-->"
    content_end: int  # offset right before the End marker's "<!--"
    end_stop: int  # offset right after the End marker's "-->"


def find_library_blocks(text: str, page_name: str) -> tuple[list[Block], list[str]]:
    """Scan `text` for Dreamweaver #BeginLibraryItem/#EndLibraryItem
    pairs, in document order, by content position.

    Returns (blocks, errors). On any structural problem -- a nested
    pair, an End with no matching Begin, or a Begin left open at
    end-of-file -- this ERRORS (appends a message to `errors`) rather
    than guessing at a recovery, matching sync_head.py's stance of
    erroring rather than silently skipping. When a page has a structural
    error, no blocks are returned for it at all: a block extracted from
    a broken pairing would be misleading, not merely incomplete.
    """
    stack: list[tuple[str, int, int]] = []  # (lbi_name, begin_start, content_start)
    blocks: list[Block] = []
    errors: list[str] = []

    for m in MARKER_RE.finditer(text):
        if m.group(1) is not None:
            # #BeginLibraryItem "..."
            lbi_path = m.group(1)
            lbi_name = lbi_path.rsplit("/", 1)[-1]
            if stack:
                outer_name, _, _ = stack[-1]
                errors.append(
                    f'{page_name}: nested library item -- '
                    f'#BeginLibraryItem "{lbi_path}" opens at offset {m.start()} '
                    f'while "{outer_name}" is still open'
                )
            stack.append((lbi_name, m.start(), m.end()))
        else:
            # #EndLibraryItem
            if not stack:
                errors.append(
                    f"{page_name}: #EndLibraryItem at offset {m.start()} "
                    f"has no matching #BeginLibraryItem"
                )
                continue
            lbi_name, begin_start, content_start = stack.pop()
            blocks.append(Block(
                page=page_name,
                lbi_name=lbi_name,
                content=text[content_start:m.start()],
                begin_start=begin_start,
                content_start=content_start,
                content_end=m.start(),
                end_stop=m.end(),
            ))

    for lbi_name, begin_start, _content_start in stack:
        errors.append(
            f'{page_name}: unclosed #BeginLibraryItem "{lbi_name}" '
            f"at offset {begin_start} -- no matching #EndLibraryItem found"
        )

    if errors:
        return [], errors
    return blocks, errors


def looks_like_mojibake(text: str) -> bool:
    """True if `text` decodes cleanly as UTF-8 bytes that were misread
    as Windows-1252 -- the exact failure mode described in the module
    docstring. Encoding `text` back to cp1252 recovers the original
    bytes (cp1252 has a defined mapping for every character mojibake of
    this kind produces); decoding those bytes as UTF-8 then either fails
    (ordinary text, not mojibake -- cp1252 bytes are not valid UTF-8
    continuation sequences) or succeeds and returns the real intended
    text, which is different from what was passed in.
    """
    try:
        roundtripped = text.encode("cp1252").decode(ENCODING)
    except (UnicodeEncodeError, UnicodeDecodeError):
        return False
    return roundtripped != text


def strip_leading_content_type(s: str) -> str:
    """Remove exactly the leading Content-Type meta line, if present,
    and nothing else. Used only for COMPARISON and for preserving a
    page's existing convention in write mode -- never applied
    unconditionally (see the module docstring: there is no single
    correct rule for whether this line belongs).

    Deliberately does NOT also strip any newline/blank line that
    follows: Chatbot.lbi's real content is
        <meta .../>\\n\\n<!-- BoatMD Chatbot ... -->\\n...
    and the pages' own (meta-free) copies are exactly
        \\n\\n<!-- BoatMD Chatbot ... -->\\n...
    -- i.e. that blank line belongs to the shared body, not to the meta
    line, on BOTH sides. An earlier version of this function also
    lstrip()'d newlines on both the meta-line-present and meta-line-
    absent paths, which stripped that blank line on one side but not
    the other and made every Chatbot.lbi block compare as false drift.
    """
    if s.startswith(CONTENT_TYPE_LINE):
        return s[len(CONTENT_TYPE_LINE):]
    return s


def has_leading_content_type(s: str) -> bool:
    return s.startswith(CONTENT_TYPE_LINE)


class Comparison(NamedTuple):
    status: str  # "in_sync" | "drift" | "suspected_mojibake"
    block_chars: int
    lbi_chars: int


def compare_block(block_content: str, lbi_content: str) -> Comparison:
    """Compare one page's block against its .lbi source, applying the
    two normalisations that are known-benign (trailing whitespace, the
    Content-Type meta line) before concluding there is real drift, and
    checking for suspected mojibake before falling through to ordinary
    drift so it is never silently lumped in with it."""
    block_chars = len(block_content)
    lbi_chars = len(lbi_content)

    if block_content == lbi_content:
        return Comparison("in_sync", block_chars, lbi_chars)

    if block_content.rstrip() == lbi_content.rstrip():
        return Comparison("in_sync", block_chars, lbi_chars)

    norm_block = strip_leading_content_type(block_content).rstrip()
    norm_lbi = strip_leading_content_type(lbi_content).rstrip()
    if norm_block == norm_lbi:
        return Comparison("in_sync", block_chars, lbi_chars)

    if looks_like_mojibake(block_content):
        return Comparison("suspected_mojibake", block_chars, lbi_chars)

    return Comparison("drift", block_chars, lbi_chars)


def build_replacement(existing_block_content: str, lbi_content: str) -> str:
    """What to write into a page's block in write mode, given its
    existing content and the current .lbi source: the .lbi's content,
    but with the Content-Type-meta-line convention adjusted to match
    whichever one this specific block already used (see the module
    docstring -- there is no single correct rule, so this preserves
    the page's own prior choice rather than imposing one)."""
    existing_has_meta = has_leading_content_type(existing_block_content)
    lbi_has_meta = has_leading_content_type(lbi_content)

    if lbi_has_meta and not existing_has_meta:
        return strip_leading_content_type(lbi_content)
    if existing_has_meta and not lbi_has_meta:
        return CONTENT_TYPE_LINE + "\n" + lbi_content
    return lbi_content


def sync_dreamweaver_items(check_only: bool) -> dict:
    """Discover every Dreamweaver library block across testing/*.html,
    compare each to its .lbi source, and -- unless check_only -- write
    back every block found to be ordinary drift. Blocks flagged as
    suspected mojibake are NEVER written in either mode; that is a human
    decision (see the module docstring).

    Returns a report dict; see main() for what it contains.
    """
    html_pages = sorted(p for p in ROOT.glob("*.html"))

    all_blocks: list[Block] = []
    page_errors: list[str] = []
    referenced_lbi_names: set[str] = set()

    for page_path in html_pages:
        text = read_text(page_path)
        blocks, errors = find_library_blocks(text, page_path.name)
        all_blocks.extend(blocks)
        page_errors.extend(errors)
        for b in blocks:
            referenced_lbi_names.add(b.lbi_name)

    # Missing-source errors: a marker names a .lbi that does not exist
    # on disk. Checked before comparison, since there is nothing to
    # compare against.
    missing_source_errors: list[str] = []
    lbi_cache: dict[str, Optional[str]] = {}
    for name in sorted(referenced_lbi_names):
        lbi_path = LIBRARY_DIR / name
        if lbi_path.exists():
            lbi_cache[name] = read_text(lbi_path)
        else:
            lbi_cache[name] = None
            missing_source_errors.append(
                f'"{name}" referenced by a marker but not found at {lbi_path}'
            )

    in_sync: list[Block] = []
    drifted: list[tuple[Block, Comparison]] = []
    mojibake: list[tuple[Block, Comparison]] = []
    skipped_missing_source: list[Block] = []
    written: list[Block] = []

    # Group by (page) so a page with a structural error can still be
    # told apart from a page that parsed fine, in the report.
    pages_with_errors = {e.split(":", 1)[0] for e in page_errors}

    for block in all_blocks:
        lbi_content = lbi_cache.get(block.lbi_name)
        if lbi_content is None:
            skipped_missing_source.append(block)
            continue

        cmp = compare_block(block.content, lbi_content)
        if cmp.status == "in_sync":
            in_sync.append(block)
        elif cmp.status == "suspected_mojibake":
            mojibake.append((block, cmp))
        else:
            drifted.append((block, cmp))

    # Write mode: apply every ordinary-drift block. Re-read/re-splice
    # per page so multiple blocks on the same page (trello-setup.html
    # has two separate nav.lbi blocks) are applied together correctly,
    # right-to-left by offset so earlier offsets stay valid.
    if not check_only and drifted:
        by_page: dict[str, list[tuple[Block, Comparison]]] = {}
        for block, cmp in drifted:
            by_page.setdefault(block.page, []).append((block, cmp))

        for page_name, page_drifts in by_page.items():
            page_path = ROOT / page_name
            text = read_text(page_path)
            # Right-to-left so we never invalidate an earlier offset by
            # changing the length of a later block first.
            for block, _cmp in sorted(page_drifts, key=lambda bc: bc[0].content_start, reverse=True):
                lbi_content = lbi_cache[block.lbi_name]
                replacement = build_replacement(block.content, lbi_content)
                text = text[:block.content_start] + replacement + text[block.content_end:]
                written.append(block)
            write_text(page_path, text)

    # Orphan .lbi files: present in Library/, referenced by no marker,
    # and not head-common.lbi (which is intentionally marker-free --
    # see the module docstring).
    all_lbi_files = sorted(p.name for p in LIBRARY_DIR.glob("*.lbi"))
    orphans = [
        name for name in all_lbi_files
        if name not in referenced_lbi_names and name != HEAD_COMMON_PATH.name
    ]

    return {
        "pages_scanned": len(html_pages),
        "total_blocks": len(all_blocks),
        "in_sync": in_sync,
        "drifted": drifted,
        "mojibake": mojibake,
        "written": written,
        "page_errors": page_errors,
        "missing_source_errors": missing_source_errors,
        "skipped_missing_source": skipped_missing_source,
        "orphans": orphans,
        "referenced_lbi_names": sorted(referenced_lbi_names),
    }


def sync_head_common_page(page_path: Path, head_common: str, check_only: bool) -> str:
    """Identical logic to sync_head.py's sync_page(). Returns one of:
    'updated', 'unchanged', 'missing-markers'."""
    original = read_text(page_path)

    start_idx = original.find(HEAD_START_MARKER)
    end_idx = original.find(HEAD_END_MARKER)

    if start_idx == -1 or end_idx == -1 or end_idx < start_idx:
        return "missing-markers"

    before = original[: start_idx + len(HEAD_START_MARKER)]
    after = original[end_idx:]  # starts at END_MARKER itself

    new_content = before + "\n" + head_common.rstrip("\n") + "\n" + after

    if new_content == original:
        return "unchanged"

    if not check_only:
        write_text(page_path, new_content)
    return "updated"


def sync_head_common(check_only: bool) -> dict:
    """Unchanged behaviour from sync_head.py, reimplemented here so this
    one script covers both jobs. Returns a report dict."""
    if not HEAD_COMMON_PATH.exists():
        return {"fatal": f"{HEAD_COMMON_PATH} not found."}

    head_common = read_text(HEAD_COMMON_PATH)

    updated, unchanged, missing = [], [], []

    for name in PAGES:
        page_path = ROOT / name
        if not page_path.exists():
            missing.append((name, "file not found"))
            continue

        result = sync_head_common_page(page_path, head_common, check_only)
        if result == "updated":
            updated.append(name)
        elif result == "unchanged":
            unchanged.append(name)
        else:
            missing.append((name, "HEAD-COMMON:START/END markers not found"))

    return {"updated": updated, "unchanged": unchanged, "missing": missing}


def print_library_report(report: dict, check_only: bool) -> bool:
    """Prints the Dreamweaver-library-item section of the report.
    Returns True if anything ERROR-level was found (missing source,
    structural)."""
    verb_written = "Would sync" if check_only else "Synced"

    print("=" * 72)
    print("DREAMWEAVER LIBRARY ITEMS")
    print("=" * 72)
    print(f"Pages scanned: {report['pages_scanned']}")
    print(f"Library items referenced: {', '.join(report['referenced_lbi_names'])}")
    print(f"Total blocks found: {report['total_blocks']}")
    print()

    # Per-library-item breakdown.
    by_item: dict[str, dict[str, list]] = {}
    for b in report["in_sync"]:
        by_item.setdefault(b.lbi_name, {"in_sync": [], "drift": [], "mojibake": []})
        by_item[b.lbi_name]["in_sync"].append(b)
    for b, cmp in report["drifted"]:
        by_item.setdefault(b.lbi_name, {"in_sync": [], "drift": [], "mojibake": []})
        by_item[b.lbi_name]["drift"].append((b, cmp))
    for b, cmp in report["mojibake"]:
        by_item.setdefault(b.lbi_name, {"in_sync": [], "drift": [], "mojibake": []})
        by_item[b.lbi_name]["mojibake"].append((b, cmp))

    for lbi_name in sorted(by_item):
        buckets = by_item[lbi_name]
        total = len(buckets["in_sync"]) + len(buckets["drift"]) + len(buckets["mojibake"])
        print(f"-- {lbi_name} ({total} block(s)) --")
        for b in buckets["in_sync"]:
            print(f"  in sync      {b.page}")
        for b, cmp in buckets["drift"]:
            print(
                f"  DRIFT        {b.page}  "
                f"(page block: {cmp.block_chars} chars, {lbi_name}: {cmp.lbi_chars} chars, "
                f"diff: {cmp.block_chars - cmp.lbi_chars:+d} chars)"
            )
        for b, cmp in buckets["mojibake"]:
            print(
                f"  MOJIBAKE     {b.page}  "
                f"(suspected UTF-8-read-as-Windows-1252 corruption; "
                f"page block: {cmp.block_chars} chars, {lbi_name}: {cmp.lbi_chars} chars) "
                f"-- not auto-fixed, needs a human decision"
            )
        print()

    if report["skipped_missing_source"]:
        print("-- blocks referencing a missing .lbi source (skipped) --")
        for b in report["skipped_missing_source"]:
            print(f"  {b.page}: \"{b.lbi_name}\"")
        print()

    if report["orphans"]:
        print("-- orphan .lbi files (in Library/, referenced by no marker) --")
        for name in report["orphans"]:
            print(f"  {name}  (not deleted -- that is a separate decision)")
        print()

    had_errors = False

    if report["missing_source_errors"]:
        had_errors = True
        print("ERROR: library item(s) referenced but not found:", file=sys.stderr)
        for msg in report["missing_source_errors"]:
            print(f"  - {msg}", file=sys.stderr)
        print(file=sys.stderr)

    if report["page_errors"]:
        had_errors = True
        print("ERROR: structural problems in library markers:", file=sys.stderr)
        for msg in report["page_errors"]:
            print(f"  - {msg}", file=sys.stderr)
        print(file=sys.stderr)

    drift_count = len(report["drifted"])
    mojibake_count = len(report["mojibake"])
    written_count = len(report["written"])

    if check_only and drift_count > 0:
        had_errors = True

    print(
        f"{verb_written}: {drift_count} drifted block(s)"
        + ("" if check_only else f" ({written_count} written)")
    )
    print(f"Suspected mojibake: {mojibake_count} block(s) -- never auto-synced")
    print(f"In sync: {len(report['in_sync'])} block(s)")
    print()

    return had_errors


def print_head_common_report(report: dict, check_only: bool) -> bool:
    """Prints the HEAD-COMMON section, in the same shape sync_head.py
    printed it. Returns True if it hit a fatal or missing-markers error."""
    print("=" * 72)
    print("HEAD-COMMON BLOCK")
    print("=" * 72)

    if "fatal" in report:
        print(f"ERROR: {report['fatal']}", file=sys.stderr)
        return True

    verb = "Would update" if check_only else "Updated"
    print(f"{verb}: {len(report['updated'])} page(s)")
    for name in report["updated"]:
        print(f"  - {name}")

    print(f"Already in sync: {len(report['unchanged'])} page(s)")

    had_errors = False
    if check_only and len(report["updated"]) > 0:
        had_errors = True

    if report["missing"]:
        had_errors = True
        print(f"\nERROR: {len(report['missing'])} page(s) could not be synced:", file=sys.stderr)
        for name, reason in report["missing"]:
            print(f"  - {name}: {reason}", file=sys.stderr)
    else:
        print("\nAll listed pages are in sync with Library/head-common.lbi.")

    print()
    return had_errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Report what would change without writing any file.",
    )
    args = parser.parse_args()

    library_report = sync_dreamweaver_items(args.check)
    head_common_report = sync_head_common(args.check)

    had_library_errors = print_library_report(library_report, args.check)
    had_head_errors = print_head_common_report(head_common_report, args.check)

    if had_library_errors or had_head_errors:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
