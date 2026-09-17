import Phaser from 'phaser'
import { COLORS, FONTS, TOTAL_LEVELS } from '../config'
import { GameState } from '../state/GameState'
import { addMenuBackdrop, fontScale, onLayout } from '../ui/layout'
import { createTextButton } from '../ui/buttons'

/**
 * Port of `level_summary.coffee`.
 *
 * Two columns split by the same 20% / 8% / 24% math as the original: the stat
 * lines sit in the left column, the three big skulls in the right one. Note the
 * original's spelling `waisted` in its data model is irrelevant here; the UI
 * text reads "Bullets wasted", which the port keeps.
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
  private title!: Phaser.GameObjects.Text
  private lines: Phaser.GameObjects.Text[] = []
  private skulls: Phaser.GameObjects.Image[] = []
  private buttons: ReturnType<typeof createTextButton>[] = []

  constructor() {
    super('LevelSummary')
  }

  create(): void {
    const run = GameState.currentRun
    const level = run?.level ?? 1
    const hasNext = level < TOTAL_LEVELS

    addMenuBackdrop(this)
    this.lines = []
    this.skulls = []
    this.buttons = []

    this.title = this.add
      .text(0, 0, 'Well done!', {
        fontFamily: FONTS.title,
        fontSize: '100px',
        color: COLORS.title,
      })
      .setOrigin(0.5)

    // Only the rows the original had data for are rendered, exactly as its
    // `if stage.options.<metric>` guards did.
    const entries: string[] = []
    if (run) {
      entries.push(`Health collected: ${run.healthCollected}/${run.healthAvailable}`)
      entries.push(`Zombies healed: ${run.zombiesHealed}/${run.zombiesAvailable}`)
      entries.push(`Bullets wasted: ${run.bulletsWasted}/${run.bulletsAvailable}`)
      entries.push(`Zombie Mode: ${run.zombieModeFound ? 'done' : 'not found'}`)
    }

    for (const entry of entries) {
      this.lines.push(
        this.add
          .text(0, 0, entry, {
            fontFamily: FONTS.body,
            fontSize: '36px',
            color: COLORS.accent,
          })
          .setOrigin(0.5),
      )
    }

    const earned = GameState.starsFor(level)
    for (let index = 0; index < 3; index++) {
      this.skulls.push(
        this.add
          .image(0, 0, 'others', index < earned ? 'ui_level_score:0' : 'ui_level_score_empty:0')
          .setOrigin(0.5),
      )
    }

    const back = createTextButton(this, 0, 0, {
      label: 'All levels',
      width: 200,
      height: 70,
      fill: COLORS.title,
      onClick: () => this.scene.start('LevelSelect'),
    })
    this.buttons.push(back)

    const next = hasNext
      ? createTextButton(this, 0, 0, {
          label: 'Play next',
          width: 200,
          height: 70,
          fill: COLORS.accent,
          onClick: () => this.scene.start('Game', { level: level + 1 }),
        })
      : createTextButton(this, 0, 0, {
          label: 'The End',
          width: 200,
          height: 70,
          fill: COLORS.accent,
          onClick: () => this.scene.start('End'),
        })
    this.buttons.push(next)

    onLayout(this, () => this.layout())
  }

  private layout(): void {
    const { width, height } = this.scale
    const marginX = width * MARGIN_X_PCT * 0.01
    const gutterX = width * GUTTER_X_PCT * 0.01
    const columnWidth = width * COLUMN_PCT * 0.01
    const marginY = height * MARGIN_Y_PCT * 0.01
    const font = fontScale(this)

    this.title.setPosition(width / 2, marginY / 2)
    this.title.setFontSize(`${Math.round(100 * font)}px`)

    const summaryX = marginX + columnWidth / 2
    const starsX = summaryX + gutterX + columnWidth

    this.lines.forEach((line, index) => {
      line.setPosition(summaryX, height / 2 + (index - 1.5) * LINE_HEIGHT)
      line.setFontSize(`${Math.round(36 * font)}px`)
    })

    // `x = -80 - 20` in the original: first skull one width plus a 20px gap
    // left of the column centre, then stepped by width + 20.
    const starScale = (columnWidth / 2) * 0.0016 * font
    const skullStep = SKULL_WIDTH + 20
    this.skulls.forEach((skull, index) => {
      skull.setPosition(
        starsX + (-skullStep * 1.5 + index * skullStep),
        height / 2 - LINE_HEIGHT / 2,
      )
      skull.setScale(starScale <= 0 ? 1 : starScale)
    })

    const buttonWidth = width / 4
    const buttonY = height - marginY
    const gap = 40
    this.buttons[0]?.layout(width / 2 - buttonWidth / 2 - gap, buttonY, buttonWidth, 70, 58 * font)
    this.buttons[1]?.layout(width / 2 + buttonWidth / 2 + gap, buttonY, buttonWidth, 70, 58 * font)
  }
}
