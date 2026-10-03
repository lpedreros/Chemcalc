"""Aggregate every non-layout difference between two snapshot labels, by page.

    python aggregate.py A B

Use this for a before/after of a whole round of work: it lists each distinct
(page, kind, property) change once, with a count, the widths it appears at, and
an example, so you can check the list against what you meant to change.
Rectangles and sizes are left out (they are knock-on effects of other changes).
"""
import collections
import sys

from compare_snaps import diff_el, load

LAYOUT = {"height", "width", "gridTemplateRows", "gridTemplateColumns"}


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    A, B = load(sys.argv[1]), load(sys.argv[2])
    agg = collections.defaultdict(lambda: {"n": 0, "ex": None, "widths": set()})
    for key in sorted(set(A) & set(B)):
        page, width = key.rsplit("-", 1)
        ea = {e["k"]: e for e in A[key]["elements"]}
        eb = {e["k"]: e for e in B[key]["elements"]}
        for k in ea:
            if k not in eb:
                continue
            for kind, p, va, vb in diff_el(ea[k], eb[k]):
                if kind == "rect" or p in LAYOUT:
                    continue
                d = agg[(page, kind, p)]
                d["n"] += 1
                d["widths"].add(width)
                if d["ex"] is None:
                    d["ex"] = ((ea[k]["cls"].split() or ["(bare)"])[0], str(va)[:34], str(vb)[:34])
    current = None
    for (page, kind, p), d in sorted(agg.items()):
        if page != current:
            print("== %s" % page)
            current = page
        print("   %-13s %-24s n=%-4d w=%s  e.g. %s: %s -> %s" % (kind, p, d["n"], "/".join(sorted(d["widths"])), *d["ex"]))
    if not agg:
        print("no non-layout differences")


if __name__ == "__main__":
    main()
