import * as THREE from "three";

const VERT = /* glsl */ `
uniform float uTime;
uniform float uDisplace;
varying vec2  vUv;
varying vec3  vNormal;
varying vec3  vViewPos;

void main() {
  vUv    = uv;
  vNormal = normalize(normalMatrix * normal);
  vec3 pos = position + normal * sin(uTime * 2.0 + position.y * 4.0) * uDisplace;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vViewPos = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform vec3  uColor;
uniform float uOpacity;
uniform float uScanline;

varying vec2  vUv;
varying vec3  vNormal;
varying vec3  vViewPos;

void main() {
  float scan = pow(sin(vUv.y * 120.0 + uTime * 6.0) * 0.5 + 0.5, 3.0) * uScanline;
  vec3  vDir   = normalize(vViewPos);
  float fresnel = pow(1.0 - abs(dot(vNormal, vDir)), 2.5);
  float flicker = sin(uTime * 80.0) * 0.015 + 0.985;
  vec3  col  = uColor + uColor * scan * 0.4 + uColor * fresnel * 0.9;
  float a    = (uOpacity + fresnel * 0.35 + scan * 0.12) * flicker;
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
}`;

const PARTICLE_VERT = /* glsl */ `
uniform float uTime;
attribute float aOffset;
attribute float aSpeed;
varying float vAlpha;

void main() {
  vec3 pos = position;
  pos.y = mod(pos.y + uTime * aSpeed * 0.5, 14.0) - 7.0;
  vAlpha = 0.3 + 0.7 * sin(uTime * 2.0 + aOffset);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = 2.0 * (10.0 / -mv.z);
  gl_Position  = projectionMatrix * mv;
}`;

const PARTICLE_FRAG = /* glsl */ `
varying float vAlpha;
uniform vec3 uColor;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  gl_FragColor = vec4(uColor, vAlpha * (1.0 - d));
}`;

const AXIS_VERT = /* glsl */ `
varying vec3 vColor;
attribute vec3 aColor;
void main() {
  vColor = aColor;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const AXIS_FRAG = /* glsl */ `
varying vec3 vColor;
void main() { gl_FragColor = vec4(vColor, 0.7); }`;

function hologramMaterial(color: THREE.Color, opacity = 0.55, scanline = 0.6, displace = 0.015): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime:     { value: 0 },
      uColor:    { value: color },
      uOpacity:  { value: opacity },
      uScanline: { value: scanline },
      uDisplace: { value: displace },
    },
  });
}

export interface HologramRendererOptions {
  scene: THREE.Scene;
  primaryColor?: number;
}

export class HologramRenderer {
  private scene: THREE.Scene;
  private materials: THREE.ShaderMaterial[] = [];
  private meshes: THREE.Object3D[] = [];
  private particles: THREE.Points | null = null;
  private particleMat: THREE.ShaderMaterial | null = null;
  private axisGroup: THREE.Group | null = null;

  constructor(opts: HologramRendererOptions) {
    this.scene = opts.scene;
    const primary = new THREE.Color(opts.primaryColor ?? 0x00e5ff);

    this.buildAxes();
    this.buildFloatingPanels(primary);
    this.buildWireframes(primary);
    this.buildParticles(primary);
    this.buildGilosAILogo(primary);
  }

  private buildAxes() {
    const positions: number[] = [];
    const colors: number[]    = [];
    const axisData: [number, number, number, number, number, number, number, number, number][] = [
      [0,0,0, 3,0,0, 1,0.15,0.15],
      [0,0,0, 0,3,0, 0.15,1,0.15],
      [0,0,0, 0,0,3, 0.15,0.15,1],
    ];
    axisData.forEach(([x0,y0,z0,x1,y1,z1,r,g,b]) => {
      positions.push(x0,y0,z0, x1,y1,z1);
      colors.push(r,g,b, r,g,b);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("aColor",   new THREE.Float32BufferAttribute(colors, 3));
    const mat = new THREE.ShaderMaterial({
      vertexShader: AXIS_VERT, fragmentShader: AXIS_FRAG,
      transparent: true, depthWrite: false, vertexColors: false,
    });
    const axes = new THREE.LineSegments(geo, mat);
    axes.position.set(-1.5, -1.5, -1.5);
    this.scene.add(axes);
    this.axisGroup = new THREE.Group();
  }

  private buildFloatingPanels(color: THREE.Color) {
    const panels: Array<{ pos: [number, number, number]; rot: [number, number, number]; scale: [number, number] }> = [
      { pos: [-3.5, 1.5, -3], rot: [0,  0.4, 0.05], scale: [2.5, 1.4] },
      { pos: [ 3.5, 0.8, -2], rot: [0, -0.4, -0.03], scale: [2.2, 1.2] },
      { pos: [ 0,   2.5, -4], rot: [0.1, 0, 0],      scale: [3.5, 1.6] },
      { pos: [-2.5,-1.8, -3], rot: [0.05, 0.3, 0],   scale: [1.8, 1.0] },
      { pos: [ 2.8,-1.5, -3], rot: [-0.05,-0.3,0],   scale: [2.0, 1.1] },
    ];

    panels.forEach(({ pos, rot, scale }, i) => {
      const geo = new THREE.PlaneGeometry(scale[0], scale[1]);
      const mat = hologramMaterial(color, 0.3 + i * 0.04, 0.5, 0);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...pos);
      mesh.rotation.set(...rot);
      mesh.userData["floatOffset"] = i * 1.2;
      this.scene.add(mesh);
      this.materials.push(mat);
      this.meshes.push(mesh);

      const edgeGeo = new THREE.EdgesGeometry(geo);
      const edgeMat = new THREE.LineBasicMaterial({
        color, transparent: true, opacity: 0.9, depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const edges = new THREE.LineSegments(edgeGeo, edgeMat);
      mesh.add(edges);
    });
  }

  private buildWireframes(color: THREE.Color) {
    const shapes: THREE.BufferGeometry[] = [
      new THREE.IcosahedronGeometry(0.9, 1),
      new THREE.OctahedronGeometry(0.7, 0),
      new THREE.TorusGeometry(0.8, 0.2, 8, 24),
      new THREE.TetrahedronGeometry(0.8, 0),
    ];
    const positions: [number,number,number][] = [
      [-4.5,  0, -5],
      [ 4.5,  0.5, -4],
      [ 0,   -2.5, -4],
      [-1.5,  3,   -5],
    ];
    const rotSpeeds: [number,number,number][] = [
      [0.003, 0.007, 0.002],
      [0.005, 0.003, 0.008],
      [0.004, 0.006, 0.001],
      [0.002, 0.005, 0.007],
    ];

    shapes.forEach((geo, i) => {
      const mat = hologramMaterial(color, 0.15, 0.8, 0.02);
      const mesh = new THREE.Mesh(geo, mat);
      const wireGeo = new THREE.WireframeGeometry(geo);
      const wireMat = new THREE.LineBasicMaterial({
        color, transparent: true, opacity: 0.7,
        depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const wire = new THREE.LineSegments(wireGeo, wireMat);
      mesh.add(wire);
      mesh.position.set(...positions[i]);
      mesh.userData["rotSpeed"] = rotSpeeds[i];
      this.scene.add(mesh);
      this.materials.push(mat);
      this.meshes.push(mesh);
    });
  }

  private buildParticles(color: THREE.Color) {
    const N = 600;
    const positions = new Float32Array(N * 3);
    const offsets   = new Float32Array(N);
    const speeds    = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      positions[i*3  ] = (Math.random() - 0.5) * 20;
      positions[i*3+1] = (Math.random() - 0.5) * 14;
      positions[i*3+2] = (Math.random() - 0.5) * 10 - 2;
      offsets[i] = Math.random() * Math.PI * 2;
      speeds[i]  = 0.2 + Math.random() * 0.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("aOffset",  new THREE.Float32BufferAttribute(offsets, 1));
    geo.setAttribute("aSpeed",   new THREE.Float32BufferAttribute(speeds, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERT, fragmentShader: PARTICLE_FRAG,
      transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uColor: { value: color } },
    });
    this.particles = new THREE.Points(geo, mat);
    this.particleMat = mat;
    this.scene.add(this.particles);
  }

  private buildGilosAILogo(color: THREE.Color) {
    const group = new THREE.Group();
    const ringGeo = new THREE.TorusGeometry(1.2, 0.04, 8, 64);
    const ringMat = hologramMaterial(color, 0.7, 0.4, 0.01);
    group.add(new THREE.Mesh(ringGeo, ringMat));
    this.materials.push(ringMat);

    const innerGeo = new THREE.TorusGeometry(0.8, 0.025, 6, 48);
    const innerMat = hologramMaterial(color, 0.5, 0.3, 0.008);
    group.add(new THREE.Mesh(innerGeo, innerMat));
    this.materials.push(innerMat);

    const spokeGeo = new THREE.CylinderGeometry(0.015, 0.015, 2.4, 6);
    for (let i = 0; i < 3; i++) {
      const spokeMat = hologramMaterial(color, 0.4, 0.0, 0.0);
      const spoke = new THREE.Mesh(spokeGeo, spokeMat);
      spoke.rotation.z = (i * Math.PI) / 3;
      group.add(spoke);
      this.materials.push(spokeMat);
    }

    const orbitGeo = new THREE.SphereGeometry(0.07, 8, 8);
    const orbitMat = hologramMaterial(color, 0.9, 0.2, 0.0);
    const orbit = new THREE.Mesh(orbitGeo, orbitMat);
    orbit.userData["isOrbit"] = true;
    group.add(orbit);
    this.materials.push(orbitMat);

    group.position.set(0, 0.2, -6);
    group.scale.setScalar(0.9);
    group.userData["isLogo"] = true;
    this.scene.add(group);
    this.meshes.push(group);
  }

  update(time: number) {
    const t = time * 0.001;

    this.materials.forEach((m) => {
      m.uniforms["uTime"].value = t;
    });
    if (this.particleMat) {
      this.particleMat.uniforms["uTime"].value = t;
    }

    this.meshes.forEach((obj) => {
      if (obj.userData["floatOffset"] !== undefined) {
        const offset = obj.userData["floatOffset"] as number;
        obj.position.y += Math.sin(t * 0.8 + offset) * 0.0008;
      }
      if (obj.userData["rotSpeed"]) {
        const [rx, ry, rz] = obj.userData["rotSpeed"] as [number, number, number];
        obj.rotation.x += rx;
        obj.rotation.y += ry;
        obj.rotation.z += rz;
      }
      if (obj.userData["isLogo"]) {
        obj.rotation.y = t * 0.4;
        obj.children.forEach((child) => {
          if (child.userData["isOrbit"]) {
            child.position.x = Math.cos(t * 2.0) * 1.2;
            child.position.z = Math.sin(t * 2.0) * 1.2;
            child.position.y = Math.sin(t * 1.3) * 0.3;
          }
        });
      }
    });
  }

  dispose() {
    this.materials.forEach((m) => m.dispose());
    this.particleMat?.dispose();
    this.scene.clear();
  }
}
