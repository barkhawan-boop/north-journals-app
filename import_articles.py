from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
CATALOG_PATH = BASE_DIR / "data" / "catalog.json"

REQUIRED_COLUMNS = {"title", "authors", "year", "journal_id", "abstract"}


def split_list(value: str) -> list[str]:
    return [item.strip() for item in value.replace(";", ",").split(",") if item.strip()]


def import_csv(csv_path: Path, catalog_path: Path = CATALOG_PATH) -> int:
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    known_journals = {journal["id"] for journal in catalog["journals"]}
    existing_ids = {article["id"] for article in catalog["articles"]}

    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        missing = REQUIRED_COLUMNS - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"Missing required CSV columns: {', '.join(sorted(missing))}")

        imported = 0
        for row in reader:
            journal_id = row["journal_id"].strip()
            if journal_id not in known_journals:
                raise ValueError(f"Unknown journal_id: {journal_id}")

            article_id = row.get("id", "").strip() or f"article-{len(existing_ids) + imported + 1:06d}"
            if article_id in existing_ids:
                continue

            catalog["articles"].append(
                {
                    "id": article_id,
                    "title": row["title"].strip(),
                    "title_ku": row.get("title_ku", "").strip(),
                    "title_ar": row.get("title_ar", "").strip(),
                    "authors": split_list(row["authors"]),
                    "year": int(row["year"]),
                    "journal_id": journal_id,
                    "doi": row.get("doi", "").strip(),
                    "pdf_url": row.get("pdf_url", "").strip(),
                    "url": row.get("url", "").strip(),
                    "keywords": split_list(row.get("keywords", "")),
                    "abstract": row["abstract"].strip(),
                    "summary": row.get("summary", "").strip(),
                    "language": row.get("language", "").strip() or "Unknown",
                }
            )
            existing_ids.add(article_id)
            imported += 1

    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    return imported


def main() -> None:
    parser = argparse.ArgumentParser(description="Import article metadata from a CSV file.")
    parser.add_argument("csv_path", type=Path)
    args = parser.parse_args()
    count = import_csv(args.csv_path)
    print(f"Imported {count} article record(s).")


if __name__ == "__main__":
    main()
