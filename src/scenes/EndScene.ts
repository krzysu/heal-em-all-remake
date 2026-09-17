import Phaser from 'phaser'
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH } from '../config'
import { addMenuBackdrop } from '../ui/layout'
import { createTextButton } from '../ui/buttons'

export class EndScene extends Phaser.Scene {
  constructor() {
    super('End')
  }

  create(): void {
    addMenuBackdrop(this, 0.6)

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
