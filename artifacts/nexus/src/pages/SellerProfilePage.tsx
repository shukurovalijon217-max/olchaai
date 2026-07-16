import { useState } from "react";
import { ArrowLeft, Store, ShoppingBag, Star, Package, CheckCircle, MessageCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";

const API = (import.meta.env.VITE_API_BASE_URL ?? "");

async function fetchSeller(id: number) {
  const r = await fetch(`${API}/api/marketplace/seller/${id}`, { credentials: "include" });
  if (!r.ok) throw new Error("Sotuvchi topilmadi");
  return r.json();
}

function MiniProductCard({ product, onClick }: { product: any; onClick: () => void }) {
  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100) : null;
  return (
    <button onClick={onClick} className="group rounded-xl overflow-hidden bg-amber-950/20 hover:bg-amber-950/35 border border-amber-900/20 hover:border-amber-700/40 text-left transition-all">
      <div className="relative aspect-square bg-amber-900/15 overflow-hidden">
        {product.thumbnailUrl ? (
          <img loading="lazy" decoding="async" src={product.thumbnailUrl} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-amber-700/40" />
          </div>
        )}
        {discount && (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">-{discount}%</span>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs font-medium line-clamp-2 leading-tight">{product.title}</p>
        <p className="text-amber-400 font-bold text-sm mt-1">{(product.price / 100).toLocaleString()} so'm</p>
        {product.rating > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-xs text-amber-400">{(product.rating / 100).toFixed(1)}</span>
          </div>
        )}
      </div>
    </button>
  );
}

export default function SellerProfilePage({ sellerId }: { sellerId: number }) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["seller-profile", sellerId],
    queryFn: () => fetchSeller(sellerId),
    staleTime: 30_000,
  });

  const isOwnShop = user?.id === sellerId;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="w-16 h-16 rounded-full bg-amber-900/20 flex items-center justify-center">
          <Store className="w-8 h-8 text-amber-700/50" />
        </div>
        <p className="font-semibold">Sotuvchi topilmadi</p>
        <button onClick={() => navigate("/bozor")} className="text-amber-500 text-sm">← Bozorga qaytish</button>
      </div>
    );
  }

  const { seller, products, stats } = data;

  const joinedYear = seller.createdAt ? new Date(seller.createdAt).getFullYear() : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="top-0 z-30 bg-background/95 backdrop-blur border-b border-amber-900/20 px-4 py-3 flex items-center gap-3 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
        <button onClick={() => navigate("/bozor")} className="p-1.5 rounded-full hover:bg-amber-950/40">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-base flex-1 truncate">
          {seller.displayName}{"  "}
          {seller.isVerified && <span className="text-amber-500 text-xs">✓</span>}
        </h1>
        {isOwnShop && (
          <button onClick={() => navigate("/bozor/do-kon")} className="text-sm text-amber-500 font-medium">
            Boshqarish →
          </button>
        )}
      </div>

      {/* Seller hero */}
      <div className="bg-gradient-to-b from-amber-950/40 to-transparent px-4 py-8">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-amber-700/40 overflow-hidden border-2 border-amber-600/50 shadow-lg shadow-amber-900/30">
              {seller.avatarUrl ? (
                <img loading="lazy" decoding="async" src={seller.avatarUrl} alt={seller.displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">🏪</div>
              )}
            </div>
            {seller.isVerified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center border-2 border-background">
                <CheckCircle className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </div>

          <div className="text-center">
            <h2 className="text-xl font-bold">{seller.displayName}</h2>
            {seller.username && <p className="text-muted-foreground text-sm">@{seller.username}</p>}
            {joinedYear && <p className="text-xs text-muted-foreground mt-1">🗓 {joinedYear} yildan beri a'zo</p>}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-6 mt-2">
            <div className="text-center">
              <div className="text-lg font-bold text-amber-400">{stats.totalProducts}</div>
              <div className="text-xs text-muted-foreground">Mahsulot</div>
            </div>
            <div className="w-px h-8 bg-amber-900/40" />
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-400">{stats.totalOrders}</div>
              <div className="text-xs text-muted-foreground">Sotuv</div>
            </div>
            <div className="w-px h-8 bg-amber-900/40" />
            <div className="text-center">
              <div className="text-lg font-bold text-amber-400">
                {stats.avgRating > 0 ? (
                  <span className="flex items-center gap-1 justify-center">
                    <Star className="w-4 h-4 fill-amber-400" />
                    {(stats.avgRating / 100).toFixed(1)}
                  </span>
                ) : "—"}
              </div>
              <div className="text-xs text-muted-foreground">Reyting</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-1 w-full max-w-xs">
            {!isOwnShop && (
              <button
                onClick={() => navigate(`/messages?user=${sellerId}`)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-950/60 border border-amber-900/40 text-sm font-medium transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-amber-400" />
                {t("seller.contact")}
              </button>
            )}
            {isOwnShop && (
              <button
                onClick={() => navigate("/bozor/sotish")}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-600 text-sm font-medium text-white transition-colors"
              >
                <Package className="w-4 h-4" />
                {t("market.add_listing")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Products section */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Store className="w-4 h-4 text-amber-500" />
            {t("seller.all_by")} ({stats.totalProducts})
          </h3>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-900/20 flex items-center justify-center">
              <ShoppingBag className="w-7 h-7 text-amber-600/40" />
            </div>
            <p className="text-muted-foreground">{t("seller.no_products")}</p>
            {isOwnShop && (
              <button onClick={() => navigate("/bozor/sotish")} className="bg-amber-700 text-white px-5 py-2 rounded-full text-sm">
                {t("market.add_first")}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((p: any) => (
              <MiniProductCard key={p.id} product={p} onClick={() => navigate(`/bozor/${p.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
