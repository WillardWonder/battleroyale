// Lightweight collision: static axis-aligned boxes in a spatial hash, character sweep, raycasts.
const CS = 4;
const key = (cx, cz) => (cx + 512) * 1024 + (cz + 512);

export class Physics {
  constructor() { this.boxes = []; this.map = new Map(); this.stamp = 1; this.ceilAt = () => Infinity; }
  add(minX, minY, minZ, maxX, maxY, maxZ, tag = null) {
    const b = { minX, minY, minZ, maxX, maxY, maxZ, tag, s: 0 };
    this.boxes.push(b);
    for (let cx = Math.floor(minX / CS); cx <= Math.floor(maxX / CS); cx++) for (let cz = Math.floor(minZ / CS); cz <= Math.floor(maxZ / CS); cz++) {
      const k = key(cx, cz); let l = this.map.get(k); if (!l) this.map.set(k, (l = [])); l.push(b);
    }
    return b;
  }
  query(minX, minZ, maxX, maxZ, fn) {
    const st = ++this.stamp;
    for (let cx = Math.floor(minX / CS); cx <= Math.floor(maxX / CS); cx++) for (let cz = Math.floor(minZ / CS); cz <= Math.floor(maxZ / CS); cz++) {
      const l = this.map.get(key(cx, cz)); if (!l) continue;
      for (let i = 0; i < l.length; i++) { const b = l[i]; if (b.s === st) continue; b.s = st; if (b.maxX > minX && b.minX < maxX && b.maxZ > minZ && b.minZ < maxZ) fn(b); }
    }
  }
  // true if a character cylinder (as a box) at x,y,z is clear
  clear(x, y, z, r, h) {
    let ok = true;
    this.query(x - r, z - r, x + r, z + r, (b) => { if (b.maxY > y + 0.05 && b.minY < y + h) ok = false; });
    return ok;
  }
  // b: {x,y,z,vx,vy,vz,r,h,onGround}
  move(b, dt, grav = 22) {
    const r = b.r, STEP = 0.32;
    let stepTo = -1;
    // X
    let nx = b.x + b.vx * dt;
    if (b.vx !== 0) this.query(Math.min(nx, b.x) - r, b.z - r + 0.001, Math.max(nx, b.x) + r, b.z + r - 0.001, (o) => {
      if (o.maxY <= b.y + 0.02 || o.minY >= b.y + b.h) return;
      if (b.onGround && o.maxY - b.y <= STEP) { stepTo = Math.max(stepTo, o.maxY); return; }
      if (b.vx > 0 && o.minX >= b.x + r - 0.05) { nx = Math.min(nx, o.minX - r - 0.001); b.hitWall = true; }
      else if (b.vx < 0 && o.maxX <= b.x - r + 0.05) { nx = Math.max(nx, o.maxX + r + 0.001); b.hitWall = true; }
    });
    b.x = nx;
    // Z
    let nz = b.z + b.vz * dt;
    if (b.vz !== 0) this.query(b.x - r + 0.001, Math.min(nz, b.z) - r, b.x + r - 0.001, Math.max(nz, b.z) + r, (o) => {
      if (o.maxY <= b.y + 0.02 || o.minY >= b.y + b.h) return;
      if (b.onGround && o.maxY - b.y <= STEP) { stepTo = Math.max(stepTo, o.maxY); return; }
      if (b.vz > 0 && o.minZ >= b.z + r - 0.05) { nz = Math.min(nz, o.minZ - r - 0.001); b.hitWall = true; }
      else if (b.vz < 0 && o.maxZ <= b.z - r + 0.05) { nz = Math.max(nz, o.maxZ + r + 0.001); b.hitWall = true; }
    });
    b.z = nz;
    if (stepTo > b.y) { b.y = stepTo; if (b.vy < 0) b.vy = 0; }
    // Y
    b.vy -= grav * dt;
    let ny = b.y + b.vy * dt, landed = false;
    const rr = r - 0.03;
    this.query(b.x - rr, b.z - rr, b.x + rr, b.z + rr, (o) => {
      if (b.vy <= 0) { if (o.maxY <= b.y + 0.06 && ny < o.maxY) { ny = o.maxY; landed = true; } }
      else if (o.minY >= b.y + b.h - 0.06 && ny + b.h > o.minY) { ny = o.minY - b.h; b.vy = 0; }
    });
    if (ny <= 0) { ny = 0; landed = true; }
    const ceil = this.ceilAt(b.x, b.z);
    if (ny + b.h > ceil - 0.05) { ny = ceil - 0.05 - b.h; if (b.vy > 0) b.vy = 0; }
    b.fell = landed && !b.onGround ? -b.vy : 0;
    if (landed) b.vy = 0;
    b.onGround = landed; b.y = ny;
  }
  // nearest hit along a ray. Returns {t, box, nx, ny, nz} or null. Ground (y=0) and ceilings count as hits (box=null).
  ray(ox, oy, oz, dx, dy, dz, max, skipTag = null) {
    let best = max, hit = null, hnx = 0, hny = 0, hnz = 0;
    if (dy < -1e-6) { const t = -oy / dy; if (t >= 0 && t < best) { best = t; hit = 0; hnx = 0; hny = 1; hnz = 0; } }
    const c = this.ceilAt(ox, oz);
    if (dy > 1e-6 && c < 1e9 && oy < c) { const t = (c - oy) / dy; if (t < best) { best = t; hit = 0; hnx = 0; hny = -1; hnz = 0; } }
    const st = ++this.stamp;
    let cx = Math.floor(ox / CS), cz = Math.floor(oz / CS);
    const sx = dx > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
    const tdx = dx !== 0 ? Math.abs(CS / dx) : Infinity, tdz = dz !== 0 ? Math.abs(CS / dz) : Infinity;
    let tmx = dx !== 0 ? ((cx + (dx > 0 ? 1 : 0)) * CS - ox) / dx : Infinity, tmz = dz !== 0 ? ((cz + (dz > 0 ? 1 : 0)) * CS - oz) / dz : Infinity;
    const ix = dx !== 0 ? 1 / dx : Infinity, iy = dy !== 0 ? 1 / dy : Infinity, iz = dz !== 0 ? 1 / dz : Infinity;
    for (let guard = 0; guard < 400; guard++) {
      const l = this.map.get(key(cx, cz));
      if (l) for (let i = 0; i < l.length; i++) {
        const b = l[i]; if (b.s === st) continue; b.s = st;
        if (skipTag && b.tag === skipTag) continue;
        let t0 = 0, t1 = best, ax = 0, sgn = 0, a, c2, tn, tf;
        // X slab
        if (dx !== 0) { a = (b.minX - ox) * ix; c2 = (b.maxX - ox) * ix; tn = Math.min(a, c2); tf = Math.max(a, c2); if (tn > t0) { t0 = tn; ax = 1; sgn = dx > 0 ? -1 : 1; } if (tf < t1) t1 = tf; if (t0 > t1) continue; } else if (ox < b.minX || ox > b.maxX) continue;
        if (dy !== 0) { a = (b.minY - oy) * iy; c2 = (b.maxY - oy) * iy; tn = Math.min(a, c2); tf = Math.max(a, c2); if (tn > t0) { t0 = tn; ax = 2; sgn = dy > 0 ? -1 : 1; } if (tf < t1) t1 = tf; if (t0 > t1) continue; } else if (oy < b.minY || oy > b.maxY) continue;
        if (dz !== 0) { a = (b.minZ - oz) * iz; c2 = (b.maxZ - oz) * iz; tn = Math.min(a, c2); tf = Math.max(a, c2); if (tn > t0) { t0 = tn; ax = 3; sgn = dz > 0 ? -1 : 1; } if (tf < t1) t1 = tf; if (t0 > t1) continue; } else if (oz < b.minZ || oz > b.maxZ) continue;
        if (t0 < best) { best = t0; hit = b; hnx = ax === 1 ? sgn : 0; hny = ax === 2 ? sgn : 0; hnz = ax === 3 ? sgn : 0; }
      }
      const tExit = Math.min(tmx, tmz);
      if (best <= tExit || tExit > max) break;
      if (tmx < tmz) { cx += sx; tmx += tdx; } else { cz += sz; tmz += tdz; }
    }
    if (hit === null) return null;
    return { t: best, box: hit || null, nx: hnx, ny: hny, nz: hnz };
  }
}

// ray vs a vertical cylinder approximated by its bounding box; returns t or -1
export function rayBox(ox, oy, oz, dx, dy, dz, minX, minY, minZ, maxX, maxY, maxZ, max) {
  let t0 = 0, t1 = max, a, b;
  if (dx !== 0) { a = (minX - ox) / dx; b = (maxX - ox) / dx; t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b)); } else if (ox < minX || ox > maxX) return -1;
  if (dy !== 0) { a = (minY - oy) / dy; b = (maxY - oy) / dy; t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b)); } else if (oy < minY || oy > maxY) return -1;
  if (dz !== 0) { a = (minZ - oz) / dz; b = (maxZ - oz) / dz; t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b)); } else if (oz < minZ || oz > maxZ) return -1;
  return t0 <= t1 ? t0 : -1;
}
