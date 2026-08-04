#!/usr/bin/env bash
# check-nexus-chunk-sizes.sh
#
# Builds the Nexus frontend and fails if any JS chunk exceeds its size limit.
#
# LIMITS
#   APP_LIMIT_KB   — 300 KB for every application chunk (the default Vite
#                    chunkSizeWarningLimit set in vite.config.ts).
#   ENTRY_LIMIT_KB — 600 KB ceiling for the main index entry bundle, which
#                    unavoidably includes shared context providers, Layout, and
#                    core utilities.  Reduce this as the entry bundle is split.
#
# VENDOR EXEMPTIONS
#   The following vendor chunks are larger than 300 KB and cannot be reduced
#   further without replacing the underlying library.  Each is only fetched by
#   the browser when the user first visits a page that actually needs it.
#
#   v2-hls     hls.js HTTP-Live-Streaming engine (~520 KB)
#              Loaded lazily — only for ReelsPage / OTubePage video playback.
#
#   v2-charts  recharts D3-based charting library (~410 KB)
#              Loaded lazily — only for analytics / admin chart pages.
#
#   v2-emoji   emoji-mart + emoji data bundle (~510 KB)
#              Loaded lazily — only when the emoji picker is opened.

set -euo pipefail

APP_LIMIT_KB=300
ENTRY_LIMIT_KB=600

# Chunk name prefixes that are permanently exempt from the 300 KB app limit.
EXEMPT_VENDORS=("v2-hls" "v2-charts" "v2-emoji")

echo "==> Building @workspace/nexus …"
BUILD_OUTPUT=$(pnpm --filter @workspace/nexus run build 2>&1)
echo "$BUILD_OUTPUT"

FAIL=0

# Parse Vite's build output table.
# Relevant lines look like:
#   dist/public/assets/HomePage-Dx3j.js       89.87 kB │ gzip:  23.70 kB
while IFS= read -r line; do
  # Only process lines that list a .js asset with a kB size
  if ! echo "$line" | grep -qE 'assets/[^ ]+\.js +[0-9]+\.[0-9]+ kB'; then
    continue
  fi

  CHUNK_FILE=$(echo "$line" | grep -oE 'assets/[^ ]+\.js' | head -1)
  # Strip the content-hash suffix: SomeName-AbCdEfGh.js → SomeName
  CHUNK_NAME=$(basename "$CHUNK_FILE" | sed 's/-[A-Za-z0-9_]*\.js$//')
  SIZE_KB=$(echo "$line" | grep -oE '[0-9]+\.[0-9]+ kB' | head -1 | grep -oE '[0-9]+\.[0-9]+')

  # Skip known-large vendor chunks
  IS_EXEMPT=0
  for VENDOR in "${EXEMPT_VENDORS[@]}"; do
    if [[ "$CHUNK_NAME" == "$VENDOR"* ]]; then
      IS_EXEMPT=1
      break
    fi
  done
  [[ "$IS_EXEMPT" -eq 1 ]] && continue

  # Apply a higher ceiling to the main entry bundle
  if [[ "$CHUNK_FILE" == assets/index-* ]]; then
    APPLICABLE_LIMIT=$ENTRY_LIMIT_KB
  else
    APPLICABLE_LIMIT=$APP_LIMIT_KB
  fi

  # Compare sizes (awk avoids a dependency on bc)
  EXCEEDS=$(awk -v s="$SIZE_KB" -v l="$APPLICABLE_LIMIT" 'BEGIN { print (s+0 > l+0) ? 1 : 0 }')
  if [[ "$EXCEEDS" -eq 1 ]]; then
    echo "  ❌  ${CHUNK_FILE}  ${SIZE_KB} kB  >  ${APPLICABLE_LIMIT} kB limit"
    FAIL=1
  fi
done <<< "$BUILD_OUTPUT"

if [[ "$FAIL" -eq 1 ]]; then
  echo ""
  echo "❌  Chunk-size check FAILED."
  echo "    Split large dependencies with build.rollupOptions.output.manualChunks"
  echo "    in artifacts/nexus/vite.config.ts, or use React.lazy() / dynamic import()."
  exit 1
fi

echo ""
echo "✅  All JS chunks are within their size limits."
