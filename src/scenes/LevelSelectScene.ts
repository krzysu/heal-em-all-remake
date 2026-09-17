import Phaser from 'phaser'
import { COLORS, FONTS, TOTAL_LEVELS } from '../config'
import { GameState } from '../state/GameState'
import { addMenuBackdrop, fontScale, onLayout } from '../ui/layout'
import { createAudioButton } from '../ui/audioButton'

/**
 * Port of `level_select.coffee`.
 *
 * The original laid six tombstone buttons on a 3x2 grid whose geometry was pure
 * percentages of the live window: 20% margins, 8% column gutters, 14% row
 * gutters, 24% wide columns and 22% tall rows. Because x and y used separate
 * factors the grid adapted to any aspect ratio, which a single camera zoom
 * cannot reproduce.
 */
const MARGIN_X_PCT = 20
const MARGIN_Y_PCT = 20
const GUTTER_X_PCT = 8
const GUTTER_Y_PCT = 14
const COLUMNS = 3
const COLUMN_PCT = (100 - MARGIN_X_PCT * 2 - (COLUMNS - 1) * GUTTER_X_PCT) / COLUMNS
const ROW_PCT = 22

/** Tombstone frame size, from others.json (`ui_level_button` is 171x171). */
const BUTTON_WIDTH = 171

/** Earned-star skulls follow the original's deliberately uneven Y pattern. */
const STAR_X = [-60, 0, 60]
const STAR_Y = [34, 50, 40]
const STAR_SIZE = 30

interface LevelNode {
  container: Phaser.GameObjects.Container
  image: Phaser.GameObjects.Image
  label: Phaser.GameObjects.Text
  stars: Phaser.GameObjects.Image[]
  unlocked: boolean
}

export class LevelSelectScene extends Phaser.Scene {
  private nodes: LevelNode[] = []
  private title!: Phaser.GameObjects.Text
  private audioButton!: { layout: (x: number, y: number) => void }

  constructor() {
    super('LevelSelect')
  }

  create(): void {
    addMenuBackdrop(this)
    this.nodes = []

    this.title = this.add
      .text(0, 0, 'Everything begins here!', {
        fontFamily: FONTS.title,
        fontSize: '60px',
        color: COLORS.title,
      })
      .setOrigin(0.5)

    for (let level = 1; level <= TOTAL_LEVELS; level++) {
      this.nodes.push(this.createLevelNode(level))
    }

    this.audioButton = createAudioButton(this)

    onLayout(this, () => this.layout())
  }

  private layout(): void {
    const { width, height } = this.scale
    const marginX = width * MARGIN_X_PCT * 0.01
    const gutterX = width * GUTTER_X_PCT * 0.01
    const columnWidth = width * COLUMN_PCT * 0.01
    const marginY = height * MARGIN_Y_PCT * 0.01
    const gutterY = height * GUTTER_Y_PCT * 0.01
    const rowHeight = height * ROW_PCT * 0.01
    const scale = columnWidth / BUTTON_WIDTH
    const font = fontScale(this)

    // The original walked a running x/y; recomputing from the row/column index
    // gives identical positions and stays correct across repeated resizes.
    this.nodes.forEach((node, index) => {
      const column = index % COLUMNS
      const row = Math.floor(index / COLUMNS)
      const x = marginX + columnWidth / 2 + column * (columnWidth + gutterX)
      const y = marginY + rowHeight / 2 + row * (rowHeight + gutterY)

      node.container.setPosition(x, y)
      node.image.setScale(scale)
      node.label.setFontSize(`${Math.round(70 * scale)}px`)
      node.stars.forEach((star) => star.setScale(STAR_SIZE / star.width))
    })

    this.title.setPosition(width / 2, marginY / 2)
    // The original rendered the title at 60px against the live window; the
    // remaster's viewport is taller, so clamp it to the same fraction of height
    // as the original while keeping it clear of the audio button.
    this.title.setFontSize(`${Math.round(60 * font)}px`)

    // Audio button sits at the right margin, vertically centred on the title.
    this.audioButton.layout(width - marginX, marginY / 2)

    // Lift the top row below the title block so the tombstones never collide
    // with it once the heading scales up on tall windows.
    const titleBottom = marginY / 2 + this.title.height / 2
    const rowTop = marginY + rowHeight / 2
    const lift = Math.max(0, titleBottom + 8 - (rowTop - (BUTTON_WIDTH * scale) / 2))
    this.nodes.forEach((node, index) => {
      if (Math.floor(index / COLUMNS) === 0) node.container.y += lift
    })
  }

  private createLevelNode(level: number): LevelNode {
    const unlocked = GameState.isUnlocked(level)
    const container = this.add.container(0, 0)

    const image = this.add
      .image(0, 0, 'others', unlocked ? 'ui_level_button:0' : 'ui_level_button_locked:0')
      .setOrigin(0.5)

    const label = this.add
      .text(0, 0, unlocked ? String(level) : '', {
        fontFamily: FONTS.title,
        fontSize: '70px',
        color: '#595f5f',
      })
      .setOrigin(0.5)

    // Locked tombstones show a padlock in the art instead of a number.
    if (!unlocked) label.setText('')

    const stars: Phaser.GameObjects.Image[] = []
    const earned = GameState.starsFor(level)
    if (unlocked && earned > 0) {
      for (let i = 0; i < earned; i++) {
        const star = this.add
          .image(STAR_X[i] ?? 0, STAR_Y[i] ?? 40, 'others', 'ui_level_score_small:0')
          .setOrigin(0.5)
        stars.push(star)
      }
    }

    // Skulls sit in front of the tombstone, exactly as the original inserted
    // them into the container after the LevelButton.
    container.add([image, label, ...stars])

    if (unlocked) {
      image.setInteractive({ useHandCursor: true })
      image.on('pointerover', () => container.setScale(1.05))
      image.on('pointerout', () => container.setScale(1))
      image.on('pointerup', () => this.enter(level))
    }

    return { container, image, label, stars, unlocked }
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
