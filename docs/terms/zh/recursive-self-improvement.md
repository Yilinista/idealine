# recursive self-improvement: where it came from

“递归自我改进”最早出现在通用人工智能（AGI）与技术奇点的讨论中，指AI不断改进自身、进而可能引发“智能爆炸”的假想过程，也是AI安全研究关注的风险来源。到2025—2026年，它主要成为一个工程术语，指大模型智能体通过自身经验、反馈和验证循环，迭代改进其代码、外围框架（harness）、技能、训练数据乃至后训练流程的具体系统与基准。

707 papers in OpenAlex use this term (2007–2026); 156 sentences read.

## Eras

- **2007–2015 · AGI理论与安全设想**: 指通用人工智能修改自身、逐级变强的理论过程，讨论集中在其极限、可控性，以及如何让早期阶段缓慢进行并保持人类参与。
- **2015–2021 · 奇点叙事与风险分析**: 该词成为技术奇点和“智能爆炸”的标准定义要素，被用于超级智能灾难路径建模、伦理讨论和大众科普。
- **2022–2024 · 元学习与LLM雏形**: 开始与具体机器学习方法挂钩，如自指权重矩阵、自我改进的代码生成和语言博弈，同时被区分为“完整”与“不完整”的递归自我改进。
- **2025–2026 · 智能体工程范式**: 指LLM智能体利用自身经验与验证信号迭代改进框架、技能、记忆、数据和后训练流程的具体方法，并扩展到机器人、医疗、视频等领域，配套出现基准、分级标准与安全评估。

## Milestones

- **2010 · origin**: [A Model for Recursively Self Improving Programs](https://openalex.org/W2114098175). 证据中最早明确使用该术语（及缩写RSI）的论文，关注递归自我改进的理论极限。
  - > Of central importance is an understanding of the limits of recursive self improvement (RSI). (Matt B. Mahoney, 2010)
- **2012 · applied**: [Nine Ways to Bias Open-Source AGI Toward Friendliness](https://openalex.org/W2325164173). 将递归自我改进纳入AGI友好性与安全设计，主张早期阶段应缓慢并有丰富的人类参与。
  - > Ensure that the early stages of recursive self-improvement occur relatively slowly and with rich human involvement. 5. (Ben Goertzel et al., 2012)
  - > The chapter creates stable, hierarchy-dominated goal systems, and ensures that the early stages of recursive self-improvement occur relatively slowly and with rich human involvement. (Ben Goertzel et al., 2014)
- **2013 · redefined**: [Bounded Recursive Self-Improvement](https://doi.org/10.48550/arxiv.1312.6764). 提出在设计者设定边界内实现的“有界”递归自我改进，为后来的有界/开放式区分埋下伏笔。
  - > Through value-driven dynamic priority scheduling controlling the parallel execution of a vast number of reasoning threads, the system achieves recursive self-improvement after it leaves the lab, within the boundaries imposed by its designers. (Eric Nivel et al., 2013)
- **2015 · popularized**: [From Seed AI to Technological Singularity via Recursively Self-Improving Software](https://doi.org/10.48550/arxiv.1502.06512). 系统给出递归自我改进软件的定义、分类与收敛理论，把概念与种子AI和奇点联系起来。
  - > In this work we provide definitions for Recursively Self-Improving software, survey different types of self-improving software, review the relevant literature, analyze limits on computation restricting recursive self-improvement and introduce RSI Convergence Theory which aims to predict general behavior of RSI systems. (Roman V. Yampolskiy, 2015)
- **2016 · applied**: [A model of pathways to artificial superintelligence catastrophe for risk and decision analysis](https://doi.org/10.1080/0952813x.2016.1186228). 把递归自我改进作为超级智能灾难的主要路径进行风险与决策建模，成为该时期引用较多的风险研究。
  - > This paper presents a graphical model of major pathways to ASI catastrophe, focusing on ASI created via recursive self-improvement. (Anthony Michael Barrett et al., 2016)
  - > This paper presents a graphical model of major pathways to ASI catastrophe, focusing on ASI created via recursive self-improvement. (Anthony Michael Barrett et al., 2016)
- **2022 · redefined**: [A Modern Self-Referential Weight Matrix That Learns to Modify Itself](https://doi.org/10.48550/arxiv.2202.05780). 将递归自我改进解释为神经网络的元学习、元元学习层层递进，使概念落到具体网络结构上。
  - > In principle, such NNs can meta-learn to learn, and meta-meta-learn to meta-learn to learn, and so on, in the sense of recursive self-improvement. (Kazuki Irie et al., 2022)
- **2023 · critique**: [Self-Taught Optimizer (STOP): Recursively Self-Improving Code Generation](https://doi.org/10.48550/arxiv.2310.02304). 实现了自我改进的代码生成，但明确指出因语言模型本身未被修改，这还不是完整的递归自我改进。
  - > Since the language models themselves are not altered, this is not full recursive self-improvement. (Eric Zelikman et al., 2023)
- **2026 · popularized**: [Recursive Self-Improvement in AI: From Bounded Self-Refinement to Autonomous Research Loops](https://doi.org/10.48550/arxiv.2607.07663). 区分有界自我精炼与开放式递归自我改进，并指出后者受接地、崩溃动态和算力约束，是爆发期被广泛引用的综述。
  - > The taxonomy separates bounded self-refinement -- convergent, evaluable, and industrial practice -- from open-ended recursive self-improvement (RSI), which remains bounded by grounding requirements, collapse dynamics, and compute constraints on every measured axis. (Mingguang Chen et al., 2026)
- **2026 · redefined**: [The Path to Recursive Self-Improving Agents: Foundation, Framework, and Future Directions](https://doi.org/10.20944/preprints202608.0051.v1). 提出从人工改进到通用递归自我改进的五级分级标准，其“第4级有界递归自我改进”被后续工作作为检验标准引用。
  - > To compare the self-improvement capabilities of diverse agent systems, we introduce a five-level grading standard, ranging from manual improvement to general recursive self-improvement. (Shuaiqi Liu et al., 2026)
  - > We instead test a self-modifying runtime module against a published capability definition: Level 4, bounded recursive self-improvement, in the taxonomy of Liu et al. (Junai P. Felix, 2026)
- **2026 · applied**: [RRSI: Regularized Recursive Self-Improvement of Agent Harnesses](https://doi.org/10.48550/arxiv.2609.24972). 代表将递归自我改进具体化为对智能体外围框架（harness）的迭代编辑与选择这一主流工程路线。
  - > Recent methods increasingly automate this process by iteratively proposing and selecting component-wise edits of an agent harness, practically establishing a form of recursive self-improvement (RSI) at the agent-system level. (Peng Xia et al., 2026)
  - > We introduce Regularized Recursive Self-Improvement of Agent Harnesses (RRSI), which incorporates the principles of regularizations into harness self-improvement by constraining the evolution candidate proposal and selection. (Peng Xia et al., 2026)
- **2026 · applied**: [Who Improves the Robot? Toward Physical Recursive Self-Improvement](https://doi.org/10.48550/arxiv.2610.18842). 把概念延伸到机器人领域，提出由物理经验同时改进能力与改进过程的“物理递归自我改进”。
  - > This study investigates Physical Recursive Self-Improvement (Physical RSI), in which physical experience guides lasting updates to both a robot's capabilities and its improvement procedure, making subsequent improvement more effective across tasks. (Zhou Hai et al., 2026)
  - > In this paper, we systematically investigate the mechanisms, scaling behavior, and generalization of physical Recursive self-improvement. (Zekai Li et al., 2026)
- **2026 · critique**: [Auditing the Product, Not the Recursion: The Evaluation Evidence Behind Recursive Self-Improvement Claims](https://doi.org/10.48550/arxiv.2610.27610). 质疑现有递归自我改进主张的评估证据，与安全不可验证性等研究一起构成对热潮的反思。
  - > Recursive self-improvement (RSI) promises AI systems, such as self-evolving LLM agents, that become better at producing further improvements. (Zihan Chen et al., 2026)
  - > Self-modifying systems (agents that rewrite their own code, recursive self-improvement loops) raise a different question: can a safety property that holds now be certified, in advance, to keep holding after the system rewrites itself? (José Pascual Gumbau Mezquita, 2026)

> Eras and milestones were proposed by `claude-opus-5-5` from the quoted sentences only. Check the quotes.

Generated by [idealine](https://github.com/Yilinista/idealine) from OpenAlex data.
