// Exact match to NEXUS web app CSS variables (hsl → hex converted)
const colors = {
  dark: {
    // Core surfaces — hsl(222 47% 5%) = #060d1a
    background: "#060d1a",
    foreground: "#eef2f8",
    text: "#eef2f8",

    // Cards — hsl(222 40% 8%) = #0d1424
    card: "#0d1424",
    cardForeground: "#eef2f8",
    surface: "#0a1020",
    surfaceElevated: "#121e32",

    // Borders — hsl(220 30% 15%) = #1d2d40
    border: "#1d2d40",
    borderSubtle: "#162033",
    input: "#1d2d40",

    // Text shades
    textSecondary: "#a8bcd4",
    // hsl(215 20% 55%) = #7a8fa8
    mutedForeground: "#7a8fa8",
    placeholder: "#4a607a",

    // Primary — hsl(252 100% 68%) = #7857ff
    primary: "#7857ff",
    primaryForeground: "#ffffff",
    primaryLight: "#9d7fff",
    primaryDark: "#5a3ecc",
    // For border glow
    primaryBorder: "#6040ee",

    // Accent — hsl(280 90% 60%) = #9d00ff
    accent: "#9d19ff",
    accentForeground: "#ffffff",

    // Neon palette (matching web exactly)
    cyan: "#22d3ee",
    rose: "#ec4899",
    amber: "#f59e0b",
    green: "#10b981",
    red: "#ef4444",
    indigo: "#818cf8",
    orange: "#f97316",
    violet: "#7c3aed",
    teal: "#14b8a6",
    blue: "#3b82f6",
    pink: "#f472b6",

    // Story ring colors
    storyGrad1: "#7857ff",
    storyGrad2: "#ec4899",
    storyGrad3: "#f59e0b",

    // Tab bar
    tabBar: "#05090f",
    tabBarBorder: "#0f1928",
    tabActive: "#7857ff",
    tabInactive: "#3a4d62",

    // Glass surfaces
    glass: "rgba(13,20,36,0.85)",
    glassBorder: "rgba(255,255,255,0.08)",
    glassHighlight: "rgba(255,255,255,0.04)",

    // Elevate layers (from web CSS vars)
    elevate1: "rgba(255,255,255,0.04)",
    elevate2: "rgba(255,255,255,0.09)",

    overlay: "rgba(6,13,26,0.88)",
    overlayLight: "rgba(6,13,26,0.55)",

    // Post type themes (exact from FeedCard.tsx)
    photoAccent: "#22d3ee",
    photoGlow: "rgba(34,211,238,0.45)",
    photoBg: "#060c14",
    videoAccent: "#f87171",
    videoGlow: "rgba(248,113,113,0.45)",
    videoBg: "#0f0808",
    textAccent: "#818cf8",
    textGlow: "rgba(129,140,248,0.4)",
    textPostBg: "#06060f",

    // Input
    inputBackground: "#0d1424",
  },
  radius: 12,
};

export default colors;
