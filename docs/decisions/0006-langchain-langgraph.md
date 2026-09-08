# ADR-0006: LangChain for AI plumbing, LangGraph for controlled agent routing

## Problem
The chatbot needs: embeddings generation, document chunking, a retriever abstraction over hybrid search, structured-output parsing/validation, and a controlled multi-step flow (security check → intent classification → route → retrieve → rerank → generate → validate) — without either hand-rolling every OpenAI integration or building an open-ended autonomous agent.

## Options
1. Raw OpenAI SDK calls everywhere, hand-written chunking/retrieval glue.
2. LangChain for document/embedding/retriever plumbing + LangGraph for the orchestration graph.
3. A fully autonomous agent framework with unrestricted tool use and open-ended planning.

## Decision
LangChain, confined to `lib/ai/*` (embeddings, text splitters, retriever interfaces, structured output parsing), wrapping OpenAI. LangGraph implements one explicit, finite state graph for chat requests: `security → intent → route → (retrieve → rerank → generate → validate) | (controlled general response) | (reject)`.

## Why
- LangChain removes boilerplate (text splitting, retriever interfaces, structured output validation glue) that would otherwise be hand-written for no educational or architectural benefit — but it's isolated behind `lib/ai/*` so domain code (`features/rag`, `features/chatbot`) never imports LangChain types directly, keeping the option to replace it open.
- LangGraph is used for exactly one thing: making the chat request flow an explicit, inspectable state machine instead of a single giant prompt or an unbounded agent loop. Every node is a plain function with a defined input/output; every edge is a deterministic routing rule (not an LLM "decide what to do next" free-for-all).
- Explicitly rejecting an autonomous/open-ended agent: the LLM never chooses which tools to call from an unbounded set, never has direct DB/filesystem/shell access (see [security.md](security.md)), and cannot alter its own routing. This satisfies the brief's "controlled agentic behavior, not autonomous behavior for its own sake" (§31).

## Tradeoffs
- Two more dependencies to keep pinned/updated versus raw SDK calls — accepted because the plumbing they remove (chunking, retriever interfaces, structured parsing/validation) is real and non-trivial to hand-roll correctly.
- LangGraph adds a small amount of ceremony (explicit state type, node functions) for what could be an if/else chain at this scale — accepted because it's the clearest way to make the flow auditable and testable node-by-node, and it directly demonstrates the target skill.
