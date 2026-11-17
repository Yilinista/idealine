"""Command-line entry point.

    idealine "recursive self-improvement"            # term mode (default)
    idealine claim "..." --seed arXiv:2203.15556     # claim mode
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

from . import __version__
from .classify import DEFAULT_MODEL, ClassifyError, classify
from .models import Timeline
from .openalex import OpenAlexClient, OpenAlexError
from .rank import rank_contexts
from .render_claim import to_html as claim_html
from .render_claim import to_markdown as claim_markdown
from .render_term import html_from_data, to_data
from .render_term import to_html as term_html
from .render_term import to_markdown as term_markdown
from .s2 import DEFAULT_CACHE_DIR, S2Client, S2Error
from .term import AnalyzeError, Sense, analyze, baseline, find_roots, harvest, load_totals, totals_asof


def slugify(text: str, max_len: int = 50) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:max_len].rstrip("-") or "timeline"


def log(msg: str) -> None:
    print(msg, file=sys.stderr)


def _common(p: argparse.ArgumentParser) -> None:
    p.add_argument("--no-llm", action="store_true", help="Skip the Claude step; no API key needed.")
    p.add_argument("--model", default=DEFAULT_MODEL, help=f"Claude model (default {DEFAULT_MODEL}).")
    p.add_argument("--out", default=".", help="Output directory (default: current directory).")
    p.add_argument("--no-cache", action="store_true", help="Do not reuse cached API responses.")
    p.add_argument("-y", "--yes", action="store_true", help="Do not ask before calling the Claude API.")
    p.add_argument("--version", action="version", version=f"idealine {__version__}")


def term_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="idealine",
        description="Where did this term come from, and how did its meaning change? "
        "Run `idealine claim --help` for claim mode.",
    )
    p.add_argument("term", help='The term, spelled out, e.g. "recursive self-improvement".')
    p.add_argument("--alias", action="append", default=[], help="Another spelling to include (repeatable).")
    p.add_argument("--effort", default="medium", choices=["low", "medium", "high"], help="Model effort (default medium).")
    p.add_argument("--roots", action="store_true", help="Also find the term's roots: the years and works its papers cite most (about 10-20 more OpenAlex requests).")
    p.add_argument("--meaning", default="", help='Which meaning to follow when the words have several, e.g. "AI agents that use tools".')
    p.add_argument("--lang", default="en", choices=["en", "zh"], help="Language of the summary, eras and notes (default en; zh = Simplified Chinese).")
    _common(p)
    return p


def claim_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="idealine claim",
        description="Which later papers support, refute, or refine one claim of a paper?",
    )
    p.add_argument("claim", help="The claim to trace, in one sentence.")
    p.add_argument("--seed", required=True, help="Paper that made it: arXiv:..., DOI:..., or a Semantic Scholar ID.")
    p.add_argument("--max-papers", type=int, default=500, help="Citing papers to fetch (default 500).")
    p.add_argument("--max-contexts", type=int, default=60, help="Citing sentences to keep (default 60).")
    p.add_argument("--effort", default="low", choices=["low", "medium", "high"], help="Model effort (default low).")
    _common(p)
    return p


def confirm(args, what: str) -> bool:
    if args.no_llm:
        return False
    if args.yes:
        return True
    answer = input(f"Send {what} to {args.model}? This uses your Anthropic API credits. [y/N] ")
    if answer.strip().lower() in {"y", "yes"}:
        return True
    log("Skipped the model step. Use --no-llm to skip this question.")
    return False


def run_term(argv: list[str], oa: OpenAlexClient | None, llm_client) -> int:
    args = term_parser().parse_args(argv)
    if re.fullmatch(r"[A-Z0-9]{2,5}", args.term.strip()):
        log(f'Note: "{args.term}" looks like an acronym and may match unrelated fields. '
            'Spelling it out works better, e.g. idealine "recursive self-improvement" --alias RSI')
    oa = oa or OpenAlexClient(cache_dir=None if args.no_cache else DEFAULT_CACHE_DIR, log=log)
    try:
        log(f'Searching OpenAlex for "{args.term}"...')
        t = harvest(oa, args.term, args.alias)
        t.meaning = (args.meaning or "").strip()
        t.totals, t.totals_asof = load_totals(), totals_asof()
    except OpenAlexError as err:
        log(f"Error: {err}")
        return 2
    if not t.counts:
        log("No papers use this exact phrase. Check the spelling or add --alias.")
        return 1
    log(f"  {t.total} papers ({min(t.counts)}–{max(t.counts)}); {len(t.evidence)} sentences use the term.")

    if confirm(args, f"{len(t.evidence)} sentences"):
        log(f"Tracing eras and milestones with {args.model}...")
        try:
            analyze(t, client=llm_client, resolver=oa, model=args.model, effort=args.effort, lang=args.lang)
        except AnalyzeError as err:
            log(f"Error: {err}")
            return 3
    else:
        baseline(t)
    if args.roots:  # after the model, so only papers in the followed meaning count
        log("Finding roots (cited works by year)...")
        try:
            t.roots = find_roots(oa, t)
        except OpenAlexError as err:
            log(f"Roots skipped: {err}")

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    stem = slugify(args.term)
    (out / f"{stem}.md").write_text(term_markdown(t), encoding="utf-8")
    (out / f"{stem}.html").write_text(term_html(t), encoding="utf-8")
    (out / f"{stem}.json").write_text(json.dumps(to_data(t), ensure_ascii=False, indent=1), encoding="utf-8")
    log(f"Wrote {out / (stem + '.html')} (open it in a browser) and {out / (stem + '.md')}")
    return 0


def run_claim(argv: list[str], s2: S2Client | None, llm_client) -> int:
    args = claim_parser().parse_args(argv)
    s2 = s2 or S2Client(cache_dir=None if args.no_cache else DEFAULT_CACHE_DIR)
    try:
        log(f"Looking up seed paper {args.seed}...")
        seed = s2.get_paper(args.seed)
        log(f"  {seed.title} ({seed.year}), {seed.citation_count or 'unknown'} citations")
        log(f"Fetching up to {args.max_papers} citing papers...")
        citations = s2.get_citations(args.seed, max_papers=args.max_papers, total=seed.citation_count)
    except S2Error as err:
        log(f"Error: {err}")
        return 2

    without_context = sum(1 for c in citations if not c.contexts)
    candidates = rank_contexts(args.claim, citations, args.max_contexts)
    log(f"  {len(citations)} citing papers, {without_context} without a citing sentence; kept {len(candidates)} sentences.")
    if not candidates:
        log("No citing sentences found, so there is nothing to show. Try a more-cited seed paper.")
        return 1

    classified = False
    if confirm(args, f"{len(candidates)} sentences"):
        log(f"Labeling stances with {args.model}...")
        try:
            classify(args.claim, seed, candidates, client=llm_client, model=args.model, effort=args.effort)
            classified = True
        except ClassifyError as err:
            log(f"Error: {err}")
            return 3

    timeline = Timeline(
        claim=args.claim, seed=seed, entries=candidates, total_citations=len(citations),
        citations_without_context=without_context, classified=classified,
        model=args.model if classified else None, papers_available=seed.citation_count,
    )
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    stem = slugify(args.claim)
    (out / f"{stem}.md").write_text(claim_markdown(timeline), encoding="utf-8")
    (out / f"{stem}.html").write_text(claim_html(timeline), encoding="utf-8")
    log(f"Wrote {out / (stem + '.html')} and {out / (stem + '.md')}")
    return 0


def main(argv: list[str] | None = None, s2: S2Client | None = None, oa: OpenAlexClient | None = None,
         llm_client=None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    if argv and argv[0] == "claim":
        return run_claim(argv[1:], s2, llm_client)
    if argv and argv[0] == "totals":
        # idealine totals: refresh the shipped per-year totals of all OpenAlex works (2 requests).
        client = oa or OpenAlexClient(cache_dir=None, log=log)
        totals = client.year_totals()
        path = Path(__file__).parent / "web" / "oa-totals.json"
        path.write_text(json.dumps({"fetched": date.today().isoformat(), "totals": [[y, c] for y, c in totals.items()]}), encoding="utf-8")
        log(f"Wrote {path} ({len(totals)} years)")
        return 0
    if argv and argv[0] == "roots":
        # idealine roots page.json [...]: add the roots view to saved data. Re-reads OpenAlex
        # (cached), reuses the saved sense tags, and makes no model call.
        client = oa or OpenAlexClient(cache_dir=DEFAULT_CACHE_DIR, log=log)
        for path in map(Path, argv[1:]):
            d = json.loads(path.read_text())
            t = harvest(client, d["term"], d.get("aliases") or [])
            saved = {q["id"]: q for q in d.get("quotes") or []}
            for e in t.evidence:
                q = saved.get(e.eid)
                e.sense = q.get("sense", "") if q and q.get("text") == e.text else ""
            t.senses = [Sense(s["label"], s.get("definition", ""), [], key=s["key"], related=bool(s.get("related")))
                        for s in d.get("senses") or []]
            matched = sum(1 for e in t.evidence if e.eid in saved and saved[e.eid].get("text") == e.text)
            d["roots"] = find_roots(client, t)
            path.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
            path.with_suffix(".html").write_text(html_from_data(d), encoding="utf-8")
            log(f"Roots for {path}: {len(d['roots']['peaks'])} peaks ({matched}/{len(t.evidence)} quotes matched the saved ones)")
        return 0
    if argv and argv[0] == "render":
        # idealine render page.json [...]: rebuild HTML from saved data, no API calls.
        for path in map(Path, argv[1:]):
            path.with_suffix(".html").write_text(html_from_data(json.loads(path.read_text())), encoding="utf-8")
            log(f"Wrote {path.with_suffix('.html')}")
        return 0
    return run_term(argv, oa, llm_client)


if __name__ == "__main__":
    raise SystemExit(main())
