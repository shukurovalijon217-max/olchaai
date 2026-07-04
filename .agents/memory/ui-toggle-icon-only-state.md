---
name: Toggle buttons must differentiate label text, not just icon
description: A follow/like/save-style toggle button that only swaps an icon while both states render identical text looks broken to tests and screen readers even when the backend state is correct.
---

A toggle button (e.g. Follow/Following) that renders `isActive ? <IconA/>Label : <IconB/>Label` with the *same* text string in both branches will visually/accessibly appear unchanged after toggling, even though the underlying boolean and DB state are correct. This caused an e2e test (and would confuse real users) to conclude the feature "didn't work" when only the icon differed.

**Why:** Found in Nexus's Reels page follow button — `onFollow` and the mutation were fully correct, but both branches of the JSX said "Obuna", so nothing observable changed on click or after reload.

**How to apply:** For any binary-state UI control in this codebase (follow/unfollow, like/unlike, save/unsave, mute/unmute, etc.), always give each state a distinct visible text label (not just a different icon), so both automated tests (which check accessible text) and users can tell the state actually changed.
