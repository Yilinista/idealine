from __future__ import annotations

import json
import re
from types import SimpleNamespace

import httpx

from idealine.cli import main, slugify
from idealine.openalex import BASE_URL, OpenAlexClient, abstract_from_index, phrase_query
from idealine.render_term import to_html, to_markdown
from idealine.term import analyze, apply_analysis, baseline, harvest, sentences_with_term, term_pattern


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
