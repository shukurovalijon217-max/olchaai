import * as THREE from "three";

export class Interactions {
  private raycaster = new THREE.Raycaster();
  private pointer   = new THREE.Vector2(-999, -999);
  private camera: THREE.Camera;
  private interactables: THREE.Object3D[];
  private hoverId: string | null = null;
  private onHover: (id: string | null) => void;
  private onSelect: (id: string) => void;
  private target: HTMLElement;

  private handlers: [string, EventListener, AddEventListenerOptions?][] = [];

  constructor(
    target: HTMLElement,
    camera: THREE.Camera,
    interactables: THREE.Object3D[],
    onHover: (id: string | null) => void,
    onSelect: (id: string) => void,
  ) {
    this.target = target;
    this.camera = camera;
    this.interactables = interactables;
    this.onHover  = onHover;
    this.onSelect = onSelect;

    this.register("pointermove", (e) => {
      const pe = e as PointerEvent;
      this.toNDC(pe.clientX, pe.clientY);
      this.check(false);
    }, { passive: true });

    this.register("pointerdown", (e) => {
      const pe = e as PointerEvent;
      this.toNDC(pe.clientX, pe.clientY);
      this.check(true);
    });

    this.register("touchstart", (e) => {
      const t = (e as TouchEvent).touches[0];
      if (!t) return;
      this.toNDC(t.clientX, t.clientY);
      this.check(true);
    }, { passive: true });
  }

  private register(type: string, fn: EventListener, opts?: AddEventListenerOptions) {
    this.target.addEventListener(type, fn, opts);
    this.handlers.push([type, fn, opts]);
  }

  private toNDC(cx: number, cy: number) {
    this.pointer.x =  (cx / window.innerWidth)  * 2 - 1;
    this.pointer.y = -(cy / window.innerHeight) * 2 + 1;
  }

  private check(isClick: boolean) {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactables, false);
    const id = (hits[0]?.object?.userData["uiId"] as string) ?? null;

    if (id !== this.hoverId) {
      this.hoverId = id;
      this.onHover(id);
    }
    if (isClick && id) this.onSelect(id);
  }

  updateInteractables(list: THREE.Object3D[]) {
    this.interactables = list;
  }

  updateCamera(camera: THREE.Camera) {
    this.camera = camera;
  }

  dispose() {
    this.handlers.forEach(([type, fn, opts]) =>
      this.target.removeEventListener(type, fn, opts)
    );
    this.handlers = [];
  }
}
