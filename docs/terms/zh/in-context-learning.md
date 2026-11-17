# in-context learning: where it came from

在本证据中，该词最早指语言教学、教育支持和神经科学中的“情境学习”。2021年起，它在 GPT-3 等大语言模型研究中获得新含义，指模型仅凭提示中的示例完成新任务。如今它主要指大模型无需更新参数、靠提示示例适应任务的能力和提示范式，并已扩展到视觉、语音、多模态和表格数据等领域。

6281 papers in OpenAlex use this term (1982–2026); 160 sentences read.

Follows: 本时间线追踪机器学习中的“上下文学习”：模型仅凭输入提示中的少量示例完成新任务，无需更新参数。

## Same words, other meanings (left out)

- **教育情境学习支持**: 教育学中在真实课程情境内提供的学习支持，或围绕真实任务组织的建构主义学习。 (3 quotes)
- **词汇语境学习**: 第二语言学习者通过上下文语境习得词汇。 (2 quotes)
- **神经科学情境学习**: 动物或人对环境情境的学习，涉及海马体。 (1 quotes)

## Eras

- **2021–2022 · GPT-3能力的命名与剖析**: 指 GPT-3 等大语言模型以提示中的示例为条件完成新任务的意外能力，研究集中于示例选择、元训练和机制解释。
- **2023–2023 · 爆发式扩展与机制理论**: 上下文学习被视为NLP新范式，被大量应用于各类任务，扩展到视觉、语音和多模态模型，并出现梯度下降、任务向量等机制理论。
- **2024–2026 · 通用提示技术与基础模型**: 上下文学习成为与微调、RAG、思维链并列的标准提示技术，延伸到长上下文/多样本设置以及表格与时序基础模型。

## Milestones

- **2021 · origin**: [An Explanation of In-context Learning as Implicit Bayesian Inference](https://doi.org/10.48550/arxiv.2111.02080). 证据中最早在本义上使用该词，把它描述为 GPT-3 仅凭提示示例完成下游任务的意外能力，并给出贝叶斯推断解释。
  - > Large language models (LMs) such as GPT-3 have the surprising ability to do in-context learning, where the model learns to do a downstream task simply by conditioning on a prompt consisting of input-output examples. (Sang Michael Xie et al., 2021)
- **2021 · applied**: [MetaICL: Learning to Learn In Context](https://doi.org/10.48550/arxiv.2110.15943). 首次把上下文学习当作训练目标，通过元训练让模型更擅长上下文学习。
  - > We introduce MetaICL (Meta-training for In-Context Learning), a new meta-training framework for few-shot learning where a pretrained language model is tuned to do in-context learning on a large set of training tasks. (Sewon Min et al., 2021)
  - > The goal of meta-learning is to learn to adapt to a new task with only a few labeled examples.Inspired by the recent progress in large language models, we propose in-context tuning (ICT), which recasts task adaptation and prediction as a simple sequence prediction problem: to form the input sequence, we concatenate the task instruction, labeled in-context examples, and the target input to predict; to metatrain the model to learn from in-context … (Yanda Chen et al., 2022)
- **2022 · critique**: [Rethinking the Role of Demonstrations: What Makes In-Context Learning Work?](https://doi.org/10.18653/v1/2022.emnlp-main.759). 发现示例中的真实标签并非必需，质疑上下文学习真的在“学习”任务映射。
  - > Large language models (LMs) are able to incontext learn-perform a new task via inference alone by conditioning on a few input-label pairs (demonstrations) and making predictions for new inputs.However, there has been little understanding of how the model learns and which aspects of the demonstrations contribute to end task performance.In this paper, we show that ground truth demonstrations are in fact not required-randomly replacing labels in th… (Sewon Min et al., 2022)
- **2022 · critique**: [Few-Shot Parameter-Efficient Fine-Tuning is Better and Cheaper than In-Context Learning](https://doi.org/10.52202/068431-0142). 论证参数高效微调比上下文学习更好、更便宜，对这一范式提出挑战。
  - > Few-shot in-context learning (ICL) enables pre-trained language models to perform a previously-unseen task without any gradient-based training by feeding a small number of training examples as part of the input. (Haokun Liu et al., 2022)
  - > Few-shot fine-tuning and in-context learning are two alternative strategies for task adaptation of pre-trained language models.Recently, in-context learning has gained popularity over fine-tuning due to its simplicity and improved out-of-domain generalization, and because extensive evidence shows that fine-tuned models pick up on spurious correlations.Unfortunately, previous comparisons of the two approaches were done using models of different s… (Marius Mosbach et al., 2023)
- **2022 · redefined**: [In-context Learning and Induction Heads](https://doi.org/10.48550/arxiv.2209.11895). 用“随 token 位置增加而损失下降”来操作化地定义上下文学习，并归因于归纳头机制。
  - > In this work, we present preliminary and indirect evidence for a hypothesis that induction heads might constitute the mechanism for the majority of all "in-context learning" in large transformer models (i.e. decreasing loss at increasing token indices). (Catherine Olsson et al., 2022)
- **2022 · redefined**: [What Can Transformers Learn In-Context? a Case Study of Simple Function Classes](https://doi.org/10.52202/068431-2217). 把上下文学习从语言任务推广为 Transformer 在合成函数类上的一般学习能力，开启一系列理论研究。
  - > In-context learning refers to the ability of a model to condition on a prompt sequence consisting of in-context examples (input-output pairs corresponding to some task) along with a new query input, and generate the corresponding output. (Shivam Garg et al., 2022)
  - > Neural sequence models, especially transformers, exhibit a remarkable capacity for in-context learning. (Ekin Akyürek et al., 2022)
- **2022 · applied**: [TabPFN: A Transformer That Solves Small Tabular Classification Problems in a Second](https://doi.org/10.48550/arxiv.2207.01848). 把上下文学习用于表格分类，后来被视为表格基础模型的奠基工作。
  - > TabPFN performs in-context learning (ICL), it learns to make predictions using sequences of labeled examples (x, f(x)) given in the input, without requiring further parameter updates. (Noah Hollmann et al., 2022)
  - > Since the seminal work of TabPFN, research on tabular foundation models (TFMs) based on in-context learning (ICL) has challenged long-standing paradigms in machine learning. (Xiyuan Zhang et al., 2025)
- **2023 · popularized**: [A Survey on In-context Learning](https://doi.org/10.48550/arxiv.2301.00234). 综述把上下文学习确立为NLP的新范式，该文被大量引用。
  - > With the increasing capabilities of large language models (LLMs), in-context learning (ICL) has emerged as a new paradigm for natural language processing (NLP), where LLMs make predictions based on contexts augmented with a few examples. (Qingxiu Dong et al., 2023)
  - > A Survey on In-context Learning (Qingxiu Dong et al., 2024)
- **2023 · applied**: [Neural Codec Language Models are Zero-Shot Text to Speech Synthesizers](https://doi.org/10.48550/arxiv.2301.02111). 把上下文学习能力用于语音合成，以短音频作为声学提示。
  - > Vall-E emerges in-context learning capabilities and can be used to synthesize high-quality personalized speech with only a 3-second enrolled recording of an unseen speaker as an acoustic prompt. (Chengyi Wang et al., 2023)
  - > VALL-E X inherits strong in-context learning capabilities and can be applied for zero-shot cross-lingual text-to-speech synthesis and zero-shot speech-to-speech translation tasks. (Ziqiang Zhang et al., 2023)
- **2023 · applied**: [Images Speak in Images: A Generalist Painter for In-Context Visual Learning](https://doi.org/10.1109/cvpr52729.2023.00660). 把NLP中的上下文学习范式移植到视觉任务。
  - > In-context learning, as a new paradigm in NLP, allows the model to rapidly adapt to various tasks with only a handful of prompts and examples. (Xinlong Wang et al., 2023)
  - > In this paper, the main focus is on an emergent ability in large vision models, known as in-context learning, which allows inference on unseen tasks by conditioning on in-context examples (a.k.a.~prompt) without updating the model parameters. (Yuanhan Zhang et al., 2023)
- **2024 · redefined**: [Many-Shot In-Context Learning](https://doi.org/10.52202/079017-2447). 借助长上下文，把上下文学习从少样本扩展到多样本设置。
  - > Large language models (LLMs) excel at few-shot in-context learning (ICL) -- learning from a few examples provided in context at inference, without any weight updates. (Rishabh Agarwal et al., 2024)
  - > We introduce a benchmark (LongICLBench) for long in-context learning in extreme-label classification using six datasets with 28 to 174 classes and input lengths from 2K to 50K tokens. (Tianle Li et al., 2024)
- **2024 · critique**: [Are Emergent Abilities in Large Language Models just In-Context Learning?](https://doi.org/10.18653/v1/2024.acl-long.279). 质疑大模型的“涌现能力”是否只是上下文学习的结果。
  - > Are Emergent Abilities in Large Language Models just In-Context Learning? (Sheng Fu Lu et al., 2024)
  - > These emergent abilities, ranging from advanced reasoning and in-context learning to coding and problem-solving, have sparked an intense scientific debate: Are they truly emergent, or do they simply depend on external factors, such as training dynamics, the type of problems, or the chosen metric? (Leonardo Berti et al., 2025)

> Eras and milestones were proposed by `claude-opus-5-5` from the quoted sentences only. Check the quotes.

Generated by [idealine](https://github.com/Yilinista/idealine) from OpenAlex data.
