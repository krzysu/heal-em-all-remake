import Phaser from 'phaser'
import { COLORS, GAME_WIDTH } from '../config'
import { createMenuFrame } from '../ui/layout'
import { createTextButton } from '../ui/buttons'
import { addSplashHeading, SPLASH } from '../ui/splash'
import { navigate } from '../ui/navigation'
import { bindScreenKeys } from '../ui/keyboard'
import { applyMutedState, toggleMute } from '../ui/audioButton'
import { BUTTON } from '../ui/theme'

/**
 * Title screen. Authored in the 1920x1080 design space and fitted to the live
 * window by `createMenuFrame`. Its heading comes from `ui/splash.ts`, which the
 * loading screen also uses, so the hand-off is seamless.
 */
export class StartScene extends Phaser.Scene {
  constructor() {
    super('Start')
  }

  create(): void {
    applyMutedState(this)

    const { root, fit } = createMenuFrame(this)

    addSplashHeading(this, root)

    root.add(
      createTextButton(this, GAME_WIDTH / 2, SPLASH.actionY, {
        label: 'Continue',
        width: BUTTON.primaryWidth,
        fill: COLORS.accent,
        onClick: () => navigate(this, 'LevelSelect'),
      }),
    )

    fit()

    bindScreenKeys(this, {
      confirm: () => navigate(this, 'LevelSelect'),
      mute: () => toggleMute(this),
    })
  }
}
