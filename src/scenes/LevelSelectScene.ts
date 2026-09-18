import Phaser from 'phaser'
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH, TOTAL_LEVELS } from '../config'
import { GameState } from '../state/GameState'
import { createMenuFrame } from '../ui/layout'
import { addButtonFeedback } from '../ui/buttons'
import { navigate } from '../ui/navigation'
import { createAudioButton, applyMutedState, toggleMute } from '../ui/audioButton'
import { bindScreenKeys } from '../ui/keyboard'
import { FRAME, TYPE } from '../ui/theme'

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
const GUTTER_X_PCT = 8
const GUTTER_Y_PCT = 10
const COLUMN_PCT = (100 - MARGIN_X_PCT * 2 - (COLUMNS - 1) * GUTTER_X_PCT) / COLUMNS
const ROW_PCT = 22

/** Earned-star skulls follow the original's deliberately uneven Y pattern. */
const STAR_X = [-60, 0, 60]
const STAR_Y = [34, 50, 40]

/**
 * The original Quintus button anchored its label at the sheet's (86, 65) while
 * the 171px frame is centred at (85.5, 85.5), and the star offsets were measured
 * from that same anchor. Applying it here puts the level number on the
 * headstone and the skulls on the mound, instead of both sitting too low.
 */
const ANCHOR_X = 86 - 85.5
const ANCHOR_Y = 65 - 85.5

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
    const gutterY = GAME_HEIGHT * GUTTER_Y_PCT * 0.01
    const rowHeight = GAME_HEIGHT * ROW_PCT * 0.01
    // Centre the grid on the shared content band instead of hanging it from a
    // top margin, so the title above it sits on the same line as every screen.
    const gridTop = FRAME.contentY - (ROWS * (rowHeight + gutterY)) / 2
    const scale = columnWidth / 171

    root.add(
      this.add
        .text(GAME_WIDTH / 2, FRAME.titleY, 'Everything begins here!', {
          fontFamily: FONTS.title,
          fontSize: `${TYPE.title}px`,
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
      y: gridTop,
    })

    root.add(createAudioButton(this, GAME_WIDTH - marginX, FRAME.titleY))

    fit()

    // Enter / Space continues at the furthest unlocked level, so the keyboard
    // never has to click a tombstone.
    const continueAt = Math.min(GameState.availableLevel, TOTAL_LEVELS)
    bindScreenKeys(this, {
      confirm: () => this.enter(continueAt),
      back: () => navigate(this, 'Start'),
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
      .text(ANCHOR_X * scale, ANCHOR_Y * scale, unlocked ? String(level) : '', {
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
              (ANCHOR_X + (STAR_X[i] ?? 0)) * scale,
              (ANCHOR_Y + (STAR_Y[i] ?? 40)) * scale,
              'others',
              'ui_level_score_small:0',
            )
            .setScale(scale),
        )
      }
    }

    if (unlocked) {
      image.setInteractive({ useHandCursor: true })
      addButtonFeedback(this, container, { source: image, onClick: () => this.enter(level) })
    }

    return container
  }

  /** Level 1 opens the tutorial, every other level starts straight away. */
  private enter(level: number): void {
    if (level === 1) {
      navigate(this, 'Controls')
      return
    }
    navigate(this, 'Game', { level })
  }
}
