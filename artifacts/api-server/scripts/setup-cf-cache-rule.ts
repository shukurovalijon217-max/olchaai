#!/usr/bin/env tsx
/**
 * setup-cf-cache-rule.ts
 *
 * One-time setup script: creates a Cloudflare Response Header Transform Rule
 * on the zone that serves the R2 media bucket's public domain.
 *
 * The rule injects `Cache-Control: public, max-age=31536000, immutable` on
 * every response so the Cloudflare edge caches media files aggressively.
 *
 * Usage:
 *   pnpm tsx artifacts/api-server/scripts/setup-cf-cache-rule.ts
 *
 * Required env vars (already in Replit Secrets):
 *   CLOUDFLARE_API_TOKEN   — zone-edit permission
 *   CLOUDFLARE_ZONE_ID     — the zone that hosts the R2 public domain
 *   R2_PUBLIC_URL          — e.g. https://media.olchaai.com
 */

const CF_API = "https://api.cloudflare.com/client/v4";

const token = process.env.CLOUDFLARE_API_TOKEN;
const zoneId = process.env.CLOUDFLARE_ZONE_ID;
const r2PublicUrl = process.env.R2_PUBLIC_URL;

if (!token || !zoneId || !r2PublicUrl) {
  console.error(
    "Missing env vars: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID, R2_PUBLIC_URL"
  );
  process.exit(1);
}

const mediaHostname = new URL(r2PublicUrl).hostname; // e.g. media.olchaai.com

// ── Cloudflare Ruleset helpers ──────────────────────────────────────────────

async function cfFetch(path: string, opts: RequestInit = {}) {
  const resp = await fetch(`${CF_API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(opts.headers ?? {}),
    },
  });
  const body = await resp.json() as { success: boolean; result?: unknown; errors?: unknown };
  if (!resp.ok || !body.success) {
    throw new Error(
      `CF API ${path} → ${resp.status}: ${JSON.stringify(body.errors)}`
    );
  }
  return body.result;
}

async function getOrCreateHttpResponseHeadersRuleset() {
  // List existing rulesets for this zone
  const rulesets = (await cfFetch(
    `/zones/${zoneId}/rulesets`
  )) as Array<{ id: string; phase: string }>;

  const existing = rulesets.find(
    (r) => r.phase === "http_response_headers_transform"
  );
  if (existing) {
    console.log(`Existing http_response_headers_transform ruleset: ${existing.id}`);
    return existing.id;
  }

  // Create a new one
  const created = (await cfFetch(`/zones/${zoneId}/rulesets`, {
    method: "POST",
    body: JSON.stringify({
      name: "R2 Media Cache-Control",
      kind: "zone",
      phase: "http_response_headers_transform",
      rules: [],
    }),
  })) as { id: string };

  console.log(`Created new ruleset: ${created.id}`);
  return created.id;
}

async function main() {
  console.log(`Setting up Cloudflare Cache-Control rule for: ${mediaHostname}`);

  const rulesetId = await getOrCreateHttpResponseHeadersRuleset();

  // Fetch current rules to check for an existing rule we manage
  const ruleset = (await cfFetch(
    `/zones/${zoneId}/rulesets/${rulesetId}`
  )) as { rules?: Array<{ id: string; description?: string }> };

  const RULE_DESCRIPTION = "R2 media immutable cache headers";
  const existingRule = (ruleset.rules ?? []).find(
    (r) => r.description === RULE_DESCRIPTION
  );

  const newRule = {
    description: RULE_DESCRIPTION,
    expression: `(http.host eq "${mediaHostname}")`,
    action: "rewrite",
    action_parameters: {
      headers: {
        "Cache-Control": {
          operation: "set",
          value: "public, max-age=31536000, immutable",
        },
      },
    },
    enabled: true,
  };

  if (existingRule) {
    // Update in-place
    await cfFetch(`/zones/${zoneId}/rulesets/${rulesetId}/rules/${existingRule.id}`, {
      method: "PATCH",
      body: JSON.stringify(newRule),
    });
    console.log(`Updated existing rule ${existingRule.id} — done.`);
  } else {
    // Append a new rule
    await cfFetch(`/zones/${zoneId}/rulesets/${rulesetId}/rules`, {
      method: "POST",
      body: JSON.stringify(newRule),
    });
    console.log("Created new Cache-Control rule — done.");
  }

  console.log(
    `\n✓ Cloudflare will now inject:\n  Cache-Control: public, max-age=31536000, immutable\n  on all responses from ${mediaHostname}`
  );
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
