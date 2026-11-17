"""Build docs/index.html (the GitHub Pages gallery) from docs/terms/*.json.

Usage: uv run python scripts/build_gallery.py
"""

from __future__ import annotations

import html
import json
from importlib import resources
from pathlib import Path

from idealine.render_term import CSS, PAGE_TEXT, REPO_URL, TIMELINE_JS
from idealine.term import OUTPUT_LANG, OUTPUT_SCHEMA, SYSTEM_PROMPT

DOCS = Path(__file__).resolve().parent.parent / "docs"
from idealine.render_term import SITE_URL  # noqa: E402
WEB_FILES = ("i18n.js", "core.js", "providers.js", "timeline.js", "app.js")
# The page talks only to OpenAlex and the model provider the visitor picks.
CSP = (
    "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; "
    "connect-src 'self' https://api.openalex.org https://api.anthropic.com https://api.openai.com "
    "https://generativelanguage.googleapis.com https://openrouter.ai; base-uri 'none'; form-action 'none'"
)


def sparkline(counts: list[list[int]], w: int = 240, h: int = 46) -> str:
    if not counts:
        return ""
    years = [y for y, _ in counts]
    lo, hi = min(years), max(years)
    peak = max(c for _, c in counts) or 1
    bw = w / max(1, hi - lo + 1)
    bars = "".join(
        f'<rect x="{(y - lo) * bw:.1f}" y="{h - max(1.5, (c / peak) ** 0.5 * h):.1f}" '
        f'width="{max(1.0, bw * 0.72):.1f}" height="{max(1.5, (c / peak) ** 0.5 * h):.1f}" rx="1"/>'
        for y, c in counts
    )
    return f'<svg class="spark" viewBox="0 0 {w} {h}" preserveAspectRatio="none" aria-hidden="true">{bars}</svg>'


def card(d: dict, href: str, zh_href: str | None = None) -> str:
    e = html.escape
    years = [y for y, _ in d["counts"]]
    span = f"{min(years)}–{max(years)}" if years else ""
    n = len(d["milestones"])
    return (
        f'<a class="tcard" href="{e(href)}" data-href-en="{e(href)}"'
        + (f' data-href-zh="{e(zh_href)}"' if zh_href else "")
        + ">"
        f'<h3>{e(d["term"])}</h3>{sparkline(d["counts"])}'
        f'<div class="tmeta"><span class="cardmeta" data-total="{d["total"]}" data-n="{n}">'
        f'{d["total"]:,} papers · {n} milestones</span> · {span}</div></a>'
    )


LOGO = (
    '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">'
    '<line x1="2" y1="15" x2="20" y2="15" stroke="var(--accent)" stroke-width="2"/>'
    '<circle cx="6" cy="15" r="2.6" fill="var(--origin)"/>'
    '<line x1="12" y1="9" x2="12" y2="15" stroke="var(--coined)" stroke-width="1.5"/><circle cx="12" cy="9" r="2.6" fill="var(--coined)"/>'
    '<line x1="17" y1="5" x2="17" y2="15" stroke="var(--redefined)" stroke-width="1.5"/><circle cx="17" cy="5" r="2.6" fill="var(--redefined)"/></svg>'
)

CHIPS = ("world model", "vibe coding", "reward hacking", "in-context learning", "CRISPR")

PAGE_CSS = """
main{max-width:1120px}
nav{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:.9rem;color:var(--muted)}
nav .logo{display:flex;align-items:center;gap:8px;font-weight:700;color:var(--fg);letter-spacing:-.01em;font-size:1.05rem;text-decoration:none}
nav .links{display:flex;align-items:center;gap:18px}
nav a{color:inherit;text-decoration:none}
nav a:hover{color:var(--fg)}
.langseg{display:inline-flex;border:1px solid var(--line);border-radius:999px;background:var(--panel);padding:2px}
.langseg button{font:inherit;font-size:.8rem;font-weight:600;color:var(--muted);background:none;border:0;border-radius:999px;padding:3px 10px;cursor:pointer}
.langseg button[aria-pressed=true]{background:var(--accent);color:var(--on-accent)}
.langseg button:focus{outline:none}
.langseg button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.keyok{color:var(--origin);font-weight:600}
#keycheck{font-size:.85rem;color:var(--muted)}
#keycheck.ok{color:var(--origin)}
#keycheck.error{color:var(--critique)}
.hero{text-align:center;max-width:760px;margin:60px auto 0}
.hero h1{font-size:clamp(2.1rem,5.4vw,3.6rem);letter-spacing:-.02em;margin:0 0 14px}
.hero>p{font-size:1.1rem;color:var(--ink-soft);margin:0 auto 28px;max-width:600px}
.search{display:flex;align-items:center;gap:8px;background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:7px 7px 7px 22px;box-shadow:var(--shadow);max-width:640px;margin:0 auto}
.search:focus-within{border-color:var(--accent)}
.search input{flex:1;border:0;outline:0;background:transparent;font:inherit;font-size:1.08rem;color:var(--fg);min-width:0;padding:6px 0}
.btn{font:inherit;font-weight:650;border:1px solid var(--accent);border-radius:999px;background:var(--accent);color:var(--on-accent);padding:10px 22px;cursor:pointer;white-space:nowrap}
.btn:disabled{opacity:.55;cursor:wait}
.btn.ghost{background:transparent;color:var(--accent);padding:8px 16px;font-size:.9rem}
.chips{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:18px auto 0;max-width:680px}
.chip{font:inherit;font-size:.86rem;padding:5px 12px;border-radius:999px;background:color-mix(in srgb,var(--accent) 8%,transparent);color:var(--accent);border:1px solid color-mix(in srgb,var(--accent) 28%,transparent);cursor:pointer}
.chip:hover{background:color-mix(in srgb,var(--accent) 15%,transparent)}
.keyline{margin:16px auto 0;font-size:.87rem;color:var(--muted)}
.keyline .linkish{font:inherit;background:none;border:0;padding:0;color:var(--accent);border-bottom:1px dashed var(--accent);cursor:pointer}
.opts{max-width:640px;margin:14px auto 0;text-align:left;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:4px 18px;font-size:.92rem;color:var(--fg)}
.opts>summary{cursor:pointer;color:var(--muted);padding:10px 0;font-size:.88rem}
.opts[open]{padding-bottom:16px}
.row{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px}
.row>*{flex:1 1 220px;min-width:0}
.opts input,.opts select{width:100%;font:inherit;padding:8px 12px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg)}
.opts label{display:block;font-size:.78rem;color:var(--muted);margin-bottom:3px}
.opts label.check{display:flex;align-items:center;gap:6px;font-size:.85rem;color:var(--fg);margin:0}
.opts label.check input{width:auto}
.opts .privacy{font-size:.82rem;color:var(--muted);margin:8px 0 12px}
.opts a{color:var(--accent)}
.actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px}
.linkbtn{font:inherit;font-size:.82rem;background:none;border:0;color:var(--muted);text-decoration:underline;cursor:pointer;padding:0}
.progress{list-style:none;max-width:640px;margin:18px auto 0;padding:12px 18px;text-align:left;background:var(--panel);border:1px solid var(--line);border-radius:14px;font-size:.9rem}
.progress li{position:relative;padding:3px 0 3px 26px;color:var(--muted)}
.progress li::before{content:"";position:absolute;left:4px;top:.55em;width:10px;height:10px;border-radius:50%;border:2px solid var(--line)}
.progress li.done{color:var(--fg)}
.progress li.done::before{content:"✓";border:0;width:auto;height:auto;top:3px;left:3px;color:var(--origin);font-weight:700}
.progress li.active{color:var(--fg);font-weight:600}
.progress li.active::before{border-color:var(--accent);border-top-color:transparent;animation:spin .8s linear infinite}
.progress .clock{font-weight:400;color:var(--muted)}
@keyframes spin{to{transform:rotate(360deg)}}
.tag.pulse{animation:pulse 1.4s ease-in-out infinite}
@keyframes pulse{50%{opacity:.45}}
@media (prefers-reduced-motion:reduce){.progress li.active::before,.tag.pulse{animation:none}}
#formmsg{min-height:1.5em;margin:12px auto 0;max-width:640px;font-size:.9rem;color:var(--muted)}
#formmsg.error{color:var(--critique)}
#status{margin:10px 0 0;font-size:.95rem;color:var(--muted)}
#status:empty{display:none}
#result .progress{margin:16px 0 0}
#result.pending .summary,#result.pending .meta,#result.pending .card,#result.pending .eras,#result.pending .senses,#result.pending #r-actions{display:none}
.suggest{margin-top:14px}
.suggest p{margin:0 0 8px;color:var(--muted);font-size:.9rem}
.suggest .chip{margin:0 6px 6px 0}
.how{row-gap:22px}
#status.error{color:var(--critique)}
#result{margin-top:44px;scroll-margin-top:16px}
.result-h{display:flex;justify-content:space-between;align-items:baseline;gap:4px 12px;flex-wrap:wrap}
.result-h h2{font-family:ui-serif,Georgia,"Songti SC","Noto Serif SC",serif;font-size:clamp(1.5rem,3.4vw,2rem);font-weight:600;margin:0;line-height:1.2}
.tag{font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}
#result .summary{margin-top:8px}
#result .actions{margin-top:16px}
.section-h{font-family:ui-serif,Georgia,"Songti SC","Noto Serif SC",serif;font-size:1.4rem;font-weight:600;margin:56px 0 14px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}
.tcard{display:block;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px 18px 14px;color:inherit;text-decoration:none;transition:transform .15s,box-shadow .15s,border-color .15s}
.tcard:hover,.tcard:focus{transform:translateY(-2px);box-shadow:var(--shadow);border-color:var(--accent)}
.tcard h3{margin:0 0 4px;font-family:ui-serif,Georgia,serif;font-size:1.15rem;font-weight:600}
.spark{display:block;width:100%;height:46px;margin:12px 0 8px;fill:var(--accent);opacity:.75}
.tmeta{font-size:.78rem;color:var(--muted)}
.how{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;margin-top:56px}
.how div{border-top:2px solid var(--line);padding-top:12px}
.how b{display:block;margin-bottom:4px}
.how p{margin:0;font-size:.92rem;color:var(--ink-soft)}
.cli{margin-top:40px;max-width:760px}
.cli h2{font-size:1rem;margin:0 0 8px}
.cli pre{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px 14px;overflow-x:auto;font-size:.85rem;margin:0 0 10px}
.cli p{font-size:.9rem;color:var(--muted);margin:0}
.cli a{color:inherit}
:lang(zh) .hero h1,:lang(zh) .section-h,:lang(zh) .result-h h2{letter-spacing:0}
@media (max-width:560px){.hero{margin-top:36px}.search{padding-left:16px}.btn{padding:10px 16px}}
"""


def spec_json() -> str:
    """Prompt, schema, and page assets shared with the web app (one source of truth)."""
    spec = {"system": SYSTEM_PROMPT, "schema": OUTPUT_SCHEMA, "css": CSS, "timelineJs": TIMELINE_JS, "siteUrl": SITE_URL, "outputLang": OUTPUT_LANG,
            "pageText": PAGE_TEXT, "i18nJs": (resources.files("idealine") / "web" / "i18n.js").read_text(encoding="utf-8")}
    return json.dumps(spec, ensure_ascii=False).replace("<", "\\u003c")


def copy_web_assets() -> None:
    out = DOCS / "assets"
    out.mkdir(exist_ok=True)
    for name in WEB_FILES:
        src = resources.files("idealine") / "web" / name
        (out / name).write_text(src.read_text(encoding="utf-8"), encoding="utf-8")


TRACE_FORM = """
<form id="trace-form" autocomplete="off">
  <div class="search">
    <input id="term" required minlength="2" maxlength="80" aria-label="Term" data-i18n-aria="termLabel" data-i18n-ph="termPh" placeholder="Try “world model” or “in-context learning”">
    <button class="btn" id="go" type="submit" data-i18n="go">Trace</button>
  </div>
  <div class="chips">{chips}</div>
  <div class="keyline"><span id="keyline-free"><span data-i18n="freeLine">Free: usage curve + key papers. For eras and milestones,</span> <button type="button" class="linkish" id="open-opts" data-i18n="addKey">add your own model key</button> (Claude · OpenAI · Gemini · OpenRouter)</span><span id="keyline-on" hidden><span id="keyline-text"></span> <button type="button" class="linkish" id="change-key" data-i18n="change">Change</button></span></div>
  <details class="opts" id="opts">
    <summary data-i18n="optsSummary">Options and model key</summary>
    <div class="row">
      <div><label for="provider" data-i18n="providerLabel">Model</label><select id="provider"><option value="none" data-i18n="providerNone">No model (free: usage curve + key papers)</option></select></div>
    </div>
    <div id="keyrow" hidden>
      <div class="row">
        <div><label for="key" data-i18n="keyLabel">API key</label><input id="key" type="password" spellcheck="false" autocomplete="off"></div>
        <div><label for="model" data-i18n="modelLabel">Model ID</label><input id="model" spellcheck="false"></div>
      </div>
      <div class="actions"><button class="btn ghost" id="save-key" type="button" data-i18n="saveKey">Save and check key</button><span id="keycheck" role="status" aria-live="polite"></span><a id="keylink" target="_blank" rel="noopener noreferrer" href="#">Get a key</a></div>
    </div>
    <p class="privacy" id="privacy"></p>
    <div class="row">
      <div><label for="aliases" data-i18n="aliasesLabel">Other spellings (optional, comma-separated)</label><input id="aliases" maxlength="200" data-i18n-ph="aliasesPh" placeholder="e.g. mixture-of-experts, MoE layer"></div>
      <div><label for="meaning" data-i18n="meaningLabel">Which meaning? (optional; used with a model key)</label><input id="meaning" maxlength="200" data-i18n-ph="meaningPh" placeholder="e.g. AI agents that plan and use tools on their own"></div>
    </div>
    <div class="row">
      <div><label for="oakey" data-i18n="oakeyLabel">OpenAlex key (optional, free; use it if OpenAlex says the daily budget is used up)</label><input id="oakey" type="password" spellcheck="false" autocomplete="off"></div>
    </div>
    <div class="actions">
      <label class="check"><input type="checkbox" id="remember"> <span data-i18n="remember">Remember my keys on this device (not on a shared computer)</span></label>
      <button class="linkbtn" id="forget" type="button" data-i18n="forget">Forget saved keys</button>
    </div>
  </details>
</form>
<div id="formmsg" role="status" aria-live="polite"></div>
"""

RESULT = """
<section id="result" aria-live="polite">
  <div class="result-h"><h2 id="r-term"></h2><span class="tag" id="r-tag" data-i18n="exampleTag">Example timeline</span></div>
  <ol id="progress" class="progress" hidden></ol>
  <div id="status" role="status" aria-live="polite"></div>
  <div id="r-suggest" class="suggest" hidden></div>
  <p class="summary" id="r-summary"></p>
  <p class="meta" id="r-meta"></p>
  <div class="senses" data-part="senses"></div>
  <div class="card">
    <div class="hint" data-i18n="hint">Click a dot to see the quotes behind it. Scroll sideways for earlier years.</div>
    <div class="scroller"><div data-part="chart"></div></div>
    <div class="legend" data-part="legend"></div>
    <div class="detail" data-part="detail"></div>
  </div>
  <div class="eras" data-part="eras"></div>
  <div class="actions" id="r-actions" hidden>
    <button class="btn ghost" id="dl-html" type="button" data-i18n="dlHtml">Download page (.html)</button>
    <button class="btn ghost" id="dl-json" type="button" data-i18n="dlJson">Download data (.json)</button>
    <button class="btn ghost" id="r-live" type="button" data-i18n="traceLive" hidden>Trace again with live data</button>
  </div>
</section>
"""

EXAMPLE = "recursive-self-improvement"


def main() -> None:
    copy_web_assets()
    terms = []
    for path in sorted((DOCS / "terms").glob("*.json")):
        d = json.loads(path.read_text())
        terms.append((path.stem, d, f"terms/{path.stem}.html"))
    terms.sort(key=lambda x: -x[1]["total"])
    example = next((d for stem, d, _ in terms if stem == EXAMPLE), terms[0][1] if terms else None)
    zh_dir = DOCS / "terms" / "zh"
    zh_path = zh_dir / f"{EXAMPLE}.json"
    examples = {"en": example, "zh": json.loads(zh_path.read_text()) if zh_path.exists() else None}
    cards = "".join(
        card(d, href, f"terms/zh/{stem}.html" if (zh_dir / f"{stem}.html").exists() else None) for stem, d, href in terms
    )
    chips = "".join(f'<button type="button" class="chip">{html.escape(c)}</button>' for c in CHIPS)
    scripts = "".join(f'<script src="assets/{n}"></script>' for n in WEB_FILES)
    example_json = json.dumps(examples, ensure_ascii=False).replace("<", "\\u003c")
    # Ready-made timelines: typed term or alias (lowercase) -> data files, so they open without API calls.
    ready: dict[str, dict] = {}
    for stem, d, _ in terms:
        entry = {"term": d["term"], "en": f"terms/{stem}.json"}
        if (zh_dir / f"{stem}.json").exists():
            entry["zh"] = f"terms/zh/{stem}.json"
        for name in [d["term"], *d.get("aliases", [])]:
            ready.setdefault(name.lower(), entry)
    ready_json = json.dumps(ready, ensure_ascii=False).replace("<", "\\u003c")
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="{CSP}">
<meta name="referrer" content="no-referrer">
<title>idealine · where did this idea come from?</title>
<meta name="description" content="Interactive timelines of where a term came from and how its meaning changed, with a quote behind every step.">
<style>{CSS}{PAGE_CSS}</style></head>
<body><main>
<nav>
  <a class="logo" href="./">{LOGO}idealine</a>
  <span class="links"><a href="#how" data-i18n="navHow">How it works</a><a href="{REPO_URL}">GitHub</a><span class="langseg" id="lang" role="group" aria-label="Language"><button type="button" data-lang="zh" aria-pressed="false">中</button><button type="button" data-lang="en" aria-pressed="true">EN</button></span></span>
</nav>
<section class="hero">
  <h1 data-i18n="heroTitle">Where did this idea come from?</h1>
  <p data-i18n="heroSub">Type any term. See when it first appeared, who shaped it, and how its meaning shifted, with the sentence behind every step.</p>
  {TRACE_FORM.format(chips=chips)}
</section>
{RESULT}
<h2 class="section-h" data-i18n="moreH">More timelines</h2>
<div class="grid" id="grid">{cards}</div>
<section class="how" id="how">
  <div><b data-i18n="how1h">1 · Count</b><p data-i18n="how1">Papers per year in OpenAlex that use the exact phrase in a title or abstract.</p></div>
  <div><b data-i18n="how2h">2 · Quote</b><p data-i18n="how2">The sentences that use it, from the earliest, most-cited, and newest papers.</p></div>
  <div><b data-i18n="how3h">3 · Explain</b><p data-i18n="how3">A model groups them into eras and milestones, and may cite only those quotes.</p></div>
  <div><b data-i18n="howKindsH">Milestone types</b><p data-i18n="howKinds"></p></div>
  <div><b data-i18n="howLimitsH">Limits</b><p data-i18n="howLimits"></p></div>
  <div><b data-i18n="howKeyH">Your key</b><p data-i18n="howKey"></p></div>
</section>
<section class="cli">
  <h2 data-i18n="cliH">Prefer the command line?</h2>
  <pre>uvx --from git+{REPO_URL} idealine "mixture of experts" --alias "mixture-of-experts"</pre>
  <p><a href="{REPO_URL}/issues/new" data-i18n="feedback">Something wrong or missing? Open an issue on GitHub.</a></p>
</section>
<footer><span data-i18n="footer">Eras and milestones come from a language model that may cite only the quoted sentences, and can be wrong; the quotes are the evidence.</span> <a href="https://openalex.org">OpenAlex</a> · <a href="{REPO_URL}">GitHub</a> (MIT)</footer>
</main>
<script type="application/json" id="spec">{spec_json()}</script>
<script type="application/json" id="example">{example_json}</script>
<script type="application/json" id="ready">{ready_json}</script>
{scripts}
</body></html>
"""
    (DOCS / "index.html").write_text(page, encoding="utf-8")
    print(f"Wrote {DOCS / 'index.html'} with {len(terms)} terms")


if __name__ == "__main__":
    main()
