---
name: Story viewer broken media fallback
description: storyImgError state is required — broken URLs don't trigger !mediaUrl fallback
---

## Rule
The story viewer must track `storyImgError` state separately from `mediaUrl` nullness.

**Why:** When `activeStory.mediaUrl` is a broken URL (HTTP 404 / old GCS link), the CSS `backgroundImage: url(broken)` renders nothing (black). The `!activeStory.mediaUrl` condition is false (it's set, just broken), so the gradient/text fallback never shows. Only an `onError` event on the `<img>` can catch this.

**How to apply:**
- Reset `storyImgError = false` whenever `viewerGroupIdx` or `viewerStoryIdx` changes.
- Condition for showing media: `activeStory.mediaUrl && !storyImgError`
- Condition for showing fallback: `!activeStory.mediaUrl || storyImgError`
- Affected file: `artifacts/nexus/src/pages/HomePage.tsx`
