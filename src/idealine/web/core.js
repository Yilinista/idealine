// idealine core, in the browser: the same pipeline as the Python CLI.
// 1. harvest: OpenAlex yearly counts + earliest / most-cited / recent works,
//    keep abstract sentences that use the term (4 requests).
// 2. analyze: one call to the model the visitor chose, with their own key.
// 3. apply: keep only eras and milestones whose evidence IDs exist; link works.
// No DOM access here, so it runs in Node tests too. `fetch` is injectable.
(function (global) {
  'use strict';

  const OPENALEX = 'https://api.openalex.org';
  const SELECT = 'id,display_name,publication_year,publication_date,doi,cited_by_count,authorships,abstract_inverted_index,primary_topic,referenced_works';
  const KINDS = ['ancestor', 'origin', 'coined', 'popularized', 'redefined', 'applied', 'critique'];
  const MAX_SENTENCE_CHARS = 450;

  class IdealineError extends Error {}

  const waitText = s => (s >= 5400 ? `${Math.round(s / 3600)} h` : `${Math.max(1, Math.round(s / 60))} min`);

  // --- OpenAlex ---------------------------------------------------------------

  function abstractFromIndex(index) {
    if (!index) return '';
    const slots = [];
    for (const [word, positions] of Object.entries(index)) for (const p of positions) slots[p] = word;
    return slots.filter(w => w !== undefined).join(' ');
  }

  function workFromJson(d) {
    const authors = (d.authorships || []).map(a => a && a.author && a.author.display_name).filter(Boolean);
    return {
      id: String(d.id || '').split('/').pop(),
      title: String(d.display_name || 'Untitled').trim(),
      year: d.publication_year ?? null,
      date: d.publication_date ?? null,
      url: d.doi || d.id || '',
      citedBy: d.cited_by_count || 0,
      authors,
      shortAuthors: !authors.length ? 'Unknown authors' : authors.length === 1 ? authors[0] : `${authors[0]} et al.`,
      abstract: abstractFromIndex(d.abstract_inverted_index),
      field: (d.primary_topic && d.primary_topic.field && d.primary_topic.field.display_name) || null,
      refs: (Array.isArray(d.referenced_works) ? d.referenced_works : []).filter(r => typeof r === 'string').map(r => r.split('/').pop()),
      inSet: 0,
    };
  }

  function phraseQuery(term, aliases) {
    return [term, ...aliases].filter(p => p && p.trim()).map(p => `"${p.replace(/"/g, '')}"`).join(' OR ');
  }

  function oaFilter(query, since) {
    // Title and abstract only (plain `search` also matches full text), and `.exact`
    // so OpenAlex does not stem: plain search counts "agent" papers for "agentic".
    let f = `title_and_abstract.search.exact:${query.replace(/,/g, ' ')}`;
    if (since != null) f += `,publication_year:>${since - 1}`;
    return f;
  }

  class OpenAlex {
    constructor({ fetchFn, apiKey, sleep, log } = {}) {
      this.fetch = fetchFn || ((...a) => global.fetch(...a));
      this.apiKey = apiKey || '';
      this.sleep = sleep || (ms => new Promise(r => setTimeout(r, ms)));
      this.log = log || (() => {});
      this.cache = new Map();
    }

    async get(params) {
      const qs = new URLSearchParams(params).toString();
      if (this.cache.has(qs)) return this.cache.get(qs);
      const headers = this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {};
      let delay = 1000;
      for (let attempt = 1; attempt <= 4; attempt++) {
        let resp;
        try {
          resp = await this.fetch(`${OPENALEX}/works?${qs}`, { headers });
        } catch (e) {
          if (attempt < 4) { await this.sleep(delay); delay *= 2; continue; }
          throw new IdealineError('Could not reach OpenAlex. Check your connection and try again.');
        }
        if (resp.status === 200) {
          const data = await resp.json();
          this.cache.set(qs, data);
          return data;
        }
        if (resp.status === 429) {
          const ra = Number(resp.headers.get('retry-after') || '');
          if (ra > 120) {
            throw new IdealineError(`OpenAlex's free daily budget for your network is used up (resets in about ${waitText(ra)}, at midnight UTC). Add a free OpenAlex key under "Options and model key", or try again later.`);
          }
          if (attempt < 4) {
            const wait = ra > 0 ? ra * 1000 : delay;
            this.log(`OpenAlex is busy; retrying in ${Math.ceil(wait / 1000)} s…`);
            await this.sleep(wait); delay *= 2; continue;
          }
          throw new IdealineError('OpenAlex is rate-limiting requests right now. Wait a minute and try again.');
        }
        if (resp.status >= 500 && attempt < 4) {
          this.log(`OpenAlex returned ${resp.status}; retrying…`);
          await this.sleep(delay); delay *= 2; continue;
        }
        throw new IdealineError(`OpenAlex error ${resp.status}.`);
      }
      throw new IdealineError('OpenAlex kept failing; try again in a minute.');
    }

    async yearCounts(query) {
      const data = await this.get({ filter: oaFilter(query), group_by: 'publication_year' });
      const out = [];
      for (const g of data.group_by || []) {
        const y = parseInt(g.key, 10), c = parseInt(g.count, 10);
        if (Number.isFinite(y) && Number.isFinite(c)) out.push([y, c]);
      }
      return out.sort((a, b) => a[0] - b[0]);
    }

    // Papers per quarter for the given years (one small request each; OpenAlex cannot
    // group by date). Quarters that have not started yet are skipped. OpenAlex dates
    // papers known only by year as 1 January, so those are counted apart as undated
    // and left out of Q1.
    async quarterCounts(query, years, today = new Date()) {
      const quarters = [], undated = [];
      const count = async (from, to) => {
        const data = await this.get({ filter: `${oaFilter(query)},from_publication_date:${from},to_publication_date:${to}`, per_page: '1', select: 'id' });
        return (data.meta && Number(data.meta.count)) || 0;
      };
      for (const y of years) {
        if (new Date(`${y}-01-01T00:00:00Z`) > today) continue;
        undated.push([y, await count(`${y}-01-01`, `${y}-01-01`)]);
        for (let q = 1; q <= 4; q++) {
          const m0 = 3 * (q - 1) + 1, from = `${y}-${String(m0).padStart(2, '0')}-${q === 1 ? '02' : '01'}`;
          if (new Date(`${y}-${String(m0).padStart(2, '0')}-01T00:00:00Z`) > today) continue;
          const last = new Date(Date.UTC(y, m0 + 2, 0)).toISOString().slice(0, 10);
          quarters.push([`${y}-Q${q}`, await count(from, last)]);
        }
      }
      return { quarters, undated };
    }

    async works(query, sort, perPage, since) {
      const data = await this.get({ filter: oaFilter(query, since), sort, per_page: String(perPage), select: SELECT });
      return (data.results || []).map(workFromJson);
    }

    async findWork(title, year) {
      const clean = title.replace(/[^\p{L}\p{N}\s-]/gu, ' ').trim();
      if (!clean) return null;
      const params = { search: clean, per_page: '3', select: SELECT };
      if (year) params.filter = `publication_year:${year - 1}-${year + 1}`;
      const data = await this.get(params);
      const r = data.results || [];
      return r.length ? workFromJson(r[0]) : null;
    }
  }

  // --- harvest ------------------------------------------------------------------

  const NO_SPACE_SCRIPT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u;
  const reEsc = w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function termPattern(term, aliases) {
    // A phrase must start at a word start ("art" must not match "smart"), except in scripts
    // written without spaces (Chinese, Japanese), where any position counts. Unicode-aware.
    const parts = [term, ...aliases].map(p => {
      const words = p.trim().split(/[\s-]+/).filter(Boolean);
      if (!words.length) return '';
      const body = words.map(reEsc).join('[\\s-]+');
      return NO_SPACE_SCRIPT.test(words[0][0]) ? body : '(?<![\\p{L}\\p{N}_])' + body;
    }).filter(Boolean);
    return new RegExp('(?:' + parts.join('|') + ')', 'iu');
  }

  // Singular/plural of the last word, since exact search does not stem. Same rule as term.py.
  function inflections(phrase) {
    const words = phrase.trim().split(' ');
    const last = words[words.length - 1];
    if (!/^[a-z]{3,}$/.test(last) || /(ing|ics|ism|ness|is)$/.test(last)) return [];
    let alt;
    if (last.endsWith('ies')) alt = last.slice(0, -3) + 'y';
    else if (/(sses|xes|ches|shes)$/.test(last)) alt = last.slice(0, -2);
    else if (last.endsWith('s') && !/(ss|us|is)$/.test(last)) alt = last.slice(0, -1);
    else if (last.endsWith('y') && !'aeiou'.includes(last[last.length - 2])) alt = last.slice(0, -1) + 'ies';
    else if (/(s|x|z|ch|sh)$/.test(last)) alt = last + 'es';
    else alt = last + 's';
    return [[...words.slice(0, -1), alt].join(' ')];
  }

  function withInflections(term, aliases) {
    const seen = new Set([term.toLowerCase()]), out = [];
    for (const p of [...aliases, ...[term, ...aliases].flatMap(inflections)]) {
      if (!seen.has(p.toLowerCase())) { seen.add(p.toLowerCase()); out.push(p); }
    }
    return out;
  }

  // First year by which the term has real use (3 papers, or 1% of all). Earlier records
  // are rare and sometimes misdated in OpenAlex, so they are flagged, not trusted.
  function onsetYear(counts) {
    const total = counts.reduce((n, [, c]) => n + c, 0), need = Math.max(3, total * 0.01);
    let acc = 0;
    for (const [y, c] of [...counts].sort((a, b) => a[0] - b[0])) { acc += c; if (acc >= need) return y; }
    return null;
  }

  // Years to show by quarter: when the term's real use spans at most three calendar
  // years, a yearly axis has only two or three bars. Otherwise none.
  function fineYears(counts) {
    const onset = onsetYear(counts);
    if (onset == null || !counts.length) return [];
    const last = Math.max(...counts.map(c => c[0]));
    if (last - onset > 2) return [];
    const out = [];
    for (let y = onset; y <= last; y++) out.push(y);
    return out;
  }

  const clip = s => { const cps = [...s]; return cps.length <= MAX_SENTENCE_CHARS ? s : cps.slice(0, MAX_SENTENCE_CHARS - 1).join('') + '…'; };

  function sentencesWithTerm(text, pattern) {
    const out = [];
    for (let s of text.split(/(?<=[.!?])\s+(?=[A-Z"'(\[])|(?<=[。！？])/)) {
      s = s.trim();
      if (!s || !pattern.test(s)) continue;
      const cps = [...s];
      out.push(cps.length <= MAX_SENTENCE_CHARS ? s : cps.slice(0, MAX_SENTENCE_CHARS - 1).join('') + '…');
    }
    return out;
  }

  // For each sampled work, how many other sampled works cite it (Litmaps' "map
  // connectivity"): papers that use the term cite what matters to the term.
  function countInSet(works) {
    for (const w of works.values()) w.inSet = 0;
    for (const w of works.values()) for (const r of new Set(w.refs || [])) if (r !== w.id && works.has(r)) works.get(r).inSet++;
  }

  async function harvest(oa, term, aliases, opts = {}) {
    // fine: count young terms by quarter (extra requests), on by default only with an OpenAlex key.
    const { earliest = 25, topCited = 150, recent = 60, maxEvidence = 160, onStep = () => {}, fine = !!oa.apiKey } = opts;
    // Search with singular/plural variants too, but keep only the user's spellings as aliases.
    const spellings = withInflections(term, aliases);
    const query = phraseQuery(term, spellings);
    onStep('Counting papers per year…');
    const counts = await oa.yearCounts(query);
    let quarters = [], undated = [];
    const fy = fine ? fineYears(counts) : [];
    if (fy.length) {
      onStep('Counting papers per quarter…');
      ({ quarters, undated } = await oa.quarterCounts(query, fy));
    }
    const pattern = termPattern(term, spellings);
    const works = new Map();
    const add = list => list.forEach(w => { if (!works.has(w.id)) works.set(w.id, w); });
    onStep('Reading the earliest papers…');
    add(await oa.works(query, 'publication_date:asc', earliest));
    onStep('Reading the most-cited papers…');
    add(await oa.works(query, 'cited_by_count:desc', topCited));
    if (counts.length) {
      onStep('Reading recent papers…');
      const latest = Math.max(...counts.map(c => c[0]));
      add(await oa.works(query, 'cited_by_count:desc', recent, latest - 1));
    }
    countInSet(works);
    const key = w => w.date || String(w.year ?? 9999);
    const ordered = [...works.values()].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : b.citedBy - a.citedBy));
    let perWork = [];
    for (const w of ordered) {
      const sents = sentencesWithTerm(w.abstract, pattern);
      if (sents.length) perWork.push([w, sents.slice(0, 2), false]);
      else if (pattern.test(w.title)) perWork.push([w, [clip(w.title)], true]);
    }
    // Stay under maxEvidence without cutting the latest years.
    if (perWork.reduce((n, p) => n + p[1].length, 0) > maxEvidence) perWork = perWork.map(([w, s, t]) => [w, s.slice(0, 1), t]);
    if (perWork.length > maxEvidence) {
      const step = perWork.length / maxEvidence;
      perWork = Array.from({ length: maxEvidence }, (_, i) => perWork[Math.floor(i * step)]);
    }
    const evidence = [];
    for (const [w, sents, fromTitle] of perWork) for (const s of sents) evidence.push({ eid: `E${evidence.length + 1}`, text: s, work: w, fromTitle });
    return { term, aliases, counts, quarters, undated, evidence, eras: [], milestones: [], summary: '', model: null, generated: new Date().toISOString().slice(0, 10) };
  }

  // --- analyze ------------------------------------------------------------------

  // outputLang: optional extra instruction (e.g. write labels in Chinese), appended last.
  function buildPrompt(t, outputLang) {
    const lines = [
      `Term: ${t.term}` + (t.aliases.length ? ` (also: ${t.aliases.join(', ')})` : ''),
      ...(t.meaning ? [`Meaning the reader has in mind: ${t.meaning}`] : []),
      `Papers per year: ${t.counts.map(([y, c]) => `${y}: ${c}`).join(', ')}`,
      ...((t.quarters || []).length ? [`Papers per quarter (papers dated only by year left out): ${t.quarters.map(([k, c]) => `${k}: ${c}`).join(', ')}`] : []),
      '',
      'Evidence:',
    ];
    for (const e of t.evidence) {
      const within = e.work.inSet ? `, cited by ${e.work.inSet} of these papers` : '';
      lines.push(`[${e.eid}] (${e.work.year}, cited ${e.work.citedBy}x${within}, ${e.fromTitle ? 'title' : 'abstract'} of "${e.work.title}") ${e.text}`);
    }
    if (outputLang) lines.push('', 'Output language: ' + outputLang);
    return lines.join('\n');
  }

  function titleOverlap(a, b) {
    const words = s => new Set((s.toLowerCase().match(/[a-z0-9]+/g) || []));
    const wa = words(a), wb = words(b);
    if (!wa.size || !wb.size) return 0;
    let n = 0;
    for (const w of wa) if (wb.has(w)) n++;
    return n / Math.min(wa.size, wb.size);
  }

  const str = v => (typeof v === 'string' ? v.trim() : '');
  const int = v => (Number.isInteger(v) ? v : Number.isInteger(Number(v)) && String(v).trim() !== '' ? Number(v) : null);

  async function applyAnalysis(t, data, resolver, onStep = () => {}) {
    const byId = new Map(t.evidence.map(e => [e.eid, e]));
    // Model years are untrusted: keep them in a sane window so the chart stays bounded.
    const lastYear = Math.max(new Date().getFullYear(), ...(t.counts || []).map(c => c[0])) + 1;
    const okYear = y => y !== null && y >= 1000 && y <= lastYear;
    const valid = ids => (Array.isArray(ids) ? ids.filter(i => typeof i === 'string' && byId.has(i)) : []);
    data = data && typeof data === 'object' ? data : {};
    t.summary = str(data.summary);
    t.focus = str(data.focus);
    // Senses and per-quote tags. Unrelated senses become otherSenses (with their quotes).
    t.senses = [];
    for (const s of (Array.isArray(data.senses) ? data.senses : []).slice(0, 12)) {
      if (s && str(s.key) && str(s.label)) t.senses.push({ key: str(s.key), label: str(s.label), definition: str(s.definition), related: s.related !== false, evidence: [] });
    }
    const keys = new Map(t.senses.map(s => [s.key, s]));
    for (const e of t.evidence) e.sense = '';
    for (const q of Array.isArray(data.quote_senses) ? data.quote_senses : []) {
      if (!q || !byId.has(q.id)) continue;
      const k = str(q.sense);
      if (keys.has(k)) { byId.get(q.id).sense = k; keys.get(k).evidence.push(q.id); } else if (k === 'unclear') byId.get(q.id).sense = 'unclear';
    }
    t.otherSenses = t.senses.filter(s => !s.related && s.evidence.length).slice(0, 6).map(s => ({ label: s.label, meaning: s.definition, evidence: s.evidence }));
    t.eras = [];
    for (const e of Array.isArray(data.eras) ? data.eras : []) {
      const ev = valid(e && e.evidence), s = int(e && e.start_year), en = int(e && e.end_year);
      if (ev.length && okYear(s) && okYear(en) && s <= en) t.eras.push({ start: s, end: en, label: str(e.label), meaning: str(e.meaning), evidence: ev });
    }
    t.eras.sort((a, b) => a.start - b.start);
    t.milestones = [];
    const raw = (Array.isArray(data.milestones) ? data.milestones : []).slice(0, 20);
    for (const m of raw) {
      const ev = valid(m && m.evidence), year = int(m && m.year);
      if (!ev.length || !KINDS.includes(m.kind) || !okYear(year)) continue;
      const ms = { year, kind: m.kind, title: str(m.title), why: str(m.why), evidence: ev, work: null, link: 'unresolved',
        inSense: typeof m.in_sense === 'boolean' ? m.in_sense : null, coinage: typeof m.coinage === 'boolean' ? m.coinage : null,
        shift: ['broadening', 'narrowing', 'metaphor', 'new field'].includes(m.shift) ? m.shift : '' };
      const ref = typeof m.work_ref === 'string' ? m.work_ref : '';
      if (byId.has(ref)) {
        ms.work = byId.get(ref).work;
        ms.link = 'in-sample';
      } else if (resolver && ms.title) {
        onStep(`Looking up “${ms.title.slice(0, 40)}”…`);
        try {
          const found = await resolver.findWork(ms.title, year);
          if (found && found.year && Math.abs(found.year - year) <= 1 && titleOverlap(found.title, ms.title) >= 0.4) {
            ms.work = found;
            ms.link = 'resolved';
          }
        } catch (e) { /* lookups are optional; keep the milestone unlinked */ }
      }
      t.milestones.push(ms);
    }
    t.milestones.sort((a, b) => a.year - b.year);
    return t;
  }

  const EARLY_DATE_NOTE = 'Earliest record found, from before the term was in regular use. OpenAlex dates for rare early records are sometimes wrong; check the paper.';

  function baseline(t) {
    const onset = onsetYear(t.counts), seen = new Set(), firsts = [];
    for (const e of t.evidence) if (!seen.has(e.work.id)) { seen.add(e.work.id); firsts.push(e); }
    // One pre-onset record at most (flagged), then the earliest uses from the onset on.
    const before = firsts.filter(e => onset && (e.work.year || 0) < onset).slice(0, 1);
    const after = firsts.filter(e => !onset || (e.work.year || 0) >= onset).slice(0, 3 - before.length);
    for (const e of before) t.milestones.push({ year: e.work.year || 0, kind: 'origin', title: e.work.title, why: EARLY_DATE_NOTE, evidence: [e.eid], work: e.work, link: 'in-sample' });
    for (const e of after) t.milestones.push({ year: e.work.year || 0, kind: 'origin', title: e.work.title, why: 'One of the earliest uses found.', evidence: [e.eid], work: e.work, link: 'in-sample' });
    const best = new Map();
    for (const e of t.evidence) if (!best.has(e.work.id)) best.set(e.work.id, e);
    // Key papers: first by how many sampled papers that use the term cite them, then overall.
    const top = [...best.values()].sort((a, b) => (b.work.inSet || 0) - (a.work.inSet || 0) || b.work.citedBy - a.work.citedBy).slice(0, 5);
    const used = new Set(t.milestones.map(m => m.work.id));
    for (const e of top) {
      if (used.has(e.work.id)) continue;
      const why = e.work.inSet ? `Cited by ${e.work.inSet} of the sampled papers that use the term (${e.work.citedBy} times overall).` : `Cited ${e.work.citedBy} times.`;
      t.milestones.push({ year: e.work.year || 0, kind: 'popularized', title: e.work.title, why, evidence: [e.eid], work: e.work, link: 'in-sample' });
    }
    t.milestones.sort((a, b) => a.year - b.year);
    return t;
  }

  // --- roots (reference publication year spectroscopy, Marx et al. 2014) -----------

  // Which references to look up: from the most connected sampled papers, the works
  // they cite at least twice (or all, when that leaves too few), most-cited first.
  function rootsPlan(evidence, maxPapers = 100, maxRefs = 2000) {
    const seen = new Set(), papers = [];
    for (const e of evidence) if (!seen.has(e.work.id)) { seen.add(e.work.id); papers.push(e.work); }
    papers.sort((a, b) => (b.inSet || 0) - (a.inSet || 0) || b.citedBy - a.citedBy);
    const top = papers.slice(0, maxPapers), n = new Map();
    for (const w of top) for (const r of new Set(w.refs || [])) n.set(r, (n.get(r) || 0) + 1);
    let ids = [...n].filter(([, c]) => c >= 2);
    if (ids.length < 50) ids = [...n];
    ids = ids.sort((a, b) => b[1] - a[1]).slice(0, maxRefs).map(([id]) => id);
    return { papers: top.length, ids, cites: n };
  }

  // Spectrum of cited works by publication year, and the years that stand out from
  // the median of their five-year window: the term's likely roots.
  function rpys(items, maxPeaks = 5) {
    const byYear = new Map();
    for (const it of items) if (Number.isInteger(it.year)) byYear.set(it.year, (byYear.get(it.year) || 0) + it.n);
    if (!byYear.size) return { spectrum: [], peaks: [] };
    const ys = [...byYear.keys()], lo = Math.min(...ys), hi = Math.max(...ys);
    const spectrum = [];
    for (let y = lo; y <= hi; y++) spectrum.push([y, byYear.get(y) || 0]);
    const total = spectrum.reduce((a, [, c]) => a + c, 0);
    const med = y => { const w = [-2, -1, 0, 1, 2].map(d => byYear.get(y + d) || 0).sort((a, b) => a - b); return w[2]; };
    const peaks = spectrum.filter(([y, c]) => c >= Math.max(3, total * 0.01) && c - med(y) > 0)
      .sort((a, b) => (b[1] - med(b[0])) - (a[1] - med(a[0]))).slice(0, maxPeaks)
      .map(([y, c]) => {
        const top = items.filter(it => it.year === y).sort((a, b) => b.n - a.n)[0];
        return { year: y, count: c, title: top.title, url: top.url, authors: top.authors, cites: top.n };
      }).sort((a, b) => a.year - b.year);
    return { spectrum, peaks };
  }

  // Quotes in the followed meaning: tagged with a related sense, or all quotes when
  // the model tagged none.
  function inFocus(t) {
    const related = new Set((t.senses || []).filter(s => s.related).map(s => s.key));
    if (!related.size || !t.evidence.some(e => e.sense)) return t.evidence;
    return t.evidence.filter(e => related.has(e.sense));
  }

  async function findRoots(oa, t, onStep = () => {}) {
    const plan = rootsPlan(inFocus(t));
    const items = [];
    for (let i = 0; i < plan.ids.length; i += 100) {
      onStep(`Looking up cited works (${Math.min(i + 100, plan.ids.length)} of ${plan.ids.length})…`);
      const chunk = plan.ids.slice(i, i + 100);
      const data = await oa.get({ filter: 'openalex_id:' + chunk.join('|'), per_page: '100', select: 'id,display_name,publication_year,doi,cited_by_count,authorships' });
      for (const d of data.results || []) {
        const w = workFromJson(d);
        items.push({ year: w.year, n: plan.cites.get(w.id) || 0, title: w.title, url: w.url, authors: w.shortAuthors });
      }
    }
    return { ...rpys(items), papers: plan.papers, refs: plan.ids.length };
  }

  // Same JSON shape as the Python CLI's to_data, so pages and `idealine render` agree.
  // How far a partly streamed answer has got, from its top-level keys (written in schema
  // order). A key inside a JSON string has an escaped quote, so it does not match.
  // Returns null before the meanings, else { stage, n } with stage senses|tags|eras|milestones.
  function answerProgress(partial) {
    const at = key => { const m = [...partial.matchAll(new RegExp(`(?:^|[^\\\\])"${key}"\\s*:`, 'g'))]; return m.length ? m[m.length - 1].index : -1; };
    const count = (key, from) => [...partial.slice(from).matchAll(new RegExp(`(?:^|[^\\\\])"${key}"\\s*:`, 'g'))].length;
    const stages = [['milestones', 'kind'], ['eras', 'start_year'], ['quote_senses', 'id'], ['senses', 'key']];
    for (const [key, item] of stages) {
      const i = at(key);
      if (i >= 0) return { stage: { quote_senses: 'tags' }[key] || key, n: count(item, i) };
    }
    return null;
  }

  function toData(t) {
    const byId = new Map(t.evidence.map(e => [e.eid, e]));
    const ev = ids => ids.map(i => byId.get(i)).filter(Boolean).map(e => ({
      id: e.eid, text: e.text, title: e.work.title, year: e.work.year, date: e.work.date || null, url: e.work.url, authors: e.work.shortAuthors, fromTitle: e.fromTitle,
      field: e.work.field || null, inSet: e.work.inSet || 0, sense: e.sense || '',
    }));
    return {
      term: t.term,
      aliases: t.aliases,
      summary: t.summary,
      counts: t.counts,
      quarters: t.quarters || [],
      undated: t.undated || [],
      // Every year from the first to the last count, so gap years have a total too.
      totals: t.counts.length ? (t.totals || []).filter(([y]) => y >= t.counts[0][0] && y <= t.counts[t.counts.length - 1][0]) : [],
      totalsAsOf: (t.totals || []).length ? t.totalsAsOf || '' : '',
      quotes: ev(t.evidence.map(e => e.eid)),
      total: t.counts.reduce((n, [, c]) => n + c, 0),
      model: t.model,
      generated: t.generated,
      lang: t.lang === 'zh' ? 'zh' : 'en',
      meaning: t.meaning || '',
      focus: t.focus || '',
      otherSenses: (t.otherSenses || []).map(s => ({ label: s.label, meaning: s.meaning, evidence: ev(s.evidence) })),
      roots: t.roots || null,
      senses: (t.senses || []).map(s => ({ key: s.key, label: s.label, definition: s.definition, related: s.related })),
      evidenceCount: t.evidence.length,
      eras: t.eras.map(e => ({ start: e.start, end: e.end, label: e.label, meaning: e.meaning, evidence: ev(e.evidence) })),
      milestones: t.milestones.map(m => ({
        year: m.year, kind: m.kind, title: m.title, why: m.why,
        url: m.work ? m.work.url : null, date: m.work ? m.work.date || null : null, workTitle: m.work ? m.work.title : null, authors: m.work ? m.work.shortAuthors : null,
        link: m.link, evidence: ev(m.evidence),
        checks: m.inSense != null || m.coinage != null ? { inSense: m.inSense, coinage: m.coinage } : null,
        shift: m.shift || '',
      })),
    };
  }

  const api = { IdealineError, OpenAlex, KINDS, abstractFromIndex, workFromJson, phraseQuery, oaFilter, termPattern, sentencesWithTerm, harvest, inflections, withInflections, onsetYear, fineYears, countInSet, rootsPlan, rpys, findRoots, inFocus, buildPrompt, titleOverlap, applyAnalysis, baseline, toData, answerProgress };
  global.IdealineCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
