# Level 7 — "The Ward" (showcase blockout)

One level, authored properly, instead of six that are saved by tuning. It is a new map: the six original
`.tmx` files stay untouched. The blockout is generated at `public/assets/data/level7.tmx` and the preview
at `design/level7.preview.png`; both are untracked, nothing else in the repo was modified.

Play it right now with no code changes (dev console):

```js
const xml = await (await fetch('/assets/data/level7.tmx')).text()
game.cache.text.add('level7', xml)
game.scene.stop('Start'); game.scene.start('Game', { level: 7 })
```

Verified in the running game: the map parses, 64x22 tiles, the collision layer builds, the player spawns on
the start ledge at `tilePos(3, 9)` (the current `PLAYER_START` fallback lands exactly on it), 14 zombie
entities and 10 items spawn, and there are no console errors.

## What it is for

The original six levels are thin single-row platforms floating over a void: the collision layer fills ~8% of
the grid, there are no ceilings, no corridors and no vertical shafts, so the only two dangers are zombie
contact and falling. "The Ward" is a test of the opposite: an authored space where the geometry itself is
the content, using only systems that exist today (four archetypes, healing bullets, cure-to-human,
key/door/exit, health, the void).

## The map

```
00 ................................................................
04 .......................+........................................
05 ......................###W#.....................................
08 .................####......######...............................
09 ............G...................................................
10 .######...######.....................###W##...##W#S#.....+....G.
11 ......................................................#####..###
12 ..............................G...+.............................
13 ...........................#WW##W##R#......###..................
15 ............................................G...K............XD.
16 .....................................##B###W###R#W##..##R###W###
```

`#` solid platform, `W/R/B/S` zombie archetypes, `G` gun/ammo, `+` health, `K` key, `D` door, `X` exit sign.

Five beats, left to right. Each one teaches or tests exactly one thing.

1. **Start + the climb** (cols 1-20, rows 5-10). Safe ledge, a 3-tile gap, then a gun. The route then
   *climbs*: three stepped ledges, each 3 rows up and 1-2 tiles across, the first real use of the double
   jump. Nothing punishes you yet.
2. **The first cure** (cols 22-26, row 5). One walker on the highest platform and a health pickup behind it.
   This is the "shoot to cure" lesson with no time pressure, and the reward for having climbed.
3. **The ward** (cols 27-36, rows 8-13). You arrive by dropping onto a *roof* — a solid overhang that makes
   the left half of the floor below a covered chamber, the first enclosed space in the game. Four zombies
   live under and beside it, including a runner. The lesson is the game's own best mechanic: cured zombies
   become humans who **revert if another zombie touches them**, so the order you cure them in matters.
   Curing the far one first leaves a fresh human next to a live zombie.
4. **The arena** (cols 37-51, rows 10-16). Two floors: a lower floor with a brute (3 hits) holding the key
   behind it, and two upper walkways split by a 3-tile gap, joined to the floor by a mid ledge. A spitter
   stands on the upper right walkway, so the safe high ground is only safe while you keep moving. This is
   the "horde" beat the current systems can actually deliver: six enemies, two levels, one key.
5. **Gauntlet + exit** (cols 52-63, rows 11-16). Two routes to the door. The high route is entered from the
   arena's upper walkway and pays an ammo cache; the low route is entered from the arena floor and runs
   straight into a runner and the last zombie. Both meet at the door and the exit sign.

Ammo is the pressure: 19 bullets for 16 required hits (the brute costs three), so a sprayed run is short a
cure by the end. Three health pickups. One key, one door.

## Why this is different from the original six

- Layered heights (rows 5, 8, 10-11, 13, 16) instead of five evenly spaced platform rows.
- One enclosed chamber (roof + floor) — the geometry does something the original maps never do.
- Two routes to the same destination, with different risk and different rewards.
- Encounters are shaped: a teaching cure, a cure-order puzzle, a two-floor horde pocket, a final stretch.
- The zombies' own mechanic (a cured human can be re-infected) is the puzzle, not an accident.

## What it needs to become level 7 in the game

Two small code changes, both in the authoring path rather than gameplay:

1. `src/scenes/PreloadScene.ts` loads map text for `1..TOTAL_LEVELS`; with `TOTAL_LEVELS = 7` the new map
   loads. `src/levels/levels.ts` then needs `PLAYER_START[7]` (already correct by fallback) and an enemy
   mix for level 7.
2. Better than a per-level mix table: honour an `archetype` property on enemy objects in
   `spawnsFromObjects`, falling back to `LEVEL_MIX` only when it is absent. This map already writes
   `archetype` and `startLeft` per object, so authored levels declare their own spawns instead of relying
   on a count table — which is what a level designer actually wants. Without it, level 7 spawns 14 walkers.
   (Level select also needs a seventh node.)

## Open questions

- View height is ~640px = 9 tiles; the level spans rows 5-16, so no single screen shows both the roof and
  the floor under it. Either accept it (the drop is a reveal) or compress the vertical span by one row.
- The ward's chamber is only 5 tiles of headroom; that is deliberate, but it makes the camera claustrophobic
  on a short viewport. Worth a look on a phone.
- The horde here is 6 enemies. That is what four archetypes and per-entity AI support comfortably; a real
  30-zombie siege needs the AI tiering (round-robin `think()`, no tile query off-camera) before it will
  hold 60fps.
