import { useState, useEffect, useRef } from "react";
import { Search, Users, FileText, Play, ShoppingBag, X, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import { useSearchAll } from "@workspace/api-client-react";

const TABS = [
  { id: "all", label: "Hammasi", icon: TrendingUp },
  { id: "users", label: "Foydalanuvchilar", icon: Users },
  { id: "posts", label: "Postlar", icon: FileText },
  { id: "reels", label: "Reels", icon: Play },
  { id: "products", label: "Mahsulotlar", icon: ShoppingBag },
] as const;

type TabId = (typeof TABS)[number]["id"];

function Avatar({ url, name, size = 40 }: { url?: string | null; name?: string; size?: number }) {
  return url ? (
    <img src={url} alt={name} style={{ width: size, height: size }} className="rounded-full object-cover flex-shrink-0" />
  ) : (
    <div style={{ width: size, height: size }} className="rounded-full bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center flex-shrink-0">
      <span className="text-amber-100 font-bold text-sm">{(name ?? "?")[0].toUpperCase()}</span>
    </div>
  );
}

export default function SearchPage() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const enabled = debouncedQ.length >= 1;
  const { data, isLoading } = useSearchAll(
    { q: debouncedQ || " ", type: activeTab === "all" ? undefined : activeTab },
  );
  const showLoading = enabled && isLoading;

  const users = data?.users ?? [];
  const posts = data?.posts ?? [];
  const reels = data?.reels ?? [];
  const products = data?.products ?? [];

  const hasResults = users.length + posts.length + reels.length + products.length > 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Search header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-amber-900/20 px-4 py-3">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Qidirish... foydalanuvchilar, postlar, mahsulotlar"
            className="w-full bg-amber-950/30 border border-amber-900/40 rounded-full pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3 max-w-2xl mx-auto overflow-x-auto no-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-amber-700 text-white"
                  : "bg-amber-950/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Empty / hint state */}
        {!debouncedQ && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-900/30 flex items-center justify-center">
              <Search className="w-7 h-7 text-amber-500" />
            </div>
            <p className="text-muted-foreground text-sm">Qidirmoqchi bo'lgan narsangizni kiriting</p>
          </div>
        )}

        {/* Loading */}
        {showLoading && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* No results */}
        {enabled && !showLoading && !hasResults && (
          <div className="flex flex-col items-center py-16 gap-2 text-center">
            <p className="text-muted-foreground text-sm">"{debouncedQ}" bo'yicha hech narsa topilmadi</p>
          </div>
        )}

        {/* Results */}
        {enabled && !showLoading && hasResults && (
          <div className="space-y-6">
            {/* Users */}
            {(activeTab === "all" || activeTab === "users") && users.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" /> Foydalanuvchilar ({users.length})
                </h3>
                <div className="space-y-2">
                  {users.map((u: any) => (
                    <button
                      key={u.id}
                      onClick={() => navigate(`/profile/${u.id}`)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-amber-950/20 hover:bg-amber-950/40 transition-colors text-left"
                    >
                      <Avatar url={u.avatarUrl} name={u.displayName} size={44} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-sm">{u.displayName}</span>
                          {u.isVerified && <span className="text-amber-500 text-xs">✓</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">@{u.username}</div>
                        {u.bio && <div className="text-xs text-muted-foreground mt-0.5 truncate">{u.bio}</div>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {u.isVerified && <span className="text-amber-500 text-xs">✓ Tasdiqlangan</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Posts */}
            {(activeTab === "all" || activeTab === "posts") && posts.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" /> Postlar ({posts.length})
                </h3>
                <div className="space-y-2">
                  {posts.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/post/${p.id}`)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-amber-950/20 hover:bg-amber-950/40 transition-colors text-left"
                    >
                      {p.mediaUrl ? (
                        <img src={p.mediaUrl} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-amber-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-2">{p.content}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>❤️ {p.likesCount}</span>
                          <span>💬 {p.commentsCount}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Reels */}
            {(activeTab === "all" || activeTab === "reels") && reels.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Play className="w-3.5 h-3.5" /> Reels ({reels.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {reels.map((r: any) => (
                    <button
                      key={r.id}
                      onClick={() => navigate("/reels")}
                      className="relative aspect-[9/16] rounded-xl overflow-hidden bg-amber-950/30 group"
                    >
                      {r.thumbnailUrl ? (
                        <img src={r.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-8 h-8 text-amber-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-white text-xs line-clamp-2">{r.caption}</p>
                        <p className="text-amber-300 text-xs mt-0.5">👁 {r.viewsCount?.toLocaleString()}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Products */}
            {(activeTab === "all" || activeTab === "products") && products.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ShoppingBag className="w-3.5 h-3.5" /> Mahsulotlar ({products.length})
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {products.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/bozor/${p.id}`)}
                      className="rounded-xl overflow-hidden bg-amber-950/20 hover:bg-amber-950/40 transition-colors text-left"
                    >
                      <div className="aspect-square bg-amber-900/20">
                        {p.thumbnailUrl ? (
                          <img src={p.thumbnailUrl} alt={p.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-8 h-8 text-amber-600/50" />
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-sm font-medium line-clamp-2">{p.title}</p>
                        <p className="text-amber-500 font-bold text-sm mt-1">
                          {(p.price / 100).toLocaleString()} so'm
                        </p>
                        {p.location && <p className="text-xs text-muted-foreground mt-0.5">📍 {p.location}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
