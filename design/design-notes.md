# Heal'em All — design notes: modernising the game and building a real level

Working document. Everything discussed so far, plus the reasoning behind it, in one place. It is a draft:
nothing here is decided, and none of it is committed. Companion artifacts from the same session:
`design/level7.md` (the level-7 spec), `design/levels-8-10.md` (the level 8-10 specs),
`public/assets/data/level7.tmx`, `level8.tmx`, `level9.tmx`, `level10.tmx` (the blockout maps) and their
`design/level*.preview.png` renders.

## 1. Where the game actually stands

Measured, not remembered:

- Phases 1-6 of `PLAN.md` are essentially shipped: six levels from the original TMX, four enemy archetypes
  (walker, runner, brute, spitter), Zombie Mode, combat juice, stars, touch controls, PWA, self-hosted fonts,
  adaptive `Scale.EXPAND` rendering. The bead board is empty.
- The six original levels are 30x21 to 100x44 tiles (2100x1470px up to 7000x3080px). Their `collision` layer
  fills only ~8% of the grid: level 1 is 48/630 cells, level 5 is 353/4400, level 6 is 245/3800.
- Read as ASCII, every map is thin single-row platforms floating over empty space. No ceilings, no corridors,
  no enclosed rooms, no vertical shafts — the `foreground` layer is only decoration (signs, crossbones).
- Enemy counts run from 1 (level 1) to 23 (level 6), assigned by a per-level count table, not by the map.
- The only two dangers in the game are zombie contact and the void.

So "modern" is no longer "does it run". It is three questions: is the core verb deep, is there a reason to
come back tomorrow, and can anyone find the game. And the level problem is not a tuning problem: 92% of every
map is empty space, which is why the levels read as "jump on platforms and shoot zombies".

## 2. The reframe: authored geometry, layered pressure

Two different things are usually asked for at once and must not be solved the same way:

- **Level design** is authored and permanent. Hand-built TMX is the asset; random geometry would destroy it.
  Real platforming depth means *new maps authored in Tiled*, not retuning the original six.
- **Run variation and difficulty** are per-run pressure layered on top of the authored kit: a spawn director,
  visibility, mutators, a run structure. The map stays; the situation changes.

That is the Left 4 Dead / Spelunky / Hades split. Build the pressure system on top of a small number of good
maps rather than generating more mediocre ones.

## 3. Make "heal" a system, not a gun reskin

The heal-instead-of-kill verb is the one thing about this game nobody else has. Everything else in the genre
is commodity. Cheapest ideas first:

- **Cure combo.** `Bullet` already tracks waste and range. Route that into a chain counter: consecutive clean
  heals (no misses between them) raise a multiplier paid out at level end. Punishes spray-and-pray with no
  new assets.
- **Overheal / triage.** A zombie has a dose bar; interrupt the heal and it regresses. Each zombie becomes a
  small commitment decision instead of a tap.
- **Ailments map to cures.** Once weapon variants land (spread, charge, melee), give each archetype a needed
  modality so weapon choice means something other than damage numbers.
- **The rescuer's dilemma (already in the game).** A cured zombie becomes a human who reverts if another
  zombie touches it. That is the best mechanic in the build and nothing in the current levels asks the player
  to think about it. Cure *order* should be the puzzle.
- **Pacifist scoring.** Stars exist; add a visible cured / lost / collateral breakdown on the summary so the
  score has a moral shape, plus a no-human-lost medal.

References: the r/gamedesign thread on healing as a combat mechanic
https://www.reddit.com/r/gamedesign/comments/1gab234/how_could_a_game_with_healing_as_the_main_combat and
Raph Koster's "The Healing Game" https://www.raphkoster.com/2006/03/02/the-healing-game

## 4. Proper platforming

The originals cannot be rescued by tuning — sparse platforms over a void, and the maps are read-only by
policy. The honest answer is new maps, authored in Tiled against the same 70px tileset, built around movement
verbs that already exist (double jump, coyote time, jump buffering, variable height; the dash is on the
`PLAN.md` list).

Design language, in order of value per hour of authoring:

- **Ceilings, walls and shafts.** The current maps have none, which is why nothing can be a corridor problem.
  A shaft with a door at the top is already a platforming level.
- **One-way routes.** High road safe and fast; low road has the humans worth saving. That is a decision, not
  a jump.
- **Timing hazards.** Crumbling bone platforms, collapsing headstones, swinging or falling hazards, a rising
  fog line. Arcade Physics handles moving platforms; the rest is an overlap check.
- **The fusion move:** design routes so that good platforming *is* good healing. The gun is the only ranged
  tool, so route design should give clean firing lines from the high road and force awkward angles from the
  low road. That is what makes it one game instead of two.
- **Chase passages.** A survival beat where the fog advances and the level is the clock, not a HUD timer.

Useful reference for teaching and difficulty shape: https://en.wikipedia.org/wiki/Celeste_(video_game)

## 5. Hordes that work

- **Placement is the wrong tool; a director is the right one.** Spawn off-camera, at map edges, on a budget
  that is a function of the player's health, ammo, noise and elapsed time. Reference:
  https://en.wikipedia.org/wiki/Left_4_Dead , with https://en.wikipedia.org/wiki/Days_Gone for horde feel.
- **Encounters, not a baseline.** A level-wide zombie population becomes a mush. Use defined beats: a siege
  (hold a door while 30 converge), a corridor hold, an escort. The screamer from the `PLAN.md` pillars is the
  diegetic alarm that starts one.
- **Counterplay or bust.** Chokepoints, crowd control (spread shot, stun burst, a curing AoE dose) and the fact
  that the objective is conversion, not kills: holding a line while 30 zombies become humans is the identity
  of the game scaled up.
- **Performance is the real constraint, not rendering.** Phaser 4's renderer handles thousands of sprites;
  `Zombie.think()` is what breaks — it runs per zombie per frame and does a `getTileAtWorldXY` query plus a
  sight check. The plan: full `think()` only near the camera; off-screen zombies get velocity integration
  only, at ~3Hz; round-robin the cheap tier across frames; cap simultaneously active AI (start at 30-40); and
  consider dropping Arcade tile collision for the horde in favour of a coarse ground probe.

## 6. Visibility fog

The single highest-value feature here: it creates danger, difficulty and atmosphere in one system, and invents
an upgrade axis (the lantern) for free.

- **Mode A, the lantern:** a small radius of light around the doctor, thick fog outside. Platforming becomes a
  cautious read of the next ledge; a horde you can hear but not see is terrifying; spitters become real
  threats instead of visible annoyances.
- **Mode B, danger-driven fog:** density tied to state — sieges, Zombie Mode, low health. A diegetic
  difficulty knob that needs no numbers.
- **Audio becomes the information channel** (footsteps, breathing, the scream). That alone is the most modern
  thing you can do to a 2013 game.
- **Tech:** a screen-space dark `RenderTexture` at camera size that you `erase()` soft circles into per light
  is the portable pattern (`.opencode/skills/render-textures`). A custom `filters.external` shader (radial
  falloff plus noise) is the GPU-cheap alternative; filters are WebGL-only, which is fine for the target
  browsers (`.opencode/skills/filters-and-postfx`). Do not attempt a Phaser 3 Light2D port.
- **Telegraph rule:** with fog, a one-hit ranged attack is unfair. Either the spit glows or the spitter screams
  first.

## 7. Difficulty that survives upgrades

- **Never scale zombie hit points.** In a healing game, "more shots to cure" attacks the core verb and the
  fantasy. It is the one lever that is off the table.
- **Scale instead:** how many at once, from where, at what speed, in how much light, with how much ammo, and
  against what clock.
- **Shape per encounter, not per level:** tension, release, escalation, driven by the director.
- **Player-chosen danger is the modern answer:** mutators and ascension lists — Hades' Pact of Punishment
  https://en.wikipedia.org/wiki/Hades_(video_game) and Slay the Spire's Ascension
  https://en.wikipedia.org/wiki/Slay_the_Spire . The base game stays finishable; the score is gated behind
  danger you opt into. That is also what makes a leaderboard mean anything.

## 8. Upgrades that stay balanced

The rule: **an upgrade answers a hazard or adds an option; it never adds a number.**

- Fog → lantern radius, brightness, "cures glow through fog".
- Hordes → crowd-control dose, faster reload, ammo capacity, a cure that chains to an adjacent zombie.
- Platforming → air dash, ledge grab, a deployable platform.
- Survival → one free revive, faster safe-point respawn.
- Information → a sensor ping showing zombie state through fog, an off-screen horde indicator.

Guardrails: 1-of-3 picks per act with mutually exclusive branches and hard caps per axis; diminishing returns
within an axis; and cost expressed in score rather than currency, so taking power means a lower multiplier.
A maxed build should still lose a siege if played badly.

## 9. Replayability without random levels

- **A run = 3-5 authored levels + a seeded mutator deck + a loadout.** Six levels times mutators times seeded
  spawn mixes gives enormous variety with zero new geometry.
- **Seed everything.** Level 5 already picks one of four mirrored layouts with `Math.random()`; swap that for
  Phaser's seeded `RandomDataGenerator` and drive spawn mix, item placement, mutator set, fog density and the
  director budget from the same seed. Same seed = same run, which is what makes it shareable and what makes a
  daily challenge possible.
- **Mutators change how you play, not the numbers:** no gun (melee-touch cure only); silence (every shot
  alerts the level); blackout (fog never lifts); all runners; the siege arrives at 0:30; double dose (two
  shots per cure); no HUD, one life; the exit is locked until N zombies are cured.
- **Structure variety:** hijack the objective. Sometimes the exit is a door, sometimes a quota, sometimes a
  rescue.
- **Daily Challenge + share card:** one seed, one attempt, a Wordle-style result string
  (https://www.nytimes.com/games/wordle) and a URL that encodes seed + best time, so "beat my run" needs no
  backend. Ghost replays of your own previous attempt, stored locally, give the same feeling for free.

## 10. Presentation

Reading the current screenshots: the in-level look is good — strong silhouettes, readable green-vs-pale state
language, a clean flat HUD. The level-select screen is the one that reads 2013-2018 casual: static
silhouettes, fake-isometric pedestals, no motion, no depth pass.

Cheap modernisers, best value first:

- **Parallax.** The backdrop is already layered silhouettes; three bands at different scroll factors is an
  afternoon's work and the biggest "this is a 2020s game" tell.
- **Ambient motion.** Bats on slow paths, a drifting fog band, headstone rim-light, a pulsing moon glow.
  Tweens only, no new art.
- **An alive level select.** Stars popping in, an idle bob on the selected tombstone, an unlock animation
  instead of a lock simply vanishing.
- **Reactive music.** The original stems exist; layer and strip by health and by remaining zombies. Vertical
  remixing is the cheapest way to sound modern.
- **Photo mode / share card.** One key hides the HUD, freezes the frame and exports a PNG. A day of work that
  produces all the store thumbnails forever.
- **A victory beat.** One slow-mo, desaturated frame on the last cure of a level, cut from the same cloth as
  the existing hit-stop.

## 11. Accessibility and input

- **Non-colour state cues.** The core read is "is that a zombie, a human, or a cured human?" and it is carried
  by colour plus silhouette. A shape or idle-behaviour cue is a design fix, not just a setting. Context:
  https://access-ability.uk/2025/02/21/accessibility-standards-advancements-2025-needs
- **Gamepad support** via the Gamepad API, no library. A console-feel d-pad on a browser platformer is an
  instant credibility bump.
- **Remappable keys and touch layout, a screen-shake slider, reduced motion** (respect
  `prefers-reduced-motion`), and larger text. The UI already routes through `theme.ts` `TYPE` tokens, so a
  text-scale option is nearly free.
- **Settings that survive a reload** in the same localStorage namespace as mute.

## 12. Distribution

The build is a finished, installable, offline-capable PWA that nothing is playing. Modern web-game
distribution is portals, not just a personal URL:

- itch.io for the indie and portfolio audience.
- CrazyGames https://developer.crazygames.com , Poki and GameDistribution host the build and share ad revenue
  — they supply the traffic.
- Own deploy (Netlify/Cloudflare) with the daily-seed page as the landing surface rather than a raw score
  table.
- No accounts, no telemetry: everything above is URL-encoded or localStorage. If a real leaderboard is ever
  wanted, a Cloudflare Worker plus KV is the whole stack.

## 13. The level problem, solved once: "The Ward" (level 7 blockout)

Instead of six levels saved by tuning, one level authored properly. It is a new map — the six originals stay
untouched — at `public/assets/data/level7.tmx`, 64x22 tiles, five beats. Full spec in `design/level7.md`,
blockout image in `design/level7.preview.png`.

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

The beats, each teaching or testing one thing:

1. **Start + climb** (cols 1-20, rows 5-10) — a 3-tile gap, then the gun, then three stepped ledges 3 rows
   up and 1-2 tiles across: the double jump's first real use, with nothing punishing you yet.
2. **First cure** (cols 22-26, row 5) — one walker on the highest platform and health behind it. The healing
   lesson with no time pressure, and the reward for the climb.
3. **The ward** (cols 27-36, rows 8-13) — you arrive by dropping onto a *roof*: a solid overhang that makes
   the far half of the floor a covered chamber, the first enclosed space in the game. Four zombies live under
   and beside it, including a runner. The puzzle is cure *order*: a cured human reverts if another zombie
   touches them, so curing the far one first loses the human you just saved.
4. **The arena** (cols 37-51, rows 10-16) — two floors. A lower floor with a brute (3 hits) holding the key
   behind it, two upper walkways split by a 3-tile gap, joined to the floor by a mid ledge. A spitter on the
   upper right walkway, so the safe high ground is only safe while you move. Six enemies, two levels, one key.
5. **Gauntlet + exit** (cols 52-63, rows 11-16) — two routes to the door. The high route is entered from the
   arena's upper walkway and pays an ammo cache; the low route is entered from the arena floor and runs into a
   runner and the last zombie. Both meet at the door and the exit sign.

Ammo is the pressure: 19 bullets for 16 required hits (the brute costs three), so a sprayed run finishes one
cure short. Three health pickups, one key, one door.

What is genuinely different from the original six: layered heights (rows 5, 8, 10-11, 13, 16) instead of five
evenly spaced rows; one enclosed chamber; two routes to the same destination with different risk and reward;
encounters shaped as teach / puzzle / horde pocket / finale; and the zombies' own re-infection mechanic used
as the puzzle rather than left as an accident.

### Verified, not assumed

Loaded in the running game (`pnpm dev` on :8080, driving `window.game`):

- the map parses at 64x22, the collision layer builds, and there are no console errors;
- the player spawns at `tilePos(3, 9)` — the existing `PLAYER_START` fallback already lands on the start ledge;
- 14 zombie entities and 10 items spawn, exactly as designed (`gun, health, gun, health, gun, key, health,
  gun, exit_sign, door`);
- the ward floor is solid under the player and the layering renders with the real bone tiles and signs.

Play it now with no code changes:

```js
const xml = await (await fetch('/assets/data/level7.tmx')).text()
game.cache.text.add('level7', xml)
game.scene.stop('Start'); game.scene.start('Game', { level: 7 })
```

### Levels 8-10

Three more levels were authored the same way and are specified in `design/levels-8-10.md`: **The Well**
(34x32, a vertical zig-zag descent against one long drop), **The Plaza** (56x26, a three-layer horde arena —
cellar, plaza, galleries) and **The Long Night** (88x26, an eight-room endurance run where ammo is the
clock). Same rules as level 7: new files, the original maps untouched, only systems that exist today, and the
enemy archetypes declared per object in the map rather than through hit-point scaling.

Difficulty across the four is carried by shape, not by numbers: level 8 threatens the void, level 9
threatens being surrounded, level 10 threatens your ammo. All three were loaded through the real loader path
and verified in the running game (entity counts match the specs, no console errors), and the generator's
geometry check confirms no item sits on an unreachable platform.

### The two code changes it needs to become a real level

1. `src/scenes/PreloadScene.ts` loads map text for `1..TOTAL_LEVELS`, so `TOTAL_LEVELS = 7` is what makes the
   new map load; `src/levels/levels.ts` then wants a `PLAYER_START[7]` entry for clarity and an enemy mix.
   Level select needs a seventh node.
2. Better than another count table: honour an `archetype` property on enemy objects in `spawnsFromObjects`,
   falling back to `LEVEL_MIX` only when it is absent. The blockout already writes `archetype` and
   `startLeft` per object, so authored levels declare their own spawns — which is what a level designer
   actually wants. Without it, level 7 spawns 14 walkers.

## 14. Suggested order of attack

1. Wire "The Ward" in (the two changes above) and play it end to end. One good level beats six safe ones.
2. Cure combo, the summary breakdown, and non-colour state cues — small, touches the core verb, fixes a real
   gap.
3. Daily challenge plus share card; seeded runs driven from level 5's layout pick.
4. Level-select parallax, ambient motion, reactive music layered from the existing stems.
5. Fog and lantern on the ward/arena, once the AI tiering exists to make a horde affordable.
6. Upgrade picks (1-of-3) and mutators, priced in score.
7. A boss act, then portal submissions with photo mode for the store art.

## 15. Traps

- Do not bolt a roguelite meta layer on before the heal verb has depth. Order: verb, then reason to replay,
  then presentation, then meta.
- Do not make stat upgrades the reward loop. They inflate numbers and change nothing about how the player
  thinks.
- Do not chase multiplayer or accounts. Async through URLs beats servers at this size.
- Do not build six new levels before one boss exists, and do not tune the original six — author new geometry.
- Do not scale enemy hit points as difficulty.

## 16. Open questions

- View height is ~640px (9 tiles) while the level spans rows 5-16, so no single screen shows both the ward
  roof and the floor beneath it. Either accept the drop as a reveal or compress the vertical span by a row.
- The ward chamber has 5 tiles of headroom; deliberate, but worth a phone check for claustrophobia.
- The arena's horde is 6 enemies, which the current per-entity AI supports comfortably. A real 30-zombie
  siege needs the AI tiering before it will hold 60fps on a mid-range phone.
- Balance is currently unmeasurable. A dev-only stats overlay (shots per cure, heals per minute, damage taken
  per minute, time to clear, horde survived) with localStorage persistence would make all of the above tunable
  from data instead of opinion.

## 17. References

- Left 4 Dead (AI Director): https://en.wikipedia.org/wiki/Left_4_Dead
- Days Gone (horde design): https://en.wikipedia.org/wiki/Days_Gone
- Hades (Pact of Punishment, 1-of-3 boons): https://en.wikipedia.org/wiki/Hades_(video_game)
- Slay the Spire (Ascension): https://en.wikipedia.org/wiki/Slay_the_Spire
- Spelunky (authored kit + procedural arrangement): https://en.wikipedia.org/wiki/Spelunky
- Celeste (platforming teaching and difficulty): https://en.wikipedia.org/wiki/Celeste_(video_game)
- Balatro (short-session replay loop): https://en.wikipedia.org/wiki/Balatro
- Wordle (shareable daily result string): https://www.nytimes.com/games/wordle
- Healing as a combat mechanic (design discussion):
  https://www.reddit.com/r/gamedesign/comments/1gab234/how_could_a_game_with_healing_as_the_main_combat
- Raph Koster, "The Healing Game": https://www.raphkoster.com/2006/03/02/the-healing-game
- Video game accessibility, current expectations:
  https://access-ability.uk/2025/02/21/accessibility-standards-advancements-2025-needs
- CrazyGames developer portal (web portal distribution): https://developer.crazygames.com
- Phaser 4 render textures (fog mask): `.opencode/skills/render-textures/SKILL.md`
- Phaser 4 filters and post-fx (fog shader): `.opencode/skills/filters-and-postfx/SKILL.md`
