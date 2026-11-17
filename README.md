# idealine

**Where did this AI idea come from?**

AI moves fast, and its words move with it. idealine takes a term, like
*recursive self-improvement*, *world model*, or *test-time compute*, and draws one
interactive timeline: when it first appeared, who shaped it, how its meaning shifted,
and how many papers used it each year. Every step shows the sentence it is based on,
with a link to the paper.

**[Open idealine →](https://yilinista.github.io/idealine/)**

## Use it in the browser

Open the site, type a term, press **Trace**. Nothing to install.

- **Free mode (no key):** the usage curve plus the earliest and most-cited papers.
- **With your own model key:** eras and milestones. Pick Claude (Anthropic), OpenAI, Gemini,
  or OpenRouter, paste your key, and the page calls that provider straight from your browser.
  One request per term, roughly 15–25k input tokens, billed to your account.

**About your key:** the site is static (GitHub Pages) and has no server, so the key goes only
from your browser to the provider you picked. It stays in the tab unless you tick
"Remember my key on this device" (then it sits in this browser's localStorage until you press
"Forget saved keys"). Anyone who can open your browser's devtools could read a remembered key,
so do not tick it on a shared computer. A spending limit on your provider account is a good idea.

You can download each result as a self-contained HTML page or as JSON.

The page is in English and Simplified Chinese (the 中文 / EN button; it starts in your browser's
language). In Chinese, the model writes the summary, eras and notes in Chinese; paper titles and
quotes stay in their original language.

## Use it from the command line

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

It asks before calling the API (one request per term), then writes `mixture-of-experts.html`,
`.md`, and `.json`. The page is self-contained, so you can share it or put it on any static host.

Tips:
- OpenAlex gives everyone on a network a small free daily budget (each term uses 4–16
  requests). If you hit it, get a [free OpenAlex key](https://help.openalex.org/api/authentication/)
  (in the browser: "Options and model key"; on the command line: `export OPENALEX_API_KEY=...`).
- Spell terms out. Acronyms like "RSI" also match finance and medicine.
- Add other spellings (`--alias`, or the "Other spellings" box). The singular/plural of the
  last word is added for you (*world model* also finds *world models*).
- Very old dates in OpenAlex are sometimes wrong, so records from before a term was in regular
  use are marked "date may be wrong".
- It works for any field OpenAlex covers, not only AI.

## How it works

1. **Harvest:** [OpenAlex](https://openalex.org) (free, no key) gives papers per year that use
   the exact phrase in the title or abstract, plus the earliest and most-cited papers of
   each year. idealine keeps the abstract sentences that use the term.
2. **Analyze:** the model (Claude by default on the command line; your choice in the browser) reads only those sentences and proposes eras and milestones. Every item
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
| `--lang` | `en` (default) or `zh`: write the summary, eras and notes in Simplified Chinese |
| `--out DIR` | Output folder (default: current folder) |
| `-y, --yes` | Do not ask before calling the API |
| `--no-cache` | Refetch instead of using cached API responses |

`idealine render page.json` rebuilds the HTML from saved data without any API calls.

## Limits (please read)

- **Labels can be wrong.** Eras and milestones are model judgments. Read the quotes.
- **Abstracts only.** Books and old essays without abstracts show up only when newer papers
  name them, so the true origin of a term can be missing.
- **Exact phrase.** Papers that describe the idea in other words are not counted.
- **Dates come from OpenAlex.** A few early records are misdated; the page marks the suspicious ones.

## Feedback

I am looking for the first users. Try a term you care about and
[open an issue](https://github.com/Yilinista/idealine/issues): what was useful, what was
wrong, which term you want next. Changes made from feedback are logged in [FEEDBACK.md](FEEDBACK.md).

## Development

```bash
git clone https://github.com/Yilinista/idealine && cd idealine
uv sync
uv run pytest                          # Python tests, offline
node --test tests/web.test.mjs         # browser-code tests, offline (Node 20+)
uv run python scripts/build_gallery.py # rebuild docs/ (site + gallery) from src/idealine/web and docs/terms/*.json
python3 -m http.server -d docs 8000    # preview the site at http://localhost:8000
```

## License

MIT
