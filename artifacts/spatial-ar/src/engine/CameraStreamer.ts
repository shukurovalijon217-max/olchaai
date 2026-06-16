export interface OrientationData {
  alpha: number;
  beta: number;
  gamma: number;
}

export type PermissionState = "idle" | "requesting" | "granted" | "denied" | "unavailable";

export interface CameraStreamerOptions {
  onOrientation?: (data: OrientationData) => void;
  onPermissionChange?: (state: PermissionState) => void;
}

export class CameraStreamer {
  private stream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private permissionState: PermissionState = "idle";
  private orientationHandler: ((e: DeviceOrientationEvent) => void) | null = null;
  private options: CameraStreamerOptions;

  constructor(options: CameraStreamerOptions = {}) {
    this.options = options;
  }

  get hasCamera(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  get hasGyroscope(): boolean {
    return "DeviceOrientationEvent" in window;
  }

  get isGranted(): boolean {
    return this.permissionState === "granted";
  }

  get currentState(): PermissionState {
    return this.permissionState;
  }

  private setPermission(state: PermissionState) {
    this.permissionState = state;
    this.options.onPermissionChange?.(state);
  }

  async requestCamera(videoEl: HTMLVideoElement): Promise<boolean> {
    if (!this.hasCamera) {
      this.setPermission("unavailable");
      return false;
    }

    this.videoEl = videoEl;
    this.setPermission("requesting");

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: "environment" },
        width:  { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 60, max: 60 },
      },
      audio: false,
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoEl.srcObject = this.stream;
      videoEl.setAttribute("playsinline", "true");
      videoEl.setAttribute("autoplay",    "true");
      videoEl.muted = true;
      await videoEl.play();
      this.setPermission("granted");
      this.startOrientation();
      return true;
    } catch (err: unknown) {
      const name = (err as Error)?.name ?? "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        this.setPermission("denied");
      } else {
        this.setPermission("unavailable");
      }
      return false;
    }
  }

  private startOrientation() {
    if (!this.hasGyroscope || !this.options.onOrientation) return;

    const handler = (e: DeviceOrientationEvent) => {
      this.options.onOrientation?.({
        alpha: e.alpha ?? 0,
        beta:  e.beta  ?? 0,
        gamma: e.gamma ?? 0,
      });
    };

    this.orientationHandler = handler;

    if (
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
        .requestPermission === "function"
    ) {
      (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> })
        .requestPermission()
        .then((permission) => {
          if (permission === "granted") {
            window.addEventListener("deviceorientation", handler, { passive: true });
          }
        })
        .catch(() => {});
    } else {
      window.addEventListener("deviceorientation", handler, { passive: true });
    }
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.videoEl) {
      this.videoEl.srcObject = null;
      this.videoEl = null;
    }
    if (this.orientationHandler) {
      window.removeEventListener("deviceorientation", this.orientationHandler);
      this.orientationHandler = null;
    }
    this.setPermission("idle");
  }
}
