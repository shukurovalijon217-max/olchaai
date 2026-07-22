---
name: GROQ + OpenAI smart client
description: api-server uses a smart Groq-first AI client with OpenAI fallback
---

## Setup

`artifacts/api-server/src/lib/aiClient.ts` exports:
- `aiClient` — OpenAI-compatible client (Groq when GROQ_API_KEY set, else OpenAI)
- `AI_MODEL` — "llama-3.3-70b-versatile" (Groq) or "gpt-4o-mini" (OpenAI)
- `AI_PROVIDER` — "Groq" or "OpenAI"
- `AI_FAST_MODEL` — "llama-3.1-8b-instant" (Groq) or "gpt-4o-mini" (OpenAI)

`artifacts/ai-core/src/orchestrator.ts` has same pattern (inline, not shared).

## Rule
Always import from `../lib/aiClient` in api-server routes, never directly from `@workspace/integrations-openai-ai-server`. The integrations package is still used by other parts of the codebase — don't remove it.

**Why:** GROQ is 3x faster and 10x cheaper than GPT-4o-mini for the same tasks. GROQ_API_KEY is already set in Railway.

## Health check
GET /api/ai/config-status returns `{provider, model, groq, openai, status, message}`.
