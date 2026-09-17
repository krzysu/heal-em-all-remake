import type Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from '../config'

/**
 * Menu helpers.
 *
 * Scenes are authored in the fixed 1920x1080 design space and the ScaleManager
 * (`Phaser.Scale.FIT`) handles fitting that into the window, so there is no
 * percentage math, no resize listener and no camera zoom here. A scene lays its
 * contents out once in `create`.
 */

/**
 * Full-bleed graveyard backdrop. The original set this via CSS
 * `background: url(bg.gif) center center no-repeat; background-size: cover`, so
 * scale it up uniformly until both axes are covered and centre the overflow.
 * A non-uniform `setDisplaySize` would squash the 2048x2048 art out of shape.
 */
export function addMenuBackdrop(scene: Phaser.Scene): Phaser.GameObjects.Image {
  const source = scene.textures.get('bg').getSourceImage()
  const scale = Math.max(GAME_WIDTH / source.width, GAME_HEIGHT / source.height)
  return scene.add
    .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg')
    .setScale(scale)
    .setDepth(-100)
}

/**
 * Render size of the game canvas in engine pixels. With `Scale.FIT` this is the
 * design space, not the window; scenes use it for full-bleed HUD backgrounds.
 */
export function screenSize(scene: Phaser.Scene): { width: number; height: number } {
  return { width: scene.scale.width, height: scene.scale.height }
}
