// Offline tests for the browser code: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const C = require('../src/idealine/web/core.js');
const P = require('../src/idealine/web/providers.js');

const resp = (status, body, headers = {}) => ({
  status, ok: status >= 200 && status < 300,
  headers: { get: k => headers[k.toLowerCase()] ?? null },
  json: async () => body,
});

function work(id, year, title, abstract, cited = 0) {
  const idx = {};
  abstract.split(' ').forEach((w, i) => { (idx[w] ||= []).push(i); });
  return { id: `https://openalex.org/W${id}`, display_name: title, publication_year: year, publication_date: `${year}-01-01`,
    doi: `https://doi.org/10.1/${id}`, cited_by_count: cited, authorships: [{ author: { display_name: 'Ada Lovelace' } }], abstract_inverted_index: idx };
}

const WORKS = [
  work(1, 1990, 'Early paper', 'We study chain of thought in people. Nothing else here.', 5),
  work(2, 2022, 'Chain-of-thought prompting', 'Chain-of-thought prompting elicits reasoning. It works well.', 9000),
  work(3, 2025, 'Reasoning models', 'Models now learn a chain of thought during training.', 50),
];

function fakeOpenAlex(calls) {
  return async (url, init) => {
    calls.push({ url, init });
    const u = new URL(url);
    if (u.searchParams.get('group_by')) return resp(200, { group_by: [{ key: '2022', count: 10 }, { key: '1990', count: 1 }, { key: '2025', count: 30 }] });
    if (u.searchParams.get('search')) return resp(200, { results: [work(9, 1965, 'Speculations concerning the first ultraintelligent machine', 'x', 1)] });
    return resp(200, { results: WORKS });
  };
}

test('abstract rebuilds from the inverted index', () => {
  assert.equal(C.abstractFromIndex({ b: [1], a: [0], c: [2] }), 'a b c');
});

test('term pattern treats spaces and hyphens alike, and escapes regex characters', () => {
  const p = C.termPattern('chain of thought', ['C++ (lang)']);
  assert.ok(p.test('Chain-of-thought prompting'));
  assert.ok(p.test('we use C++ (lang) here'));
  assert.ok(!p.test('chains of thinking'));
});

test('harvest makes 4 OpenAlex requests, title+abstract filter, sorted counts, evidence IDs', async () => {
  const calls = [];
  const oa = new C.OpenAlex({ fetchFn: fakeOpenAlex(calls), sleep: async () => {} });
  const t = await C.harvest(oa, 'chain of thought', []);
  assert.equal(calls.length, 4);
  assert.ok(calls.every(c => new URL(c.url).searchParams.get('filter').startsWith('title_and_abstract.search.exact:"chain of thought" OR "chain of thoughts"')));
  assert.match(new URL(calls[3].url).searchParams.get('filter'), /publication_year:>2023$/);
  assert.deepEqual(t.counts, [[1990, 1], [2022, 10], [2025, 30]]);
  assert.deepEqual(t.evidence.map(e => e.eid), ['E1', 'E2', 'E3']);
  assert.equal(t.evidence[0].work.year, 1990);
  assert.ok(!('authorization' in (calls[0].init.headers || {})) && !calls[0].init.headers.Authorization);
});

test('OpenAlex key is sent as a Bearer token', async () => {
  const calls = [];
  const oa = new C.OpenAlex({ fetchFn: fakeOpenAlex(calls), apiKey: 'oa-test' });
  await oa.yearCounts('"x"');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer oa-test');
});

test('OpenAlex daily budget fails fast with advice', async () => {
  let n = 0;
  const oa = new C.OpenAlex({ fetchFn: async () => { n++; return resp(429, {}, { 'retry-after': '40000' }); }, sleep: async () => {} });
  await assert.rejects(oa.yearCounts('"x"'), /daily budget.*OpenAlex key/);
  assert.equal(n, 1);
});

test('applyAnalysis drops items without valid evidence and links works', async () => {
  const oa = new C.OpenAlex({ fetchFn: fakeOpenAlex([]), sleep: async () => {} });
  const t = await C.harvest(oa, 'chain of thought', []);
  await C.applyAnalysis(t, {
    summary: ' S. ',
    eras: [
      { start_year: 2022, end_year: 2025, label: 'LLM era', meaning: 'm', evidence: ['E2', 'E99'] },
      { start_year: 1990, end_year: 2021, label: 'Ghost', meaning: 'm', evidence: ['E404'] },
    ],
    milestones: [
      { year: 2022, kind: 'popularized', title: 'CoT', why: 'w', evidence: ['E2'], work_ref: 'E2' },
      { year: 1965, kind: 'ancestor', title: 'Speculations Concerning the First Ultraintelligent Machine', why: 'w', evidence: ['E1'], work_ref: '' },
      { year: 2023, kind: 'made-up', title: 'bad kind', why: 'w', evidence: ['E1'], work_ref: '' },
      { year: 2024, kind: 'critique', title: 'no evidence', why: 'w', evidence: [], work_ref: '' },
      { year: 'x', kind: 'origin', title: 'bad year', why: 'w', evidence: ['E1'], work_ref: '' },
    ],
  }, oa);
  assert.equal(t.summary, 'S.');
  assert.deepEqual(t.eras.map(e => e.label), ['LLM era']);
  assert.deepEqual(t.eras[0].evidence, ['E2']);
  assert.deepEqual(t.milestones.map(m => [m.year, m.link]), [[1965, 'resolved'], [2022, 'in-sample']]);
  const d = C.toData(t);
  assert.equal(d.total, 41);
  assert.equal(d.milestones[0].url, 'https://doi.org/10.1/9');
  assert.equal(d.milestones[1].evidence[0].authors, 'Ada Lovelace');
});

test('applyAnalysis survives junk model output', async () => {
  const t = { evidence: [], eras: [], milestones: [] };
  await C.applyAnalysis(t, null, null);
  await C.applyAnalysis(t, { eras: 'no', milestones: [null, 5, { evidence: 'E1' }] }, null);
  assert.deepEqual(t.milestones, []);
});

test('baseline picks earliest and most-cited works without duplicates', async () => {
  const oa = new C.OpenAlex({ fetchFn: fakeOpenAlex([]) });
  const t = C.baseline(await C.harvest(oa, 'chain of thought', []));
  const ids = t.milestones.map(m => m.work.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(t.milestones.length, 3);
});

// --- providers ----------------------------------------------------------------

const SCHEMA = { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'], additionalProperties: false };
const ANSWER = { summary: 'ok', eras: [], milestones: [] };

function capture(body) {
  const calls = [];
  const fetchFn = async (url, init) => { calls.push({ url, init, body: JSON.parse(init.body) }); return resp(200, body); };
  return { calls, fetchFn };
}

test('anthropic: browser header, json_schema output, parses text block', async () => {
  const { calls, fetchFn } = capture({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(ANSWER) }] });
  const out = await P.callModel('anthropic', { key: 'k1', model: 'm', system: 'S', prompt: 'U', schema: SCHEMA, fetchFn });
  assert.deepEqual(out, ANSWER);
  const c = calls[0];
  assert.equal(c.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(c.init.headers['x-api-key'], 'k1');
  assert.equal(c.init.headers['anthropic-dangerous-direct-browser-access'], 'true');
  assert.deepEqual(c.body.output_config.format, { type: 'json_schema', schema: SCHEMA });
  assert.equal(c.body.system, 'S');
});

test('anthropic: refusal and truncation are clear errors', async () => {
  for (const [stop, re] of [['refusal', /declined/], ['max_tokens', /cut off/]]) {
    const { fetchFn } = capture({ stop_reason: stop, content: [] });
    await assert.rejects(P.callModel('anthropic', { key: 'k', model: 'm', system: '', prompt: '', schema: SCHEMA, fetchFn }), re);
  }
});

test('openai and openrouter: strict json_schema via chat completions', async () => {
  for (const [id, url] of [['openai', 'https://api.openai.com/v1/chat/completions'], ['openrouter', 'https://openrouter.ai/api/v1/chat/completions']]) {
    const { calls, fetchFn } = capture({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(ANSWER) } }] });
    const out = await P.callModel(id, { key: 'k2', model: 'm', system: 'S', prompt: 'U', schema: SCHEMA, fetchFn });
    assert.deepEqual(out, ANSWER);
    assert.equal(calls[0].url, url);
    assert.equal(calls[0].init.headers.authorization, 'Bearer k2');
    assert.equal(calls[0].body.response_format.json_schema.strict, true);
    assert.deepEqual(calls[0].body.response_format.json_schema.schema, SCHEMA);
  }
});

test('gemini: key in header (not URL), json schema config, joins text parts', async () => {
  const { calls, fetchFn } = capture({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"summary":' }, { text: '"ok","eras":[],"milestones":[]}' }] } }] });
  const out = await P.callModel('gemini', { key: 'k3', model: 'gemini-x', system: 'S', prompt: 'U', schema: SCHEMA, fetchFn });
  assert.deepEqual(out, ANSWER);
  assert.ok(!calls[0].url.includes('k3'));
  assert.equal(calls[0].init.headers['x-goog-api-key'], 'k3');
  assert.equal(calls[0].body.generationConfig.responseMimeType, 'application/json');
  await assert.rejects(P.callModel('gemini', { key: 'k', model: '../evil?x=1', system: '', prompt: '', schema: SCHEMA, fetchFn }), /characters/);
});

test('HTTP errors become actionable messages that never include the key', async () => {
  for (const [status, re] of [[401, /rejected the key/], [404, /model/], [429, /limit/], [400, /refused/]]) {
    const fetchFn = async () => resp(status, { error: { message: 'detail here' } });
    const err = await P.callModel('openai', { key: 'sk-secret-123', model: 'm', system: '', prompt: '', schema: SCHEMA, fetchFn }).catch(e => e);
    assert.match(err.message, re);
    assert.ok(!err.message.includes('sk-secret-123'));
  }
});

test('parseJson tolerates code fences and rejects prose', () => {
  assert.deepEqual(P.parseJson('X', '```json\n{"a":1}\n```'), { a: 1 });
  assert.throws(() => P.parseJson('X', 'Sure! Here you go'), /not valid JSON/);
});

// --- regressions from the review ------------------------------------------------

test('term pattern works for CJK, accented, and symbol-led terms, still respects word starts', () => {
  assert.ok(C.termPattern('注意力机制', []).test('基于注意力机制的模型。'));
  assert.ok(C.termPattern('élan vital', []).test('We study élan vital here.'));
  assert.ok(C.termPattern('.NET', []).test('built on .NET today'));
  assert.ok(!C.termPattern('art', []).test('a smart model'));
  assert.equal(C.sentencesWithTerm('Übermensch ist alt. Nichts.', C.termPattern('Übermensch', [])).length, 1);
});

test('sentence truncation counts code points and never splits a surrogate pair', () => {
  const s = 'chain of thought ' + 'a'.repeat(432) + '𝑥';
  const [out] = C.sentencesWithTerm(s, C.termPattern('chain of thought', []));
  assert.equal(out, s);
  const long = 'chain of thought ' + '𝑥'.repeat(600);
  const [cut] = C.sentencesWithTerm(long, C.termPattern('chain of thought', []));
  assert.equal([...cut].length, 450);
  assert.ok(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(cut));
});

test('model years outside a sane window are dropped (no runaway chart)', async () => {
  const oa = new C.OpenAlex({ fetchFn: fakeOpenAlex([]) });
  const t = await C.harvest(oa, 'chain of thought', []);
  await C.applyAnalysis(t, {
    summary: '', eras: [{ start_year: 2025, end_year: 2020, label: 'backwards', meaning: '', evidence: ['E1'] }],
    milestones: [
      { year: 2000000000, kind: 'origin', title: 'huge', why: '', evidence: ['E1'], work_ref: 'E1' },
      { year: 1, kind: 'origin', title: 'tiny', why: '', evidence: ['E1'], work_ref: 'E1' },
      { year: 1990, kind: 'origin', title: 'ok', why: '', evidence: ['E1'], work_ref: 'E1' },
    ],
  }, null);
  assert.deepEqual(t.eras, []);
  assert.deepEqual(t.milestones.map(m => m.title), ['ok']);
});

test('OpenAlex short 429 waits Retry-After then gives a friendly message; long waits show minutes', async () => {
  const waits = [];
  const oa = new C.OpenAlex({ fetchFn: async () => resp(429, {}, { 'retry-after': '7' }), sleep: async ms => { waits.push(ms); } });
  await assert.rejects(oa.yearCounts('"x"'), /rate-limiting/);
  assert.deepEqual(waits, [7000, 7000, 7000]);
  const oa2 = new C.OpenAlex({ fetchFn: async () => resp(429, {}, { 'retry-after': '600' }) });
  await assert.rejects(oa2.yearCounts('"x"'), /about 10 min/);
});

test('top-level error in a 200 chat response is shown', async () => {
  const { fetchFn } = capture({ error: { message: 'Provider returned error: upstream 503', code: 502 } });
  await assert.rejects(P.callModel('openrouter', { key: 'k', model: 'm', system: '', prompt: '', schema: SCHEMA, fetchFn }), /upstream 503/);
});

test('gemini accepts the models/ prefix', async () => {
  const { calls, fetchFn } = capture({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{}' }] } }] });
  await P.callModel('gemini', { key: 'k', model: 'models/gemini-x', system: '', prompt: '', schema: SCHEMA, fetchFn });
  assert.match(calls[0].url, /\/models\/gemini-x:generateContent$/);
});

test('anthropic retries once without effort when the model rejects it', async () => {
  const bodies = [];
  const fetchFn = async (url, init) => {
    const b = JSON.parse(init.body); bodies.push(b);
    if (b.output_config.effort) return resp(400, { error: { message: 'effort is not supported on this model' } });
    return resp(200, { stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: '{"summary":"ok"}' }] });
  };
  const out = await P.callModel('anthropic', { key: 'k', model: 'claude-old', system: '', prompt: '', schema: SCHEMA, fetchFn });
  assert.deepEqual(out, { summary: 'ok' });
  assert.equal(bodies.length, 2);
  assert.ok(!('effort' in bodies[1].output_config));
});

// --- quality fixes from real-data testing (2026-11-17) -------------------------

import { readFileSync } from 'node:fs';
const CASES = JSON.parse(readFileSync(new URL('./inflection_cases.json', import.meta.url), 'utf8'));

test('inflections match the shared table (same table as the Python test)', () => {
  for (const [phrase, want] of Object.entries(CASES)) assert.deepEqual(C.inflections(phrase), want, phrase);
  assert.deepEqual(C.withInflections('scaling laws', ['scaling law']), ['scaling law']);
});

test('harvest uses exact search with singular/plural variants', async () => {
  const calls = [];
  const oa = new C.OpenAlex({ fetchFn: fakeOpenAlex(calls) });
  const t = await C.harvest(oa, 'world model', []);
  assert.equal(new URL(calls[0].url).searchParams.get('filter'), 'title_and_abstract.search.exact:"world model" OR "world models"');
  assert.deepEqual(t.aliases, []);  // variants are searched, not shown as aliases
});

test('onset year and flagged early record in free mode', () => {
  assert.equal(C.onsetYear([[1800, 1], [2024, 50], [2025, 900]]), 2024);
  const w = (id, year, cited) => ({ id, year, title: 'T' + id, citedBy: cited, shortAuthors: 'A' });
  const t = { counts: [[1800, 1], [2024, 50], [2025, 900]], milestones: [], evidence: [
    { eid: 'E1', work: w('a', 1800, 1) }, { eid: 'E2', work: w('b', 2024, 5) }, { eid: 'E3', work: w('c', 2024, 9) }, { eid: 'E4', work: w('d', 2025, 99) } ] };
  C.baseline(t);
  const origins = t.milestones.filter(m => m.kind === 'origin');
  assert.deepEqual(origins.map(m => m.year), [1800, 2024, 2024]);
  assert.match(origins[0].why, /sometimes wrong/);
  assert.equal(origins[1].why, 'One of the earliest uses found.');
});

test('Chinese text splits into sentences at 。！？', () => {
  const out = C.sentencesWithTerm('第一句没有。基于注意力机制的模型很好！最后一句。', C.termPattern('注意力机制', []));
  assert.deepEqual(out, ['基于注意力机制的模型很好！']);
});

// --- interface language -------------------------------------------------------
const I = require('../src/idealine/web/i18n.js');

test('language follows the saved choice, then the browser', () => {
  assert.equal(I.detectLang('en', 'zh-CN'), 'en');
  assert.equal(I.detectLang(null, 'zh-TW'), 'zh');
  assert.equal(I.detectLang(null, 'en-US'), 'en');
  assert.equal(I.detectLang('fr', undefined), 'en');
});

test('both languages define the same interface keys', () => {
  assert.deepEqual(Object.keys(I.T.zh).sort(), Object.keys(I.T.en).sort());
  assert.deepEqual(Object.keys(I.KINDS.zh).sort(), Object.keys(I.KINDS.en).sort());
});

test('known runtime messages are translated; unknown ones stay as they are', () => {
  assert.equal(I.trMessage('zh', 'Counting papers per year…'), '正在统计每年的论文数……');
  assert.match(I.trMessage('zh', 'Claude rejected the key (401). Check that you pasted the whole key and that it is active.'), /^Claude 拒绝了这个 key（401）/);
  assert.match(I.trMessage('zh', "OpenAlex's free daily budget for your network is used up (resets in about 3 h, at midnight UTC). Add a free OpenAlex key under \"Options and model key\", or try again later."), /3 小时/);
  assert.equal(I.trMessage('zh', 'Something new'), 'Something new');
  assert.equal(I.trMessage('en', 'Counting papers per year…'), 'Counting papers per year…');
});

test('buildPrompt appends the output-language instruction only when given', () => {
  const t = { term: 'x', aliases: [], counts: [[2020, 1]], evidence: [] };
  assert.ok(!C.buildPrompt(t).includes('Output language'));
  assert.ok(C.buildPrompt(t, 'Write in Simplified Chinese.').endsWith('Output language: Write in Simplified Chinese.'));
});

test('fineYears picks quarter years only for young terms', () => {
  assert.deepEqual(C.fineYears([[1800, 1], [2025, 120], [2026, 700]]), [2025, 2026]);
  assert.deepEqual(C.fineYears([[2019, 40], [2022, 300], [2026, 900]]), []);
  assert.deepEqual(C.fineYears([]), []);
});

test('quarterCounts skips future quarters and keeps year-only dates out of Q1', async () => {
  const seen = [];
  const oa = new C.OpenAlex({ apiKey: 'k', sleep: async () => {}, fetchFn: async url => {
    const f = new URL(url).searchParams.get('filter');
    seen.push(f);
    const [, a, b] = /from_publication_date:([\d-]+),to_publication_date:([\d-]+)/.exec(f);
    return resp(200, { meta: { count: a === b ? 5 : 10 } });
  } });
  const r = await oa.quarterCounts('"x"', [2025, 2026], new Date('2026-05-03T00:00:00Z'));
  assert.deepEqual(r.quarters.map(q => q[0]), ['2025-Q1', '2025-Q2', '2025-Q3', '2025-Q4', '2026-Q1', '2026-Q2']);
  assert.deepEqual(r.undated, [[2025, 5], [2026, 5]]);
  assert.ok(seen.some(f => f.endsWith('from_publication_date:2025-01-02,to_publication_date:2025-03-31')));
  assert.ok(seen.some(f => f.endsWith('from_publication_date:2025-10-01,to_publication_date:2025-12-31')));
  assert.equal(seen.length, 8);
});

test('harvest without an OpenAlex key makes no quarter requests', async () => {
  const calls = [];
  const oa = new C.OpenAlex({ fetchFn: fakeOpenAlex(calls), sleep: async () => {} });
  const t = await C.harvest(oa, 'chain of thought', []);
  assert.deepEqual(t.quarters, []);
  assert.ok(calls.every(c => !/from_publication_date/.test(new URL(c.url).searchParams.get('filter') || '')));
});

test('other senses: meaning goes into the prompt; senses need valid evidence', async () => {
  const t = { term: 'super agent', aliases: [], meaning: 'AI agents', counts: [[2026, 2]], quarters: [], evidence: [
    { eid: 'E1', text: 'a super agent for sports', work: { title: 'A', year: 2009 } },
    { eid: 'E2', text: 'an AI super agent', work: { title: 'B', year: 2026 } }] };
  assert.match(C.buildPrompt(t), /Meaning the reader has in mind: AI agents/);
  await C.applyAnalysis(t, { focus: 'AI agents that use tools', summary: 's', eras: [],
    milestones: [{ year: 2026, kind: 'coined', title: 'B', why: 'w', evidence: ['E2'], work_ref: 'E2', in_sense: true, coinage: false, shift: 'bogus' }],
    senses: [{ key: 'S1', label: 'AI agent', definition: 'd', related: true }, { key: 'S2', label: 'Sports agent', definition: 'm', related: false }, 'junk'],
    quote_senses: [{ id: 'E1', sense: 'S2' }, { id: 'E2', sense: 'S1' }, { id: 'E9', sense: 'S1' }, null] }, null);
  assert.equal(t.focus, 'AI agents that use tools');
  assert.deepEqual(t.otherSenses.map(s => s.label), ['Sports agent']);
  assert.deepEqual(t.evidence.map(e => e.sense), ['S2', 'S1']);
  assert.deepEqual([t.milestones[0].inSense, t.milestones[0].coinage, t.milestones[0].shift], [true, false, '']);
  const d = C.toData(t);
  assert.equal(d.otherSenses[0].evidence[0].text, 'a super agent for sports');
  assert.equal(d.quotes[1].sense, 'S1');
  assert.deepEqual(d.milestones[0].checks, { inSense: true, coinage: false });
});

test('in-set citations: count citations from other sampled papers', () => {
  const w = (id, refs) => ({ id, refs, inSet: 0 });
  const works = new Map([['A', w('A', [])], ['B', w('B', ['A'])], ['C', w('C', ['B', 'B', 'C'])], ['D', w('D', ['B', 'X'])]]);
  C.countInSet(works);
  assert.deepEqual([...works.values()].map(x => x.inSet), [1, 2, 0, 0]);
  const wj = C.workFromJson({ id: 'https://openalex.org/W1', primary_topic: { field: { display_name: 'Computer Science' } }, referenced_works: ['https://openalex.org/W2', 5] });
  assert.equal(wj.field, 'Computer Science');
  assert.deepEqual(wj.refs, ['W2']);
});

const TL = require('../src/idealine/web/timeline.js');

test('takeoff: awakening year sits where the slow start ends', () => {
  const counts = [[2010, 1], [2011, 1], [2012, 2], [2013, 1], [2014, 2], [2015, 3], [2016, 20], [2017, 80], [2018, 200]];
  assert.equal(TL.awakening(counts), 2016);  // farthest below the first-to-peak line (Ke et al. 2015)
  assert.equal(TL.awakening([[2020, 1], [2021, 2]]), null);
  assert.equal(TL.takeoff(counts), 2016);
  // vibe coding: the awakening point is 2024 (no papers yet); takeoff is 2025.
  const vc = [[2019, 1], [2020, 1], [2025, 127], [2026, 777]];
  assert.equal(TL.awakening(vc), 2024);
  assert.equal(TL.takeoff(vc), 2025);
});

test('bursts: Kleinberg finds the high-rate run, with or without totals', () => {
  const counts = [[2000, 2], [2001, 3], [2002, 2], [2003, 3], [2004, 40], [2005, 45], [2006, 3], [2007, 2]];
  assert.deepEqual(TL.bursts(counts), [[2004, 2005]]);
  const totals = counts.map(([y]) => [y, 100000]);
  assert.deepEqual(TL.bursts(counts, totals), [[2004, 2005]]);
  assert.deepEqual(TL.bursts([[2000, 5], [2001, 5], [2002, 5]]), []);
});

test('sense mix: Jensen-Shannon distance and the k=2/n=5 rule', () => {
  assert.equal(TL.jsDistance({ a: 5 }, { a: 9 }), 0);
  assert.ok(Math.abs(TL.jsDistance({ a: 5 }, { b: 5 }) - 1) < 1e-9);
  assert.equal(TL.jsDistance({}, { a: 1 }), null);
  assert.deepEqual(TL.senseChange({ a: 6, b: 1 }, { a: 1, b: 7 }), { gained: ['b'], lost: ['a'] });
});

test('co-terms skip stop words and the term itself; month placement ignores 1 January', () => {
  const w = TL.wordCounts(['We study super agents for routing tasks.', 'Routing with tools.'], new Set(['super', 'agent', 'agents']));
  assert.equal(w.get('routing'), 2);
  assert.ok(!w.has('super') && !w.has('with') && !w.has('agents'));
  assert.equal(TL.timeOf(2025, '2025-03-10', 0.5), 2025 + 2.5 / 12);
  assert.equal(TL.timeOf(2025, '2025-01-01', 0.5), 2025.5);
});

test('roots: plan picks repeated references; rpys marks the peak year', () => {
  const mk = (id, refs, inSet) => ({ work: { id, refs, inSet, citedBy: 0 } });
  const ev = [mk('A', ['R1', 'R2'], 3), mk('B', ['R1'], 1), mk('B', ['R1'], 1)];
  const plan = C.rootsPlan(ev);
  assert.equal(plan.papers, 2);
  assert.deepEqual(plan.ids, ['R1', 'R2']);  // fewer than 50 repeated: all, most-cited first
  const items = Array.from({ length: 10 }, (_, i) => ({ year: 1990 + i, n: 2, title: 'T' + i, url: 'u', authors: 'A' }));
  items.push({ year: 1995, n: 30, title: 'Root paper', url: 'u', authors: 'B' });
  const r = C.rpys(items);
  assert.equal(r.peaks[0].title, 'Root paper');
  assert.equal(r.spectrum.length, 10);
});
