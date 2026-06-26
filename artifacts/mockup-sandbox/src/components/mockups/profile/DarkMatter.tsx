import { useState, useEffect } from "react";

const USER = {
  name: "Asilbek Nazarov",
  handle: "asilbek_nx",
  bio: "Digital creator & UI designer. Building bold futures from Tashkent 🇺🇿",
  isVerified: true,
  followers: 128400,
  following: 843,
  posts: 214,
};

const POSTS = [
  { id: 1, emoji: "🚀", likes: "12.4K", views: "340K" },
  { id: 2, emoji: "🎨", likes: "8.1K",  views: "120K" },
  { id: 3, emoji: "🌊", likes: "6.7K",  views: "98K"  },
  { id: 4, emoji: "🔥", likes: "21K",   views: "600K" },
  { id: 5, emoji: "✨", likes: "4.4K",  views: "70K"  },
  { id: 6, emoji: "🎯", likes: "9.9K",  views: "210K" },
  { id: 7, emoji: "💡", likes: "7.2K",  views: "150K" },
  { id: 8, emoji: "🌿", likes: "3.8K",  views: "55K"  },
  { id: 9, emoji: "⚡", likes: "15K",   views: "410K" },
];

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function useCount(target: number, delay = 0) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const to = setTimeout(() => {
      let start = Date.now();
      const dur = 950;
      const tick = () => {
        const p = Math.min((Date.now() - start) / dur, 1);
        const e = 1 - Math.pow(1 - p, 4);
        setV(Math.round(target * e));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(to);
  }, [target, delay]);
  return v;
}

/* ── Big stat number card ── */
function StatCard({ label, value, delay, accent }: { label: string; value: number; delay: number; accent: string }) {
  const v = useCount(value, delay);
  return (
    <div className="relative rounded-2xl py-5 flex flex-col items-center overflow-hidden"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
      {/* top accent line */}
      <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      <span className="text-[28px] font-black leading-none tracking-tight" style={{ color: "#fff" }}>
        {fmt(v)}
      </span>
      <span className="text-[9px] font-bold tracking-[0.18em] uppercase mt-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>
        {label}
      </span>
    </div>
  );
}

export function DarkMatter() {
  const [tab, setTab] = useState<"posts" | "reels">("posts");
  const [followed, setFollowed] = useState(false);

  /* single accent: electric cyan-blue */
  const ACCENT = "#22d3ee";
  const BG     = "#05080f";
  const BORDER = "rgba(255,255,255,0.07)";

  return (
    <div className="min-h-screen text-white overflow-x-hidden"
      style={{ background: BG, fontFamily: "'Inter', sans-serif" }}>

      {/* ══ Cover — dark ocean, single cyan beam ══ */}
      <div className="relative h-52 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #07111e 0%, #05080f 100%)" }} />
        {/* single big cyan bloom top-right */}
        <div className="absolute -top-20 right-0 w-[280px] h-[220px]"
          style={{ background: "radial-gradient(ellipse, rgba(34,211,238,0.3) 0%, transparent 65%)", filter: "blur(48px)" }} />
        {/* subtle bottom left */}
        <div className="absolute bottom-0 -left-10 w-[180px] h-[120px]"
          style={{ background: "radial-gradient(ellipse, rgba(34,211,238,0.12) 0%, transparent 65%)", filter: "blur(32px)" }} />
        {/* vertical scanline */}
        <div className="absolute top-0 bottom-0" style={{ right: "28%", width: 1, background: "linear-gradient(180deg, transparent, rgba(34,211,238,0.18), transparent)" }} />
        {/* bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-24" style={{ background: `linear-gradient(to top, ${BG}, transparent)` }} />
      </div>

      {/* ══ Avatar centered, large, floating ══ */}
      <div className="flex flex-col items-center" style={{ marginTop: -68 }}>
        {/* avatar container */}
        <div className="relative mb-4" style={{ width: 112, height: 112 }}>
          {/* outer accent ring */}
          <div className="absolute inset-0 rounded-full"
            style={{ boxShadow: `0 0 0 2px ${ACCENT}, 0 0 32px rgba(34,211,238,0.45)` }} />
          {/* inner image */}
          <div className="absolute inset-[3px] rounded-full overflow-hidden flex items-center justify-center text-4xl"
            style={{ background: "linear-gradient(135deg, #091628, #060d1a)" }}>
            👤
          </div>
          {/* verified dot */}
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black"
            style={{ background: ACCENT, color: "#000", border: `2.5px solid ${BG}`, fontWeight: 900, boxShadow: `0 0 12px rgba(34,211,238,0.7)` }}>
            ✓
          </div>
        </div>

        {/* name + handle */}
        <h1 className="text-[22px] font-black tracking-tight mb-1">{USER.name}</h1>
        <p className="text-[12px] font-bold tracking-wide mb-3" style={{ color: ACCENT, opacity: 0.8 }}>
          @{USER.handle}
        </p>
        <p className="text-[13px] text-center leading-relaxed px-8 mb-5" style={{ color: "rgba(255,255,255,0.5)" }}>
          {USER.bio}
        </p>

        {/* ══ STATS — 3 cards ══ */}
        <div className="grid grid-cols-3 gap-2.5 w-full px-5 mb-5">
          <StatCard label="Followers" value={USER.followers} delay={0}   accent={ACCENT} />
          <StatCard label="Following" value={USER.following} delay={120} accent={ACCENT} />
          <StatCard label="Posts"     value={USER.posts}     delay={240} accent={ACCENT} />
        </div>

        {/* ══ Action row ══ */}
        <div className="flex gap-2.5 w-full px-5 mb-6">
          <button onClick={() => setFollowed(f => !f)}
            className="flex-1 h-11 rounded-2xl text-sm font-bold transition-all"
            style={followed
              ? { background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`, color: "rgba(255,255,255,0.45)" }
              : { background: "transparent", border: `1.5px solid ${ACCENT}`, color: ACCENT, boxShadow: `0 0 18px rgba(34,211,238,0.25)` }}>
            {followed ? "✓ Following" : "+ Follow"}
          </button>
          <button className="flex-1 h-11 rounded-2xl text-sm font-bold"
            style={{ background: ACCENT, color: "#000", boxShadow: `0 0 20px rgba(34,211,238,0.35)`, fontWeight: 800 }}>
            Message
          </button>
          <button className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm"
            style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}` }}>
            ···
          </button>
        </div>
      </div>

      {/* ══ Tabs ══ */}
      <div className="flex border-b mx-5 mb-4" style={{ borderColor: BORDER }}>
        {(["posts", "reels"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest relative transition-colors"
            style={{ color: tab === t ? "#fff" : "rgba(255,255,255,0.28)" }}>
            {t}
            {tab === t && (
              <span className="absolute bottom-[-1px] left-1/2 -translate-x-1/2 h-[2px] rounded-full"
                style={{ width: 28, background: ACCENT, boxShadow: `0 0 8px rgba(34,211,238,0.8)` }} />
            )}
          </button>
        ))}
      </div>

      {/* ══ Posts — 3-col uniform grid ══ */}
      {tab === "posts" && (
        <div className="px-5 pb-10">
          {/* hero featured */}
          <div className="w-full h-52 rounded-2xl mb-2 overflow-hidden relative flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #071420, #051028)" }}>
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 40% 50%, rgba(34,211,238,0.22) 0%, transparent 65%)" }} />
            <div className="relative z-10 text-center">
              <div className="text-5xl mb-2">🚀</div>
              <div className="text-sm font-bold text-white/80">Launch day!</div>
              <div className="flex gap-5 mt-2 justify-center text-xs font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
                <span>♥ 12.4K</span><span>◎ 340K</span>
              </div>
            </div>
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold"
              style={{ background: "rgba(34,211,238,0.14)", border: "1px solid rgba(34,211,238,0.35)", color: ACCENT }}>
              Top post
            </div>
          </div>
          {/* grid */}
          <div className="grid grid-cols-3 gap-[3px]">
            {POSTS.slice(1).map(p => (
              <div key={p.id} className="aspect-square overflow-hidden relative group"
                style={{ background: "linear-gradient(135deg, #080f1c, #060b16)", borderRadius: 6 }}>
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-2xl">{p.emoji}</div>
                </div>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 flex items-center justify-center">
                  <span className="text-xs font-bold">♥ {p.likes}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "reels" && (
        <div className="px-5 pb-10">
          <div className="grid grid-cols-2 gap-2">
            {POSTS.map(p => (
              <div key={p.id} className="rounded-2xl overflow-hidden relative" style={{ aspectRatio: "9/16" }}>
                <div className="w-full h-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #071828, #050c18)" }}>
                  <div className="text-4xl">{p.emoji}</div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                <div className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded font-bold"
                  style={{ background: "rgba(0,0,0,0.55)" }}>▶</div>
                <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[10px] font-semibold text-white/80">
                  <span>▶ {p.views}</span>
                  <span>♥ {p.likes}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
