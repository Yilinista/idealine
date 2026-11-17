# chain-of-thought: where it came from

“chain of thought”原本是英语中的日常说法，指人一连串相互衔接的思路或推理过程，长期出现在文学、法律、科学等各类文献中；2022年的论文《Chain-Of-Thought Prompting Elicits Reasoning in Large Language Models》把它定义为“一系列中间推理步骤”，并将其用作提示大语言模型的技术。如今该词主要指让大模型在给出答案前生成逐步推理过程，并已扩展为通过强化学习训练的“长思维链”推理、多模态推理以及AI安全监控的对象。

12091 papers in OpenAlex use this term (1914–2026); 160 sentences read.

## Eras

- **1914–2021 · 日常用语：思路链条**: 泛指人的一连串思绪、论证脉络或思想传承，并非技术术语。
- **2022–2023 · 大模型提示技术**: 指在提示中给出带中间推理步骤的示例（或零样本引导），让大语言模型逐步推理以提升复杂推理能力的方法。
- **2023–2024 · 推理范式扩展与审视**: 思维链成为通用推理范式，被用于微调数据、多模态与机器人等领域，同时其忠实性受到质疑。
- **2024–2026 · 长思维链推理模型**: 指通过强化学习训练、在推理时生成很长中间推理序列的模型内部推理过程，涉及长度压缩、效率与安全监控等问题。

## Milestones

- **1953 · origin**: [THE SECRETARY'S OFFICE](https://doi.org/10.1021/cen-v031n039.p4028). 证据中较早的日常用法，“chain of thought”指引发思考的一连串念头。
  - > What has started our chain of thought is the following: I have often observed that a small group or clique can run an organization once it gets into office. (ALDEN H. EMERY, 1953)
- **2006 · ancestor**: [Chained Thoughts Broken by Chains of Thought : An Analysis of the Narrative Style Used in Virginia Woolf's A Room of One's Own](https://openalex.org/W582236113). 说明该词在词典中与“train of thought”同义，即一个念头接一个念头的链式思维，这是后来技术含义的语义来源。
  - > One of the most prominent stylistic means applied by Woolf is her ‘train of thought’, linking one reflection to another like wagons in a railway convoy or like loops in a chain (therefore also sometimes referred to as ‘chain of thought’ in dictionaries). (Ellen Johansson, 2006)
- **2022 · coined**: [Chain-Of-Thought Prompting Elicits Reasoning in Large Language Models](https://doi.org/10.52202/068431-1800). 将chain of thought定义为“一系列中间推理步骤”，并证明它能显著提升大模型的复杂推理能力，确立了该术语的技术含义。
  - > We explore how generating a chain of thought -- a series of intermediate reasoning steps -- significantly improves the ability of large language models to perform complex reasoning. (Jason Wei et al., 2022)
  - > Recent breakthroughs, exemplified by large language models (LLMs) 1,2 and chain-of-thought (CoT) prompting 3 , have achieved considerable success on foundational reasoning tasks. (Daya Guo et al., 2025)
- **2022 · popularized**: [Large Language Models Are Zero-Shot Reasoners](https://doi.org/10.52202/068431-1613). 把CoT提示作为突破性技术加以讨论，并推广到零样本场景，使该术语迅速普及。
  - > Notably, chain of thought (CoT) prompting, a recent technique for eliciting complex multi-step reasoning through step-by-step answer examples, achieved the state-of-the-art performances in arithmetics and symbolic reasoning, difficult system-2 tasks that do not follow the standard scaling laws for LLMs. (Takeshi Kojima et al., 2022)
  - > In enhancing the reasoning capabilities of large language models (LLMs), prior research primarily focuses on specific prompting techniques such as few-shot or zero-shot chain-of-thought (CoT) prompting. (Xuezhi Wang et al., 2024)
- **2022 · popularized**: [Self-Consistency Improves Chain of Thought Reasoning in Language Models](https://doi.org/10.48550/arxiv.2203.11171). 在思维链基础上采样多条推理路径，成为后续工作广泛引用的核心扩展方法。
  - > Chain-of-thought prompting combined with pre-trained large language models has achieved encouraging results on complex reasoning tasks. (Xuezhi Wang et al., 2022)
  - > The performance of Large Language Models (LLMs) in reasoning tasks depends heavily on prompt design, with Chain-of-Thought (CoT) and self-consistency being critical methods that enhance this ability. (Chuanyang Zheng et al., 2023)
- **2022 · applied**: [Scaling Instruction-Finetuned Language Models](https://doi.org/10.48550/arxiv.2210.11416). 把思维链从提示技巧转为训练数据，用于指令微调。
  - > In this paper we explore instruction finetuning with a particular focus on (1) scaling the number of tasks, (2) scaling the model size, and (3) finetuning on chain-of-thought data. (Hyung Won Chung et al., 2022)
  - > We find task balancing and enrichment techniques are overlooked but critical to effective instruction tuning, and in particular, training with mixed prompt settings (zero-shot, few-shot, and chain-of-thought) actually yields stronger (2%+) performance in all settings. (Shayne Longpre et al., 2023)
- **2023 · redefined**: [Tree of Thoughts: Deliberate Problem Solving with Large Language Models](https://doi.org/10.52202/075280-0517). 将线性思维链推广为可搜索的树结构，催生了“X-of-Thought”系列框架。
  - > To surmount these challenges, we introduce a new framework for language model inference, Tree of Thoughts (ToT), which generalizes over the popular Chain of Thought approach to prompting language models, and enables exploration over coherent units of text (thoughts) that serve as intermediate steps toward problem solving. (Shunyu Yao et al., 2023)
  - > We introduce Graph of Thoughts (GoT): a framework that advances prompting capabilities in large language models (LLMs) beyond those offered by paradigms such as Chain-of-Thought or Tree of Thoughts (ToT). (Maciej Besta et al., 2024)
- **2023 · critique**: [Language Models Don't Always Say What They Think: Unfaithful Explanations in Chain-of-Thought Prompting](https://doi.org/10.52202/075280-3275). 指出模型给出的思维链未必忠实反映其真实推理过程。
  - > Large Language Models (LLMs) can achieve strong performance on many tasks by producing step-by-step reasoning before giving a final output, often referred to as chain-of-thought reasoning (CoT). (Miles Turpin et al., 2023)
  - > Large language models (LLMs) perform better when they produce step-by-step, "Chain-of-Thought" (CoT) reasoning before answering a question, but it is unclear if the stated reasoning is a faithful explanation of the model's actual reasoning (i.e., its process for answering the question). (Tamera Lanham et al., 2023)
- **2023 · applied**: [RT-2: Vision-Language-Action Models Transfer Web Knowledge to Robotic Control](https://doi.org/10.48550/arxiv.2307.15818). 将思维链推理引入视觉-语言-动作模型与机器人控制，标志其进入多模态与具身领域。
  - > We further show that incorporating chain of thought reasoning allows RT-2 to perform multi-stage semantic reasoning, for example figuring out which object to pick up for use as an improvised hammer (a rock), or which type of drink is best suited for someone who is tired (an energy drink). (Anthony Brohan et al., 2023)
  - > Naive use of "chain-of-thought" (CoT) style prompting is significantly less effective with standard VLAs because of the relatively simple training examples that are available to them. (Michał Zawalski et al., 2024)
- **2024 · redefined**: [OpenAI o1 System Card](https://doi.org/10.48550/arxiv.2412.16720). 思维链不再只是提示方法，而是通过大规模强化学习训练的模型内部推理过程，开启“长思维链”推理模型时代。
  - > The o1 model series is trained with large-scale reinforcement learning to reason using chain of thought. (OpenAI et al., 2024)
  - > These models employ extended chain-of-thought (CoT) processes, exploring multiple strategies to enhance problem-solving capabilities. (Xingyu Chen et al., 2024)
- **2024 · critique**: [To CoT or not to CoT? Chain-of-thought helps mainly on math and symbolic reasoning](https://doi.org/10.48550/arxiv.2409.12183). 指出思维链的收益主要集中在数学与符号推理任务，限定了其适用范围。
  - > Chain-of-thought (CoT) via prompting is the de facto method for eliciting reasoning capabilities from large language models (LLMs). (Zayne Sprague et al., 2024)
  - > In addition, code-pretraining greatly benefits strategic reasoning, while advanced reasoning methods such as Chain-of-Thought (CoT) and Tree-of-Thought (ToT) do not always help. (Jinhao Duan et al., 2024)
- **2025 · applied**: [Chain of Thought Monitorability: A New and Fragile Opportunity for AI Safety](https://doi.org/10.48550/arxiv.2507.11473). 把思维链视为监控模型意图的AI安全工具，同时强调这种可监控性很脆弱。
  - > Chain of Thought Monitorability: A New and Fragile Opportunity for AI Safety (Tomek Korbak et al., 2025)
  - > Chain-of-thought (CoT) offers a potential boon for AI safety as it allows monitoring a model's CoT to try to understand its intentions and reasoning processes. (Yanda Chen et al., 2025)

> Eras and milestones were proposed by `claude-opus-5-5` from the quoted sentences only. Check the quotes.

Generated by [idealine](https://github.com/Yilinista/idealine) from OpenAlex data.
