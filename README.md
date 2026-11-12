# Homework Hunt — NTC Wausau

A browser multiplayer game set on a scaled NTC Wausau campus. Two modes:

- **Hide & Seek** — students disguise themselves as campus objects; the teacher hunts them with a ruler and thrown paper to hand out homework.
- **Battle Royale** — everyone spawns at a random spot, grabs school supplies, and tries to be the last student standing while "the bell" closes in.

Play: **https://willardwonder.github.io/battleroyale/**

No build step. Plain ES modules, Three.js and the Firebase SDK are vendored in `vendor/`.

## One-time setup (about 3 minutes)

1. **Create the database.** Firebase console → project `battleroyale-f8924` → Build → **Realtime Database** → Create database → location **United States (us-central1)** → start in **locked mode**.
   The URL shown at the top should be `https://battleroyale-f8924-default-rtdb.firebaseio.com`. If it differs, paste it into `databaseURL` in `js/config.js`.
2. **Publish the rules.** Realtime Database → **Rules** tab → replace everything with the contents of [`database.rules.json`](database.rules.json) → Publish.
3. **Turn on GitHub Pages.** Repo → Settings → Pages → Deploy from a branch → `main` / root.

Guest play: Authentication → Sign-in method → **Anonymous** is enabled, so students go straight to the menu with no account.

## Running a class

1. Open the game, sign in, type a name, press **Create** (pick your own code like `NTC` or leave it blank for a random one).
2. Students open the same link and type the room code — or use **Copy invite link**.
3. Pick the mode and settings, press **Start round**. The host is the teacher in Hide & Seek.

After each round everyone returns to the lobby and scores carry over.

## Controls

| | |
|---|---|
| Everyone | WASD move · Shift sprint · Space jump · Tab scoreboard · M map · Esc menu |
| Teacher | Left click ruler (catches instantly) · Right click throw paper · Q pop quiz |
| Hiding | E disguise as what you aim at · F lock rotation · Q taunt (+10) · mouse wheel cycles disguises during hiding time |
| Battle Royale | Click fire · Right click aim · R reload · 1/2/3 or wheel swap · E pick up · Ctrl crouch |

## Editing the campus

Everything is generated from [`js/campus.js`](js/campus.js): rooms are rectangles on a 1 m grid
(`R(building, x0, z0, x1, z1, type, name)`), hallways are `H(...)`, exterior doors are in `EXITS`.
Walls, interior doors, windows, room plaques, furniture, collision and the minimap all follow from that file.
Furniture per room type is in [`js/furnish.js`](js/furnish.js); objects are defined in [`js/props.js`](js/props.js).

Building names and room functions come from NTC's published campus maps. Footprints and room numbers are an
approximation scaled for gameplay — correct them in `campus.js`.

## Testing without Firebase

`index.html?local` runs the same game over BroadcastChannel, so several tabs of one browser can share a room.
"Solo practice" on the menu uses this too.

## Good to know

- The game is client-authoritative: each player's browser reports its own position and damage. The database rules
  stop players from writing each other's records, but a student with dev tools open can still cheat their own.
- Firebase's free Spark plan allows 100 simultaneous connections and 10 GB of downloads a month.
  A 30-player round uses very roughly 0.3–0.6 GB, so a few sessions a month fit; heavy use needs the Blaze plan.
- Keyboard and mouse only; there are no touch controls.
