import { useState, useEffect, useRef, useCallback } from "react";

/* ─── useInView ──────────────────────────────────────────────────
   IntersectionObserver hook — fires once when element enters
   viewport + rootMargin, then disconnects (no wasted calls).
──────────────────────────────────────────────────────────────── */
function useInView(rootMargin = "300px") {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); io.disconnect(); }
    }, { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return { ref, inView };
}

/* ─── Shimmer ────────────────────────────────────────────────────
   Animated gradient that appears while media is loading.
──────────────────────────────────────────────────────────────── */
function Shimmer({ rounded = "" }: { rounded?: string }) {
  return (
    <div
      className={`absolute inset-0 ${rounded}`}
      style={{
        background:
          "linear-gradient(90deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.10) 40%,rgba(255,255,255,0.04) 80%)",
        backgroundSize: "300% 100%",
        animation: "media-shimmer 1.6s ease-in-out infinite",
      }}
    />
  );
}

/* ─── FastImage ──────────────────────────────────────────────────
   Lazy-loads the image only when it's 300 px from the viewport.
   Shows a shimmer skeleton first, then fades in the real image.
   Uses img.decode() to render off the main thread.
──────────────────────────────────────────────────────────────── */
export interface FastImageProps {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Load immediately without waiting for viewport proximity */
  priority?: boolean;
  objectFit?: "cover" | "contain" | "fill";
}

export function FastImage({
  src,
  alt = "",
  className = "",
  style,
  priority = false,
  objectFit = "cover",
}: FastImageProps) {
  const [loaded, setLoaded] = useState(false);
  const { ref, inView } = useInView("300px");
  const shouldLoad = priority || inView;

  const onLoad = useCallback(
    async (e: React.SyntheticEvent<HTMLImageElement>) => {
      try { await (e.currentTarget as HTMLImageElement).decode(); } catch { /* ok */ }
      setLoaded(true);
    },
    []
  );

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`} style={style}>
      {!loaded && <Shimmer />}
      {shouldLoad && src ? (
        <img
          src={src}
          alt={alt}
          onLoad={onLoad}
          onError={() => setLoaded(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit,
            display: "block",
            opacity: loaded ? 1 : 0,
            transition: "opacity 180ms ease",
          }}
        />
      ) : !src && (
        <div className="absolute inset-0 bg-white/5" />
      )}
    </div>
  );
}

/* ─── FastVideo ──────────────────────────────────────────────────
   For inline feed videos (PostCard).
   • Lazy: video element only created when 100 px from viewport
   • preload="metadata" — loads header + first frame only
   • Shows poster thumbnail instantly
   • Controls only visible after canplay
──────────────────────────────────────────────────────────────── */
export interface FastVideoProps {
  src: string | null | undefined;
  poster?: string | null;
  className?: string;
  style?: React.CSSProperties;
}

export function FastVideo({ src, poster, className = "", style }: FastVideoProps) {
  const { ref, inView } = useInView("150px");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`} style={style}>
      {loading && <Shimmer />}
      {poster && !ready && (
        <img
          src={poster}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
      {inView && src && (
        <video
          src={src}
          poster={poster ?? undefined}
          preload="metadata"
          controls
          muted
          playsInline
          onLoadedData={() => { setLoading(false); setReady(true); }}
          onCanPlay={() => { setLoading(false); setReady(true); }}
          onWaiting={() => setLoading(true)}
          onPlaying={() => setLoading(false)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: ready ? 1 : 0,
            transition: "opacity 200ms ease",
          }}
        />
      )}
    </div>
  );
}
