import Phaser from 'phaser'
import { COLORS, FONTS } from '../config'

export interface TextButtonOptions {
  label: string
  onClick: () => void
  width: number
  height: number
  fill?: string
  fontColor?: string
  fontSize?: number
}

/**
 * Flat rounded button matching the original UI buttons: solid fill, 10px corner
 * radius and a 58px Jolly Lodger label in the dark ink colour.
 *
 * Returns the container so callers can position or restyle it. Scenes lay out
 * once against the fixed design space, so there is no resize path.
 */
const RADIUS = 10

export function createTextButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  options: TextButtonOptions,
): Phaser.GameObjects.Container {
  const fill = options.fill ?? COLORS.accent
  const container = scene.add.container(x, y)

  const background = scene.add.graphics()
  background.fillStyle(Phaser.Display.Color.HexStringToColor(fill).color, 1)
  background.fillRoundedRect(
    -options.width / 2,
    -options.height / 2,
    options.width,
    options.height,
    RADIUS,
  )

  const label = scene.add
    .text(0, 0, options.label, {
      fontFamily: FONTS.title,
      fontSize: `${options.fontSize ?? 58}px`,
      color: options.fontColor ?? COLORS.ink,
    })
    .setOrigin(0.5)

  container.add([background, label])

  container.setInteractive(
    new Phaser.Geom.Rectangle(
      -options.width / 2,
      -options.height / 2,
      options.width,
      options.height,
    ),
    Phaser.Geom.Rectangle.Contains,
  )
  if (container.input) container.input.cursor = 'pointer'

  container.on('pointerover', () => container.setScale(1.04))
  container.on('pointerout', () => container.setScale(1))
  container.on('pointerdown', () => container.setScale(0.97))
  container.on('pointerup', () => {
    container.setScale(1.04)
    options.onClick()
  })

  return container
}
