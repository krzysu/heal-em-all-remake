import Phaser from 'phaser'
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config'

/** Current viewport in screen pixels. The game runs in RESIZE mode. */
export function screenSize(scene: Phaser.Scene): { width: number; height: number } {
  return { width: scene.scale.width, height: scene.scale.height }
}

/**
 * Menu scenes are authored in the 640x320 design space. Zooming the camera by
 * the design-to-window ratio keeps every hardcoded coordinate valid while the
 * scene still covers the whole window, matching the old FIT look.
 *
 * Returns the size of the visible area in design coordinates, which is what a
 * full-bleed background has to cover.
 */
function fitDesignCamera(scene: Phaser.Scene): { width: number; height: number } {
  const { width, height } = screenSize(scene)
  const zoom = Math.max(1, Math.min(width / GAME_WIDTH, height / GAME_HEIGHT))

  scene.cameras.main.setZoom(zoom)
  scene.cameras.main.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2)

  return { width: width / zoom, height: height / zoom }
}

/**
 * Full-bleed blurred background plus the dark wash the menus sit on. Rebuilt on
 * resize by restarting the scene, which is cheap for scenes with no run state.
 */
export function addMenuBackdrop(scene: Phaser.Scene, overlayAlpha: number): void {
  const size = fitDesignCamera(scene)

  scene.add.tileSprite(0, 0, size.width, size.height, 'background').setOrigin(0).setAlpha(0.4)
  scene.add
    .rectangle(
      0,
      0,
      size.width,
      size.height,
      Phaser.Display.Color.HexStringToColor(COLORS.panel).color,
      overlayAlpha,
    )
    .setOrigin(0)

  const onResize = (): void => {
    scene.scene.restart()
  }
  scene.scale.on(Phaser.Scale.Events.RESIZE, onResize)
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, onResize)
  })
}
