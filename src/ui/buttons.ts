import Phaser from 'phaser'
import { COLORS, FONTS } from '../config'

export interface TextButtonOptions {
  label: string
  onClick: () => void
  width?: number
  height?: number
  fill?: string
  fontColor?: string
  fontSize?: number
}

/**
 * Flat, chunky button matching the original UI palette.
 * Returns a container so callers can position/scale it freely.
 */
export function createTextButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  options: TextButtonOptions,
): Phaser.GameObjects.Container {
  const width = options.width ?? 220
  const height = options.height ?? 56
  const fill = options.fill ?? COLORS.accent

  const container = scene.add.container(x, y)

  const background = scene.add
    .rectangle(0, 0, width, height, Phaser.Display.Color.HexStringToColor(fill).color)
    .setStrokeStyle(3, 0x22262f, 0.35)

  const label = scene.add
    .text(0, -2, options.label, {
      fontFamily: FONTS.title,
      fontSize: `${options.fontSize ?? 28}px`,
      color: options.fontColor ?? COLORS.ink,
    })
    .setOrigin(0.5)

  container.add([background, label])

  background.setInteractive({ useHandCursor: true })
  background.on('pointerover', () => container.setScale(1.05))
  background.on('pointerout', () => container.setScale(1))
  background.on('pointerdown', () => container.setScale(0.96))
  background.on('pointerup', () => {
    container.setScale(1.05)
    options.onClick()
  })

  return container
}
