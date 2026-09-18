import Phaser from 'phaser'
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH } from '../config'
import { createMenuFrame } from '../ui/layout'
import { createTextButton } from '../ui/buttons'
import { bindScreenKeys } from '../ui/keyboard'
import { applyMutedState, toggleMute } from '../ui/audioButton'

/**
 * Port of `game_over.coffee`. Title at a quarter-height margin, message at the
 * design-space centre, button at `height - marginY/2` and a third of the width.
 */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver')
  }

  create(): void {
    applyMutedState(this)

    const { root, fit } = createMenuFrame(this)
    const marginY = GAME_HEIGHT * 0.25

    root.add(
      this.add
        .text(GAME_WIDTH / 2, marginY / 2, 'Game Over', {
          fontFamily: FONTS.title,
          fontSize: '100px',
          color: COLORS.title,
        })
        .setOrigin(0.5),
    )

    root.add(
      this.add
        .text(
          GAME_WIDTH / 2,
          GAME_HEIGHT / 2,
          'Looks like these zombies cannot hope for your help :/\nBe better next time!',
          {
            fontFamily: FONTS.body,
            fontSize: '36px',
            color: COLORS.accent,
            align: 'center',
          },
        )
        .setOrigin(0.5),
    )

    root.add(
      createTextButton(this, GAME_WIDTH / 2, GAME_HEIGHT - marginY / 2, {
        label: 'All levels',
        width: GAME_WIDTH / 3,
        height: 70,
        fill: COLORS.accent,
        fontSize: 58,
        onClick: () => this.scene.start('LevelSelect'),
      }),
    )

    fit()

    bindScreenKeys(this, {
      confirm: () => this.scene.start('LevelSelect'),
      back: () => this.scene.start('LevelSelect'),
      mute: () => toggleMute(this),
    })
  }
}
