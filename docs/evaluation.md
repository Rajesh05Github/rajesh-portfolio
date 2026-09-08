# Evaluation

## 1. Purpose

Measure whether the RAG/chatbot system actually answers portfolio questions correctly and stays grounded — reproducibly, not by eyeballing a few manual chats. Everything here reads real system output; no metric is fabricated to make a dashboard look good (master prompt §97).

## 2. Data model

See [database-design.md §7](database-design.md): `EvaluationDataset` → `EvaluationCase` (question, expectedAnswer, expectedSources) → `EvaluationRun` (snapshots model, prompt version, retrieval config used) → `EvaluationResult` (per-case scores).

## 3. Dataset

Hand-authored `EvaluationCase` rows covering: factual portfolio questions ("what backend technologies does he use"), source-specific questions ("tell me about the E-Commerce project"), out-of-scope questions (should trigger the "I don't have enough information" response, not a hallucination), and adversarial/injection attempts (should be rejected/handled safely, not answered). Dataset is versioned (`EvaluationDataset.version`) so a run always records exactly which dataset version it evaluated against.

## 4. Metrics (per master prompt §48, each explicitly defined — not invented without definition)

| Metric | Definition | How measured |
|---|---|---|
| Retrieval relevance | Of the chunks retrieved, what fraction are actually relevant to the question | LLM-judge (structured output, small model) scores each retrieved chunk vs. the question |
| Context recall | Of the chunks tagged `expectedSources` for a case, what fraction were actually retrieved | Set overlap between retrieved chunk `sourceEntityId`s and `expectedSources` |
| Answer relevance | Does the generated answer actually address the question asked | LLM-judge scores answer vs. question (independent of ground truth) |
| Faithfulness | Is every claim in the answer supported by the retrieved context (not the model's general knowledge) | LLM-judge compares answer claims against the context that was actually supplied for that run |
| Answer correctness | Does the answer match `expectedAnswer` in substance | LLM-judge compares answer vs. expectedAnswer |
| Hallucination rate | Fraction of cases where faithfulness check fails (claims not supported by context) | Derived from the faithfulness judge's output across a run |

Reusing a judge model for scoring is itself budgeted and recorded as a `UsageRecord` (evaluation runs are not free, and are not exempt from cost tracking).

## 5. Reproducibility

An `EvaluationRun` row freezes: dataset version, model, prompt version (see prompt-versioning below), and a snapshot of the retrieval config (hybrid weights, top-k, rerank threshold, context token budget) at the time of the run — so a later run can be diffed against a prior one to see exactly what changed and whether it helped or hurt.

## 6. Prompt versioning

Prompts are not scattered as string literals across route handlers. `lib/ai/prompts/*` holds versioned prompt definitions (`{name, version, content, model, parameters, createdAt}`); the chat flow and evaluation runs both reference an explicit active version. Public visitors have no path to modify a system prompt (master prompt §49) — only an admin-side config selects the active version, and even that is a deliberate, audited action (`AuditLog`), not a live-editable field exposed to chat.

## 7. Where evaluation runs

Manually triggered from `/admin/ai/evaluation` (pick dataset + config, run, view results) in the initial build; wiring it into CI (run on prompt/retrieval-config changes before merge) is a natural extension once the admin-triggered flow is proven out — called out here rather than assumed, since CI-based LLM evaluation costs real money per run and should be a deliberate choice, not silent default behavior.
