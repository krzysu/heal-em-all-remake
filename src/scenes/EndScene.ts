import Phaser from 'phaser'
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH } from '../config'
import { createTextButton } from '../ui/buttons'

export class EndScene extends Phaser.Scene {
  constructor() {
    super('End')
  }

  create(): void {
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'background').setOrigin(0).setAlpha(0.4)
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1d2430, 0.6).setOrigin(0)

    this.add
      .text(GAME_WIDTH / 2, 100, 'The End', {
        fontFamily: FONTS.title,
        fontSize: '96px',
        color: COLORS.title,
      })
      .setOrigin(0.5)

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        'You did it!\nMore acts and modes are coming in the remaster.',
        {
          fontFamily: FONTS.body,
          fontSize: '24px',
          color: COLORS.accent,
          align: 'center',
          lineSpacing: 8,
        },
      )
      .setOrigin(0.5)

    createTextButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 54, {
      label: 'Back to all levels',
      width: 260,
      height: 50,
      onClick: () => this.scene.start('LevelSelect'),
    })
  }
}
