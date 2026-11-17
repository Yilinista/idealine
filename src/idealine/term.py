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
from importlib import resources
from typing import Any

from .openalex import OpenAlexClient, OpenAlexError, Work, phrase_query

MILESTONE_KINDS = ("ancestor", "origin", "coined", "popularized", "redefined", "applied", "critique")
DEFAULT_MODEL = "claude-opus-5-5"
MAX_SENTENCE_CHARS = 450


@dataclass
class Evidence:
    eid: str
    text: str
    work: Work
    from_title: bool = False
    sense: str = ""  # the model's sense key for this quote (S1, S2, ...), or "unclear"


@dataclass
class Sense:
    """A meaning of the words in the evidence. related=False: it only shares the words
    and is kept out of the eras and milestones."""
    label: str
    meaning: str
    evidence: list[str]
    key: str = ""
    related: bool = False


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
    in_sense: bool | None = None  # model: the quotes use the term in the followed meaning
    coinage: bool | None = None  # model: the work presents the name as new ("we call this ...")
    shift: str = ""  # model, for redefined/applied: broadening, narrowing, metaphor, new field


@dataclass
class TermTimeline:
    term: str
    aliases: list[str]
    counts: dict[int, int]
    evidence: list[Evidence]
    quarters: list[tuple[str, int]] = field(default_factory=list)  # ("2025-Q1", n) for young terms
    totals: dict[int, int] = field(default_factory=dict)  # all OpenAlex works per year, for shares
    totals_asof: str = ""  # when those totals were fetched
    roots: dict | None = None  # reference publication year spectroscopy, when requested
    undated: list[tuple[int, int]] = field(default_factory=list)  # (year, n) papers dated only by year
    eras: list[Era] = field(default_factory=list)
    milestones: list[Milestone] = field(default_factory=list)
    summary: str = ""
    model: str | None = None
    generated: str = field(default_factory=lambda: date.today().isoformat())
    lang: str = "en"  # language the model wrote its labels in
    meaning: str = ""  # the reader's own description of the meaning they want traced
    focus: str = ""  # the meaning the timeline follows, as the model names it
    other_senses: list[Sense] = field(default_factory=list)
    senses: list[Sense] = field(default_factory=list)  # every meaning found, related or not
    entity: dict | None = None  # the organization or software the term names (Wikidata)
    hidden_before: dict | None = None  # {n, year, named}: papers left out before a year
    older_use: dict | None = None  # {n, year}: papers using the words before the name existed
    misdated: list[dict] = field(default_factory=list)  # early records that cite later work

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


def fine_years(counts: dict[int, int]) -> list[int]:
    """Years to show by quarter: when real use spans at most three calendar years,
    a yearly axis has only two or three bars. Otherwise none."""
    onset = onset_year(counts)
    if onset is None or not counts:
        return []
    last = max(counts)
    return list(range(onset, last + 1)) if last - onset <= 2 else []


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


def _totals_file() -> dict:
    try:
        return json.loads((resources.files("idealine") / "web" / "oa-totals.json").read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        return {}


def load_totals() -> dict[int, int]:
    """All OpenAlex works per year, shipped as idealine/web/oa-totals.json (refresh with
    `idealine totals`), so shares need no extra request."""
    return {int(y): int(c) for y, c in _totals_file().get("totals", [])}


def totals_asof() -> str:
    """The date the shipped totals were fetched (its last year was not over then)."""
    return str(_totals_file().get("fetched", ""))


def count_in_set(works: dict[str, Work]) -> None:
    """For each sampled work, count how many other sampled works cite it. A paper that
    papers using the term cite matters to the term; a famous paper that mentions it in
    passing does not (Litmaps' "map connectivity")."""
    for w in works.values():
        w.in_set = 0
    for w in works.values():
        for r in set(w.refs):
            if r != w.work_id and r in works:
                works[r].in_set += 1


def in_focus(t: TermTimeline) -> list[Evidence]:
    """Quotes in the followed meaning: tagged with a related sense, or all quotes when
    the model tagged none (free view, older data)."""
    related = {s.key for s in t.senses if s.related}
    if not related or not any(e.sense for e in t.evidence):
        return t.evidence
    return [e for e in t.evidence if e.sense in related]


def roots_plan(evidence: list[Evidence], max_papers: int = 100, max_refs: int = 2000) -> tuple[int, list[str], dict[str, int]]:
    """Which references to look up for the roots view (same rule as core.js rootsPlan)."""
    seen: set[str] = set()
    papers = [e.work for e in evidence if not (e.work.work_id in seen or seen.add(e.work.work_id))]
    papers.sort(key=lambda w: (-w.in_set, -w.cited_by))
    top = papers[:max_papers]
    n: dict[str, int] = {}
    for w in top:
        for r in set(w.refs):
            n[r] = n.get(r, 0) + 1
    ids = [(r, c) for r, c in n.items() if c >= 2]
    if len(ids) < 50:
        ids = list(n.items())
    ids.sort(key=lambda rc: -rc[1])
    return len(top), [r for r, _ in ids[:max_refs]], n


def rpys(items: list[dict], max_peaks: int = 5) -> dict:
    """Reference publication year spectroscopy (Marx et al. 2014): cited works per
    publication year, and the years well above the median of their 5-year window."""
    by_year: dict[int, int] = {}
    for it in items:
        if isinstance(it.get("year"), int):
            by_year[it["year"]] = by_year.get(it["year"], 0) + it["n"]
    if not by_year:
        return {"spectrum": [], "peaks": []}
    lo, hi = min(by_year), max(by_year)
    spectrum = [[y, by_year.get(y, 0)] for y in range(lo, hi + 1)]
    total = sum(c for _, c in spectrum)

    def med(y: int) -> int:
        return sorted(by_year.get(y + d, 0) for d in (-2, -1, 0, 1, 2))[2]

    cands = [(y, c) for y, c in spectrum if c >= max(3, total * 0.01) and c - med(y) > 0]
    cands.sort(key=lambda yc: -(yc[1] - med(yc[0])))
    peaks = []
    for y, c in cands[:max_peaks]:
        top = max((it for it in items if it.get("year") == y), key=lambda it: it["n"])
        peaks.append({"year": y, "count": c, "title": top["title"], "url": top["url"], "authors": top["authors"], "cites": top["n"]})
    return {"spectrum": spectrum, "peaks": sorted(peaks, key=lambda p: p["year"])}


def find_roots(client: OpenAlexClient, t: TermTimeline) -> dict:
    """Look up the years of the works the term's papers cite (about 1 request per 100)."""
    papers, ids, cites = roots_plan(in_focus(t))
    items = [{"year": w.year, "n": cites.get(w.work_id, 0), "title": w.title, "url": w.url, "authors": w.short_authors}
             for w in client.works_by_ids(ids)]
    return {**rpys(items), "papers": papers, "refs": len(ids)}


STRAY_MAX, STRAY_PER_YEAR = 30, 5


def name_scope(counts: dict[int, int], entity: dict | None) -> tuple[int | None, dict | None]:
    """(since, older_use): leave out the years before a name existed when they look like
    stray, misdated records (few, scattered, outnumbered by later papers); otherwise the
    words had an older meaning, so keep them and say so. Same rule as nameScope in web/core.js."""
    if not entity or not isinstance(entity.get("floor"), int):
        return None, None
    floor = entity["floor"]
    pre = [c for y, c in counts.items() if y < floor]
    before, after = sum(pre), sum(c for y, c in counts.items() if y >= floor)
    if not before:
        return None, None
    if before <= STRAY_MAX and after > before and all(c <= STRAY_PER_YEAR for c in pre):
        return floor, None
    return None, {"n": before, "year": floor}


COPYRIGHT = re.compile(r"(?:©|\(c\)|copyright)\s*(\d{4})\b", re.IGNORECASE)


def copyright_year(w: Work) -> int:
    """Latest copyright year in a record's own text ("© 2025", "(c) 2025", "Copyright 2025")."""
    return max([int(m) for m in COPYRIGHT.findall(f"{w.title or ''} {w.abstract or ''}")] + [0])


def cites_later(client: OpenAlexClient, works, onset: int | None, max_papers: int = 25) -> list[tuple[Work, int, str]]:
    """Early records whose date cannot be right, as (work, later year, why). Checks the
    papers from before the onset: copyrighted two or more years later within the term's
    active period ('copyright'), or citing work published more than a year later ('cites').
    Same rules as citesLater in web/core.js."""
    suspects = [w for w in works if onset is not None and w.year and w.year < onset][:max_papers]
    out: list[tuple[Work, int, str]] = []
    rest = []
    for w in suspects:
        c = copyright_year(w)
        if c >= w.year + 2 and c >= onset:
            out.append((w, c, "copyright"))
        elif w.refs:
            rest.append(w)
    if not rest:
        return out
    ids = list(dict.fromkeys(r for w in rest for r in w.refs))[:300]
    years = {w.work_id: w.year or 0 for w in client.works_by_ids(ids)}
    for w in rest:
        late = max([years.get(r, 0) for r in w.refs] + [0])
        if late > w.year + 1:
            out.append((w, late, "cites"))
    return out


def harvest(
    client: OpenAlexClient,
    term: str,
    aliases: list[str],
    earliest: int = 25,
    top_cited: int = 150,
    recent: int = 60,
    max_evidence: int = 160,
    fine: bool | None = None,
    entity: dict | None = None,
    since: int | None = None,
) -> TermTimeline:
    """entity: what wikidata.lookup_entity found for the term; since: leave out earlier years."""
    # Search with singular/plural variants too, but keep only the user's spellings as aliases.
    spellings = with_inflections(term, aliases)
    query = phrase_query(term, spellings)
    counts = client.year_counts(query)
    scope_since, older_use = name_scope(counts, entity)
    asked = since
    since = asked if asked is not None else scope_since
    hidden_before = None
    if since is not None:
        n = sum(c for y, c in counts.items() if y < since)
        if n:
            hidden_before = {"n": n, "year": since, "named": since == scope_since}
        counts = {y: c for y, c in counts.items() if y >= since}
    if asked is not None:
        older_use = None
    # Young terms are also counted by quarter (extra requests): by default only with a key.
    if fine is None:
        fine = bool(getattr(client, "has_key", False))
    years = fine_years(counts) if fine else []
    quarters, undated = client.quarter_counts(query, years) if years else ([], [])
    pattern = term_pattern(term, spellings)

    # Four requests per term (OpenAlex bills per request): earliest uses,
    # most-cited overall, most-cited of the last two years, and the counts above.
    def timeline(evidence: list[Evidence], bad: list[tuple[Work, int, str]]) -> TermTimeline:
        return TermTimeline(term=term, aliases=aliases, counts=counts, evidence=evidence, quarters=quarters, undated=undated,
                            entity=entity, hidden_before=hidden_before, older_use=older_use,
                            misdated=[{"title": w.title, "year": w.year, "url": w.url, "cites": c, "why": why} for w, c, why in bad])

    if not counts:
        return timeline([], [])
    works: dict[str, Work] = {}
    for w in client.works(query, "publication_date:asc", earliest, since=since):
        works.setdefault(w.work_id, w)
    for w in client.works(query, "cited_by_count:desc", top_cited, since=since):
        works.setdefault(w.work_id, w)
    latest = max(counts)
    for w in client.works(query, "cited_by_count:desc", recent, since=max(latest - 1, since if since is not None else latest - 1)):
        works.setdefault(w.work_id, w)
    # Drop early records that cite later work (best effort: one or two small requests).
    try:
        bad = cites_later(client, works.values(), onset_year(counts))
    except OpenAlexError:
        bad = []
    for w, _, _ in bad:
        works.pop(w.work_id, None)
        if w.year in counts:
            counts[w.year] -= 1
            if counts[w.year] <= 0:
                del counts[w.year]

    count_in_set(works)
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
    return timeline(evidence, bad)


# --- analyze -------------------------------------------------------------------

SYSTEM_PROMPT = """You are a careful historian of ideas. You trace where a technical
term came from and how its meaning changed, using only the evidence given.

You get: the term, its number of papers per year, and numbered sentences (E1, E2,
...) from papers that use it, each with year, title, and citation count.

The same words often name unrelated things: a sports "super agent" and a software
"super agent" share a name, not a history. First pick the meaning to follow: the one
the reader describes under "Meaning the reader has in mind", if given; otherwise the
meaning most common in the newest papers. Eras, milestones, and the summary follow
only that meaning, plus earlier ideas the evidence shows it grew out of (as
ancestor). Meanings that merely share the words are listed in senses with related: false,
never in eras or milestones.

Return:
- focus: one sentence naming the meaning this timeline follows.
- summary: two plain sentences a newcomer can read: where the term came from and
  what it mostly means now.
- senses: every distinct meaning of the words in the evidence, keyed S1, S2, ... For
  each: a 1-4 word label, a one-line definition as the quotes use it, and related:
  true for the followed meaning, its sub-senses, and earlier ideas it grew out of;
  false for meanings that merely share the words. Split the followed meaning into
  sub-senses only where the quotes clearly use it differently (for example a method
  versus a product category).
- quote_senses: for every evidence ID, the key of the sense that sentence uses, or
  "unclear" when you cannot tell. Do not guess.
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
  Also for each: in_sense (true if its quotes use the term in the followed meaning),
  coinage (true only if the work itself presents the name as new, e.g. "we call this
  ..." or "we introduce the term"), and shift: for redefined or applied, one of
  broadening, narrowing, metaphor, new field; otherwise none.

Publication years come from OpenAlex and are occasionally wrong (a modern paper
dated 1800, say). If a sentence clearly does not fit its year (it names later
methods, tools, or events), do not treat it as the origin.

Rules: every era and milestone needs at least one evidence ID. Never use outside
knowledge to add works, dates, or people that the evidence does not mention; it is
fine to leave gaps. Prefer fewer, well-supported items."""

OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "focus": {"type": "string"},
        "summary": {"type": "string"},
        "senses": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "key": {"type": "string"},
                    "label": {"type": "string"},
                    "definition": {"type": "string"},
                    "related": {"type": "boolean"},
                },
                "required": ["key", "label", "definition", "related"],
                "additionalProperties": False,
            },
        },
        "quote_senses": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"id": {"type": "string"}, "sense": {"type": "string"}},
                "required": ["id", "sense"],
                "additionalProperties": False,
            },
        },
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
                    "in_sense": {"type": "boolean"},
                    "coinage": {"type": "boolean"},
                    "shift": {"type": "string", "enum": ["none", "broadening", "narrowing", "metaphor", "new field"]},
                },
                "required": ["year", "kind", "title", "why", "evidence", "work_ref", "in_sense", "coinage", "shift"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["focus", "summary", "senses", "quote_senses", "eras", "milestones"],
    "additionalProperties": False,
}


class AnalyzeError(RuntimeError):
    pass


# Extra instruction so the model writes its labels in the reader's language.
# Paper titles and quotes stay in their original language.
OUTPUT_LANG = {
    "zh": "Write the focus, summary, era labels, era meanings, sense labels and definitions, and every milestone \"why\" in Simplified Chinese. "
    "Keep milestone titles as the work titles in their original language, and keep evidence IDs unchanged.",
}


def scope_lines(t: TermTimeline) -> list[str]:
    """What the model should know about names and left-out records. Same text as core.js."""
    out, e, h, o, k = [], t.entity, t.hidden_before, t.older_use, len(t.misdated)
    if e:
        kind = "an organization" if e["kind"] == "organization" else "software"
        desc = f" ({e['description']})" if e.get("description") else ""
        out.append(f"The term names {kind}: {e['label']}{desc}, since {e['date']} (Wikidata {e['id']}).")
    if h:
        out.append(f"Papers dated before {h['year']} were left out ({h['n']})" + (
            f": well before {e['label']} existed, so their dates are wrong or the words mean something else."
            if h.get("named") and e else ", as the reader asked."))
    if o and e:
        out.append(f"{o['n']} papers dated before {o['year']} use these words before {e['label']} existed: that is another meaning of the words.")
    if k:
        out.append(f"{k} early paper{' was' if k == 1 else 's were'} left out because the date is wrong: "
                   f"{'it cites or is copyrighted' if k == 1 else 'they cite or are copyrighted'} years later.")
    return out


def build_prompt(t: TermTimeline, lang: str = "en") -> str:
    counts = ", ".join(f"{y}: {c}" for y, c in t.counts.items())
    lines = [
        f"Term: {t.term}" + (f" (also: {', '.join(t.aliases)})" if t.aliases else ""),
        *([f"Meaning the reader has in mind: {t.meaning}"] if t.meaning else []),
        f"Papers per year: {counts}",
        *([f"Papers per quarter (papers dated only by year left out): {', '.join(f'{k}: {c}' for k, c in t.quarters)}"] if t.quarters else []),
        *scope_lines(t),
        "",
        "Evidence:",
    ]
    for e in t.evidence:
        kind = "title" if e.from_title else "abstract"
        within = f", cited by {e.work.in_set} of these papers" if e.work.in_set else ""
        lines.append(f"[{e.eid}] ({e.work.year}, cited {e.work.cited_by}x{within}, {kind} of \"{e.work.title}\") {e.text}")
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
    t.focus = text(data.get("focus"))
    # Senses and per-quote tags. Unrelated senses become other_senses (with their quotes).
    t.senses = []
    for s in (data.get("senses") or [])[:12] if isinstance(data.get("senses"), list) else []:
        if isinstance(s, dict) and text(s.get("key")) and text(s.get("label")):
            t.senses.append(Sense(text(s.get("label")), text(s.get("definition")), [], key=text(s.get("key")),
                                  related=s.get("related") is not False))
    keys = {s.key: s for s in t.senses}
    for e in t.evidence:
        e.sense = ""
    for q in data.get("quote_senses") or [] if isinstance(data.get("quote_senses"), list) else []:
        if isinstance(q, dict) and q.get("id") in by_id:
            k = text(q.get("sense"))
            if k in keys:
                by_id[q["id"]].sense = k
                keys[k].evidence.append(q["id"])
            elif k == "unclear":
                by_id[q["id"]].sense = "unclear"
    t.other_senses = [s for s in t.senses if not s.related and s.evidence][:6]
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
        ms.in_sense = m["in_sense"] if isinstance(m.get("in_sense"), bool) else None
        ms.coinage = m["coinage"] if isinstance(m.get("coinage"), bool) else None
        ms.shift = m["shift"] if m.get("shift") in ("broadening", "narrowing", "metaphor", "new field") else ""
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
    t.lang = lang if lang in OUTPUT_LANG else "en"
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
    # Key papers: first by how many sampled papers that use the term cite them, then overall.
    top = sorted(first.values(), key=lambda e: (-e.work.in_set, -e.work.cited_by))
    for e in top[:5]:
        if e.work.work_id in {m.work.work_id for m in t.milestones if m.work}:
            continue
        why = (f"Cited by {e.work.in_set} of the sampled papers that use the term ({e.work.cited_by} times overall)."
               if e.work.in_set else f"Cited {e.work.cited_by} times.")
        t.milestones.append(Milestone(e.work.year or 0, "popularized", e.work.title, why, [e.eid], e.work, "in-sample"))
    # Recent use: the most-cited paper of each of the last three years in the sample, so
    # the surge after takeoff has markers too (the all-time most-cited are usually older).
    used = {m.work.work_id for m in t.milestones if m.work}
    for y in sorted({e.work.year for e in first.values() if e.work.year}, reverse=True)[:3]:
        cands = [e for e in first.values() if e.work.year == y and e.work.work_id not in used]
        if not cands:
            continue
        e = max(cands, key=lambda e: e.work.cited_by)
        used.add(e.work.work_id)
        t.milestones.append(Milestone(y, "popularized", e.work.title,
                                      f"The most-cited use from {y} in the sample ({e.work.cited_by} citations).", [e.eid], e.work, "in-sample"))
    t.milestones.sort(key=lambda m: m.year)
    return t
