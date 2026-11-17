"""Does a term name an organization or software, and since when? (Wikidata)

A name such as "OpenAI" or "PyTorch" cannot appear in a paper written before the
thing existed, so earlier records are misdated or use the words in another sense.
Same rules as lookupEntity in web/core.js.
"""

from __future__ import annotations

import re
from collections.abc import Callable
from typing import Any

import httpx

API = "https://www.wikidata.org/w/api.php"
USER_AGENT = "idealine (https://github.com/Yilinista/idealine)"
# Classes (instance of, or one subclass step up) that count as a name with a start date.
ORG_CLASSES = {"Q43229", "Q4830453", "Q783794", "Q6881511", "Q163740", "Q31855", "Q18388277"}
SOFTWARE_CLASSES = {"Q7397", "Q1077784", "Q166142", "Q115305900", "Q3621696", "Q870780", "Q1130645", "Q341",
                    "Q188860", "Q271680", "Q131406845", "Q9143"}
NOT_A_NAME = {"Q7889"}  # video games share names with everything
MIN_SITELINKS = 5  # well-known items only: obscure items with the same label are often noise


def _claims(e: dict, p: str) -> list[dict]:
    return [s for s in (e.get("claims") or {}).get(p) or []
            if s.get("rank") != "deprecated" and (s.get("mainsnak") or {}).get("datavalue")]


def _claim_ids(e: dict, p: str) -> list[str]:
    out = []
    for s in _claims(e, p):
        v = s["mainsnak"]["datavalue"].get("value")
        if isinstance(v, dict) and v.get("id"):
            out.append(v["id"])
    return out


def start_date(e: dict) -> dict | None:
    """Earliest of inception (P571) and publication date (P577): {year, date}, the date
    as precise as Wikidata has it ("2015-12-08", "2023-02" or "2016")."""
    best = None
    for p in ("P571", "P577"):
        for s in _claims(e, p):
            v = s["mainsnak"]["datavalue"].get("value")
            m = re.match(r"^\+(\d{1,4})-(\d\d)-(\d\d)", (v or {}).get("time", "") if isinstance(v, dict) else "")
            if not m:
                continue
            d = m[1].zfill(4) + (("-" + m[2] + ("-" + m[3] if m[3] != "00" else "")) if m[2] != "00" else "")
            if best is None or d < best["date"]:
                best = {"year": int(m[1]), "date": d}
    return best


def _kind(classes) -> str | None:
    classes = list(classes)
    if any(c in ORG_CLASSES for c in classes):
        return "organization"
    if any(c in SOFTWARE_CLASSES for c in classes):
        return "software"
    return None


def lookup_entity(term: str, get: Callable[[dict], Any] | None = None) -> dict | None:
    """The organization or software the term names, or None (a concept, an unknown or
    ambiguous word, or Wikidata unreachable). floor: the first year a paper can name it
    (software is often named a year before release)."""
    if get is None:
        def get(params: dict) -> Any:
            r = httpx.get(API, params={**params, "format": "json"}, headers={"User-Agent": USER_AGENT}, timeout=10.0)
            r.raise_for_status()
            return r.json()
    q = re.sub(r"\s+", " ", term or "").strip()
    if not q or len(q) > 100:
        return None
    try:
        hits = get({"action": "wbsearchentities", "search": q, "language": "en", "uselang": "en",
                    "type": "item", "limit": "7"}).get("search") or []

        def text(h):
            return re.sub(r"\s+", " ", str((h.get("match") or {}).get("text") or "")).strip()
        # The item's own name (not an alias), exact spelling first ("cursor" the UI element,
        # "Cursor" the editor), then any case.
        labels = [h for h in hits if (h.get("match") or {}).get("type") == "label"]
        hit = next((h for h in labels if text(h) == q), None) or next((h for h in labels if text(h).lower() == q.lower()), None)
        if not hit or not re.fullmatch(r"Q\d+", hit.get("id") or ""):
            return None
        e = (get({"action": "wbgetentities", "ids": hit["id"], "props": "claims|sitelinks|labels|descriptions",
                  "languages": "en"}).get("entities") or {}).get(hit["id"])
        if not e:
            return None
        p31 = _claim_ids(e, "P31")
        when = start_date(e)
        if not when or not p31 or any(c in NOT_A_NAME for c in p31) or len(e.get("sitelinks") or {}) < MIN_SITELINKS:
            return None
        kind = _kind(p31)
        if not kind:
            parents = get({"action": "wbgetentities", "ids": "|".join(p31[:20]), "props": "claims"}).get("entities") or {}
            kind = _kind(c for p in parents.values() for c in _claim_ids(p, "P279"))
        if not kind:
            return None
        return {
            "id": hit["id"], "label": ((e.get("labels") or {}).get("en") or {}).get("value") or q,
            "description": ((e.get("descriptions") or {}).get("en") or {}).get("value") or "",
            "kind": kind, "date": when["date"], "year": when["year"],
            "floor": when["year"] - 1 if kind == "software" else when["year"],
            "url": f"https://www.wikidata.org/wiki/{hit['id']}",
        }
    except (httpx.HTTPError, ValueError, KeyError, TypeError, AttributeError):
        return None
