// Offline tests for the browser code: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const C = require('../src/idealine/web/core.js');
const P = require('../src/idealine/web/providers.js');
const R = require('../src/idealine/web/reading.js');

test('automatic reading route keeps the recent label on the newest source', () => {
  const quotes = [2018,2019,2023].map(year=>({id:String(year),year,text:'A world model.',url:`https://example.org/${year}`}));
  const model = R.readingModel({quotes});
  assert.deepEqual(model.featured.map(q=>q.year),[2018,2019,2023]);
});

test('date warning flags only records cut off by a long gap, not early uses of a fast-growing term', () => {
  const q = (id, year) => ({ id, year, text: `uses the term ${id}`, url: `https://example.org/${id}`, title: id, authors: 'A' });
  // Like chain-of-thought: a stray 1914 record, steady use from 2012, then a surge.
  const counts = [[1914, 1], ...Array.from({ length: 10 }, (_, i) => [2012 + i, 2]), [2022, 40], [2023, 900], [2024, 3000], [2025, 5000]];
  const m = R.readingModel({ quotes: [q('E1', 1914), q('E2', 2022), q('E3', 2024)], counts, generated: '2026-11-17' });
  const w = Object.fromEntries(m.quotes.map(x => [x.id, x.warning]));
  assert.equal(w.E1, 'dateWarning');
  assert.equal(w.E2, '');
  assert.ok(m.featured.some(x => x.id === 'E2'));
});

test('reading brief uses the quote source, never a resolved milestone target', () => {
  const quote = {id:'E1',text:'A world model represents an environment.',title:'Actual source',url:'https://example.org/source',year:2024};
  const model = R.readingModel({counts:[[2024,10]],generated:'2026-11-17',milestones:[{url:'https://example.org/wrong-match',evidence:[quote]}]});
  assert.equal(model.featured[0].url, quote.url);
  assert.ok(!R.citationText(model.featured[0]).includes('wrong-match'));
});

test('starting points exclude unsafe, title-only, future and sparse early records', () => {
  const quotes = [
    {id:'bad',year:1900,url:'https://example.org/old'},
    {id:'future',year:2030,url:'https://example.org/future'},
    {id:'title',year:2025,url:'https://example.org/title',fromTitle:true},
    {id:'script',year:2025,url:'javascript:alert(1)'},
    {id:'valid',year:2025,url:'https://example.org/a'},
    {id:'duplicate-paper',year:2025,url:'https://example.org/a'},
  ].map(q=>({...q,text:'passage '+q.id,title:q.id}));
  const m=R.readingModel({quotes,counts:[[1900,1],[2025,100]],generated:'2026-11-17'});
  assert.deepEqual(m.featured.map(q=>q.id),['valid']);
  assert.equal(m.quotes[0].warning,'dateWarning');
  assert.equal(m.quotes[1].warning,'futureWarning');
  assert.equal(m.quotes.length,6);
});

test('review metadata is invalidated when a passage or its source changes', () => {
  const quote={id:'E1',year:2024,text:'An exact quotation.',title:'Source',url:'https://example.org/a'};
  const entry={...quote,checkedUrl:'https://example.org/checked',checked:'2026-11-17'};
  const data={quotes:[quote],counts:[[2024,3]],readingGuide:{entries:[entry]}};
  assert.equal(R.readingModel(data).curated,true);
  assert.equal(R.readingModel({...data,quotes:[{...quote,text:'An altered quotation.'}]}).curated,false);
  assert.equal(R.readingModel({...data,quotes:[{...quote,url:'https://example.org/b'}]}).curated,false);
});

test('free mode supports missing dates, no labels, filtering and empty results', () => {
  const quotes=[{id:'a',text:'A',year:null},{id:'b',text:'B',year:2025,sense:'s1'},{id:'c',text:'C',year:2024}];
  const m=R.readingModel({quotes,counts:[]});
  assert.equal(m.quotes.length,3);
  assert.deepEqual(R.filterQuotes(m.quotes,{order:'oldest'}).map(q=>q.id),['c','b','a']);
  assert.deepEqual(R.filterQuotes(m.quotes,{year:'unknown'}).map(q=>q.id),['a']);
  assert.deepEqual(R.filterQuotes(m.quotes,{sense:'s1',year:'2024'}),[]);
  assert.deepEqual(R.readingModel({}).featured,[]);
});

test('copied passages preserve the exact quotation and full source attribution', () => {
  const q={text:'Quoted “text” & symbols.\nA second line.',title:'Original title',authors:'A. Author',year:2024,url:'https://example.org/paper',fromTitle:false,warning:'dateWarning'};
  const copy=R.citationText(q);
  for(const value of [q.text,q.title,q.authors,String(q.year),q.url,R.TEXT.en.dateWarning]) assert.ok(copy.includes(value));
  assert.match(R.citationText({...q,fromTitle:true},'zh'),/^仅标题匹配/);
});

test('source cards escape paper text, labels and links without breaking highlights', () => {
  const m=R.readingModel({quotes:[{id:'a',text:'<script>x</script> world model & <b>y</b>',title:'<img src=x>',url:'javascript:alert(1)',year:null}]});
  const html=R.quoteCard(m.quotes[0],{terms:['world model'],label:'<img onerror=x>'});
  assert.ok(!html.includes('<script>') && !html.includes('<img') && !html.includes('javascript:'));
  assert.ok(html.includes('<mark>world model</mark>') && html.includes('&amp;'));
  assert.equal(R.highlight('C++ (lang)', ['C++ (lang)']),'<mark>C++ (lang)</mark>');
});

test('downloaded pages contain the saved evidence safely and mount the same reader', () => {
  const d={term:'<term>',quotes:[{text:'</script><script>bad()</script>'}]};
  const spec={siteUrl:'https://example.org/',pageShell:'<h1>{term}</h1><div data-part="reading"></div>',css:'',i18nJs:'',timelineJs:'',readingJs:''};
  const html=R.pageHtml(d,spec,'zh');
  assert.ok(html.includes('<h1>&lt;term&gt;</h1>') && html.includes('lang="zh-CN"'));
  assert.ok(!html.includes('<script>bad()'));
  const embedded=html.split('id="data">')[1].split('</script>')[0];
  assert.deepEqual(JSON.parse(embedded),d);
  assert.ok(html.includes('IdealineReading.mountPage'));
});

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

// --- streamed Anthropic answers ------------------------------------------------

function sseResp(chunks, { throwAt = -1 } = {}) {
  const enc = new TextEncoder();
  let i = 0;
  return {
    status: 200, ok: true, headers: { get: () => null },
    body: { getReader: () => ({ read: async () => {
      if (i === throwAt) throw new TypeError('network error');
      return i < chunks.length ? { value: enc.encode(chunks[i++]), done: false } : { value: undefined, done: true };
    } }) },
  };
}
const ev = o => `event: ${o.type}\ndata: ${JSON.stringify(o)}\n\n`;
function streamOf(text, stop = 'end_turn') {
  const half = Math.floor(text.length / 2);
  const all = [
    ev({ type: 'message_start', message: { id: 'm' } }),
    ev({ type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '' } }),
    ev({ type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: '{"not":"this"}' } }),
    ev({ type: 'content_block_start', index: 1, content_block: { type: 'text', text: '' } }),
    ev({ type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: text.slice(0, half) } }),
    ev({ type: 'ping' }),
    ev({ type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: text.slice(half) } }),
    ev({ type: 'message_delta', delta: { stop_reason: stop } }),
    ev({ type: 'message_stop' }),
  ].join('');
  // Cut at odd places so events are split across chunks.
  return [all.slice(0, 37), all.slice(37, 300), all.slice(300)];
}

test('anthropic: streams with low effort, joins text deltas, skips thinking', async () => {
  const bodies = [], seen = [];
  const fetchFn = async (url, init) => { bodies.push(JSON.parse(init.body)); return sseResp(streamOf(JSON.stringify(ANSWER))); };
  const out = await P.callModel('anthropic', { key: 'k', model: 'm', system: '', prompt: '', schema: SCHEMA, fetchFn, onText: t => seen.push(t) });
  assert.deepEqual(out, ANSWER);
  assert.equal(bodies[0].stream, true);
  assert.equal(bodies[0].output_config.effort, 'low');
  assert.equal(seen.length, 2);
  assert.equal(seen[1], JSON.stringify(ANSWER));
});

test('anthropic stream: refusal, mid-stream error, and a dropped connection are clear', async () => {
  const call = fetchFn => P.callModel('anthropic', { key: 'k', model: 'm', system: '', prompt: '', schema: SCHEMA, fetchFn });
  await assert.rejects(call(async () => sseResp(streamOf('', 'refusal'))), /declined/);
  await assert.rejects(call(async () => sseResp([ev({ type: 'message_start', message: {} }), ev({ type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } })])), /overloaded/);
  await assert.rejects(call(async () => sseResp(streamOf('{"summary":"ok"}'), { throwAt: 1 })), /connection dropped/);
  await assert.rejects(call(async () => sseResp([ev({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: '{"su' } })])), /connection dropped/);
});

test('streaming errors are translated in the Chinese interface', () => {
  const I = require('../src/idealine/web/i18n.js');
  for (const m of ['Anthropic is overloaded right now. Wait a minute and try again.', 'Anthropic stopped with an error: boom',
    'The connection dropped while the answer was coming in. Try again.']) assert.match(I.trMessage('zh', m), /[\u4e00-\u9fff]/, m);
});

test('sse parser handles CRLF and events split across chunks', () => {
  const p = P.sseParser();
  assert.deepEqual(p.push('event: a\r\ndata: {"x"'), []);
  assert.deepEqual(p.push(':1}\r\n\r\ndata: {"y":2}\n\n'), [{ x: 1 }, { y: 2 }]);
  assert.deepEqual(p.push('data: {"z":3}'), []);
  assert.deepEqual(p.end(), [{ z: 3 }]);
});

test('answerProgress follows the schema order and ignores keys inside strings', () => {
  const full = JSON.stringify({ focus: 'f', summary: 'it says "eras": a lot', senses: [{ key: 'a', label: 'x', definition: 'd', related: true }],
    quote_senses: [{ id: 'E1', sense: 'a' }, { id: 'E2', sense: 'a' }], eras: [{ start_year: 1, end_year: 2, label: 'l', meaning: 'm', evidence: [] }],
    milestones: [{ year: 1, kind: 'coined', title: 't', why: 'w', evidence: [], work_ref: '', in_sense: true, coinage: false, shift: 'none' }] });
  assert.equal(C.answerProgress(full.slice(0, full.indexOf('"senses"'))), null);
  assert.deepEqual(C.answerProgress(full.slice(0, full.indexOf('"quote_senses"'))), { stage: 'senses', n: 1 });
  assert.deepEqual(C.answerProgress(full.slice(0, full.indexOf('"eras"'))), { stage: 'tags', n: 2 });
  assert.deepEqual(C.answerProgress(full), { stage: 'milestones', n: 1 });
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
  assert.match(I.trMessage('zh', "OpenAlex's free daily budget for your network is used up (resets in about 3 h, at midnight UTC). Add a free OpenAlex key under \"Settings → OpenAlex key\", or try again later."), /3 小时/);
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

test('every browser script parses', () => {
  for (const f of ['i18n.js', 'core.js', 'providers.js', 'timeline.js', 'reading.js']) assert.doesNotThrow(() => require(`../src/idealine/web/${f}`), f);
  const I = require('../src/idealine/web/i18n.js');
  assert.ok(I.T.en.heroTitle && I.T.zh.heroTitle);
});

test('a phrase with no papers offers shorter forms, never a lone word', () => {
  assert.deepEqual(C.shorterPhrases('real-time omni models'), ['real time omni models', 'omni models', 'real-time omni']);
  for (const bad of ['of experts', 'mixture of']) assert.ok(!C.shorterPhrases('mixture of experts routing').includes(bad));
  assert.ok(C.shorterPhrases('mixture of experts routing').includes('mixture of experts') || C.shorterPhrases('mixture of experts routing').includes('experts routing'));
  assert.ok(C.shorterPhrases('scaling laws for neural language models').includes('scaling laws'), 'long phrases still reach the core term');
  assert.deepEqual(C.shorterPhrases('omni model'), ['omni-model']);
  assert.deepEqual(C.shorterPhrases('agentic'), []);
  assert.ok(C.shorterPhrases('a b c d e f').length <= 4);
});

test('shorter-form suggestions keep only phrases with papers, most used first, and fail quietly', async () => {
  const seen = [];
  const oa = { count: async q => { seen.push(q); return q.includes('"omni models"') ? 120 : q.includes('"real-time omni"') ? 3 : 0; } };
  assert.deepEqual(await C.suggestPhrases(oa, 'real-time omni models'), [{ phrase: 'omni models', count: 120 }, { phrase: 'real-time omni', count: 3 }]);
  assert.ok(seen.some(q => q.includes('"omni models"') && q.includes('"omni model"')), 'singular/plural counted together');
  const broken = { count: async () => { throw new C.IdealineError('budget'); } };
  assert.deepEqual(await C.suggestPhrases(broken, 'real-time omni models'), []);
});

test('OpenAlex count reads meta.count from a one-result request', async () => {
  const urls = [];
  const oa = new C.OpenAlex({ fetchFn: async u => { urls.push(u); return resp(200, { meta: { count: 42 }, results: [] }); } });
  assert.equal(await oa.count('"omni model"'), 42);
  assert.ok(urls[0].includes('per_page=1') && urls[0].includes('title_and_abstract.search.exact'));
});

test('model menus list only chat models that can return JSON, and never fail loudly', async () => {
  assert.deepEqual(P.modelIds('openai', { data: [{ id: 'gpt-6.1-terra' }, { id: 'text-embedding-3-large' }, { id: 'gpt-4o-realtime-preview' }, { id: 'o4-mini' }] }), ['gpt-6.1-terra', 'o4-mini']);
  assert.deepEqual(P.modelIds('gemini', { models: [{ name: 'models/gemini-4-hydrogen', supportedGenerationMethods: ['generateContent'] }, { name: 'models/embed-1', supportedGenerationMethods: ['embedContent'] }] }), ['gemini-4-hydrogen']);
  assert.deepEqual(P.modelIds('openrouter', { data: [{ id: 'a/x', supported_parameters: ['structured_outputs'] }, { id: 'b/y', supported_parameters: [] }] }), ['a/x']);
  assert.deepEqual(await P.listModels('anthropic', 'k', async () => { throw new Error('offline'); }), []);
  assert.deepEqual(await P.listModels('anthropic', 'k', async () => resp(401, {})), []);
});

test('evidence period filter accepts single years, ranges and unknown', () => {
  const qs=[{id:'a',year:2026},{id:'b',year:2015},{id:'c',year:null},{id:'d',year:1999}];
  assert.deepEqual(R.filterQuotes(qs,{year:'2010-2019'}).map(q=>q.id),['b']);
  assert.deepEqual(R.filterQuotes(qs,{year:'0-1999'}).map(q=>q.id),['d']);
  assert.deepEqual(R.filterQuotes(qs,{year:'2026'}).map(q=>q.id),['a']);
  assert.deepEqual(R.filterQuotes(qs,{year:'unknown'}).map(q=>q.id),['c']);
});

test('"other meanings" groups every meaning that only shares the words', () => {
  const qs=[{id:'a',year:1,sense:'s1'},{id:'b',year:1,sense:'s2'},{id:'c',year:1,sense:'s3'}];
  assert.deepEqual(R.filterQuotes(qs,{sense:'other',others:new Set(['s2','s3'])}).map(q=>q.id).sort(),['b','c']);
});

test('free mode marks the most-cited paper of each of the last three years', () => {
  const w = (id, year, cited) => ({ id, year, title: 'T' + id, citedBy: cited, shortAuthors: 'A' });
  // Old papers hold the all-time citations; the recent surge would otherwise get no markers.
  const ev = [['a', 2000, 900], ['b', 2001, 800], ['c', 2002, 700], ['d', 2003, 600], ['e', 2004, 500], ['f', 2005, 400], ['g', 2006, 300],
    ['h', 2024, 4], ['i', 2024, 9], ['j', 2025, 7], ['k', 2026, 1]].map(([id, y, c], n) => ({ eid: 'E' + n, work: w(id, y, c) }));
  const t = C.baseline({ counts: [[2000, 3], [2024, 40], [2025, 90], [2026, 30]], milestones: [], evidence: ev });
  const recent = t.milestones.filter(m => m.year >= 2024).map(m => m.work.id);
  assert.deepEqual(recent, ['i', 'j', 'k']);
  assert.equal(new Set(t.milestones.map(m => m.work.id)).size, t.milestones.length);
});

test('chart and headline share one takeoff year, ignoring stray early records', () => {
  // A misdated 1979 record, then real use from 1994; whole-series and main-run takeoff differ.
  const cs = [[1979, 1], [1994, 1], [1995, 1], [1998, 1], [2001, 1], [2004, 2], [2006, 2], [2009, 3], [2011, 4], [2014, 6], [2016, 10],
    [2018, 14], [2020, 18], [2022, 30], [2023, 40], [2024, 95], [2025, 160], [2026, 182]];
  const r = TL.mainRun(cs);
  assert.equal(r.first, 1994);
  assert.ok(r.ta === null || r.ta > r.first);
  assert.equal(TL.mainRun([]).ta, null);
});

test('a test code opens the key sealed by scripts/seal_key.py, and a wrong code does not', async () => {
  const fx = JSON.parse(require('node:fs').readFileSync(new URL('./fixtures/sealed-key.json', import.meta.url), 'utf8'));
  assert.equal(await P.unsealKey(fx.blob, '  ABCD-efgh-JKMN '), fx.key);  // case, spaces and dashes ignored, like seal_key.py
  assert.equal(await P.unsealKey(fx.blob, 'abcd efgh jkmn'), fx.key);
  assert.equal(await P.unsealKey(fx.blob, 'abcdefghjkmn'), fx.key);
  assert.equal(await P.unsealKey(fx.blob, 'abcd–efgh–jkmn'), fx.key);  // en dash from a phone keyboard
  await assert.rejects(P.unsealKey(fx.blob, 'abcd-efgh-jkmm'), /did not work/);
  await assert.rejects(P.unsealKey(null, fx.code), /No test key/);
  await assert.rejects(P.unsealKey({ ...fx.blob, provider: 'nope' }, fx.code), /No test key/);
});

// --- names (Wikidata) and misdated records ---------------------------------------

// A fake Wikidata: search hits, then entities by ID (items and their classes).
function fakeWikidata(hits, entities, calls = []) {
  return async url => {
    const u = new URL(url);
    calls.push(u);
    if (u.searchParams.get('action') === 'wbsearchentities') return resp(200, { search: hits });
    const out = {};
    for (const id of u.searchParams.get('ids').split('|')) if (entities[id]) out[id] = entities[id];
    return resp(200, { entities: out });
  };
}
const snak = (p, value) => ({ [p]: [{ rank: 'normal', mainsnak: { datavalue: { value } } }] });
const item = (p31, dates, links = 20, extra = {}) => ({
  labels: { en: { value: extra.label || 'X' } }, descriptions: { en: { value: extra.desc || 'd' } },
  sitelinks: Object.fromEntries(Array.from({ length: links }, (_, i) => [`w${i}`, {}])),
  claims: { P31: p31.map(id => ({ rank: 'normal', mainsnak: { datavalue: { value: { id } } } })),
    ...(dates.inc ? snak('P571', { time: dates.inc }) : {}), ...(dates.pub ? snak('P577', { time: dates.pub }) : {}) },
});
const hit = (id, text) => ({ id, match: { type: 'label', text } });

test('lookupEntity: an organization gets its founding year as the floor', async () => {
  const calls = [];
  const e = await C.lookupEntity('OpenAI', { fetchFn: fakeWikidata([hit('Q1', 'OpenAI')],
    { Q1: item(['Q4830453'], { inc: '+2015-12-08T00:00:00Z' }, 99, { label: 'OpenAI', desc: 'AI lab' }) }, calls) });
  assert.deepEqual(e, { id: 'Q1', label: 'OpenAI', description: 'AI lab', kind: 'organization', date: '2015-12-08', year: 2015, floor: 2015, url: 'https://www.wikidata.org/wiki/Q1' });
  assert.equal(calls.length, 2);  // class matched directly: no parent lookup
  assert.equal(calls[0].searchParams.get('origin'), '*');
});

test('lookupEntity: software found one subclass step up starts a year before release', async () => {
  const e = await C.lookupEntity('Cursor', { fetchFn: fakeWikidata([hit('Q9', 'cursor'), hit('Q2', 'Cursor')],
    { Q2: item(['Q13741'], { pub: '+2023-01-00T00:00:00Z' }), Q13741: { claims: { P279: [{ rank: 'normal', mainsnak: { datavalue: { value: { id: 'Q166142' } } } }] } } }) });
  assert.equal(e.id, 'Q2');  // exact spelling wins over the lower-case concept
  assert.equal(e.kind, 'software');
  assert.equal(e.date, '2023-01');
  assert.equal(e.floor, 2022);
});

test('lookupEntity: concepts, games, obscure items, undated items and errors give null', async () => {
  const one = (ent, h = [hit('Q1', 'x')]) => C.lookupEntity('x', { fetchFn: fakeWikidata(h, { Q1: ent, Q5: { claims: {} } }) });
  assert.equal(await one(item(['Q5'], { inc: '+2020-00-00T00:00:00Z' })), null);            // a concept class
  assert.equal(await one(item(['Q7889', 'Q7397'], { pub: '+2019-05-03T00:00:00Z' })), null); // a video game
  assert.equal(await one(item(['Q7397'], { pub: '+2019-05-03T00:00:00Z' }, 2)), null);       // few sitelinks
  assert.equal(await one(item(['Q7397'], {})), null);                                        // no start date
  assert.equal(await one(item(['Q7397'], { pub: '+2019-05-03T00:00:00Z' }), [hit('Q1', 'xy')]), null); // not an exact match
  assert.equal(await C.lookupEntity('x', { fetchFn: async () => { throw new Error('offline'); } }), null);
  assert.equal(await C.lookupEntity('x', { fetchFn: async () => resp(503, {}) }), null);
});

test('nameScope leaves out a few stray early records, but keeps an older meaning', () => {
  const e = { floor: 2015 };
  const few = [[1986, 2], [2011, 2], [2016, 5], [2020, 900]];
  assert.deepEqual(C.nameScope(few, e), { since: 2015, olderUse: null });
  const many = [[1990, 400], [2010, 600], [2021, 50], [2024, 900]];
  assert.deepEqual(C.nameScope(many, e), { since: null, olderUse: { n: 1000, year: 2015 } });
  assert.deepEqual(C.nameScope([[2016, 5]], e), { since: null, olderUse: null });
  assert.deepEqual(C.nameScope(few, null), { since: null, olderUse: null });
});

test('harvest with a name leaves out earlier years and asks OpenAlex only from the floor', async () => {
  const calls = [];
  const oa = new C.OpenAlex({ fetchFn: fakeOpenAlex(calls), sleep: async () => {} });
  const entity = { id: 'Q1', label: 'CoT Inc', description: '', kind: 'organization', date: '2020', year: 2020, floor: 2020, url: 'u' };
  const t = await C.harvest(oa, 'chain of thought', [], { entity });
  assert.deepEqual(t.counts, [[2022, 10], [2025, 30]]);
  assert.deepEqual(t.hiddenBefore, { n: 1, year: 2020, named: true });
  assert.match(new URL(calls[1].url).searchParams.get('filter'), /publication_year:>2019$/);
  assert.match(new URL(calls[3].url).searchParams.get('filter'), /publication_year:>2023$/);
  const d = C.toData(t);
  assert.equal(d.entity.label, 'CoT Inc');
  assert.deepEqual(d.hiddenBefore, { n: 1, year: 2020, named: true });
  assert.match(C.buildPrompt(t), /The term names an organization: CoT Inc, since 2020 \(Wikidata Q1\)\.\nPapers dated before 2020 were left out \(1\): well before CoT Inc existed/);
});

test('harvest with ?since= leaves out earlier years without a name', async () => {
  const oa = new C.OpenAlex({ fetchFn: fakeOpenAlex([]), sleep: async () => {} });
  const t = await C.harvest(oa, 'chain of thought', [], { since: 2023 });
  assert.deepEqual(t.counts, [[2025, 30]]);
  assert.deepEqual(t.hiddenBefore, { n: 11, year: 2023, named: false });
  assert.match(C.scopeLines(t).join('\n'), /^Papers dated before 2023 were left out \(11\), as the reader asked\.$/);
});

test('harvest drops an early record that cites later work, and takes it off the counts', async () => {
  const calls = [];
  const early = { ...work(1, 1990, 'Early paper', 'We study chain of thought in people. Nothing else here.', 5), referenced_works: ['https://openalex.org/W77'] };
  const fetchFn = async url => {
    calls.push(url);
    const u = new URL(url);
    if (u.searchParams.get('group_by')) return resp(200, { group_by: [{ key: '1990', count: 1 }, { key: '2022', count: 10 }, { key: '2025', count: 30 }] });
    if (/openalex_id:/.test(u.searchParams.get('filter'))) return resp(200, { results: [{ id: 'https://openalex.org/W77', publication_year: 2021 }] });
    return resp(200, { results: [early, ...WORKS.slice(1)] });
  };
  const t = await C.harvest(new C.OpenAlex({ fetchFn, sleep: async () => {} }), 'chain of thought', []);
  assert.equal(calls.length, 5);
  assert.deepEqual(t.counts, [[2022, 10], [2025, 30]]);
  assert.ok(t.evidence.every(e => e.work.year !== 1990));
  assert.deepEqual(t.misdated, [{ title: 'Early paper', year: 1990, url: 'https://doi.org/10.1/1', cites: 2021, why: 'cites' }]);
  assert.match(C.buildPrompt(t), /1 early paper was left out because the date is wrong: it cites or is copyrighted years later\./);
});

test('harvest keeps an early record whose references are older (the check is not a filter on age)', async () => {
  const early = { ...work(1, 1990, 'Early paper', 'We study chain of thought in people.', 5), referenced_works: ['https://openalex.org/W77'] };
  const fetchFn = async url => {
    const u = new URL(url);
    if (u.searchParams.get('group_by')) return resp(200, { group_by: [{ key: '1990', count: 1 }, { key: '2022', count: 10 }, { key: '2025', count: 30 }] });
    if (/openalex_id:/.test(u.searchParams.get('filter'))) return resp(200, { results: [{ id: 'https://openalex.org/W77', publication_year: 1985 }] });
    return resp(200, { results: [early, ...WORKS.slice(1)] });
  };
  const t = await C.harvest(new C.OpenAlex({ fetchFn, sleep: async () => {} }), 'chain of thought', []);
  assert.deepEqual(t.counts, [[1990, 1], [2022, 10], [2025, 30]]);
  assert.deepEqual(t.misdated, []);
});

test('scope notes escape OpenAlex titles and link the narrower search on the site', () => {
  const I = require('../src/idealine/web/i18n.js');
  const D = { term: 'Cursor', aliases: [], entity: { id: 'Q2', label: 'Cursor', kind: 'software', date: '2023-01', url: 'https://www.wikidata.org/wiki/Q2' },
    olderUse: { n: 5000, year: 2022 }, misdated: [{ title: '<img src=x onerror=alert(1)>', year: 1986, cites: 2021, url: 'javascript:alert(1)' }] };
  const notes = TL.scopeNotes(D, TL.LABELS_EN);
  assert.equal(notes.length, 3);
  assert.match(notes[0], /^Cursor is software, started 2023-01: .* <a href="https:\/\/www\.wikidata\.org\/wiki\/Q2"/);
  assert.match(notes[1], /href="https:\/\/yilinista\.github\.io\/idealine\/\?term=Cursor&amp;since=2022">Show only papers from 2022 on</);
  assert.ok(!notes[2].includes('<img') && notes[2].includes('&lt;img') && !notes[2].includes('javascript:'));
  const zh = Object.assign({}, TL.LABELS_EN, I.T.zh);
  assert.match(TL.scopeNotes({ term: 'OpenAI', entity: D.entity, hiddenBefore: { n: 10, year: 2015, named: true } }, zh)[1], /^已排除 10 篇标注在 2015 年之前的论文/);
});

test('starting-point labels are plain text in both languages (no function source on the page)', () => {
  for (const lang of ['en', 'zh']) for (const k of ['earlier', 'different', 'recent']) assert.equal(typeof R.TEXT[lang][k], 'string', `${lang}.${k}`);
  assert.equal(R.TEXT.en.andEarlier(1979), '1979 and earlier');
});

test('nameScope keeps a real older meaning even when it is a tiny share of a popular name', () => {
  const e = { floor: 1994 };
  // Like "Amazon": a steady older meaning, dwarfed by later papers.
  assert.deepEqual(C.nameScope([[1980, 40], [1990, 60], [2020, 90000]], e), { since: null, olderUse: { n: 100, year: 1994 } });
  // Few, but bunched in one year: not scattered junk.
  assert.deepEqual(C.nameScope([[1990, 12], [2020, 900]], e), { since: null, olderUse: { n: 12, year: 1994 } });
  // Everything before the floor: never hide it all.
  assert.deepEqual(C.nameScope([[1980, 3], [1990, 2]], e), { since: null, olderUse: { n: 5, year: 1994 } });
});

test('lookupEntity ignores alias matches (a common word that is only an alias of a product)', async () => {
  const e = await C.lookupEntity('copilot', { fetchFn: fakeWikidata([{ id: 'Q1', match: { type: 'alias', text: 'copilot' } }],
    { Q1: item(['Q7397'], { pub: '+2023-02-07T00:00:00Z' }) }) });
  assert.equal(e, null);
});

test('scope notes: hidden years can be brought back, and reruns keep aliases and meaning', () => {
  const D = { term: 'OpenAI', aliases: ['Open AI'], meaning: 'the company', entity: { id: 'Q1', label: 'OpenAI', kind: 'organization', date: '2015-12-08', url: 'https://www.wikidata.org/wiki/Q1' },
    hiddenBefore: { n: 10, year: 2015, named: true } };
  const n = TL.scopeNotes(D, TL.LABELS_EN)[1];
  assert.match(n, /^Left out: 10 papers dated before 2015, well before OpenAI existed \(2015-12-08\)/);
  assert.match(n, /href="https:\/\/yilinista\.github\.io\/idealine\/\?term=OpenAI&amp;alias=Open%20AI&amp;meaning=the%20company&amp;since=all">Show all years</);
});

test('citesLater: a pre-onset record copyrighted years later, within the active period of the term, is misdated', async () => {
  const oa = { get: async () => { throw new Error('no request expected'); } };
  const w = (id, year, abstract) => ({ id, year, title: 't', abstract, refs: [] });
  const junk = w('W1', 2015, 'AI Research Partner: ChatGPT (GPT-5.1). © 2025 Y. Seo.');
  const reprint = w('W2', 1960, 'A classic paper. Copyright © 2010 Wiley.');   // digitized before the term took hold
  const fine = w('W3', 2016, '© 2017 Elsevier.');                               // one year later: normal
  const out = await C.citesLater(oa, [junk, reprint, fine], 2018);
  assert.deepEqual(out.map(o => [o.work.id, o.cites, o.why]), [['W1', 2025, 'copyright']]);
  assert.equal(C.copyrightYear({ title: '', abstract: '(c) 2003 and Copyright 2007' }), 2007);
});

test('story cards: earliest, key paper, now from milestones, skipping ancestors', () => {
  require('../src/idealine/web/timeline.js');  // sets globalThis.IdealineTimeline
  const counts = [[2000, 1], [2001, 1], [2002, 1], [2003, 1], [2004, 2], [2005, 3], [2006, 40], [2007, 120], [2008, 300]];
  const ms = [
    { year: 1950, kind: 'ancestor', title: 'Old idiom', why: 'a' },
    { year: 2001, kind: 'origin', title: 'First paper', why: 'b', url: 'https://example.org/1' },
    { year: 2006, kind: 'popularized', title: 'Big paper', why: 'c' },
    { year: 2007, kind: 'applied', title: 'Later', why: 'd' },
    { year: 2008, kind: 'critique', title: 'Newest', why: 'e' },
  ];
  const d = { counts, milestones: ms, quotes: [], model: 'm' };
  const cards = R.storyCards(d, R.readingModel(d));
  assert.deepEqual(cards.map(c => [c.key, c.year, c.title]), [['start', 2001, 'First paper'], ['key', 2006, 'Big paper'], ['now', 2008, 'Newest']]);
  assert.equal(cards[0].line, 'b');
  assert.equal(cards[0].quote, false);
});

test('story cards (free view): key paper is the one the sample cites most; stray early records never start', () => {
  require('../src/idealine/web/timeline.js');
  // Place-attachment-like: a misdated 1905 record cut off from the main run (from 1983).
  const counts = [[1905, 1], [1983, 1], [1984, 1], [1986, 1], [1989, 1], [1990, 2], [1992, 12], [1995, 4], [2000, 23], [2010, 142], [2020, 492], [2025, 921]];
  const q = (id, year, inSet) => ({ id, year, inSet, text: `Place attachment ${id}.`, title: `T${id}`, url: `https://example.org/${id}` });
  const quotes = [q('E1', 1905, 0), q('E2', 1983, 1), q('E3', 1992, 42), q('E4', 2010, 5), q('E5', 2025, 0)];
  const ms = [[1905, 'origin', 'E1'], [1983, 'origin', 'E2'], [1992, 'popularized', 'E3'], [2010, 'popularized', 'E4'], [2025, 'popularized', 'E5']]
    .map(([year, kind, id]) => ({ year, kind, title: `T${id}`, why: 'Cited 5 times.', evidence: [{ id }] }));
  const d = { counts, quotes, milestones: ms };
  assert.deepEqual(R.storyCards(d, R.readingModel(d)).map(c => [c.key, c.year]), [['start', 1983], ['key', 1992], ['now', 2025]]);
  // No milestones: the same rules on the passages.
  const d2 = { counts, quotes };
  assert.deepEqual(R.storyCards(d2, R.readingModel(d2)).map(c => [c.key, c.year]), [['start', 1983], ['key', 1992], ['now', 2025]]);
  assert.deepEqual(R.storyCards({ counts: [], quotes: [] }, R.readingModel({})), []);
});

test('takeoff ignores a slump after the real rise (paid tester #1, OpenAlex counts as of 2026-11-19)', () => {
  const overtourism = [[2000, 1], [2012, 1], [2015, 1], [2017, 7], [2018, 56], [2019, 228], [2020, 313], [2021, 275], [2022, 179], [2023, 185], [2024, 252], [2025, 551], [2026, 672]];
  assert.equal(TL.mainRun(overtourism).ta, 2017);
  const carrying = [[1986, 1], [1987, 1], [1991, 1], [1995, 3], [1997, 1], [1999, 3], [2000, 1], [2001, 1], [2003, 3], [2004, 6], [2005, 6], [2006, 7], [2007, 7], [2008, 4], [2009, 7], [2010, 12],
    [2011, 24], [2012, 18], [2013, 16], [2014, 16], [2015, 18], [2016, 24], [2017, 29], [2018, 20], [2019, 31], [2020, 34], [2021, 36], [2022, 32], [2023, 32], [2024, 42], [2025, 45], [2026, 84]];
  assert.equal(TL.mainRun(carrying).first, 1995);
  assert.equal(TL.mainRun(carrying).ta, 2011);
});
