import Phaser from 'phaser'
import { COLORS, FONTS, GAME_WIDTH } from '../config'
import { createMenuFrame } from '../ui/layout'
import { createTextButton } from '../ui/buttons'
import { navigate } from '../ui/navigation'
import { bindScreenKeys } from '../ui/keyboard'
import { applyMutedState, toggleMute } from '../ui/audioButton'
import { BUTTON, FRAME, TYPE } from '../ui/theme'

/**
 * Port of `game_over.coffee`. Uses the shared menu frame: title, centred
 * message and a bottom action row, so it lines up with the other screens.
 */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver')
  }

  create(): void {
    applyMutedState(this)

    const { root, fit } = createMenuFrame(this)

    root.add(
      this.add
        .text(GAME_WIDTH / 2, FRAME.titleY, 'Game Over', {
          fontFamily: FONTS.title,
          fontSize: `${TYPE.title}px`,
          color: COLORS.title,
        })
        .setOrigin(0.5),
    )

    root.add(
      this.add
        .text(
          GAME_WIDTH / 2,
          FRAME.contentY,
          'Looks like these zombies cannot hope for your help :/\nBe better next time!',
          {
            fontFamily: FONTS.body,
            fontSize: `${TYPE.body}px`,
            color: COLORS.accent,
            align: 'center',
          },
        )
        .setOrigin(0.5),
    )

    root.add(
      createTextButton(this, GAME_WIDTH / 2, FRAME.actionY, {
        label: 'All levels',
        width: BUTTON.primaryWidth,
        fill: COLORS.accent,
        onClick: () => navigate(this, 'LevelSelect'),
      }),
    )

    fit()

    bindScreenKeys(this, {
      confirm: () => navigate(this, 'LevelSelect'),
      back: () => navigate(this, 'LevelSelect'),
      mute: () => toggleMute(this),
    })
  }
}
