# recursive self-improvement: where it came from

“递归自我改进”最初出现在 2010 年代关于通用人工智能、技术奇点和智能爆炸的理论与安全讨论中，指机器不断改写自身、变得越来越聪明。到 2025–2026 年，它主要指一类工程方法与基准：大语言模型智能体通过反思、改写框架或自主后训练，把失败经验转化为持续的能力提升，并让下一轮改进做得更好。

707 papers in OpenAlex use this term (2007–2026); 156 sentences read.

## Eras

- **2010–2018 · AGI 奇点理论设想**: 该词主要指假想中通用人工智能反复改写自身、导致智能爆炸或奇点的过程，讨论集中于理论极限与安全风险。
- **2020–2024 · 机器学习初步实现**: 研究者开始在神经网络元学习、语言模型代码生成与自博弈中尝试部分实现递归自我改进，同时承认尚非“完整”的递归自改。
- **2025–2025 · 大模型时代的过渡**: 该词同时用于评估大语言模型能否触发奇点的理论框架，以及让系统自主精炼能力的具体方法，如修改自身代码的智能体。
- **2026–2026 · 智能体工程化爆发**: 该词成为一类主流工程范式与基准名称，指智能体通过改写框架、技能、记忆或自主后训练，把经验转化为持续改进并提升后续改进能力，并扩展到机器人、医疗、视频等领域。

## Milestones

- **2010 · origin**: [A Model for Recursively Self Improving Programs](https://openalex.org/W2114098175). 证据中最早的用例，以程序模型讨论递归自我改进（RSI）的极限。
  - > Of central importance is an understanding of the limits of recursive self improvement (RSI). (Matt B. Mahoney, 2010)
- **2013 · ancestor**: [Bounded Recursive Self-Improvement](https://doi.org/10.48550/arxiv.1312.6764). 提出在设计者设定边界内实现递归自我改进的系统架构，“有界”思路后来在工程化研究中反复出现。
  - > Through value-driven dynamic priority scheduling controlling the parallel execution of a vast number of reasoning threads, the system achieves recursive self-improvement after it leaves the lab, within the boundaries imposed by its designers. (Eric Nivel et al., 2013)
- **2015 · ancestor**: [From Seed AI to Technological Singularity via Recursively Self-Improving Software](https://doi.org/10.48550/arxiv.1502.06512). 为递归自我改进软件给出定义、分类与 RSI 收敛理论，成为后续讨论的理论基础。
  - > In this work we provide definitions for Recursively Self-Improving software, survey different types of self-improving software, review the relevant literature, analyze limits on computation restricting recursive self-improvement and introduce RSI Convergence Theory which aims to predict general behavior of RSI systems. (Roman V. Yampolskiy, 2015)
- **2016 · popularized**: [A model of pathways to artificial superintelligence catastrophe for risk and decision analysis](https://doi.org/10.1080/0952813x.2016.1186228). 把递归自我改进作为超级智能灾难路径与奇点定义的核心，使该词在风险与奇点话语中广泛传播。
  - > The technological singularity is defined as a hy- pothetical event in which artificial intelligence would be capable of recursive self-improvement or of autonomously building smarter and more pow- erful machines than itself, up to the point of an “in- telligence explosion”, that yields an intelligence sur- passing all current human control or understanding. (Basarab Nicolescu, 2016)
  - > This paper presents a graphical model of major pathways to ASI catastrophe, focusing on ASI created via recursive self-improvement. (Anthony Michael Barrett et al., 2016)
- **2022 · applied**: [A Modern Self-Referential Weight Matrix That Learns to Modify Itself](https://doi.org/10.48550/arxiv.2202.05780). 将递归自我改进落到可训练的自指神经网络上，以元学习、元元学习的层级来实现。
  - > In principle, such NNs can meta-learn to learn, and meta-meta-learn to meta-learn to learn, and so on, in the sense of recursive self-improvement. (Kazuki Irie et al., 2022)
- **2023 · redefined**: [Self-Taught Optimizer (STOP): Recursively Self-Improving Code Generation](https://doi.org/10.48550/arxiv.2310.02304). 在语言模型代码生成中实现自我改进的框架，并明确区分这种不改动模型本身的做法与“完整”递归自改，被大量后续工作引用。
  - > Since the language models themselves are not altered, this is not full recursive self-improvement. (Eric Zelikman et al., 2023)
- **2024 · applied**: [Boundless Socratic Learning with Language Games](https://doi.org/10.48550/arxiv.2411.16905). 将纯粹的递归自我改进表述为语言智能体之间的“苏格拉底式学习”，主张性能可远超初始数据。
  - > Considering the special case of agents with matching input and output spaces (namely, language), we argue that such pure recursive self-improvement, dubbed "Socratic learning", can boost performance vastly beyond what is present in its initial data or knowledge, and is only limited by time, as well as gradual misalignment concerns. (Tom Schaul, 2024)
- **2025 · applied**: [Highlights of the Issue: Governance, Agents, Evolutionary Search](https://doi.org/10.70777/si.v2i3.15417). 以修改自身代码的 Darwin Gödel Machine 为例，把递归自我改进视为通向 AGI 的可观测信号。
  - > First, recursive self-improvement is a strong signal of progress toward AGI/SI; the Darwin Gödel Machine (DGM) modifies its own code. (Kristen W. Carlson, 2025)
- **2026 · redefined**: [Recursive Self-Improvement in AI: From Bounded Self-Refinement to Autonomous Research Loops](https://doi.org/10.48550/arxiv.2607.07663). 高被引综述区分有界自我精炼与开放式递归自我改进，为工程化研究提供分类框架。
  - > The taxonomy separates bounded self-refinement -- convergent, evaluable, and industrial practice -- from open-ended recursive self-improvement (RSI), which remains bounded by grounding requirements, collapse dynamics, and compute constraints on every measured axis. (Mingguang Chen et al., 2026)
  - > We distinguish task-level refinement, lasting self-improvement, and recursive self-improvement, which also requires a better capacity to make further improvements. (Deheng Ye et al., 2026)
- **2026 · popularized**: [Recursive self-improvement of AI research agents](https://doi.org/10.48550/arxiv.2609.26457). 把 AI 研究智能体提升自身研究效率的循环称作递归自我改进，并显示收益可迁移，代表该词在智能体研究中的普及。
  - > We refer to this loop as recursive self-improvement. (Dhruv Srikanth et al., 2026)
  - > Together, these results show that an AI research agent can improve its own research efficiency through recursive self-improvement, and that these gains transfer to tasks and domains the loop never encountered. (Dhruv Srikanth et al., 2026)
- **2026 · applied**: [Who Improves the Robot? Toward Physical Recursive Self-Improvement](https://doi.org/10.48550/arxiv.2610.18842). 提出“物理递归自我改进”，把这一概念扩展到由物理经验驱动的机器人能力与改进流程更新。
  - > This study investigates Physical Recursive Self-Improvement (Physical RSI), in which physical experience guides lasting updates to both a robot's capabilities and its improvement procedure, making subsequent improvement more effective across tasks. (Zhou Hai et al., 2026)
  - > We introduce EmbodiRSI, an agentic system for recursive self-improvement (RSI) in a real-to-sim-to-real setting, where task-specific simulations are constructed from target deployment scenarios and used as low-cost environments for iterative policy improvement before transfer back to the physical world. (Haoran Lang et al., 2026)
- **2026 · critique**: [Auditing the Product, Not the Recursion: The Evaluation Evidence Behind Recursive Self-Improvement Claims](https://doi.org/10.48550/arxiv.2610.27610). 质疑现有递归自我改进论断的评估证据，指出这类论断往往由作者自选标准来判定。
  - > Recursive self-improvement (RSI) promises AI systems, such as self-evolving LLM agents, that become better at producing further improvements. (Zihan Chen et al., 2026)
  - > Claims of recursive self-improvement (RSI) are usually judged against criteria chosen by their authors. (Junai P. Felix, 2026)

> Eras and milestones were proposed by `claude-opus-5-5` from the quoted sentences only. Check the quotes.

Generated by [idealine](https://github.com/Yilinista/idealine) from OpenAlex data.
