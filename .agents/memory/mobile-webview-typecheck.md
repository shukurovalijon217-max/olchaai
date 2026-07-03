---
name: olcha-mobile WebView typecheck workaround
description: react-native-webview's types conflict with the installed expo/react-native version, causing a spurious "never" overload error on the <WebView> JSX element.
---

`artifacts/olcha-mobile/app/index.tsx` renders the Nexus web app inside `<WebView>`. The installed `react-native-webview@14.0.1` is newer than the version Expo expects (`13.15.0` per the Expo compatibility warning), which makes TypeScript resolve the component's prop overloads to `never` and fail on every prop (`ref`, `source`, `style`, all the `allows*`/`on*` handlers).

**Why:** This is a type-resolution artifact from the version mismatch, not a real runtime bug — the WebView works fine at runtime. It was suppressed once with `{/* @ts-ignore WebView type overload conflict with react-native-webview */}` directly above the `<WebView` tag, but that comment was accidentally dropped in a later edit, which broke `pnpm run typecheck` for the whole workspace.

**How to apply:** Keep the `@ts-ignore` comment directly above `<WebView` in `index.tsx`. If you edit props on this component and typecheck fails with "No overload matches this call" / "assignable to type 'never'", don't chase individual prop types — restore the ts-ignore instead. Separately, callback params like `onNavigationStateChange={(nav) => ...}` still need explicit typing (e.g. `(nav: { canGoBack: boolean }) => ...`) since ts-ignore only suppresses the one line it precedes.
