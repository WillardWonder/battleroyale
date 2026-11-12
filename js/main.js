// App shell: sign-in, menu, lobby, pause and results screens.
import { Game, colorOf } from './game.js';
import { Sfx } from './audio.js';
import { FirebaseNet, LocalNet, randomCode, authMessage } from './net.js';
import { DEFAULT_SETTINGS } from './config.js';
import { esc } from './util.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const TEST = params.has('test');
let game, fbNet, localNet, net, signedIn = false, creating = false, resTimer = 0, settingsOnly = false;
const sfx = new Sfx();

function show(name) { for (const s of document.querySelectorAll('.screen')) s.classList.toggle('show', s.id === 's-' + name); }
function toast(msg, ms = 4200) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), ms); }
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
const myName = () => ($('in-callsign').value.trim().replace(/\s+/g, ' ').slice(0, 16) || 'Student');

const ui = {
  onLock(locked) { if (game.app !== 'play' || TEST) return; if (locked) show('none'); else openPause('PAUSED', 'RESUME'); },
  onMeta() { renderLobby(); },
  onPlayers() { renderLobby(); },
  onRoundStart() { if (TEST) { show('none'); return; } if (game.locked) show('none'); else openPause('ROUND STARTING', 'CLICK TO PLAY'); },
  onRoundEnd(won) { renderResults(won); show('results'); },
  onLobby() { clearInterval(resTimer); renderLobby(); show('lobby'); },
};

function openPause(title, btn) {
  settingsOnly = false; $('pause-title').textContent = title; $('btn-resume').textContent = btn; $('btn-resume').classList.remove('hidden');
  $('btn-endround').classList.toggle('hidden', !game.isHost()); $('btn-quit').classList.remove('hidden'); $('btn-closepause').classList.add('hidden');
  syncOpts(); show('pause');
}
function syncOpts() {
  const o = game.opts; $('opt-sens').value = o.sens; $('opt-fov').value = o.fov; $('opt-vol').value = o.vol; $('opt-q').value = o.quality;
  $('out-sens').textContent = (+o.sens).toFixed(2); $('out-fov').textContent = o.fov; $('out-vol').textContent = Math.round(o.vol * 100);
}

/* ───────── lobby ───────── */
const SETTINGS = [
  ['hide', 'Hiding time', [[20, '20 seconds'], [35, '35 seconds'], [45, '45 seconds'], [60, '60 seconds']]],
  ['seek', 'Hunt time', [[120, '2 minutes'], [180, '3 minutes'], [240, '4 minutes'], [300, '5 minutes'], [420, '7 minutes']]],
  ['area', 'Play area', [['auto', 'Auto (by player count)'], [0, 'Small — one building'], [1, 'Medium — a wing'], [2, 'Large — main building'], [3, 'Whole campus']]],
  ['hunterMode', 'Who is the teacher', [['host', 'The host'], ['random', 'Random player'], ['none', 'Nobody (practice hiding)']]],
  ['hunters', 'Hunters at start', [[1, '1'], [2, '2'], [3, '3']]],
  ['infect', 'Caught students', [[true, 'Become hall monitors'], [false, 'Spectate']]],
];
function renderLobby() {
  const m = game.meta; if (!m || !net || !net.code) return;
  const host = game.isHost(), n = game.players.size;
  $('lobby-code').textContent = net.code; $('lobby-count').textContent = n;
  $('lobby-players').innerHTML = [...game.players].sort((a, b) => (a[1].j || 0) - (b[1].j || 0)).map(([u, p]) => `<div class="${u === net.uid ? 'me' : ''}"><span class="dot" style="background:${colorOf(u)}"></span>${esc(p.n || 'Student')}${m.host === u ? ' <span class="chip">HOST</span>' : ''}<span style="margin-left:auto" class="dim small">${p.sc ? p.sc + ' pts' : ''}</span></div>`).join('');
  for (const b of document.querySelectorAll('.mode')) { b.classList.toggle('on', b.dataset.mode === m.mode); b.disabled = !host; }
  const set = m.set || {};
  $('lobby-settings').innerHTML = m.mode === 'hs' ? SETTINGS.map(([k, label, opts]) => `<label>${label}<select data-k="${k}" ${host ? '' : 'disabled'}>${opts.map(([v, t]) => `<option value="${v}" ${String(set[k] ?? (k === 'area' ? 'auto' : '')) === String(v) ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`).join('') : '';
  $('lobby-howto').innerHTML = m.mode === 'hs'
    ? `<b>STUDENTS</b> You spawn somewhere random on campus. Aim at any object and press <span class="key">E</span> to become it, then hold still — <span class="key">F</span> locks your rotation so you line up with the furniture. You squeak every so often, so pick your spot well.<br><b>TEACHER</b> Wait out the hiding time, then smack suspicious objects with the ruler <span class="key">LMB</span> or throw paper <span class="key">RMB</span>. Hitting ordinary furniture costs patience. <span class="key">Q</span> springs a pop quiz that makes nearby students squeak.`
    : `<b>BATTLE ROYALE</b> Everyone starts with paper balls. Pick up rubber bands, staplers, chalk erasers, dodgeballs and laser pointers with <span class="key">E</span>. Energy Drinks heal, Hall Passes shield. The bell (red wall) closes in — being outside it marks you tardy and drains health. Last student standing makes the honor roll.`;
  $('btn-start').classList.toggle('hidden', !host);
  const playing = m.state === 'play' || m.state === 'end';
  $('btn-start').disabled = playing;
  $('lobby-status').textContent = playing ? 'Round in progress…' : host ? (n < 2 ? 'You can start alone to explore, or wait for students to join.' : `${n} players ready.`) : 'Waiting for the host to start the round…';
}
function renderResults(won) {
  const m = game.meta, res = m.res || {}, hs = m.mode === 'hs';
  let title, sub = res.why || '';
  if (hs) { title = res.w === 'hunters' ? 'THE TEACHER WINS' : res.w === 'hiders' ? 'STUDENTS ESCAPE' : 'ROUND OVER'; }
  else if (res.id) { title = res.id === net.uid ? 'HONOR ROLL — YOU WIN' : `${game.nameOf(res.id).toUpperCase()} MAKES THE HONOR ROLL`; sub = 'Last student out of detention.'; }
  else title = 'ROUND OVER';
  $('res-kicker').textContent = won ? 'VICTORY' : hs ? 'HIDE & SEEK' : 'BATTLE ROYALE'; $('res-title').textContent = title; $('res-sub').textContent = sub;
  let rows = game.scoreRows(); if (!hs) rows = rows.sort((a, b) => (b.alive - a.alive) || ((a.pl || 99) - (b.pl || 99)));
  $('res-rows').innerHTML = rows.map((r) => `<tr class="${r.me ? 'me' : ''}"><td><span class="dot" style="background:${r.color}"></span>${esc(r.name)}</td><td>${esc(r.role)}</td><td>${hs ? (r.role === 'Student' ? (r.alive ? 'Never found' : 'Got homework') : r.role === 'Hall Monitor' ? 'Caught, then hunted' : r.role === 'Teacher' ? 'Hunted' : '—') : (r.alive ? 'Winner' : r.pl ? '#' + r.pl : '—')}</td><td class="num">${r.k}</td><td class="num">${r.score}</td></tr>`).join('');
  $('btn-tolobby').classList.toggle('hidden', !game.isHost());
  clearInterval(resTimer); const end = (m.tEnd || net.now()) + 14000;
  const tick = () => { $('res-next').textContent = `Back to the lobby in ${Math.max(0, Math.ceil((end - net.now()) / 1000))}s`; }; tick(); resTimer = setInterval(tick, 500);
}

/* ───────── joining ───────── */
async function join(useNet, code, create) {
  if (creating) return; creating = true; $('menu-err').textContent = '';
  const name = myName(); localStorage.setItem('hh-name', name); sfx.unlock();
  net = useNet; game.use(net); game.enterRoom();
  try {
    const c = await net.joinRoom(code, { n: name, role: 'none', sub: '', alive: false, hp: 100, sh: 0, prop: '', k: 0, sc: 0, rd: -1, w: 'paper', pl: 0, j: Date.now() }, create,
      { mode: 'hs', state: 'lobby', round: 0, seed: 1, t0: 0, hunters: '', set: { ...DEFAULT_SETTINGS, hunterMode: 'host' } });
    if (net === fbNet) history.replaceState(null, '', location.pathname + '?room=' + c);
    renderLobby(); if (game.app === 'lobby') show('lobby');
  } catch (e) { console.error(e); game.leaveRoom(); $('menu-err').textContent = e.message || String(e); show(signedIn || net === localNet ? 'menu' : 'auth'); if (!signedIn) $('auth-err').textContent = e.message || String(e); }
  creating = false;
}
async function leave() { clearInterval(resTimer); try { await net.leaveRoom(); } catch (e) { console.warn(e); } game.leaveRoom(); history.replaceState(null, '', location.pathname); show(signedIn ? 'menu' : 'auth'); }

/* ───────── boot ───────── */
async function boot() {
  $('in-callsign').value = localStorage.getItem('hh-name') || '';
  await nextFrame();
  try { game = new Game($('c'), sfx, ui); } catch (e) { console.error(e); $('load-msg').textContent = 'This device could not start WebGL: ' + (e.message || e); return; }
  game.testMode = TEST; window.__game = game;
  $('load-bar').style.width = '70%'; $('load-msg').textContent = 'Connecting…'; await nextFrame();
  localNet = new LocalNet(); game.attach(localNet);
  if (params.has('local')) {
    net = localNet; signedIn = true; $('whoami').textContent = 'Local test mode (this browser only)'; show('menu');
    if (params.get('room')) join(localNet, params.get('room'), !params.has('join'));
  } else {
    fbNet = new FirebaseNet(); game.attach(fbNet);
    try {
      fbNet.on('auth', (u) => {
        signedIn = !!u;
        if (u) { if (!$('in-callsign').value) $('in-callsign').value = (fbNet.name || '').slice(0, 16); $('btn-signout').textContent = fbNet.isAnon ? 'Sign in' : 'Sign out'; $('whoami').textContent = fbNet.isAnon ? 'Playing as a guest — no account needed' : 'Signed in as ' + (u.email || fbNet.name); if (!game.net || !game.net.code) { show('menu'); const r = params.get('room'); if (r && !boot.autoJoined) { boot.autoJoined = true; $('in-code').value = r.toUpperCase(); join(fbNet, r, false); } } }
        else if (!boot.triedGuest) { boot.triedGuest = true; fbNet.signInGuest().catch((e) => { console.warn(e); show('auth'); $('auth-err').textContent = authMessage(e); }); } // play straight away as a guest
        else if (!net || net !== localNet || !net.code) show('auth');
      });
      await fbNet.init();
      setTimeout(() => { if (document.querySelector('#s-loading.show')) show('auth'); }, 4000); // never sit on the loading screen
    } catch (e) { console.error(e); show('auth'); $('auth-err').textContent = 'Could not load sign-in: ' + (e.message || e); }
  }
  bindUI();
}
function bindUI() {
  const click = (id, fn) => $(id).addEventListener('click', (e) => { e.preventDefault(); sfx.unlock(); sfx.play('ui'); fn(e); });
  const authTry = async (fn) => { $('auth-err').textContent = ''; try { await fn(); } catch (e) { console.warn(e); $('auth-err').textContent = authMessage(e); } };
  let signup = false;
  click('btn-google', () => authTry(() => fbNet.signInGoogle()));
  click('lnk-guest', () => authTry(() => fbNet.signInGuest()));
  click('lnk-toggle', () => { signup = !signup; $('in-name').classList.toggle('hidden', !signup); $('btn-email').textContent = signup ? 'Create account' : 'Sign in'; $('lnk-toggle').textContent = signup ? 'Have an account? Sign in' : 'New here? Create an account'; });
  $('form-email').addEventListener('submit', (e) => { e.preventDefault(); const em = $('in-email').value.trim(), pw = $('in-pw').value; authTry(() => (signup ? fbNet.signUpEmail(em, pw, $('in-name').value.trim().slice(0, 16)) : fbNet.signInEmail(em, pw))); });
  const solo = () => join(localNet, 'SOLO' + randomCode(), true);
  click('lnk-solo', solo); click('btn-solo', solo);
  click('btn-join', () => { const c = $('in-code').value.trim(); if (!c) { $('menu-err').textContent = 'Enter the room code first.'; return; } join(fbNet || localNet, c, false); });
  $('in-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btn-join').click(); });
  click('btn-create', () => join(fbNet || localNet, $('in-newcode').value.trim() || randomCode(), true));
  click('btn-signout', async () => { if (fbNet) await fbNet.signOut(); else location.search = ''; });
  click('btn-settings', () => { settingsOnly = true; $('pause-title').textContent = 'SETTINGS'; $('btn-resume').classList.add('hidden'); $('btn-endround').classList.add('hidden'); $('btn-quit').classList.add('hidden'); $('btn-closepause').classList.remove('hidden'); syncOpts(); show('pause'); });
  click('btn-closepause', () => show('menu'));
  click('btn-leave', leave); click('btn-quit', leave);
  click('btn-copy', async () => { const url = location.origin + location.pathname + '?room=' + net.code; try { await navigator.clipboard.writeText(url); toast('Invite link copied — students can also just type the code ' + net.code); } catch { toast(url, 9000); } });
  for (const b of document.querySelectorAll('.mode')) b.addEventListener('click', () => { if (game.isHost()) { sfx.play('ui'); net.setMeta({ mode: b.dataset.mode }); } });
  $('lobby-settings').addEventListener('change', (e) => {
    const k = e.target.dataset.k; if (!k || !game.isHost()) return; let v = e.target.value;
    v = v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v; net.setMeta({ set: { ...game.meta.set, [k]: v } });
  });
  click('btn-start', () => { if (game.isHost()) game.startMatch(); });
  click('btn-resume', () => game.lock());
  click('btn-endround', () => { if (game.isHost()) game.endMatch('none', '', 'The host ended the round.'); });
  click('btn-tolobby', () => { if (game.isHost()) net.setMeta({ state: 'lobby' }); });
  const opt = (id, key, out, fmt) => $(id).addEventListener('input', (e) => { game.opts[key] = +e.target.value; if (key === 'quality') game.opts.lockQuality = true; if (out) $(out).textContent = fmt(+e.target.value); game.applyOpts(); game.saveOpts(); });
  opt('opt-sens', 'sens', 'out-sens', (v) => v.toFixed(2)); opt('opt-fov', 'fov', 'out-fov', (v) => v); opt('opt-vol', 'vol', 'out-vol', (v) => Math.round(v * 100)); opt('opt-q', 'quality');
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && settingsOnly) show('menu'); });
}
boot();
