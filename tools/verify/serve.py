"""Static server for the site plus a sink for harness snapshots.

    python serve.py PORT [--root DIR]

  GET  /__harness.html          computed-style snapshot page (harness.html here)
  GET  /__func.html             calculator behavior page (func.html here)
  POST /__snap/<label>/<name>   saved to snaps/<label>/<name>.json
  anything else                 served from --root (default: the site folder),
                                with Cache-Control: no-store so CSS is never stale

Use a different PORT for each tree you serve (live tree, frozen baseline):
snapshots record absolute URLs and Chrome caches per origin. compare_snaps.py
strips the port, so captures from different ports still compare.
"""
import argparse
import http.server
import re
import sys

from common import HERE, SITE, SNAPS

PAGES = {"/__harness.html": "harness.html", "/__func.html": "func.html"}
ROOT = SITE


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(ROOT), **k)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *a):
        pass

    def do_GET(self):
        route = self.path.split("?")[0]
        if route in PAGES:
            body = (HERE / PAGES[route]).read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def do_POST(self):
        m = re.fullmatch(r"/__snap/([\w-]+)/([\w-]+)", self.path)
        if not m:
            self.send_response(404)
            self.end_headers()
            return
        label, name = m.groups()
        data = self.rfile.read(int(self.headers.get("Content-Length", "0")))
        folder = SNAPS / label
        folder.mkdir(parents=True, exist_ok=True)
        (folder / (name + ".json")).write_bytes(data)
        self.send_response(200)
        self.send_header("Content-Length", "2")
        self.end_headers()
        self.wfile.write(b"ok")


def main():
    global ROOT
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("port", type=int)
    ap.add_argument("--root", default=str(SITE), help="folder to serve (default: the site folder)")
    args = ap.parse_args()
    from pathlib import Path
    ROOT = Path(args.root).resolve()
    if not ROOT.is_dir():
        sys.exit("not a folder: %s" % ROOT)
    print("serving %s on http://127.0.0.1:%d  (harness: /__harness.html, func: /__func.html)" % (ROOT, args.port))
    http.server.ThreadingHTTPServer(("127.0.0.1", args.port), Handler).serve_forever()


if __name__ == "__main__":
    main()
