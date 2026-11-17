// idealine web app: trace any term in the browser with the visitor's own key.
// The key stays in this tab (or in localStorage if the visitor ticks "remember")
// and is sent only to the provider they picked. This site has no server.
(function () {
  'use strict';
  const C = window.IdealineCore, P = window.IdealineProviders, I = window.IdealineI18n;
  const $ = id => document.getElementById(id);
  const SPEC = JSON.parse($('spec').textContent);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked: key stays in memory */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };
  const KEY_PREFIX = 'idealine.key.';
  let lastData = null, shown = null, busy = false, lastStatus = null;
  // Ready-made example timeline, one per interface language when available.
  let examples = {};
  try { examples = JSON.parse($('example').textContent) || {}; } catch (e) { /* no example */ }
  const exampleFor = l => examples[l] || examples.en || null;
  const otherLang = () => (lang === 'zh' ? 'en' : 'zh');

  // --- language -----------------------------------------------------------------
  let lang = I.detectLang(store.get('idealine.lang'), navigator.language);
  const tx = () => I.T[lang];
  const labels = () => Object.assign({ kinds: I.KINDS[lang] }, tx());

  function applyLang() {
    const T = tx();
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(e => { const v = T[e.dataset.i18n]; if (typeof v === 'string') e.textContent = v; });
    document.querySelectorAll('[data-i18n-ph]').forEach(e => { e.placeholder = T[e.dataset.i18nPh]; });
    document.querySelectorAll('[data-i18n-aria]').forEach(e => { e.setAttribute('aria-label', T[e.dataset.i18nAria]); });
    document.querySelectorAll('.cardmeta').forEach(e => { e.textContent = T.cardMeta(Number(e.dataset.total), Number(e.dataset.n)); });
    document.querySelectorAll('.tcard').forEach(c => { c.href = (lang === 'zh' && c.dataset.hrefZh) || c.dataset.hrefEn; });
    const lb = $('lang');
    lb.textContent = T.langToggle;
    lb.title = T.langToggleTitle;
    $('r-tag').textContent = lastData ? T.resultTag : T.exampleTag;
    syncProvider();
    if (shown) show(shown === exampleFor(otherLang()) ? exampleFor(lang) : shown, false);
    if (lastStatus) status(lastStatus.key ? lastStatus.key() : lastStatus.msg, lastStatus.isError);
  }
  $('lang').addEventListener('click', () => {
    lang = lang === 'zh' ? 'en' : 'zh';
    store.set('idealine.lang', lang);
    applyLang();
  });

  // --- provider picker ----------------------------------------------------------
  const providerSel = $('provider'), modelIn = $('model'), keyIn = $('key'), remember = $('remember');
  for (const [id, p] of Object.entries(P.PROVIDERS)) {
    const o = document.createElement('option');
    o.value = id;
    o.textContent = p.label;
    providerSel.appendChild(o);
  }
  function syncProvider(loadSaved) {
    const id = providerSel.value, p = P.PROVIDERS[id], T = tx();
    const needsKey = id !== 'none';
    $('keyrow').hidden = !needsKey;
    if (!needsKey) {
      $('privacy').textContent = T.privacyFree;
      return;
    }
    $('keylink').href = p.keyUrl;
    $('keylink').textContent = T.getKey(p.short);
    $('privacy').textContent = T.privacyKey(p.host, p.short);
    if (!loadSaved) return;
    modelIn.value = store.get('idealine.model.' + id) || p.defaultModel;
    keyIn.placeholder = p.keyHint;
    const saved = store.get(KEY_PREFIX + id);
    keyIn.value = saved || '';
    remember.checked = !!saved || !!store.get('idealine.openalexKey');
  }
  providerSel.value = store.get('idealine.provider') || 'none';
  if (!P.PROVIDERS[providerSel.value] && providerSel.value !== 'none') providerSel.value = 'none';
  providerSel.addEventListener('change', () => { store.set('idealine.provider', providerSel.value); syncProvider(true); });
  syncProvider(true);
  remember.addEventListener('change', () => {
    if (!remember.checked) { store.del(KEY_PREFIX + providerSel.value); store.del('idealine.openalexKey'); }
  });
  $('forget').addEventListener('click', () => {
    Object.keys(P.PROVIDERS).forEach(id => store.del(KEY_PREFIX + id));
    store.del('idealine.openalexKey');
    keyIn.value = '';
    $('oakey').value = '';
    remember.checked = false;
    status(() => tx().forgotten);
  });
  $('oakey').value = store.get('idealine.openalexKey') || '';
  if ($('oakey').value) remember.checked = true;
  $('open-opts').addEventListener('click', () => {
    const d = $('opts');
    d.open = true;
    if (providerSel.value === 'none') providerSel.focus(); else keyIn.focus();
  });

  // --- run --------------------------------------------------------------------
  // msg: a string (translated if known) or a function returning text in the current language.
  function status(msg, isError) {
    lastStatus = msg ? (typeof msg === 'function' ? { key: msg, isError } : { msg, isError }) : null;
    const s = $('status');
    const text = typeof msg === 'function' ? msg() : I.trMessage(lang, msg || '');
    s.textContent = text || '';
    s.classList.toggle('error', !!isError);
  }

  function parseAliases(s) {
    const out = [];
    for (const part of s.split(',')) {
      const a = part.replace(/\s+/g, ' ').trim();
      if (a && !out.some(x => x.toLowerCase() === a.toLowerCase())) out.push(a);
    }
    return out.slice(0, 5);
  }

  document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
    $('term').value = c.textContent;
    $('aliases').value = '';
    $('trace-form').requestSubmit();
  }));

  $('trace-form').addEventListener('submit', async ev => {
    ev.preventDefault();
    if (busy) return;
    const term = $('term').value.replace(/\s+/g, ' ').trim();
    const aliases = parseAliases($('aliases').value).filter(a => a.toLowerCase() !== term.toLowerCase());
    const providerId = providerSel.value, key = keyIn.value.trim(), model = modelIn.value.trim();
    if (term.length < 2) return status(() => tx().needTerm, true);
    if (providerId !== 'none' && !key) { $('opts').open = true; return status(() => tx().needKey(P.PROVIDERS[providerId].short), true); }
    if (providerId !== 'none') {
      if (remember.checked) store.set(KEY_PREFIX + providerId, key); else store.del(KEY_PREFIX + providerId);
      store.set('idealine.model.' + providerId, model);
    }
    const oaKey = $('oakey').value.trim();
    if (oaKey && remember.checked) store.set('idealine.openalexKey', oaKey);
    else if (!oaKey || providerId !== 'none') store.del('idealine.openalexKey');

    busy = true;
    $('go').disabled = true;
    const acronymHint = /^[A-Z0-9]{2,5}$/.test(term) && !aliases.length;
    const runLang = lang;
    try {
      const oa = new C.OpenAlex({ apiKey: oaKey, log: m => status(m) });
      const t = await C.harvest(oa, term, aliases, { onStep: status });
      if (!t.counts.length || !t.evidence.length) {
        // OpenAlex is mostly English: a Chinese/Japanese/Korean term usually finds nothing.
        const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(term);
        const err = new C.IdealineError(I.T.en[cjk ? 'noPapersCjk' : 'noPapers'](term));
        err.local = () => tx()[cjk ? 'noPapersCjk' : 'noPapers'](term);
        throw err;
      }
      if (providerId === 'none') {
        C.baseline(t);
      } else {
        const p = P.PROVIDERS[providerId];
        status(() => tx().asking(p.short, model, t.evidence.length));
        const prompt = C.buildPrompt(t, (SPEC.outputLang || {})[runLang]);
        const data = await P.callModel(providerId, { key, model, system: SPEC.system, prompt, schema: SPEC.schema });
        t.model = model;
        t.lang = runLang;
        await C.applyAnalysis(t, data, oa, status);
        if (!t.milestones.length) {
          throw new C.IdealineError(I.T.en.noMilestones);
        }
      }
      lastData = C.toData(t);
      show(lastData, true);
      status(acronymHint ? () => tx().acronym : '');
      const u = new URL(location.href);
      u.searchParams.set('term', term);
      if (aliases.length) u.searchParams.set('alias', aliases.join(', ')); else u.searchParams.delete('alias');
      history.replaceState(null, '', u);
    } catch (e) {
      const known = e instanceof C.IdealineError || e instanceof P.ProviderError;
      if (known && /OpenAlex key/.test(e.message)) $('opts').open = true;
      const m = e && e.message ? e.message : String(e);
      if (e && e.local) status(e.local, true);
      else if (known && m === I.T.en.noMilestones) status(() => tx().noMilestones, true);
      else status(known ? m : (() => tx().wentWrong(m)), true);
    } finally {
      busy = false;
      $('go').disabled = false;
    }
  });

  function show(d, scroll) {
    shown = d;
    $('result').hidden = false;
    const T = tx();
    const isExample = !lastData || d !== lastData;
    $('r-tag').textContent = isExample ? T.exampleTag : T.resultTag;
    $('r-actions').hidden = isExample;
    $('r-term').textContent = d.term;
    $('r-summary').textContent = d.summary || '';
    const years = d.counts.map(c => c[0]);
    const span = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : 'n/a';
    $('r-meta').textContent = T.meta(d.total, span, d.model, d.evidenceCount);
    window.renderTimeline(d, $('result'), labels());
    if (scroll) $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // --- downloads: a standalone page (same as the CLI's) and the JSON -----------
  const escHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function slug(s) { return (s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50).replace(/-+$/, '')) || 'timeline'; }
  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  $('dl-html').addEventListener('click', () => {
    if (!lastData) return;
    const d = lastData, e = escHtml;
    const years = d.counts.map(c => c[0]);
    const span = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : 'n/a';
    const pl = d.lang === 'zh' ? 'zh' : 'en', PT = SPEC.pageText[pl];
    const fill = (tpl, vals) => tpl.replace(/\{(\w+)\}/g, (_, k) => (k in vals ? vals[k] : ''));
    const how = d.model ? fill(PT.how_model, { model: e(d.model), n: d.evidenceCount }) : PT.how_none;
    const data = JSON.stringify(d).replace(/</g, '\\u003c');
    const noEnd = js => js.replace(/<\/script/gi, '<\\/script');
    const lib = pl === 'zh' ? noEnd(SPEC.i18nJs) + '\n' + noEnd(SPEC.timelineJs) : noEnd(SPEC.timelineJs);
    const call = pl === 'zh'
      ? "renderTimeline(JSON.parse(document.getElementById('data').textContent), document, Object.assign({kinds: IdealineI18n.KINDS.zh}, IdealineI18n.T.zh));"
      : "renderTimeline(JSON.parse(document.getElementById('data').textContent));";
    const page = `<!doctype html>
<html lang="${pl === 'zh' ? 'zh-CN' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(d.term)} · idealine</title>
<style>${SPEC.css}</style></head>
<body><main>
<div class="brand"><a href="${e(SPEC.siteUrl)}">idealine</a> · ${PT.tagline}</div>
<h1>${e(d.term)}</h1>
<p class="summary">${e(d.summary)}</p>
<p class="meta">${fill(PT.meta, { total: d.total.toLocaleString('en-US'), span })}${how}</p>
<div class="card">
  <div class="hint">${PT.hint}</div>
  <div class="scroller"><div data-part="chart"></div></div>
  <div class="legend" data-part="legend"></div>
  <div class="detail" data-part="detail" aria-live="polite"></div>
</div>
<div class="eras" data-part="eras"></div>
<details><summary>${PT.details}</summary>
<p>${fill(PT.details_body, { generated: e(d.generated) })}</p>
</details>
<footer>${fill(PT.footer, { repo: e(SPEC.siteUrl), site: e(SPEC.siteUrl) })}</footer>
</main>
<script type="application/json" id="data">${data}</script>
<script>${lib}
${call}</script>
</body></html>
`;
    download(slug(d.term) + '.html', page, 'text/html');
  });
  $('dl-json').addEventListener('click', () => {
    if (lastData) download(slug(lastData.term) + '.json', JSON.stringify(lastData, null, 2), 'application/json');
  });

  // --- start: example timeline, then ?term= links (never auto-spend a key) ------
  applyLang();
  if (exampleFor(lang)) show(exampleFor(lang), false); else $('result').hidden = true;
  const params = new URLSearchParams(location.search);
  if (params.get('term')) {
    $('term').value = params.get('term').slice(0, 80);
    $('aliases').value = (params.get('alias') || '').slice(0, 200);
    if ($('aliases').value) $('opts').open = true;
    if (providerSel.value === 'none') $('trace-form').requestSubmit();
    else status(() => tx().pressTrace);
  }
})();
