"""Build docs/index.html (the GitHub Pages gallery) from docs/terms/*.json.

Usage: uv run python scripts/build_gallery.py
"""

from __future__ import annotations

import html
import json
from importlib import resources
from pathlib import Path

from idealine.render_term import CSS, REPO_URL, TIMELINE_JS
from idealine.term import OUTPUT_SCHEMA, SYSTEM_PROMPT

DOCS = Path(__file__).resolve().parent.parent / "docs"
from idealine.render_term import SITE_URL  # noqa: E402
WEB_FILES = ("core.js", "providers.js", "timeline.js", "app.js")
# The page talks only to OpenAlex and the model provider the visitor picks.
CSP = (
    "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; "
    "connect-src https://api.openalex.org https://api.anthropic.com https://api.openai.com "
    "https://generativelanguage.googleapis.com https://openrouter.ai; base-uri 'none'; form-action 'none'"
)


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
.trace{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:18px 20px;margin-top:22px;max-width:760px}
.trace h2{font-family:ui-serif,Georgia,serif;font-size:1.3rem;margin:0 0 4px}
.trace .sub{margin:0 0 14px;color:var(--muted);font-size:.92rem}
.row{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px}
.row>*{flex:1 1 220px;min-width:0}
.trace input,.trace select{width:100%;font:inherit;padding:9px 12px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg)}
.trace label{display:block;font-size:.78rem;color:var(--muted);margin-bottom:3px}
.trace label.check{display:flex;align-items:center;gap:6px;font-size:.85rem;color:var(--fg);margin:0}
.trace label.check input{width:auto}
.trace .privacy{font-size:.82rem;color:var(--muted);margin:6px 0 12px}
.trace .actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px}
.btn{font:inherit;font-weight:600;padding:9px 18px;border-radius:8px;border:1px solid var(--accent);background:var(--accent);color:#fff;cursor:pointer}
.btn:disabled{opacity:.55;cursor:wait}
.btn.ghost{background:transparent;color:var(--accent)}
.linkbtn{font:inherit;font-size:.82rem;background:none;border:0;color:var(--muted);text-decoration:underline;cursor:pointer;padding:0}
.trace details{margin:4px 0 10px;font-size:.85rem}
#status{min-height:1.4em;margin-top:12px;font-size:.9rem;color:var(--muted)}
#status.error{color:var(--critique)}
#result{margin-top:30px;padding-top:6px;border-top:1px solid var(--line)}
#result .actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
.gallery-h{font-family:ui-serif,Georgia,serif;font-size:1.3rem;margin:40px 0 0}
.how{margin-top:40px;max-width:720px}
.how pre{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:12px 14px;overflow-x:auto;font-size:.85rem}
"""


def spec_json() -> str:
    """Prompt, schema, and page assets shared with the web app (one source of truth)."""
    spec = {"system": SYSTEM_PROMPT, "schema": OUTPUT_SCHEMA, "css": CSS, "timelineJs": TIMELINE_JS, "siteUrl": SITE_URL}
    return json.dumps(spec, ensure_ascii=False).replace("<", "\\u003c")


def copy_web_assets() -> None:
    out = DOCS / "assets"
    out.mkdir(exist_ok=True)
    for name in WEB_FILES:
        src = resources.files("idealine") / "web" / name
        (out / name).write_text(src.read_text(encoding="utf-8"), encoding="utf-8")


TRACE_FORM = """
<section class="trace" aria-labelledby="trace-h">
<h2 id="trace-h">Trace any term</h2>
<p class="sub">Any field OpenAlex covers, not just AI. Free without a key; bring your own model key for eras and milestones.</p>
<form id="trace-form" autocomplete="off">
  <div class="row">
    <div><label for="term">Term</label><input id="term" required minlength="2" maxlength="80" placeholder="e.g. mixture of experts"></div>
    <div><label for="aliases">Other spellings (optional, comma-separated)</label><input id="aliases" maxlength="200" placeholder="e.g. mixture-of-experts, MoE layer"></div>
  </div>
  <div class="row">
    <div><label for="provider">Model</label><select id="provider"><option value="none">No model (free: usage curve + key papers)</option></select></div>
  </div>
  <div id="keyrow" hidden>
    <div class="row">
      <div><label for="key">API key</label><input id="key" type="password" spellcheck="false" autocomplete="off"></div>
      <div><label for="model">Model ID</label><input id="model" spellcheck="false"></div>
    </div>
    <div class="actions">
      <label class="check"><input type="checkbox" id="remember"> Remember my keys on this device (not on a shared computer)</label>
      <a id="keylink" target="_blank" rel="noopener noreferrer" href="#">Get a key</a>
    </div>
  </div>
  <p class="privacy" id="privacy"></p>
  <details><summary>More options</summary>
    <p><label for="oakey">OpenAlex key (optional, free; use it if OpenAlex says the daily budget is used up)</label>
    <input id="oakey" type="password" spellcheck="false" autocomplete="off"></p>
  </details>
  <div class="actions">
    <button class="btn" id="go" type="submit">Trace</button>
    <button class="linkbtn" id="forget" type="button">Forget saved keys</button>
  </div>
</form>
<div id="status" role="status" aria-live="polite"></div>
</section>
<section id="result" hidden aria-live="polite">
  <h1 id="r-term"></h1>
  <p class="summary" id="r-summary"></p>
  <p class="meta" id="r-meta"></p>
  <div class="card">
    <div class="hint">Click a dot to see the quotes behind it. Scroll sideways for earlier years.</div>
    <div class="scroller"><div data-part="chart"></div></div>
    <div class="legend" data-part="legend"></div>
    <div class="detail" data-part="detail"></div>
  </div>
  <div class="eras" data-part="eras"></div>
  <div class="actions">
    <button class="btn ghost" id="dl-html" type="button">Download page (.html)</button>
    <button class="btn ghost" id="dl-json" type="button">Download data (.json)</button>
  </div>
</section>
"""


def main() -> None:
    copy_web_assets()
    terms = []
    for path in sorted((DOCS / "terms").glob("*.json")):
        d = json.loads(path.read_text())
        terms.append((d, f"terms/{path.stem}.html"))
    terms.sort(key=lambda x: -x[0]["total"])
    cards = "".join(card(d, href) for d, href in terms)
    scripts = "".join(f'<script src="assets/{n}"></script>' for n in WEB_FILES)
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="{CSP}">
<meta name="referrer" content="no-referrer">
<title>idealine · where did this idea come from?</title>
<meta name="description" content="Interactive timelines of where a term came from and how its meaning changed, with a quote behind every step.">
<style>{CSS}{PAGE_CSS}</style></head>
<body><main>
<div class="brand"><a href="{REPO_URL}">idealine</a></div>
<div class="hero">
<h1>Where did this idea come from?</h1>
<p>AI moves fast, and its words move with it. Type a term to see when it first appeared, who shaped it, and how its meaning shifted, on one timeline. Every step shows the sentence it is based on.</p>
</div>
{TRACE_FORM}
<h2 class="gallery-h">Ready-made timelines</h2>
<input class="search" id="filter" type="search" placeholder="Filter terms…" aria-label="Filter terms">
<div class="grid" id="grid">{cards}</div>
<section class="how">
<h2>Prefer the command line?</h2>
<pre>uvx --from git+{REPO_URL} idealine "mixture of experts" --alias "mixture-of-experts"</pre>
<p>Something wrong or missing? <a href="{REPO_URL}/issues/new">Open an issue</a>. Every change made from feedback is logged in <a href="{REPO_URL}/blob/main/FEEDBACK.md">FEEDBACK.md</a>.</p>
</section>
<footer>Data: <a href="https://openalex.org">OpenAlex</a>. Eras and milestones are proposed by a language model from quoted sentences only and can be wrong; the quotes are the evidence. <a href="{REPO_URL}">Source on GitHub</a> (MIT).</footer>
</main>
<script type="application/json" id="spec">{spec_json()}</script>
{scripts}
</body></html>
"""
    (DOCS / "index.html").write_text(page, encoding="utf-8")
    print(f"Wrote {DOCS / 'index.html'} with {len(terms)} terms")


if __name__ == "__main__":
    main()
