# recursive self-improvement: where it came from

In this evidence, recursive self-improvement first appears around 2010 as a theoretical idea from AGI and AI-safety writing: an AI that improves itself in ways that make it better at further improvement, possibly leading to an intelligence explosion or technological singularity. Since about 2023, and especially in 2025-2026, it mostly names practical engineering loops in which LLM agents, harnesses, or models use their own outputs, failures, and experiments to improve themselves, and these loops are measured with benchmarks and governed by safety frameworks.

707 papers in OpenAlex use this term (2007–2026); 156 sentences read.

## Eras

- **2010–2015 · Theoretical AGI self-modification**: RSI was a theoretical property of seed or general AI systems that modify themselves, studied for its limits and for how to keep goal systems friendly and stable across iterations.
- **2016–2021 · Singularity and catastrophe driver**: RSI was mainly invoked as the mechanism behind a hypothetical intelligence explosion, technological singularity, or superintelligence catastrophe, with occasional loose borrowing into other fields.
- **2022–2024 · Early machine-learning instantiations**: Researchers began linking RSI to concrete learning systems such as self-modifying neural networks, self-improving code generators, and language-game self-play, while noting these were only partial forms.
- **2025–2026 · Agentic engineering loops and benchmarks**: RSI became a broad research program and label for agent, harness, model, and robot frameworks that turn experience and failures into persistent improvements, alongside benchmarks, taxonomies, economic models, and safety studies.

## Milestones

- **2010 · origin**: [A Model for Recursively Self Improving Programs](https://openalex.org/W2114098175). This is the earliest evidence use; it names RSI and frames understanding its limits as central.
  - > Of central importance is an understanding of the limits of recursive self improvement (RSI). (Matt B. Mahoney, 2010)
- **2012 · applied**: [Nine Ways to Bias Open-Source AGI Toward Friendliness](https://openalex.org/W2325164173). It ties RSI to AI safety by recommending that the early stages of self-improvement proceed slowly and with rich human involvement.
  - > Ensure that the early stages of recursive self-improvement occur relatively slowly and with rich human involvement. 5. (Ben Goertzel et al., 2012)
  - > The chapter creates stable, hierarchy-dominated goal systems, and ensures that the early stages of recursive self-improvement occur relatively slowly and with rich human involvement. (Ben Goertzel et al., 2014)
- **2013 · redefined**: [Bounded Recursive Self-Improvement](https://doi.org/10.48550/arxiv.1312.6764). It recasts RSI as something an implemented system achieves within boundaries imposed by its designers.
  - > Through value-driven dynamic priority scheduling controlling the parallel execution of a vast number of reasoning threads, the system achieves recursive self-improvement after it leaves the lab, within the boundaries imposed by its designers. (Eric Nivel et al., 2013)
- **2015 · popularized**: [From Seed AI to Technological Singularity via Recursively Self-Improving Software](https://doi.org/10.48550/arxiv.1502.06512). It gives formal definitions, surveys types of self-improving software, analyzes computational limits, and proposes RSI Convergence Theory.
  - > In this work we provide definitions for Recursively Self-Improving software, survey different types of self-improving software, review the relevant literature, analyze limits on computation restricting recursive self-improvement and introduce RSI Convergence Theory which aims to predict general behavior of RSI systems. (Roman V. Yampolskiy, 2015)
- **2016 · applied**: [A model of pathways to artificial superintelligence catastrophe for risk and decision analysis](https://doi.org/10.1080/0952813x.2016.1186228). This highly cited paper puts RSI at the center of risk analysis as the route to catastrophic superintelligence.
  - > This paper presents a graphical model of major pathways to ASI catastrophe, focusing on ASI created via recursive self-improvement. (Anthony Michael Barrett et al., 2016)
  - > This paper presents a graphical model of major pathways to ASI catastrophe, focusing on ASI created via recursive self-improvement. (Anthony Michael Barrett et al., 2016)
- **2022 · redefined**: [A Modern Self-Referential Weight Matrix That Learns to Modify Itself](https://doi.org/10.48550/arxiv.2202.05780). It connects RSI to neural networks that meta-learn to learn at successive levels.
  - > In principle, such NNs can meta-learn to learn, and meta-meta-learn to meta-learn to learn, and so on, in the sense of recursive self-improvement. (Kazuki Irie et al., 2022)
- **2023 · critique**: [Self-Taught Optimizer (STOP): Recursively Self-Improving Code Generation](https://doi.org/10.48550/arxiv.2310.02304). This highly cited work builds a self-improving code generator but cautions that, because the language model itself is not altered, it is not full RSI.
  - > Since the language models themselves are not altered, this is not full recursive self-improvement. (Eric Zelikman et al., 2023)
- **2025 · applied**: [Highlights of the Issue: Governance, Agents, Evolutionary Search](https://doi.org/10.70777/si.v2i3.15417). It presents RSI, exemplified by the Darwin Gödel Machine modifying its own code, as a strong signal of progress toward AGI and as an active research theme.
  - > Recursive Self-Improvement (RSI) In the next issue we will publish more articles on RSI, for instance, using reinforcement learning (RL). (Kristen W. Carlson, 2025)
  - > First, recursive self-improvement is a strong signal of progress toward AGI/SI; the Darwin Gödel Machine (DGM) modifies its own code. (Kristen W. Carlson, 2025)
- **2025 · critique**: [Will Compute Bottlenecks Prevent an Intelligence Explosion?](https://doi.org/10.48550/arxiv.2507.23181). It addresses the intense debate over whether a software-only intelligence explosion driven by RSI is plausible given compute limits.
  - > The possibility of a rapid, "software-only" intelligence explosion brought on by AI's recursive self-improvement (RSI) is a subject of intense debate within the AI community. (Parker Whitfill et al., 2025)
- **2026 · redefined**: [Recursive Self-Improvement in AI: From Bounded Self-Refinement to Autonomous Research Loops](https://doi.org/10.48550/arxiv.2607.07663). Its taxonomy separates bounded self-refinement, which it calls industrial practice, from open-ended RSI, which it describes as still constrained.
  - > The taxonomy separates bounded self-refinement -- convergent, evaluable, and industrial practice -- from open-ended recursive self-improvement (RSI), which remains bounded by grounding requirements, collapse dynamics, and compute constraints on every measured axis. (Mingguang Chen et al., 2026)
- **2026 · popularized**: [RRSI: Regularized Recursive Self-Improvement of Agent Harnesses](https://doi.org/10.48550/arxiv.2609.24972). It reflects the dominant 2026 usage, in which iterative edits to agent harnesses count as practical RSI at the agent-system level.
  - > Recent methods increasingly automate this process by iteratively proposing and selecting component-wise edits of an agent harness, practically establishing a form of recursive self-improvement (RSI) at the agent-system level. (Peng Xia et al., 2026)
  - > We introduce Regularized Recursive Self-Improvement of Agent Harnesses (RRSI), which incorporates the principles of regularizations into harness self-improvement by constraining the evolution candidate proposal and selection. (Peng Xia et al., 2026)
- **2026 · applied**: [Who Improves the Robot? Toward Physical Recursive Self-Improvement](https://doi.org/10.48550/arxiv.2610.18842). It extends RSI to physical robots, where physical experience updates both a robot's capabilities and its improvement procedure.
  - > This study investigates Physical Recursive Self-Improvement (Physical RSI), in which physical experience guides lasting updates to both a robot's capabilities and its improvement procedure, making subsequent improvement more effective across tasks. (Zhou Hai et al., 2026)
  - > In this paper, we systematically investigate the mechanisms, scaling behavior, and generalization of physical Recursive self-improvement. (Zekai Li et al., 2026)

> Eras and milestones were proposed by `claude-opus-5-5` from the quoted sentences only. Check the quotes.

Generated by [idealine](https://github.com/Yilinista/idealine) from OpenAlex data.
