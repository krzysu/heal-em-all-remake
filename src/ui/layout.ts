import Phaser from 'phaser'
import { GAME_WIDTH } from '../config'
import { FRAME } from './theme'

/**
 * Menu layout helpers for the adaptive (`Scale.EXPAND`) canvas.
 *
 * Menus are still authored around the 1920x1080 design space, but the live
 * canvas can be wider (wide monitors) or taller (16:10 laptops) than that. A
 * menu frame collects everything into a container, then zooms and centres the
 * camera so the content fills as much of the window as it can without clipping,
 * which also makes the UI larger than the old fixed layout.
 */

/**
 * How much to enlarge the UI beyond its authoring size. Grows with the viewport
 * height (taller windows get bigger UI) and is clamped so text never becomes
 * comically large. `createMenuFrame` lowers it further if content would clip.
 */
export function uiScale(scene: Phaser.Scene): number {
  return Phaser.Math.Clamp(scene.scale.height / 864, 1.15, 1.4)
}

/**
 * Full-bleed graveyard backdrop. The original set this via CSS
 * `background: url(bg.gif) center center no-repeat; background-size: cover`, so
 * scale it up uniformly until it covers the visible area and centre it. The menu
 * camera is static (it is centred on the content), so this is a normal image
 * placed at the content centre rather than a scroll-factor-0 one.
 */
function addMenuBackdrop(scene: Phaser.Scene): Phaser.GameObjects.Image {
  return scene.add.image(0, 0, 'bg').setDepth(-100).setOrigin(0.5)
}

export interface MenuFrame {
  /** Add the scene's menu objects to this container in 1920x1080 design coords. */
  root: Phaser.GameObjects.Container
  /** Re-fits the camera to the content; call once after adding the content. */
  fit: () => void
}

export interface MenuFrameOptions {
  /**
   * Full-bleed graveyard backdrop. Off for screens drawn before the `bg` texture
   * has loaded (the loading screen), which fall back to the camera colour.
   */
  backdrop?: boolean
}

/**
 * Creates the container and backdrop for a menu scene and returns a `fit`
 * callback. `fit` zooms the camera to make the shared title-to-action band fill
 * the window (capped by `uiScale`) and re-centres it, then keeps the backdrop
 * covering the view. It is also installed as the scene's RESIZE handler, so
 * call it once after populating `root`.
 */
export function createMenuFrame(scene: Phaser.Scene, options: MenuFrameOptions = {}): MenuFrame {
  const root = scene.add.container(0, 0)
  const backdrop = (options.backdrop ?? true) ? addMenuBackdrop(scene) : undefined

  const fit = (): void => {
    if (root.length === 0) return

    const width = scene.scale.width
    const height = scene.scale.height
    const bounds = root.getBounds()
    // Breathing room between the fitted band and the window edge. Applied to
    // both axes, so titles and action buttons always keep this inset.
    const margin = 80

    // Fit to the shared title-to-action band rather than to this screen's own
    // bounds, so a short screen (Game Over) does not zoom in more than a tall
    // one (level select) and every menu renders at the same scale. Width still
    // uses the real bounds so a narrow window cannot clip wide content.
    const fitScale = Math.min(
      (width - margin * 2) / Math.max(bounds.width, 1),
      (height - margin * 2) / FRAME.band,
    )
    const zoom = Phaser.Math.Clamp(Math.min(uiScale(scene), fitScale), 0.6, 1.4)

    // Centre horizontally on the design space, not on the content bounds: a
    // screen with an off-centre detail (the audio icon beside the level grid)
    // would otherwise drag the whole layout sideways, leaving the title off
    // centre. Vertically the content bounds are still the anchor.
    const centerX = GAME_WIDTH / 2
    const centerY = bounds.centerY

    const camera = scene.cameras.main
    camera.setZoom(zoom)
    camera.centerOn(centerX, centerY)

    // The camera looks at the content centre, so a backdrop centred there and
    // sized to the zoomed view covers the whole window.
    if (backdrop) {
      const source = scene.textures.get('bg').getSourceImage()
      const cover = Math.max(width / zoom / source.width, height / zoom / source.height)
      backdrop.setPosition(centerX, centerY).setScale(cover)
    }
  }

  scene.scale.on(Phaser.Scale.Events.RESIZE, fit)
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, fit)
  })

  return { root, fit }
}
