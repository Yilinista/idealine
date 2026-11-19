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
  let lastT = null, lastOa = null;  // the last live run, for the optional roots lookup
  // Ready-made example timeline, one per interface language when available.
  let examples = {};
  try { examples = JSON.parse($('example').textContent) || {}; } catch (e) { /* no example */ }
  const exampleFor = l => examples[l] || examples.en || null;
  const otherLang = () => (lang === 'zh' ? 'en' : 'zh');

  // --- language -----------------------------------------------------------------
  let lang = I.detectLang(store.get('idealine.lang'), navigator.language);
  const tx = () => I.T[lang];

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
    if (lastTester) testerMsg(lastTester.fn, lastTester.cls);
    syncProvider();
    progress.relabel();
    renderSeg();
    fillModels(providerSel.value, modelIn.value);
    syncRows();
    if (lastForm) formMsg(lastForm.fn, lastForm.isError);
    if (shownKind === 'pending' || shownKind === 'failed') pending(pendingTerm, shownKind === 'failed', lastAlternatives);
    else if (shownKind === 'ready' && shown) {
      const keep = shown;
      loadReady(keep.term, lang).then(d => { if (shown === keep && d) { lastData = d; show(d, false, 'ready'); } });
      show(keep, false, 'ready');
    } else if (shown) show(shownKind === 'example' ? exampleFor(lang) : shown, false, shownKind);
    if (lastStatus) status(lastStatus.key || lastStatus.msg, lastStatus.isError);
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
  // The visible picker is a row of buttons; the hidden <select> stays the source of truth.
  const seg = $('prov-seg');
  function renderSeg() {
    seg.textContent = '';
    for (const o of providerSel.options) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.id = o.value;
      b.textContent = o.value === 'none' ? tx().provNone : P.PROVIDERS[o.value].label.split(' (')[0];
      b.setAttribute('aria-pressed', String(o.value === providerSel.value));
      b.addEventListener('click', () => {
        if (providerSel.value === o.value) return;
        providerSel.value = o.value;
        providerSel.dispatchEvent(new Event('change'));
      });
      seg.appendChild(b);
    }
  }
  providerSel.addEventListener('change', renderSeg);
  // The model version is a choice, not a text field: the recommended default, a few
  // known alternatives, and after a key check the provider's own list.
  const fetchedModels = {};
  function fillModels(id, chosen) {
    const p = P.PROVIDERS[id];
    if (!p) return;
    const notes = p.models || {};
    const ids = [...new Set([p.defaultModel, ...Object.keys(notes), ...(chosen ? [chosen] : []), ...(fetchedModels[id] || [])])];
    modelIn.textContent = '';
    for (const m of ids) {
      const o = document.createElement('option');
      o.value = m;
      o.textContent = m === p.defaultModel ? `${m} · ${tx().recommended}` : notes[m] ? `${m} · ${tx()['tier_' + notes[m]]}` : m;
      modelIn.appendChild(o);
    }
    modelIn.value = chosen && ids.includes(chosen) ? chosen : p.defaultModel;
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
    fillModels(id, store.get('idealine.model.' + id) || p.defaultModel);
    keyIn.placeholder = p.keyHint;
    const saved = store.get(KEY_PREFIX + id);
    keyIn.value = saved || '';
    remember.checked = !!saved || !!store.get('idealine.openalexKey');
  }
  providerSel.value = store.get('idealine.provider') || 'none';
  if (!P.PROVIDERS[providerSel.value] && providerSel.value !== 'none') providerSel.value = 'none';
  providerSel.addEventListener('change', () => { store.set('idealine.provider', providerSel.value); syncProvider(true); keyChecked = false; dropTester(); showCheck(null); syncKeyline(); });
  syncProvider(true);
  renderSeg();
  // The OpenAlex key needs no check, so save it as soon as "remember" is on (ready-made
  // pages never run a live search, which used to be the only place it was saved).
  function saveOaKey() {
    const v = $('oakey').value.trim();
    if (remember.checked && v) store.set('idealine.openalexKey', v);
    else if (!v) store.del('idealine.openalexKey');
  }
  remember.addEventListener('change', () => {
    if (!remember.checked) { store.del(KEY_PREFIX + providerSel.value); store.del('idealine.openalexKey'); }
    else saveOaKey();
  });
  $('oakey').addEventListener('input', saveOaKey);
  $('forget').addEventListener('click', () => {
    Object.keys(P.PROVIDERS).forEach(id => store.del(KEY_PREFIX + id));
    store.del('idealine.openalexKey');
    keyIn.value = '';
    $('oakey').value = '';
    remember.checked = false;
    keyChecked = false; dropTester(); showCheck(null); syncKeyline();
    formMsg(() => tx().forgotten);
  });
  $('oakey').value = store.get('idealine.openalexKey') || '';
  if ($('oakey').value) remember.checked = true;
  // --- "Save and check key": a free request that confirms the key, then fold the panel away ---
  let keyChecked = false, lastCheck = null, testerKey = false; // testerKey: the key came from a test code
  function showCheck(fn, cls) {
    lastCheck = fn ? { fn, cls } : null;
    const s = $('keycheck');
    s.textContent = fn ? fn() : '';
    s.className = cls || '';
  }
  function syncKeyline() {
    syncRows();
    const id = providerSel.value, on = id !== 'none' && !!keyIn.value.trim();
    $('keyline-free').hidden = on;
    $('keyline-on').hidden = !on;
    if (on) {
      const p = P.PROVIDERS[id];
      $('keyline-text').textContent = tx().modelOn(p.short, modelIn.value.trim() || p.defaultModel) + (keyChecked ? ' ✓' : (lang === 'zh' ? `（${tx().modelOff}）` : ` (${tx().modelOff})`));
    }
  }
  // Settings list: each row shows its current value; one row open at a time.
  function syncRows() {
    const T = tx(), id = providerSel.value, short = s => (s.length > 28 ? s.slice(0, 27) + '…' : s);
    const set = (k, text, cls) => { const e = $('sv-' + k); if (e) { e.textContent = text; e.className = 'sv' + (cls ? ' ' + cls : ''); } };
    set('provider', id === 'none' ? T.provNone : P.PROVIDERS[id].label.split(' (')[0]);
    set('key', !keyIn.value.trim() ? T.svNone : keyChecked ? T.svKeyOk : T.svKeySet, keyChecked ? 'ok' : '');
    set('model', (modelIn.selectedOptions[0] || {}).textContent || '');
    set('aliases', $('aliases').value.trim() ? short($('aliases').value.trim()) : T.svNone);
    set('meaning', $('meaning').value.trim() ? short($('meaning').value.trim()) : T.svNone);
    set('oakey', $('oakey').value.trim() ? T.svSet : T.svOaHow, $('oakey').value.trim() ? '' : 'link');
    set('tester', testerKey ? T.svTesterOn : T.svNone, testerKey ? 'ok' : '');
  }
  function openRow(id) {
    $('opts').open = true;
    $(id).open = true;
  }
  document.querySelectorAll('.srow').forEach(r => r.addEventListener('toggle', () => {
    if (r.open) document.querySelectorAll('.srow[open]').forEach(o => { if (o !== r) o.open = false; });
  }));
  ['aliases', 'meaning', 'oakey'].forEach(k => $(k).addEventListener('input', syncRows));
  keyIn.addEventListener('input', () => { keyChecked = false; dropTester(); showCheck(null); syncKeyline(); });
  modelIn.addEventListener('change', () => { const p = P.PROVIDERS[providerSel.value]; if (p) store.set('idealine.model.' + providerSel.value, modelIn.value); syncKeyline(); });
  $('r-addkey').addEventListener('click', () => {
    openRow(providerSel.value === 'none' ? 'row-provider' : 'row-key');
    $('opts').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  // The search box (and its test-code link) is off screen once a result shows, on phones.
  $('r-tester').addEventListener('click', () => {
    openRow('row-tester');
    $('opts').scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('tester-code').focus({ preventScroll: true });
  });
  $('change-key').addEventListener('click', () => { openRow('row-key'); keyIn.focus(); });
  // "Check": a free request that confirms the key, then folds the panel away. Returns
  // null on success or a function giving the error text. Checks run one at a time.
  let checking = Promise.resolve();
  function checkCurrentKey() {
    const run = checking.then(checkOnce, checkOnce);
    checking = run.catch(() => {});
    return run;
  }
  $('save-key').addEventListener('click', () => { checkCurrentKey(); });
  async function checkOnce() {
    const id = providerSel.value, key = keyIn.value.trim(), p = P.PROVIDERS[id];
    if (!p) return () => tx().needKey('');
    if (!key) { const f = () => tx().needKey(p.short); showCheck(f, 'error'); return f; }
    if (!testerKey) { if (remember.checked) store.set(KEY_PREFIX + id, key); else store.del(KEY_PREFIX + id); }
    store.set('idealine.model.' + id, modelIn.value.trim() || p.defaultModel);
    const oaKey = $('oakey').value.trim();
    if (oaKey && remember.checked) store.set('idealine.openalexKey', oaKey);
    $('save-key').disabled = true;
    showCheck(() => tx().checking, '');
    try {
      await P.checkKey(id, key);
      keyChecked = true;
      P.listModels(id, key).then(list => { if (list.length && providerSel.value === id) { fetchedModels[id] = list; fillModels(id, modelIn.value); } });
      showCheck(() => tx().keyOk(p.short), 'ok');
      syncKeyline();
      setTimeout(() => { if (keyChecked) { $('opts').open = false; $('term').focus(); } }, 900);
      return null;
    } catch (e) {
      keyChecked = false;
      const m = e && e.message ? e.message : String(e), f = () => I.trMessage(lang, m);
      showCheck(f, 'error');
      syncKeyline();
      return f;
    } finally {
      $('save-key').disabled = false;
    }
  }

  // --- shared test key: an invited tester types a code (see scripts/seal_key.py) ---
  const sealed = (() => { try { return JSON.parse(($('tester-key') || {}).textContent || 'null'); } catch (_) { return null; } })();
  if (sealed && P.PROVIDERS[sealed.provider]) { $('row-tester').hidden = false; $('tester-link').hidden = false; $('r-tester').hidden = false; }
  const testerMsg = (fn, cls) => { lastTester = fn ? { fn, cls } : null; $('tester-msg').textContent = fn ? fn() : ''; $('tester-msg').className = cls || ''; };
  let lastTester = null;
  // The key field no longer holds the shared key: forget it, and the message (unless kept to explain a failure).
  function dropTester(keepMsg) {
    if (!testerKey && !lastTester) return;
    testerKey = false;
    if (!keepMsg) testerMsg(null);
    syncRows();
  }
  async function unlockTester() {
    const code = $('tester-code').value;
    if (!code.trim() || !sealed) return;
    $('tester-unlock').disabled = true;
    try {
      const key = await P.unsealKey(sealed, code);
      // Switch provider for this visit only: a later visit without the code starts as before.
      const savedProvider = store.get('idealine.provider');
      providerSel.value = sealed.provider;
      providerSel.dispatchEvent(new Event('change'));
      if (savedProvider == null) store.del('idealine.provider'); else store.set('idealine.provider', savedProvider);
      keyIn.value = key;
      testerKey = true;
      $('tester-code').value = '';
      syncRows();
      testerMsg(() => tx().checking, '');
      const err = await checkCurrentKey(); // the usual free check; the shared key is never stored
      if (!testerKey) return;
      if (err) { testerMsg(err, 'error'); dropTester(true); } else testerMsg(() => tx().testerOk(P.PROVIDERS[sealed.provider].short), 'ok');
    } catch (e) {
      testerMsg(() => tx().testerBad, 'error');
    } finally {
      $('tester-unlock').disabled = false;
    }
  }
  $('tester-unlock').addEventListener('click', unlockTester);
  $('tester-code').addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); unlockTester(); } });
  $('open-tester').addEventListener('click', () => { openRow('row-tester'); $('tester-code').focus(); });

  $('open-opts').addEventListener('click', () => {
    if (providerSel.value === 'none') { openRow('row-provider'); ($('prov-seg').querySelector('[aria-pressed=true]') || $('prov-seg')).focus(); } else { openRow('row-key'); keyIn.focus(); }
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
      const d = resp.ok ? await resp.json() : null;
      if (d && !(d.totals || []).length) {
        const T = await loadTotals(), y0 = d.counts.length ? d.counts[0][0] : 0, y1 = d.counts.length ? d.counts[d.counts.length - 1][0] : -1;
        d.totals = T.totals.filter(([y]) => y >= y0 && y <= y1);
        d.totalsAsOf = T.fetched;
      }
      return d;
    } catch (e) { return null; }
  }
  let forceLive = false;
  // All OpenAlex works per year (shipped with the site), for the "share of all papers" view.
  let totalsP = null;
  let kindChecks = null;
  fetch('assets/kind-checks.json').then(r => (r.ok ? r.json() : null)).then(j => {
    kindChecks = j && j.kinds;
    // The example may already be on screen; draw it again with the counts.
    if (kindChecks && shown && !busy && shownKind !== 'interim') show(shown, false, shownKind);
  }).catch(() => {});
  const loadTotals = () => (totalsP ||= fetch('assets/oa-totals.json').then(r => (r.ok ? r.json() : {}))
    .then(j => ({ totals: j.totals || [], fetched: j.fetched || '' })).catch(() => ({ totals: [], fetched: '' })));

  // Result area while a run is going or after it failed: the term, steps and messages.
  function pending(term, failed, alternatives) {
    const r = $('result');
    r.hidden = false;
    r.classList.add('pending');
    shownKind = failed ? 'failed' : 'pending';
    pendingTerm = term;
    lastAlternatives = failed ? alternatives || null : null;
    $('r-term').textContent = term;
    $('r-tag').textContent = failed ? tx().failedTag : tx().tracingTag;
    $('r-tag').classList.toggle('pulse', !failed);
    $('r-live').hidden = true;
    renderSuggest(failed, alternatives);
  }
  let pendingTerm = '', lastAlternatives = null;
  const fallbacks = new WeakSet(); // free views kept after a failed model step
  function chip(label, term) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = label;
    b.addEventListener('click', () => { $('term').value = term; $('aliases').value = ''; $('meaning').value = ''; syncRows(); $('trace-form').requestSubmit(); });
    return b;
  }
  function renderSuggest(on, alternatives) {
    const box = $('r-suggest');
    box.textContent = '';
    box.hidden = !on;
    if (!on) return;
    if (alternatives && alternatives.length) {
      const p = document.createElement('p');
      p.textContent = tx().altIntro;
      box.appendChild(p);
      const row = document.createElement('div');
      row.className = 'alt-row';
      alternatives.forEach(a => row.appendChild(chip(`${a.phrase} · ${tx().altCount(a.count)}`, a.phrase)));
      box.appendChild(row);
    }
    const seen = new Set(), terms = [];
    for (const [k, v] of Object.entries(READY)) if (!seen.has(v.en)) { seen.add(v.en); terms.push(v.term || k); }
    const p = document.createElement('p');
    p.textContent = tx().suggest;
    box.appendChild(p);
    terms.slice(0, 8).forEach(t => box.appendChild(chip(t, t)));
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
    if (busy) return;
    $('term').value = c.textContent;
    $('aliases').value = '';
    $('meaning').value = '';
    syncRows();
    $('trace-form').requestSubmit();
  }));

  $('trace-form').addEventListener('submit', async ev => {
    ev.preventDefault();
    if (busy) return;
    const term = $('term').value.replace(/\s+/g, ' ').trim();
    const aliases = parseAliases($('aliases').value).filter(a => a.toLowerCase() !== term.toLowerCase());
    const providerId0 = providerSel.value;
    // The meaning hint only reaches a model; without one it changes nothing.
    const meaning = providerId0 === 'none' ? '' : $('meaning').value.replace(/\s+/g, ' ').trim().slice(0, 200);
    const providerId = providerSel.value, key = keyIn.value.trim(), model = modelIn.value.trim();
    if (term.length < 2) return formMsg(() => tx().needTerm, true);
    formMsg(null);
    // A passage or milestone link applies only to the first run from a shared link.
    const keep = keepHash;
    keepHash = false;
    if (!keep && /^#[mq]-/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
    const live = forceLive;
    forceLive = false;
    // ?since= (the "only papers from Y on" / "show all years" links) stays with the term
    // it came with, for every run of that term; 0 means all years, with no name check.
    if (urlSince && urlSince.term !== term.toLowerCase()) urlSince = null;
    const since = urlSince ? urlSince.year : null;
    if (!live && since == null && !aliases.length && !meaning && READY[term.toLowerCase()]) {
      busy = true;
      pending(term);
      status('');
      $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
      const d = await loadReady(term, lang);
      busy = false;
      if (d) {
        lastData = d;
        show(d, true, 'ready');
        setUrl(term, aliases, meaning);
        return;
      }
    }
    if (providerId !== 'none' && !key) { openRow('row-key'); return formMsg(() => tx().needKey(P.PROVIDERS[providerId].short), true); }
    if (providerId !== 'none') {
      if (!testerKey) { if (remember.checked) store.set(KEY_PREFIX + providerId, key); else store.del(KEY_PREFIX + providerId); }
      store.set('idealine.model.' + providerId, model);
    }
    const oaKey = $('oakey').value.trim();
    if (oaKey && remember.checked) store.set('idealine.openalexKey', oaKey);
    else if (!oaKey || providerId !== 'none') store.del('idealine.openalexKey');

    busy = true;
    $('go').disabled = true;
    lastT = null;
    lastOa = null;
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
      // Does the term name an organization or software? Then records from before it
      // existed are left out. Best effort: null when Wikidata is slow or unsure.
      const entity = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(term) ? null : await C.lookupEntity(term);
      const t = await C.harvest(oa, term, aliases, { onStep: step, entity, since: since ?? undefined });
      t.meaning = meaning;
      const T = await loadTotals();
      t.totals = T.totals;
      t.totalsAsOf = T.fetched;
      if (!t.counts.length && t.hiddenBefore) {
        const h = t.hiddenBefore, err = new C.IdealineError(I.T.en.noPapersSince(term, h.year, h.n));
        err.local = () => tx().noPapersSince(term, h.year, h.n);
        throw err;
      }
      if (!t.counts.length || !t.evidence.length) {
        // OpenAlex is mostly English: a Chinese/Japanese/Korean term usually finds nothing.
        const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(term);
        const err = new C.IdealineError(I.T.en[cjk ? 'noPapersCjk' : 'noPapers'](term));
        err.local = () => tx()[cjk ? 'noPapersCjk' : 'noPapers'](term);
        // Offer shorter forms that papers do use, with their counts (a few small requests).
        if (!cjk && !aliases.length) err.alternatives = await C.suggestPhrases(oa, term);
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
        // A streamed answer (Anthropic) reports how far it has got; relabel only on change.
        let seen = '';
        const onText = text => {
          const g = C.answerProgress(text);
          const sig = g ? g.stage + g.n : '';
          if (!g || sig === seen) return;
          seen = sig;
          progress.go('model', () => tx().stepModelLive(p.short, g.stage, g.n, t.evidence.length));
        };
        const data = await P.callModel(providerId, { key, model, system: SPEC.system, prompt, schema: SPEC.schema, onText });
        t.model = model;
        t.lang = runLang;
        progress.go('links');
        await C.applyAnalysis(t, data, oa, step);
        if (!t.milestones.length) {
          throw new C.IdealineError(I.T.en.noMilestones);
        }
      }
      lastT = t; lastOa = oa;
      lastData = C.toData(t);
      progress.finish();
      show(lastData, false, 'result');
      status(acronymHint ? () => tx().acronym : '');
      setUrl(term, aliases, meaning, since);
    } catch (e) {
      const known = e instanceof C.IdealineError || e instanceof P.ProviderError;
      if (known && /OpenAlex key/.test(e.message)) openRow('row-oakey');
      const m = e && e.message ? e.message : String(e);
      progress.finish();
      // If the model step failed, keep the free view as the result.
      if (interim) { lastData = interim; fallbacks.add(interim); show(interim, false, 'result'); } else pending(term, true, e && e.alternatives);
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
      // With a #m- milestone link, scroll to that milestone's detail instead.
      const toResult = () => {
        const det = /^#m-/.test(location.hash) && $('result').querySelector('[data-part="detail"]');
        if (/^#q-/.test(location.hash)) return;
        (det || $('result')).scrollIntoView({ block: det ? 'center' : 'start' });
      };
      toResult();
      setTimeout(toResult, 300);
    }
  });

  // kind: 'example' (ready-made), 'interim' (free view while the model reads), 'result'.
  let shownKind = 'example';
  let keepHash = false;  // preserve the first shared passage or milestone link
  let urlSince = null;  // { term, year } from a ?since= link, used by the next run of that term
  function setUrl(term, aliases, meaning, since) {
    const u = new URL(location.href);
    u.searchParams.set('term', term);
    if (since != null) u.searchParams.set('since', since === 0 ? 'all' : String(since)); else u.searchParams.delete('since');
    if (meaning) u.searchParams.set('meaning', meaning); else u.searchParams.delete('meaning');
    if (aliases.length) u.searchParams.set('alias', aliases.join(', ')); else u.searchParams.delete('alias');
    history.replaceState(null, '', u);
  }

  function show(d, scroll, kind, opts) {
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
    // Only for a free run; a model run that failed and fell back already has a key.
    $('r-upsell').hidden = !(shownKind === 'result' && !d.model && !(d.eras || []).length && !fallbacks.has(d));
    // Roots cost extra OpenAlex requests, so they run only when asked.
    const canRoots = shownKind === 'result' && lastT && d === lastData && !d.roots;
    const nReq = canRoots ? Math.ceil(C.rootsPlan(C.inFocus(lastT)).ids.length / 100) : 0;
    $('r-roots').hidden = !nReq;
    if (nReq) $('r-roots').textContent = tx().rootsBtn(nReq);
    $('r-term').textContent = d.term;
    window.IdealineReading.renderReadingBrief(kindChecks && !d.kindChecks ? { ...d, kindChecks } : d, $('result'), lang,
      { pending: shownKind === 'interim', applyHash: shownKind !== 'example', showRoots: !!(opts && opts.showRoots) });
    if (scroll && !/^#[mq]-/.test(location.hash)) $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // --- downloads: a standalone page (same as the CLI's) and the JSON -----------
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
    if (lastData) download(slug(lastData.term) + '.html', window.IdealineReading.pageHtml(lastData, SPEC, lang), 'text/html');
  });
  $('r-roots').addEventListener('click', async () => {
    if (busy || !lastT || !lastOa) return;
    busy = true;
    $('r-roots').disabled = true;
    $('go').disabled = true;
    try {
      lastT.roots = await C.findRoots(lastOa, lastT, m => status(m));
      lastData = C.toData(lastT);
      status('');
      show(lastData, false, 'result', { showRoots: true });
    } catch (e) {
      status(() => tx().wentWrong(I.trMessage(lang, e.message)), true);
    } finally {
      busy = false;
      $('r-roots').disabled = false;
      $('go').disabled = false;
    }
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
    // Keep a milestone deep link (#m-2025-coined); drop other fragments.
    if (location.hash && !/^#[mq]-/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
    keepHash = /^#[mq]-/.test(location.hash);
    $('term').value = params.get('term').slice(0, 80);
    $('aliases').value = (params.get('alias') || '').slice(0, 200);
    $('meaning').value = (params.get('meaning') || '').slice(0, 200);
    const sinceP = params.get('since'), sinceY = sinceP === 'all' ? 0 : Number(sinceP);
    if (sinceP && Number.isInteger(sinceY) && (sinceY === 0 || (sinceY >= 1000 && sinceY <= 2100))) urlSince = { term: $('term').value.replace(/\s+/g, ' ').trim().toLowerCase(), year: sinceY };
    if ($('aliases').value || $('meaning').value) { $('opts').open = true; syncRows(); }
    // Start after load, so the browser's own jump to a #fragment cannot pull the page away.
    const go = () => setTimeout(() => {
      // Never start a paid model run by itself: a ?since= link always needs a live run.
      if (providerSel.value === 'none' || (READY[$('term').value.toLowerCase()] && !$('meaning').value && !urlSince)) $('trace-form').requestSubmit();
      else formMsg(() => tx().pressTrace);
    }, 0);
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
  }
})();
