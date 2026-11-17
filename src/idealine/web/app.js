// idealine web app: trace any term in the browser with the visitor's own key.
// The key stays in this tab (or in localStorage if the visitor ticks "remember")
// and is sent only to the provider they picked. This site has no server.
(function () {
  'use strict';
  const C = window.IdealineCore, P = window.IdealineProviders;
  const $ = id => document.getElementById(id);
  const SPEC = JSON.parse($('spec').textContent);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked: key stays in memory */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };
  const KEY_PREFIX = 'idealine.key.';
  let lastData = null, busy = false;

  // --- gallery filter ---------------------------------------------------------
  const filter = $('filter');
  if (filter) {
    filter.addEventListener('input', () => {
      const q = filter.value.toLowerCase().trim();
      document.querySelectorAll('.tcard').forEach(c => { c.style.display = !q || c.dataset.q.includes(q) ? '' : 'none'; });
    });
  }

  // --- provider picker ----------------------------------------------------------
  const providerSel = $('provider'), modelIn = $('model'), keyIn = $('key'), remember = $('remember');
  for (const [id, p] of Object.entries(P.PROVIDERS)) {
    const o = document.createElement('option');
    o.value = id;
    o.textContent = p.label;
    providerSel.appendChild(o);
  }
  function syncProvider() {
    const id = providerSel.value, p = P.PROVIDERS[id];
    const needsKey = id !== 'none';
    $('keyrow').hidden = !needsKey;
    if (!needsKey) {
      $('privacy').textContent = 'Free mode: no model, no key. You get the usage curve plus the earliest and most-cited papers.';
      return;
    }
    modelIn.value = store.get('idealine.model.' + id) || p.defaultModel;
    keyIn.placeholder = p.keyHint;
    $('keylink').href = p.keyUrl;
    $('keylink').textContent = `Get a ${p.short} key`;
    const saved = store.get(KEY_PREFIX + id);
    keyIn.value = saved || '';
    remember.checked = !!saved;
    $('privacy').textContent = `Your key goes straight from your browser to ${p.host}. This site has no server and never sees it. One request per term, about 15–25k input tokens, billed to your ${p.short} account.`;
  }
  providerSel.value = store.get('idealine.provider') || 'none';
  if (!P.PROVIDERS[providerSel.value] && providerSel.value !== 'none') providerSel.value = 'none';
  providerSel.addEventListener('change', () => { store.set('idealine.provider', providerSel.value); syncProvider(); });
  syncProvider();
  remember.addEventListener('change', () => {
    if (!remember.checked) { store.del(KEY_PREFIX + providerSel.value); store.del('idealine.openalexKey'); }
  });
  $('forget').addEventListener('click', () => {
    Object.keys(P.PROVIDERS).forEach(id => store.del(KEY_PREFIX + id));
    store.del('idealine.openalexKey');
    keyIn.value = '';
    $('oakey').value = '';
    remember.checked = false;
    status('Saved keys removed from this browser.');
  });
  $('oakey').value = store.get('idealine.openalexKey') || '';

  // --- run --------------------------------------------------------------------
  function status(msg, isError) {
    const s = $('status');
    s.textContent = msg || '';
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

  $('trace-form').addEventListener('submit', async ev => {
    ev.preventDefault();
    if (busy) return;
    const term = $('term').value.replace(/\s+/g, ' ').trim();
    const aliases = parseAliases($('aliases').value).filter(a => a.toLowerCase() !== term.toLowerCase());
    const providerId = providerSel.value, key = keyIn.value.trim(), model = modelIn.value.trim();
    if (term.length < 2) return status('Type a term first.', true);
    if (providerId !== 'none' && !key) return status(`Paste your ${P.PROVIDERS[providerId].short} key, or pick "No model" for the free view.`, true);
    if (providerId !== 'none') {
      if (remember.checked) store.set(KEY_PREFIX + providerId, key); else store.del(KEY_PREFIX + providerId);
      store.set('idealine.model.' + providerId, model);
    }
    const oaKey = $('oakey').value.trim();
    if (oaKey && remember.checked) store.set('idealine.openalexKey', oaKey); else store.del('idealine.openalexKey');

    busy = true;
    $('go').disabled = true;
    $('result').hidden = true;
    lastData = null;
    const acronymHint = /^[A-Z0-9]{2,5}$/.test(term) && !aliases.length;
    try {
      const oa = new C.OpenAlex({ apiKey: oaKey, log: m => status(m) });
      const t = await C.harvest(oa, term, aliases, { onStep: status });
      if (!t.counts.length || !t.evidence.length) {
        throw new C.IdealineError(`No paper titles or abstracts in OpenAlex use “${term}”. Try another spelling or add one under “Other spellings”.`);
      }
      if (providerId === 'none') {
        C.baseline(t);
      } else {
        const p = P.PROVIDERS[providerId];
        status(`Asking ${p.short} (${model}) to read ${t.evidence.length} sentences. This can take a minute…`);
        const data = await P.callModel(providerId, { key, model, system: SPEC.system, prompt: C.buildPrompt(t), schema: SPEC.schema });
        t.model = model;
        await C.applyAnalysis(t, data, oa, status);
        if (!t.milestones.length) {
          throw new C.IdealineError('The model returned no milestones backed by the quoted sentences. Try again, or try another model.');
        }
      }
      lastData = C.toData(t);
      show(lastData);
      status(acronymHint ? 'Tip: acronyms often match other fields; the spelled-out term usually gives a cleaner timeline.' : '');
      const u = new URL(location.href);
      u.searchParams.set('term', term);
      if (aliases.length) u.searchParams.set('alias', aliases.join(', ')); else u.searchParams.delete('alias');
      history.replaceState(null, '', u);
    } catch (e) {
      status(e instanceof C.IdealineError || e instanceof P.ProviderError ? e.message : 'Something went wrong: ' + (e && e.message ? e.message : e), true);
    } finally {
      busy = false;
      $('go').disabled = false;
    }
  });

  function show(d) {
    const r = $('result');
    r.hidden = false;
    $('r-term').textContent = d.term;
    $('r-summary').textContent = d.summary || '';
    const years = d.counts.map(c => c[0]);
    const span = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : 'n/a';
    $('r-meta').textContent = `${d.total.toLocaleString('en-US')} papers in OpenAlex use this term (${span}). ` +
      (d.model ? `Proposed by ${d.model} from ${d.evidenceCount} quoted sentences only; check the quotes.` : 'No model: milestones are the earliest and most-cited papers that use the term.');
    window.renderTimeline(d, r);
    r.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    const how = d.model ? `Proposed by <code>${e(d.model)}</code> from ${d.evidenceCount} quoted sentences only; every milestone shows its quotes so you can check it.`
      : 'No model was used: milestones are the earliest and most-cited papers that use the term.';
    const data = JSON.stringify(d).replace(/</g, '\\u003c');
    const lib = SPEC.timelineJs.replace(/<\/script/gi, '<\\/script');
    const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(d.term)} · idealine</title>
<style>${SPEC.css}</style></head>
<body><main>
<div class="brand"><a href="${e(SPEC.siteUrl)}">idealine</a> · where did this idea come from?</div>
<h1>${e(d.term)}</h1>
<p class="summary">${e(d.summary)}</p>
<p class="meta">${d.total.toLocaleString('en-US')} papers in OpenAlex use this term (${span}). ${how}</p>
<div class="card">
  <div class="hint">Click a dot to see the quotes behind it. Scroll sideways for earlier years.</div>
  <div class="scroller"><div data-part="chart"></div></div>
  <div class="legend" data-part="legend"></div>
  <div class="detail" data-part="detail" aria-live="polite"></div>
</div>
<div class="eras" data-part="eras"></div>
<footer>Made with <a href="${e(SPEC.siteUrl)}">idealine</a> from <a href="https://openalex.org">OpenAlex</a> data. Generated ${e(d.generated)}. Labels can be wrong; the quotes are the evidence.</footer>
</main>
<script type="application/json" id="data">${data}</script>
<script>${lib}
renderTimeline(JSON.parse(document.getElementById('data').textContent));</script>
</body></html>
`;
    download(slug(d.term) + '.html', page, 'text/html');
  });
  $('dl-json').addEventListener('click', () => {
    if (lastData) download(slug(lastData.term) + '.json', JSON.stringify(lastData, null, 2), 'application/json');
  });

  // --- ?term= links prefill the form (never auto-spend a key) ------------------
  const params = new URLSearchParams(location.search);
  if (params.get('term')) {
    $('term').value = params.get('term').slice(0, 80);
    $('aliases').value = (params.get('alias') || '').slice(0, 200);
    if (providerSel.value === 'none') $('trace-form').requestSubmit();
    else status('Press Trace to run it with your key.');
  }
})();
