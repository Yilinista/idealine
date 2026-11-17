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

  const adapters = {
    async anthropic({ key, model, system, prompt, schema, fetchFn }) {
      const headers = {
        'x-api-key': key,
        'anthropic-version': '2026-10-21',
        'anthropic-dangerous-direct-browser-access': 'true',
      };
      const body = effort => ({
        model, max_tokens: MAX_OUTPUT, system,
        messages: [{ role: 'user', content: prompt }],
        output_config: { ...(effort ? { effort: 'medium' } : {}), format: { type: 'json_schema', schema } },
      });
      let j;
      try {
        j = await post(fetchFn, 'Anthropic', 'https://api.anthropic.com/v1/messages', headers, body(true));
      } catch (e) {
        // Older Claude models reject the effort setting; retry once without it.
        if (!(e instanceof ProviderError && /\(400\)/.test(e.message) && /effort/i.test(e.message))) throw e;
        j = await post(fetchFn, 'Anthropic', 'https://api.anthropic.com/v1/messages', headers, body(false));
      }
      if (j.stop_reason === 'refusal') throw new ProviderError('The model declined this request.');
      if (j.stop_reason === 'max_tokens') throw new ProviderError('The answer was cut off (max tokens). Try again.');
      const block = (j.content || []).find(b => b.type === 'text');
      return parseJson('Anthropic', block && block.text);
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

  async function callModel(providerId, opts) {
    const adapter = adapters[providerId];
    if (!adapter) throw new ProviderError('Unknown provider.');
    if (!opts.key) throw new ProviderError('Paste your API key first.');
    if (!opts.model) throw new ProviderError('Type a model ID.');
    return adapter({ ...opts, fetchFn: opts.fetchFn || ((...a) => global.fetch(...a)) });
  }

  const api = { PROVIDERS, ProviderError, callModel, parseJson };
  global.IdealineProviders = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
