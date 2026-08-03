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
      // In production without a webhook secret, events are unverified and ignored.
      // Set STRIPE_WEBHOOK_SECRET to enable subscription activation via webhooks.
      console.warn(
        "[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not set — " +
        "webhook signature verification is skipped and events are not processed. " +
        "Register the webhook endpoint in the Stripe Dashboard and set STRIPE_WEBHOOK_SECRET."
      );
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
      case "charge.refunded": {
        // A charge was refunded — revoke Premium access for the associated customer.
        const charge = event.data.object as Stripe.Charge;
        const customerId = typeof charge.customer === "string" ? charge.customer : charge.customer?.id;
        if (customerId) {
          await db.update(usersTable)
            .set({ isPremium: false })
            .where(eq(usersTable.stripeCustomerId as any, customerId));
        }
        break;
      }
      case "charge.dispute.created": {
        // A payment was disputed (chargeback) — revoke Premium immediately while dispute is open.
        const dispute = event.data.object as Stripe.Dispute;
        // dispute.charge is the charge ID; retrieve it to get the customer.
        const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge.id;
        const charge = await stripe.charges.retrieve(chargeId);
        const customerId = typeof charge.customer === "string" ? charge.customer : charge.customer?.id;
        if (customerId) {
          await db.update(usersTable)
            .set({ isPremium: false })
            .where(eq(usersTable.stripeCustomerId as any, customerId));
        }
        break;
      }
      default:
        break;
    }
  }
}
