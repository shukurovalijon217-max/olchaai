import { useState, useEffect } from "react";

/* ── mock data ── */
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
  { id: 1, img: null, emoji: "🚀", likes: "12.4K", isVideo: false },
  { id: 2, img: null, emoji: "🎨", likes: "8.1K",  isVideo: false },
  { id: 3, img: null, emoji: "🌊", likes: "6.7K",  isVideo: true  },
  { id: 4, img: null, emoji: "🔥", likes: "21K",   isVideo: false },
  { id: 5, img: null, emoji: "✨", likes: "4.4K",  isVideo: false },
  { id: 6, img: null, emoji: "🎯", likes: "9.9K",  isVideo: true  },
  { id: 7, img: null, emoji: "💡", likes: "7.2K",  isVideo: false },
  { id: 8, img: null, emoji: "🌿", likes: "3.8K",  isVideo: false },
  { id: 9, img: null, emoji: "⚡", likes: "15K",   isVideo: true  },
];

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function useCount(target: number, duration = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setV(Math.round(target * ease));
      if (progress < 1) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);
  return v;
}

/* ── Stat block ── */
function StatBlock({ label, value, accent }: { label: string; value: number; accent: string }) {
  const v = useCount(value);
  return (
    <div className="flex-1 flex flex-col items-center gap-1 py-3 relative">
      <span className="text-[26px] font-black leading-none tracking-tight" style={{ color: accent }}>
        {fmt(v)}
      </span>
      <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.38)" }}>
        {label}
      </span>
    </div>
  );
}

export function SignalIdentity() {
  const [tab, setTab] = useState<"posts" | "reels">("posts");
  const [followed, setFollowed] = useState(false);

  const ACCENT = "#a78bfa";   /* single accent: violet */
  const BG     = "#08060f";
  const CARD   = "rgba(255,255,255,0.04)";
  const BORDER = "rgba(255,255,255,0.07)";

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: BG, fontFamily: "'Inter',sans-serif" }}>

      {/* ══ Cover — deep void with single violet bloom ══ */}
      <div className="relative h-48 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #100820 0%, #08060f 100%)" }} />
        {/* bloom */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[340px] h-[240px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.45) 0%, transparent 65%)", filter: "blur(40px)" }} />
        {/* subtle horizontal lines */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 40px)" }} />
        {/* bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-20" style={{ background: `linear-gradient(to top, ${BG}, transparent)` }} />
      </div>

      {/* ══ Avatar row ══ */}
      <div className="flex items-end justify-between px-5" style={{ marginTop: -52 }}>
        {/* Avatar */}
        <div className="relative shrink-0" style={{ width: 96, height: 96 }}>
          {/* glow ring */}
          <div className="absolute inset-0 rounded-full"
            style={{ boxShadow: `0 0 0 2.5px ${ACCENT}, 0 0 28px rgba(139,92,246,0.55)` }} />
          <div className="absolute inset-[3px] rounded-full overflow-hidden flex items-center justify-center text-4xl"
            style={{ background: "linear-gradient(135deg, #1a0f35, #0d0a1e)" }}>
            👤
          </div>
          {/* verified */}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black"
            style={{ background: ACCENT, border: `2px solid ${BG}`, boxShadow: `0 0 10px rgba(139,92,246,0.7)` }}>
            ✓
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pb-1">
          <button onClick={() => setFollowed(f => !f)}
            className="h-9 px-4 rounded-xl text-sm font-bold transition-all"
            style={followed
              ? { background: CARD, border: `1px solid ${BORDER}`, color: "rgba(255,255,255,0.5)" }
              : { background: ACCENT, boxShadow: `0 0 20px rgba(139,92,246,0.5)`, color: "#fff", border: "none" }}>
            {followed ? "Following" : "Follow"}
          </button>
          <button className="h-9 w-9 rounded-xl flex items-center justify-center text-sm"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            ···
          </button>
        </div>
      </div>

      {/* ══ Identity ══ */}
      <div className="px-5 mt-3 mb-5">
        <div className="flex items-center gap-2 mb-0.5">
          <h1 className="text-[20px] font-black tracking-tight">{USER.name}</h1>
        </div>
        <p className="text-[13px] mb-2.5" style={{ color: ACCENT, opacity: 0.75, fontWeight: 600 }}>@{USER.handle}</p>
        <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{USER.bio}</p>
      </div>

      {/* ══ STATS — three big numbers separated by hairlines ══ */}
      <div className="mx-5 mb-5 flex rounded-2xl overflow-hidden"
        style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.18)", boxShadow: "0 0 32px rgba(139,92,246,0.1) inset" }}>
        <StatBlock label="Followers" value={USER.followers} accent={ACCENT} />
        <div className="w-px self-stretch my-3" style={{ background: "rgba(139,92,246,0.2)" }} />
        <StatBlock label="Following" value={USER.following} accent="rgba(255,255,255,0.7)" />
        <div className="w-px self-stretch my-3" style={{ background: "rgba(139,92,246,0.2)" }} />
        <StatBlock label="Posts" value={USER.posts} accent="rgba(255,255,255,0.7)" />
      </div>

      {/* ══ Tabs ══ */}
      <div className="flex gap-0 border-b mx-5 mb-4" style={{ borderColor: BORDER }}>
        {(["posts", "reels"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest relative transition-colors"
            style={{ color: tab === t ? "#fff" : "rgba(255,255,255,0.3)" }}>
            {t}
            {tab === t && (
              <span className="absolute bottom-[-1px] left-1/2 -translate-x-1/2 h-[2px] rounded-full"
                style={{ width: 32, background: ACCENT, boxShadow: `0 0 8px rgba(139,92,246,0.9)` }} />
            )}
          </button>
        ))}
      </div>

      {/* ══ Posts grid ══ */}
      {tab === "posts" && (
        <div className="px-5 pb-10">
          {/* featured large post */}
          <div className="w-full rounded-2xl overflow-hidden mb-2 relative flex items-center justify-center"
            style={{ height: 200, background: "linear-gradient(135deg, #1a0a36, #0a1040)" }}>
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 35% 45%, rgba(139,92,246,0.35) 0%, transparent 65%), radial-gradient(ellipse at 75% 60%, rgba(59,130,246,0.2) 0%, transparent 60%)" }} />
            <div className="relative z-10 text-center">
              <div className="text-5xl mb-2">🚀</div>
              <div className="text-sm font-bold text-white/80">Launch day!</div>
              <div className="flex items-center justify-center gap-4 mt-2 text-xs text-white/45 font-medium">
                <span>♥ 12.4K</span><span>◉ 843</span><span>↑ 2.1K</span>
              </div>
            </div>
            <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: "rgba(139,92,246,0.28)", border: "1px solid rgba(139,92,246,0.45)", color: ACCENT }}>
              Top post
            </div>
          </div>
          {/* uniform 3-col grid */}
          <div className="grid grid-cols-3 gap-[3px]">
            {POSTS.slice(1).map(p => (
              <div key={p.id} className="aspect-square overflow-hidden relative group"
                style={{ background: "linear-gradient(135deg, #120d24, #0c0c1e)", borderRadius: 6 }}>
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl">{p.emoji}</div>
                    {p.isVideo && (
                      <div className="absolute top-1.5 right-1.5 text-[9px] bg-white/20 rounded px-1">▶</div>
                    )}
                  </div>
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
                <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #130d28, #0a0e20)" }}>
                  <div className="text-4xl">{p.emoji}</div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[10px] font-semibold">
                  <span>▶ {p.likes}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
