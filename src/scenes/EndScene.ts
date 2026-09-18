import Phaser from 'phaser'
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH } from '../config'
import { createMenuFrame } from '../ui/layout'
import { createTextButton } from '../ui/buttons'
import { bindScreenKeys } from '../ui/keyboard'
import { applyMutedState, toggleMute } from '../ui/audioButton'

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
    const marginY = GAME_HEIGHT * 0.25

    root.add(
      this.add
        .text(GAME_WIDTH / 2, marginY / 2, 'The End', {
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
          'You did it!\nIf you like the game, follow us on twitter.\nAlso please give us some feedback.\nThanks for your time!',
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
        label: 'Back to all levels',
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
