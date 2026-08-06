#!/usr/bin/env node
/**
 * sync-railway-env.mjs
 *
 * Reads the explicitly listed Replit secrets from process.env and pushes them
 * to the Railway production environment via the GraphQL API
 * (variableCollectionUpsert mutation).
 *
 * Usage:
 *   RAILWAY_TOKEN=<token> node scripts/sync-railway-env.mjs
 *
 * The RAILWAY_TOKEN secret must be present in the Replit environment.
 * All other secrets listed in VARIABLE_MAP are read from process.env and
 * pushed to Railway.  Missing secrets are reported but do not abort the run.
 *
 * Safety notes:
 *   - replace: false  → existing Railway vars are UPDATED, never deleted.
 *   - skipDeploys: true by default.  Pass --deploy to trigger a redeploy.
 *   - Values are stripped of surrounding double-quotes before being pushed
 *     (the manual-copy-paste bug that caused the Upstash production outage).
 */

import { createRequire } from "module";

// ─── Railway project identifiers ────────────────────────────────────────────
const PROJECT_ID     = "a17d9014-283c-46ed-8246-57b905aba237";
const ENVIRONMENT_ID = "3f9b1d72-2c6d-49db-b756-42ac52ba7aa0";
const SERVICE_ID     = "6a712054-7af1-4910-a96e-9e0696490b44"; // olchaai-nexus

// ─── Replit secret name → Railway variable name ─────────────────────────────
// Edit this map when secrets are added, rotated, or renamed.
// Keys   = Replit secret names  (left side of the Secrets panel)
// Values = Railway variable names (what the production container will see)
//
// Secrets that should NOT be pushed to Railway (e.g. RAILWAY_TOKEN itself,
// Expo/GitHub tokens only used by Replit CI) are intentionally omitted.
const VARIABLE_MAP = {
  // Database
  NEON_DATABASE_URL:          "DATABASE_URL",
  NEON_API_KEY:               "NEON_API_KEY",

  // Object storage (Cloudflare R2)
  R2_ACCESS_KEY_ID:           "R2_ACCESS_KEY_ID",
  R2_SECRET_ACCESS_KEY:       "R2_SECRET_ACCESS_KEY",
  R2_BUCKET_NAME:             "R2_BUCKET_NAME",
  R2_ACCOUNT_ID:              "R2_ACCOUNT_ID",
  R2_PUBLIC_URL:              "R2_PUBLIC_URL",

  // Cloudflare (cache purging, zone rules)
  CLOUDFLARE_API_TOKEN:       "CLOUDFLARE_API_TOKEN",
  CLOUDFLARE_ZONE_ID:         "CLOUDFLARE_ZONE_ID",

  // Replit Object Storage (media uploads)
  DEFAULT_OBJECT_STORAGE_BUCKET_ID: "DEFAULT_OBJECT_STORAGE_BUCKET_ID",
  PRIVATE_OBJECT_DIR:         "PRIVATE_OBJECT_DIR",
  PUBLIC_OBJECT_SEARCH_PATHS: "PUBLIC_OBJECT_SEARCH_PATHS",

  // Redis (Upstash)
  UPSTASH_REDIS_REST_URL:     "UPSTASH_REDIS_REST_URL",
  UPSTASH_REDIS_REST_TOKEN:   "UPSTASH_REDIS_REST_TOKEN",

  // AI / OpenAI
  OPENAI_API_KEY:             "OPENAI_API_KEY",
  GROQ_API_KEY:               "GROQ_API_KEY",

  // Payments
  STRIPE_SECRET_KEY:          "STRIPE_SECRET_KEY",
  STRIPE_WEBHOOK_SECRET:      "STRIPE_WEBHOOK_SECRET",

  // Auth / sessions
  SESSION_SECRET:             "SESSION_SECRET",
  VAPID_PRIVATE_KEY:          "VAPID_PRIVATE_KEY",

  // Firebase (push notifications)
  FIREBASE_SERVICE_ACCOUNT_JSON: "FIREBASE_SERVICE_ACCOUNT_JSON",

  // Email
  RESEND_API_KEY:             "RESEND_API_KEY",

  // Music search
  JAMENDO_CLIENT_ID:          "JAMENDO_CLIENT_ID",

  // Video/WebRTC
  METERED_API_KEY:            "METERED_API_KEY",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Strip surrounding double-quotes that Railway occasionally stores literally. */
function stripQuotes(value) {
  if (
    typeof value === "string" &&
    value.length >= 2 &&
    value.startsWith('"') &&
    value.endsWith('"')
  ) {
    return value.slice(1, -1);
  }
  return value;
}

/** Call the Railway GraphQL API. */
async function railwayGql(token, query, variables = {}) {
  const res = await fetch("https://backboard.railway.app/graphql/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`Railway HTTP ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(`Railway GQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const token = process.env.RAILWAY_TOKEN;
  if (!token) {
    console.error("❌  RAILWAY_TOKEN is not set. Aborting.");
    process.exit(1);
  }

  const triggerDeploy = process.argv.includes("--deploy");

  // Build the variables payload, collecting diagnostics along the way.
  const railwayVars = {};
  const missing = [];
  const stripped = [];

  for (const [replitKey, railwayKey] of Object.entries(VARIABLE_MAP)) {
    const raw = process.env[replitKey];
    if (raw === undefined || raw === "") {
      missing.push(replitKey);
      continue;
    }
    const clean = stripQuotes(raw);
    if (clean !== raw) stripped.push(replitKey);
    railwayVars[railwayKey] = clean;
  }

  const syncCount = Object.keys(railwayVars).length;
  console.log(`\n📦  Syncing ${syncCount} variable(s) to Railway…`);
  if (stripped.length) {
    console.warn(`⚠️   Stripped surrounding quotes from: ${stripped.join(", ")}`);
  }
  if (missing.length) {
    console.warn(`⚠️   Not found in Replit env (skipped): ${missing.join(", ")}`);
  }

  if (syncCount === 0) {
    console.error("❌  Nothing to push. Check your Replit secrets.");
    process.exit(1);
  }

  // Push all variables in a single mutation.
  const UPSERT_MUTATION = `
    mutation VariableCollectionUpsert($input: VariableCollectionUpsertInput!) {
      variableCollectionUpsert(input: $input)
    }
  `;

  await railwayGql(token, UPSERT_MUTATION, {
    input: {
      projectId:     PROJECT_ID,
      environmentId: ENVIRONMENT_ID,
      serviceId:     SERVICE_ID,
      replace:       false,
      skipDeploys:   !triggerDeploy,
      variables:     railwayVars,
    },
  });

  console.log(`✅  ${syncCount} variable(s) pushed to Railway (production).`);

  if (triggerDeploy) {
    console.log("🚀  --deploy flag set — triggering Railway redeploy…");
    const DEPLOY_MUTATION = `
      mutation ServiceInstanceDeploy($environmentId: String!, $serviceId: String!) {
        serviceInstanceDeploy(environmentId: $environmentId, serviceId: $serviceId)
      }
    `;
    await railwayGql(token, DEPLOY_MUTATION, {
      environmentId: ENVIRONMENT_ID,
      serviceId:     SERVICE_ID,
    });
    console.log("✅  Redeploy triggered.");
  } else {
    console.log("ℹ️   No redeploy triggered. Run with --deploy to also restart Railway.");
  }

  // Print a summary table.
  console.log("\n── Synced variables ───────────────────────────────────────");
  for (const [replitKey, railwayKey] of Object.entries(VARIABLE_MAP)) {
    if (railwayVars[railwayKey] !== undefined) {
      const label = replitKey === railwayKey ? replitKey : `${replitKey} → ${railwayKey}`;
      console.log(`   ✓ ${label}`);
    }
  }
  console.log("───────────────────────────────────────────────────────────\n");
}

main().catch((err) => {
  console.error("❌  Sync failed:", err.message);
  process.exit(1);
});
