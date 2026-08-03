#!/usr/bin/env node
/**
 * Post-build guard: fail if any absolute API host URL was baked into the bundle.
 *
 * Run automatically after `vite build` via the `build` script in package.json.
 *
 * Why this exists:
 *   The Dockerfile ARG default is "" so that relative /api/* paths are used in
 *   production.  If VITE_API_BASE_URL is accidentally set to an absolute URL at
 *   build time (e.g. "https://olchaai-api-production.up.railway.app") that URL
 *   gets baked into the minified bundle and all API calls bypass the Nexus proxy,
 *   breaking the app.  This script catches the mistake before the image ships.
 */

import { readdirSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const distDir = resolve(__dirname, "../dist/public/assets");

/**
 * Regex patterns for absolute API host URLs that must never be baked into the
 * bundle.  Add new hosting domains here as the platform evolves.
 */
const FORBIDDEN_PATTERNS = [
  /https?:\/\/[a-zA-Z0-9-]+\.up\.railway\.app/g,
  /https?:\/\/[a-zA-Z0-9-]+\.railway\.app/g,
  /https?:\/\/[a-zA-Z0-9-]+\.herokuapp\.com/g,
  /https?:\/\/[a-zA-Z0-9-]+\.onrender\.com/g,
  /https?:\/\/[a-zA-Z0-9-]+\.render\.com/g,
  /https?:\/\/[a-zA-Z0-9-]+\.vercel\.app/g,
  /https?:\/\/[a-zA-Z0-9-]+\.netlify\.app/g,
  /https?:\/\/[a-zA-Z0-9-]+\.fly\.dev/g,
];

// ---------------------------------------------------------------------------
// Locate JS chunks in the build output
// ---------------------------------------------------------------------------
let jsFiles;
try {
  jsFiles = readdirSync(distDir).filter((f) => f.endsWith(".js"));
} catch (err) {
  console.error(
    `[api-url-check] ERROR: Could not read dist directory: ${distDir}`,
  );
  console.error(
    "  Ensure the Vite build completed successfully before this step runs.",
  );
  process.exit(1);
}

if (jsFiles.length === 0) {
  console.error("[api-url-check] ERROR: No JS chunks found in", distDir);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Scan every chunk for forbidden patterns
// ---------------------------------------------------------------------------
let failed = false;

for (const file of jsFiles) {
  const filePath = join(distDir, file);
  const content = readFileSync(filePath, "utf-8");

  for (const pattern of FORBIDDEN_PATTERNS) {
    // Reset lastIndex between files when using the /g flag
    pattern.lastIndex = 0;
    const matches = content.match(pattern);
    if (matches) {
      if (!failed) {
        console.error("\n[api-url-check] ✖ ABSOLUTE API HOST FOUND IN BUNDLE\n");
      }
      console.error(`  Chunk : ${file}`);
      for (const m of [...new Set(matches)]) {
        console.error(`  URL   : ${m}`);
      }
      failed = true;
    }
  }
}

// ---------------------------------------------------------------------------
// Report result
// ---------------------------------------------------------------------------
if (failed) {
  console.error(
    "\n[api-url-check] Build rejected.\n" +
      "  The bundle contains an absolute API host URL.\n" +
      '  Fix: ensure VITE_API_BASE_URL is unset or set to "" at build time\n' +
      "  so that relative /api/* paths are used via the Nexus proxy.\n",
  );
  process.exit(1);
}

console.log(
  `[api-url-check] ✔ OK — no absolute API host URLs found in ${jsFiles.length} bundle chunk(s).`,
);
