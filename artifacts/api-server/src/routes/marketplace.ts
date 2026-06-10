import { Router } from "express";
import { db } from "@workspace/db";
import {
  productsTable, productOrdersTable, productReviewsTable,
  walletsTable, transactionsTable, usersTable,
} from "@workspace/db";
import { eq, and, or, ilike, desc, sql, ne } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  next();
};

async function getOrCreateWallet(userId: number) {
  const e = await db.query.walletsTable.findFirst({ where: eq(walletsTable.userId, userId) });
  if (e) return e;
  const [w] = await db.insert(walletsTable).values({ userId }).returning();
  return w;
}

const CATEGORIES = ["electronics", "clothing", "food", "services", "digital", "beauty", "sport", "home", "automotive", "books", "other"];

// GET /marketplace/categories
router.get("/marketplace/categories", (_req, res) => {
  const labels: Record<string, string> = {
    electronics: "Elektronika 📱", clothing: "Kiyim 👗", food: "Oziq-ovqat 🍎",
    services: "Xizmatlar 🛠️", digital: "Raqamli 💻", beauty: "Go'zallik 💄",
    sport: "Sport ⚽", home: "Uy-ro'zg'or 🏠", automotive: "Avtomobil 🚗",
    books: "Kitoblar 📚", other: "Boshqa 📦",
  };
  res.json(CATEGORIES.map(c => ({ id: c, label: labels[c] ?? c })));
});

// GET /marketplace/products
router.get("/marketplace/products", async (req: any, res) => {
  try {
    const { q, category, condition, minPrice, maxPrice, sellerId, sort = "newest" } = req.query as Record<string, string>;
    const limit = Math.min(Number(req.query.limit ?? 24), 60);
    const offset = Number(req.query.offset ?? 0);

    let rows = await db.select().from(productsTable).where(eq(productsTable.status, "active"));

    if (q) rows = rows.filter(p => p.title.toLowerCase().includes(q.toLowerCase()) || p.description?.toLowerCase().includes(q.toLowerCase()));
    if (category) rows = rows.filter(p => p.category === category);
    if (condition) rows = rows.filter(p => p.condition === condition);
    if (minPrice) rows = rows.filter(p => p.price >= Number(minPrice));
    if (maxPrice) rows = rows.filter(p => p.price <= Number(maxPrice));
    if (sellerId) rows = rows.filter(p => p.sellerId === Number(sellerId));

    if (sort === "price_asc") rows.sort((a, b) => a.price - b.price);
    else if (sort === "price_desc") rows.sort((a, b) => b.price - a.price);
    else if (sort === "popular") rows.sort((a, b) => b.viewsCount - a.viewsCount);
    else rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = rows.length;
    const paginated = rows.slice(offset, offset + limit);

    const enriched = await Promise.all(paginated.map(async p => {
      const [seller] = await db.select({ id: usersTable.id, displayName: usersTable.displayName, username: usersTable.username, avatarUrl: usersTable.avatarUrl }).from(usersTable).where(eq(usersTable.id, p.sellerId));
      return { ...p, mediaUrls: p.mediaUrls ? JSON.parse(p.mediaUrls) : [], tags: p.tags ? JSON.parse(p.tags) : [], seller };
    }));

    res.json({ products: enriched, total, offset, limit });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Mahsulotlarni olishda xato" }); }
});

// POST /marketplace/products
router.post("/marketplace/products", requireAuth, async (req: any, res) => {
  try {
    const { title, description, price, originalPrice, category, condition, mediaUrls, thumbnailUrl, stock, location, tags } = req.body;
    if (!title?.trim() || !price || price < 1) { res.status(400).json({ error: "Nomi va narx talab qilinadi" }); return; }
    const [product] = await db.insert(productsTable).values({
      sellerId: req.session.userId,
      title: title.trim(), description: description?.trim() ?? null,
      price: Number(price), originalPrice: originalPrice ? Number(originalPrice) : null,
      category: category ?? "other", condition: condition ?? "new",
      mediaUrls: mediaUrls ? JSON.stringify(mediaUrls) : null,
      thumbnailUrl: thumbnailUrl ?? (mediaUrls?.[0] ?? null),
      stock: Number(stock ?? 1), location: location?.trim() ?? null,
      tags: tags ? JSON.stringify(tags) : null,
    }).returning();
    res.status(201).json({ ...product, mediaUrls: mediaUrls ?? [], tags: tags ?? [] });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Mahsulot qo'shishda xato" }); }
});

// GET /marketplace/products/my
router.get("/marketplace/products/my", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.select().from(productsTable).where(eq(productsTable.sellerId, req.session.userId)).orderBy(desc(productsTable.createdAt));
    res.json(rows.map(p => ({ ...p, mediaUrls: p.mediaUrls ? JSON.parse(p.mediaUrls) : [], tags: p.tags ? JSON.parse(p.tags) : [] })));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Mahsulotlarni olishda xato" }); }
});

// GET /marketplace/products/:id
router.get("/marketplace/products/:id", async (req: any, res) => {
  try {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, Number(req.params.id)));
    if (!product) { res.status(404).json({ error: "Topilmadi" }); return; }
    const [seller] = await db.select({ id: usersTable.id, displayName: usersTable.displayName, username: usersTable.username, avatarUrl: usersTable.avatarUrl, isVerified: usersTable.isVerified }).from(usersTable).where(eq(usersTable.id, product.sellerId));
    await db.update(productsTable).set({ viewsCount: sql`${productsTable.viewsCount} + 1` }).where(eq(productsTable.id, product.id));
    res.json({ ...product, mediaUrls: product.mediaUrls ? JSON.parse(product.mediaUrls) : [], tags: product.tags ? JSON.parse(product.tags) : [], seller });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Mahsulotni olishda xato" }); }
});

// PATCH /marketplace/products/:id
router.patch("/marketplace/products/:id", requireAuth, async (req: any, res) => {
  try {
    const [product] = await db.select().from(productsTable).where(and(eq(productsTable.id, Number(req.params.id)), eq(productsTable.sellerId, req.session.userId)));
    if (!product) { res.status(404).json({ error: "Topilmadi yoki ruxsat yo'q" }); return; }
    const { title, description, price, category, condition, status, stock, location, mediaUrls, thumbnailUrl, tags } = req.body;
    const [updated] = await db.update(productsTable).set({
      ...(title && { title }), ...(description !== undefined && { description }),
      ...(price && { price: Number(price) }), ...(category && { category }),
      ...(condition && { condition }), ...(status && { status }),
      ...(stock !== undefined && { stock: Number(stock) }),
      ...(location !== undefined && { location }),
      ...(mediaUrls && { mediaUrls: JSON.stringify(mediaUrls), thumbnailUrl: thumbnailUrl ?? mediaUrls[0] }),
      ...(tags && { tags: JSON.stringify(tags) }),
      updatedAt: new Date(),
    }).where(eq(productsTable.id, product.id)).returning();
    res.json({ ...updated, mediaUrls: updated.mediaUrls ? JSON.parse(updated.mediaUrls) : [] });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Yangilashda xato" }); }
});

// DELETE /marketplace/products/:id
router.delete("/marketplace/products/:id", requireAuth, async (req: any, res) => {
  try {
    await db.update(productsTable).set({ status: "draft" }).where(and(eq(productsTable.id, Number(req.params.id)), eq(productsTable.sellerId, req.session.userId)));
    res.json({ ok: true });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "O'chirishda xato" }); }
});

// POST /marketplace/products/:id/buy
router.post("/marketplace/products/:id/buy", requireAuth, async (req: any, res) => {
  try {
    const productId = Number(req.params.id);
    const { quantity = 1, deliveryMethod = "pickup", deliveryAddress, notes } = req.body;
    const qty = Number(quantity);

    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
    if (!product || product.status !== "active") { res.status(404).json({ error: "Mahsulot topilmadi" }); return; }
    if (product.sellerId === req.session.userId) { res.status(400).json({ error: "O'z mahsulotingizni sotib ola olmaysiz" }); return; }
    if (product.stock < qty) { res.status(400).json({ error: "Yetarli zaxira yo'q" }); return; }

    const totalPrice = product.price * qty;
    const buyerWallet = await getOrCreateWallet(req.session.userId);
    if (buyerWallet.balance < totalPrice) { res.status(400).json({ error: "Hamyonda mablag' yetarli emas", required: totalPrice, balance: buyerWallet.balance }); return; }

    const sellerWallet = await getOrCreateWallet(product.sellerId);

    await db.update(walletsTable).set({ balance: buyerWallet.balance - totalPrice, updatedAt: new Date() }).where(eq(walletsTable.id, buyerWallet.id));
    await db.insert(transactionsTable).values({ userId: req.session.userId, walletId: buyerWallet.id, type: "transfer_out", amount: totalPrice, currency: "UZS", status: "completed", paymentMethod: "internal", description: `"${product.title}" sotib olindi` });

    await db.update(walletsTable).set({ earningsBalance: sellerWallet.earningsBalance + totalPrice, updatedAt: new Date() }).where(eq(walletsTable.id, sellerWallet.id));
    await db.insert(transactionsTable).values({ userId: product.sellerId, walletId: sellerWallet.id, type: "content_revenue", amount: totalPrice, currency: "UZS", status: "completed", paymentMethod: "internal", description: `"${product.title}" sotildi` });

    const newStock = product.stock - qty;
    await db.update(productsTable).set({
      stock: newStock,
      status: newStock <= 0 ? "sold" : "active",
      ordersCount: sql`${productsTable.ordersCount} + ${qty}`,
    }).where(eq(productsTable.id, productId));

    const [order] = await db.insert(productOrdersTable).values({
      buyerId: req.session.userId, sellerId: product.sellerId, productId,
      quantity: qty, unitPrice: product.price, totalPrice,
      deliveryMethod: deliveryMethod ?? "pickup",
      deliveryAddress: deliveryAddress ?? null, notes: notes ?? null,
    }).returning();

    res.status(201).json({ order, newBalance: buyerWallet.balance - totalPrice });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Sotib olishda xato" }); }
});

// GET /marketplace/orders
router.get("/marketplace/orders", requireAuth, async (req: any, res) => {
  try {
    const role = req.query.role as string ?? "buyer";
    const myId = req.session.userId;
    const orders = role === "seller"
      ? await db.select().from(productOrdersTable).where(eq(productOrdersTable.sellerId, myId)).orderBy(desc(productOrdersTable.createdAt))
      : await db.select().from(productOrdersTable).where(eq(productOrdersTable.buyerId, myId)).orderBy(desc(productOrdersTable.createdAt));

    const enriched = await Promise.all(orders.map(async o => {
      const [product] = await db.select({ id: productsTable.id, title: productsTable.title, thumbnailUrl: productsTable.thumbnailUrl }).from(productsTable).where(eq(productsTable.id, o.productId));
      const otherId = role === "seller" ? o.buyerId : o.sellerId;
      const [other] = await db.select({ id: usersTable.id, displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl }).from(usersTable).where(eq(usersTable.id, otherId));
      return { ...o, product, [role === "seller" ? "buyer" : "seller"]: other };
    }));

    res.json(enriched);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Buyurtmalarni olishda xato" }); }
});

// PATCH /marketplace/orders/:id/status
router.patch("/marketplace/orders/:id/status", requireAuth, async (req: any, res) => {
  try {
    const { status } = req.body as { status: string };
    const orderId = Number(req.params.id);
    const [order] = await db.select().from(productOrdersTable).where(eq(productOrdersTable.id, orderId));
    if (!order) { res.status(404).json({ error: "Buyurtma topilmadi" }); return; }
    if (order.sellerId !== req.session.userId && order.buyerId !== req.session.userId) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
    const [updated] = await db.update(productOrdersTable).set({ status, updatedAt: new Date() }).where(eq(productOrdersTable.id, orderId)).returning();
    res.json(updated);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Holatni yangilashda xato" }); }
});

// GET /marketplace/products/:id/reviews
router.get("/marketplace/products/:id/reviews", async (req: any, res) => {
  try {
    const reviews = await db.select().from(productReviewsTable).where(eq(productReviewsTable.productId, Number(req.params.id))).orderBy(desc(productReviewsTable.createdAt));
    const enriched = await Promise.all(reviews.map(async r => {
      const [reviewer] = await db.select({ id: usersTable.id, displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl }).from(usersTable).where(eq(usersTable.id, r.reviewerId));
      return { ...r, reviewer };
    }));
    res.json(enriched);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Sharhlarni olishda xato" }); }
});

// POST /marketplace/products/:id/reviews
router.post("/marketplace/products/:id/reviews", requireAuth, async (req: any, res) => {
  try {
    const productId = Number(req.params.id);
    const { rating, comment, orderId } = req.body;
    if (!rating || rating < 1 || rating > 5) { res.status(400).json({ error: "Reyting 1-5 orasida bo'lishi kerak" }); return; }
    const [review] = await db.insert(productReviewsTable).values({ reviewerId: req.session.userId, productId, orderId: orderId ?? null, rating, comment: comment?.trim() ?? null }).returning();
    const allReviews = await db.select({ rating: productReviewsTable.rating }).from(productReviewsTable).where(eq(productReviewsTable.productId, productId));
    const avgRating = Math.round(allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length * 100);
    await db.update(productsTable).set({ rating: avgRating, reviewsCount: allReviews.length }).where(eq(productsTable.id, productId));
    res.status(201).json(review);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Sharh qo'shishda xato" }); }
});

export default router;
