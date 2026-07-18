import { logger } from "./logger";

const MEILI_HOST = () => process.env["MEILI_HOST"] ?? "";
const MEILI_KEY  = () => process.env["MEILI_MASTER_KEY"] ?? "";

function isAvailable(): boolean {
  return !!process.env["MEILI_HOST"];
}

async function meiliReq(
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const host = MEILI_HOST();
  const res = await fetch(`${host}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(MEILI_KEY() ? { Authorization: `Bearer ${MEILI_KEY()}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error(`Meili ${method} ${path} → ${res.status}`);
  return res.json();
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

/* ── Index setup ── */
export async function setupMeiliIndexes(): Promise<void> {
  if (!isAvailable()) return;
  try {
    await Promise.all([
      meiliReq("PATCH", "/indexes/posts/settings", {
        searchableAttributes: ["content", "authorName"],
        filterableAttributes: ["authorId", "createdAt"],
        sortableAttributes: ["createdAt", "likesCount"],
      }),
      meiliReq("PATCH", "/indexes/users/settings", {
        searchableAttributes: ["username", "displayName", "bio"],
        filterableAttributes: ["isVerified"],
        sortableAttributes: ["followersCount"],
      }),
      meiliReq("PATCH", "/indexes/products/settings", {
        searchableAttributes: ["title", "description", "category", "location", "sellerName"],
        filterableAttributes: ["category", "condition", "status", "price"],
        sortableAttributes: ["price", "rating"],
      }),
      meiliReq("PATCH", "/indexes/reels/settings", {
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

/* ── Upsert helpers (fire-and-forget) ── */
export function indexPost(doc: MeiliPost): void {
  if (!isAvailable()) return;
  meiliReq("POST", "/indexes/posts/documents?primaryKey=id", [doc]).catch(() => {});
}

export function deletePostIndex(id: number): void {
  if (!isAvailable()) return;
  meiliReq("DELETE", `/indexes/posts/documents/${id}`).catch(() => {});
}

export function indexUser(doc: MeiliUser): void {
  if (!isAvailable()) return;
  meiliReq("POST", "/indexes/users/documents?primaryKey=id", [doc]).catch(() => {});
}

export function indexProduct(doc: MeiliProduct): void {
  if (!isAvailable()) return;
  meiliReq("POST", "/indexes/products/documents?primaryKey=id", [doc]).catch(() => {});
}

export function deleteProductIndex(id: number): void {
  if (!isAvailable()) return;
  meiliReq("DELETE", `/indexes/products/documents/${id}`).catch(() => {});
}

export function indexReel(doc: MeiliReel): void {
  if (!isAvailable()) return;
  meiliReq("POST", "/indexes/reels/documents?primaryKey=id", [doc]).catch(() => {});
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

async function searchIndex<T>(index: string, q: string, limit: number, filter?: string): Promise<T[]> {
  try {
    const body: Record<string, unknown> = { q, limit };
    if (filter) body["filter"] = filter;
    const res = await meiliReq("POST", `/indexes/${index}/search`, body) as { hits: T[] };
    return res.hits ?? [];
  } catch {
    return [];
  }
}

export async function meiliSearch(
  q: string,
  type: string,
  limit: number,
): Promise<MeiliSearchResult | null> {
  if (!isAvailable()) return null;
  try {
    const [users, posts, reels, products] = await Promise.all([
      (type === "all" || type === "users")    ? searchIndex<MeiliUser>("users", q, limit) : [],
      (type === "all" || type === "posts")    ? searchIndex<MeiliPost>("posts", q, limit) : [],
      (type === "all" || type === "reels")    ? searchIndex<MeiliReel>("reels", q, limit) : [],
      (type === "all" || type === "products") ? searchIndex<MeiliProduct>("products", q, limit, "status = 'active'") : [],
    ]);
    return { users, posts, reels, products, query: q, source: "meilisearch" };
  } catch (err) {
    logger.warn({ err }, "Meilisearch search failed, falling back to DB");
    return null;
  }
}

export function isMeiliAvailable(): boolean {
  return isAvailable();
}
