# recursive self-improvement: where it came from

Recursive self-improvement began in the AGI and singularity literature of the early 2010s as the idea that an AI could repeatedly improve its own design, possibly triggering an intelligence explosion that raised safety and ethics worries. Today it mostly names a concrete, benchmarked engineering goal: LLM agents and AI research systems that turn feedback into lasting improvements to themselves, their harnesses, or the process of building AI.

760 papers in OpenAlex use this term (2007–2026); 61 sentences read.

## Eras

- **2010–2015 · Formal limits and AGI safety**: A hypothetical capability of AGI programs to rewrite themselves, studied through formal definitions, complexity limits, and proposals to keep early self-improvement slow and human-guided.
- **2014–2021 · Singularity and catastrophe driver**: The mechanism behind a hypothetical intelligence explosion and technological singularity, invoked in risk models, ethics, and broader social commentary.
- **2022–2024 · Partial self-improvement in practice**: Concrete systems such as self-modifying networks, self-improving code scaffolds, and language-game learning were presented as partial or prototype forms of recursive self-improvement, alongside continued governance debate.
- **2025–2026 · Agentic RSI engineering**: A measurable research program in which LLM agents, harnesses, and AI research loops improve themselves and the process of building AI, evaluated with dedicated benchmarks.

## Milestones

- **2010 · origin**: [A Model for Recursively Self Improving Programs](https://openalex.org/W2114098175). The earliest evidence gives a formal definition of recursively self-improving programs and argues that their complexity growth is limited.
  - > We formally define recursively self improving programs and show that such programs exist, but that their algorithmic complexity cannot grow faster than O(log n) given fixed goals. (Matt B. Mahoney, 2010)
  - > Of central importance is an understanding of the limits of recursive self improvement (RSI). (Matt B. Mahoney, 2010)
- **2012 · applied**: [Nine Ways to Bias Open-Source AGI Toward Friendliness](https://openalex.org/W2325164173). It frames recursive self-improvement as a safety concern and recommends that its early stages proceed slowly with human involvement.
  - > Ensure that the early stages of recursive self-improvement occur relatively slowly and with rich human involvement. 5. (Ben Goertzel et al., 2012)
  - > The chapter creates stable, hierarchy-dominated goal systems, and ensures that the early stages of recursive self-improvement occur relatively slowly and with rich human involvement. (Ben Goertzel et al., 2014)
- **2013 · applied**: [Bounded Recursive Self-Improvement](https://doi.org/10.48550/arxiv.1312.6764). It describes an architecture meant to achieve self-improvement within designer-imposed boundaries, making it the most-cited early work in the evidence.
  - > Through value-driven dynamic priority scheduling controlling the parallel execution of a vast number of reasoning threads, the system achieves recursive self-improvement after it leaves the lab, within the boundaries imposed by its designers. (Eric Nivel et al., 2013)
- **2015 · popularized**: [From Seed AI to Technological Singularity via Recursively Self-Improving Software](https://doi.org/10.48550/arxiv.1502.06512). It surveys the literature, defines the term, and introduces an RSI Convergence Theory, tying it to the singularity.
  - > In this work we provide definitions for Recursively Self-Improving software, survey different types of self-improving software, review the relevant literature, analyze limits on computation restricting recursive self-improvement and introduce RSI Convergence Theory which aims to predict general behavior of RSI systems. (Roman V. Yampolskiy, 2015)
- **2016 · applied**: [A model of pathways to artificial superintelligence catastrophe for risk and decision analysis](https://doi.org/10.1080/0952813x.2016.1186228). It brought recursive self-improvement into formal risk and decision analysis as a pathway to superintelligence catastrophe.
  - > This paper presents a graphical model of major pathways to ASI catastrophe, focusing on ASI created via recursive self-improvement. (Anthony Michael Barrett et al., 2016)
- **2022 · redefined**: [A Modern Self-Referential Weight Matrix That Learns to Modify Itself](https://doi.org/10.48550/arxiv.2202.05780). It ties the term to concrete neural networks that meta-learn to learn, recursively.
  - > In principle, such NNs can meta-learn to learn, and meta-meta-learn to meta-learn to learn, and so on, in the sense of recursive self-improvement. (Kazuki Irie et al., 2022)
- **2023 · critique**: [Self-Taught Optimizer (STOP): Recursively Self-Improving Code Generation](https://doi.org/10.48550/arxiv.2310.02304). This highly cited work on self-improving code scaffolds itself cautions that, because the language model is unchanged, its method is not full recursive self-improvement.
  - > Since the language models themselves are not altered, this is not full recursive self-improvement. (Eric Zelikman et al., 2023)
- **2025 · critique**: [Will Compute Bottlenecks Prevent an Intelligence Explosion?](https://doi.org/10.48550/arxiv.2507.23181). It questions whether a software-only intelligence explosion driven by RSI is possible given compute limits.
  - > The possibility of a rapid, "software-only" intelligence explosion brought on by AI's recursive self-improvement (RSI) is a subject of intense debate within the AI community. (Parker Whitfill et al., 2025)
- **2026 · popularized**: [A Survey of Agentic Reasoning for Large Language Models: Towards Recursively Self-Improving and Collective Agents](https://doi.org/10.48550/arxiv.2601.12538). This widely cited survey frames recursively self-improving LLM agents as a central research direction, during a year with a surge of papers on the term.
  - > A Survey of Agentic Reasoning for Large Language Models: Towards Recursively Self-Improving and Collective Agents (Tianxin Wei et al., 2026)
- **2026 · redefined**: [AI4AI-Bench: Benchmarking LLM Agents in Algorithmic Design for Recursive Self-Improvement](https://doi.org/10.48550/arxiv.2608.20318). It recasts RSI as AI improving the process that produces AI, measured through benchmarks.
  - > Recursive self-improvement (RSI) asks whether an AI system can improve the process that produces AI systems, so that the next system inherits the improvement. (Yizhe Chi et al., 2026)
  - > Recursive self-improvement (RSI) requires AI systems that improve the process of building AI (i.e., AI4AI); machine learning engineering (MLE) offers a concrete, executable testbed for studying this capability. (Junlin Yang et al., 2026)
- **2026 · critique**: [Recursive Self-Improvement in AI: From Bounded Self-Refinement to Autonomous Research Loops](https://doi.org/10.48550/arxiv.2607.07663). It separates practical bounded self-refinement from open-ended RSI, which it argues remains limited by grounding requirements, collapse dynamics, and compute.
  - > The taxonomy separates bounded self-refinement -- convergent, evaluable, and industrial practice -- from open-ended recursive self-improvement (RSI), which remains bounded by grounding requirements, collapse dynamics, and compute constraints on every measured axis. (Mingguang Chen et al., 2026)

> Eras and milestones were proposed by `claude-opus-5-5` from the quoted sentences only. Check the quotes.

Generated by [idealine](https://github.com/Yilinista/idealine) from OpenAlex data.
