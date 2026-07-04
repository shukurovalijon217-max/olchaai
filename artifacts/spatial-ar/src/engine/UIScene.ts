import * as THREE from "three";

// ─── Canvas texture helpers ────────────────────────────────────────────────────

function c2d(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const el = document.createElement("canvas");
  el.width = w; el.height = h;
  return [el, el.getContext("2d")!];
}

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h,     x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y,         x + r, y);
  ctx.closePath();
}

function makePostCard(p: {
  user: string; text: string; likes: number; comments: number;
  avatarColor: string; tag: string;
}): THREE.CanvasTexture {
  const [cv, ctx] = c2d(512, 288);

  // BG
  rrect(ctx, 0, 0, 512, 288, 16);
  ctx.fillStyle = "rgba(0,8,26,0.93)";
  ctx.fill();

  // Border glow
  const bg = ctx.createLinearGradient(0, 0, 512, 288);
  bg.addColorStop(0,   "rgba(0,229,255,0.9)");
  bg.addColorStop(0.5, "rgba(0,140,255,0.5)");
  bg.addColorStop(1,   "rgba(0,229,255,0.9)");
  ctx.strokeStyle = bg;
  ctx.lineWidth = 2;
  rrect(ctx, 1, 1, 510, 286, 15);
  ctx.stroke();

  // Scanlines
  for (let y = 0; y < 288; y += 5) {
    ctx.fillStyle = "rgba(0,229,255,0.018)";
    ctx.fillRect(0, y, 512, 2);
  }

  // Top accent bar
  const accent = ctx.createLinearGradient(0, 0, 512, 0);
  accent.addColorStop(0,   "rgba(0,229,255,0.0)");
  accent.addColorStop(0.5, "rgba(0,229,255,0.5)");
  accent.addColorStop(1,   "rgba(0,229,255,0.0)");
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 512, 3);

  // Avatar circle
  ctx.beginPath();
  ctx.arc(52, 58, 30, 0, Math.PI * 2);
  const avatarGrad = ctx.createRadialGradient(44, 50, 0, 52, 58, 30);
  avatarGrad.addColorStop(0, p.avatarColor + "ff");
  avatarGrad.addColorStop(1, p.avatarColor + "aa");
  ctx.fillStyle = avatarGrad;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,229,255,0.7)";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Avatar initials
  const initials = p.user.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  ctx.font = "bold 18px Inter,system-ui,sans-serif";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials, 52, 58);

  // Username
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "bold 17px Inter,system-ui,sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(p.user, 96, 50);

  // Tag / time
  ctx.font = "13px Inter,system-ui,sans-serif";
  ctx.fillStyle = "rgba(0,229,255,0.75)";
  ctx.fillText(p.tag, 96, 70);

  // Divider
  ctx.strokeStyle = "rgba(0,229,255,0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(24, 96); ctx.lineTo(488, 96); ctx.stroke();

  // Post text (wrap)
  ctx.font = "15px Inter,system-ui,sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  let line = "", ty = 122;
  for (const word of p.text.split(" ")) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > 464 && line) {
      ctx.fillText(line.trim(), 28, ty);
      line = word + " "; ty += 23;
      if (ty > 178) { ctx.fillText("…", 28, ty); break; }
    } else { line = test; }
  }
  if (ty <= 178) ctx.fillText(line.trim(), 28, ty);

  // Divider 2
  ctx.strokeStyle = "rgba(0,229,255,0.18)";
  ctx.beginPath(); ctx.moveTo(24, 204); ctx.lineTo(488, 204); ctx.stroke();

  // Actions row
  const actions: [string, string | number, string][] = [
    ["♥", p.likes, "#ff6b9d"],
    ["◎", p.comments, "rgba(0,229,255,0.85)"],
    ["↗", "Ulash", "rgba(255,255,255,0.35)"],
  ];
  let ax = 30;
  for (const [ic, val, col] of actions) {
    ctx.font = "bold 15px Inter,system-ui,sans-serif";
    ctx.fillStyle = col;
    ctx.fillText(`${ic} ${val}`, ax, 234);
    ax += 130;
  }

  // Corner accent dot
  ctx.beginPath();
  ctx.arc(496, 16, 5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,229,255,0.8)";
  ctx.fill();

  return new THREE.CanvasTexture(cv);
}

function makeMenuButton(icon: string, label: string, color: string): THREE.CanvasTexture {
  const [cv, ctx] = c2d(256, 256);

  // Outer glow
  const og = ctx.createRadialGradient(128, 128, 60, 128, 128, 128);
  og.addColorStop(0, color + "22"); og.addColorStop(1, "transparent");
  ctx.fillStyle = og; ctx.fillRect(0, 0, 256, 256);

  // Main circle BG
  ctx.beginPath(); ctx.arc(128, 128, 100, 0, Math.PI * 2);
  const bg = ctx.createRadialGradient(108, 108, 0, 128, 128, 100);
  bg.addColorStop(0, "rgba(0,20,50,0.95)");
  bg.addColorStop(1, "rgba(0,8,24,0.98)");
  ctx.fillStyle = bg; ctx.fill();

  // Outer ring
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();

  // Inner ring
  ctx.beginPath(); ctx.arc(128, 128, 82, 0, Math.PI * 2);
  ctx.strokeStyle = color + "33"; ctx.lineWidth = 1; ctx.stroke();

  // Icon
  ctx.font = "56px serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(icon, 128, 110);

  // Label
  ctx.font = "bold 20px Inter,system-ui,sans-serif";
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(label, 128, 165);

  return new THREE.CanvasTexture(cv);
}

function makeProfileBubble(name: string, color: string, followers: number): THREE.CanvasTexture {
  const [cv, ctx] = c2d(256, 256);

  // Glow aura
  const glow = ctx.createRadialGradient(128, 128, 60, 128, 128, 128);
  glow.addColorStop(0, color + "44"); glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 256, 256);

  // Avatar base
  ctx.beginPath(); ctx.arc(128, 128, 88, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(110, 110, 0, 128, 128, 88);
  grad.addColorStop(0, color); grad.addColorStop(1, color + "cc");
  ctx.fillStyle = grad; ctx.fill();

  // Cyan ring
  ctx.strokeStyle = "rgba(0,229,255,0.85)"; ctx.lineWidth = 4; ctx.stroke();

  // Pulse ring
  ctx.beginPath(); ctx.arc(128, 128, 100, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0,229,255,0.2)"; ctx.lineWidth = 1; ctx.stroke();

  // Initials
  const init = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  ctx.font = "bold 50px Inter,system-ui,sans-serif";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(init, 128, 112);

  // First name
  ctx.font = "bold 18px Inter,system-ui,sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(name.split(" ")[0], 128, 168);

  // Followers
  ctx.font = "13px Inter,system-ui,sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  const fmt = followers >= 1000 ? `${(followers / 1000).toFixed(1)}K` : `${followers}`;
  ctx.fillText(`${fmt} ta`, 128, 188);

  return new THREE.CanvasTexture(cv);
}

function makeGlowSprite(color: THREE.Color): THREE.Sprite {
  const [cv, ctx] = c2d(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0,   `rgba(${Math.round(color.r*255)},${Math.round(color.g*255)},${Math.round(color.b*255)},0.6)`);
  g.addColorStop(0.5, `rgba(${Math.round(color.r*255)},${Math.round(color.g*255)},${Math.round(color.b*255)},0.2)`);
  g.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  const mat = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(cv),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  return new THREE.Sprite(mat);
}

// ─── Spring animation helper ───────────────────────────────────────────────────

interface Spring {
  obj: THREE.Object3D;
  baseY: number;
  scale: number; scaleV: number; scaleTarget: number;
  glow: number;  glowV: number;  glowTarget: number;
  glowSprite: THREE.Sprite | null;
  phase: number; amp: number; speed: number;
}

function createSpring(obj: THREE.Object3D, baseY: number, phase: number, amp = 0.04, speed = 0.6): Spring {
  return { obj, baseY, scale: 1, scaleV: 0, scaleTarget: 1, glow: 0, glowV: 0, glowTarget: 0, glowSprite: null, phase, amp, speed };
}

const SPRING_K = 0.18, SPRING_D = 0.72;
const GLOW_K   = 0.12, GLOW_D   = 0.8;

function tickSpring(s: Spring, elapsed: number) {
  // Scale spring
  const sf = s.scaleTarget - s.scale;
  s.scaleV = s.scaleV * SPRING_D + sf * SPRING_K;
  s.scale += s.scaleV;

  // Glow spring
  const gf = s.glowTarget - s.glow;
  s.glowV = s.glowV * GLOW_D + gf * GLOW_K;
  s.glow += s.glowV;

  // Float
  const t = elapsed * 0.001;
  const floatY = Math.sin(t * s.speed + s.phase) * s.amp;
  s.obj.position.y = s.baseY + floatY;
  s.obj.scale.setScalar(s.scale);

  if (s.glowSprite) {
    s.glowSprite.material.opacity = s.glow * 0.7;
    s.glowSprite.scale.setScalar(s.scale * 1.8 + s.glow * 0.5);
  }
}

// ─── Ripple ───────────────────────────────────────────────────────────────────

interface Ripple {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; t: number;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const POSTS = [
  { id: "post-1", user: "Sardor M.",  text: "OlchaAI platformasi juda zo'r! 3D hologram interfeys orqali postlarim ko'rinishi hayratlanarli 🚀", likes: 142, comments: 28, avatarColor: "#ff6b6b", tag: "2 daqiqa oldin" },
  { id: "post-2", user: "Zulfiya K.", text: "AR kamera rejimi yoqildi! Xona ichida uchib yurgan postlarni ko'ryapman 😮‍💨✨", likes: 89, comments: 15, avatarColor: "#4ecdc4", tag: "5 daqiqa oldin" },
  { id: "post-3", user: "Bobur T.",   text: "Yangi story joylashdim 🔥 OlchaAI Live orqali minglab kishilar tomosha qilmoqda!", likes: 234, comments: 47, avatarColor: "#45b7d1", tag: "12 daqiqa oldin" },
  { id: "post-4", user: "Malika R.",  text: "Live stream boshlandi! Spatial AR muhitida efirga chiqish — bu kelajak! 🌐", likes: 56, comments: 12, avatarColor: "#96ceb4", tag: "18 daqiqa oldin" },
  { id: "post-5", user: "Jasur A.",   text: "OlchaAI Go real-time xizmati ishga tushdi. WebSocket orqali jonli yangilanishlar 💚", likes: 178, comments: 33, avatarColor: "#dda0dd", tag: "25 daqiqa oldin" },
];

const MENU_ITEMS = [
  { id: "menu-home",    icon: "🏠", label: "Bosh",    color: "#00e5ff" },
  { id: "menu-posts",   icon: "📝", label: "Postlar", color: "#00e5ff" },
  { id: "menu-story",   icon: "▶️", label: "Stories", color: "#ff6b9d" },
  { id: "menu-search",  icon: "🔍", label: "Qidirish",color: "#00e5ff" },
  { id: "menu-chat",    icon: "💬", label: "Chat",    color: "#4ecdc4" },
  { id: "menu-ar",      icon: "🥽", label: "AR",      color: "#a78bfa" },
  { id: "menu-notify",  icon: "🔔", label: "Bildirish",color: "#ffd93d" },
  { id: "menu-profile", icon: "👤", label: "Profil",  color: "#00e5ff" },
];

const PROFILES = [
  { id: "prof-1", name: "Sardor M.",  color: "#ff6b6b", followers: 1240 },
  { id: "prof-2", name: "Zulfiya K.", color: "#4ecdc4", followers: 892  },
  { id: "prof-3", name: "Bobur T.",   color: "#45b7d1", followers: 3100 },
  { id: "prof-4", name: "Malika R.",  color: "#96ceb4", followers: 567  },
  { id: "prof-5", name: "Jasur A.",   color: "#dda0dd", followers: 2340 },
  { id: "prof-6", name: "Kamola U.",  color: "#ffd93d", followers: 1890 },
];

// ─── Card layout ──────────────────────────────────────────────────────────────

const CARD_POSITIONS: [number, number, number, number][] = [
  // x,     y,     z,      ry (rotation.y)
  [-3.6,  0.8,  -3.0,   0.25],
  [ 3.5,  0.5,  -2.8,  -0.25],
  [-1.2, -1.2,  -2.4,   0.10],
  [ 1.0,  1.8,  -3.6,  -0.12],
  [ 0.0, -0.2,  -4.2,   0.0 ],
];

export interface HitInfo {
  id: string;
  type: "menu" | "post" | "profile";
  label: string;
}

export interface UISceneOptions {
  scene: THREE.Scene;
  onHit?: (info: HitInfo) => void;
}

// ─── UIScene ─────────────────────────────────────────────────────────────────

export class UIScene {
  private scene: THREE.Scene;
  private group: THREE.Group;
  private springs: Spring[] = [];
  private springMap = new Map<string, Spring>();
  private ripples: Ripple[] = [];
  private interactables: THREE.Object3D[] = [];
  private textures: THREE.Texture[] = [];
  private onHit?: (info: HitInfo) => void;

  // click bounce timers
  private bounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(opts: UISceneOptions) {
    this.scene  = opts.scene;
    this.group  = new THREE.Group();
    this.onHit  = opts.onHit;
    opts.scene.add(this.group);

    this.buildCircularMenu();
    this.buildPostCards();
    this.buildProfileBubbles();
  }

  // ── Circular Menu ─────────────────────────────────────────────────────────

  private buildCircularMenu() {
    const center = new THREE.Vector3(0, -2.3, -1.8);
    const R = 2.0;
    const N = MENU_ITEMS.length;

    const hub = new THREE.Group();
    hub.position.copy(center);
    this.group.add(hub);

    // Outer ring (decorative)
    const ringGeo = new THREE.TorusGeometry(R + 0.15, 0.012, 6, 80);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.25, depthWrite: false });
    hub.add(new THREE.Mesh(ringGeo, ringMat));

    // Inner ring
    const iRingGeo = new THREE.TorusGeometry(R - 0.15, 0.008, 6, 80);
    const iRingMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.12, depthWrite: false });
    hub.add(new THREE.Mesh(iRingGeo, iRingMat));

    // Hub center dot
    const hubGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const hubMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const hubMesh = new THREE.Mesh(hubGeo, hubMat);
    hub.add(hubMesh);

    MENU_ITEMS.forEach((item, i) => {
      const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * R;
      const y = Math.sin(angle) * R;

      const tex = makeMenuButton(item.icon, item.label, item.color);
      this.textures.push(tex);

      // Button disc
      const geo = new THREE.CircleGeometry(0.38, 32);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, 0.01);
      mesh.userData["uiId"]   = item.id;
      mesh.userData["uiType"] = "menu";
      mesh.userData["label"]  = item.label;
      hub.add(mesh);
      this.interactables.push(mesh);

      // Spoke line
      const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(x * 0.72, y * 0.72, 0)];
      const spokeGeo = new THREE.BufferGeometry().setFromPoints(points);
      const spokeMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.2, depthWrite: false });
      hub.add(new THREE.Line(spokeGeo, spokeMat));

      // Glow sprite
      const glow = makeGlowSprite(new THREE.Color(item.color));
      glow.position.set(x, y, 0);
      glow.scale.setScalar(0.9);
      glow.material.opacity = 0;
      hub.add(glow);

      const baseY = center.y + y;
      const sp = createSpring(mesh, mesh.position.y, i * 0.8, 0.025, 0.5 + i * 0.05);
      sp.glowSprite = glow;
      // override obj to be the mesh inside the hub (hub handles float separately)
      this.springs.push(sp);
      this.springMap.set(item.id, sp);
    });

    // Hub float spring
    const hubSp = createSpring(hub, center.y, 0, 0.06, 0.35);
    this.springs.push(hubSp);
    this.springMap.set("__hub__", hubSp);
  }

  // ── Post Cards ────────────────────────────────────────────────────────────

  private buildPostCards() {
    POSTS.forEach((post, i) => {
      const [px, py, pz, ry] = CARD_POSITIONS[i];

      const tex = makePostCard(post);
      this.textures.push(tex);

      const W = 2.4, H = 1.35;
      const geo = new THREE.PlaneGeometry(W, H);
      const mat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false,
      });
      const card = new THREE.Mesh(geo, mat);
      card.position.set(px, py, pz);
      card.rotation.y = ry;
      card.userData["uiId"]   = post.id;
      card.userData["uiType"] = "post";
      card.userData["label"]  = `${post.user}: ${post.text.slice(0, 30)}…`;
      this.group.add(card);
      this.interactables.push(card);

      // Border edges
      const edgeGeo = new THREE.EdgesGeometry(geo);
      const edgeMat = new THREE.LineBasicMaterial({
        color: 0x00e5ff, transparent: true, opacity: 0.6,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      card.add(new THREE.LineSegments(edgeGeo, edgeMat));

      // Glow sprite behind card
      const glow = makeGlowSprite(new THREE.Color(0x00e5ff));
      glow.position.set(px, py, pz - 0.1);
      glow.scale.setScalar(2.8);
      glow.material.opacity = 0;
      this.group.add(glow);

      const sp = createSpring(card, py, i * 1.1, 0.05, 0.45 + i * 0.08);
      sp.glowSprite = glow;
      this.springs.push(sp);
      this.springMap.set(post.id, sp);
    });
  }

  // ── Profile Bubbles ───────────────────────────────────────────────────────

  private buildProfileBubbles() {
    const orbitCenter = new THREE.Vector3(4.8, 1.2, -3.0);
    const R = 0.95;

    const hub = new THREE.Group();
    hub.position.copy(orbitCenter);
    this.group.add(hub);

    // Label "Online" tag
    const [lv, lc] = c2d(200, 48);
    lc.fillStyle = "rgba(0,8,24,0.9)";
    rrect(lc, 0, 0, 200, 48, 12); lc.fill();
    lc.strokeStyle = "rgba(0,229,255,0.5)"; lc.lineWidth = 1;
    rrect(lc, 0.5, 0.5, 199, 47, 12); lc.stroke();
    lc.font = "bold 16px Inter,system-ui,sans-serif";
    lc.fillStyle = "rgba(0,229,255,0.9)";
    lc.textAlign = "center"; lc.textBaseline = "middle";
    lc.fillText("● ONLINE FOYDALANUVCHILAR", 100, 24);
    const lTex = new THREE.CanvasTexture(lv);
    this.textures.push(lTex);
    const lMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.34),
      new THREE.MeshBasicMaterial({ map: lTex, transparent: true, side: THREE.DoubleSide, depthWrite: false })
    );
    lMesh.position.set(0, 1.4, 0);
    hub.add(lMesh);

    PROFILES.forEach((prof, i) => {
      const angle = (i / PROFILES.length) * Math.PI * 2;
      const x = Math.cos(angle) * R;
      const y = Math.sin(angle) * R;

      const tex = makeProfileBubble(prof.name, prof.color, prof.followers);
      this.textures.push(tex);

      const geo = new THREE.CircleGeometry(0.32, 32);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, 0);
      mesh.userData["uiId"]   = prof.id;
      mesh.userData["uiType"] = "profile";
      mesh.userData["label"]  = `${prof.name} · ${prof.followers} ta kuzatuvchi`;
      hub.add(mesh);
      this.interactables.push(mesh);

      // Glow sprite
      const glow = makeGlowSprite(new THREE.Color(prof.color));
      glow.position.set(x, y, 0);
      glow.scale.setScalar(0.75);
      glow.material.opacity = 0;
      hub.add(glow);

      const sp = createSpring(mesh, mesh.position.y, i * 1.05, 0.02, 0.6 + i * 0.07);
      sp.glowSprite = glow;
      this.springs.push(sp);
      this.springMap.set(prof.id, sp);
    });

    // Hub float
    const hubSp = createSpring(hub, orbitCenter.y, 2.0, 0.07, 0.28);
    this.springs.push(hubSp);
    this.springMap.set("__profiles__", hubSp);
  }

  // ── Ripple ────────────────────────────────────────────────────────────────

  private spawnRipple(position: THREE.Vector3) {
    const geo = new THREE.RingGeometry(0.05, 0.12, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff, transparent: true, opacity: 0.85,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.position.z += 0.05;
    this.group.add(mesh);
    this.ripples.push({ mesh, mat, t: 0 });

    // Second ring (delayed)
    const mat2 = mat.clone();
    const mesh2 = new THREE.Mesh(geo.clone(), mat2);
    mesh2.position.copy(mesh.position);
    this.group.add(mesh2);
    this.ripples.push({ mesh: mesh2, mat: mat2, t: -0.25 });
  }

  // ── Interaction API ───────────────────────────────────────────────────────

  onHover(id: string | null) {
    // All springs: reduce glow to 0 except hovered
    this.springMap.forEach((sp, key) => {
      if (key.startsWith("__")) return;
      sp.glowTarget  = (id === key) ? 0.6 : 0;
      sp.scaleTarget = (id === key) ? 1.08 : 1.0;
    });
  }

  onSelect(id: string) {
    const sp = this.springMap.get(id);
    if (!sp) return;

    const mesh = sp.obj as THREE.Mesh;
    this.spawnRipple(mesh.getWorldPosition(new THREE.Vector3()));

    // Scale bounce sequence
    sp.scaleTarget = 1.45;
    const prev = this.bounceTimers.get(id);
    if (prev) clearTimeout(prev);
    const t1 = setTimeout(() => { sp.scaleTarget = 0.92; }, 180);
    const t2 = setTimeout(() => { sp.scaleTarget = 1.0;  sp.glowTarget = 0; }, 380);
    this.bounceTimers.set(id, t1);
    setTimeout(() => this.bounceTimers.set(id, t2), 180);

    // Notify
    const type = mesh.userData["uiType"] as "menu" | "post" | "profile";
    const label = mesh.userData["label"] as string;
    this.onHit?.({ id, type, label });
  }

  getInteractables(): THREE.Object3D[] {
    return this.interactables;
  }

  // ── Update ────────────────────────────────────────────────────────────────

  update(elapsed: number) {
    const t = elapsed * 0.001;

    // Tick all springs
    this.springs.forEach((sp) => tickSpring(sp, elapsed));

    // Rotate profile hub slowly
    const profHub = this.springMap.get("__profiles__");
    if (profHub) (profHub.obj as THREE.Group).rotation.z = t * 0.1;

    // Rotate menu ring slowly
    const hub = this.springMap.get("__hub__");
    if (hub) (hub.obj as THREE.Group).rotation.z = t * 0.06;

    // Tick ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.t += 0.022;
      if (r.t < 0) continue;
      const prog = Math.min(r.t, 1);
      r.mesh.scale.setScalar(1 + prog * 3.5);
      r.mat.opacity = 0.85 * (1 - prog);
      if (prog >= 1) {
        this.group.remove(r.mesh);
        r.mesh.geometry.dispose();
        r.mat.dispose();
        this.ripples.splice(i, 1);
      }
    }
  }

  // ── Dispose ───────────────────────────────────────────────────────────────

  dispose() {
    this.bounceTimers.forEach((t) => clearTimeout(t));
    this.bounceTimers.clear();
    this.textures.forEach((t) => t.dispose());
    this.scene.remove(this.group);
  }
}
