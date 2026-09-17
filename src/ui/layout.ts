import Phaser from 'phaser'

/**
 * Menu layout helpers.
 *
 * The original menu scenes never used a design resolution: Quintus set `Q.width`
 * and `Q.height` to the live window size and every scene did its arithmetic in
 * percentages of those (`Q.width * 0.24`, `Q.height * 0.22`, ...). Because the x
 * and y factors are applied independently, the layout adapts to any aspect
 * ratio instead of being scaled uniformly by one zoom factor.
 *
 * The remaster keeps that model: menus lay themselves out in real screen pixels
 * and re-run the same layout function on RESIZE. Nothing here applies a camera
 * zoom, which is what made the old version stretch its grid.
 */

/** Live viewport size in screen pixels, the equivalent of `Q.width`/`Q.height`. */
export function screenSize(scene: Phaser.Scene): { width: number; height: number } {
  return { width: scene.scale.width, height: scene.scale.height }
}

/**
 * Font sizes in the original were literal pixels against the live window: a 60px
 * Jolly Lodger heading stayed 60px whether the window was 1080 or 1440 tall, so
 * on larger displays text simply occupied a smaller share of the screen. The
 * remaster had been multiplying sizes by the height ratio, which blew headings
 * up to ~200px. Menus therefore use literal sizes too, matching the original.
 */
export function fontScale(_scene: Phaser.Scene): number {
  return 1
}

/**
 * Full-bleed unblurred graveyard backdrop. `bg.gif` is the original page
 * background (`#quintus_container` used it with `background-size: cover`), so it
 * is snapped to the largest integer scale that still covers the viewport; that
 * avoids resampling seams that a fractional `background-size: cover` would show.
 */
export function addMenuBackdrop(scene: Phaser.Scene): Phaser.GameObjects.Image {
  const image = scene.add.image(0, 0, 'bg').setOrigin(0)

  const fit = (): void => {
    const w = scene.scale.width
    const h = scene.scale.height
    const scale = Math.max(w / image.width, h / image.height)
    image.setPosition(0, 0).setScale(scale)
    image.setCrop(0, 0, w / scale, h / scale)
  }

  fit()
  image.setDepth(-100)

  const onResize = (): void => fit()
  scene.scale.on(Phaser.Scale.Events.RESIZE, onResize)
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, onResize)
  })

  return image
}

/**
 * Runs `layout` immediately and again on every resize, unsubscribing on
 * shutdown. This is how a scene keeps percentage positions valid while the
 * window changes, without restarting itself.
 */
export function onLayout(scene: Phaser.Scene, layout: () => void): void {
  layout()

  const onResize = (): void => layout()
  scene.scale.on(Phaser.Scale.Events.RESIZE, onResize)
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, onResize)
  })
}
