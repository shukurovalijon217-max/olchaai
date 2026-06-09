import { getUncachableStripeClient } from "./stripeClient";

async function seedStripe() {
  const stripe = await getUncachableStripeClient();

  console.log("Creating OlCha Premium products...");

  const existing = await stripe.products.search({ query: "name:'OlCha Premium' AND active:'true'" });
  if (existing.data.length > 0) {
    console.log("OlCha Premium already exists:", existing.data[0].id);
    const prices = await stripe.prices.list({ product: existing.data[0].id, active: true });
    for (const p of prices.data) {
      console.log(`  Price: ${p.id}  ${p.unit_amount! / 100} ${p.currency}/${p.recurring?.interval ?? "one_time"}`);
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
}

seedStripe().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
