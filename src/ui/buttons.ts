import Phaser from 'phaser'
import { COLORS, FONTS } from '../config'
import { BUTTON, TYPE } from './theme'

export interface TextButtonOptions {
  label: string
  onClick: () => void
  width: number
  height?: number
  fill?: string
  fontColor?: string
  fontSize?: number
}

/** Hover / press feedback shared by every clickable element. */
const HOVER_SCALE = 1.05
const PRESS_SCALE = 0.96
const FEEDBACK_MS = 90

interface FeedbackOptions {
  onClick?: () => void
  /**
   * The interactive object, when it differs from the object being scaled. A
   * level tombstone, for example, scales its container but owns input on the
   * image inside it.
   */
  source?: Phaser.GameObjects.GameObject
}

/**
 * Applies the same hover / press tween to any clickable target, so buttons,
 * tombstones and icon buttons all react identically instead of each scene
 * rolling its own (or none at all).
 */
export function addButtonFeedback(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Image | Phaser.GameObjects.Container | Phaser.GameObjects.Text,
  options: FeedbackOptions = {},
): void {
  const base = target.scale
  const emitter = options.source ?? target

  const scaleTo = (factor: number): void => {
    scene.tweens.killTweensOf(target)
    scene.tweens.add({
      targets: target,
      scale: base * factor,
      duration: FEEDBACK_MS,
      ease: 'Quad.easeOut',
    })
  }

  emitter.on('pointerover', () => scaleTo(HOVER_SCALE))
  emitter.on('pointerout', () => scaleTo(1))
  emitter.on('pointerdown', () => scaleTo(PRESS_SCALE))
  emitter.on('pointerup', () => {
    scaleTo(HOVER_SCALE)
    options.onClick?.()
  })
}

/**
 * Flat rounded button matching the original UI buttons: solid fill, rounded
 * corners and a Jolly Lodger label. Geometry comes from the shared theme so
 * every button on every screen is the same size.
 */
export function createTextButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  options: TextButtonOptions,
): Phaser.GameObjects.Container {
  const height = options.height ?? BUTTON.height
  const fill = options.fill ?? COLORS.accent
  const container = scene.add.container(x, y)

  const background = scene.add.graphics()
  background.fillStyle(Phaser.Display.Color.HexStringToColor(fill).color, 1)
  background.fillRoundedRect(-options.width / 2, -height / 2, options.width, height, BUTTON.radius)

  const label = scene.add
    .text(0, 0, options.label, {
      fontFamily: FONTS.title,
      fontSize: `${options.fontSize ?? TYPE.button}px`,
      color: options.fontColor ?? COLORS.ink,
    })
    .setOrigin(0.5)

  container.add([background, label])

  container.setInteractive(
    new Phaser.Geom.Rectangle(-options.width / 2, -height / 2, options.width, height),
    Phaser.Geom.Rectangle.Contains,
  )
  if (container.input) container.input.cursor = 'pointer'

  addButtonFeedback(scene, container, { onClick: options.onClick })

  return container
}
