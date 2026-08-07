import { storage } from './storage';
import { getUncachableStripeClient } from './stripeClient';
export class StripeService {
    async createCustomer(email, userId) {
        const stripe = await getUncachableStripeClient();
        return await stripe.customers.create({ email, metadata: { userId } });
    }
    async createCheckoutSession(customerId, price, successUrl, cancelUrl, opts) {
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
                    ...(price.recurring ? { recurring: { interval: price.recurring.interval } } : {}),
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
    async createPortalSession(customerId, returnUrl) {
        const stripe = await getUncachableStripeClient();
        return await stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
    }
    async getSubscription(subscriptionId) {
        return await storage.getSubscription(subscriptionId);
    }
}
export const stripeService = new StripeService();
