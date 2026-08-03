---
name: iOS Safari video must call v.load()
description: Programmatic v.src assignment requires v.load() on iOS Safari or video never loads
---

## Rule
After setting `videoElement.src = url` programmatically, always call `videoElement.load()` immediately after.

**Why:** iOS Safari does not auto-detect src changes on a `<video>` element when the src is set via JS (not as an HTML attribute). Without `v.load()`, the video element stays blank (black screen) even though `v.src` is set correctly.

**How to apply:**
- In any React component that sets `ref.current.src = url` in a `useEffect`, add `ref.current.load()` on the next line.
- This is safe on all browsers — Chrome/Firefox handle duplicate `load()` calls gracefully.
- Affected file: `artifacts/nexus/src/pages/ReelsPage.tsx` — `ReelVideoEl` component.
