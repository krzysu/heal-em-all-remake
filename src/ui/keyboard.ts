import type Phaser from 'phaser'

/**
 * Shared keyboard navigation for every screen.
 *
 * Menu scenes only need `confirm` and `back`; the game scene reuses the same
 * helper for `back`, `pause` and `mute` while owning its own movement bindings.
 * Handlers fire on `keydown` rather than `JustDown`, because a keyup between two
 * frames clears JustDown and silently drops the press.
 */
export interface ScreenKeys {
  /** Enter / Space, the primary "continue" action. */
  confirm?: () => void
  /** Escape, "go back". */
  back?: () => void
  /** P, in-game pause toggle. */
  pause?: () => void
  /** M, global mute toggle. */
  mute?: () => void
}

export function bindScreenKeys(scene: Phaser.Scene, keys: ScreenKeys): void {
  const keyboard = scene.input.keyboard
  if (!keyboard) return

  if (keys.confirm) {
    keyboard.on('keydown-ENTER', keys.confirm)
    keyboard.on('keydown-SPACE', keys.confirm)
  }
  if (keys.back) keyboard.on('keydown-ESC', keys.back)
  if (keys.pause) keyboard.on('keydown-P', keys.pause)
  if (keys.mute) keyboard.on('keydown-M', keys.mute)
}
