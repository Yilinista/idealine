"""OpenAlex client: yearly usage counts, sample works, and title lookups.

OpenAlex is free and needs no key. Responses are cached on disk so reruns
and retries do not refetch.
"""

from __future__ import annotations

import hashlib
from datetime import date, timedelta
import json
import os
import re
import sys
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

import httpx

BASE_URL = "https://api.openalex.org"
SELECT = "id,display_name,publication_year,publication_date,doi,cited_by_count,authorships,abstract_inverted_index"
MAX_ATTEMPTS = 6


class OpenAlexError(RuntimeError):
    pass


@dataclass
class Work:
    work_id: str
    title: str
    year: int | None
    date: str | None
    url: str
    cited_by: int = 0
    authors: list[str] = field(default_factory=list)
    abstract: str = ""

    @property
    def short_authors(self) -> str:
        if not self.authors:
            return "Unknown authors"
        return self.authors[0] if len(self.authors) == 1 else f"{self.authors[0]} et al."


def abstract_from_index(index: dict | None) -> str:
    """OpenAlex stores abstracts as {word: [positions]}; rebuild the text."""
    if not index:
        return ""
    slots: dict[int, str] = {}
    for word, positions in index.items():
        for pos in positions:
            slots[pos] = word
    return " ".join(slots[i] for i in sorted(slots))


def work_from_json(data: dict) -> Work:
    doi = data.get("doi")
    return Work(
        work_id=(data.get("id") or "").rsplit("/", 1)[-1],
        title=(data.get("display_name") or "Untitled").strip(),
        year=data.get("publication_year"),
        date=data.get("publication_date"),
        url=doi or data.get("id") or "",
        cited_by=data.get("cited_by_count") or 0,
        authors=[
            a["author"]["display_name"]
            for a in (data.get("authorships") or [])
            if a.get("author", {}).get("display_name")
        ],
        abstract=abstract_from_index(data.get("abstract_inverted_index")),
    )


def phrase_query(term: str, aliases: list[str]) -> str:
    """Exact-phrase OR query, e.g. '"recursive self-improvement" OR "RSI loop"'."""
    phrases = [term, *aliases]
    return " OR ".join(f'"{p.replace(chr(34), "")}"' for p in phrases if p.strip())


class OpenAlexClient:
    def __init__(
        self,
        http: httpx.Client | None = None,
        cache_dir: Path | None = None,
        sleep: Callable[[float], None] = time.sleep,
        log: Callable[[str], None] = lambda m: print(m, file=sys.stderr),
        api_key: str | None = None,
    ) -> None:
        headers = {"User-Agent": "idealine"}
        key = api_key if api_key is not None else os.environ.get("OPENALEX_API_KEY")
        self.has_key = bool(key)
        if key:
            headers["Authorization"] = f"Bearer {key}"
        self._http = http or httpx.Client(base_url=BASE_URL, headers=headers, timeout=30.0)
        self._cache_dir = cache_dir
        self._sleep = sleep
        self._log = log

    def _get(self, path: str, params: dict) -> dict:
        cache = None
        if self._cache_dir is not None:
            key = hashlib.sha256(json.dumps(["oa", path, params], sort_keys=True).encode()).hexdigest()[:32]
            cache = self._cache_dir / f"{key}.json"
            if cache.exists():
                return json.loads(cache.read_text())
        delay = 1.0
        for attempt in range(1, MAX_ATTEMPTS + 1):
            resp = self._http.get(path, params=params)
            if resp.status_code == 200:
                data = resp.json()
                if cache:
                    cache.parent.mkdir(parents=True, exist_ok=True)
                    cache.write_text(json.dumps(data))
                return data
            if resp.status_code == 429:
                retry_after = resp.headers.get("retry-after", "")
                if retry_after.isdigit() and int(retry_after) > 120:
                    secs = int(retry_after)
                    wait = f"{secs / 3600:.0f} h" if secs >= 5400 else f"{max(1, round(secs / 60))} min"
                    raise OpenAlexError(
                        f"OpenAlex's free daily budget for your network is used up (resets in about {wait}, "
                        "at midnight UTC). Get a free key at https://help.openalex.org/api/authentication/ "
                        "and set OPENALEX_API_KEY, or try again later. Already-fetched terms are cached."
                    )
            if resp.status_code == 429 or resp.status_code >= 500:
                if attempt < MAX_ATTEMPTS:
                    self._log(f"OpenAlex returned {resp.status_code}; retrying in {delay:.0f}s...")
                    self._sleep(delay)
                    delay = min(delay * 2, 30)
                    continue
            raise OpenAlexError(f"OpenAlex error {resp.status_code}: {resp.text[:200]}")
        raise OpenAlexError("OpenAlex kept failing; try again in a minute.")

    @staticmethod
    def _filter(query: str, year: int | None = None, since: int | None = None) -> str:
        # Title and abstract only (plain `search` also matches full text), and `.exact`
        # so OpenAlex does not stem: plain search counts "agent" papers for "agentic".
        flt = f"title_and_abstract.search.exact:{query.replace(',', ' ')}"
        if year is not None:
            flt += f",publication_year:{year}"
        if since is not None:
            flt += f",publication_year:>{since - 1}"
        return flt

    def year_counts(self, query: str) -> dict[int, int]:
        data = self._get("/works", {"filter": self._filter(query), "group_by": "publication_year"})
        out = {}
        for g in data.get("group_by") or []:
            try:
                out[int(g["key"])] = int(g["count"])
            except (KeyError, ValueError):
                continue
        return dict(sorted(out.items()))

    def quarter_counts(self, query: str, years: list[int], today: date | None = None
                       ) -> tuple[list[tuple[str, int]], list[tuple[int, int]]]:
        """Papers per quarter for the given years (one small request each; OpenAlex cannot
        group by date). Quarters that have not started yet are skipped. OpenAlex dates
        papers known only by year as 1 January, so those are returned apart as undated
        and left out of Q1. Returns (quarters, undated)."""
        today = today or date.today()

        def count(start: date, end: date) -> int:
            flt = f"{self._filter(query)},from_publication_date:{start.isoformat()},to_publication_date:{end.isoformat()}"
            data = self._get("/works", {"filter": flt, "per_page": 1, "select": "id"})
            return int((data.get("meta") or {}).get("count") or 0)

        quarters, undated = [], []
        for y in years:
            if date(y, 1, 1) > today:
                continue
            undated.append((y, count(date(y, 1, 1), date(y, 1, 1))))
            for q in range(1, 5):
                start = date(y, 3 * (q - 1) + 1, 1)
                if start > today:
                    continue
                end = date(y, 12, 31) if q == 4 else date(y, 3 * q + 1, 1) - timedelta(days=1)
                quarters.append((f"{y}-Q{q}", count(date(y, 1, 2) if q == 1 else start, end)))
        return quarters, undated

    def works(self, query: str, sort: str, per_page: int, year: int | None = None,
              since: int | None = None) -> list[Work]:
        params = {"filter": self._filter(query, year, since), "sort": sort, "per_page": per_page, "select": SELECT}
        data = self._get("/works", params)
        return [work_from_json(w) for w in data.get("results") or []]

    def find_work(self, title: str, year: int | None = None) -> Work | None:
        """Best match for a work named in a sentence, e.g. 'Good 1965 speculations'."""
        clean = re.sub(r"[^\w\s-]", " ", title).strip()
        if not clean:
            return None
        params = {"search": clean, "per_page": 3, "select": SELECT}
        if year:
            params["filter"] = f"publication_year:{year - 1}-{year + 1}"
        data = self._get("/works", params)
        results = data.get("results") or []
        return work_from_json(results[0]) if results else None
