---
name: silent userId fallback breaks auth-gated toggle actions
description: A route that defaults session userId to a hardcoded value instead of requiring auth will silently act on the wrong user and make the UI feel broken/unresponsive.
---

`const userId = (req as any).session?.userId || 1;` (or any hardcoded fallback) instead of checking `if (!userId) return 401` means an unauthenticated or session-broken request still returns 200, but silently mutates data for the fallback user, not the real caller.

**Why:** Reported symptom was "the join-group button still doesn't work" — the request always succeeded (200), so nothing looked broken server-side, but the actual logged-in user's membership never changed. This is exactly the kind of bug the "no silent fallbacks" principle exists to prevent: failing loudly (401) surfaces the real problem (e.g. a session cookie issue) instead of masking it as a no-op for the real user.

**How to apply:** When a toggle/action button "does nothing" despite the backend returning success, check whether the route derives its actor from a properly-guarded session/auth check or has a silent default — compare against sibling routes in the same file for the established `if (!userId) { res.status(401)... }` convention. Also check the frontend for optimistic UI updates with no `onError` revert, which independently makes a failed/misdirected request look like it worked.
