#!/usr/bin/env python3
"""Validate the Family&Flats universal public header and footer contract."""

from __future__ import annotations

import argparse
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path


def find_root() -> Path:
    script = Path(__file__).resolve()
    for candidate in (*script.parents, Path.cwd().resolve()):
        if (candidate / "header.html").is_file() and (candidate / "footer.html").is_file():
            return candidate
    return Path.cwd().resolve()


ROOT = find_root()

EXCLUDED_PARTS = {
    ".git",
    "node_modules",
    "_archive",
    "_source_material",
    "_familyflats_redesign_stage",
    "_run3_canonical_stage",
    "_run5_fidelity_stage",
    "_mahindra_autopilot_stage",
}

MARKUP_SUFFIXES = {".html", ".htm", ".php"}
TEXT_SUFFIXES = MARKUP_SUFFIXES | {".js", ".css"}
HEADER_CLASSES = {"ff-site-header", "ff-header", "ff-inv-header", "ff-universal-header"}
FOOTER_CLASSES = {"site-footer", "ff-site-footer"}
FORBIDDEN_STAGE_TOKENS = {
    "footer-stage",
    "header-stage",
    "footer-loader-stage",
    "header-loader-stage",
}

TAG_RE = re.compile(r"<(header|footer)\b[^>]*>", re.IGNORECASE)
CLASS_RE = re.compile(r"\bclass\s*=\s*([\"'])(.*?)\1", re.IGNORECASE | re.DOTALL)

REQUIRED_FILES = {
    "header.html": ("ff-site-header", "Buy", "New Projects", "Areas", "Post Property"),
    "footer.html": ("site-footer", "Explore", "Company", "Contact Us"),
    "assets/css/header.css": (".ff-site-header", ".ff-site-header-inner"),
    "assets/css/footer.css": (".site-footer", ".footer-container"),
    "assets/js/main.js": ("/header.html", "/footer.html", "/assets/css/header.css", "/assets/css/footer.css"),
    "assets/js/footer-loader.js": ("/footer.html", "/assets/css/footer.css"),
}

LIVE_PATHS = (
    "/",
    "/projects/mahindra-luminare/",
    "/projects/ireovictoryvalley/",
    "/projects/",
    "/search/",
    "/sale.html",
    "/lease.html",
    "/blogs.html",
    "/news.html",
    "/services.html",
    "/reviews.html",
    "/developers/ireo/",
)


def is_excluded(path: Path) -> bool:
    rel = path.relative_to(ROOT)
    return any(part in EXCLUDED_PARTS for part in rel.parts)


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def class_tokens(tag: str) -> set[str]:
    match = CLASS_RE.search(tag)
    if not match:
        return set()
    return set(match.group(2).split())


def has_placeholder(text: str, name: str) -> bool:
    return bool(re.search(rf"\bid\s*=\s*['\"]{re.escape(name)}['\"]", text, re.IGNORECASE))


def validate_repository() -> tuple[list[str], dict[str, int]]:
    errors: list[str] = []
    stats = {"markup_files": 0, "header_sources": 0, "footer_sources": 0}

    for rel, required_tokens in REQUIRED_FILES.items():
        path = ROOT / rel
        if not path.is_file():
            errors.append(f"Missing required canonical file: {rel}")
            continue
        text = read_text(path)
        for token in required_tokens:
            if token not in text:
                errors.append(f"Canonical file {rel} is missing required token: {token}")

    header_path = ROOT / "header.html"
    footer_path = ROOT / "footer.html"
    if header_path.is_file():
        header_text = read_text(header_path)
        if len(re.findall(r"<header\b", header_text, re.IGNORECASE)) != 1:
            errors.append("header.html must contain exactly one <header> element")
    if footer_path.is_file():
        footer_text = read_text(footer_path)
        if len(re.findall(r"<footer\b", footer_text, re.IGNORECASE)) != 1:
            errors.append("footer.html must contain exactly one <footer> element")

    for path in ROOT.rglob("*"):
        if not path.is_file() or is_excluded(path):
            continue
        rel = path.relative_to(ROOT).as_posix()
        suffix = path.suffix.lower()

        if path.name.lower().startswith("_qa_") and suffix in MARKUP_SUFFIXES:
            errors.append(f"QA route must not be committed as a public page: {rel}")

        lowered_name = path.name.lower()
        if any(token in lowered_name for token in FORBIDDEN_STAGE_TOKENS):
            errors.append(f"Forbidden staged site-shell file: {rel}")

        if suffix not in TEXT_SUFFIXES:
            continue
        text = read_text(path)
        lowered = text.lower()

        for token in FORBIDDEN_STAGE_TOKENS:
            if token in lowered:
                errors.append(f"Forbidden staged site-shell reference '{token}' in {rel}")

        if suffix not in MARKUP_SUFFIXES:
            continue
        stats["markup_files"] += 1

        for match in TAG_RE.finditer(text):
            tag_name = match.group(1).lower()
            tokens = class_tokens(match.group(0))
            if tag_name == "header" and tokens & HEADER_CLASSES:
                stats["header_sources"] += 1
                if rel != "header.html":
                    errors.append(f"Inline or legacy public header found outside header.html: {rel}")
            if tag_name == "footer" and tokens & FOOTER_CLASSES:
                stats["footer_sources"] += 1
                if rel != "footer.html":
                    errors.append(f"Inline or legacy public footer found outside footer.html: {rel}")

        if rel != "header.html" and has_placeholder(text, "header-placeholder"):
            if "/assets/js/main.js" not in text and "data-include" not in text:
                errors.append(f"Header placeholder has no canonical loader in {rel}")

        if rel != "footer.html" and has_placeholder(text, "footer-placeholder"):
            if not any(token in text for token in ("/assets/js/main.js", "/assets/js/footer-loader.js", "data-include")):
                errors.append(f"Footer placeholder has no canonical loader in {rel}")

    if stats["header_sources"] != 1:
        errors.append(f"Expected exactly one canonical public header source; found {stats['header_sources']}")
    if stats["footer_sources"] != 1:
        errors.append(f"Expected exactly one canonical public footer source; found {stats['footer_sources']}")

    return errors, stats


def fetch_text(url: str) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "FamilyFlats-SiteShell-Validator/1.0",
            "Cache-Control": "no-cache",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        if response.status != 200:
            raise RuntimeError(f"HTTP {response.status} for {url}")
        return response.read().decode("utf-8", errors="replace")


def validate_live(base_url: str) -> list[str]:
    errors: list[str] = []
    base = base_url.rstrip("/")

    assets = {
        "/header.html": ("ff-site-header", "New Projects", "Post Property"),
        "/footer.html": ("site-footer", "Contact Us"),
        "/assets/css/header.css": (".ff-site-header",),
        "/assets/css/footer.css": (".site-footer",),
        "/assets/js/main.js": ("/header.html", "/footer.html"),
        "/assets/js/footer-loader.js": ("/footer.html",),
    }

    for path, tokens in assets.items():
        url = base + path
        try:
            text = fetch_text(url)
        except (urllib.error.URLError, RuntimeError) as exc:
            errors.append(f"Live asset failed: {url}: {exc}")
            continue
        for token in tokens:
            if token not in text:
                errors.append(f"Live asset {url} is missing required token: {token}")

    legacy_patterns = (
        "footer-stage",
        "header-stage",
        "footer-loader-stage",
        "header-loader-stage",
    )

    for path in LIVE_PATHS:
        url = base + path
        try:
            text = fetch_text(url)
        except (urllib.error.URLError, RuntimeError) as exc:
            errors.append(f"Live page failed: {url}: {exc}")
            continue
        lowered = text.lower()
        for pattern in legacy_patterns:
            if pattern.lower() in lowered:
                errors.append(f"Legacy site-shell pattern '{pattern}' found on {url}")

        for match in TAG_RE.finditer(text):
            tag_name = match.group(1).lower()
            tokens = class_tokens(match.group(0))
            if tag_name == "header" and tokens & {"ff-header", "ff-inv-header", "ff-universal-header"}:
                errors.append(f"Legacy public header found on {url}: {sorted(tokens & HEADER_CLASSES)}")
            if tag_name == "footer" and "ff-site-footer" in tokens:
                errors.append(f"Legacy public footer found on {url}")

        has_header_contract = (
            has_placeholder(text, "header-placeholder")
            or "data-include=\"/header.html\"" in text
            or "data-include='/header.html'" in text
            or "ff-site-header" in text
        )
        if not has_header_contract:
            errors.append(f"No universal header contract found on {url}")

        has_footer_contract = (
            has_placeholder(text, "footer-placeholder")
            or "data-include=\"/footer.html\"" in text
            or "data-include='/footer.html'" in text
            or 'class="site-footer"' in text
            or "class='site-footer'" in text
        )
        if not has_footer_contract:
            errors.append(f"No universal footer contract found on {url}")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--live-base", help="Also validate deployed pages under this base URL")
    args = parser.parse_args()

    errors, stats = validate_repository()
    if args.live_base:
        errors.extend(validate_live(args.live_base))

    if errors:
        print("SITE_SHELL_VALIDATION=FAIL")
        for error in errors:
            print(f"- {error}")
        return 2

    print("SITE_SHELL_VALIDATION=PASS")
    print(f"MARKUP_FILES={stats['markup_files']}")
    print("HEADER_SOURCE=/header.html")
    print("FOOTER_SOURCE=/footer.html")
    if args.live_base:
        print(f"LIVE_BASE={args.live_base.rstrip('/')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
