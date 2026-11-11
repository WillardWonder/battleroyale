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

/* ───────── Main building: "Main Street" spine with A–E along the front ───────── */
H('A', -104, 20, -56, 26, 'A Hallway'); H('B', -56, 20, -24, 26, 'B Hallway');
H('C', -24, 20, 30, 26, 'C Hallway · Main Street'); H('D', 30, 20, 62, 26, 'D Hallway'); H('E', 62, 20, 96, 26, 'E Hallway');
// Building A — iTEC
strip('A', -104, 6, -56, 20, 'x', [[12, 'lab', 'A110 Networking Lab'], [12, 'lab', 'A112 Cybersecurity Lab'], [10, 'server', 'A114 Data Center'], [14, 'lab', 'A116 iTEC Projects Lab']]);
strip('A', -104, 26, -56, 40, 'x', [[12, 'class', 'A101 IT Classroom'], [12, 'lab', 'A103 Programming Lab'], [8, 'office', 'A105 Faculty Office'], [16, 'class', 'A107 Learning Center']]);
// Building B
H('B', -41, 6, -36, 20, 'B Hallway');
R('B', -56, 6, -41, 20, 'office', 'B110 Human Resources'); R('B', -36, 6, -24, 20, 'meeting', 'B112 Board Room');
R('B', -56, 26, -46, 40, 'office', 'B101 Resource Development'); H('B', -46, 26, -40, 40, 'B Entrance', 'lobby');
R('B', -40, 26, -24, 40, 'office', 'B103 Finance');
// Building C — administration, library, main entrance
R('C', -24, 26, -12, 40, 'office', 'C101 Admissions'); R('C', -12, 26, -2, 40, 'office', 'C103 Financial Aid');
H('C', -2, 26, 14, 40, 'Main Entrance Lobby', 'lobby'); R('C', 14, 26, 30, 40, 'office', 'C105 Student Services');
R('C', -24, 6, 8, 20, 'library', 'C120 Library · Timberwolf Learning Commons');
R('C', 8, 6, 18, 20, 'lab', 'C124 Testing Center'); R('C', 18, 6, 26, 20, 'class', 'C126 Academic Resource Center');
H('C', 26, 6, 30, 20, 'C Courtyard Breezeway');
// Building D
R('D', 30, 26, 44, 40, 'store', 'D101 Campus Store'); R('D', 44, 26, 54, 40, 'lounge', 'D103 The Den');
R('D', 54, 26, 62, 40, 'office', 'D105 Transfer & Placement');
R('D', 30, 6, 46, 20, 'meeting', 'D110 Timberwolf Community Room'); R('D', 46, 6, 62, 20, 'lounge', 'D112 Student Leadership Center');
// Building E — Campus Café + Activity Center
R('E', 62, 26, 96, 40, 'cafe', 'E100 Campus Café');
H('E', 62, -44, 67, 20, 'E Hallway');
R('E', 67, 6, 80, 20, 'kitchen', 'E110 Kitchen'); R('E', 80, 6, 96, 20, 'meeting', 'E101–102 Meeting Rooms');
R('EA', 67, -44, 96, 6, 'gym', 'E120 Activity Center');
// Building F — Technical Center (west wing)
H('F', -41, -44, -36, 6, 'F Hallway');
strip('F', -56, -44, -41, 6, 'z', [[12, 'lab', 'F101 Electrical Lab'], [12, 'lab', 'F103 HVAC Lab'], [13, 'class', 'F105 Architectural Design'], [13, 'lab', 'F107 CAD Lab']]);
strip('F', -36, -44, -20, -20, 'z', [[12, 'class', 'F102 Classroom'], [12, 'class', 'F104 Classroom']]);
H('F', -36, -20, -20, -17, 'F Courtyard Passage');
strip('F', -36, -17, -20, 6, 'z', [[11, 'lab', 'F106 Science Lab'], [12, 'lab', 'F108 STEM Center']]);
// North bar — H Industrial Center, I Advanced Manufacturing & Engineering, G Building & Grounds
H('HH', -56, -50, -10, -44, 'H Hallway'); H('IH', -10, -50, 67, -44, 'I Hallway');
strip('H', -56, -80, -10, -50, 'x', [[16, 'shop', 'H101 Welding Lab'], [16, 'garage', 'H103 Automotive Technology'], [14, 'shop', 'H105 Machine Tool']]);
strip('I', -10, -80, 67, -50, 'x', [[28, 'robot', 'I101 Industry 4.0 Smart Manufacturing Lab'], [22, 'robot', 'I103 Robotics & Automation'], [20, 'shop', 'I105 Electromechanical Lab'], [7, 'storage', 'I107 Tool Crib']]);
R('G', 67, -80, 96, -44, 'shop', 'G101 Building & Grounds');

/* ───────── Center for Business & Industry (east) ───────── */
H('CBI', 118, -30, 122, 22, 'CBI Hallway');
strip('CBI', 106, -30, 118, 22, 'z', [[13, 'meeting', 'CBI 101 Conference Center'], [13, 'class', 'CBI 103 Training Room'], [13, 'office', 'CBI 105 Business Incubator'], [13, 'class', 'CBI 107 Seminar Room']]);
strip('CBI', 122, -30, 134, 22, 'z', [[13, 'class', 'CBI 102 Workforce Training'], [13, 'lab', 'CBI 104 Computer Lab'], [13, 'office', 'CBI 106 Offices'], [13, 'lounge', 'CBI 108 Break Room']]);

/* ───────── Center for Health Sciences (across W. Campus Drive) ───────── */
H('CHS', -10, 98, 62, 102, 'CHS Hallway'); H('CHS', 20, 88, 34, 98, 'CHS Lobby', 'lobby');
strip('CHS', -10, 88, 20, 98, 'x', [[16, 'clinic', 'CHS 1002 Dental Clinic'], [14, 'lab', 'CHS 1006 Dental Hygiene Lab']]);
strip('CHS', 34, 88, 62, 98, 'x', [[14, 'lab', 'CHS 1010 Radiography'], [14, 'clinic', 'CHS 1014 Nursing Skills Lab']]);
strip('CHS', -10, 102, 62, 114, 'x', [[32, 'auditorium', 'CHS 1004 Auditorium'], [14, 'clinic', 'CHS 1008 Simulation Center'], [14, 'lab', 'CHS 1012 Medical Lab'], [12, 'clinic', 'CHS 1016 Surgical Tech']]);

/* ───────── Center for Geriatric Education ───────── */
H('CGE', 74, 98, 110, 102, 'CGE Hallway'); H('CGE', 86, 90, 92, 98, 'CGE Lobby', 'lobby');
R('CGE', 74, 90, 86, 98, 'dorm', 'CGE 101 Apartment Lab'); R('CGE', 92, 90, 110, 98, 'clinic', 'CGE 103 Skills Lab');
R('CGE', 74, 102, 92, 110, 'class', 'CGE 102 Classroom'); R('CGE', 92, 102, 110, 110, 'meeting', 'CGE 104 Community Room');

/* ───────── Timberwolf Suites (student housing, north-east) ───────── */
H('TWS', 104, -105, 134, -101, 'Suites Hallway'); H('TWS', 113, -101, 119, -92, 'Suites Lobby', 'lobby');
strip('TWS', 104, -114, 134, -105, 'x', [[8, 'dorm', 'Suite 101'], [7, 'dorm', 'Suite 103'], [7, 'dorm', 'Suite 105'], [8, 'dorm', 'Suite 107']]);
R('TWS', 104, -101, 113, -92, 'dorm', 'Suite 102'); R('TWS', 119, -101, 126, -92, 'storage', 'Laundry'); R('TWS', 126, -101, 134, -92, 'dorm', 'Suite 104');

R('SHED', -126, -76, -116, -68, 'storage', 'Storage Shed');

// Exterior doors. o:'h' = wall running east-west at z; o:'v' = wall running north-south at x. w = width.
export const EXITS = [
  { o: 'h', z: 40, x: 3, w: 6, label: 'NORTHCENTRAL TECHNICAL COLLEGE', big: 1 },
  { o: 'h', z: 40, x: -45, w: 4, label: 'B ENTRANCE' },
  { o: 'h', z: 40, x: -66, w: 2, label: 'A · iTEC' },
  { o: 'v', x: -104, z: 22, w: 2, label: 'A ENTRANCE' },
  { o: 'v', x: 96, z: 22, w: 2, label: 'E ENTRANCE' },
  { o: 'h', z: 40, x: 78, w: 3, label: 'CAMPUS CAFÉ' },
  { o: 'h', z: 6, x: 27, w: 2 }, { o: 'h', z: 6, x: -8, w: 2 },
  { o: 'v', x: -20, z: -20, w: 3 }, { o: 'h', z: -44, x: 27, w: 2 }, { o: 'v', x: 62, z: -20, w: 3 },
  { o: 'v', x: 96, z: -20, w: 3, label: 'ACTIVITY CENTER' },
  { o: 'h', z: -80, x: -34, w: 4, garage: 1 }, { o: 'h', z: -80, x: 2, w: 4, garage: 1 }, { o: 'h', z: -80, x: 78, w: 4, garage: 1 },
  { o: 'v', x: -56, z: -48, w: 2, label: 'H ENTRANCE' },
  { o: 'h', z: 88, x: 24, w: 6, label: 'CENTER FOR HEALTH SCIENCES', big: 1 },
  { o: 'v', x: 62, z: 99, w: 2 }, { o: 'v', x: -10, z: 99, w: 2 },
  { o: 'h', z: 22, x: 119, w: 2, label: 'CBI' }, { o: 'h', z: -30, x: 119, w: 2 },
  { o: 'h', z: 90, x: 88, w: 2, label: 'GERIATRIC EDUCATION' },
  { o: 'h', z: -92, x: 115, w: 2, label: 'TIMBERWOLF SUITES' },
  { o: 'v', x: -116, z: -73, w: 2 },
];

// Outdoor ground paint, applied in order. Types: road, lot, conc, sand, court, field (default grass).
export const GTYPES = ['grass', 'road', 'lot', 'conc', 'sand', 'court', 'field'];
const GROUND = [
  ['road', -140, 70, 140, 80], ['conc', -140, 66, 140, 69], ['conc', -140, 81, 140, 84], ['road', 97, -90, 102, 70],
  ['lot', -100, 44, -30, 64], ['lot', 22, 44, 94, 64], ['lot', -134, -4, -110, 62], ['lot', -130, -84, -62, -2],
  ['lot', 104, 28, 134, 62], ['lot', -84, 88, -16, 112],
  ['conc', -104, 40, 96, 43], ['conc', -8, 43, 20, 66], ['conc', -60, -50, -56, 6], ['conc', -56, -84, 96, -80],
  ['conc', 26, -44, 30, 6], ['conc', -20, -20, 62, -17], ['conc', -2, -34, 10, -24], ['sand', 36, -40, 54, -28],
  ['court', 36, -12, 56, 2], ['conc', 4, -12, 12, -4], ['field', -50, -114, 60, -88],
  ['conc', 118, 22, 122, 28], ['conc', 24, 84, 30, 88], ['conc', 87, 84, 91, 90], ['conc', 114, -92, 118, -88],
];
export const LOTS = [
  { name: 'Parking Lot A', x0: -100, z0: 44, x1: -30, z1: 64 }, { name: 'Parking Lot B', x0: 22, z0: 44, x1: 94, z1: 64 },
  { name: 'Parking Lot C', x0: -134, z0: -4, x1: -110, z1: 62 }, { name: 'Parking Lot E', x0: -130, z0: -84, x1: -62, z1: -2 },
  { name: 'CBI Lot D', x0: 104, z0: 28, x1: 134, z1: 62 }, { name: 'CHS Parking', x0: -84, z0: 88, x1: -16, z1: 112 },
];
const ZONES = [
  ...LOTS,
  { name: 'Courtyard', x0: -20, z0: -44, x1: 62, z1: 6 }, { name: 'Main Entrance Plaza', x0: -8, z0: 40, x1: 20, z1: 66 },
  { name: 'W. Campus Drive', x0: -140, z0: 66, x1: 140, z1: 84 }, { name: 'Athletic Fields', x0: -50, z0: -116, x1: 60, z1: -86 },
  { name: 'Disc Golf Course', x0: 98, z0: -90, x1: 138, z1: -32 }, { name: 'College Drive', x0: 96, z0: -90, x1: 103, z1: 70 },
];
export const SPECIAL = {
  gazebo: { x: 4, z: -29 }, firepit: { x: 8, z: -8 }, sign: { x: 6, z: 62.5 }, net: { x: 45, z0: -40, z1: -28 },
  teacherRoom: 'A105 Faculty Office',
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
  for (const e of EXITS) carve(e.o, e.o === 'h' ? e.z : e.x, e.o === 'h' ? e.x : e.z, e.w, { ext: 1, label: e.label, big: e.big, garage: e.garage });
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
