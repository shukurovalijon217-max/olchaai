---
name: Orval codegen duplicate export fix
description: How to avoid TS2308 duplicate export errors when using Orval codegen
---

# Orval Codegen: Duplicate Type Export Fix

**Rule:** Always use `$ref` to a named component schema for OpenAPI request body schemas. Never use inline `type: object` schemas directly in `requestBody`.

**Why:** Orval generates a TypeScript type file (e.g., `sendLiveGiftBody.ts`) for each inline request body schema. When the barrel `index.ts` re-exports both `./generated/api` (Zod schemas) and `./generated/types` (TS types), TypeScript throws TS2308 "has already exported a member named X" because both modules export the same identifier.

**How to apply:**
1. For every `requestBody` in OpenAPI spec, define the body schema as a named component under `components/schemas/`
2. Reference it with `$ref: "#/components/schemas/YourBodyInputName"`
3. In `lib/api-zod/src/index.ts`, keep `export type * from "./generated/types"` (type-only re-export prevents value conflicts)

**Example fix:**
```yaml
# WRONG - inline schema
requestBody:
  content:
    application/json:
      schema:
        type: object
        properties:
          giftType: { type: string }

# CORRECT - use $ref
requestBody:
  content:
    application/json:
      schema:
        $ref: "#/components/schemas/LiveGiftInput"
```
