import type Phaser from 'phaser'

/**
 * Browser back/forward integration.
 *
 * Every in-game transition goes through `navigate`, which mirrors it into the
 * History API: going deeper pushes an entry, moving sideways replaces the
 * current one, and going back calls `history.back()` so the browser button /
 * gesture, the Escape key and the on-screen Back button all do the same thing.
 * `Boot` and `Preload` are infrastructure, not screens, so they are not routed.
 *
 * Screens are ranked by depth and the history is kept to one entry per depth:
 * entering a level pushes, while results screens replace the level that spawned
 * them, so Back always unwinds one level of the menu hierarchy rather than
 * stepping back into a finished run.
 */
const DEPTH: Record<string, number> = {
  Start: 0,
  LevelSelect: 1,
  Controls: 2,
  Game: 2,
  LevelSummary: 2,
  GameOver: 2,
  End: 2,
}

interface NavState {
  scene: string
  data?: Record<string, unknown>
}

let game: Phaser.Game | undefined
let current: string | undefined

function startScene(target: string, data?: Record<string, unknown>): void {
  if (!game) return
  if (current && current !== target) game.scene.stop(current)
  game.scene.start(target, data)
  current = target
}

/** Hooks `popstate`; call once right after the game is created. */
export function installBrowserNavigation(instance: Phaser.Game): void {
  game = instance
  window.addEventListener('popstate', (event) => {
    const state = event.state as NavState | null
    if (!state || typeof state.scene !== 'string') return
    startScene(state.scene, state.data)
  })
}

/**
 * Starts `target` from `scene`, recording the move so browser Back matches. The
 * caller scene is stopped by Phaser's own `scene.start`, exactly as before.
 */
export function navigate(
  scene: Phaser.Scene,
  target: string,
  data?: Record<string, unknown>,
): void {
  const from = DEPTH[scene.scene.key]
  const to = DEPTH[target] ?? 0
  const state: NavState = data ? { scene: target, data } : { scene: target }

  if (from === undefined) {
    // First navigable screen (handing off from Preload): seed the base entry.
    window.history.replaceState(state, '')
    scene.scene.start(target, data)
    current = target
    return
  }

  if (to < from) {
    // Unwind through the browser so the stack stays truthful; `popstate` starts
    // the scene, which keeps browser Back and the in-game Back identical.
    window.history.go(to - from)
    return
  }

  if (to > from) window.history.pushState(state, '')
  else window.history.replaceState(state, '')

  scene.scene.start(target, data)
  current = target
}
