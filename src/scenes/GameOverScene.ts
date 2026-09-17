import Phaser from 'phaser'
import { COLORS, FONTS } from '../config'
import { addMenuBackdrop, fontScale, onLayout } from '../ui/layout'
import { createTextButton } from '../ui/buttons'

/**
 * Port of `game_over.coffee`. Title at a quarter-height margin, message at the
 * window centre, button at `height - marginY/2` and a third of the width.
 */
export class GameOverScene extends Phaser.Scene {
  private title!: Phaser.GameObjects.Text
  private message!: Phaser.GameObjects.Text
  private button!: ReturnType<typeof createTextButton>

  constructor() {
    super('GameOver')
  }

  create(): void {
    addMenuBackdrop(this)

    this.title = this.add
      .text(0, 0, 'Game Over', {
        fontFamily: FONTS.title,
        fontSize: '100px',
        color: COLORS.title,
      })
      .setOrigin(0.5)

    this.message = this.add
      .text(0, 0, 'Looks like these zombies cannot hope for your help :/\nBe better next time!', {
        fontFamily: FONTS.body,
        fontSize: '36px',
        color: COLORS.accent,
        align: 'center',
      })
      .setOrigin(0.5)

    this.button = createTextButton(this, 0, 0, {
      label: 'All levels',
      width: 200,
      height: 70,
      fill: COLORS.accent,
      onClick: () => this.scene.start('LevelSelect'),
    })

    onLayout(this, () => this.layout())
  }

  private layout(): void {
    const { width, height } = this.scale
    const marginY = height * 0.25
    const font = fontScale(this)

    this.title.setPosition(width / 2, marginY / 2)
    this.title.setFontSize(`${Math.round(100 * font)}px`)
    this.message.setPosition(width / 2, height / 2)
    this.message.setFontSize(`${Math.round(36 * font)}px`)
    this.button.layout(width / 2, height - marginY / 2, width / 3, 70, 58 * font)
  }
}
