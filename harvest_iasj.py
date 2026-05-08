from __future__ import annotations

import argparse
import http.client
import json
import re
import ssl
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse


BASE_DIR = Path(__file__).resolve().parent
CATALOG_PATH = BASE_DIR / "data" / "catalog.json"

DEFAULT_JOURNALS = [
    "https://iasj.rdd.edu.iq/journals/journal/view/427",
    "https://iasj.rdd.edu.iq/journals/institution/95",
    "https://iasj.rdd.edu.iq/journals/browse?subject=64",
]

USER_AGENT = "Mozilla/5.0 (compatible; KurdishJournalSearch/1.0)"


class LinkTextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[dict[str, str]] = []
        self._href: str | None = None
        self._text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "a":
            return
        attrs_dict = dict(attrs)
        href = attrs_dict.get("href")
        if href:
            self._href = href
            self._text = []

    def handle_data(self, data: str) -> None:
        if self._href:
            self._text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "a" and self._href:
            text = " ".join(" ".join(self._text).split())
            if text:
                self.links.append({"href": self._href, "text": text})
            self._href = None
            self._text = []


class TextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.text_parts: list[str] = []

    def handle_data(self, data: str) -> None:
        clean = " ".join(data.split())
        if clean:
            self.text_parts.append(clean)

    @property
    def text(self) -> str:
        return "\n".join(self.text_parts)


def fetch_html(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path or "/"
    if parsed.query:
        path = f"{path}?{parsed.query}"

    headers = {"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"}
    if parsed.scheme == "https":
        connection = http.client.HTTPSConnection(parsed.netloc, timeout=30, context=ssl.create_default_context())
    else:
        connection = http.client.HTTPConnection(parsed.netloc, timeout=30)

    try:
        connection.request("GET", path, headers=headers)
        response = connection.getresponse()
        if response.status >= 400:
            raise RuntimeError(f"HTTP {response.status} while fetching {url}")
        return response.read().decode("utf-8", errors="replace")
    finally:
        connection.close()


def get_links(url: str) -> list[dict[str, str]]:
    parser = LinkTextParser()
    parser.feed(fetch_html(url))
    for link in parser.links:
        link["href"] = urljoin(url, link["href"])
    return parser.links


def get_page_text(url: str) -> str:
    parser = TextParser()
    parser.feed(fetch_html(url))
    return parser.text


def discover_issue_urls(seed_urls: list[str], limit: int) -> list[str]:
    issue_urls: list[str] = []
    seen: set[str] = set()
    for url in seed_urls:
        for link in get_links(url):
            href = link["href"]
            if "/journal/issue/" in href and href not in seen:
                seen.add(href)
                issue_urls.append(href)
                if len(issue_urls) >= limit:
                    return issue_urls
    return issue_urls


def article_records_from_issue(issue_url: str, journal_id: str) -> list[dict[str, Any]]:
    text = get_page_text(issue_url)
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    records: list[dict[str, Any]] = []

    for index, line in enumerate(lines):
        if len(line) < 20 or line.lower().startswith(("image", "subscribe", "copyright")):
            continue
        if not re.search(r"[A-Za-z]", line):
            continue
        if line in {"IASJ", "Iraqi Academic Scientific Journals", "Stay Updated with Latest Research"}:
            continue
        if "Volume " in line and "Issue " in line:
            continue

        article_id = re.sub(r"[^a-z0-9]+", "-", f"iasj-{journal_id}-{index}-{line[:60].lower()}").strip("-")
        records.append(
            {
                "id": article_id[:120],
                "title": line,
                "title_ku": "",
                "title_ar": "",
                "authors": ["Unknown"],
                "year": "",
                "journal_id": journal_id,
                "doi": "",
                "pdf_url": "",
                "url": issue_url,
                "keywords": ["IASJ", "imported"],
                "abstract": f"Imported from IASJ issue page: {issue_url}",
                "summary": "Imported IASJ metadata candidate. Review before public use.",
                "language": "Unknown",
            }
        )
    return records


def ensure_journal(catalog: dict[str, Any], journal_id: str) -> None:
    if any(journal["id"] == journal_id for journal in catalog["journals"]):
        return
    catalog["journals"].append(
        {
            "id": journal_id,
            "title": "IASJ Imported Records",
            "institution_id": "sulaimani",
            "subjects": ["iasj", "imported"],
            "issn": "",
            "impact_factor": None,
            "ranking": "Not verified",
        }
    )


def import_iasj(seed_urls: list[str], issue_limit: int, journal_id: str, dry_run: bool) -> int:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    ensure_journal(catalog, journal_id)
    existing_ids = {article["id"] for article in catalog["articles"]}

    issue_urls = discover_issue_urls(seed_urls, issue_limit)
    imported = 0
    for issue_url in issue_urls:
        for record in article_records_from_issue(issue_url, journal_id):
            if record["id"] in existing_ids:
                continue
            catalog["articles"].append(record)
            existing_ids.add(record["id"])
            imported += 1

    if not dry_run:
        CATALOG_PATH.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    return imported


def main() -> None:
    parser = argparse.ArgumentParser(description="Harvest IASJ issue pages into the local catalog.")
    parser.add_argument("--seed-url", action="append", default=[], help="IASJ journal, institution, or subject URL.")
    parser.add_argument("--issue-limit", type=int, default=5)
    parser.add_argument("--journal-id", default="iasj-imported")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    seed_urls = args.seed_url or DEFAULT_JOURNALS
    count = import_iasj(seed_urls, args.issue_limit, args.journal_id, args.dry_run)
    mode = "Would import" if args.dry_run else "Imported"
    print(f"{mode} {count} IASJ candidate record(s).")


if __name__ == "__main__":
    main()
