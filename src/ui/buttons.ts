import Phaser from 'phaser'
import { COLORS, FONTS } from '../config'

export interface TextButtonOptions {
  label: string
  onClick: () => void
  width: number
  height: number
  fill?: string
  fontColor?: string
  /** Design-space font size; scaled against viewport height like the original. */
  fontSize?: number
}

/**
 * Flat rounded button matching the original UI buttons: solid fill, 10px radius,
 * 58px Jolly Lodger label in the dark ink colour.
 *
 * The original used real DOM-ish Quintus sprites, so the corner radius stayed
 * 10 device pixels at every window size. Reproducing that with a Graphics-drawn
 * texture keeps the corners identical however large the button gets.
 */
export interface TextButton {
  container: Phaser.GameObjects.Container
  label: Phaser.GameObjects.Text
  /** Re-applies size/position after a resize. */
  layout: (x: number, y: number, width: number, height: number, fontSize: number) => void
}

const RADIUS = 10

export function createTextButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  options: TextButtonOptions,
): TextButton {
  const fill = options.fill ?? COLORS.accent
  const container = scene.add.container(x, y)

  const background = scene.add.graphics()
  const label = scene.add
    .text(0, 0, options.label, {
      fontFamily: FONTS.title,
      fontSize: `${options.fontSize ?? 58}px`,
      color: options.fontColor ?? COLORS.ink,
    })
    .setOrigin(0.5)

  const paint = (width: number, height: number): void => {
    background.clear()
    background.fillStyle(Phaser.Display.Color.HexStringToColor(fill).color, 1)
    background.fillRoundedRect(-width / 2, -height / 2, width, height, RADIUS)
  }
  paint(options.width, options.height)

  container.add([background, label])

  const hit = new Phaser.Geom.Rectangle(
    -options.width / 2,
    -options.height / 2,
    options.width,
    options.height,
  )
  container.setInteractive(hit, Phaser.Geom.Rectangle.Contains)
  if (container.input) container.input.cursor = 'pointer'

  const setPressedScale = (scale: number): void => {
    container.setScale(scale)
  }
  container.on('pointerover', () => setPressedScale(1.04))
  container.on('pointerout', () => setPressedScale(1))
  container.on('pointerdown', () => setPressedScale(0.97))
  container.on('pointerup', () => {
    setPressedScale(1.04)
    options.onClick()
  })

  return {
    container,
    label,
    layout: (nextX, nextY, width, height, fontSize) => {
      container.setPosition(nextX, nextY)
      label.setFontSize(fontSize)
      paint(width, height)
      const nextHit = new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height)
      container.input?.hitArea.setTo(nextHit.x, nextHit.y, nextHit.width, nextHit.height)
    },
  }
}
