import { useState, useRef } from "react";
import { ArrowLeft, Camera, X, ShoppingBag, Tag, MapPin, Package, Info } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useCreateProduct, useRequestUploadUrl } from "@workspace/api-client-react";

const API = (import.meta.env.VITE_API_BASE_URL ?? "");

export default function SellPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { mutateAsync: createProduct, isPending } = useCreateProduct();
  const { mutateAsync: requestUpload } = useRequestUploadUrl();

  const CATEGORIES = [
    { id: "electronics", label: "Elektronika 📱" },
    { id: "clothing", label: "Kiyim 👗" },
    { id: "food", label: "Oziq-ovqat 🍎" },
    { id: "services", label: "Xizmatlar 🛠️" },
    { id: "digital", label: "Raqamli 💻" },
    { id: "beauty", label: "Go'zallik 💄" },
    { id: "sport", label: "Sport ⚽" },
    { id: "home", label: "Uy-ro'zg'or 🏠" },
    { id: "automotive", label: "Avtomobil 🚗" },
    { id: "books", label: "Kitoblar 📚" },
    { id: "other", label: "Boshqa 📦" },
  ];

  const CONDITIONS = [
    { id: "new", label: t("sell.cond_new"), desc: t("sell.cond_new_desc") },
    { id: "used", label: t("sell.cond_used"), desc: t("sell.cond_used_desc") },
    { id: "digital", label: t("sell.cond_digital"), desc: t("sell.cond_digital_desc") },
  ];

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [category, setCategory] = useState("other");
  const [condition, setCondition] = useState("new");
  const [stock, setStock] = useState("1");
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (files: FileList) => {
    if (mediaUrls.length + files.length > 6) { setError(t("sell.err_max_img")); return; }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const uploadData = await requestUpload({ data: { name: file.name, size: file.size, contentType: file.type } });
        await fetch(uploadData.uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
        const publicUrl = `${API}/api/storage${uploadData.objectPath}`;
        setMediaUrls(prev => [...prev, publicUrl]);
      }
    } catch {
      setError(t("sell.err_upload"));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setError("");
    if (!title.trim()) { setError(t("sell.err_title")); return; }
    if (!price || Number(price) < 1) { setError(t("sell.err_price")); return; }

    try {
      const priceTiyin = Math.round(Number(price) * 100);
      const origPriceTiyin = originalPrice ? Math.round(Number(originalPrice) * 100) : undefined;
      const tagArr = tags.split(",").map(t => t.trim()).filter(Boolean);

      const product = await createProduct({ data: {
        title: title.trim(),
        description: description.trim() || undefined,
        price: priceTiyin,
        originalPrice: origPriceTiyin,
        category,
        condition,
        mediaUrls,
        thumbnailUrl: mediaUrls[0],
        stock: Number(stock) || 1,
        location: location.trim() || undefined,
        tags: tagArr.length ? tagArr : undefined,
      } as any });

      setSuccess(true);
      setTimeout(() => navigate(`/bozor/${(product as any).id}`), 1200);
    } catch (e: any) {
      setError(e?.data?.error ?? e?.message ?? t("common.error"));
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-700/30 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold">{t("sell.success_title")}</h2>
          <p className="text-muted-foreground text-sm">{t("sell.success_sub")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="top-0 z-30 bg-background/95 backdrop-blur border-b border-amber-900/20 px-4 py-3 flex items-center gap-3 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
        <button onClick={() => navigate("/bozor")} className="p-1.5 rounded-full hover:bg-amber-950/40">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg flex-1">{t("sell.header")}</h1>
        <button
          onClick={handleSubmit}
          disabled={isPending || uploading}
          className="bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-full transition-colors"
        >
          {isPending ? t("sell.submitting") : t("sell.submit")}
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-700/40 rounded-xl text-red-300 text-sm">
            <Info className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Photos */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-amber-300">
            {t("sell.photos")} <span className="text-muted-foreground font-normal">({t("sell.photos_max")})</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {mediaUrls.map((url, i) => (
              <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-amber-950/30">
                <img src={url} alt="" className="w-full h-full object-cover" />
                {i === 0 && <span className="absolute top-1 left-1 bg-amber-700 text-white text-xs px-1.5 py-0.5 rounded">{t("sell.main")}</span>}
                <button
                  onClick={() => setMediaUrls(prev => prev.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {mediaUrls.length < 6 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="aspect-square rounded-xl border-2 border-dashed border-amber-900/50 hover:border-amber-700 flex flex-col items-center justify-center gap-1 transition-colors"
              >
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Camera className="w-6 h-6 text-amber-600" />
                    <span className="text-xs text-muted-foreground">{t("sell.photo_btn")}</span>
                  </>
                )}
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && handleImageUpload(e.target.files)} />
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-amber-300">{t("sell.title_label")}</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Masalan: iPhone 14 Pro 256GB"
            maxLength={100}
            className="w-full bg-amber-950/20 border border-amber-900/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-600"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-amber-300">{t("sell.desc_label")}</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t("sell.desc_ph")}
            rows={4}
            maxLength={1000}
            className="w-full bg-amber-950/20 border border-amber-900/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-600 resize-none"
          />
        </div>

        {/* Price */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold mb-2 text-amber-300">{t("sell.price_label")}</label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full bg-amber-950/20 border border-amber-900/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-600"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-muted-foreground text-sm">{t("sell.orig_price")}</label>
            <input
              type="number"
              value={originalPrice}
              onChange={e => setOriginalPrice(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full bg-amber-950/20 border border-amber-900/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-600"
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-amber-300">{t("sell.category")}</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`px-3 py-2 rounded-xl text-sm text-left transition-colors border ${category === c.id ? "bg-amber-700/50 border-amber-600 text-white" : "bg-amber-950/20 border-amber-900/30 text-muted-foreground hover:border-amber-700"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Condition */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-amber-300">{t("sell.condition")}</label>
          <div className="space-y-2">
            {CONDITIONS.map(c => (
              <button
                key={c.id}
                onClick={() => setCondition(c.id)}
                className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-colors border ${condition === c.id ? "bg-amber-700/30 border-amber-600" : "bg-amber-950/20 border-amber-900/30 hover:border-amber-700"}`}
              >
                <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${condition === c.id ? "border-amber-500 bg-amber-500" : "border-muted-foreground"}`}>
                  {condition === c.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="text-sm font-medium">{c.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{c.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Stock & Location */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold mb-2 text-amber-300 flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {t("sell.stock")}</label>
            <input
              type="number"
              value={stock}
              onChange={e => setStock(e.target.value)}
              min="1"
              className="w-full bg-amber-950/20 border border-amber-900/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-600"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-amber-300 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {t("sell.location")}</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder={t("sell.location_ph")}
              className="w-full bg-amber-950/20 border border-amber-900/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-600"
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-amber-300 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5" /> {t("sell.tags_label")} <span className="text-muted-foreground font-normal text-xs">({t("sell.tags_hint")})</span>
          </label>
          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder={t("sell.tags_ph")}
            className="w-full bg-amber-950/20 border border-amber-900/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-600"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={isPending || uploading}
          className="w-full bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors text-sm"
        >
          {isPending ? t("sell.submitting") : `🛍️ ${t("sell.submit")}`}
        </button>
      </div>
    </div>
  );
}
