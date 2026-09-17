import Phaser from 'phaser'
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH } from '../config'
import { addMenuBackdrop } from '../ui/layout'
import { createTextButton } from '../ui/buttons'

export class StartScene extends Phaser.Scene {
  constructor() {
    super('Start')
  }

  create(): void {
    addMenuBackdrop(this, 0.45)

    this.add
      .text(GAME_WIDTH / 2, 96, "Heal'em All", {
        fontFamily: FONTS.title,
        fontSize: '96px',
        color: COLORS.title,
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_WIDTH / 2, 156, "There's a cure for zombies", {
        fontFamily: FONTS.title,
        fontSize: '32px',
        color: COLORS.danger,
      })
      .setOrigin(0.5)

    createTextButton(this, GAME_WIDTH / 2, 240, {
      label: 'Continue',
      fill: COLORS.accent,
      onClick: () => this.scene.start('LevelSelect'),
    })

    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('LevelSelect'))
    this.input.keyboard?.once('keydown-SPACE', () => this.scene.start('LevelSelect'))

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 22,
        'A remaster of the 2013 HTML5 game by Kris Urbas & Paweł Madeja',
        {
          fontFamily: FONTS.body,
          fontSize: '13px',
          color: COLORS.muted,
        },
      )
      .setOrigin(0.5)
  }
}
