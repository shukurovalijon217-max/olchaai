import { storage } from './storage';
import { getUncachableStripeClient } from './stripeClient';

export interface PriceData {
  currency: string;
  product?: string;
  product_data?: { name: string; description?: string };
  unit_amount: number;
  recurring: { interval: string } | null;
}

export class StripeService {
  async createCustomer(email: string, userId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.customers.create({ email, metadata: { userId } });
  }

  async createCheckoutSession(
    customerId: string,
    price: string | PriceData,
    successUrl: string,
    cancelUrl: string,
    opts?: { metadata?: Record<string, string> },
  ) {
    const stripe = await getUncachableStripeClient();

    const isRecurring = typeof price === "string" ? true : !!price.recurring;
    const lineItem = typeof price === "string"
      ? { price, quantity: 1 }
      : {
          price_data: {
            currency: price.currency.toLowerCase(),
            ...(price.product ? { product: price.product } : {}),
            ...(price.product_data ? { product_data: price.product_data } : {}),
            unit_amount: price.unit_amount,
            ...(price.recurring ? { recurring: { interval: price.recurring.interval as any } } : {}),
          },
          quantity: 1,
        };

    return await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [lineItem],
      mode: isRecurring ? 'subscription' : 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      ...(opts?.metadata ? { metadata: opts.metadata } : {}),
    });
  }

  async createPortalSession(customerId: string, returnUrl: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
  }

  async getSubscription(subscriptionId: string) {
    return await storage.getSubscription(subscriptionId);
  }
}

export const stripeService = new StripeService();
