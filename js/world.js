// Builds the renderable campus: terrain, buildings, windows, props, trees, sky, lighting and collision.
import * as THREE from '../vendor/three.js';
import { buildCampus, BLD, GX, GZ, OX, OZ, BOUNDS, GTYPES, SPECIAL, LOTS } from './campus.js';
import { furnish } from './furnish.js';
import { PROPS } from './props.js';
import { Physics } from './physics.js';

/* ───────── geometry builder ───────── */
const _c = new THREE.Color(), _v = new THREE.Vector3(), _n = new THREE.Vector3(), _m3 = new THREE.Matrix3();
export class MB {
  constructor() { this.p = []; this.n = []; this.u = []; this.c = []; }
  quad(v, n, uv, col = WHITE) {
    for (const i of [0, 1, 2, 0, 2, 3]) {
      this.p.push(v[i * 3], v[i * 3 + 1], v[i * 3 + 2]); this.n.push(n[0], n[1], n[2]);
      this.u.push(uv[i * 2], uv[i * 2 + 1]); this.c.push(col[0], col[1], col[2]);
    }
  }
  // faces bitmask: 1 +x, 2 -x, 4 +y, 8 -y, 16 +z, 32 -z. s = uv scale (1/metres per tile)
  box(x0, y0, z0, x1, y1, z1, s = 1, col = WHITE, faces = 55) {
    if (faces & 1) this.quad([x1, y0, z1, x1, y0, z0, x1, y1, z0, x1, y1, z1], [1, 0, 0], [z1 * s, y0 * s, z0 * s, y0 * s, z0 * s, y1 * s, z1 * s, y1 * s], col);
    if (faces & 2) this.quad([x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0], [-1, 0, 0], [z0 * s, y0 * s, z1 * s, y0 * s, z1 * s, y1 * s, z0 * s, y1 * s], col);
    if (faces & 4) this.quad([x0, y1, z1, x1, y1, z1, x1, y1, z0, x0, y1, z0], [0, 1, 0], [x0 * s, z1 * s, x1 * s, z1 * s, x1 * s, z0 * s, x0 * s, z0 * s], col);
    if (faces & 8) this.quad([x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1], [0, -1, 0], [x0 * s, z0 * s, x1 * s, z0 * s, x1 * s, z1 * s, x0 * s, z1 * s], col);
    if (faces & 16) this.quad([x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1], [0, 0, 1], [x0 * s, y0 * s, x1 * s, y0 * s, x1 * s, y1 * s, x0 * s, y1 * s], col);
    if (faces & 32) this.quad([x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0], [0, 0, -1], [x1 * s, y0 * s, x0 * s, y0 * s, x0 * s, y1 * s, x1 * s, y1 * s], col);
  }
  geom(g, m, hex) {
    g = g.index ? g.toNonIndexed() : g;
    const P = g.attributes.position, N = g.attributes.normal;
    _c.set(hex); if (m) _m3.getNormalMatrix(m);
    for (let i = 0; i < P.count; i++) {
      _v.fromBufferAttribute(P, i); _n.fromBufferAttribute(N, i);
      if (m) { _v.applyMatrix4(m); _n.applyMatrix3(_m3).normalize(); }
      this.p.push(_v.x, _v.y, _v.z); this.n.push(_n.x, _n.y, _n.z); this.u.push(0, 0); this.c.push(_c.r, _c.g, _c.b);
    }
    g.dispose();
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}
const WHITE = [1, 1, 1];
const lin = (hex) => { _c.set(hex); return [_c.r, _c.g, _c.b]; };
const _mat = new THREE.Matrix4();

// Build one merged geometry from a prop's declarative parts (origin = bottom centre).
export function partsGeometry(parts) {
  const mb = new MB();
  for (const p of parts) {
    if (p[0] === 'b') { const [, w, h, d, x, y, z, c] = p; mb.box(x - w / 2, y, z - d / 2, x + w / 2, y + h, z + d / 2, 1, lin(c), 63); }
    else if (p[0] === 'c') { const [, r, h, x, y, z, c, rt, seg] = p; _mat.makeTranslation(x, y + h / 2, z); mb.geom(new THREE.CylinderGeometry(rt, r, h, seg), _mat, c); }
    else { const [, r, x, y, z, c] = p; _mat.makeTranslation(x, y, z); mb.geom(new THREE.IcosahedronGeometry(r, 1), _mat, c); }
  }
  return mb.build();
}

/* ───────── procedural textures ───────── */
function canvasTex(w, h, draw, srgb = true) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function speckle(g, w, h, n, colors, size = 2) { for (let i = 0; i < n; i++) { g.fillStyle = colors[(Math.random() * colors.length) | 0]; g.globalAlpha = 0.25 + Math.random() * 0.5; g.fillRect(Math.random() * w, Math.random() * h, size * (0.5 + Math.random()), size * (0.5 + Math.random())); } g.globalAlpha = 1; }
const T = {
  brick: () => canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#8f8676'; g.fillRect(0, 0, w, h);
    const rows = 24, bh = h / rows, bw = w / 8;
    for (let r = 0; r < rows; r++) for (let c = -1; c < 9; c++) {
      const v = 150 + Math.random() * 40, x = c * bw + (r % 2 ? bw / 2 : 0);
      g.fillStyle = `rgb(${v + 30},${v + 2},${v - 34})`; g.fillRect(x + 1.5, r * bh + 1.5, bw - 3, bh - 3);
    }
    speckle(g, w, h, 2500, ['#5e4a34', '#d9c2a0', '#a98b63'], 2);
  }),
  paint: () => canvasTex(64, 512, (g, w, h) => { // 8 m tall: v=0 is the floor (canvas bottom)
    g.fillStyle = '#e4dccb'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#35618f'; g.fillRect(0, h - 64, w, 58); g.fillStyle = '#cfd6de'; g.fillRect(0, h - 70, w, 6);
    g.fillStyle = '#2a2f36'; g.fillRect(0, h - 7, w, 7); speckle(g, w, h - 70, 300, ['#ddd5c4', '#f6f1e6'], 3);
  }),
  tile: () => canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d9d4c8'; g.fillRect(0, 0, w, h); speckle(g, w, h, 1800, ['#bdb6a6', '#efeadf', '#a9a393', '#35618f'], 2);
    g.strokeStyle = 'rgba(90,85,75,.45)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h); g.strokeRect(0, 0, w / 2, h / 2); g.strokeRect(w / 2, h / 2, w / 2, h / 2);
  }),
  carpet: () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#4a5f7d'; g.fillRect(0, 0, w, h); speckle(g, w, h, 9000, ['#3c4f6b', '#5b7193', '#33435b', '#6e83a3'], 2); }),
  vinyl: () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#e4e7e2'; g.fillRect(0, 0, w, h); speckle(g, w, h, 2200, ['#c9cfc8', '#f4f6f2', '#9fb3c8'], 2); g.strokeStyle = 'rgba(120,125,120,.35)'; g.strokeRect(0, 0, w, h); }),
  wood: () => canvasTex(256, 256, (g, w, h) => {
    for (let i = 0; i < 16; i++) { const v = 170 + Math.random() * 30; g.fillStyle = `rgb(${v + 30},${v - 10},${v - 80})`; g.fillRect(0, i * 16, w, 16); g.fillStyle = 'rgba(60,35,10,.35)'; g.fillRect(0, i * 16, w, 1); g.fillRect(((i * 97) % 256), i * 16, 1, 16); }
    speckle(g, w, h, 600, ['#8a5a20', '#e2b25c'], 3);
  }),
  conc: () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#b7b4ad'; g.fillRect(0, 0, w, h); speckle(g, w, h, 5000, ['#a19e97', '#c9c6bf', '#8d8a84'], 2); g.strokeStyle = 'rgba(70,70,70,.4)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h); }),
  cafe: () => canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? '#e9e4d6' : '#35618f'; g.fillRect(x * 128, y * 128, 128, 128); } speckle(g, w, h, 1200, ['#ffffff', '#1d3c5c'], 2); }),
  grass: () => canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#6f8f3e'; g.fillRect(0, 0, w, h); speckle(g, w, h, 26000, ['#5c7a30', '#84a34b', '#4f6c2a', '#93ad55', '#a39a4a', '#b9863a'], 3); }),
  asphalt: () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#3d4045'; g.fillRect(0, 0, w, h); speckle(g, w, h, 9000, ['#2f3236', '#4b4f55', '#5b5f66', '#26282b'], 2); }),
  sand: () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#dcc892'; g.fillRect(0, 0, w, h); speckle(g, w, h, 8000, ['#cbb67e', '#eadba9', '#bfa86e'], 2); }),
  court: () => canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#3b6f95'; g.fillRect(0, 0, w, h); speckle(g, w, h, 1500, ['#356486', '#447ca6'], 2); }),
  field: () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#5f9440'; g.fillRect(0, 0, w, h); g.fillStyle = '#69a047'; g.fillRect(0, 0, w / 2, h); speckle(g, w, h, 9000, ['#558639', '#74ab50'], 2); }),
  ceil: () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#e8e6e0'; g.fillRect(0, 0, w, h); speckle(g, w, h, 2500, ['#d5d3cc', '#f5f3ee'], 2); g.strokeStyle = '#b9b7b0'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } g.fillStyle = '#ffffff'; g.fillRect(66, 66, 124, 60); }),
  ceilE: () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff8e6'; g.fillRect(66, 66, 124, 60); }),
  roof: () => canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#4a4744'; g.fillRect(0, 0, w, h); speckle(g, w, h, 3000, ['#3c3a37', '#5a5754', '#6a6763'], 2); }),
};

// ---- higher-detail surfaces: large-scale variation, grout/mortar, wear, plus derived bump (normal) maps ----
function blotch(g, w, h, n, colors, rMin, rMax, alpha) {
  for (let i = 0; i < n; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = rMin + Math.random() * (rMax - rMin), c = colors[(Math.random() * colors.length) | 0];
    for (const [ox, oy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) { const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = alpha; g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2); }
  }
  g.globalAlpha = 1;
}
function bumpFrom(tex, strength) {
  const c = tex.image, w = c.width, h = c.height, src = c.getContext('2d').getImageData(0, 0, w, h).data;
  const o = document.createElement('canvas'); o.width = w; o.height = h; const g = o.getContext('2d'), im = g.createImageData(w, h), d = im.data;
  const L = new Float32Array(w * h); for (let i = 0; i < w * h; i++) L[i] = (src[i * 4] + src[i * 4 + 1] + src[i * 4 + 2]) / 765;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const xl = (x + w - 1) % w, xr = (x + 1) % w, yu = (y + h - 1) % h, yd = (y + 1) % h;
    const dx = (L[y * w + xr] - L[y * w + xl]) * strength, dy = (L[yd * w + x] - L[yu * w + x]) * strength, il = 1 / Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    d[i] = (-dx * il * 0.5 + 0.5) * 255; d[i + 1] = (dy * il * 0.5 + 0.5) * 255; d[i + 2] = (il * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(o); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; tex.anisotropy = 8; tex.userData.bump = t; return tex;
}
T.brick = () => bumpFrom(canvasTex(1024, 1024, (g, w, h) => {
  g.fillStyle = '#6f675b'; g.fillRect(0, 0, w, h);
  const rows = 24, bh = h / rows, bw = w / 8;
  for (let r = 0; r < rows; r++) for (let c = -1; c < 9; c++) {
    const v = 138 + Math.random() * 46, t = Math.random() * 14, x = c * bw + (r % 2 ? bw / 2 : 0), y = r * bh;
    const gr = g.createLinearGradient(0, y, 0, y + bh); gr.addColorStop(0, `rgb(${v + 44},${v + 12 + t},${v - 30})`); gr.addColorStop(1, `rgb(${v + 22},${v - 6 + t},${v - 44})`);
    g.fillStyle = gr; g.fillRect(x + 3, y + 3, bw - 6, bh - 6);
    g.fillStyle = 'rgba(255,240,210,.18)'; g.fillRect(x + 3, y + 3, bw - 6, 2); g.fillStyle = 'rgba(40,25,10,.25)'; g.fillRect(x + 3, y + bh - 5, bw - 6, 2);
  }
  speckle(g, w, h, 16000, ['#5e4a34', '#e2cfae', '#a98b63', '#8a6f4c'], 2); blotch(g, w, h, 26, ['rgba(60,45,30,1)', 'rgba(235,215,180,1)'], 80, 260, 0.1);
}), 2.6);
T.tile = () => bumpFrom(canvasTex(1024, 1024, (g, w, h) => {
  g.fillStyle = '#d3cec2'; g.fillRect(0, 0, w, h); blotch(g, w, h, 40, ['rgba(190,182,165,1)', 'rgba(240,236,226,1)'], 60, 220, 0.16);
  speckle(g, w, h, 22000, ['#b3ac9c', '#efeadf', '#9d978a', '#6f7f94', '#c9b9a0'], 2);
  g.fillStyle = '#8f8a80'; for (let i = 0; i < 2; i++) { g.fillRect(i * 512 - 3, 0, 6, h); g.fillRect(0, i * 512 - 3, w, 6); g.fillRect(w - 3, 0, 3, h); g.fillRect(0, h - 3, w, 3); }
}), 1.6);
T.conc = () => bumpFrom(canvasTex(1024, 1024, (g, w, h) => {
  g.fillStyle = '#b3b0a8'; g.fillRect(0, 0, w, h); blotch(g, w, h, 60, ['rgba(140,137,130,1)', 'rgba(210,207,198,1)', 'rgba(120,112,100,1)'], 50, 240, 0.14);
  speckle(g, w, h, 40000, ['#9a978f', '#cdcac2', '#86837c', '#bdb9ae'], 2);
  g.strokeStyle = 'rgba(60,58,54,.55)'; g.lineWidth = 5; g.strokeRect(0, 0, w, h);
  g.strokeStyle = 'rgba(50,48,45,.35)'; g.lineWidth = 1.5; for (let i = 0; i < 5; i++) { let x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 9; k++) { x += (Math.random() - 0.5) * 90; y += Math.random() * 60; g.lineTo(x, y); } g.stroke(); }
}), 2.0);
T.asphalt = () => bumpFrom(canvasTex(1024, 1024, (g, w, h) => {
  g.fillStyle = '#3a3d42'; g.fillRect(0, 0, w, h); blotch(g, w, h, 50, ['rgba(30,32,35,1)', 'rgba(78,80,86,1)'], 60, 260, 0.18);
  speckle(g, w, h, 60000, ['#2a2c30', '#50545a', '#6a6e75', '#1f2023', '#8a8d92'], 2);
  g.strokeStyle = 'rgba(15,15,16,.6)'; g.lineWidth = 2; for (let i = 0; i < 6; i++) { let x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 10; k++) { x += (Math.random() - 0.5) * 120; y += (Math.random() - 0.3) * 80; g.lineTo(x, y); } g.stroke(); }
}), 3.0);
T.grass = () => bumpFrom(canvasTex(1024, 1024, (g, w, h) => {
  g.fillStyle = '#5f8136'; g.fillRect(0, 0, w, h); blotch(g, w, h, 70, ['rgba(70,100,36,1)', 'rgba(132,160,74,1)', 'rgba(150,140,70,1)', 'rgba(52,84,30,1)'], 50, 220, 0.2);
  for (let i = 0; i < 52000; i++) { const x = Math.random() * w, y = Math.random() * h, l = 3 + Math.random() * 6; g.strokeStyle = ['#4d6e2a', '#7fa046', '#92ad55', '#3f5f22', '#a9a24e', '#6a8c3a'][(Math.random() * 6) | 0]; g.globalAlpha = 0.55; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 3, y - l); g.stroke(); }
  g.globalAlpha = 1; speckle(g, w, h, 900, ['#b9863a', '#c9a24a', '#8a5a2c'], 3);
}), 2.2);
T.carpet = () => bumpFrom(canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#44597a'; g.fillRect(0, 0, w, h); blotch(g, w, h, 20, ['rgba(52,68,96,1)', 'rgba(84,104,138,1)'], 40, 140, 0.18); speckle(g, w, h, 42000, ['#36486a', '#587093', '#2e3d57', '#6e83a3', '#4a6088'], 2); }), 1.4);
T.paint = () => canvasTex(128, 1024, (g, w, h) => { // 8 m tall; contact shadow near the floor and ceiling line
  g.fillStyle = '#e6dfcf'; g.fillRect(0, 0, w, h); speckle(g, w, h - 140, 2500, ['#dcd4c2', '#f0eadc', '#d2c9b6'], 3);
  g.fillStyle = '#2f5c8c'; g.fillRect(0, h - 128, w, 116); g.fillStyle = '#c9d0d8'; g.fillRect(0, h - 140, w, 12); g.fillStyle = '#22262c'; g.fillRect(0, h - 14, w, 14);
  let gr = g.createLinearGradient(0, h - 70, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.42)'); g.fillStyle = gr; g.fillRect(0, h - 70, w, 70);
  const cy = h - (3.6 / 8) * h; gr = g.createLinearGradient(0, cy, 0, cy + 60); gr.addColorStop(0, 'rgba(0,0,0,.34)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, cy, w, 60);
});

/* ───────── sky ───────── */
const SUN = new THREE.Vector3(-0.66, 0.34, 0.67).normalize();
const FOG = 0xe9cfae;
function makeSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sunDir: { value: SUN }, time: { value: 0 } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `
      uniform vec3 sunDir; uniform float time; varying vec3 vDir;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<3;i++){ s+=a*noise(p); p*=2.03; a*=0.5; } return s; }
      void main(){
        vec3 d = normalize(vDir); float h = max(d.y, 0.0);
        float s = max(dot(d, sunDir), 0.0);
        vec3 zen = vec3(0.05,0.22,0.78), hor = mix(vec3(0.70,0.78,0.98), vec3(1.55,0.92,0.48), pow(s, 1.6) * 0.85 + 0.15);
        vec3 col = mix(hor, zen, pow(h, 0.55));
        col += vec3(1.0,0.62,0.30) * pow(s, 6.0) * 0.9;
        col += vec3(1.0,0.86,0.62) * smoothstep(0.9988, 0.9997, s) * 40.0 + vec3(1.0,0.7,0.4) * pow(s, 90.0) * 1.6;
        if (d.y > 0.01) {
          vec2 uv = d.xz / (d.y + 0.14) * 1.1 + vec2(time * 0.006, time * 0.002);
          float c = smoothstep(0.48, 0.82, fbm(uv));
          vec3 cc = mix(vec3(0.78,0.74,0.86), vec3(1.7,1.15,0.75), clamp(pow(s,2.0)*1.3 + 0.25, 0.0, 1.0));
          col = mix(col, cc, c * 0.85 * smoothstep(0.01, 0.16, d.y));
        }
        col = mix(col, hor * 0.92, smoothstep(0.0, -0.12, d.y));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), mat);
  m.scale.setScalar(1500); m.frustumCulled = false; m.renderOrder = -10;
  return m;
}

function textPlate(text, { w = 512, h = 96, bg = '#0b4a8f', fg = '#ffffff', font = 600, pad = 18 } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = h - pad * 2; g.font = `${font} ${size}px "Segoe UI", Arial, sans-serif`;
    while (g.measureText(text).width > w - pad * 2 && size > 10) { size -= 2; g.font = `${font} ${size}px "Segoe UI", Arial, sans-serif`; }
    g.fillText(text, w / 2, h / 2 + 2);
  });
}
// wall-mounted quad facing ±x or ±z. o:'h' wall along x at z=c (normal ±z); o:'v' wall along z at x=c.
function wallQuad(mb, o, c, a, b, y0, y1, sign, uv = [0, 0, 1, 1]) {
  const [u0, v0, u1, v1] = uv;
  if (o === 'h') {
    if (sign > 0) mb.quad([a, y0, c, b, y0, c, b, y1, c, a, y1, c], [0, 0, 1], [u0, v0, u1, v0, u1, v1, u0, v1]);
    else mb.quad([b, y0, c, a, y0, c, a, y1, c, b, y1, c], [0, 0, -1], [u0, v0, u1, v0, u1, v1, u0, v1]);
  } else if (sign > 0) mb.quad([c, y0, b, c, y0, a, c, y1, a, c, y1, b], [1, 0, 0], [u0, v0, u1, v0, u1, v1, u0, v1]);
  else mb.quad([c, y0, a, c, y0, b, c, y1, b, c, y1, a], [-1, 0, 0], [u0, v0, u1, v0, u1, v1, u0, v1]);
}

const FLOOR = { hall: 'tile', lobby: 'tile', class: 'carpet', office: 'carpet', meeting: 'carpet', library: 'carpet', lounge: 'carpet', dorm: 'carpet', auditorium: 'carpet', lab: 'vinyl', clinic: 'vinyl', server: 'vinyl', store: 'vinyl', kitchen: 'vinyl', shop: 'conc', garage: 'conc', robot: 'conc', storage: 'conc', gym: 'wood', cafe: 'cafe' };
const GROUNDMAT = { grass: 'grass', road: 'asphalt', lot: 'asphalt', conc: 'conc', sand: 'sand', court: 'court', field: 'field' };
const NOWIN = new Set(['server', 'storage', 'auditorium', 'garage']);
const CAR_COLORS = [0xc0392b, 0x1f4e8c, 0xf2f2f2, 0x2b2d31, 0x8d99a6, 0x2e7d4f, 0xd9a520, 0x6b1f2a];
const TREE_COLORS = [0xd9772b, 0xe0a52a, 0xb5432a, 0xc98b2e, 0x8f9a3a, 0xe2c044];

export class World {
  constructor(renderer, scene) {
    this.scene = scene; this.renderer = renderer;
    this.campus = buildCampus();
    this.physics = new Physics();
    this.physics.ceilAt = (x, z) => this.campus.ceilAt(x, z);
    this.propGeo = {}; this.propMesh = {}; this.wobbles = [];
    this.group = new THREE.Group(); scene.add(this.group);
    this._mats(); this._sky(); this._terrain(); this._buildings(); this._props(); this._scenery(); this._bounds();
  }

  _mats() {
    const S = (tex, o = {}) => { const { roughness, metalness, ...rest } = o; const m = new THREE.MeshLambertMaterial({ map: tex, vertexColors: true, ...rest }); if (tex.userData.bump) m.normalMap = tex.userData.bump; return m; };
    const M = (this.mat = {
      brick: S(T.brick(), { roughness: 0.95 }), paint: S(T.paint(), { roughness: 0.85 }),
      tile: S(T.tile(), { roughness: 0.38 }), carpet: S(T.carpet(), { roughness: 1 }), vinyl: S(T.vinyl(), { roughness: 0.45 }), wood: S(T.wood(), { roughness: 0.35 }),
      conc: S(T.conc(), { roughness: 0.9 }), cafe: S(T.cafe(), { roughness: 0.4 }), grass: S(T.grass(), { roughness: 1 }), asphalt: S(T.asphalt(), { roughness: 0.95 }),
      sand: S(T.sand(), { roughness: 1 }), court: S(T.court(), { roughness: 0.8 }), field: S(T.field(), { roughness: 1 }),
      ceil: S(T.ceil(), { roughness: 1, emissive: 0xffffff, emissiveMap: T.ceilE(), emissiveIntensity: 2.2 }), roof: S(T.roof(), { roughness: 1 }),
      trim: new THREE.MeshLambertMaterial({ color: 0x1a4a82, vertexColors: true }),
      glass: new THREE.MeshLambertMaterial({ color: 0xa9d2f0, transparent: true, opacity: 0.3, vertexColors: true, depthWrite: false }),
      glassDark: new THREE.MeshLambertMaterial({ color: 0x2f5a86, vertexColors: true }),
      line: new THREE.MeshBasicMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
      prop: new THREE.MeshLambertMaterial({ vertexColors: true }),
      leaf: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    });
    for (const k of ['ceil', 'roof', 'tile', 'carpet', 'vinyl', 'wood', 'conc', 'cafe']) M[k].shadowSide = THREE.DoubleSide;
    this.uvs = { brick: 1 / 3, paint: 1 / 8, tile: 1 / 2.4, carpet: 0.4, vinyl: 1, wood: 0.4, conc: 1 / 3, cafe: 0.5, grass: 1 / 7, asphalt: 1 / 6, sand: 0.3, court: 0.25, field: 0.1, ceil: 1 / 2.4, roof: 0.25, trim: 1, glass: 1, glassDark: 1, line: 1 };
    this.mb = {};
  }
  B(mat) { return (this.mb[mat] ??= new MB()); }
  box(mat, x0, y0, z0, x1, y1, z1, col, faces) { this.B(mat).box(x0, y0, z0, x1, y1, z1, this.uvs[mat], col, faces); }
  flush() {
    for (const k in this.mb) {
      const m = new THREE.Mesh(this.mb[k].build(), this.mat[k]);
      m.receiveShadow = k !== 'line' && k !== 'glass'; m.castShadow = !['glass', 'line', 'grass', 'asphalt', 'sand', 'court', 'field'].includes(k);
      if (k === 'glass') m.renderOrder = 5;
      m.matrixAutoUpdate = false; this.group.add(m);
    }
    this.mb = {};
  }

  _sky() {
    this.sky = makeSky(); this.scene.add(this.sky);
    this.scene.fog = new THREE.Fog(FOG, 120, 1100);
    this.scene.background = new THREE.Color(FOG);
    this.hemi = new THREE.HemisphereLight(0xbfd2ff, 0xd0b894, 1.15); this.scene.add(this.hemi);
    this.amb = new THREE.AmbientLight(0xffe9cf, 0.75); this.scene.add(this.amb);
    const sun = (this.sun = new THREE.DirectionalLight(0xffd9ac, 4.0));
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = -62; sc.right = 62; sc.top = 62; sc.bottom = -62; sc.near = 1; sc.far = 320;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
    this.scene.add(sun); this.scene.add(sun.target);
    sun.shadow.autoUpdate = false; this._sx = 1e9; this._sz = 1e9;
  }

  _terrain() {
    const { roomGrid, ground, rooms } = this.campus;
    // far ground + playable ground strips by surface type
    const far = new THREE.Mesh(new THREE.CircleGeometry(1700, 40), new THREE.MeshLambertMaterial({ color: 0x6d8a3e }));
    far.rotation.x = -Math.PI / 2; far.position.y = -0.06; far.receiveShadow = true; this.scene.add(far);
    for (let j = 0; j < GZ; j++) {
      let s = 0, cur = null;
      const typeAt = (i) => { const k = j * GX + i, r = roomGrid[k]; return r ? FLOOR[rooms[r].type] || 'tile' : GROUNDMAT[GTYPES[ground[k]]]; };
      for (let i = 0; i <= GX; i++) {
        const t = i < GX ? typeAt(i) : null;
        if (t !== cur) {
          if (cur) { const m = this.B(cur), u = this.uvs[cur], x0 = s + OX, x1 = i + OX, z0 = j + OZ, z1 = z0 + 1; m.quad([x0, 0, z1, x1, 0, z1, x1, 0, z0, x0, 0, z0], [0, 1, 0], [x0 * u, z1 * u, x1 * u, z1 * u, x1 * u, z0 * u, x0 * u, z0 * u]); }
          cur = t; s = i;
        }
      }
    }
    // painted lines: parking stalls, road centre line, courts, field
    const L = this.B('line'), W = lin(0xe9e9e4), Y = lin(0xe8b923);
    const strip = (x0, z0, x1, z1, col = W) => L.quad([x0, 0.02, z1, x1, 0.02, z1, x1, 0.02, z0, x0, 0.02, z0], [0, 1, 0], [0, 0, 1, 0, 1, 1, 0, 1], col);
    for (const st of this.furn().stalls) { if (st.X) strip(st.x - 0.06, st.z, st.x + 0.06, st.z + 5); else strip(st.x, st.z - 0.06, st.x + 5, st.z + 0.06); }
    for (let x = -138; x < 138; x += 9) strip(x, -129.6, x + 4.5, -129.4, Y);
    const rect = (x0, z0, x1, z1, col = W, t = 0.1) => { strip(x0, z0, x1, z0 + t, col); strip(x0, z1 - t, x1, z1, col); strip(x0, z0, x0 + t, z1, col); strip(x1 - t, z0, x1, z1, col); };
  }
  furn() { return (this._furn ??= furnish(this.campus)); }

  _buildings() {
    const { walls, doors, rooms, roomGrid } = this.campus, ph = this.physics;
    const TI = 0.1, TE = 0.15;
    // ceilings + roofs
    for (let j = 0; j < GZ; j++) {
      let s = 0, cur = null;
      for (let i = 0; i <= GX; i++) {
        const b = i < GX && roomGrid[j * GX + i] ? rooms[roomGrid[j * GX + i]].b : null;
        if (b !== cur) {
          if (cur) {
            const B = BLD[cur], x0 = s + OX, x1 = i + OX, z0 = j + OZ, z1 = z0 + 1, u = this.uvs.ceil, v = this.uvs.roof;
            this.B('ceil').quad([x0, B.ceil, z0, x1, B.ceil, z0, x1, B.ceil, z1, x0, B.ceil, z1], [0, -1, 0], [x0 * u, z0 * u, x1 * u, z0 * u, x1 * u, z1 * u, x0 * u, z1 * u]);
            const y = B.h - 0.25; this.B('roof').quad([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z0], [0, 1, 0], [x0 * v, z1 * v, x1 * v, z1 * v, x1 * v, z0 * v, x0 * v, z0 * v]);
          }
          cur = b; s = i;
        }
      }
    }
    // helper: slab along a wall line. lo/hi are offsets across the wall (negative = − side)
    const slab = (mat, o, c, a, b, y0, y1, lo, hi, col) => { if (o === 'h') this.box(mat, a, y0, c + lo, b, y1, c + hi, col); else this.box(mat, c + lo, y0, a, c + hi, y1, b, col); };
    const solid = (o, c, a, b, top, t) => { if (o === 'h') ph.add(a, 0, c - t, b, top, c + t); else ph.add(c - t, 0, a, c + t, top, b); };
    for (const w of walls) {
      const B = BLD[w.b_], { o, c } = w; let { a, b } = w;
      if (w.kind === 1) { slab('paint', o, c, a - TI, b + TI, 0, B.ceil, -TI, TI); solid(o, c, a - TI, b + TI, B.ceil, TI); continue; }
      if (w.kind === 6) { slab('brick', o, c, a - TE, b + TE, 0, B.h, -TE, TE); solid(o, c, a - TE, b + TE, B.h, TE); continue; }
      // exterior: brick outside, paint inside, with windows
      const out = w.kind === 2 ? -1 : 1, oLo = out < 0 ? -TE : 0, oHi = out < 0 ? 0 : TE, iLo = out < 0 ? 0 : -TE, iHi = out < 0 ? TE : 0;
      const room = rooms[w.room], len = b - a;
      solid(o, c, a - TE, b + TE, B.h, TE);
      const piece = (s, e) => { slab('brick', o, c, s, e, 0, B.h, oLo, oHi); slab('paint', o, c, s, e, 0, B.ceil, iLo, iHi); };
      const n = room && NOWIN.has(room.type) ? 0 : Math.floor((len - 1) / 3);
      if (n < 1) piece(a - TE, b + TE);
      else {
        const sill = room.type === 'gym' || room.type === 'shop' || room.type === 'robot' ? 2.0 : 0.9, head = sill > 1 ? 3.6 : 2.6;
        let p = a + (len - (n * 3 - 1)) / 2; piece(a - TE, p);
        for (let k = 0; k < n; k++, p += 3) {
          slab('brick', o, c, p, p + 2, 0, sill, oLo, oHi); slab('paint', o, c, p, p + 2, 0, sill, iLo, iHi);
          slab('brick', o, c, p, p + 2, head, B.h, oLo, oHi); slab('paint', o, c, p, p + 2, head, B.ceil, iLo, iHi);
          slab('glass', o, c, p, p + 2, sill, head, -0.02, 0.02);
          slab('trim', o, c, p, p + 2, sill - 0.05, sill, out < 0 ? -TE - 0.04 : -TE, out < 0 ? TE : TE + 0.04);
          if (k < n - 1) piece(p + 2, p + 3); else piece(p + 2, b + TE);
        }
      }
      slab('trim', o, c, a - TE - 0.05, b + TE + 0.05, B.h - 0.5, B.h + 0.06, out < 0 ? -TE - 0.06 : 0, out < 0 ? 0 : TE + 0.06);
      if (B.stories > 1 && len >= 3) for (let s = 1; s < B.stories; s++) { const y = s * (B.h - 0.6) / B.stories + 1.0; slab('glassDark', o, c, a + 0.5, b - 0.5, y, y + 1.8, out < 0 ? -TE - 0.03 : 0, out < 0 ? 0 : TE + 0.03); }
    }
    // door openings: lintels, frames, canopies, signs, plaques
    const plaqueMB = new MB(), names = [];
    for (const d of doors) {
      const B = BLD[d.b_], { o, c, a, b } = d, ext = d.kind === 2 || d.kind === 3;
      const head = d.garage ? 3.6 : ext ? 2.5 : 2.3, top = d.kind === 1 ? B.ceil : B.h, t = d.kind === 1 ? TI : TE;
      slab(d.kind === 1 ? 'paint' : 'brick', o, c, a, b, head, top, -t, t);
      if (o === 'h') this.physics.add(a, head, c - t, b, top, c + t); else this.physics.add(c - t, head, a, c + t, top, b);
      slab('trim', o, c, a, a + 0.07, 0, head, -t - 0.02, t + 0.02); slab('trim', o, c, b - 0.07, b, 0, head, -t - 0.02, t + 0.02); slab('trim', o, c, a, b, head - 0.07, head, -t - 0.02, t + 0.02);
      if (ext) {
        const out = d.kind === 2 ? -1 : 1;
        slab('trim', o, c, a - TE - 0.05, b + TE + 0.05, B.h - 0.5, B.h + 0.06, out < 0 ? -TE - 0.06 : 0, out < 0 ? 0 : TE + 0.06);
        if (!d.garage) {
          const dep = d.big ? 3.6 : 2.2, ex = d.big ? 1.6 : 0.8;
          slab('trim', o, c, a - ex, b + ex, 2.72, 2.98, out < 0 ? -dep : 0, out < 0 ? 0 : dep);
          for (const q of [a - ex + 0.15, b + ex - 0.15]) {
            const pc = c + out * (dep - 0.2);
            if (o === 'h') { this.box('trim', q - 0.08, 0, pc - 0.08, q + 0.08, 2.72, pc + 0.08); ph.add(q - 0.1, 0, pc - 0.1, q + 0.1, 2.72, pc + 0.1); }
            else { this.box('trim', pc - 0.08, 0, q - 0.08, pc + 0.08, 2.72, q + 0.08); ph.add(pc - 0.1, 0, q - 0.1, pc + 0.1, 2.72, q + 0.1); }
          }
        }
        if (d.label) {
          const wide = Math.min(d.big ? 13 : 5.2, Math.max(2.4, d.label.length * (d.big ? 0.46 : 0.36))), hgt = d.big ? 0.95 : 0.62, mid = (a + b) / 2, mb = new MB();
          wallQuad(mb, o, c + out * (TE + 0.08), mid - wide / 2, mid + wide / 2, 3.25, 3.25 + hgt, out);
          const mesh = new THREE.Mesh(mb.build(), new THREE.MeshBasicMaterial({ map: textPlate(d.label, { w: 1024, h: Math.round(1024 * hgt / wide), font: 800 }), toneMapped: true }));
          this.group.add(mesh);
        }
      } else if (d.room && rooms[d.room] && d.side) {
        // room-number plaque on the hallway side of the door
        const r = rooms[d.room], idx = names.length; names.push(r.name);
        const lo = o === 'h' ? r.x0 : r.z0, pa = a - 2.2 >= lo ? a - 2.0 : b + 0.4, col = idx % 4, row = (idx / 4) | 0;
        wallQuad(plaqueMB, o, c - d.side * (TI + 0.02), pa, pa + 1.6, 1.75, 2.05, -d.side, [col / 4, 1 - (row + 1) / 24, (col + 1) / 4, 1 - row / 24]);
      }
    }
    if (names.length) {
      const atlas = canvasTex(2048, 2304, (g) => {
        g.fillStyle = '#0b4a8f'; g.fillRect(0, 0, 2048, 2304); g.textBaseline = 'middle'; g.textAlign = 'center';
        names.forEach((n, i) => {
          const x = (i % 4) * 512, y = ((i / 4) | 0) * 96; g.fillStyle = '#0b4a8f'; g.fillRect(x, y, 512, 96); g.strokeStyle = '#c9d3df'; g.lineWidth = 4; g.strokeRect(x + 4, y + 4, 504, 88);
          g.fillStyle = '#fff'; let s = 44; g.font = `700 ${s}px "Segoe UI", Arial, sans-serif`; while (g.measureText(n).width > 480 && s > 14) { s -= 2; g.font = `700 ${s}px "Segoe UI", Arial, sans-serif`; }
          g.fillText(n, x + 256, y + 50);
        });
      });
      atlas.wrapS = atlas.wrapT = THREE.ClampToEdgeWrapping;
      this.group.add(new THREE.Mesh(plaqueMB.build(), new THREE.MeshBasicMaterial({ map: atlas })));
    }
  }

  _props() {
    const { inst } = this.furn(), by = {};
    for (const i of inst) (by[i.t] ??= []).push(i);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), s1 = new THREE.Vector3(1, 1, 1), pos = new THREE.Vector3(), col = new THREE.Color();
    for (const k in PROPS) this.propGeo[k] = partsGeometry(PROPS[k].parts);
    for (const t in by) {
      const list = by[t], P = PROPS[t], mesh = new THREE.InstancedMesh(this.propGeo[t], this.mat.prop, list.length);
      mesh.castShadow = true; mesh.receiveShadow = true;
      list.forEach((it, n) => {
        q.setFromAxisAngle(up, it.r * Math.PI / 2); pos.set(it.x, it.y, it.z); m4.compose(pos, q, s1); mesh.setMatrixAt(n, m4);
        if (t === 'car') mesh.setColorAt(n, col.set(CAR_COLORS[it.c % CAR_COLORS.length]));
        const sw = (it.r & 1 ? P.d : P.w) / 2, sd = (it.r & 1 ? P.w : P.d) / 2;
        it.n = n;
        it.box = this.physics.add(it.x - sw, it.y, it.z - sd, it.x + sw, it.y + P.h, it.z + sd, it);
      });
      mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere(); this.group.add(mesh); this.propMesh[t] = mesh;
    }
    this.inst = inst;
  }
  // visual feedback when the teacher hits an ordinary object
  wobble(it) { if (it && it.n != null && !this.wobbles.some((w) => w.it === it)) this.wobbles.push({ it, t: 0 }); }

  _scenery() {
    const ph = this.physics, { trees } = this.furn();
    // trees (instanced): trunk + foliage for hardwoods, pines as one mesh
    const trunk = new MB(), leaf = new MB(), pine = new MB(), m = new THREE.Matrix4();
    trunk.geom(new THREE.CylinderGeometry(0.16, 0.26, 2.6, 6), m.makeTranslation(0, 1.3, 0), 0x5a4030);
    for (const [x, y, z, r] of [[0, 3.6, 0, 1.7], [0.9, 3.1, 0.3, 1.15], [-0.8, 3.2, -0.4, 1.2], [0.1, 4.6, -0.2, 1.1]]) leaf.geom(new THREE.IcosahedronGeometry(r, 0), m.makeTranslation(x, y, z), 0xffffff);
    pine.geom(new THREE.CylinderGeometry(0.14, 0.22, 1.4, 6), m.makeTranslation(0, 0.7, 0), 0x4a3526);
    [[1.7, 2.4, 1.2], [1.35, 2.2, 2.5], [1.0, 2.0, 3.7], [0.6, 1.7, 4.8]].forEach(([r, h, y]) => pine.geom(new THREE.ConeGeometry(r, h, 7), m.makeTranslation(0, y + h / 2, 0), 0x2f5d3a));
    const ring = [];
    for (let i = 0; i < 230; i++) { const a = (i / 230) * Math.PI * 2 + Math.sin(i * 7.1) * 0.02, rx = 168 + Math.abs(Math.sin(i * 12.9898) * 43758.5453 % 1) * 34, rz = 148 + Math.abs(Math.sin(i * 78.233) * 43758.5453 % 1) * 34; ring.push({ x: Math.cos(a) * rx, z: Math.sin(a) * rz, s: 1.2 + Math.abs(Math.sin(i * 3.3)) * 0.9, k: i % 3 === 0 ? 1 : 0, c: i % 6, a: i, far: 1 }); }
    const all = trees.concat(ring), hard = all.filter((t) => !t.k), pines = all.filter((t) => t.k);
    const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color();
    const mk = (geo, mat, list, tint) => {
      const im = new THREE.InstancedMesh(geo, mat, list.length); im.castShadow = true; im.receiveShadow = true;
      list.forEach((t, i) => { q.setFromAxisAngle(up, t.a); p.set(t.x, 0, t.z); s.setScalar(t.s); m.compose(p, q, s); im.setMatrixAt(i, m); if (tint) im.setColorAt(i, col.set(TREE_COLORS[t.c]).multiplyScalar(0.85 + (i % 5) * 0.05)); });
      im.computeBoundingSphere(); this.group.add(im); return im;
    };
    this.treeMesh = { trunk: mk(trunk.build(), this.mat.prop, hard), leaf: mk(leaf.build(), this.mat.leaf, hard, true), pine: mk(pine.build(), this.mat.leaf, pines) };
    for (const t of trees) ph.add(t.x - 0.25, 0, t.z - 0.25, t.x + 0.25, 6, t.z + 0.25);

    // gazebo
    const g = SPECIAL.gazebo, gm = new MB();
    gm.geom(new THREE.CylinderGeometry(4.2, 4.2, 0.18, 8), m.makeTranslation(g.x, 0.09, g.z), 0x9a968e);
    gm.geom(new THREE.ConeGeometry(5.0, 1.9, 8), m.makeTranslation(g.x, 3.75, g.z), 0x143a66);
    gm.geom(new THREE.CylinderGeometry(0.5, 0.5, 0.5, 8), m.makeTranslation(g.x, 4.9, g.z), 0x143a66);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8, x = g.x + Math.cos(a) * 3.9, z = g.z + Math.sin(a) * 3.9; gm.geom(new THREE.CylinderGeometry(0.11, 0.11, 2.8, 6), m.makeTranslation(x, 1.4, z), 0xf1ede4); ph.add(x - 0.13, 0, z - 0.13, x + 0.13, 2.8, z + 0.13); }
    // volleyball net + monument sign base + Rib Mountain
    const n = SPECIAL.net;
    gm.geom(new THREE.CylinderGeometry(0.07, 0.07, 2.5, 6), m.makeTranslation(n.x, 1.25, n.z0 + 0.5), 0x444a52); gm.geom(new THREE.CylinderGeometry(0.07, 0.07, 2.5, 6), m.makeTranslation(n.x, 1.25, n.z1 - 0.5), 0x444a52);
    ph.add(n.x - 0.06, 0, n.z0 + 0.4, n.x + 0.06, 2.45, n.z1 - 0.4);
    const sg = SPECIAL.sign;
    gm.box(sg.x - 3.6, 0, sg.z - 0.45, sg.x + 3.6, 0.7, sg.z + 0.45, 1, lin(0xb79f7c), 63); gm.box(sg.x - 3.3, 0.7, sg.z - 0.3, sg.x + 3.3, 2.3, sg.z + 0.3, 1, lin(0x0b4a8f), 63); gm.box(sg.x - 3.45, 2.3, sg.z - 0.38, sg.x + 3.45, 2.42, sg.z + 0.38, 1, lin(0xc9d3df), 63);
    ph.add(sg.x - 3.6, 0, sg.z - 0.45, sg.x + 3.6, 2.4, sg.z + 0.45);
    const gz = new THREE.Mesh(gm.build(), this.mat.prop); gz.castShadow = gz.receiveShadow = true; this.group.add(gz);
    const net = new THREE.Mesh(new THREE.PlaneGeometry(n.z1 - n.z0 - 1, 1.0), new THREE.MeshBasicMaterial({ map: canvasTex(64, 64, (c2) => { c2.clearRect(0, 0, 64, 64); c2.strokeStyle = 'rgba(255,255,255,.9)'; c2.lineWidth = 3; for (let i = 0; i <= 64; i += 16) { c2.beginPath(); c2.moveTo(i, 0); c2.lineTo(i, 64); c2.moveTo(0, i); c2.lineTo(64, i); c2.stroke(); } }), transparent: true, side: THREE.DoubleSide, alphaTest: 0.2 }));
    net.material.map.repeat.set(24, 2); net.rotation.y = Math.PI / 2; net.position.set(n.x, 1.95, (n.z0 + n.z1) / 2); this.group.add(net);
    for (const dir of [1, -1]) {
      const mb = new MB(); wallQuad(mb, 'h', sg.z + dir * 0.31, sg.x - 3.1, sg.x + 3.1, 0.85, 2.15, dir);
      this.group.add(new THREE.Mesh(mb.build(), new THREE.MeshBasicMaterial({ map: textPlate('NORTHCENTRAL TECHNICAL COLLEGE', { w: 1024, h: 214, font: 800, pad: 40 }) })));
    }
    // Rib Mountain / Granite Peak on the south-west horizon
    const mg = new THREE.PlaneGeometry(1500, 520, 70, 22); mg.rotateX(-Math.PI / 2);
    const P = mg.attributes.position, cols = [];
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), z = P.getZ(i), ridge = Math.exp(-(z * z) / 22000) * Math.exp(-(x * x) / 260000);
      const h = ridge * (150 + 26 * Math.sin(x * 0.012) + 14 * Math.sin(x * 0.041 + 1.3) + 9 * Math.sin(z * 0.05));
      P.setY(i, h - 6);
      const ski = h > 30 && Math.abs(Math.sin(x * 0.021)) > 0.93 && Math.abs(x) < 330 ? 1 : 0, tv = 0.5 + 0.5 * Math.sin(x * 0.07 + z * 0.09);
      col.set(ski ? 0xdfe6ee : 0x6b6a3c).lerp(new THREE.Color(ski ? 0xdfe6ee : 0x8a5a2c), ski ? 0 : tv * 0.6); cols.push(col.r, col.g, col.b);
    }
    mg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); mg.computeVertexNormals();
    const mtn = new THREE.Mesh(mg, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    mtn.position.set(-520, 0, 640); mtn.rotation.y = -0.55; this.scene.add(mtn);
    this.flush();
  }

  _bounds() {
    const b = BOUNDS, ph = this.physics;
    ph.add(b.x0 - 4, 0, b.z0 - 4, b.x0, 40, b.z1 + 4); ph.add(b.x1, 0, b.z0 - 4, b.x1 + 4, 40, b.z1 + 4);
    ph.add(b.x0 - 4, 0, b.z0 - 4, b.x1 + 4, 40, b.z0); ph.add(b.x0 - 4, 0, b.z1, b.x1 + 4, 40, b.z1 + 4);
    this.spawns = this.furn().spawns;
    const r = this.campus.findRoom(SPECIAL.teacherRoom);
    this.teacherSpawn = { x: (r.x0 + r.x1) / 2, z: r.z1 - 2.2 };
  }

  setQuality(q) {
    this.sun.castShadow = q > 0; this.renderer.shadowMap.enabled = q > 0;
    const size = 2048; this._sx = 1e9;
    if (this.sun.shadow.mapSize.x !== size) { this.sun.shadow.mapSize.set(size, size); if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; } }
    for (const k in this.mat) this.mat[k].needsUpdate = true;
  }

  update(dt, time, focus) {
    this.sky.material.uniforms.time.value = time;
    this.sky.position.copy(focus);
    // shadows are static: re-render the shadow map only when the player crosses into a new 6 m cell
    const fx = Math.round(focus.x / 6) * 6, fz = Math.round(focus.z / 6) * 6;
    if (fx !== this._sx || fz !== this._sz) {
      this._sx = fx; this._sz = fz;
      this.sun.target.position.set(fx, 0, fz); this.sun.position.set(fx + SUN.x * 160, SUN.y * 160, fz + SUN.z * 160); this.sun.target.updateMatrixWorld();
      this.sun.shadow.needsUpdate = true;
    }
    if (this.wobbles.length) {
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
      for (let i = this.wobbles.length - 1; i >= 0; i--) {
        const w = this.wobbles[i]; w.t += dt; const k = Math.max(0, 1 - w.t / 0.5), a = Math.sin(w.t * 38) * 0.16 * k;
        e.set(a, w.it.r * Math.PI / 2, a * 0.7, 'YXZ'); q.setFromEuler(e); p.set(w.it.x, w.it.y, w.it.z); m4.compose(p, q, s);
        const mesh = this.propMesh[w.it.t]; mesh.setMatrixAt(w.it.n, m4); mesh.instanceMatrix.needsUpdate = true;
        if (k <= 0) this.wobbles.splice(i, 1);
      }
    }
  }
}
export { SUN, FOG };
