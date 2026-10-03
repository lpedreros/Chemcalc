"""Compare two harness snapshot labels element by element.

    python compare_snaps.py A B [--common] [--detail PAGE-WIDTH] [--max N]

Snapshots are written by harness.html (see README). Elements align by DOM path;
class names are informational only, so a class rename is not a difference but
any change in computed style, layout rectangle, ::before/::after, slider thumb,
or forced hover/active/focus/visited state is.

  --common   only compare page/width captures present in both labels
  --detail   print the changed elements of one capture, e.g. about-1440
  --max N    how many changed elements --detail prints (default 25)
"""
import json
import re
import sys

from common import SNAPS


def load(label):
    folder = SNAPS / label
    if not folder.is_dir():
        sys.exit("no snapshots for label %r (looked in %s)" % (label, folder))
    return {p.stem: json.loads(p.read_text(encoding="utf-8")) for p in sorted(folder.glob("*.json"))}


def _norm(o):
    """Strip the server origin from URLs so captures from different ports compare equal."""
    if isinstance(o, str):
        return re.sub(r"https?://127\.0\.0\.1:\d+", "", o)
    if isinstance(o, dict):
        return {k: _norm(v) for k, v in o.items()}
    if isinstance(o, list):
        return [_norm(v) for v in o]
    return o


def diff_el(a, b):
    """List of (kind, property, old, new) differences between two element records."""
    a, b = _norm(a), _norm(b)
    out = []
    for p in sorted(set(a["rest"]) | set(b["rest"])):
        if a["rest"].get(p) != b["rest"].get(p):
            out.append(("rest", p, a["rest"].get(p), b["rest"].get(p)))
    if a["rect"] != b["rect"]:
        out.append(("rect", "x,y,w,h", a["rect"], b["rect"]))
    for nm in ("pb", "pa", "pt"):          # ::before, ::after, slider thumb
        if (a.get(nm) or None) != (b.get(nm) or None):
            if a.get(nm) and b.get(nm):
                for p in sorted(set(a[nm]) | set(b[nm])):
                    if a[nm].get(p) != b[nm].get(p):
                        out.append((nm, p, a[nm].get(p), b[nm].get(p)))
            else:
                out.append((nm, "presence", bool(a.get(nm)), bool(b.get(nm))))
    for sn in sorted(set(a["st"]) | set(b["st"])):
        sa, sb = a["st"].get(sn, {}), b["st"].get(sn, {})
        for p in sorted(set(sa) | set(sb)):
            # a state record stores only what differs from rest; compare the resulting values
            va = sa.get(p, a["rest"].get(p))
            vb = sb.get(p, b["rest"].get(p))
            if va != vb:
                out.append(("state:" + sn, p, va, vb))
    return out


def main():
    args = [x for x in sys.argv[1:] if not x.startswith("--")]
    if len(args) < 2:
        sys.exit(__doc__)
    A, B = load(args[0]), load(args[1])
    detail = sys.argv[sys.argv.index("--detail") + 1] if "--detail" in sys.argv else None
    mx = int(sys.argv[sys.argv.index("--max") + 1]) if "--max" in sys.argv else 25
    total = 0
    for key in sorted(set(A) | set(B)):
        if key not in A or key not in B:
            if "--common" in sys.argv:
                continue
            print("%-22s MISSING in %s" % (key, "A" if key not in A else "B"))
            total += 1
            continue
        ea = {e["k"]: e for e in A[key]["elements"]}
        eb = {e["k"]: e for e in B[key]["elements"]}
        only_a, only_b = set(ea) - set(eb), set(eb) - set(ea)
        changed = [(k, ea[k]["cls"], eb[k]["cls"], d) for k in ea if k in eb for d in [diff_el(ea[k], eb[k])] if d]
        total += len(changed) + len(only_a) + len(only_b)
        print("%-22s els A=%d B=%d  changed=%d  onlyA=%d onlyB=%d" % (key, len(ea), len(eb), len(changed), len(only_a), len(only_b)))
        if detail == key:
            for k, ca, cb, d in changed[:mx]:
                print("   %s  [%s] -> [%s]" % (k, ca[:50], cb[:50]))
                for kind, p, va, vb in d[:8]:
                    print("        %-10s %-22s %s -> %s" % (kind, p, str(va)[:60], str(vb)[:60]))
            for k in sorted(only_a)[:10]:
                print("   onlyA", k, ea[k]["cls"][:50])
            for k in sorted(only_b)[:10]:
                print("   onlyB", k, eb[k]["cls"][:50])
    print("TOTAL differing/missing elements:", total)


if __name__ == "__main__":
    main()
