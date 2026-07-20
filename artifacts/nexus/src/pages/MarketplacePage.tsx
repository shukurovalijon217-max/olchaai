import { useState, useCallback } from "react";
import { Plus, Search, SlidersHorizontal, ShoppingBag, Star, MapPin, Heart, Store, Flame, Sparkles, Eye, Package } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useListProducts, useListMarketplaceCategories } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";

const API = (import.meta.env.VITE_API_BASE_URL);

// ─── Favorites (localStorage) ────────────────────────────────────────────────
function getFavs(): Set<number> {
  try { return new Set(JSON.parse(localStorage.getItem("bozor_favs") ?? "[]")); } catch { return new Set(); }
}
function saveFavs(s: Set<number>) {
  localStorage.setItem("bozor_favs", JSON.stringify([...s]));
}

// ─── API helpers ──────────────────────────────────────────────────────────────
async function fetchFeatured() {
  const r = await fetch(`${API}/api/marketplace/featured`, { credentials: "include" });
  if (!r.ok) return [];
  return r.json();
}
async function fetchStats() {
  const r = await fetch(`${API}/api/marketplace/stats`, { credentials: "include" });
  if (!r.ok) return null;
  return r.json();
}

// ─── Category config ──────────────────────────────────────────────────────────
const CAT_ICONS: Record<string, string> = {
  electronics: "📱", clothing: "👗", food: "🍎", services: "🛠️",
  digital: "💻", beauty: "💄", sport: "⚽", home: "🏠",
  automotive: "🚗", books: "📚", other: "📦",
};

// ─── Product card (main grid) ─────────────────────────────────────────────────
function ProductCard({
  product, onClick, t, favs, onFav,
}: {
  product: any; onClick: () => void; t: (k: string) => string;
  favs: Set<number>; onFav: (id: number) => void;
}) {
  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100) : null;
  const isFav = favs.has(product.id);

  return (
    <div className="group relative rounded-2xl overflow-hidden bg-amber-950/20 hover:bg-amber-950/35 transition-all border border-amber-900/20 hover:border-amber-700/50 hover:shadow-lg hover:shadow-amber-900/20">
      <button onClick={onClick} className="w-full text-left">
        <div className="relative aspect-square bg-amber-900/15 overflow-hidden">
          {product.thumbnailUrl ? (
            <img src={product.thumbnailUrl} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" decoding="async" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">🛍️</div>
          )}
          {discount && (
            <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">-{discount}%</span>
          )}
          {!discount && product.condition === "new" && (
            <span className="absolute top-2 left-2 bg-emerald-600/90 text-white text-xs px-2 py-0.5 rounded-full">{t("market.new_badge")}</span>
          )}
          {product.condition === "digital" && (
            <span className="absolute top-2 right-8 bg-blue-700/90 text-white text-xs px-2 py-0.5 rounded-full">💻</span>
          )}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="bg-black/80 text-white text-xs px-3 py-1 rounded-full">{t("market.out_of_stock")}</span>
            </div>
          )}
        </div>
        <div className="p-2.5">
          <p className="text-sm font-medium line-clamp-2 leading-tight">{product.title}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-amber-400 font-bold text-sm">{(product.price / 100).toLocaleString()} {t("market.som")}</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-muted-foreground text-xs line-through">{(product.originalPrice / 100).toLocaleString()}</span>
            )}
          </div>
          {product.rating > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-xs text-amber-400">{(product.rating / 100).toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({product.reviewsCount})</span>
            </div>
          )}
          {product.location && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" /> {product.location}
            </div>
          )}
          {product.seller && (
            <div className="flex items-center gap-1 mt-1.5">
              <div className="w-4 h-4 rounded-full bg-amber-700/50 overflow-hidden flex-shrink-0">
                {product.seller.avatarUrl && <img src={product.seller.avatarUrl} className="w-full h-full object-cover" loading="lazy" decoding="async" />}
              </div>
              <span className="text-xs text-muted-foreground truncate">{product.seller.displayName}</span>
            </div>
          )}
        </div>
      </button>
      {/* Favorite button */}
      <button
        onClick={e => { e.stopPropagation(); onFav(product.id); }}
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur flex items-center justify-center hover:bg-black/70 transition-colors"
      >
        <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-red-500 text-red-500" : "text-white"}`} />
      </button>
    </div>
  );
}

// ─── Compact horizontal card ───────────────────────────────────────────────────
function HCard({ product, onClick, t, favs, onFav }: { product: any; onClick: () => void; t: (k: string) => string; favs: Set<number>; onFav: (id: number) => void }) {
  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100) : null;
  const isFav = favs.has(product.id);
  return (
    <div className="group relative rounded-2xl overflow-hidden bg-amber-950/20 border border-amber-900/20 hover:border-amber-700/40 transition-all flex-shrink-0 w-40">
      <button onClick={onClick} className="w-full text-left">
        <div className="relative w-full h-36 bg-amber-900/15 overflow-hidden">
          {product.thumbnailUrl
            ? <img src={product.thumbnailUrl} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" decoding="async" />
            : <div className="w-full h-full flex items-center justify-center text-3xl">🛍️</div>}
          {discount && <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">-{discount}%</span>}
        </div>
        <div className="p-2">
          <p className="text-xs font-medium line-clamp-2 leading-snug">{product.title}</p>
          <p className="text-amber-400 font-bold text-xs mt-1">{(product.price / 100).toLocaleString()} so'm</p>
          {product.originalPrice && product.originalPrice > product.price && (
            <p className="text-muted-foreground text-xs line-through">{(product.originalPrice / 100).toLocaleString()}</p>
          )}
        </div>
      </button>
      <button
        onClick={e => { e.stopPropagation(); onFav(product.id); }}
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center"
      >
        <Heart className={`w-3 h-3 ${isFav ? "fill-red-500 text-red-500" : "text-white"}`} />
      </button>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, onViewAll, color = "text-amber-500" }: { icon: any; title: string; onViewAll?: () => void; color?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-bold text-base flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        {title}
      </h2>
      {onViewAll && (
        <button onClick={onViewAll} className="text-xs text-amber-500 hover:text-amber-400 font-medium">
          {t("market.view_all")}
        </button>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MarketplacePage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { user: _user } = useAuth();

  const [searchQ, setSearchQ] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [favs, setFavs] = useState<Set<number>>(getFavs());
  const [showFavs, setShowFavs] = useState(false);

  const toggleFav = useCallback((id: number) => {
    setFavs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveFavs(next);
      return next;
    });
  }, []);

  const { data: categoriesData = [] } = useListMarketplaceCategories();
  const { data: statsData } = useQuery({ queryKey: ["market-stats"], queryFn: fetchStats, staleTime: 60_000 });
  const { data: featuredData } = useQuery({ queryKey: ["market-featured"], queryFn: fetchFeatured, staleTime: 30_000 });

  const { data, isLoading } = useListProducts({
    q: activeSearch || undefined,
    category: category || undefined,
    condition: condition || undefined,
    sort,
    limit: 40,
  });

  const products = data?.products ?? [];
  const isSearching = !!activeSearch || !!condition || sort !== "newest";

  const hotDeals: any[] = featuredData?.hotDeals ?? [];
  const newArrivals: any[] = featuredData?.newArrivals ?? [];
  const popular: any[] = featuredData?.popular ?? [];

  const favProducts = products.filter((p: any) => favs.has(p.id));

  const CONDITIONS = [
    { id: "", label: t("market.all") },
    { id: "new", label: t("market.new_cond") },
    { id: "used", label: t("market.used") },
    { id: "digital", label: t("market.digital") },
  ];

  const SORTS = [
    { id: "newest", label: t("market.newest") },
    { id: "popular", label: t("market.popular") },
    { id: "price_asc", label: t("market.cheap") },
    { id: "price_desc", label: t("market.expensive") },
  ];

  const handleSearch = () => setActiveSearch(searchQ);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="sticky z-30 bg-background/95 backdrop-blur border-b border-amber-900/20 px-4 py-3 space-y-3" style={{ top: "env(safe-area-inset-top, 0px)" }}>
        {/* Top row */}
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <h1 className="font-bold text-lg flex-1">{t("market.title")}</h1>
          <button
            onClick={() => navigate("/bozor/do-kon")}
            className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-medium px-2.5 py-1.5 rounded-full border border-amber-900/40 hover:border-amber-700"
          >
            <Store className="w-3.5 h-3.5" /> {t("market.my_shop")}
          </button>
          <button
            onClick={() => navigate("/bozor/sotish")}
            className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors shadow shadow-amber-900/40"
          >
            <Plus className="w-3.5 h-3.5" /> {t("market.add_listing")}
          </button>
        </div>

        {/* Search bar */}
        <div className="relative flex items-center">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
          <input
            type="text"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder={t("market.search_ph")}
            className="flex-1 bg-amber-950/30 border border-amber-900/40 rounded-full pl-9 pr-20 py-2 text-sm focus:outline-none focus:border-amber-600"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {(searchQ || activeSearch) && (
              <button onClick={() => { setSearchQ(""); setActiveSearch(""); }} className="p-1.5 rounded-full text-muted-foreground hover:text-foreground">✕</button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-full transition-colors ${showFilters ? "bg-amber-700 text-white" : "text-muted-foreground hover:text-foreground"}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <button onClick={handleSearch} className="p-1.5 rounded-full bg-amber-700 hover:bg-amber-600 text-white">
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-900/30 space-y-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">{t("market.condition")}</div>
              <div className="flex gap-2 flex-wrap">
                {CONDITIONS.map(c => (
                  <button key={c.id} onClick={() => setCondition(c.id === condition ? "" : c.id)}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${condition === c.id ? "bg-amber-700 border-amber-600 text-white" : "border-amber-900/40 text-muted-foreground hover:border-amber-700"}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">{t("market.sort_label")}</div>
              <div className="flex gap-2 flex-wrap">
                {SORTS.map(s => (
                  <button key={s.id} onClick={() => setSort(s.id)}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${sort === s.id ? "bg-amber-700 border-amber-600 text-white" : "border-amber-900/40 text-muted-foreground hover:border-amber-700"}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
          <button onClick={() => { setCategory(""); setActiveSearch(""); setSearchQ(""); }}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors flex-shrink-0 ${!category && !showFavs ? "bg-amber-700 text-white" : "bg-amber-950/30 text-muted-foreground hover:text-foreground border border-amber-900/30"}`}>
            {t("market.all")}
          </button>
          {favs.size > 0 && (
            <button onClick={() => setShowFavs(!showFavs)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors flex-shrink-0 ${showFavs ? "bg-red-700 text-white" : "bg-amber-950/30 text-muted-foreground hover:text-foreground border border-amber-900/30"}`}>
              <Heart className="w-3 h-3" /> Sevimlilar ({favs.size})
            </button>
          )}
          {(categoriesData as any[]).map((cat: any) => (
            <button key={cat.id} onClick={() => { setCategory(cat.id === category ? "" : cat.id); setShowFavs(false); }}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors flex-shrink-0 ${category === cat.id ? "bg-amber-700 text-white" : "bg-amber-950/30 text-muted-foreground hover:text-foreground border border-amber-900/30"}`}>
              {CAT_ICONS[cat.id] ?? "📦"} {cat.label.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="px-3 pt-4 space-y-7">

        {/* ── Favorites mode ── */}
        {showFavs && (
          <div>
            <SectionHeader icon={Heart} title={`❤️ Sevimlilarim (${favs.size})`} color="text-red-500" />
            {favProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Hali hech narsa sevimliga qo'shilmagan</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {favProducts.map((p: any) => (
                  <ProductCard key={p.id} product={p} t={t} favs={favs} onFav={toggleFav} onClick={() => navigate(`/bozor/${p.id}`)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── HOME view (no search, no favs) ── */}
        {!isSearching && !showFavs && !category && (
          <>
            {/* Stats banner */}
            {statsData && (
              <div className="rounded-2xl bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-amber-950/60 border border-amber-800/30 p-4">
                <p className="text-xs text-amber-400/80 font-medium mb-3 uppercase tracking-wider">📊 {t("market.stats_title")}</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: statsData.totalProducts, label: t("market.stats_products"), icon: "🛍️" },
                    { value: statsData.totalSellers, label: t("market.stats_sellers"), icon: "🏪" },
                    { value: statsData.totalOrders, label: t("market.stats_orders"), icon: "✅" },
                  ].map(({ value, label, icon }) => (
                    <div key={label} className="text-center">
                      <div className="text-xl mb-0.5">{icon}</div>
                      <div className="text-xl font-bold text-amber-300">{Number(value).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category grid */}
            <div>
              <SectionHeader icon={Package} title={t("market.categories_title")} color="text-amber-400" />
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {(categoriesData as any[]).map((cat: any) => (
                  <button key={cat.id} onClick={() => setCategory(cat.id)}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-amber-950/30 hover:bg-amber-950/50 border border-amber-900/20 hover:border-amber-700/50 transition-all group">
                    <span className="text-2xl group-hover:scale-110 transition-transform">{CAT_ICONS[cat.id] ?? "📦"}</span>
                    <span className="text-xs text-muted-foreground text-center leading-tight">{cat.label.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Hot deals */}
            {hotDeals.length > 0 && (
              <div>
                <SectionHeader icon={Flame} title={t("market.hot_deals")} color="text-red-500"
                  onViewAll={() => { setCondition(""); setSort("price_asc"); setActiveSearch(""); setShowFilters(true); }} />
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  {hotDeals.map((p: any) => (
                    <HCard key={p.id} product={p} t={t} favs={favs} onFav={toggleFav} onClick={() => navigate(`/bozor/${p.id}`)} />
                  ))}
                </div>
              </div>
            )}

            {/* New arrivals */}
            {newArrivals.length > 0 && (
              <div>
                <SectionHeader icon={Sparkles} title={t("market.new_arrivals")} color="text-emerald-400"
                  onViewAll={() => setSort("newest")} />
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  {newArrivals.map((p: any) => (
                    <HCard key={p.id} product={p} t={t} favs={favs} onFav={toggleFav} onClick={() => navigate(`/bozor/${p.id}`)} />
                  ))}
                </div>
              </div>
            )}

            {/* Popular */}
            {popular.length > 0 && (
              <div>
                <SectionHeader icon={Eye} title={t("market.popular_label")} color="text-blue-400"
                  onViewAll={() => setSort("popular")} />
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  {popular.map((p: any) => (
                    <HCard key={p.id} product={p} t={t} favs={favs} onFav={toggleFav} onClick={() => navigate(`/bozor/${p.id}`)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── All products / search results ── */}
        {!showFavs && (
          <div>
            {!isSearching && !category ? (
              <SectionHeader icon={ShoppingBag} title={t("market.all_products")} color="text-amber-500" />
            ) : (
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">
                  {data?.total ?? products.length} {t("market.products_count")}
                  {activeSearch && <span className="text-foreground ml-1">«{activeSearch}»</span>}
                </p>
                {(activeSearch || category || condition) && (
                  <button onClick={() => { setSearchQ(""); setActiveSearch(""); setCategory(""); setCondition(""); setSort("newest"); }}
                    className="text-xs text-amber-500 hover:text-amber-400">Tozalash ✕</button>
                )}
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-2xl bg-amber-950/20 animate-pulse">
                    <div className="aspect-square rounded-t-2xl bg-amber-900/20" />
                    <div className="p-2.5 space-y-2">
                      <div className="h-3 bg-amber-900/20 rounded w-4/5" />
                      <div className="h-3 bg-amber-900/20 rounded w-2/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <div className="w-20 h-20 rounded-full bg-amber-900/20 flex items-center justify-center text-4xl">🛍️</div>
                <div>
                  <p className="font-semibold text-lg">{t("market.not_found")}</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    {activeSearch ? `"${activeSearch}" ${t("market.no_results")}` : t("market.no_products_yet")}
                  </p>
                </div>
                <button onClick={() => navigate("/bozor/sotish")}
                  className="bg-amber-700 hover:bg-amber-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold shadow shadow-amber-900/40">
                  {t("market.add_first")}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {products.map((p: any) => (
                  <ProductCard key={p.id} product={p} t={t} favs={favs} onFav={toggleFav} onClick={() => navigate(`/bozor/${p.id}`)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Bottom CTA banner ── */}
        {!isSearching && !showFavs && !category && (
          <div className="rounded-2xl bg-gradient-to-r from-amber-800/40 to-amber-900/40 border border-amber-700/30 p-5 flex items-center gap-4">
            <div className="flex-1">
              <p className="font-bold text-base">{t("market.sell_cta")}</p>
              <p className="text-muted-foreground text-sm mt-0.5">{t("market.sell_cta_sub")}</p>
            </div>
            <button onClick={() => navigate("/bozor/sotish")}
              className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 flex-shrink-0 shadow shadow-amber-900/40">
              <Plus className="w-4 h-4" /> {t("market.add_listing")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
