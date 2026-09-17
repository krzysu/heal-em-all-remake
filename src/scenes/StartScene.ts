import Phaser from 'phaser'
import { COLORS, FONTS } from '../config'
import { addMenuBackdrop, onLayout } from '../ui/layout'
import { createTextButton } from '../ui/buttons'

/**
 * Port of `start.coffee`. The original stacked a title container at the window
 * centre: title at y = -100, subtitle at y = -20, button at y = +80, all sized
 * in raw pixels against the live window.
 */
export class StartScene extends Phaser.Scene {
  constructor() {
    super('Start')
  }

  create(): void {
    addMenuBackdrop(this)

    const title = this.add
      .text(0, 0, "Heal'em All", {
        fontFamily: FONTS.title,
        fontSize: '120px',
        color: COLORS.title,
      })
      .setOrigin(0.5)

    const subtitle = this.add
      .text(0, 0, "There's a cure for zombies", {
        fontFamily: FONTS.title,
        fontSize: '40px',
        color: COLORS.danger,
      })
      .setOrigin(0.5)

    const button = createTextButton(this, 0, 0, {
      label: 'Continue',
      width: 210,
      height: 70,
      fill: COLORS.accent,
      onClick: () => this.advance(),
    })

    onLayout(this, () => {
      const { width, height } = this.scale
      const centerX = width / 2
      const centerY = height / 2

      title.setPosition(centerX, centerY - 100)
      subtitle.setPosition(centerX, centerY - 20)
      button.layout(centerX, centerY + 80, width / 3, 70, 58)
    })

    this.input.keyboard?.once('keydown-ENTER', () => this.advance())
    this.input.keyboard?.once('keydown-SPACE', () => this.advance())
  }

  /** Continue goes to the level list; level 1 leads into the tutorial. */
  private advance(): void {
    this.scene.start('LevelSelect')
  }
}
