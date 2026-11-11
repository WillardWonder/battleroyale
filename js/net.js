// Networking. FirebaseNet = real multiplayer (Auth + Realtime Database).
// LocalNet = same interface over BroadcastChannel, used for solo practice and for testing in two tabs.
//
// Database layout (see database.rules.json):
//   rooms/{code}/meta            host, mode, state, round, t0, seed, settings   (host writes)
//   rooms/{code}/players/{uid}   name, role, hp, alive, prop, score…            (owner writes, low frequency)
//   rooms/{code}/s/{uid}         "x,y,z,yaw,pitch,flags"                        (owner writes, ~9 Hz)
//   rooms/{code}/ev/{pushId}     hits, throws, taunts, eliminations             (append-only)
//   rooms/{code}/loot/{id}       uid of whoever picked it up                    (write-once)
import { FIREBASE_CONFIG } from './config.js';

class Emitter {
  constructor() { this.h = {}; }
  on(e, f) { (this.h[e] ??= []).push(f); }
  emit(e, ...a) { const l = this.h[e]; if (l) for (const f of l) { try { f(...a); } catch (err) { console.error('handler', e, err); } } }
}
const cleanCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
export const randomCode = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let s = ''; for (let i = 0; i < 4; i++) s += A[(Math.random() * A.length) | 0]; return s; };

export class FirebaseNet extends Emitter {
  constructor() { super(); this.kind = 'firebase'; this.uid = null; this.name = ''; this.offset = 0; this.code = null; this.me = null; this.unsubs = []; this.fb = null; }
  async init() {
    const fb = (this.fb = await import('../vendor/firebase.js'));
    this.app = fb.initializeApp(FIREBASE_CONFIG); this.auth = fb.getAuth(this.app); this.db = fb.getDatabase(this.app);
    fb.onValue(fb.ref(this.db, '.info/serverTimeOffset'), (s) => { this.offset = s.val() || 0; });
    fb.onValue(fb.ref(this.db, '.info/connected'), (s) => {
      const on = !!s.val(); this.emit('connection', on);
      if (on && this.code && this.me) this._presence().catch((e) => console.warn(e)); // re-announce after a reconnect
    });
    fb.onAuthStateChanged(this.auth, (u) => { this.uid = u ? u.uid : null; this.name = u ? (u.displayName || (u.email || '').split('@')[0] || 'Student') : ''; this.isAnon = !!(u && u.isAnonymous); this.emit('auth', u); });
  }
  now() { return Date.now() + this.offset; }
  async signInGoogle() { const p = new this.fb.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' }); await this.fb.signInWithPopup(this.auth, p); }
  async signInEmail(email, pw) { await this.fb.signInWithEmailAndPassword(this.auth, email, pw); }
  async signUpEmail(email, pw, name) { const c = await this.fb.createUserWithEmailAndPassword(this.auth, email, pw); if (name) { await this.fb.updateProfile(c.user, { displayName: name }); this.name = name; } }
  async signInGuest() { await this.fb.signInAnonymously(this.auth); }
  async signOut() { await this.leaveRoom(); await this.fb.signOut(this.auth); }

  r(path) { return this.fb.ref(this.db, `rooms/${this.code}/${path}`); }
  async _presence() {
    const fb = this.fb, p = this.r(`players/${this.uid}`), s = this.r(`s/${this.uid}`);
    await fb.onDisconnect(p).remove(); await fb.onDisconnect(s).remove();
    await fb.set(p, this.me);
  }
  // create=true makes (or takes over an abandoned) room; otherwise the room must already exist
  async joinRoom(code, me, create, defaultMeta) {
    const fb = this.fb; code = cleanCode(code); if (!code) throw new Error('Enter a room code');
    this.code = code; this.me = { ...me };
    try {
      const [metaSnap, plSnap] = await timeout(Promise.all([fb.get(this.r('meta')), fb.get(this.r('players'))]), 10000);
      const meta = metaSnap.val(), players = plSnap.val() || {};
      const hostHere = meta && players[meta.host];
      if (!meta && !create) throw new Error(`Room ${code} doesn't exist yet — check the code or ask your teacher to create it.`);
      await this._presence();
      if (!meta || (create && !hostHere)) await fb.set(this.r('meta'), { ...defaultMeta, host: this.uid });
    } catch (e) {
      try { await fb.remove(this.r(`players/${this.uid}`)); } catch { /* ignore */ }
      this.code = null; this.me = null; throw friendly(e);
    }
    const U = this.unsubs, startKey = fb.push(this.r('ev')).key;
    U.push(fb.onValue(this.r('meta'), (s) => this.emit('meta', s.val())));
    U.push(fb.onChildAdded(this.r('players'), (s) => this.emit('player', s.key, s.val())));
    U.push(fb.onChildChanged(this.r('players'), (s) => this.emit('player', s.key, s.val())));
    U.push(fb.onChildRemoved(this.r('players'), (s) => this.emit('playerGone', s.key)));
    const st = (s) => { if (s.key !== this.uid) this.emit('state', s.key, s.val()); };
    U.push(fb.onChildAdded(this.r('s'), st)); U.push(fb.onChildChanged(this.r('s'), st));
    U.push(fb.onChildAdded(fb.query(this.r('ev'), fb.orderByKey(), fb.startAt(startKey)), (s) => this.emit('event', s.val())));
    U.push(fb.onChildAdded(this.r('loot'), (s) => this.emit('loot', s.key, s.val())));
    return code;
  }
  async leaveRoom() {
    if (!this.code) return;
    for (const u of this.unsubs) { try { u(); } catch { /* ignore */ } } this.unsubs = [];
    const fb = this.fb, p = this.r(`players/${this.uid}`), s = this.r(`s/${this.uid}`);
    try { await fb.onDisconnect(p).cancel(); await fb.onDisconnect(s).cancel(); await fb.remove(p); await fb.remove(s); } catch (e) { console.warn(e); }
    this.code = null; this.me = null;
  }
  setMeta(part) { if (this.code) this.fb.update(this.r('meta'), part).catch(warn); }
  setPlayer(part) { if (!this.code) return; Object.assign(this.me, part); this.fb.update(this.r(`players/${this.uid}`), part).catch(warn); }
  sendState(str) { if (this.code) this.fb.set(this.r(`s/${this.uid}`), str).catch(warn); }
  sendEvent(ev) { if (this.code) this.fb.push(this.r('ev'), { ...ev, f: this.uid }).catch(warn); }
  async claimLoot(id) {
    try { const res = await this.fb.runTransaction(this.r(`loot/${id}`), (cur) => (cur === null ? this.uid : undefined)); return res.committed && res.snapshot.val() === this.uid; }
    catch { return false; }
  }
  resetRound() { if (!this.code) return; this.fb.remove(this.r('ev')).catch(warn); this.fb.remove(this.r('loot')).catch(warn); }
}
const timeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
const warn = (e) => console.warn('[net]', e && e.message ? e.message : e);
function friendly(e) {
  const m = String((e && (e.code || e.message)) || e);
  if (/permission_denied|PERMISSION_DENIED/i.test(m)) return new Error('The database refused the request. In Firebase console → Realtime Database → Rules, publish the rules from database.rules.json.');
  if (/Client is offline|network|timeout/i.test(m)) return new Error('Could not reach the game database. Has the Realtime Database been created in the Firebase console?');
  return e instanceof Error ? e : new Error(m);
}
export function authMessage(e) {
  const c = (e && e.code) || '';
  const map = {
    'auth/popup-closed-by-user': 'Sign-in window was closed.', 'auth/popup-blocked': 'Your browser blocked the sign-in popup — allow popups for this site.',
    'auth/invalid-credential': 'Wrong email or password.', 'auth/wrong-password': 'Wrong email or password.', 'auth/user-not-found': 'No account with that email — choose “Create account”.',
    'auth/email-already-in-use': 'That email already has an account — sign in instead.', 'auth/weak-password': 'Password needs at least 6 characters.', 'auth/invalid-email': 'That email address doesn’t look right.',
    'auth/operation-not-allowed': 'That sign-in method isn’t enabled in the Firebase console.', 'auth/admin-restricted-operation': 'Guest sign-in isn’t enabled (Firebase console → Authentication → Sign-in method → Anonymous).',
    'auth/unauthorized-domain': 'This web address isn’t an authorised domain in Firebase Authentication settings.', 'auth/network-request-failed': 'Network error — check your connection.',
  };
  return map[c] || (e && e.message) || 'Sign-in failed.';
}

/* Same API with no server: tabs of the same browser share a room over BroadcastChannel. */
export class LocalNet extends Emitter {
  constructor() { super(); this.kind = 'local'; this.uid = 'L' + Math.random().toString(36).slice(2, 10); this.name = 'Player'; this.code = null; this.me = null; this.meta = null; this.players = {}; this.loot = {}; }
  async init() { setTimeout(() => this.emit('auth', { uid: this.uid }), 0); }
  now() { return Date.now(); }
  async joinRoom(code, me, create, defaultMeta) {
    code = cleanCode(code) || 'SOLO'; this.code = code; this.me = { ...me }; this.meta = null; this.players = {}; this.loot = {};
    this.ch = new BroadcastChannel('homework-hunt-' + code);
    this.ch.onmessage = (m) => this._recv(m.data);
    this.ch.postMessage({ k: 'hello', u: this.uid });
    await new Promise((r) => setTimeout(r, 350));
    if (!this.meta) { if (!create) { this.ch.close(); this.code = null; throw new Error(`Room ${code} doesn't exist in this browser.`); } this.meta = { ...defaultMeta, host: this.uid }; }
    this.players[this.uid] = this.me;
    this.ch.postMessage({ k: 'p', u: this.uid, v: this.me });
    this._unload = () => this.ch && this.ch.postMessage({ k: 'gone', u: this.uid });
    addEventListener('pagehide', this._unload);
    setTimeout(() => { this.emit('meta', this.meta); for (const u in this.players) this.emit('player', u, this.players[u]); for (const id in this.loot) this.emit('loot', id, this.loot[id]); }, 0);
    return code;
  }
  _recv(d) {
    if (d.k === 'hello') { if (this.meta) this.ch.postMessage({ k: 'sync', meta: this.meta, players: this.players, loot: this.loot }); }
    else if (d.k === 'sync') { if (!this.meta) { this.meta = d.meta; this.players = { ...d.players }; this.loot = { ...d.loot }; } }
    else if (d.k === 'meta') { this.meta = { ...this.meta, ...d.v }; this.emit('meta', this.meta); }
    else if (d.k === 'p') { this.players[d.u] = { ...this.players[d.u], ...d.v }; this.emit('player', d.u, this.players[d.u]); }
    else if (d.k === 'gone') { delete this.players[d.u]; this.emit('playerGone', d.u); }
    else if (d.k === 's') this.emit('state', d.u, d.v);
    else if (d.k === 'ev') this.emit('event', d.v);
    else if (d.k === 'loot') { if (!this.loot[d.id]) { this.loot[d.id] = d.u; this.emit('loot', d.id, d.u); } }
    else if (d.k === 'reset') { this.loot = {}; }
  }
  async leaveRoom() { if (!this.code) return; this.ch.postMessage({ k: 'gone', u: this.uid }); this.ch.close(); this.ch = null; removeEventListener('pagehide', this._unload); this.code = null; this.me = null; }
  setMeta(part) { if (!this.code) return; this.meta = { ...this.meta, ...part }; this.ch.postMessage({ k: 'meta', v: part }); const m = this.meta; setTimeout(() => this.emit('meta', m), 0); }
  setPlayer(part) { if (!this.code) return; Object.assign(this.me, part); this.players[this.uid] = this.me; this.ch.postMessage({ k: 'p', u: this.uid, v: part }); const v = { ...this.me }; setTimeout(() => this.emit('player', this.uid, v), 0); }
  sendState(str) { if (this.code) this.ch.postMessage({ k: 's', u: this.uid, v: str }); }
  sendEvent(ev) { if (!this.code) return; const v = { ...ev, f: this.uid }; this.ch.postMessage({ k: 'ev', v }); setTimeout(() => this.emit('event', v), 0); }
  async claimLoot(id) { if (this.loot[id]) return false; this.loot[id] = this.uid; this.ch.postMessage({ k: 'loot', id, u: this.uid }); setTimeout(() => this.emit('loot', id, this.uid), 0); return true; }
  resetRound() { this.loot = {}; if (this.ch) this.ch.postMessage({ k: 'reset' }); }
  async signOut() { await this.leaveRoom(); }
}
