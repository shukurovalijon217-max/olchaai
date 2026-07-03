---
name: Object storage GCS round-trip optimization
description: Avoid redundant GCS metadata/exists calls in objectStorage.ts / objectAcl.ts that cause slow media loads.
---

`getObjectEntityFile()` + `downloadObject()` + `getObjectAclPolicy()` previously made 3 sequential GCS round-trips per media request (`exists()`, then `getMetadata()`, then another `getMetadata()` inside the ACL check). This was the root cause of multi-second (6-8s dev, 3s+ prod) load times for `/api/storage/objects/...` and was reported by users as app-wide lag/freezing on mobile.

**Why:** Each GCS call is a network round-trip; on a WebView-heavy mobile app every image/avatar/video triggers this path, so 3x round-trips compounds badly under scroll.

**How to apply:** Never re-fetch metadata you already have. `getObjectEntityFile()` should not call `.exists()` — let the single `getMetadata()` call in `downloadObject()` double as the existence check (catch GCS 404 → throw `ObjectNotFoundError`). Pass that already-fetched metadata into `getObjectAclPolicy(file, metadata)` instead of letting it call `getMetadata()` again. If you touch this file again, grep for any other caller doing `.exists()` followed by `.getMetadata()` and collapse them the same way.
