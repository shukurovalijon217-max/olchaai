import { useState } from "react";
import { Plus, Package, ShoppingBag, Eye, ArrowLeft, Edit2, Trash2, CheckCircle, Truck } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useListMyProducts, useListOrders, useUpdateOrderStatus, useDeleteProduct } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";

type Tab = "products" | "selling" | "buying";

export default function MyShopPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("products");

  const { data: myProducts = [], isLoading: loadingProducts, refetch: refetchProducts } = useListMyProducts();
  const { data: sellingOrders = [], isLoading: loadingSelling } = useListOrders({ role: "seller" });
  const { data: buyingOrders = [], isLoading: loadingBuying } = useListOrders({ role: "buyer" });
  const { mutateAsync: updateStatus } = useUpdateOrderStatus();
  const { mutateAsync: deleteProduct } = useDeleteProduct();

  const products = myProducts as any[];
  const selling = sellingOrders as any[];
  const buying = buyingOrders as any[];

  const activeProducts = products.filter((p: any) => p.status === "active").length;
  const totalSales = selling.filter((o: any) => o.status !== "cancelled").length;
  const totalViews = products.reduce((s: number, p: any) => s + (p.viewsCount ?? 0), 0);

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending: { label: t("myshop.status_pending"), color: "text-yellow-400" },
    paid: { label: t("myshop.status_paid"), color: "text-blue-400" },
    processing: { label: t("myshop.status_processing"), color: "text-amber-400" },
    shipped: { label: t("myshop.status_shipped"), color: "text-cyan-400" },
    delivered: { label: t("myshop.status_delivered"), color: "text-emerald-400" },
    cancelled: { label: t("myshop.status_cancelled"), color: "text-red-400" },
  };

  const TABS = [
    { id: "products" as Tab, label: t("myshop.tab_products"), icon: ShoppingBag },
    { id: "selling" as Tab, label: t("myshop.tab_selling"), icon: Package },
    { id: "buying" as Tab, label: t("myshop.tab_buying"), icon: ShoppingBag },
  ];

  const handleStatusUpdate = async (orderId: number, status: string) => {
    try {
      await updateStatus({ id: orderId, data: { status } as any });
    } catch { }
  };

  const handleDelete = async (productId: number) => {
    if (!confirm(t("myshop.delete_confirm"))) return;
    try {
      await deleteProduct({ id: productId });
      await refetchProducts();
    } catch (e: any) {
      alert(e?.data?.error ?? t("common.error"));
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-amber-900/20 px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate("/bozor")} className="p-1.5 rounded-full hover:bg-amber-950/40">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-lg flex-1">{t("myshop.title")}</h1>
          <button onClick={() => navigate("/bozor/sotish")}
            className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-600 text-white text-sm px-3 py-1.5 rounded-full">
            <Plus className="w-4 h-4" /> {t("myshop.add")}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: t("myshop.stat_active"), value: activeProducts, icon: ShoppingBag, color: "text-amber-400" },
            { label: t("myshop.stat_sales"), value: totalSales, icon: CheckCircle, color: "text-emerald-400" },
            { label: t("myshop.stat_views"), value: totalViews.toLocaleString(), icon: Eye, color: "text-blue-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-amber-950/20 rounded-xl p-2.5 text-center">
              <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
              <div className={`font-bold text-sm ${color}`}>{value}</div>
              <div className="text-xs text-muted-foreground leading-tight">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex-1 justify-center ${activeTab === tab.id ? "bg-amber-700 text-white" : "bg-amber-950/30 text-muted-foreground hover:text-foreground"}`}>
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {/* My Products */}
        {activeTab === "products" && (
          loadingProducts ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-amber-950/20 animate-pulse">
                  <div className="aspect-square rounded-t-xl bg-amber-900/20" />
                  <div className="p-2 space-y-2"><div className="h-3 bg-amber-900/20 rounded" /><div className="h-3 bg-amber-900/20 rounded w-2/3" /></div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center py-20 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-900/20 flex items-center justify-center">
                <ShoppingBag className="w-7 h-7 text-amber-600/50" />
              </div>
              <div>
                <p className="font-semibold">{t("myshop.no_products")}</p>
                <p className="text-muted-foreground text-sm mt-1">{t("myshop.no_products_sub")}</p>
              </div>
              <button onClick={() => navigate("/bozor/sotish")}
                className="bg-amber-700 text-white px-6 py-2.5 rounded-full text-sm font-medium">
                {t("myshop.add_listing")}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {products.map((p: any) => (
                <div key={p.id} className="rounded-xl overflow-hidden bg-amber-950/20 border border-amber-900/20">
                  <button onClick={() => navigate(`/bozor/${p.id}`)} className="w-full">
                    <div className="relative aspect-square bg-amber-900/15">
                      {p.thumbnailUrl ? (
                        <img src={p.thumbnailUrl} alt={p.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-8 h-8 text-amber-700/30" />
                        </div>
                      )}
                      <span className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-medium ${p.status === "active" ? "bg-emerald-800/80 text-emerald-300" : p.status === "sold" ? "bg-red-800/80 text-red-300" : "bg-gray-800/80 text-gray-300"}`}>
                        {p.status === "active" ? t("myshop.active_badge") : p.status === "sold" ? t("myshop.sold_badge") : t("myshop.draft_badge")}
                      </span>
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium line-clamp-2">{p.title}</p>
                      <p className="text-amber-400 text-xs font-bold mt-1">{(p.price / 100).toLocaleString()} so'm</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>👁 {p.viewsCount}</span>
                        <span>🛍 {p.ordersCount}</span>
                        {p.rating > 0 && <span>⭐ {(p.rating / 100).toFixed(1)}</span>}
                      </div>
                    </div>
                  </button>
                  <div className="flex border-t border-amber-900/20">
                    <button onClick={() => navigate(`/bozor/sotish?edit=${p.id}`)} className="flex-1 py-2 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
                      <Edit2 className="w-3 h-3" /> {t("myshop.edit")}
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="flex-1 py-2 text-xs text-red-400 hover:text-red-300 flex items-center justify-center gap-1 border-l border-amber-900/20">
                      <Trash2 className="w-3 h-3" /> {t("myshop.delete")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Selling orders */}
        {activeTab === "selling" && (
          loadingSelling ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-amber-950/20 animate-pulse" />)}</div>
          ) : selling.length === 0 ? (
            <div className="flex flex-col items-center py-20 gap-3 text-center">
              <Package className="w-12 h-12 text-amber-700/30" />
              <p className="text-muted-foreground">{t("myshop.no_selling")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selling.map((o: any) => (
                <div key={o.id} className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/20">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-amber-900/20 overflow-hidden flex-shrink-0">
                      {o.product?.thumbnailUrl && <img src={o.product.thumbnailUrl} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{o.product?.title ?? "Mahsulot"}</p>
                      <p className="text-xs text-muted-foreground">{t("myshop.buyer")} {o.buyer?.displayName ?? "—"}</p>
                      <p className="text-amber-400 text-xs font-bold">{(o.totalPrice / 100).toLocaleString()} so'm × {o.quantity}</p>
                    </div>
                    <span className={`text-xs font-medium flex-shrink-0 ${STATUS_LABELS[o.status]?.color ?? "text-muted-foreground"}`}>
                      {STATUS_LABELS[o.status]?.label ?? o.status}
                    </span>
                  </div>
                  {o.status === "pending" && (
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleStatusUpdate(o.id, "processing")}
                        className="flex-1 py-1.5 text-xs bg-amber-700/50 hover:bg-amber-700 text-white rounded-lg transition-colors">
                        {t("myshop.confirm")}
                      </button>
                      <button onClick={() => handleStatusUpdate(o.id, "cancelled")}
                        className="flex-1 py-1.5 text-xs bg-red-900/40 hover:bg-red-900/60 text-red-300 rounded-lg transition-colors">
                        {t("myshop.cancel_order")}
                      </button>
                    </div>
                  )}
                  {o.status === "processing" && (
                    <button onClick={() => handleStatusUpdate(o.id, "shipped")}
                      className="w-full mt-2 py-1.5 text-xs bg-cyan-900/40 hover:bg-cyan-900/60 text-cyan-300 rounded-lg flex items-center justify-center gap-1">
                      <Truck className="w-3.5 h-3.5" /> {t("myshop.mark_shipped")}
                    </button>
                  )}
                  {o.status === "shipped" && (
                    <button onClick={() => handleStatusUpdate(o.id, "delivered")}
                      className="w-full mt-2 py-1.5 text-xs bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-300 rounded-lg flex items-center justify-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> {t("myshop.mark_delivered")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* Buying orders */}
        {activeTab === "buying" && (
          loadingBuying ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-amber-950/20 animate-pulse" />)}</div>
          ) : buying.length === 0 ? (
            <div className="flex flex-col items-center py-20 gap-3 text-center">
              <ShoppingBag className="w-12 h-12 text-amber-700/30" />
              <p className="text-muted-foreground">{t("myshop.no_buying")}</p>
              <button onClick={() => navigate("/bozor")} className="bg-amber-700 text-white px-6 py-2.5 rounded-full text-sm">
                {t("myshop.go_market")}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {buying.map((o: any) => (
                <div key={o.id} className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/20">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-amber-900/20 overflow-hidden flex-shrink-0">
                      {o.product?.thumbnailUrl && <img src={o.product.thumbnailUrl} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{o.product?.title ?? "Mahsulot"}</p>
                      <p className="text-xs text-muted-foreground">{t("myshop.seller")} {o.seller?.displayName ?? "—"}</p>
                      <p className="text-amber-400 text-xs font-bold">{(o.totalPrice / 100).toLocaleString()} so'm</p>
                    </div>
                    <span className={`text-xs font-medium flex-shrink-0 ${STATUS_LABELS[o.status]?.color ?? "text-muted-foreground"}`}>
                      {STATUS_LABELS[o.status]?.label ?? o.status}
                    </span>
                  </div>
                  {o.deliveryMethod === "delivery" && o.deliveryAddress && (
                    <p className="text-xs text-muted-foreground mt-1.5">📍 {o.deliveryAddress}</p>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
