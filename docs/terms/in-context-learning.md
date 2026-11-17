# in-context learning: where it came from

In this evidence the term appears in 2021 for large language models such as GPT-3, which could learn a downstream task just from input-output examples placed in the prompt; older uses of the same words in education and psychology are unrelated. It now mainly names a standard prompting technique and a much-studied transformer capability, which has spread from text to images, speech, tabular data and other domains.

6281 papers in OpenAlex use this term (1982–2026); 160 sentences read.

Follows: In machine learning, in-context learning (ICL) is a model's ability to perform a new task by conditioning on examples or instructions in its input prompt, with no parameter updates.

## Same words, other meanings (left out)

- **L2 vocabulary context learning**: Second-language learners acquiring word meanings from surrounding context. (2 quotes)
- **Educational in-context support**: Learning support or constructivist learning embedded in authentic course or task contexts. (3 quotes)
- **Neuroscience context learning**: Animals learning associations with environmental contexts, linked to the hippocampus. (1 quotes)

## Eras

- **2021–2021 · GPT-3's surprising capability**: ICL named the surprising ability of large language models like GPT-3 to learn a task from input-output examples in the prompt, framed as a form of few-shot or meta-learning.
- **2022–2022 · Paradigm, selection and mechanism**: ICL became a recognized NLP paradigm: researchers studied how to choose demonstrations, compared it with fine-tuning, and probed why transformers can do it (induction heads, gradient descent, function classes).
- **2023–2024 · Survey and multimodal spread**: ICL was surveyed as a new paradigm and extended beyond text to vision, speech, multimodal and tabular models, while mechanistic theory continued.
- **2025–2026 · Standard prompting toolkit**: ICL is routinely listed alongside chain-of-thought, RAG and fine-tuning as a basic strategy for applying LLMs across domains, and it underpins tabular foundation models.

## Milestones

- **2021 · ancestor**: [Few-shot learning and meta-learning](https://doi.org/10.1109/iccv48922.2021.00893). ICL was framed as a few-shot learning ability, and models were meta-trained for it, tying it to the earlier meta-learning idea.
  - > We introduce MetaICL (Meta-training for In-Context Learning), a new meta-training framework for few-shot learning where a pretrained language model is tuned to do in-context learning on a large set of training tasks. (Sewon Min et al., 2021)
  - > The goal of meta-learning is to learn to adapt to a new task with only a few labeled examples.Inspired by the recent progress in large language models, we propose in-context tuning (ICT), which recasts task adaptation and prediction as a simple sequence prediction problem: to form the input sequence, we concatenate the task instruction, labeled in-context examples, and the target input to predict; to metatrain the model to learn from in-context … (Yanda Chen et al., 2022)
- **2021 · origin**: [An Explanation of In-context Learning as Implicit Bayesian Inference](https://doi.org/10.48550/arxiv.2111.02080). This is the earliest evidence that defines ICL as GPT-3's ability to learn a task by conditioning on prompt examples.
  - > Large language models (LMs) such as GPT-3 have the surprising ability to do in-context learning, where the model learns to do a downstream task simply by conditioning on a prompt consisting of input-output examples. (Sang Michael Xie et al., 2021)
  - > For example, thanks to scaling, GPT-3 was able to achieve strong results on in-context learning tasks. (Nan Du et al., 2021)
- **2022 · critique**: [Rethinking the Role of Demonstrations: What Makes In-Context Learning Work?](https://doi.org/10.18653/v1/2022.emnlp-main.759). It showed that ground-truth labels in demonstrations are not required, challenging the assumption that ICL learns the input-label mapping.
  - > Large language models (LMs) are able to incontext learn-perform a new task via inference alone by conditioning on a few input-label pairs (demonstrations) and making predictions for new inputs.However, there has been little understanding of how the model learns and which aspects of the demonstrations contribute to end task performance.In this paper, we show that ground truth demonstrations are in fact not required-randomly replacing labels in th… (Sewon Min et al., 2022)
- **2022 · critique**: [Few-Shot Parameter-Efficient Fine-Tuning is Better and Cheaper than In-Context Learning](https://doi.org/10.52202/068431-0142). It argued that parameter-efficient fine-tuning beats ICL on both accuracy and cost.
  - > Few-shot in-context learning (ICL) enables pre-trained language models to perform a previously-unseen task without any gradient-based training by feeding a small number of training examples as part of the input. (Haokun Liu et al., 2022)
  - > Few-shot fine-tuning and in-context learning are two alternative strategies for task adaptation of pre-trained language models.Recently, in-context learning has gained popularity over fine-tuning due to its simplicity and improved out-of-domain generalization, and because extensive evidence shows that fine-tuned models pick up on spurious correlations.Unfortunately, previous comparisons of the two approaches were done using models of different s… (Marius Mosbach et al., 2023)
- **2022 · redefined**: [In-context Learning and Induction Heads](https://doi.org/10.48550/arxiv.2209.11895). It recast ICL broadly as decreasing loss at later token positions and tied it to a specific attention mechanism.
  - > In this work, we present preliminary and indirect evidence for a hypothesis that induction heads might constitute the mechanism for the majority of all "in-context learning" in large transformer models (i.e. decreasing loss at increasing token indices). (Catherine Olsson et al., 2022)
- **2022 · redefined**: [Transformers learn in-context by gradient descent](https://doi.org/10.48550/arxiv.2212.07677). It reframed ICL as implicit learning algorithms, such as gradient descent, running inside transformers, a framing that later works followed.
  - > At present, the mechanisms of in-context learning in Transformers are not well understood and remain mostly an intuition. (Johannes von Oswald et al., 2022)
  - > Neural sequence models, especially transformers, exhibit a remarkable capacity for in-context learning. (Ekin Akyürek et al., 2022)
- **2022 · applied**: [TabPFN: A Transformer That Solves Small Tabular Classification Problems in a Second](https://doi.org/10.48550/arxiv.2207.01848). It brought ICL to tabular prediction, which later produced tabular foundation models.
  - > TabPFN performs in-context learning (ICL), it learns to make predictions using sequences of labeled examples (x, f(x)) given in the input, without requiring further parameter updates. (Noah Hollmann et al., 2022)
  - > Since the seminal work of TabPFN, research on tabular foundation models (TFMs) based on in-context learning (ICL) has challenged long-standing paradigms in machine learning. (Xiyuan Zhang et al., 2025)
- **2023 · popularized**: [A Survey on In-context Learning](https://doi.org/10.48550/arxiv.2301.00234). This highly cited survey consolidated ICL as a new paradigm for NLP.
  - > With the increasing capabilities of large language models (LLMs), in-context learning (ICL) has emerged as a new paradigm for natural language processing (NLP), where LLMs make predictions based on contexts augmented with a few examples. (Qingxiu Dong et al., 2023)
  - > A Survey on In-context Learning (Qingxiu Dong et al., 2024)
- **2023 · applied**: [Neural Codec Language Models are Zero-Shot Text to Speech Synthesizers](https://doi.org/10.48550/arxiv.2301.02111). It extended ICL to speech synthesis, where a short acoustic prompt serves as the context.
  - > Vall-E emerges in-context learning capabilities and can be used to synthesize high-quality personalized speech with only a 3-second enrolled recording of an unseen speaker as an acoustic prompt. (Chengyi Wang et al., 2023)
  - > VALL-E X inherits strong in-context learning capabilities and can be applied for zero-shot cross-lingual text-to-speech synthesis and zero-shot speech-to-speech translation tasks. (Ziqiang Zhang et al., 2023)
- **2023 · applied**: [Images Speak in Images: A Generalist Painter for In-Context Visual Learning](https://doi.org/10.1109/cvpr52729.2023.00660). It carried the NLP ICL paradigm over to vision tasks.
  - > In-context learning, as a new paradigm in NLP, allows the model to rapidly adapt to various tasks with only a handful of prompts and examples. (Xinlong Wang et al., 2023)
  - > In this paper, the main focus is on an emergent ability in large vision models, known as in-context learning, which allows inference on unseen tasks by conditioning on in-context examples (a.k.a.~prompt) without updating the model parameters. (Yuanhan Zhang et al., 2023)

> Eras and milestones were proposed by `claude-opus-5-5` from the quoted sentences only. Check the quotes.

Generated by [idealine](https://github.com/Yilinista/idealine) from OpenAlex data.
