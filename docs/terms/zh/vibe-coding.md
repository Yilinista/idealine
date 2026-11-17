# vibe coding: where it came from

“vibe coding”一词据证据所述由 Andrej Karpathy 于2025年2月提出，用来指开发者用自然语言向大语言模型描述意图、主要由AI生成代码的编程方式；标注为2019、2020年的两条记录提到了AI时代的语境，很可能是年份错误。如今它主要指以对话和意图驱动、常借助自主编码智能体、较少逐行审查代码的软件开发方式，并已扩展到教育、医疗等领域，同时在安全性、可维护性和验证方面受到大量批评。

906 papers in OpenAlex use this term (2019–2026); 158 sentences read.

## Eras

- **2025–2025 · 命名与范式定义**: 该词被提出后迅速流行，指通过与大语言模型自然语言对话来生成代码、让非程序员也能构建软件的新编程范式，并被大量引入教育和临床等应用领域。
- **2026–2026 · 智能体化与质量治理**: 该词越来越多地指把实现完全委托给AI编码智能体、主要凭运行结果而非阅读代码来验收的做法，常被作为安全、开源生态和可维护性批评的对象，并被拿来与规范驱动开发、智能体工程对比。

## Milestones

- **2025 · coined**: Andrej Karpathy 于2025年2月提出“vibe coding”. 多篇论文将该术语的命名归于 Karpathy，并指出它于2025年2月出现后迅速流行。
  - > Vibe coding, a term coined by Andrej Karpathy in February 2025, has quickly become a compelling and controversial natural language programming paradigm in AI-assisted software development. (Veronica Pimenova et al., 2025)
  - > In February 2025, as we were delivering an upper-level undergraduate course on Software Engineering in our university, the term vibe coding emerged and quickly became popularized, referring to a practice in which developers describe a project or task in a prompt to an AI model that then generates code artifacts automatically. (Yingying Wang et al., 2026)
- **2025 · popularized**: [Vibe coding: programming through conversation with artificial intelligence](https://doi.org/10.48550/arxiv.2506.23253). 这篇高被引论文把 vibe coding 界定为开发者主要通过与代码生成大模型对话而非直接写代码的新兴编程范式。
  - > We examine "vibe coding": an emerging programming paradigm where developers primarily write code by interacting with code-generating large language models rather than writing code directly. (Advait Sarkar et al., 2025)
- **2025 · popularized**: [Vibe Coding vs. Agentic Coding: Fundamentals and Practical Implications of Agentic AI](https://doi.org/10.48550/arxiv.2505.19443). 这篇综述将 vibe coding 与 agentic coding 并列为AI辅助开发的两种范式，确立了后续讨论的基本框架。
  - > This review presents a comprehensive analysis of two emerging paradigms in AI-assisted software development: vibe coding and agentic coding. (Ranjan Sapkota et al., 2025)
  - > Recent advances in large language models (LLMs) have introduced new paradigms in software development, including vibe coding, AI-assisted coding, and agentic coding, fundamentally reshaping how software is designed, implemented, and maintained. (Hung-Fu Chang et al., 2025)
- **2025 · applied**: [From technology adopters to creators: Leveraging AI-assisted vibe coding to transform clinical teaching and learning](https://doi.org/10.1080/0142159x.2025.2488353). 该文将 vibe coding 作为无代码开发方式引入临床教学，使没有编程背景的教育者也能制作交互式学习工具。
  - > To address these challenges, we introduce vibe coding, a novel AI-assisted, no-code development approach that enables educators to create interactive, customisable learning simulations without programming expertise. (Minyang Chow et al., 2025)
  - > Vibe Coding is a clinician-led design framework that embeds expert reasoning and the cognitive ‘feel’ of clinical decision-making into interactive educational tools. (Francesco Pesce et al., 2025)
- **2025 · redefined**: [A Survey of Vibe Coding with Large Language Models](https://doi.org/10.48550/arxiv.2510.12399). 该综述将 vibe coding 重新界定为依托自主编码智能体、通过观察运行结果而非逐行理解代码来验收实现的方法。
  - > The advancement of large language models (LLMs) has catalyzed a paradigm shift from code generation assistance to autonomous coding agents, enabling a novel development methodology termed "Vibe Coding" where developers validate AI-generated implementations through outcome observation rather than line-by-line code comprehension. (Ge, Yuyao et al., 2025)
- **2025 · critique**: [Is Vibe Coding Safe? Benchmarking Vulnerability of Agent-Generated Code in Real-World Tasks](https://doi.org/10.48550/arxiv.2512.03262). 该文通过基准测试检验智能体生成代码中的漏洞，代表了针对 vibe coding 安全性的早期批评。
  - > Vibe coding is a new software development paradigm in which human engineers prompt a large language model (LLM) agent to complete complex coding tasks with little supervision. (Songwen Zhao et al., 2025)
  - > Code generation with large language models (LLMs), often termed vibe coding, is increasingly adopted in production but fails to ensure code quality, particularly in security (e.g., SQL injection vulnerabilities) and maintainability (e.g., missing type annotations). (Feng Yao et al., 2025)
- **2025 · applied**: 由 vibe coding 衍生出 vibe-hacking、vibe science 等说法. 该词被类比推广到网络安全、科学研究和内容生成等领域，形成一系列以“vibe”为前缀的新概念。
  - > The main objective of the CAI framework is to accelerate the widespread adoption and effective use of artificial intelligence-based cybersecurity solutions, pathing the way to vibe-hacking, the cybersecurity analogon to vibe-coding. (Víctor Mayoral-Vilches et al., 2025)
  - > This mirrors "Vibe Coding," where AI generates syntactically correct but functionally flawed code, except scientific stakes are immeasurably higher. (Isabelle Rose et al., 2025)
- **2026 · critique**: [Vibe Coding Kills Open Source](https://doi.org/10.48550/arxiv.2601.15494). 该文指出 AI 智能体自动拼装开源软件、用户不再与维护者互动，可能损害开源生态。
  - > In vibe coding, an AI agent builds software by selecting and assembling open-source software (OSS), often without users directly reading documentation, reporting bugs, or otherwise engaging with maintainers. (Miklós Koren et al., 2026)
  - > Novice Developers Produce Larger Review Overhead for Project Maintainers while Vibe Coding (Syed Ammar Asdaque et al., 2026)
- **2026 · critique**: [Specification-Driven Development as the Foundation of AI-Native Enterprise Software Engineering](https://doi.org/10.48550/arxiv.2607.16680). 该文把 vibe coding 定性为凭直觉、按观察到的行为接受AI产物的做法，并主张以规范驱动开发作为更严谨的替代方案。
  - > Two paradigms have emerged: vibe coding, an intuition-driven approach accepting AI artifacts via observed behavior, and Specification-Driven Development (SDD), which uses structured specifications as the authoritative source of truth. (Mamdouh Alenezi, 2026)
  - > Vibe coding -- accepting LLM-generated source from natural-language intent with minimal review -- is fast and may be adequate for low-criticality consumer software. (Ran Wei et al., 2026)
- **2026 · redefined**: [GLM-5: from Vibe Coding to Agentic Engineering](https://doi.org/10.48550/arxiv.2602.15763). 这篇极高被引的模型报告把 vibe coding 视为有待超越的阶段，主张转向“智能体工程”。
  - > We present GLM-5, a next-generation foundation model designed to transition the paradigm of vibe coding to agentic engineering. (5 Team et al., 2026)
  - > Agentic Agile-V: From Vibe Coding to Verified Engineering in Software and Hardware Development (Christopher Koch, 2026)
- **2026 · applied**: [Qwen3.5-Omni Technical Report](https://doi.org/10.48550/arxiv.2604.15804). 该报告把概念扩展到全模态模型，提出依据音视频指令直接编程的“Audio-Visual Vibe Coding”。
  - > Remarkably, we observed the emergence of a new capability in omnimodal models: directly performing coding based on audio-visual instructions, which we call Audio-Visual Vibe Coding. (Qwen Team, 2026)

> Eras and milestones were proposed by `claude-opus-5-5` from the quoted sentences only. Check the quotes.

Generated by [idealine](https://github.com/Yilinista/idealine) from OpenAlex data.
