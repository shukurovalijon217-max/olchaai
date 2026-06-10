---
name: OpenAI integration setup
description: How OpenAI is wired in this project — env var, client, models, tables
---

# OpenAI Integration

**Env var:** `OPENAI_API_KEY` (direct OpenAI, not Replit proxy).

**Client setup:** `lib/integrations-openai-ai-server/src/client.ts` uses `OPENAI_API_KEY` directly with standard OpenAI SDK. Both `client.ts` AND `image/client.ts` were updated to remove the Replit proxy URL checks.

**Models in use:**
- Chat: `gpt-4o-mini` (streaming SSE)
- Images: `dall-e-3` with `response_format: "b64_json"` (NOT `gpt-image-1` which requires proxy)
- Moderation: `gpt-4o-mini`
- Caption generation: `gpt-4o-mini`

**DB tables:** `ai_conversations` and `ai_messages` (prefix "ai_" to avoid conflict with social chat tables).

**Routes:** `artifacts/api-server/src/routes/openai-chat.ts` — mounted at `/openai/*`.

**Why:** Template files assumed Replit AI proxy (AI_INTEGRATIONS_OPENAI_BASE_URL + AI_INTEGRATIONS_OPENAI_API_KEY). User provided own key, so both client files were patched to use OPENAI_API_KEY only.
