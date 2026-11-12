// Real 3D models (KayKit by Kay Lousberg, CC0 — see assets/kaykit/LICENSE-KayKit.txt).
// Everything loads in the background: the game starts with built-in shapes and swaps models in as they arrive.
import * as THREE from '../vendor/three.js';
import { GLTFLoader, cloneSkinned } from '../vendor/gltf.js';
import { PROPS } from './props.js';
import { makeRuler, setCharacterFactory } from './models.js';

const L = new GLTFLoader(), BASE = 'assets/kaykit/';
const load = (url) => new Promise((res, rej) => L.load(url, res, undefined, rej));
// prop type → [folder, model, fit]. fit 'box' stretches to the prop's collision box; 'h' scales evenly by height.
const PROP_MODELS = {
  chair: ['furniture', 'chair_A', 'box'], desk: ['furniture', 'table_small', 'box'], table: ['furniture', 'table_medium_long', 'box'], sofa: ['furniture', 'couch_pillows', 'box'],
  bookshelf: ['furniture', 'shelf_B_large_decorated', 'box'], cabinet: ['furniture', 'cabinet_medium', 'box'], plant: ['furniture', 'cactus_medium_A', 'h'], books: ['furniture', 'book_set', 'box'],
  bench: ['city', 'bench', 'box'], trash: ['city', 'trash_A', 'box'], recycle: ['city', 'trash_B', 'box'], dumpster: ['city', 'dumpster', 'box'], crate: ['city', 'box_A', 'box'],
  lamp: ['city', 'streetlight', 'h'], car: ['city', 'car_sedan', 'box'],
};
const pixels = new Map();
function imageData(img) {
  let d = pixels.get(img); if (d) return d;
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
  d = x.getImageData(0, 0, c.width, c.height); pixels.set(img, d); return d;
}
// Flatten a model into one geometry with its texture colours baked into vertex colours, sized to the prop's box.
function bake(scene, P, fit) {
  scene.updateMatrixWorld(true);
  const pos = [], nor = [], col = [], v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3(), c = new THREE.Color();
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry, p = g.attributes.position, nn = g.attributes.normal, uv = g.attributes.uv, map = o.material.map;
    const px = map && map.image ? imageData(map.image) : null; nm.getNormalMatrix(o.matrixWorld);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); pos.push(v.x, v.y, v.z);
      if (nn) n.fromBufferAttribute(nn, i).applyMatrix3(nm).normalize(); else n.set(0, 1, 0); nor.push(n.x, n.y, n.z);
      if (px && uv) {
        const x = Math.min(px.width - 1, Math.max(0, Math.floor((((uv.getX(i) % 1) + 1) % 1) * px.width))), y = Math.min(px.height - 1, Math.max(0, Math.floor((((uv.getY(i) % 1) + 1) % 1) * px.height))), k = (y * px.width + x) * 4;
        c.setRGB(px.data[k] / 255, px.data[k + 1] / 255, px.data[k + 2] / 255, THREE.SRGBColorSpace).multiply(o.material.color);
      } else c.copy(o.material.color);
      col.push(c.r, c.g, c.b);
    }
  });
  let min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
  const bounds = () => { min = [1e9, 1e9, 1e9]; max = [-1e9, -1e9, -1e9]; for (let i = 0; i < pos.length; i += 3) for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], pos[i + a]); max[a] = Math.max(max[a], pos[i + a]); } };
  bounds();
  // turn the model a quarter if its long side runs the other way from the prop's
  if ((P.w - P.d) * ((max[0] - min[0]) - (max[2] - min[2])) < 0 && Math.abs(P.w - P.d) > 0.1) {
    for (let i = 0; i < pos.length; i += 3) { const x = pos[i], z = pos[i + 2]; pos[i] = z; pos[i + 2] = -x; const nx = nor[i], nz = nor[i + 2]; nor[i] = nz; nor[i + 2] = -nx; }
    bounds();
  }
  const sy = P.h / (max[1] - min[1]), sx = fit === 'h' ? sy : P.w / (max[0] - min[0]), sz = fit === 'h' ? sy : P.d / (max[2] - min[2]), cx = (min[0] + max[0]) / 2, cz = (min[2] + max[2]) / 2;
  for (let i = 0; i < pos.length; i += 3) { pos[i] = (pos[i] - cx) * sx; pos[i + 1] = (pos[i + 1] - min[1]) * sy; pos[i + 2] = (pos[i + 2] - cz) * sz; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
  g.computeBoundingSphere(); g.computeBoundingBox(); return g;
}

const CHAR = {}, STUDENTS = ['Rogue', 'Knight', 'Rogue_Hooded'];
function character({ seed = 0, teacher = false, monitor = false } = {}) {
  const src = CHAR[teacher ? 'Mage' : STUDENTS[seed % STUDENTS.length]] || CHAR[STUDENTS[0]]; if (!src) return null;
  const obj = cloneSkinned(src.scene), g = new THREE.Group(), k = (teacher ? 1.95 : 1.75) / src.h;
  obj.scale.setScalar(k); g.add(obj);
  let handBone = null;
  obj.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; } if (!handBone && /handslot.?r/i.test(o.name)) handBone = o; });
  const hand = new THREE.Group(); hand.scale.setScalar(1 / k); (handBone || obj).add(hand);
  if (teacher || monitor) { const r = makeRuler(); r.rotation.x = -Math.PI / 2; hand.add(r); }
  const mixer = new THREE.AnimationMixer(obj), acts = {}; for (const clip of src.animations) acts[clip.name] = mixer.clipAction(clip);
  let cur = null, shot = 0, held = null;
  const play = (name) => { if (cur === name || !acts[name]) return; if (cur && acts[cur]) acts[cur].fadeOut(0.18); acts[name].reset().fadeIn(0.18).play(); cur = name; };
  play('Idle');
  return {
    group: g, hand,
    setHeld(mesh) { if (held) hand.remove(held); held = mesh; if (mesh) { mesh.rotation.set(-Math.PI / 2, 0, 0); mesh.position.set(0, 0.08, 0); hand.add(mesh); } },
    swing() { const a = acts[teacher || monitor ? '1H_Melee_Attack_Chop' : 'Throw']; if (!a) return; if (cur && acts[cur]) acts[cur].fadeOut(0.06); cur = null; a.reset().setLoop(THREE.LoopOnce, 1).fadeIn(0.06).play(); shot = a.getClip().duration * 0.85; },
    update(dt, speed, crouch, pitch, air) {
      mixer.update(dt); obj.scale.y = k * (crouch ? 0.72 : 1);
      if (shot > 0) { shot -= dt; return; }
      play(air ? 'Jump_Idle' : speed > 5.6 ? 'Running_A' : speed > 0.7 ? 'Walking_A' : 'Idle');
    },
  };
}

export async function loadAssets(game) {
  const world = game.world, col = new THREE.Color(), TINT = [0xc0392b, 0x1f4e8c, 0xf2f2f2, 0x4a4d53, 0x8d99a6, 0x2e7d4f, 0xd9a520, 0x6b1f2a];
  const props = Object.entries(PROP_MODELS).map(async ([type, [dir, file, fit]]) => {
    try {
      const gltf = await load(`${BASE}${dir}/${file}.gltf`), geo = bake(gltf.scene, PROPS[type], fit), mesh = world.propMesh[type];
      world.propGeo[type] = geo;
      if (mesh) {
        mesh.geometry = geo; mesh.computeBoundingSphere();
        if (type === 'car' && mesh.instanceColor) { for (let i = 0; i < mesh.count; i++) mesh.setColorAt(i, col.set(0xffffff).lerp(new THREE.Color(TINT[i % TINT.length]), 0.3).multiplyScalar(1.6)); mesh.instanceColor.needsUpdate = true; }
      }
    } catch (e) { console.warn('prop model skipped', type, e); }
  });
  await Promise.all(props); world._sx = 1e9; game.refreshVisuals();
  const chars = ['Rogue', 'Knight', 'Rogue_Hooded', 'Mage'].map(async (name) => {
    try { const gltf = await load(`${BASE}characters/${name}.glb`), box = new THREE.Box3().setFromObject(gltf.scene); CHAR[name] = { scene: gltf.scene, animations: gltf.animations, h: Math.max(0.5, box.max.y - box.min.y) }; }
    catch (e) { console.warn('character skipped', name, e); }
  });
  await Promise.all(chars);
  if (Object.keys(CHAR).length) { setCharacterFactory(character); game.refreshVisuals(); }
}
