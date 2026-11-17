// idealine core, in the browser: the same pipeline as the Python CLI.
// 1. harvest: OpenAlex yearly counts + earliest / most-cited / recent works,
//    keep abstract sentences that use the term (4 requests).
// 2. analyze: one call to the model the visitor chose, with their own key.
// 3. apply: keep only eras and milestones whose evidence IDs exist; link works.
// No DOM access here, so it runs in Node tests too. `fetch` is injectable.
(function (global) {
  'use strict';

  const OPENALEX = 'https://api.openalex.org';
  const SELECT = 'id,display_name,publication_year,publication_date,doi,cited_by_count,authorships,abstract_inverted_index';
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
    };
  }

  function phraseQuery(term, aliases) {
    return [term, ...aliases].filter(p => p && p.trim()).map(p => `"${p.replace(/"/g, '')}"`).join(' OR ');
  }

  function oaFilter(query, since) {
    // Title and abstract only: plain `search` also matches full text.
    let f = `title_and_abstract.search:${query.replace(/,/g, ' ')}`;
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
            throw new IdealineError(`OpenAlex's free daily budget for your network is used up (resets in about ${waitText(ra)}, at midnight UTC). Add a free OpenAlex key under "More options", or try again later.`);
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

  function sentencesWithTerm(text, pattern) {
    const out = [];
    for (let s of text.split(/(?<=[.!?])\s+(?=[A-Z"'(\[])/)) {
      s = s.trim();
      if (!s || !pattern.test(s)) continue;
      const cps = [...s];
      out.push(cps.length <= MAX_SENTENCE_CHARS ? s : cps.slice(0, MAX_SENTENCE_CHARS - 1).join('') + '…');
    }
    return out;
  }

  async function harvest(oa, term, aliases, opts = {}) {
    const { earliest = 25, topCited = 150, recent = 60, maxEvidence = 160, onStep = () => {} } = opts;
    const query = phraseQuery(term, aliases);
    onStep('Counting papers per year…');
    const counts = await oa.yearCounts(query);
    const pattern = termPattern(term, aliases);
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
    const key = w => w.date || String(w.year ?? 9999);
    const ordered = [...works.values()].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : b.citedBy - a.citedBy));
    let perWork = [];
    for (const w of ordered) {
      const sents = sentencesWithTerm(w.abstract, pattern);
      if (sents.length) perWork.push([w, sents.slice(0, 2), false]);
      else if (pattern.test(w.title)) perWork.push([w, [w.title], true]);
    }
    // Stay under maxEvidence without cutting the latest years.
    if (perWork.reduce((n, p) => n + p[1].length, 0) > maxEvidence) perWork = perWork.map(([w, s, t]) => [w, s.slice(0, 1), t]);
    if (perWork.length > maxEvidence) {
      const step = perWork.length / maxEvidence;
      perWork = Array.from({ length: maxEvidence }, (_, i) => perWork[Math.floor(i * step)]);
    }
    const evidence = [];
    for (const [w, sents, fromTitle] of perWork) for (const s of sents) evidence.push({ eid: `E${evidence.length + 1}`, text: s, work: w, fromTitle });
    return { term, aliases, counts, evidence, eras: [], milestones: [], summary: '', model: null, generated: new Date().toISOString().slice(0, 10) };
  }

  // --- analyze ------------------------------------------------------------------

  function buildPrompt(t) {
    const lines = [
      `Term: ${t.term}` + (t.aliases.length ? ` (also: ${t.aliases.join(', ')})` : ''),
      `Papers per year: ${t.counts.map(([y, c]) => `${y}: ${c}`).join(', ')}`,
      '',
      'Evidence:',
    ];
    for (const e of t.evidence) {
      lines.push(`[${e.eid}] (${e.work.year}, cited ${e.work.citedBy}x, ${e.fromTitle ? 'title' : 'abstract'} of "${e.work.title}") ${e.text}`);
    }
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
      const ms = { year, kind: m.kind, title: str(m.title), why: str(m.why), evidence: ev, work: null, link: 'unresolved' };
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

  function baseline(t) {
    const seen = new Set(), early = [];
    for (const e of t.evidence) { if (!seen.has(e.work.id)) { seen.add(e.work.id); early.push(e); } if (early.length === 3) break; }
    for (const e of early) t.milestones.push({ year: e.work.year || 0, kind: 'origin', title: e.work.title, why: 'One of the earliest uses found.', evidence: [e.eid], work: e.work, link: 'in-sample' });
    const best = new Map();
    for (const e of t.evidence) if (!best.has(e.work.id)) best.set(e.work.id, e);
    const top = [...best.values()].sort((a, b) => b.work.citedBy - a.work.citedBy).slice(0, 5);
    const used = new Set(t.milestones.map(m => m.work.id));
    for (const e of top) {
      if (used.has(e.work.id)) continue;
      t.milestones.push({ year: e.work.year || 0, kind: 'popularized', title: e.work.title, why: `Cited ${e.work.citedBy} times.`, evidence: [e.eid], work: e.work, link: 'in-sample' });
    }
    t.milestones.sort((a, b) => a.year - b.year);
    return t;
  }

  // Same JSON shape as the Python CLI's to_data, so pages and `idealine render` agree.
  function toData(t) {
    const byId = new Map(t.evidence.map(e => [e.eid, e]));
    const ev = ids => ids.map(i => byId.get(i)).filter(Boolean).map(e => ({
      id: e.eid, text: e.text, title: e.work.title, year: e.work.year, url: e.work.url, authors: e.work.shortAuthors, fromTitle: e.fromTitle,
    }));
    return {
      term: t.term,
      aliases: t.aliases,
      summary: t.summary,
      counts: t.counts,
      total: t.counts.reduce((n, [, c]) => n + c, 0),
      model: t.model,
      generated: t.generated,
      evidenceCount: t.evidence.length,
      eras: t.eras.map(e => ({ start: e.start, end: e.end, label: e.label, meaning: e.meaning, evidence: ev(e.evidence) })),
      milestones: t.milestones.map(m => ({
        year: m.year, kind: m.kind, title: m.title, why: m.why,
        url: m.work ? m.work.url : null, workTitle: m.work ? m.work.title : null, authors: m.work ? m.work.shortAuthors : null,
        link: m.link, evidence: ev(m.evidence),
      })),
    };
  }

  const api = { IdealineError, OpenAlex, KINDS, abstractFromIndex, workFromJson, phraseQuery, oaFilter, termPattern, sentencesWithTerm, harvest, buildPrompt, titleOverlap, applyAnalysis, baseline, toData };
  global.IdealineCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
