import { useState, useRef } from "react";
import { ArrowLeft, Camera, X, ShoppingBag, Tag, MapPin, Package, Info, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import { useCreateProduct, useRequestUploadUrl } from "@workspace/api-client-react";

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
  { id: "new", label: "Yangi", desc: "Hech ishlatilmagan, original qadoqlangan" },
  { id: "used", label: "Ishlatilgan", desc: "Oldin ishlatilgan, yaxshi holda" },
  { id: "digital", label: "Raqamli", desc: "Elektron tovar, fayl yoki kod" },
];

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SellPage() {
  const [, navigate] = useLocation();
  const { mutateAsync: createProduct, isPending } = useCreateProduct();
  const { mutateAsync: requestUpload } = useRequestUploadUrl();

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
    if (mediaUrls.length + files.length > 6) { setError("Maksimal 6 ta rasm"); return; }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const uploadData = await requestUpload({ data: { name: file.name, size: file.size, contentType: file.type } });
        await fetch(uploadData.uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
        const publicUrl = `${API}/storage/files/${uploadData.objectPath}`;
        setMediaUrls(prev => [...prev, publicUrl]);
      }
    } catch {
      setError("Rasm yuklashda xato");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setError("");
    if (!title.trim()) { setError("Mahsulot nomini kiriting"); return; }
    if (!price || Number(price) < 1) { setError("Narxni kiriting"); return; }

    try {
      const priceTiyin = Math.round(Number(price) * 100);
      const origPriceTiyin = originalPrice ? Math.round(Number(originalPrice) * 100) : undefined;
      const tagArr = tags.split(",").map(t => t.trim()).filter(Boolean);

      const product = await createProduct({
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
      } as any);

      setSuccess(true);
      setTimeout(() => navigate(`/bozor/${(product as any).id}`), 1200);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Xato yuz berdi");
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-700/30 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold">Mahsulot qo'shildi! 🎉</h2>
          <p className="text-muted-foreground text-sm">Mahsulot sahifasiga o'tilmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-amber-900/20 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/bozor")} className="p-1.5 rounded-full hover:bg-amber-950/40">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg flex-1">Sotish e'loni</h1>
        <button
          onClick={handleSubmit}
          disabled={isPending || uploading}
          className="bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-full transition-colors"
        >
          {isPending ? "Qo'shilmoqda..." : "E'lon berish"}
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
          <label className="block text-sm font-semibold mb-2 text-amber-300">Rasmlar <span className="text-muted-foreground font-normal">(maks. 6 ta)</span></label>
          <div className="grid grid-cols-3 gap-2">
            {mediaUrls.map((url, i) => (
              <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-amber-950/30">
                <img src={url} alt="" className="w-full h-full object-cover" />
                {i === 0 && <span className="absolute top-1 left-1 bg-amber-700 text-white text-xs px-1.5 py-0.5 rounded">Bosh</span>}
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
                    <span className="text-xs text-muted-foreground">Rasm</span>
                  </>
                )}
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && handleImageUpload(e.target.files)} />
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-amber-300">Mahsulot nomi *</label>
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
          <label className="block text-sm font-semibold mb-2 text-amber-300">Tavsif</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Mahsulot haqida batafsil ma'lumot..."
            rows={4}
            maxLength={1000}
            className="w-full bg-amber-950/20 border border-amber-900/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-600 resize-none"
          />
        </div>

        {/* Price */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold mb-2 text-amber-300">Narx (so'm) *</label>
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
            <label className="block text-sm font-semibold mb-2 text-muted-foreground text-sm">Asl narx (ixtiyoriy)</label>
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
          <label className="block text-sm font-semibold mb-2 text-amber-300">Kategoriya</label>
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
          <label className="block text-sm font-semibold mb-2 text-amber-300">Holati</label>
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
            <label className="block text-sm font-semibold mb-2 text-amber-300 flex items-center gap-1"><Package className="w-3.5 h-3.5" /> Zaxira miqdori</label>
            <input
              type="number"
              value={stock}
              onChange={e => setStock(e.target.value)}
              min="1"
              className="w-full bg-amber-950/20 border border-amber-900/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-600"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-amber-300 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Joylashuv</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Toshkent, Chilonzor"
              className="w-full bg-amber-950/20 border border-amber-900/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-600"
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-amber-300 flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> Teglar <span className="text-muted-foreground font-normal text-xs">(vergul bilan ajrating)</span></label>
          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="iphone, apple, smartfon"
            className="w-full bg-amber-950/20 border border-amber-900/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-600"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={isPending || uploading}
          className="w-full bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors text-sm"
        >
          {isPending ? "E'lon qo'shilmoqda..." : "🛍️ E'lon berish"}
        </button>
      </div>
    </div>
  );
}
