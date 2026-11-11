// Deterministic furniture / prop placement. Every client runs this with the same seed,
// so the world (and its collision) is identical for everyone without syncing it.
import { PROPS } from './props.js';
import { mulberry32 } from './util.js';
import { LOTS, SPECIAL, BOUNDS } from './campus.js';

export function furnish(campus) {
  const { GX, GZ, OX, OZ, rooms, roomGrid, ground, hW, vW } = campus;
  const RES = 4, OW = GX * RES, OH = GZ * RES, occ = new Uint8Array(OW * OH);
  const inst = [], trees = [], rng = mulberry32(1912);
  const R = (a, b) => a + rng() * (b - a), RI = (n) => Math.floor(rng() * n), pick = (a) => a[RI(a.length)];
  const span = (x0, z0, x1, z1) => [Math.max(0, Math.floor((x0 - OX) * RES)), Math.max(0, Math.floor((z0 - OZ) * RES)), Math.min(OW - 1, Math.ceil((x1 - OX) * RES) - 1), Math.min(OH - 1, Math.ceil((z1 - OZ) * RES) - 1)];
  const mark = (x0, z0, x1, z1, v = 1) => { const [a, b, c, d] = span(x0, z0, x1, z1); for (let j = b; j <= d; j++) for (let i = a; i <= c; i++) if (!occ[j * OW + i]) occ[j * OW + i] = v; };
  const free = (x0, z0, x1, z1) => { const [a, b, c, d] = span(x0, z0, x1, z1); for (let j = b; j <= d; j++) for (let i = a; i <= c; i++) if (occ[j * OW + i]) return false; return true; };
  const indoor = (x, z) => { const i = Math.floor(x) - OX, j = Math.floor(z) - OZ; return i >= 0 && j >= 0 && i < GX && j < GZ && roomGrid[j * GX + i] > 0; };
  const gnd = (x, z) => { const i = Math.floor(x) - OX, j = Math.floor(z) - OZ; return i >= 0 && j >= 0 && i < GX && j < GZ ? ground[j * GX + i] : 0; };

  // keep doorways clear
  for (const d of campus.doors) {
    if (d.o === 'h') mark(d.a - 0.3, d.c - 1.7, d.b + 0.3, d.c + 1.7, 2); else mark(d.c - 1.7, d.a - 0.3, d.c + 1.7, d.b + 0.3, 2);
  }

  function put(type, x, z, rot = 0, o = {}) {
    const P = PROPS[type]; rot &= 3;
    const sw = rot & 1 ? P.d : P.w, sd = rot & 1 ? P.w : P.d;
    const x0 = x - sw / 2, x1 = x + sw / 2, z0 = z - sd / 2, z1 = z + sd / 2;
    if (o.room) { const r = o.room, m = 0.16; if (x0 < r.x0 + m || x1 > r.x1 - m || z0 < r.z0 + m || z1 > r.z1 - m) return false; }
    if (o.out && (indoor(x0, z0) || indoor(x1, z1) || indoor(x0, z1) || indoor(x1, z0) || x0 < BOUNDS.x0 + 1 || x1 > BOUNDS.x1 - 1 || z0 < BOUNDS.z0 + 1 || z1 > BOUNDS.z1 - 1)) return false;
    if (!o.y) { if (!free(x0 - 0.06, z0 - 0.06, x1 + 0.06, z1 + 0.06)) return false; mark(x0, z0, x1, z1, 1); }
    inst.push({ t: type, x, y: o.y || 0, z, r: rot, c: o.c });
    return true;
  }
  const RZ = [1, 0, 3, 2];
  function frame(r) {
    const lx = r.x1 - r.x0, lz = r.z1 - r.z0, X = lx >= lz;
    const f = {
      L: X ? lx : lz, S: X ? lz : lx,
      put: (t, u, v, k = 0, o = {}) => put(t, X ? r.x0 + u : r.x0 + v, X ? r.z0 + v : r.z0 + u, X ? k : RZ[k & 3], { ...o, room: r }),
      scatter: (types, n, m = 0.9) => { for (let i = 0, got = 0; i < n * 8 && got < n; i++) if (f.put(pick(types), R(m, f.L - m), R(m, f.S - m), RI(4))) got++; },
    };
    return f;
  }
  const FUR = {
    class(f) {
      const { L, S } = f;
      f.put('whiteboard', 0.75, S / 2, 1); f.put('desk', 2.3, S / 2 - 2.4, 1); f.put('chair', 1.6, S / 2 - 2.4, 1); f.put('podium', 2.3, S / 2 + 1.6, 1);
      for (let u = 4.4; u <= L - 1.7; u += 2.05) for (let v = 1.3; v <= S - 1.2; v += 2.1) {
        if (!f.put('desk', u, v, 1)) continue;
        f.put('chair', u + 0.64, v, 3);
        if (rng() < 0.2) f.put('backpack', u + 0.2, v + 0.9, RI(4));
        if (rng() < 0.16) f.put('books', u, v + R(-0.3, 0.3), RI(4), { y: 0.75 });
      }
      f.put('trash', L - 0.5, 0.5); f.put('plant', L - 0.55, S - 0.55); f.put('bookshelf', L - 0.42, S / 2, 3); f.put('recycle', L - 0.5, 1.1);
    },
    lab(f) {
      const { L, S } = f;
      f.put('whiteboard', 0.75, S / 2, 1);
      for (let u = 3.2; u <= L - 1.5; u += 2.4) for (let v = 1.4; v <= S - 1.3; v += 2.5) { if (f.put('workstation', u, v, 1)) f.put('chair', u + 0.72, v - 0.1, 3); }
      f.put('printer', L - 0.6, 0.6, 3); f.put('cabinet', L - 0.5, S - 0.6, 3); f.put('trash', 0.5, 0.5); f.put('serverrack', 0.6, S - 0.8, 1); f.put('recycle', 0.5, 1.1);
    },
    office(f) {
      const { L, S } = f;
      for (let u = 2; u <= L - 1.6; u += 3.3) {
        if (f.put('workstation', u, 0.62, 0)) f.put('chair', u - 0.1, 1.35, 2);
        if (f.put('workstation', u, S - 0.62, 2)) f.put('chair', u + 0.1, S - 1.35, 0);
        f.put('cabinet', u + 1.2, 0.5, 0); f.put('cabinet', u + 1.2, S - 0.5, 2);
      }
      f.put('plant', 0.6, S / 2 + 2); f.put('printer', L - 0.6, S / 2 + 1.5, 3); f.put('cooler', L - 0.45, S / 2 - 2, 3); f.put('sofa', 0.65, S / 2 - 2.6, 1);
      f.put('trash', L - 0.5, S / 2); f.scatter(['backpack', 'books', 'recycle'], 2);
    },
    meeting(f) {
      const { L, S } = f;
      f.put('whiteboard', 0.75, S / 2, 1); f.put('podium', 1.9, S / 2 + 2.2, 1);
      for (let u = 3.6; u <= L - 2.4; u += 1.85) {
        f.put('table', u, S / 2, 0);
        for (const du of [-0.45, 0.45]) { f.put('chair', u + du, S / 2 - 0.85, 0); f.put('chair', u + du, S / 2 + 0.85, 2); }
      }
      f.put('plant', L - 0.6, 0.6); f.put('plant', L - 0.6, S - 0.6); f.put('cooler', L - 0.45, S / 2, 3); f.put('trash', 0.5, 0.5);
    },
    lounge(f) {
      const { L, S } = f;
      for (let u = 2.2; u <= L - 2; u += 4.2) { f.put('sofa', u, 0.65, 0); f.put('sofa', u, S - 0.65, 2); }
      for (let u = 2.6; u <= L - 2.4; u += 3.6) for (let v = 3.4; v <= S - 3.2; v += 3.4) {
        if (!f.put('roundtable', u, v)) continue;
        f.put('chair', u - 0.95, v, 1); f.put('chair', u + 0.95, v, 3); f.put('chair', u, v - 0.95, 0); f.put('chair', u, v + 0.95, 2);
      }
      f.put('vending', L - 0.6, S / 2 - 1.2, 3); f.put('vending', L - 0.6, S / 2 + 1.2, 3); f.put('cooler', 0.45, S / 2, 1);
      f.put('plant', 0.6, 0.6); f.put('trash', L - 0.5, 0.5); f.put('recycle', L - 0.5, S - 0.5); f.scatter(['backpack', 'backpack', 'books'], 3);
    },
    cafe(f) {
      const { L, S } = f;
      for (let u = 2.4; u <= L - 7; u += 3.5) for (let v = 2.2; v <= S - 2; v += 3.3) {
        if (!f.put('roundtable', u, v)) continue;
        f.put('chair', u - 0.95, v, 1); f.put('chair', u + 0.95, v, 3); f.put('chair', u, v - 0.95, 0); f.put('chair', u, v + 0.95, 2);
        if (rng() < 0.25) f.put('backpack', u + 0.9, v + 0.9, RI(4));
      }
      for (let v = 2; v <= S - 2; v += 2.6) f.put('counter', L - 3.2, v, 1);
      f.put('vending', L - 0.6, 1.4, 3); f.put('vending', L - 0.6, 2.8, 3); f.put('vending', L - 0.6, S - 1.6, 3); f.put('cooler', L - 0.5, S / 2, 3);
      f.put('trash', 0.5, 0.5); f.put('recycle', 0.5, 1.1); f.put('trash', L / 2, S - 0.5); f.put('plant', 0.6, S - 0.6);
    },
    library(f) {
      const { L, S } = f;
      for (let u = 2.5; u <= L * 0.55; u += 2.3) for (let v = 1.6; v <= S - 1.5; v += 3.6) f.put('bookshelf', u, v, 1);
      for (let u = L * 0.55 + 2.5; u <= L - 2.2; u += 3.4) for (let v = 2.4; v <= S - 2.2; v += 3.3) {
        if (!f.put('table', u, v, 0)) continue;
        for (const du of [-0.45, 0.45]) { f.put('chair', u + du, v - 0.85, 0); f.put('chair', u + du, v + 0.85, 2); }
        if (rng() < 0.6) f.put('books', u + R(-0.5, 0.5), v, RI(4), { y: 0.75 });
      }
      f.put('counter', 1.0, S / 2, 1); f.put('printer', L - 0.6, 0.6, 3); f.put('sofa', L - 0.7, S / 2, 3); f.put('plant', L - 0.6, S - 0.6); f.put('plant', 0.6, 0.6);
      f.scatter(['backpack', 'books', 'recycle'], 4);
    },
    store(f) {
      const { L, S } = f;
      for (let u = 2.4; u <= L - 3.5; u += 2.2) for (let v = 1.6; v <= S - 1.4; v += 3.2) f.put('shelf', u, v, 1);
      f.put('counter', L - 1.3, S / 2, 1); f.put('plant', 0.6, 0.6); f.put('vending', L - 0.6, 0.9, 3); f.scatter(['crate', 'backpack'], 3);
    },
    shop(f) {
      const { L, S } = f;
      for (let u = 2; u <= L - 1.6; u += 3.4) { f.put('workbench', u, 0.62, 0); if (rng() < 0.6) f.put('toolchest', u + 1.7, 0.5, 0); }
      f.scatter(['crate', 'barrel', 'cone', 'toolchest', 'crate', 'barrel', 'workbench', 'cabinet'], Math.round(L * S / 16), 1.2);
      f.put('extinguisher', 0.4, S - 0.4); f.put('trash', L - 0.5, S - 0.5); f.put('whiteboard', L - 0.8, S / 2, 3);
    },
    garage(f) {
      const { L, S } = f;
      for (let u = 4; u <= L - 3; u += 5) f.put('car', u, S / 2 - 3, 0, { c: RI(8) });
      for (let u = 2; u <= L - 1.6; u += 3.6) { f.put('workbench', u, 0.62, 0); f.put('toolchest', u + 1.7, 0.5, 0); }
      f.scatter(['barrel', 'cone', 'crate', 'toolchest', 'cone'], 14, 1.2); f.put('extinguisher', 0.4, S - 0.4);
    },
    robot(f) {
      const { L, S } = f;
      for (let u = 4; u <= L - 3; u += 5.5) for (let v = 6; v <= S - 5; v += 6.5) { f.put('robotarm', u, v, RI(4)); f.put('cone', u + 1.4, v + 1.4); f.put('cone', u - 1.4, v - 1.4); }
      for (let u = 2; u <= L - 1.6; u += 3.4) { f.put('workbench', u, 0.62, 0); if (rng() < 0.5) f.put('serverrack', u + 1.7, 0.6, 0); }
      f.scatter(['crate', 'barrel', 'workstation', 'toolchest', 'cabinet'], Math.round(L * S / 28), 1.2); f.put('whiteboard', L - 0.8, S / 2, 3); f.put('extinguisher', 0.4, S - 0.4);
    },
    server(f) {
      const { L, S } = f;
      for (let u = 2; u <= L - 1.4; u += 2.6) for (let v = 1.4; v <= S - 3.2; v += 0.75) f.put('serverrack', u, v, 1);
      f.put('workstation', L / 2, S - 0.62, 2); f.put('chair', L / 2, S - 1.35, 0); f.put('extinguisher', 0.4, S - 0.4); f.put('crate', L - 0.7, S - 0.7);
    },
    clinic(f) {
      const { L, S } = f;
      for (let u = 2; u <= L - 1.4; u += 2.6) { if (f.put('bed', u, 1.3, 0)) f.put('cabinet', u + 1.0, 0.5, 0); if (rng() < 0.7) f.put('bed', u, S - 1.3, 2); }
      f.put('workstation', L - 0.62, S / 2, 3); f.put('chair', L - 1.35, S / 2, 1); f.put('cooler', 0.45, S / 2, 1); f.put('trash', 0.5, S / 2 + 0.8); f.scatter(['chair', 'cabinet'], 2);
    },
    auditorium(f) {
      const { L, S } = f;
      f.put('podium', 2.4, S / 2 - 1.5, 1); f.put('whiteboard', 0.75, S / 2 + 1, 1);
      for (let u = 6; u <= L - 1.2; u += 1.35) for (let v = 1.0; v <= S - 0.9; v += 0.66) { if (Math.abs(v - S / 2) < 0.9) continue; f.put('seat', u, v, 3); }
      f.put('trash', L - 0.5, S / 2); f.put('plant', 0.6, 0.6);
    },
    gym(f) {
      const { L, S } = f;
      f.put('hoop', 1.0, S / 2, 1); f.put('hoop', L - 1.0, S / 2, 3);
      for (let u = 6; u <= L - 6; u += 1.8) { f.put('bench', u, 0.5, 0); f.put('bench', u, 1.1, 0); }
      f.scatter(['cone', 'cone', 'crate', 'backpack', 'cooler'], 12, 1.5); f.put('trash', 0.5, S - 0.5); f.put('recycle', 1.1, S - 0.5); f.put('vending', L - 0.6, S - 1.2, 3);
    },
    kitchen(f) {
      const { L, S } = f;
      for (let u = 1.8; u <= L - 1.6; u += 2.7) { f.put('counter', u, 0.6, 0); f.put('counter', u, S / 2, 0); }
      f.scatter(['barrel', 'crate', 'trash', 'recycle', 'cabinet'], 7); f.put('extinguisher', 0.4, S - 0.4);
    },
    storage(f) { f.scatter(['crate', 'crate', 'barrel', 'shelf', 'cone', 'toolchest', 'cabinet'], Math.max(5, Math.round(f.L * f.S / 9)), 0.8); },
    dorm(f) {
      const { L, S } = f;
      f.put('bed', 0.75, 1.3, 0); f.put('bed', L - 0.75, 1.3, 0); f.put('sofa', L / 2, S - 0.65, 2); f.put('desk', 0.5, S - 1.2, 0); f.put('chair', 1.15, S - 1.2, 3);
      f.put('bookshelf', L / 2, 0.42, 0); f.put('plant', L - 0.6, S - 0.6); f.scatter(['backpack', 'books', 'trash'], 2, 0.6);
    },
    lobby(f) {
      const { L, S } = f;
      f.put('plant', 0.6, 0.6); f.put('plant', L - 0.6, 0.6); f.put('plant', 0.6, S - 0.6); f.put('plant', L - 0.6, S - 0.6);
      if (L >= 12) { f.put('counter', L / 2 + 3.6, 1.3, 0); f.put('sofa', 2.4, 0.7, 0); f.put('sofa', 2.4, S - 0.7, 2); f.put('bench', L - 2.6, S - 0.5, 2); }
      f.put('trash', 1.3, 0.5); f.put('recycle', L - 1.3, S - 0.5);
    },
  };
  for (let i = 1; i < rooms.length; i++) { const r = rooms[i]; if (FUR[r.type]) FUR[r.type](frame(r)); }

  // hallway dressing — things pushed against corridor walls
  const HALL = ['bench', 'trash', 'recycle', 'plant', 'vending', 'extinguisher', 'cooler', 'bench', 'plant', 'cabinet', 'backpack', 'trash'];
  for (let i = 1; i < rooms.length; i++) {
    const r = rooms[i]; if (r.type !== 'hall') continue;
    for (let z = r.z0; z < r.z1; z++) for (let x = r.x0; x < r.x1; x++) {
      if (rng() > 0.085) continue;
      const t = pick(HALL), P = PROPS[t], gi = x - OX, gj = z - OZ, o = { room: r };
      if (hW[gj * GX + gi] > 0) put(t, x + 0.5, z + P.d / 2 + 0.2, 0, o);
      else if (hW[(gj + 1) * GX + gi] > 0) put(t, x + 0.5, z + 1 - P.d / 2 - 0.2, 2, o);
      else if (vW[gj * (GX + 1) + gi] > 0) put(t, x + P.d / 2 + 0.2, z + 0.5, 1, o);
      else if (vW[gj * (GX + 1) + gi + 1] > 0) put(t, x + 1 - P.d / 2 - 0.2, z + 0.5, 3, o);
    }
  }

  /* ───────── outdoors ───────── */
  const out = { out: 1 };
  const stalls = [];
  for (const l of LOTS) {
    const lx = l.x1 - l.x0, lz = l.z1 - l.z0, X = lx >= lz, L = X ? lx : lz, S = X ? lz : lx;
    const rows = [[0.6, 0], [S - 5.6, 2]];
    if (S >= 34) { rows.push([S / 2 - 5.2, 2], [S / 2 + 0.2, 0]); }
    if (S >= 60) { rows.push([S * 0.25 - 2.5, 2], [S * 0.75 - 2.5, 0]); }
    for (const [v, k] of rows) for (let u = 2; u <= L - 2.6; u += 2.75) {
      const cx = X ? l.x0 + u + 1.3 : l.x0 + v + 2.5, cz = X ? l.z0 + v + 2.5 : l.z0 + u + 1.3, rot = X ? k : RZ[k] ^ 0;
      stalls.push({ x: X ? l.x0 + u : l.x0 + v, z: X ? l.z0 + v : l.z0 + u, X });
      if (rng() < 0.42) put('car', cx, cz, X ? k : k + 1, { ...out, c: RI(8) });
      else if (rng() < 0.03) put('cone', cx, cz, 0, out);
    }
    // lamp posts down the middle
    for (let u = 6; u < L - 4; u += 16) put('lamp', X ? l.x0 + u : l.x0 + S / 2, X ? l.z0 + S / 2 : l.z0 + u, X ? 1 : 0, out);
  }
  for (let x = -128; x <= 128; x += 22) { put('lamp', x, 67.5, 1, out); put('lamp', x + 11, 82.5, 3, out); }
  for (let x = -96; x <= 92; x += 12) { if (rng() < 0.7) put(pick(['bench', 'bench', 'trash', 'plant', 'recycle']), x + R(-2, 2), 40.6, 0, out); }
  put('flagpole', -3, 58, 0, out); put('flagpole', 0, 58, 0, out); put('flagpole', 3, 58, 0, out);
  for (const [x, z] of [[-5, 46], [17, 46], [-5, 54], [17, 54]]) put('plant', x, z, 0, out);
  put('bench', -6.5, 50, 1, out); put('bench', 18.5, 50, 3, out); put('trash', 12, 42, 0, out); put('recycle', 0, 42, 0, out);
  // courtyard
  const fp = SPECIAL.firepit; put('firepit', fp.x, fp.z, 0, out);
  put('bench', fp.x, fp.z - 2.6, 0, out); put('bench', fp.x, fp.z + 2.6, 2, out); put('bench', fp.x - 2.6, fp.z, 1, out); put('bench', fp.x + 2.6, fp.z, 3, out);
  for (const [x, z] of [[-12, -6], [-12, -30], [-6, -38], [18, -36], [20, -2], [50, -22], [56, -38], [32, -22], [-14, -14]]) put('picnic', x, z, RI(2), out);
  put('hoop', 37.2, -5, 1, out); put('hoop', 54.8, -5, 3, out);
  for (let i = 0; i < 10; i++) put(pick(['trash', 'bench', 'recycle', 'backpack', 'cone']), R(-18, 60), R(-42, 4), RI(4), out);
  // disc golf + grounds
  for (const [x, z] of [[108, -84], [130, -76], [112, -62], [132, -52], [110, -40], [70, -100], [20, -84.5], [-70, -100], [-110, -100]]) put('discbasket', x, z, 0, out);
  for (const [x, z] of [[-58, -60], [-58, -30], [98.5, -84], [64, 86], [-12, 116]]) put('dumpster', x, z, 1, out);
  for (let i = 0; i < 26; i++) put(pick(['cone', 'trash', 'bench', 'picnic', 'crate', 'barrel', 'backpack']), R(-132, 132), R(-112, 112), RI(4), out);

  // trees: autumn hardwoods + pines on open grass
  for (let i = 0; i < 2600 && trees.length < 250; i++) {
    const x = R(BOUNDS.x0 + 2, BOUNDS.x1 - 2), z = R(BOUNDS.z0 + 2, BOUNDS.z1 - 2);
    if (gnd(x, z) !== 0 || indoor(x, z)) continue;
    let ok = true;
    for (const [dx, dz] of [[2.5, 0], [-2.5, 0], [0, 2.5], [0, -2.5], [1.8, 1.8], [-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8]]) if (indoor(x + dx, z + dz) || gnd(x + dx, z + dz) !== 0) { ok = false; break; }
    if (!ok || !free(x - 1.6, z - 1.6, x + 1.6, z + 1.6)) continue;
    mark(x - 0.45, z - 0.45, x + 0.45, z + 0.45, 3);
    trees.push({ x, z, s: R(0.8, 1.35), k: rng() < 0.3 ? 1 : 0, c: RI(6), a: R(0, 6.28) });
  }

  // spawn points: open floor away from props
  const spawns = [];
  for (let z = BOUNDS.z0 + 3; z < BOUNDS.z1 - 3; z += 2) for (let x = BOUNDS.x0 + 3; x < BOUNDS.x1 - 3; x += 2) {
    if (!free(x - 0.05, z - 0.05, x + 1.05, z + 1.05)) continue;
    const r = campus.roomAt(x + 0.5, z + 0.5);
    spawns.push({ x: x + 0.5, z: z + 0.5, in: r ? 1 : 0 });
  }
  return { inst, trees, spawns, stalls };
}
