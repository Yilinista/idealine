"""Names (Wikidata) and misdated records: the same rules as web/core.js."""
from __future__ import annotations

import httpx

from idealine.openalex import BASE_URL, OpenAlexClient
from idealine.term import cites_later, harvest, name_scope, scope_lines
from idealine.wikidata import lookup_entity, start_date


def _item(p31, inc=None, pub=None, links=20, label="X", desc="d"):
    claims = {"P31": [{"rank": "normal", "mainsnak": {"datavalue": {"value": {"id": c}}}} for c in p31]}
    for p, t in (("P571", inc), ("P577", pub)):
        if t:
            claims[p] = [{"rank": "normal", "mainsnak": {"datavalue": {"value": {"time": t}}}}]
    return {"labels": {"en": {"value": label}}, "descriptions": {"en": {"value": desc}},
            "sitelinks": {f"w{i}": {} for i in range(links)}, "claims": claims}


def _wikidata(hits, entities, calls=None):
    def get(params):
        if calls is not None:
            calls.append(params)
        if params["action"] == "wbsearchentities":
            return {"search": [{"id": i, "match": {"type": "label", "text": t}} for i, t in hits]}
        return {"entities": {i: entities[i] for i in params["ids"].split("|") if i in entities}}
    return get


def test_lookup_entity_organization():
    calls = []
    e = lookup_entity("OpenAI", _wikidata([("Q1", "OpenAI")], {"Q1": _item(["Q4830453"], inc="+2015-12-08T00:00:00Z", label="OpenAI", desc="AI lab")}, calls))
    assert e == {"id": "Q1", "label": "OpenAI", "description": "AI lab", "kind": "organization", "date": "2015-12-08",
                 "year": 2015, "floor": 2015, "url": "https://www.wikidata.org/wiki/Q1"}
    assert len(calls) == 2


def test_lookup_entity_software_one_step_up_and_exact_spelling():
    parent = {"claims": {"P279": [{"rank": "normal", "mainsnak": {"datavalue": {"value": {"id": "Q166142"}}}}]}}
    e = lookup_entity("Cursor", _wikidata([("Q9", "cursor"), ("Q2", "Cursor")],
                                          {"Q2": _item(["Q13741"], pub="+2023-01-00T00:00:00Z"), "Q13741": parent}))
    assert (e["id"], e["kind"], e["date"], e["floor"]) == ("Q2", "software", "2023-01", 2022)


def test_lookup_entity_rejects():
    def one(ent, hits=(("Q1", "x"),)):
        return lookup_entity("x", _wikidata(list(hits), {"Q1": ent, "Q5": {"claims": {}}}))
    assert one(_item(["Q5"], inc="+2020-00-00T00:00:00Z")) is None
    assert one(_item(["Q7889", "Q7397"], pub="+2019-05-03T00:00:00Z")) is None
    assert one(_item(["Q7397"], pub="+2019-05-03T00:00:00Z", links=2)) is None
    assert one(_item(["Q7397"])) is None
    assert one(_item(["Q7397"], pub="+2019-05-03T00:00:00Z"), hits=(("Q1", "xy"),)) is None

    def offline(params):
        raise httpx.ConnectError("offline")
    assert lookup_entity("x", offline) is None


def test_start_date_takes_the_earliest_and_skips_deprecated():
    e = _item(["Q7397"], inc="+2016-00-00T00:00:00Z", pub="+2016-08-24T00:00:00Z")
    e["claims"]["P571"].append({"rank": "deprecated", "mainsnak": {"datavalue": {"value": {"time": "+1999-01-01T00:00:00Z"}}}})
    assert start_date(e) == {"year": 2016, "date": "2016"}


def test_name_scope_matches_core_js():
    e = {"floor": 2015}
    assert name_scope({1986: 2, 2011: 2, 2016: 5, 2020: 900}, e) == (2015, None)
    assert name_scope({1990: 400, 2010: 600, 2021: 50, 2024: 900}, e) == (None, {"n": 1000, "year": 2015})
    assert name_scope({2016: 5}, e) == (None, None)
    assert name_scope({1986: 2}, None) == (None, None)


def _inv(text):
    idx = {}
    for i, w in enumerate(text.split(" ")):
        idx.setdefault(w, []).append(i)
    return idx


def _w(wid, year, abstract, refs=()):
    return {"id": f"https://openalex.org/{wid}", "display_name": f"Paper {wid}", "publication_year": year,
            "publication_date": f"{year}-01-01", "doi": f"https://doi.org/10.1/{wid}", "cited_by_count": 1,
            "authorships": [], "abstract_inverted_index": _inv(abstract), "referenced_works": [f"https://openalex.org/{r}" for r in refs]}


def _oa(ref_year, calls):
    works = [_w("W1", 1990, "We study chain of thought in people.", refs=["W77"]),
             _w("W2", 2022, "Chain of thought prompting elicits reasoning."),
             _w("W3", 2025, "Models learn a chain of thought.")]

    def handler(request):
        calls.append(request.url.params.get("filter") or "")
        p = request.url.params
        if p.get("group_by"):
            return httpx.Response(200, json={"group_by": [{"key": "1990", "count": 1}, {"key": "2022", "count": 10}, {"key": "2025", "count": 30}]})
        if "openalex_id:" in (p.get("filter") or ""):
            return httpx.Response(200, json={"results": [{"id": "https://openalex.org/W77", "display_name": "Ref", "publication_year": ref_year}]})
        return httpx.Response(200, json={"results": works})
    http = httpx.Client(base_url=BASE_URL, transport=httpx.MockTransport(handler))
    return OpenAlexClient(http=http, sleep=lambda s: None, log=lambda m: None)


def test_harvest_drops_a_record_that_cites_later_work():
    calls = []
    t = harvest(_oa(2021, calls), "chain of thought", [])
    assert len(calls) == 5
    assert t.counts == {2022: 10, 2025: 30}
    assert all(e.work.year != 1990 for e in t.evidence)
    assert t.misdated == [{"title": "Paper W1", "year": 1990, "url": "https://doi.org/10.1/W1", "cites": 2021}]
    assert scope_lines(t) == ["1 early paper was left out because it cites work published years after its own date (the date is wrong)."]


def test_harvest_keeps_a_record_with_older_references():
    t = harvest(_oa(1985, []), "chain of thought", [])
    assert t.counts == {1990: 1, 2022: 10, 2025: 30}
    assert t.misdated == []


def test_harvest_with_a_name_leaves_out_earlier_years():
    calls = []
    entity = {"id": "Q1", "label": "CoT Inc", "description": "", "kind": "organization", "date": "2020", "year": 2020, "floor": 2020, "url": "u"}
    t = harvest(_oa(2021, calls), "chain of thought", [], entity=entity)
    assert t.counts == {2022: 10, 2025: 30}
    assert t.hidden_before == {"n": 1, "year": 2020, "named": True}
    assert calls[1].endswith(",publication_year:>2019")
    assert scope_lines(t)[:2] == [
        "The term names an organization: CoT Inc, since 2020 (Wikidata Q1).",
        "Papers dated before 2020 were left out (1): well before CoT Inc existed, so their dates are wrong or the words mean something else.",
    ]


def test_harvest_since_asked_by_reader():
    t = harvest(_oa(1985, []), "chain of thought", [], since=2023)  # the mock ignores the year filter
    assert t.counts == {2025: 30}
    assert t.hidden_before == {"n": 11, "year": 2023, "named": False}
    assert scope_lines(t) == ["Papers dated before 2023 were left out (11), as the reader asked."]


def test_cites_later_needs_an_onset():
    assert cites_later(None, [], None) == []


def test_name_scope_keeps_real_older_meanings():
    e = {"floor": 1994}
    assert name_scope({1980: 40, 1990: 60, 2020: 90000}, e) == (None, {"n": 100, "year": 1994})
    assert name_scope({1990: 12, 2020: 900}, e) == (None, {"n": 12, "year": 1994})
    assert name_scope({1980: 3, 1990: 2}, e) == (None, {"n": 5, "year": 1994})


def test_lookup_entity_ignores_alias_matches():
    def get(params):
        if params["action"] == "wbsearchentities":
            return {"search": [{"id": "Q1", "match": {"type": "alias", "text": "copilot"}}]}
        return {"entities": {"Q1": _item(["Q7397"], pub="+2023-02-07T00:00:00Z")}}
    assert lookup_entity("copilot", get) is None


def test_markdown_carries_the_notes():
    from idealine.render_term import to_markdown
    entity = {"id": "Q1", "label": "CoT Inc", "description": "", "kind": "organization", "date": "2020", "year": 2020, "floor": 2020, "url": "u"}
    md = to_markdown(harvest(_oa(1985, []), "chain of thought", [], entity=entity))
    assert "> The term names an organization: CoT Inc, since 2020 (Wikidata Q1)." in md
