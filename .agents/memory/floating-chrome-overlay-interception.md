---
name: Global floating chrome intercepting overlay taps
description: Fixed-position global UI (AI assistant orb, dock tabs, avatar bubble) rendered in a shared Layout can silently swallow taps meant for a full-screen overlay's own controls, even when the overlay has a higher z-index.
---

Full-screen overlays (video players, modals) that mount deep in the component tree do not automatically sit "on top of" global fixed-position chrome from the app shell just because their own internal z-index is high — if the global chrome elements are siblings rendered later in the DOM or use their own very high z-index, they can still catch pointer events over parts of the overlay.

**Why:** In OlCha/Nexus, the OTube full-screen video player's top bar and right-side action icons were non-functional because `MuniPanel` (AI orb) and `DockEdgeTab` (edge dock tabs) in `Layout.tsx` render globally with z-index 80/9993 and stayed mounted/interactive underneath or overlapping the player overlay, intercepting taps before they reached the player's own buttons.

**How to apply:** When adding any full-screen overlay/modal on top of a shared app shell, don't rely on z-index alone — add an explicit shared boolean flag (e.g. `playerOpen` in a context) that the overlay sets true on mount / false on unmount, and have the shell gate all its own floating chrome (`!playerOpen`) behind that flag. Check for this pattern first when a user reports "buttons on my overlay/modal don't respond" despite the overlay visually being on top.
