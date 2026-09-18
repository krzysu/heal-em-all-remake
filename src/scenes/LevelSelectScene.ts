import Phaser from 'phaser'
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH, TOTAL_LEVELS } from '../config'
import { GameState } from '../state/GameState'
import { createMenuFrame } from '../ui/layout'
import { createAudioButton, applyMutedState, toggleMute } from '../ui/audioButton'
import { bindScreenKeys } from '../ui/keyboard'

/**
 * Port of `level_select.coffee`.
 *
 * The original placed six tombstone buttons on a 3x2 grid using percentages of
 * the live window (20% margins, 8% column gutters, 14% row gutters, 24% wide
 * columns, 22% tall rows). Here those percentages resolve once against the
 * 1920x1080 design space and the grid is laid out with `Phaser.Actions.GridAlign`
 * instead of a running x/y walk. The row gutter is tighter than the original so
 * `createMenuFrame` can scale the whole screen up without the rows touching.
 */
const COLUMNS = 3
const ROWS = 2
const MARGIN_X_PCT = 20
const MARGIN_Y_PCT = 12
const GUTTER_X_PCT = 8
const GUTTER_Y_PCT = 10
const COLUMN_PCT = (100 - MARGIN_X_PCT * 2 - (COLUMNS - 1) * GUTTER_X_PCT) / COLUMNS
const ROW_PCT = 22

/** Earned-star skulls follow the original's deliberately uneven Y pattern. */
const STAR_X = [-60, 0, 60]
const STAR_Y = [34, 50, 40]

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelect')
  }

  create(): void {
    applyMutedState(this)

    const { root, fit } = createMenuFrame(this)

    const marginX = GAME_WIDTH * MARGIN_X_PCT * 0.01
    const gutterX = GAME_WIDTH * GUTTER_X_PCT * 0.01
    const columnWidth = GAME_WIDTH * COLUMN_PCT * 0.01
    const marginY = GAME_HEIGHT * MARGIN_Y_PCT * 0.01
    const gutterY = GAME_HEIGHT * GUTTER_Y_PCT * 0.01
    const rowHeight = GAME_HEIGHT * ROW_PCT * 0.01
    const scale = columnWidth / 171

    root.add(
      this.add
        .text(GAME_WIDTH / 2, marginY / 2, 'Everything begins here!', {
          fontFamily: FONTS.title,
          fontSize: '60px',
          color: COLORS.title,
        })
        .setOrigin(0.5),
    )

    const nodes: Phaser.GameObjects.Container[] = []
    for (let level = 1; level <= TOTAL_LEVELS; level++) {
      nodes.push(this.createLevelNode(level, scale))
    }
    root.add(nodes)

    // GridAlign does the 3x2 walk the original hand-rolled. It anchors each item
    // by `position` (default TOP_LEFT), so CENTER is required to place the
    // tombstone centres on the cell centres.
    Phaser.Actions.GridAlign(nodes, {
      width: COLUMNS,
      height: ROWS,
      cellWidth: columnWidth + gutterX,
      cellHeight: rowHeight + gutterY,
      position: Phaser.Display.Align.CENTER,
      x: marginX,
      y: marginY,
    })

    root.add(createAudioButton(this, GAME_WIDTH - marginX, marginY / 2))

    fit()

    // Enter / Space continues at the furthest unlocked level, so the keyboard
    // never has to click a tombstone.
    const continueAt = Math.min(GameState.availableLevel, TOTAL_LEVELS)
    bindScreenKeys(this, {
      confirm: () => this.enter(continueAt),
      back: () => this.scene.start('Start'),
      mute: () => toggleMute(this),
    })
  }

  private createLevelNode(level: number, scale: number): Phaser.GameObjects.Container {
    const unlocked = GameState.isUnlocked(level)
    const container = this.add.container(0, 0)

    const image = this.add
      .image(0, 0, 'others', unlocked ? 'ui_level_button:0' : 'ui_level_button_locked:0')
      .setScale(scale)

    // Locked tombstones show a padlock in the art instead of a number.
    const label = this.add
      .text(0, 0, unlocked ? String(level) : '', {
        fontFamily: FONTS.title,
        fontSize: `${Math.round(70 * scale)}px`,
        color: '#595f5f',
      })
      .setOrigin(0.5)

    container.add([image, label])

    // Earned stars only, in the original's uneven 34/50/40 pattern and in front
    // of the tombstone, matching how it inserted them into the container last.
    const earned = GameState.starsFor(level)
    if (unlocked && earned > 0) {
      for (let i = 0; i < earned; i++) {
        container.add(
          this.add
            .image(
              (STAR_X[i] ?? 0) * scale,
              34 + ((STAR_Y[i] ?? 40) - 34) * scale,
              'others',
              'ui_level_score_small:0',
            )
            .setScale(scale),
        )
      }
    }

    if (unlocked) {
      image.setInteractive({ useHandCursor: true })
      image.on('pointerover', () => container.setScale(1.05))
      image.on('pointerout', () => container.setScale(1))
      image.on('pointerup', () => this.enter(level))
    }

    return container
  }

  /** Level 1 opens the tutorial, every other level starts straight away. */
  private enter(level: number): void {
    if (level === 1) {
      this.scene.start('Controls')
      return
    }
    this.scene.start('Game', { level })
  }
}
