#!/usr/bin/env python3
"""Conservative FUTURA / Pyrobazaar stock watcher.

Only changes pyrobazaar-stock-status.json. Does not touch prices, images,
invoices, orders or product markup. A missing product means NO STOCK per
supplier's stated Quick Shopping policy.

Run from the repository root. --dry-run reports without writing anything.
"""
import argparse
import datetime as dt
import html
import json
import pathlib
import re
import sys
import unicodedata

import requests
from bs4 import BeautifulSoup

CATALOG = pathlib.Path("deepavali-crackers-2026.html")
STATUS = pathlib.Path("pyrobazaar-stock-status.json")
SOURCE = "https://pyrobazaar.in/quickshopping"
MIN_MATCHED = 220
MAX_CHANGES_PER_RUN = 15

def canonical(value):
    v = unicodedata.normalize("NFKC", html.unescape(str(value))).upper()
    v = v.replace("’", "'").replace("‘", "'").replace("″", '"')
    # Names use 10 PCS, 1 PCE, " (10 PCS) ", etc. Preserve pack numbers.
    v = re.sub(r"\bPIECES?\b", "PCS", v)
    v = re.sub(r"\bPACKETS?\b", "PKT", v)
    return " ".join(re.findall(r"[A-Z0-9]+", v))

def main():
    arg = argparse.ArgumentParser()
    arg.add_argument("--dry-run", action="store_true")
    opts = arg.parse_args()
    current = json.loads(STATUS.read_text(encoding="utf-8"))
    if current.get("schema") != 1 or not isinstance(current.get("products"), dict):
        sys.exit("ABORT: local stock file is invalid")
    local = BeautifulSoup(CATALOG.read_text(encoding="utf-8"), "html.parser")
    rows = local.select(".product-row[data-product-key]")
    if len(rows) != 300:
        sys.exit(f"ABORT: expected 300 rows but found {len(rows)}")
    mapping = {}
    for row in rows:
        key = row.get("data-product-key")
        heading = row.select_one(".product-name")
        if not key or not heading or key in mapping:
            sys.exit("ABORT: catalog contains missing/duplicate product keys")
        mapping[key] = heading.get_text(" ", strip=True)
    if len(mapping) != len(current["products"]) or set(mapping) != set(current["products"]):
        sys.exit("ABORT: stock file keys do not match catalog")
    try:
        response = requests.get(
            SOURCE,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; FUTURA-stock-check/1.0; +https://futuraonlineprint.in)",
                "Cache-Control": "no-cache",
                "Accept": "text/html,application/xhtml+xml",
            }, timeout=30
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        sys.exit(f"ABORT: supplier website unreachable: {exc}")
    source_html = response.text
    supplier = BeautifulSoup(source_html, "html.parser")
    source_text = supplier.get_text(" ", strip=True)
    upper = source_text.upper()
    if "PRODUCT NAME" not in upper or "SUB-TOTAL" not in upper:
        sys.exit("ABORT: unexpected supplier page / potential access restriction")
    # Check only the Quick Shopping product listing, not header/nav or footer.
    product_area = source_text[upper.index("PRODUCT NAME"):]
    text_normalized = " " + canonical(product_area) + " "
    predicted = {}
    for key, name in mapping.items():
        phrase = canonical(name)
        if len(phrase) < 6:
            sys.exit(f"ABORT: ambiguous short name in FUTURA catalogue: {key}")
        predicted[key] = (" " + phrase + " ") in text_normalized
    matched = sum(predicted.values())
    changes = [key for key in predicted if predicted[key] != current["products"][key]]
    out_count = len(predicted) - matched
    print(f"Supplier matched={matched}/300; NO STOCK={out_count}; changes={len(changes)}")
    for key in changes:
        print(f"  {'NO STOCK' if not predicted[key] else 'RESTOCKED'} {key}: {mapping[key]}")
    # If text extraction breaks, do not accidentally block every item.
    if matched < MIN_MATCHED or len(changes) > MAX_CHANGES_PER_RUN:
        sys.exit("ABORT: unusual inventory change or parsing mismatch. Manual review required.")
    if opts.dry_run:
        print("DRY RUN: no data has been changed")
        return
    if not changes:
        print("No change. GitHub will not redeploy the site.")
        return
    current["products"] = predicted
    current["source"] = SOURCE
    current["lastChangedUTC"] = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    current["matchedProductsAtLastChange"] = matched
    current["supplierDisplayedAbsenceRule"] = "Missing from Quick Shopping = NO STOCK"
    STATUS.write_text(json.dumps(current, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"WROTE {STATUS}: {len(changes)} stock changes")

if __name__ == "__main__":
    main()
