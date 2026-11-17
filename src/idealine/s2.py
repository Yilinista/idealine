"""Semantic Scholar Graph API client (only the two endpoints we need)."""

from __future__ import annotations

import hashlib
import json
import os
import sys
import time
from collections.abc import Callable
from pathlib import Path

import httpx

from .models import Citation, Paper

BASE_URL = "https://api.semanticscholar.org/graph/v1"
PAPER_FIELDS = "title,year,publicationDate,url,venue,authors,citationCount,externalIds"
CITATION_FIELDS = "contexts,intents,isInfluential," + PAPER_FIELDS
PAGE_SIZE = 100
MAX_OFFSET = 9_999
MAX_ATTEMPTS = 9  # waits 2+4+8+16+32+60+60+60s, about 4 minutes in total
DEFAULT_CACHE_DIR = Path(os.environ.get("CLAIM_TIMELINE_CACHE", Path.home() / ".cache" / "idealine"))


class S2Error(RuntimeError):
    pass


def _paper_from_json(data: dict) -> Paper:
    return Paper(
        paper_id=data.get("paperId") or "",
        title=(data.get("title") or "Untitled").strip(),
        year=data.get("year"),
        publication_date=data.get("publicationDate"),
        url=data.get("url")
        or (f"https://www.semanticscholar.org/paper/{data['paperId']}" if data.get("paperId") else None),
        venue=data.get("venue") or None,
        authors=[a.get("name", "") for a in (data.get("authors") or []) if a.get("name")],
        citation_count=data.get("citationCount"),
    )


class S2Client:
    def __init__(
        self,
        api_key: str | None = None,
        http: httpx.Client | None = None,
        sleep: Callable[[float], None] = time.sleep,
        log: Callable[[str], None] = lambda msg: print(msg, file=sys.stderr),
        cache_dir: Path | None = None,
    ) -> None:
        self._cache_dir = cache_dir
        key = api_key if api_key is not None else os.environ.get("S2_API_KEY")
        headers = {"User-Agent": "idealine"}
        if key:
            headers["x-api-key"] = key
        self._http = http or httpx.Client(base_url=BASE_URL, headers=headers, timeout=30.0)
        self._sleep = sleep
        self._log = log

    def _cache_path(self, path: str, params: dict) -> Path | None:
        if self._cache_dir is None:
            return None
        key = hashlib.sha256(json.dumps([path, params], sort_keys=True).encode()).hexdigest()[:32]
        return self._cache_dir / f"{key}.json"

    def _get(self, path: str, params: dict) -> dict:
        cache = self._cache_path(path, params)
        if cache and cache.exists():
            return json.loads(cache.read_text())
        data = self._fetch(path, params)
        if cache:
            cache.parent.mkdir(parents=True, exist_ok=True)
            cache.write_text(json.dumps(data))
        return data

    def _fetch(self, path: str, params: dict) -> dict:
        delay = 2.0
        for attempt in range(1, MAX_ATTEMPTS + 1):
            resp = self._http.get(path, params=params)
            if resp.status_code == 200:
                return resp.json()
            if resp.status_code == 404:
                raise S2Error(f"Semantic Scholar has no paper for '{path}'. Check the --seed ID.")
            if resp.status_code == 429 or resp.status_code >= 500:
                if attempt == MAX_ATTEMPTS:
                    break
                retry_after = resp.headers.get("retry-after")
                wait = float(retry_after) if retry_after and retry_after.isdigit() else delay
                self._log(f"Semantic Scholar returned {resp.status_code}; retrying in {wait:.0f}s...")
                self._sleep(wait)
                delay = min(delay * 2, 60.0)
                continue
            raise S2Error(f"Semantic Scholar error {resp.status_code}: {resp.text[:200]}")
        raise S2Error(
            "Semantic Scholar kept rate-limiting us. Wait a minute, or set S2_API_KEY "
            "(free key: https://www.semanticscholar.org/product/api#api-key-form)."
        )

    def get_paper(self, paper_id: str) -> Paper:
        return _paper_from_json(self._get(f"/paper/{paper_id}", {"fields": PAPER_FIELDS}))

    def _page(self, paper_id: str, offset: int, limit: int) -> dict:
        return self._get(
            f"/paper/{paper_id}/citations",
            {"fields": CITATION_FIELDS, "offset": offset, "limit": limit},
        )

    @staticmethod
    def sample_offsets(total: int, max_papers: int) -> list[int]:
        """Page offsets spread evenly over the whole citation list.

        Semantic Scholar returns citations newest first, so reading only the
        first pages of a well-cited paper would show only the latest year.
        """
        total = min(total, MAX_OFFSET)  # the API rejects offset + limit >= 10,000
        if total <= max_papers:
            return list(range(0, total, PAGE_SIZE))
        n_pages = max(1, -(-max_papers // PAGE_SIZE))
        if n_pages == 1:
            return [0]
        last = max(0, total - PAGE_SIZE)
        return sorted({round(i * last / (n_pages - 1)) for i in range(n_pages)})

    def get_citations(self, paper_id: str, max_papers: int = 500, total: int | None = None) -> list[Citation]:
        """Fetch up to max_papers citing papers.

        If `total` (the seed's citation count) is larger than max_papers, pages
        are sampled evenly across the list so every year is represented.
        """
        if total and total > max_papers:
            offsets = self.sample_offsets(total, max_papers)
        else:
            offsets = None  # read sequentially until the API says stop

        citations: list[Citation] = []
        seen: set[str] = set()

        def add(page: dict) -> None:
            for item in page.get("data") or []:
                citing = item.get("citingPaper") or {}
                pid = citing.get("paperId")
                if not pid or pid in seen or len(citations) >= max_papers:
                    continue
                seen.add(pid)
                citations.append(
                    Citation(
                        paper=_paper_from_json(citing),
                        contexts=[c.strip() for c in (item.get("contexts") or []) if c and c.strip()],
                        intents=list(item.get("intents") or []),
                        is_influential=bool(item.get("isInfluential")),
                    )
                )

        if offsets is not None:
            for off in offsets:
                add(self._page(paper_id, off, PAGE_SIZE))
            return citations

        offset = 0
        while offset < max_papers:
            page = self._page(paper_id, offset, min(PAGE_SIZE, max_papers - offset))
            add(page)
            next_offset = page.get("next")
            if next_offset is None or not page.get("data"):
                break
            offset = next_offset
        return citations
