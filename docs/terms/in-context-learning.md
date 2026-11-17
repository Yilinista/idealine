# in-context learning: where it came from

Before 2020 the phrase appeared sporadically in education, second-language vocabulary research and neuroscience, meaning learning words or skills from surrounding context or authentic situations. Since about 2021 it overwhelmingly names the ability of large pretrained models, first GPT-3-style language models and later vision, speech, tabular and multimodal models, to perform a new task from examples placed in the prompt without updating their parameters.

6281 papers in OpenAlex use this term (1982–2026); 160 sentences read.

## Eras

- **1990–2008 · Educational and psychological context learning**: Learning vocabulary from surrounding text, learning-support programs embedded in authentic coursework, or animals learning about environmental contexts (hippocampus).
- **2021–2022 · GPT-3 prompt-based few-shot learning**: The surprising ability of large language models like GPT-3 to do a new task by conditioning on a prompt of input-output demonstrations, without gradient updates.
- **2022–2023 · Mechanism and theory studies**: In-context learning became an object of explanation, studied as implicit Bayesian inference, induction heads, implicit gradient descent, or task vectors in transformers.
- **2023–2026 · General capability across modalities**: A standard prompting technique and generic foundation-model capability applied to speech, vision, tabular data, genomics, robotics and many applied domains.

## Milestones

- **1990 · origin**: [The Comparative Effectiveness of Word Lists and Video-Graphic Cues on University Level ESL Students' Vocabulary in Context Learning](https://doi.org/10.5070/b5.36657). Earliest evidence use, referring to learning vocabulary from context in second-language education.
  - > The Comparative Effectiveness of Word Lists and Video-Graphic Cues on University Level ESL Students’ Vocabulary in Context Learning (Raymond Devenney, 1990)
- **1996 · critique**: [Second Language Vocabulary Learning: The Role of Context versus Translations as a Function of Proficiency](https://doi.org/10.1111/j.1540-4781.1996.tb05468.x). Questioned faith in context learning for vocabulary, noting weak experimental support.
  - > Such faith in context learning has not always received experimental support, however, nor is it commonly shared by L2 learners. (Peter Prince, 1996)
- **2021 · redefined**: [An Explanation of In-context Learning as Implicit Bayesian Inference](https://doi.org/10.48550/arxiv.2111.02080). Defines the term as GPT-3's ability to learn a task from prompt examples and offers a theoretical explanation, marking the new machine-learning meaning.
  - > Large language models (LMs) such as GPT-3 have the surprising ability to do in-context learning, where the model learns to do a downstream task simply by conditioning on a prompt consisting of input-output examples. (Sang Michael Xie et al., 2021)
  - > For example, thanks to scaling, GPT-3 was able to achieve strong results on in-context learning tasks. (Nan Du et al., 2021)
- **2021 · applied**: [MetaICL: Learning to Learn In Context](https://doi.org/10.48550/arxiv.2110.15943). Turned in-context learning into a training target by meta-training models to do it.
  - > We introduce MetaICL (Meta-training for In-Context Learning), a new meta-training framework for few-shot learning where a pretrained language model is tuned to do in-context learning on a large set of training tasks. (Sewon Min et al., 2021)
  - > The goal of meta-learning is to learn to adapt to a new task with only a few labeled examples.Inspired by the recent progress in large language models, we propose in-context tuning (ICT), which recasts task adaptation and prediction as a simple sequence prediction problem: to form the input sequence, we concatenate the task instruction, labeled in-context examples, and the target input to predict; to metatrain the model to learn from in-context … (Yanda Chen et al., 2022)
- **2022 · popularized**: [Rethinking the Role of Demonstrations: What Makes In-Context Learning Work?](https://doi.org/10.18653/v1/2022.emnlp-main.759). Highly cited study that probed what demonstrations contribute, finding correct labels are not always required.
  - > Large language models (LMs) are able to incontext learn-perform a new task via inference alone by conditioning on a few input-label pairs (demonstrations) and making predictions for new inputs.However, there has been little understanding of how the model learns and which aspects of the demonstrations contribute to end task performance.In this paper, we show that ground truth demonstrations are in fact not required-randomly replacing labels in th… (Sewon Min et al., 2022)
- **2022 · redefined**: [In-context Learning and Induction Heads](https://doi.org/10.48550/arxiv.2209.11895). Gave a mechanistic, loss-based definition tied to induction heads in transformers.
  - > In this work, we present preliminary and indirect evidence for a hypothesis that induction heads might constitute the mechanism for the majority of all "in-context learning" in large transformer models (i.e. decreasing loss at increasing token indices). (Catherine Olsson et al., 2022)
- **2022 · critique**: [Few-Shot Parameter-Efficient Fine-Tuning is Better and Cheaper than In-Context Learning](https://doi.org/10.52202/068431-0142). Argued that parameter-efficient fine-tuning outperforms in-context learning in cost and accuracy.
  - > Few-shot in-context learning (ICL) enables pre-trained language models to perform a previously-unseen task without any gradient-based training by feeding a small number of training examples as part of the input. (Haokun Liu et al., 2022)
  - > Large pre-trained language models (PLMs) such as GPT-3 have shown strong in-context learning capabilities, which are highly appealing for domains such as biomedicine that feature high and diverse demands of language technologies but also high data annotation costs.In this paper, we present the first systematic and comprehensive study to compare the few-shot performance of GPT-3 in-context learning with fine-tuning smaller (i.e., BERT-sized) PLMs… (Bernal Jiménez Gutiérrez et al., 2022)
- **2022 · applied**: [TabPFN: A Transformer That Solves Small Tabular Classification Problems in a Second](https://doi.org/10.48550/arxiv.2207.01848). Extended in-context learning to tabular prediction, seeding later tabular foundation models.
  - > TabPFN performs in-context learning (ICL), it learns to make predictions using sequences of labeled examples (x, f(x)) given in the input, without requiring further parameter updates. (Noah Hollmann et al., 2022)
  - > Since the seminal work of TabPFN, research on tabular foundation models (TFMs) based on in-context learning (ICL) has challenged long-standing paradigms in machine learning. (Xiyuan Zhang et al., 2025)
- **2022 · popularized**: [A Survey on In-context Learning](https://doi.org/10.48550/arxiv.2301.00234). Consolidated in-context learning as a new NLP paradigm in a heavily cited survey.
  - > With the increasing capabilities of large language models (LLMs), in-context learning (ICL) has emerged as a new paradigm for natural language processing (NLP), where LLMs make predictions based on contexts augmented with a few examples. (Qingxiu Dong et al., 2022)
  - > A Survey on In-context Learning (Qingxiu Dong et al., 2024)
- **2023 · applied**: [Neural Codec Language Models are Zero-Shot Text to Speech Synthesizers](https://doi.org/10.48550/arxiv.2301.02111). Brought the in-context learning framing to speech synthesis from short acoustic prompts.
  - > Vall-E emerges in-context learning capabilities and can be used to synthesize high-quality personalized speech with only a 3-second enrolled recording of an unseen speaker as an acoustic prompt. (Chengyi Wang et al., 2023)
  - > VALL-E X inherits strong in-context learning capabilities and can be applied for zero-shot cross-lingual text-to-speech synthesis and zero-shot speech-to-speech translation tasks. (Ziqiang Zhang et al., 2023)
- **2023 · applied**: [What Makes Good Examples for Visual In-Context Learning?](https://doi.org/10.52202/075280-0780). Carried the concept to large vision models conditioned on image examples.
  - > In this paper, the main focus is on an emergent ability in large vision models, known as in-context learning, which allows inference on unseen tasks by conditioning on in-context examples (a.k.a.~prompt) without updating the model parameters. (Yuanhan Zhang et al., 2023)
  - > In-context learning, as a new paradigm in NLP, allows the model to rapidly adapt to various tasks with only a handful of prompts and examples. (Xinlong Wang et al., 2023)
- **2024 · critique**: [Are Emergent Abilities in Large Language Models just In-Context Learning?](https://doi.org/10.18653/v1/2024.acl-long.279). Questioned whether claimed emergent abilities reduce to in-context learning.
  - > Are Emergent Abilities in Large Language Models just In-Context Learning? (Sheng Fu Lu et al., 2024)
  - > These emergent abilities, ranging from advanced reasoning and in-context learning to coding and problem-solving, have sparked an intense scientific debate: Are they truly emergent, or do they simply depend on external factors, such as training dynamics, the type of problems, or the chosen metric? (Leonardo Berti et al., 2025)

> Eras and milestones were proposed by `claude-opus-5-5` from the quoted sentences only. Check the quotes.

Generated by [idealine](https://github.com/Yilinista/idealine) from OpenAlex data.
