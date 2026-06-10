import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull().references(() => usersTable.id),
  title: text("title").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  originalPrice: integer("original_price"),
  category: text("category").notNull().default("other"),
  condition: text("condition").notNull().default("new"),
  mediaUrls: text("media_urls"),
  thumbnailUrl: text("thumbnail_url"),
  status: text("status").notNull().default("active"),
  stock: integer("stock").notNull().default(1),
  location: text("location"),
  tags: text("tags"),
  viewsCount: integer("views_count").notNull().default(0),
  ordersCount: integer("orders_count").notNull().default(0),
  rating: integer("rating").notNull().default(0),
  reviewsCount: integer("reviews_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const productOrdersTable = pgTable("product_orders", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").notNull().references(() => usersTable.id),
  sellerId: integer("seller_id").notNull().references(() => usersTable.id),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull(),
  totalPrice: integer("total_price").notNull(),
  status: text("status").notNull().default("pending"),
  deliveryMethod: text("delivery_method").notNull().default("pickup"),
  deliveryAddress: text("delivery_address"),
  notes: text("notes"),
  trackingInfo: text("tracking_info"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const productReviewsTable = pgTable("product_reviews", {
  id: serial("id").primaryKey(),
  reviewerId: integer("reviewer_id").notNull().references(() => usersTable.id),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  orderId: integer("order_id").references(() => productOrdersTable.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Product = typeof productsTable.$inferSelect;
export type ProductOrder = typeof productOrdersTable.$inferSelect;
export type ProductReview = typeof productReviewsTable.$inferSelect;
