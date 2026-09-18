import Phaser from 'phaser'
import { COLORS, FONTS, GAME_WIDTH, TOTAL_LEVELS } from '../config'
import { GameState } from '../state/GameState'
import { createMenuFrame } from '../ui/layout'
import { createTextButton } from '../ui/buttons'
import { navigate } from '../ui/navigation'
import { bindScreenKeys } from '../ui/keyboard'
import { applyMutedState, toggleMute } from '../ui/audioButton'
import { BUTTON, FRAME, TYPE } from '../ui/theme'

/**
 * Port of `level_summary.coffee`.
 *
 * Two columns split by the same 20% / 8% / 24% math as the original: the stat
 * lines sit in the left column, the three big skulls in the right one. The
 * stat rows are the original's, including its "Bullets wasted" wording, but
 * sized on the shared type scale so they read against the big skulls.
 */
const MARGIN_X_PCT = 20
const GUTTER_X_PCT = 8
const COLUMNS = 2
const COLUMN_PCT = (100 - MARGIN_X_PCT * 2 - (COLUMNS - 1) * GUTTER_X_PCT) / COLUMNS
const LINE_HEIGHT = 66

/** `ui_level_score` is 80 wide in others.json; only its width steps the row. */
const SKULL_WIDTH = 80

export class LevelSummaryScene extends Phaser.Scene {
  constructor() {
    super('LevelSummary')
  }

  create(): void {
    const run = GameState.currentRun
    const level = run?.level ?? 1
    const hasNext = level < TOTAL_LEVELS

    applyMutedState(this)

    const { root, fit } = createMenuFrame(this)

    const marginX = GAME_WIDTH * MARGIN_X_PCT * 0.01
    const gutterX = GAME_WIDTH * GUTTER_X_PCT * 0.01
    const columnWidth = GAME_WIDTH * COLUMN_PCT * 0.01

    root.add(
      this.add
        .text(GAME_WIDTH / 2, FRAME.titleY, 'Well done!', {
          fontFamily: FONTS.title,
          fontSize: `${TYPE.title}px`,
          color: COLORS.title,
        })
        .setOrigin(0.5),
    )

    // Only the rows the original had data for are rendered, exactly as its
    // `if stage.options.<metric>` guards did.
    const entries: string[] = []
    if (run) {
      entries.push(`Health collected: ${run.healthCollected}/${run.healthAvailable}`)
      entries.push(`Zombies healed: ${run.zombiesHealed}/${run.zombiesAvailable}`)
      entries.push(`Bullets wasted: ${run.bulletsWasted}/${run.bulletsAvailable}`)
      entries.push(`Zombie Mode: ${run.zombieModeFound ? 'done' : 'not found'}`)
    }

    const summaryX = marginX + columnWidth / 2
    const starsX = summaryX + gutterX + columnWidth

    entries.forEach((entry, index) => {
      root.add(
        this.add
          .text(summaryX, FRAME.contentY + (index - 1.5) * LINE_HEIGHT, entry, {
            fontFamily: FONTS.body,
            fontSize: `${TYPE.body}px`,
            color: COLORS.accent,
          })
          .setOrigin(0.5),
      )
    })

    // `x = -80 - 20` in the original: first skull one width plus a 20px gap left
    // of the column centre, then stepped by width + 20.
    const earned = GameState.starsFor(level)
    for (let index = 0; index < 3; index++) {
      root.add(
        this.add.image(
          starsX + (SKULL_WIDTH + 20) * (index - 1.5),
          FRAME.contentY - LINE_HEIGHT / 2,
          'others',
          index < earned ? 'ui_level_score:0' : 'ui_level_score_empty:0',
        ),
      )
    }

    const buttonWidth = BUTTON.secondaryWidth
    const gap = BUTTON.gap

    root.add(
      createTextButton(this, GAME_WIDTH / 2 - buttonWidth / 2 - gap, FRAME.actionY, {
        label: 'All levels',
        width: buttonWidth,
        fill: COLORS.title,
        onClick: () => navigate(this, 'LevelSelect'),
      }),
    )

    root.add(
      createTextButton(this, GAME_WIDTH / 2 + buttonWidth / 2 + gap, FRAME.actionY, {
        label: hasNext ? 'Play next' : 'The End',
        width: buttonWidth,
        fill: COLORS.accent,
        onClick: () =>
          hasNext ? navigate(this, 'Game', { level: level + 1 }) : navigate(this, 'End'),
      }),
    )

    fit()

    // Enter / Space mirrors "Play next", Escape returns to the level list.
    bindScreenKeys(this, {
      confirm: () =>
        hasNext ? navigate(this, 'Game', { level: level + 1 }) : navigate(this, 'End'),
      back: () => navigate(this, 'LevelSelect'),
      mute: () => toggleMute(this),
    })
  }
}
