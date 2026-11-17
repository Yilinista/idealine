# in-context learning: where it came from

“in-context learning”一词早期出现在教育学、二语词汇习得和心理学中，指在真实语境中学习（如借助上下文学习词汇、嵌入课程情境的学习支持）；2021年前后随GPT-3等大语言模型被借用为机器学习术语。如今它主要指大型模型仅凭提示中的少量示例在推理时完成新任务、无需更新参数的能力，并已扩展到多模态、语音、表格数据等领域，同时成为机制研究的热点。

6281 papers in OpenAlex use this term (1982–2026); 160 sentences read.

## Eras

- **1990–2008 · 教育与心理语境学习**: 指学习者在真实语境或情境中学习，如通过上下文习得二语词汇、嵌入课程的学习支持、或动物/大脑对环境语境的学习。
- **2021–2022 · 大语言模型提示学习**: 指GPT-3等预训练语言模型通过在提示中给出少量输入-输出示例即可执行新任务、无需梯度更新的能力。
- **2022–2023 · 机制与理论探究**: 该术语成为研究对象，学者用贝叶斯推断、归纳头、隐式梯度下降、任务向量等解释Transformer为何能在上下文中学习。
- **2023–2026 · 跨模态通用范式**: 上下文学习成为大模型的标准能力和提示工程手段，被广泛应用于视觉、语音、表格、基因组、机器人及医疗等领域。

## Milestones

- **1990 · origin**: [The Comparative Effectiveness of Word Lists and Video-Graphic Cues on University Level ESL Students’ Vocabulary in Context Learning](https://doi.org/10.5070/b5.36657). 证据中最早的用例，指二语学习者借助语境学习词汇。
  - > The Comparative Effectiveness of Word Lists and Video-Graphic Cues on University Level ESL Students’ Vocabulary in Context Learning (Raymond Devenney, 1990)
- **1996 · ancestor**: [Second Language Vocabulary Learning: The Role of Context versus Translations as a Function of Proficiency](https://doi.org/10.1111/j.1540-4781.1996.tb05468.x). 高被引的二语研究讨论“语境学习”的效果，代表该词在教育领域的早期含义。
  - > Such faith in context learning has not always received experimental support, however, nor is it commonly shared by L2 learners. (Peter Prince, 1996)
- **2021 · redefined**: [An Explanation of In-context Learning as Implicit Bayesian Inference](https://doi.org/10.48550/arxiv.2111.02080). 将术语明确定义为GPT-3等语言模型仅凭提示中示例完成下游任务的能力，并提出贝叶斯解释。
  - > Large language models (LMs) such as GPT-3 have the surprising ability to do in-context learning, where the model learns to do a downstream task simply by conditioning on a prompt consisting of input-output examples. (Sang Michael Xie et al., 2021)
  - > For example, thanks to scaling, GPT-3 was able to achieve strong results on in-context learning tasks. (Nan Du et al., 2021)
- **2021 · applied**: [MetaICL: Learning to Learn In Context](https://doi.org/10.48550/arxiv.2110.15943). 提出通过元训练专门提升模型的上下文学习能力，使其成为可优化的训练目标。
  - > We introduce MetaICL (Meta-training for In-Context Learning), a new meta-training framework for few-shot learning where a pretrained language model is tuned to do in-context learning on a large set of training tasks. (Sewon Min et al., 2021)
  - > The goal of meta-learning is to learn to adapt to a new task with only a few labeled examples.Inspired by the recent progress in large language models, we propose in-context tuning (ICT), which recasts task adaptation and prediction as a simple sequence prediction problem: to form the input sequence, we concatenate the task instruction, labeled in-context examples, and the target input to predict; to metatrain the model to learn from in-context … (Yanda Chen et al., 2022)
- **2022 · critique**: [Rethinking the Role of Demonstrations: What Makes In-Context Learning Work?](https://doi.org/10.18653/v1/2022.emnlp-main.759). 发现示例中的真实标签并非必需，质疑模型是否真正从示例中“学习”。
  - > Large language models (LMs) are able to incontext learn-perform a new task via inference alone by conditioning on a few input-label pairs (demonstrations) and making predictions for new inputs.However, there has been little understanding of how the model learns and which aspects of the demonstrations contribute to end task performance.In this paper, we show that ground truth demonstrations are in fact not required-randomly replacing labels in th… (Sewon Min et al., 2022)
- **2022 · critique**: [Few-Shot Parameter-Efficient Fine-Tuning is Better and Cheaper than In-Context Learning](https://doi.org/10.52202/068431-0142). 指出参数高效微调在效果和成本上优于上下文学习，引发两种范式的比较。
  - > Few-shot in-context learning (ICL) enables pre-trained language models to perform a previously-unseen task without any gradient-based training by feeding a small number of training examples as part of the input. (Haokun Liu et al., 2022)
  - > Few-shot fine-tuning and in-context learning are two alternative strategies for task adaptation of pre-trained language models.Recently, in-context learning has gained popularity over fine-tuning due to its simplicity and improved out-of-domain generalization, and because extensive evidence shows that fine-tuned models pick up on spurious correlations.Unfortunately, previous comparisons of the two approaches were done using models of different s… (Marius Mosbach et al., 2023)
- **2022 · redefined**: [In-context Learning and Induction Heads](https://doi.org/10.48550/arxiv.2209.11895). 从机制可解释性角度将上下文学习界定为随token位置增加而损失下降，并归因于归纳头。
  - > In this work, we present preliminary and indirect evidence for a hypothesis that induction heads might constitute the mechanism for the majority of all "in-context learning" in large transformer models (i.e. decreasing loss at increasing token indices). (Catherine Olsson et al., 2022)
- **2022 · applied**: [TabPFN: A Transformer That Solves Small Tabular Classification Problems in a Second](https://doi.org/10.48550/arxiv.2207.01848). 将上下文学习用于表格分类，开创了基于ICL的表格基础模型方向。
  - > TabPFN performs in-context learning (ICL), it learns to make predictions using sequences of labeled examples (x, f(x)) given in the input, without requiring further parameter updates. (Noah Hollmann et al., 2022)
  - > Since the seminal work of TabPFN, research on tabular foundation models (TFMs) based on in-context learning (ICL) has challenged long-standing paradigms in machine learning. (Xiyuan Zhang et al., 2025)
- **2022 · popularized**: [A Survey on In-context Learning](https://doi.org/10.48550/arxiv.2301.00234). 系统综述将ICL确立为NLP新范式，被大量引用并推动术语普及。
  - > With the increasing capabilities of large language models (LLMs), in-context learning (ICL) has emerged as a new paradigm for natural language processing (NLP), where LLMs make predictions based on contexts augmented with a few examples. (Qingxiu Dong et al., 2022)
  - > A Survey on In-context Learning (Qingxiu Dong et al., 2024)
- **2023 · applied**: [Neural Codec Language Models are Zero-Shot Text to Speech Synthesizers](https://doi.org/10.48550/arxiv.2301.02111). 将上下文学习能力引入语音合成，仅凭3秒录音即可模仿未见说话人。
  - > Vall-E emerges in-context learning capabilities and can be used to synthesize high-quality personalized speech with only a 3-second enrolled recording of an unseen speaker as an acoustic prompt. (Chengyi Wang et al., 2023)
  - > VALL-E X inherits strong in-context learning capabilities and can be applied for zero-shot cross-lingual text-to-speech synthesis and zero-shot speech-to-speech translation tasks. (Ziqiang Zhang et al., 2023)
- **2023 · applied**: [What Makes Good Examples for Visual In-Context Learning?](https://doi.org/10.52202/075280-0780). 把上下文学习扩展到大型视觉模型，形成视觉上下文学习研究线。
  - > In this paper, the main focus is on an emergent ability in large vision models, known as in-context learning, which allows inference on unseen tasks by conditioning on in-context examples (a.k.a.~prompt) without updating the model parameters. (Yuanhan Zhang et al., 2023)
  - > In-context learning, as a new paradigm in NLP, allows the model to rapidly adapt to various tasks with only a handful of prompts and examples. (Xinlong Wang et al., 2023)
- **2024 · critique**: [Are Emergent Abilities in Large Language Models just In-Context Learning?](https://doi.org/10.18653/v1/2024.acl-long.279). 质疑大模型的“涌现能力”可能只是上下文学习的表现。
  - > Are Emergent Abilities in Large Language Models just In-Context Learning? (Sheng Fu Lu et al., 2024)
  - > These emergent abilities, ranging from advanced reasoning and in-context learning to coding and problem-solving, have sparked an intense scientific debate: Are they truly emergent, or do they simply depend on external factors, such as training dynamics, the type of problems, or the chosen metric? (Leonardo Berti et al., 2025)

> Eras and milestones were proposed by `claude-opus-5-5` from the quoted sentences only. Check the quotes.

Generated by [idealine](https://github.com/Yilinista/idealine) from OpenAlex data.
