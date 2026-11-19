// Evidence-first reading brief, shared by live results and self-contained pages.
(function (global) {
  'use strict';

  const TEXT = {
    en: {
      start: 'Start with these sources', browse: 'Browse the evidence',
      route: 'A short reading route', suggested: 'Suggested starting points',
      intro: 'Read the passages, compare the uses, then choose a paper to explore.',
      auto: 'Selected from the sample for different dates or suggested meanings. Check each source; this is not a complete reading list.',
      scope: 'Titles and abstracts only · a sample, not a complete history',
      saved: 'Data snapshot', question: 'A question to read with',
      defaultQuestion: 'How do these papers use the same term?',
      source: 'Abstract excerpt', titleOnly: 'Title match only', open: 'Open paper ↗',
      copy: 'Copy quote + source', copied: 'Copied with source', copyFail: 'Copy unavailable. Select the text below and copy it.',
      link: 'Link to passage', noLink: 'No source link available', unknownYear: 'Year unknown', unknownAuthor: 'Authors unavailable',
      checked: 'Source text checked', suggestedMeaning: 'Suggested meaning', untagged: 'Not assigned a meaning',
      note: 'Reading note', earlier: 'An earlier sampled use', different: 'Another sampled use', recent: 'A recent sampled use',
      dateWarning: 'Sparse early record — check the date', futureWarning: 'Date is after this snapshot — check the source',
      year: 'Year', allYears: 'All years', meaning: 'Suggested meaning', allMeanings: 'All meanings',
      period: 'Period', meaningShort: 'Meaning', otherMeanings: 'Other meanings', otherTip: 'Meanings that only share the words', all: 'All', decade: d => `${d}s`, andEarlier: y => `${y} and earlier`, newestShort: 'Newest', oldestShort: 'Oldest',
      sort: 'Order', newest: 'Newest first', oldest: 'Oldest first', morePassages: 'Show more passages',
      shown: (n, total) => `${n} of ${total} passages`, matches: n => `${n} passages in the sample`,
      none: 'No passages match these filters. Try another year or meaning.',
      noQuotes: 'No source passages are available in this result. Try a different spelling or another term.',
      noFeatured: 'No linked abstract passages with usable dates are available as starting points. Browse the sample below.',
      meaningNote: 'Meaning labels are model suggestions. The original passages stay in their source language.',
      curve: 'How often the phrase appears', curveNote: 'All phrase matches in OpenAlex titles and abstracts, including other meanings. Counts do not establish who introduced an idea.',
      count: n => `${n.toLocaleString('en-US')} phrase matches`, partial: 'Snapshot year; incomplete',
      method: 'Method & limitations', diagnostics: 'Explore the original timeline & diagnostics', timelineTitle: 'How the term developed',
      methodText: 'OpenAlex supplies phrase counts and a sample of early, highly cited, and recent papers. Abstracts can be missing or truncated, and metadata can be wrong. A title match is not an abstract quotation. Books, posts, and ideas expressed in other words may be absent.',
      methodModel: 'The optional model proposes meanings, eras, and milestones from these passages. A source link does not prove a model label. Diagnostic plots describe the sample, not a validated history.',
      modelSummary: 'Model interpretation — verify against the passages',
      noModel: 'No model was used. The passages are available without meaning labels.',
      modelPending: 'The model is still reading; suggested meaning labels will appear when it is done.',
      originalHint: 'Click a milestone to see the sentences behind it. Labels are suggestions; the quotes are the evidence.',
      story: { start: 'Earliest', key: 'Key paper', now: 'Now' }, storyTitle: 'Three moments', chartKey: 'How to read the chart',
      more: 'More: summary, meanings, all quotes, method',
    },
    zh: {
      start: '从这些原文开始', browse: '浏览原文证据', route: '简短阅读路线', suggested: '建议阅读起点',
      intro: '读原句、比较用法，再选一篇论文深入阅读。',
      auto: '从样本中按年份或建议词义选取。请核对来源；这不是完整的阅读清单。',
      scope: '仅限标题与摘要 · 抽样证据，不是完整历史', saved: '数据快照', question: '带着这个问题读',
      defaultQuestion: '这些论文如何使用同一个术语？', source: '摘要原文', titleOnly: '仅标题匹配', open: '打开论文 ↗',
      copy: '复制原文与出处', copied: '已复制原文与出处', copyFail: '无法自动复制。请选中下方文字并复制。',
      link: '链接到这段原文', noLink: '暂无来源链接', unknownYear: '年份未知', unknownAuthor: '作者信息缺失',
      checked: '已核对来源原文', suggestedMeaning: '建议词义', untagged: '未标注词义', note: '阅读提示',
      earlier: '样本中较早的用法', different: '另一种样本用法', recent: '样本中较新的用法',
      dateWarning: '稀疏早期记录，请核对日期', futureWarning: '日期晚于数据快照，请核对来源',
      year: '年份', allYears: '所有年份', meaning: '建议词义', allMeanings: '所有词义', sort: '排序',
      period: '年代', meaningShort: '词义', otherMeanings: '其他意思', otherTip: '只是同名、与本时间线无关的意思', all: '全部', decade: d => `${d} 年代`, andEarlier: y => `${y} 年及以前`, newestShort: '最新', oldestShort: '最早',
      newest: '从新到旧', oldest: '从旧到新', morePassages: '显示更多原文',
      shown: (n, total) => `已显示 ${n} / ${total} 段原文`, matches: n => `样本包含 ${n} 段原文`,
      none: '没有符合筛选条件的原文。请换一个年份或词义。',
      noQuotes: '这个结果暂无来源原文。请尝试其他写法或术语。',
      noFeatured: '暂无日期可用且带链接的摘要原文作为阅读起点。可浏览下方完整样本。',
      meaningNote: '词义标签是模型的建议；原文保留来源语言。',
      curve: '词组出现的频率', curveNote: '统计 OpenAlex 标题与摘要中的所有词组匹配，包括其他含义。数量不能证明谁最先提出一个概念。',
      count: n => `${n.toLocaleString('en-US')} 条词组匹配`, partial: '快照所在年份，尚不完整',
      method: '方法与局限', diagnostics: '查看原时间线与诊断图表', timelineTitle: '这个词的来龙去脉',
      methodText: 'OpenAlex 提供词组数量，以及较早、被引较多和近期论文的样本。摘要可能缺失或截断，元数据可能有误。标题匹配不等于摘要引文。书籍、博客及使用其他表达的概念可能未收录。',
      methodModel: '可选模型根据这些原文提出词义、时期和里程碑。来源链接不能证明模型标签正确；诊断图表描述的是样本，不是已验证的历史。',
      modelSummary: '模型解读，请对照原文核实', noModel: '未使用模型。可以直接阅读原文，没有模型词义标签。', modelPending: '模型还在阅读，完成后会给出建议的词义标签。',
      originalHint: '点击里程碑，看它依据的原句。标签只是建议，原句才是证据。',
      story: { start: '最早', key: '关键论文', now: '现在' }, storyTitle: '三个时刻', chartKey: '怎么看这张图',
      more: '更多：总结、词义、全部原文、方法',
    },
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function safeUrl(value) {
    try { const u = new URL(value); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch (_) { return ''; }
  }
  const localized = (value, lang) => typeof value === 'string' ? value : (value && (value[lang] || value.en)) || '';
  const yearOf = q => Number.isInteger(q.year) && q.year > 0 ? q.year : null;
  const sourceKey = q => q.url || `${q.title}\n${q.authors}\n${q.year}`;

  function readingModel(d) {
    const raw = Array.isArray(d.quotes) ? d.quotes : [...(d.milestones || []), ...(d.eras || [])].flatMap(m => m.evidence || []);
    const seen = new Set(), ids = new Set();
    const quotes = raw.filter(q => q && typeof q.text === 'string' && q.text.trim()).map((q, i) => {
      let id = String(q.id || `quote-${i + 1}`).replace(/[^a-zA-Z0-9_-]/g, '-');
      while (ids.has(id)) id += '-2';
      ids.add(id);
      return { ...q, id, url: safeUrl(q.url), year: yearOf(q) };
    }).filter(q => {
      const key = `${sourceKey(q)}\n${q.text}`;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
    const counts = (d.counts || []).filter(([y, n]) => Number.isInteger(y) && Number.isFinite(n) && n > 0).sort((a,b) => a[0]-b[0]);
    const threshold = Math.max(3, counts.reduce((sum, [, n]) => sum + n, 0) * .01);
    let sum = 0;
    const onset = counts.find(([, n]) => (sum += n) >= threshold)?.[0];
    // Doubtful early dates: records cut off from the main run of use by more than three
    // empty years before the onset (e.g. a misdated 2019 "vibe coding" paper). Papers just
    // before the onset of a fast-growing term are real early uses, not date errors.
    let mainStart = counts.length ? counts[0][0] : null;
    for (let i = 1; i < counts.length; i++) if (counts[i][0] - counts[i - 1][0] > 3 && onset && counts[i][0] <= onset) mainStart = counts[i][0];
    const snapshot = Number(String(d.generated || '').slice(0,4)) || null;
    const entries = d.readingGuide?.entries || [];
    for (const q of quotes) {
      // A reviewed selection is tied to the exact saved passage and its own source.
      q.review = entries.find(e => e.id === q.id && e.text === q.text && safeUrl(e.url) === q.url && e.year === q.year && safeUrl(e.checkedUrl)) || null;
      q.warning = q.year && snapshot && q.year > snapshot ? 'futureWarning' : q.year && mainStart && q.year < mainStart && !q.review ? 'dateWarning' : '';
    }
    const featured = entries.map(e => quotes.find(q => q.review === e && !q.warning && !q.fromTitle)).filter(Boolean).slice(0,3);
    const curated = featured.length > 0;
    if (!curated) {
      const senses = d.senses || [];
      const related = new Set(senses.filter(s => s.related).map(s => s.key));
      const eligible = quotes.filter(q => q.url && q.year && !q.warning && !q.fromTitle && (!related.size || related.has(q.sense))).sort((a,b) => a.year-b.year);
      const add = q => { if (q && !featured.some(x => sourceKey(x) === sourceKey(q))) featured.push(q); };
      add(eligible[0]);
      add(eligible.find(q => q.sense && q.sense !== featured[0]?.sense && sourceKey(q) !== sourceKey(featured[0] || {})));
      add([...eligible].reverse().find(q => !featured.some(x => sourceKey(x) === sourceKey(q))));
      for (const q of eligible) { if (featured.length >= 3) break; add(q); }
      featured.sort((a,b) => a.year-b.year);
    }
    const senses = d.senses || [];
    const relatedKeys = new Set(senses.filter(s => s.related).map(s => s.key));
    const eligible = quotes.filter(q => q.url && q.year && !q.warning && !q.fromTitle && (!relatedKeys.size || relatedKeys.has(q.sense))).sort((a,b) => a.year-b.year);
    return { quotes, featured, curated, counts, snapshot, eligible };
  }

  // Three moments for the top of the page: where the term starts, when it took off, and
  // where it is now. From the model's milestones when there are any (their one-line
  // "why" is easier to read than an abstract), else from sampled passages.
  function storyCards(d, model) {
    const TL = global.IdealineTimeline;
    // The main run of use starts after stray early records (often misdated); the chart
    // and headline skip them too, so the start card never shows an earlier year.
    const first = TL && model.counts.length ? TL.mainRun(model.counts).first : null;
    // ...and nothing dated after the data was fetched (misdated; the passage list flags it).
    const inRun = y => (!first || +y >= first) && (!model.snapshot || +y <= model.snapshot);
    const out = [], used = new Set();  // papers already on a card (by link, else title)
    const paper = x => safeUrl(x.url) || String(x.title || '').toLowerCase();
    const inSet = new Map(model.quotes.map(q => [q.id, q.inSet || 0]));
    const ms = (d.milestones || []).filter(m => m && m.kind !== 'ancestor' && Number(m.year) && inRun(m.year)).sort((a, b) => a.year - b.year);
    const el = (model.eligible || []).filter(q => inRun(q.year));
    const card = (key, x) => {
      if (!x) return null;
      used.add(paper(x));
      return x.text != null && x.why == null
        ? { key, year: x.year, title: x.title || '', url: x.url, authors: x.authors || '', line: x.text, quote: true }
        : { key, year: +x.year, title: x.title || '', url: safeUrl(x.url), authors: x.authors || '', line: x.why || '', quote: false };
    };
    const free = list => list.filter(x => !used.has(paper(x)));
    const cited = list => [...list].sort((a, b) => b.n - a.n)[0]?.x;
    // Earliest: the earliest dated record, milestone or passage (a sampled passage can
    // predate the first milestone); in the model view passages of unrelated meanings are
    // already left out of `el`.
    const start = card('start', [ms[0], el[0]].filter(Boolean).sort((a, b) => +a.year - +b.year)[0]);
    // Now: the newest of the rest, picked before the key paper so "Now" is never older.
    // (Milestones and passages together: the newest milestone can be years older than the
    // newest dated passage. A milestone wins a tie, its note reads better.)
    const now = card('now', free([...el, ...ms]).sort((a, b) => +a.year - +b.year || (b.why == null) - (a.why == null)).pop());
    // Key paper: the model's pick of the paper that spread the term; without a model,
    // the one the sampled papers cite most.
    const key = card('key', ms.length && d.model
      ? free(ms).find(m => m.kind === 'popularized') || free(ms).find(m => m.kind === 'redefined')
      : ms.length ? cited(free(ms).map(m => ({ x: m, n: Math.max(0, ...(m.evidence || []).map(e => inSet.get(e.id) || 0)) })).filter(c => c.n > 0))
        : cited(free(el).map(q => ({ x: q, n: q.inSet || 0 })).filter(c => c.n > 0)));
    out.push(...[start, key, now].filter(Boolean));
    return out;
  }

  function storyCard(c, T, terms, msg) {
    const title = esc(c.title);
    return `<article class="story-card"><div class="sc-top"><span class="sc-label">${esc(T.story[c.key])}</span><span class="sc-year">${esc(c.year)}</span></div>
      ${c.line ? `<p class="sc-line">${c.quote ? `“${highlight(c.line, terms)}”` : esc(msg(c.line))}</p>` : ''}
      <p class="sc-src">${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${title}</a>` : title}${c.authors ? ` <span>· ${esc(c.authors)}</span>` : ''}</p></article>`;
  }

  const senseKey = q => (q.sense && q.sense !== 'unclear' ? q.sense : 'untagged');
  // year: '' (all), 'unknown', a single year, or a range 'from-to'.
  function inYear(q, year) {
    if (!year) return true;
    if (year === 'unknown') return !q.year;
    const [a, b = a] = String(year).split('-').map(Number);
    return !!q.year && q.year >= a && q.year <= b;
  }
  // sense 'other' means any key in `others` (meanings that only share the words).
  function filterQuotes(quotes, {year = '', sense = '', order = 'newest', others = null} = {}) {
    return quotes.filter(q => inYear(q, year) && (!sense || (sense === 'other' && others ? others.has(senseKey(q)) : senseKey(q) === sense)))
      .sort((a,b) => {
        if (a.year == null || b.year == null) return a.year == null ? (b.year == null ? 0 : 1) : -1;
        return (a.year-b.year) * (order === 'oldest' ? 1 : -1);
      });
  }

  // Year chips: the three latest years one by one, older years by decade (the newest
  // four decades; anything older in one "and earlier" chip). Few years: one chip each.
  function yearBuckets(quotes, T) {
    const ys = [...new Set(quotes.map(q => q.year).filter(Number.isFinite))].sort((a, b) => b - a);
    const n = v => quotes.filter(q => inYear(q, v)).length;
    let out = [];
    if (ys.length <= 6) out = ys.map(y => ({ v: `${y}`, label: `${y}` }));
    else {
      const recent = ys.slice(0, 3), cut = recent[2];
      out = recent.map(y => ({ v: `${y}`, label: `${y}` }));
      const decades = [...new Set(ys.filter(y => y < cut).map(y => Math.floor(y / 10) * 10))].sort((a, b) => b - a);
      const keep = decades.slice(0, 4), rest = decades.slice(4);
      for (const d of keep) {
        const hi = Math.min(d + 9, cut - 1);
        out.push({ v: `${d}-${hi}`, label: hi === d + 9 ? T.decade(d) : d === hi ? `${d}` : `${d}–${hi}` });
      }
      if (rest.length) out.push({ v: `0-${rest[0] + 9}`, label: T.andEarlier(rest[0] + 9) });
    }
    if (quotes.some(q => !q.year)) out.push({ v: 'unknown', label: T.unknownYear });
    return out.map(b => ({ ...b, n: n(b.v) })).filter(b => b.n);
  }

  // Same colours as the timeline: related meanings in order, other meanings and
  // unlabelled passages in two greys.
  const PALETTE = ['#4c6ef5', '#e8590c', '#2b8a3e', '#ae3ec9', '#c92a2a', '#1098ad', '#f59f00', '#5c7cfa'];
  function senseColors(senses) {
    const m = new Map((senses || []).filter(s => s.related).map((s, i) => [s.key, PALETTE[i % PALETTE.length]]));
    return key => (key === 'untagged' ? '#adb5bd' : m.get(key) || '#868e96');
  }

  function citationText(q, lang = 'en') {
    const T = TEXT[lang] || TEXT.en;
    const source = safeUrl(q.review?.checkedUrl) || safeUrl(q.url);
    return `${q.fromTitle ? T.titleOnly : T.source}:\n“${q.text}”\n\n${q.title || ''}\n${q.authors || T.unknownAuthor} · ${q.year || T.unknownYear}\n${source || T.noLink}${q.warning ? '\n' + T[q.warning] : ''}`;
  }

  function highlight(text, terms) {
    const parts = terms.filter(t => typeof t === 'string' && t.trim()).map(t => t.trim().split(/[\s-]+/).map(w => w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('[\\s-]+'));
    if (!parts.length) return esc(text);
    return String(text).split(new RegExp(`((?:${parts.join('|')})(?:e?s)?)`,'igu')).map((part,i) => i%2 ? `<mark>${esc(part)}</mark>` : esc(part)).join('');
  }

  function quoteCard(q, { lang = 'en', terms = [], label = '', featured = false } = {}) {
    const T = TEXT[lang] || TEXT.en, url = safeUrl(q.review?.checkedUrl) || q.url;
    const note = localized(q.review?.note, lang);
    return `<article class="source-card${featured ? ' featured-source' : ''}" id="${featured ? 'q-' : 'sample-'}${esc(q.id)}">
      <div class="source-top"><span class="source-label">${esc(localized(q.review?.label,lang) || label)}</span><span class="source-year">${esc(q.year || T.unknownYear)}</span></div>
      <p class="source-type">${esc(q.fromTitle ? T.titleOnly : T.source)}${q.review ? ` <span>· ${esc(T.checked)} ${esc(q.review.checked)}</span>` : ''}</p>
      <blockquote>${highlight(q.text, terms)}</blockquote>
      ${note ? `<p class="reading-note"><b>${esc(T.note)}</b> ${esc(note)}</p>` : ''}
      <div class="source-citation"><h4>${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(q.title || '')}</a>` : esc(q.title || '')}</h4><p>${esc(q.authors || T.unknownAuthor)} · ${esc(q.year || T.unknownYear)}</p></div>
      ${q.warning ? `<p class="source-warning">${esc(T[q.warning])}</p>` : ''}
      <div class="source-actions">${url ? `<a class="paper-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(T.open)}</a>` : `<span class="muted">${esc(T.noLink)}</span>`}<button type="button" data-copy="${esc(q.id)}">${esc(T.copy)}</button><a class="passage-link" href="#q-${esc(q.id)}" data-passage="${esc(q.id)}" aria-label="${esc(T.link)}">#</a></div>
      <div class="copy-status" role="status" aria-live="polite"></div>
    </article>`;
  }

  function quoteRow(q, { lang = 'en', terms = [], sense = '', color = '' } = {}) {
    const T = TEXT[lang] || TEXT.en, url = safeUrl(q.review?.checkedUrl) || safeUrl(q.url);
    const title = esc(q.title || '');
    return `<article class="quote-row" id="sample-${esc(q.id)}">
      <div class="qr-year">${esc(q.year || '—')}</div>
      <div class="qr-body"><blockquote>${highlight(q.text, terms)}</blockquote>
      <p class="qr-cite">${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${title}</a>` : title} <span>· ${esc(q.authors || T.unknownAuthor)}</span></p>
      <div class="qr-foot">${sense ? `<span class="qr-tag" title="${esc(T.suggestedMeaning)}">${color ? `<i style="background:${esc(color)}"></i>` : ''}${esc(sense)}</span>` : ''}${q.fromTitle ? `<span class="qr-tag plain">${esc(T.titleOnly)}</span>` : ''}${q.warning ? `<span class="qr-warn">${esc(T[q.warning])}</span>` : ''}
      <span class="qr-actions"><button type="button" data-copy="${esc(q.id)}">${esc(T.copy)}</button><a href="#q-${esc(q.id)}" data-passage="${esc(q.id)}" aria-label="${esc(T.link)}" title="${esc(T.link)}">#</a></span></div>
      <div class="copy-status" role="status" aria-live="polite"></div></div>
    </article>`;
  }

  // opts.pending: a model is still reading; opts.applyHash: false for the built-in example;
  // opts.showRoots: scroll to the roots section after a roots lookup.
  function renderReadingBrief(d, root, lang = 'en', opts = {}) {
    lang = lang === 'zh' ? 'zh' : 'en';
    const T = TEXT[lang], model = readingModel(d), host = root.querySelector('[data-part="reading"]');
    if (!host) return;
    const terms = [d.term, ...(d.aliases || [])];
    const senseMap = new Map((d.senses || []).map(s => [s.key, s.label]));
    const colorOf = senseColors(d.senses);
    const present = new Set(model.quotes.map(senseKey));
    const order = [...(d.senses || []).filter(s => s.related), ...(d.senses || []).filter(s => !s.related)].map(s => s.key);
    // Meanings this timeline follows get their own chip; meanings that only share the
    // words go together under "Other meanings".
    const related = new Set((d.senses || []).filter(s => s.related).map(s => s.key));
    const others = new Set([...present].filter(k => k !== 'untagged' && !related.has(k)));
    const senseKeys = [...order.filter(k => related.has(k) && present.has(k)), ...(others.size ? ['other'] : []), ...(present.has('untagged') ? ['untagged'] : [])];
    const buckets = yearBuckets(model.quotes, T);
    const chip = (v, label, n, color, tip) => `<button type="button" class="fchip" data-v="${esc(v)}"${tip ? ` title="${esc(tip)}"` : ''}>${color ? `<i style="background:${esc(color)}"></i>` : ''}${esc(label)}<span class="n">${n}</span></button>`;
    const story = storyCards(d, model);
    host.innerHTML = `<section class="timeline-main" aria-label="${esc(T.timelineTitle)}"><p class="headline" data-part="headline"></p>
      <div class="card"><div class="scroller"><div data-part="chart"></div></div><div class="detail" data-part="detail" aria-live="polite"></div><details class="chart-key"><summary>${esc(T.chartKey)}</summary><p class="hint">${esc(T.originalHint)}</p><div class="legend" data-part="legend"></div></details></div>
      ${story.length ? `<div class="story" aria-label="${esc(T.storyTitle)}">${story.map(c => storyCard(c, T, terms, global.IdealineI18n?.T?.[lang]?.msg || (x => x))).join('')}</div>` : ''}</section>
      <details class="more-panel"><summary>${esc(T.more)}</summary>
      ${d.summary ? `<p class="timeline-summary">${esc(d.summary)}</p>` : ''}<div class="senses" data-part="senses"></div><div class="eras" data-part="eras"></div><div class="roots" data-part="roots"></div>
      <details class="evidence-browser" id="evidence"><summary>${esc(T.browse)} <span>${model.quotes.length}</span></summary>
      <p>${esc(d.model ? T.meaningNote : opts.pending ? T.modelPending : T.noModel)}</p><div class="ev-filters">
      ${senseKeys.some(k=>k!=='untagged') ? `<div class="frow"><span class="flabel">${esc(T.meaningShort)}</span><div class="fchips" data-f="sense" role="group" aria-label="${esc(T.meaning)}">${chip('', T.all, model.quotes.length)}${senseKeys.map(k=>k === 'other' ? chip('other', T.otherMeanings, model.quotes.filter(q=>others.has(senseKey(q))).length, '#868e96', T.otherTip) : chip(k, senseMap.get(k) || T.untagged, model.quotes.filter(q=>senseKey(q)===k).length, colorOf(k))).join('')}</div></div>` : ''}
      ${buckets.length > 1 ? `<div class="frow"><span class="flabel">${esc(T.period)}</span><div class="fchips" data-f="year" role="group" aria-label="${esc(T.year)}">${chip('', T.all, model.quotes.length)}${buckets.map(b=>chip(b.v, b.label, b.n)).join('')}</div></div>` : ''}
      <div class="fbar"><p class="filter-status" role="status" aria-live="polite"></p><div class="sortseg" data-f="order" role="group" aria-label="${esc(T.sort)}"><button type="button" data-v="newest">${esc(T.newestShort)}</button><button type="button" data-v="oldest">${esc(T.oldestShort)}</button></div></div></div><div class="quote-results"></div><button type="button" class="load-more">${esc(T.morePassages)}</button></details>
      <details class="method-panel"><summary>${esc(T.method)}</summary><p class="brief-meta"><span>${esc(T.scope)}</span> <span>${esc(T.saved)} ${esc(d.generated || '—')}</span></p><p>${esc(T.methodText)}</p><p>${esc(d.model ? T.methodModel : opts.pending ? T.modelPending : T.noModel)}</p></details></details>`;
    const browser = host.querySelector('.evidence-browser'), list = host.querySelector('.quote-results'), more = host.querySelector('.load-more');
    let limit = 12;
    const state = { sense: '', year: '', order: 'newest' };
    function refresh() {
      host.querySelectorAll('[data-f]').forEach(g => g.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === state[g.dataset.f]))));
      const filtered = filterQuotes(model.quotes,{...state,others});
      list.innerHTML = filtered.slice(0,limit).map(q=>quoteRow(q,{lang,terms,sense:q.sense && senseMap.has(q.sense) ? senseMap.get(q.sense) : '',color:colorOf(senseKey(q))})).join('') || `<p class="empty-state">${esc(T.none)}</p>`;
      host.querySelector('.filter-status').textContent = T.shown(Math.min(limit,filtered.length),filtered.length);
      more.hidden = filtered.length <= limit;
    }
    host.querySelector('.ev-filters').addEventListener('click', ev => {
      const b = ev.target.closest('[data-f] button'); if (!b) return;
      state[b.closest('[data-f]').dataset.f] = b.dataset.v; limit = 12; refresh();
    });
    more.addEventListener('click',()=>{limit+=12;refresh();});
    refresh();
    function reveal(id) {
      const q = model.quotes.find(q=>q.id===id);
      if (!q) return;
      let target = null;
      {
        host.querySelector('.more-panel').open = true;
        browser.open = true;
        Object.assign(state, { sense: '', year: '', order: 'newest' });
        limit = model.quotes.length; refresh();
        target = [...list.children].find(el=>el.id===`sample-${id}`);
      }
      target?.scrollIntoView({block:'center'});
      if (target) {target.tabIndex=-1;target.focus({preventScroll:true});}
    }
    host.onclick = async ev => {
      const button = ev.target.closest('[data-copy]'), passage = ev.target.closest('[data-passage]');
      if (passage) {ev.preventDefault(); global.history.replaceState(null,'',`#q-${passage.dataset.passage}`);reveal(passage.dataset.passage);}
      if (!button) return;
      const q = model.quotes.find(q=>q.id===button.dataset.copy), status = button.closest('article').querySelector('.copy-status');
      if (!q) return;
      const text = citationText(q,lang);
      try {await global.navigator.clipboard.writeText(text);status.textContent=T.copied;}
      catch (_) {
        status.textContent=T.copyFail;
        const area=document.createElement('textarea');area.readOnly=true;area.value=text;area.setAttribute('aria-label',T.copy);
        status.appendChild(area);area.focus();area.select();
      }
    };
    // The timeline leads the page: where the term came from and how its meaning moved.
    // The source cards below are the evidence for it.
    const timeline=host.querySelector('.timeline-main');
    if (global.renderTimeline) {
      const I=global.IdealineI18n, labels=I ? Object.assign({kinds:I.KINDS[lang]},I.T[lang]) : {};
      global.renderTimeline(d,timeline,labels);
    }
    const hash=opts.applyHash === false ? '' : global.location?.hash || '';
    if (hash.startsWith('#q-')) reveal(hash.slice(3));
    if (opts.showRoots) setTimeout(() => host.querySelector('[data-part="roots"]')?.scrollIntoView({block:'start'}), 50);
  }

  function mountPage(d, lang) {
    let current = lang === 'zh' ? 'zh' : 'en';
    const render = () => {
      document.documentElement.lang=current==='zh'?'zh-CN':'en';
      document.querySelectorAll('[data-reading-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.readingLang===current)));
      const back=document.querySelector('[data-reading-back]');if(back)back.textContent=current==='zh'?'← 查找其他术语':'← Find another term';
      renderReadingBrief(d,document,current);
    };
    document.querySelectorAll('[data-reading-lang]').forEach(b=>b.addEventListener('click',()=>{current=b.dataset.readingLang;render();}));
    render();
  }
  function pageHtml(d, spec, lang = 'en') {
    lang = lang === 'zh' ? 'zh' : 'en';
    const values = {home:esc(spec.siteUrl), term:esc(d.term), en:String(lang==='en'), zh:String(lang==='zh'), back:lang==='zh'?'← 查找其他术语':'← Find another term'};
    const body=spec.pageShell.replace(/\{(\w+)\}/g,(_,key)=>values[key] || '');
    const noEnd=js=>js.replace(/<\/script/gi,'<\\/script');
    const libraries=[spec.i18nJs,spec.timelineJs,spec.readingJs].map(noEnd).join('\n');
    return `<!doctype html>\n<html lang="${lang==='zh'?'zh-CN':'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.term)} · idealine</title><style>${spec.css}</style></head><body>${body}<script type="application/json" id="data">${JSON.stringify(d).replace(/</g,'\\u003c')}</script><script>${libraries}\nIdealineReading.mountPage(JSON.parse(document.getElementById('data').textContent),${JSON.stringify(lang)});</script></body></html>`;
  }
  const api={TEXT,safeUrl,readingModel,storyCards,filterQuotes,citationText,highlight,quoteCard,quoteRow,renderReadingBrief,mountPage,pageHtml};
  global.IdealineReading=api;
  if(typeof module!=='undefined' && module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
