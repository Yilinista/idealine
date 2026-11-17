# recursive self-improvement: where it came from

The term first appeared in AGI and singularity writing, where it named a hypothetical AI that keeps improving itself until an intelligence explosion, raising safety concerns. Today it mostly names practical loops, frameworks and benchmarks in which LLM agents, harnesses, robots or post-training pipelines turn their own experience and failures into lasting improvements.

707 papers in OpenAlex use this term (2007–2026); 156 sentences read.

## Eras

- **2007–2019 · AGI and singularity speculation**: RSI named a hypothetical AGI ability to keep improving itself, leading to an intelligence explosion and calling for safety and friendliness safeguards.
- **2020–2024 · First machine-learning instantiations**: The idea began to be attached to concrete learning systems, such as self-modifying neural networks, self-improving code generators and language-game agents, while the speculative framing persisted.
- **2025–2025 · Debate meets practice**: RSI was both debated as a path to singularity, with formal and economic models, and cited as a practical mechanism, for example self-evolving models and code-modifying agents.
- **2026–2026 · Agentic RSI engineering boom**: RSI became a mainstream engineering label for agent, harness, post-training and robotics loops, alongside benchmarks, taxonomies and audits that operationalize it.

## Milestones

- **2010 · origin**: [A Model for Recursively Self Improving Programs](https://openalex.org/W2114098175). This is the earliest evidence in which the limits of RSI are posed as a central question for self-improving programs.
  - > Of central importance is an understanding of the limits of recursive self improvement (RSI). (Matt B. Mahoney, 2010)
- **2013 · ancestor**: [Bounded Recursive Self-Improvement](https://doi.org/10.48550/arxiv.1312.6764). It presented an architecture achieving bounded RSI within designer-imposed limits, and the 'bounded' notion is reused in later taxonomies.
  - > Through value-driven dynamic priority scheduling controlling the parallel execution of a vast number of reasoning threads, the system achieves recursive self-improvement after it leaves the lab, within the boundaries imposed by its designers. (Eric Nivel et al., 2013)
- **2015 · popularized**: [From Seed AI to Technological Singularity via Recursively Self-Improving Software](https://doi.org/10.48550/arxiv.1502.06512). It provided definitions, a survey and RSI Convergence Theory, consolidating RSI as a subject of study.
  - > In this work we provide definitions for Recursively Self-Improving software, survey different types of self-improving software, review the relevant literature, analyze limits on computation restricting recursive self-improvement and introduce RSI Convergence Theory which aims to predict general behavior of RSI systems. (Roman V. Yampolskiy, 2015)
- **2022 · redefined**: [A Modern Self-Referential Weight Matrix That Learns to Modify Itself](https://doi.org/10.48550/arxiv.2202.05780). It tied RSI to neural networks that meta-learn to learn, moving the idea into trainable models.
  - > In principle, such NNs can meta-learn to learn, and meta-meta-learn to meta-learn to learn, and so on, in the sense of recursive self-improvement. (Kazuki Irie et al., 2022)
- **2023 · applied**: [Self-Taught Optimizer (STOP): Recursively Self-Improving Code Generation](https://doi.org/10.48550/arxiv.2310.02304). This highly cited work applied RSI to LLM-driven code generation while noting that it was not full RSI.
  - > Since the language models themselves are not altered, this is not full recursive self-improvement. (Eric Zelikman et al., 2023)
- **2025 · critique**: [Will Compute Bottlenecks Prevent an Intelligence Explosion?](https://doi.org/10.48550/arxiv.2507.23181). It questioned whether software-only RSI could produce an intelligence explosion given compute limits.
  - > The possibility of a rapid, "software-only" intelligence explosion brought on by AI's recursive self-improvement (RSI) is a subject of intense debate within the AI community. (Parker Whitfill et al., 2025)
- **2026 · popularized**: [Recursive Self-Improvement in AI: From Bounded Self-Refinement to Autonomous Research Loops](https://doi.org/10.48550/arxiv.2607.07663). This widely cited taxonomy separated bounded self-refinement from open-ended RSI and framed the 2026 literature.
  - > The taxonomy separates bounded self-refinement -- convergent, evaluable, and industrial practice -- from open-ended recursive self-improvement (RSI), which remains bounded by grounding requirements, collapse dynamics, and compute constraints on every measured axis. (Mingguang Chen et al., 2026)
- **2026 · redefined**: [RSIBench-Data: Benchmarking Data-Centric Research for Recursive Self-Improvement](https://doi.org/10.48550/arxiv.2607.25886). RSI was operationalized as a measurable capability of AI improving AI-building, with benchmarks and testbeds.
  - > Recursive self-improvement requires turning evidence of model failures into better models. (Fanqing Meng et al., 2026)
  - > RSIBench-Data provides a measurable, auditable testbed for the research capabilities required for recursive self-improvement. (Fanqing Meng et al., 2026)
- **2026 · applied**: [RRSI: Regularized Recursive Self-Improvement of Agent Harnesses](https://doi.org/10.48550/arxiv.2609.24972). RSI was extended to iterative self-editing of agent harnesses, which became a dominant usage.
  - > Recent methods increasingly automate this process by iteratively proposing and selecting component-wise edits of an agent harness, practically establishing a form of recursive self-improvement (RSI) at the agent-system level. (Peng Xia et al., 2026)
  - > We introduce Regularized Recursive Self-Improvement of Agent Harnesses (RRSI), which incorporates the principles of regularizations into harness self-improvement by constraining the evolution candidate proposal and selection. (Peng Xia et al., 2026)
- **2026 · applied**: [Who Improves the Robot? Toward Physical Recursive Self-Improvement](https://doi.org/10.48550/arxiv.2610.18842). It introduced 'Physical RSI', carrying the concept into robotics and embodied agents.
  - > This study investigates Physical Recursive Self-Improvement (Physical RSI), in which physical experience guides lasting updates to both a robot's capabilities and its improvement procedure, making subsequent improvement more effective across tasks. (Zhou Hai et al., 2026)
  - > We introduce EmbodiRSI, an agentic system for recursive self-improvement (RSI) in a real-to-sim-to-real setting, where task-specific simulations are constructed from target deployment scenarios and used as low-cost environments for iterative policy improvement before transfer back to the physical world. (Haoran Lang et al., 2026)
- **2026 · critique**: [Auditing the Product, Not the Recursion: The Evaluation Evidence Behind Recursive Self-Improvement Claims](https://doi.org/10.48550/arxiv.2610.27610). It challenged whether RSI claims are backed by evidence that systems improve at improving, echoing concerns about author-chosen criteria.
  - > Recursive self-improvement (RSI) promises AI systems, such as self-evolving LLM agents, that become better at producing further improvements. (Zihan Chen et al., 2026)
  - > Claims of recursive self-improvement (RSI) are usually judged against criteria chosen by their authors. (Junai P. Felix, 2026)

> Eras and milestones were proposed by `claude-opus-5-5` from the quoted sentences only. Check the quotes.

Generated by [idealine](https://github.com/Yilinista/idealine) from OpenAlex data.
