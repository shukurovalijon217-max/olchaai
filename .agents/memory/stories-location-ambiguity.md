---
name: Stories UX — clarify location before building
description: "Stories" feature requests in this app can mean two very different things; confirm which before implementing.
---

When a user asks for "stories" (Instagram-style) functionality, there are at least two distinct interaction models that look similar in a one-line request but require different code:

1. **A dedicated stories screen/strip** — a standalone list of story circles (its own section/slide), tapped to open a fullscreen viewer.
2. **Per-post avatar story bubbles embedded in the feed** — double-tapping a post author's avatar directly inside a feed card reveals a small pulsing "live" indicator, and tapping that opens that author's story fullscreen. No separate screen exists at all; the entry point is the avatar on each individual post.

**Why:** Building (1) when the user meant (2) reads as "nothing happened" / "I don't understand what you did" even though the feature technically works — the user is looking at the wrong part of the screen. This caused multiple rounds of confusion in one session before the actual requirement (per-post avatar bubble) was said explicitly.

**How to apply:** If a "stories" request doesn't explicitly say where the entry point lives (top strip vs. per-post avatar vs. somewhere else), ask, or look for wording like "lentada/lentadagi" (in the feed) / "postlar ustida" (on posts) which signals the per-post-avatar model rather than a separate screen.
