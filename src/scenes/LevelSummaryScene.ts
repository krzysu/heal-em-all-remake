import Phaser from 'phaser'
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH, TOTAL_LEVELS } from '../config'
import { GameState } from '../state/GameState'
import { createMenuFrame } from '../ui/layout'
import { createTextButton } from '../ui/buttons'
import { bindScreenKeys } from '../ui/keyboard'
import { applyMutedState, toggleMute } from '../ui/audioButton'

/**
 * Port of `level_summary.coffee`.
 *
 * Two columns split by the same 20% / 8% / 24% math as the original: the stat
 * lines sit in the left column, the three big skulls in the right one. The
 * stat rows are the original's, including its "Bullets wasted" wording.
 */
const MARGIN_X_PCT = 20
const GUTTER_X_PCT = 8
const COLUMNS = 2
const COLUMN_PCT = (100 - MARGIN_X_PCT * 2 - (COLUMNS - 1) * GUTTER_X_PCT) / COLUMNS
const MARGIN_Y_PCT = 25
const LINE_HEIGHT = 50

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
    const marginY = GAME_HEIGHT * MARGIN_Y_PCT * 0.01

    root.add(
      this.add
        .text(GAME_WIDTH / 2, marginY / 2, 'Well done!', {
          fontFamily: FONTS.title,
          fontSize: '100px',
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
          .text(summaryX, GAME_HEIGHT / 2 + (index - 1.5) * LINE_HEIGHT, entry, {
            fontFamily: FONTS.body,
            fontSize: '36px',
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
          GAME_HEIGHT / 2 - LINE_HEIGHT / 2,
          'others',
          index < earned ? 'ui_level_score:0' : 'ui_level_score_empty:0',
        ),
      )
    }

    const buttonWidth = GAME_WIDTH / 4
    const buttonY = GAME_HEIGHT - marginY
    const gap = 40

    root.add(
      createTextButton(this, GAME_WIDTH / 2 - buttonWidth / 2 - gap, buttonY, {
        label: 'All levels',
        width: buttonWidth,
        height: 70,
        fill: COLORS.title,
        fontSize: 58,
        onClick: () => this.scene.start('LevelSelect'),
      }),
    )

    root.add(
      createTextButton(this, GAME_WIDTH / 2 + buttonWidth / 2 + gap, buttonY, {
        label: hasNext ? 'Play next' : 'The End',
        width: buttonWidth,
        height: 70,
        fill: COLORS.accent,
        fontSize: 58,
        onClick: () =>
          hasNext ? this.scene.start('Game', { level: level + 1 }) : this.scene.start('End'),
      }),
    )

    fit()

    // Enter / Space mirrors "Play next", Escape returns to the level list.
    bindScreenKeys(this, {
      confirm: () =>
        hasNext ? this.scene.start('Game', { level: level + 1 }) : this.scene.start('End'),
      back: () => this.scene.start('LevelSelect'),
      mute: () => toggleMute(this),
    })
  }
}
