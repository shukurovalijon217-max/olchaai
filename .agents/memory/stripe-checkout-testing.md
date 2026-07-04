---
name: Testing real Stripe Checkout Sessions without a browser
description: Why you can't curl your way to a "paid" Checkout Session, and what to verify instead
---

Stripe Checkout Sessions (`mode: "payment"`) do not attach a `payment_intent` until the customer actually opens the hosted Checkout page — retrieving the session via the API immediately after creation returns `payment_intent: null` and `payment_status: "unpaid"` even with `expand[]=payment_intent`. There is no API-only way to mark a Checkout Session as paid in test mode; completing one requires the real hosted UI (a browser).

**Why:** this matters because it limits what curl-based verification can prove for a deposit-via-Checkout flow. You can fully verify session creation and the negative/idempotent path (confirming an unpaid session correctly returns "not paid" and does not credit the wallet), but you cannot curl-complete the positive "payment succeeded → wallet credited" path end-to-end without Playwright or a real card entry.

**How to apply:** when verifying a Checkout-based payment flow, curl-test session creation + the negative/unpaid confirm rejection + idempotency guards, and rely on code review + typecheck for the credit-on-success branch. Don't attempt `payment_intents/confirm` tricks against a Checkout Session's intent — it isn't created early enough to be reachable that way.
