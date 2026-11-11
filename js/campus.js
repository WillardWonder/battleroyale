// NTC Wausau campus layout — data-driven so it can be corrected room by room.
// 1 unit = 1 metre. +x = east, +z = south (W. Campus Drive runs east-west along the south side).
// Building names/functions follow NTC's published campus maps; footprints are a scaled approximation.
// To change the map: edit the R()/H()/strip() calls, EXITS and GROUND below. Walls, doors, windows,
// furniture, the minimap and collision are all generated from this file.

export const GX = 280, GZ = 240, OX = -140, OZ = -120;
export const BOUNDS = { x0: -137, x1: 137, z0: -117, z1: 117 };

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
const X = (px) => Math.round((px - 680) * 0.27), Z = (py) => Math.round((py - 475) * 0.27);
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
const GROUND = [
  ['road', -140, -116, 140, -108], ['conc', -140, -107, 140, -105],
  ['lot', -134, -104, -64, -90], ['lot', -137, -72, -118, -32], ['lot', -137, -6, -118, 42], ['lot', -114, 62, -64, 112], ['lot', 36, -103, 112, -72], ['lot', -52, 98, 44, 114], ['lot', 118, -30, 136, 70],
  ['conc', -117, -32, -113, -20], ['conc', -54, -17, 70, -15], ['conc', -22, -17, -19, 54], ['conc', -54, 18, 70, 20], ['conc', -2, 14, 10, 26], ['sand', 30, 26, 48, 38], ['conc', 16, 0, 24, 8],
];
export const LOTS = [
  { name: 'Parking Lot D', x0: -134, z0: -104, x1: -64, z1: -90 }, { name: 'Parking Lot C', x0: -137, z0: -72, x1: -118, z1: -32 }, { name: 'Parking Lot B', x0: -137, z0: -6, x1: -118, z1: 42 },
  { name: 'Parking Lot A', x0: -114, z0: 62, x1: -64, z1: 112 }, { name: 'Parking Lot E', x0: 36, z0: -103, x1: 112, z1: -72 }, { name: 'South Lot', x0: -52, z0: 98, x1: 44, z1: 114 }, { name: 'East Lot', x0: 118, z0: -30, x1: 136, z1: 70 },
];
const ZONES = [...LOTS, { name: 'Courtyard', x0: -56, z0: -18, x1: 72, z1: 56 }, { name: 'Campus Drive', x0: -140, z0: -118, x1: 140, z1: -104 }];
// Hide & Seek play areas (map pixels → metres). tier: 0 small (≤5 players), 1 medium (≤12), 2 large (≤24).
const AR = (n, t, x0, y0, x1, y1) => ({ n, t, r: [X(x0) - 1, Z(y0) - 1, X(x1) + 1, Z(y1) + 1] });
export const ARENAS = [
  AR('Building A · iTEC', 0, 458, 680, 695, 820), AR('Building C & Library', 0, 262, 393, 470, 600), AR('Building D', 0, 262, 155, 455, 407), AR('Buildings E & F', 0, 455, 130, 778, 407),
  AR('Building H shops', 0, 820, 235, 1100, 437), AR('Buildings H & I labs', 0, 942, 407, 1080, 716),
  AR('Buildings D, E, F & G', 1, 262, 130, 778, 407), AR('Buildings A, B & C', 1, 262, 393, 695, 820), AR('Buildings H & I', 1, 820, 235, 1100, 716),
  AR('Main Building', 2, 262, 130, 1100, 820),
];
export const SPECIAL = {
  gazebo: { x: 4, z: 20 }, firepit: { x: 20, z: 4 }, sign: { x: -124, z: -40 }, net: { x: 39, z0: 26, z1: 38 },
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
    const sides = [
      { o: 'h', c: r.z0, a: r.x0, b: r.x1, nb: (t) => idOf(cell(t - OX, r.z0 - 1 - OZ)), side: 1 },
      { o: 'h', c: r.z1, a: r.x0, b: r.x1, nb: (t) => idOf(cell(t - OX, r.z1 - OZ)), side: -1 },
      { o: 'v', c: r.x0, a: r.z0, b: r.z1, nb: (t) => idOf(cell(r.x0 - 1 - OX, t - OZ)), side: 1 },
      { o: 'v', c: r.x1, a: r.z0, b: r.z1, nb: (t) => idOf(cell(r.x1 - OX, t - OZ)), side: -1 },
    ];
    let best = null;
    for (const pass of [0, 1]) {
      for (const s of sides) {
        let t = s.a;
        while (t < s.b) {
          const id = s.nb(t); let e = t;
          while (e < s.b && s.nb(e) === id) e++;
          const ok = pass === 0 ? isHallId(id) : id >= 1000;
          if (ok && (!best || e - t > best.len)) best = { s, a: t, len: e - t };
          t = e;
        }
      }
      if (best) break;
    }
    if (!best) continue;
    const w = Math.min(best.len - 1, ['shop', 'garage', 'robot', 'gym', 'cafe', 'library', 'auditorium'].includes(r.type) ? 3 : 2);
    const meta = { room: ri, side: best.s.side };
    if (best.len >= 20) {
      carve(best.s.o, best.s.c, Math.floor(best.a + best.len * 0.25 - w / 2), w, meta);
      carve(best.s.o, best.s.c, Math.floor(best.a + best.len * 0.75 - w / 2), w, meta);
    } else carve(best.s.o, best.s.c, Math.floor(best.a + (best.len - w) / 2), w, meta);
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
