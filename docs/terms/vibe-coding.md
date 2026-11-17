# vibe coding: where it came from

According to the evidence, 'vibe coding' was coined by Andrej Karpathy in February 2025 for building software by talking to large language models in natural language instead of writing code directly. Papers dated 2019 and 2020 refer to AI-era practices and are likely misdated. Today the term mostly means delegating implementation to AI coding agents and judging the result by whether it runs, often with little code review; it is now studied for its security, maintainability and educational effects and contrasted with more rigorous 'agentic' or specification-driven engineering.

906 papers in OpenAlex use this term (2019–2026); 158 sentences read.

## Eras

- **2025–2025 · Conversational AI programming paradigm**: A newly named paradigm in which users, including non-programmers, state high-level intent in natural language and an LLM writes the code. It was quickly taken up for prototyping and for education in fields such as medicine.
- **2026–2026 · Agent delegation and guardrails**: Vibe coding came to mean handing whole tasks to autonomous coding agents with minimal review. It was increasingly framed as a risky baseline to be secured, verified, or superseded by agentic and specification-driven engineering.

## Milestones

- **2025 · coined**: Andrej Karpathy's coinage of 'vibe coding' (February 2025). Later papers credit Karpathy with naming the term in February 2025, after which it spread rapidly.
  - > Vibe coding, a term coined by Andrej Karpathy in February 2025, has quickly become a compelling and controversial natural language programming paradigm in AI-assisted software development. (Veronica Pimenova et al., 2025)
  - > In February 2025, as we were delivering an upper-level undergraduate course on Software Engineering in our university, the term vibe coding emerged and quickly became popularized, referring to a practice in which developers describe a project or task in a prompt to an AI model that then generates code artifacts automatically. (Yingying Wang et al., 2026)
- **2025 · popularized**: Coding tools such as Cursor and Claude Code. AI coding tools are credited with popularizing intent-steered development under the vibe coding label.
  - > Tools such as Cursor and Claude Code have popularized "vibe coding" (where developers steer development through high-level intent), commonly relying on context engineering and Retrieval-Augmented Generation (RAG) to ground generation in a codebase. (Xin Peng et al., 2025)
- **2025 · popularized**: [Vibe coding: programming through conversation with artificial intelligence](https://doi.org/10.48550/arxiv.2506.23253). A highly cited early paper defined vibe coding as programming chiefly by interacting with code-generating LLMs.
  - > We examine "vibe coding": an emerging programming paradigm where developers primarily write code by interacting with code-generating large language models rather than writing code directly. (Advait Sarkar et al., 2025)
- **2025 · popularized**: [Vibe Coding vs. Agentic Coding: Fundamentals and Practical Implications of Agentic AI](https://doi.org/10.48550/arxiv.2505.19443). The most cited 2025 review framed vibe coding as one of two emerging AI-assisted development paradigms.
  - > This review presents a comprehensive analysis of two emerging paradigms in AI-assisted software development: vibe coding and agentic coding. (Ranjan Sapkota et al., 2025)
- **2025 · applied**: [From technology adopters to creators: Leveraging AI-assisted vibe coding to transform clinical teaching and learning](https://doi.org/10.1080/0142159x.2025.2488353). This paper carried the term into clinical education as a no-code way for educators to build simulations.
  - > To address these challenges, we introduce vibe coding, a novel AI-assisted, no-code development approach that enables educators to create interactive, customisable learning simulations without programming expertise. (Minyang Chow et al., 2025)
  - > Vibe Coding is a clinician-led design framework that embeds expert reasoning and the cognitive ‘feel’ of clinical decision-making into interactive educational tools. (Francesco Pesce et al., 2025)
- **2025 · redefined**: [A Survey of Vibe Coding with Large Language Models](https://doi.org/10.48550/arxiv.2510.12399). It defined vibe coding by validating AI output through observed outcomes rather than line-by-line comprehension, tying the term to autonomous agents.
  - > The advancement of large language models (LLMs) has catalyzed a paradigm shift from code generation assistance to autonomous coding agents, enabling a novel development methodology termed "Vibe Coding" where developers validate AI-generated implementations through outcome observation rather than line-by-line code comprehension. (Ge, Yuyao et al., 2025)
- **2025 · critique**: [Is Vibe Coding Safe? Benchmarking Vulnerability of Agent-Generated Code in Real-World Tasks](https://doi.org/10.48550/arxiv.2512.03262). It benchmarked the security weaknesses of lightly supervised, agent-generated code.
  - > Vibe coding is a new software development paradigm in which human engineers prompt a large language model (LLM) agent to complete complex coding tasks with little supervision. (Songwen Zhao et al., 2025)
  - > Code generation with large language models (LLMs), often termed vibe coding, is increasingly adopted in production but fails to ensure code quality, particularly in security (e.g., SQL injection vulnerabilities) and maintainability (e.g., missing type annotations). (Feng Yao et al., 2025)
- **2025 · applied**: [CAI Fluency: A Framework for Cybersecurity AI Fluency](https://doi.org/10.48550/arxiv.2508.13588). It extended the vibe pattern to other domains, coining 'vibe-hacking' as the cybersecurity analogue.
  - > The main objective of the CAI framework is to accelerate the widespread adoption and effective use of artificial intelligence-based cybersecurity solutions, pathing the way to vibe-hacking, the cybersecurity analogon to vibe-coding. (Víctor Mayoral-Vilches et al., 2025)
  - > This mirrors "Vibe Coding," where AI generates syntactically correct but functionally flawed code, except scientific stakes are immeasurably higher. (Isabelle Rose et al., 2025)
- **2026 · redefined**: [GLM-5: from Vibe Coding to Agentic Engineering](https://doi.org/10.48550/arxiv.2602.15763). This very highly cited model report cast vibe coding as a stage to be surpassed by agentic engineering.
  - > We present GLM-5, a next-generation foundation model designed to transition the paradigm of vibe coding to agentic engineering. (5 Team et al., 2026)
  - > Context: Software engineering is moving from AI-assisted practices like vibe coding, in which assistants accelerate individual developers, towards Agentic Software Engineering (ASE), in which autonomous agents are delegated goal-level tasks. (Jessica Diaz et al., 2026)
- **2026 · critique**: [Vibe Coding Kills Open Source](https://doi.org/10.48550/arxiv.2601.15494). It argued that agents assembling open-source software without users engaging maintainers harms the open-source ecosystem.
  - > In vibe coding, an AI agent builds software by selecting and assembling open-source software (OSS), often without users directly reading documentation, reporting bugs, or otherwise engaging with maintainers. (Miklós Koren et al., 2026)
- **2026 · applied**: [Qwen3.5-Omni Technical Report](https://doi.org/10.48550/arxiv.2604.15804). It extended the term to coding from audio-visual instructions ('Audio-Visual Vibe Coding').
  - > Remarkably, we observed the emergence of a new capability in omnimodal models: directly performing coding based on audio-visual instructions, which we call Audio-Visual Vibe Coding. (Qwen Team, 2026)

> Eras and milestones were proposed by `claude-opus-5-5` from the quoted sentences only. Check the quotes.

Generated by [idealine](https://github.com/Yilinista/idealine) from OpenAlex data.
