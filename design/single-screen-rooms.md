# Single-screen rooms, and one tool per room

The campaign moved from the six scrolling TMX levels to six single-screen rooms in October 2026, to answer two questions about the remake: does a fixed frame make the fights readable, and does each level have to hand the doctor something new?

## The rooms

`tools/gen_screens.py` authors every room as ASCII and emits `public/assets/data/screen*.tmx` plus `design/screen*.preview.png`. A room is 20x12 tiles at 70px = 1400x840 world px, which always fits the visible world, so the camera never has to follow the doctor.

| room | name | barrier | the tool it hands out |
| --- | --- | --- | --- |
| 1 | The Gate | none: flat ground, two walkers | Double jump |
| 2 | The Well | a 5-tile climb out of the pit (single jump rises 3) | Dash |
| 3 | The Rift | an 11-tile rift off a raised lip (double jump crosses 9) | Spread shot |
| 4 | The Ward | three walkers hugging a 3-tile ledge: cure one and the others re-infect the human | Charge shot |
| 5 | The Galleries | a brute on a ledge, one bullet on the floor, flat shots pass under his body | Melee stun |
| 6 | The Long Night | everything at once, in clusters | Chain cure |

Rooms 1-3 gate on geometry, 4-6 on content, but all six are checked the same way: the ASCII is expanded, entities are snapped to the platform below them, and `--check` walks the room as a reachability graph. The door must be reachable with the tools the doctor owns when he enters the room, and - for the geometric rooms - unreachable with one tool fewer. The check is why the rooms are generated rather than hand-written in Tiled: `python3 tools/gen_screens.py --check` fails the build on an unreachable door or an item floating in the void.

## The reach model

The generator's numbers are measured in the shipped game, not guessed. From the lip edge, with the game's physics (gravity 1400, move 330, jump -820, double jump -760, dash 1000 for 340ms, which also cancels the fall):

- jump: 415px past the edge = 6 tiles
- double jump: 613px = 9 tiles
- double jump plus the dash: ~870px = 12 tiles

So a jump rises 3 tiles and crosses a 6-tile gap; the double jump rises 6 and crosses 9; the dash adds 3. Vertical reach: 240px single, 446px doubled.

Room 3 is the tightest fit: measured in the running game, a double jump alone reached x=866-893 off a lip at x=280 and fell in; the same run with the dash landed on the far floor at x=1270 (the floor starts at 1050). The gap is therefore a real gate, with about 130px of margin on the failing side and 200px on the passing side.

## The tool ladder

`src/levels/abilities.ts` holds the ladder, `src/state/store.ts` persists it under `zombieGame:abilities`, and a room grants its tool only when it is cleared, so replaying a room does not hand out anything twice. `Player` gates movement on the tool set: `maxJumps` is 1 without the double jump, `dash()` returns false without the dash. Room 1 is therefore a genuine single-jump room, which is what the original's first level felt like.

Save keys `zombieGame:availableLevel` and `zombieGame:levelProgress` are unchanged, so existing progress survives. `LEVEL_SET` in `src/config.ts` switches the whole campaign back to the classic scrolling levels in one line.

## Old maps

`public/assets/data/level1..6.tmx` and the code paths that read them are still in the tree; `src/levels/levels.classic.test.ts` keeps their spawn tables honest. Nothing loads them while `LEVEL_SET` is `screens`.
