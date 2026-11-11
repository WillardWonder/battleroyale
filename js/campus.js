// NTC Wausau campus layout — data-driven so it can be corrected room by room.
// 1 unit = 1 metre. +x = east, +z = south (W. Campus Drive runs east-west along the south side).
// Building names/functions follow NTC's published campus maps; footprints are a scaled approximation.
// To change the map: edit the R()/H()/strip() calls, EXITS and GROUND below. Walls, doors, windows,
// furniture, the minimap and collision are all generated from this file.

export const GX = 320, GZ = 280, OX = -160, OZ = -140;
export const BOUNDS = { x0: -157, x1: 157, z0: -137, z1: 137 };

// ceil = interior ceiling height, h = exterior wall height, grp = hallway group (shared corridors)
export const BLD = {
  A: { name: 'Building A', ceil: 3.6, h: 5, grp: 'MAIN' },
  B: { name: 'Building B', ceil: 3.6, h: 5, grp: 'MAIN' },
  C: { name: 'Building C', ceil: 3.6, h: 5, grp: 'MAIN' },
  D: { name: 'Building D', ceil: 3.6, h: 5, grp: 'MAIN' },
  E: { name: 'Building E', ceil: 3.6, h: 5, grp: 'MAIN' },
  EA: { name: 'Building E', ceil: 7, h: 8.2, grp: 'MAIN' },
  F: { name: 'Building F', ceil: 3.6, h: 5, grp: 'MAIN' },
  HH: { name: 'Building H', ceil: 3.6, h: 5, grp: 'MAIN' },
  IH: { name: 'Building I', ceil: 3.6, h: 5, grp: 'MAIN' },
  H: { name: 'Building H', ceil: 6, h: 7.2, grp: 'MAIN' },
  I: { name: 'Building I', ceil: 6, h: 7.2, grp: 'MAIN' },
  G: { name: 'Building G', ceil: 5, h: 6.2, grp: 'MAIN' },
  CHS: { name: 'Center for Health Sciences', ceil: 3.8, h: 15, grp: 'CHS', stories: 4 },
  CBI: { name: 'Center for Business & Industry', ceil: 3.6, h: 5.6, grp: 'CBI' },
  CGE: { name: 'Center for Geriatric Education', ceil: 3.4, h: 4.6, grp: 'CGE' },
  TWS: { name: 'Timberwolf Suites', ceil: 3.2, h: 9.9, grp: 'TWS', stories: 3 },
  SHED: { name: 'Storage Shed', ceil: 3, h: 3.5, grp: 'SHED' },
};
export const BKEYS = Object.keys(BLD);

const rooms = [null];
const H = (b, x0, z0, x1, z1, name, type = 'hall') => rooms.push({ b, x0, z0, x1, z1, type, name, hall: true });
const R = (b, x0, z0, x1, z1, type, name) => rooms.push({ b, x0, z0, x1, z1, type, name });
const strip = (b, x0, z0, x1, z1, ax, defs) => {
  let p = ax === 'x' ? x0 : z0;
  for (const [size, type, name] of defs) {
    if (ax === 'x') R(b, p, z0, p + size, z1, type, name); else R(b, x0, p, x1, p + size, type, name);
    p += size;
  }
};

/* ───────── Layout traced from NTC's Wausau campus map (ground floor), 8/19/2025 edition ─────────
   Coordinates below are pixels on that map image (north is up, Campus Drive along the top);
   P() converts them to metres at 0.27 m per pixel. Each building's footprint is painted as hallway first,
   then rooms are placed on top — whatever is left over is corridor. */
const SCALE = 0.34; // metres per map pixel — change this one number to rescale the whole building
const X = (px) => Math.round((px - 680) * SCALE), Z = (py) => Math.round((py - 475) * SCALE);
const F = (b, x0, y0, x1, y1, name) => H(b, X(x0), Z(y0), X(x1), Z(y1), name);
const P = (b, x0, y0, x1, y1, type, name) => { const a = X(x0), c = Z(y0); R(b, a, c, Math.max(a + 3, X(x1)), Math.max(c + 3, Z(y1)), type, name); };
// footprints (corridors)
F('D', 315, 155, 455, 393, 'D Hallway'); F('D', 262, 318, 320, 393, 'Main Entrance');
F('E', 455, 130, 520, 393, 'E Hallway'); F('F', 515, 265, 720, 393, 'F Hallway'); F('G', 715, 340, 778, 393, 'G Hallway');
F('C', 262, 393, 990, 407, 'Main Corridor'); F('C', 330, 407, 470, 600, 'C Hallway'); F('C', 262, 488, 365, 588, 'Library Hallway');
F('B', 365, 588, 490, 682, 'B Hallway'); F('A', 458, 680, 695, 820, 'A Hallway');
F('H', 820, 235, 1100, 393, 'H Hallway'); F('H', 862, 407, 1068, 437, 'H Hallway'); F('H', 945, 437, 1080, 612, 'H Hallway'); F('I', 942, 610, 1080, 716, 'I Hallway');
// Building D
P('D', 318, 160, 365, 210, 'class', 'D150 Classroom'); P('D', 368, 185, 394, 210, 'office', 'D160 Office'); P('D', 398, 158, 440, 200, 'class', 'D172 Classroom');
P('D', 322, 218, 352, 242, 'office', 'D155A Office'); P('D', 322, 255, 378, 282, 'office', 'D128 Offices'); P('D', 322, 286, 378, 313, 'office', 'D127 Offices');
P('D', 322, 320, 380, 380, 'store', 'D130 Bookstore'); P('D', 390, 250, 430, 340, 'lounge', 'D112 Student Leadership Center'); P('D', 390, 345, 430, 382, 'lounge', 'D109 The Den');
P('D', 272, 322, 316, 372, 'meeting', 'D102 Timberwolf Community Room');
// Building E
P('E', 462, 135, 495, 170, 'kitchen', 'Spoons'); P('E', 462, 174, 490, 200, 'class', 'E114 Classroom'); P('E', 493, 174, 518, 200, 'class', 'E116 Classroom');
P('E', 478, 215, 516, 245, 'kitchen', 'E105 Kitchen'); P('E', 462, 249, 512, 285, 'cafe', 'E111 Cafeteria'); P('E', 462, 289, 512, 345, 'cafe', 'E103 Dining Area');
P('E', 458, 350, 484, 388, 'meeting', 'E101 Meeting Room'); P('E', 487, 350, 514, 388, 'meeting', 'E102 Meeting Room');
// Building F (lower) and G
P('F', 522, 270, 560, 300, 'lab', 'E104 Esports'); P('F', 522, 305, 540, 340, 'class', 'F114 Classroom'); P('F', 543, 305, 568, 338, 'class', 'F116 Classroom');
P('F', 522, 345, 542, 388, 'lab', 'F110 Lab'); P('F', 576, 285, 614, 345, 'shop', 'F105 Technical Lab'); P('F', 576, 350, 614, 388, 'lab', 'F100 Lab');
P('F', 628, 298, 662, 360, 'shop', 'F113 Technical Lab'); P('F', 666, 298, 712, 388, 'garage', 'F121 Technical Center');
P('G', 722, 345, 772, 388, 'shop', 'G103 Building & Grounds');
// Building C + Library
P('C', 380, 412, 442, 452, 'office', 'C106 Student Services'); P('C', 336, 425, 372, 462, 'lab', 'C143 Testing Center'); P('C', 380, 458, 455, 482, 'office', 'C120 Offices');
P('C', 336, 470, 372, 486, 'office', 'C157 Advising'); P('C', 312, 490, 372, 510, 'class', 'C170 College Prep Center'); P('C', 312, 513, 372, 538, 'class', 'C175 Academic Resource Center');
P('C', 380, 490, 400, 508, 'office', 'C135 Office'); P('C', 404, 488, 448, 542, 'office', 'C146 Offices'); P('C', 404, 558, 440, 588, 'office', 'C152 Office');
P('C', 266, 542, 362, 586, 'library', 'Library'); P('C', 266, 492, 308, 538, 'library', 'Library Commons');
// Building B
P('B', 368, 605, 390, 656, 'class', 'C180 Classroom'); P('B', 393, 605, 414, 652, 'class', 'C194 Classroom'); P('B', 448, 612, 480, 634, 'office', 'B113 Office');
P('B', 426, 630, 446, 670, 'office', 'B127 Human Resources'); P('B', 449, 640, 486, 670, 'office', 'B123 Offices'); P('B', 430, 592, 462, 608, 'office', 'B100 Office');
// Building A (lower) — iTEC + Workforce Leadership Center
P('A', 460, 683, 486, 705, 'class', 'A104 Classroom'); P('A', 460, 708, 486, 730, 'class', 'A105 Classroom'); P('A', 460, 733, 486, 757, 'class', 'A107 Classroom'); P('A', 460, 760, 486, 788, 'class', 'A108 Classroom');
P('A', 474, 795, 502, 818, 'office', 'A111 Office'); P('A', 500, 684, 542, 706, 'lab', 'A122 Lab'); P('A', 500, 752, 548, 786, 'lab', 'A113 Lab');
P('A', 548, 688, 600, 722, 'lab', 'A134 iTEC'); P('A', 552, 738, 600, 792, 'lab', 'A143 IT Lab'); P('A', 606, 768, 628, 796, 'class', 'A155 WTPD');
P('A', 630, 688, 656, 716, 'class', 'A159 Classroom'); P('A', 662, 688, 693, 724, 'meeting', 'A168 Workforce Leadership'); P('A', 662, 727, 693, 757, 'class', 'A167 Workforce Leadership');
P('A', 662, 760, 693, 786, 'class', 'A166 Workforce Leadership'); P('A', 662, 789, 693, 816, 'class', 'A165 Workforce Leadership'); P('A', 630, 796, 658, 818, 'office', 'A162 Office');
// Building H
P('H', 824, 240, 905, 300, 'shop', 'H114 Shop'); P('H', 910, 240, 990, 300, 'shop', 'H112 Shop'); P('H', 824, 310, 876, 336, 'lab', 'H117 Lab'); P('H', 824, 340, 852, 358, 'office', 'H119 Office');
P('H', 824, 362, 852, 390, 'class', 'H101 Classroom'); P('H', 856, 362, 880, 390, 'class', 'H103 Classroom'); P('H', 884, 310, 936, 356, 'shop', 'H113 Shop'); P('H', 942, 310, 986, 356, 'lab', 'H111 Lab');
P('H', 905, 370, 936, 390, 'office', 'H107 Office'); P('H', 996, 306, 1070, 390, 'shop', 'H108 Shop'); P('H', 1073, 330, 1098, 386, 'storage', 'H110 Storage');
P('H', 866, 411, 890, 435, 'class', 'H102 Classroom'); P('H', 893, 411, 916, 435, 'class', 'H104 Classroom'); P('H', 919, 411, 942, 435, 'class', 'H106 Classroom');
P('H', 990, 411, 1010, 433, 'office', 'H124 Office'); P('H', 1013, 411, 1036, 433, 'office', 'H122 Office'); P('H', 1044, 411, 1066, 433, 'office', 'H118 Office');
P('H', 947, 452, 971, 478, 'class', 'H123 Classroom'); P('H', 947, 482, 971, 506, 'class', 'H127 Classroom'); P('H', 947, 509, 971, 529, 'class', 'H129 Classroom'); P('H', 947, 532, 971, 552, 'class', 'H131 Classroom');
P('H', 986, 442, 1052, 470, 'shop', 'H137 Shop'); P('H', 986, 473, 1062, 548, 'robot', 'H136 Lab'); P('H', 986, 556, 1050, 600, 'robot', 'H146 Mechatronics & Fluid Power Lab'); P('H', 1053, 568, 1078, 598, 'storage', 'H147 Storage');
// Building I
P('I', 946, 616, 984, 644, 'lab', 'I101 Lab'); P('I', 946, 648, 984, 686, 'robot', 'I103 Industry 4.0 Smart Manufacturing Lab'); P('I', 946, 690, 984, 713, 'lab', 'I105 Lab');
P('I', 994, 614, 1046, 713, 'robot', 'I104 Electronics, Mechanics & Robotics Lab'); P('I', 1050, 640, 1078, 668, 'lab', 'I110 Lab'); P('I', 1050, 684, 1078, 713, 'lab', 'I112 Lab');

// Exterior doors: approximate spot on the map; each snaps to the nearest outside wall. w = width in metres.
const E = (px, py, w, label, extra = {}) => ({ x: X(px), z: Z(py), w, label, ...extra });
export const EXITS = [
  E(262, 383, 4, 'MAIN ENTRANCE', { big: 1 }), E(316, 232, 2, 'D ENTRANCE'), E(345, 590, 3, 'LOWER C ENTRANCE'), E(410, 682, 2, 'B ENTRANCE'), E(575, 820, 3, 'LOWER A ENTRANCE'),
  E(575, 265, 2, 'F ENTRANCE'), E(1012, 300, 2, 'H ENTRANCE'), E(600, 407, 2), E(780, 407, 2), E(470, 520, 2), E(945, 520, 2), E(560, 680, 2), E(1010, 716, 3), E(488, 130, 2), E(778, 372, 2), E(1080, 500, 2), E(695, 740, 2),
];

export const GTYPES = ['grass', 'road', 'lot', 'conc', 'sand', 'court', 'field'];
const GP = (t, x0, y0, x1, y1) => [t, X(x0), Z(y0), X(x1), Z(y1)];
const LOTPX = [['Parking Lot D', 190, 92, 330, 140], ['Parking Lot C', 105, 215, 195, 330], ['Parking Lot B', 110, 440, 215, 575], ['Parking Lot A', 285, 735, 440, 868], ['Parking Lot E', 830, 95, 980, 200], ['South Lot', 480, 834, 780, 870], ['East Lot', 1112, 380, 1165, 700]];
const GROUND = [
  ['road', -160, -134, 160, -125], ['conc', -160, -124, 160, -122],
  ...LOTPX.map(([, a, b, c, d]) => GP('lot', a, b, c, d)),
  GP('conc', 225, 378, 262, 390), GP('conc', 480, 412, 940, 418), GP('conc', 600, 412, 608, 678), GP('conc', 480, 540, 940, 546), GP('conc', 680, 522, 716, 558), GP('sand', 790, 570, 850, 612), GP('conc', 740, 478, 764, 502),
];
export const LOTS = LOTPX.map(([name, a, b, c, d]) => ({ name, x0: X(a), z0: Z(b), x1: X(c), z1: Z(d) }));
const ZONES = [...LOTS, { name: 'Courtyard', x0: X(470), z0: Z(407), x1: X(945), z1: Z(680) }, { name: 'Campus Drive', x0: -160, z0: -136, x1: 160, z1: -121 }];
// Hide & Seek play areas (map pixels → metres). tier: 0 small (≤5 players), 1 medium (≤12), 2 large (≤24).
const AR = (n, t, x0, y0, x1, y1) => ({ n, t, r: [X(x0) - 1, Z(y0) - 1, X(x1) + 1, Z(y1) + 1] });
export const ARENAS = [
  AR('Building A · iTEC', 0, 458, 680, 695, 820), AR('Building C & Library', 0, 262, 393, 470, 600), AR('Building D', 0, 262, 155, 455, 407), AR('Buildings E & F', 0, 455, 130, 778, 407),
  AR('Building H shops', 0, 820, 235, 1100, 437), AR('Buildings H & I labs', 0, 942, 407, 1080, 716),
  AR('Buildings D, E, F & G', 1, 262, 130, 778, 407), AR('Buildings A, B & C', 1, 262, 393, 695, 820), AR('Buildings H & I', 1, 820, 235, 1100, 716),
  AR('Main Building', 2, 262, 130, 1100, 820),
];
export const SPECIAL = {
  gazebo: { x: X(698), z: Z(540) }, firepit: { x: X(752), z: Z(490) }, sign: { x: X(232), z: Z(350) }, net: { x: X(820), z0: Z(570) + 1, z1: Z(612) - 1 },
  teacherRoom: 'A134 iTEC',
};

let cache = null;
export function buildCampus() {
  if (cache) return cache;
  const N = GX * GZ;
  const roomGrid = new Int16Array(N), idGrid = new Int16Array(N), ground = new Uint8Array(N);
  const hallIds = {}; let nextHall = 1;
  for (let i = 1; i < rooms.length; i++) {
    const r = rooms[i]; r.i = i;
    const id = r.hall ? (hallIds[BLD[r.b].grp] ??= nextHall++) : 1000 + i;
    r.id = id;
    for (let z = r.z0; z < r.z1; z++) for (let x = r.x0; x < r.x1; x++) {
      const k = (z - OZ) * GX + (x - OX); roomGrid[k] = i; idGrid[k] = id;
    }
  }
  // The map was traced room by room, which leaves thin gaps between rooms. Those are not real corridors:
  // keep hallway only where it is at least 3 m wide, and let neighbouring rooms grow into everything else.
  {
    const isHall = (k) => idGrid[k] > 0 && idGrid[k] < 1000, keep = new Uint8Array(N);
    for (let j = 1; j < GZ - 1; j++) for (let i = 1; i < GX - 1; i++) {
      let ok = true; for (let dj = -1; dj <= 1 && ok; dj++) for (let di = -1; di <= 1; di++) if (!isHall((j + dj) * GX + i + di)) { ok = false; break; }
      if (ok) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) keep[(j + dj) * GX + i + di] = 1;
    }
    for (let pass = 0; pass < 12; pass++) {
      const next = [];
      for (let j = 1; j < GZ - 1; j++) for (let i = 1; i < GX - 1; i++) {
        const k = j * GX + i; if (!isHall(k) || keep[k]) continue;
        for (const nk of [k - 1, k + 1, k - GX, k + GX]) if (idGrid[nk] >= 1000) { next.push([k, nk]); break; }
      }
      if (!next.length) break;
      for (const [k, nk] of next) { idGrid[k] = idGrid[nk]; roomGrid[k] = roomGrid[nk]; }
    }
  }
  for (const [t, x0, z0, x1, z1] of GROUND) {
    const g = GTYPES.indexOf(t);
    for (let z = Math.max(z0, OZ); z < Math.min(z1, OZ + GZ); z++) for (let x = Math.max(x0, OX); x < Math.min(x1, OX + GX); x++) ground[(z - OZ) * GX + (x - OX)] = g;
  }
  const cell = (i, j) => (i < 0 || j < 0 || i >= GX || j >= GZ ? -1 : j * GX + i);
  const idOf = (k) => (k < 0 ? 0 : idGrid[k]);
  const bOf = (k) => BKEYS.indexOf(rooms[roomGrid[k]].b);
  // wall codes: (bldIdx+1)*8 + kind. kind 1 interior, 2 exterior (outside on − side), 3 exterior (outside on + side), 6 inter-building
  const wallCode = (ka, kb) => {
    const a = idOf(ka), b = idOf(kb);
    if (a === b) return 0;
    if (a === 0) return (bOf(kb) + 1) * 8 + 2;
    if (b === 0) return (bOf(ka) + 1) * 8 + 3;
    const ba = bOf(ka), bb = bOf(kb), ha = BLD[BKEYS[ba]].h, hb = BLD[BKEYS[bb]].h;
    if (ha !== hb) return ((ha > hb ? ba : bb) + 1) * 8 + 6;
    return (ba + 1) * 8 + 1;
  };
  const hW = new Int16Array((GZ + 1) * GX), vW = new Int16Array(GZ * (GX + 1));
  const hR = new Int16Array((GZ + 1) * GX), vR = new Int16Array(GZ * (GX + 1)); // indoor room on exterior edges
  for (let j = 0; j <= GZ; j++) for (let i = 0; i < GX; i++) {
    const ka = cell(i, j - 1), kb = cell(i, j < GZ ? j : -1), c = wallCode(ka, kb);
    hW[j * GX + i] = c; if ((c & 7) === 2) hR[j * GX + i] = roomGrid[kb]; else if ((c & 7) === 3) hR[j * GX + i] = roomGrid[ka];
  }
  for (let j = 0; j < GZ; j++) for (let i = 0; i <= GX; i++) {
    const ka = cell(i - 1, j), kb = cell(i < GX ? i : -1, j), c = wallCode(ka, kb);
    vW[j * (GX + 1) + i] = c; if ((c & 7) === 2) vR[j * (GX + 1) + i] = roomGrid[kb]; else if ((c & 7) === 3) vR[j * (GX + 1) + i] = roomGrid[ka];
  }
  const doorMeta = []; // {o,c,a,b,ext,room,side,label,...}
  const carve = (o, c, a, w, meta) => {
    for (let t = a; t < a + w; t++) {
      if (o === 'h') { const k = (c - OZ) * GX + (t - OX); if (hW[k] > 0) hW[k] = -hW[k]; }
      else { const k = (t - OZ) * (GX + 1) + (c - OX); if (vW[k] > 0) vW[k] = -vW[k]; }
    }
    doorMeta.push({ o, c, a, b: a + w, ...meta });
  };
  for (const e of EXITS) {
    let best = null;
    for (let j = Math.max(1, e.z - OZ - 8); j < Math.min(GZ, e.z - OZ + 9); j++) for (let i = Math.max(1, e.x - OX - 8); i < Math.min(GX, e.x - OX + 9); i++) {
      const hk = hW[j * GX + i] & 7, vk = vW[j * (GX + 1) + i] & 7, d = Math.hypot(i + OX - e.x, j + OZ - e.z);
      if (hW[j * GX + i] > 0 && (hk === 2 || hk === 3) && (!best || d < best.d)) best = { d, o: 'h', c: j + OZ, a: i + OX };
      if (vW[j * (GX + 1) + i] > 0 && (vk === 2 || vk === 3) && (!best || d < best.d)) best = { d, o: 'v', c: i + OX, a: j + OZ };
    }
    if (!best) continue;
    // widen along the wall while it stays the same exterior wall
    const code = (t) => (best.o === 'h' ? hW[(best.c - OZ) * GX + (t - OX)] : vW[(t - OZ) * (GX + 1) + (best.c - OX)]), c0 = code(best.a);
    let a0 = best.a, w = 1; while (w < e.w && code(a0 + w) === c0) w++; while (w < e.w && code(a0 - 1) === c0) { a0--; w++; }
    carve(best.o, best.c, a0, w, { ext: 1, label: e.label, big: e.big });
  }
  // automatic interior doors: each room opens onto the longest stretch of hallway it touches
  const isHallId = (id) => id > 0 && id < 1000;
  for (let ri = 1; ri < rooms.length; ri++) {
    const r = rooms[ri]; if (r.hall) continue;
    // walk the room's real outline (rooms may have grown past their traced rectangle) and group shared wall runs by neighbour
    const groups = new Map();
    const add = (o, c, t, other, side) => { if (other <= 0 || other === r.id) return; const k = `${other}|${o}|${c}|${side}`; let g = groups.get(k); if (!g) groups.set(k, (g = { o, c, other, side, ts: [] })); g.ts.push(t); };
    for (let z = r.z0 - 6; z < r.z1 + 6; z++) for (let x = r.x0 - 6; x < r.x1 + 6; x++) {
      const i2 = x - OX, j2 = z - OZ; if (idOf(cell(i2, j2)) !== r.id) continue;
      add('h', z, x, idOf(cell(i2, j2 - 1)), 1); add('h', z + 1, x, idOf(cell(i2, j2 + 1)), -1);
      add('v', x, z, idOf(cell(i2 - 1, j2)), 1); add('v', x + 1, z, idOf(cell(i2 + 1, j2)), -1);
    }
    let best = null;
    for (const g of groups.values()) {
      g.ts.sort((a, b) => a - b);
      for (let a = 0; a < g.ts.length;) {
        let e = a; while (e + 1 < g.ts.length && g.ts[e + 1] === g.ts[e] + 1) e++;
        const len = e - a + 1, score = len + (isHallId(g.other) ? 1000 : 0);
        if (len >= 2 && (!best || score > best.score)) best = { g, a: g.ts[a], len, score };
        a = e + 1;
      }
    }
    if (!best) continue;
    const w = Math.max(1, Math.min(best.len - 1, ['shop', 'garage', 'robot', 'gym', 'cafe', 'library', 'auditorium'].includes(r.type) ? 3 : 2));
    const meta = { room: ri, side: best.g.side };
    if (best.len >= 20 && best.score > 1000) {
      carve(best.g.o, best.g.c, Math.floor(best.a + best.len * 0.25 - w / 2), w, meta);
      carve(best.g.o, best.g.c, Math.floor(best.a + best.len * 0.75 - w / 2), w, meta);
    } else carve(best.g.o, best.g.c, Math.floor(best.a + (best.len - w) / 2), w, meta);
  }
  // guarantee every indoor cell can be reached: open a door between any cut-off pocket and the reachable area
  for (let guard = 0; guard < 80; guard++) {
    const seen = new Uint8Array(N), q = [0]; seen[0] = 1;
    while (q.length) {
      const k = q.pop(), i2 = k % GX, j2 = (k / GX) | 0;
      const go = (ni, nj, blocked) => { if (ni < 0 || nj < 0 || ni >= GX || nj >= GZ || blocked > 0) return; const nk = nj * GX + ni; if (!seen[nk]) { seen[nk] = 1; q.push(nk); } };
      go(i2, j2 - 1, hW[j2 * GX + i2]); go(i2, j2 + 1, hW[(j2 + 1) * GX + i2]); go(i2 - 1, j2, vW[j2 * (GX + 1) + i2]); go(i2 + 1, j2, vW[j2 * (GX + 1) + i2 + 1]);
    }
    let fixed = false;
    for (let j2 = 1; j2 < GZ - 1 && !fixed; j2++) for (let i2 = 1; i2 < GX - 2 && !fixed; i2++) {
      const k = j2 * GX + i2; if (!idGrid[k] || seen[k]) continue;
      // unreachable indoor cell next to a reachable indoor cell → door (2 wide where the wall continues)
      if (seen[k - GX] && idGrid[k - GX]) { carve('h', j2 + OZ, i2 + OX, hW[j2 * GX + i2 + 1] > 0 && idGrid[k + 1] && idGrid[k + 1 - GX] ? 2 : 1, {}); fixed = true; }
      else if (seen[k + GX] && idGrid[k + GX]) { carve('h', j2 + 1 + OZ, i2 + OX, hW[(j2 + 1) * GX + i2 + 1] > 0 && idGrid[k + 1] && idGrid[k + 1 + GX] ? 2 : 1, {}); fixed = true; }
      else if (seen[k - 1] && idGrid[k - 1]) { carve('v', i2 + OX, j2 + OZ, vW[(j2 + 1) * (GX + 1) + i2] > 0 && idGrid[k + GX] && idGrid[k + GX - 1] ? 2 : 1, {}); fixed = true; }
      else if (seen[k + 1] && idGrid[k + 1]) { carve('v', i2 + 1 + OX, j2 + OZ, vW[(j2 + 1) * (GX + 1) + i2 + 1] > 0 && idGrid[k + GX] && idGrid[k + GX + 1] ? 2 : 1, {}); fixed = true; }
    }
    if (!fixed) break;
  }
  // merge edges into runs
  const walls = [], doors = [];
  const emit = (o, c, a, b, code, room) => {
    const open = code < 0; code = Math.abs(code);
    const run = { o, c, a, b, kind: code & 7, b_: BKEYS[(code >> 3) - 1], room };
    (open ? doors : walls).push(run);
  };
  for (let j = 0; j <= GZ; j++) {
    let s = 0;
    for (let i = 1; i <= GX; i++) {
      const k = j * GX + i, p = j * GX + s;
      if (i === GX || hW[k] !== hW[p] || hR[k] !== hR[p]) { if (hW[p]) emit('h', j + OZ, s + OX, i + OX, hW[p], hR[p]); s = i; }
    }
  }
  for (let i = 0; i <= GX; i++) {
    let s = 0;
    for (let j = 1; j <= GZ; j++) {
      const k = j * (GX + 1) + i, p = s * (GX + 1) + i;
      if (j === GZ || vW[k] !== vW[p] || vR[k] !== vR[p]) { if (vW[p]) emit('v', i + OX, s + OZ, j + OZ, vW[p], vR[p]); s = j; }
    }
  }
  // attach metadata (labels, plaques) to door runs
  for (const d of doors) {
    const m = doorMeta.find((q) => q.o === d.o && q.c === d.c && q.a < d.b && q.b > d.a);
    if (m) Object.assign(d, { ext: m.ext, label: m.label, big: m.big, garage: m.garage, room: m.room ?? d.room, side: m.side });
  }
  const api = {
    GX, GZ, OX, OZ, rooms, roomGrid, idGrid, ground, walls, doors, hW, vW,
    roomAt(x, z) {
      const i = Math.floor(x) - OX, j = Math.floor(z) - OZ;
      if (i < 0 || j < 0 || i >= GX || j >= GZ) return null;
      return rooms[roomGrid[j * GX + i]] || null;
    },
    ceilAt(x, z) { const r = api.roomAt(x, z); return r ? BLD[r.b].ceil : Infinity; },
    locName(x, z) {
      const r = api.roomAt(x, z);
      if (r) return [BLD[r.b].name, r.name];
      for (const q of ZONES) if (x >= q.x0 && x < q.x1 && z >= q.z0 && z < q.z1) return ['NTC Wausau', q.name];
      return ['NTC Wausau', 'Campus Grounds'];
    },
    findRoom(name) { return rooms.find((r) => r && r.name === name); },
    // flood fill through open edges; returns number of indoor cells that cannot be reached from outside
    unreachable() {
      const seen = new Uint8Array(N), q = [0]; seen[0] = 1;
      while (q.length) {
        const k = q.pop(), i = k % GX, j = (k / GX) | 0;
        const tryGo = (ni, nj, blocked) => { if (ni < 0 || nj < 0 || ni >= GX || nj >= GZ || blocked > 0) return; const nk = nj * GX + ni; if (!seen[nk]) { seen[nk] = 1; q.push(nk); } };
        tryGo(i, j - 1, hW[j * GX + i]); tryGo(i, j + 1, hW[(j + 1) * GX + i]);
        tryGo(i - 1, j, vW[j * (GX + 1) + i]); tryGo(i + 1, j, vW[j * (GX + 1) + i + 1]);
      }
      let bad = 0; const names = new Set();
      for (let k = 0; k < N; k++) if (roomGrid[k] && !seen[k]) { bad++; names.add(rooms[roomGrid[k]].name); }
      return { bad, names: [...names] };
    },
  };
  return (cache = api);
}
