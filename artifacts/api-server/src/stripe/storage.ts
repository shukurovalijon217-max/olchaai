import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getUncachableStripeClient } from "./stripeClient";

export class Storage {
  async listProductsWithPrices() {
    try {
      const stripe = await getUncachableStripeClient();
      const products = await stripe.products.list({ active: true, limit: 20 });
      const rows: any[] = [];
      for (const product of products.data) {
        const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
        if (prices.data.length === 0) {
          rows.push({
            product_id: product.id,
            product_name: product.name,
            product_description: product.description ?? null,
            product_active: product.active,
            product_metadata: product.metadata,
            price_id: null,
            unit_amount: null,
            currency: null,
            recurring: null,
            price_active: null,
          });
        } else {
          for (const price of prices.data) {
            rows.push({
              product_id: product.id,
              product_name: product.name,
              product_description: product.description ?? null,
              product_active: product.active,
              product_metadata: product.metadata,
              price_id: price.id,
              unit_amount: price.unit_amount,
              currency: price.currency,
              recurring: price.recurring,
              price_active: price.active,
            });
          }
        }
      }
      return rows;
    } catch {
      return [];
    }
  }

  async getProduct(productId: string) {
    try {
      const stripe = await getUncachableStripeClient();
      return await stripe.products.retrieve(productId);
    } catch {
      return null;
    }
  }

  async getSubscription(subscriptionId: string) {
    try {
      const stripe = await getUncachableStripeClient();
      return await stripe.subscriptions.retrieve(subscriptionId);
    } catch {
      return null;
    }
  }

  async getPrice(priceId: string) {
    try {
      const stripe = await getUncachableStripeClient();
      const price = await stripe.prices.retrieve(priceId);
      return {
        id: price.id,
        product: typeof price.product === "string" ? price.product : (price.product as any).id,
        unit_amount: price.unit_amount ?? 0,
        currency: price.currency,
        recurring: price.recurring,
        active: price.active,
      };
    } catch {
      return undefined;
    }
  }

  async getUser(id: number) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    return user;
  }

  async updateUserStripeInfo(userId: number, stripeInfo: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  }) {
    const [user] = await db.update(usersTable)
      .set(stripeInfo)
      .where(eq(usersTable.id, userId))
      .returning();
    return user;
  }
}

export const storage = new Storage();
