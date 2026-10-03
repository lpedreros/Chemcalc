"""Group the differences between two snapshot labels by (kind, property).

    python group_diffs.py A B page-width[,page-width...] [--skip-rect]

Shows each distinct change once with a count and one example, which is how you
tell a handful of intended changes from noise. --skip-rect hides pure layout
knock-on (rectangles) so the property changes stand out.
"""
import collections
import sys

from compare_snaps import diff_el, load


def main():
    args = [x for x in sys.argv[1:] if not x.startswith("--")]
    if len(args) < 3:
        sys.exit(__doc__)
    A, B = load(args[0]), load(args[1])
    skip_rect = "--skip-rect" in sys.argv
    for key in args[2].split(","):
        ea = {e["k"]: e for e in A[key]["elements"]}
        eb = {e["k"]: e for e in B[key]["elements"]}
        kinds, first, elems = collections.Counter(), {}, set()
        for k in ea:
            if k not in eb:
                continue
            for kind, p, va, vb in diff_el(ea[k], eb[k]):
                if skip_rect and kind == "rect":
                    continue
                kinds[(kind, p)] += 1
                elems.add(k)
                first.setdefault((kind, p), (ea[k]["cls"][:38], str(va)[:40], str(vb)[:40]))
        print("== %s : %d elements, %d distinct (kind,prop)" % (key, len(elems), len(kinds)))
        for (kind, p), n in kinds.most_common(16):
            c, va, vb = first[(kind, p)]
            print("   %-12s %-18s x%-4d [%s] %s -> %s" % (kind, p, n, c, va, vb))


if __name__ == "__main__":
    main()
