import { Router } from "express";
import { storage } from "../stripe/storage";
import { stripeService } from "../stripe/stripeService";
import {
  currencyFromAcceptLanguage,
  usdCentsToSubunits,
  isStripeSupported,
  USD_TO_MAJOR,
} from "../lib/currency";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Kirish talab qilinadi" }); return;
  }
  next();
};

router.get("/stripe/products", async (req, res) => {
  try {
    const rows = await storage.listProductsWithPrices();
    const map = new Map<string, any>();
    for (const row of rows as any[]) {
      if (!map.has(row.product_id)) {
        map.set(row.product_id, {
          id: row.product_id,
          name: row.product_name,
          description: row.product_description,
          prices: [],
        });
      }
      if (row.price_id) {
        map.get(row.product_id).prices.push({
          id: row.price_id,
          unitAmount: row.unit_amount,
          currency: row.currency,
          recurring: row.recurring,
        });
      }
    }
    res.json({ data: Array.from(map.values()) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Mahsulotlarni yuklashda xato" });
  }
});

// GET /api/currency/rates — returns USD_TO_MAJOR rates for frontend use
router.get("/currency/rates", (_req, res) => {
  res.json({ rates: USD_TO_MAJOR, base: "USD" });
});

router.get("/stripe/subscription", requireAuth, async (req: any, res) => {
  try {
    const user = await storage.getUser(req.session.userId);
    if (!user?.stripeSubscriptionId) {
      res.json({ subscription: null }); return;
    }
    const subscription = await storage.getSubscription(user.stripeSubscriptionId);
    res.json({ subscription });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Obuna ma'lumotlarini olishda xato" });
  }
});

router.post("/stripe/checkout", requireAuth, async (req: any, res) => {
  try {
    const user = await storage.getUser(req.session.userId);
    if (!user) { res.status(404).json({ error: "Foydalanuvchi topilmadi" }); return; }

    const { priceId, currency: requestedCurrency } = req.body;
    if (!priceId) { res.status(400).json({ error: "priceId talab qilinadi" }); return; }

    // Detect target currency from request body or Accept-Language header
    const targetCurrency = (requestedCurrency?.toUpperCase() ||
      currencyFromAcceptLanguage(req.headers["accept-language"])).toUpperCase();

    let customerId = (user as any).stripeCustomerId;
    if (!customerId) {
      const customer = await stripeService.createCustomer(user.email, String(user.id));
      await storage.updateUserStripeInfo(user.id, { stripeCustomerId: customer.id });
      customerId = customer.id;
    }

    const baseUrl =
      process.env.FRONTEND_URL?.replace(/\/$/, "") ||
      (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0].trim()}` : null) ||
      (req.headers.origin && /^https?:\/\/([\w-]+\.)*(olchaai\.com|olchaai\.com|replit\.app|repl\.co)/.test(req.headers.origin as string) ? req.headers.origin as string : null) ||
      `https://${req.get("host")}`;

    // Fetch price from DB
    const priceRow = await storage.getPrice(priceId);
    const priceBaseCurrency = (priceRow?.currency ?? "USD").toUpperCase();

    let priceParam: string | import("../stripe/stripeService").PriceData;

    if (!priceRow || targetCurrency === priceBaseCurrency || !isStripeSupported(targetCurrency)) {
      // Same currency OR unsupported target — use priceId directly
      priceParam = priceId;
    } else {
      // Convert from base currency (USD) to target currency
      const baseAmountInUsdCents = priceBaseCurrency === "USD"
        ? priceRow.unit_amount
        : Math.round(priceRow.unit_amount / (USD_TO_MAJOR[priceBaseCurrency] ?? 1) * 100);

      const convertedSubunits = usdCentsToSubunits(baseAmountInUsdCents, targetCurrency);
      const recurring = priceRow.recurring
        ? { interval: priceRow.recurring.interval ?? priceRow.recurring }
        : null;

      priceParam = {
        currency: targetCurrency.toLowerCase(),
        product: priceRow.product,
        unit_amount: convertedSubunits,
        recurring,
      };
    }

    const session = await stripeService.createCheckoutSession(
      customerId,
      priceParam,
      `${baseUrl}/premium?success=true`,
      `${baseUrl}/premium?canceled=true`,
    );

    res.json({ url: session.url });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Checkout sessiyasi yaratishda xato" });
  }
});

router.post("/stripe/portal", requireAuth, async (req: any, res) => {
  try {
    const user = await storage.getUser(req.session.userId);
    const customerId = (user as any)?.stripeCustomerId;
    if (!customerId) { res.status(400).json({ error: "Stripe mijoz topilmadi" }); return; }

    const baseUrl =
      process.env.FRONTEND_URL?.replace(/\/$/, "") ||
      (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0].trim()}` : null) ||
      (req.headers.origin && /^https?:\/\/([\w-]+\.)*(olchaai\.com|olchaai\.com|replit\.app|repl\.co)/.test(req.headers.origin as string) ? req.headers.origin as string : null) ||
      `https://${req.get("host")}`;
    const portal = await stripeService.createPortalSession(customerId, `${baseUrl}/premium`);
    res.json({ url: portal.url });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Portal sessiyasi yaratishda xato" });
  }
});

export default router;
