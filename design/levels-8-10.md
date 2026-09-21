# Act: The Well, The Plaza, The Long Night (levels 8-10 blockouts)

Three more levels designed the way "The Ward" (level 7) was: an authored blockout with one clear idea per
level, built only from systems that exist today. New files — the six original `.tmx` maps are untouched:

- `public/assets/data/level8.tmx` + `design/level8.preview.png` — "The Well" (34x32, vertical)
- `public/assets/data/level9.tmx` + `design/level9.preview.png` — "The Plaza" (56x26, horde arena)
- `public/assets/data/level10.tmx` + `design/level10.preview.png` — "The Long Night" (88x26, endurance)

Companion: `design/level7.md` (the method and the level-7 spec), `design/design-notes.md` (all the design
reasoning behind these choices). Regenerate any of them with `gen_levels.py` from the same session.

Play any of them with no code changes (dev console, one level at a time):

```js
const n = 8   // 8, 9 or 10
const xml = await (await fetch(`/assets/data/level${n}.tmx`)).text()
game.cache.text.add(`level${n}`, xml)
game.scene.stop('Game'); game.scene.start('Game', { level: n })
```

All three verified in the running game (dev server, driving `window.game`): the map parses, the collision
layer builds, the entity counts match the spec exactly, and there are no console errors.

## The set, as an act

| Level | Size | Idea | Enemies | Requires |
| --- | --- | --- | --- | --- |
| 7 The Ward | 64x22 | One covered chamber, cure order as the puzzle | 14 | 16 hits / 19 bullets |
| 8 The Well | 34x32 | Verticality: the safe zig-zag descent against one long drop | 10 | 12 hits / 13 bullets |
| 9 The Plaza | 56x26 | A three-layer arena: cellar, plaza, galleries | 15 | 17 hits / 21 bullets |
| 10 The Long Night | 88x26 | Endurance: eight rooms, rising density, ammo as the clock | 16 | 18 hits / 20 bullets |

Difficulty rises by shape rather than by numbers: level 8 threatens the void, level 9 threatens
surroundings, level 10 threatens your ammo. Enemy archtypes stay mixed and hit points never scale — see
`design-notes.md` section 7 for why HP scaling is off the table in a healing game.

## Level 8 — "The Well" (34x32, vertical)

The first level that reads top to bottom. A sigle wide shaft with a zig-zag descent on the left wall, one
long drop down the middle, a spitter perched out of reach on the right, and a crypt floor at the bottom
holding the key.

```
04 .......................W..........
09 ......G...........................
10 .########.........................
13 .........###W#....................
15 .................G................
16 ...............##W##....##S###....
19 .........##R##....................
20 .#####............................
22 ...+...........##W##..............
23 ..#####...........................
25 .........#####....................
27 ............+.......K...G......XD.
28 ........###W#####W###B###R#...####
```

### Beats

1. **Entrance + well mouth** (rows 0-11): the start ledge, a gun, and the first look down the shaft. Two
   ways in: step off the left wall ledges, or jump.
2. **The zig-zag descent** (rows 12-21): five alternating ledges, each 3 rows below the last, with a walker
   or a runner on each. This is the safe route, and it teaches you to read the drop before you take it.
   A shallow alcove on the far left wall (rows 20-23) hides a health and a walker — a deliberate detour.
3. **The long drop** (rows 22-27): the middle of the shaft is empty for 18 rows. Jumping straight down
   reaches the crypt in one fall, but lands you in the middle of the crypt pack, and the spitter on the
   right-hand perch (row 16, cols 24-29) can see you all the way down.
4. **Crypt floor + exit** (rows 28-31): the lowest floor, with a walker pair, a brute (3 hits) and a runner
   guarding the key, and the exit annex across a 3-tile gap on the right. This is the only level where the
   walk out is uphill across a gap.

### Spawns

Zombies: walker (12,13), walker (17,16), runner (11,19), walker (17,22), spitter (26,16, on the perch),
walker (4,23, alcove), walker (11,28), walker (17,28), brute (21,28), runner (25,28).
Items: gun/5 (6,9), gun/3 (17,15, mid-descent), health (3,22, alcove), health (12,27), gun/6 (24,27),
key (20,27), exit sign (31,27), door (32,27).

### Notes

- The void is the real enemy here. Every descent is a commitment, and the safe route is deliberately slower
  than the drop.
- 13 bullets for 12 required hits: the tightest ammo in the set, but the generous route (killing only what
  blocks the path) is viable.
- Risk to watch: an 18-row fall is fine for the engine but reads as a black screen for a moment. If it feels
  wrong on a phone, add a mid-air ledge at rows 24-25 to break the fall.

## Level 9 — "The Plaza" (56x26, horde arena)

The level that finally delivers a crowd. Three layers stacked in one space: a cellar under the plaza, the
plaza floor itself, and two galleries above it, all connected, with the key up top and the door at the far
end of the floor.

```
09 ............G.....G.................+.K.............G...
10 .######...##W##.####W###R##...###W####W####.....###S##..
13 ...........................................########.....
15 ............................G.+............XD...........
16 ............###W##W##R....###R###W###W####B##...........
19 ....................+.......G...........................
20 ................####W#######W######.....................
```

### Beats

1. **Approach** (cols 1-14): a gun, a walker, and the choice of entering the plaza from above.
2. **The galleries** (cols 16-42, row 10): two walkways split by a 3-tile gap, runners on them, the key on
   the far one. Walking the galleries means fighting a few zombies with a long drop behind you.
3. **The drop** (cols 12-44, row 16): the plaza floor. Eight zombies over its whole length, including two
   runners and a brute by the door — the horde beat. A 4-tile hole in the middle of the floor is the way
   into the cellar.
4. **Plaza + tower** (cols 43-55): the door sits at the far right end of the floor; the tower beside it
   (rows 10-13) is a climb for an ammo cache and the only place the spitter can be silenced from.

### Spawns

Zombies: walker (12,10), walker (20,10), runner (24,10), walker (33,10), walker (38,10), walker (15,16),
walker (18,16), runner (21,16), runner (29,16), walker (33,16), walker (37,16), brute (42,16), walker
(20,20), walker (28,20), spitter (51,10, on the tower).
Items: gun/5 (12,9), gun/5 (18,9, gallery), health (36,9), key (38,9, gallery end), health (30,15), gun/4
(28,15), health (20,19, cellar), gun/4 (28,19, cellar), gun/3 (52,9, tower top), exit sign (43,15),
door (44,15).

### Notes

- This is the cure-order level at scale: cured humans on the plaza floor are reachable by every zombie still
  alive on it, so thinning the pack before harvesting is the whole game.
- The cellar is a deliberate risk pocket — a health and ammo down there, two walkers, and a double jump to
  get back out through the hole. It is also the only covered space in the level.
- 21 bullets for 17 hits is forgiving on purpose: the punishment here is surrounded, not starved.

## Level 10 — "The Long Night" (88x26, endurance)

Eight rooms in a row, each one a little meaner than the last, with three caches and a final 4-tile leap to
the exit. The longest map in the game so far (6160px), and the only one that is genuinely a resource test.

```
05 ............................#####.......................................................
08 ...........................................##S##.........................+..............
09 .............G...................G.....................................#####............
10 .######...###W###...........##W##RW##...................................................
11 ......................................................G.................................
12 .................................................###R###W#......................G...XD..
13 ...................##W##W#...............+...........................##W####W#.####W###.
14 .......................................##B###W##........................................
16 ...........................................................##R###R##....................
```

### Beats

1. **Island** (cols 1-16): one walker, the first cache.
2. **Roofed run** (cols 19-36): two walkers, a runner, a second cache — and a roof (row 5) over the left
   half of the platform, the first ceiling since The Ward. You can climb onto it for the view or stay under.
3. **Pocket + spitter** (cols 39-57): a lower pocket with a brute and a walker, a health, a spitter on the
   ledge above (out of reach from the floor, so it must be answered or avoided), then a rise back up.
4. **The narrow run** (cols 59-77): two runners on a thin platform over the void, a health, and two walkers
   after the rise.
5. **Exit** (cols 78-87): a 4-tile leap to the last platform, one walker, a final cache, the door.

### Spawns

Zombies: walker (13,10), walker (21,13), walker (24,13), walker (30,10), runner (33,10), walker (34,10),
brute (41,14), walker (45,14), spitter (45,8, on the upper ledge), runner (52,12), walker (56,12), runner
(61,16), runner (65,16), walker (71,13), walker (76,13), walker (84,13).
Items: gun/5 (13,9), gun/6 (33,9), health (41,13), gun/5 (54,11), health (64,15), health (80,8, upper
ledge), gun/4 (83,12), exit sign (85,12), door (86,12).

### Notes

- Density rises left to right: 1, 2, 3, 2+spitter, 2 runners, 1. Nothing is hard on its own; the level tests
  whether you still have bullets at the end.
- 20 bullets for 18 hits including one brute: you can miss twice. Deliberately zero slack beyond that, which
  is what makes it the "long night".
- This is the natural home for the endless/challenge mode later: any three of these rooms in sequence is
  already a run.

## What the three need to become real levels

Same as level 7 (`design/level7.md`):

1. `TOTAL_LEVELS` must cover 8-10 so `PreloadScene` loads their map text, plus `PLAYER_START` entries and
   level-select nodes. All four new maps already spawn the player correctly at `tilePos(3, 9)` through the
   existing fallback, because every start ledge covers that column.
2. Honour an `archetype` property (and `startLeft`) on enemy objects in `spawnsFromObjects`, falling back to
   `LEVEL_MIX` when it is absent. Every map here writes its own archetypes; without the change they spawn as
   walkers, which is exactly what the browser check showed.
3. A per-level enemy mix is then unnecessary for authored maps, but `LEVEL_MIX` should keep a level-7..10
   entry only if the fallback matters.

## Verified

Run against the live dev server, each level started through the real loader path:

- level 8: 10 zombies, 8 items (gun, gun, health, health, gun, key, exit_sign, door), player on the start
  ledge, no console errors;
- level 9: 15 zombies, 11 items, same;
- level 10: 16 zombies, 9 items, same.

The automated geometry check in `gen_levels.py` also confirms that no item sits on an unreachable platform
and no zombie spawns off the floor. It is a jump-envelope heuristic, not a pathfinder: it models a 3-row
up-jump with a 4-column gap, a 6-row double jump with 2, and requires a landing column that is not directly
under the platform you are leaving. Sections 4 and 8 of `design-notes.md` explain the envelope.
