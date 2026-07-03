---
name: WebView continuous-animation freeze pattern
description: How unconditional Framer Motion infinite animations in a feed cause mobile WebView freezing, and the fix pattern.
---

## Symptom
Mobile app (native shell wrapping the web feed in a WebView) freezes/hangs, especially with many posts. Not caused by memory growth (feed list wasn't infinite-scroll/paginated) — caused by CPU/GPU load.

## Root cause
Per-post decorative animations (pulse rings, floating particles, background gradient loops) using Framer Motion `animate={{ ... repeat: Infinity }}` running unconditionally for every rendered post — even ones scrolled off-screen. WebViews have far less CPU/GPU budget than a native mobile browser, so N posts × several infinite animations each compounds fast.

## Fix pattern
Gate every infinite/looping `motion.*` animation behind the existing scroll-viewport visibility flag (`useInView` from framer-motion, threshold ~0.5) that snap-scroll feed cards already compute for other purposes (e.g. video autoplay). Concretely:
- Pass an `inView`/`isInView` prop into any small reusable animated subcomponent (e.g. an icon button with a pulse ring) so its infinite `animate` block only renders while the parent card is in view.
- Conditionally render (not just conditionally animate) purely decorative elements like floating particles — skip mounting them entirely when off-screen.
- For background gradient loops, swap `animate={{ opacity: [...] repeat: Infinity }}` for a static value when out of view instead of leaving the infinite loop running invisibly.

**Why:** Framer Motion still runs off-screen animations' JS/rAF ticks even when not visible, unless explicitly gated — this is invisible in normal browser testing (fast CPU) but becomes the freeze trigger inside a resource-constrained WebView.

**How to apply:** Any time a feed/list component author reports "app freezes on scroll" or "phone lags" in a WebView-wrapped app, check for `repeat: Infinity` animations first before suspecting memory leaks or virtualization — check if they're gated by the same in-view detection the card already uses for video autoplay.
