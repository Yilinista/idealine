"""Label each citing sentence's stance toward the claim with Claude."""

from __future__ import annotations

import json
import re
from typing import Any

from .models import STANCES, Candidate, Paper

DEFAULT_MODEL = "claude-opus-5-5"
BATCH_SIZE = 20

SYSTEM_PROMPT = """You label how citing sentences relate to one research claim.

You get a claim, the seed paper that made it, and numbered sentences from later
papers that cite the seed paper. For each sentence, pick one stance:

- supports: the citing authors give evidence for the claim or confirm it holds.
- refutes: they report evidence against the claim or say it does not hold.
- refines: they keep the core idea but revise it, e.g. change a constant, add a
  condition, narrow the scope, or correct the method.
- mentions: they cite the claim as background without testing or changing it.
- unrelated: the sentence cites the seed paper for something other than this claim.

Judge only from the sentence. Do not use outside knowledge of the papers. If the
sentence is ambiguous, prefer "mentions" over "supports" or "refutes".

For "evidence", copy the shortest span of the sentence (verbatim, at most 30
words) that justifies the stance. For "note", write one plain sentence saying
what the citing paper does with the claim."""

OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "judgments": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "stance": {"type": "string", "enum": list(STANCES)},
                    "evidence": {"type": "string"},
                    "note": {"type": "string"},
                },
                "required": ["id", "stance", "evidence", "note"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["judgments"],
    "additionalProperties": False,
}


class ClassifyError(RuntimeError):
    pass


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().lower()


def evidence_in_context(evidence: str, context: str) -> bool:
    ev = _normalize(evidence).strip(" .\"'")
    return bool(ev) and ev in _normalize(context)


def build_prompt(claim: str, seed: Paper, batch: list[Candidate]) -> str:
    lines = [
        f"Claim: {claim}",
        f"Seed paper: {seed.title} ({seed.year or 'n.d.'})",
        "",
        "Citing sentences:",
    ]
    for i, cand in enumerate(batch):
        lines.append(f"[{i}] ({cand.paper.year or 'n.d.'}, {cand.paper.title}) {cand.context}")
    return "\n".join(lines)


def classify(
    claim: str,
    seed: Paper,
    candidates: list[Candidate],
    client: Any = None,
    model: str = DEFAULT_MODEL,
    effort: str = "low",
) -> list[Candidate]:
    """Fill stance/evidence/note on each candidate in place and return them."""
    if client is None:
        import anthropic

        client = anthropic.Anthropic()

    for start in range(0, len(candidates), BATCH_SIZE):
        batch = candidates[start : start + BATCH_SIZE]
        response = client.messages.create(
            model=model,
            max_tokens=16000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": build_prompt(claim, seed, batch)}],
            output_config={
                "effort": effort,
                "format": {"type": "json_schema", "schema": OUTPUT_SCHEMA},
            },
        )
        if response.stop_reason == "refusal":
            raise ClassifyError("The model declined this batch (stop_reason=refusal).")
        if response.stop_reason == "max_tokens":
            raise ClassifyError("The model's answer was cut off (max_tokens). Try --max-contexts lower.")
        text = next((b.text for b in response.content if b.type == "text"), None)
        if text is None:
            raise ClassifyError("The model returned no text block.")
        judgments = json.loads(text)["judgments"]

        by_id = {j["id"]: j for j in judgments if isinstance(j.get("id"), int)}
        for i, cand in enumerate(batch):
            j = by_id.get(i)
            if j is None or j.get("stance") not in STANCES:
                cand.stance = "mentions"
                cand.note = "Not labeled by the model; shown as a mention."
                continue
            cand.stance = j["stance"]
            cand.evidence = j.get("evidence", "").strip()
            cand.evidence_verified = evidence_in_context(cand.evidence, cand.context)
            cand.note = j.get("note", "").strip()
    return candidates
