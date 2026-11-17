// idealine interface text in English and Simplified Chinese.
// Static text: elements with data-i18n (text), data-i18n-ph (placeholder), data-i18n-title.
// Runtime messages from core.js / providers.js are English; trMessage() translates
// the known ones and leaves anything else as is. Paper titles and quotes are never translated.
(function (global) {
  'use strict';

  const KINDS = {
    en: { ancestor: 'ancestor', origin: 'origin', coined: 'coined', popularized: 'popularized', redefined: 'redefined', applied: 'applied', critique: 'critique' },
    zh: { ancestor: '前身', origin: '起源', coined: '命名', popularized: '流行', redefined: '含义转变', applied: '跨界应用', critique: '批评' },
  };

  const T = {
    en: {
      langGroup: 'Language',
      saveKey: 'Save and check key', checking: 'Checking the key…',
      keyOk: short => `${short} accepted the key. You're set: press Trace.`,
      modelOn: (short, model) => `Using ${short} (${model}) for eras and milestones.`, modelOff: 'not checked yet', change: 'Change',
      heroTitle: 'Where did this idea come from?',
      heroSub: 'Type any term. See when it first appeared, who shaped it, and how its meaning shifted, with the sentence behind every step.',
      termPh: 'Try “world model” or “in-context learning”', termLabel: 'Term', go: 'Trace',
      freeLine: 'Free: usage curve + key papers. For eras and milestones,', addKey: 'add your own model key',
      optsSummary: 'Options and model key',
      aliasesLabel: 'Other spellings (optional, comma-separated)', aliasesPh: 'e.g. mixture-of-experts, MoE layer',
      meaningLabel: 'Which meaning? (optional; used with a model key)', meaningPh: 'e.g. AI agents that plan and use tools on their own',
      providerLabel: 'Model', providerNone: 'No model (free: usage curve + key papers)',
      keyLabel: 'API key', modelLabel: 'Model ID', remember: 'Remember my keys on this device (not on a shared computer)',
      getKey: p => `Get a ${p} key`,
      privacyFree: 'Free mode: no model, no key. You get the usage curve plus the earliest and most-cited papers.',
      privacyKey: (host, short) => `Your key goes straight from your browser to ${host}. This site has no server and never sees it. One request per term, about 15–25k input tokens, billed to your ${short} account.`,
      oakeyLabel: 'OpenAlex key (optional, free; use it if OpenAlex says the daily budget is used up)',
      forget: 'Forget saved keys', forgotten: 'Saved keys removed from this browser.',
      exampleTag: 'Example timeline', resultTag: 'Your timeline', interimTag: 'First look · the model is still reading',
      step_count: 'Counting papers per year in OpenAlex', step_early: 'Reading the earliest papers', step_cited: 'Reading the most-cited papers',
      step_recent: 'Reading recent papers', step_model: 'The model reads the quotes and builds eras and milestones', step_links: 'Linking milestones to papers',
      stepModelN: (short, n) => `${short} reads ${n} quoted sentences and builds eras and milestones (often 30–90 s)`,
      seconds: n => ` · ${n} s`,
      keptFree: 'Showing the free view (usage curve + key papers) instead.',
      tracingTag: 'Tracing…', failedTag: 'No timeline yet', readyTag: 'Ready-made timeline',
      readyNote: date => `Made in advance (${date}), so it opens instantly.`,
      traceLive: 'Trace again with live data',
      thin: n => `Only ${n} papers use this term, so it is very new or rare; the timeline will be thin.`,
      suggest: 'Meanwhile, these ready-made timelines open instantly:',
      howKindsH: 'Milestone types',
      howKinds: 'origin: first use · coined: someone names it · popularized: it spreads · redefined: the meaning shifts · applied: used in a new field · critique: pushback · ancestor: an older idea it builds on',
      howLimitsH: 'Limits',
      howLimits: 'Only titles and abstracts, mostly English, so use the English term. Very new terms have few papers. OpenAlex limits free use per network; a free OpenAlex key lifts that.',
      howKeyH: 'Your key',
      howKey: 'The site has no server. Your model key goes from your browser straight to the provider you picked, and is saved only if you tick “Remember”.',
      hint: 'Click a dot to see the quotes behind it. Scroll sideways for earlier years.',
      dlHtml: 'Download page (.html)', dlJson: 'Download data (.json)',
      moreH: 'More timelines',
      how1h: '1 · Count', how1: 'Papers per year in OpenAlex that use the exact phrase in a title or abstract.',
      how2h: '2 · Quote', how2: 'The sentences that use it, from the earliest, most-cited, and newest papers.',
      how3h: '3 · Explain', how3: 'A model groups them into eras and milestones, and may cite only those quotes.',
      cliH: 'Prefer the command line?',
      feedback: 'Something wrong or missing? Open an issue on GitHub.',
      footer: 'Eras and milestones come from a language model that may cite only the quoted sentences, and can be wrong; the quotes are the evidence.',
      navHow: 'How it works',
      meta: (total, span, model, n) => `${total.toLocaleString('en-US')} papers in OpenAlex use this term (${span}). ` + (model ? `Proposed by ${model} from ${n} quoted sentences only; check the quotes.` : 'No model: milestones are the earliest and most-cited papers that use the term.'),
      cardMeta: (total, n) => `${total.toLocaleString('en-US')} papers · ${n} milestones`,
      needTerm: 'Type a term first.',
      needKey: short => `Paste your ${short} key, or pick “No model” for the free view.`,
      asking: (short, model, n) => `Asking ${short} (${model}) to read ${n} sentences. This can take a minute…`,
      noPapers: term => `No paper titles or abstracts in OpenAlex use “${term}”. Try another spelling or add one under “Other spellings”.`,
      noPapersCjk: term => `No paper titles or abstracts in OpenAlex use “${term}”. Most papers there are in English, so try the English term (for example “vibe coding”).`,
      noMilestones: 'The model returned no milestones backed by the quoted sentences. Try again, or try another model.',
      acronym: 'Tip: acronyms often match other fields; the spelled-out term usually gives a cleaner timeline.',
      pressTrace: 'Press Trace to run it with your key.',
      wentWrong: m => 'Something went wrong: ' + m,
      // timeline
      legendDashed: 'dashed = no link found', legendBars: 'bars = papers per year',
      legendBarsQ: 'bars = papers per year; recent years by quarter',
      follows: 'This timeline follows:',
      otherSenses: n => `The same words also mean ${n === 1 ? 'one unrelated thing' : n + ' unrelated things'} in these papers. Left out of eras and milestones; the bars still count them.`,
      otherSensesShow: 'Show the other meanings',
      quotesN: n => `${n} quote${n === 1 ? '' : 's'}`,
      wrongSense: 'Meant another one? Describe it under “Options and model key” → “Which meaning?”, then trace again.',
      quarterPapers: (y, q, n) => `${y} Q${q}: ${n} papers`,
      undated: n => `${n} dated only by year, not in any quarter`,
      papers: n => `${n} papers`, yearPapers: (y, n) => `${y}: ${n} papers`, timelineOf: term => `Timeline of ${term}`,
      inSample: 'Linked paper uses the term itself.',
      resolved: title => `Named in the quotes; matched to “${title}” in OpenAlex. Check the match.`,
      unresolved: 'Named in the quotes but not found in OpenAlex, so there is no link.',
      titleOf: 'Title of ',
    },
    zh: {
      langGroup: '语言',
      saveKey: '保存并检查 key', checking: '正在检查 key……',
      keyOk: short => `${short} 的 key 可用，已就绪：直接点“追溯”。`,
      modelOn: (short, model) => `已启用模型：${short}（${model}），会生成时期和里程碑。`, modelOff: '尚未检查', change: '更改',
      heroTitle: '这个概念从哪里来？',
      heroSub: '输入任意术语，看它何时出现、谁推动了它、含义如何变化。每一步都附上论文原句作证据。',
      termPh: '输入英文术语，如 “world model” 或 “attention mechanism”', termLabel: '术语', go: '追溯',
      freeLine: '免费：使用曲线 + 关键论文。想看时期划分和里程碑，', addKey: '填入你自己的模型 key',
      optsSummary: '选项与模型 key',
      aliasesLabel: '其他写法（可选，用逗号分隔）', aliasesPh: '例如 mixture-of-experts, MoE layer',
      meaningLabel: '你指的是哪个意思？（可选，配合模型 key 使用）', meaningPh: '例如：能自己规划、调用工具的 AI 智能体',
      providerLabel: '模型', providerNone: '不用模型（免费：使用曲线 + 关键论文）',
      keyLabel: 'API key', modelLabel: '模型 ID', remember: '在这台设备上记住我的 key（公共电脑请勿勾选）',
      getKey: p => `获取 ${p} key`,
      privacyFree: '免费模式：不用模型、不用 key。你会看到使用曲线，以及最早和被引最多的论文。',
      privacyKey: (host, short) => `你的 key 只会从你的浏览器直接发给 ${host}。本站没有服务器，看不到你的 key。每个术语一次请求，约 1.5–2.5 万输入 token，费用记在你的 ${short} 账户。`,
      oakeyLabel: 'OpenAlex key（可选，免费；如果提示 OpenAlex 今日额度用完，就填这个）',
      forget: '清除已保存的 key', forgotten: '已从这个浏览器清除保存的 key。',
      exampleTag: '示例时间线', resultTag: '你的时间线', interimTag: '初步结果 · 模型还在阅读',
      step_count: '统计 OpenAlex 每年的论文数', step_early: '读取最早的论文', step_cited: '读取被引最多的论文',
      step_recent: '读取最新的论文', step_model: '模型阅读原句，划分时期和里程碑', step_links: '把里程碑链接到论文',
      stepModelN: (short, n) => `${short} 正在阅读 ${n} 条原句，划分时期和里程碑（通常 30–90 秒）`,
      seconds: n => ` · ${n} 秒`,
      keptFree: '先为你显示免费版结果（使用曲线 + 关键论文）。',
      tracingTag: '追溯中……', failedTag: '暂时没有结果', readyTag: '现成时间线',
      readyNote: date => `这是预先生成的完整版（${date}），所以能直接打开。`,
      traceLive: '用实时数据重新追溯',
      thin: n => `只有 ${n} 篇论文用到这个词，说明它很新或很少见，时间线会比较单薄。`,
      suggest: '可以先看看这些现成的时间线，点开即看：',
      howKindsH: '里程碑类型',
      howKinds: '起源：最早使用 · 命名：有人给它起了名 · 流行：开始被广泛使用 · 含义转变：意思变了 · 跨界应用：用到新领域 · 批评：反对或质疑 · 前身：它所继承的更早的想法',
      howLimitsH: '局限',
      howLimits: '只看标题和摘要，而且大多是英文，所以请输入英文术语。很新的词论文很少。OpenAlex 对每个网络的免费用量有限，填一个免费的 OpenAlex key 就不受限。',
      howKeyH: '你的 key',
      howKey: '本站没有服务器。你的模型 key 只从你的浏览器直接发给你选的模型提供方；只有勾选“记住”才会保存在本机。',
      hint: '点击圆点查看背后的原文句子。左右滑动可以看更早的年份。',
      dlHtml: '下载网页（.html）', dlJson: '下载数据（.json）',
      moreH: '更多时间线',
      how1h: '1 · 计数', how1: '统计 OpenAlex 中每年在标题或摘要里使用这个词的论文数。',
      how2h: '2 · 摘句', how2: '从最早、被引最多和最新的论文中，摘出用到这个词的句子。',
      how3h: '3 · 解释', how3: '模型把这些句子归纳成时期和里程碑，而且只能引用这些原句。',
      cliH: '想用命令行？',
      feedback: '发现问题或缺了什么？欢迎在 GitHub 上提 issue。',
      footer: '时期和里程碑由语言模型根据引用的原句生成，可能有误，请以原句为准。数据与源码：',
      navHow: '原理',
      meta: (total, span, model, n) => `OpenAlex 中有 ${total.toLocaleString('zh-CN')} 篇论文使用这个词（${span}）。` + (model ? `时期和里程碑由 ${model} 仅根据 ${n} 条原句生成，请核对原句。` : '未使用模型：里程碑是使用这个词的最早和被引最多的论文。'),
      cardMeta: (total, n) => `${total.toLocaleString('zh-CN')} 篇论文 · ${n} 个里程碑`,
      needTerm: '请先输入一个术语。',
      needKey: short => `请粘贴你的 ${short} key，或者选“不用模型”使用免费模式。`,
      asking: (short, model, n) => `正在请 ${short}（${model}）阅读 ${n} 条句子，可能需要一分钟……`,
      noPapers: term => `OpenAlex 里没有论文的标题或摘要用到“${term}”。换个写法，或在“其他写法”里补充。`,
      noPapersCjk: term => `OpenAlex 里没有论文的标题或摘要用到“${term}”。那里的论文大多是英文，请输入英文术语（例如 “vibe coding”）。`,
      noMilestones: '模型没有给出有原句支撑的里程碑。请重试，或换一个模型。',
      acronym: '提示：缩写常会匹配到其他领域，写全称通常更准确。',
      pressTrace: '点“追溯”用你的 key 运行。',
      wentWrong: m => '出错了：' + m,
      legendDashed: '虚线 = 没找到链接', legendBars: '柱子 = 每年论文数',
      legendBarsQ: '柱子 = 每年论文数，近几年按季度',
      follows: '这条时间线跟踪的意思：',
      otherSenses: n => `这些论文里，同一个词还有 ${n} 种不相干的意思。它们没放进时期和里程碑，但柱子里的论文数仍包括它们。`,
      otherSensesShow: '看看其他意思', quotesN: n => `${n} 句原文`,
      wrongSense: '不是你想要的意思？在“选项与模型 key”→“你指的是哪个意思？”里写一句描述，再追溯一次。', quarterPapers: (y, q, n) => `${y} 年第 ${q} 季度：${n} 篇`,
      undated: n => `其中 ${n} 篇只标了年份，没算进任何季度`,
      papers: n => `${n} 篇`, yearPapers: (y, n) => `${y} 年：${n} 篇`, timelineOf: term => `${term} 的时间线`,
      inSample: '链接的论文本身就用到了这个词。',
      resolved: title => `原句提到了这项工作，已在 OpenAlex 匹配到《${title}》，请核对是否匹配正确。`,
      unresolved: '原句提到了这项工作，但在 OpenAlex 里没找到，所以没有链接。',
      titleOf: '标题：',
    },
  };

  // Known English runtime messages -> Chinese. Anything unmatched stays English.
  const MSG_ZH = [
    [/^Counting papers per year…$/, () => '正在统计每年的论文数……'],
    [/^Counting papers per quarter…$/, () => '正在按季度统计论文数……'],
    [/^Reading the earliest papers…$/, () => '正在读取最早的论文……'],
    [/^Reading the most-cited papers…$/, () => '正在读取被引最多的论文……'],
    [/^Reading recent papers…$/, () => '正在读取最新的论文……'],
    [/^Looking up “(.*)”…$/, m => `正在查找“${m[1]}”……`],
    [/^OpenAlex is busy; retrying in (\d+) s…$/, m => `OpenAlex 繁忙，${m[1]} 秒后重试……`],
    [/^OpenAlex returned (\d+); retrying…$/, m => `OpenAlex 返回 ${m[1]}，正在重试……`],
    [/^OpenAlex's free daily budget for your network is used up \(resets in about (.+?), at midnight UTC\)\./, m => `你所在网络的 OpenAlex 免费额度今天已用完（大约 ${m[1].replace(' min', ' 分钟').replace(' h', ' 小时')}后重置，即 UTC 午夜）。可以在“选项与模型 key”里填一个免费的 OpenAlex key，或稍后再试。`],
    [/^OpenAlex is rate-limiting requests right now/, () => 'OpenAlex 正在限流，请等一分钟再试。'],
    [/^Could not reach OpenAlex/, () => '连不上 OpenAlex，请检查网络后重试。'],
    [/^OpenAlex error (\d+)\.$/, m => `OpenAlex 出错（${m[1]}）。`],
    [/^OpenAlex kept failing/, () => 'OpenAlex 一直失败，请过一分钟再试。'],
    [/^(.+?) rejected the key \((\d+)\)\. Check that you pasted the whole key and that it is active\.(.*)$/s, m => `${m[1]} 拒绝了这个 key（${m[2]}）。请确认 key 完整且有效。${detail(m[3])}`],
    [/^(.+?) does not know that model \(404\)\. Check the model ID\.(.*)$/s, m => `${m[1]} 不认识这个模型（404），请检查模型 ID。${detail(m[2])}`],
    [/^(.+?) says you hit a rate or spending limit \(429\)\. Wait a bit or check your account's billing\.(.*)$/s, m => `${m[1]} 提示你触发了速率或额度上限（429）。请稍后再试，或检查账户余额。${detail(m[2])}`],
    [/^(.+?) refused the request \(400\)\.(.*?)(?: ?Some models do not support[^]*)?$/s, m => `${m[1]} 拒绝了这次请求（400）。${detail(m[2])} 部分模型不支持结构化 JSON 输出或这些设置，可以试试默认模型。`],
    [/^(.+?) error (\d+)\.(.*)$/s, m => `${m[1]} 出错（${m[2]}）。${detail(m[3])}`],
    [/^Google stopped the answer \((.+)\)\.$/, m => `Google 中止了回答（${m[1]}）。`],
    [/^Unknown provider\.$/, () => '未知的模型提供方。'],
    [/^Paste your API key first\.$/, () => '请先粘贴你的 API key。'],
    [/^Type a model ID\.$/, () => '请填写模型 ID。'],
    [/^Could not reach (.+?)\. /, m => `连不上 ${m[1]}，请检查网络（或广告拦截插件）后重试。`],
    [/^(.+?) returned an empty answer/, m => `${m[1]} 返回了空答案，请重试。`],
    [/^(.+?) returned text that is not valid JSON/, m => `${m[1]} 返回的内容不是有效的 JSON，请重试或换个模型。`],
    [/^The model declined this request\.$/, () => '模型拒绝了这个请求。'],
    [/^The answer was cut off/, () => '回答被截断了（超出最大 token），请重试。'],
    [/^(.+?)'s content filter blocked the answer\.$/, m => `${m[1]} 的内容过滤拦截了回答。`],
    [/^(.+?) reported an error(.*)$/s, m => { const d = m[2].replace(/^[:.]\s*/, '').trim(); return `${m[1]} 报错${d ? '：' + d : '。'}`; }],
    [/^(.+?) returned no answer(?: \(blocked: (.+?)\))?\.$/, m => `${m[1]} 没有返回答案${m[2] ? `（被拦截：${m[2]}）` : ''}。`],
    [/^That Gemini model ID has characters/, () => '这个 Gemini 模型 ID 含有不该有的字符。'],
  ];

  // Provider's own error text (kept in its original language), appended after the translation.
  function detail(s) {
    const d = String(s || '').trim();
    return d ? ' ' + d : '';
  }

  function detectLang(stored, navLang) {
    if (stored === 'en' || stored === 'zh') return stored;
    return /^zh\b/i.test(navLang || '') ? 'zh' : 'en';
  }

  function trMessage(lang, msg) {
    if (lang !== 'zh' || typeof msg !== 'string') return msg;
    for (const [re, fn] of MSG_ZH) {
      const m = msg.match(re);
      if (m) return fn(m);
    }
    return msg;
  }

  const api = { T, KINDS, detectLang, trMessage };
  global.IdealineI18n = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
