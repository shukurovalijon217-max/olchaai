import { useState } from "react";
import { Plus, Search, SlidersHorizontal, ShoppingBag, Star, MapPin } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useListProducts, useListMarketplaceCategories } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";

function ProductCard({ product, onClick, t }: { product: any; onClick: () => void; t: (k: string) => string }) {
  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;

  return (
    <button
      onClick={onClick}
      className="group rounded-xl overflow-hidden bg-amber-950/20 hover:bg-amber-950/35 transition-all border border-amber-900/20 hover:border-amber-700/40 text-left"
    >
      <div className="relative aspect-square bg-amber-900/15 overflow-hidden">
        {product.thumbnailUrl ? (
          <img src={product.thumbnailUrl} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-amber-700/40" />
          </div>
        )}
        {discount && (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            -{discount}%
          </span>
        )}
        {product.condition === "new" && (
          <span className="absolute top-2 right-2 bg-emerald-700/90 text-white text-xs px-2 py-0.5 rounded-full">{t("market.new_badge")}</span>
        )}
        {product.condition === "digital" && (
          <span className="absolute top-2 right-2 bg-blue-700/90 text-white text-xs px-2 py-0.5 rounded-full">💻 {t("market.digital_badge")}</span>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
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
              {product.seller.avatarUrl && <img src={product.seller.avatarUrl} className="w-full h-full object-cover" />}
            </div>
            <span className="text-xs text-muted-foreground truncate">{product.seller.displayName}</span>
          </div>
        )}
      </div>
    </button>
  );
}

export default function MarketplacePage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { user: _user } = useAuth();
  const [searchQ, setSearchQ] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

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

  const { data: categoriesData = [] } = useListMarketplaceCategories();
  const { data, isLoading } = useListProducts({
    q: searchQ || undefined,
    category: category || undefined,
    condition: condition || undefined,
    sort,
    limit: 40,
  });

  const products = data?.products ?? [];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-amber-900/20 px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-2 flex-1">
            <ShoppingBag className="w-5 h-5 text-amber-500" />
            <h1 className="font-bold text-lg">{t("market.title")}</h1>
          </div>
          <button
            onClick={() => navigate("/bozor/sotish")}
            className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium px-3 py-1.5 rounded-full transition-colors"
          >
            <Plus className="w-4 h-4" /> {t("market.sell")}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
          <input
            type="text"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder={t("market.search_ph")}
            className="w-full bg-amber-950/30 border border-amber-900/40 rounded-full pl-9 pr-10 py-2 text-sm focus:outline-none focus:border-amber-600"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors ${showFilters ? "bg-amber-700 text-white" : "text-muted-foreground hover:text-foreground"}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mt-3 p-3 rounded-xl bg-amber-950/30 border border-amber-900/30 space-y-3">
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
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => setCategory("")}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${!category ? "bg-amber-700 text-white" : "bg-amber-950/30 text-muted-foreground hover:text-foreground border border-amber-900/30"}`}
          >
            {t("market.all")}
          </button>
          {categoriesData.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id === category ? "" : cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${category === cat.id ? "bg-amber-700 text-white" : "bg-amber-950/30 text-muted-foreground hover:text-foreground border border-amber-900/30"}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Products grid */}
      <div className="px-3 pt-4">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-amber-950/20 animate-pulse">
                <div className="aspect-square rounded-t-xl bg-amber-900/20" />
                <div className="p-2.5 space-y-2">
                  <div className="h-3 bg-amber-900/20 rounded w-4/5" />
                  <div className="h-3 bg-amber-900/20 rounded w-2/5" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-amber-900/20 flex items-center justify-center">
              <ShoppingBag className="w-9 h-9 text-amber-700/60" />
            </div>
            <div>
              <p className="font-semibold text-lg">{t("market.not_found")}</p>
              <p className="text-muted-foreground text-sm mt-1">
                {searchQ
                  ? `"${searchQ}" ${t("market.no_results")}`
                  : t("market.no_products_yet")}
              </p>
            </div>
            <button
              onClick={() => navigate("/bozor/sotish")}
              className="bg-amber-700 hover:bg-amber-600 text-white px-6 py-2.5 rounded-full text-sm font-medium"
            >
              {t("market.add_first")}
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">{data?.total ?? products.length} {t("market.products_count")}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {products.map((p: any) => (
                <ProductCard key={p.id} product={p} t={t} onClick={() => navigate(`/bozor/${p.id}`)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
