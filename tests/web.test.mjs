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
