"""Compare what the calculators display, between two captures of func.html.

    python func_compare.py A B

func.html drives each calculator with the same scripted inputs (two scenarios
per page) and records the visible text, the ids of visible elements, and the
slider positions. Run it once against a baseline tree and once against the
changed tree (different labels), then compare. Identical output means the
refactor did not change what a user sees after entering the same numbers.
"""
import json
import sys

from common import SNAPS


def load(label):
    path = SNAPS / label / "func.json"
    if not path.is_file():
        sys.exit("no func capture for label %r (looked for %s)" % (label, path))
    return json.loads(path.read_text(encoding="utf-8"))


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    a, b = load(sys.argv[1]), load(sys.argv[2])
    ok_all = True
    for key in sorted(set(a) | set(b)):
        x, y = a.get(key), b.get(key)
        if x is None or y is None:
            print("%-18s MISSING in %s" % (key, "A" if x is None else "B"))
            ok_all = False
            continue
        if "error" in x or "error" in y:
            print("%-18s ERROR %s" % (key, x.get("error") or y.get("error")))
            ok_all = False
            continue
        same = (x["text"] == y["text"], x["visibleIds"] == y["visibleIds"], x["sliders"] == y["sliders"], x["inputs"] == y["inputs"])
        ok = all(same)
        ok_all &= ok
        print("%-18s inputs=%d visibleIds=%d textChars=%d  text=%s ids=%s sliders=%s -> %s" % (
            key, x["inputs"], len(x["visibleIds"]), len(x["text"]), same[0], same[1], same[2], "IDENTICAL" if ok else "DIFFERENT"))
        if not same[0]:
            for i, (c, d) in enumerate(zip(x["text"], y["text"])):
                if c != d:
                    print("    first text difference at char %d:" % i)
                    print("      A: %s" % ascii(x["text"][max(0, i - 30):i + 30]))
                    print("      B: %s" % ascii(y["text"][max(0, i - 30):i + 30]))
                    break
    print("ALL IDENTICAL" if ok_all else "DIFFERENCES FOUND")
    sys.exit(0 if ok_all else 1)


if __name__ == "__main__":
    main()
