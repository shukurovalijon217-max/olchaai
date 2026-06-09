import Stripe from "stripe";

async function getStripeCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) throw new Error("Missing Replit env vars");

  const resp = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    { headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken }, signal: AbortSignal.timeout(10_000) }
  );
  if (!resp.ok) throw new Error(`Failed to fetch Stripe creds: ${resp.status}`);
  const data = await resp.json() as any;
  const secretKey = data.items?.[0]?.settings?.secret_key;
  if (!secretKey) throw new Error("Stripe secret key not found");
  return secretKey;
}

async function seedStripe() {
  const secretKey = await getStripeCredentials();
  const stripe = new Stripe(secretKey);

  console.log("Creating OlCha Premium products...");

  // Check if already exists
  const existing = await stripe.products.search({ query: "name:'OlCha Premium' AND active:'true'" });
  if (existing.data.length > 0) {
    console.log("OlCha Premium already exists:", existing.data[0].id);
    const prices = await stripe.prices.list({ product: existing.data[0].id, active: true });
    for (const p of prices.data) {
      console.log(`  Price: ${p.id}  ${p.unit_amount! / 100} ${p.currency}/${(p.recurring?.interval ?? "one_time")}`);
    }
    return;
  }

  const product = await stripe.products.create({
    name: "OlCha Premium",
    description: "OlCha platformasining premium xususiyatlari: reklama yo'q, eksklyuziv badge, kengaytirilgan tahlil va boshqalar.",
    metadata: { app: "olcha" },
  });
  console.log("Created product:", product.id);

  const monthly = await stripe.prices.create({
    product: product.id,
    unit_amount: 999,
    currency: "usd",
    recurring: { interval: "month" },
  });
  console.log("Monthly price:", monthly.id, "($9.99/month)");

  const yearly = await stripe.prices.create({
    product: product.id,
    unit_amount: 7999,
    currency: "usd",
    recurring: { interval: "year" },
  });
  console.log("Yearly price:", yearly.id, "($79.99/year)");

  console.log("\n✓ OlCha Premium products created!");
  console.log("Run the API server to sync data to the database.");
}

seedStripe().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
