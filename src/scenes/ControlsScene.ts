import Phaser from 'phaser'
import { COLORS, FONTS, GAME_WIDTH } from '../config'
import { createMenuFrame } from '../ui/layout'
import { createTextButton } from '../ui/buttons'
import { navigate } from '../ui/navigation'
import { bindScreenKeys } from '../ui/keyboard'
import { applyMutedState, toggleMute } from '../ui/audioButton'
import { BUTTON, FRAME, TYPE } from '../ui/theme'

/**
 * Port of `controls.coffee` — the tutorial screen the remaster was missing
 * entirely. Three columns between the shared title and action rows, so the art
 * can be large enough to read instead of squeezed into the original's narrow
 * 24% columns.
 */
const MARGIN_X_PCT = 14
const GUTTER_X_PCT = 6
const COLUMNS = 3
const COLUMN_PCT = (100 - MARGIN_X_PCT * 2 - (COLUMNS - 1) * GUTTER_X_PCT) / COLUMNS
/** Art is scaled up to fit this box (never beyond) and stays aspect-correct. */
const ART_MAX_HEIGHT = 200
const ART_WIDTH_FILL = 0.95

interface Step {
  heading: string
  caption: string
  frame: string
}

const STEPS: Step[] = [
  { heading: '1st', caption: 'Move with arrows', frame: 'ui_controls_1:0' },
  { heading: '2nd', caption: 'Find Healing Gun', frame: 'ui_controls_2:0' },
  { heading: '3rd', caption: 'Use your Gun!', frame: 'ui_controls_3:0' },
]

export class ControlsScene extends Phaser.Scene {
  constructor() {
    super('Controls')
  }

  create(): void {
    applyMutedState(this)

    const { root, fit } = createMenuFrame(this)

    const marginX = GAME_WIDTH * MARGIN_X_PCT * 0.01
    const gutterX = GAME_WIDTH * GUTTER_X_PCT * 0.01
    const columnWidth = GAME_WIDTH * COLUMN_PCT * 0.01

    root.add(
      this.add
        .text(GAME_WIDTH / 2, FRAME.titleY, "How to heal'em in three steps", {
          fontFamily: FONTS.title,
          fontSize: `${TYPE.title}px`,
          color: COLORS.title,
        })
        .setOrigin(0.5),
    )

    STEPS.forEach((step, index) => {
      const x = marginX + columnWidth / 2 + index * (columnWidth + gutterX)

      const art = this.add.image(x, FRAME.contentY + 110, 'others', step.frame)
      art.setScale(
        Math.min((columnWidth * ART_WIDTH_FILL) / art.width, ART_MAX_HEIGHT / art.height),
      )

      root.add([
        this.add
          .text(x, FRAME.contentY - 110, step.heading, {
            fontFamily: FONTS.body,
            fontSize: `${TYPE.caption}px`,
            color: COLORS.danger,
          })
          .setOrigin(0.5),
        this.add
          .text(x, FRAME.contentY - 55, step.caption, {
            fontFamily: FONTS.body,
            fontSize: `${TYPE.body}px`,
            color: COLORS.muted,
            align: 'center',
            wordWrap: { width: columnWidth },
          })
          .setOrigin(0.5),
        art,
      ])
    })

    root.add(
      createTextButton(this, GAME_WIDTH / 2, FRAME.actionY, {
        label: 'Give me some zombies',
        width: BUTTON.primaryWidth,
        fill: COLORS.accent,
        onClick: () => navigate(this, 'Game', { level: 1 }),
      }),
    )

    fit()

    bindScreenKeys(this, {
      confirm: () => navigate(this, 'Game', { level: 1 }),
      back: () => navigate(this, 'LevelSelect'),
      mute: () => toggleMute(this),
    })
  }
}
