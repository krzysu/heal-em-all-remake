# Heal'em All — Remaster Plan

Rebuild the original 2013 HTML5 game on a modern stack, reusing the original art
and audio, but taking the gameplay well beyond the original.

- **Source game:** `../game-heal-em-all` (Quintus 0.2.0, CoffeeScript, Grunt, Node 4.8)
- **This project:** Vite + TypeScript + Phaser 4, vanilla ESM

## Why a rewrite, not a port

The thing that is dead is the engine, not the game. Quintus 0.2.0 has had no
release since ~2014 and the build toolchain pins Node 4.8 + Grunt + CoffeeScript.
The assets and level data are engine-agnostic, so they carry over untouched, and
the ~3,100 LOC of game code is straightforward to reimplement. Patching Quintus
internals would cost more than rewriting the logic.

### What carries over unchanged
- `public/assets/images/*` — spritesheets (characters, items, hud, others, bullet, map_tiles, bg)
- `public/assets/audio/*` — mp3 + ogg, same filenames
- `public/assets/source-art/*` — the editable source art
- `public/assets/data/level*.tmx` — level geometry, 70px tiles
- `public/assets/data/*.json` — hand-authored sprite atlas frames

### What is dropped
- `quintus*.js`, `quintus-all-old.js`, `stats.min.js`, `howler.js` (Howler is loaded but unused)
- The checked-in compiled `app/scripts/game.js`
- The Grunt/SASS/usemin/JSHint toolchain
- The leftover `ga()` analytics calls

## Design pillars (beyond the original)

The original was a slow, careful "heal the zombies" puzzle-platformer. The
remaster keeps the identity but raises the action ceiling.

1. **Action platformer first.** Coyote time, jump buffering, variable jump
   height, double jump, dash with i-frames, air control. Responsive, snappy.
2. **Combat with texture.** Multiple weapons (heal pistol, spread, charge shot,
   melee stun), reload/ammo tension, hit-stop, screen shake, muzzle flash,
   impact particles, heal bursts when a zombie converts.
3. **Enemy variety.** Walker (original), runner, brute (armoured, needs charge
   shot), spitter (ranged), screamer (alerts the level). A boss per act.
4. **Zombie Mode as a real mechanic.** Originally a punishment. Make it a
   temporary, voluntary risk/reward state: faster, melee-only, cannibalises
   zombies to keep the timer alive, but humans flee.
5. **Juice everywhere.** Tweens on pickup, camera shake, hit flash, parallax
   background, animated UI, diegetic sound cues.
6. **Progression.** More levels across themed acts, star thresholds, per-level
   medals, unlockable upgrades between levels, an endless/challenge mode,
   best-run leaderboard stored locally.
7. **Feel on mobile.** Real virtual stick + buttons, haptics where available,
   safe-area aware layout, orientation gate done right.

## Stack

| Concern | Choice |
|---|---|
| Engine | Phaser 4 (`^4.2.1`) — WebGL2 renderer, v3-compatible API |
| Language | TypeScript (`strict`, no `any`) |
| Build/dev | Vite 8 |
| Physics | Arcade Physics (platformer + tile collisions) |
| Levels | Tiled maps; the original `.tmx` is parsed at runtime (no resave) |
| Rendering | `RESIZE` scale mode, world drawn 1:1 like the original |
| Audio | Phaser Web Audio Sound Manager |
| State | `src/state/GameState.ts` singleton + `localStorage` |
| Art atlas | Keep hand-made sheets; adapter converts legacy JSON → Phaser atlas |

## Migration phases

Quality gates (typecheck, lint, format, tests, knip, build) are documented in
`AGENTS.md`; run `pnpm check` before calling a change done.

### Phase 1 — Scaffold ✅ (this project)
Vite + TS + Phaser 4 project, asset pipeline, scene skeleton, state store,
boot/preload/start/level-select flows running, HUD and level scenes stubbed.

### Phase 2 — Vertical slice: one level, fully playable ✅
All six original levels load from their untouched `.tmx` files via a small
runtime XML reader (`src/levels/tmx.ts`) that builds a Phaser array tilemap
(collision) plus a decoration layer — no resave step, no duplicated data.
Movement is a modern take on the original: gravity 1400, jump -820 (~3.4
tiles), double jump, coyote time, jump buffering, variable jump height and a
fall-speed cap. Ported and wired end to end: patrolling zombies with the
original ledge + 350px line-of-sight AI, healing bullets, humans that revert
when touched, key / door / gun / health pickups, live HUD with an info line,
lives, fall-out recovery, per-level summary with stars, save progress.

Spawn data lives in `src/levels/levels.ts`: levels 1-2 use explicit tables
ported from the original scene scripts (they hardcoded their entities), levels
3-6 are read from the TMX object groups exactly like `addObjectsToStage` did.
Level 5 keeps the original's gimmick: it ignores the map's Key/Door/Health
objects and picks one of four mirrored layouts at random.

Rendering also matches the original: its canvas was the window size and the
world was drawn 1:1 (the `upsampleWidth: 640` branch never fired on desktop),
so the remaster uses Phaser's `RESIZE` mode at zoom 1. Menu scenes keep their
640x320 design coordinates by zooming their camera by the design-to-window
ratio (`src/ui/layout.ts`). The HUD is a 1:1 rebuild of `hud.coffee`: the 124px
gradient bar, the doctor's head with a speech bubble, and icon counters chained
from the right edge, plus the pause and menu buttons.

### Phase 3 — Combat & enemy variety (next)
Shipped: Zombie Mode (zero lives turns the doctor into a ZombiePlayer — slower,
single jump, no gun, infects humans on touch, must fall off the map to recover),
combat juice (hit-stop via `World.timeScale`, camera shake, muzzle flash,
particle bursts, HUD avatar swap) and four enemy archetypes — walker, runner,
brute (armoured, 3 hits) and spitter (ranged) — mixed per level in
`src/levels/levels.ts`.

Still to do: weapon variants (spread, charge, melee) and hit reactions for the
player, plus boss encounters.

### Phase 4 — Progression & meta
Level-select upgrades: star scoring, unlocks and the summary/star row are in;
still to do are the upgrade shop between levels, richer medals, and best-run
records.

### Phase 5 — Remaining levels & content
All six original levels already load and play. Extend them with new act(s),
boss encounters, and challenge + endless modes.

### Phase 6 — Polish, mobile & ship
Virtual controls, responsive/safe-area layout, audio unlock, performance pass,
cross-browser (Safari/iOS) QA, static deploy.

## Known gotchas
- The original custom polygon collider (`[-15,-50]..[25,50]`) is approximated
  with an Arcade body (26x86, offset 12,13). Physics was deliberately retuned
  for the remaster (gravity 1400, jump -820, double jump) while keeping the
  original's reach: level 1 needs ~3.2-tile jumps and 4-tile gaps.
- Zombie ledge detection used `Q.stage().locate(...)`; now
  `TilemapLayer.getTileAtWorldXY` at the feet.
- Zombie "line of sight" is the original 350px horizontal band, with a 3s
  memory and a 10s alert cooldown, in `src/entities/Zombie.ts`.
- Phaser cannot load `.tmx`, and its Tiled-JSON loader would mean resaving the
  levels; `src/levels/tmx.ts` parses the XML at runtime instead. Tileset
  `firstgid=1` / gid 0 maps to index -1.
- `Phaser.Input.Keyboard.JustDown` is cleared by the keyup handler, so a tap
  between two frames is dropped. Gameplay presses are queued from `keydown-*`
  events in `GameScene.bindInput()`.
- Levels 1-2 hardcoded their entities in the original scene scripts, so they
  keep explicit spawn tables; levels 3-6 read the TMX object groups. The legacy
  random key/door layouts in levels 3 and 5 are currently fixed to one variant.
- Original `Background` sprite read an undefined asset — dead code, dropped.
- `localStorage` keys reused for save compatibility: `zombieGame:availableLevel`,
  `zombieGame:levelProgress`.

## Current scaffold

```
src/
  main.ts            Phaser game bootstrap + scene list (+ dev-only window.game)
  config.ts          Dimensions, physics, asset paths, tuning constants
  state/GameState.ts Progress + run state + event bus
  levels/
    tmx.ts           Runtime TMX -> Phaser tilemap parser
    levels.ts        Per-level player start + spawn tables
  scenes/
    BootScene.ts     Scale/input setup
    PreloadScene.ts  Asset loading + progress bar (images, atlases, audio, TMX)
    StartScene.ts    Title
    ControlsScene.ts How-to-play
    LevelSelectScene.ts  Level grid with lock/stars
    GameScene.ts     Full level pipeline: map, entities, combat, win/lose
    HudScene.ts      Overlay: counters + doctor's info line
    LevelSummaryScene.ts / GameOverScene.ts / EndScene.ts
  entities/
    Player.ts        Movement, double jump, gun, invincibility, zombie mode
    Zombie.ts        Walker / runner / brute / spitter AI, heal or die
    Human.ts         Reverts when touched by a zombie
    DeadZombie.ts    Fallen zombie that was once human
    Bullet.ts        Healing round with range + waste tracking
    Spit.ts          Spitter projectile that costs the player a life
    Item.ts          Key / door / gun / health / exit sign
```

Run: `pnpm install && pnpm dev`
