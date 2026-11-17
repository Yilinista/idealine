from __future__ import annotations

import json
from types import SimpleNamespace

import httpx
import pytest

from idealine.s2 import BASE_URL, S2Client

SEED = {
    "paperId": "seed1",
    "title": "Training Compute-Optimal Large Language Models",
    "year": 2022,
    "publicationDate": "2022-03-29",
    "url": "https://www.semanticscholar.org/paper/seed1",
    "authors": [{"name": "Jordan Hoffmann"}, {"name": "Sebastian Borgeaud"}],
    "citationCount": 1000,
}


def _citing(pid, title, year, date, contexts, influential=False, cites=10):
    return {
        "contexts": contexts,
        "intents": ["background"],
        "isInfluential": influential,
        "citingPaper": {
            "paperId": pid,
            "title": title,
            "year": year,
            "publicationDate": date,
            "url": f"https://www.semanticscholar.org/paper/{pid}",
            "authors": [{"name": f"Author {pid}"}],
            "citationCount": cites,
        },
    }


CITATIONS = [
    _citing("p1", "Replicating Chinchilla", 2024, "2024-04-01",
            ["We find that scaling data and parameters equally is not compute-optimal; our fit gives a different ratio."],
            influential=True),
    _citing("p2", "Beyond Chinchilla-Optimal", 2023, "2023-12-31",
            ["Chinchilla scaling laws ignore inference cost, so smaller models trained on more data are preferable."]),
    _citing("p3", "A Survey of LLMs", 2023, None,
            ["Large language models have grown rapidly [12]."]),
    _citing("p4", "No Context Paper", 2022, "2022-09-01", []),
]


def make_transport(calls: list[str], fail_first: int = 0):
    state = {"fails": fail_first}

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request.url.path)
        if state["fails"] > 0:
            state["fails"] -= 1
            return httpx.Response(429, headers={"retry-after": "1"})
        if request.url.path.endswith("/citations"):
            offset = int(request.url.params.get("offset", 0))
            limit = int(request.url.params.get("limit", 100))
            page = CITATIONS[offset : offset + limit]
            nxt = offset + limit if offset + limit < len(CITATIONS) else None
            body = {"offset": offset, "data": page}
            if nxt is not None:
                body["next"] = nxt
            return httpx.Response(200, json=body)
        if request.url.path.endswith("/paper/missing"):
            return httpx.Response(404, json={"error": "Paper not found"})
        return httpx.Response(200, json=SEED)

    return handler


@pytest.fixture
def s2_calls():
    return []


@pytest.fixture
def s2(s2_calls):
    http = httpx.Client(base_url=BASE_URL, transport=httpx.MockTransport(make_transport(s2_calls)))
    return S2Client(api_key="", http=http, sleep=lambda s: None, log=lambda m: None)


class FakeMessages:
    """Stands in for anthropic.Anthropic().messages; returns canned judgments."""

    def __init__(self, judge, stop_reason="end_turn"):
        self.judge = judge
        self.stop_reason = stop_reason
        self.requests = []

    def create(self, **kwargs):
        self.requests.append(kwargs)
        prompt = kwargs["messages"][0]["content"]
        n = sum(1 for line in prompt.splitlines() if line.startswith("["))
        judgments = [self.judge(i, prompt) for i in range(n)]
        text = json.dumps({"judgments": [j for j in judgments if j is not None]})
        return SimpleNamespace(
            stop_reason=self.stop_reason,
            content=[SimpleNamespace(type="text", text=text)],
        )


class FakeClient:
    def __init__(self, judge, stop_reason="end_turn"):
        self.messages = FakeMessages(judge, stop_reason)
