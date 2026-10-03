"""Export the site folder as it was at a git revision, to use as a frozen baseline.

    python freeze.py REV DEST

Writes <DEST>/<site folder name>/ (for example DEST/testing) and prints the
folder to pass to `serve.py --root`. Serving a frozen copy lets you keep
editing the live tree while a baseline is still being captured, and makes the
baseline reproducible.
"""
import io
import shutil
import sys
import tarfile
from pathlib import Path

from common import git, site_rel


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    rev, dest = sys.argv[1], Path(sys.argv[2]).resolve()
    rel = site_rel()
    target = dest / Path(rel).name
    if target.exists():
        shutil.rmtree(target)
    dest.mkdir(parents=True, exist_ok=True)
    data = git("archive", rev, rel)
    with tarfile.open(fileobj=io.BytesIO(data)) as tar:
        try:
            tar.extractall(dest, filter="data")     # Python 3.12+ (and security backports)
        except TypeError:
            tar.extractall(dest)
    extracted = dest / rel
    print("frozen %s at %s ->" % (rel, rev))
    print(extracted)


if __name__ == "__main__":
    main()
