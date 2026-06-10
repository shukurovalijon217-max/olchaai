import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Search, Plus, Star, BookMarked, CheckCircle2,
  Clock, Heart, ChevronRight, X, BookX, Globe, BarChart2
} from "lucide-react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Book {
  id: number;
  googleBookId: string;
  title: string;
  authors: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  publishedDate?: string | null;
  pageCount?: number | null;
  categories?: string | null;
  language?: string | null;
  status: string;
  currentPage: number;
  rating?: number | null;
  review?: string | null;
  isFavorite: boolean;
  addedAt: string;
}

interface SearchResult {
  id: string;
  title: string;
  authors: string[];
  thumbnailUrl?: string | null;
  description?: string | null;
  publishedDate?: string | null;
  pageCount?: number | null;
  categories?: string[];
  language?: string | null;
  isbn?: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  want_to_read: { label: "O'qimoqchi", icon: BookMarked, color: "text-blue-400" },
  reading: { label: "O'qilmoqda", icon: Clock, color: "text-amber-400" },
  completed: { label: "O'qildi", icon: CheckCircle2, color: "text-emerald-400" },
  dropped: { label: "To'xtatildi", icon: BookX, color: "text-destructive" },
};

export default function LibraryPage() {
  const [tab, setTab] = useState<"library" | "search" | "popular">("library");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [popular, setPopular] = useState<SearchResult[]>([]);
  const [popularLoading, setPopularLoading] = useState(false);
  const [selected, setSelected] = useState<Book | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editReview, setEditReview] = useState("");
  const [editPage, setEditPage] = useState(0);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => { loadBooks(); }, []);
  useEffect(() => { if (tab === "popular" && popular.length === 0) loadPopular(); }, [tab]);

  async function loadBooks() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/library/books`, { credentials: "include" });
      if (r.ok) setBooks(await r.json());
    } finally { setLoading(false); }
  }

  async function loadPopular() {
    setPopularLoading(true);
    try {
      const r = await fetch(`${API}/api/library/search/popular`, { credentials: "include" });
      if (r.ok) { const d = await r.json(); setPopular(d.items || []); }
    } finally { setPopularLoading(false); }
  }

  async function doSearch() {
    if (!searchQ.trim()) return;
    setSearchLoading(true);
    try {
      const r = await fetch(`${API}/api/library/search?q=${encodeURIComponent(searchQ)}`, { credentials: "include" });
      if (r.ok) { const d = await r.json(); setSearchResults(d.items || []); }
    } finally { setSearchLoading(false); }
  }

  async function addBook(item: SearchResult) {
    setAddingId(item.id);
    try {
      const r = await fetch(`${API}/api/library/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          googleBookId: item.id,
          title: item.title,
          authors: item.authors,
          description: item.description,
          thumbnailUrl: item.thumbnailUrl,
          publishedDate: item.publishedDate,
          pageCount: item.pageCount,
          categories: item.categories,
          language: item.language,
          isbn: item.isbn,
        }),
      });
      if (r.ok) { await loadBooks(); setTab("library"); }
      else if (r.status === 409) alert("Bu kitob allaqachon kutubxonangizda");
    } finally { setAddingId(null); }
  }

  async function updateBook(id: number, updates: Partial<Book>) {
    const r = await fetch(`${API}/api/library/books/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updates),
    });
    if (r.ok) {
      const updated = await r.json();
      setBooks(prev => prev.map(b => b.id === id ? updated : b));
      setSelected(updated);
    }
  }

  async function deleteBook(id: number) {
    if (!confirm("Kitobni kutubxonadan o'chirish?")) return;
    await fetch(`${API}/api/library/books/${id}`, { method: "DELETE", credentials: "include" });
    setBooks(prev => prev.filter(b => b.id !== id));
    setSelected(null);
  }

  const filtered = filter === "all" ? books : filter === "fav" ? books.filter(b => b.isFavorite) : books.filter(b => b.status === filter);
  const stats = {
    total: books.length,
    reading: books.filter(b => b.status === "reading").length,
    completed: books.filter(b => b.status === "completed").length,
    fav: books.filter(b => b.isFavorite).length,
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">Kutubxona</h1>
              <p className="text-[11px] text-muted-foreground">{stats.total} kitob · {stats.completed} o'qildi</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
            {[{ id: "library", label: "Mening" }, { id: "search", label: "Qidirish" }, { id: "popular", label: "Mashhur" }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as "library" | "search" | "popular")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-5">

        {/* ── My Library Tab ── */}
        {tab === "library" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Jami", value: stats.total, icon: BookOpen, color: "text-primary" },
                { label: "O'qilmoqda", value: stats.reading, icon: Clock, color: "text-amber-400" },
                { label: "O'qildi", value: stats.completed, icon: CheckCircle2, color: "text-emerald-400" },
                { label: "Sevimli", value: stats.fav, icon: Heart, color: "text-rose-400" },
              ].map(s => (
                <div key={s.label} className="bg-card border border-border rounded-2xl p-3 text-center">
                  <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
                  <p className="text-lg font-bold text-foreground">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filter chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {[
                { id: "all", label: "Hammasi" },
                { id: "reading", label: "O'qilmoqda" },
                { id: "want_to_read", label: "O'qimoqchi" },
                { id: "completed", label: "O'qildi" },
                { id: "fav", label: "Sevimlilar" },
                { id: "dropped", label: "To'xtatildi" },
              ].map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${filter === f.id ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground hover:border-border hover:text-foreground"}`}>
                  {f.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto opacity-40" />
                <p className="text-muted-foreground text-sm">
                  {books.length === 0 ? "Kutubxonangiz bo'sh. Kitob qidiring!" : "Bu filtrdagi kitoblar yo'q"}
                </p>
                {books.length === 0 && (
                  <button onClick={() => setTab("search")}
                    className="px-4 py-2 rounded-xl bg-primary/15 text-primary text-sm font-semibold hover:bg-primary/25 transition-colors">
                    Kitob qidirish
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filtered.map(book => {
                  const cfg = STATUS_CONFIG[book.status];
                  return (
                    <motion.button key={book.id} onClick={() => { setSelected(book); setEditRating(book.rating || 0); setEditReview(book.review || ""); setEditPage(book.currentPage || 0); }}
                      whileHover={{ y: -2 }} className="text-left group">
                      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-muted mb-2 border border-border">
                        {book.thumbnailUrl ? (
                          <img src={book.thumbnailUrl} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-muted-foreground opacity-40" />
                          </div>
                        )}
                        {book.isFavorite && <Heart className="absolute top-2 right-2 w-4 h-4 text-rose-400 fill-rose-400" />}
                        <div className={`absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-background/80 backdrop-blur text-[10px] font-semibold ${cfg.color}`}>
                          <cfg.icon className="w-2.5 h-2.5" /> {cfg.label}
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">{book.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{book.authors}</p>
                      {book.rating && (
                        <div className="flex items-center gap-0.5 mt-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-2.5 h-2.5 ${i < book.rating! ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
                          ))}
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Search Tab ── */}
        {tab === "search" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)} onKeyDown={e => e.key === "Enter" && doSearch()}
                  placeholder="Kitob nomi, muallif..."
                  className="w-full bg-muted border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
              </div>
              <button onClick={doSearch} disabled={searchLoading || !searchQ.trim()}
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors">
                {searchLoading ? "..." : "Qidirish"}
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {searchResults.map(item => {
                  const inLib = books.some(b => b.googleBookId === item.id);
                  return (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="group">
                      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-muted mb-2 border border-border">
                        {item.thumbnailUrl ? (
                          <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-muted-foreground opacity-40" />
                          </div>
                        )}
                        <button onClick={() => !inLib && addBook(item)} disabled={inLib || addingId === item.id}
                          className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${inLib ? "" : "bg-background/70 backdrop-blur-sm"}`}>
                          {inLib ? (
                            <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Qo'shilgan
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1">
                              <Plus className="w-3 h-3" /> {addingId === item.id ? "..." : "Qo'shish"}
                            </span>
                          )}
                        </button>
                      </div>
                      <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{item.authors?.join(", ")}</p>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Popular Tab ── */}
        {tab === "popular" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Mashhur kitoblar</h2>
              <button onClick={loadPopular} className="text-xs text-primary hover:text-primary/80 transition-colors font-semibold">
                Yangilash
              </button>
            </div>
            {popularLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {popular.map(item => {
                  const inLib = books.some(b => b.googleBookId === item.id);
                  return (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="group">
                      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-muted mb-2 border border-border">
                        {item.thumbnailUrl ? (
                          <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-muted-foreground opacity-40" />
                          </div>
                        )}
                        <button onClick={() => !inLib && addBook(item)} disabled={inLib || addingId === item.id}
                          className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${!inLib ? "bg-background/70 backdrop-blur-sm" : ""}`}>
                          {inLib ? (
                            <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Qo'shilgan
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1">
                              <Plus className="w-3 h-3" /> {addingId === item.id ? "..." : "Qo'shish"}
                            </span>
                          )}
                        </button>
                      </div>
                      <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{item.authors?.join(", ")}</p>
                      {item.language && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Globe className="w-2.5 h-2.5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground uppercase">{item.language}</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Book Detail Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm px-4 pb-4"
            onClick={e => e.target === e.currentTarget && setSelected(null)}>
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-20 flex-shrink-0 aspect-[2/3] rounded-lg overflow-hidden bg-muted">
                    {selected.thumbnailUrl ? (
                      <img src={selected.thumbnailUrl} alt={selected.title} className="w-full h-full object-cover" />
                    ) : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-6 h-6 text-muted-foreground opacity-40" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-bold text-foreground text-sm leading-tight">{selected.title}</h2>
                      <button onClick={() => setSelected(null)} className="flex-shrink-0 text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{selected.authors}</p>
                    {selected.publishedDate && <p className="text-[10px] text-muted-foreground">{selected.publishedDate.slice(0, 4)}</p>}
                    {selected.pageCount && <p className="text-[10px] text-muted-foreground">{selected.pageCount} sahifa</p>}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Holat</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(STATUS_CONFIG).map(([id, cfg]) => (
                      <button key={id} onClick={() => updateBook(selected.id, { status: id })}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${selected.status === id ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-border hover:text-foreground"}`}>
                        <cfg.icon className={`w-3.5 h-3.5 ${cfg.color}`} /> {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Progress */}
                {selected.status === "reading" && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Progress</p>
                    <div className="flex items-center gap-3">
                      <input type="number" value={editPage} onChange={e => setEditPage(Number(e.target.value))} min={0} max={selected.pageCount || 9999}
                        className="w-20 bg-muted border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/50" />
                      <span className="text-xs text-muted-foreground">/ {selected.pageCount || "?"} sahifa</span>
                      <button onClick={() => updateBook(selected.id, { currentPage: editPage })}
                        className="px-3 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-semibold hover:bg-primary/25 transition-colors">
                        Saqlash
                      </button>
                    </div>
                    {selected.pageCount && (
                      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, (selected.currentPage / selected.pageCount) * 100)}%` }} />
                      </div>
                    )}
                  </div>
                )}

                {/* Rating */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Baho</p>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button key={i} onClick={() => { setEditRating(i + 1); updateBook(selected.id, { rating: i + 1 }); }}>
                        <Star className={`w-6 h-6 transition-colors ${i < editRating ? "text-amber-400 fill-amber-400" : "text-muted-foreground hover:text-amber-300"}`} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Favorite */}
                <button onClick={() => updateBook(selected.id, { isFavorite: !selected.isFavorite })}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${selected.isFavorite ? "border-rose-500/40 bg-rose-500/10 text-rose-400" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  <Heart className={`w-3.5 h-3.5 ${selected.isFavorite ? "fill-rose-400" : ""}`} />
                  {selected.isFavorite ? "Sevimlilardan chiqarish" : "Sevimlilarga qo'shish"}
                </button>

                {/* Review */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Sharh</p>
                  <textarea value={editReview} onChange={e => setEditReview(e.target.value)} rows={3}
                    placeholder="Kitob haqida fikringiz..."
                    className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary/50" />
                  <button onClick={() => updateBook(selected.id, { review: editReview })}
                    className="mt-2 w-full py-2 rounded-xl bg-primary/15 text-primary text-xs font-semibold hover:bg-primary/25 transition-colors">
                    Sharh saqlash
                  </button>
                </div>

                {/* Delete */}
                <button onClick={() => deleteBook(selected.id)}
                  className="w-full py-2 rounded-xl border border-destructive/30 text-destructive text-xs font-semibold hover:bg-destructive/10 transition-colors">
                  Kutubxonadan o'chirish
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
