# idealine

**Where did this AI idea come from?**

AI moves fast, and its words move with it. idealine takes a term, like
*recursive self-improvement*, *world model*, or *test-time compute*, and draws one
interactive timeline: when it first appeared, who shaped it, how its meaning shifted,
and how many papers used it each year. Every step shows the sentence it is based on,
with a link to the paper.

**[Browse the gallery →](https://yilinista.github.io/idealine/)**

## Quick start

You need [uv](https://docs.astral.sh/uv/getting-started/installation/) (one install command).

**1. Without an API key** (usage curve plus the earliest and most-cited papers):

```bash
uvx --from git+https://github.com/Yilinista/idealine idealine "mixture of experts" --no-llm
```

**2. With eras and milestones**, using your own [Anthropic API key](https://console.anthropic.com/):

```bash
export ANTHROPIC_API_KEY=...
uvx --from git+https://github.com/Yilinista/idealine idealine "mixture of experts" --alias "mixture-of-experts"
```

It asks before calling the API (one request per term).

**3. Open the HTML file** it writes (`mixture-of-experts.html`). The page is self-contained,
so you can share it or put it on any static host.

Tips:
- OpenAlex gives everyone on a network a small free daily budget (each term uses 4–16
  requests). If you hit it, get a [free OpenAlex key](https://help.openalex.org/api/authentication/)
  and `export OPENALEX_API_KEY=...`. Fetched data is cached, so reruns are free.
- Spell terms out. Acronyms like "RSI" also match finance and medicine.
- Add other spellings with `--alias` (repeatable).
- It works for any field OpenAlex covers, not only AI.

## How it works

1. **Harvest:** [OpenAlex](https://openalex.org) (free, no key) gives papers per year that use
   the exact phrase in the title or abstract, plus the earliest and most-cited papers of
   each year. idealine keeps the abstract sentences that use the term.
2. **Analyze:** Claude reads only those sentences and proposes eras and milestones. Every item
   must cite sentence IDs; anything without evidence is dropped.
3. **Resolve:** works that the sentences name but that were not sampled (e.g. "Good, 1965") are
   looked up in OpenAlex. Unmatched ones are drawn dashed.
4. **Render:** one HTML page, plus Markdown and the JSON data.

## Claim mode

Want to know whether one claim of one paper held up? `idealine claim` reads the
sentences where later papers cite it (from Semantic Scholar) and labels each one
supports, refutes, refines, or mentions:

```bash
idealine claim "Compute-optimal models should scale data and parameters equally" --seed arXiv:2203.15556
```

## Options

| Flag | What it does |
|---|---|
| `--alias TEXT` | Another spelling to include (repeatable) |
| `--no-llm` | Skip the model; no key needed |
| `--model ID` | Claude model (default `claude-opus-5-5`) |
| `--effort` | `low`, `medium` (default), or `high` |
| `--out DIR` | Output folder (default: current folder) |
| `-y, --yes` | Do not ask before calling the API |
| `--no-cache` | Refetch instead of using cached API responses |

`idealine render page.json` rebuilds the HTML from saved data without any API calls.

## Limits (please read)

- **Labels can be wrong.** Eras and milestones are model judgments. Read the quotes.
- **Abstracts only.** Books and old essays without abstracts show up only when newer papers
  name them, so the true origin of a term can be missing.
- **Exact phrase.** Papers that describe the idea in other words are not counted.

## Feedback

I am looking for the first users. Try a term you care about and
[open an issue](https://github.com/Yilinista/idealine/issues): what was useful, what was
wrong, which term you want next. Changes made from feedback are logged in [FEEDBACK.md](FEEDBACK.md).

## Development

```bash
git clone https://github.com/Yilinista/idealine && cd idealine
uv sync
uv run pytest                          # offline, no API calls
uv run python scripts/build_gallery.py # rebuild docs/index.html from docs/terms/*.json
```

## License

MIT
