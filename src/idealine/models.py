"""Plain data types shared across the pipeline."""

from __future__ import annotations

from dataclasses import dataclass, field

STANCES = ("supports", "refutes", "refines", "mentions", "unrelated")


@dataclass
class Paper:
    paper_id: str
    title: str
    year: int | None = None
    publication_date: str | None = None
    url: str | None = None
    venue: str | None = None
    authors: list[str] = field(default_factory=list)
    citation_count: int | None = None

    @property
    def sort_key(self) -> str:
        """Date string usable for sorting; unknown dates sort last."""
        if self.publication_date:
            return self.publication_date
        if self.year:
            return f"{self.year}-99-99"
        return "9999"

    @property
    def short_authors(self) -> str:
        if not self.authors:
            return "Unknown authors"
        if len(self.authors) == 1:
            return self.authors[0]
        return f"{self.authors[0]} et al."


@dataclass
class Citation:
    """One paper that cites the seed, with every sentence where it does so."""

    paper: Paper
    contexts: list[str]
    intents: list[str] = field(default_factory=list)
    is_influential: bool = False


@dataclass
class Candidate:
    """One citing sentence, ranked for relevance to the claim."""

    paper: Paper
    context: str
    score: float
    is_influential: bool = False
    # Filled in by the classifier; empty when --no-llm is used.
    stance: str | None = None
    evidence: str = ""
    evidence_verified: bool = False
    note: str = ""


@dataclass
class Timeline:
    claim: str
    seed: Paper
    entries: list[Candidate]
    total_citations: int
    citations_without_context: int
    classified: bool
    model: str | None = None
    # The seed's total citation count, when we only sampled part of it.
    papers_available: int | None = None
