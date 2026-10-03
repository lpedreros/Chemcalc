"""CRLF-aware helpers for scripted site edits.

The site files use CRLF line endings, so a plain str.replace with LF text
silently matches nothing. These helpers convert both sides to CRLF and stop
unless a pattern matches exactly once, so a typo can never skip an edit or
apply it twice. Used for the shared-component refactor: write a small script
that calls these, run it, then check the result with the other tools here.

    from patchlib import (read, write, replace_once, insert_before,
                          replace_region, retag_classes, add_class_by_id)

    css = read("style.css")
    css = replace_once(css, ".old{color:red;}", ".new{color:red;}", "rename")
    write("style.css", css)
    html, counts = retag_classes(read("index.html"), {"home-btn": ["mp-btn"]})
"""
import os
import re

from common import SITE

ROOT = str(SITE)


def read(name):
    """Read a site file exactly as stored (no newline translation)."""
    with open(os.path.join(ROOT, name), encoding="utf-8", newline="") as f:
        return f.read()


def write(name, text):
    with open(os.path.join(ROOT, name), "w", encoding="utf-8", newline="") as f:
        f.write(text)


def crlf(s):
    return s.replace("\r\n", "\n").replace("\n", "\r\n")


def replace_once(text, old, new, label=""):
    """Replace `old` with `new`; stop unless `old` occurs exactly once."""
    old, new = crlf(old), crlf(new)
    n = text.count(old)
    if n != 1:
        raise SystemExit("PATCH FAILED (%s): expected exactly 1 match, found %d for:\n%s" % (label, n, old[:200]))
    return text.replace(old, new)


def insert_before(text, marker, block, label=""):
    """Insert `block` immediately before `marker`; stop unless `marker` occurs exactly once."""
    marker, block = crlf(marker), crlf(block)
    n = text.count(marker)
    if n != 1:
        raise SystemExit("INSERT FAILED (%s): marker found %d times: %s" % (label, n, marker[:120]))
    return text.replace(marker, block + marker)


def replace_region(text, start_marker, end_marker, new, label=""):
    """Replace from start_marker through the end of the next end_marker after it.

    start_marker must occur exactly once; end_marker is searched from there.
    """
    start_marker, end_marker, new = crlf(start_marker), crlf(end_marker), crlf(new)
    if text.count(start_marker) != 1:
        raise SystemExit("REGION FAILED (%s): start marker found %d times" % (label, text.count(start_marker)))
    i = text.index(start_marker)
    j = text.find(end_marker, i)
    if j < 0:
        raise SystemExit("REGION FAILED (%s): end marker not found after start" % label)
    return text[:i] + new + text[j + len(end_marker):]


def retag_classes(html, mapping):
    """Swap class tokens in every class="..." attribute.

    mapping: old_token -> list of new tokens (replaces the token in place,
    duplicates removed; an empty list removes the token, and the whole attribute
    if nothing is left). Matches whole tokens only. Returns (html, counts).
    """
    counts = {k: 0 for k in mapping}

    def fix(m):
        head, ws, cls = m.group(1), m.group(2), m.group(3)
        out = []
        for t in cls.split():
            if t in mapping:
                counts[t] += 1
                for nt in mapping[t]:
                    if nt not in out:
                        out.append(nt)
            elif t not in out:
                out.append(t)
        if not out:
            return head
        return head + ws + 'class="' + " ".join(out) + '"'

    return re.sub(r'(<\w+[^>]*?)(\s)class="([^"]*)"', fix, html), counts


def add_class_by_id(html, element_id, cls):
    """Add a class token to the one element with this id (stops unless exactly one matches)."""
    pat = re.compile(r'<(\w+)([^>]*?\sid="%s"[^>]*)>' % re.escape(element_id))
    ms = list(pat.finditer(html))
    if len(ms) != 1:
        raise SystemExit("add_class_by_id: id %r matched %d elements" % (element_id, len(ms)))
    m = ms[0]
    attrs = m.group(2)
    cm = re.search(r'\sclass="([^"]*)"', attrs)
    if cm:
        toks = cm.group(1).split()
        if cls in toks:
            return html
        attrs = attrs[:cm.start()] + ' class="%s"' % " ".join(toks + [cls]) + attrs[cm.end():]
    else:
        attrs += ' class="%s"' % cls
    return html[:m.start()] + "<%s%s>" % (m.group(1), attrs) + html[m.end():]
