// One structured-output call per provider, made from the browser with the
// visitor's own key. Each adapter returns the parsed JSON object, or throws
// ProviderError with a message a visitor can act on. Keys never appear in errors.
(function (global) {
  'use strict';

  class ProviderError extends Error {}

  const PROVIDERS = {
    anthropic: {
      label: 'Claude (Anthropic key)', short: 'Anthropic', host: 'api.anthropic.com',
      defaultModel: 'claude-opus-5-5', keyHint: 'sk-ant-…', keyUrl: 'https://console.anthropic.com/settings/keys',
    },
    openai: {
      label: 'OpenAI (OpenAI key)', short: 'OpenAI', host: 'api.openai.com',
      defaultModel: 'gpt-6.1-terra', keyHint: 'sk-…', keyUrl: 'https://platform.openai.com/api-keys',
    },
    gemini: {
      label: 'Gemini (Google AI Studio key)', short: 'Google', host: 'generativelanguage.googleapis.com',
      defaultModel: 'gemini-4-hydrogen', keyHint: 'AIza…', keyUrl: 'https://aistudio.google.com/apikey',
    },
    openrouter: {
      label: 'OpenRouter (one key, many models)', short: 'OpenRouter', host: 'openrouter.ai',
      defaultModel: 'anthropic/claude-sonnet-5.5', keyHint: 'sk-or-…', keyUrl: 'https://openrouter.ai/keys',
    },
  };

  const MAX_OUTPUT = 16000;
  const SITE_URL = 'https://yilinista.github.io/idealine/';

  async function readError(resp) {
    let detail = '';
    try {
      const j = await resp.json();
      detail = (j.error && (j.error.message || j.error.type)) || j.message || '';
    } catch (e) { /* not JSON */ }
    return String(detail).slice(0, 300);
  }

  function httpError(short, status, detail) {
    if (status === 401 || status === 403) return new ProviderError(`${short} rejected the key (${status}). Check that you pasted the whole key and that it is active.${detail ? ' ' + detail : ''}`);
    if (status === 404) return new ProviderError(`${short} does not know that model (404). Check the model ID.${detail ? ' ' + detail : ''}`);
    if (status === 429) return new ProviderError(`${short} says you hit a rate or spending limit (429). Wait a bit or check your account's billing.${detail ? ' ' + detail : ''}`);
    if (status === 400) return new ProviderError(`${short} refused the request (400).${detail ? ' ' + detail : ''} Some models do not support structured JSON output or these settings; try the default model.`);
    return new ProviderError(`${short} error ${status}.${detail ? ' ' + detail : ''}`);
  }

  function parseJson(short, text) {
    if (typeof text !== 'string' || !text.trim()) throw new ProviderError(`${short} returned an empty answer. Try again.`);
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      throw new ProviderError(`${short} returned text that is not valid JSON. Try again or pick another model.`);
    }
  }

  async function post(fetchFn, short, url, headers, body) {
    let resp;
    try {
      resp = await fetchFn(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
    } catch (e) {
      throw new ProviderError(`Could not reach ${short}. Check your connection (or an ad blocker) and try again.`);
    }
    if (!resp.ok) throw httpError(short, resp.status, await readError(resp));
    return resp.json();
  }

  // Server-sent events: feed text chunks, get back the parsed `data:` objects.
  // Events may be split across chunks; a chunk may hold several events.
  function sseParser() {
    let buf = '';
    const parse = block => {
      const data = block.split(/\r?\n/).filter(l => l.startsWith('data:')).map(l => l.slice(5).replace(/^ /, '')).join('\n');
      if (!data) return null;
      try { return JSON.parse(data); } catch (e) { return null; }
    };
    return {
      push(text) {
        buf += text;
        const parts = buf.split(/\r?\n\r?\n/);
        buf = parts.pop();
        return parts.map(parse).filter(Boolean);
      },
      end() { const last = buf.trim() ? parse(buf) : null; buf = ''; return last ? [last] : []; },
    };
  }

  // Read a streamed Messages answer. Returns { stop, text }; calls onText(allTextSoFar).
  async function readAnthropicStream(resp, onText) {
    const reader = resp.body.getReader(), dec = new TextDecoder(), sse = sseParser();
    let text = '', stop = null, done = false;
    const handle = ev => {
      if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') {
        text += ev.delta.text || '';
        if (onText) onText(text);
      } else if (ev.type === 'message_delta' && ev.delta && ev.delta.stop_reason) {
        stop = ev.delta.stop_reason;
      } else if (ev.type === 'message_stop') {
        done = true;
      } else if (ev.type === 'error') {
        const err = ev.error || {};
        if (err.type === 'overloaded_error') throw new ProviderError('Anthropic is overloaded right now. Wait a minute and try again.');
        throw new ProviderError(`Anthropic stopped with an error: ${String(err.message || err.type || 'unknown').slice(0, 200)}`);
      }
    };
    try {
      for (;;) {
        const { value, done: end } = await reader.read();
        if (end) break;
        sse.push(dec.decode(value, { stream: true })).forEach(handle);
      }
      sse.push(dec.decode()).forEach(handle);
      sse.end().forEach(handle);
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      throw new ProviderError('The connection dropped while the answer was coming in. Try again.');
    }
    if (!done && !stop) throw new ProviderError('The connection dropped while the answer was coming in. Try again.');
    return { stop, text };
  }

  const adapters = {
    // Streamed, so the page can show how far the answer has got.
    async anthropic({ key, model, system, prompt, schema, fetchFn, onText }) {
      const headers = {
        'x-api-key': key,
        'anthropic-version': '2026-10-21',
        'anthropic-dangerous-direct-browser-access': 'true',
      };
      const url = 'https://api.anthropic.com/v1/messages';
      const body = effort => ({
        model, max_tokens: MAX_OUTPUT, system, stream: true,
        messages: [{ role: 'user', content: prompt }],
        // Low effort: the task is reading and sorting given quotes, and visitors are waiting.
        output_config: { ...(effort ? { effort: 'low' } : {}), format: { type: 'json_schema', schema } },
      });
      const send = async b => {
        let resp;
        try {
          resp = await fetchFn(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(b) });
        } catch (e) {
          throw new ProviderError('Could not reach Anthropic. Check your connection (or an ad blocker) and try again.');
        }
        if (!resp.ok) throw httpError('Anthropic', resp.status, await readError(resp));
        if (resp.body && typeof resp.body.getReader === 'function') return readAnthropicStream(resp, onText);
        // No stream (an old browser or a proxy): read the whole answer at once.
        let j;
        try { j = await resp.json(); } catch (e) { throw new ProviderError('Anthropic returned text that is not valid JSON. Try again or pick another model.'); }
        const block = (j.content || []).find(c => c.type === 'text');
        return { stop: j.stop_reason, text: block && block.text };
      };
      let r;
      try {
        r = await send(body(true));
      } catch (e) {
        // Older Claude models reject the effort setting; retry once without it.
        if (!(e instanceof ProviderError && /\(400\)/.test(e.message) && /effort/i.test(e.message))) throw e;
        r = await send(body(false));
      }
      if (r.stop === 'refusal') throw new ProviderError('The model declined this request.');
      if (r.stop === 'max_tokens') throw new ProviderError('The answer was cut off (max tokens). Try again.');
      return parseJson('Anthropic', r.text);
    },

    async openai({ key, model, system, prompt, schema, fetchFn }) {
      return chatCompletions(fetchFn, 'OpenAI', 'https://api.openai.com/v1/chat/completions', { authorization: `Bearer ${key}` },
        { model, system, prompt, schema, tokenField: 'max_completion_tokens' });
    },

    async openrouter({ key, model, system, prompt, schema, fetchFn }) {
      return chatCompletions(fetchFn, 'OpenRouter', 'https://openrouter.ai/api/v1/chat/completions', {
        authorization: `Bearer ${key}`, 'HTTP-Referer': SITE_URL, 'X-OpenRouter-Title': 'idealine',
      }, { model, system, prompt, schema, tokenField: 'max_tokens', extra: { provider: { require_parameters: true } } });
    },

    async gemini({ key, model, system, prompt, schema, fetchFn }) {
      model = model.replace(/^models\//, '');
      if (!/^[\w.\-]+$/.test(model)) throw new ProviderError('That Gemini model ID has characters it should not have.');
      const j = await post(fetchFn, 'Google', `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        'x-goog-api-key': key,
      }, {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, maxOutputTokens: MAX_OUTPUT },
      });
      const cand = (j.candidates || [])[0];
      if (!cand) throw new ProviderError('Google returned no answer' + (j.promptFeedback && j.promptFeedback.blockReason ? ` (blocked: ${j.promptFeedback.blockReason}).` : '.'));
      if (cand.finishReason === 'MAX_TOKENS' || cand.finishReason === 'CONTINUATION') throw new ProviderError('The answer was cut off (max tokens). Try again.');
      if (cand.finishReason && !['STOP', 'FINISH_REASON_UNSPECIFIED'].includes(cand.finishReason)) {
        throw new ProviderError(`Google stopped the answer (${cand.finishReason}).`);
      }
      const text = ((cand.content && cand.content.parts) || []).filter(p => typeof p.text === 'string' && !p.thought).map(p => p.text).join('');
      return parseJson('Google', text);
    },
  };

  async function chatCompletions(fetchFn, short, url, headers, { model, system, prompt, schema, tokenField, extra = {} }) {
    const j = await post(fetchFn, short, url, headers, {
      model,
      messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
      response_format: { type: 'json_schema', json_schema: { name: 'term_timeline', strict: true, schema } },
      [tokenField]: MAX_OUTPUT,
      ...extra,
    });
    if (j.error) throw new ProviderError(`${short} reported an error: ${String(j.error.message || j.error.code || 'unknown').slice(0, 200)}`);
    const choice = (j.choices || [])[0];
    if (!choice) throw new ProviderError(`${short} returned no answer.`);
    if (choice.message && choice.message.refusal) throw new ProviderError('The model declined this request.');
    if (choice.finish_reason === 'length') throw new ProviderError('The answer was cut off (max tokens). Try again.');
    if (choice.finish_reason === 'content_filter') throw new ProviderError(`${short}'s content filter blocked the answer.`);
    if (choice.finish_reason === 'error' || choice.error) throw new ProviderError(`${short} reported an error${choice.error && choice.error.message ? ': ' + String(choice.error.message).slice(0, 200) : '.'}`);
    const content = choice.message && choice.message.content;
    return parseJson(short, typeof content === 'string' ? content : Array.isArray(content) ? content.map(c => c.text || '').join('') : '');
  }

  // A free request that only checks the key (lists models; no tokens are used).
  const CHECK = {
    anthropic: key => ['https://api.anthropic.com/v1/models?limit=1', { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }],
    openai: key => ['https://api.openai.com/v1/models', { Authorization: `Bearer ${key}` }],
    gemini: key => ['https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', { 'x-goog-api-key': key }],
    openrouter: key => ['https://openrouter.ai/api/v1/key', { Authorization: `Bearer ${key}` }],
  };

  async function checkKey(providerId, key, fetchFn) {
    const p = PROVIDERS[providerId], make = CHECK[providerId];
    if (!p || !make) throw new ProviderError('Unknown provider.');
    if (!key) throw new ProviderError('Paste your API key first.');
    const [url, headers] = make(key);
    let resp;
    try {
      resp = await (fetchFn || ((...a) => global.fetch(...a)))(url, { headers });
    } catch (e) {
      throw new ProviderError(`Could not reach ${p.short}. Check your connection (or an ad blocker) and try again.`);
    }
    if (!resp.ok) throw httpError(p.short, resp.status, await readError(resp));
    return true;
  }

  async function callModel(providerId, opts) {
    const adapter = adapters[providerId];
    if (!adapter) throw new ProviderError('Unknown provider.');
    if (!opts.key) throw new ProviderError('Paste your API key first.');
    if (!opts.model) throw new ProviderError('Type a model ID.');
    return adapter({ ...opts, fetchFn: opts.fetchFn || ((...a) => global.fetch(...a)) });
  }

  const api = { PROVIDERS, ProviderError, callModel, checkKey, parseJson, sseParser };
  global.IdealineProviders = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
