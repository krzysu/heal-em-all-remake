import Phaser from 'phaser'
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH } from '../config'
import { createMenuFrame } from '../ui/layout'
import { createTextButton } from '../ui/buttons'
import { bindScreenKeys } from '../ui/keyboard'
import { applyMutedState, toggleMute } from '../ui/audioButton'

/**
 * Title screen. Authored in the 1920x1080 design space and fitted to the live
 * window by `createMenuFrame`: title, tagline and a Continue button stacked on
 * the vertical centre, with the block nudged up so the button lands near the
 * middle of the screen.
 */
export class StartScene extends Phaser.Scene {
  constructor() {
    super('Start')
  }

  create(): void {
    applyMutedState(this)

    const { root, fit } = createMenuFrame(this)
    const centerX = GAME_WIDTH / 2
    const centerY = GAME_HEIGHT / 2

    root.add(
      this.add
        .text(centerX, centerY - 250, "Heal'em All", {
          fontFamily: FONTS.title,
          fontSize: '160px',
          color: COLORS.title,
        })
        .setOrigin(0.5),
    )

    root.add(
      this.add
        .text(centerX, centerY - 110, "There's a cure for zombies", {
          fontFamily: FONTS.title,
          fontSize: '56px',
          color: COLORS.danger,
        })
        .setOrigin(0.5),
    )

    root.add(
      createTextButton(this, centerX, centerY + 60, {
        label: 'Continue',
        width: GAME_WIDTH / 3,
        height: 90,
        fill: COLORS.accent,
        fontSize: 58,
        onClick: () => this.scene.start('LevelSelect'),
      }),
    )

    fit()

    bindScreenKeys(this, {
      confirm: () => this.scene.start('LevelSelect'),
      mute: () => toggleMute(this),
    })
  }
}
