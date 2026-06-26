import { useState, useEffect, useRef } from "react";

const mockUser = {
  name: "Asilbek Nazarov",
  handle: "asilbek_nx",
  bio: "Digital creator · 🇺🇿 Tashkent · Building the future one pixel at a time",
  avatarUrl: null as string | null,
  isVerified: true,
  tags: ["Creator", "Tech", "Design", "AI"],
  followers: 128400,
  following: 843,
  posts: 214,
  subscribers: 3200,
};

const posts = [
  { id: 1, color: "from-violet-900 to-indigo-900", emoji: "🚀", label: "Launch day!" },
  { id: 2, color: "from-cyan-900 to-teal-900", emoji: "🌊", label: "New wave" },
  { id: 3, color: "from-pink-900 to-rose-900", emoji: "✨", label: "Spark" },
  { id: 4, color: "from-amber-900 to-orange-900", emoji: "🔥", label: "Trending" },
  { id: 5, color: "from-emerald-900 to-green-900", emoji: "🌿", label: "Chill" },
  { id: 6, color: "from-purple-900 to-fuchsia-900", emoji: "🎨", label: "Design" },
  { id: 7, color: "from-sky-900 to-blue-900", emoji: "💡", label: "Insight" },
  { id: 8, color: "from-red-900 to-pink-900", emoji: "❤️", label: "Viral" },
  { id: 9, color: "from-lime-900 to-emerald-900", emoji: "🎯", label: "Goals" },
];

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function AnimatedCount({ target, color }: { target: number; color: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / 40;
    const id = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(id); }
      else setVal(Math.floor(start));
    }, 18);
    return () => clearInterval(id);
  }, [target]);
  return (
    <span className="text-2xl font-black leading-none" style={{ color, textShadow: `0 0 20px ${color}88` }}>
      {fmt(val)}
    </span>
  );
}

export function SignalIdentity() {
  const [tab, setTab] = useState<"posts" | "reels" | "stats">("posts");
  const [followed, setFollowed] = useState(false);
  const tick = useRef(0);

  useEffect(() => {
    const id = setInterval(() => { tick.current++; }, 50);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-[#050309] text-white overflow-x-hidden font-sans select-none">

      {/* ─── Cover: plasma field ─── */}
      <div className="relative h-52 overflow-hidden">
        {/* animated blobs */}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(160deg, #0d0720 0%, #0a1628 50%, #04141a 100%)" }} />
        <div className="absolute -top-16 -left-16 w-72 h-72 rounded-full animate-[pulse_5s_ease-in-out_infinite]"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.55) 0%, transparent 65%)", filter: "blur(32px)" }} />
        <div className="absolute -bottom-20 right-8 w-64 h-64 rounded-full animate-[pulse_7s_ease-in-out_infinite_1.5s]"
          style={{ background: "radial-gradient(circle, rgba(6,182,212,0.48) 0%, transparent 65%)", filter: "blur(28px)" }} />
        <div className="absolute top-6 right-1/3 w-40 h-40 rounded-full animate-[pulse_4s_ease-in-out_infinite_0.8s]"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 65%)", filter: "blur(22px)" }} />

        {/* grid lines */}
        <div className="absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.8) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />

        {/* scan line */}
        <div className="absolute inset-x-0 h-px animate-[slide-down_4s_linear_infinite]"
          style={{ background: "linear-gradient(90deg,transparent,rgba(124,58,237,0.6),rgba(6,182,212,0.6),transparent)", animation: "moveDown 4s linear infinite" }} />

        {/* bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-20"
          style={{ background: "linear-gradient(to top, #050309, transparent)" }} />

        {/* top-right: status badge */}
        <div className="absolute top-3 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-400 tracking-wide">ONLINE</span>
        </div>
      </div>

      {/* ─── Avatar (centered, large, floating above cover) ─── */}
      <div className="flex flex-col items-center" style={{ marginTop: -72 }}>
        <div className="relative mb-4" style={{ width: 112, height: 112 }}>
          {/* outer plasma ring */}
          <div className="absolute inset-0 rounded-full animate-spin"
            style={{ background: "conic-gradient(from 0deg, #7c3aed, #06b6d4, #10b981, #7c3aed)", padding: 2, animationDuration: "3s" }}>
            <div className="w-full h-full rounded-full" style={{ background: "#050309" }} />
          </div>
          {/* inner glow pulse */}
          <div className="absolute inset-0 rounded-full animate-pulse"
            style={{ boxShadow: "0 0 32px rgba(124,58,237,0.6), 0 0 64px rgba(6,182,212,0.3)" }} />
          {/* avatar image / fallback */}
          <div className="absolute inset-[3px] rounded-full overflow-hidden flex items-center justify-center text-3xl font-black"
            style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(6,182,212,0.3), rgba(16,185,129,0.2))", border: "none" }}>
            {mockUser.avatarUrl
              ? <img src={mockUser.avatarUrl} alt="" className="w-full h-full object-cover" />
              : <span style={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.4))" }}>👤</span>}
          </div>
          {/* verified badge */}
          {mockUser.isVerified && (
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
              style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)", boxShadow: "0 0 12px rgba(124,58,237,0.7)", border: "2px solid #050309" }}>
              ✓
            </div>
          )}
        </div>

        {/* name */}
        <h1 className="text-xl font-black tracking-tight mb-0.5"
          style={{ textShadow: "0 0 20px rgba(255,255,255,0.3)" }}>
          {mockUser.name}
        </h1>
        <p className="text-sm text-white/45 mb-2 font-mono">@{mockUser.handle}</p>

        {/* bio */}
        <p className="text-sm text-white/65 text-center max-w-[280px] leading-relaxed mb-3 px-4">
          {mockUser.bio}
        </p>

        {/* tags */}
        <div className="flex gap-1.5 mb-5 flex-wrap justify-center px-4">
          {mockUser.tags.map((t, i) => (
            <span key={t} className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
              style={{
                background: ["rgba(124,58,237,0.15)", "rgba(6,182,212,0.15)", "rgba(16,185,129,0.15)", "rgba(249,115,22,0.15)"][i % 4],
                border: `1px solid ${["rgba(124,58,237,0.4)", "rgba(6,182,212,0.4)", "rgba(16,185,129,0.4)", "rgba(249,115,22,0.4)"][i % 4]}`,
                color: ["#a78bfa", "#67e8f9", "#6ee7b7", "#fdba74"][i % 4],
              }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ─── STATS: 3 big glowing nodes ─── */}
      <div className="grid grid-cols-3 gap-3 px-4 mb-5">
        {[
          { label: "Followers", val: mockUser.followers, color: "#a78bfa", glow: "rgba(167,139,250,0.35)", border: "rgba(124,58,237,0.35)" },
          { label: "Following", val: mockUser.following, color: "#67e8f9", glow: "rgba(103,232,249,0.35)", border: "rgba(6,182,212,0.35)" },
          { label: "Posts", val: mockUser.posts, color: "#6ee7b7", glow: "rgba(110,231,183,0.35)", border: "rgba(16,185,129,0.35)" },
        ].map(s => (
          <div key={s.label} className="flex flex-col items-center justify-center py-4 rounded-2xl relative overflow-hidden"
            style={{
              background: `radial-gradient(ellipse at 50% 0%, ${s.glow} 0%, rgba(0,0,0,0) 70%), rgba(255,255,255,0.04)`,
              border: `1px solid ${s.border}`,
              boxShadow: `0 0 20px ${s.glow}, inset 0 1px 0 rgba(255,255,255,0.07)`,
            }}>
            <AnimatedCount target={s.val} color={s.color} />
            <span className="text-[10px] text-white/45 font-semibold mt-1.5 tracking-widest uppercase">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ─── Subscribers strip ─── */}
      <div className="mx-4 mb-5 flex items-center justify-between px-4 py-2.5 rounded-xl"
        style={{ background: "linear-gradient(90deg, rgba(234,179,8,0.12), rgba(249,115,22,0.08))", border: "1px solid rgba(234,179,8,0.25)" }}>
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-base">⭐</span>
          <span className="text-xs font-bold text-amber-300">Premium Subscribers</span>
        </div>
        <span className="text-base font-black text-amber-400"
          style={{ textShadow: "0 0 16px rgba(234,179,8,0.6)" }}>
          {fmt(mockUser.subscribers)}
        </span>
      </div>

      {/* ─── Action buttons ─── */}
      <div className="flex gap-2.5 px-4 mb-6">
        <button
          onClick={() => setFollowed(f => !f)}
          className="flex-1 h-11 rounded-2xl font-bold text-sm transition-all duration-300 relative overflow-hidden"
          style={followed
            ? { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.6)" }
            : { background: "linear-gradient(135deg, #7c3aed, #3b82f6)", boxShadow: "0 0 24px rgba(124,58,237,0.55), 0 4px 16px rgba(59,130,246,0.35)", border: "none", color: "white" }}>
          {followed ? "✓ Following" : "+ Follow"}
        </button>
        <button className="flex-1 h-11 rounded-2xl font-bold text-sm"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
          💬 Message
        </button>
        <button className="w-11 h-11 rounded-2xl flex items-center justify-center text-base"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          ···
        </button>
      </div>

      {/* ─── Tab bar ─── */}
      <div className="flex gap-0 px-4 mb-4 relative">
        {(["posts", "reels", "stats"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 pb-2.5 text-xs font-bold uppercase tracking-widest transition-colors relative"
            style={{ color: tab === t ? "white" : "rgba(255,255,255,0.3)" }}>
            {t}
            {tab === t && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{ background: "linear-gradient(90deg,#7c3aed,#06b6d4)", boxShadow: "0 0 8px rgba(124,58,237,0.8)" }} />
            )}
          </button>
        ))}
        <div className="absolute bottom-0 left-4 right-4 h-px bg-white/8" />
      </div>

      {/* ─── Posts masonry-style ─── */}
      {tab === "posts" && (
        <div className="px-4 pb-8">
          {/* big featured post */}
          <div className="w-full h-48 rounded-2xl mb-2 overflow-hidden flex items-center justify-center relative"
            style={{ background: "linear-gradient(135deg, #1e0a4a, #0a1f4a)", border: "1px solid rgba(124,58,237,0.2)" }}>
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 30% 40%, rgba(124,58,237,0.4), transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(6,182,212,0.3), transparent 60%)" }} />
            <div className="relative z-10 text-center">
              <div className="text-5xl mb-2">🚀</div>
              <div className="text-sm font-bold text-white/80">Featured Post</div>
              <div className="flex items-center justify-center gap-3 mt-2 text-[11px] text-white/50">
                <span>❤️ 12.4K</span>
                <span>💬 843</span>
                <span>🔁 2.1K</span>
              </div>
            </div>
          </div>
          {/* 3-col grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {posts.slice(1).map((p, i) => (
              <div key={p.id} className={`${i === 2 ? "col-span-1 row-span-2" : ""} aspect-square rounded-xl overflow-hidden flex items-center justify-center relative`}
                style={{ background: `linear-gradient(135deg, ${p.color.split(" ").join(", ").replace("from-", "#").replace("to-", "#")})`, minHeight: i === 2 ? 128 : undefined }}>
                <div className={`bg-gradient-to-br ${p.color} w-full h-full flex items-center justify-center`}>
                  <div className="text-center">
                    <div className="text-2xl">{p.emoji}</div>
                    <div className="text-[9px] text-white/60 mt-0.5 font-medium">{p.label}</div>
                  </div>
                </div>
                <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity bg-black/50 flex items-center justify-center gap-2 text-xs text-white font-bold">
                  <span>❤️ 4.2K</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "reels" && (
        <div className="px-4 pb-8">
          <div className="grid grid-cols-2 gap-2">
            {posts.map((p, i) => (
              <div key={p.id} className="rounded-2xl overflow-hidden relative" style={{ aspectRatio: "9/16" }}>
                <div className={`w-full h-full bg-gradient-to-br ${p.color} flex items-center justify-center`}>
                  <div className="text-center">
                    <div className="text-4xl">{p.emoji}</div>
                    <div className="text-[10px] text-white/60 mt-1">{p.label}</div>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-white font-semibold">
                  <span>▶ {(Math.random() * 100 | 0) + 20}K</span>
                  <span>❤️ {Math.floor(Math.random() * 9 + 1)}K</span>
                </div>
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-xs">▶</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "stats" && (
        <div className="px-4 pb-8 space-y-3">
          {[
            { icon: "❤️", label: "Total Likes", val: "847K", color: "#f472b6", glow: "rgba(244,114,182,0.4)" },
            { icon: "👁", label: "Total Views", val: "2.3M", color: "#c084fc", glow: "rgba(192,132,252,0.4)" },
            { icon: "💬", label: "Comments", val: "94K", color: "#60a5fa", glow: "rgba(96,165,250,0.4)" },
            { icon: "🔁", label: "Shares", val: "183K", color: "#34d399", glow: "rgba(52,211,153,0.4)" },
            { icon: "📈", label: "Avg Engagement", val: "8.4%", color: "#fbbf24", glow: "rgba(251,191,36,0.4)" },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-4 px-4 py-3.5 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ background: `${s.glow}33`, boxShadow: `0 0 14px ${s.glow}` }}>
                {s.icon}
              </div>
              <div className="flex-1">
                <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wide">{s.label}</div>
              </div>
              <div className="text-xl font-black" style={{ color: s.color, textShadow: `0 0 16px ${s.glow}` }}>
                {s.val}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
