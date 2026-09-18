import Phaser from 'phaser'
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH } from '../config'
import { createMenuFrame } from '../ui/layout'
import { createTextButton } from '../ui/buttons'
import { bindScreenKeys } from '../ui/keyboard'
import { applyMutedState, toggleMute } from '../ui/audioButton'

/**
 * Port of `controls.coffee` — the tutorial screen the remaster was missing
 * entirely. Three columns laid out with the original's percentages: 20% side
 * margins, 8% gutters and 24% wide columns, with the title at a quarter-height
 * margin.
 */
const MARGIN_X_PCT = 20
const GUTTER_X_PCT = 8
const COLUMNS = 3
const COLUMN_PCT = (100 - MARGIN_X_PCT * 2 - (COLUMNS - 1) * GUTTER_X_PCT) / COLUMNS
const MARGIN_Y_PCT = 25

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
    const marginY = GAME_HEIGHT * MARGIN_Y_PCT * 0.01

    root.add(
      this.add
        .text(GAME_WIDTH / 2, marginY / 2, "How to heal'em in three steps", {
          fontFamily: FONTS.title,
          fontSize: '60px',
          color: COLORS.title,
        })
        .setOrigin(0.5),
    )

    STEPS.forEach((step, index) => {
      const x = marginX + columnWidth / 2 + index * (columnWidth + gutterX)

      root.add([
        this.add
          .text(x, GAME_HEIGHT / 2 - 140, step.heading, {
            fontFamily: FONTS.body,
            fontSize: '26px',
            color: COLORS.danger,
          })
          .setOrigin(0.5),
        this.add
          .text(x, GAME_HEIGHT / 2 - 100, step.caption, {
            fontFamily: FONTS.body,
            fontSize: '30px',
            color: COLORS.muted,
            align: 'center',
            wordWrap: { width: columnWidth },
          })
          .setOrigin(0.5),
        this.add
          .image(x, GAME_HEIGHT / 2 + 30, 'others', step.frame)
          .setScale(Math.min(1, (columnWidth * 1.1) / 200)),
      ])
    })

    root.add(
      createTextButton(this, GAME_WIDTH / 2, GAME_HEIGHT - marginY, {
        label: 'Give me some zombies',
        width: GAME_WIDTH / 2,
        height: 70,
        fill: COLORS.accent,
        fontSize: 58,
        onClick: () => this.scene.start('Game', { level: 1 }),
      }),
    )

    fit()

    bindScreenKeys(this, {
      confirm: () => this.scene.start('Game', { level: 1 }),
      back: () => this.scene.start('LevelSelect'),
      mute: () => toggleMute(this),
    })
  }
}
