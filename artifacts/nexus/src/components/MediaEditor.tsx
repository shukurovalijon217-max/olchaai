import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Type, Music, Check, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

export type TextOverlay = {
  id: string; text: string; x: number; y: number;
  fontSize: number; color: string;
  animation: "none"|"pulse"|"bounce"|"wave"|"neon"|"slide";
  fontStyle: "regular"|"bold"|"italic"|"shadow"|"outline";
  bgStyle: "none"|"dark"|"blur";
};

interface Props {
  previews: string[];
  files: File[];
  initialOverlays?: TextOverlay[];
  initialAudioName?: string;
  onDone: (overlays: TextOverlay[], audioName: string) => void;
  onClose: () => void;
}

const COLORS = ["#ffffff","#ffee38","#ff6b6b","#a78bfa","#34d399","#06b6d4","#f472b6","#111111"];
const ANIMS: { id: TextOverlay["animation"]; label: string; icon: string }[] = [
  { id:"none",   label:"Statik",    icon:"Aa" },
  { id:"pulse",  label:"Puls",      icon:"◎"  },
  { id:"bounce", label:"Sakrash",   icon:"↕"  },
  { id:"wave",   label:"To'lqin",   icon:"〰" },
  { id:"neon",   label:"Neon",      icon:"✦"  },
  { id:"slide",  label:"Sirpanish", icon:"→"  },
];
const FSTYLES: { id: TextOverlay["fontStyle"]; label: string }[] = [
  { id:"regular",  label:"Aa" }, { id:"bold", label:"𝗔𝗮" },
  { id:"italic",   label:"𝘈𝘢" }, { id:"shadow", label:"A̲a" },
  { id:"outline",  label:"Ao" },
];

function WaveText({ text, color, fontSize }: { text: string; color: string; fontSize: number }) {
  return (
    <span style={{ display:"inline-flex", gap: 0 }}>
      {text.split("").map((ch, i) => (
        <span key={i} style={{
          display:"inline-block",
          animation:`txt-wave-letter 1s ease-in-out infinite`,
          animationDelay:`${i * 0.08}s`,
          color, fontSize,
          whiteSpace: ch === " " ? "pre" : undefined,
        }}>{ch}</span>
      ))}
    </span>
  );
}

function OverlayText({ item }: { item: TextOverlay }) {
  const cls = item.animation === "pulse" ? "txt-anim-pulse"
    : item.animation === "bounce" ? "txt-anim-bounce"
    : item.animation === "neon"   ? "txt-anim-neon"
    : item.animation === "slide"  ? "txt-anim-slide"
    : "";

  const fs: React.CSSProperties = item.fontStyle === "bold"    ? { fontWeight: 900 }
    : item.fontStyle === "italic"   ? { fontStyle: "italic" }
    : item.fontStyle === "shadow"   ? { textShadow: `2px 3px 8px rgba(0,0,0,0.9)` }
    : item.fontStyle === "outline"  ? { WebkitTextStroke: "1.5px rgba(0,0,0,0.85)" }
    : {};

  const bg: React.CSSProperties = item.bgStyle === "dark" ? { background:"rgba(0,0,0,0.5)", padding:"4px 10px", borderRadius: 8 }
    : item.bgStyle === "blur" ? { backdropFilter:"blur(12px)", background:"rgba(0,0,0,0.25)", padding:"4px 10px", borderRadius: 8 }
    : {};

  const inner = item.animation === "wave"
    ? <WaveText text={item.text} color={item.color} fontSize={item.fontSize} />
    : <span style={{ color: item.color, fontSize: item.fontSize }}>{item.text}</span>;

  return (
    <div className={cls} style={{ fontFamily:"system-ui,sans-serif", lineHeight:1.2, ...fs, ...bg }}>
      {inner}
    </div>
  );
}

export default function MediaEditor({ previews, files, initialOverlays = [], initialAudioName = "", onDone, onClose }: Props) {
  const [slide, setSlide]               = useState(0);
  const [items, setItems]               = useState<TextOverlay[]>(initialOverlays);
  const [selectedId, setSelectedId]     = useState<string|null>(null);
  const [panel, setPanel]               = useState<"none"|"text"|"music">("none");
  const [audioName, setAudioName]       = useState(initialAudioName);

  const [draftText, setDraftText]       = useState("");
  const [draftColor, setDraftColor]     = useState("#ffffff");
  const [draftAnim, setDraftAnim]       = useState<TextOverlay["animation"]>("none");
  const [draftFStyle, setDraftFStyle]   = useState<TextOverlay["fontStyle"]>("bold");
  const [draftBg, setDraftBg]           = useState<TextOverlay["bgStyle"]>("none");
  const [draftSize, setDraftSize]       = useState(28);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{id:string;sx:number;sy:number;ox:number;oy:number}|null>(null);

  const isVideo = (url: string) => /\.(mp4|webm|mov|avi)(\?|$)/i.test(url);

  const addText = () => {
    if (!draftText.trim()) return;
    const id = `${Date.now()}`;
    setItems(p => [...p, { id, text: draftText.trim(), x:50, y:45, fontSize:draftSize, color:draftColor, animation:draftAnim, fontStyle:draftFStyle, bgStyle:draftBg }]);
    setDraftText(""); setPanel("none"); setSelectedId(id);
  };

  const removeSelected = () => { setItems(p => p.filter(i => i.id !== selectedId)); setSelectedId(null); };

  const onPointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const item = items.find(i => i.id === id)!;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { id, sx:e.clientX, sy:e.clientY, ox:item.x, oy:item.y };
    setSelectedId(id);
  };
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragRef.current.sx) / r.width) * 100;
    const dy = ((e.clientY - dragRef.current.sy) / r.height) * 100;
    setItems(p => p.map(i => i.id === dragRef.current!.id
      ? { ...i, x: Math.max(4,Math.min(96,dragRef.current!.ox+dx)), y: Math.max(4,Math.min(96,dragRef.current!.oy+dy)) }
      : i));
  }, []);
  const onPointerUp = () => { dragRef.current = null; };

  const selected = items.find(i => i.id === selectedId);

  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 flex flex-col"
      style={{ zIndex:200, background:"#000", touchAction:"none" }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={() => { setSelectedId(null); if (panel !== "text" && panel !== "music") setPanel("none"); }}
    >
      {/* ── Preview area ── */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        {/* Media */}
        {isVideo(previews[slide]) ? (
          <video src={previews[slide]} className="w-full h-full object-cover" muted loop playsInline autoPlay />
        ) : (
          <img src={previews[slide]} alt="" className="w-full h-full object-cover" />
        )}

        {/* Text overlays */}
        {items.map(item => (
          <div
            key={item.id}
            onPointerDown={e => onPointerDown(e, item.id)}
            style={{
              position:"absolute",
              left:`${item.x}%`, top:`${item.y}%`,
              transform:"translate(-50%,-50%)",
              cursor:"grab", userSelect:"none", touchAction:"none",
            }}
            onClick={e => { e.stopPropagation(); setSelectedId(item.id); }}
          >
            <OverlayText item={item} />
            {selectedId === item.id && (
              <div
                className="absolute inset-0 rounded-lg"
                style={{ border:"1.5px dashed rgba(255,255,255,0.7)", pointerEvents:"none", margin:-4 }}
              />
            )}
          </div>
        ))}

        {/* Slide nav dots */}
        {previews.length > 1 && (
          <>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {previews.map((_, i) => (
                <button key={i} onClick={e => { e.stopPropagation(); setSlide(i); }}
                  className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{ background: i===slide ? "#fff" : "rgba(255,255,255,0.4)" }} />
              ))}
            </div>
            {slide > 0 && (
              <button onClick={e => { e.stopPropagation(); setSlide(s=>s-1); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background:"rgba(0,0,0,0.4)" }}>
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
            )}
            {slide < previews.length-1 && (
              <button onClick={e => { e.stopPropagation(); setSlide(s=>s+1); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background:"rgba(0,0,0,0.4)" }}>
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            )}
          </>
        )}

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-10 pb-3"
          style={{ background:"linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)" }}>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background:"rgba(0,0,0,0.4)" }}>
            <X className="w-5 h-5 text-white" />
          </button>
          <span className="text-white font-bold text-sm opacity-75">Redaktor</span>
          <button onClick={() => onDone(items, audioName)}
            className="px-4 py-1.5 rounded-full text-sm font-bold text-white"
            style={{ background:"linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
            Tayyor
          </button>
        </div>

        {/* Right tool strip */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-3">
          {[
            { id:"text", Icon:Type, label:"Matn" },
            { id:"music", Icon:Music, label:"Musiqa" },
          ].map(({ id, Icon, label }) => (
            <button key={id} onClick={e => { e.stopPropagation(); setPanel(p => p===id ? "none" : id as any); setSelectedId(null); }}
              className="w-11 h-11 rounded-2xl flex flex-col items-center justify-center gap-0.5"
              style={{
                background: panel===id ? "rgba(124,58,237,0.85)" : "rgba(0,0,0,0.5)",
                backdropFilter:"blur(10px)",
                border:"1px solid rgba(255,255,255,0.18)",
              }}>
              <Icon className="w-4.5 h-4.5 text-white" style={{ width:18, height:18 }} />
              <span className="text-[9px] text-white/80 font-bold leading-none">{label}</span>
            </button>
          ))}

          {/* Selected text delete */}
          {selected && (
            <motion.button initial={{scale:0}} animate={{scale:1}}
              onClick={e => { e.stopPropagation(); removeSelected(); }}
              className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{ background:"rgba(239,68,68,0.7)", backdropFilter:"blur(10px)" }}>
              <Trash2 className="text-white" style={{ width:18, height:18 }} />
            </motion.button>
          )}
        </div>
      </div>

      {/* ── Text panel ── */}
      <AnimatePresence>
        {panel === "text" && (
          <motion.div
            initial={{ y: "100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
            transition={{ type:"spring", stiffness:380, damping:32 }}
            className="flex-shrink-0 px-4 pt-3 pb-8 space-y-3"
            style={{ background:"rgba(8,8,22,0.97)", borderTop:"1px solid rgba(255,255,255,0.08)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Text input */}
            <div className="flex gap-2">
              <input
                autoFocus
                value={draftText}
                onChange={e => setDraftText(e.target.value)}
                placeholder="Matn kiriting…"
                className="flex-1 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none"
                style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.1)" }}
                onKeyDown={e => e.key==="Enter" && addText()}
              />
              <button onClick={addText}
                className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: draftText.trim() ? "rgba(124,58,237,0.9)" : "rgba(255,255,255,0.07)" }}>
                <Check className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Color row */}
            <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              {COLORS.map(c => (
                <button key={c} onClick={() => setDraftColor(c)}
                  className="w-8 h-8 rounded-full flex-shrink-0 transition-transform"
                  style={{ background:c, border: c===draftColor ? "2.5px solid white" : "2px solid transparent",
                    transform: c===draftColor ? "scale(1.2)" : "scale(1)",
                    boxShadow: c===draftColor ? "0 0 0 2px rgba(124,58,237,0.7)" : "none" }} />
              ))}
              {/* Size */}
              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                <button onClick={() => setDraftSize(s=>Math.max(14,s-4))}
                  className="w-7 h-7 rounded-full text-white/60 text-sm font-bold flex items-center justify-center"
                  style={{ background:"rgba(255,255,255,0.08)" }}>−</button>
                <span className="text-xs text-white/50 w-6 text-center">{draftSize}</span>
                <button onClick={() => setDraftSize(s=>Math.min(72,s+4))}
                  className="w-7 h-7 rounded-full text-white/60 text-sm font-bold flex items-center justify-center"
                  style={{ background:"rgba(255,255,255,0.08)" }}>+</button>
              </div>
            </div>

            {/* Style row */}
            <div className="flex gap-2">
              {FSTYLES.map(st => (
                <button key={st.id} onClick={() => setDraftFStyle(st.id)}
                  className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: draftFStyle===st.id ? "rgba(124,58,237,0.7)" : "rgba(255,255,255,0.06)",
                    color: draftFStyle===st.id ? "white" : "rgba(255,255,255,0.5)",
                    border: draftFStyle===st.id ? "1px solid rgba(124,58,237,0.8)" : "1px solid transparent",
                  }}>
                  {st.label}
                </button>
              ))}
              {/* BG style */}
              {(["none","dark","blur"] as TextOverlay["bgStyle"][]).map(b => (
                <button key={b} onClick={() => setDraftBg(b)}
                  className="flex-1 py-2 rounded-xl text-[10px] font-bold transition-all"
                  style={{
                    background: draftBg===b ? "rgba(6,182,212,0.4)" : "rgba(255,255,255,0.06)",
                    color: draftBg===b ? "white" : "rgba(255,255,255,0.4)",
                  }}>
                  {b==="none" ? "Yo'q" : b==="dark" ? "Qora" : "Blur"}
                </button>
              ))}
            </div>

            {/* Animation row */}
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
              {ANIMS.map(an => (
                <button key={an.id} onClick={() => setDraftAnim(an.id)}
                  className="flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all"
                  style={{
                    background: draftAnim===an.id ? "rgba(124,58,237,0.7)" : "rgba(255,255,255,0.06)",
                    border: draftAnim===an.id ? "1px solid rgba(124,58,237,0.8)" : "1px solid transparent",
                  }}>
                  <span className="text-base leading-none" style={{ color: draftAnim===an.id ? "white" : "rgba(255,255,255,0.5)" }}>
                    {an.icon}
                  </span>
                  <span className="text-[9px] font-bold" style={{ color: draftAnim===an.id ? "white" : "rgba(255,255,255,0.4)" }}>
                    {an.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Music panel ── */}
      <AnimatePresence>
        {panel === "music" && (
          <motion.div
            initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
            transition={{ type:"spring", stiffness:380, damping:32 }}
            className="flex-shrink-0 px-4 pt-4 pb-8 space-y-3"
            style={{ background:"rgba(8,8,22,0.97)", borderTop:"1px solid rgba(255,255,255,0.08)" }}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-xs font-bold text-white/50 mb-1">🎵 Qo'shiq nomi</p>
            <div className="flex gap-2">
              <input
                autoFocus
                value={audioName}
                onChange={e => setAudioName(e.target.value)}
                placeholder="Masalan: Dua Lipa — Levitating"
                className="flex-1 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none"
                style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.1)" }}
              />
              <button onClick={() => setPanel("none")}
                className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background:"rgba(124,58,237,0.85)" }}>
                <Check className="w-5 h-5 text-white" />
              </button>
            </div>
            {audioName && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-2xl"
                style={{ background:"rgba(124,58,237,0.12)", border:"1px solid rgba(124,58,237,0.3)" }}>
                <div className="w-7 h-7 rounded-full vinyl-spin flex items-center justify-center flex-shrink-0"
                  style={{ background:"linear-gradient(135deg,#7c3aed,#f472b6)" }}>
                  <Music className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm text-white/80 truncate">{audioName}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
