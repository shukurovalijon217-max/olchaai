import { useRef, useEffect, useCallback, useState } from "react";
import { CameraStreamer, type PermissionState, type OrientationData } from "../engine/CameraStreamer";
import { SpatialMatrix, isWebGLAvailable } from "../engine/SpatialMatrix";
import { FrameOptimizer, type FrameStats } from "../engine/FrameOptimizer";
import { HologramRenderer } from "../engine/HologramRenderer";

export type ARMode = "ar" | "demo";

export interface AREngineState {
  mode: ARMode;
  permission: PermissionState;
  stats: FrameStats;
  ready: boolean;
  isMobile: boolean;
  webglAvailable: boolean;
}

export function useAREngine(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  _overlayRef?: React.RefObject<HTMLDivElement | null>,
) {
  const streamer   = useRef<CameraStreamer   | null>(null);
  const matrix     = useRef<SpatialMatrix    | null>(null);
  const optimizer  = useRef<FrameOptimizer   | null>(null);
  const hologram   = useRef<HologramRenderer | null>(null);
  const startTime  = useRef(performance.now());

  const webglAvailable = isWebGLAvailable();

  const [state, setState] = useState<AREngineState>({
    mode: "demo",
    permission: "idle",
    stats: { fps: 0, frameTime: 0, totalFrames: 0, dropped: 0 },
    ready: false,
    isMobile: /Mobi|Android|iPhone|iPad/.test(navigator.userAgent),
    webglAvailable,
  });

  const orientationBuffer = useRef<OrientationData | null>(null);

  const initEngine = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || matrix.current) return;

    if (!webglAvailable) {
      setState((prev) => ({ ...prev, ready: true }));
      return;
    }

    let mat: SpatialMatrix;
    try {
      mat = new SpatialMatrix({ canvas, antialias: false });
    } catch {
      setState((prev) => ({ ...prev, ready: true, webglAvailable: false }));
      return;
    }

    let holo: HologramRenderer;
    try {
      holo = new HologramRenderer({ scene: mat.scene });
    } catch {
      mat.dispose();
      setState((prev) => ({ ...prev, ready: true, webglAvailable: false }));
      return;
    }

    const opt = new FrameOptimizer();
    matrix.current   = mat;
    hologram.current = holo;
    optimizer.current = opt;

    const onResize = () => mat.resize();
    window.addEventListener("resize", onResize, { passive: true });

    opt.start((_delta, stats) => {
      if (orientationBuffer.current) {
        mat.applyOrientation(orientationBuffer.current);
        orientationBuffer.current = null;
      }
      const elapsed = performance.now() - startTime.current;
      holo.update(elapsed);
      mat.render();
      setState((prev) =>
        prev.stats.totalFrames !== stats.totalFrames ? { ...prev, stats } : prev
      );
    });

    setState((prev) => ({ ...prev, ready: true }));

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [canvasRef, webglAvailable]);

  const requestAR = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    if (!streamer.current) {
      streamer.current = new CameraStreamer({
        onOrientation: (data) => { orientationBuffer.current = data; },
        onPermissionChange: (perm) => {
          setState((prev) => ({
            ...prev,
            permission: perm,
            mode: perm === "granted" ? "ar" : "demo",
          }));
        },
      });
    }

    await streamer.current.requestCamera(video);
  }, [videoRef]);

  const skipToDemo = useCallback(() => {
    setState((prev) => ({ ...prev, permission: "denied", mode: "demo" }));
  }, []);

  useEffect(() => {
    const cleanup = initEngine();
    return () => {
      cleanup?.();
      streamer.current?.stop();
      optimizer.current?.stop();
      hologram.current?.dispose();
      matrix.current?.dispose();
      streamer.current  = null;
      matrix.current    = null;
      optimizer.current = null;
      hologram.current  = null;
    };
  }, [initEngine]);

  return { state, requestAR, skipToDemo };
}
