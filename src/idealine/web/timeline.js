// idealine timeline renderer. renderTimeline(D, root) draws the interactive
// timeline for one term into the elements under `root` marked with data-part:
// chart, legend, detail, eras. Used by the static term pages and the web app.
// All text from data is inserted with textContent or escaped; links must be http(s).
(function (global) {
  'use strict';
  const KINDS = ['ancestor', 'origin', 'coined', 'popularized', 'redefined', 'applied', 'critique'];
  const NS = 'http://www.w3.org/2000/svg';
  const css = n => getComputedStyle(document.documentElement).getPropertyValue('--' + n).trim();
  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = u => (typeof u === 'string' && /^https?:\/\//i.test(u) ? u : null);
  const reEsc = w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Interface text; pass a partial object as the third argument to translate it.
  const LABELS_EN = {
    kinds: {},
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
    quarterPapers: (y, q, n) => `${y} Q${q}: ${n} papers`,
    undated: n => `${n} dated only by year, not in any quarter`,
  };

  function renderTimeline(D, root, labels) {
    root = root || document;
    const L = Object.assign({}, LABELS_EN, labels || {});
    const kindName = k => (L.kinds && L.kinds[k]) || k;
    const part = name => root.querySelector(`[data-part="${name}"]`);
    const chart = part('chart'), detail = part('detail');
    chart.textContent = '';
    const KIND_OK = k => (KINDS.includes(k) ? k : 'origin');
    const phrases = [D.term, ...(D.aliases || [])].filter(p => p && p.trim());
    const termRe = new RegExp('(' + phrases.map(p => p.split(/[\s-]+/).filter(Boolean).map(reEsc).join('[\\s-]+')).join('|') + ')', 'igu');
    // Split the raw text first, then escape each piece, so entities are never cut.
    const mark = s => String(s ?? '').split(termRe).map((p, i) => (i % 2 ? `<mark>${esc(p)}</mark>` : esc(p))).join('');
    let msLaid = [];

    function build() {
      const counts = new Map(D.counts);
      const years = [...counts.keys(), ...D.milestones.map(m => m.year), ...D.eras.flatMap(e => [e.start, e.end])].filter(Boolean);
      if (!years.length) return;
      const nowYear = Math.max(...years), minYear = Math.max(Math.min(...years), nowYear - 600);
      const left = 40, labelRoom = 230;
      const avail = Math.max(600, chart.parentElement.clientWidth || 900);
      // Slots along the axis: one per year, or one per quarter for the years that
      // data.quarters covers (young terms). Time t is a fractional year.
      const qByYear = new Map();
      for (const [k, c] of D.quarters || []) {
        const m = /^(\d{4})-Q([1-4])$/.exec(k);
        if (m) (qByYear.get(+m[1]) || qByYear.set(+m[1], []).get(+m[1])).push([+m[2], c]);
      }
      // A milestone sits at its paper's month when the date agrees with its year;
      // without a month it sits at the start of its year (the year is all we know).
      const tOf = m => {
        const d = /^(\d{4})-(\d{2})/.exec(m.date || '');
        const yearOnly = /^\d{4}-01-01/.test(m.date || '');  // OpenAlex's stand-in for "year only"
        return d && +d[1] === m.year && !yearOnly ? m.year + (+d[2] - 0.5) / 12 : m.year + 0.02;
      };
      const msT = D.milestones.map(tOf);
      const slots = [];
      for (let y = minYear; y <= nowYear; y++) {
        const qs = qByYear.get(y);
        if (qs) qs.sort((p, q) => p[0] - q[0]).forEach(([q, c]) => slots.push({ y, q, t0: y + (q - 1) / 4, t1: y + q / 4, c }));
        else slots.push({ y, q: 0, t0: y, t1: y + 1, c: counts.get(y) || 0 });
      }
      // Each slot gets width by how much happens in it: milestone slots and busy slots
      // are wide, quiet ones thin. A century of rare use stays a short strip.
      const peakC = Math.max(1, ...slots.map(s => s.c));
      const hasMs = s => msT.some(t => t >= s.t0 && t < s.t1);
      const raw = s => (hasMs(s) ? 30 : 0) + 34 * Math.sqrt(s.c / peakC) + (s.q ? 12 : s.c / peakC > 0.002 ? 6 : 2);
      const total = slots.reduce((a, s) => a + raw(s), 0);
      const scale = Math.max(1, Math.min(2.2, (avail - left - labelRoom) / total));
      let acc = left;
      for (const s of slots) { s.x0 = acc; acc += raw(s) * scale; s.x1 = acc; s.xc = (s.x0 + s.x1) / 2; }
      const X = t => {
        const s = slots.find(s => t >= s.t0 && t < s.t1) || (t < slots[0].t0 ? slots[0] : slots[slots.length - 1]);
        const f = Math.max(0, Math.min(1, (t - s.t0) / (s.t1 - s.t0)));
        return s.x0 + f * (s.x1 - s.x0);
      };
      const fine = slots.some(s => s.q);

      // Lay out milestone labels in lanes so they do not overlap.
      const lanes = [], laneH = 36, axisPad = 26;
      msLaid = D.milestones.map((m, i) => {
        const label = m.title.length > 34 ? m.title.slice(0, 33) + '…' : m.title;
        const w = [...`${m.year} · ${label}`].reduce((s, c) => s + (/[A-Z]/.test(c) ? 8 : 6.3), 0) + 22, x = X(msT[i]);
        let lane = 0;
        while ((lanes[lane] ?? -1e9) > x - 6) lane++;
        lanes[lane] = x + w;
        return { ...m, kind: KIND_OK(m.kind), i, label, x, lane };
      });
      const nLanes = Math.max(1, lanes.length);
      const W = Math.max(avail, ...lanes.map(r => r + 24), acc + 20);
      const eraH = D.eras.length ? 44 : 0, top = eraH + 10;
      const axisY = top + nLanes * laneH + axisPad, barH = 70, H = axisY + barH + (fine ? 50 : 34);
      const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': L.timelineOf(D.term) });

      // Era bands; labels alternate between two rows and are cut to fit.
      D.eras.forEach((e, k) => {
        const xa = X(e.start), xb = X(e.end + 1 - 1e-6), row = k % 2;
        el('rect', { x: xa, y: row * 16, width: Math.max(4, xb - xa), height: axisY - row * 16, fill: css(k % 2 ? 'era2' : 'era1'), rx: 6 }, svg);
        const next = D.eras[k + 2], room = (next ? X(next.start) : W) - xa - 12;
        const maxChars = Math.max(8, Math.floor(room / 6.6));
        const label = e.label.length > maxChars ? e.label.slice(0, maxChars - 1) + '…' : e.label;
        const t = el('text', { x: xa + 8, y: 15 + row * 16, 'font-weight': 600, 'font-size': 11 }, svg);
        t.textContent = label;
        el('title', {}, t).textContent = `${e.start}–${e.end}: ${e.label}`;
      });

      for (const s of slots) {
        if (!s.c) continue;
        const wd = s.x1 - s.x0, h = Math.max(1.5, Math.sqrt(s.c / peakC) * barH);
        const r = el('rect', { x: s.xc - wd * 0.34, y: axisY + 6, width: Math.max(1.5, wd * 0.68), height: h, fill: css('bar'), rx: 2 }, svg);
        el('title', {}, r).textContent = s.q ? L.quarterPapers(s.y, s.q, s.c) : L.yearPapers(s.y, s.c);
      }
      el('line', { x1: left - 10, x2: W - 20, y1: axisY, y2: axisY, stroke: css('line'), 'stroke-width': 2 }, svg);
      const tickY = axisY + barH + 26;
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
      const peak = slots.reduce((a, s) => (s.c > (a ? a.c : 0) ? s : a), null);
      if (peak) {
        const t = el('text', { x: peak.xc + (peak.x1 - peak.x0) * 0.4, y: axisY + 20, class: 'muted', 'font-size': 10.5 }, svg);
        t.textContent = L.papers(peak.c);
      }

      msLaid.forEach(m => {
        const y = axisY - axisPad - m.lane * laneH;
        const g = el('g', { class: 'ms', tabindex: 0, role: 'button', 'aria-label': `${m.year} ${kindName(m.kind)}: ${m.title}` }, svg);
        el('rect', { x: m.x - 10, y: y - 12, width: m.label.length * 6.3 + 70, height: 24, fill: 'transparent' }, g);
        el('line', { x1: m.x, x2: m.x, y1: y, y2: axisY, stroke: css(m.kind), 'stroke-width': 1.5, 'stroke-dasharray': m.link === 'unresolved' ? '3 3' : '' }, g);
        el('circle', { cx: m.x, cy: y, r: 7, fill: css(m.kind) }, g);
        const t = el('text', { x: m.x + 11, y: y + 4 }, g);
        t.textContent = `${m.year} · ${m.label}`;
        g.addEventListener('click', () => select(m.i));
        g.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); select(m.i); } });
        m.g = g;
      });
      chart.appendChild(svg);
    }

    function select(i) {
      const m = D.milestones[i];
      if (!m || !detail) return;
      const kind = KIND_OK(m.kind);
      msLaid.forEach(x => x.g && x.g.classList.toggle('sel', x.i === i));
      const url = safeUrl(m.url);
      const title = url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(m.title)}</a>` : esc(m.title);
      const status = {
        'in-sample': esc(L.inSample),
        'resolved': esc(L.resolved(m.workTitle || '')),
        'unresolved': esc(L.unresolved),
      }[m.link] || '';
      const quotes = (m.evidence || []).map(e => {
        const eu = safeUrl(e.url);
        const src = eu ? `<a href="${esc(eu)}" target="_blank" rel="noopener noreferrer">${esc(e.title)}</a>` : esc(e.title);
        return `<blockquote>${mark(e.text)}<cite>${e.fromTitle ? esc(L.titleOf) : ''}${src} · ${esc(e.authors)}, ${esc(e.year)}</cite></blockquote>`;
      }).join('');
      detail.innerHTML = `<div class="kind" style="color:var(--${kind})">${esc(m.year)} · ${esc(kindName(kind))}</div><h2>${title}</h2><p class="why">${esc(m.why)}</p>${quotes}<div class="status">${status}</div>`;
    }

    build();
    const legend = part('legend');
    if (legend) {
      legend.innerHTML = KINDS.filter(k => D.milestones.some(m => m.kind === k)).map(k => `<span><i style="background:var(--${k})"></i>${esc(kindName(k))}</span>`).join('') +
        `<span>${esc(L.legendDashed)}</span><span>${esc((D.quarters || []).length ? L.legendBarsQ : L.legendBars)}</span>`;
    }
    const eras = part('eras');
    if (eras) eras.innerHTML = D.eras.map(e => `<div class="era"><b>${esc(e.start)}–${esc(e.end)}</b><h3>${esc(e.label)}</h3><p>${esc(e.meaning)}</p></div>`).join('');
    if (detail) detail.textContent = '';
    select(0);
    // Start scrolled so the newest milestone's dot and label are in view (narrow screens).
    const sc = chart.closest('.scroller');
    if (sc) {
      const lastX = Math.max(0, ...msLaid.map(m => m.x));
      sc.scrollLeft = lastX ? Math.min(sc.scrollWidth - sc.clientWidth, lastX - 24) : sc.scrollWidth;
    }
  }

  global.renderTimeline = renderTimeline;
})(typeof window !== 'undefined' ? window : globalThis);
