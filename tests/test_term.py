from __future__ import annotations

import json
import re
from types import SimpleNamespace

import httpx

from idealine.cli import main, slugify
from idealine.openalex import BASE_URL, OpenAlexClient, abstract_from_index, phrase_query
from idealine.render_term import to_html, to_markdown
from idealine.term import OUTPUT_LANG, TermTimeline, analyze, apply_analysis, baseline, build_prompt, harvest, sentences_with_term, term_pattern


def _inv(text):
    idx = {}
    for i, w in enumerate(text.split(" ")):
        idx.setdefault(w, []).append(i)
    return idx


def _work(wid, title, year, abstract, cited=0):
    return {
        "id": f"https://openalex.org/{wid}", "display_name": title, "publication_year": year,
        "publication_date": f"{year}-01-01", "doi": f"https://doi.org/10.1/{wid}", "cited_by_count": cited,
        "authorships": [{"author": {"display_name": f"Author {wid}"}}],
        "abstract_inverted_index": _inv(abstract) if abstract else None,
    }


WORKS = [
    _work("W1", "Levels of Organization in General Intelligence", 2007,
          "We discuss seed AI. A seed AI could undergo recursive self-improvement, as Good (1965) speculated.", 48),
    _work("W2", "Can Intelligence Explode?", 2012, "The intelligence explosion idea of Good is examined.", 22),
    _work("W3", "Self-Improving Coding Agents", 2025,
          "Our agent performs recursive self-improvement by editing its own scaffold. It beats baselines.", 300),
    _work("W4", "Recursive Self-Improvement in LLM Training", 2026, None, 5),
]
COUNTS = [{"key": "2007", "count": 1}, {"key": "2012", "count": 5}, {"key": "2025", "count": 177}, {"key": "2026", "count": 1291}]
GOOD = _work("W9", "Speculations Concerning the First Ultraintelligent Machine", 1965, None, 900)


def oa_handler(calls):
    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(str(request.url))
        p = request.url.params
        if p.get("group_by"):
            return httpx.Response(200, json={"meta": {"count": 1474}, "group_by": COUNTS})
        if "Ultraintelligent" in (p.get("search") or ""):
            return httpx.Response(200, json={"results": [GOOD]})
        flt = p.get("filter") or ""
        m = re.search(r",publication_year:(\d{4})$", flt)
        if m:
            year = int(m.group(1))
            return httpx.Response(200, json={"results": [w for w in WORKS if w["publication_year"] == year]})
        return httpx.Response(200, json={"results": WORKS})
    return handler


def make_oa(calls=None):
    calls = [] if calls is None else calls
    http = httpx.Client(base_url=BASE_URL, transport=httpx.MockTransport(oa_handler(calls)))
    return OpenAlexClient(http=http, sleep=lambda s: None, log=lambda m: None)


ANALYSIS = {
    "summary": "The term grew out of Good's intelligence explosion idea. It now mostly names agents that improve their own code.",
    "eras": [
        {"start_year": 2007, "end_year": 2023, "label": "AI safety thought experiment", "meaning": "A hypothetical AGI.", "evidence": ["E1", "E2"]},
        {"start_year": 2024, "end_year": 2026, "label": "Engineering practice", "meaning": "Agents edit their own scaffolds.", "evidence": ["E4", "E99"]},
        {"start_year": 2010, "end_year": 2011, "label": "No evidence", "meaning": "dropped", "evidence": ["E77"]},
    ],
    "milestones": [
        {"year": 1965, "kind": "ancestor", "title": "Speculations Concerning the First Ultraintelligent Machine", "why": "Named as the source.", "evidence": ["E2"], "work_ref": ""},
        {"year": 2007, "kind": "origin", "title": "Levels of Organization in General Intelligence", "why": "Earliest use.", "evidence": ["E2"], "work_ref": "E1"},
        {"year": 2025, "kind": "redefined", "title": "Self-Improving Coding Agents", "why": "Practical sense.", "evidence": ["E4"], "work_ref": "E4"},
        {"year": 2020, "kind": "coined", "title": "Made up", "why": "No evidence.", "evidence": [], "work_ref": ""},
    ],
}


class FakeLLM:
    def __init__(self, payload, stop_reason="end_turn"):
        self.requests = []
        outer = self

        class M:
            def create(self, **kw):
                outer.requests.append(kw)
                return SimpleNamespace(stop_reason=stop_reason,
                                       content=[SimpleNamespace(type="text", text=json.dumps(payload))])
        self.messages = M()


# --- helpers -------------------------------------------------------------------

def test_abstract_rebuilt_from_inverted_index():
    assert abstract_from_index({"world": [1], "hello": [0]}) == "hello world"
    assert abstract_from_index(None) == ""


def test_phrase_query_quotes_each_spelling():
    assert phrase_query("recursive self-improvement", ["RSI loop"]) == '"recursive self-improvement" OR "RSI loop"'


def test_term_pattern_treats_space_and_hyphen_alike():
    pat = term_pattern("recursive self-improvement", [])
    assert pat.search("Recursive self improvement is")
    assert pat.search("recursive-self-improvement")
    assert not pat.search("recursive improvement")


def test_sentences_with_term_keeps_only_matching_sentences():
    pat = term_pattern("seed AI", [])
    assert sentences_with_term("Intro here. A seed AI grows. Unrelated end.", pat) == ["A seed AI grows."]


# --- pipeline ------------------------------------------------------------------

def test_harvest_collects_counts_and_evidence_in_date_order():
    t = harvest(make_oa(), "recursive self-improvement", [])
    assert t.counts == {2007: 1, 2012: 5, 2025: 177, 2026: 1291}
    assert [e.work.work_id for e in t.evidence] == ["W1", "W3", "W4"]  # W2 never uses the phrase
    assert t.evidence[2].from_title  # W4 has no abstract; its title uses the term


def test_harvest_uses_four_requests():
    calls = []
    harvest(make_oa(calls), "recursive self-improvement", [])
    assert len(calls) == 4


def test_daily_budget_error_fails_fast_with_advice():
    sleeps = []
    http = httpx.Client(base_url=BASE_URL, transport=httpx.MockTransport(
        lambda r: httpx.Response(429, headers={"retry-after": "44115"}, json={"error": "Rate limit exceeded"})))
    oa = OpenAlexClient(http=http, sleep=sleeps.append, log=lambda m: None)
    try:
        oa.year_counts('"x"')
        raise AssertionError("expected OpenAlexError")
    except Exception as err:
        assert "OPENALEX_API_KEY" in str(err) and "12 h" in str(err)
    assert sleeps == []


def test_api_key_sent_as_bearer(monkeypatch):
    monkeypatch.setenv("OPENALEX_API_KEY", "test-key")
    oa = OpenAlexClient()
    assert oa._http.headers["Authorization"] == "Bearer test-key"


def test_harvest_cap_keeps_latest_years():
    t = harvest(make_oa(), "recursive self-improvement", [], max_evidence=2)
    years = [e.work.year for e in t.evidence]
    assert len(years) == 2 and years[0] == 2007 and years[-1] >= 2025


def test_apply_analysis_drops_unsupported_items_and_links_works():
    oa = make_oa()
    t = harvest(oa, "recursive self-improvement", [])
    t.evidence.append(t.evidence[0].__class__("E4", "Our agent performs recursive self-improvement.", t.evidence[1].work))
    apply_analysis(t, ANALYSIS, resolver=oa)
    assert [e.label for e in t.eras] == ["AI safety thought experiment", "Engineering practice"]
    assert t.eras[0].evidence == ["E1", "E2"] and t.eras[1].evidence == ["E4"]
    kinds = [(m.year, m.kind, m.link_status) for m in t.milestones]
    assert kinds == [(1965, "ancestor", "resolved"), (2007, "origin", "in-sample"), (2025, "redefined", "in-sample")]
    assert t.milestones[0].work.title.startswith("Speculations")


def test_analyze_sends_schema_and_effort():
    oa = make_oa()
    t = harvest(oa, "recursive self-improvement", [])
    llm = FakeLLM(ANALYSIS)
    analyze(t, client=llm, resolver=oa)
    req = llm.requests[0]
    assert req["output_config"]["effort"] == "medium"
    assert req["output_config"]["format"]["type"] == "json_schema"
    assert "[E1]" in req["messages"][0]["content"] and "2026: 1291" in req["messages"][0]["content"]
    assert t.model == "claude-opus-5-5"


def test_baseline_without_llm_uses_earliest_and_most_cited():
    t = baseline(harvest(make_oa(), "recursive self-improvement", []))
    assert t.milestones[0].title == "Levels of Organization in General Intelligence"
    assert {m.kind for m in t.milestones} <= {"origin", "popularized"}


def test_render_term_page_is_self_contained_and_escaped():
    oa = make_oa()
    t = harvest(oa, "recursive <self>-improvement", [])
    apply_analysis(t, {"summary": "</script><b>x</b>", "eras": [], "milestones": []}, resolver=None)
    page = to_html(t)
    assert page.startswith("<!doctype html>")
    assert "</script><b>" not in page
    assert "&lt;self&gt;" in page.split("<script")[0]
    assert "<script src" not in page


def test_render_term_markdown_lists_milestones():
    oa = make_oa()
    t = harvest(oa, "recursive self-improvement", [])
    apply_analysis(t, ANALYSIS, resolver=oa)
    md = to_markdown(t)
    assert "**1965 · ancestor**" in md and "## Eras" in md


def test_cli_term_no_llm(tmp_path):
    code = main(["recursive self-improvement", "--no-llm", "--out", str(tmp_path)], oa=make_oa())
    assert code == 0
    page = (tmp_path / f"{slugify('recursive self-improvement')}.html").read_text()
    assert "Levels of Organization" in page


def test_cli_term_with_llm(tmp_path):
    oa = make_oa()
    code = main(["recursive self-improvement", "--yes", "--out", str(tmp_path)], oa=oa, llm_client=FakeLLM(ANALYSIS))
    assert code == 0
    page = (tmp_path / "recursive-self-improvement.html").read_text()
    assert "AI safety thought experiment" in page
    assert "Engineering practice" not in page  # its only evidence (E4) does not exist in this run


def test_cli_render_rebuilds_html_from_json(tmp_path):
    main(["recursive self-improvement", "--no-llm", "--out", str(tmp_path)], oa=make_oa())
    page = tmp_path / "recursive-self-improvement.html"
    original = page.read_text()
    page.unlink()
    assert main(["render", str(tmp_path / "recursive-self-improvement.json")]) == 0
    assert page.read_text() == original


def test_cli_term_unknown_phrase(tmp_path):
    def empty(request):
        if request.url.params.get("group_by"):
            return httpx.Response(200, json={"meta": {"count": 0}, "group_by": []})
        return httpx.Response(200, json={"results": []})
    http = httpx.Client(base_url=BASE_URL, transport=httpx.MockTransport(empty))
    oa = OpenAlexClient(http=http, sleep=lambda s: None, log=lambda m: None)
    assert main(["zzqx flurb", "--no-llm", "--out", str(tmp_path)], oa=oa) == 1


def test_apply_analysis_tolerates_loose_model_json():
    from idealine.openalex import Work
    from idealine.term import Evidence, TermTimeline, apply_analysis

    w = Work("W1", "Paper", 2020, "2020-01-01", "https://x", 3)
    t = TermTimeline("x", [], {2020: 5}, [Evidence("E1", "x here", w)])

    class Boom:
        def find_work(self, *a):
            raise RuntimeError("network")

    apply_analysis(t, {
        "summary": None,
        "eras": [{"start_year": "1990s", "end_year": 2000, "label": "a", "meaning": "b", "evidence": ["E1"]},
                 {"start_year": 2019, "end_year": 2020, "label": None, "meaning": "m", "evidence": ["E1"]},
                 "junk"],
        "milestones": [{"year": 2020, "kind": "origin", "title": "t", "why": None, "evidence": ["E1"], "work_ref": []},
                       {"year": 2_000_000_000, "kind": "origin", "title": "huge", "why": "", "evidence": ["E1"], "work_ref": "E1"}],
    }, Boom())
    assert [(e.start_year, e.label) for e in t.eras] == [(2019, "")]
    assert [(m.year, m.link_status, m.why) for m in t.milestones] == [(2020, "unresolved", "")]


def test_inline_json_escapes_every_angle_bracket():
    from idealine.render_term import html_from_data

    d = {"term": "x", "aliases": [], "summary": "<!--<script>", "counts": [[2020, 1]], "total": 1, "model": None,
         "generated": "2026-11-17", "evidenceCount": 0, "eras": [], "milestones": []}
    page = html_from_data(d)
    data = page.split('id="data">', 1)[1].split("</script>", 1)[0]
    assert "<" not in data


def test_reading_pages_share_a_self_contained_reader_and_source_metadata():
    from idealine.render_term import html_from_data

    d = {"term": "term", "counts": [], "quotes": [], "total": 0, "model": None,
         "generated": "2026-11-17", "evidenceCount": 0, "eras": [], "milestones": []}
    page = html_from_data(d, "../")
    assert 'data-part="reading"' in page
    assert 'IdealineReading.mountPage' in page
    assert 'data-reading-lang="zh"' in page
    assert 'data-reading-back href="../"' in page
    assert '<script src' not in page
    assert page.count('</script>') == 2
    # The timeline leads the page again; the reader draws it into these parts.
    assert 'class="timeline-main"' in page and 'data-part="chart"' in page


def test_reviewed_guides_match_saved_quotes_in_both_languages():
    from pathlib import Path
    from idealine.render_term import with_reading_guide

    terms = Path(__file__).resolve().parents[1] / "docs" / "terms"
    for prefix in (terms, terms / "zh"):
        for slug in ("world-model", "in-context-learning", "vibe-coding"):
            d = json.loads((prefix / f"{slug}.json").read_text())
            prepared = with_reading_guide(d)
            assert len(prepared["readingGuide"]["entries"]) == 3
            for entry in prepared["readingGuide"]["entries"]:
                q = next(q for q in d["quotes"] if q["id"] == entry["id"])
                assert q["text"] == entry["text"]
                assert q["url"] == entry["url"]
                assert entry["checkedUrl"].startswith("https://arxiv.org/abs/")


def test_inflections_match_shared_table():
    import json
    from pathlib import Path

    from idealine.term import inflections, with_inflections

    cases = json.loads((Path(__file__).parent / "inflection_cases.json").read_text(encoding="utf-8"))
    for phrase, want in cases.items():
        assert inflections(phrase) == want, phrase
    assert with_inflections("scaling laws", ["scaling law"]) == ["scaling law"]


def test_filter_uses_exact_search():
    assert OpenAlexClient._filter('"agentic"') == 'title_and_abstract.search.exact:"agentic"'


def test_onset_and_flagged_early_record():
    from idealine.openalex import Work
    from idealine.term import Evidence, TermTimeline, baseline, onset_year

    assert onset_year({1800: 1, 2024: 50, 2025: 900}) == 2024
    ev = [Evidence(f"E{i}", "x", Work(w, "T" + w, y, None, "https://x", c))
          for i, (w, y, c) in enumerate([("a", 1800, 1), ("b", 2024, 5), ("c", 2024, 9), ("d", 2025, 99)], 1)]
    t = baseline(TermTimeline("x", [], {1800: 1, 2024: 50, 2025: 900}, ev))
    origins = [m for m in t.milestones if m.kind == "origin"]
    assert [m.year for m in origins] == [1800, 2024, 2024]
    assert "sometimes wrong" in origins[0].why
    assert origins[1].why == "One of the earliest uses found."


def test_chinese_sentences_split():
    from idealine.term import sentences_with_term, term_pattern

    out = sentences_with_term("第一句没有。基于注意力机制的模型很好！最后一句。", term_pattern("注意力机制", []))
    assert out == ["基于注意力机制的模型很好！"]


def test_build_prompt_output_language():
    t = TermTimeline(term="x", aliases=[], counts={2020: 1}, evidence=[])
    assert "Output language" not in build_prompt(t)
    assert build_prompt(t, "zh").endswith("Output language: " + OUTPUT_LANG["zh"])
    assert "Output language" not in build_prompt(t, "fr")


def test_fine_years_only_for_young_terms():
    from idealine.term import fine_years

    assert fine_years({1800: 1, 2025: 120, 2026: 700}) == [2025, 2026]
    assert fine_years({2019: 40, 2022: 300, 2026: 900}) == []
    assert fine_years({}) == []


def test_quarter_counts_skip_future_and_split_year_only_dates():
    from datetime import date

    seen = []

    def handler(request: httpx.Request) -> httpx.Response:
        flt = request.url.params["filter"]
        seen.append(flt)
        start, end = re.search(r"from_publication_date:([\d-]+),to_publication_date:([\d-]+)", flt).groups()
        return httpx.Response(200, json={"meta": {"count": 5 if start == end else 10}})

    client = OpenAlexClient(http=httpx.Client(base_url=BASE_URL, transport=httpx.MockTransport(handler)),
                            sleep=lambda s: None, log=lambda m: None)
    quarters, undated = client.quarter_counts('"x"', [2025, 2026], today=date(2026, 5, 3))
    assert quarters == [("2025-Q1", 10), ("2025-Q2", 10), ("2025-Q3", 10), ("2025-Q4", 10), ("2026-Q1", 10), ("2026-Q2", 10)]
    assert undated == [(2025, 5), (2026, 5)]
    assert any("from_publication_date:2025-01-02,to_publication_date:2025-03-31" in f for f in seen)
    assert any("from_publication_date:2025-10-01,to_publication_date:2025-12-31" in f for f in seen)
    assert len(seen) == 8


def test_other_senses_are_kept_apart_and_need_evidence():
    from idealine.openalex import Work
    from idealine.term import Evidence

    ev = [Evidence("E1", "a super agent for sports", Work("a", "A", 2009, None, "https://x", 1)),
          Evidence("E2", "an AI super agent", Work("b", "B", 2026, None, "https://x", 1))]
    t = TermTimeline("super agent", [], {2009: 1, 2026: 1}, ev, meaning="AI agents")
    assert "Meaning the reader has in mind: AI agents" in build_prompt(t)
    apply_analysis(t, {"focus": "AI agents that use tools", "summary": "s", "eras": [],
                       "milestones": [{"year": 2026, "kind": "coined", "title": "B", "why": "w", "evidence": ["E2"], "work_ref": "E2",
                                       "in_sense": True, "coinage": False, "shift": "none"}],
                       "senses": [{"key": "S1", "label": "AI agent", "definition": "d", "related": True},
                                  {"key": "S2", "label": "Sports agent", "definition": "m", "related": False},
                                  {"key": "S3", "label": "No quotes", "definition": "m", "related": False}],
                       "quote_senses": [{"id": "E1", "sense": "S2"}, {"id": "E2", "sense": "S1"}, {"id": "E9", "sense": "S1"}]}, None)
    assert t.focus == "AI agents that use tools"
    assert [s.label for s in t.other_senses] == ["Sports agent"]
    assert [e.sense for e in t.evidence] == ["S2", "S1"]
    assert (t.milestones[0].in_sense, t.milestones[0].coinage, t.milestones[0].shift) == (True, False, "")
    from idealine.render_term import to_data
    d = to_data(t)
    assert d["otherSenses"][0]["evidence"][0]["text"] == "a super agent for sports"
    assert d["meaning"] == "AI agents"
    assert d["quotes"][1]["sense"] == "S1" and d["senses"][1]["related"] is False
    assert d["milestones"][0]["checks"] == {"inSense": True, "coinage": False}


def test_in_set_citations_rank_key_papers():
    from idealine.openalex import Work
    from idealine.term import Evidence, count_in_set

    a = Work("A", "Famous", 2020, None, "u", 9000, refs=[])
    b = Work("B", "Core", 2021, None, "u", 10, refs=["A"])
    c = Work("C", "User 1", 2022, None, "u", 1, refs=["B", "B", "C"])
    d = Work("D", "User 2", 2023, None, "u", 1, refs=["B"])
    works = {w.work_id: w for w in (a, b, c, d)}
    count_in_set(works)
    assert (a.in_set, b.in_set, c.in_set) == (1, 2, 0)
    early = [Work(f"O{i}", f"Old {i}", 2010, None, "u", 0) for i in range(3)]
    ev = [Evidence(f"E{i}", "x", w) for i, w in enumerate((*early, a, b, c, d), 1)]
    t = baseline(TermTimeline("x", [], {2010: 3, 2020: 5, 2021: 5, 2022: 5, 2023: 5}, ev))
    pop = [m for m in t.milestones if m.kind == "popularized"]
    assert sorted(pop, key=lambda m: -m.work.in_set)[0].work.work_id == "B"
    assert "Cited by 2 of the sampled papers" in next(m.why for m in pop if m.work.work_id == "B")
    assert "cited by 2 of these papers" in build_prompt(t)


def test_work_reads_field_and_references():
    from idealine.openalex import work_from_json

    w = work_from_json({"id": "https://openalex.org/W1", "display_name": "T", "primary_topic": {"field": {"display_name": "Computer Science"}},
                        "referenced_works": ["https://openalex.org/W2", None]})
    assert w.field_name == "Computer Science" and w.refs == ["W2"]


def test_shipped_totals_load():
    from idealine.term import load_totals

    tot = load_totals()
    assert tot and tot[2020] > 1_000_000


def test_totals_cover_gap_years_and_carry_their_date():
    from idealine.render_term import to_data
    from idealine.term import load_totals, totals_asof

    t = TermTimeline(term="x", aliases=[], counts={2001: 3, 2004: 5}, evidence=[])
    t.totals, t.totals_asof = load_totals(), totals_asof()
    d = to_data(t)
    assert [y for y, _ in d["totals"]] == [2001, 2002, 2003, 2004]
    assert re.match(r"\d{4}-\d{2}-\d{2}$", d["totalsAsOf"])


def test_rpys_finds_peak_years_and_their_top_work():
    from idealine.term import rpys

    items = [{"year": 1990 + i, "n": 2, "title": f"T{i}", "url": "u", "authors": "A"} for i in range(10)]
    items += [{"year": 1995, "n": 30, "title": "Root paper", "url": "u", "authors": "B"}]
    r = rpys(items)
    assert r["peaks"][0]["year"] == 1995 and r["peaks"][0]["title"] == "Root paper"
    assert r["spectrum"][0] == [1990, 2] and len(r["spectrum"]) == 10
    assert rpys([]) == {"spectrum": [], "peaks": []}


def test_reading_guide_is_removed_when_the_term_has_no_guide():
    from idealine.render_term import with_reading_guide

    d = {"term": "no such term in the guides", "quotes": [], "readingGuide": {"entries": [{"id": "E1"}]}}
    assert "readingGuide" not in with_reading_guide(d)


def test_baseline_marks_the_last_three_years():
    from idealine.openalex import Work
    from idealine.term import Evidence
    rows = [("a", 2000, 900), ("b", 2001, 800), ("c", 2002, 700), ("d", 2003, 600), ("e", 2004, 500), ("f", 2005, 400),
            ("g", 2006, 300), ("h", 2024, 4), ("i", 2024, 9), ("j", 2025, 7), ("k", 2026, 1)]
    ev = [Evidence(f"E{n}", "x", Work(i, "T" + i, y, None, "u", c)) for n, (i, y, c) in enumerate(rows)]
    t = baseline(TermTimeline("x", [], {2000: 3, 2024: 40, 2025: 90, 2026: 30}, ev))
    assert [m.work.work_id for m in t.milestones if m.year >= 2024] == ["i", "j", "k"]
    ids = [m.work.work_id for m in t.milestones]
    assert len(ids) == len(set(ids))


def test_seal_key_matches_the_browser_fixture():
    import base64
    import importlib.util
    import json as _json
    from pathlib import Path

    import pytest
    pytest.importorskip("cryptography")
    root = Path(__file__).resolve().parent.parent
    spec = importlib.util.spec_from_file_location("seal_key", root / "scripts" / "seal_key.py")
    sk = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(sk)
    fx = _json.loads((root / "tests" / "fixtures" / "sealed-key.json").read_text())
    b = fx["blob"]
    again = sk.seal(fx["key"], " ABCD-efgh-jkmn", "openai", base64.b64decode(b["salt"]), base64.b64decode(b["iv"]), b["iter"])
    assert again == b
    assert len(sk.normalize(sk.new_code())) == 12
