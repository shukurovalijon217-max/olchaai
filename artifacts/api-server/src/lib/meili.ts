import { Meilisearch } from "meilisearch";
import { logger } from "./logger";

let client: Meilisearch | null = null;

function getClient(): Meilisearch | null {
  if (client) return client;
  const host = process.env["MEILI_HOST"];
  const apiKey = process.env["MEILI_MASTER_KEY"];
  if (!host) return null;
  try {
    client = new Meilisearch({ host, apiKey: apiKey ?? "" });
    return client;
  } catch {
    return null;
  }
}

export type MeiliPost = {
  id: number;
  content: string;
  authorId: number;
  authorName?: string;
  mediaUrl?: string;
  likesCount: number;
  commentsCount: number;
  createdAt: number;
};

export type MeiliUser = {
  id: number;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  isVerified: boolean;
  followersCount: number;
};

export type MeiliProduct = {
  id: number;
  title: string;
  description?: string;
  price: number;
  category: string;
  condition: string;
  location?: string;
  thumbnailUrl?: string;
  sellerId: number;
  sellerName?: string;
  rating: number;
  status: string;
};

export type MeiliReel = {
  id: number;
  caption: string;
  authorId: number;
  authorName?: string;
  thumbnailUrl?: string;
  viewsCount: number;
  likesCount: number;
};

/* ── Setup indexes with proper filterable/searchable attributes ── */
export async function setupMeiliIndexes(): Promise<void> {
  const c = getClient();
  if (!c) return;
  try {
    await Promise.all([
      c.index("posts").updateSettings({
        searchableAttributes: ["content", "authorName"],
        filterableAttributes: ["authorId", "createdAt"],
        sortableAttributes: ["createdAt", "likesCount"],
        rankingRules: ["words", "typo", "proximity", "attribute", "sort", "exactness", "likesCount:desc"],
      }),
      c.index("users").updateSettings({
        searchableAttributes: ["username", "displayName", "bio"],
        filterableAttributes: ["isVerified"],
        sortableAttributes: ["followersCount"],
        rankingRules: ["words", "typo", "proximity", "attribute", "sort", "exactness", "followersCount:desc"],
      }),
      c.index("products").updateSettings({
        searchableAttributes: ["title", "description", "category", "location", "sellerName"],
        filterableAttributes: ["category", "condition", "status", "price"],
        sortableAttributes: ["price", "rating", "createdAt"],
      }),
      c.index("reels").updateSettings({
        searchableAttributes: ["caption", "authorName"],
        filterableAttributes: ["authorId"],
        sortableAttributes: ["viewsCount", "likesCount"],
      }),
    ]);
    logger.info("Meilisearch indexes configured");
  } catch (err) {
    logger.warn({ err }, "Meilisearch index setup failed (non-fatal)");
  }
}

/* ── Upsert helpers (fire-and-forget, never throw) ── */
export function indexPost(doc: MeiliPost): void {
  const c = getClient();
  if (!c) return;
  c.index("posts").addDocuments([doc], { primaryKey: "id" }).catch(() => {});
}

export function deletePostIndex(id: number): void {
  const c = getClient();
  if (!c) return;
  c.index("posts").deleteDocument(id).catch(() => {});
}

export function indexUser(doc: MeiliUser): void {
  const c = getClient();
  if (!c) return;
  c.index("users").addDocuments([doc], { primaryKey: "id" }).catch(() => {});
}

export function indexProduct(doc: MeiliProduct): void {
  const c = getClient();
  if (!c) return;
  c.index("products").addDocuments([doc], { primaryKey: "id" }).catch(() => {});
}

export function deleteProductIndex(id: number): void {
  const c = getClient();
  if (!c) return;
  c.index("products").deleteDocument(id).catch(() => {});
}

export function indexReel(doc: MeiliReel): void {
  const c = getClient();
  if (!c) return;
  c.index("reels").addDocuments([doc], { primaryKey: "id" }).catch(() => {});
}

/* ── Search ── */
export interface MeiliSearchResult {
  users: MeiliUser[];
  posts: MeiliPost[];
  reels: MeiliReel[];
  products: MeiliProduct[];
  query: string;
  source: "meilisearch";
}

export async function meiliSearch(
  q: string,
  type: string,
  limit: number,
): Promise<MeiliSearchResult | null> {
  const c = getClient();
  if (!c) return null;
  try {
    const opts = { limit, attributesToHighlight: [], showMatchesPosition: false };
    const [usersRes, postsRes, reelsRes, productsRes] = await Promise.all([
      (type === "all" || type === "users")  ? c.index("users").search<MeiliUser>(q, opts)    : null,
      (type === "all" || type === "posts")  ? c.index("posts").search<MeiliPost>(q, opts)    : null,
      (type === "all" || type === "reels")  ? c.index("reels").search<MeiliReel>(q, opts)    : null,
      (type === "all" || type === "products") ? c.index("products").search<MeiliProduct>(q, { ...opts, filter: "status = active" }) : null,
    ]);
    return {
      users:    usersRes?.hits    ?? [],
      posts:    postsRes?.hits    ?? [],
      reels:    reelsRes?.hits    ?? [],
      products: productsRes?.hits ?? [],
      query: q,
      source: "meilisearch",
    };
  } catch (err) {
    logger.warn({ err }, "Meilisearch search failed, falling back to DB");
    return null;
  }
}

export function isMeiliAvailable(): boolean {
  return !!process.env["MEILI_HOST"];
}
