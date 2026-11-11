// In-game HUD: bars, timer, feed, prompts, minimap, scoreboard. Pure DOM + one 2D canvas.
import { GX, GZ, OX, OZ, GTYPES, BOUNDS } from './campus.js';
import { esc, fmtTime } from './util.js';

const $ = (id) => document.getElementById(id);
const GCOL = { grass: '#5d7d38', road: '#3b3e43', lot: '#4a4d53', conc: '#a8a59e', sand: '#d6c28c', court: '#3b6f95', field: '#5f9440' };

export class Hud {
  constructor(campus) {
    this.campus = campus; this.cache = {}; this.feedItems = [];
    this.mm = $('minimap'); this.mmx = this.mm.getContext('2d');
    this.big = $('bigmap-cv'); this.bigx = this.big.getContext('2d');
    this.base = this._drawBase(3);
  }
  _drawBase(S) {
    const cv = document.createElement('canvas'); cv.width = GX * S; cv.height = GZ * S; const g = cv.getContext('2d'), c = this.campus;
    for (let j = 0; j < GZ; j++) for (let i = 0; i < GX; i++) {
      const k = j * GX + i, r = c.roomGrid[k];
      g.fillStyle = r ? (c.rooms[r].hall ? '#e9edf3' : '#c6d2e2') : GCOL[GTYPES[c.ground[k]]];
      g.fillRect(i * S, j * S, S, S);
    }
    g.strokeStyle = '#13294a'; g.lineWidth = 1.4; g.beginPath();
    for (const w of c.walls) { if (w.o === 'h') { g.moveTo((w.a - OX) * S, (w.c - OZ) * S); g.lineTo((w.b - OX) * S, (w.c - OZ) * S); } else { g.moveTo((w.c - OX) * S, (w.a - OZ) * S); g.lineTo((w.c - OX) * S, (w.b - OZ) * S); } }
    g.stroke();
    // building letters
    g.fillStyle = 'rgba(11,74,143,.85)'; g.font = `800 ${S * 7}px "Segoe UI", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const [t, x, z] of [['A', -80, 23], ['B', -40, 23], ['C', 3, 23], ['D', 46, 23], ['E', 79, 23], ['F', -38, -20], ['H', -33, -65], ['I', 25, -65], ['G', 81, -62], ['CHS', 26, 100], ['CBI', 120, -4], ['CGE', 92, 100], ['TWS', 119, -103]]) g.fillText(t, (x - OX) * S, (z - OZ) * S);
    this.S = S; return cv;
  }
  set(id, v) { if (this.cache[id] !== v) { this.cache[id] = v; $(id).textContent = v; } }
  html(id, v) { if (this.cache[id] !== v) { this.cache[id] = v; $(id).innerHTML = v; } }
  show(id, on) { const k = 'v:' + id; if (this.cache[k] !== on) { this.cache[k] = on; $(id).classList.toggle('hidden', !on); } }
  css(id, prop, v) { const k = id + ':' + prop; if (this.cache[k] !== v) { this.cache[k] = v; $(id).style.setProperty(prop, v); } }
  bar(id, frac) { this.css(id, '--f', Math.max(0, Math.min(1, frac)).toFixed(3)); }

  banner(title, sub = '', ms = 2600, cls = '') {
    const b = $('banner'); b.className = 'banner show ' + cls; $('banner-t').textContent = title; $('banner-s').textContent = sub;
    clearTimeout(this._bt); this._bt = setTimeout(() => b.classList.remove('show'), ms);
  }
  feed(html) {
    const el = document.createElement('div'); el.className = 'feed-item'; el.innerHTML = html; $('feed').prepend(el);
    setTimeout(() => el.classList.add('out'), 5200); setTimeout(() => el.remove(), 5800);
    while ($('feed').children.length > 6) $('feed').lastChild.remove();
  }
  hitmarker(kill) { const h = $('hitmarker'); h.className = kill ? 'kill' : ''; void h.offsetWidth; h.classList.add('on'); }
  damageFlash(angle) {
    const v = $('dmg'); v.classList.remove('on'); void v.offsetWidth; v.classList.add('on');
    if (angle != null) { const a = $('dmg-dir'); a.style.transform = `translate(-50%,-50%) rotate(${angle}rad)`; a.classList.remove('on'); void a.offsetWidth; a.classList.add('on'); }
  }
  stamp(text, sub) { const s = $('stamp'); $('stamp-t').textContent = text; $('stamp-s').textContent = sub || ''; s.classList.remove('on'); void s.offsetWidth; s.classList.add('on'); }
  prompt(text) { this.show('prompt', !!text); if (text) this.html('prompt', text); }

  minimap(me, yaw, dots, zone) {
    const g = this.mmx, W = this.mm.width, S = this.S, scale = 2.2, k = scale / S;
    g.save(); g.clearRect(0, 0, W, W); g.beginPath(); g.arc(W / 2, W / 2, W / 2, 0, 7); g.clip();
    g.fillStyle = '#4c6a30'; g.fillRect(0, 0, W, W);
    g.translate(W / 2, W / 2); g.scale(k, k); g.translate(-(me.x - OX) * S, -(me.z - OZ) * S);
    g.drawImage(this.base, 0, 0);
    this._overlay(g, S, dots, zone, 1 / k);
    g.restore();
    g.save(); g.translate(W / 2, W / 2); g.rotate(-yaw); g.fillStyle = '#fff'; g.strokeStyle = '#0b2a52'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -8); g.lineTo(6, 7); g.lineTo(0, 3.5); g.lineTo(-6, 7); g.closePath(); g.fill(); g.stroke(); g.restore();
  }
  _overlay(g, S, dots, zone, px) {
    if (zone) {
      g.lineWidth = 3 * px; g.strokeStyle = '#ff3b6b'; g.beginPath(); g.arc((zone.x - OX) * S, (zone.z - OZ) * S, Math.max(0.1, zone.r * S), 0, 7); g.stroke();
      if (zone.next) { g.setLineDash([6 * px, 6 * px]); g.strokeStyle = '#ffffff'; g.lineWidth = 2 * px; g.beginPath(); g.arc((zone.next.x - OX) * S, (zone.next.z - OZ) * S, Math.max(0.1, zone.next.r * S), 0, 7); g.stroke(); g.setLineDash([]); }
    }
    for (const d of dots) { g.fillStyle = d.c; g.strokeStyle = '#0008'; g.lineWidth = px; g.beginPath(); g.arc((d.x - OX) * S, (d.z - OZ) * S, (d.r || 4) * px, 0, 7); g.fill(); g.stroke(); }
  }
  bigmap(me, yaw, dots, zone) {
    const g = this.bigx, cv = this.big, S = this.S;
    if (cv.width !== GX * S) { cv.width = GX * S; cv.height = GZ * S; }
    g.clearRect(0, 0, cv.width, cv.height); g.drawImage(this.base, 0, 0);
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2; g.strokeRect((BOUNDS.x0 - OX) * S, (BOUNDS.z0 - OZ) * S, (BOUNDS.x1 - BOUNDS.x0) * S, (BOUNDS.z1 - BOUNDS.z0) * S);
    this._overlay(g, S, dots, zone, 1.6);
    g.save(); g.translate((me.x - OX) * S, (me.z - OZ) * S); g.rotate(-yaw); g.fillStyle = '#fff'; g.strokeStyle = '#0b2a52'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(0, -12); g.lineTo(9, 10); g.lineTo(0, 5); g.lineTo(-9, 10); g.closePath(); g.fill(); g.stroke(); g.restore();
  }
  scoreboard(rows, title) {
    $('sb-title').textContent = title;
    $('sb-rows').innerHTML = rows.map((r) => `<tr class="${r.me ? 'me' : ''} ${r.dead ? 'dead' : ''}"><td><span class="dot" style="background:${r.color}"></span>${esc(r.name)}${r.host ? ' <span class="chip">HOST</span>' : ''}</td><td>${esc(r.role)}</td><td>${esc(r.status)}</td><td class="num">${r.k}</td><td class="num">${r.score}</td></tr>`).join('');
  }
  time(s) { this.set('t-time', fmtTime(s)); }
}
