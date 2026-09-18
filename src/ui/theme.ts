import { GAME_WIDTH } from '../config'

/**
 * Shared UI tokens. Menus are all authored in the 1920x1080 design space, so
 * without a shared scale every screen drifts to its own heading sizes, button
 * heights and edge insets. These tokens are the single source for that: pick a
 * `TYPE` size instead of a magic px value, place titles on `FRAME.titleY` and
 * action rows on `FRAME.actionY`, and the screens line up.
 */

/** Type scale, in design px. */
export const TYPE = {
  /** Hero wordmark, Start screen only. */
  display: 160,
  /** Screen title. */
  title: 100,
  /** Tagline / lead line. */
  heading: 56,
  /** Messages, stat rows and step captions. */
  body: 44,
  /** Small labels such as the tutorial step numbers. */
  caption: 34,
  /** Text inside a button. */
  button: 52,
  /** HUD counter digits. */
  hudNumber: 34,
  /** HUD speech bubble. */
  hudBubble: 26,
  /** On-screen touch control labels. */
  touchLabel: 24,
} as const

/** Vertical frame shared by the menu scenes. */
export const FRAME = {
  /** Centre of the screen title. */
  titleY: 120,
  /** Centre of the bottom action row. */
  actionY: 900,
  /** Centre of the content between the title and the actions. */
  contentY: 510,
  /**
   * Height of the title-to-action band. `createMenuFrame` fits every menu to
   * this instead of to its own content bounds, so the UI renders at the same
   * scale on every screen rather than each screen zooming differently.
   */
  band: 872,
} as const

/** Shared button geometry. */
export const BUTTON = {
  height: 84,
  radius: 12,
  /** Full-width call to action. */
  primaryWidth: GAME_WIDTH / 3,
  /** Smaller paired action. */
  secondaryWidth: GAME_WIDTH / 4,
  /** Gap between two paired buttons. */
  gap: 40,
} as const
