"""Cheap keyword ranking so only the most relevant citing sentences reach the LLM."""

from __future__ import annotations

import re

from .models import Candidate, Citation

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "been", "but", "by", "can", "do", "does",
    "for", "from", "has", "have", "how", "if", "in", "into", "is", "it", "its", "more",
    "most", "not", "of", "on", "or", "should", "such", "than", "that", "the", "their",
    "then", "there", "these", "this", "those", "to", "was", "were", "when", "which",
    "while", "will", "with", "would",
}
_WORD = re.compile(r"[a-z0-9]+")


def _stem(word: str) -> str:
    for suffix in ("ing", "ed", "es", "s"):
        if len(word) > len(suffix) + 2 and word.endswith(suffix):
            return word[: -len(suffix)]
    return word


def keywords(text: str) -> set[str]:
    return {_stem(w) for w in _WORD.findall(text.lower()) if w not in STOPWORDS and len(w) > 1}


def score(context: str, claim_terms: set[str]) -> float:
    if not claim_terms:
        return 0.0
    return len(claim_terms & keywords(context)) / len(claim_terms)


def rank_contexts(claim: str, citations: list[Citation], max_contexts: int) -> list[Candidate]:
    """Flatten citations into (paper, sentence) candidates and keep the top ones.

    Half the slots are shared out across years (best-scoring sentences of each
    year first), so a timeline is not filled by the busiest year alone. The rest
    go to the highest scores overall. Ties go to influential citations, then to
    more-cited papers.
    """
    terms = keywords(claim)
    candidates = [
        Candidate(
            paper=c.paper,
            context=ctx,
            score=score(ctx, terms),
            is_influential=c.is_influential,
        )
        for c in citations
        for ctx in c.contexts
    ]
    candidates.sort(
        key=lambda x: (x.score, x.is_influential, x.paper.citation_count or 0),
        reverse=True,
    )
    if len(candidates) <= max_contexts:
        return candidates

    by_year: dict[int | None, list[Candidate]] = {}
    for cand in candidates:
        if cand.score > 0:
            by_year.setdefault(cand.paper.year, []).append(cand)

    chosen: list[Candidate] = []
    picked: set[int] = set()
    if by_year:
        per_year = max(1, (max_contexts // 2) // len(by_year))
        for year_cands in by_year.values():
            for cand in year_cands[:per_year]:
                if len(chosen) < max_contexts:
                    chosen.append(cand)
                    picked.add(id(cand))
    for cand in candidates:
        if len(chosen) >= max_contexts:
            break
        if id(cand) not in picked:
            chosen.append(cand)
            picked.add(id(cand))
    chosen.sort(key=lambda x: (x.score, x.is_influential, x.paper.citation_count or 0), reverse=True)
    return chosen
