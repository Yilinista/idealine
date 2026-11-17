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

  function renderTimeline(D, root) {
    root = root || document;
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
      // Each year gets width by how much happens in it: milestone years and busy years
      // are wide, quiet years are thin. A century of rare use stays a short strip.
      const peakC = Math.max(1, ...counts.values()), msYears = new Set(D.milestones.map(m => m.year));
      const raw = y => (msYears.has(y) ? 30 : 0) + 34 * Math.sqrt((counts.get(y) || 0) / peakC) + ((counts.get(y) || 0) / peakC > 0.002 ? 6 : 2);
      let total = 0;
      for (let y = minYear; y <= nowYear; y++) total += raw(y);
      const scale = Math.max(1, Math.min(2.2, (avail - left - labelRoom) / total));
      const WY = y => raw(y) * scale, pos = new Map();
      let acc = left;
      for (let y = minYear; y <= nowYear; y++) { pos.set(y, acc + WY(y) / 2); acc += WY(y); }
      const X = y => pos.get(Math.max(minYear, Math.min(nowYear, y)));

      // Lay out milestone labels in lanes so they do not overlap.
      const lanes = [], laneH = 36, axisPad = 26;
      msLaid = D.milestones.map((m, i) => {
        const label = m.title.length > 34 ? m.title.slice(0, 33) + '…' : m.title;
        const w = [...`${m.year} · ${label}`].reduce((s, c) => s + (/[A-Z]/.test(c) ? 8 : 6.3), 0) + 22, x = X(m.year);
        let lane = 0;
        while ((lanes[lane] ?? -1e9) > x - 6) lane++;
        lanes[lane] = x + w;
        return { ...m, kind: KIND_OK(m.kind), i, label, x, lane };
      });
      const nLanes = Math.max(1, lanes.length);
      const W = Math.max(avail, ...lanes.map(r => r + 24), acc + 20);
      const eraH = D.eras.length ? 44 : 0, top = eraH + 10;
      const axisY = top + nLanes * laneH + axisPad, barH = 70, H = axisY + barH + 34;
      const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Timeline of ${D.term}` });

      // Era bands; labels alternate between two rows and are cut to fit.
      D.eras.forEach((e, k) => {
        const xa = X(e.start) - WY(e.start) / 2, xb = X(e.end) + WY(e.end) / 2, row = k % 2;
        el('rect', { x: xa, y: row * 16, width: Math.max(4, xb - xa), height: axisY - row * 16, fill: css(k % 2 ? 'era2' : 'era1'), rx: 6 }, svg);
        const next = D.eras[k + 2], room = (next ? X(next.start) - WY(next.start) / 2 : W) - xa - 12;
        const maxChars = Math.max(8, Math.floor(room / 6.6));
        const label = e.label.length > maxChars ? e.label.slice(0, maxChars - 1) + '…' : e.label;
        const t = el('text', { x: xa + 8, y: 15 + row * 16, 'font-weight': 600, 'font-size': 11 }, svg);
        t.textContent = label;
        el('title', {}, t).textContent = `${e.start}–${e.end}: ${e.label}`;
      });

      const maxC = Math.max(1, ...counts.values());
      for (const [y, c] of counts) {
        const h = Math.max(1.5, Math.sqrt(c / maxC) * barH);
        const r = el('rect', { x: X(y) - WY(y) * 0.34, y: axisY + 6, width: Math.max(1.5, WY(y) * 0.68), height: h, fill: css('bar'), rx: 2 }, svg);
        el('title', {}, r).textContent = `${y}: ${c} papers`;
      }
      el('line', { x1: left - 10, x2: W - 20, y1: axisY, y2: axisY, stroke: css('line'), 'stroke-width': 2 }, svg);
      const tickYears = new Set([...counts.keys(), ...D.milestones.map(m => m.year)]);
      // Year labels: never closer than 36px; the newest year always gets one.
      let last = 1e9;
      [...tickYears].sort((a, b) => b - a).forEach(y => {
        if (last - X(y) < 36) return;
        const t = el('text', { x: X(y), y: axisY + barH + 26, 'text-anchor': 'middle', class: 'muted' }, svg);
        t.textContent = y;
        last = X(y);
      });
      const peak = [...counts].sort((a, b) => b[1] - a[1])[0];
      if (peak) {
        const t = el('text', { x: X(peak[0]) + WY(peak[0]) * 0.4, y: axisY + 20, class: 'muted', 'font-size': 10.5 }, svg);
        t.textContent = `${peak[1]} papers`;
      }

      msLaid.forEach(m => {
        const y = axisY - axisPad - m.lane * laneH;
        const g = el('g', { class: 'ms', tabindex: 0, role: 'button', 'aria-label': `${m.year} ${m.kind}: ${m.title}` }, svg);
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
        'in-sample': 'Linked paper uses the term itself.',
        'resolved': `Named in the quotes; matched to “${esc(m.workTitle)}” in OpenAlex. Check the match.`,
        'unresolved': 'Named in the quotes but not found in OpenAlex, so there is no link.',
      }[m.link] || '';
      const quotes = (m.evidence || []).map(e => {
        const eu = safeUrl(e.url);
        const src = eu ? `<a href="${esc(eu)}" target="_blank" rel="noopener noreferrer">${esc(e.title)}</a>` : esc(e.title);
        return `<blockquote>${mark(e.text)}<cite>${e.fromTitle ? 'Title of ' : ''}${src} · ${esc(e.authors)}, ${esc(e.year)}</cite></blockquote>`;
      }).join('');
      detail.innerHTML = `<div class="kind" style="color:var(--${kind})">${esc(m.year)} · ${esc(kind)}</div><h2>${title}</h2><p class="why">${esc(m.why)}</p>${quotes}<div class="status">${status}</div>`;
    }

    build();
    const legend = part('legend');
    if (legend) {
      legend.innerHTML = KINDS.filter(k => D.milestones.some(m => m.kind === k)).map(k => `<span><i style="background:var(--${k})"></i>${k}</span>`).join('') +
        '<span>dashed = no link found</span><span>bars = papers per year</span>';
    }
    const eras = part('eras');
    if (eras) eras.innerHTML = D.eras.map(e => `<div class="era"><b>${esc(e.start)}–${esc(e.end)}</b><h3>${esc(e.label)}</h3><p>${esc(e.meaning)}</p></div>`).join('');
    if (detail) detail.textContent = '';
    select(0);
    const sc = chart.closest('.scroller');
    if (sc) sc.scrollLeft = sc.scrollWidth;
  }

  global.renderTimeline = renderTimeline;
})(typeof window !== 'undefined' ? window : globalThis);
