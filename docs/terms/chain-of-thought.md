# chain-of-thought: where it came from

"Chain of thought" began as an everyday English phrase for a connected sequence of ideas or reasoning, used for decades in literature, history, and science writing. Since 2022 it has mostly meant a technique in which large language models generate intermediate reasoning steps before answering, first as a prompting method and now as a trained-in feature of reasoning models.

12091 papers in OpenAlex use this term (1914–2026); 131 sentences read.

## Eras

- **1914–2020 · Everyday linked reasoning**: A general idiom for a connected train of ideas, argument, or intellectual lineage in a person's or school's thinking.
- **2021–2022 · LLM prompting technique**: A method of prompting large language models with exemplars of intermediate reasoning steps to elicit better multi-step reasoning.
- **2023–2024 · Generalized reasoning paradigm**: CoT became a baseline reasoning approach extended to trees, graphs, retrieval, multimodal and robotic settings, while its faithfulness was questioned.
- **2024–2026 · Trained long reasoning traces**: Models are trained via reinforcement learning to produce long chains of thought before answering, raising issues of length, efficiency, latent reasoning, and monitoring.

## Milestones

- **1953 · origin**: [THE SECRETARY'S OFFICE](https://doi.org/10.1021/cen-v031n039.p4028). An early clear use of the phrase in its ordinary sense of a sequence of connected thoughts.
  - > What has started our chain of thought is the following: I have often observed that a small group or clique can run an organization once it gets into office. (ALDEN H. EMERY, 1953)
- **2006 · ancestor**: [Chained Thoughts Broken by Chains of Thought: An Analysis of the Narrative Style Used in Virginia Woolf's A Room of One's Own](https://openalex.org/W582236113). Explicitly ties 'chain of thought' to the older 'train of thought' idea of linked reflections.
  - > One of the most prominent stylistic means applied by Woolf is her ‘train of thought’, linking one reflection to another like wagons in a railway convoy or like loops in a chain (therefore also sometimes referred to as ‘chain of thought’ in dictionaries). (Ellen Johansson, 2006)
  - > By examining how different rhetorical devices are applied within this train or chain of thought and in which ways these strategies are linked to the main elements of persuasion (ethos, pathos and logos) in Aristotelian Rhetoric, I have found that one of Woolf’s central themes - the resentment against confinement and the advocacy of androgyny or mixed-gendered thinking - is mirrored in her style. (Ellen Johansson, 2006)
- **2021 · applied**: [A Minimalist Dataset for Systematic Generalization of Perception, Syntax, and Semantics](https://doi.org/10.48550/arxiv.2103.01403). Earliest evidence of 'chain of thought prompting' used with GPT-3 as a machine learning technique.
  - > To comprehend existing models' limitations, we undertake extensive experiments with various sequence-to-sequence models, including RNNs, Transformers, and GPT-3 (with the chain of thought prompting). (Li, Qing et al., 2021)
  - > Finally, in zero-shot GPT-3 experiments, the chain of thought prompting exhibits impressive results and significantly boosts the test accuracy. (Li, Qing et al., 2021)
- **2022 · coined**: [Chain-Of-Thought Prompting Elicits Reasoning in Large Language Models](https://doi.org/10.52202/068431-1800). Defined chain of thought as a series of intermediate reasoning steps and named chain of thought prompting; later cited as the reference for CoT.
  - > We explore how generating a chain of thought -- a series of intermediate reasoning steps -- significantly improves the ability of large language models to perform complex reasoning. (Jason Wei et al., 2022)
  - > In particular, we show how such reasoning abilities emerge naturally in sufficiently large language models via a simple method called chain of thought prompting, where a few chain of thought demonstrations are provided as exemplars in prompting. (Jason Wei et al., 2022)
- **2022 · popularized**: [Large Language Models Are Zero-Shot Reasoners](https://doi.org/10.52202/068431-1613). Brought CoT into zero-shot settings, framing it as a state-of-the-art technique for multi-step reasoning.
  - > Notably, chain of thought (CoT) prompting, a recent technique for eliciting complex multi-step reasoning through step-by-step answer examples, achieved the state-of-the-art performances in arithmetics and symbolic reasoning, difficult system-2 tasks that do not follow the standard scaling laws for LLMs. (Takeshi Kojima et al., 2022)
- **2022 · redefined**: [Scaling Instruction-Finetuned Language Models](https://doi.org/10.48550/arxiv.2210.11416). Shifted CoT from a prompting trick to training data used in finetuning.
  - > In this paper we explore instruction finetuning with a particular focus on (1) scaling the number of tasks, (2) scaling the model size, and (3) finetuning on chain-of-thought data. (Hyung Won Chung et al., 2022)
  - > We find task balancing and enrichment techniques are overlooked but critical to effective instruction tuning, and in particular, training with mixed prompt settings (zero-shot, few-shot, and chain-of-thought) actually yields stronger (2%+) performance in all settings. (Shayne Longpre et al., 2023)
- **2023 · redefined**: [Tree of Thoughts: Deliberate Problem Solving with Large Language Models](https://doi.org/10.52202/075280-0517). Generalized the chain into a tree of intermediate thoughts, spawning further variants like Graph of Thoughts.
  - > To surmount these challenges, we introduce a new framework for language model inference, Tree of Thoughts (ToT), which generalizes over the popular Chain of Thought approach to prompting language models, and enables exploration over coherent units of text (thoughts) that serve as intermediate steps toward problem solving. (Shunyu Yao et al., 2023)
  - > We introduce Graph of Thoughts (GoT): a framework that advances prompting capabilities in large language models (LLMs) beyond those offered by paradigms such as Chain-of-Thought or Tree of Thoughts (ToT). (Maciej Besta et al., 2024)
- **2023 · critique**: [Language Models Don't Always Say What They Think: Unfaithful Explanations in Chain-of-Thought Prompting](https://doi.org/10.52202/075280-3275). Challenged whether stated CoT reasoning faithfully reflects the model's actual process.
  - > Large Language Models (LLMs) can achieve strong performance on many tasks by producing step-by-step reasoning before giving a final output, often referred to as chain-of-thought reasoning (CoT). (Miles Turpin et al., 2023)
  - > Large language models (LLMs) perform better when they produce step-by-step, "Chain-of-Thought" (CoT) reasoning before answering a question, but it is unclear if the stated reasoning is a faithful explanation of the model's actual reasoning (i.e., its process for answering the question). (Tamera Lanham et al., 2023)
- **2023 · applied**: [RT-2: Vision-Language-Action Models Transfer Web Knowledge to Robotic Control](https://doi.org/10.48550/arxiv.2307.15818). Moved chain-of-thought reasoning into robotic control and multimodal settings.
  - > We further show that incorporating chain of thought reasoning allows RT-2 to perform multi-stage semantic reasoning, for example figuring out which object to pick up for use as an improvised hammer (a rock), or which type of drink is best suited for someone who is tired (an energy drink). (Anthony Brohan et al., 2023)
  - > Large language models (LLMs) have shown impressive performance on complex reasoning by leveraging chain-of-thought (CoT) prompting to generate intermediate reasoning chains as the rationale to infer the answer. (Zhuosheng Zhang et al., 2023)
- **2024 · redefined**: [OpenAI o1 System Card](https://doi.org/10.48550/arxiv.2412.16720). Recast CoT as something models are trained by reinforcement learning to produce before answering.
  - > The o1 model series is trained with large-scale reinforcement learning to reason using chain of thought. (OpenAI et al., 2024)
  - > Training models to incorporate a chain of thought before answering has the potential to unlock substantial benefits, while also increasing potential risks that stem from heightened intelligence. (OpenAI et al., 2024)
- **2024 · critique**: [Do NOT Think That Much for 2+3=? On the Overthinking of o1-Like LLMs](https://doi.org/10.48550/arxiv.2412.21187). Raised the problem of overthinking and token cost in extended chains of thought.
  - > These models employ extended chain-of-thought (CoT) processes, exploring multiple strategies to enhance problem-solving capabilities. (Xingyu Chen et al., 2024)
  - > Reasoning is critical for large language models (LLMs) to excel in a wide range of tasks.While methods like Chain-of-Thought (CoT) reasoning and enhance LLM performance by decomposing problems into intermediate steps, they also incur significant overhead in token usage, leading to increased costs.We find that the reasoning process of current LLMs is unnecessarily lengthy and it can be compressed by including a reasonable token budget in the prom… (Tingxu Han et al., 2025)
- **2025 · popularized**: [DeepSeek-R1 incentivizes reasoning in LLMs through reinforcement learning](https://doi.org/10.1038/s41586-025-09422-z). Highly cited work building on CoT prompting to incentivize reasoning through reinforcement learning, cementing the long-CoT era.
  - > Recent breakthroughs, exemplified by large language models (LLMs) 1,2 and chain-of-thought (CoT) prompting 3 , have achieved considerable success on foundational reasoning tasks. (Daya Guo et al., 2025)
  - > A central factor in their success lies in the application of long chain-of-thought (Long CoT) characteristics, which enhance reasoning abilities and enable the solution of intricate problems. (Qiguang Chen et al., 2026)

> Eras and milestones were proposed by `claude-opus-5-5` from the quoted sentences only. Check the quotes.

Generated by [idealine](https://github.com/Yilinista/idealine) from OpenAlex data.
