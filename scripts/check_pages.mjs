#!/usr/bin/env node
// Page-level checks on real terms, run before every push:
//   node scripts/check_pages.mjs            check saved snapshots (offline)
//   node scripts/check_pages.mjs --refresh  fetch fresh snapshots from OpenAlex first
//                                           (uses OPENALEX_API_KEY from the environment if set)
//
// Unit tests check one piece at a time. These checks look at what a reader sees on one
// result page: the headline, the chart's takeoff line and the three cards, computed with
// the same code the page runs. They exist because a paid tester found years on one page
// that contradicted each other and a takeoff year the bars did not show (FEEDBACK.md,
// 2026-11-19). The terms span fields on purpose: AI terms that only ever grew, and
// tourism and social-science terms that rise, dip and grow slowly.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB = join(ROOT, 'src/idealine/web');
const I = require(join(WEB, 'i18n.js'));
globalThis.IdealineI18n = I;
const C = require(join(WEB, 'core.js'));
const TL = require(join(WEB, 'timeline.js'));
const R = require(join(WEB, 'reading.js'));

export const SNAPSHOTS = join(ROOT, 'tests/fixtures/terms');
export const GALLERY = join(ROOT, 'docs/terms');

// Free-view snapshots. `expect` pins what a reader would say about the bars when the
// snapshot was taken; a refresh can move these, and then a person should look again.
export const TERMS = [
  { term: 'overtourism', field: 'tourism', expect: { takeoff: 2017 } },          // rose 2017-19, dipped 2021-22
  { term: 'tourism carrying capacity', field: 'tourism', expect: { takeoff: null } },  // slow, steady since 1995
  { term: 'place attachment', field: 'environmental psychology' },
  { term: 'social capital', field: 'sociology' },
  { term: 'carbon neutrality', field: 'climate policy', expect: { takeoff: 2021 } },  // a small 2006 step, the surge in 2021
  { term: 'mixture of experts', field: 'machine learning', expect: { takeoff: 2024 } },  // a 1990s step, the surge in 2024
  { term: 'retrieval-augmented generation', field: 'AI' },
  { term: 'attention mechanism', field: 'AI' },
  { term: 'OpenAI', field: 'AI (a name: records before 2015 are left out)' },
];

export const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// What the page's headline says, from the same function the page calls.
const headline = (d, lang) => TL.headlineText(d, Object.assign({}, TL.LABELS_EN, I.T[lang]));

// Problems a reader would see on this page, as plain sentences. Empty when it is fine.
export function checkPage(d, { expect = {} } = {}) {
  const out = [];
  const bad = s => out.push(s);
  const counts = new Map(d.counts || []);
  const snapYear = /^\d{4}/.test(d.generated || '') ? +d.generated.slice(0, 4) : null;
  const run = (d.counts || []).length ? TL.mainRun(d.counts, d.generated) : { first: null, ta: null };
  const ta = TL.chartTakeoff(d);  // the year the chart's takeoff line marks

  // 1. The takeoff year must be visible in the bars: a clear jump over the years before.
  if (ta != null) {
    const c = counts.get(ta) || 0;
    const prev = Math.max(0, ...[1, 2, 3, 4, 5].map(k => counts.get(ta - k) || 0));
    if (snapYear && ta > snapYear) bad(`takeoff ${ta} is after the data date ${d.generated}`);
    if (c < 3 || c < 2 * prev) bad(`takeoff ${ta} has ${c} papers, not double the ${prev} of the five years before`);
    if (run.first != null && ta <= run.first) bad(`takeoff ${ta} is not after the first year ${run.first}`);
  }
  if ('takeoff' in expect && expect.takeoff !== ta) bad(`takeoff is ${ta}, the snapshot expects ${expect.takeoff}`);

  // 2. The headline names the same takeoff as the chart, in both languages, and the
  //    Chinese headline is Chinese.
  for (const lang of ['en', 'zh']) {
    const h = headline(d, lang);
    const says = (h.match(/(\d{4}) 年起飞|Took off in (\d{4})/) || []).slice(1).find(Boolean);
    if (String(ta ?? '') !== String(says ?? '')) bad(`${lang} headline says takeoff ${says ?? 'none'}, the chart says ${ta ?? 'none'}: "${h}"`);
    if (lang === 'zh' && /[A-Za-z]{3,}/.test(h)) bad(`zh headline has English words: "${h}"`);
  }

  // 3. The three cards: no paper twice, nothing after the data date, nothing before the
  //    chart's main run, Earliest is the earliest, Now is the newest.
  const model = R.readingModel(d);
  const cards = R.storyCards(d, model);
  const byKey = Object.fromEntries(cards.map(c => [c.key, c]));
  const papers = cards.map(c => c.url || c.title.toLowerCase());
  if (new Set(papers).size !== papers.length) bad(`a paper is on two cards: ${cards.map(c => `${c.key} ${c.year} ${c.title}`).join(' | ')}`);
  for (const c of cards) {
    if (snapYear && c.year > snapYear) bad(`${c.key} card is dated ${c.year}, after the data date ${d.generated}`);
    if (run.first != null && c.year < run.first) bad(`${c.key} card is dated ${c.year}, before the chart's first year ${run.first}`);
    if (!c.title) bad(`${c.key} card has no title`);
  }
  if (byKey.start && cards.some(c => c.year < byKey.start.year)) bad(`Earliest card (${byKey.start.year}) is not the earliest card`);
  if (byKey.now && cards.some(c => c.year > byKey.now.year)) bad(`Now card (${byKey.now.year}) is not the newest card`);
  if ((d.counts || []).length && model.quotes.length && !cards.length) bad('no cards although the page has passages');

  // 4. The cards as the page renders them, in both languages: no takeoff claim (the
  //    headline and chart own that year), counted notes translated in the Chinese view,
  //    and a plain "Earliest" only when the card is as early as the chart's first bars.
  const early = !byKey.start || run.first == null || byKey.start.year <= run.first + 1;
  for (const lang of ['en', 'zh']) {
    const text = R.storyHtml(d, lang, model).replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;|&#\d+;/g, ' ');
    const labels = [...R.storyHtml(d, lang, model).matchAll(/class="sc-label">([^<]*)</g)].map(m => m[1]);
    const T = R.TEXT[lang].story;
    if (cards.length !== labels.length) bad(`${lang}: ${labels.length} card labels rendered for ${cards.length} cards`);
    // Labels and notes only: quoted passages and paper titles may say "took off" themselves.
    const own = R.storyHtml(d, lang, model).replace(/<p class="sc-line">“[\s\S]*?”<\/p>|<p class="sc-src">[\s\S]*?<\/p>/g, '').replace(/<[^>]+>/g, ' ');
    if (/took off|takeoff|起飞/i.test(own)) bad(`${lang} cards claim a takeoff: "${own.replace(/\s+/g, ' ').trim()}"`);
    if (byKey.start && !early && labels.includes(T.start)) bad(`${lang} card says "${T.start}" ${byKey.start.year}, but the chart starts in ${run.first}`);
    if (lang === 'zh' && !d.model) {
      for (const c of cards) if (!c.quote && c.line && !/[\u4e00-\u9fff]/.test(I.T.zh.msg(c.line))) bad(`zh ${c.key} card note is not translated: "${c.line}"`);
      for (const c of cards) if (!c.quote && c.line && text.includes(c.line) && I.T.zh.msg(c.line) !== c.line) bad(`zh ${c.key} card shows the English note: "${c.line}"`);
    }
  }
  return out;
}

async function refresh() {
  mkdirSync(SNAPSHOTS, { recursive: true });
  const oa = new C.OpenAlex({ apiKey: process.env.OPENALEX_API_KEY || '', log: m => process.stderr.write(`  ${m}\n`) });
  for (const { term } of TERMS) {
    process.stderr.write(`${term}\n`);
    // Wikidata refuses requests without a User-Agent; a browser always sends one.
    const ua = { 'User-Agent': 'idealine-checks (https://github.com/Yilinista/idealine)' };
    const entity = await C.lookupEntity(term, { fetchFn: (u, o = {}) => fetch(u, { ...o, headers: { ...(o.headers || {}), ...ua } }) });
    process.stderr.write(`  name: ${entity ? `${entity.label}, ${entity.kind}, ${entity.date}` : 'none'}\n`);
    const t = await C.harvest(oa, term, [], { entity });
    C.baseline(t);
    const d = C.toData(t);
    delete d.totals; delete d.totalsAsOf;  // the share view is not checked; keeps snapshots small
    writeFileSync(join(SNAPSHOTS, `${slug(term)}.json`), JSON.stringify(d) + '\n');
  }
}

// Every page to check: the snapshots, and the gallery pages the site ships.
export function pages() {
  const list = TERMS.map(t => ({ name: `${t.term} (${t.field}, free view)`, file: join(SNAPSHOTS, `${slug(t.term)}.json`), expect: t.expect }));
  const snaps = list.map(p => ({ ...p, data: JSON.parse(readFileSync(p.file, 'utf8')) }));
  // Gallery pages as shipped: the data block inside each page, English and Chinese
  // (the Chinese pages carry their own translated data).
  const shipped = [];
  for (const [dir, tag] of [[GALLERY, 'gallery'], [join(GALLERY, 'zh'), 'zh gallery']]) {
    for (const f of readdirSync(dir).filter(f => f.endsWith('.html')).sort()) {
      const html = readFileSync(join(dir, f), 'utf8');
      const m = html.match(/<script type="application\/json" id="data">([\s\S]*?)<\/script>/);
      if (!m) throw new Error(`no data block in ${join(dir, f)}`);
      // The page runs its own inlined copy of the code; it must be today's code, or these
      // checks say nothing about what the page shows (rebuild with build_gallery.py).
      const stale = ['i18n.js', 'timeline.js', 'reading.js'].filter(n => !html.includes(readFileSync(join(WEB, n), 'utf8').replace(/<\/script/gi, '<\\/script')));
      shipped.push({ name: `${f.slice(0, -5)} (${tag}, model view)`, file: join(dir, f), data: JSON.parse(m[1]), stale });
    }
  }
  return [...snaps, ...shipped];
}

async function main() {
  if (process.argv.includes('--refresh')) await refresh();
  let failed = 0;
  for (const p of pages()) {
    const problems = [...(p.stale || []).map(n => `the page carries an old copy of ${n}; rebuild the gallery`), ...checkPage(p.data, { expect: p.expect })];
    const ta = TL.chartTakeoff(p.data);
    const cards = R.storyCards(p.data, R.readingModel(p.data)).map(c => `${c.key} ${c.year}`).join(', ');
    console.log(`${problems.length ? 'FAIL' : 'ok  '}  ${p.name}: takeoff ${ta ?? 'none'}; ${cards}`);
    for (const s of problems) console.log(`        - ${s}`);
    if (problems.length) failed++;
  }
  console.log(failed ? `\n${failed} page(s) with problems.` : '\nAll pages consistent.');
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch(e => { console.error(e); process.exit(2); });
