# Launch checklist and post drafts

Drafts only. Nothing here has been posted.

## Before posting

- [ ] Create the public repo `Yilinista/idealine` and push
- [ ] Turn on GitHub Pages (branch `main`, folder `/docs`) and check the gallery link in the README
- [ ] Spot-check two milestones per gallery page against the linked paper
- [ ] Ask 2–3 classmates to run the Quick start on their own machines, watch without helping
- [ ] Read each community's self-promotion rules

## Where, in order

1. Classmates (course Slack / Ed): first users, bug reports
2. Show HN
3. X / Bluesky: one post per term with a screenshot of the timeline
4. r/MachineLearning (self-promotion thread if required), r/PhD, r/LanguageTechnology
5. Chinese AI communities (e.g. a 即刻 / 小红书 post with the RSI timeline)

## Draft: classmates

> hey! for my bonus project I made idealine: type an AI term (like "recursive
> self-improvement") and it shows where the term came from and how the meaning shifted,
> on one timeline, with the quote behind every step. gallery here: <link>
> would love it if you clicked around for 2 min and told me what's confusing or wrong,
> or which term you want added. issues welcome: <repo>

## Draft: Show HN

**Title:** Show HN: Idealine – see where an AI term came from, with a quote behind every step

> AI vocabulary shifts fast. "Recursive self-improvement" was a niche AI-safety idea for
> 15 years (under 10 papers a year), then 611 papers used it in 2026, mostly meaning agents
> that improve their own code. I kept meeting terms mid-shift, so I built a tool that draws
> the history.
>
> It takes a term, pulls papers per year and the abstract sentences that use it from
> OpenAlex, and has Claude group them into eras and milestones (origin, popularized,
> redefined, critique). The model may only use the quoted sentences, and every milestone
> shows its quotes and links, so you can check it.
>
> Gallery (no install): <link>. CLI for your own term: <repo>. No API key needed for the
> basic view.
>
> Known gaps: abstracts only, so pre-2000 books often show up only when newer papers name
> them; acronyms collide across fields. Feedback welcome, especially terms where it gets
> the story wrong.

## Draft: X post

> Where did "recursive self-improvement" come from?
> 2010: formal limits of self-improving programs
> 2014–21: the intelligence-explosion risk story
> 2025–26: 600+ papers on agents that rewrite their own code
> Built a tool that draws this for any term, with the quote behind every step: <link>
