"""Static checks on the site stylesheet. No browser needed.

    python css_checks.py integrity [--base REV]    comments/braces balanced; selectors added/removed vs REV
    python css_checks.py dead      [--base REV]    classes the CSS names that no page or script uses, new since REV
    python css_checks.py orphans   --base REV      classes whose CSS you deleted but a page or script still uses
    python css_checks.py inventory                 duplicated declaration groups (candidates to share)

REV defaults to HEAD. Run `integrity` and `dead` after every CSS refactor; run
`orphans` against the commit before the whole refactor.

What each one catches:
  integrity  A literal "*/" inside a comment body closes it early and swallows the
             rules after it (this has happened twice); unbalanced braces.
  dead       A compound selector (".x:first-child", ".a, .b") that still names a class
             you removed from the markup keeps "working" in the file but matches
             nothing -- a silent regression a selector diff will not show.
  orphans    Markup you missed: a class whose CSS is gone but is still on an element.
             ID strings that happen to look like a class name are reported too
             (e.g. an id passed to getElementById); check the hit before acting.
"""
import collections
import re
import sys

from common import SITE, git, read_rev, read_site, site_rel


def strip_comments(css):
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)


def css_classes(css):
    sel = re.sub(r"\{[^{}]*\}", "{}", strip_comments(css))
    sel = re.sub(r"\{[^{}]*\}", "{}", sel)
    return set(re.findall(r"\.(-?[_a-zA-Z][\w-]*)", sel))


def selectors(css):
    out = set()
    for m in re.finditer(r"([^{}@;][^{}]*)\{", strip_comments(css)):
        for s in m.group(1).split(","):
            s = " ".join(s.split())
            if s:
                out.add(s)
    return out


def site_texts(rev):
    """(name, text) for every html/lbi/js file in the site at a revision ('WORKTREE' = working copy)."""
    names = []
    for pat in ("*.html", "Library/*.lbi", "*.js"):
        names += [p.relative_to(SITE).as_posix() for p in SITE.glob(pat)]
    out = []
    for n in sorted(names):
        try:
            out.append((n, read_rev(rev, n)))
        except Exception:
            pass
    return out


def used_classes(texts):
    used = set()
    for _, t in texts:
        for m in re.finditer(r"class(?:Name)?\s*=\s*[\"']([^\"']*)[\"']", t):
            used.update(m.group(1).split())
        for m in re.finditer(r"[\"'`]([\w -]{2,200})[\"'`]", t):       # JS strings / classList
            used.update(m.group(1).split())
        for m in re.finditer(r"querySelector(?:All)?\(\s*[\"']([^\"']*)[\"']", t):
            used.update(re.findall(r"\.(-?[_a-zA-Z][\w-]*)", m.group(1)))
    return used


def arg_base(default="HEAD"):
    return sys.argv[sys.argv.index("--base") + 1] if "--base" in sys.argv else default


def cmd_integrity():
    base = arg_base()
    now = read_site("style.css")
    pos, bad = 0, []
    while True:
        i = now.find("/*", pos)
        if i < 0:
            break
        j, k = now.find("*/", i + 2), now.find("/*", i + 2)
        if j < 0 or (0 <= k < j):
            bad.append(now.count("\n", 0, i) + 1)
            pos = i + 2
        else:
            pos = j + 2
    nc = strip_comments(now)
    print("comments: %d open, %d close, malformed at lines %s" % (now.count("/*"), now.count("*/"), bad[:5] or "none"))
    print("braces: %d open, %d close, balanced=%s" % (nc.count("{"), nc.count("}"), nc.count("{") == nc.count("}")))
    old = selectors(read_rev(base, "style.css"))
    new = selectors(now)
    print("selectors vs %s: %d -> %d  (removed %d, added %d)" % (base, len(old), len(new), len(old - new), len(new - old)))
    for tag, items in (("REMOVED", sorted(old - new)), ("ADDED", sorted(new - old))):
        print(tag + ":")
        for s in items:
            print("   ", s)
    ok = not bad and nc.count("{") == nc.count("}")
    print("RESULT:", "OK" if ok else "PROBLEM")
    sys.exit(0 if ok else 1)


def cmd_dead():
    base = arg_base()
    dead_base = css_classes(read_rev(base, "style.css")) - used_classes(site_texts(base))
    dead_now = css_classes(read_site("style.css")) - used_classes(site_texts("WORKTREE"))
    new = sorted(dead_now - dead_base)
    print("dead at %s: %d | dead now: %d | NEWLY dead: %d" % (base, len(dead_base), len(dead_now), len(new)))
    for c in new:
        print("   NEWLY DEAD:", c)
    sys.exit(1 if new else 0)


def cmd_orphans():
    if "--base" not in sys.argv:
        sys.exit("orphans needs --base REV (the commit before the refactor)")
    base = arg_base()
    lost = css_classes(read_rev(base, "style.css")) - css_classes(read_site("style.css"))
    refs = {}
    for name, t in site_texts("WORKTREE"):
        toks = set()
        for m in re.finditer(r"class(?:Name)?\s*=\s*[\"']([^\"']*)[\"']", t):
            toks.update(m.group(1).split())
        for m in re.finditer(r"[\"'`]([\w -]{2,200})[\"'`]", t):
            toks.update(m.group(1).split())
        for c in lost & toks:
            refs.setdefault(c, set()).add(name)
    print("classes that lost all CSS since %s: %d; still referenced by markup/JS: %d" % (base, len(lost), len(refs)))
    for c, files in sorted(refs.items()):
        print("   %-30s %s" % (c, ", ".join(sorted(files))))
    sys.exit(1 if refs else 0)


def parse_rules(css):
    """Top-level and @media rules as (line, in_media, selector, declaration-body)."""
    def blank(m):
        return "\n" * m.group(0).count("\n")
    text = re.sub(r"/\*.*?\*/", blank, css, flags=re.S)

    def block(pos, media):
        out = []
        while pos < len(text):
            pos = re.compile(r"\s*").match(text, pos).end()
            if pos >= len(text) or text[pos] == "}":
                return out, pos + 1
            j = pos
            while j < len(text) and text[j] not in "{;}":
                j += 1
            head = text[pos:j].strip()
            if j >= len(text):
                return out, j
            if text[j] == "{":
                if head.startswith(("@media", "@supports")):
                    inner, pos = block(j + 1, True)
                    out += inner
                elif head.startswith("@"):
                    depth, k = 1, j + 1
                    while depth and k < len(text):
                        depth += {"{": 1, "}": -1}.get(text[k], 0)
                        k += 1
                    pos = k
                else:
                    k = text.index("}", j)
                    out.append((text.count("\n", 0, pos) + 1, media, " ".join(head.split()), text[j + 1:k]))
                    pos = k + 1
            else:
                pos = j + 1
        return out, pos
    return block(0, False)[0]


def decls(body):
    items = []
    for d in body.split(";"):
        if ":" in d:
            k, v = d.split(":", 1)
            items.append((k.strip().lower(), " ".join(v.split()).lower().replace(", ", ",")))
    return tuple(items)


def cmd_inventory():
    rules = [r for r in parse_rules(read_site("style.css")) if not r[1]]
    card = {("background", "var(--chrome-paper-card)"), ("border", "1px solid var(--chrome-paper-line)"), ("border-radius", "12px")}
    print("=== card-like rules (paper fill, 1px line, 12px radius) ===")
    for ln, _, sel, body in rules:
        d = decls(body)
        if card <= set(d):
            print("L%-5d %-48s +%s" % (ln, sel[:48], "; ".join("%s:%s" % kv for kv in d if kv not in card)[:90]))
    print("\n=== pill buttons (border-radius:999px with padding) ===")
    for ln, _, sel, body in rules:
        d = dict(decls(body))
        if d.get("border-radius") == "999px" and "padding" in d:
            print("L%-5d %-44s bg=%s color=%s fs=%s" % (ln, sel[:44], d.get("background", d.get("background-color")), d.get("color"), d.get("font-size")))
    print("\n=== photo heroes (gradient + url background; none left means they are consolidated) ===")
    found = False
    for ln, _, sel, body in rules:
        if "linear-gradient" in body and "url(" in body:
            print("L%-5d %s" % (ln, sel))
            found = True
    if not found:
        print("(none)")
    print("\n=== identical declaration bodies (4+ declarations) under 2+ selectors ===")
    groups = collections.defaultdict(list)
    for ln, _, sel, body in rules:
        d = decls(body)
        if len(d) >= 4:
            groups[tuple(sorted(d))].append((ln, sel))
    for d, sels in sorted(groups.items(), key=lambda kv: -len(kv[1])):
        if len(sels) >= 2:
            print("x%d: %s" % (len(sels), "; ".join("%s:%s" % kv for kv in d)[:140]))
            for ln, sel in sels:
                print("      L%d %s" % (ln, sel[:80]))


COMMANDS = {"integrity": cmd_integrity, "dead": cmd_dead, "orphans": cmd_orphans, "inventory": cmd_inventory}

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        sys.exit(__doc__)
    COMMANDS[sys.argv[1]]()
