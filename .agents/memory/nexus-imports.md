---
name: Nexus frontend import conventions
description: Correct import paths for API hooks and current user in Nexus pages
---

# Nexus Frontend Import Conventions

**Rule:** All React Query hooks in Nexus pages MUST import from `@workspace/api-client-react`, NOT `@workspace/api-zod`.

**Current user:** Pages access the logged-in user via `useAuth()` from `@/context/AuthContext`, not a `useCurrentUser` hook (which doesn't exist).

**Correct pattern:**
```tsx
import { useListProducts, useBuyProduct } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";

export default function MyPage() {
  const { user } = useAuth();
  const { data } = useListProducts({ ... });
}
```

**Wrong pattern (don't do this):**
```tsx
import { useListProducts } from "@workspace/api-zod"; // WRONG - module doesn't exist in nexus
import { useCurrentUser } from "@/hooks/useCurrentUser"; // WRONG - hook doesn't exist
```

**Why:** The nexus package.json declares `@workspace/api-client-react` as a dependency, not `@workspace/api-zod`. The `@workspace/api-zod` package exists in the monorepo but is not a nexus dependency.

**Mutation hook variable formats (from Orval codegen):**
- Delete: `mutateAsync({ id: number })`
- Buy: `mutateAsync({ id: number, data: BodyType<BuyProductInput> })`
- Upload: `mutateAsync({ data: BodyType<UploadUrlRequest> })`
- Query options: `useSearchAll(params)` — cannot pass `{ query: { enabled } }` without queryKey in v5
