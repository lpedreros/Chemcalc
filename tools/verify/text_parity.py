"""Prove that a rebuild kept a page's text and links verbatim.

    python text_parity.py --pages privacy,terms,cookie
                          [--base REV] [--head REV]
                          [--map-headings h3:h2,h4:h3]
                          [--skip-class legal-doc-sidebar]

Compares every heading (h1-h6), paragraph, list item, and link in the page body
between two revisions (default: --base HEAD against --head WORKTREE, the
working copy). Library blocks (nav, footer, scripts, head content managed by
sync_library.py) are removed first and checked separately by `sync_library.py
--check`. Whitespace is collapsed and nothing else is normalized, so a changed
character (a non-breaking hyphen, a curly apostrophe, a typo) is caught.

  --pages          page names without .html, comma separated
  --map-headings   heading levels you changed on purpose, as old:new pairs
  --skip-class     ignore subtrees carrying these classes (navigation you added,
                   such as a sidebar)

Exit status is 1 if any page differs.
"""
import re
import sys
from html.parser import HTMLParser

from common import read_rev

BLOCK = {"h1", "h2", "h3", "h4", "h5", "h6", "p", "li"}
LIBRARY = re.compile(r"<!-- #BeginLibraryItem.*?<!-- #EndLibraryItem -->", re.S)


def norm(s):
    return re.sub(r"\s+", " ", s).strip()


class Extract(HTMLParser):
    def __init__(self, skip_classes):
        super().__init__(convert_charrefs=True)
        self.skip_classes = set(skip_classes)
        self.in_body = False
        self.ignore = None          # inside <script>/<style>
        self.skip_tag = None        # inside a --skip-class subtree
        self.skip_depth = 0
        self.stack = []             # open blocks: [tag, [text pieces]]
        self.blocks, self.links, self.link = [], [], None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "body":
            self.in_body = True
            return
        if not self.in_body:
            return
        if self.skip_tag:
            if tag == self.skip_tag:
                self.skip_depth += 1
            return
        if self.skip_classes & set((a.get("class") or "").split()):
            self.skip_tag, self.skip_depth = tag, 1
            return
        if tag in ("script", "style"):
            self.ignore = tag
        elif tag in BLOCK:
            self.stack.append([tag, []])
        elif tag == "a":
            self.link = [a.get("href"), []]

    def handle_endtag(self, tag):
        if not self.in_body:
            return
        if self.skip_tag:
            if tag == self.skip_tag:
                self.skip_depth -= 1
                if self.skip_depth == 0:
                    self.skip_tag = None
            return
        if self.ignore == tag:
            self.ignore = None
        elif tag in BLOCK and self.stack and self.stack[-1][0] == tag:
            t, parts = self.stack.pop()
            self.blocks.append((t, norm("".join(parts))))
        elif tag == "a" and self.link is not None:
            self.links.append((self.link[0], norm("".join(self.link[1]))))
            self.link = None

    def handle_data(self, data):
        if not self.in_body or self.skip_tag or self.ignore:
            return
        if self.stack:
            self.stack[-1][1].append(data)
        if self.link is not None:
            self.link[1].append(data)


def extract(rev, page, skip_classes):
    html = LIBRARY.sub("", read_rev(rev, page + ".html"))
    p = Extract(skip_classes)
    p.feed(html)
    return p.blocks, p.links


def main():
    argv = sys.argv[1:]

    def opt(name, default=None):
        return argv[argv.index(name) + 1] if name in argv else default

    pages = opt("--pages")
    if not pages:
        sys.exit(__doc__)
    base, head = opt("--base", "HEAD"), opt("--head", "WORKTREE")
    hmap = dict(x.split(":") for x in opt("--map-headings", "").split(",") if x)
    skip = [x for x in opt("--skip-class", "").split(",") if x]
    ok_all = True
    for page in pages.split(","):
        ob, ol = extract(base, page, skip)
        nb, nl = extract(head, page, skip)
        ob = [(hmap.get(t, t), x) for t, x in ob]
        same_blocks, same_links = ob == nb, ol == nl
        print("%-16s blocks %d -> %d identical=%s | links %d -> %d identical=%s" % (page, len(ob), len(nb), same_blocks, len(ol), len(nl), same_links))
        if not same_blocks:
            for i, (a, b) in enumerate(zip(ob, nb)):
                if a != b:
                    print("   first block difference at #%d:\n     base: %r\n     head: %r" % (i, a, b))
                    break
            else:
                print("   one side has extra blocks")
        if not same_links:
            print("   links differ:\n     base: %r\n     head: %r" % (ol[:6], nl[:6]))
        ok_all &= same_blocks and same_links
    print("ALL IDENTICAL" if ok_all else "DIFFERENCES FOUND")
    sys.exit(0 if ok_all else 1)


if __name__ == "__main__":
    main()
