/**
 * Shared touch-control state.
 *
 * The on-screen controls live in `HudScene` (its camera is anchored at 0,0 with
 * a known zoom, so hit-testing is simple), but `GameScene` owns the player. Held
 * directions have to be polled every frame, so this is a plain mutable singleton
 * rather than an event: `HudScene` writes it, `GameScene` reads it and merges it
 * with the keyboard.
 */
export interface TouchState {
  left: boolean
  right: boolean
  jumpHeld: boolean
  fireHeld: boolean
  /** Edge-triggered jump, consumed by `GameScene` like the keyboard queue. */
  jumpQueued: boolean
}

export const touchInput: TouchState = {
  left: false,
  right: false,
  jumpHeld: false,
  fireHeld: false,
  jumpQueued: false,
}

export function resetTouchInput(): void {
  touchInput.left = false
  touchInput.right = false
  touchInput.jumpHeld = false
  touchInput.fireHeld = false
  touchInput.jumpQueued = false
}

/**
 * Touch controls are shown when the primary pointer is coarse (phones, tablets,
 * most consoles). A `?touch=1` / `?touch=0` query overrides it so the overlays
 * can be smoke-tested on a desktop browser.
 */
export function isTouchDevice(): boolean {
  const forced = new URLSearchParams(window.location.search).get('touch')
  if (forced === '1') return true
  if (forced === '0') return false

  return window.matchMedia('(pointer: coarse)').matches
}
