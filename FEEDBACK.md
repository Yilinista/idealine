# Feedback log

Every piece of user feedback, and what it changed. Newest first.

| Date | Who (handle or "classmate") | Where | What they said | What changed | Commit / issue |
|---|---|---|---|---|---|
| | | | | | |

## Pre-launch findings (my own testing)

| Date | Finding | What changed |
|---|---|---|
| 2026-11-17 | Yilin (trying the site): the design is not good-looking, and an English-only page is tiring to use. | Redesigned the home page (search first, example chips, settings folded away, example timeline, card sparklines, dark mode) and added a Chinese interface; in Chinese the model writes its summary and notes in Chinese. Regenerated the example timeline with exact search, in English and Chinese. |
| 2026-11-17 | Real-data test of 16 terms (with an OpenAlex key): OpenAlex stems phrase searches, so *agentic* counted every "agent" paper (4,054,790). | Switched to `title_and_abstract.search.exact` (43,485 for *agentic*) and search singular/plural variants automatically (*world model* + *world models*). |
| 2026-11-17 | Same test: some early records are misdated in OpenAlex (a CRISPR-Cas9 paper dated 1800; *vibe coding* papers dated 2019–2020), and free mode showed them as the origin. | Records from before the term's onset (3 papers or 1% of all) are flagged "date may be wrong"; free-mode origins come from the onset on; the model prompt warns about anachronistic dates. |
| 2026-11-17 | Chinese abstracts were not split into sentences (only `.!?` counted), so a whole abstract became one quote. | Also split at 。！？; long titles are clipped like sentences. |
| 2026-11-17 | On a phone, the timeline scrolled to its right edge and cut off the newest milestone labels. | It now scrolls to the newest milestone's dot. |
| 2026-11-17 | Yilin (first reviewer): a gallery that only shows terms I picked is not something people can really use; let visitors bring their own key, not only Anthropic (e.g. OpenAI). | Built the browser app: type any term on the site, choose Anthropic, OpenAI, Gemini, or OpenRouter, paste your own key. Dropped the planned issue-request bot. |
| 2026-11-17 | OpenAlex returned "free daily budget used up" after ~2 terms of testing (shared per IP, resets midnight UTC). Strangers on a shared network would hit this too. | Cut requests per term from ~20 to 4, fail fast with a clear message instead of retrying, and support an optional free `OPENALEX_API_KEY`. |
| 2026-11-17 | *chain-of-thought* has scattered uses back to 1914, so an even year axis spent most of its width on empty decades. | Year widths now follow activity; 1914–2026 fits on one screen and the 2021–26 shift is readable. |
| 2026-11-17 | Claim mode on real data: 45 of 47 labeled sentences were plain "mentions". Random citing sentences rarely test a claim, so the timeline felt empty. But those sentences often *name* the key follow-up papers ("a replication attempt (Besiroglu et al., 2024) found…"). | Pivoted the main product to term timelines, where the model builds milestones from what many sentences name. Claim mode kept as a secondary command. |
| 2026-11-17 | OpenAlex `search` also matches full text, so 2026 had 1,291 "papers" for *recursive self-improvement* but the sampled abstracts rarely used the phrase: only 11 sentences, and the 2025–26 surge was invisible. | Switched to `title_and_abstract.search`. Counts dropped to 760 (more honest) and evidence rose to 61 sentences covering every era. |
| 2026-11-17 | Evidence was capped in date order, which would drop the newest years first. | Cap now keeps one sentence per work, then thins evenly across time. |
| 2026-11-17 | Timeline page: right-most labels clipped, overlapping era labels collided, and milestone hit areas were too small to click reliably. | Width now fits the labels, era labels alternate rows and truncate with a tooltip, and each milestone has a larger click target. |
| 2026-11-17 | Semantic Scholar rate-limits anonymous use within two calls, and rejects offsets ≥ 10,000 (hit on a paper with 48,751 citations). | Retries with backoff (about 4 min max), on-disk cache, offset cap. |
| 2026-11-17 | Semantic Scholar returns citations newest first, so the first 300 citations of a 2022 paper were all from 2026. | Claim mode samples pages evenly across the whole citation list. |
