# Launch checklist and post drafts

## Posted

| Date | Where | Link | By |
|---|---|---|---|
| 2026-11-17 | X | https://x.com/fairyyy999/status/2122762424205885481 | Yilin |

Text as posted:

> I made idealine, a free open-source tool (no sign-up): type a term like "vibe coding" and get a timeline of where it came from and how its meaning shifted, quoted from real papers.
>
> Papers only, so dates can run late.
>
> Try a term and tell me if it's off: https://yilinista.github.io/idealine/

Replies go to `FEEDBACK.md`, with what each one changed.

The checklist and drafts below were written before launch and are kept for reference.

## Before posting

- [ ] Create the public repo `Yilinista/idealine` and push
- [ ] Turn on GitHub Pages (branch `main`, folder `/docs`) and check the site link in the README
- [ ] On the live site: run one term in free mode and one with a real key (each provider you can), then "Forget saved keys"
- [ ] Check whether other GitHub Pages sites share the `yilinista.github.io` origin (remembered keys are readable there)
- [ ] Spot-check two milestones per gallery page against the linked paper
- [ ] Review and deploy the reading-brief changes; check search, exports, and narrow layouts over HTTP
- [ ] Ask one reader to choose a paper and copy a supporting passage in two minutes, without help
- [ ] Ask 2–3 classmates to trace a term on the site, watch without helping
- [ ] Read each community's self-promotion rules

## Where, in order

1. Classmates (course Slack / Ed): first users, bug reports
2. Show HN
3. X / Bluesky: one post per term with a screenshot of the timeline
4. r/MachineLearning (self-promotion thread if required), r/PhD, r/LanguageTechnology
5. Chinese AI communities (e.g. a 即刻 / 小红书 post with the RSI timeline)

## Draft: classmates

> hey! for my bonus project I made idealine: type a research term from any field (like "recursive
> self-improvement" or "CRISPR") and it shows where the term came from and how the meaning shifted,
> on one timeline, with the quote behind every step. try any term here: <link>
> (free without a key; paste your own Claude / OpenAI / Gemini / OpenRouter key for the full version,
> it only goes from your browser to that provider)
> would love it if you clicked around for 2 min and told me what's confusing or wrong,
> or which term you want added. issues welcome: <repo>

## Draft: Show HN

**Title:** Show HN: Idealine – see where a research term came from, with a quote behind every step

> AI vocabulary shifts fast. "Recursive self-improvement" was a niche AI-safety idea for
> 15 years (under 10 papers a year), then 611 papers used it in 2026, mostly meaning agents
> that improve their own code. I kept meeting terms mid-shift, so I built a tool that draws
> the history.
>
> It takes a term, pulls papers per year and the abstract sentences that use it from
> OpenAlex, and has a model group them into eras and milestones (origin, popularized,
> redefined, critique). The model may only use the quoted sentences, and every milestone
> shows its quotes and links, so you can check it.
>
> Try any term in the browser: <link>. No key needed for the basic view; for eras and
> milestones, bring your own Anthropic / OpenAI / Gemini / OpenRouter key. It's a static page,
> so the key goes straight from your browser to the provider. CLI and source: <repo>.
>
> Known gaps: abstracts only, so pre-2000 books often show up only when newer papers name
> them; acronyms collide across fields. Feedback welcome, especially terms where it gets
> the story wrong.

## Draft: X post (approved 2026-11-17; Yilin's Grokbot posts it)

Main post (264/280 characters, URLs count as 23):

> made a small thing for my agentic engineering class: type a research term from any field and see when papers started using it and how its meaning shifted, with a quoted sentence behind every step. free, no signup. tell me what's confusing → https://yilinista.github.io/idealine/

Reply (267/280):

> it only reads titles + abstracts from OpenAlex, so it's a sample, not the full history. optional: paste your own model key (Claude/OpenAI/Gemini/OpenRouter) for eras + milestones. the key goes straight from your browser to that provider. code: https://github.com/Yilinista/idealine

Attach a screenshot of one timeline (e.g. world model).
