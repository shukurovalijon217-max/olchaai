---
name: Global response scrubber corrupting Date objects to {}
description: A recursive object-scrubber applied to every /api res.json body (e.g. to strip passwordHash) silently turns any raw Date instance into {} unless it special-cases `instanceof Date`.
---

A generic recursive sanitizer that does `Object.entries(value)` on every object field to strip a sensitive key (like `passwordHash`) will also recurse into `Date` objects — but `Date` has zero own enumerable properties, so the sanitizer rebuilds it as `{}`. Any route returning a raw DB `Date` field (createdAt, updatedAt, scheduledAt, etc.) through that same res.json pipeline then serializes as `{}` instead of an ISO string.

**Why:** Diagnosed after a user reported "Invalid Date" showing everywhere in a chat UI. Curl against the actual endpoint showed `"createdAt":{}` in the JSON response, even though the DB column and route code were correct — the corruption happened in a shared `app.use("/api", ...)` middleware that wrapped `res.json` for a security scrub, applied globally across all routes.

**How to apply:** Whenever a global/shared response transformer walks response bodies recursively (for redaction, logging, snake_case conversion, etc.), always special-case `instanceof Date` (and similarly `Buffer`, `Map`, `Set` if relevant) to return the value unchanged before falling into generic object recursion — otherwise every date field silently breaks for every route that uses it, and the bug is invisible in code review of the individual routes (they look correct) since it only manifests in the shared middleware.
