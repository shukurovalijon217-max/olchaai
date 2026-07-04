---
name: Midnight Confessions visibility semantics
description: Design decision for OlCha's midnight-only posts feature — who can see them and when
---

Posts flagged "midnight only" are hidden from **everyone, including their own author**, outside the 23:00–05:00 local window (per-viewer `users.timezone`, UTC fallback). There is no standing exemption for the author to view/edit their own post at other hours via normal read paths.

**Why:** The feature is pitched to users as "posts that only exist at night" — a literal, safe confession booth. Giving the author a bypass would contradict that promise and make it a weaker privacy feature (author could screenshot/reference it and share elsewhere at will during the day). Confirmed via curl: an author's own `GET /posts/:id` for their midnight post 404s outside the window, same as any other viewer.

**How to apply:** Any new read path that lists or renders posts must reuse the shared midnight-visibility condition helper rather than special-casing "is this the author" — consistency across all endpoints (feed, profile, search, trending) is what prevents leaks. The one intentional exception is admin/moderation content review, which must ignore this filter so moderators can see everything regardless of time.
