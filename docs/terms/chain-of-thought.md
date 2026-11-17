# chain-of-thought: where it came from

"Chain of thought" began as an everyday English phrase for a connected line of reasoning, an argument, or an intellectual lineage, and it appears that way in writing from the 1910s through the 2000s. Since 2022 it has mostly meant a technique in which large language models generate intermediate reasoning steps before answering, first through prompting and then through training reasoning models, often with long chains, using reinforcement learning.

12091 papers in OpenAlex use this term (1914–2026); 160 sentences read.

## Eras

- **1914–2021 · Everyday train of reasoning**: A general phrase for a connected sequence of ideas: a person's line of reasoning, an argument's flow, or an intellectual tradition linking thinkers.
- **2022–2023 · LLM prompting technique**: A prompting method in which large language models are given or asked to produce a series of intermediate reasoning steps, improving complex reasoning.
- **2023–2024 · Faithfulness, training and multimodal spread**: CoT became training data and a general reasoning mode extended to vision, robotics and other domains, while researchers questioned whether stated reasoning reflects the model's real process.
- **2024–2026 · Long CoT reasoning models**: CoT became the internal reasoning trace of models trained with reinforcement learning, whose length is scaled, compressed, and monitored for safety.

## Milestones

- **1953 · origin**: [THE SECRETARY'S OFFICE](https://doi.org/10.1021/cen-v031n039.p4028). An early example of 'chain of thought' as an ordinary phrase for a line of reasoning.
  - > What has started our chain of thought is the following: I have often observed that a small group or clique can run an organization once it gets into office. (ALDEN H. EMERY, 1953)
- **2006 · ancestor**: [Chained Thoughts Broken by Chains of Thought: An Analysis of the Narrative Style Used in Virginia Woolf's A Room of One's Own](https://openalex.org/W582236113). The paper ties the phrase to the older 'train of thought', a linked sequence of reflections.
  - > One of the most prominent stylistic means applied by Woolf is her ‘train of thought’, linking one reflection to another like wagons in a railway convoy or like loops in a chain (therefore also sometimes referred to as ‘chain of thought’ in dictionaries). (Ellen Johansson, 2006)
- **2022 · coined**: [Chain-Of-Thought Prompting Elicits Reasoning in Large Language Models](https://doi.org/10.52202/068431-1800). Defines a chain of thought as a series of intermediate reasoning steps that improves LLM reasoning, establishing the technical sense.
  - > We explore how generating a chain of thought -- a series of intermediate reasoning steps -- significantly improves the ability of large language models to perform complex reasoning. (Jason Wei et al., 2022)
  - > Notably, chain of thought (CoT) prompting, a recent technique for eliciting complex multi-step reasoning through step-by-step answer examples, achieved the state-of-the-art performances in arithmetics and symbolic reasoning, difficult system-2 tasks that do not follow the standard scaling laws for LLMs. (Takeshi Kojima et al., 2022)
- **2022 · popularized**: [Large Language Models Are Zero-Shot Reasoners](https://doi.org/10.52202/068431-1613). Extended CoT prompting to zero-shot settings, and the zero-shot variant was rapidly built upon by later work.
  - > Notably, chain of thought (CoT) prompting, a recent technique for eliciting complex multi-step reasoning through step-by-step answer examples, achieved the state-of-the-art performances in arithmetics and symbolic reasoning, difficult system-2 tasks that do not follow the standard scaling laws for LLMs. (Takeshi Kojima et al., 2022)
  - > Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning by Large Language Models (Lei Wang et al., 2023)
- **2022 · redefined**: [Scaling Instruction-Finetuned Language Models](https://doi.org/10.48550/arxiv.2210.11416). Moved CoT from a prompt format to finetuning data for training models.
  - > In this paper we explore instruction finetuning with a particular focus on (1) scaling the number of tasks, (2) scaling the model size, and (3) finetuning on chain-of-thought data. (Hyung Won Chung et al., 2022)
  - > We find task balancing and enrichment techniques are overlooked but critical to effective instruction tuning, and in particular, training with mixed prompt settings (zero-shot, few-shot, and chain-of-thought) actually yields stronger (2%+) performance in all settings. (Shayne Longpre et al., 2023)
- **2023 · popularized**: [Tree of Thoughts: Deliberate Problem Solving with Large Language Models](https://doi.org/10.52202/075280-0517). Generalized CoT into a family of structured-thought prompting frameworks.
  - > To surmount these challenges, we introduce a new framework for language model inference, Tree of Thoughts (ToT), which generalizes over the popular Chain of Thought approach to prompting language models, and enables exploration over coherent units of text (thoughts) that serve as intermediate steps toward problem solving. (Shunyu Yao et al., 2023)
  - > We introduce Graph of Thoughts (GoT): a framework that advances prompting capabilities in large language models (LLMs) beyond those offered by paradigms such as Chain-of-Thought or Tree of Thoughts (ToT). (Maciej Besta et al., 2024)
- **2023 · critique**: [Language Models Don't Always Say What They Think: Unfaithful Explanations in Chain-of-Thought Prompting](https://doi.org/10.52202/075280-3275). Showed that CoT explanations can be unfaithful to the model's actual reasoning.
  - > Large Language Models (LLMs) can achieve strong performance on many tasks by producing step-by-step reasoning before giving a final output, often referred to as chain-of-thought reasoning (CoT). (Miles Turpin et al., 2023)
  - > Large language models (LLMs) perform better when they produce step-by-step, "Chain-of-Thought" (CoT) reasoning before answering a question, but it is unclear if the stated reasoning is a faithful explanation of the model's actual reasoning (i.e., its process for answering the question). (Tamera Lanham et al., 2023)
- **2023 · applied**: [RT-2: Vision-Language-Action Models Transfer Web Knowledge to Robotic Control](https://doi.org/10.48550/arxiv.2307.15818). Carried CoT reasoning into robotic control and multimodal settings.
  - > We further show that incorporating chain of thought reasoning allows RT-2 to perform multi-stage semantic reasoning, for example figuring out which object to pick up for use as an improvised hammer (a rock), or which type of drink is best suited for someone who is tired (an energy drink). (Anthony Brohan et al., 2023)
  - > Large language models (LLMs) have shown impressive performance on complex reasoning by leveraging chain-of-thought (CoT) prompting to generate intermediate reasoning chains as the rationale to infer the answer. (Zhuosheng Zhang et al., 2023)
- **2024 · redefined**: [OpenAI o1 System Card](https://doi.org/10.48550/arxiv.2412.16720). CoT became a reasoning process that models are trained to use through large-scale reinforcement learning, leading to 'long CoT' reasoning models.
  - > The o1 model series is trained with large-scale reinforcement learning to reason using chain of thought. (OpenAI et al., 2024)
  - > These models employ extended chain-of-thought (CoT) processes, exploring multiple strategies to enhance problem-solving capabilities. (Xingyu Chen et al., 2024)
- **2024 · critique**: [To CoT or not to CoT? Chain-of-thought helps mainly on math and symbolic reasoning](https://doi.org/10.48550/arxiv.2409.12183). Questioned how general CoT's benefits are, finding they come mainly in math and symbolic reasoning.
  - > Chain-of-thought (CoT) via prompting is the de facto method for eliciting reasoning capabilities from large language models (LLMs). (Zayne Sprague et al., 2024)
  - > In addition, code-pretraining greatly benefits strategic reasoning, while advanced reasoning methods such as Chain-of-Thought (CoT) and Tree-of-Thought (ToT) do not always help. (Jinhao Duan et al., 2024)
- **2025 · popularized**: [DeepSeek-R1 incentivizes reasoning in LLMs through reinforcement learning](https://doi.org/10.1038/s41586-025-09422-z). Highly cited reasoning model that, along with o1, is credited with scaling up long CoT reasoning through reinforcement learning.
  - > Recent breakthroughs, exemplified by large language models (LLMs) 1,2 and chain-of-thought (CoT) prompting 3 , have achieved considerable success on foundational reasoning tasks. (Daya Guo et al., 2025)
  - > Chain-of-Thought (CoT) has been proven effective in enhancing the reasoning capabilities of large language models (LLMs).Recent advancements, such as OpenAI's o1 and DeepSeek-R1, suggest that scaling up the length of CoT sequences during inference could further boost LLM reasoning performance.However, due to the autoregressive nature of LLM decoding, longer CoT outputs lead to a linear increase in inference latency, adversely affecting user expe… (Heming Xia et al., 2025)
- **2025 · applied**: [Chain of Thought Monitorability: A New and Fragile Opportunity for AI Safety](https://doi.org/10.48550/arxiv.2507.11473). Framed CoT as a means of monitoring model intentions for AI safety.
  - > Chain of Thought Monitorability: A New and Fragile Opportunity for AI Safety (Tomek Korbak et al., 2025)
  - > Chain-of-thought (CoT) offers a potential boon for AI safety as it allows monitoring a model's CoT to try to understand its intentions and reasoning processes. (Yanda Chen et al., 2025)

> Eras and milestones were proposed by `claude-opus-5-5` from the quoted sentences only. Check the quotes.

Generated by [idealine](https://github.com/Yilinista/idealine) from OpenAlex data.
