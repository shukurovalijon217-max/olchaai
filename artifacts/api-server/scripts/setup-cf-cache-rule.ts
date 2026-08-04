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
 *   CLOUDFLARE_API_TOKEN   — must have: Zone.Transform Rules: Edit + Zone.Zone: Read
 *   CLOUDFLARE_ZONE_ID     — (optional) the zone that hosts the R2 public domain;
 *                            auto-discovered from R2_PUBLIC_URL hostname if missing/wrong
 *   R2_PUBLIC_URL          — e.g. https://media.olchaai.com
 */

const CF_API = "https://api.cloudflare.com/client/v4";

const token = process.env.CLOUDFLARE_API_TOKEN;
const configuredZoneId = process.env.CLOUDFLARE_ZONE_ID;
const r2PublicUrl = process.env.R2_PUBLIC_URL;

if (!token || !r2PublicUrl) {
  console.error("Missing env vars: CLOUDFLARE_API_TOKEN, R2_PUBLIC_URL");
  process.exit(1);
}

const mediaHostname = new URL(r2PublicUrl).hostname; // e.g. media.olchaai.com

// ── Cloudflare API helpers ──────────────────────────────────────────────────

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

/**
 * Resolve the correct zone ID.
 * - If CLOUDFLARE_ZONE_ID is set and valid for this zone, use it.
 * - Otherwise, list all zones the token can see and find the one whose
 *   name is a suffix of the media hostname (e.g. "olchaai.com").
 */
async function resolveZoneId(): Promise<string> {
  // Try the configured zone ID first
  if (configuredZoneId) {
    try {
      const zone = await cfFetch(`/zones/${configuredZoneId}`) as { name: string };
      if (mediaHostname.endsWith(zone.name)) {
        console.log(`Using configured zone: ${configuredZoneId} (${zone.name})`);
        return configuredZoneId;
      }
      console.warn(
        `CLOUDFLARE_ZONE_ID ${configuredZoneId} maps to zone "${zone.name}" ` +
        `which does not match media hostname "${mediaHostname}" — auto-discovering…`
      );
    } catch (e) {
      console.warn(`CLOUDFLARE_ZONE_ID ${configuredZoneId} is invalid — auto-discovering…`);
    }
  }

  // Auto-discover: find the zone whose name is a suffix of the media hostname
  const zones = await cfFetch(`/zones`) as Array<{ id: string; name: string }>;
  // Sort by zone name length descending so the most-specific match wins
  const sorted = [...zones].sort((a, b) => b.name.length - a.name.length);
  const match = sorted.find((z) => mediaHostname === z.name || mediaHostname.endsWith(`.${z.name}`));
  if (!match) {
    throw new Error(
      `No accessible zone found for hostname "${mediaHostname}". ` +
      `Zones visible to this token: ${zones.map((z) => z.name).join(", ")}`
    );
  }
  console.log(`Auto-discovered zone: ${match.id} (${match.name})`);
  console.log(`Tip: set CLOUDFLARE_ZONE_ID=${match.id} to skip auto-discovery next time.`);
  return match.id;
}

async function getOrCreateHttpResponseHeadersRuleset(zoneId: string) {
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

  // Verify token
  const verify = await cfFetch("/user/tokens/verify") as { status: string };
  console.log(`Token status: ${verify.status}`);

  const zoneId = await resolveZoneId();

  const rulesetId = await getOrCreateHttpResponseHeadersRuleset(zoneId);

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
  console.error("\nFailed:", err.message);
  if (String(err.message).includes("not authorized")) {
    console.error(`
The token lacks write permission for Transform Rules.
To fix, create a new API token in the Cloudflare dashboard:

  1. Go to https://dash.cloudflare.com/profile/api-tokens
  2. Click "Create Token" → "Create Custom Token"
  3. Name it something like "GilosAI Deploy"
  4. Under "Permissions", add:
       Zone  |  Transform Rules  |  Edit
       Zone  |  Zone             |  Read
  5. Under "Zone Resources", choose:
       Include → Specific zone → olchaai.com
  6. Click "Continue to summary" → "Create Token"
  7. Copy the token and save it as the CLOUDFLARE_API_TOKEN Replit Secret

Then re-run this script.
`);
  }
  process.exit(1);
});
