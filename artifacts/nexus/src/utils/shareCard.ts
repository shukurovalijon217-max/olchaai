export interface ShareCardData {
  authorName: string;
  content: string;
  mediaUrl?: string;
  type?: string;
  likesCount?: number;
  commentsCount?: number;
  tags?: string[];
}

const W = 600;
const H = 380;

export async function generateShareCard(data: ShareCardData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#0c0c18";
  ctx.fillRect(0, 0, W, H);

  const bg = ctx.createRadialGradient(80, 80, 0, W * 0.45, H * 0.45, W * 0.75);
  bg.addColorStop(0, "rgba(124,58,237,0.28)");
  bg.addColorStop(0.55, "rgba(59,130,246,0.12)");
  bg.addColorStop(1, "transparent");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  if (data.mediaUrl && data.type !== "video") {
    try {
      const img = await loadImg(data.mediaUrl);
      ctx.save();
      ctx.globalAlpha = 0.16;
      const s = Math.max(W / img.width, H / img.height);
      ctx.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);
      ctx.restore();
      ctx.fillStyle = "rgba(0,0,0,0.58)";
      ctx.fillRect(0, 0, W, H);
    } catch { /* silent */ }
  }

  const lineGrad = ctx.createLinearGradient(0, 0, W, 0);
  lineGrad.addColorStop(0, "#7c3aed");
  lineGrad.addColorStop(0.38, "#d97706");
  lineGrad.addColorStop(1, "#3b82f6");
  ctx.fillStyle = lineGrad;
  ctx.fillRect(0, 0, W, 4);

  ctx.font = "bold 21px -apple-system,system-ui,sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.fillText(data.authorName, 28, 56);

  ctx.font = "13px -apple-system,system-ui,sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.fillText("@" + data.authorName.toLowerCase().replace(/\s+/g, "_") + " • gilos.ai", 28, 78);

  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.fillRect(28, 92, W - 56, 1);

  ctx.font = "15px -apple-system,system-ui,sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  const lines = wrapText(ctx, data.content, W - 56);
  let y = 118;
  for (const line of lines.slice(0, 7)) {
    ctx.fillText(line, 28, y);
    y += 25;
  }
  if (lines.length > 7) {
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillText("…", 28, y);
  }

  if (data.tags && data.tags.length > 0) {
    ctx.font = "12px -apple-system,system-ui,sans-serif";
    ctx.fillStyle = "rgba(167,139,250,0.75)";
    ctx.fillText(data.tags.slice(0, 4).map(t => `#${t}`).join("  "), 28, H - 72);
  }

  ctx.fillStyle = "rgba(255,255,255,0.06)";
  drawRoundRect(ctx, 28, H - 52, 150, 30, 8);
  ctx.fill();
  ctx.font = "13px -apple-system,system-ui,sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText(`❤️ ${data.likesCount ?? 0}   💬 ${data.commentsCount ?? 0}`, 42, H - 31);

  ctx.textAlign = "right";
  ctx.font = "bold 19px -apple-system,system-ui,sans-serif";
  ctx.fillStyle = "#d97706";
  ctx.fillText("GILOS", W - 28, H - 31);

  ctx.font = "10px -apple-system,system-ui,sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillText("gilos.ai", W - 28, H - 14);

  return new Promise(res => canvas.toBlob(b => res(b!), "image/png"));
}

export function downloadShareCard(blob: Blob, filename = "gilos-post.png") {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyShareCard(blob: Blob): Promise<boolean> {
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  } catch {
    return false;
  }
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, fail) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => ok(img);
    img.onerror = fail;
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
