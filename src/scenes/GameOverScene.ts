import Phaser from 'phaser'
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH } from '../config'
import { addMenuBackdrop } from '../ui/layout'
import { createTextButton } from '../ui/buttons'

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver')
  }

  create(): void {
    addMenuBackdrop(this, 0.65)

    this.add
      .text(GAME_WIDTH / 2, 110, 'Game Over', {
        fontFamily: FONTS.title,
        fontSize: '84px',
        color: COLORS.title,
      })
      .setOrigin(0.5)

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        'Looks like these zombies cannot hope for your help :/\nBe better next time!',
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
      label: 'All levels',
      width: 220,
      height: 50,
      onClick: () => this.scene.start('LevelSelect'),
    })
  }
}
