import Stripe from 'stripe';
import { logger } from '../lib/logger';

async function getStripeCredentials(): Promise<{ secretKey: string; webhookSecret?: string }> {
  if (process.env.STRIPE_SECRET_KEY) {
    return {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    };
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error(
      'Stripe integration not connected or missing secret key. ' +
      'Connect Stripe via the Integrations tab first.'
    );
  }

  const resp = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    {
      headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken },
      signal: AbortSignal.timeout(10_000),
    }
  );

  if (!resp.ok) {
    throw new Error(`Failed to fetch Stripe credentials: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json() as any;
  const settings = data.items?.[0]?.settings;

  if (!settings?.secret_key) {
    throw new Error(
      'Stripe integration not connected or missing secret key. ' +
      'Connect Stripe via the Integrations tab first.'
    );
  }

  return {
    secretKey: settings.secret_key,
    webhookSecret: settings.webhook_secret,
  };
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}

/** Returns "live" | "test" | "unknown" based on the current secret key prefix. */
export async function getStripeMode(): Promise<"live" | "test" | "unknown"> {
  try {
    const { secretKey } = await getStripeCredentials();
    if (secretKey.startsWith("sk_live_")) return "live";
    if (secretKey.startsWith("sk_test_")) return "test";
    return "unknown";
  } catch {
    return "unknown";
  }
}

/* ─── Startup health check ──────────────────────────────────────────────── */

export interface StripeHealth {
  ok: boolean;
  reason?: string;
  checkedAt: string; // ISO timestamp
}

let _stripeHealth: StripeHealth | null = null;

/** Returns the cached Stripe health status (set by validateStripeKey on boot). */
export function getStripeHealth(): StripeHealth | null {
  return _stripeHealth;
}

/**
 * Performs a lightweight Stripe API ping to validate the configured key.
 * Sets the module-level health status and emits a warning log if the key is invalid.
 * Safe to call non-blocking from startup — never throws.
 */
export async function validateStripeKey(): Promise<void> {
  const checkedAt = new Date().toISOString();
  try {
    const { secretKey } = await getStripeCredentials();
    const stripe = new Stripe(secretKey);
    // Lightweight read — retrieves at most 1 product, no charge
    await stripe.products.list({ limit: 1 });
    _stripeHealth = { ok: true, checkedAt };
    const mode = secretKey.startsWith("sk_live_") ? "live" : secretKey.startsWith("sk_test_") ? "test" : "unknown";
    logger.info({ mode }, "✅ Stripe key validated successfully");
  } catch (err: any) {
    const reason: string =
      err?.raw?.message ??
      err?.message ??
      "Unknown Stripe error";
    _stripeHealth = { ok: false, reason, checkedAt };
    logger.warn(
      { reason },
      "⚠️  STRIPE MISCONFIGURATION — Stripe key is invalid or unreachable. " +
      "Premium purchases will fail until this is resolved. " +
      `Reason: ${reason}`
    );
  }
}
