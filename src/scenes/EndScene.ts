import Phaser from 'phaser'
import { COLORS, FONTS } from '../config'
import { addMenuBackdrop, fontScale, onLayout } from '../ui/layout'
import { createTextButton } from '../ui/buttons'

/**
 * Port of `end.coffee`, shown after the last level. Message text is the
 * original's, since the remaster covers the same six-level act.
 */
export class EndScene extends Phaser.Scene {
  private title!: Phaser.GameObjects.Text
  private message!: Phaser.GameObjects.Text
  private button!: ReturnType<typeof createTextButton>

  constructor() {
    super('End')
  }

  create(): void {
    addMenuBackdrop(this)

    this.title = this.add
      .text(0, 0, 'The End', {
        fontFamily: FONTS.title,
        fontSize: '100px',
        color: COLORS.title,
      })
      .setOrigin(0.5)

    this.message = this.add
      .text(
        0,
        0,
        'You did it!\nIf you like the game, follow us on twitter.\nAlso please give us some feedback.\nThanks for your time!',
        {
          fontFamily: FONTS.body,
          fontSize: '36px',
          color: COLORS.accent,
          align: 'center',
        },
      )
      .setOrigin(0.5)

    this.button = createTextButton(this, 0, 0, {
      label: 'Back to all levels',
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
