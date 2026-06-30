import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Undo2, Download, PenLine, Eraser, Minus, Circle } from "lucide-react";

interface DrawingCanvasProps {
  onSend: (blob: Blob, dataUrl: string) => void;
  onClose: () => void;
}

const COLORS = [
  "#ffffff", "#f87171", "#fb923c", "#fbbf24", "#4ade80",
  "#34d399", "#22d3ee", "#60a5fa", "#a78bfa", "#f472b6",
  "#000000", "#64748b",
];
const BRUSH_SIZES = [2, 4, 8, 14, 22];

type Tool = "pen" | "eraser" | "line" | "circle";

export default function DrawingCanvas({ onSend, onClose }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(4);
  const [tool, setTool] = useState<Tool>("pen");
  const [drawing, setDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const startPos = useRef({ x: 0, y: 0 });
  const snapshotRef = useRef<ImageData | null>(null);

  const getCtx = () => {
    const c = canvasRef.current;
    return c ? c.getContext("2d") : null;
  };

  const getPos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  useEffect(() => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }, []);

  const saveHistory = () => {
    const ctx = getCtx();
    if (!ctx) return;
    const snap = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    setHistory(prev => [...prev.slice(-20), snap]);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const pos = getPos(e);
    const ctx = getCtx();
    if (!ctx) return;
    saveHistory();
    startPos.current = pos;
    snapshotRef.current = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    setDrawing(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    if (tool === "pen" || tool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing) return;
    const pos = getPos(e);
    const ctx = getCtx();
    if (!ctx) return;

    if (tool === "pen") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = brushSize * 3;
      ctx.lineCap = "round";
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    } else if (tool === "line" || tool === "circle") {
      if (snapshotRef.current) {
        ctx.putImageData(snapshotRef.current, 0, 0);
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.beginPath();
      if (tool === "line") {
        ctx.moveTo(startPos.current.x, startPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else {
        const rx = Math.abs(pos.x - startPos.current.x) / 2;
        const ry = Math.abs(pos.y - startPos.current.y) / 2;
        const cx = startPos.current.x + (pos.x - startPos.current.x) / 2;
        const cy = startPos.current.y + (pos.y - startPos.current.y) / 2;
        ctx.ellipse(cx, cy, rx || 1, ry || 1, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  };

  const onPointerUp = () => {
    setDrawing(false);
    snapshotRef.current = null;
    getCtx()?.beginPath();
  };

  const handleUndo = useCallback(() => {
    const ctx = getCtx();
    if (!ctx || history.length === 0) return;
    const prev = history[history.length - 1];
    ctx.putImageData(prev, 0, 0);
    setHistory(h => h.slice(0, -1));
  }, [history]);

  const handleClear = () => {
    const ctx = getCtx();
    if (!ctx) return;
    saveHistory();
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  };

  const handleSend = () => {
    const c = canvasRef.current;
    if (!c) return;
    const dataUrl = c.toDataURL("image/png");
    c.toBlob(blob => {
      if (blob) onSend(blob, dataUrl);
    }, "image/png");
  };

  const TOOLS: { id: Tool; icon: React.ElementType; label: string }[] = [
    { id: "pen", icon: PenLine, label: "Qalem" },
    { id: "eraser", icon: Eraser, label: "O'chirg'ich" },
    { id: "line", icon: Minus, label: "Chiziq" },
    { id: "circle", icon: Circle, label: "Ellips" },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/80 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-shrink-0">
          <PenLine className="w-5 h-5 text-primary" />
          <span className="text-sm font-bold text-foreground flex-1">Kanvасda chiz</span>
          <button onClick={handleUndo} disabled={history.length === 0}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 disabled:opacity-30 transition-colors">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={handleClear}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Canvas area */}
        <div className="flex-1 flex items-center justify-center p-2 overflow-hidden">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ touchAction: "none" }}
            className="rounded-2xl w-full max-w-2xl max-h-full object-contain cursor-crosshair shadow-2xl"
          />
        </div>

        {/* Bottom toolbar */}
        <div className="flex-shrink-0 border-t border-white/10 px-4 py-3 space-y-3">
          {/* Tools + sizes row */}
          <div className="flex items-center gap-3">
            {/* Tool selector */}
            <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
              {TOOLS.map(t => (
                <button key={t.id} onClick={() => setTool(t.id)} title={t.label}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    tool === t.id ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                  }`}>
                  <t.icon className="w-4 h-4" />
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-white/10" />

            {/* Brush sizes */}
            <div className="flex items-center gap-2">
              {BRUSH_SIZES.map(s => (
                <button key={s} onClick={() => setBrushSize(s)}
                  className={`rounded-full transition-all flex-shrink-0 ${
                    brushSize === s ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : "opacity-50 hover:opacity-80"
                  }`}
                  style={{ width: Math.max(8, s * 1.5), height: Math.max(8, s * 1.5), background: color }}
                />
              ))}
            </div>
          </div>

          {/* Colors + Send row */}
          <div className="flex items-center gap-3">
            {/* Colors */}
            <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full flex-shrink-0 transition-all border-2 ${
                    color === c ? "border-white scale-110 shadow-lg" : "border-transparent scale-100 hover:scale-105"
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>

            {/* Send */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 flex-shrink-0 hover:opacity-90 transition-opacity shadow-lg">
              <Download className="w-4 h-4" />
              Yuborish
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
