import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, RotateCcw, Eye, EyeOff, Lock, Unlock, Copy, ChevronUp, ChevronDown, Plus, Type, Smile } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface CanvasLayer {
  id: string;
  type: "image" | "video" | "text" | "emoji";
  src?: string;
  text?: string;
  emoji?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  flipH: boolean;
  flipV: boolean;
  locked: boolean;
  visible: boolean;
  zIndex: number;
  filter?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  bgColor?: string;
}

interface Props {
  layers: CanvasLayer[];
  onChange: (layers: CanvasLayer[]) => void;
  canvasW?: number;
  canvasH?: number;
}

const CANVAS_W = 270;
const CANVAS_H = 480;

const FONTS = ["Inter","Bebas Neue","Pacifico","Roboto Mono","Dancing Script","Playfair Display","Oswald","Permanent Marker"];
const FILTERS = [
  {id:"none",labelKey:"drag_canvas.filter_none"},{id:"brightness(1.2) saturate(1.3)",labelKey:"drag_canvas.filter_vivid"},
  {id:"sepia(0.5)",labelKey:"drag_canvas.filter_sepia"},{id:"grayscale(1)",labelKey:"drag_canvas.filter_bw"},
  {id:"hue-rotate(180deg)",labelKey:"drag_canvas.filter_invert"},{id:"contrast(1.4) brightness(1.1)",labelKey:"drag_canvas.filter_punch"},
  {id:"saturate(0.3) brightness(0.9)",labelKey:"drag_canvas.filter_matte"},{id:"brightness(1.4) contrast(0.8)",labelKey:"drag_canvas.filter_dreamy"},
];

const EMOJI_LIST = ["🔥","⭐","💎","🎉","🚀","💯","❤️","😂","😍","🤩","👏","💪","🌈","✨","🎵","💸","🏆","😎","🦋","🌸","💫","🎯","⚡","🌙","🎸"];

function uid() { return Math.random().toString(36).slice(2, 9); }

function clamp(val: number, min: number, max: number) { return Math.max(min, Math.min(max, val)); }

export default function DragMediaCanvas({ layers, onChange, canvasW = CANVAS_W, canvasH = CANVAS_H }: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTextAdd, setShowTextAdd] = useState(false);
  const [newText, setNewText] = useState("");
  const [showLayerPanel, setShowLayerPanel] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number; corner: string } | null>(null);
  const rotateRef = useRef<{ cx: number; cy: number; startAngle: number; origRot: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = useCallback((id: string, patch: Partial<CanvasLayer>) => {
    onChange(layers.map(l => l.id === id ? { ...l, ...patch } : l));
  }, [layers, onChange]);

  const del = useCallback((id: string) => {
    onChange(layers.filter(l => l.id !== id));
    if (selected === id) setSelected(null);
  }, [layers, onChange, selected]);

  const reorder = useCallback((id: string, dir: 1 | -1) => {
    const idx = layers.findIndex(l => l.id === id);
    if (idx < 0) return;
    const newLayers = [...layers];
    const target = idx + dir;
    if (target < 0 || target >= newLayers.length) return;
    [newLayers[idx], newLayers[target]] = [newLayers[target], newLayers[idx]];
    newLayers.forEach((l, i) => l.zIndex = i);
    onChange(newLayers);
  }, [layers, onChange]);

  const duplicate = useCallback((id: string) => {
    const l = layers.find(x => x.id === id);
    if (!l) return;
    const newLayer = { ...l, id: uid(), x: l.x + 16, y: l.y + 16, zIndex: layers.length };
    onChange([...layers, newLayer]);
    setSelected(newLayer.id);
  }, [layers, onChange]);

  const addFromFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith("video/");
    const newLayer: CanvasLayer = {
      id: uid(), type: isVideo ? "video" : "image",
      src: url, x: 20, y: 20, width: 200, height: 150,
      rotation: 0, opacity: 1, flipH: false, flipV: false,
      locked: false, visible: true, zIndex: layers.length, filter: "none",
    };
    onChange([...layers, newLayer]);
    setSelected(newLayer.id);
  };

  const addEmoji = (emoji: string) => {
    const newLayer: CanvasLayer = {
      id: uid(), type: "emoji", emoji,
      x: 80, y: 80, width: 60, height: 60,
      rotation: 0, opacity: 1, flipH: false, flipV: false,
      locked: false, visible: true, zIndex: layers.length, fontSize: 48,
    };
    onChange([...layers, newLayer]);
    setSelected(newLayer.id);
    setShowEmojiPicker(false);
  };

  const addText = () => {
    if (!newText.trim()) return;
    const newLayer: CanvasLayer = {
      id: uid(), type: "text", text: newText,
      x: 40, y: 200, width: 200, height: 50,
      rotation: 0, opacity: 1, flipH: false, flipV: false,
      locked: false, visible: true, zIndex: layers.length,
      fontSize: 22, fontFamily: "Inter", color: "#ffffff", bgColor: "transparent",
    };
    onChange([...layers, newLayer]);
    setSelected(newLayer.id);
    setNewText("");
    setShowTextAdd(false);
  };

  /* ── Drag ── */
  const startDrag = (e: React.PointerEvent, id: string) => {
    const layer = layers.find(l => l.id === id);
    if (!layer || layer.locked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: layer.x, origY: layer.y };
    setSelected(id);
  };
  const onDrag = (e: React.PointerEvent, id: string) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const layer = layers.find(l => l.id === id);
    if (!layer) return;
    update(id, {
      x: clamp(dragRef.current.origX + dx, -layer.width / 2, canvasW - layer.width / 2),
      y: clamp(dragRef.current.origY + dy, -layer.height / 2, canvasH - layer.height / 2),
    });
  };
  const endDrag = () => { dragRef.current = null; };

  /* ── Resize ── */
  const startResize = (e: React.PointerEvent, id: string, corner: string) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const layer = layers.find(l => l.id === id);
    if (!layer) return;
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: layer.width, origH: layer.height, corner };
  };
  const onResize = (e: React.PointerEvent, id: string) => {
    if (!resizeRef.current) return;
    const dx = e.clientX - resizeRef.current.startX;
    const dy = e.clientY - resizeRef.current.startY;
    const { corner, origW, origH } = resizeRef.current;
    let newW = origW, newH = origH;
    if (corner.includes("r")) newW = Math.max(40, origW + dx);
    if (corner.includes("l")) newW = Math.max(40, origW - dx);
    if (corner.includes("b")) newH = Math.max(30, origH + dy);
    if (corner.includes("t")) newH = Math.max(30, origH - dy);
    update(id, { width: newW, height: newH });
  };
  const endResize = () => { resizeRef.current = null; };

  /* ── Rotate ── */
  const startRotate = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const layer = layers.find(l => l.id === id);
    if (!layer) return;
    const cx = layer.x + layer.width / 2;
    const cy = layer.y + layer.height / 2;
    const rect = canvasRef.current?.getBoundingClientRect();
    const startAngle = Math.atan2(e.clientY - (rect?.top ?? 0) - cy, e.clientX - (rect?.left ?? 0) - cx) * 180 / Math.PI;
    rotateRef.current = { cx, cy, startAngle, origRot: layer.rotation };
  };
  const onRotate = (e: React.PointerEvent, id: string) => {
    if (!rotateRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    const { cx, cy, startAngle, origRot } = rotateRef.current;
    const angle = Math.atan2(e.clientY - (rect?.top ?? 0) - cy, e.clientX - (rect?.left ?? 0) - cx) * 180 / Math.PI;
    update(id, { rotation: origRot + (angle - startAngle) });
  };

  const sel = layers.find(l => l.id === selected);

  return (
    <div className="flex gap-3 items-start">
      {/* ── Layer Stack Panel ── */}
      <div className="flex flex-col gap-1 min-w-[100px]">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider">{t("drag_canvas.layers_title")}</p>
          <button onClick={() => setShowLayerPanel(p => !p)} className="text-white/30 hover:text-white/60">
            {showLayerPanel ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
          </button>
        </div>
        <AnimatePresence>
          {showLayerPanel && (
            <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="space-y-1 overflow-hidden" style={{maxHeight:160, overflowY:"auto"}}>
              {[...layers].reverse().map((l, i) => (
                <motion.div key={l.id} layout
                  className="flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer transition-all text-[9px]"
                  style={{ background: selected===l.id ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.05)", border: selected===l.id ? "1px solid rgba(167,139,250,0.5)" : "1px solid rgba(255,255,255,0.07)" }}
                  onClick={() => setSelected(l.id)}>
                  <span style={{fontSize:10}}>{l.type==="image"?"🖼"  :l.type==="video"?"🎬":l.type==="emoji"?(l.emoji??"✨"):l.type==="text"?"T":"?"}</span>
                  <span className="flex-1 truncate text-white/60" style={{maxWidth:36}}>{l.type==="text"?l.text:l.type==="emoji"?l.emoji:l.type.slice(0,3)}</span>
                  <button onClick={e=>{e.stopPropagation();update(l.id,{visible:!l.visible});}} className={l.visible?"text-white/50":"text-white/20"}>
                    {l.visible?<Eye className="w-2.5 h-2.5"/>:<EyeOff className="w-2.5 h-2.5"/>}
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add buttons */}
        <div className="flex gap-1 mt-1">
          <button onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center py-1.5 rounded-lg text-[9px] font-bold text-white/50 hover:text-white/80 transition-all"
            style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }}>
            <Plus className="w-2.5 h-2.5 mr-0.5"/> {t("drag_canvas.add_photo")}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if(f) addFromFile(f); e.target.value = ""; }}/>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setShowEmojiPicker(p=>!p)}
            className="flex-1 flex items-center justify-center py-1.5 rounded-lg text-[9px] font-bold text-white/50 hover:text-white/80 transition-all"
            style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }}>
            <Smile className="w-2.5 h-2.5 mr-0.5"/> {t("drag_canvas.add_emoji")}
          </button>
          <button onClick={() => setShowTextAdd(p=>!p)}
            className="flex-1 flex items-center justify-center py-1.5 rounded-lg text-[9px] font-bold text-white/50 hover:text-white/80 transition-all"
            style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }}>
            <Type className="w-2.5 h-2.5 mr-0.5"/> {t("drag_canvas.add_text")}
          </button>
        </div>

        {/* Emoji picker */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}}
              className="rounded-xl p-2" style={{ background:"rgba(20,20,30,0.97)", border:"1px solid rgba(255,255,255,0.12)" }}>
              <div className="grid grid-cols-5 gap-1">
                {EMOJI_LIST.map(em => (
                  <button key={em} onClick={() => addEmoji(em)} className="text-base hover:scale-125 transition-transform">{em}</button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text add */}
        <AnimatePresence>
          {showTextAdd && (
            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="space-y-1 overflow-hidden">
              <input value={newText} onChange={e=>setNewText(e.target.value)}
                placeholder={t("drag_canvas.text_input_ph")}
                onKeyDown={e => e.key==="Enter" && addText()}
                className="w-full rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none"
                style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)" }}/>
              <button onClick={addText}
                className="w-full py-1 rounded-lg text-[9px] font-bold text-violet-300"
                style={{ background:"rgba(167,139,250,0.15)", border:"1px solid rgba(167,139,250,0.35)" }}>
                {t("drag_canvas.add_btn")}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Canvas ── */}
      <div className="flex-1 flex flex-col items-center gap-2">
        <div
          ref={canvasRef}
          className="relative overflow-hidden rounded-2xl select-none"
          style={{ width: canvasW, height: canvasH, background:"rgba(10,10,18,0.95)", border:"1px solid rgba(255,255,255,0.12)", flexShrink:0 }}
          onClick={() => setSelected(null)}>

          {/* Empty state */}
          {layers.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 gap-2">
              <span style={{fontSize:36}}>🖼️</span>
              <p className="text-xs text-center px-4">{t("drag_canvas.empty_title")}<br/><span className="text-[10px]">{t("drag_canvas.empty_sub")}</span></p>
            </div>
          )}

          {/* Layers */}
          {[...layers].sort((a,b) => a.zIndex - b.zIndex).map(layer => {
            if (!layer.visible) return null;
            const isSelected = selected === layer.id;
            return (
              <div
                key={layer.id}
                style={{
                  position:"absolute",
                  left: layer.x, top: layer.y,
                  width: layer.width, height: layer.height,
                  transform: `rotate(${layer.rotation}deg) scaleX(${layer.flipH?-1:1}) scaleY(${layer.flipV?-1:1})`,
                  opacity: layer.opacity,
                  cursor: layer.locked ? "not-allowed" : "move",
                  zIndex: layer.zIndex,
                  outline: isSelected ? "2px solid rgba(167,139,250,0.9)" : "none",
                  outlineOffset: 2,
                }}
                onPointerDown={e => { e.stopPropagation(); startDrag(e, layer.id); }}
                onPointerMove={e => { onDrag(e, layer.id); onResize(e, layer.id); onRotate(e, layer.id); }}
                onPointerUp={() => { endDrag(); endResize(); rotateRef.current = null; }}
                onClick={e => { e.stopPropagation(); setSelected(layer.id); }}>

                {/* Layer content */}
                {layer.type === "image" && (
                  <img loading="lazy" decoding="async" src={layer.src} alt="" draggable={false}
                    style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:6, filter:layer.filter==="none"?"":layer.filter, pointerEvents:"none" }}/>
                )}
                {layer.type === "video" && (
                  <video src={layer.src} autoPlay loop muted playsInline
                    style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:6, filter:layer.filter==="none"?"":layer.filter, pointerEvents:"none" }}/>
                )}
                {layer.type === "emoji" && (
                  <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:layer.fontSize, lineHeight:1, userSelect:"none", pointerEvents:"none" }}>
                    {layer.emoji}
                  </div>
                )}
                {layer.type === "text" && (
                  <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", padding:"4px 8px",
                    fontSize:layer.fontSize, fontFamily:layer.fontFamily, color:layer.color,
                    background:layer.bgColor==="transparent"?"transparent":layer.bgColor,
                    borderRadius:4, wordBreak:"break-word", textAlign:"center", lineHeight:1.2, userSelect:"none", pointerEvents:"none" }}>
                    {layer.text}
                  </div>
                )}

                {/* Selection handles */}
                {isSelected && (
                  <>
                    {/* Rotate handle */}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-violet-400 border-2 border-white cursor-crosshair flex items-center justify-center"
                      style={{ fontSize:8 }}
                      onPointerDown={e => { e.stopPropagation(); startRotate(e, layer.id); }}
                      onPointerMove={e => { e.stopPropagation(); onRotate(e, layer.id); }}
                      onPointerUp={() => { rotateRef.current = null; }}>
                      ↻
                    </div>
                    {/* Corner resize handles */}
                    {[{c:"tl",s:{top:-5,left:-5}},{c:"tr",s:{top:-5,right:-5}},{c:"bl",s:{bottom:-5,left:-5}},{c:"br",s:{bottom:-5,right:-5}}].map(({c,s}) => (
                      <div key={c}
                        className="absolute w-3 h-3 bg-white border border-violet-400 rounded-sm"
                        style={{ ...s, cursor:`${c}-resize` }}
                        onPointerDown={e => { e.stopPropagation(); startResize(e, layer.id, c); }}
                        onPointerMove={e => { e.stopPropagation(); onResize(e, layer.id); }}
                        onPointerUp={() => { endResize(); }}/>
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Selected layer inspector ── */}
        <AnimatePresence>
          {sel && (
            <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:6}}
              className="rounded-2xl p-3 space-y-2.5 w-full"
              style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>

              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-violet-300">
                  {sel.type==="image"?t("drag_canvas.type_image"):sel.type==="video"?t("drag_canvas.type_video"):sel.type==="emoji"?t("drag_canvas.type_emoji"):t("drag_canvas.type_text")} {t("drag_canvas.params_suffix")}
                </p>
                <div className="flex gap-1">
                  <button onClick={() => reorder(sel.id, 1)} title={t("drag_canvas.action_top")} className="p-1 rounded text-white/40 hover:text-white/70"><ChevronUp className="w-3 h-3"/></button>
                  <button onClick={() => reorder(sel.id, -1)} title={t("drag_canvas.action_bottom")} className="p-1 rounded text-white/40 hover:text-white/70"><ChevronDown className="w-3 h-3"/></button>
                  <button onClick={() => duplicate(sel.id)} title={t("drag_canvas.action_dup")} className="p-1 rounded text-white/40 hover:text-white/70"><Copy className="w-3 h-3"/></button>
                  <button onClick={() => update(sel.id, {locked:!sel.locked})} title={t("drag_canvas.action_lock")} className={`p-1 rounded ${sel.locked?"text-amber-400":"text-white/40"} hover:text-white/70`}>
                    {sel.locked ? <Lock className="w-3 h-3"/> : <Unlock className="w-3 h-3"/>}
                  </button>
                  <button onClick={() => del(sel.id)} title={t("drag_canvas.action_delete")} className="p-1 rounded text-red-400/70 hover:text-red-400"><Trash2 className="w-3 h-3"/></button>
                  <button onClick={()=>update(sel.id,{rotation:0})} title={t("drag_canvas.action_reset_rotation")} className="p-1 rounded text-white/40 hover:text-white/70"><RotateCcw className="w-3 h-3"/></button>
                </div>
              </div>

              {/* Opacity */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-white/40 w-12">{t("drag_canvas.opacity_label")}</span>
                <input type="range" min={0.05} max={1} step={0.05} value={sel.opacity} onChange={e=>update(sel.id,{opacity:Number(e.target.value)})}
                  className="flex-1" style={{accentColor:"#a78bfa"}}/>
                <span className="text-[9px] font-bold text-violet-300 w-8 text-right">{Math.round(sel.opacity*100)}%</span>
              </div>

              {/* Rotation */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-white/40 w-12">{t("drag_canvas.rotation_label")}</span>
                <input type="range" min={-180} max={180} step={1} value={sel.rotation} onChange={e=>update(sel.id,{rotation:Number(e.target.value)})}
                  className="flex-1" style={{accentColor:"#a78bfa"}}/>
                <span className="text-[9px] font-bold text-violet-300 w-8 text-right">{Math.round(sel.rotation)}°</span>
              </div>

              {/* Flip */}
              <div className="flex gap-2">
                <button onClick={()=>update(sel.id,{flipH:!sel.flipH})}
                  className="flex-1 py-1 rounded-lg text-[9px] font-bold transition-all"
                  style={{ background:sel.flipH?"rgba(167,139,250,0.2)":"rgba(255,255,255,0.06)", border:sel.flipH?"1px solid rgba(167,139,250,0.5)":"1px solid rgba(255,255,255,0.1)", color:sel.flipH?"#c4b5fd":"rgba(255,255,255,0.45)" }}>
                  {t("drag_canvas.flip_h")}
                </button>
                <button onClick={()=>update(sel.id,{flipV:!sel.flipV})}
                  className="flex-1 py-1 rounded-lg text-[9px] font-bold transition-all"
                  style={{ background:sel.flipV?"rgba(167,139,250,0.2)":"rgba(255,255,255,0.06)", border:sel.flipV?"1px solid rgba(167,139,250,0.5)":"1px solid rgba(255,255,255,0.1)", color:sel.flipV?"#c4b5fd":"rgba(255,255,255,0.45)" }}>
                  {t("drag_canvas.flip_v")}
                </button>
              </div>

              {/* Filter (image/video only) */}
              {(sel.type==="image"||sel.type==="video") && (
                <div>
                  <p className="text-[9px] text-white/40 mb-1">{t("drag_canvas.filter_label")}</p>
                  <div className="flex flex-wrap gap-1">
                    {FILTERS.map(f => (
                      <button key={f.id} onClick={()=>update(sel.id,{filter:f.id})}
                        className="px-2 py-0.5 rounded-lg text-[8px] font-bold transition-all"
                        style={{ background:sel.filter===f.id?"rgba(167,139,250,0.25)":"rgba(255,255,255,0.06)", border:sel.filter===f.id?"1px solid rgba(167,139,250,0.6)":"1px solid rgba(255,255,255,0.08)", color:sel.filter===f.id?"#c4b5fd":"rgba(255,255,255,0.4)" }}>
                        {t(f.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Text controls */}
              {sel.type==="text" && (
                <div className="space-y-1.5">
                  <input value={sel.text ?? ""} onChange={e=>update(sel.id,{text:e.target.value})}
                    className="w-full rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                    style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)" }}/>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className="text-[9px] text-white/40">{t("drag_canvas.size_label")}</span>
                      <input type="range" min={10} max={80} value={sel.fontSize??22} onChange={e=>update(sel.id,{fontSize:Number(e.target.value)})}
                        className="flex-1" style={{accentColor:"#a78bfa"}}/>
                      <span className="text-[9px] text-violet-300">{sel.fontSize}px</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {FONTS.map(f => (
                      <button key={f} onClick={()=>update(sel.id,{fontFamily:f})}
                        className="px-1.5 py-0.5 rounded text-[8px] transition-all"
                        style={{ fontFamily:f, background:sel.fontFamily===f?"rgba(167,139,250,0.2)":"rgba(255,255,255,0.05)", border:sel.fontFamily===f?"1px solid rgba(167,139,250,0.5)":"1px solid rgba(255,255,255,0.07)", color:sel.fontFamily===f?"#c4b5fd":"rgba(255,255,255,0.4)" }}>
                        {f.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-[9px] text-white/40">{t("drag_canvas.color_label")}</span>
                    {["#ffffff","#000000","#f87171","#fbbf24","#34d399","#60a5fa","#a78bfa","#f472b6","#fb923c","#22d3ee","#84cc16","#e879f9"].map(c => (
                      <button key={c} onClick={()=>update(sel.id,{color:c})}
                        className="w-4 h-4 rounded-full border-2 transition-all"
                        style={{ background:c, borderColor:sel.color===c?"white":"transparent" }}/>
                    ))}
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-[9px] text-white/40">{t("drag_canvas.bg_label")}</span>
                    {["transparent","rgba(0,0,0,0.7)","rgba(255,255,255,0.9)","rgba(124,58,237,0.85)","rgba(220,38,38,0.85)"].map(c => (
                      <button key={c} onClick={()=>update(sel.id,{bgColor:c})}
                        className="w-5 h-4 rounded border-2 transition-all text-[7px] flex items-center justify-center"
                        style={{ background:c==="transparent"?"repeating-conic-gradient(rgba(255,255,255,0.2) 0% 25%, transparent 0% 50%) 0 0 / 6px 6px":c, borderColor:sel.bgColor===c?"white":"rgba(255,255,255,0.2)" }}>
                        {c==="transparent"&&<span className="text-white/50">×</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Emoji size */}
              {sel.type==="emoji" && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-white/40 w-12">{t("drag_canvas.size_label")}</span>
                  <input type="range" min={20} max={120} value={sel.fontSize??48} onChange={e=>update(sel.id,{fontSize:Number(e.target.value)})}
                    className="flex-1" style={{accentColor:"#a78bfa"}}/>
                  <span className="text-[9px] text-violet-300 w-8 text-right">{sel.fontSize}px</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
