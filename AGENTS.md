# Heal'em All (remake)

Phaser 4 + TypeScript + Vite remaster of the 2013 HTML5 game. `PLAN.md` has the
migration phases, design pillars and the `src/` map; read it before changing
gameplay. Assets and level data are the original files, carried over untouched.

## Commands

| Command                                  | Notes                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| `pnpm check`                             | Everything below, in order. Run before calling a change done.            |
| `pnpm dev`                               | Vite on `http://localhost:8080` (`strictPort`, auto-opens a browser)     |
| `pnpm typecheck`                         | `tsc --noEmit` — the only source of type safety (see oxlint note)        |
| `pnpm lint` / `pnpm lint:fix`            | `oxlint`; `pnpm lint --deny-warnings` is what CI enforces                |
| `pnpm format` / `pnpm format:check`      | Prettier; no semicolons, single quotes, 100 cols                         |
| `pnpm test`                              | Vitest, co-located `src/**/*.test.ts`, jsdom                             |
| `pnpm test src/state/GameState.test.ts`  | Single file. A `--` before the path is swallowed and runs everything.    |
| `pnpm knip`                              | Unused files/exports/deps; currently clean, keep it that way             |
| `pnpm build`                             | `tsc --noEmit && vite build`                                             |

### Why oxlint, not ESLint

TypeScript 7 is the native compiler: its package has no `lib/typescript.js`, so
there is no programmatic JS API. `typescript-eslint` hard-fails on TS >= 7 and
Biome-style tools are the practical alternative, so lint is `oxlint` (own TS
parser) and all type enforcement comes from `tsc --strict`. Don't try to add
type-aware lint rules — they cannot work here.

## Architecture facts that aren't obvious from filenames

- **Levels stay as TMX.** `public/assets/data/level*.tmx` (70px tiles) are the
  originals; `src/levels/tmx.ts` parses the XML at runtime from the `level{n}`
  text cache. Phaser cannot load `.tmx`, and resaving to Tiled JSON is rejected
  by design. Tileset `firstgid=1`, so gid 0 becomes tile index `-1`.
- **Spawn tables live in `src/levels/levels.ts`.** Levels 1-2 hardcoded their
  entities in the original scene scripts and keep explicit tables; levels 3-6
  read TMX object groups; level 5 ignores the map's Key/Door/Health objects and
  picks one of four mirrored layouts at random. Level 3's original two-way
  key/door random is *not* ported yet.
- **Art atlases are hand-authored legacy JSON**, converted at runtime by
  `src/assets/legacyAtlas.ts` into frames named `"<name>:<index>"`. Never edit
  `public/assets` (also excluded from Prettier and oxlint).
- **Rendering is 1:1 like the original**: `Phaser.Scale.RESIZE`, camera zoom 1,
  world drawn in CSS pixels. `pixelArt`/`roundPixels` are **off**: the art is
  vector-ish and the UI is web fonts, so nearest-neighbour sampling looked harsher
  than the source rather than sharper.
- **Menus lay out in percentages of the live window, not a design space.** The
  original set `Q.width`/`Q.height` to the window and used `Q.width * 0.24`,
  `Q.height * 0.22`, etc. per axis, so the layout adapts to any aspect ratio.
  Do **not** reintroduce a camera zoom for menus — a single zoom factor stretched
  the level-select grid. Use `onLayout(scene, fn)` from `src/ui/layout.ts` to run
  a layout immediately and again on `RESIZE`. `GAME_WIDTH`/`GAME_HEIGHT` are only
  the initial window size now, and HUD/backdrops must measure
  `this.scale.width/height` too.
- **Menu font sizes are literal pixels**, exactly as in the original: a 60px
  heading stays 60px on a 1080-tall or 1440-tall window. Do not scale fonts by
  the height ratio; `fontScale()` is a 1:1 placeholder for that reason.
- **Controls follow the original Quintus bindings**: up arrow / X (`action`) and
  W jump; space / Z (`fire`) shoot; arrows or A/D move. Space deliberately does
  **not** count as held-jump, or firing would siphon jump height.
- **State is split on purpose**: `src/state/store.ts` is Phaser-free and unit
  tested; `src/state/GameState.ts` re-exports it and owns the Phaser event bus.
  Put new persistent/run logic in `store.ts`.
- **Save compatibility**: the original localStorage keys are reused
  (`zombieGame:availableLevel`, `zombieGame:levelProgress:<n>`).

## Verifying gameplay in a browser

Playwright MCP is configured in the root `opencode.json`; screenshots and console
logs land in `.playwright-mcp/` (gitignored). Dev builds expose `window.game`
(stripped from production), so scenes can be driven headlessly:

```js
window.game.scene.stop('Start')
window.game.scene.start('Game', { level: 1 })
```

`scene.launch` is queued to the next frame, so after starting `Game` wait for
`window.game.scene.getScene('Hud').bubbleText` before reading HUD state —
`GameScene.create` also delays its intro `info` emit for the same reason.

## Porting gotchas

- Read the original CoffeeScript before guessing at behaviour:
  `../game-heal-em-all` (`app/scripts/game/scenes/level*.coffee`,
  `sprites/**`). It is a local checkout, not a dependency.
- Do not re-port the original physics numbers; the remaster deliberately retunes
  them (see the design pillars in `PLAN.md`).
- Reset `physics.world.timeScale` in `create()`, never in a SHUTDOWN handler —
  the world is already gone by then.
- Falling out of the map only works because the world bounds' bottom edge is
  non-colliding; respawn and exiting Zombie Mode depend on it.
- `Phaser.Input.Keyboard.JustDown` is cleared by keyup, dropping presses between
  frames: gameplay presses are queued from `keydown-*` in `GameScene.bindInput`.
- `exactOptionalPropertyTypes` is on: anything assignable to `undefined` needs an
  explicit `| undefined` on the optional property.

## Conventions

- No comments unless they explain *why*; ASCII only.
- One-line commits: `<prefix>: <imperative summary>`; commit only when asked.
