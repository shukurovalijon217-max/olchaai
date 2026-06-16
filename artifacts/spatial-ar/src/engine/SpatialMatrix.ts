import * as THREE from "three";
import type { OrientationData } from "./CameraStreamer";

export interface SpatialMatrixOptions {
  canvas: HTMLCanvasElement;
  antialias?: boolean;
}

const DEG = Math.PI / 180;

export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

export class SpatialMatrix {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;

  private euler = new THREE.Euler();
  private quaternion = new THREE.Quaternion();
  private screenOrientation = 0;
  private mouseX = 0;
  private mouseY = 0;
  private targetMouseX = 0;
  private targetMouseY = 0;
  private hasRealOrientation = false;

  constructor(opts: SpatialMatrixOptions) {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    this.camera.position.set(0, 0, 5);

    this.renderer = new THREE.WebGLRenderer({
      canvas: opts.canvas,
      alpha: true,
      antialias: false,
      powerPreference: "default",
      failIfMajorPerformanceCaveat: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.resize();
    this.bindMouse(opts.canvas);
    this.bindOrientation();
  }

  private bindMouse(canvas: HTMLCanvasElement) {
    const onMove = (e: MouseEvent) => {
      if (this.hasRealOrientation) return;
      this.targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      this.targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onTouch = (e: TouchEvent) => {
      if (this.hasRealOrientation) return;
      const t = e.touches[0];
      this.targetMouseX = (t.clientX / window.innerWidth - 0.5) * 2;
      this.targetMouseY = (t.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
  }

  private bindOrientation() {
    const handler = () => {
      this.screenOrientation = (window.screen?.orientation?.angle ?? 0);
    };
    window.addEventListener("orientationchange", handler, { passive: true });
    this.screenOrientation = (window.screen?.orientation?.angle ?? 0);
  }

  applyOrientation(data: OrientationData) {
    this.hasRealOrientation = true;

    const alpha = data.alpha * DEG;
    const beta  = data.beta  * DEG;
    const gamma = data.gamma * DEG;
    const orient = this.screenOrientation * DEG;

    this.euler.set(beta, alpha, -gamma, "YXZ");
    this.quaternion.setFromEuler(this.euler);

    const adjustQ = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      -orient
    );
    this.quaternion.multiply(adjustQ);

    const worldQ = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
    this.quaternion.multiply(worldQ);

    this.camera.quaternion.slerp(this.quaternion, 0.1);
  }

  updateMouse() {
    if (this.hasRealOrientation) return;
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;
    this.camera.rotation.y = -this.mouseX * 0.3;
    this.camera.rotation.x =  this.mouseY * 0.2;
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  render() {
    this.updateMouse();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.dispose();
  }
}
