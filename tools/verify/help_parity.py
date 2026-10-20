#!/usr/bin/env python3
"""
help_parity.py -- prove each calculator page's visible "How it works" card (#how-it-works) says exactly what the
page's Help (?) dialog says (#helpContentGuest): same title, intro, steps and key facts, word for word;
and that the byline (author and "Last reviewed" date) matches the page's JSON-LD.

The card exists so the explanation is readable on the page, and by crawlers that do not run JavaScript, instead of only
inside a hidden dialog. Two copies of text drift, so this fails loudly when they differ.

    python tools/verify/help_parity.py                 check the five calculator pages
    python tools/verify/help_parity.py --pages mekpcalc,awlgrip

Exit status 0 = identical, 1 = a difference (printed). Entities are decoded and whitespace collapsed before comparing;
nothing else is normalized.
"""
import argparse
import html
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
PAGES = ['mekpcalc', 'awlgrip', 'epifanespoly', 'clothcalc', 'alexseal']


def text(fragment):
    return ' '.join(html.unescape(re.sub(r'<[^>]+>', '', fragment)).split())


def items(fragment):
    return [text(m) for m in re.findall(r'<li>(.*?)</li>', fragment, re.S)]


def help_copy(s):
    a = s.index('id="helpContentGuest">')
    guest = s[a:s.index('<!-- FREE USER CONTENT -->', a)]
    ol = re.search(r'<ol class="help-modal-steps">(.*?)</ol>', guest, re.S)
    ul = re.search(r'<ul class="help-modal-bullets">(.*?)</ul>', guest, re.S)
    return {
        'title': text(re.search(r'<h3 class="modal-title">(.*?)</h3>', guest, re.S).group(1)),
        'intro': text(re.search(r'<p class="help-modal-pitch">(.*?)</p>', guest, re.S).group(1)),
        'steps': items(ol.group(1)) if ol else [],
        'facts': items(ul.group(1)) if ul else [],
    }


def card_copy(s):
    a = s.index('id="how-it-works"')
    card = s[a:s.index('</section>', a)]
    ol = re.search(r'<ol>(.*?)</ol>', card, re.S)
    ul = re.search(r'<h3>Key facts</h3>\s*<ul>(.*?)</ul>', card, re.S)
    return {
        'title': text(re.search(r'<h2 id="howItWorksTitle">(.*?)</h2>', card, re.S).group(1)),
        'intro': text(re.search(r'</h2>\s*<p>(.*?)</p>', card, re.S).group(1)),
        'steps': items(ol.group(1)) if ol else [],
        'facts': items(ul.group(1)) if ul else [],
    }


def byline_problem(s):
    """The visible "Last reviewed" date and author must match the page's own JSON-LD (dateModified, author)."""
    import json
    card = s[s.index('id="how-it-works"'):]
    card = card[:card.index('</section>')]
    m = re.search(r'<p class="calc-byline">Written by <a href="about.html">(.*?)</a>.*?<time datetime="(\d{4}-\d{2}-\d{2})">', card, re.S)
    if not m:
        return 'missing (no .calc-byline in the How to Use card)'
    block = re.search(r'<script type="application/ld\+json">(.*?)</script>', s, re.S).group(1)
    data = json.loads(block)
    if data.get('dateModified') != m.group(2):
        return f'date differs: visible {m.group(2)} vs JSON-LD dateModified {data.get("dateModified")}'
    if data.get('author', {}).get('name') != text(m.group(1)):
        return f'author differs: visible {text(m.group(1))} vs JSON-LD {data.get("author", {}).get("name")}'
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pages', default=','.join(PAGES))
    bad = 0
    for page in ap.parse_args().pages.split(','):
        s = open(os.path.join(ROOT, 'testing', page + '.html'), encoding='utf-8').read()
        if 'id="how-it-works"' not in s:
            print(f'{page}: MISSING the #how-it-works card')
            bad += 1
            continue
        h, c = help_copy(s), card_copy(s)
        diffs = [k for k in h if h[k] != c[k]]
        by = byline_problem(s)
        if by:
            bad += 1
            print(f'{page}: BYLINE {by}')
            continue
        if diffs:
            bad += 1
            print(f'{page}: DIFFERS in {", ".join(diffs)}')
            for k in diffs:
                print('   help:', h[k])
                print('   card:', c[k])
        else:
            print(f'{page}: identical (title, intro, {len(h["steps"])} steps, {len(h["facts"])} key facts)')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
