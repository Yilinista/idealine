// idealine timeline renderer. renderTimeline(D, root) draws the interactive
// timeline for one term into the elements under `root` marked with data-part:
// headline, senses, chart, legend, detail, eras. Used by the static term pages and
// the web app. All text from data is inserted with textContent or escaped; links
// must be http(s). The pure helpers at the top (takeoff, burst, sense mix, co-terms)
// have no DOM access and are exported for tests.
(function (global) {
  'use strict';
  const KINDS = ['ancestor', 'origin', 'coined', 'popularized', 'redefined', 'applied', 'critique'];
  const NS = 'http://www.w3.org/2000/svg';
  const ISSUES = 'https://github.com/Yilinista/idealine/issues/new';
  // Categorical colours for the evidence lane and the sense mix; grey = unknown/unclear.
  const PALETTE = ['#4c6ef5', '#e8590c', '#2b8a3e', '#ae3ec9', '#c92a2a', '#1098ad', '#f59f00', '#5c7cfa'];
  const GREY = '#adb5bd', OTHER = '#868e96';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = u => (typeof u === 'string' && /^https?:\/\//i.test(u) ? u : null);
  const reEsc = w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // --- pure helpers ---------------------------------------------------------------

  // Same onset rule as core.js: first year by which the term has 3 papers or 1% of all.
  function onsetYear(counts) {
    const total = counts.reduce((n, [, c]) => n + c, 0), need = Math.max(3, total * 0.01);
    let acc = 0;
    for (const [y, c] of [...counts].sort((a, b) => a[0] - b[0])) { acc += c; if (acc >= need) return y; }
    return null;
  }

  // Yearly series with missing years filled with 0, from `from` to `to`.
  function fill(counts, from, to) {
    const m = new Map(counts);
    const out = [];
    for (let y = from; y <= to; y++) out.push([y, m.get(y) || 0]);
    return out;
  }

  // Ke et al. (PNAS 2015) awakening time: the year before the peak that lies farthest
  // below the straight line from the first year to the peak. Null when the curve is
  // too short or too small to have a slow start worth naming.
  function awakening(counts) {
    if (!counts.length) return null;
    const peak = counts.reduce((a, b) => (b[1] > a[1] ? b : a));
    const first = Math.max(counts[0][0], peak[0] - 60);
    const s = fill(counts, first, peak[0]);
    if (peak[1] < 10 || s.length < 4) return null;
    const [t0, c0] = s[0], [tm, cm] = s[s.length - 1];
    let best = null, bestD = 0;
    for (const [t, c] of s) {
      const d = ((cm - c0) / (tm - t0)) * (t - t0) + c0 - c;  // how far below the line
      if (d > bestD) { bestD = d; best = t; }
    }
    return best != null && best > t0 && best < tm ? best : null;
  }

  // Takeoff year: from the awakening point, the first year clearly above the slow
  // start (more than twice its highest yearly count, and at least 3 papers). The
  // awakening point itself can be the last quiet year, before the term even exists.
  function takeoff(counts) {
    const ta = awakening(counts);
    if (ta == null) return null;
    const m = new Map(counts);
    const before = Math.max(0, ...counts.filter(([y]) => y < ta).map(([, c]) => c));
    const last = counts[counts.length - 1][0];
    for (let y = ta; y <= last; y++) if ((m.get(y) || 0) > Math.max(2 * before, 2)) return y;
    return null;
  }

  // Kleinberg (2002) two-state burst detection on yearly counts. With per-year totals
  // it uses the batched (binomial) form on shares; without, a Poisson form on counts.
  // Returns [[startYear, endYear], ...] for the runs spent in the burst state.
  function bursts(counts, totals, s = 2, gamma = 1) {
    if (counts.length < 3) return [];
    const series = fill(counts, counts[0][0], counts[counts.length - 1][0]);
    const tot = new Map(totals || []);
    const useTot = series.every(([y]) => tot.get(y) > 0);
    const n = series.length, R = series.reduce((a, [, r]) => a + r, 0);
    let cost;
    if (useTot) {
      const D = series.reduce((a, [y]) => a + tot.get(y), 0), p = [R / D, Math.min(0.9999, (s * R) / D)];
      cost = (i, y, r) => -(r * Math.log(p[i]) + (tot.get(y) - r) * Math.log(1 - p[i]));
    } else {
      const lam = [R / n, (s * R) / n];
      cost = (i, y, r) => lam[i] - r * Math.log(lam[i]);
    }
    const up = gamma * Math.log(n);
    let c = [0, up];
    const back = [];
    for (const [y, r] of series) {
      const stay0 = c[0], from1to0 = c[1], to1from0 = c[0] + up, stay1 = c[1];
      const n0 = Math.min(stay0, from1to0), n1 = Math.min(to1from0, stay1);
      back.push([stay0 <= from1to0 ? 0 : 1, to1from0 < stay1 ? 0 : 1]);
      c = [n0 + cost(0, y, r), n1 + cost(1, y, r)];
    }
    let st = c[0] <= c[1] ? 0 : 1;
    const states = new Array(n);
    for (let i = n - 1; i >= 0; i--) { states[i] = st; st = back[i][st]; }
    const out = [];
    states.forEach((v, i) => {
      if (!v) return;
      const y = series[i][0];
      if (out.length && out[out.length - 1][1] === y - 1) out[out.length - 1][1] = y; else out.push([y, y]);
    });
    return out.filter(([a, b]) => series.some(([y, r]) => y >= a && y <= b && r > 0));
  }

  // Jensen-Shannon distance (base 2, 0..1) between two {key: count} maps.
  function jsDistance(a, b) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    const sa = Object.values(a).reduce((x, y) => x + y, 0), sb = Object.values(b).reduce((x, y) => x + y, 0);
    if (!sa || !sb) return null;
    let d = 0;
    for (const k of keys) {
      const p = (a[k] || 0) / sa, q = (b[k] || 0) / sb, m = (p + q) / 2;
      if (p) d += 0.5 * p * Math.log2(p / m);
      if (q) d += 0.5 * q * Math.log2(q / m);
    }
    return Math.sqrt(Math.max(0, d));
  }

  // SemEval-2020 Task 1 binary change rule for small samples: a sense is new when it
  // goes from at most k uses to at least n uses, faded the other way round.
  function senseChange(prev, cur, k = 2, n = 5) {
    const keys = new Set([...Object.keys(prev), ...Object.keys(cur)]);
    const gained = [], lost = [];
    for (const key of keys) {
      if ((prev[key] || 0) <= k && (cur[key] || 0) >= n) gained.push(key);
      if ((prev[key] || 0) >= n && (cur[key] || 0) <= k) lost.push(key);
    }
    return { gained, lost };
  }

  const STOP = new Set(('a about above after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having here how however i if in into is it its itself just more most no nor not now of off on once only or other our out over own paper papers present propose proposed same she should so some such than that the their them then there these they this those through to too under until up use used uses using very via was we were what when where which while who whom why will with within without would you your study studies approach approaches based results show shows new also one two three may well like many much often recent including').split(' '));

  // Word counts of the quotes, without stop words, numbers, or the term's own words.
  function wordCounts(texts, termWords) {
    const m = new Map();
    for (const s of texts) {
      for (const w of String(s).toLowerCase().match(/\p{L}[\p{L}\p{N}-]{2,}/gu) || []) {
        if (STOP.has(w) || termWords.has(w)) continue;
        m.set(w, (m.get(w) || 0) + 1);
      }
    }
    return m;
  }

  function cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (const [k, v] of a) { na += v * v; if (b.has(k)) dot += v * b.get(k); }
    for (const v of b.values()) nb += v * v;
    return na && nb ? dot / Math.sqrt(na * nb) : 0;
  }

  // Time of a quote or milestone as a fractional year: its month when the date agrees
  // with its year and is not OpenAlex's 1 January stand-in for "year only".
  function timeOf(year, date, fallback) {
    const d = /^(\d{4})-(\d{2})/.exec(date || '');
    const yearOnly = /^\d{4}-01-01/.test(date || '');
    return d && +d[1] === year && !yearOnly ? year + (+d[2] - 0.5) / 12 : year + fallback;
  }

  // --- interface text ---------------------------------------------------------------

  // Pass a partial object as the third argument to translate it.
  const fmtShare = v => { const pm = v * 1e6; return pm >= 10 ? Math.round(pm).toLocaleString('en-US') : pm.toFixed(pm >= 1 ? 1 : 2); };
  const LABELS_EN = {
    kinds: { origin: 'earliest found' },
    msg: s => s,
    papers: n => `${n} papers`,
    yearPapers: (y, n) => `${y}: ${n} papers`,
    timelineOf: term => `Timeline of ${term}`,
    inSample: 'Linked paper uses the term itself.',
    resolved: title => `Named in the quotes; matched to “${title}” in OpenAlex. Check the match.`,
    unresolved: 'Named in the quotes but not found in OpenAlex, so there is no link.',
    titleOf: 'Title of ',
    legendDashed: 'dashed = no link found',
    legendBars: 'bars = papers per year',
    legendBarsQ: 'bars = papers per year; recent years by quarter',
    legendShare: 'bars = papers per million in all of OpenAlex that year',
    legendLog: 'log scale',
    legendPartial: 'hatched = period not over yet',
    noTotal: ys => `no full-year OpenAlex total for ${ys} yet, so no bar`,
    follows: 'This timeline follows:',
    otherSenses: n => `The same words also mean ${n === 1 ? 'one unrelated thing' : n + ' unrelated things'} in these papers. Left out of eras and milestones; the bars still count them.`,
    otherSensesShow: 'Show the other meanings',
    quotesN: n => `${n} quote${n === 1 ? '' : 's'}`,
    wrongSense: '',
    quarterPapers: (y, q, n) => `${y} Q${q}: ${n} papers`,
    undated: n => `${n} dated only by year, not in any quarter`,
    yLabel: 'Bars', yPapers: 'Papers', yShare: 'Share of all papers',
    scaleLabel: 'Scale', scaleLinear: 'Linear', scaleLog: 'Log',
    shareOf: (y, v) => `${y}: ${fmtShare(v)} per million papers in OpenAlex`,
    perMillion: v => `${fmtShare(v)} per million`,
    partial: d => `not over yet (data as of ${d})`,
    burst: 'burst', takeoff: y => `takeoff ${y}`,
    takeoffTip: 'Takeoff: the year the curve leaves its slow start (Ke et al. 2015). Burst: years of unusually high use (Kleinberg 2002). Both are computed from the counts.',
    headline: h => `First seen ${h.first}` + (h.ta ? `; under ${h.before} papers a year until ${h.ta - 1}, then took off` : '') + `; ${h.peak.toLocaleString('en-US')} papers in ${h.peakYear}` + (h.partialPeak ? ' (so far)' : '') + '.',
    laneBySense: 'ticks = quoted sentences, coloured by meaning',
    laneByField: 'ticks = quoted sentences, coloured by the paper’s field',
    fieldUnknown: 'field unknown', otherFields: 'other fields', unclear: 'meaning unclear', otherMeanings: 'other meanings',
    mixTitle: 'Meanings in this era',
    moved: v => `meaning moved ${v} since the previous era (0 = same mix, 1 = no overlap)`,
    newSense: l => `new: ${l}`, fadedSense: l => `faded: ${l}`,
    fewQuotes: n => `${n} tagged quote${n === 1 ? '' : 's'}: too few to compare`,
    fewPrevQuotes: n => `previous era has only ${n} tagged quote${n === 1 ? '' : 's'}: too few to compare`,
    mixNote: 'Meaning mixes count quoted sentences (titles and abstracts only); the labels come from the model and can be wrong.',
    words: 'Common words', newWords: 'new', simLatest: v => `similarity to the latest era: ${v}`,
    provCounted: 'Counted from OpenAlex; no model.',
    provModel: (model, n, date) => `Labelled by ${model} from ${n} quote${n === 1 ? '' : 's'} (${date}).`,
    earliestCaveat: 'Earliest paper found in OpenAlex (titles and abstracts only). Preprints, blogs and talks often come earlier.',
    earlierUse: 'Know an earlier use?',
    checkExact: 'a quote has the exact phrase', checkSense: 'uses it in this meaning', checkCoin: 'presents the name as new',
    shiftOf: s => `kind of change: ${({ broadening: 'broader', narrowing: 'narrower', metaphor: 'metaphor', 'new field': 'new field' })[s] || s}`,
    checksNote: 'n/m = a separate AI check of 7 ready-made timelines agreed with that label type n of m times (not a check of this page)',
    checked: (ok, n) => `A separate AI check of the ready-made timelines agreed with this label ${ok} times out of ${n}.`,
    rootsTitle: 'Roots: what the papers using the term cite',
    rootsNote: (p, r) => `From the references of ${p} sampled papers that use the term (${r} cited works looked up). Peaks are publication years cited far more than their neighbours (reference publication year spectroscopy, Marx et al. 2014); each shows its most-cited work.`,
    rootsCites: n => `cited by ${n} of these papers`,
    rootsBtn: n => `Find roots (about ${n} OpenAlex requests)`,
  };

  // --- renderer ---------------------------------------------------------------------

  function renderTimeline(D, root, labels) {
    root = root || document;
    const L = Object.assign({}, LABELS_EN, labels || {});
    const css = n => getComputedStyle(document.documentElement).getPropertyValue('--' + n).trim();
    const el = (tag, attrs = {}, parent) => {
      const e = document.createElementNS(NS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(e);
      return e;
    };
    const kindName = k => (L.kinds && L.kinds[k]) || k;
    const part = name => root.querySelector(`[data-part="${name}"]`);
    const chart = part('chart'), detail = part('detail');
    chart.textContent = '';
    const KIND_OK = k => (KINDS.includes(k) ? k : 'origin');
    const phrases = [D.term, ...(D.aliases || [])].filter(p => p && p.trim());
    const termSrc = '(' + phrases.map(p => p.split(/[\s-]+/).filter(Boolean).map(reEsc).join('[\\s-]+')).join('|') + ')';
    const termRe = new RegExp(termSrc, 'igu'), termTest = new RegExp(termSrc, 'iu');
    const termWords = new Set(phrases.flatMap(p => p.toLowerCase().split(/[\s-]+/)).flatMap(w => [w, w + 's', w.replace(/s$/, '')]));
    // Split the raw text first, then escape each piece, so entities are never cut.
    const mark = s => String(s ?? '').split(termRe).map((p, i) => (i % 2 ? `<mark>${esc(p)}</mark>` : esc(p))).join('');
    const quotes = Array.isArray(D.quotes) ? D.quotes : [];
    const senses = Array.isArray(D.senses) ? D.senses : [];
    const related = new Set(senses.filter(s => s.related).map(s => s.key));
    const sensesOn = senses.length > 0 && quotes.some(q => q.sense);
    const totals = new Map(D.totals || []);
    // Totals fetched in an earlier year than this data: their last year was not over yet,
    // so its share would be too high. Leave those years out of the share view.
    const asofY = /^\d{4}/.test(D.totalsAsOf || '') ? +D.totalsAsOf.slice(0, 4) : 0;
    if (asofY && /^\d{4}/.test(D.generated || '') && +D.generated.slice(0, 4) > asofY) for (const y of [...totals.keys()]) if (y >= asofY) totals.delete(y);
    const missingTot = totals.size ? D.counts.filter(([y, c]) => c > 0 && !totals.get(y)).map(([y]) => y) : [];
    const genDate = /^\d{4}-\d{2}-\d{2}$/.test(D.generated || '') ? D.generated : null;
    const prov = n => (D.model ? L.provModel(D.model, n, D.generated || '') : L.provCounted);

    // View state: bar height (papers or share) and scale (auto, linear, log), kept in the URL.
    const params = new URLSearchParams(global.location ? global.location.search : '');
    const view = { y: params.get('y') === 'share' && totals.size ? 'share' : 'papers', scale: ['linear', 'log'].includes(params.get('scale')) ? params.get('scale') : 'auto' };
    let msLaid = [], selected = -1, logOn = false;

    // Colour of a quote tick: by meaning when the model tagged quotes, else by field.
    const colorKey = (() => {
      if (sensesOn) {
        const map = new Map();
        senses.filter(s => s.related).forEach((s, i) => map.set(s.key, PALETTE[i % PALETTE.length]));
        const items = senses.filter(s => s.related && quotes.some(q => q.sense === s.key)).map(s => [s.label, map.get(s.key)]);
        if (quotes.some(q => q.sense && q.sense !== 'unclear' && !related.has(q.sense))) items.push([L.otherMeanings, OTHER]);
        if (quotes.some(q => !q.sense || q.sense === 'unclear')) items.push([L.unclear, GREY]);
        return { of: q => (related.has(q.sense) ? map.get(q.sense) : q.sense && q.sense !== 'unclear' ? OTHER : GREY), items, title: L.laneBySense };
      }
      const byField = new Map();
      for (const q of quotes) if (q.field) byField.set(q.field, (byField.get(q.field) || 0) + 1);
      const top = [...byField].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([f]) => f);
      const map = new Map(top.map((f, i) => [f, PALETTE[i]]));
      const items = top.map(f => [f, map.get(f)]);
      if (quotes.some(q => q.field && !map.has(q.field))) items.push([L.otherFields, OTHER]);
      if (quotes.some(q => !q.field)) items.push([L.fieldUnknown, GREY]);
      return { of: q => (!q.field ? GREY : map.get(q.field) || OTHER), items, title: L.laneByField };
    })();

    function build() {
      chart.textContent = '';
      const counts = new Map(D.counts);
      const years = [...counts.keys(), ...D.milestones.map(m => m.year), ...D.eras.flatMap(e => [e.start, e.end])].filter(Boolean);
      if (!years.length) return;
      const nowYear = Math.max(...years), minYear = Math.max(Math.min(...years), nowYear - 600);
      const avail = Math.max(320, chart.parentElement.clientWidth || 900);
      const compact = avail < 600;  // phones: numbered dots, cards listed below
      const left = compact ? 24 : 40, labelRoom = compact ? 40 : 230, width = Math.max(compact ? 340 : 600, avail);
      const share = view.y === 'share';
      // Slots along the axis: one per year, or one per quarter for the years that
      // data.quarters covers (young terms; not in the share view, which is yearly).
      const qByYear = new Map();
      if (!share) for (const [k, c] of D.quarters || []) {
        const m = /^(\d{4})-Q([1-4])$/.exec(k);
        if (m) (qByYear.get(+m[1]) || qByYear.set(+m[1], []).get(+m[1])).push([+m[2], c]);
      }
      const msT = D.milestones.map(m => timeOf(m.year, m.date, 0.02));
      const slots = [];
      for (let y = minYear; y <= nowYear; y++) {
        const qs = qByYear.get(y);
        if (qs) qs.sort((p, q) => p[0] - q[0]).forEach(([q, c]) => slots.push({ y, q, t0: y + (q - 1) / 4, t1: y + q / 4, c }));
        else slots.push({ y, q: 0, t0: y, t1: y + 1, c: counts.get(y) || 0 });
      }
      // Bar value: papers, or papers per all OpenAlex works that year.
      // Years with papers but no shipped total (newer than the snapshot) get no bar; the legend says so.
      for (const s of slots) s.v = share ? (totals.get(s.y) ? s.c / totals.get(s.y) : 0) : s.c;
      // The period the data was fetched in is not over yet.
      if (genDate) {
        const gy = +genDate.slice(0, 4), gq = Math.ceil(+genDate.slice(5, 7) / 3);
        for (const s of slots) s.partial = s.y === gy && (!s.q || s.q === gq);
      }
      // Each slot gets width by how much happens in it: milestone slots and busy slots
      // are wide, quiet ones thin. A century of rare use stays a short strip.
      const peakC = Math.max(1, ...slots.map(s => s.c));
      const hasMs = s => msT.some(t => t >= s.t0 && t < s.t1);
      const raw = s => (hasMs(s) ? (compact ? 18 : 30) : 0) + 34 * Math.sqrt(s.c / peakC) + (s.q ? 12 : s.c / peakC > 0.002 ? 6 : 2);
      const total = slots.reduce((a, s) => a + raw(s), 0);
      const scale = Math.max(compact ? 0.4 : 1, Math.min(2.2, (width - left - labelRoom) / total));
      let acc = left;
      for (const s of slots) { s.x0 = acc; acc += raw(s) * scale; s.x1 = acc; s.xc = (s.x0 + s.x1) / 2; }
      const X = t => {
        const s = slots.find(s => t >= s.t0 && t < s.t1) || (t < slots[0].t0 ? slots[0] : slots[slots.length - 1]);
        const f = Math.max(0, Math.min(1, (t - s.t0) / (s.t1 - s.t0)));
        return s.x0 + f * (s.x1 - s.x0);
      };
      const fine = slots.some(s => s.q);

      // Lay out milestone labels in lanes so they do not overlap. Phones show numbers.
      const lanes = [], laneH = compact ? 26 : 36, axisPad = 26;
      msLaid = D.milestones.map((m, i) => {
        const label = compact ? String(i + 1) : m.title.length > 34 ? m.title.slice(0, 33) + '…' : m.title;
        const text = compact ? label : `${m.year} · ${label}`;
        const w = [...text].reduce((s, c) => s + (/[A-Z]/.test(c) ? 8 : 6.3), 0) + 22, x = X(msT[i]);
        let lane = 0;
        while ((lanes[lane] ?? -1e9) > x - 6) lane++;
        lanes[lane] = x + w;
        return { ...m, kind: KIND_OK(m.kind), i, label, text, x, lane };
      });
      const nLanes = Math.max(1, lanes.length);
      const W = Math.max(width, ...lanes.map(r => r + 24), acc + 20);
      const eraH = D.eras.length ? 44 : 0, top = eraH + 10;
      const axisY = top + nLanes * laneH + axisPad, barH = 70;
      const tickY = axisY + barH + 26, laneY = tickY + (fine ? 26 : 12), hasLane = quotes.length > 0;
      const H = laneY + (hasLane ? 22 : 0) + 8;
      const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': L.timelineOf(D.term) });
      const defs = el('defs', {}, svg);
      const pat = el('pattern', { id: 'idl-hatch', width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
      el('rect', { width: 5, height: 5, fill: css('bar'), opacity: 0.35 }, pat);
      el('line', { x1: 0, y1: 0, x2: 0, y2: 5, stroke: css('bar'), 'stroke-width': 2.5 }, pat);

      // Era bands; labels alternate between two rows and are cut to fit.
      D.eras.forEach((e, k) => {
        const xa = X(e.start), xb = X(e.end + 1 - 1e-6), row = k % 2;
        el('rect', { x: xa, y: row * 16, width: Math.max(4, xb - xa), height: axisY - row * 16, fill: css(k % 2 ? 'era2' : 'era1'), rx: 6 }, svg);
        const next = D.eras[k + 2], room = (next ? X(next.start) : W) - xa - 12;
        const maxChars = Math.max(compact ? 4 : 8, Math.floor(room / 6.6));
        const label = e.label.length > maxChars ? e.label.slice(0, maxChars - 1) + '…' : e.label;
        const t = el('text', { x: xa + 8, y: 15 + row * 16, 'font-weight': 600, 'font-size': 11 }, svg);
        t.textContent = label;
        el('title', {}, t).textContent = `${e.start}–${e.end}: ${e.label}`;
      });

      // Takeoff and bursts, computed from the yearly counts (shares when totals exist).
      const ta = takeoff(D.counts), bs = bursts(D.counts, D.totals);
      for (const [a, b] of bs) {
        const xa = X(a), xb = X(b + 1 - 1e-6);
        const r = el('rect', { x: xa, y: axisY + 2, width: Math.max(3, xb - xa), height: barH + 8, fill: css('critique'), opacity: 0.08, rx: 3 }, svg);
        el('title', {}, r).textContent = `${L.burst} ${a === b ? a : a + '–' + b}. ${L.takeoffTip}`;
      }

      // Bars hang below the axis. Linear or log height; log by default when the
      // values span more than 50x, so the early years are not flattened to nothing.
      const vals = slots.map(s => s.v).filter(v => v > 0);
      const vmax = Math.max(...vals, 1e-12), vmin = Math.min(...vals, vmax);
      logOn = view.scale === 'log' || (view.scale === 'auto' && vmax / vmin > 50);
      const lmin = Math.log(vmin) - 0.4, lmax = Math.log(vmax);
      const hOf = v => (v <= 0 ? 0 : Math.max(1.5, logOn ? ((Math.log(v) - lmin) / (lmax - lmin || 1)) * barH : (v / vmax) * barH));
      for (const s of slots) {
        if (!s.v) continue;
        const wd = s.x1 - s.x0;
        const r = el('rect', { x: s.xc - wd * 0.34, y: axisY + 6, width: Math.max(1.5, wd * 0.68), height: hOf(s.v), fill: s.partial ? 'url(#idl-hatch)' : css('bar'), rx: 2 }, svg);
        let tip = share ? L.shareOf(s.y, s.v) : s.q ? L.quarterPapers(s.y, s.q, s.c) : L.yearPapers(s.y, s.c);
        if (s.partial) tip += ' · ' + L.partial(genDate);
        el('title', {}, r).textContent = tip;
      }
      el('line', { x1: left - 10, x2: W - 20, y1: axisY, y2: axisY, stroke: css('line'), 'stroke-width': 2 }, svg);
      if (ta) {
        const x = X(ta + (fine ? 0 : 0.5));  // quarter years: the start of the takeoff year
        el('path', { d: `M${x - 5},${axisY - 1} L${x + 5},${axisY - 1} L${x},${axisY - 9} Z`, fill: css('popularized') }, svg);
        el('line', { x1: x, x2: x, y1: axisY, y2: axisY + barH + 6, stroke: css('popularized'), 'stroke-width': 1, 'stroke-dasharray': '2 3', opacity: 0.7 }, svg);
        const t = el('text', { x: x + 4, y: axisY + barH + 12, class: 'muted', 'font-size': 10 }, svg);
        t.textContent = L.takeoff(ta);
        el('title', {}, t).textContent = L.takeoffTip;
      }
      // Quarter years: Q labels per slot, the year centred underneath.
      for (const [y] of qByYear) {
        const qs = slots.filter(s => s.y === y && s.q);
        if (!qs.length) continue;
        qs.forEach(s => { if (s.x1 - s.x0 >= 16) el('text', { x: s.xc, y: tickY, 'text-anchor': 'middle', class: 'muted', 'font-size': 10.5 }, svg).textContent = 'Q' + s.q; });
        const yl = el('text', { x: (qs[0].x0 + qs[qs.length - 1].x1) / 2, y: tickY + 16, 'text-anchor': 'middle', class: 'muted', 'font-weight': 600 }, svg);
        yl.textContent = y;
        const und = new Map(D.undated || []).get(y);
        el('title', {}, yl).textContent = L.yearPapers(y, counts.get(y) || 0) + (und ? ' · ' + L.undated(und) : '');
      }
      // Year labels: never closer than 36px; the newest year always gets one.
      const yearSlots = slots.filter(s => !s.q && (s.c || D.milestones.some(m => m.year === s.y)));
      let last = qByYear.size ? Math.min(...slots.filter(s => s.q).map(s => s.x0)) + 18 : 1e9;
      yearSlots.sort((a, b) => b.y - a.y).forEach(s => {
        if (last - s.xc < 36) return;
        el('text', { x: s.xc, y: tickY, 'text-anchor': 'middle', class: 'muted' }, svg).textContent = s.y;
        last = s.xc;
      });
      const peak = slots.reduce((a, s) => (s.v > (a ? a.v : 0) ? s : a), null);
      if (peak) {
        const t = el('text', { x: peak.xc + (peak.x1 - peak.x0) * 0.4, y: axisY + 20, class: 'muted', 'font-size': 10.5 }, svg);
        t.textContent = share ? L.perMillion(peak.v) : L.papers(peak.c);
      }

      // Evidence lane: one tick per quoted sentence, at its month when known.
      if (hasLane) {
        for (const q of quotes) {
          if (!q.year) continue;
          const x = X(timeOf(q.year, q.date, 0.5));
          const g = el('g', { class: 'qtick' }, svg);
          el('rect', { x: x - 1, y: laneY, width: 2, height: 12, fill: colorKey.of(q), rx: 1 }, g);
          el('rect', { x: x - 3, y: laneY - 2, width: 6, height: 16, fill: 'transparent' }, g);
          const txt = String(q.text || '');
          el('title', {}, g).textContent = `${q.year} · ${q.title}: ${txt.length > 220 ? txt.slice(0, 219) + '…' : txt}`;
          const u = safeUrl(q.url);
          if (u) { g.style.cursor = 'pointer'; g.addEventListener('click', () => global.open(u, '_blank', 'noopener')); }
        }
      }

      msLaid.forEach(m => {
        const y = axisY - axisPad - m.lane * laneH;
        const g = el('g', { class: 'ms', tabindex: 0, role: 'button', 'aria-label': `${m.year} ${kindName(m.kind)}: ${m.title}` }, svg);
        el('rect', { x: m.x - 10, y: y - 12, width: m.text.length * 6.3 + (compact ? 24 : 70), height: 24, fill: 'transparent' }, g);
        el('line', { x1: m.x, x2: m.x, y1: y, y2: axisY, stroke: css(m.kind), 'stroke-width': 1.5, 'stroke-dasharray': m.link === 'unresolved' ? '3 3' : '' }, g);
        el('circle', { cx: m.x, cy: y, r: 7, fill: css(m.kind) }, g);
        const t = el('text', { x: m.x + 11, y: y + 4 }, g);
        t.textContent = m.text;
        g.addEventListener('click', () => select(m.i, true));
        g.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); select(m.i, true); } });
        m.g = g;
      });
      chart.appendChild(svg);
      renderList(compact);
      renderLegend();
      if (selected >= 0) msLaid.forEach(x => x.g && x.g.classList.toggle('sel', x.i === selected));
    }

    // Stable deep-link slug per milestone: #m-2025-coined (-2, -3 for repeats).
    const slugs = (() => {
      const seen = new Map();
      return D.milestones.map(m => {
        const base = `m-${m.year}-${String(m.kind).replace(/\s+/g, '-')}`, n = (seen.get(base) || 0) + 1;
        seen.set(base, n);
        return n > 1 ? `${base}-${n}` : base;
      });
    })();

    function select(i, fromUser) {
      const m = D.milestones[i];
      if (!m || !detail) return;
      selected = i;
      const kind = KIND_OK(m.kind);
      msLaid.forEach(x => x.g && x.g.classList.toggle('sel', x.i === i));
      root.querySelectorAll('.mslist button').forEach((b, k) => b.classList.toggle('sel', k === i));
      if (fromUser && global.history && global.location) {
        try { global.history.replaceState(null, '', global.location.pathname + global.location.search + '#' + slugs[i]); } catch (e) { /* file:// pages */ }
      }
      const url = safeUrl(m.url);
      const title = url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(m.title)}</a>` : esc(m.title);
      const status = {
        'in-sample': esc(L.inSample),
        'resolved': esc(L.resolved(m.workTitle || '')),
        'unresolved': esc(L.unresolved),
      }[m.link] || '';
      const quotesHtml = (m.evidence || []).map(e => {
        const eu = safeUrl(e.url);
        const src = eu ? `<a href="${esc(eu)}" target="_blank" rel="noopener noreferrer">${esc(e.title)}</a>` : esc(e.title);
        return `<blockquote>${mark(e.text)}<cite>${e.fromTitle ? esc(L.titleOf) : ''}${src} · ${esc(e.authors)}, ${esc(e.year)}</cite></blockquote>`;
      }).join('');
      // Checkable claims for naming and earliest-use milestones; change type otherwise.
      let checks = '';
      if (kind === 'coined' || kind === 'origin') {
        const tick = v => (v === true ? '✓' : v === false ? '✗' : '?');
        const c = m.checks || {};
        const exact = (m.evidence || []).some(e => termTest.test(e.text || ''));
        const items = [[exact, L.checkExact]];
        if (c.inSense != null) items.push([c.inSense, L.checkSense]);
        if (c.coinage != null) items.push([c.coinage, L.checkCoin]);
        checks = `<ul class="checks">${items.map(([v, t]) => `<li class="${v === true ? 'ok' : v === false ? 'no' : ''}">${tick(v)} ${esc(t)}</li>`).join('')}</ul>`;
      } else if (m.shift) {
        checks = `<p class="shift">${esc(L.shiftOf(m.shift))}</p>`;
      }
      const caveat = kind === 'origin'
        ? `<p class="caveat">${esc(L.earliestCaveat)} <a href="${esc(ISSUES)}?title=${encodeURIComponent('Earlier use of "' + D.term + '"')}" target="_blank" rel="noopener noreferrer">${esc(L.earlierUse)}</a></p>` : '';
      detail.innerHTML = `<div class="kind" style="color:var(--${kind})">${esc(m.year)} · ${esc(kindName(kind))}</div><h2>${title}</h2>` +
        `<p class="why">${esc(L.msg(m.why))}</p>${checks}${caveat}${quotesHtml}<div class="status">${status}</div><div class="prov">${esc(prov((m.evidence || []).length))}</div>`;
    }

    // Phones: the chart shows numbers; the milestones are listed under it.
    function renderList(compact) {
      const card = chart.closest('.card');
      if (!card) return;
      let list = card.querySelector('.mslist');
      if (!compact) { if (list) list.remove(); return; }
      if (!list) {
        list = document.createElement('ol');
        list.className = 'mslist';
        const lg = card.querySelector('[data-part="legend"]');
        card.insertBefore(list, lg ? lg.nextSibling : null);
      }
      list.innerHTML = D.milestones.map((m, i) => `<li><button type="button"${i === selected ? ' class="sel"' : ''}><b>${i + 1}</b> ${esc(m.year)} · ${esc(kindName(KIND_OK(m.kind)))} · ${esc(m.title)}</button></li>`).join('');
      list.querySelectorAll('button').forEach((b, i) => b.addEventListener('click', () => { select(i, true); if (detail.scrollIntoView) detail.scrollIntoView({ block: 'nearest' }); }));
    }

    // View controls (bar height and scale) above the chart.
    function renderBar() {
      const scroller = chart.closest('.scroller') || chart;
      const host = scroller.parentElement;
      if (!host) return;
      let bar = host.querySelector(':scope > .tlbar');
      if (!bar) { bar = document.createElement('div'); bar.className = 'tlbar'; host.insertBefore(bar, scroller); }
      const seg = (label, key, opts) => `<span class="tlseg" role="group" aria-label="${esc(label)}">${opts.map(([v, t, on]) =>
        `<button type="button" data-k="${key}" data-v="${v}" aria-pressed="${on}">${esc(t)}</button>`).join('')}</span>`;
      bar.innerHTML = (totals.size ? seg(L.yLabel, 'y', [['papers', L.yPapers, view.y === 'papers'], ['share', L.yShare, view.y === 'share']]) : '') +
        seg(L.scaleLabel, 'scale', [['linear', L.scaleLinear, !logOn], ['log', L.scaleLog, logOn]]);
      bar.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
        view[b.dataset.k] = b.dataset.v;
        if (global.history && global.location) {
          const u = new URL(global.location.href);
          u.searchParams.set('y', view.y); u.searchParams.set('scale', view.scale);
          try { global.history.replaceState(null, '', u); } catch (e) { /* file:// pages */ }
        }
        build();
        renderBar();
      }));
    }

    function renderLegend() {
      const legend = part('legend');
      if (!legend) return;
      const bars = view.y === 'share' ? L.legendShare : (D.quarters || []).length ? L.legendBarsQ : L.legendBars;
      legend.innerHTML = KINDS.filter(k => D.milestones.some(m => m.kind === k)).map(k => {
        const c = (D.kindChecks || L.checks || {})[k];
        return `<span${c ? ` title="${esc(L.checked(c[0], c[1]))}"` : ''}><i style="background:var(--${k})"></i>${esc(kindName(k))}${c ? ` <small>${esc(c[0] + '/' + c[1])}</small>` : ''}</span>`;
      }).join('') +
        (KINDS.some(k => D.milestones.some(m => m.kind === k) && (D.kindChecks || L.checks || {})[k]) ? `<span>${esc(L.checksNote)}</span>` : '') +
        `<span>${esc(L.legendDashed)}</span><span>${esc(bars + (logOn ? ' · ' + L.legendLog : ''))}</span>` +
        (genDate && D.counts.some(([y]) => y === +genDate.slice(0, 4)) ? `<span>${esc(L.legendPartial)}</span>` : '') +
        (view.y === 'share' && missingTot.length ? `<span>${esc(L.noTotal(missingTot.join(', ')))}</span>` : '') +
        (quotes.length ? `<div class="lanekey"><span>${esc(colorKey.title)}:</span>${colorKey.items.map(([t, c]) => `<span><i style="background:${c}"></i>${esc(t)}</span>`).join('')}</div>` : '');
    }

    // Headline: a data-only sentence about the curve (no model needed).
    const headline = part('headline');
    if (headline) {
      const cs = D.counts || [];
      if (cs.length && (D.total || cs.reduce((a, [, c]) => a + c, 0)) >= 20) {
        // "First seen": skip stray records cut off from the main run of use by more than
        // three empty years (often misdated), the same rule the source cards use.
        const on = onsetYear(cs);
        const nz = cs.filter(([, c]) => c > 0).map(([y]) => y);
        let first = nz[0];
        for (let i = 1; i < nz.length; i++) if (nz[i] - nz[i - 1] > 3 && on && nz[i] <= on) first = nz[i];
        const main = cs.filter(([y]) => y >= first);
        const ta0 = main.length >= 3 ? takeoff(main) : null, ta = ta0 && ta0 > first ? ta0 : null;
        const pk = main.reduce((a, b) => (b[1] > a[1] ? b : a));
        const before = ta ? Math.max(...main.filter(([y]) => y < ta).map(([, c]) => c), 0) + 1 : 0;
        headline.textContent = L.headline({ first, ta, before, peak: pk[1], peakYear: pk[0], partialPeak: genDate && +genDate.slice(0, 4) === pk[0] });
      } else headline.textContent = '';
    }

    renderBar();
    build();
    renderBar();  // the scale buttons show the scale build() chose

    // Which meaning the timeline follows, and the unrelated meanings left out.
    const sensesEl = part('senses');
    if (sensesEl) {
      const other = D.otherSenses || [];
      sensesEl.innerHTML = D.focus && other.length
        ? `<p><b>${esc(L.follows)}</b> ${esc(D.focus)}</p><p>${esc(L.otherSenses(other.length))}</p>` +
          `<details><summary>${esc(L.otherSensesShow)}</summary><ul>${other.map(s => {
            const q = (s.evidence || [])[0];
            return `<li><b>${esc(s.label)}</b> · ${esc(s.meaning)} <span class="muted">(${esc(L.quotesN((s.evidence || []).length))})</span>` +
              (q ? `<q>${mark(q.text)} — ${esc(q.title)}, ${esc(q.year)}</q>` : '') + '</li>';
          }).join('')}</ul>${L.wrongSense && document.getElementById('meaning') ? `<p class="muted">${esc(L.wrongSense)}</p>` : ''}</details>`
        : '';
    }

    // Era cards: meaning, the mix of meanings among its quotes, and its common words.
    const eras = part('eras');
    if (eras) {
      const inFocus = q => !sensesOn || !q.sense || q.sense === 'unclear' || related.has(q.sense);
      // Older data has no full quote list: fall back to each era's own quotes.
      const eraQuotes = D.eras.map(e => (quotes.length ? quotes.filter(q => q.year >= e.start && q.year <= e.end) : e.evidence || []));
      const mixes = eraQuotes.map(qs => {
        const m = {};
        for (const q of qs) if (related.has(q.sense)) m[q.sense] = (m[q.sense] || 0) + 1;
        return m;
      });
      const words = eraQuotes.map(qs => wordCounts(qs.filter(inFocus).map(q => q.text), termWords));
      const latest = words[words.length - 1];
      const senseColor = new Map(senses.filter(s => s.related).map((s, i) => [s.key, PALETTE[i % PALETTE.length]]));
      const senseLabel = new Map(senses.map(s => [s.key, s.label]));
      eras.innerHTML = D.eras.map((e, k) => {
        let mixHtml = '';
        if (sensesOn) {
          const mix = mixes[k], n = Object.values(mix).reduce((a, b) => a + b, 0);
          if (n) {
            mixHtml = `<div class="mix" title="${esc(L.mixTitle)}">${Object.entries(mix).sort((a, b) => b[1] - a[1]).map(([key, c]) =>
              `<span style="width:${(100 * c) / n}%;background:${senseColor.get(key) || OTHER}" title="${esc(senseLabel.get(key) || key)}: ${c}"></span>`).join('')}</div>`;
          }
          if (k > 0) {
            const pn = Object.values(mixes[k - 1]).reduce((a, b) => a + b, 0);
            if (n < 8 || pn < 8) mixHtml += `<p class="muted small">${esc(n < 8 ? L.fewQuotes(n) : L.fewPrevQuotes(pn))}</p>`;
            else {
              const d = jsDistance(mixes[k - 1], mix), ch = senseChange(mixes[k - 1], mix);
              mixHtml += `<p class="muted small">${esc(L.moved(d.toFixed(2)))}</p>` +
                [...ch.gained.map(g => `<span class="badge new">${esc(L.newSense(senseLabel.get(g) || g))}</span>`),
                  ...ch.lost.map(g => `<span class="badge faded">${esc(L.fadedSense(senseLabel.get(g) || g))}</span>`)].join('');
            }
          }
        }
        const w = words[k], prev = k > 0 ? words[k - 1] : null;
        const topWords = [...w].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => t);
        const fresh = prev ? topWords.filter(t => !prev.has(t)) : [];
        const nq = eraQuotes[k].filter(inFocus).length;
        const sim = k < D.eras.length - 1 && latest && latest.size ? cosine(w, latest) : null;
        const wordsHtml = topWords.length ? `<p class="words${nq < 5 ? ' thin' : ''}"><span class="muted">${esc(L.words)}:</span> ${topWords.map(t => (fresh.includes(t) ? `<strong class="nw" title="${esc(L.newWords)}">${esc(t)}</strong>` : esc(t))).join(', ')}` +
          (sim != null ? ` <span class="muted">· ${esc(L.simLatest(sim.toFixed(2)))}</span>` : '') + '</p>' : '';
        return `<div class="era"><b>${esc(e.start)}–${esc(e.end)}</b><h3>${esc(e.label)}</h3><p>${esc(e.meaning)}</p>${mixHtml}${wordsHtml}<div class="prov">${esc(prov((e.evidence || []).length))}</div></div>`;
      }).join('') + (sensesOn && D.eras.length ? `<p class="mixnote muted">${esc(L.mixNote)}</p>` : '');
    }

    // Roots: cited works by publication year, peaks marked, with their top work.
    const rootsEl = part('roots');
    if (rootsEl) {
      const R = D.roots;
      if (R && Array.isArray(R.spectrum) && R.spectrum.length && Array.isArray(R.peaks)) {
        const first = R.peaks.length ? Math.min(...R.peaks.map(p => p.year)) : R.spectrum[0][0];
        const sp = R.spectrum.filter(([y]) => y >= Math.max(R.spectrum[0][0], first - 25));
        const peakYears = new Set(R.peaks.map(p => p.year));
        const w = Math.max(240, Math.min(760, (rootsEl.clientWidth || 700) - 4)), h = 70, bw = w / Math.max(1, sp.length);
        const mx = Math.max(1, ...sp.map(([, c]) => c));
        const bars = sp.map(([y, c], i) => `<rect x="${(i * bw).toFixed(1)}" y="${(h - 14 - (c / mx) * (h - 20)).toFixed(1)}" width="${Math.max(1, bw - 1).toFixed(1)}" height="${((c / mx) * (h - 20)).toFixed(1)}" fill="${peakYears.has(y) ? 'var(--accent)' : 'var(--bar)'}"><title>${esc(y)}: ${esc(c)}</title></rect>`).join('');
        // Year labels: first, last and peaks, never closer than 30px; ends anchored inside.
        let lastX = -1e9;
        const ticks = sp.map(([y], i) => [y, i]).filter(([y, i]) => peakYears.has(y) || i === 0 || i === sp.length - 1).map(([y, i]) => {
          const x = (i + 0.5) * bw, anchor = i === 0 ? 'start' : i === sp.length - 1 ? 'end' : 'middle';
          const xx = i === 0 ? 0 : i === sp.length - 1 ? w : x;
          if (xx - lastX < 30) return '';
          lastX = xx;
          return `<text x="${xx.toFixed(1)}" y="${h - 2}" text-anchor="${anchor}" font-size="10" class="muted">${esc(y)}</text>`;
        }).join('');
        rootsEl.innerHTML = `<h3>${esc(L.rootsTitle)}</h3><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(L.rootsTitle)}">${bars}${ticks}</svg>` +
          `<ul>${R.peaks.map(p => {
            const u = safeUrl(p.url);
            const t = u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(p.title)}</a>` : esc(p.title);
            return `<li><b>${esc(p.year)}</b> · ${t} · ${esc(p.authors || '')} <span class="muted">(${esc(L.rootsCites(p.cites))})</span></li>`;
          }).join('')}</ul><p class="muted small">${esc(L.rootsNote(R.papers || 0, R.refs || 0))}</p>`;
      } else rootsEl.innerHTML = '';
    }

    if (detail) detail.textContent = '';
    // Open the milestone named in the URL (#m-2025-coined), else the first one.
    let want = '';
    try { want = global.location ? decodeURIComponent((global.location.hash || '').slice(1)) : ''; } catch (e) { /* bad % escape */ }
    const hit = want ? slugs.indexOf(want) : -1;
    select(hit >= 0 ? hit : 0, false);
    if (hit >= 0 && detail && detail.scrollIntoView) setTimeout(() => detail.scrollIntoView({ block: 'center' }), 0);
    // Start scrolled so the newest milestone's dot and label are in view (narrow screens).
    const sc = chart.closest('.scroller');
    if (sc) {
      const lastX = Math.max(0, ...msLaid.map(m => m.x));
      sc.scrollLeft = lastX ? Math.min(sc.scrollWidth - sc.clientWidth, lastX - 24) : sc.scrollWidth;
    }
  }

  global.renderTimeline = renderTimeline;
  const helpers = { onsetYear, awakening, takeoff, bursts, jsDistance, senseChange, wordCounts, cosine, timeOf };
  global.IdealineTimeline = helpers;
  if (typeof module !== 'undefined' && module.exports) module.exports = Object.assign({ renderTimeline }, helpers);
})(typeof window !== 'undefined' ? window : globalThis);
