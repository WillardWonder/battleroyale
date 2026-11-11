// All sound is synthesised with WebAudio — nothing to download, works offline.
export class Sfx {
  constructor() { this.ctx = null; this.vol = 0.7; this.lx = 0; this.ly = 0; this.lz = 0; }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = (this.ctx = new AC());
    this.master = c.createGain(); this.master.gain.value = this.vol;
    const comp = c.createDynamicsCompressor(); this.master.connect(comp); comp.connect(c.destination);
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    // ambience: soft wind outdoors / ventilation hum indoors
    const n = c.createBufferSource(); n.buffer = buf; n.loop = true;
    this.ambF = c.createBiquadFilter(); this.ambF.type = 'lowpass'; this.ambF.frequency.value = 500;
    this.ambG = c.createGain(); this.ambG.gain.value = 0.0;
    n.connect(this.ambF); this.ambF.connect(this.ambG); this.ambG.connect(this.master); n.start();
  }
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v; }
  setListener(x, y, z, fx, fz) {
    this.lx = x; this.ly = y; this.lz = z; this.fx = fx; this.fz = fz;
  }
  ambience(indoor, on) { if (!this.ctx) return; const t = this.ctx.currentTime; this.ambG.gain.setTargetAtTime(on ? (indoor ? 0.035 : 0.06) : 0, t, 0.4); this.ambF.frequency.setTargetAtTime(indoor ? 180 : 620, t, 0.4); }
  // returns {gain node input, t0} with distance attenuation + stereo pan for positional sounds
  out(pos, vol = 1, maxDist = 45) {
    const c = this.ctx, g = c.createGain(); let v = vol, pan = 0;
    if (pos) {
      const dx = pos.x - this.lx, dz = pos.z - this.lz, dy = (pos.y || 0) - this.ly, d = Math.hypot(dx, dy, dz);
      if (d > maxDist) return null;
      v *= Math.pow(1 - d / maxDist, 1.6);
      const rx = -(this.fz || 0), rz = this.fx || 0; pan = d > 0.5 ? Math.max(-1, Math.min(1, (dx * rx + dz * rz) / d)) * 0.85 : 0;
    }
    g.gain.value = v;
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(this.master); } else g.connect(this.master);
    return g;
  }
  tone(dst, type, f0, f1, dur, vol = 0.3, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dst); o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dst, dur, vol = 0.3, type = 'bandpass', f0 = 1000, f1 = f0, q = 1, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; s.loop = true; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dst); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }
  play(name, pos = null, vol = 1) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const fn = SOUNDS[name]; if (!fn) return;
    const o = this.out(pos, vol, name === 'bell' || name === 'siren' ? 400 : name.startsWith('taunt') ? 70 : 45); if (!o) return;
    fn(this, o);
  }
}
const SOUNDS = {
  step: (s, o) => s.noise(o, 0.07, 0.16, 'lowpass', 500 + Math.random() * 200, 200, 0.8),
  slide: (s, o) => s.noise(o, 0.16, 0.1, 'bandpass', 900, 500, 2),
  jump: (s, o) => s.noise(o, 0.1, 0.12, 'lowpass', 700, 300),
  land: (s, o) => { s.noise(o, 0.12, 0.25, 'lowpass', 400, 120); s.tone(o, 'sine', 110, 55, 0.12, 0.25); },
  whoosh: (s, o) => s.noise(o, 0.2, 0.35, 'bandpass', 600, 2600, 1.6),
  smack: (s, o) => { s.noise(o, 0.07, 0.7, 'highpass', 1800, 900, 0.7); s.tone(o, 'square', 300, 90, 0.09, 0.35); },
  thunk: (s, o) => { s.noise(o, 0.08, 0.35, 'lowpass', 900, 250); s.tone(o, 'sine', 180, 80, 0.1, 0.3); },
  throw: (s, o) => s.noise(o, 0.16, 0.22, 'bandpass', 1800, 500, 1.2),
  paper: (s, o) => { for (let i = 0; i < 4; i++) s.noise(o, 0.03, 0.3, 'highpass', 3000 + Math.random() * 2500, 2500, 0.7, i * 0.022); },
  hit: (s, o) => { s.tone(o, 'square', 1400, 1400, 0.045, 0.22); s.tone(o, 'square', 2100, 2100, 0.05, 0.16, 0.035); },
  kill: (s, o) => { s.tone(o, 'triangle', 660, 660, 0.09, 0.3); s.tone(o, 'triangle', 880, 880, 0.09, 0.3, 0.08); s.tone(o, 'triangle', 1320, 1320, 0.18, 0.3, 0.16); },
  hurt: (s, o) => { s.tone(o, 'sawtooth', 200, 90, 0.16, 0.3); s.noise(o, 0.1, 0.3, 'lowpass', 800, 300); },
  pickup: (s, o) => { s.tone(o, 'sine', 620, 620, 0.07, 0.25); s.tone(o, 'sine', 930, 930, 0.1, 0.25, 0.06); },
  morph: (s, o) => { s.tone(o, 'sine', 300, 900, 0.14, 0.3); s.noise(o, 0.12, 0.12, 'bandpass', 1200, 3000, 2); },
  ui: (s, o) => s.tone(o, 'sine', 880, 880, 0.04, 0.12),
  deny: (s, o) => { s.tone(o, 'square', 180, 160, 0.09, 0.18); s.tone(o, 'square', 150, 130, 0.12, 0.18, 0.1); },
  beep: (s, o) => s.tone(o, 'square', 880, 880, 0.09, 0.18),
  go: (s, o) => s.tone(o, 'square', 1320, 1320, 0.35, 0.2),
  bell: (s, o) => { for (let i = 0; i < 26; i++) { s.tone(o, 'square', 2050, 2050, 0.035, 0.16, i * 0.05); s.tone(o, 'triangle', 3100, 3100, 0.03, 0.12, i * 0.05 + 0.012); } },
  siren: (s, o) => { for (let i = 0; i < 3; i++) { s.tone(o, 'sawtooth', 520, 520, 0.22, 0.12, i * 0.5); s.tone(o, 'sawtooth', 390, 390, 0.22, 0.12, i * 0.5 + 0.25); } },
  win: (s, o) => [523, 659, 784, 1047, 1319].forEach((f, i) => s.tone(o, 'triangle', f, f, 0.25, 0.3, i * 0.11)),
  lose: (s, o) => [440, 370, 311, 233].forEach((f, i) => s.tone(o, 'sawtooth', f, f * 0.97, 0.28, 0.18, i * 0.2)),
  quiz: (s, o) => { s.tone(o, 'square', 740, 740, 0.1, 0.2); s.tone(o, 'square', 990, 990, 0.1, 0.2, 0.12); s.tone(o, 'square', 740, 740, 0.1, 0.2, 0.24); s.tone(o, 'square', 1240, 1240, 0.22, 0.2, 0.36); },
  taunt0: (s, o) => { s.tone(o, 'sine', 900, 1700, 0.18, 0.4); s.tone(o, 'sine', 1700, 1100, 0.22, 0.4, 0.2); },                                  // whistle
  taunt1: (s, o) => { for (let i = 0; i < 6; i++) s.tone(o, 'triangle', 620 + (i % 2) * 180 - i * 20, 520, 0.08, 0.4, i * 0.1); },             // giggle
  taunt2: (s, o) => { s.noise(o, 0.12, 0.2, 'bandpass', 900, 1400, 2); s.noise(o, 0.25, 0.6, 'highpass', 2500, 1200, 0.8, 0.18); s.tone(o, 'sawtooth', 500, 180, 0.2, 0.2, 0.18); }, // sneeze
  taunt3: (s, o) => { s.tone(o, 'sawtooth', 160, 90, 0.35, 0.4); s.tone(o, 'sawtooth', 110, 70, 0.3, 0.35, 0.3); },                              // stomach growl
  rubber: (s, o) => { s.tone(o, 'sawtooth', 700, 160, 0.12, 0.3); s.noise(o, 0.04, 0.25, 'highpass', 3000); },
  stapler: (s, o) => { s.noise(o, 0.035, 0.45, 'highpass', 2200, 1500); s.tone(o, 'square', 240, 120, 0.04, 0.25); },
  chalk: (s, o) => { s.noise(o, 0.22, 0.6, 'lowpass', 2400, 300); s.tone(o, 'sine', 120, 50, 0.18, 0.4); },
  dodge: (s, o) => { s.tone(o, 'sine', 220, 70, 0.25, 0.5); s.noise(o, 0.1, 0.3, 'lowpass', 700, 300); },
  boing: (s, o) => { s.tone(o, 'sine', 160, 420, 0.1, 0.5); s.tone(o, 'sine', 420, 120, 0.2, 0.4, 0.1); s.noise(o, 0.2, 0.4, 'lowpass', 1200, 300); },
  laser: (s, o) => { s.tone(o, 'sawtooth', 2400, 300, 0.2, 0.25); s.tone(o, 'square', 1800, 200, 0.16, 0.12); },
  reload: (s, o) => { s.noise(o, 0.04, 0.3, 'highpass', 2500); s.noise(o, 0.05, 0.3, 'highpass', 1800, 1800, 1, 0.28); s.tone(o, 'square', 500, 700, 0.04, 0.12, 0.3); },
  empty: (s, o) => s.noise(o, 0.03, 0.2, 'highpass', 4000),
  stamp: (s, o) => { s.noise(o, 0.1, 0.7, 'lowpass', 600, 150); s.tone(o, 'sine', 90, 45, 0.2, 0.6); },
};
