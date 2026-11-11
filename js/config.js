// Firebase web config (these values are public identifiers, not secrets — access is controlled by
// Authentication + the Realtime Database rules in database.rules.json).
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyD2z8Zv0TQGsBNySqAqgR8swMBDDiR1JTE',
  authDomain: 'battleroyale-f8924.firebaseapp.com',
  // If you created the Realtime Database outside us-central1, replace this with the URL shown at the
  // top of Firebase console → Build → Realtime Database.
  databaseURL: 'https://battleroyale-f8924-default-rtdb.firebaseio.com',
  projectId: 'battleroyale-f8924',
  storageBucket: 'battleroyale-f8924.firebasestorage.app',
  messagingSenderId: '889761396019',
  appId: '1:889761396019:web:a03f0d3451d4ae318afa46',
};

export const GAME_TITLE = 'HOMEWORK HUNT';
export const SEND_HZ = 9;          // position updates per second while moving
export const INTERP_DELAY = 170;   // ms of buffering for smooth remote players

export const DEFAULT_SETTINGS = { hide: 35, seek: 240, infect: true, hunters: 1 };

// Battle Royale "school supply" arsenal
export const WEAPONS = {
  paper: { name: 'Paper Ball', kind: 'proj', dmg: 20, rate: 0.5, speed: 34, grav: 9, mag: Infinity, snd: 'throw', color: '#e8e8e8' },
  rubber: { name: 'Rubber Band Blaster', kind: 'hit', dmg: 17, rate: 0.22, mag: 12, spread: 0.012, reload: 1.3, range: 120, snd: 'rubber', color: '#57d163', kick: 0.6 },
  stapler: { name: 'Staple SMG', kind: 'hit', dmg: 8, rate: 0.085, mag: 30, spread: 0.032, reload: 1.8, range: 80, auto: true, snd: 'stapler', color: '#4aa8ff', kick: 0.35 },
  chalk: { name: 'Chalk Blaster', kind: 'hit', dmg: 7, pellets: 7, rate: 0.9, mag: 4, spread: 0.075, reload: 2.0, range: 34, snd: 'chalk', color: '#4aa8ff', kick: 1.4 },
  dodge: { name: 'Dodgeball Launcher', kind: 'proj', dmg: 50, splash: 3.6, splashDmg: 26, rate: 1.1, speed: 29, grav: 12, mag: 3, reload: 2.3, snd: 'dodge', color: '#c77dff', kick: 1.5 },
  laser: { name: 'Laser Pointer', kind: 'hit', dmg: 55, rate: 1.2, mag: 4, spread: 0.0008, reload: 2.4, range: 260, zoom: 3.2, snd: 'laser', color: '#ffb703', kick: 1.0 },
};
export const LOOT_TABLE = [['rubber', 22], ['stapler', 16], ['chalk', 14], ['dodge', 7], ['laser', 6], ['drink', 22], ['pass', 12], ['ammo', 16]];
export const LOOT_INFO = {
  drink: { name: 'Energy Drink', color: '#57d163', desc: '+40 health' }, pass: { name: 'Hall Pass', color: '#4aa8ff', desc: '+50 shield' }, ammo: { name: 'Supply Box', color: '#e8e8e8', desc: 'ammo for everything' },
};
// Zone ("the bell"): [wait seconds, shrink seconds, radius after shrink, damage per second outside]
export const ZONE_PHASES = [[40, 45, 105, 2], [28, 40, 62, 4], [22, 34, 32, 6], [18, 28, 12, 9], [12, 25, 0, 14]];
export const ZONE_START_R = 230;
