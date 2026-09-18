# Heal'em All (remake)

Phaser 4 + TypeScript + Vite remaster of the 2013 HTML5 game. `PLAN.md` has the migration phases, design pillars and the `src/` map; read it before changing gameplay. Assets and level data are the original files, carried over untouched.

## Commands

| Command | Notes |
| --- | --- |
| `pnpm check` | Everything below, in order. Run before calling a change done. |
| `pnpm dev` | Vite on `http://localhost:8080` (`strictPort`, auto-opens a browser) |
| `pnpm typecheck` | `tsc --noEmit` — the only source of type safety (see oxlint note) |
| `pnpm lint` / `pnpm lint:fix` | `oxlint`; `pnpm lint --deny-warnings` is what CI enforces |
| `pnpm format` / `pnpm format:check` | Prettier; no semicolons, single quotes, 100 cols |
| `pnpm test` | Vitest, co-located `src/**/*.test.ts`, jsdom |
| `pnpm test src/state/GameState.test.ts` | Single file. A `--` before the path is swallowed and runs everything. |
| `pnpm knip` | Unused files/exports/deps; currently clean, keep it that way |
| `pnpm build` | `tsc --noEmit && vite build` |

### Why oxlint, not ESLint

TypeScript 7 is the native compiler: its package has no `lib/typescript.js`, so there is no programmatic JS API. `typescript-eslint` hard-fails on TS >= 7 and Biome-style tools are the practical alternative, so lint is `oxlint` (own TS parser) and all type enforcement comes from `tsc --strict`. Don't try to add type-aware lint rules — they cannot work here.

## Architecture facts that aren't obvious from filenames

- **Levels stay as TMX.** `public/assets/data/level*.tmx` (70px tiles) are the originals; `src/levels/tmx.ts` parses the XML at runtime from the `level{n}` text cache. Phaser cannot load `.tmx`, and resaving to Tiled JSON is rejected by design. Tileset `firstgid=1`, so gid 0 becomes tile index `-1`.
- **Spawn tables live in `src/levels/levels.ts`.** Levels 1-2 hardcoded their entities in the original scene scripts and keep explicit tables; levels 3-6 read TMX object groups; level 5 ignores the map's Key/Door/Health objects and picks one of four mirrored layouts at random. Level 3's original two-way key/door random is _not_ ported yet.
- **Art atlases are hand-authored legacy JSON**, converted at runtime by `src/assets/legacyAtlas.ts` into frames named `"<name>:<index>"`. Never edit `public/assets` (also excluded from Prettier and oxlint).
- **Rendering is adaptive (`Scale.EXPAND`), not letterboxed.** `GAME_WIDTH`/ `GAME_HEIGHT` (1920x1080) is the _authoring_ base; EXPAND grows the canvas on whichever axis has spare room so the window is always filled: a wide monitor sees more world horizontally, a 16:10 laptop more vertically. The canvas stays 1 design px = 1 canvas px (unlike FIT's downscale), so text is crisp. Scenes must read the live `scale.width`/`scale.height` and re-layout on `Phaser.Scale.Events.RESIZE`; do not assume 1920x1080.
- **World zoom is fixed; UI is scaled up.** `WORLD_ZOOM` (`GAME_HEIGHT / 640`, ~1.69) is the level camera zoom. `uiScale(scene)` in `src/ui/layout.ts` grows the UI with the viewport height (clamped), and `HudScene` zooms its camera by `WORLD_ZOOM * uiScale` so counters, text and touch controls are larger than the world. The HUD anchors to the top-left with `setOrigin(0, 0)` + `setScroll(0, 0)` and measures itself with `scale.width / this.zoom`.
- **Menus go through `createMenuFrame`.** Menu scenes add their objects to the returned container in 1920x1080 coords, call `fit()`, and the helper centres the camera horizontally on the design centre and vertically on the content, then zooms to fill the window (capped by `uiScale`), re-fitting on resize. The vertical fit uses the shared `FRAME.band`, not this screen's own content bounds, so a short screen (Game Over) does not render larger than a tall one (level select), and an off-centre detail (the level-select audio icon) cannot drag the title off centre. A static menu camera also means the full-bleed backdrop is a normal image at the content centre, not a scroll-factor-0 one.
- **UI tokens live in `src/ui/theme.ts`.** `TYPE` is the only type scale (title, body, caption, button, HUD, touch), `FRAME` fixes the title/action/content rows every menu shares, and `BUTTON` holds the button geometry. Use a token instead of a magic px size; `addButtonFeedback` in `src/ui/buttons.ts` gives every clickable (text buttons, level tombstones, HUD and audio icons) the same hover/press tween, so do not hand-roll pointer handlers.
- **Browser Back is wired to the menu hierarchy.** Route every transition through `navigate` in `src/ui/navigation.ts` (never call `scene.start` for a screen change). It mirrors the move into the History API: deeper screens push, sideways moves replace, and upward moves call `history.back()` so the browser button/gesture, Esc and the on-screen Back all unwind identically. Results screens replace the level that spawned them, so Back never steps into a finished run; Boot/Preload are not routed.
- **The loading screen shares `src/ui/splash.ts` with the title screen.** Both add the identical heading on the same `createMenuFrame` frame (Preload without a backdrop, since `bg` is not loaded yet) and put their action in `SPLASH.actionY`, so nothing moves or resizes as Preload hands off to Start.
- **Gotcha: scroll-factor-0 objects under a zoomed camera.** The screen mapping is `pivot + (pos - pivot) * zoom` with `pivot = (scale.width/2, scale.height/2)`, so a 0-scroll full-view background must be positioned at `scale.width/2`, `scale.height/2` (screen centre) and sized `scale.width/zoom x scale.height/zoom`. Positioning it at `scale.width/(2*zoom)` leaves a bare strip on the right. This is why the level backdrop (`GameScene.syncBackdrop`) and the touch-control hit-testing both use the screen-centre convention.
- **Controls follow the original Quintus bindings**: up arrow / X (`action`) and W jump; space / Z (`fire`) shoot; arrows or A/D move. Space deliberately does **not** count as held-jump, or firing would siphon jump height.
- **Touch is a parallel input, not a replacement.** `src/ui/touchControls.ts` lives in `HudScene` (that camera is origin 0,0 with the HUD zoom, so hit-testing is `pointer / zoom`) and writes to the shared `touchInput` singleton in `src/ui/touchInput.ts`; `GameScene` polls it alongside the keyboard. Controls show only for `(pointer: coarse)`, force-testable with `?touch=1`. The touch plugin is enabled unconditionally in the game config, and `activePointers` is raised so move + jump + fire can be held together. A portrait gate (`src/ui/orientation.ts`) sleeps the loop and pauses audio; it hooks `POST_STEP`, not `READY`, because the loop is not running at `READY`.
- **Every screen has keyboard navigation** via `bindScreenKeys` in `src/ui/keyboard.ts`: Enter/Space confirm, Esc back, and P pause / M mute while in a level (P and M are bound on `HudScene`, which owns the pause overlay and the audio button). Space is deliberately not a confirm in `GameScene` because it fires the gun. Handlers listen on `keydown`, never `JustDown`.
- **Doctor hints persist, and the HUD has a mute button.** `HudScene.onInfo` only swaps the speech bubble text; it never auto-fades (the original's `InfoLabel` only changed on an explicit event), so a line stays until the next one. The HUD's right-edge icon stack is pause / back / audio, the audio icon drawing at native scale rather than the menu's enlarged one.
- **The build is an installable PWA.** `public/manifest.webmanifest` requests `display: fullscreen` and `orientation: landscape`; icons under `public/icons/` are derived from the original game's `app/icons/` art; iOS uses the `apple-*` meta tags plus `apple-touch-icon`. `public/sw.js` is registered from `main.ts` only under `import.meta.env.PROD` (never in dev/HMR) and is listed in `knip.json` because it is referenced by URL, not imported. Its cache name is versioned from `package.json`: `main.ts` registers `sw.js?v=__APP_VERSION__` (injected by `vite.config.ts`), so a release installs a new worker and the activate handler drops the old cache.
- **Fonts are self-hosted and awaited before the first scene.** `public/fonts/*.woff2` (Boogaloo, Jolly Lodger) are preloaded in `index.html` and declared with `font-display: block`; `BootScene.create` awaits `whenFontsReady()` (`src/ui/fonts.ts`) so Phaser never rasterises text with a fallback face. Keep them off Google Fonts, so the service worker can cache them for offline play.
- **The HUD gradient is drawn, not tiled.** The original overlaid a 124px `gradient-top.png`; that is a plain vertical alpha ramp, so `HudScene.drawGradient` renders it with `Graphics.fillGradientStyle` (dark `#14161a`, alpha 0.71 -> 0). No texture is loaded for it.
- **State is split on purpose**: `src/state/store.ts` is Phaser-free and unit tested; `src/state/GameState.ts` re-exports it and owns the Phaser event bus. Put new persistent/run logic in `store.ts`.
- **Save compatibility**: the original localStorage keys are reused (`zombieGame:availableLevel`, `zombieGame:levelProgress:<n>`), plus `zombieGame:muted`.
- **`pixelArt`/`roundPixels` are off**: the art is vector-ish and the UI is web fonts, so nearest-neighbour sampling looked harsher than the source rather than sharper.

## Verifying gameplay in a browser

Playwright MCP is configured in the root `opencode.json`; screenshots and console logs land in `.playwright-mcp/` (gitignored). Dev builds expose `window.game` (stripped from production), so scenes can be driven headlessly:

```js
window.game.scene.stop('Start')
window.game.scene.start('Game', { level: 1 })
```

`scene.launch` is queued to the next frame, so after starting `Game` wait for `window.game.scene.getScene('Hud').bubbleText` before reading HUD state — `GameScene.create` also delays its intro `info` emit for the same reason.

Keyboard handlers can be driven without real key events by emitting on the scene's own keyboard plugin, e.g. `scene.input.keyboard.emit('keydown-P')` to toggle pause from `HudScene`. Pause, mute and Esc all read back via `game.scene.isPaused('Game')`, `game.sound.mute` and `game.scene.isActive(...)`.

## Porting gotchas

- Read the original CoffeeScript before guessing at behaviour: `../game-heal-em-all` (`app/scripts/game/scenes/level*.coffee`, `sprites/**`). It is a local checkout, not a dependency.
- Do not re-port the original physics numbers; the remaster deliberately retunes them (see the design pillars in `PLAN.md`).
- Reset `physics.world.timeScale` in `create()`, never in a SHUTDOWN handler — the world is already gone by then.
- Falling out of the map only works because the world bounds' bottom edge is non-colliding; respawn and exiting Zombie Mode depend on it.
- `Phaser.Input.Keyboard.JustDown` is cleared by keyup, dropping presses between frames: gameplay presses are queued from `keydown-*` in `GameScene.bindInput`.
- A scroll-factor-0 object is still affected by camera zoom, so the level backdrop is sized in world units (`scale.width / zoom`) and centred on the camera, not sized to the design space. Sizing it to `scale.width/height` left most of the view showing the flat camera background colour.
- `exactOptionalPropertyTypes` is on: anything assignable to `undefined` needs an explicit `| undefined` on the optional property.

## Conventions

- No comments unless they explain _why_; ASCII only.
- One-line commits: `<prefix>: <imperative summary>`; commit only when asked.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:opencode -->

## Issue Tracking with bd (beads)

This project uses **bd** for ALL issue tracking - no markdown TODOs, no external trackers. Issues live in a local Dolt DB; cross-machine sync uses `bd dolt push/pull` (stored under `refs/dolt/data` on the git remote); `.beads/issues.jsonl` is a passive export, not the wire protocol.

```bash
bd prime                              # Full workflow context (source of truth)
bd ready                              # Issues ready to work (no blockers)
bd create "title" -t task -p 2        # Create a new issue
bd update <id> --claim                # Claim work atomically
bd close <id>                         # Mark complete
bd dolt push                          # Sync with remote when authorized
```

<!-- END BEADS INTEGRATION -->
