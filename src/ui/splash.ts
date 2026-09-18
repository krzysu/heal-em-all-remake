import type Phaser from 'phaser'
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH } from '../config'
import { TYPE } from './theme'

/**
 * Title-screen composition shared by the loading screen and the Start menu.
 *
 * Both screens use the same design-space coordinates and text objects, so the
 * hero heading is pixel-identical across the hand-off: nothing shifts or
 * resizes when loading finishes and the Continue button appears.
 */
export const SPLASH = {
  titleY: GAME_HEIGHT / 2 - 250,
  taglineY: GAME_HEIGHT / 2 - 110,
  actionY: GAME_HEIGHT / 2 + 60,
} as const

/** Adds the wordmark and tagline to a menu frame's root container. */
export function addSplashHeading(scene: Phaser.Scene, root: Phaser.GameObjects.Container): void {
  root.add(
    scene.add
      .text(GAME_WIDTH / 2, SPLASH.titleY, "Heal'em All", {
        fontFamily: FONTS.title,
        fontSize: `${TYPE.display}px`,
        color: COLORS.title,
      })
      .setOrigin(0.5),
  )

  root.add(
    scene.add
      .text(GAME_WIDTH / 2, SPLASH.taglineY, "There's a cure for zombies", {
        fontFamily: FONTS.title,
        fontSize: `${TYPE.heading}px`,
        color: COLORS.danger,
      })
      .setOrigin(0.5),
  )
}
