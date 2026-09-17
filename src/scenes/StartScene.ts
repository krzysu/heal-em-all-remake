import Phaser from 'phaser'
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH } from '../config'
import { addMenuBackdrop } from '../ui/layout'
import { createTextButton } from '../ui/buttons'
import { bindScreenKeys } from '../ui/keyboard'
import { applyMutedState, toggleMute } from '../ui/audioButton'

/**
 * Title screen. Laid out once in the fixed design space: a title, a tagline and
 * a Continue button stacked on the vertical centre, with the block nudged up so
 * the button lands near the middle of the screen.
 */
export class StartScene extends Phaser.Scene {
  constructor() {
    super('Start')
  }

  create(): void {
    applyMutedState(this)
    addMenuBackdrop(this)

    const centerX = GAME_WIDTH / 2
    const centerY = GAME_HEIGHT / 2

    this.add
      .text(centerX, centerY - 250, "Heal'em All", {
        fontFamily: FONTS.title,
        fontSize: '160px',
        color: COLORS.title,
      })
      .setOrigin(0.5)

    this.add
      .text(centerX, centerY - 110, "There's a cure for zombies", {
        fontFamily: FONTS.title,
        fontSize: '56px',
        color: COLORS.danger,
      })
      .setOrigin(0.5)

    createTextButton(this, centerX, centerY + 60, {
      label: 'Continue',
      width: GAME_WIDTH / 3,
      height: 90,
      fill: COLORS.accent,
      fontSize: 58,
      onClick: () => this.scene.start('LevelSelect'),
    })

    bindScreenKeys(this, {
      confirm: () => this.scene.start('LevelSelect'),
      mute: () => toggleMute(this),
    })
  }
}
