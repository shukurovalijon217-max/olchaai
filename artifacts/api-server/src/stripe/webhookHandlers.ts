import { getUncachableStripeClient } from './stripeClient';
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

async function getWebhookSecret(): Promise<string | undefined> {
  return process.env.STRIPE_WEBHOOK_SECRET;
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const webhookSecret = await getWebhookSecret();
    if (!webhookSecret) {
      return;
    }

    const stripe = await getUncachableStripeClient();
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const isActive = sub.status === "active" || sub.status === "trialing";
        await db.update(usersTable)
          .set({ stripeSubscriptionId: sub.id, isPremium: isActive })
          .where(eq(usersTable.stripeCustomerId as any, customerId));
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        await db.update(usersTable)
          .set({ stripeSubscriptionId: null, isPremium: false })
          .where(eq(usersTable.stripeCustomerId as any, customerId));
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
          const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          if (customerId) {
            await db.update(usersTable)
              .set({ stripeSubscriptionId: subscriptionId, isPremium: true })
              .where(eq(usersTable.stripeCustomerId as any, customerId));
          }
        }
        break;
      }
      default:
        break;
    }
  }
}
