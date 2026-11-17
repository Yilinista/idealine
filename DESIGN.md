# idealine: design (v1)

Date: 2026-11-17. Status: building. Mode: builder (course bonus project; the goal
is the full build → launch → feedback → iterate loop, per Lecture 8).

## Problem

AI moves fast and its vocabulary moves with it. A term like "recursive
self-improvement" was a niche AI-safety idea for 15 years (≤10 papers a year in
OpenAlex), then 611 papers used it in 2026, now meaning "agents that improve their
own code and training". Newcomers, students, and people writing about AI meet these
terms mid-shift and cannot see where they came from or which meaning a paper uses.

Today they ask a chatbot (fluent, but dates and "who coined it" are often made up and
unsourced), read Wikipedia (missing or stale for new terms), or dig through papers by hand.

## What idealine does

Type a term. Get one interactive horizontal timeline:

- **Usage curve:** papers per year that use the exact phrase in title or abstract.
- **Eras:** periods when the term meant something recognizably different.
- **Milestones:** origin, coined, popularized, redefined, applied, critique, ancestor.
- **Evidence:** click any milestone to see the sentences it rests on, with links.

The rule that makes it trustworthy: **the model can only use the quoted sentences.**
Every era and milestone must cite sentence IDs; anything without evidence is dropped.
Works the sentences only name (e.g. "Good (1965)") are looked up in OpenAlex and
shown dashed if not found.

A second, smaller mode (`idealine claim`) traces one claim of one paper through
the sentences that cite it, labeled supports / refutes / refines / mentions.

## Office-hours self-review (questions from the YC office-hours skill)

**What is the coolest version?** Seeing a meaning shift happen: the bars explode in
2025 while the era band changes from "AI-safety thought experiment" to "agent
engineering", with the paper that marks the turn one click away.

**Who would you show it to, and what makes them say "whoa"?** Classmates and AI
newsletter readers. The "whoa" is a term they use daily turning out to have a
15-year history they did not know, with receipts.

**What is closest, and how is this different?**

| Existing | What it does | Gap |
|---|---|---|
| Ask ChatGPT / Perplexity | Fluent history of a term | Dates and attributions unsourced, often wrong; no usage data; not visual |
| Google Ngram Viewer | Word frequency in books | Stops years ago; no meaning, no sources; misses papers |
| SCoT, ShiCo, DRIFT (research tools) | Word-sense change from embeddings | Need corpus setup and NLP background; show clusters, not readable history |
| Scite, ResearchRabbit, Litmaps, Gallant Lab toolkit | Citation stance / literature maps | About papers, not about a term's meaning over time |

**Fastest path to something people use?** One static page on GitHub Pages: type any term and
get a timeline right there (free mode needs no key; eras and milestones use the visitor's own
model key), plus a gallery of prebuilt timelines with shareable links. The CLI is for people who
want files or automation.

**10x version?** Bring your own corpus (newsletters, a lab's papers, Chinese sources),
compare two terms on one axis, and alerts when a term's meaning shifts. Not in v1.

## Premises

1. The confusing part of a fast field is **meaning drift**, not missing definitions.
2. People trust a timeline only if every step shows its source. Evidence beats prose.
3. A link to a finished page beats a tool to install. The gallery is the product's
   front door; the CLI is the long tail.
4. Small and finished beats broad and half-done: one data source (OpenAlex), one model call.

## Approaches considered

- **A. Static gallery + CLI (chosen).** Effort S–M, low risk, no server, no costs for visitors.
- **B. Hosted web app with live search.** Best UX for custom terms, but needs a backend,
  rate limiting, and pays model costs for strangers.
- **B'. Static web app, bring your own key (added 2026-11-17, now the front door).** Same page as
  the gallery: the browser calls OpenAlex and the visitor's chosen model provider (Anthropic,
  OpenAI, Gemini, OpenRouter) directly with the visitor's own key. Gets B's UX with A's
  no-server, no-cost setup. Also replaced a planned "request a term by GitHub issue" bot, which
  would have spent my key on strangers' requests and needed a daily cap.
- **C. Chatbot plugin / skill.** Easy to build, but output lives in a chat, is not
  shareable, and it is unclear whether it counts as a launched product.

## Pipeline

1. **Harvest (OpenAlex, free, cached, 4 requests):** yearly counts (`title_and_abstract.search`,
   `group_by=publication_year`); the 25 earliest works; the 150 most-cited; and the 60
   most-cited of the last two years. Keep abstract sentences that use the term
   (space/hyphen-insensitive), at most 160, thinned evenly so recent years are not cut.
   OpenAlex has a small shared daily budget per IP; an optional `OPENALEX_API_KEY` avoids it.
2. **Analyze (one Claude call, structured JSON):** summary, 2–5 eras, 4–12 milestones, each
   with evidence IDs. Default model `claude-opus-5-5`, effort `medium`.
3. **Resolve:** milestones that are not themselves in the sample are matched in OpenAlex by
   title and year (±1, title overlap ≥ 0.4) or marked unresolved.
4. **Render:** one self-contained HTML page (inline SVG + vanilla JS, light/dark, keyboard
   accessible) plus Markdown and the JSON data. Year widths follow activity (milestone and
   busy years wide, quiet years thin), so a century of rare use fits beside a recent surge. `idealine render x.json` rebuilds HTML for free.

`--no-llm` skips step 2: milestones are the earliest and most-cited works.

## Browser app (bring your own key)

- Same pipeline as the CLI, ported to `src/idealine/web/core.js`; the prompt and JSON schema are
  injected from `term.py` at build time, so the two cannot drift.
- `providers.js` makes one structured-output call per provider (Anthropic `output_config.format`,
  OpenAI/OpenRouter strict `response_format`, Gemini `responseJsonSchema`). Whatever comes back
  is still checked against the evidence IDs in code.
- Key safety: no server; key in memory unless the visitor opts in to localStorage; never in URLs.
  A Content-Security-Policy limits scripts to the site's own files and network calls to OpenAlex
  and the four providers. All paper text and model output is escaped or set as text; links must
  be http(s).
- Interface text lives in `web/i18n.js` (English and Simplified Chinese). Runtime messages from
  `core.js`/`providers.js` stay English in code and are mapped to Chinese by pattern; anything
  unmatched is shown in English. In Chinese, one extra line in the prompt (`OUTPUT_LANG` in
  `term.py`, shared with the CLI's `--lang zh`) asks the model to write labels in Chinese.
- Look: search first (one pill input, example chips), the model-key settings folded away, and a
  ready-made example timeline in the result slot until the visitor traces their own. Light by
  default, dark palette when the system is in dark mode; term pages share the same tokens.

## Known limits

- Only title/abstract text. Books and pre-2000 essays without abstracts appear only if
  newer abstracts name them (so I. J. Good 1965 may be missing from the RSI page).
- Acronyms (RSI) collide with other fields; the CLI warns and asks for the spelled-out term.
- Eras and milestone labels are model judgments. The quotes are the evidence.

## Success criteria

- 5–10 people outside the team open the gallery or run the CLI and say something specific.
- At least two changes made because of their feedback, logged in `FEEDBACK.md`.
- A stranger can run the Quick start from the README without help.

## Next steps

1. Publish the repo and site (GitHub Pages).
2. Classmates first, then Show HN / X / Reddit (see `LAUNCH.md`).
3. Add requested terms; fix what users trip on.
