# vibe coding: where it came from

“Vibe coding”一词在本证据中被归于 Andrej Karpathy 于 2025 年 2 月提出，用来描述用自然语言与大语言模型对话、让 AI 生成代码的编程方式。如今它主要指把实现几乎完全交给 AI 编程智能体、靠观察运行结果而非逐行阅读代码来验收的开发实践。这种做法在教育、医疗等非程序员群体中被广泛采用，同时也因安全性和可维护性问题受到批评。

906 papers in OpenAlex use this term (2019–2026); 158 sentences read.

## Eras

- **2025–2025 · 命名与对话式编程**: 该词刚被提出，主要指开发者或非程序员通过自然语言与大语言模型对话、迭代生成代码的新编程范式，并迅速被用于教育和临床等领域的原型开发。
- **2026–2026 · 智能体委托与反思**: 该词更多指把实现整体委托给自主编程智能体、极少审查代码、凭运行结果验收的做法，被当作通向“智能体工程”和规范驱动开发的过渡阶段，并面临安全、质量和开源生态方面的批评。

## Milestones

- **2025 · coined**: Andrej Karpathy 于 2025 年 2 月提出 “vibe coding” 一词. 多篇文献把这一名称明确归于 Karpathy 在 2025 年 2 月的提法，此后该词迅速流行。
  - > Vibe coding, a term coined by Andrej Karpathy in February 2025, has quickly become a compelling and controversial natural language programming paradigm in AI-assisted software development. (Veronica Pimenova et al., 2025)
  - > In February 2025, as we were delivering an upper-level undergraduate course on Software Engineering in our university, the term vibe coding emerged and quickly became popularized, referring to a practice in which developers describe a project or task in a prompt to an AI model that then generates code artifacts automatically. (Yingying Wang et al., 2026)
- **2025 · popularized**: [Vibe coding: programming through conversation with artificial intelligence](https://doi.org/10.48550/arxiv.2506.23253). 这篇被高频引用的论文把 vibe coding 界定为通过与代码生成大模型对话来编程的新范式。
  - > We examine "vibe coding": an emerging programming paradigm where developers primarily write code by interacting with code-generating large language models rather than writing code directly. (Advait Sarkar et al., 2025)
- **2025 · popularized**: [Vibe Coding vs. Agentic Coding: Fundamentals and Practical Implications of Agentic AI](https://doi.org/10.48550/arxiv.2505.19443). 这篇被引最多的综述把 vibe coding 与智能体编程并列为 AI 辅助开发的两大新范式。
  - > This review presents a comprehensive analysis of two emerging paradigms in AI-assisted software development: vibe coding and agentic coding. (Ranjan Sapkota et al., 2025)
- **2025 · applied**: [From technology adopters to creators: Leveraging AI-assisted vibe coding to transform clinical teaching and learning](https://doi.org/10.1080/0142159x.2025.2488353). 该文把 vibe coding 引入临床教学，作为无需编程技能的无代码开发途径，开启了医疗教育领域的应用潮。
  - > To address these challenges, we introduce vibe coding, a novel AI-assisted, no-code development approach that enables educators to create interactive, customisable learning simulations without programming expertise. (Minyang Chow et al., 2025)
  - > Vibe Coding is a clinician-led design framework that embeds expert reasoning and the cognitive ‘feel’ of clinical decision-making into interactive educational tools. (Francesco Pesce et al., 2025)
- **2025 · redefined**: [A Survey of Vibe Coding with Large Language Models](https://doi.org/10.48550/arxiv.2510.12399). 该综述把 vibe coding 重新界定为依托自主编程智能体、通过观察结果而非逐行理解代码来验收实现的方法。
  - > The advancement of large language models (LLMs) has catalyzed a paradigm shift from code generation assistance to autonomous coding agents, enabling a novel development methodology termed "Vibe Coding" where developers validate AI-generated implementations through outcome observation rather than line-by-line code comprehension. (Ge, Yuyao et al., 2025)
- **2025 · critique**: [Is Vibe Coding Safe? Benchmarking Vulnerability of Agent-Generated Code in Real-World Tasks](https://doi.org/10.48550/arxiv.2512.03262). 该文通过基准测试检验智能体生成代码的漏洞，代表了对 vibe coding 安全性的早期质疑。
  - > Vibe coding is a new software development paradigm in which human engineers prompt a large language model (LLM) agent to complete complex coding tasks with little supervision. (Songwen Zhao et al., 2025)
  - > Code generation with large language models (LLMs), often termed vibe coding, is increasingly adopted in production but fails to ensure code quality, particularly in security (e.g., SQL injection vulnerabilities) and maintainability (e.g., missing type annotations). (Feng Yao et al., 2025)
- **2025 · applied**: [CAI Fluency: A Framework for Cybersecurity AI Fluency](https://doi.org/10.48550/arxiv.2508.13588). 该文提出“vibe-hacking”作为 vibe coding 在网络安全领域的类比，显示这一说法开始衍生出“vibe X”系列概念。
  - > The main objective of the CAI framework is to accelerate the widespread adoption and effective use of artificial intelligence-based cybersecurity solutions, pathing the way to vibe-hacking, the cybersecurity analogon to vibe-coding. (Víctor Mayoral-Vilches et al., 2025)
  - > This mirrors "Vibe Coding," where AI generates syntactically correct but functionally flawed code, except scientific stakes are immeasurably higher. (Isabelle Rose et al., 2025)
- **2026 · critique**: [Vibe Coding Kills Open Source](https://doi.org/10.48550/arxiv.2601.15494). 该文指出，由 AI 智能体组装开源软件的做法削弱了用户与开源维护者之间的互动。
  - > In vibe coding, an AI agent builds software by selecting and assembling open-source software (OSS), often without users directly reading documentation, reporting bugs, or otherwise engaging with maintainers. (Miklós Koren et al., 2026)
- **2026 · redefined**: [GLM-5: from Vibe Coding to Agentic Engineering](https://doi.org/10.48550/arxiv.2602.15763). 这份高被引的模型报告把 vibe coding 定位为有待超越、迈向“智能体工程”的前一阶段。
  - > We present GLM-5, a next-generation foundation model designed to transition the paradigm of vibe coding to agentic engineering. (5 Team et al., 2026)
  - > Context: Software engineering is moving from AI-assisted practices like vibe coding, in which assistants accelerate individual developers, towards Agentic Software Engineering (ASE), in which autonomous agents are delegated goal-level tasks. (Jessica Diaz et al., 2026)
- **2026 · applied**: [Qwen3.5-Omni Technical Report](https://doi.org/10.48550/arxiv.2604.15804). 该报告把概念扩展为“音视频 vibe coding”，即全模态模型直接依据音视频指令编写代码。
  - > Remarkably, we observed the emergence of a new capability in omnimodal models: directly performing coding based on audio-visual instructions, which we call Audio-Visual Vibe Coding. (Qwen Team, 2026)

> Eras and milestones were proposed by `claude-opus-5-5` from the quoted sentences only. Check the quotes.

Generated by [idealine](https://github.com/Yilinista/idealine) from OpenAlex data.
