# chain-of-thought: where it came from

“chain of thought”原本是英语中表示“思路、一连串想法”的日常说法；2022 年起，它在大语言模型研究中被用来指一种提示方法，即让模型先写出逐步的中间推理再作答。如今它主要指大模型（包括多模态模型和推理模型）生成的逐步推理过程，这种过程既可以通过提示引出，也可以通过训练和强化学习获得，常以“长思维链”的形式出现。

12091 papers in OpenAlex use this term (1914–2026); 160 sentences read.

Follows: 本时间线追踪“思维链”在大语言模型中的含义：让模型在给出答案前生成一系列中间推理步骤，最初是一种提示技术，后来也指模型训练和输出中的推理过程。

## Same words, other meanings (left out)

- **日常用语：思路**: 普通英语中的“一连串想法、思路或论证脉络”，与人工智能无关。 (19 quotes)

## Eras

- **2022–2022 · 提示技术的诞生**: 思维链指一种提示方法：在示例中给出中间推理步骤，从而引出大语言模型的多步推理能力，主要用于算术和符号推理。
- **2023–2024 · 扩展、训练与质疑**: 思维链从单纯的提示技巧扩展为可用于微调、蒸馏、多模态、机器人和检索的推理过程，同时其忠实性和适用范围开始受到质疑。
- **2025–2026 · 推理模型的长思维链**: 思维链主要指推理模型经强化学习训练后生成的长推理序列，研究重点转向长度扩展、压缩效率以及安全监控。

## Milestones

- **2022 · origin**: [Chain-Of-Thought Prompting Elicits Reasoning in Large Language Models](https://doi.org/10.52202/068431-1800). 该文首次把“生成思维链（一系列中间推理步骤）”作为提升大语言模型复杂推理能力的方法提出，后续文献大量引用。
  - > We explore how generating a chain of thought -- a series of intermediate reasoning steps -- significantly improves the ability of large language models to perform complex reasoning. (Jason Wei et al., 2022)
- **2022 · popularized**: [Large Language Models Are Zero-Shot Reasoners](https://doi.org/10.52202/068431-1613). 该文把思维链提示推广到零样本场景，使这一技术迅速普及。
  - > Notably, chain of thought (CoT) prompting, a recent technique for eliciting complex multi-step reasoning through step-by-step answer examples, achieved the state-of-the-art performances in arithmetics and symbolic reasoning, difficult system-2 tasks that do not follow the standard scaling laws for LLMs. (Takeshi Kojima et al., 2022)
- **2022 · popularized**: [Self-Consistency Improves Chain of Thought Reasoning in Language Models](https://doi.org/10.48550/arxiv.2203.11171). 自洽性方法建立在思维链提示之上，成为最常被引用的配套技术之一。
  - > Chain-of-thought prompting combined with pre-trained large language models has achieved encouraging results on complex reasoning tasks. (Xuezhi Wang et al., 2022)
  - > Self-consistency with chain-of-thought prompting (CoT) has demonstrated remarkable performance gains on various challenging tasks, by utilizing multiple reasoning paths sampled from large language models (LLMs). (Xinyun Chen et al., 2023)
- **2022 · redefined**: [Scaling Instruction-Finetuned Language Models](https://doi.org/10.48550/arxiv.2210.11416). 思维链开始被用作微调数据，从一种提示手段扩展为一种训练资源。
  - > In this paper we explore instruction finetuning with a particular focus on (1) scaling the number of tasks, (2) scaling the model size, and (3) finetuning on chain-of-thought data. (Hyung Won Chung et al., 2022)
  - > We find task balancing and enrichment techniques are overlooked but critical to effective instruction tuning, and in particular, training with mixed prompt settings (zero-shot, few-shot, and chain-of-thought) actually yields stronger (2%+) performance in all settings. (Shayne Longpre et al., 2023)
- **2023 · redefined**: [Tree of Thoughts: Deliberate Problem Solving with Large Language Models](https://doi.org/10.52202/075280-0517). 思维树把线性的思维链推广为可探索的树状结构，催生了一系列“X-of-Thought”变体。
  - > To surmount these challenges, we introduce a new framework for language model inference, Tree of Thoughts (ToT), which generalizes over the popular Chain of Thought approach to prompting language models, and enables exploration over coherent units of text (thoughts) that serve as intermediate steps toward problem solving. (Shunyu Yao et al., 2023)
  - > We introduce Graph of Thoughts (GoT): a framework that advances prompting capabilities in large language models (LLMs) beyond those offered by paradigms such as Chain-of-Thought or Tree of Thoughts (ToT). (Maciej Besta et al., 2024)
- **2023 · critique**: [Language Models Don't Always Say What They Think: Unfaithful Explanations in Chain-of-Thought Prompting](https://doi.org/10.52202/075280-3275). 该研究质疑思维链是否忠实反映模型的真实推理过程。
  - > Large Language Models (LLMs) can achieve strong performance on many tasks by producing step-by-step reasoning before giving a final output, often referred to as chain-of-thought reasoning (CoT). (Miles Turpin et al., 2023)
  - > Large language models (LLMs) perform better when they produce step-by-step, "Chain-of-Thought" (CoT) reasoning before answering a question, but it is unclear if the stated reasoning is a faithful explanation of the model's actual reasoning (i.e., its process for answering the question). (Tamera Lanham et al., 2023)
- **2023 · applied**: [Multimodal Chain-of-Thought Reasoning in Language Models](https://doi.org/10.48550/arxiv.2302.00923). 思维链被引入多模态模型，并进一步延伸到视觉和机器人控制领域。
  - > Large language models (LLMs) have shown impressive performance on complex reasoning by leveraging chain-of-thought (CoT) prompting to generate intermediate reasoning chains as the rationale to infer the answer. (Zhuosheng Zhang et al., 2023)
  - > We further show that incorporating chain of thought reasoning allows RT-2 to perform multi-stage semantic reasoning, for example figuring out which object to pick up for use as an improvised hammer (a rock), or which type of drink is best suited for someone who is tired (an energy drink). (Anthony Brohan et al., 2023)
- **2024 · critique**: [To CoT or not to CoT? Chain-of-thought helps mainly on math and symbolic reasoning](https://doi.org/10.48550/arxiv.2409.12183). 该文指出思维链主要在数学和符号推理任务上有效，限定了它的适用范围。
  - > Chain-of-thought (CoT) via prompting is the de facto method for eliciting reasoning capabilities from large language models (LLMs). (Zayne Sprague et al., 2024)
  - > In addition, code-pretraining greatly benefits strategic reasoning, while advanced reasoning methods such as Chain-of-Thought (CoT) and Tree-of-Thought (ToT) do not always help. (Jinhao Duan et al., 2024)
- **2024 · redefined**: [OpenAI o1 System Card](https://doi.org/10.48550/arxiv.2412.16720). o1 通过大规模强化学习训练模型用思维链进行推理，使思维链从提示技巧转变为模型内在的推理方式。
  - > The o1 model series is trained with large-scale reinforcement learning to reason using chain of thought. (OpenAI et al., 2024)
  - > These models employ extended chain-of-thought (CoT) processes, exploring multiple strategies to enhance problem-solving capabilities. (Xingyu Chen et al., 2024)
- **2025 · popularized**: [DeepSeek-R1 incentivizes reasoning in LLMs through reinforcement learning](https://doi.org/10.1038/s41586-025-09422-z). DeepSeek-R1 与 o1 一起使“扩展长思维链”成为推理模型的主流范式。
  - > Recent breakthroughs, exemplified by large language models (LLMs) 1,2 and chain-of-thought (CoT) prompting 3 , have achieved considerable success on foundational reasoning tasks. (Daya Guo et al., 2025)
  - > Chain-of-Thought (CoT) has been proven effective in enhancing the reasoning capabilities of large language models (LLMs).Recent advancements, such as OpenAI's o1 and DeepSeek-R1, suggest that scaling up the length of CoT sequences during inference could further boost LLM reasoning performance.However, due to the autoregressive nature of LLM decoding, longer CoT outputs lead to a linear increase in inference latency, adversely affecting user expe… (Heming Xia et al., 2025)
- **2025 · applied**: [Chain of Thought Monitorability: A New and Fragile Opportunity for AI Safety](https://doi.org/10.48550/arxiv.2507.11473). 思维链被视为 AI 安全中监控模型意图的手段，进入安全研究领域。
  - > Chain of Thought Monitorability: A New and Fragile Opportunity for AI Safety (Tomek Korbak et al., 2025)
  - > Chain-of-thought (CoT) offers a potential boon for AI safety as it allows monitoring a model's CoT to try to understand its intentions and reasoning processes. (Yanda Chen et al., 2025)

> Eras and milestones were proposed by `claude-opus-5-5` from the quoted sentences only. Check the quotes.

Generated by [idealine](https://github.com/Yilinista/idealine) from OpenAlex data.
