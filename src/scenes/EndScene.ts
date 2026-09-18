import Phaser from 'phaser'
import { COLORS, FONTS, GAME_WIDTH } from '../config'
import { createMenuFrame } from '../ui/layout'
import { createTextButton } from '../ui/buttons'
import { navigate } from '../ui/navigation'
import { bindScreenKeys } from '../ui/keyboard'
import { applyMutedState, toggleMute } from '../ui/audioButton'
import { BUTTON, FRAME, TYPE } from '../ui/theme'

/**
 * Port of `end.coffee`, shown after the last level. Message text is the
 * original's, since the remaster covers the same six-level act.
 */
export class EndScene extends Phaser.Scene {
  constructor() {
    super('End')
  }

  create(): void {
    applyMutedState(this)

    const { root, fit } = createMenuFrame(this)

    root.add(
      this.add
        .text(GAME_WIDTH / 2, FRAME.titleY, 'The End', {
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
          'You did it!\nIf you like the game, follow us on twitter.\nAlso please give us some feedback.\nThanks for your time!',
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
        label: 'Back to all levels',
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
