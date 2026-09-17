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
| Levels | Tiled maps; keep TMX, or resave as Tiled JSON (preferred) |
| Audio | Phaser Web Audio Sound Manager |
| State | `src/state/GameState.ts` singleton + `localStorage` |
| Art atlas | Keep hand-made sheets; adapter converts legacy JSON → Phaser atlas |

## Migration phases

### Phase 1 — Scaffold ✅ (this project)
Vite + TS + Phaser 4 project, asset pipeline, scene skeleton, state store,
boot/preload/start/level-select flows running, HUD and level scenes stubbed.

### Phase 2 — Vertical slice: one level, fully playable
Player movement (coyote/buffer/variable jump), Arcade tile collisions, one
level loaded from Tiled, zombies with edge-detecting AI, bullets, humans that
revert, key/door/exit, pickups, live HUD. This is the de-risking step: prove
the feel and the tilemap pipeline before scaling out.

### Phase 3 — Combat & enemy variety
Weapon system, hit-stop/shake/particles, enemy archetypes, spawn tables driven
by Tiled object layers, damage/health/death polish.

### Phase 4 — Progression & meta
Level select map, star scoring, unlocks, upgrade shop between levels,
`localStorage` save/load, summary + game-over + end screens.

### Phase 5 — Remaining levels & content
Port and then extend levels 2–6, add new act(s), boss encounters, challenge
and endless modes.

### Phase 6 — Polish, mobile & ship
Virtual controls, responsive/safe-area layout, audio unlock, performance pass,
cross-browser (Safari/iOS) QA, static deploy.

## Known gotchas
- Arcade Physics bodies won't exactly reproduce the original custom polygon
  collider (`[-15,-50]..[25,50]`) — budget tuning time and treat the original
  values (`jumpSpeed -660`, `speed 330`) as a starting point only.
- Zombie ledge detection used `Q.stage().locate(...)`; replace with
  `tilemap.getTileAtWorldXY` at the feet.
- Original zombie AI "line of sight" was a 350px horizontal band — reimplement
  and then improve.
- Legacy atlas JSON format differs from Phaser's; needs a small converter
  (planned in `src/assets/atlas.ts`).
- Original `Background` sprite read an undefined asset — dead code, drop it.
- `localStorage` keys reused for save compatibility: `zombieGame:availableLevel`,
  `zombieGame:levelProgress`.

## Current scaffold

```
src/
  main.ts            Phaser game bootstrap + scene list
  config.ts          Dimensions, physics, asset paths, tuning constants
  state/GameState.ts Progress + run state + event bus
  scenes/
    BootScene.ts     Scale/input setup
    PreloadScene.ts  Asset loading + progress bar
    StartScene.ts    Title
    ControlsScene.ts How-to-play
    LevelSelectScene.ts  Level grid with lock/stars
    GameScene.ts     Gameplay (stub → Phase 2)
    HudScene.ts      Overlay (stub)
    LevelSummaryScene.ts / GameOverScene.ts / EndScene.ts
  entities/          Player, Zombie, Human, Bullet, items/ (Phase 2+)
```

Run: `pnpm install && pnpm dev`
