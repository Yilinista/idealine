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
    $('lang').setAttribute('aria-label', T.langGroup);
    $('lang').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    syncKeyline();
    if (lastCheck) showCheck(lastCheck.fn, lastCheck.cls);
    syncProvider();
    progress.relabel();
    if (lastForm) formMsg(lastForm.fn, lastForm.isError);
    if (shownKind === 'pending' || shownKind === 'failed') pending(pendingTerm, shownKind === 'failed');
    else if (shownKind === 'ready' && shown) {
      const keep = shown;
      loadReady(keep.term, lang).then(d => { if (shown === keep && d) { lastData = d; show(d, false, 'ready'); } });
      show(keep, false, 'ready');
    } else if (shown) show(shownKind === 'example' ? exampleFor(lang) : shown, false, shownKind);
    if (lastStatus) status(lastStatus.key ? lastStatus.key() : lastStatus.msg, lastStatus.isError);
  }
  $('lang').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.lang === lang) return;
    lang = b.dataset.lang;
    store.set('idealine.lang', lang);
    applyLang();
  }));

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
  providerSel.addEventListener('change', () => { store.set('idealine.provider', providerSel.value); syncProvider(true); keyChecked = false; showCheck(null); syncKeyline(); });
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
    formMsg(() => tx().forgotten);
  });
  $('oakey').value = store.get('idealine.openalexKey') || '';
  if ($('oakey').value) remember.checked = true;
  // --- "Save and check key": a free request that confirms the key, then fold the panel away ---
  let keyChecked = false, lastCheck = null;
  function showCheck(fn, cls) {
    lastCheck = fn ? { fn, cls } : null;
    const s = $('keycheck');
    s.textContent = fn ? fn() : '';
    s.className = cls || '';
  }
  function syncKeyline() {
    const id = providerSel.value, on = id !== 'none' && !!keyIn.value.trim();
    $('keyline-free').hidden = on;
    $('keyline-on').hidden = !on;
    if (on) {
      const p = P.PROVIDERS[id];
      $('keyline-text').textContent = tx().modelOn(p.short, modelIn.value.trim() || p.defaultModel) + (keyChecked ? ' ✓' : (lang === 'zh' ? `（${tx().modelOff}）` : ` (${tx().modelOff})`));
    }
  }
  keyIn.addEventListener('input', () => { keyChecked = false; showCheck(null); syncKeyline(); });
  modelIn.addEventListener('input', syncKeyline);
  $('change-key').addEventListener('click', () => { $('opts').open = true; keyIn.focus(); });
  $('save-key').addEventListener('click', async () => {
    const id = providerSel.value, key = keyIn.value.trim(), p = P.PROVIDERS[id];
    if (!p) return;
    if (!key) return showCheck(() => tx().needKey(p.short), 'error');
    if (remember.checked) store.set(KEY_PREFIX + id, key); else store.del(KEY_PREFIX + id);
    store.set('idealine.model.' + id, modelIn.value.trim() || p.defaultModel);
    const oaKey = $('oakey').value.trim();
    if (oaKey && remember.checked) store.set('idealine.openalexKey', oaKey);
    $('save-key').disabled = true;
    showCheck(() => tx().checking, '');
    try {
      await P.checkKey(id, key);
      keyChecked = true;
      showCheck(() => tx().keyOk(p.short), 'ok');
      syncKeyline();
      setTimeout(() => { if (keyChecked) { $('opts').open = false; $('term').focus(); } }, 900);
    } catch (e) {
      keyChecked = false;
      const m = e && e.message ? e.message : String(e);
      showCheck(() => I.trMessage(lang, m), 'error');
      syncKeyline();
    } finally {
      $('save-key').disabled = false;
    }
  });

  $('open-opts').addEventListener('click', () => {
    const d = $('opts');
    d.open = true;
    if (providerSel.value === 'none') providerSel.focus(); else keyIn.focus();
  });

  // --- progress: a step list with a running clock, so a slow run never looks stuck ---
  const STEPS_FREE = ['count', 'early', 'cited', 'recent'];
  const STEPS_MODEL = ['count', 'early', 'cited', 'recent', 'model', 'links'];
  const STEP_OF = [[/^Counting papers/, 'count'], [/^Reading the earliest/, 'early'], [/^Reading the most-cited/, 'cited'], [/^Reading recent/, 'recent'], [/^Looking up/, 'links']];
  const progress = (() => {
    const box = $('progress');
    let steps = [], active = -1, t0 = 0, timer = null, labelFns = {};
    const label = k => (labelFns[k] ? labelFns[k]() : tx()['step_' + k]);
    function render() {
      box.textContent = '';
      steps.forEach((k, i) => {
        const li = document.createElement('li');
        li.className = i < active ? 'done' : i === active ? 'active' : '';
        li.textContent = label(k);
        if (i === active) {
          const s = document.createElement('span');
          s.className = 'clock';
          s.textContent = tx().seconds(Math.round((Date.now() - t0) / 1000));
          li.appendChild(s);
        }
        box.appendChild(li);
      });
    }
    return {
      start(list) { steps = list; active = 0; t0 = Date.now(); labelFns = {}; box.hidden = false; clearInterval(timer); timer = setInterval(render, 1000); render(); },
      go(key, fn) { const i = steps.indexOf(key); if (fn) labelFns[key] = fn; if (i > active) { active = i; t0 = Date.now(); } render(); },
      from(msg) { for (const [re, k] of STEP_OF) if (re.test(msg)) { this.go(k); return true; } return false; },
      finish() { clearInterval(timer); timer = null; steps = []; active = -1; box.hidden = true; box.textContent = ''; },
      relabel() { if (steps.length) render(); },
    };
  })();

  // --- run --------------------------------------------------------------------
  // msg: a string (translated if known) or a function returning text in the current language.
  // Short messages next to the search box (before a run starts).
  let lastForm = null;
  function formMsg(fn, isError) {
    lastForm = fn ? { fn, isError } : null;
    const s = $('formmsg');
    s.textContent = fn ? fn() : '';
    s.classList.toggle('error', !!isError);
  }

  // Ready-made timelines shipped with the site: no OpenAlex calls, no key.
  const READY = (() => { try { return JSON.parse($('ready').textContent) || {}; } catch (e) { return {}; } })();
  async function loadReady(term, l) {
    const r = READY[term.toLowerCase()];
    if (!r) return null;
    try {
      const resp = await fetch((l === 'zh' && r.zh) || r.en);
      return resp.ok ? await resp.json() : null;
    } catch (e) { return null; }
  }
  let forceLive = false;

  // Result area while a run is going or after it failed: the term, steps and messages.
  function pending(term, failed) {
    const r = $('result');
    r.hidden = false;
    r.classList.add('pending');
    shownKind = failed ? 'failed' : 'pending';
    pendingTerm = term;
    $('r-term').textContent = term;
    $('r-tag').textContent = failed ? tx().failedTag : tx().tracingTag;
    $('r-tag').classList.toggle('pulse', !failed);
    $('r-live').hidden = true;
    renderSuggest(failed);
  }
  let pendingTerm = '';
  function renderSuggest(on) {
    const box = $('r-suggest');
    box.textContent = '';
    box.hidden = !on;
    if (!on) return;
    const seen = new Set(), terms = [];
    for (const [k, v] of Object.entries(READY)) if (!seen.has(v.en)) { seen.add(v.en); terms.push(v.term || k); }
    const p = document.createElement('p');
    p.textContent = tx().suggest;
    box.appendChild(p);
    terms.slice(0, 8).forEach(t => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = t;
      b.addEventListener('click', () => { $('term').value = t; $('aliases').value = ''; $('trace-form').requestSubmit(); });
      box.appendChild(b);
    });
  }

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
    if (term.length < 2) return formMsg(() => tx().needTerm, true);
    formMsg(null);
    const live = forceLive;
    forceLive = false;
    if (!live && !aliases.length && READY[term.toLowerCase()]) {
      busy = true;
      pending(term);
      status('');
      $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
      const d = await loadReady(term, lang);
      busy = false;
      if (d) {
        lastData = d;
        show(d, true, 'ready');
        setUrl(term, aliases);
        return;
      }
    }
    if (providerId !== 'none' && !key) { $('opts').open = true; return formMsg(() => tx().needKey(P.PROVIDERS[providerId].short), true); }
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
    let interim = null;
    pending(term);
    status('');
    progress.start(providerId === 'none' ? STEPS_FREE : STEPS_MODEL);
    $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Known steps go to the step list; anything else (retries, waits) to the status line.
    const step = m => { if (progress.from(m)) status(''); else status(m); };
    try {
      const oa = new C.OpenAlex({ apiKey: oaKey, log: step });
      const t = await C.harvest(oa, term, aliases, { onStep: step });
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
        // Show the free view right away so there is something to read while the model works.
        const pre = structuredClone(t);
        C.baseline(pre);
        interim = C.toData(pre);
        show(interim, false, 'interim'); // stay put: the step list stays in view above it
        progress.go('model', () => tx().stepModelN(p.short, t.evidence.length));
        status('');
        const prompt = C.buildPrompt(t, (SPEC.outputLang || {})[runLang]);
        const data = await P.callModel(providerId, { key, model, system: SPEC.system, prompt, schema: SPEC.schema });
        t.model = model;
        t.lang = runLang;
        progress.go('links');
        await C.applyAnalysis(t, data, oa, step);
        if (!t.milestones.length) {
          throw new C.IdealineError(I.T.en.noMilestones);
        }
      }
      lastData = C.toData(t);
      progress.finish();
      show(lastData, false, 'result');
      status(acronymHint ? () => tx().acronym : '');
      setUrl(term, aliases);
    } catch (e) {
      const known = e instanceof C.IdealineError || e instanceof P.ProviderError;
      if (known && /OpenAlex key/.test(e.message)) $('opts').open = true;
      const m = e && e.message ? e.message : String(e);
      progress.finish();
      // If the model step failed, keep the free view as the result.
      if (interim) { lastData = interim; show(interim, false, 'result'); } else pending(term, true);
      const kept = interim ? () => ' ' + tx().keptFree : () => '';
      if (e && e.local) status(() => e.local() + kept(), true);
      else if (known && m === I.T.en.noMilestones) status(() => tx().noMilestones + kept(), true);
      else if (known) status(() => I.trMessage(lang, m) + kept(), true);
      else status(() => tx().wentWrong(m) + kept(), true);
    } finally {
      busy = false;
      $('go').disabled = false;
      // Not smooth, and once more a moment later: the browser may still be applying a
      // #fragment jump from the link that opened the page.
      const toResult = () => $('result').scrollIntoView({ block: 'start' });
      toResult();
      setTimeout(toResult, 300);
    }
  });

  // kind: 'example' (ready-made), 'interim' (free view while the model reads), 'result'.
  let shownKind = 'example';
  function setUrl(term, aliases) {
    const u = new URL(location.href);
    u.searchParams.set('term', term);
    if (aliases.length) u.searchParams.set('alias', aliases.join(', ')); else u.searchParams.delete('alias');
    u.hash = '';
    history.replaceState(null, '', u);
  }

  function show(d, scroll, kind) {
    shown = d;
    shownKind = kind || 'example';
    $('result').hidden = false;
    $('result').classList.remove('pending');
    renderSuggest(false);
    const T = tx();
    $('r-tag').textContent = { example: T.exampleTag, interim: T.interimTag, result: T.resultTag, ready: T.readyTag }[shownKind];
    $('r-tag').classList.toggle('pulse', shownKind === 'interim');
    $('r-actions').hidden = shownKind !== 'result' && shownKind !== 'ready';
    $('r-live').hidden = shownKind !== 'ready';
    $('r-term').textContent = d.term;
    $('r-summary').textContent = d.summary || '';
    const years = d.counts.map(c => c[0]);
    const span = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : 'n/a';
    $('r-meta').textContent = T.meta(d.total, span, d.model, d.evidenceCount) +
      (shownKind !== 'example' && d.total < 20 ? ' ' + T.thin(d.total) : '') +
      (shownKind === 'ready' ? ' ' + T.readyNote(d.generated) : '');
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
  $('r-live').addEventListener('click', () => {
    if (busy || !shown) return;
    $('term').value = shown.term;
    forceLive = true;
    $('trace-form').requestSubmit();
  });
  $('dl-json').addEventListener('click', () => {
    if (lastData) download(slug(lastData.term) + '.json', JSON.stringify(lastData, null, 2), 'application/json');
  });

  // --- start: example timeline, then ?term= links (never auto-spend a key) ------
  applyLang();
  if (exampleFor(lang)) show(exampleFor(lang), false); else $('result').hidden = true;
  const params = new URLSearchParams(location.search);
  if (params.get('term')) {
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    $('term').value = params.get('term').slice(0, 80);
    $('aliases').value = (params.get('alias') || '').slice(0, 200);
    if ($('aliases').value) $('opts').open = true;
    // Start after load, so the browser's own jump to a #fragment cannot pull the page away.
    const go = () => setTimeout(() => {
      if (providerSel.value === 'none' || READY[$('term').value.toLowerCase()]) $('trace-form').requestSubmit();
      else formMsg(() => tx().pressTrace);
    }, 0);
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
  }
})();
