"""Shared paths and helpers for the verification tools.

Everything is resolved relative to this file, so the tools work from any
checkout. Set CHEMCALC_SITE to point at a different site folder (default:
<repo>/testing).
"""
import os
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent      # tools/verify
REPO = HERE.parents[1]                      # repository root
SITE = Path(os.environ.get("CHEMCALC_SITE", REPO / "testing"))
SNAPS = HERE / "snaps"                      # snapshot output (git-ignored)


def git(*args, text=False):
    """Run git in the repo and return stdout (bytes, or str when text=True)."""
    out = subprocess.run(["git", *args], cwd=REPO, capture_output=True, check=True).stdout
    return out.decode("utf-8", "replace") if text else out


def site_rel(name=""):
    """Path of a site file relative to the repo root (for `git show REV:path`)."""
    try:
        base = SITE.resolve().relative_to(REPO)
    except ValueError:
        base = Path("testing")
    return (base / name).as_posix() if name else base.as_posix()


def read_site(name):
    return (SITE / name).read_text(encoding="utf-8", errors="replace")


def read_rev(rev, name):
    """Contents of a site file at a git revision ('WORKTREE' reads the working copy)."""
    if rev == "WORKTREE":
        return read_site(name)
    return git("show", "%s:%s" % (rev, site_rel(name)), text=True)
