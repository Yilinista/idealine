"""Term mode: where did a term come from, and how did its meaning change?

Pipeline:
1. harvest: yearly usage counts, the earliest works, and the most-cited works
   of each year from OpenAlex; keep abstract sentences that use the term.
2. analyze: Claude reads those sentences and proposes eras (what the term
   meant when) and milestones (who coined, popularized, or redefined it).
   Every item must cite sentence IDs; items without evidence are dropped.
3. resolve: milestones that are named inside a sentence ("Good (1965)") are
   looked up in OpenAlex so they get a real link, or are marked unresolved.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import date
from typing import Any

from .openalex import OpenAlexClient, Work, phrase_query

MILESTONE_KINDS = ("ancestor", "origin", "coined", "popularized", "redefined", "applied", "critique")
DEFAULT_MODEL = "claude-opus-5-5"
MAX_SENTENCE_CHARS = 450


@dataclass
class Evidence:
    eid: str
    text: str
    work: Work
    from_title: bool = False


@dataclass
class Era:
    start_year: int
    end_year: int
    label: str
    meaning: str
    evidence: list[str]


@dataclass
class Milestone:
    year: int
    kind: str
    title: str
    why: str
    evidence: list[str]
    work: Work | None = None
    link_status: str = "unresolved"  # "in-sample", "resolved", or "unresolved"


@dataclass
class TermTimeline:
    term: str
    aliases: list[str]
    counts: dict[int, int]
    evidence: list[Evidence]
    eras: list[Era] = field(default_factory=list)
    milestones: list[Milestone] = field(default_factory=list)
    summary: str = ""
    model: str | None = None
    generated: str = field(default_factory=lambda: date.today().isoformat())

    @property
    def total(self) -> int:
        return sum(self.counts.values())

    def evidence_by_id(self) -> dict[str, Evidence]:
        return {e.eid: e for e in self.evidence}


# --- harvest -------------------------------------------------------------------

_LOWER_WORD = re.compile(r"[a-z]{3,}")


def inflections(phrase: str) -> list[str]:
    """Singular/plural of the last word, since exact search does not stem.

    "world model" -> ["world models"], "scaling laws" -> ["scaling law"],
    "emergent abilities" -> ["emergent ability"]. Only plain lowercase English words;
    acronyms, names, and other scripts are left alone. Same rule as web/core.js.
    """
    words = phrase.strip().split(" ")
    last = words[-1]
    # Skip words that are rarely plural nouns: gerunds, -ics, -ism, -ness, -sis.
    if not _LOWER_WORD.fullmatch(last) or last.endswith(("ing", "ics", "ism", "ness", "is")):
        return []
    if last.endswith("ies"):
        alt = last[:-3] + "y"
    elif last.endswith(("sses", "xes", "ches", "shes")):
        alt = last[:-2]
    elif last.endswith("s") and not last.endswith(("ss", "us", "is")):
        alt = last[:-1]
    elif last.endswith("y") and last[-2] not in "aeiou":
        alt = last[:-1] + "ies"
    elif last.endswith(("s", "x", "z", "ch", "sh")):
        alt = last + "es"
    else:
        alt = last + "s"
    return [" ".join(words[:-1] + [alt])]


def with_inflections(term: str, aliases: list[str]) -> list[str]:
    """User aliases plus singular/plural variants of every spelling, deduplicated."""
    seen = {term.lower()}
    out: list[str] = []
    for p in [*aliases, *(v for p in [term, *aliases] for v in inflections(p))]:
        if p.lower() not in seen:
            seen.add(p.lower())
            out.append(p)
    return out


def onset_year(counts: dict[int, int]) -> int | None:
    """First year by which the term has real use (3 papers, or 1% of all papers).

    Papers before it are rare and sometimes misdated in OpenAlex (e.g. a CRISPR
    paper dated 1800), so they are flagged instead of trusted as the origin.
    """
    total = sum(counts.values())
    need, acc = max(3, total * 0.01), 0
    for y in sorted(counts):
        acc += counts[y]
        if acc >= need:
            return y
    return None

_NO_SPACE_SCRIPT = re.compile(r"[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u0e00-\u0e7f]")


def term_pattern(term: str, aliases: list[str]) -> re.Pattern:
    """Case-insensitive match that treats spaces and hyphens alike.

    A phrase must start at a word start ("art" must not match "smart"), except in
    scripts written without spaces (Chinese, Japanese, Thai). Same rule as web/core.js.
    """
    parts = []
    for phrase in [term, *aliases]:
        raw = [w for w in re.split(r"[\s\-]+", phrase.strip()) if w]
        if raw:
            body = r"[\s\-]+".join(re.escape(w) for w in raw)
            parts.append(body if _NO_SPACE_SCRIPT.match(raw[0]) else r"(?<!\w)" + body)
    return re.compile(r"(?:" + "|".join(parts) + r")", re.IGNORECASE)


_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z\"'(\[])|(?<=[。！？])")


def _clip(s: str) -> str:
    return s if len(s) <= MAX_SENTENCE_CHARS else s[: MAX_SENTENCE_CHARS - 1] + "…"


def sentences_with_term(text: str, pattern: re.Pattern) -> list[str]:
    out = []
    for sent in _SENT_SPLIT.split(text):
        sent = sent.strip()
        if pattern.search(sent):
            out.append(sent if len(sent) <= MAX_SENTENCE_CHARS else sent[: MAX_SENTENCE_CHARS - 1] + "…")
    return out


def harvest(
    client: OpenAlexClient,
    term: str,
    aliases: list[str],
    earliest: int = 25,
    top_cited: int = 150,
    recent: int = 60,
    max_evidence: int = 160,
) -> TermTimeline:
    # Search with singular/plural variants too, but keep only the user's spellings as aliases.
    spellings = with_inflections(term, aliases)
    query = phrase_query(term, spellings)
    counts = client.year_counts(query)
    pattern = term_pattern(term, spellings)

    # Four requests per term (OpenAlex bills per request): earliest uses,
    # most-cited overall, most-cited of the last two years, and the counts above.
    works: dict[str, Work] = {}
    for w in client.works(query, "publication_date:asc", earliest):
        works.setdefault(w.work_id, w)
    for w in client.works(query, "cited_by_count:desc", top_cited):
        works.setdefault(w.work_id, w)
    if counts:
        latest = max(counts)
        for w in client.works(query, "cited_by_count:desc", recent, since=latest - 1):
            works.setdefault(w.work_id, w)

    ordered = sorted(works.values(), key=lambda w: (w.date or str(w.year or 9999), -w.cited_by))
    per_work: list[tuple[Work, list[str], bool]] = []
    for w in ordered:
        sents = sentences_with_term(w.abstract, pattern)
        if sents:
            per_work.append((w, sents[:2], False))
        elif pattern.search(w.title):
            per_work.append((w, [_clip(w.title)], True))

    # Stay under max_evidence without cutting off the latest years:
    # first drop to one sentence per work, then thin evenly across time.
    if sum(len(s) for _, s, _ in per_work) > max_evidence:
        per_work = [(w, s[:1], t) for w, s, t in per_work]
    if len(per_work) > max_evidence:
        step = len(per_work) / max_evidence
        per_work = [per_work[int(i * step)] for i in range(max_evidence)]

    evidence: list[Evidence] = []
    for w, sents, from_title in per_work:
        for s in sents:
            evidence.append(Evidence(f"E{len(evidence) + 1}", s, w, from_title=from_title))
    return TermTimeline(term=term, aliases=aliases, counts=counts, evidence=evidence)


# --- analyze -------------------------------------------------------------------

SYSTEM_PROMPT = """You are a careful historian of ideas. You trace where a technical
term came from and how its meaning changed, using only the evidence given.

You get: the term, its number of papers per year, and numbered sentences (E1, E2,
...) from papers that use it, each with year, title, and citation count.

Return:
- summary: two plain sentences a newcomer can read: where the term came from and
  what it mostly means now.
- eras: 2 to 5 consecutive periods in which the term was used in a recognizably
  different way. For each: start_year, end_year, a 2-5 word label, one sentence on
  what the term meant then, and the IDs of sentences that show it.
- milestones: 4 to 12 key moments. Kinds:
  ancestor (an earlier idea the term grew out of, named in the evidence),
  origin (earliest use in the evidence), coined (someone is credited with the name),
  popularized, redefined (meaning changed), applied (moved into a new area),
  critique (pushback).
  For each: year, kind, title (the paper title, or how the evidence names the work,
  e.g. "Good, 'Speculations Concerning the First Ultraintelligent Machine'"),
  why (one sentence), evidence IDs, and work_ref: the evidence ID whose own paper IS
  this milestone, or "" if the milestone is a work that the sentences name or cite.

Publication years come from OpenAlex and are occasionally wrong (a modern paper
dated 1800, say). If a sentence clearly does not fit its year (it names later
methods, tools, or events), do not treat it as the origin.

Rules: every era and milestone needs at least one evidence ID. Never use outside
knowledge to add works, dates, or people that the evidence does not mention; it is
fine to leave gaps. Prefer fewer, well-supported items."""

OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "eras": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "start_year": {"type": "integer"},
                    "end_year": {"type": "integer"},
                    "label": {"type": "string"},
                    "meaning": {"type": "string"},
                    "evidence": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["start_year", "end_year", "label", "meaning", "evidence"],
                "additionalProperties": False,
            },
        },
        "milestones": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "year": {"type": "integer"},
                    "kind": {"type": "string", "enum": list(MILESTONE_KINDS)},
                    "title": {"type": "string"},
                    "why": {"type": "string"},
                    "evidence": {"type": "array", "items": {"type": "string"}},
                    "work_ref": {"type": "string"},
                },
                "required": ["year", "kind", "title", "why", "evidence", "work_ref"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["summary", "eras", "milestones"],
    "additionalProperties": False,
}


class AnalyzeError(RuntimeError):
    pass


# Extra instruction so the model writes its labels in the reader's language.
# Paper titles and quotes stay in their original language.
OUTPUT_LANG = {
    "zh": "Write the summary, era labels, era meanings, and every milestone \"why\" in Simplified Chinese. "
    "Keep milestone titles as the work titles in their original language, and keep evidence IDs unchanged.",
}


def build_prompt(t: TermTimeline, lang: str = "en") -> str:
    counts = ", ".join(f"{y}: {c}" for y, c in t.counts.items())
    lines = [
        f"Term: {t.term}" + (f" (also: {', '.join(t.aliases)})" if t.aliases else ""),
        f"Papers per year: {counts}",
        "",
        "Evidence:",
    ]
    for e in t.evidence:
        kind = "title" if e.from_title else "abstract"
        lines.append(f"[{e.eid}] ({e.work.year}, cited {e.work.cited_by}x, {kind} of \"{e.work.title}\") {e.text}")
    if lang in OUTPUT_LANG:
        lines += ["", "Output language: " + OUTPUT_LANG[lang]]
    return "\n".join(lines)


def _title_overlap(a: str, b: str) -> float:
    wa = set(re.findall(r"[a-z0-9]+", a.lower()))
    wb = set(re.findall(r"[a-z0-9]+", b.lower()))
    if not wa or not wb:
        return 0.0
    return len(wa & wb) / min(len(wa), len(wb))


def apply_analysis(t: TermTimeline, data: dict, resolver: OpenAlexClient | None) -> TermTimeline:
    """Keep only evidence-backed items and attach links. Mutates and returns t."""
    by_id = t.evidence_by_id()

    def valid(ids: Any) -> list[str]:
        return [i for i in ids if isinstance(i, str) and i in by_id] if isinstance(ids, list) else []

    def text(v: Any) -> str:
        return v.strip() if isinstance(v, str) else ""

    # Model years are untrusted: keep them in a sane window (same rule as the web app).
    last_year = max([date.today().year, *t.counts]) + 1

    def year(v: Any) -> int | None:
        try:
            y = int(v)
        except (TypeError, ValueError):
            return None
        return y if 1000 <= y <= last_year else None

    data = data if isinstance(data, dict) else {}
    t.summary = text(data.get("summary"))
    t.eras = []
    for e in data.get("eras") or []:
        if not isinstance(e, dict):
            continue
        ev, start, end = valid(e.get("evidence")), year(e.get("start_year")), year(e.get("end_year"))
        if ev and start and end and start <= end:
            t.eras.append(Era(start, end, text(e.get("label")), text(e.get("meaning")), ev))
    t.eras.sort(key=lambda e: e.start_year)

    t.milestones = []
    for m in data.get("milestones") or []:
        if not isinstance(m, dict):
            continue
        ev, y = valid(m.get("evidence")), year(m.get("year"))
        if not ev or m.get("kind") not in MILESTONE_KINDS or not y:
            continue
        ms = Milestone(y, m["kind"], text(m.get("title")), text(m.get("why")), ev)
        ref = m.get("work_ref") if isinstance(m.get("work_ref"), str) else ""
        if ref in by_id:
            ms.work = by_id[ref].work
            ms.link_status = "in-sample"
        elif resolver is not None and ms.title:
            try:
                found = resolver.find_work(ms.title, ms.year)
            except Exception:  # lookups are optional; keep the milestone unlinked
                found = None
            if found and found.year and abs(found.year - ms.year) <= 1 and _title_overlap(found.title, ms.title) >= 0.4:
                ms.work = found
                ms.link_status = "resolved"
        t.milestones.append(ms)
    t.milestones.sort(key=lambda m: m.year)
    return t


def analyze(
    t: TermTimeline,
    client: Any = None,
    resolver: OpenAlexClient | None = None,
    model: str = DEFAULT_MODEL,
    effort: str = "medium",
    lang: str = "en",
) -> TermTimeline:
    if not t.evidence:
        raise AnalyzeError("No sentences use this term, so there is nothing to analyze.")
    if client is None:
        import anthropic

        client = anthropic.Anthropic()
    response = client.messages.create(
        model=model,
        max_tokens=16000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": build_prompt(t, lang)}],
        output_config={"effort": effort, "format": {"type": "json_schema", "schema": OUTPUT_SCHEMA}},
    )
    if response.stop_reason == "refusal":
        raise AnalyzeError("The model declined this request (stop_reason=refusal).")
    if response.stop_reason == "max_tokens":
        raise AnalyzeError("The model's answer was cut off (max_tokens).")
    text = next((b.text for b in response.content if b.type == "text"), None)
    if text is None:
        raise AnalyzeError("The model returned no text block.")
    t.model = model
    return apply_analysis(t, json.loads(text), resolver)


EARLY_DATE_NOTE = (
    "Earliest record found, from before the term was in regular use. "
    "OpenAlex dates for rare early records are sometimes wrong; check the paper."
)


def baseline(t: TermTimeline) -> TermTimeline:
    """No-LLM view: earliest uses and most-cited works become milestones."""
    onset = onset_year(t.counts)
    seen: set[str] = set()
    firsts = [e for e in t.evidence if not (e.work.work_id in seen or seen.add(e.work.work_id))]
    # One pre-onset record at most (flagged), then the earliest uses from the onset on.
    before = [e for e in firsts if onset and (e.work.year or 0) < onset][:1]
    after = [e for e in firsts if not onset or (e.work.year or 0) >= onset][: 3 - len(before)]
    for e in before:
        t.milestones.append(Milestone(e.work.year or 0, "origin", e.work.title, EARLY_DATE_NOTE, [e.eid], e.work, "in-sample"))
    for e in after:
        t.milestones.append(Milestone(e.work.year or 0, "origin", e.work.title, "One of the earliest uses found.", [e.eid], e.work, "in-sample"))
    first: dict[str, Evidence] = {}
    for e in t.evidence:
        first.setdefault(e.work.work_id, e)
    top = sorted(first.values(), key=lambda e: -e.work.cited_by)
    for e in top[:5]:
        if e.work.work_id in {m.work.work_id for m in t.milestones if m.work}:
            continue
        t.milestones.append(
            Milestone(e.work.year or 0, "popularized", e.work.title, f"Cited {e.work.cited_by} times.", [e.eid], e.work, "in-sample")
        )
    t.milestones.sort(key=lambda m: m.year)
    return t
