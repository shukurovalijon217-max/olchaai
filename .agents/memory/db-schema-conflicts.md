---
name: DB schema naming conflicts
description: Naming collisions between OpenAI template tables and social messaging tables
---

# DB Schema Naming Conflicts

**Problem:** The OpenAI template copied `lib/db/src/schema/conversations.ts` and `messages.ts` with table names `conversations` and `messages`. The existing messaging route (`artifacts/api-server/src/routes/messages.ts`) expected `conversationsTable`, `conversationParticipantsTable`, and `messagesTable` — none of which existed in any schema.

**Resolution:**
1. Renamed template tables to `aiConversations` (table: `ai_conversations`) and `aiMessages` (table: `ai_messages`).
2. Fixed `openai-chat.ts` to import `aiConversations as conversations, aiMessages as messages`.
3. Rewrote `artifacts/api-server/src/routes/messages.ts` to define inline `pgTable` definitions for `chat_conversations`, `chat_participants`, `chat_messages` — these are not in the shared schema but work at runtime since the tables exist in DB.

**Why:** The social messaging tables were never formally added to `lib/db/src/schema/` — they exist in DB but the route used wrong import names. Inline pgTable in the route file avoids schema conflicts while keeping the route functional.
