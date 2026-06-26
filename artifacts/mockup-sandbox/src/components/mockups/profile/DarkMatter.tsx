import { useState, useEffect } from "react";

const mockUser = {
  name: "Asilbek Nazarov",
  handle: "asilbek_nx",
  bio: "Digital creator · 🇺🇿 Tashkent · Building the future one pixel at a time",
  avatarUrl: null as string | null,
  isVerified: true,
  followers: 128400,
  following: 843,
  posts: 214,
};

const posts = [
  { id: 1, emoji: "🚀", label: "Launch day!", likes: "12.4K", col: "from-violet-800 to-purple-900" },
  { id: 2, emoji: "🌊", label: "New wave", likes: "8.1K", col: "from-cyan-800 to-blue-900" },
  { id: 3, emoji: "✨", label: "Spark", likes: "6.7K", col: "from-pink-800 to-rose-900" },
  { id: 4, emoji: "🔥", label: "Trending", likes: "21K", col: "from-orange-800 to-red-900" },
  { id: 5, emoji: "🌿", label: "Chill", likes: "4.4K", col: "from-emerald-800 to-teal-900" },
  { id: 6, emoji: "🎨", label: "Design", likes: "9.9K", col: "from-fuchsia-800 to-violet-900" },
];

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function useCounter(target: number, delay = 0) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      let cur = 0;
      const step = target / 45;
      const id = setInterval(() => {
        cur += step;
        if (cur >= target) { setV(target); clearInterval(id); }
        else setV(Math.floor(cur));
      }, 15);
      return () => clearInterval(id);
    }, delay);
    return () => clearTimeout(t);
  }, [target, delay]);
  return v;
}

function HexAvatar({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  return (
    <div className="relative" style={{ width: 100, height: 115 }}>
      {/* outer hex glow */}
      <svg width="100" height="115" viewBox="0 0 100 115" className="absolute inset-0"
        style={{ filter: "drop-shadow(0 0 16px rgba(251,146,60,0.7)) drop-shadow(0 0 32px rgba(251,146,60,0.4))" }}>
        <polygon points="50,4 96,27 96,88 50,111 4,88 4,27"
          fill="none" stroke="url(#hexGrad)" strokeWidth="2.5" />
        <defs>
          <linearGradient id="hexGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
      </svg>
      {/* spinning dash ring */}
      <svg width="100" height="115" viewBox="0 0 100 115" className="absolute inset-0 animate-spin"
        style={{ animationDuration: "8s" }}>
        <polygon points="50,1 99,26.5 99,88.5 50,114 1,88.5 1,26.5"
          fill="none" stroke="rgba(251,146,60,0.3)" strokeWidth="1" strokeDasharray="8 4" />
      </svg>
      {/* avatar fill */}
      <svg width="100" height="115" viewBox="0 0 100 115" className="absolute inset-0">
        <defs>
          <clipPath id="hexClip">
            <polygon points="50,6 94,28.5 94,86.5 50,109 6,86.5 6,28.5" />
          </clipPath>
          <radialGradient id="hexFill" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#2d1654" />
            <stop offset="100%" stopColor="#0d0508" />
          </radialGradient>
        </defs>
        <polygon points="50,6 94,28.5 94,86.5 50,109 6,86.5 6,28.5" fill="url(#hexFill)" clipPath="url(#hexClip)" />
        {!avatarUrl && (
          <text x="50" y="68" textAnchor="middle" fontSize="36" dominantBaseline="middle" clipPath="url(#hexClip)">
            👤
          </text>
        )}
        {avatarUrl && <image href={avatarUrl} x="6" y="6.5" width="88" height="102" clipPath="url(#hexClip)" preserveAspectRatio="xMidYMid slice" />}
      </svg>
    </div>
  );
}

export function DarkMatter() {
  const [tab, setTab] = useState<"grid" | "reels">("grid");
  const [followed, setFollowed] = useState(false);
  const followers = useCounter(mockUser.followers);
  const following = useCounter(mockUser.following, 200);
  const postCount = useCounter(mockUser.posts, 400);

  return (
    <div className="min-h-screen text-white overflow-x-hidden select-none"
      style={{ background: "#060408", fontFamily: "'Inter', sans-serif" }}>

      {/* ─── Full-width cinematic cover ─── */}
      <div className="relative h-56 overflow-hidden">
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(160deg, #1a0a0a 0%, #110416 40%, #080416 100%)" }} />
        {/* lava blobs */}
        <div className="absolute -top-10 left-0 w-80 h-56 rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(251,146,60,0.38) 0%, transparent 65%)", filter: "blur(40px)", animation: "float 8s ease-in-out infinite" }} />
        <div className="absolute -top-8 right-0 w-60 h-48 rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(239,68,68,0.3) 0%, transparent 65%)", filter: "blur(36px)", animation: "float 6s ease-in-out infinite 1.5s" }} />
        <div className="absolute bottom-0 left-1/3 w-48 h-32 rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(234,179,8,0.22) 0%, transparent 65%)", filter: "blur(28px)", animation: "float 5s ease-in-out infinite 0.8s" }} />
        {/* particle dots */}
        {[
          { l: "12%", t: "20%", s: 3 }, { l: "35%", t: "55%", s: 2 }, { l: "65%", t: "18%", s: 4 },
          { l: "78%", t: "60%", s: 2.5 }, { l: "88%", t: "32%", s: 3 }, { l: "48%", t: "40%", s: 2 },
        ].map((d, i) => (
          <div key={i} className="absolute rounded-full animate-pulse"
            style={{ left: d.l, top: d.t, width: d.s, height: d.s, background: "rgba(251,146,60,0.8)", boxShadow: `0 0 ${d.s * 4}px rgba(251,146,60,0.9)`, animationDelay: `${i * 0.4}s` }} />
        ))}
        {/* bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-24"
          style={{ background: "linear-gradient(to top, #060408, transparent)" }} />
        {/* top actions */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-center">
          <button className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
            style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}>
            ←
          </button>
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
              style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}>
              ↑
            </button>
          </div>
        </div>
      </div>

      {/* ─── Avatar + identity row ─── */}
      <div className="flex items-end gap-4 px-5" style={{ marginTop: -60 }}>
        <HexAvatar avatarUrl={mockUser.avatarUrl} name={mockUser.name} />
        <div className="pb-2 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h1 className="text-lg font-black truncate">{mockUser.name}</h1>
            {mockUser.isVerified && (
              <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                style={{ background: "linear-gradient(135deg, #fb923c, #ef4444)", boxShadow: "0 0 10px rgba(251,146,60,0.6)" }}>
                ✓
              </span>
            )}
          </div>
          <p className="text-xs font-mono mb-1" style={{ color: "rgba(251,146,60,0.7)" }}>@{mockUser.handle}</p>
          {/* action buttons inline */}
          <div className="flex gap-1.5 mt-1.5">
            <button onClick={() => setFollowed(f => !f)}
              className="px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all"
              style={followed
                ? { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.55)" }
                : { background: "linear-gradient(135deg, #fb923c, #ef4444)", boxShadow: "0 0 18px rgba(251,146,60,0.5)", border: "none" }}>
              {followed ? "✓ Following" : "+ Follow"}
            </button>
            <button className="px-3.5 py-1.5 rounded-full text-[11px] font-bold"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
              Message
            </button>
          </div>
        </div>
      </div>

      {/* ─── Bio ─── */}
      <div className="px-5 mt-3 mb-4">
        <p className="text-sm text-white/60 leading-relaxed">{mockUser.bio}</p>
      </div>

      {/* ─── STATS: large 3-column cards ─── */}
      <div className="grid grid-cols-3 gap-2.5 px-5 mb-5">
        {[
          { label: "Followers", val: followers, accent: "#fb923c", border: "rgba(251,146,60,0.3)" },
          { label: "Following", val: following, accent: "#f59e0b", border: "rgba(245,158,11,0.3)" },
          { label: "Posts", val: postCount, accent: "#ef4444", border: "rgba(239,68,68,0.3)" },
        ].map(s => (
          <div key={s.label} className="relative rounded-2xl overflow-hidden py-4 flex flex-col items-center"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${s.border}` }}>
            {/* top glow bar */}
            <div className="absolute top-0 left-0 right-0 h-0.5"
              style={{ background: `linear-gradient(90deg, transparent, ${s.accent}, transparent)`, opacity: 0.8 }} />
            <span className="text-2xl font-black leading-none mb-1"
              style={{ color: s.accent, textShadow: `0 0 20px ${s.accent}88` }}>
              {fmt(s.val)}
            </span>
            <span className="text-[9px] uppercase tracking-widest font-bold"
              style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ─── Tab bar: minimal with amber indicator ─── */}
      <div className="flex px-5 gap-5 mb-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        {(["grid", "reels"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="pb-2.5 text-xs font-bold uppercase tracking-widest relative transition-colors"
            style={{ color: tab === t ? "#fb923c" : "rgba(255,255,255,0.3)" }}>
            {t === "grid" ? "Posts" : "Reels"}
            {tab === t && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: "linear-gradient(90deg, #fb923c, #ef4444)", boxShadow: "0 0 8px rgba(251,146,60,0.8)" }} />
            )}
          </button>
        ))}
      </div>

      {/* ─── Posts mosaic grid ─── */}
      {tab === "grid" && (
        <div className="px-5 pb-8">
          {/* 2+1 mosaic pattern */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            {/* large feature post */}
            <div className="col-span-2 row-span-2 rounded-2xl overflow-hidden relative" style={{ height: 180 }}>
              <div className={`w-full h-full bg-gradient-to-br ${posts[0].col} flex items-center justify-center`}>
                <div className="text-center">
                  <div className="text-5xl mb-1">{posts[0].emoji}</div>
                  <div className="text-xs text-white/60">{posts[0].label}</div>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] font-semibold">
                <span>❤️ {posts[0].likes}</span>
                <span className="bg-white/15 px-2 py-0.5 rounded-full text-[9px] backdrop-blur-sm">Top post</span>
              </div>
            </div>
            {/* two small posts on right */}
            {posts.slice(1, 3).map(p => (
              <div key={p.id} className="rounded-2xl overflow-hidden relative" style={{ height: 86 }}>
                <div className={`w-full h-full bg-gradient-to-br ${p.col} flex items-center justify-center`}>
                  <div className="text-2xl">{p.emoji}</div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-1 left-1.5 text-[9px] font-semibold text-white/70">
                  ❤️ {p.likes}
                </div>
              </div>
            ))}
          </div>
          {/* row of 3 */}
          <div className="grid grid-cols-3 gap-2">
            {posts.slice(3).map(p => (
              <div key={p.id} className="aspect-square rounded-xl overflow-hidden relative">
                <div className={`w-full h-full bg-gradient-to-br ${p.col} flex items-center justify-center`}>
                  <div className="text-center">
                    <div className="text-2xl">{p.emoji}</div>
                    <div className="text-[9px] text-white/50 mt-0.5">{p.label}</div>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-1 left-1.5 text-[9px] font-semibold text-white/65">
                  ❤️ {p.likes}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "reels" && (
        <div className="px-5 pb-8">
          <div className="grid grid-cols-2 gap-2.5">
            {posts.map((p) => (
              <div key={p.id} className="rounded-2xl overflow-hidden relative" style={{ aspectRatio: "9/16" }}>
                <div className={`w-full h-full bg-gradient-to-br ${p.col} flex items-center justify-center`}>
                  <div className="text-4xl">{p.emoji}</div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-[11px]">▶</div>
                <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[10px] font-semibold">
                  <span>▶ {Math.floor(Math.random() * 90 + 10)}K</span>
                  <span>❤️ {p.likes}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(12px, -14px) scale(1.06); }
          66% { transform: translate(-8px, 8px) scale(0.96); }
        }
      `}</style>
    </div>
  );
}
