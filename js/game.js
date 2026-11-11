// Game runtime: input, local player, remote players, both game modes, effects, HUD glue.
import * as THREE from '../vendor/three.js';
import { World } from './world.js';
import { Hud } from './hud.js';
import { PROPS, MORPHS } from './props.js';
import { rayBox } from './physics.js';
import { BOUNDS } from './campus.js';
import { makeHumanoid, makeNameTag, makeViewModel, makeWeapon, makePaperBall, SHIRTS } from './models.js';
import { WEAPONS, LOOT_TABLE, LOOT_INFO, ZONE_PHASES, ZONE_START_R, SEND_HZ, INTERP_DELAY } from './config.js';
import { mulberry32, hashStr, clamp, lerp, lerpAngle, esc, fmtTime } from './util.js';

const EYE = 1.62, EYE_C = 1.1, TAU = Math.PI * 2;
const QUIZ_CD = 40, TAUNT_CD = 6, AUTO_TAUNT = 32, RULER_CD = 0.62, PAPER_CD = 0.7, RULER_RANGE = 2.9;
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
const colorOf = (uid) => '#' + SHIRTS[hashStr(uid) % SHIRTS.length].toString(16).padStart(6, '0');
const loadOpts = () => { try { return { sens: 1, fov: 78, quality: 1, vol: 0.7, ...JSON.parse(localStorage.getItem('hh-opts2') || '{}') }; } catch { return { sens: 1, fov: 78, quality: 1, vol: 0.7 }; } };

class Particles {
  constructor(scene, n = 600) {
    this.n = n; this.i = 0; this.pos = new Float32Array(n * 3).fill(-999); this.col = new Float32Array(n * 3); this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.g = new Float32Array(n);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.11, vertexColors: true, sizeAttenuation: true, transparent: true, depthWrite: false }));
    this.pts.frustumCulled = false; scene.add(this.pts); this.c = new THREE.Color();
  }
  burst(x, y, z, count, hex, speed = 3, life = 0.6, grav = 9) {
    this.c.set(hex);
    for (let k = 0; k < count; k++) {
      const i = this.i; this.i = (this.i + 1) % this.n;
      const a = Math.random() * TAU, u = Math.random() * 2 - 1, s = speed * (0.3 + Math.random() * 0.7), q = Math.sqrt(1 - u * u);
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
      this.vel[i * 3] = Math.cos(a) * q * s; this.vel[i * 3 + 1] = u * s + speed * 0.4; this.vel[i * 3 + 2] = Math.sin(a) * q * s;
      const j = 0.75 + Math.random() * 0.25; this.col[i * 3] = this.c.r * j; this.col[i * 3 + 1] = this.c.g * j; this.col[i * 3 + 2] = this.c.b * j;
      this.life[i] = life * (0.6 + Math.random() * 0.6); this.g[i] = grav;
    }
  }
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt; if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -999; continue; }
      this.vel[i * 3 + 1] -= this.g[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.pos[i * 3 + 1] < 0.02) { this.pos[i * 3 + 1] = 0.02; this.vel[i * 3 + 1] *= -0.3; this.vel[i * 3] *= 0.6; this.vel[i * 3 + 2] *= 0.6; }
    }
    this.pts.geometry.attributes.position.needsUpdate = true; this.pts.geometry.attributes.color.needsUpdate = true;
  }
}

export class Game {
  constructor(canvas, sfx, ui) {
    this.canvas = canvas; this.sfx = sfx; this.ui = ui; this.opts = loadOpts();
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }));
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(this.opts.fov, 1, 0.07, 1900); this.camera.rotation.order = 'YXZ'; this.scene.add(this.camera);
    this.world = new World(r, this.scene);
    this.hud = new Hud(this.world.campus);
    this.vm = makeViewModel(); this.camera.add(this.vm.group); this.vm.setMode('none', '');
    this.fx = new Particles(this.scene);
    this.tracers = []; this.projectiles = []; this.loot = []; this.lootById = {};
    this.zoneMesh = this._makeZone();
    this.players = new Map(); this.remotes = new Map(); this.meta = null; this.app = 'menu'; this.roundId = -1;
    this.keys = new Set(); this.just = new Set(); this.mouse = { l: false, r: false }; this.mdx = 0; this.mdy = 0; this.wheel = 0;
    this.me = this._blankMe(); this.time = 0; this.sendT = 0; this.lastSent = ''; this.lastSentAt = 0; this.authT = 0; this.fpsAcc = 0; this.fpsN = 0; this.fps = 60; this.lowT = 0;
    this.orbit = 0; this.testMode = false;
    this._initPost(); this.applyOpts(); this._bind(); this.resize();
    this._raf = (t) => this.frame(t); this._last = performance.now(); requestAnimationFrame(this._raf);
  }
  _blankMe() {
    return { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 0.32, h: 1.8, onGround: true, yaw: 0, pitch: 0, role: 'none', pub: 'none', alive: false, hp: 100, sh: 0, crouch: false, eye: EYE,
      prop: 'chair', propYaw: 0, lock: false, morphs: 3, patience: 100, stun: 0, quizAt: 0, tauntAt: 0, autoTaunt: 0, rulerAt: 0, paperAt: 0, shot: 0, pendingMelee: 0,
      weapons: [], slot: 0, fireAt: 0, reloadEnd: 0, kills: 0, sc: 0, stepAcc: 0, zoneTick: 0, becomeAt: 0, place: 0 };
  }
  saveOpts() { localStorage.setItem('hh-opts2', JSON.stringify(this.opts)); }
  applyOpts() {
    const o = this.opts;
    this.world.setQuality(o.quality); this.sfx.setVolume(o.vol); this.camera.fov = o.fov; this.camera.updateProjectionMatrix(); this.resize();
  }
  // film-style post pass: HDR render → cheap mip-chain bloom → tone map → colour grade + vignette
  _initPost() {
    try {
      const r = this.renderer; if (!r.capabilities.isWebGL2 && r.capabilities.isWebGL2 !== undefined) return;
      if (!r.extensions.has('EXT_color_buffer_float') && !r.extensions.has('EXT_color_buffer_half_float')) return;
      this.rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
      this.postScene = new THREE.Scene(); this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const mat = new THREE.ShaderMaterial({
        uniforms: { t: { value: this.rt.texture } }, depthTest: false, depthWrite: false,
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: `uniform sampler2D t; varying vec2 vUv;
          void main(){
            vec3 c = texture2D(t, vUv).rgb;
            vec3 b = max(textureLod(t, vUv, 2.5).rgb - 1.0, 0.0) * 0.5 + max(textureLod(t, vUv, 4.0).rgb - 0.9, 0.0) * 0.55 + max(textureLod(t, vUv, 5.5).rgb - 0.8, 0.0) * 0.5 + max(textureLod(t, vUv, 7.0).rgb - 0.7, 0.0) * 0.35;
            gl_FragColor = vec4(c + b * 0.55, 1.0);
            #include <tonemapping_fragment>
            vec3 g = gl_FragColor.rgb; float l = dot(g, vec3(0.2126, 0.7152, 0.0722));
            g = mix(vec3(l), g, 1.06); g = (g - 0.5) * 1.03 + 0.5;
            g *= mix(vec3(0.94, 0.98, 1.08), vec3(1.06, 1.0, 0.92), smoothstep(0.15, 0.7, l));
            float v = length(vUv - 0.5); g *= 1.0 - 0.26 * smoothstep(0.4, 0.9, v);
            gl_FragColor = vec4(clamp(g, 0.0, 1.0), 1.0);
            #include <colorspace_fragment>
          }`,
      });
      const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); q.frustumCulled = false; this.postScene.add(q);
    } catch (e) { console.warn('post-processing unavailable', e); this.rt = null; }
  }
  resize() { const w = window.innerWidth, h = window.innerHeight; this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Math.sqrt([0.75e6, 1.25e6, 2.3e6][this.opts.quality] / (w * h)))); this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); if (this.rt) { const d = this.renderer.getDrawingBufferSize(new THREE.Vector2()); this.rt.setSize(d.x, d.y); } }
  get locked() { return this.testMode || document.pointerLockElement === this.canvas; }
  lock() { this.sfx.unlock(); if (!this.testMode && this.canvas.requestPointerLock) { try { const p = this.canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch { /* ignore */ } } }

  _bind() {
    addEventListener('resize', () => this.resize());
    addEventListener('keydown', (e) => {
      if (this.app !== 'play' || e.target.tagName === 'INPUT') return;
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (!e.repeat) this.just.add(e.code); this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.mouse.l = this.mouse.r = false; });
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.app !== 'play') return;
      if (!this.locked) { this.lock(); return; }
      if (e.button === 0) { this.mouse.l = true; this.just.add('M0'); } else if (e.button === 2) { this.mouse.r = true; this.just.add('M2'); }
    });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.l = false; else if (e.button === 2) this.mouse.r = false; });
    addEventListener('mousemove', (e) => { if (this.locked && this.app === 'play') { this.mdx += e.movementX || 0; this.mdy += e.movementY || 0; } });
    addEventListener('wheel', (e) => { if (this.app === 'play' && this.locked) this.wheel += Math.sign(e.deltaY); }, { passive: true });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => { if (this.app === 'play') this.ui.onLock(this.locked); this.keys.clear(); this.mouse.l = this.mouse.r = false; });
  }

  /* ───────── networking glue ───────── */
  use(net) { this.net = net; }
  attach(net) {
    this.net = net;
    net.on('meta', (m) => this.onMeta(m)); net.on('player', (u, p) => this.onPlayer(u, p)); net.on('playerGone', (u) => this.onPlayerGone(u));
    net.on('state', (u, s) => this.onState(u, s)); net.on('event', (e) => this.onEvent(e)); net.on('loot', (id, u) => this.onLoot(id, u));
  }
  enterRoom() { this.meta = null; this.players.clear(); for (const r of this.remotes.values()) this._dropVis(r); this.remotes.clear(); this.me = this._blankMe(); this.roundId = -1; this.clearRound(); this.app = 'lobby'; }
  leaveRoom() { this.clearRound(); for (const r of this.remotes.values()) this._dropVis(r); this.remotes.clear(); this.players.clear(); this.meta = null; this.app = 'menu'; this.hudOn(false); if (document.exitPointerLock) document.exitPointerLock(); }
  nameOf(u) { const p = this.players.get(u); return p ? p.n || 'Student' : 'Someone'; }
  isHost() { return this.meta && this.meta.host === this.net.uid; }

  onMeta(meta) {
    const prev = this.meta; this.meta = meta; if (!meta) return;
    if (meta.state === 'play' && (!prev || prev.round !== meta.round || prev.state !== 'play')) this.startRound(!prev);
    else if (meta.state === 'end' && (!prev || prev.state !== 'end')) this.endRound(!prev);
    else if (meta.state === 'lobby' && (!prev || prev.state !== 'lobby')) this.toLobby();
    this.ui.onMeta(meta);
  }
  onPlayer(uid, info) {
    this.players.set(uid, info);
    if (uid !== this.net.uid) { let r = this.remotes.get(uid); if (!r) this.remotes.set(uid, (r = { uid, info, buf: [], x: 0, y: -50, z: 0, yaw: 0, pitch: 0, fl: 0, shot: -1, speed: 0, stepT: 0, vis: null, key: '' })); r.info = info; this._syncVis(r); }
    this.ui.onPlayers();
  }
  onPlayerGone(uid) { const r = this.remotes.get(uid); if (r) { this._dropVis(r); this.remotes.delete(uid); } const p = this.players.get(uid); this.players.delete(uid); if (p && this.app === 'play') this.hud.feed(`<b>${esc(p.n || 'Student')}</b> left`); this.ui.onPlayers(); }
  onState(uid, str) {
    const r = this.remotes.get(uid); if (!r || typeof str !== 'string') return;
    const a = str.split(','); if (a.length < 6) return;
    const s = { t: performance.now(), x: +a[0], y: +a[1], z: +a[2], yaw: +a[3], pitch: +a[4], fl: a[5] | 0 };
    if (!isFinite(s.x + s.y + s.z + s.yaw + s.pitch)) return;
    if (r.buf.length && Math.hypot(s.x - r.buf[r.buf.length - 1].x, s.z - r.buf[r.buf.length - 1].z) > 25) r.buf.length = 0; // teleport / respawn
    r.buf.push(s); if (r.buf.length > 8) r.buf.shift();
  }

  /* ───────── match flow ───────── */
  // host: begin a round
  startMatch() {
    const m = this.meta; if (!m || !this.isHost()) return;
    const ids = [...this.players.keys()].sort(); let hunters = '';
    if (m.mode === 'hs' && m.set.hunterMode !== 'none') {
      const pool = ids.filter((u) => u !== this.net.uid), list = [];
      if (m.set.hunterMode === 'random') pool.push(this.net.uid); else list.push(this.net.uid);
      while (list.length < Math.min(m.set.hunters || 1, ids.length) && pool.length) list.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
      hunters = list.join(',');
    }
    this.net.resetRound();
    this.net.setMeta({ state: 'play', round: (m.round || 0) + 1, seed: (Math.random() * 2147483647) | 0, t0: this.net.now() + 5000, hunters, res: null });
  }
  endMatch(w = 'none', id = '', why = '') { this.net.setMeta({ state: 'end', res: { w, id, why }, tEnd: this.net.now() }); }
  phase() {
    const m = this.meta; if (!m || m.state !== 'play') return { p: 'none', t: 0, left: 0 };
    const t = (this.net.now() - m.t0) / 1000; if (t < 0) return { p: 'count', t, left: -t };
    if (m.mode === 'hs') { const h = m.set.hide, s = m.set.seek; return t < h ? { p: 'hide', t, left: h - t } : { p: 'seek', t, left: h + s - t }; }
    return { p: 'fight', t, left: 0 };
  }
  clearRound() {
    for (const p of this.projectiles) this.scene.remove(p.mesh); this.projectiles.length = 0;
    for (const l of this.loot) if (l.mesh) this.scene.remove(l.mesh); this.loot.length = 0; this.lootById = {};
    this.zoneMesh.visible = false; this.zonePh = null;
    if (this.myProp) { this.scene.remove(this.myProp); this.myProp = null; }
  }
  findClear(x, z, r = 0.45) { const ph = this.world.physics; for (let i = 0; i < 80; i++) { const a = i * 2.4, d = i * 0.22, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d; if (ph.clear(px, 0, pz, r, 1.9)) return { x: px, z: pz }; } return { x, z }; }
  pickSpawn(indoorBias) {
    const rng = mulberry32(hashStr(this.net.uid + ':' + this.meta.seed)), list = this.world.spawns, ph = this.world.physics;
    for (let i = 0; i < 200; i++) { const s = list[(rng() * list.length) | 0]; if (indoorBias != null && (rng() < indoorBias) !== !!s.in) continue; if (ph.clear(s.x, 0, s.z, 0.46, 1.9)) return s; }
    return list[0];
  }
  startRound(late) {
    const m = this.meta, me = this.me, uid = this.net.uid, keep = { sc: me.sc };
    this.clearRound(); this.roundId = m.round;
    Object.assign(me, this._blankMe(), keep);
    const hunters = (m.hunters || '').split(',').filter(Boolean);
    let sp;
    if (late) { me.role = 'spec'; me.pub = 'spec'; sp = { x: 4, z: 52 }; me.y = 14; me.pitch = -0.4; }
    else if (m.mode === 'hs') {
      if (hunters.includes(uid)) { me.role = me.pub = 'hunter'; const i = hunters.indexOf(uid); sp = this.findClear(this.world.teacherSpawn.x + (i % 2 ? 1.2 : -1.2) * Math.ceil(i / 2), this.world.teacherSpawn.z - (i > 2 ? 1.5 : 0)); me.yaw = Math.PI; }
      else { me.role = me.pub = 'hider'; sp = this.pickSpawn(0.8); me.prop = MORPHS[hashStr(uid + m.seed) % MORPHS.length]; me.yaw = (hashStr(uid) % 628) / 100; }
    } else { me.role = me.pub = 'br'; sp = this.pickSpawn(null); me.weapons = [{ id: 'paper', ammo: Infinity, res: 0 }]; me.yaw = (hashStr(uid) % 628) / 100; this.zonePh = this._buildZone(m.seed); this._genLoot(m.seed); this.zoneMesh.visible = true; }
    me.x = sp.x; me.z = sp.z; if (!late) me.y = 0; me.alive = !late; me.autoTaunt = AUTO_TAUNT * (0.5 + (hashStr(uid) % 100) / 100);
    this._setBody();
    this.net.setPlayer({ role: me.pub, sub: '', alive: me.alive, hp: 100, sh: 0, prop: me.role === 'hider' ? me.prop : '', k: 0, rd: m.round, w: 'paper', pl: 0, sc: me.sc || 0 });
    for (const r of this.remotes.values()) { r.buf.length = 0; this._syncVis(r); }
    this.app = 'play'; this.hudOn(true); this.ui.onRoundStart(); this._countBeep = 6; this._zoneWarned = -1; this._phaseWas = '';
    this._refreshVM();
  }
  endRound(late) {
    const me = this.me, m = this.meta;
    if (!late && m.mode === 'hs' && me.pub === 'hider' && me.alive) { me.sc += 150; this.net.setPlayer({ sc: me.sc }); }
    this.app = 'end'; this.hudOn(false); if (document.exitPointerLock) document.exitPointerLock();
    const res = m.res || {}, won = (res.w === 'hunters' && me.pub === 'hunter') || (res.w === 'hiders' && me.pub === 'hider') || (res.w === 'br' && res.id === this.net.uid);
    this.sfx.play(won ? 'win' : 'lose'); setTimeout(() => this.ui.onRoundEnd(won), 250);
  }
  toLobby() { this.clearRound(); this.app = 'lobby'; this.hudOn(false); if (document.exitPointerLock) document.exitPointerLock(); for (const r of this.remotes.values()) this._syncVis(r); this.ui.onLobby(); }
  hudOn(on) { document.getElementById('hud').classList.toggle('hidden', !on); }

  authorityTick() {
    const m = this.meta; if (!m || !this.players.size) return;
    const hostHere = this.players.has(m.host), auth = hostHere ? m.host : [...this.players.keys()].sort()[0];
    if (auth !== this.net.uid) return;
    if (!hostHere) { this.net.setMeta({ host: this.net.uid }); return; }
    if (m.state === 'play') {
      const ph = this.phase(); if (ph.t < 4) return;
      let hiders = 0, hidAlive = 0, hunters = 0, br = 0, brAlive = 0, last = '';
      for (const [u, p] of this.players) {
        if (p.rd !== m.round) continue;
        if (p.role === 'hider') { hiders++; if (p.alive) hidAlive++; } else if (p.role === 'hunter') { hunters++; if (p.sub === 'mon') hiders++; } else if (p.role === 'br') { br++; if (p.alive) { brAlive++; last = u; } }
      }
      if (m.mode === 'hs') {
        if (ph.p === 'seek' && ph.left <= 0) this.endMatch('hiders', '', 'The bell rang — the students got away with it.');
        else if (hiders > 0 && hidAlive === 0) this.endMatch('hunters', '', 'Every student has homework.');
        else if (m.hunters && hunters === 0) this.endMatch('hiders', '', 'The teacher left the building.');
      } else if (br >= 2 && brAlive <= 1) this.endMatch('br', last, '');
      else if (br === 1 && brAlive === 0) this.endMatch('br', '', '');
    } else if (m.state === 'end' && this.net.now() - (m.tEnd || 0) > 14000) this.net.setMeta({ state: 'lobby' });
  }

  /* ───────── remote players ───────── */
  _dropVis(r) { if (r.vis) { this.scene.remove(r.vis.obj); r.vis = null; } r.key = ''; }
  _syncVis(r) {
    const p = r.info, m = this.meta, show = this.app === 'play' && m && p.rd === m.round && p.alive && (p.role === 'hider' || p.role === 'hunter' || p.role === 'br');
    const key = show ? `${p.role}|${p.sub || ''}|${p.prop || ''}|${p.w || ''}|${p.n}` : '';
    if (key === r.key) return; this._dropVis(r); r.key = key; if (!show) return;
    if (p.role === 'hider' && PROPS[p.prop]) {
      const mesh = new THREE.Mesh(this.world.propGeo[p.prop], this.world.mat.prop); mesh.receiveShadow = true;
      r.vis = { obj: mesh, prop: PROPS[p.prop] };
    } else {
      const teacher = p.role === 'hunter' && p.sub !== 'mon', h = makeHumanoid({ shirt: SHIRTS[hashStr(r.uid) % SHIRTS.length], seed: hashStr(r.uid), teacher, monitor: p.role === 'hunter' && !teacher });
      const tag = makeNameTag((teacher ? '🍎 ' : p.role === 'hunter' ? '📋 ' : '') + (p.n || 'Student'), teacher ? '#ffd166' : '#ffffff'); tag.position.y = teacher ? 2.2 : 2.08; h.group.add(tag);
      if (p.role === 'br' && p.w && p.w !== 'paper') h.setHeld(makeWeapon(p.w));
      r.vis = { obj: h.group, h, tag };
    }
    r.vis.obj.position.set(r.x, r.y, r.z); this.scene.add(r.vis.obj);
  }
  updateRemotes(dt) {
    const now = performance.now() - INTERP_DELAY, me = this.me;
    for (const r of this.remotes.values()) {
      const b = r.buf; if (!b.length) continue;
      let s0 = b[0], s1 = b[0];
      for (let i = b.length - 1; i >= 0; i--) { if (b[i].t <= now) { s0 = b[i]; s1 = b[Math.min(i + 1, b.length - 1)]; break; } }
      const k = s1.t > s0.t ? clamp((now - s0.t) / (s1.t - s0.t), 0, 1.25) : 1;
      const px = r.x, pz = r.z;
      r.x = lerp(s0.x, s1.x, k); r.y = lerp(s0.y, s1.y, k); r.z = lerp(s0.z, s1.z, k); r.yaw = lerpAngle(s0.yaw, s1.yaw, Math.min(k, 1)); r.pitch = lerp(s0.pitch, s1.pitch, Math.min(k, 1));
      const sp = dt > 0 ? Math.hypot(r.x - px, r.z - pz) / dt : 0; r.speed = lerp(r.speed, Math.min(sp, 12), 0.25);
      const latest = b[b.length - 1]; r.fl = latest.fl;
      const shot = (latest.fl >> 2) & 7;
      if (r.shot === -1) r.shot = shot; else if (shot !== r.shot) { r.shot = shot; this._remoteFire(r); }
      if (!r.vis) continue;
      const v = r.vis; v.obj.position.set(r.x, r.y, r.z);
      const dist = Math.hypot(r.x - me.x, r.z - me.z);
      if (v.h) {
        v.obj.rotation.y = r.yaw + Math.PI; v.h.update(dt, r.speed, !!(r.fl & 1), r.pitch, !!(r.fl & 2));
        if (v.tag) v.tag.visible = r.info.role === 'hunter' ? dist < 60 : dist < 28;
      } else v.obj.rotation.y = r.yaw;
      if (r.speed > 1.2 && dist < 30 && !(r.fl & 3)) { r.stepT -= dt * (0.6 + r.speed * 0.28); if (r.stepT <= 0) { r.stepT = 1; this.sfx.play(v.h ? 'step' : 'slide', r, v.h ? 1.2 : 0.7); } }
    }
  }
  _remoteFire(r) {
    const p = r.info; if (!r.vis) return;
    if (p.role === 'hunter') { r.vis.h && r.vis.h.swing(); this.sfx.play('whoosh', r, 0.9); return; }
    if (p.role !== 'br') return;
    const W = WEAPONS[p.w]; if (!W) return; r.vis.h && r.vis.h.swing();
    this.sfx.play(W.snd, r, 1);
    if (W.kind === 'hit') {
      const dx = -Math.sin(r.yaw) * Math.cos(r.pitch), dy = Math.sin(r.pitch), dz = -Math.cos(r.yaw) * Math.cos(r.pitch), oy = r.y + ((r.fl & 1) ? EYE_C : EYE) - 0.15;
      const hit = this.world.physics.ray(r.x, oy, r.z, dx, dy, dz, W.range), t = hit ? hit.t : W.range;
      this.tracer(r.x + dx * 0.6, oy + dy * 0.6, r.z + dz * 0.6, r.x + dx * t, oy + dy * t, r.z + dz * t, p.w === 'laser' ? 0xff3030 : 0xfff2b0, p.w === 'laser' ? 0.22 : 0.07);
    }
  }
  // alive remote players as hit targets
  targets(roleFilter) {
    const out = [];
    for (const r of this.remotes.values()) {
      const p = r.info; if (!r.vis || !p.alive || (roleFilter && p.role !== roleFilter)) continue;
      let rad = 0.4, h = (r.fl & 1) ? 1.3 : 1.8;
      if (p.role === 'hider') { const P = PROPS[p.prop]; if (!P) continue; rad = Math.max(P.w, P.d) / 2; h = P.h; }
      out.push({ r, minX: r.x - rad, maxX: r.x + rad, minY: r.y, maxY: r.y + h, minZ: r.z - rad, maxZ: r.z + rad });
    }
    return out;
  }

  /* ───────── events ───────── */
  send(ev) { this.net.sendEvent({ ...ev, r: this.roundId }); }
  onEvent(ev) {
    if (!ev || ev.r !== this.roundId || this.app !== 'play') return;
    const me = this.me, uid = this.net.uid, mine = ev.f === uid;
    switch (ev.t) {
      case 'hit':
        if (ev.to === uid && me.alive && !mine) { const a = this.remotes.get(ev.f); this.takeDamage(+ev.d || 0, ev.f, ev.w, a); }
        break;
      case 'sh': if (!mine && Array.isArray(ev.o) && Array.isArray(ev.d)) this.spawnProjectile(ev.k, ev.o[0], ev.o[1], ev.o[2], ev.d[0], ev.d[1], ev.d[2], false); break;
      case 'kill': {
        const v = this.nameOf(ev.f), k = ev.by ? this.nameOf(ev.by) : '';
        const hs = this.meta.mode === 'hs';
        this.hud.feed(ev.by ? (hs ? `<b>${esc(k)}</b> assigned homework to <b>${esc(v)}</b>` : `<b>${esc(k)}</b> <span class="w">${esc(ev.w === 'ruler' ? 'Ruler' : (WEAPONS[ev.w] || {}).name || 'detention')}</span> <b>${esc(v)}</b>`) : `<b>${esc(v)}</b> was marked tardy by the bell`);
        if (typeof ev.x === 'number') { this.fx.burst(ev.x, ev.y + 0.8, ev.z, 60, 0xffffff, 5, 1.0, 7); this.fx.burst(ev.x, ev.y + 0.8, ev.z, 30, 0xffd23f, 4, 0.9, 7); this.sfx.play('paper', ev, 1.4); }
        if (ev.by === uid && !mine) { me.kills++; me.sc += 100; this.net.setPlayer({ k: me.kills, sc: me.sc }); this.sfx.play('kill'); this.hud.hitmarker(true); this.hud.banner(hs ? 'HOMEWORK ASSIGNED' : 'SENT TO DETENTION', v, 1800, 'good'); }
        break;
      }
      case 'taunt':
        this.sfx.play('taunt' + ((ev.s | 0) % 4), ev, 1.5);
        if (me.role === 'hunter' && !mine) { const ang = Math.atan2(-(ev.x - me.x), -(ev.z - me.z)) - me.yaw; const a = document.getElementById('ping-dir'); a.style.transform = `translate(-50%,-50%) rotate(${-ang}rad)`; a.classList.remove('on'); void a.offsetWidth; a.classList.add('on'); }
        break;
      case 'quiz':
        this.sfx.play('quiz', ev, 1.2);
        if (me.role === 'hider' && me.alive && Math.hypot(ev.x - me.x, ev.z - me.z) < 32) { this.hud.banner('POP QUIZ!', 'You squeaked — the teacher heard that', 2000, 'bad'); setTimeout(() => this.taunt(true), 300 + Math.random() * 900); }
        break;
    }
  }
  takeDamage(d, by, w, from, pierce) {
    const me = this.me; if (!me.alive || d <= 0) return;
    if (me.role === 'br' && me.sh > 0 && !pierce) { const a = Math.min(me.sh, d); me.sh -= a; d -= a; }
    me.hp = Math.max(0, me.hp - d);
    let ang = null; if (from) ang = Math.atan2(-(from.x - me.x), -(from.z - me.z)) - me.yaw;
    this.hud.damageFlash(ang == null ? null : -ang); this.sfx.play('hurt');
    this.net.setPlayer({ hp: Math.round(me.hp), sh: Math.round(me.sh) });
    if (me.hp <= 0) this.die(by, w);
  }
  die(by, w) {
    const me = this.me, hs = this.meta.mode === 'hs';
    me.alive = false; let alive = 0; for (const p of this.players.values()) if (p.role === 'br' && p.alive && p.rd === this.roundId) alive++;
    me.place = Math.max(1, alive);
    this.send({ t: 'kill', by: by || '', w: w || '', x: +me.x.toFixed(1), y: +me.y.toFixed(1), z: +me.z.toFixed(1) });
    this.net.setPlayer({ alive: false, hp: 0, pl: me.place });
    this.sfx.play('stamp');
    if (hs) { this.hud.stamp('HOMEWORK ASSIGNED', by ? `Caught by ${this.nameOf(by)}` : ''); me.becomeAt = this.time + 3.2; }
    else { this.hud.stamp('DETENTION', by ? `Sent by ${this.nameOf(by)} · #${me.place}` : `Marked tardy · #${me.place}`); me.becomeAt = this.time + 2.5; }
    if (this.myProp) { this.scene.remove(this.myProp); this.myProp = null; }
    this._refreshVM();
  }
  _afterDeath() {
    const me = this.me, m = this.meta; me.becomeAt = 0;
    if (m.mode === 'hs' && m.set.infect && this.phase().p === 'seek') {
      me.role = me.pub = 'hunter'; me.alive = true; me.hp = 100; me.patience = 100; me.stun = this.time + 2; me.y = 0; this._setBody();
      const c = this.findClear(me.x, me.z); me.x = c.x; me.z = c.z;
      this.net.setPlayer({ role: 'hunter', sub: 'mon', alive: true, hp: 100 });
      this.hud.banner('YOU ARE A HALL MONITOR', 'Help the teacher find everyone else', 3200, 'good');
    } else { me.role = 'spec'; me.y = Math.max(me.y + 3, 3); this.hud.banner('SPECTATING', 'Fly around with WASD · Space / Ctrl', 2600); }
    this._refreshVM();
  }

  /* ───────── local player ───────── */
  _setBody() {
    const me = this.me;
    if (me.role === 'hider') { const P = PROPS[me.prop]; me.r = clamp(Math.min(P.w, P.d) / 2, 0.2, 0.45); me.h = clamp(P.h, 0.4, 1.9); }
    else { me.r = 0.32; me.h = me.crouch ? 1.3 : 1.8; }
  }
  _refreshVM() {
    const me = this.me;
    if (me.role === 'hunter' && me.alive) this.vm.setMode('hunter', '');
    else if (me.role === 'br' && me.alive) this.vm.setMode('br', me.weapons[me.slot].id);
    else this.vm.setMode('none', '');
    if (me.role === 'hider' && me.alive) {
      if (this.myProp) this.scene.remove(this.myProp);
      this.myProp = new THREE.Mesh(this.world.propGeo[me.prop], this.world.mat.prop); this.myProp.receiveShadow = true; this.scene.add(this.myProp);
    }
  }
  fwd(out = _v) { const me = this.me, cp = Math.cos(me.pitch); return out.set(-Math.sin(me.yaw) * cp, Math.sin(me.pitch), -Math.cos(me.yaw) * cp); }
  updateLocal(dt) {
    const me = this.me, K = this.keys, J = this.just, ph = this.phase(), phys = this.world.physics;
    const zoom = me.role === 'br' && this.mouse.r && me.alive ? (WEAPONS[me.weapons[me.slot].id].zoom || 1.3) : 1;
    const sens = 0.0022 * this.opts.sens / zoom;
    me.yaw -= this.mdx * sens; me.pitch = clamp(me.pitch - this.mdy * sens, -1.5, 1.5); this.mdx = this.mdy = 0;
    if (me.becomeAt && this.time >= me.becomeAt) this._afterDeath();
    let ix = (K.has('KeyD') || K.has('ArrowRight') ? 1 : 0) - (K.has('KeyA') || K.has('ArrowLeft') ? 1 : 0), iz = (K.has('KeyW') || K.has('ArrowUp') ? 1 : 0) - (K.has('KeyS') || K.has('ArrowDown') ? 1 : 0);
    const il = Math.hypot(ix, iz) || 1; ix /= il; iz /= il;
    const sy = Math.sin(me.yaw), cy = Math.cos(me.yaw), wx = -sy * iz + cy * ix, wz = -cy * iz - sy * ix;

    if (me.role === 'spec' || (!me.alive && me.role !== 'none')) { // free camera
      const sp = (K.has('ShiftLeft') ? 26 : 12) * dt;
      if (me.role === 'spec') { me.x = clamp(me.x + wx * sp, BOUNDS.x0, BOUNDS.x1); me.z = clamp(me.z + wz * sp, BOUNDS.z0, BOUNDS.z1); me.y = clamp(me.y + ((K.has('Space') ? 1 : 0) - (K.has('ControlLeft') || K.has('KeyC') ? 1 : 0)) * sp, 0.3, 60); }
      this.camera.position.set(me.x, me.y + (me.role === 'spec' ? 0 : 1.2), me.z); this.camera.rotation.set(me.pitch, me.yaw, 0);
      this._fov(this.opts.fov, dt); return;
    }
    const frozen = ph.p === 'count' || (me.role === 'hunter' && ph.p === 'hide') || this.time < me.stun;
    const sprint = K.has('ShiftLeft') || K.has('ShiftRight');
    const wantCrouch = me.role !== 'hider' && (K.has('ControlLeft') || K.has('KeyC'));
    if (wantCrouch !== me.crouch) { if (wantCrouch || phys.clear(me.x, me.y, me.z, me.r - 0.02, 1.8)) { me.crouch = wantCrouch; this._setBody(); } }
    let speed = me.role === 'hunter' ? (sprint ? 7.9 : 5.0) : me.role === 'hider' ? (sprint ? 6.8 : 4.6) : (sprint ? 7.3 : 4.8);
    if (me.crouch) speed = 2.4; if (zoom > 1.1) speed *= 0.6;
    const moving = !frozen && (ix || iz), acc = me.onGround ? 16 : 3.5, kx = moving ? wx * speed : 0, kz = moving ? wz * speed : 0, kk = Math.min(1, acc * dt);
    me.vx += (kx - me.vx) * kk; me.vz += (kz - me.vz) * kk;
    if (!frozen && J.has('Space') && me.onGround) { me.vy = 7.2; me.onGround = false; this.sfx.play('jump', null, 0.6); }
    phys.move(me, dt);
    me.x = clamp(me.x, BOUNDS.x0 + 0.5, BOUNDS.x1 - 0.5); me.z = clamp(me.z, BOUNDS.z0 + 0.5, BOUNDS.z1 - 0.5);
    if (me.fell > 7) this.sfx.play('land', null, 0.7);
    const hs = Math.hypot(me.vx, me.vz);
    if (me.onGround && hs > 1) { me.stepAcc += hs * dt; if (me.stepAcc > (sprint ? 2.6 : 2.1)) { me.stepAcc = 0; if (!me.crouch) this.sfx.play(me.role === 'hider' ? 'slide' : 'step', null, me.role === 'hider' ? 0.35 : 0.5); } }
    me.eye = lerp(me.eye, me.crouch ? EYE_C : EYE, Math.min(1, dt * 12));

    const cam = this.camera;
    if (me.role === 'hider') {
      if (!me.lock) me.propYaw = me.yaw;
      const P = PROPS[me.prop], ty = me.y + Math.min(P.h, 1.7) * 0.75 + 0.35, f = this.fwd();
      let dist = 3.4 + Math.max(P.w, P.d) * 0.6;
      const hit = phys.ray(me.x, ty, me.z, -f.x, -f.y, -f.z, dist + 0.3); if (hit) dist = Math.max(0.5, hit.t - 0.3);
      cam.position.set(me.x - f.x * dist, ty - f.y * dist, me.z - f.z * dist); cam.rotation.set(me.pitch, me.yaw, 0);
      if (this.myProp) { this.myProp.position.set(me.x, me.y, me.z); this.myProp.rotation.y = me.propYaw; }
      this._fov(this.opts.fov, dt);
      if (!frozen) this.updateHider(ph);
    } else {
      const bob = me.onGround ? Math.sin(this.time * (sprint ? 13 : 9)) * Math.min(1, hs / 5) * 0.03 : 0;
      cam.position.set(me.x, me.y + me.eye + bob, me.z); cam.rotation.set(me.pitch, me.yaw, 0);
      this._fov(this.opts.fov / zoom + (sprint && hs > 6 ? 5 : 0), dt);
      if (me.role === 'hunter') this.updateHunter(ph, frozen); else if (me.role === 'br' && !frozen) this.updateBR(dt, ph);
      this.vm.update(dt, hs, me.onGround, zoom > 1.1);
    }
  }
  _fov(target, dt) { const c = this.camera; if (Math.abs(c.fov - target) > 0.05) { c.fov = lerp(c.fov, target, Math.min(1, dt * 12)); c.updateProjectionMatrix(); } }

  /* ───────── Prop Hunt: students ───────── */
  updateHider(ph) {
    const me = this.me, J = this.just, phys = this.world.physics, cam = this.camera, f = this.fwd();
    // what are we looking at?
    const hit = phys.ray(cam.position.x, cam.position.y, cam.position.z, f.x, f.y, f.z, 12);
    const tgt = hit && hit.box && hit.box.tag && PROPS[hit.box.tag.t] && PROPS[hit.box.tag.t].m ? hit.box.tag.t : null;
    const free = ph.p === 'hide', can = free || me.morphs > 0;
    this._aimProp = tgt && tgt !== me.prop && can ? tgt : null;
    if (J.has('KeyE')) { if (this._aimProp) this.morph(this._aimProp, free); else this.sfx.play('deny', null, 0.5); }
    if (free && this.wheel) { const i = (MORPHS.indexOf(me.prop) + Math.sign(this.wheel) + MORPHS.length) % MORPHS.length; this.morph(MORPHS[i], true); }
    if (J.has('KeyF') || J.has('M0')) { me.lock = !me.lock; if (me.lock) me.propYaw = Math.round(me.yaw / (Math.PI / 2)) * (Math.PI / 2); this.sfx.play('ui'); }
    if (J.has('KeyQ') && this.time >= me.tauntAt && ph.p === 'seek') { me.tauntAt = this.time + TAUNT_CD; this.taunt(false); me.sc += 10; this.net.setPlayer({ sc: me.sc }); }
    if (ph.p === 'seek') { me.autoTaunt -= this._dt; if (me.autoTaunt <= 0) { me.autoTaunt = AUTO_TAUNT; this.taunt(true); } }
  }
  morph(type, free) {
    const me = this.me, P = PROPS[type], r = clamp(Math.min(P.w, P.d) / 2, 0.2, 0.45), h = clamp(P.h, 0.4, 1.9);
    if (!this.world.physics.clear(me.x, me.y, me.z, r - 0.02, h)) { this.sfx.play('deny'); this.hud.banner('NOT ENOUGH ROOM', 'Step away from walls and furniture', 1200, 'bad'); return; }
    me.prop = type; if (!free) me.morphs--; this._setBody(); this._refreshVM();
    this.net.setPlayer({ prop: type }); this.sfx.play('morph'); this.fx.burst(me.x, me.y + 0.6, me.z, 26, 0xbfe3ff, 2.5, 0.5, 2);
  }
  taunt(forced) { const me = this.me; if (!me.alive || me.role !== 'hider') return; this.send({ t: 'taunt', x: +me.x.toFixed(1), y: +me.y.toFixed(1), z: +me.z.toFixed(1), s: (Math.random() * 4) | 0, a: forced ? 1 : 0 }); }

  /* ───────── Prop Hunt: teacher + hall monitors ───────── */
  updateHunter(ph, frozen) {
    const me = this.me, J = this.just;
    if (me.pendingMelee && this.time >= me.pendingMelee) { me.pendingMelee = 0; this.meleeHit(); }
    if (frozen || ph.p !== 'seek') return;
    if (this.mouse.l && this.time >= me.rulerAt) { me.rulerAt = this.time + RULER_CD; me.pendingMelee = this.time + 0.13; me.shot = (me.shot + 1) & 7; this.vm.swing(); this.sfx.play('whoosh', null, 0.8); }
    if ((J.has('M2') || this.mouse.r) && this.time >= me.paperAt) {
      me.paperAt = this.time + PAPER_CD; this.vm.throwIt(); this.sfx.play('throw', null, 0.8);
      const f = this.fwd(), c = this.camera.position; this.fire('paperT', c.x + f.x * 0.4, c.y + f.y * 0.4 - 0.08, c.z + f.z * 0.4, f.x, f.y + 0.03, f.z);
    }
    if (J.has('KeyQ') && this.time >= me.quizAt) { me.quizAt = this.time + QUIZ_CD; this.send({ t: 'quiz', x: +me.x.toFixed(1), y: +me.y.toFixed(1), z: +me.z.toFixed(1) }); this.hud.banner('POP QUIZ!', 'Students within 30 m just made a noise', 2200, 'good'); }
  }
  wrongGuess(tag, cost, x, y, z) {
    const me = this.me; this.world.wobble(tag); this.sfx.play('thunk', null, 0.9); this.fx.burst(x, y, z, 10, 0xd9d2c0, 2, 0.35);
    if (!PROPS[tag.t].m || me.role !== 'hunter') return;
    me.patience = Math.max(0, me.patience - cost); this.hud.feed(`<span class="bad">Just a ${esc(PROPS[tag.t].label.toLowerCase())}</span> −${cost} patience`);
    if (me.patience <= 0) { me.stun = this.time + 5; me.patience = 70; this.hud.banner('COFFEE BREAK', 'You ran out of patience — back in 5 seconds', 4800, 'bad'); this.sfx.play('deny'); }
  }
  meleeHit() {
    const me = this.me, c = this.camera.position, phys = this.world.physics, T = this.targets('hider');
    let best = null, bt = RULER_RANGE, wHit = null;
    for (const [dyaw, dp] of [[0, 0], [-0.16, 0], [0.16, 0], [0, -0.16], [0, 0.14], [-0.3, -0.05], [0.3, -0.05]]) {
      const yaw = me.yaw + dyaw, pit = me.pitch + dp, cp = Math.cos(pit), dx = -Math.sin(yaw) * cp, dy = Math.sin(pit), dz = -Math.cos(yaw) * cp;
      const w = phys.ray(c.x, c.y, c.z, dx, dy, dz, RULER_RANGE); if (dyaw === 0 && dp === 0) wHit = w;
      const lim = w ? w.t + 0.25 : RULER_RANGE;
      for (const t of T) { const tt = rayBox(c.x, c.y, c.z, dx, dy, dz, t.minX, t.minY, t.minZ, t.maxX, t.maxY, t.maxZ, lim); if (tt >= 0 && tt < bt) { bt = tt; best = t; } }
      if (best) break;
    }
    const f = this.fwd();
    if (best) { this.hitPlayer(best.r, 100, 'ruler', c.x + f.x * bt, c.y + f.y * bt, c.z + f.z * bt); this.sfx.play('smack'); }
    else if (wHit) { const x = c.x + f.x * wHit.t, y = c.y + f.y * wHit.t, z = c.z + f.z * wHit.t; if (wHit.box && wHit.box.tag) this.wrongGuess(wHit.box.tag, 7, x, y, z); else { this.sfx.play('thunk', null, 0.6); this.fx.burst(x, y, z, 6, 0xd9d2c0, 1.5, 0.3); } }
  }
  hitPlayer(r, dmg, w, x, y, z) {
    this.send({ t: 'hit', to: r.uid, d: Math.round(dmg), w });
    this.hud.hitmarker(false); this.sfx.play('hit'); this.fx.burst(x, y, z, 14, 0xffffff, 3, 0.45);
  }

  /* ───────── projectiles, tracers ───────── */
  // kinds: paperT (teacher's paper), paper (BR paper ball), dodge (BR dodgeball)
  fire(kind, x, y, z, dx, dy, dz) {
    const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
    this.spawnProjectile(kind, x, y, z, dx, dy, dz, true);
    const q = (n) => +n.toFixed(2); this.send({ t: 'sh', k: kind, o: [q(x), q(y), q(z)], d: [q(dx), q(dy), q(dz)] });
    this.me.shot = (this.me.shot + 1) & 7;
  }
  spawnProjectile(kind, x, y, z, dx, dy, dz, mine) {
    const dodge = kind === 'dodge', W = dodge ? WEAPONS.dodge : WEAPONS.paper, speed = kind === 'paperT' ? 31 : W.speed;
    const mesh = dodge ? new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 2), new THREE.MeshStandardMaterial({ color: 0xd62828, roughness: 0.6 })) : makePaperBall(0.075);
    mesh.position.set(x, y, z); this.scene.add(mesh);
    this.projectiles.push({ kind, x, y, z, vx: dx * speed, vy: dy * speed, vz: dz * speed, g: dodge ? W.grav : 9, life: 3.5, mine, mesh });
    if (!mine) this.sfx.play(dodge ? 'dodge' : 'throw', { x, y, z }, 0.9);
  }
  updateProjectiles(dt) {
    const phys = this.world.physics, P = this.projectiles, campus = this.world.campus; if (!P.length) return;
    let T = null;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.vy -= p.g * dt; p.life -= dt;
      const sx = p.vx * dt, sy = p.vy * dt, sz = p.vz * dt, len = Math.hypot(sx, sy, sz) || 1e-6, dx = sx / len, dy = sy / len, dz = sz / len;
      let ht = len, world = phys.ray(p.x, p.y, p.z, dx, dy, dz, len), target = null;
      if (world) ht = world.t;
      if (p.mine) { T ??= this.targets(this.me.role === 'hunter' ? 'hider' : 'br'); for (const t of T) { const tt = rayBox(p.x, p.y, p.z, dx, dy, dz, t.minX - 0.08, t.minY, t.minZ - 0.08, t.maxX + 0.08, t.maxY + 0.08, t.maxZ + 0.08, ht); if (tt >= 0 && tt <= ht) { ht = tt; target = t; world = null; } } }
      const roofed = !world && !target && p.y + sy > campus.ceilAt(p.x + sx, p.z + sz);
      if (world || target || roofed || p.life <= 0) {
        const x = p.x + dx * ht, y = p.y + dy * ht, z = p.z + dz * ht;
        this.impact(p, x, y, z, world, target); this.scene.remove(p.mesh); P.splice(i, 1); continue;
      }
      p.x += sx; p.y += sy; p.z += sz; p.mesh.position.set(p.x, p.y, p.z); p.mesh.rotation.x += dt * 14; p.mesh.rotation.z += dt * 9;
    }
  }
  impact(p, x, y, z, world, target) {
    const dodge = p.kind === 'dodge', pos = { x, y, z };
    this.fx.burst(x, y, z, dodge ? 26 : 12, dodge ? 0xff5a5a : 0xffffff, dodge ? 5 : 2.5, dodge ? 0.6 : 0.45);
    this.sfx.play(dodge ? 'boing' : 'paper', pos, 1);
    if (!p.mine) return;
    if (p.kind === 'paperT') {
      if (target) this.hitPlayer(target.r, 34, 'paper', x, y, z);
      else if (world && world.box && world.box.tag) this.wrongGuess(world.box.tag, 4, x, y, z);
    } else if (p.kind === 'paper') { if (target) this.hitPlayer(target.r, WEAPONS.paper.dmg, 'paper', x, y, z); }
    else {
      const W = WEAPONS.dodge; if (target) this.hitPlayer(target.r, W.dmg, 'dodge', x, y, z);
      for (const t of this.targets('br')) { if (target && t.r === target.r) continue; const d = Math.hypot(t.r.x - x, t.r.y + 0.9 - y, t.r.z - z); if (d < W.splash) this.hitPlayer(t.r, W.splashDmg * (1 - 0.5 * d / W.splash), 'dodge', t.r.x, t.r.y + 1, t.r.z); }
    }
  }
  tracer(x0, y0, z0, x1, y1, z1, hex, life = 0.07) {
    let t = this.tracers.find((q) => q.life <= 0);
    if (!t) { if (this.tracers.length > 40) return; t = { mesh: new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })), life: 0, max: 1 }; t.mesh.frustumCulled = false; this.scene.add(t.mesh); this.tracers.push(t); }
    const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0); t.mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); t.mesh.lookAt(x1, y1, z1); t.mesh.scale.set(0.022, 0.022, len);
    t.mesh.material.color.set(hex); t.life = t.max = life; t.mesh.visible = true;
  }

  /* ───────── Battle Royale ───────── */
  _buildZone(seed) {
    const rng = mulberry32(seed ^ 0x9e3779b9), out = []; let cur = { x: 0, z: -4, r: ZONE_START_R }, t = 0;
    for (const [wait, shrink, r, dmg] of ZONE_PHASES) {
      const off = Math.max(0, cur.r - r) * 0.8, a = rng() * TAU, d = Math.sqrt(rng()) * off;
      const next = { x: clamp(cur.x + Math.cos(a) * d, -105, 105), z: clamp(cur.z + Math.sin(a) * d, -90, 90), r };
      out.push({ t1: t + wait, t2: t + wait + shrink, from: cur, to: next, dmg }); t += wait + shrink; cur = next;
    }
    return out;
  }
  zoneAt(t) {
    const Z = this.zonePh; if (!Z) return null;
    for (let i = 0; i < Z.length; i++) {
      const p = Z[i];
      if (t < p.t1) return { ...p.from, next: p.to, dmg: p.dmg, closing: false, left: p.t1 - t, i };
      if (t < p.t2) { const k = (t - p.t1) / (p.t2 - p.t1); return { x: lerp(p.from.x, p.to.x, k), z: lerp(p.from.z, p.to.z, k), r: lerp(p.from.r, p.to.r, k), next: p.to, dmg: p.dmg, closing: true, left: p.t2 - t, i }; }
    }
    const l = Z[Z.length - 1]; return { ...l.to, next: null, dmg: l.dmg, closing: false, left: 0, i: Z.length };
  }
  _makeZone() {
    const mat = new THREE.ShaderMaterial({
      transparent: true, side: THREE.DoubleSide, depthWrite: false, uniforms: { time: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform float time; varying vec2 vUv; void main(){ float s=0.5+0.5*sin(vUv.x*900.0+vUv.y*40.0-time*3.0); float e=smoothstep(0.0,0.08,vUv.y); float a=(0.16+0.2*s)*(1.0-vUv.y*0.75)*e+ (1.0-e)*0.5; gl_FragColor=vec4(1.0,0.16+0.2*s,0.42,a); }',
    });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 70, 96, 1, true), mat); m.visible = false; m.frustumCulled = false; m.renderOrder = 6; this.scene.add(m); return m;
  }
  _genLoot(seed) {
    const rng = mulberry32(seed ^ 0x51ed270b), sp = this.world.spawns, total = LOOT_TABLE.reduce((a, b) => a + b[1], 0);
    for (let i = 0; i < 115; i++) {
      let s = sp[(rng() * sp.length) | 0]; if (!s.in && rng() < 0.55) s = sp[(rng() * sp.length) | 0];
      let k = rng() * total, type = LOOT_TABLE[0][0]; for (const [t, w] of LOOT_TABLE) { if ((k -= w) <= 0) { type = t; break; } }
      const W = WEAPONS[type], info = W || LOOT_INFO[type], g = new THREE.Group();
      let icon; if (W) { icon = makeWeapon(type); icon.scale.setScalar(1.7); } else icon = new THREE.Mesh(type === 'drink' ? new THREE.CylinderGeometry(0.09, 0.09, 0.3, 10) : type === 'pass' ? new THREE.BoxGeometry(0.3, 0.2, 0.03) : new THREE.BoxGeometry(0.3, 0.22, 0.3), new THREE.MeshStandardMaterial({ color: info.color, roughness: 0.4, emissive: info.color, emissiveIntensity: 0.25 }));
      icon.position.y = 0.6; g.add(icon);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.38, 20), new THREE.MeshBasicMaterial({ color: info.color, transparent: true, opacity: 0.8, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; g.add(ring);
      g.position.set(s.x, 0, s.z); this.scene.add(g);
      const it = { id: 'L' + i, type, x: s.x, z: s.z, mesh: g, icon, taken: false, busy: false }; this.loot.push(it); this.lootById[it.id] = it;
    }
  }
  onLoot(id) { const l = this.lootById[id]; if (l && !l.taken) { l.taken = true; this.scene.remove(l.mesh); } }
  async tryPickup(l) {
    if (l.busy || l.taken) return; l.busy = true;
    const ok = await this.net.claimLoot(l.id); l.busy = false; if (!ok) return;
    this.onLoot(l.id); const me = this.me, W = WEAPONS[l.type]; this.sfx.play('pickup');
    if (W) {
      const have = me.weapons.find((w) => w.id === l.type);
      if (have) have.res += W.mag;
      else { const nw = { id: l.type, ammo: W.mag, res: W.mag * 2 }; if (me.weapons.length < 3) { me.weapons.push(nw); me.slot = me.weapons.length - 1; } else { const s = me.slot || 1; me.weapons[s] = nw; me.slot = s; } this._equip(); }
      this.hud.feed(`Picked up <span class="w" style="color:${W.color}">${esc(W.name)}</span>`);
    } else if (l.type === 'drink') { me.hp = Math.min(100, me.hp + 40); this.net.setPlayer({ hp: Math.round(me.hp) }); this.hud.feed('Energy Drink <span class="good">+40 health</span>'); }
    else if (l.type === 'pass') { me.sh = Math.min(100, me.sh + 50); this.net.setPlayer({ sh: Math.round(me.sh) }); this.hud.feed('Hall Pass <span class="good">+50 shield</span>'); }
    else { for (const w of me.weapons) if (w.id !== 'paper') w.res += WEAPONS[w.id].mag * 2; this.hud.feed('Supply Box <span class="good">ammo refilled</span>'); }
  }
  _equip() { const me = this.me; me.reloadEnd = 0; me.fireAt = Math.max(me.fireAt, this.time + 0.25); this._refreshVM(); this.net.setPlayer({ w: me.weapons[me.slot].id }); this.sfx.play('ui'); }
  updateBR(dt, ph) {
    const me = this.me, J = this.just, c = this.camera.position;
    // weapon select
    let want = me.slot; for (let i = 0; i < 3; i++) if (J.has('Digit' + (i + 1)) && me.weapons[i]) want = i;
    if (this.wheel) want = (me.slot + Math.sign(this.wheel) + me.weapons.length) % me.weapons.length;
    if (want !== me.slot) { me.slot = want; this._equip(); }
    const cur = me.weapons[me.slot], W = WEAPONS[cur.id];
    if (me.reloadEnd && this.time >= me.reloadEnd) { me.reloadEnd = 0; const n = Math.min(W.mag - cur.ammo, cur.res); cur.ammo += n; cur.res -= n; }
    if (J.has('KeyR') && !me.reloadEnd && cur.ammo < W.mag && cur.res > 0) { me.reloadEnd = this.time + W.reload; this.sfx.play('reload'); }
    const trigger = W.auto ? this.mouse.l : J.has('M0');
    if (trigger && this.time >= me.fireAt && !me.reloadEnd) {
      if (cur.ammo <= 0) { if (cur.res > 0) { me.reloadEnd = this.time + W.reload; this.sfx.play('reload'); } else if (J.has('M0')) this.sfx.play('empty'); }
      else {
        me.fireAt = this.time + W.rate; if (cur.ammo !== Infinity) cur.ammo--;
        this.sfx.play(W.snd, null, 0.9); this.vm.kick(W.kick || 0.5); if (cur.id === 'paper') this.vm.throwIt();
        const f = this.fwd(_v2);
        if (W.kind === 'proj') this.fire(cur.id === 'dodge' ? 'dodge' : 'paper', c.x + f.x * 0.5, c.y + f.y * 0.5 - 0.1, c.z + f.z * 0.5, f.x, f.y + 0.02, f.z);
        else { this.hitscan(W, cur.id, f); me.shot = (me.shot + 1) & 7; me.pitch = Math.min(1.5, me.pitch + (W.kick || 0.5) * 0.012); }
        if (cur.ammo <= 0 && cur.res > 0) { me.reloadEnd = this.time + W.reload; this.sfx.play('reload'); }
      }
    }
    // loot
    let near = null, nd = 2.3;
    for (const l of this.loot) { if (l.taken) continue; const d = Math.hypot(l.x - me.x, l.z - me.z); if (d < nd) { nd = d; near = l; } }
    this._nearLoot = near;
    if (near) {
      const isW = !!WEAPONS[near.type];
      const useful = near.type === 'drink' ? me.hp < 100 : near.type === 'pass' ? me.sh < 100 : near.type === 'ammo' ? me.weapons.length > 1 : (me.weapons.length < 3 || me.weapons.some((w) => w.id === near.type));
      if ((isW ? J.has('KeyE') || (useful && nd < 1.1) : useful && nd < 1.3) || (!isW && J.has('KeyE'))) this.tryPickup(near);
    }
    // the bell (zone)
    const z = this.zoneAt(ph.t);
    if (z) {
      const out = Math.hypot(me.x - z.x, me.z - z.z) > z.r; this._outside = out;
      if (out) { me.zoneTick += dt; if (me.zoneTick >= 1) { me.zoneTick = 0; this.takeDamage(z.dmg, '', 'zone', null, true); } } else me.zoneTick = 0;
    }
  }
  hitscan(W, id, f) {
    const me = this.me, c = this.camera.position, phys = this.world.physics, T = this.targets('br'), tally = new Map();
    const rx = Math.cos(me.yaw), rz = -Math.sin(me.yaw), mx = c.x + rx * 0.18 + f.x * 0.5, my = c.y - 0.14 + f.y * 0.5, mz = c.z + rz * 0.18 + f.z * 0.5;
    const spread = W.spread * (this.mouse.r ? 0.5 : 1) * (Math.hypot(me.vx, me.vz) > 5.5 ? 1.6 : 1);
    for (let i = 0; i < (W.pellets || 1); i++) {
      let dx = f.x + (Math.random() - 0.5) * 2 * spread, dy = f.y + (Math.random() - 0.5) * 2 * spread, dz = f.z + (Math.random() - 0.5) * 2 * spread; const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
      const w = phys.ray(c.x, c.y, c.z, dx, dy, dz, W.range); let bt = w ? w.t : W.range, best = null;
      for (const t of T) { const tt = rayBox(c.x, c.y, c.z, dx, dy, dz, t.minX, t.minY, t.minZ, t.maxX, t.maxY, t.maxZ, bt); if (tt >= 0 && tt < bt) { bt = tt; best = t; } }
      const hx = c.x + dx * bt, hy = c.y + dy * bt, hz = c.z + dz * bt;
      this.tracer(mx, my, mz, hx, hy, hz, id === 'laser' ? 0xff3030 : 0xfff2b0, id === 'laser' ? 0.22 : 0.07);
      if (best) { const crit = hy > best.r.y + 1.45 ? 1.5 : 1, e = tally.get(best.r) || { d: 0, x: hx, y: hy, z: hz }; e.d += W.dmg * crit; tally.set(best.r, e); }
      else if (w) { this.fx.burst(hx, hy, hz, 5, id === 'chalk' ? 0xffffff : 0xd9d2c0, 2, 0.3); if (w.box && w.box.tag) this.world.wobble(w.box.tag); }
    }
    for (const [r, e] of tally) this.hitPlayer(r, e.d, id, e.x, e.y, e.z);
  }

  /* ───────── frame ───────── */
  frame(tms) { requestAnimationFrame(this._raf); this.tick(tms); }
  tick(tms) {
    const dt = Math.min(0.1, Math.max(0.001, (tms - this._last) / 1000)); this._last = tms; this.time += dt; this._dt = dt;
    this.fpsAcc += dt; this.fpsN++; if (this.fpsAcc >= 0.5) { this.fps = this.fpsN / this.fpsAcc; this.fpsAcc = 0; this.fpsN = 0; this._autoQuality(); }
    const me = this.me;
    if (this.app === 'play' && this.meta) {
      this.updateLocal(dt); this.updateRemotes(dt); this.updateProjectiles(dt);
      for (const l of this.loot) if (!l.taken) { l.icon.rotation.y += dt * 1.6; l.icon.position.y = 0.62 + Math.sin(this.time * 2.2 + l.x) * 0.07; }
      const ph = this.phase();
      if (this.zonePh) { const z = this.zoneAt(Math.max(0, ph.t)); this.zoneMesh.position.set(z.x, 34, z.z); this.zoneMesh.scale.set(Math.max(0.5, z.r), 1, Math.max(0.5, z.r)); this.zoneMesh.material.uniforms.time.value = this.time; this._zone = z; } else this._zone = null;
      this.sendNet(dt); this.updateHud(ph);
      const f = this.fwd(); this.sfx.setListener(this.camera.position.x, this.camera.position.y, this.camera.position.z, f.x, f.z);
      this.sfx.ambience(!!this.world.campus.roomAt(me.x, me.z), true);
    } else {
      this.orbit += dt * 0.045; const a = this.orbit, R = 150;
      this.camera.position.set(Math.cos(a) * R + 4, 62 + Math.sin(a * 0.7) * 10, Math.sin(a) * R * 0.85 + 10); this.camera.lookAt(4, 4, 8); this._fov(55, dt);
      this.sfx.ambience(false, this.app !== 'menu');
    }
    this.authT += dt; if (this.authT > 0.5 && this.net && this.net.code) { this.authT = 0; this.authorityTick(); }
    this.fx.update(dt);
    for (const t of this.tracers) if (t.life > 0) { t.life -= dt; t.mesh.material.opacity = Math.max(0, t.life / t.max); if (t.life <= 0) t.mesh.visible = false; }
    _v.copy(this.camera.position); if (this.app === 'play') _v.set(me.x, 0, me.z);
    this.world.update(dt, this.time, _v);
    if (!this.noRender) {
      const r = this.renderer;
      if (this.rt && this.opts.quality > 0) { r.setRenderTarget(this.rt); r.render(this.scene, this.camera); r.setRenderTarget(null); r.render(this.postScene, this.postCam); }
      else r.render(this.scene, this.camera);
    }
    this.just.clear(); this.wheel = 0;
  }
  _autoQuality() {
    if (this.app !== 'play' || this.opts.quality === 0 || this.opts.lockQuality) { this.lowT = 0; return; }
    this.lowT = this.fps < 27 ? this.lowT + 0.5 : 0;
    if (this.lowT >= 4) { this.lowT = 0; this.opts.quality--; this.applyOpts(); this.hud.feed('Graphics quality lowered for a smoother frame rate'); }
  }
  sendNet(dt) {
    const me = this.me; this.sendT += dt; if (this.sendT < 1 / SEND_HZ) return; this.sendT = 0;
    if (!me.alive || me.role === 'spec' || me.role === 'none') return;
    const fl = (me.crouch ? 1 : 0) | (me.onGround ? 0 : 2) | (me.shot << 2);
    const s = `${me.x.toFixed(2)},${me.y.toFixed(2)},${me.z.toFixed(2)},${(me.role === 'hider' ? me.propYaw : me.yaw).toFixed(2)},${me.pitch.toFixed(2)},${fl}`;
    if (s === this.lastSent && this.time - this.lastSentAt < 4) return;
    this.lastSent = s; this.lastSentAt = this.time; this.net.sendState(s);
  }

  /* ───────── HUD ───────── */
  updateHud(ph) {
    const me = this.me, H = this.hud, m = this.meta, hs = m.mode === 'hs';
    const loc = this.world.campus.locName(me.x, me.z); H.set('loc-a', loc[0]); H.set('loc-b', loc[1]);
    // phase transitions + announcements
    if (ph.p === 'count') { const n = Math.ceil(ph.left); if (n < this._countBeep && n > 0) { this._countBeep = n; this.sfx.play('beep'); H.banner(String(n), hs ? (me.role === 'hunter' ? 'You are the TEACHER' : 'You are a STUDENT — get ready to hide') : 'Last student standing wins', 900); } }
    if (ph.p !== this._phaseWas) {
      const was = this._phaseWas; this._phaseWas = ph.p;
      if (ph.p === 'hide') { this.sfx.play('bell'); H.banner(me.role === 'hunter' ? 'GRADING PAPERS…' : 'HIDE!', me.role === 'hunter' ? 'Students are hiding' : 'Aim at an object and press E to disguise as it', 3600); }
      else if (ph.p === 'seek' && was) { this.sfx.play('bell'); H.banner(me.role === 'hunter' ? 'COLLECT THAT HOMEWORK' : 'THE TEACHER IS COMING', me.role === 'hunter' ? 'Left click: ruler · Right click: throw paper · Q: pop quiz' : 'Stay still. F locks your rotation.', 3600, me.role === 'hunter' ? 'good' : 'bad'); }
      else if (ph.p === 'fight' && was) { this.sfx.play('bell'); H.banner('CLASS DISMISSED', 'Grab school supplies — the bell is closing in', 3200); }
    }
    let nH = 0, nHid = 0, nBr = 0;
    for (const p of this.players.values()) { if (p.rd !== m.round) continue; if (p.role === 'hider' && p.alive) nHid++; else if (p.role === 'hunter') nH++; else if (p.role === 'br' && p.alive) nBr++; }
    if (hs) {
      H.set('t-phase', ph.p === 'count' ? 'GET READY' : ph.p === 'hide' ? 'HIDING TIME' : 'HOMEWORK HUNT'); H.time(ph.left);
      H.html('t-count', `<b>${nHid}</b> student${nHid === 1 ? '' : 's'} hiding · <b>${nH}</b> hunting`);
    } else {
      const z = this._zone; H.set('t-phase', ph.p === 'count' ? 'GET READY' : z && z.closing ? 'THE BELL IS CLOSING' : z && z.next ? 'NEXT BELL IN' : 'FINAL BELL');
      H.time(ph.p === 'count' ? ph.left : z ? z.left : 0); H.html('t-count', `<b>${nBr}</b> student${nBr === 1 ? '' : 's'} left · <b>${me.kills}</b> detention${me.kills === 1 ? '' : 's'}`);
      if (z && z.closing && this._zoneWarned !== z.i) { this._zoneWarned = z.i; this.sfx.play('siren'); H.banner('THE BELL IS CLOSING', 'Get inside the circle', 2400, 'bad'); }
    }
    const hunter = me.role === 'hunter' && me.alive, hider = me.role === 'hider' && me.alive, br = me.role === 'br' && me.alive;
    H.show('blackout', me.role === 'hunter' && (ph.p === 'hide'));
    if (me.role === 'hunter' && ph.p === 'hide') H.set('blackout-n', String(Math.ceil(ph.left)));
    H.show('crosshair', hunter || br || hider); H.show('vitals', hunter || br || hider); H.show('weapon', br); H.show('abilities', hunter || hider);
    H.show('spec', me.role === 'spec'); H.show('stunned', hunter && this.time < me.stun && ph.p === 'seek');
    H.set('role-chip', hunter ? (this.net.me && this.net.me.sub === 'mon' ? 'HALL MONITOR' : 'TEACHER') : hider ? 'STUDENT · ' + PROPS[me.prop].label.toUpperCase() : br ? 'STUDENT' : 'SPECTATOR');
    if (hunter) { H.bar('bar-a', me.patience / 100); H.set('bar-a-l', 'PATIENCE'); H.set('bar-a-v', String(Math.round(me.patience))); H.show('bar-b-wrap', false); }
    else { H.bar('bar-a', me.hp / 100); H.set('bar-a-l', 'HEALTH'); H.set('bar-a-v', String(Math.round(me.hp))); H.show('bar-b-wrap', br); if (br) { H.bar('bar-b', me.sh / 100); H.set('bar-b-v', String(Math.round(me.sh))); } }
    document.getElementById('bar-a').classList.toggle('low', !hunter && me.hp <= 35);
    let prompt = '';
    if (hunter) {
      const q = Math.max(0, me.quizAt - this.time);
      H.html('abilities', `<span class="key">LMB</span> Ruler <span class="key">RMB</span> Throw paper <span class="key ${q > 0 ? 'cd' : ''}">Q</span> Pop quiz${q > 0 ? ' ' + Math.ceil(q) + 's' : ''}`);
    } else if (hider) {
      const q = Math.max(0, me.tauntAt - this.time), free = ph.p === 'hide';
      H.html('abilities', `<span class="key">E</span> Disguise ${free ? '(free now · wheel cycles)' : '×' + me.morphs} <span class="key ${me.lock ? 'on' : ''}">F</span> ${me.lock ? 'Rotation locked' : 'Lock rotation'} <span class="key ${q > 0 ? 'cd' : ''}">Q</span> Taunt +10${ph.p === 'seek' ? ` <span class="dim">· squeak in ${Math.ceil(me.autoTaunt)}s</span>` : ''}`);
      if (this._aimProp) prompt = `<span class="key">E</span> Disguise as <b>${esc(PROPS[this._aimProp].label)}</b>`;
    } else if (br) {
      const cur = me.weapons[me.slot], W = WEAPONS[cur.id];
      H.set('w-name', W.name); H.set('w-ammo', cur.ammo === Infinity ? '∞' : String(cur.ammo)); H.set('w-res', cur.ammo === Infinity ? '' : '/ ' + cur.res);
      H.html('w-slots', [0, 1, 2].map((i) => { const w = me.weapons[i]; return `<div class="slot ${i === me.slot ? 'on' : ''}" style="--c:${w ? WEAPONS[w.id].color : '#555'}"><i>${i + 1}</i>${w ? esc(WEAPONS[w.id].name) : '—'}</div>`; }).join(''));
      H.show('reloading', !!me.reloadEnd); H.show('outside', !!this._outside);
      const l = this._nearLoot; if (l) { const info = WEAPONS[l.type] || LOOT_INFO[l.type]; prompt = `<span class="key">E</span> ${esc(info.name)}${info.desc ? ' <span class="dim">' + info.desc + '</span>' : ''}`; }
      document.getElementById('crosshair').classList.toggle('ads', this.mouse.r && !!W.zoom);
    }
    if (!br) { H.show('outside', false); H.show('reloading', false); }
    H.prompt(prompt);
    // minimap dots: allies only (no wall-hacks)
    const dots = [];
    for (const r of this.remotes.values()) { const p = r.info; if (!r.vis || !p.alive) continue; if (me.role === 'spec' || (hs && p.role === me.pub)) dots.push({ x: r.x, z: r.z, c: p.role === 'hunter' ? '#ffd166' : p.role === 'hider' ? '#7CFFB2' : '#ff6b6b' }); }
    const map = this.keys.has('KeyM');
    H.show('bigmap', map); if (map) H.bigmap(me, me.yaw, dots, this._zone); else if ((this._mmT = (this._mmT || 0) + 1) % 2 === 0) H.minimap(me, me.yaw, dots, this._zone);
    const sb = this.keys.has('Tab'); H.show('scoreboard', sb); if (sb) H.scoreboard(this.scoreRows(), hs ? 'HIDE & SEEK — HOMEWORK HUNT' : 'BATTLE ROYALE');
    H.set('fps', Math.round(this.fps) + ' fps');
  }
  scoreRows() {
    const rows = [], m = this.meta;
    for (const [u, p] of this.players) {
      const cur = m && p.rd === m.round && m.state !== 'lobby';
      rows.push({ name: p.n || 'Student', me: u === this.net.uid, host: m && m.host === u, color: colorOf(u), dead: cur && !p.alive,
        role: !cur ? '—' : p.role === 'hunter' ? (p.sub === 'mon' ? 'Hall Monitor' : 'Teacher') : p.role === 'spec' ? 'Spectator' : 'Student',
        status: !cur ? 'In lobby' : p.role === 'spec' ? 'Watching' : p.alive ? (p.role === 'hider' ? 'Hiding' : p.role === 'hunter' ? 'Hunting' : `${p.hp | 0} HP`) : (p.role === 'br' ? `Detention · #${p.pl || '?'}` : 'Has homework'), k: p.k || 0, score: p.sc || 0, pl: p.pl || 0, alive: !!p.alive });
    }
    return rows.sort((a, b) => b.score - a.score || b.k - a.k);
  }
}
export { colorOf, fmtTime };
