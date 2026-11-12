// Characters, held items, first-person view models and name tags — all procedural, no asset downloads.
import * as THREE from '../vendor/three.js';
import { MB } from './world.js';

const charMat = new THREE.MeshLambertMaterial({ vertexColors: true });
const m4 = new THREE.Matrix4();
const SKIN = [0xf1c9a5, 0xe0ac86, 0xc68c5e, 0x9c6b43, 0x6f4a2e, 0xf6d7bd];
const HAIR = [0x2b1d14, 0x4a3222, 0x8a5a2c, 0xd9b36a, 0x16130f, 0x6e3b24, 0x9aa0a6];
export const SHIRTS = [0xe63946, 0x1d78d6, 0x2a9d8f, 0xf4a261, 0x8e5bd9, 0xff6fae, 0x3fb950, 0xffd23f, 0x14c2c8, 0xf06a2a, 0x7d8597, 0xb5179e];

function part(build) { const mb = new MB(); build(mb); const m = new THREE.Mesh(mb.build(), charMat); return m; }
const T = (x, y, z) => m4.makeTranslation(x, y, z);

export function makeRuler() {
  const mb = new MB(); mb.box(-0.02, 0, -0.004, 0.02, 0.9, 0.004, 1, [0.9, 0.62, 0.12], 63);
  for (let i = 1; i < 12; i++) mb.box(-0.02, i * 0.075, -0.0055, i % 3 ? -0.004 : 0.008, i * 0.075 + 0.006, 0.0055, 1, [0.08, 0.06, 0.03], 63);
  const m = new THREE.Mesh(mb.build(), charMat); return m;
}
export function makePaperBall(r = 0.07) {
  const g = new THREE.IcosahedronGeometry(r, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 0.82 + ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * 0.3; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xf7f5ee, roughness: 0.95, flatShading: true }));
}

// Battle Royale items are ordinary school supplies — nothing gun-shaped.
export function makeWeapon(kind) {
  const mb = new MB(), M = (x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz)).setPosition(x, y, z);
  const box = (w, h, d, m, c) => mb.geom(new THREE.BoxGeometry(w, h, d), m, c);
  if (kind === 'rubber') { // a handful of rubber bands
    for (const [r, x, y, rz, c] of [[0.05, 0, 0, 0.2, 0xc9a26a], [0.042, 0.012, 0.01, -0.5, 0xd8473a], [0.046, -0.01, 0.006, 0.9, 0x3a7bd8]]) mb.geom(new THREE.TorusGeometry(r, 0.006, 6, 20), M(x, y, 0, 0.3, 0, rz), c);
  } else if (kind === 'stapler') { // desk stapler
    box(0.05, 0.014, 0.2, M(0, -0.03, -0.02), 0x2a2d33); box(0.046, 0.03, 0.19, M(0, 0.012, -0.03, 0.14), 0xd62f2f);
    mb.geom(new THREE.CylinderGeometry(0.024, 0.024, 0.048, 12), M(0, 0.03, -0.12, 0, 0, Math.PI / 2), 0xd62f2f); box(0.04, 0.012, 0.16, M(0, -0.012, -0.03, 0.07), 0x9aa0a8);
    mb.geom(new THREE.CylinderGeometry(0.012, 0.012, 0.052, 8), M(0, -0.012, 0.075, 0, 0, Math.PI / 2), 0x2a2d33);
  } else if (kind === 'chalk') { // chalkboard eraser + stick of chalk
    box(0.07, 0.022, 0.16, M(0, 0.014, -0.02), 0x9a6a3c); box(0.066, 0.03, 0.156, M(0, -0.012, -0.02), 0x23252a); box(0.06, 0.004, 0.15, M(0, -0.029, -0.02), 0xf2f2ee);
    mb.geom(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 8), M(0.05, 0.03, -0.02, Math.PI / 2, 0, 0.3), 0xffffff);
  } else if (kind === 'dodge') { // dodgeball
    mb.geom(new THREE.IcosahedronGeometry(0.11, 2), M(0, 0, -0.02), 0xd62828); mb.geom(new THREE.TorusGeometry(0.111, 0.004, 5, 28), M(0, 0, -0.02, 0.5, 0.4), 0x9c1c1c);
  } else if (kind === 'laser') { // pen-style laser pointer
    mb.geom(new THREE.CylinderGeometry(0.009, 0.009, 0.15, 10), M(0, 0, -0.03, Math.PI / 2), 0xb9bec6); mb.geom(new THREE.CylinderGeometry(0.0095, 0.0095, 0.03, 10), M(0, 0, 0.035, Math.PI / 2), 0x23272e);
    mb.geom(new THREE.CylinderGeometry(0.006, 0.009, 0.014, 10), M(0, 0, -0.112, Math.PI / 2), 0xff2d2d); box(0.004, 0.006, 0.05, M(0, 0.011, 0.01), 0x23272e);
  } else mb.geom(new THREE.IcosahedronGeometry(0.06, 1), M(0, 0, 0), 0xf7f5ee);
  return new THREE.Mesh(mb.build(), charMat);
}

/* Humanoid: stylised low-poly student / teacher with a procedural walk cycle. */
let characterFactory = null;
export function setCharacterFactory(fn) { characterFactory = fn; }
export function makeHumanoid(opts = {}) {
  if (characterFactory) { const c = characterFactory(opts); if (c) return c; }
  const { shirt = 0x1d78d6, seed = 1, teacher = false, monitor = false } = opts;
  const skin = SKIN[seed % SKIN.length], hair = HAIR[(seed >> 3) % HAIR.length], pants = teacher ? 0x9a8463 : [0x2b3a55, 0x30343b, 0x4a5568, 0x5b4636][(seed >> 5) % 4];
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const sh = teacher ? 0xf3f1ea : shirt;
  const torso = part((mb) => {
    mb.geom(new THREE.CapsuleGeometry(0.2, 0.3, 3, 10), T(0, 1.15, 0).multiply(new THREE.Matrix4().makeScale(1.05, 1, 0.72)), sh);
    mb.geom(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 8), T(0, 1.5, 0), skin);
    if (teacher) { mb.box(-0.035, 0.98, 0.14, 0.035, 1.42, 0.165, 1, [0.03, 0.14, 0.4], 63); mb.box(-0.05, 1.38, 0.14, 0.05, 1.45, 0.17, 1, [0.03, 0.14, 0.4], 63); }
    else if (monitor) { mb.box(-0.23, 1.0, -0.17, 0.23, 1.38, 0.17, 1, [0.95, 0.75, 0.05], 51); }
    else mb.box(-0.17, 0.98, -0.3, 0.17, 1.4, -0.14, 1, new THREE.Color(shirt).multiplyScalar(0.45).toArray(), 63); // backpack
    mb.box(-0.2, 0.86, -0.13, 0.2, 0.94, 0.13, 1, new THREE.Color(pants).toArray(), 63);
  });
  const head = part((mb) => {
    mb.geom(new THREE.IcosahedronGeometry(0.155, 2), new THREE.Matrix4().makeScale(1, 1.08, 1), skin);
    mb.geom(new THREE.SphereGeometry(0.165, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), T(0, 0.02, -0.012), hair);
    mb.box(-0.075, 0.0, 0.135, -0.035, 0.04, 0.15, 1, [0.03, 0.03, 0.04], 63); mb.box(0.035, 0.0, 0.135, 0.075, 0.04, 0.15, 1, [0.03, 0.03, 0.04], 63);
    if (teacher) { mb.box(-0.1, -0.01, 0.148, -0.015, 0.055, 0.156, 1, [0.02, 0.02, 0.02], 63); mb.box(0.015, -0.01, 0.148, 0.1, 0.055, 0.156, 1, [0.02, 0.02, 0.02], 63); mb.box(-0.02, 0.02, 0.148, 0.02, 0.03, 0.156, 1, [0.02, 0.02, 0.02], 63); }
  });
  head.position.y = 1.66;
  const limb = (len, r, col, endCol) => part((mb) => { mb.geom(new THREE.CapsuleGeometry(r, len - r * 2, 3, 8), T(0, -len / 2, 0), col); mb.geom(new THREE.IcosahedronGeometry(r * 1.15, 1), T(0, -len + 0.01, 0), endCol); });
  const armL = limb(0.56, 0.062, sh, skin), armR = limb(0.56, 0.062, sh, skin), legL = limb(0.86, 0.085, pants, 0x20232a), legR = limb(0.86, 0.085, pants, 0x20232a);
  armL.position.set(-0.27, 1.42, 0); armR.position.set(0.27, 1.42, 0); legL.position.set(-0.11, 0.88, 0); legR.position.set(0.11, 0.88, 0);
  body.add(torso, head, armL, armR, legL, legR);
  const hand = new THREE.Group(); hand.position.set(0, -0.56, 0.02); armR.add(hand);
  if (teacher || monitor) { const r = makeRuler(); r.rotation.x = Math.PI / 2 - 0.2; hand.add(r); }
  if (teacher) g.scale.setScalar(1.07);
  let phase = seed, swing = 0, held = null;
  return {
    group: g, hand,
    setHeld(mesh) { if (held) hand.remove(held); held = mesh; if (mesh) { mesh.rotation.set(Math.PI / 2, 0, 0); mesh.position.set(0, -0.02, 0.08); hand.add(mesh); } },
    swing() { swing = 1; },
    update(dt, speed, crouch, pitch, air) {
      phase += dt * (4 + speed * 1.55);
      const a = Math.min(1, speed / 4) * 0.75, s = Math.sin(phase);
      legL.rotation.x = s * a; legR.rotation.x = -s * a; armL.rotation.x = -s * a * 0.8;
      swing = Math.max(0, swing - dt * 3.2);
      const aim = teacher || monitor || held ? -1.25 - pitch * 0.8 : s * a * 0.8;
      armR.rotation.x = swing > 0 ? aim - Math.sin(swing * Math.PI) * 1.5 : aim; armR.rotation.z = swing > 0 ? Math.sin(swing * Math.PI) * 0.5 : 0;
      if (air) { legL.rotation.x = 0.5; legR.rotation.x = -0.3; armL.rotation.x = -1.2; }
      body.position.y = (crouch ? -0.34 : 0) + Math.abs(Math.cos(phase)) * a * 0.045; body.rotation.x = crouch ? 0.32 : speed > 5.5 ? 0.14 : 0;
      head.rotation.x = -pitch * 0.6;
    },
  };
}

export function makeNameTag(text, color = '#ffffff') {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const g = cv.getContext('2d');
  g.font = '700 30px "Segoe UI", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = Math.min(244, g.measureText(text).width + 26);
  g.fillStyle = 'rgba(8,16,30,.62)'; g.beginPath(); g.roundRect(128 - w / 2, 12, w, 42, 12); g.fill();
  g.fillStyle = color; g.fillText(text, 128, 34, 230);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(1.5, 0.375, 1); s.renderOrder = 8; return s;
}

/* First-person arms: ruler in the right hand, paper in the left; or a toy blaster in BR. */
export function makeViewModel() {
  const root = new THREE.Group(), armMat = charMat;
  // forearm with a cuff and a closed fist (palm, knuckles, curled fingers, thumb)
  const mkArm = (col, side) => {
    const mb = new MB(), SK = 0xe3b08c, SK2 = 0xcf9a76, M = (x, y, z, rx = 0, ry = 0) => new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, 0)).setPosition(x, y, z);
    mb.geom(new THREE.CylinderGeometry(0.05, 0.062, 0.42, 12), M(0, -0.012, 0.3, Math.PI / 2), col);
    mb.geom(new THREE.CylinderGeometry(0.054, 0.054, 0.035, 12), M(0, -0.004, 0.085, Math.PI / 2), 0xf7f5ee);
    mb.geom(new THREE.CylinderGeometry(0.034, 0.04, 0.05, 10), M(0, 0, 0.05, Math.PI / 2), SK);
    mb.geom(new THREE.BoxGeometry(0.082, 0.06, 0.085, 2, 2, 2), M(0, 0.002, -0.005), SK);
    mb.geom(new THREE.BoxGeometry(0.084, 0.034, 0.034), M(0, 0.014, -0.058, -0.5), SK);
    for (let i = 0; i < 4; i++) mb.geom(new THREE.BoxGeometry(0.0185, 0.05, 0.03), M(-0.031 + i * 0.0207, -0.026, -0.058, 0.25), i % 2 ? SK : SK2);
    for (let i = 0; i < 4; i++) mb.geom(new THREE.BoxGeometry(0.0185, 0.022, 0.05), M(-0.031 + i * 0.0207, -0.05, -0.03, 0), i % 2 ? SK2 : SK);
    mb.geom(new THREE.BoxGeometry(0.028, 0.03, 0.075), M(side * 0.052, 0.012, -0.03, 0, side * 0.35), SK2);
    return new THREE.Mesh(mb.build(), armMat);
  };
  const R = new THREE.Group(), L = new THREE.Group(); root.add(R, L);
  let armR = mkArm(0x2f5c8c, -1), armL = mkArm(0x2f5c8c, 1); R.add(armR); L.add(armL);
  armR.visible = armL.visible = false; // no first-person arms — just the item in view
  const ruler = makeRuler(); ruler.position.set(0, -0.02, -0.02); ruler.rotation.set(-1.05, 0, 0.12); R.add(ruler);
  const paper = makePaperBall(0.05); paper.position.set(0, 0.05, -0.03); L.add(paper);
  let gun = null, kindNow = '', t = 0, swingT = 0, throwT = 0, kick = 0, bob = 0, hidden = false;
  const baseR = new THREE.Vector3(0.24, -0.24, -0.46), baseL = new THREE.Vector3(-0.25, -0.27, -0.48);
  root.traverse((o) => { o.frustumCulled = false; o.castShadow = false; });
  return {
    group: root,
    setMode(mode, weapon) { // 'hunter' | 'br' | 'none'
      hidden = mode === 'none'; root.visible = !hidden;
      ruler.visible = mode === 'hunter'; paper.visible = mode === 'hunter' || (mode === 'br' && weapon === 'paper');
      L.visible = mode === 'hunter' || (mode === 'br' && weapon === 'paper');
      if (gun) { R.remove(gun); gun = null; }
      if (mode === 'br' && weapon !== 'paper') { gun = makeWeapon(weapon); gun.position.set(-0.02, 0.05, -0.02); gun.scale.setScalar(1.5); gun.frustumCulled = false; R.add(gun); }
      kindNow = mode + weapon;
    },
    key: () => kindNow,
    swing() { swingT = 1; }, throwIt() { throwT = 1; }, kick(a = 1) { kick = Math.min(1.6, kick + a); },
    update(dt, speed, onGround, ads) {
      t += dt; bob += dt * speed * 1.7;
      swingT = Math.max(0, swingT - dt * 3.4); throwT = Math.max(0, throwT - dt * 3.0); kick = Math.max(0, kick - dt * 7);
      const bx = Math.sin(bob) * 0.012 * Math.min(1, speed / 4), by = Math.abs(Math.cos(bob)) * 0.014 * Math.min(1, speed / 4) + Math.sin(t * 1.6) * 0.003;
      const sw = Math.sin((1 - swingT) * Math.PI), a = ads ? 1 : 0;
      R.position.set(baseR.x * (1 - a * 0.95) + bx - sw * 0.2 * (swingT > 0 ? 1 : 0), baseR.y + a * 0.1 + by - (swingT > 0 ? sw * 0.06 : 0), baseR.z + kick * 0.05 - (swingT > 0 ? sw * 0.16 : 0));
      R.rotation.set((swingT > 0 ? -sw * 1.25 : 0) + kick * 0.12, swingT > 0 ? sw * 0.7 : 0, 0);
      const th = Math.sin((1 - throwT) * Math.PI);
      L.position.set(baseL.x + bx + (throwT > 0 ? th * 0.16 : 0), baseL.y + by + (throwT > 0 ? th * 0.2 : 0), baseL.z - (throwT > 0 ? th * 0.22 : 0));
      L.rotation.set(throwT > 0 ? -th * 0.9 : 0, 0, 0);
      paper.visible = L.visible && (throwT <= 0 || throwT > 0.7);
    },
  };
}
