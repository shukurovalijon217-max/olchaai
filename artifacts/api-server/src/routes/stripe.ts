import { Router } from "express";
import { storage } from "../stripe/storage";
import { stripeService } from "../stripe/stripeService";

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

    const { priceId } = req.body;
    if (!priceId) { res.status(400).json({ error: "priceId talab qilinadi" }); return; }

    let customerId = (user as any).stripeCustomerId;
    if (!customerId) {
      const customer = await stripeService.createCustomer(user.email, String(user.id));
      await storage.updateUserStripeInfo(user.id, { stripeCustomerId: customer.id });
      customerId = customer.id;
    }

    const domain = process.env.REPLIT_DOMAINS?.split(',')[0] ?? req.get('host');
    const baseUrl = `https://${domain}`;
    const session = await stripeService.createCheckoutSession(
      customerId, priceId,
      `${baseUrl}/premium?success=true`,
      `${baseUrl}/premium?canceled=true`
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

    const domain = process.env.REPLIT_DOMAINS?.split(',')[0] ?? req.get('host');
    const portal = await stripeService.createPortalSession(customerId, `https://${domain}/premium`);
    res.json({ url: portal.url });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Portal sessiyasi yaratishda xato" });
  }
});

export default router;
