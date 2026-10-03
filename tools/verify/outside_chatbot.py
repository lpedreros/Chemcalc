"""Compare two snapshot labels, ignoring the library chatbot panel.

    python outside_chatbot.py A B

The BoatMD chatbot panel remembers whether it was left open, per browser
origin, so two servers (two ports) can capture it open vs closed. That is not a
page difference. This reports only the changes OUTSIDE the panel's element
subtree, and counts the ignored ones.
"""
import sys

from compare_snaps import diff_el, load


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    A, B = load(sys.argv[1]), load(sys.argv[2])
    total_out = total_in = 0
    for key in sorted(set(A) & set(B)):
        ea = {e["k"]: e for e in A[key]["elements"]}
        eb = {e["k"]: e for e in B[key]["elements"]}
        roots = [k for k, e in ea.items() if "chatbot-window" in e["cls"].split()]

        def in_chat(k):
            return any(k == r or k.startswith(r + ">") for r in roots)

        outside, inside = [], 0
        for k in ea:
            if k not in eb:
                outside.append((k, "missing in B", []))
                continue
            d = diff_el(ea[k], eb[k])
            if d:
                if in_chat(k):
                    inside += 1
                else:
                    outside.append((k, ea[k]["cls"], d))
        outside += [(k, "only in B", []) for k in eb if k not in ea]
        total_out += len(outside)
        total_in += inside
        print("%-20s changed outside chatbot: %-3d  (inside chatbot panel, ignored: %d)" % (key, len(outside), inside))
        for k, cls, d in outside[:6]:
            print("     ", k.split(">")[-1], "[%s]" % cls[:40], "; ".join("%s %s %s->%s" % (a, b, str(c)[:22], str(e)[:22]) for a, b, c, e in d[:3]))
    print("TOTAL outside chatbot:", total_out, "| ignored inside chatbot:", total_in)


if __name__ == "__main__":
    main()
