from __future__ import annotations

import httpx
import pytest

from idealine.classify import ClassifyError, classify, evidence_in_context
from idealine.cli import main, slugify
from idealine.models import Candidate, Paper
from idealine.rank import keywords, rank_contexts
from idealine.render_claim import to_html, to_markdown, visible_entries
from idealine.s2 import BASE_URL, S2Client, S2Error

from .conftest import FakeClient, make_transport

CLAIM = "Compute-optimal models should scale data and parameters equally"


# --- Semantic Scholar client ---------------------------------------------------

def test_get_citations_paginates_and_keeps_empty_contexts(s2, s2_calls):
    cites = s2.get_citations("seed1", max_papers=500)
    assert [c.paper.paper_id for c in cites] == ["p1", "p2", "p3", "p4"]
    assert cites[3].contexts == []
    assert cites[0].is_influential


def test_get_citations_respects_max_papers(s2):
    assert len(s2.get_citations("seed1", max_papers=2)) == 2


def test_sample_offsets_cover_whole_list():
    offs = S2Client.sample_offsets(total=4077, max_papers=500)
    assert len(offs) == 5 and offs[0] == 0 and offs[-1] == 3977
    assert S2Client.sample_offsets(total=250, max_papers=500) == [0, 100, 200]


def test_get_citations_samples_when_total_is_large(s2, s2_calls):
    cites = s2.get_citations("seed1", max_papers=100, total=4000)
    assert len(cites) <= 100
    assert sum(p.endswith("/citations") for p in s2_calls) == 1


def test_rank_reserves_slots_for_each_year():
    from idealine.models import Citation

    claim = "alpha beta gamma"
    busy = [Citation(Paper(f"n{i}", f"New {i}", 2026), ["alpha beta gamma"]) for i in range(20)]
    old = [Citation(Paper("o1", "Old", 2022), ["alpha only"])]
    ranked = rank_contexts(claim, busy + old, max_contexts=6)
    assert any(c.paper.year == 2022 for c in ranked)


def test_retries_on_429_then_succeeds():
    calls = []
    sleeps = []
    http = httpx.Client(base_url=BASE_URL, transport=httpx.MockTransport(make_transport(calls, fail_first=2)))
    client = S2Client(api_key="", http=http, sleep=sleeps.append, log=lambda m: None)
    assert client.get_paper("seed1").title.startswith("Training")
    assert sleeps == [1.0, 1.0]


def test_cache_avoids_second_request(tmp_path):
    calls = []
    http = httpx.Client(base_url=BASE_URL, transport=httpx.MockTransport(make_transport(calls)))
    client = S2Client(api_key="", http=http, sleep=lambda s: None, log=lambda m: None, cache_dir=tmp_path)
    client.get_paper("seed1")
    client.get_paper("seed1")
    assert len(calls) == 1


def test_404_gives_clear_error(s2):
    with pytest.raises(S2Error, match="--seed"):
        s2.get_paper("missing")


# --- ranking -------------------------------------------------------------------

def test_keywords_drop_stopwords_and_stem():
    assert keywords("The models should scale parameters") == {"model", "scale", "parameter"}


def test_rank_puts_relevant_sentence_first(s2):
    ranked = rank_contexts(CLAIM, s2.get_citations("seed1"), max_contexts=10)
    assert ranked[0].paper.paper_id == "p1"
    assert ranked[-1].paper.paper_id == "p3"
    assert len(ranked) == 3  # p4 has no contexts


def test_rank_caps_output(s2):
    assert len(rank_contexts(CLAIM, s2.get_citations("seed1"), max_contexts=1)) == 1


# --- classification ------------------------------------------------------------

def _cand(text, pid="x", year=2023):
    return Candidate(paper=Paper(paper_id=pid, title=f"T{pid}", year=year), context=text, score=1.0)


def test_classify_sets_stance_and_verifies_evidence():
    cands = [_cand("Equal scaling is not compute-optimal in our runs."), _cand("LLMs are big.")]

    def judge(i, prompt):
        if i == 0:
            return {"id": 0, "stance": "refutes", "evidence": "Equal scaling is not compute-optimal", "note": "n0"}
        return {"id": 1, "stance": "mentions", "evidence": "made up words", "note": "n1"}

    client = FakeClient(judge)
    classify(CLAIM, Paper("s", "Seed", 2022), cands, client=client)
    assert cands[0].stance == "refutes" and cands[0].evidence_verified
    assert cands[1].stance == "mentions" and not cands[1].evidence_verified
    req = client.messages.requests[0]
    assert req["output_config"]["effort"] == "low"
    assert req["output_config"]["format"]["type"] == "json_schema"


def test_classify_fills_missing_judgment_as_mention():
    cands = [_cand("a"), _cand("b")]
    classify(CLAIM, Paper("s", "Seed"), cands,
             client=FakeClient(lambda i, p: {"id": 0, "stance": "supports", "evidence": "a", "note": ""} if i == 0 else None))
    assert cands[1].stance == "mentions"


def test_classify_batches_requests():
    cands = [_cand(f"sentence {i}") for i in range(45)]
    client = FakeClient(lambda i, p: {"id": i, "stance": "mentions", "evidence": "", "note": ""})
    classify(CLAIM, Paper("s", "Seed"), cands, client=client)
    assert len(client.messages.requests) == 3
    assert all(c.stance == "mentions" for c in cands)


def test_classify_raises_on_refusal():
    client = FakeClient(lambda i, p: None, stop_reason="refusal")
    with pytest.raises(ClassifyError, match="refusal"):
        classify(CLAIM, Paper("s", "Seed"), [_cand("x")], client=client)


def test_evidence_match_ignores_case_and_whitespace():
    assert evidence_in_context("NOT  compute-optimal", "It is not compute-optimal.")
    assert not evidence_in_context("", "anything")


# --- rendering and CLI ----------------------------------------------------------

def test_render_sorts_by_date_and_hides_unrelated(s2):
    from idealine.models import Timeline

    cites = s2.get_citations("seed1")
    cands = rank_contexts(CLAIM, cites, 10)
    for c in cands:
        c.stance = {"p1": "refutes", "p2": "refines", "p3": "unrelated"}[c.paper.paper_id]
    t = Timeline(CLAIM, s2.get_paper("seed1"), cands, len(cites), 1, classified=True, model="m")
    assert [e.paper.paper_id for e in visible_entries(t)] == ["p2", "p1"]
    md = to_markdown(t)
    assert md.index("Beyond Chinchilla") < md.index("Replicating Chinchilla")
    assert "A Survey of LLMs" not in md
    page = to_html(t)
    assert "<!doctype html>" in page and "Refutes (1)" in page


def test_html_escapes_untrusted_text(s2):
    from idealine.models import Timeline

    cand = _cand("<script>alert(1)</script>")
    t = Timeline("<b>claim</b>", s2.get_paper("seed1"), [cand], 1, 0, classified=False)
    page = to_html(t)
    assert "<script>alert(1)</script>" not in page.split("<script>document")[0]
    assert "&lt;b&gt;claim&lt;/b&gt;" in page


def test_slugify():
    assert slugify("Scale data & params equally!") == "scale-data-params-equally"


def test_cli_no_llm_writes_files(tmp_path, s2):
    code = main(["claim", CLAIM, "--seed", "seed1", "--no-llm", "--out", str(tmp_path)], s2=s2)
    assert code == 0
    md = (tmp_path / f"{slugify(CLAIM)}.md").read_text()
    assert "Replicating Chinchilla" in md and "--no-llm" in md
    assert (tmp_path / f"{slugify(CLAIM)}.html").exists()


def test_cli_with_llm_and_yes(tmp_path, s2):
    client = FakeClient(lambda i, p: {"id": i, "stance": "refines", "evidence": "", "note": "revises it"})
    code = main(["claim", CLAIM, "--seed", "seed1", "--yes", "--out", str(tmp_path)], s2=s2, llm_client=client)
    assert code == 0
    assert "**Refines**" in (tmp_path / f"{slugify(CLAIM)}.md").read_text()


def test_cli_declining_prompt_skips_llm(tmp_path, s2, monkeypatch):
    monkeypatch.setattr("builtins.input", lambda _: "n")
    client = FakeClient(lambda i, p: pytest.fail("LLM should not be called"))
    assert main(["claim", CLAIM, "--seed", "seed1", "--out", str(tmp_path)], s2=s2, llm_client=client) == 0


def test_cli_bad_seed_returns_error(tmp_path, s2):
    assert main(["claim", CLAIM, "--seed", "missing", "--no-llm", "--out", str(tmp_path)], s2=s2) == 2
