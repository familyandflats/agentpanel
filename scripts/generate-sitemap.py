#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlparse
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
SITEMAP = ROOT / "sitemap.xml"
HOST = "familyandflats.com"
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
ROUTE_ALIASES = {
    "/projects/emaar-digi-homes/": Path("projects/emaar-digihomes/index.html"),
}


def git(*args: str) -> str:
    p = subprocess.run(["git", *args], cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if p.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} failed: {p.stderr.strip()}")
    return p.stdout


def url_to_rel(url: str) -> Path:
    u = urlparse(url)
    if u.scheme != "https" or u.netloc != HOST or u.query or u.fragment:
        raise ValueError(f"non-canonical sitemap URL: {url}")
    if u.path in ROUTE_ALIASES:
        rel = ROUTE_ALIASES[u.path]
    elif u.path == "/":
        rel = Path("index.html")
    elif u.path.endswith("/"):
        rel = Path(u.path.lstrip("/")) / "index.html"
    else:
        rel = Path(u.path.lstrip("/"))
    if not (ROOT / rel).is_file():
        raise FileNotFoundError(f"sitemap URL has no local source file: {url} -> {rel.as_posix()}")
    return rel


def inventory():
    root = ET.parse(SITEMAP).getroot()
    rows = []
    seen = set()
    for node in root.findall("sm:url", NS):
        loc = (node.findtext("sm:loc", default="", namespaces=NS) or "").strip()
        if not loc or loc in seen:
            raise ValueError(f"empty or duplicate sitemap URL: {loc!r}")
        seen.add(loc)
        rows.append({
            "loc": loc,
            "rel": url_to_rel(loc),
            "changefreq": (node.findtext("sm:changefreq", default="", namespaces=NS) or "").strip(),
            "priority": (node.findtext("sm:priority", default="", namespaces=NS) or "").strip(),
        })
    if not rows:
        raise ValueError("sitemap inventory is empty")
    return rows


def dirty_paths() -> set[str]:
    out = git("status", "--porcelain")
    dirty = set()
    for line in out.splitlines():
        if len(line) >= 4:
            path = line[3:].strip().replace("\\", "/")
            if " -> " in path:
                path = path.split(" -> ", 1)[1]
            dirty.add(path)
    return dirty


def history_dates(paths: list[str]) -> dict[str, str]:
    # One Git history walk for all sitemap source files.
    args = ["log", "--date=short", "--format=@@%ad", "--name-only", "--", *paths]
    out = git(*args)
    dates: dict[str, str] = {}
    current = ""
    for raw in out.splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith("@@"):
            current = line[2:]
            continue
        path = line.replace("\\", "/")
        if current and path not in dates:
            dates[path] = current
    return dates


def render(rows) -> str:
    today = dt.date.today().isoformat()
    dirty = dirty_paths()
    paths = sorted({row["rel"].as_posix() for row in rows})
    dates = history_dates(paths)
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for row in rows:
        rel = row["rel"].as_posix()
        lastmod = today if rel in dirty else dates.get(rel)
        if not lastmod:
            lastmod = dt.date.fromtimestamp((ROOT / row["rel"]).stat().st_mtime).isoformat()
        lines += [
            "  <url>",
            f"    <loc>{escape(row['loc'])}</loc>",
            f"    <lastmod>{escape(lastmod)}</lastmod>",
        ]
        if row["changefreq"]:
            lines.append(f"    <changefreq>{escape(row['changefreq'])}</changefreq>")
        if row["priority"]:
            lines.append(f"    <priority>{escape(row['priority'])}</priority>")
        lines.append("  </url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()
    rows = inventory()
    generated = render(rows)
    current = SITEMAP.read_text(encoding="utf-8")
    if args.check:
        if current != generated:
            print("SITEMAP_CHECK=FAIL")
            return 1
        print(f"SITEMAP_CHECK=PASS URLS={len(rows)}")
        return 0
    SITEMAP.write_text(generated, encoding="utf-8", newline="\n")
    print(f"SITEMAP_GENERATED URLS={len(rows)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
