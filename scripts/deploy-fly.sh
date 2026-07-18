#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# OlchaAI — Fly.io 6-region deployment script
#
# Usage:
#   chmod +x scripts/deploy-fly.sh
#   ./scripts/deploy-fly.sh
#
# Prerequisites:
#   fly auth login   (one-time)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP="olchaai-api"
REGIONS="fra,sin,iad,gru,syd,jnb"

echo ""
echo "🌍  OlchaAI — Fly.io Multi-Region Deploy"
echo "   App: $APP"
echo "   Regions: $REGIONS (6 continents)"
echo ""

# ── 1. Create app if not exists ───────────────────────────────────────────────
if ! fly apps list | grep -q "$APP"; then
  echo "▶ Creating Fly.io app: $APP"
  fly apps create "$APP" --org personal
else
  echo "✓ App already exists: $APP"
fi

# ── 2. Sync secrets from .env (if present) ───────────────────────────────────
# Secrets must be set manually via: fly secrets set KEY=value
# Or export them here from environment:
echo ""
echo "▶ Setting secrets (reads from environment variables)"
echo "  Make sure these are exported in your shell before running:"
echo ""

REQUIRED_SECRETS=(
  DATABASE_URL
  SESSION_SECRET
  OPENAI_API_KEY
  R2_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY
  R2_BUCKET_NAME
  R2_ACCOUNT_ID
  R2_PUBLIC_URL
  RESEND_API_KEY
  STRIPE_SECRET_KEY
  FIREBASE_SERVICE_ACCOUNT_JSON
  VAPID_PUBLIC_KEY
  VAPID_PRIVATE_KEY
  VAPID_SUBJECT
  METERED_API_KEY
)

OPTIONAL_SECRETS=(
  BUNNY_CDN_HOSTNAME
  READ_REPLICA_DATABASE_URL
  DEFAULT_OBJECT_STORAGE_BUCKET_ID
  PRIVATE_OBJECT_DIR
  PUBLIC_OBJECT_SEARCH_PATHS
)

SECRETS_ARGS=""
for key in "${REQUIRED_SECRETS[@]}"; do
  val="${!key:-}"
  if [ -z "$val" ]; then
    echo "  ⚠️  Missing required secret: $key"
  else
    SECRETS_ARGS="$SECRETS_ARGS $key=$val"
  fi
done
for key in "${OPTIONAL_SECRETS[@]}"; do
  val="${!key:-}"
  if [ -n "$val" ]; then
    SECRETS_ARGS="$SECRETS_ARGS $key=$val"
  fi
done

if [ -n "$SECRETS_ARGS" ]; then
  # shellcheck disable=SC2086
  fly secrets set --app "$APP" $SECRETS_ARGS
  echo "  ✓ Secrets uploaded"
fi

# ── 3. Deploy (build + push Docker image) ────────────────────────────────────
echo ""
echo "▶ Building & deploying (this takes ~3 minutes on first run)"
echo ""

# Build context must be the monorepo root
fly deploy \
  --app "$APP" \
  --config artifacts/api-server/fly.toml \
  --dockerfile artifacts/api-server/Dockerfile \
  --build-arg NODE_ENV=production \
  --remote-only

# ── 4. Scale to all 6 regions ─────────────────────────────────────────────────
echo ""
echo "▶ Scaling to 6 continents: $REGIONS"
fly scale count 1 --app "$APP" --region "$REGIONS"

# ── 5. Verify ─────────────────────────────────────────────────────────────────
echo ""
echo "▶ Health check..."
sleep 5
fly status --app "$APP"

echo ""
echo "✅  Deploy complete!"
echo ""
echo "   Dashboard:  https://fly.io/apps/$APP"
echo "   Logs:       fly logs --app $APP"
echo "   Regions:    fly regions list --app $APP"
echo ""
echo "   Custom domain (Cloudflare → Fly.io):"
echo "   1. fly certs add api.olchaai.com"
echo "   2. fly ips allocate-v4 --shared"
echo "   3. In Cloudflare DNS: A record api.olchaai.com → Fly.io IP (Proxied ✅)"
echo ""
