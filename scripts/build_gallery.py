"""Build docs/index.html (the GitHub Pages gallery) from docs/terms/*.json.

Usage: uv run python scripts/build_gallery.py
"""

from __future__ import annotations

import html
import json
from pathlib import Path

from idealine.render_term import CSS, REPO_URL

DOCS = Path(__file__).resolve().parent.parent / "docs"


def sparkline(counts: list[list[int]], w: int = 220, h: int = 44) -> str:
    if not counts:
        return ""
    years = [y for y, _ in counts]
    lo, hi = min(years), max(years)
    peak = max(c for _, c in counts) or 1
    bw = w / max(1, hi - lo + 1)
    bars = "".join(
        f'<rect x="{(y - lo) * bw:.1f}" y="{h - max(1.5, (c / peak) ** 0.5 * h):.1f}" '
        f'width="{max(1.0, bw * 0.7):.1f}" height="{max(1.5, (c / peak) ** 0.5 * h):.1f}" rx="1"/>'
        for y, c in counts
    )
    return f'<svg class="spark" viewBox="0 0 {w} {h}" width="{w}" height="{h}" aria-hidden="true">{bars}</svg>'


def first_sentence(text: str) -> str:
    text = (text or "").strip()
    cut = text.find(". ")
    return text if cut < 0 else text[: cut + 1]


def card(d: dict, href: str) -> str:
    e = html.escape
    years = [y for y, _ in d["counts"]]
    span = f"{min(years)}–{max(years)}" if years else ""
    return (
        f'<a class="tcard" href="{e(href)}" data-q="{e((d["term"] + " " + " ".join(d["aliases"])).lower())}">'
        f'<h2>{e(d["term"])}</h2><p>{e(first_sentence(d.get("summary", "")))}</p>'
        f'{sparkline(d["counts"])}'
        f'<div class="tmeta">{d["total"]:,} papers · {span} · {len(d["milestones"])} milestones</div></a>'
    )


PAGE_CSS = """
.hero{max-width:720px}
.hero p{font-size:1.1rem;margin:0 0 6px}
.search{width:100%;max-width:420px;font:inherit;padding:10px 14px;border:1px solid var(--line);border-radius:999px;background:var(--panel);color:var(--fg);margin:20px 0 6px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;margin-top:18px}
.tcard{display:block;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px 18px;color:inherit;text-decoration:none;transition:border-color .15s,transform .15s}
.tcard:hover,.tcard:focus{border-color:var(--accent);transform:translateY(-2px)}
.tcard h2{font-family:ui-serif,Georgia,serif;font-size:1.25rem;margin:0 0 6px}
.tcard p{margin:0 0 10px;font-size:.9rem;color:var(--muted)}
.spark{display:block;width:100%;height:44px;fill:var(--bar)}
.tmeta{font-size:.78rem;color:var(--muted);margin-top:8px}
.how{margin-top:40px;max-width:720px}
.how pre{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:12px 14px;overflow-x:auto;font-size:.85rem}
"""


def main() -> None:
    terms = []
    for path in sorted((DOCS / "terms").glob("*.json")):
        d = json.loads(path.read_text())
        terms.append((d, f"terms/{path.stem}.html"))
    terms.sort(key=lambda x: -x[0]["total"])
    cards = "".join(card(d, href) for d, href in terms)
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>idealine · where did this AI idea come from?</title>
<meta name="description" content="Interactive timelines of where AI terms came from and how their meaning changed, with a quote behind every step.">
<style>{CSS}{PAGE_CSS}</style></head>
<body><main>
<div class="brand"><a href="{REPO_URL}">idealine</a></div>
<div class="hero">
<h1>Where did this AI idea come from?</h1>
<p>AI moves fast, and its words move with it. Pick a term to see when it first appeared, who shaped it, and how its meaning shifted, on one timeline. Every step shows the sentence it is based on.</p>
</div>
<input class="search" type="search" placeholder="Filter terms…" aria-label="Filter terms" oninput="filter(this.value)">
<div class="grid" id="grid">{cards}</div>
<section class="how">
<h2>Trace your own term</h2>
<p>Works for any field OpenAlex covers, not just AI. No API key needed for the basic view; add an Anthropic key for eras and milestones.</p>
<pre>uvx --from git+{REPO_URL} idealine "mixture of experts" --alias "mixture-of-experts"</pre>
<p>Missing a term? <a href="{REPO_URL}/issues/new?title=Term+request:+">Request it</a> and I will add it here.</p>
</section>
<footer>Data: <a href="https://openalex.org">OpenAlex</a>. Eras and milestones are proposed by Claude from quoted sentences only and can be wrong; the quotes are the evidence. <a href="{REPO_URL}">Source on GitHub</a>.</footer>
</main>
<script>
function filter(q){{q=q.toLowerCase().trim();document.querySelectorAll('.tcard').forEach(c=>{{c.style.display=!q||c.dataset.q.includes(q)?'':'none'}})}}
</script>
</body></html>
"""
    (DOCS / "index.html").write_text(page, encoding="utf-8")
    print(f"Wrote {DOCS / 'index.html'} with {len(terms)} terms")


if __name__ == "__main__":
    main()
