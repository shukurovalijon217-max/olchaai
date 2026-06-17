import { useState } from "react";
import { ArrowLeft, Star, MapPin, Package, ShoppingCart, MessageCircle, Share2, Heart, ChevronLeft, ChevronRight, Store, Shield, Truck, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useGetProduct, useListProductReviews, useBuyProduct } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  const val = rating / 100;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} className={`w-4 h-4 ${i < Math.round(val) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

export default function ProductDetailPage({ productId }: { productId: number }) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [imageIdx, setImageIdx] = useState(0);
  const [buying, setBuying] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState("pickup");
  const [address, setAddress] = useState("");
  const [orderDone, setOrderDone] = useState<any>(null);
  const [buyError, setBuyError] = useState("");
  const [liked, setLiked] = useState(false);

  const { data: product, isLoading } = useGetProduct(productId);
  const { data: reviews = [] } = useListProductReviews(productId);
  const { mutateAsync: buyProduct, isPending: isBuying } = useBuyProduct();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!product) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{t("product_detail.not_found")}</div>;
  }

  const images = (product as any).mediaUrls?.length ? (product as any).mediaUrls : [product.thumbnailUrl].filter(Boolean);
  const isOwner = user?.id === product.sellerId;
  const totalPrice = product.price * quantity;
  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100) : null;

  const conditionLabel = product.condition === "new"
    ? t("product_detail.cond_new")
    : product.condition === "digital"
      ? t("product_detail.cond_digital")
      : t("product_detail.cond_used");

  const handleBuy = async () => {
    setBuyError("");
    try {
      const res = await buyProduct({
        id: productId,
        data: { quantity, deliveryMethod, deliveryAddress: address || undefined } as any,
      });
      setOrderDone(res);
      setBuying(false);
    } catch (e: any) {
      setBuyError(e?.response?.data?.error ?? t("common.error"));
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur flex items-center justify-between px-4 py-3 border-b border-amber-900/20">
        <button onClick={() => navigate("/bozor")} className="p-1.5 rounded-full hover:bg-amber-950/40">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setLiked(!liked)} className="p-1.5 rounded-full hover:bg-amber-950/40">
            <Heart className={`w-5 h-5 ${liked ? "fill-red-500 text-red-500" : ""}`} />
          </button>
          <button className="p-1.5 rounded-full hover:bg-amber-950/40">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Order success */}
      {orderDone && (
        <div className="mx-4 mt-4 p-4 bg-emerald-900/30 border border-emerald-700/40 rounded-xl">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
            <Shield className="w-5 h-5" /> {t("product_detail.order_success")}
          </div>
          <p className="text-sm text-emerald-300">{t("product_detail.order_accepted")}</p>
        </div>
      )}

      {/* Image gallery */}
      <div className="relative bg-amber-950/20 overflow-hidden" style={{ height: 320 }}>
        {images.length > 0 ? (
          <>
            <img src={images[imageIdx]} alt={product.title} className="w-full h-full object-contain" />
            {images.length > 1 && (
              <>
                <button onClick={() => setImageIdx(i => (i - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button onClick={() => setImageIdx(i => (i + 1) % images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {images.map((_: any, i: number) => (
                    <button key={i} onClick={() => setImageIdx(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${i === imageIdx ? "bg-amber-400 w-4" : "bg-white/40"}`} />
                  ))}
                </div>
              </>
            )}
            {discount && (
              <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">-{discount}%</span>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-amber-700/30" />
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2 px-4 py-2 overflow-x-auto no-scrollbar">
          {images.map((url: string, i: number) => (
            <button key={i} onClick={() => setImageIdx(i)}
              className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${i === imageIdx ? "border-amber-500" : "border-transparent"}`}>
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="px-4 py-3 space-y-4">
        {/* Title & price */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold leading-tight flex-1">{product.title}</h1>
            <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${product.condition === "new" ? "bg-emerald-900/50 text-emerald-400" : product.condition === "digital" ? "bg-blue-900/50 text-blue-400" : "bg-amber-900/50 text-amber-400"}`}>
              {conditionLabel}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-2xl font-bold text-amber-400">{(product.price / 100).toLocaleString()} so'm</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-muted-foreground line-through text-lg">{(product.originalPrice / 100).toLocaleString()}</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
            {product.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{product.location}</span>}
            <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" />{product.stock} {t("product_detail.reserve")}</span>
            <span>👁 {product.viewsCount} {t("product_detail.views")}</span>
          </div>
          {product.rating > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <StarRating rating={product.rating} />
              <span className="text-amber-400 font-semibold text-sm">{(product.rating / 100).toFixed(1)}</span>
              <span className="text-muted-foreground text-sm">({product.reviewsCount} {t("product_detail.reviews").toLowerCase()})</span>
            </div>
          )}
        </div>

        {/* Seller */}
        {(product as any).seller && (
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/bozor/sotuvchi/${product.sellerId}`)}
              className="flex-1 flex items-center gap-3 p-3 rounded-xl bg-amber-950/20 hover:bg-amber-950/35 border border-amber-900/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-amber-700/40 overflow-hidden flex-shrink-0">
                {(product as any).seller.avatarUrl && <img src={(product as any).seller.avatarUrl} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-1 font-semibold text-sm">
                  {(product as any).seller.displayName}
                  {(product as any).seller.isVerified && <span className="text-amber-500 text-xs">✓</span>}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1"><Store className="w-3 h-3" /> {t("product_detail.seller_profile")}</div>
              </div>
              <span className="text-amber-500 text-sm">→</span>
            </button>
            <button
              onClick={() => navigate(`/messages?dm=${product.sellerId}`)}
              className="flex items-center justify-center w-12 h-12 my-auto rounded-xl bg-amber-950/30 border border-amber-900/30 hover:border-amber-700 text-amber-400 transition-colors"
              title="Sotuvchiga xabar"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Description */}
        {product.description && (
          <div>
            <h3 className="font-semibold text-sm mb-2 text-amber-300">{t("product_detail.description")}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>
          </div>
        )}

        {/* Tags */}
        {(product as any).tags?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(product as any).tags.map((tag: string) => (
              <span key={tag} className="px-2.5 py-1 bg-amber-950/30 rounded-full text-xs text-amber-400">#{tag}</span>
            ))}
          </div>
        )}

        {/* Delivery features */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Shield, label: t("product_detail.safe_pay"), desc: t("product_detail.via_wallet") },
            { icon: Truck, label: t("product_detail.delivery"), desc: t("product_detail.agreed") },
            { icon: MessageCircle, label: t("product_detail.contact_seller"), desc: t("product_detail.chat") },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-amber-950/20 text-center">
              <Icon className="w-5 h-5 text-amber-500" />
              <span className="text-xs font-medium">{label}</span>
              <span className="text-xs text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>

        {/* Reviews */}
        {reviews.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm mb-3 text-amber-300">{t("product_detail.reviews")} ({reviews.length})</h3>
            <div className="space-y-3">
              {(reviews as any[]).map((r) => (
                <div key={r.id} className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/20">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-full bg-amber-700/40 overflow-hidden">
                      {r.reviewer?.avatarUrl && <img src={r.reviewer.avatarUrl} className="w-full h-full object-cover" />}
                    </div>
                    <span className="text-sm font-medium">{r.reviewer?.displayName ?? "Foydalanuvchi"}</span>
                    <div className="flex gap-0.5 ml-auto">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
                      ))}
                    </div>
                  </div>
                  {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Buy modal overlay */}
      {buying && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end">
          <div className="w-full bg-card rounded-t-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{t("product_detail.buy_title")}</h3>
              <button onClick={() => setBuying(false)} className="p-1.5 hover:bg-amber-950/40 rounded-full">✕</button>
            </div>
            {buyError && (
              <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-700/40 rounded-xl text-red-300 text-sm">
                <AlertCircle className="w-4 h-4" /> {buyError}
              </div>
            )}
            <div className="flex items-center justify-between py-2 border-b border-amber-900/30">
              <span className="text-sm font-medium">{product.title}</span>
              <span className="text-amber-400 font-bold">{(product.price / 100).toLocaleString()} so'm/dona</span>
            </div>
            {/* Quantity */}
            <div className="flex items-center justify-between">
              <span className="text-sm">{t("product_detail.qty")}</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-full bg-amber-950/40 flex items-center justify-center font-bold text-lg">-</button>
                <span className="w-8 text-center font-bold">{quantity}</span>
                <button onClick={() => setQuantity(q => Math.min(product.stock, q + 1))} className="w-8 h-8 rounded-full bg-amber-950/40 flex items-center justify-center font-bold text-lg">+</button>
              </div>
            </div>
            {/* Delivery */}
            <div>
              <div className="text-sm font-medium mb-2">{t("product_detail.delivery_method")}</div>
              <div className="grid grid-cols-2 gap-2">
                {[{ id: "pickup", label: t("product_detail.pickup") }, { id: "delivery", label: t("product_detail.home_delivery") }].map(d => (
                  <button key={d.id} onClick={() => setDeliveryMethod(d.id)}
                    className={`py-2.5 rounded-xl text-sm border transition-colors ${deliveryMethod === d.id ? "bg-amber-700/50 border-amber-600 text-white" : "bg-amber-950/20 border-amber-900/30"}`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            {deliveryMethod === "delivery" && (
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder={t("product_detail.delivery_address_ph")}
                className="w-full bg-amber-950/20 border border-amber-900/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-600" />
            )}
            {/* Total */}
            <div className="flex items-center justify-between py-2 border-t border-amber-900/30">
              <span className="font-semibold">{t("product_detail.total")}</span>
              <span className="text-amber-400 font-bold text-xl">{(totalPrice / 100).toLocaleString()} so'm</span>
            </div>
            <button onClick={handleBuy} disabled={isBuying}
              className="w-full bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors">
              {isBuying ? t("product_detail.buying") : `${(totalPrice / 100).toLocaleString()} so'm ${t("product_detail.pay")}`}
            </button>
          </div>
        </div>
      )}

      {/* Bottom action bar */}
      {!isOwner && product.status === "active" && !orderDone && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur border-t border-amber-900/20 px-4 py-3 flex gap-3">
          <button
            onClick={() => navigate(`/messages`)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-amber-700 text-amber-400 text-sm font-medium hover:bg-amber-950/30"
          >
            <MessageCircle className="w-4 h-4" /> {t("product_detail.contact_btn")}
          </button>
          <button
            onClick={() => { setBuyError(""); setBuying(true); }}
            className="flex-1 flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors"
          >
            <ShoppingCart className="w-5 h-5" /> {t("product_detail.buy_btn")}
          </button>
        </div>
      )}
      {isOwner && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur border-t border-amber-900/20 px-4 py-3">
          <button onClick={() => navigate("/bozor/do-kon")}
            className="w-full flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors">
            <Store className="w-5 h-5" /> {t("product_detail.manage_shop")}
          </button>
        </div>
      )}
    </div>
  );
}
