# idealine: design (v1)

Date: 2026-11-17. Status: deployed on GitHub Pages; the timeline is the front door again (see "Scope and front door" below). Mode: builder (course bonus project; the goal
is the full build → launch → feedback → iterate loop, per Lecture 8).

## Problem

Students and readers meet unfamiliar research terms (AI first, but any field) and need to choose papers worth
reading. Phrase counts and model-generated history do not by themselves answer
what a paper means by a term. The immediate task is to compare actual uses and
leave with a source they can read and cite.

Today they ask a chatbot (fluent, but dates and "who coined it" are often made up and
unsourced), read Wikipedia (missing or stale for new terms), or dig through papers by hand.

## What idealine does

Type a term. Get a reading brief with up to three source passages, paper links,
and copy-with-source actions. Browse the full sample by year and suggested
meaning. A compact usage chart follows the passages. The model summary and the
following original timeline views are folded into **Method & limitations**:

- **Usage curve:** papers per year that use the exact phrase in title or abstract.
  For young terms (real use spans at most three calendar years) and when an OpenAlex key is
  set, those years are also counted by quarter, about 5 small requests per year, because
  OpenAlex cannot group by date. OpenAlex dates papers known only by year as 1 January, so
  papers dated exactly 1 January are counted apart as "dated only by year" and kept out of Q1
  (for "vibe coding", 27 of the 28 papers in 2025 Q1 were such dates). Milestones sit at their
  paper's month; without one, at the start of their year.
- **Eras:** periods when the term meant something recognizably different.
- **Milestones:** origin, coined, popularized, redefined, applied, critique, ancestor.
- **Evidence:** click any milestone to see the sentences it rests on, with links.

The evidence rule: **the model can only use the quoted sentences.**
Every era and milestone must cite sentence IDs; anything without evidence is dropped.
Works the sentences only name (e.g. "Good (1965)") are looked up in OpenAlex and
shown dashed if not found.

## Phase 2 reading brief (2026-11-17)

- **User decision:** Yilin approved the reading-brief direction after reporting that
  the faster live site still did not feel useful and its layout was mediocre
  (in chat). Whether the new
  design helps a real reader is still an untested hypothesis.
- **Implementation:** `web/reading.js` owns the shared reader and export, with
  `web/reading.css` for the responsive layout. The homepage opens with search and
  a real quoted example; standalone term pages use the same reader. The main
  path needs no model call. Existing diagnostics and provider controls remain available.
- **Evidence boundary:** cards cite the work containing the quotation, never a
  separately resolved milestone target. Title-only, unknown-date, and flagged-date
  records remain browsable but are excluded from automatic starting points.
  Counts cover all phrase meanings and do not establish priority.
- **Selected pilots:** `web/reading-guides.json` records three passages each for
  world model, in-context learning, and vibe coding, with abstract URLs and the
  text-check date. Entries attach only when ID, text, original URL, and year match
  the saved quote exactly; stale checks cannot silently attach to changed evidence.
- **Verification:** Python 58/58 and Node 52/52 passed; `scripts/build_gallery.py`
  rebuilt seven terms (13 English/Chinese pages). Checks cover provenance, stale
  selections, date warnings, filters, safe rendering, and standalone exports
  (`tests/web.test.mjs`, `tests/test_term.py`). Chrome file previews covered desktop
  and 390px layouts and reading interactions; ready-made terms were also checked over
  HTTP. Successful live OpenAlex searches and real-reader
  usefulness remain unverified. No new model generation or user study is claimed.

## Scope and front door (2026-11-17, later)

- **Front door:** after trying the reading brief, Yilin said the direction was wrong
  (in chat). The timeline is the main view again; the source cards and evidence list
  sit below it as its evidence.
- **Any field:** Yilin approved widening the copy from "AI terms" to research terms
  in any field (in chat). The pipeline already had no AI-specific filter or prompt
  wording (checked in `term.py` and `web/core.js`). Example chips now include
  placebo effect, cognitive dissonance and dark matter; these run live searches
  until ready-made pages are generated. Acronym and common-word collisions are more
  likely outside AI (e.g. "transformer"); the "Other spellings" and "Which meaning?"
  fields are the current mitigation, untested on non-AI terms.

The design explorations below document the earlier timeline direction and remain the
basis of the current timeline.

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
   with evidence IDs. Default model `claude-opus-5-5`, effort `medium` on the command line; the
   browser app uses effort `low` and streams the answer, so the page shows how far it has got.
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
- Look: a two-column introduction with a quoted example, a prominent search field,
  and a ready-made reading brief. Model-key settings and diagnostics are folded away.
  Source cards use a wide reading column beside a short reading question; narrow
  screens use one column. Light/dark palettes share the same tokens across pages.

## Reading aids (borrowed from similar tools, 2026-11-17)

- **Share and log scale** (Google Ngram): the bar chart can show papers per million OpenAlex
  papers that year (`oa-totals.json`, refreshed with `idealine totals`); log scale turns on by
  itself when the busiest year is 50x the quietest.
- **Bursts and takeoff:** Kleinberg two-state burst detection shades unusual years; the takeoff
  marker is the first year after the Ke et al. (2015) "awakening" point where the count more
  than doubles its earlier best.
- **Meaning per era** (SemEval semantic change): each quote is tagged with a sense; each era
  card shows the sense mix, a Jensen-Shannon "moved" score against the previous era, and
  new/faded badges (k=2, n=5). Common words per era are counted in code.
- **In-set citations** (Litmaps): papers are ranked by how many of the other sampled papers
  cite them, and the prompt shows that count.
- **Roots** (RPYS, Marx et al. 2014): the references of the in-focus papers, counted by year;
  peak years list the most-cited works. `idealine roots page.json` adds this without a model call.
- **Honest labels:** "origin" is now "earliest found", with a link to report an earlier use;
  each milestone shows checks (exact phrase found, in the chosen meaning) and how often a
  separate AI check agreed with that label type (`kind-checks.json`; not a human check).

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

1. Review the local Phase 2 changes, then deploy through the existing GitHub Pages site.
2. Ask one reader to choose a paper and copy a supported passage in two minutes;
   record whether they can explain the choice without help. No result yet.
3. Update launch drafts to the validated product before posting (see `LAUNCH.md`).
