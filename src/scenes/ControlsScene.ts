import Phaser from 'phaser'
import { COLORS, FONTS } from '../config'
import { addMenuBackdrop, fontScale, onLayout } from '../ui/layout'
import { createTextButton } from '../ui/buttons'

/**
 * Port of `controls.coffee` — the tutorial screen the remaster was missing
 * entirely. Three columns laid out with the original's percentages: 20% side
 * margins, 8% gutters, 24% wide columns, the title at a quarter-height margin.
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
  private title!: Phaser.GameObjects.Text
  private headings: Phaser.GameObjects.Text[] = []
  private captions: Phaser.GameObjects.Text[] = []
  private art: Phaser.GameObjects.Image[] = []
  private button!: ReturnType<typeof createTextButton>

  constructor() {
    super('Controls')
  }

  create(): void {
    addMenuBackdrop(this)
    this.headings = []
    this.captions = []
    this.art = []

    this.title = this.add
      .text(0, 0, "How to heal'em in three steps", {
        fontFamily: FONTS.title,
        fontSize: '60px',
        color: COLORS.title,
      })
      .setOrigin(0.5)

    for (const step of STEPS) {
      this.headings.push(
        this.add
          .text(0, 0, step.heading, {
            fontFamily: FONTS.body,
            fontSize: '26px',
            color: COLORS.danger,
          })
          .setOrigin(0.5),
      )
      this.captions.push(
        this.add
          .text(0, 0, step.caption, {
            fontFamily: FONTS.body,
            fontSize: '30px',
            color: COLORS.muted,
            align: 'center',
          })
          .setOrigin(0.5),
      )
      this.art.push(this.add.image(0, 0, 'others', step.frame).setOrigin(0.5))
    }

    this.button = createTextButton(this, 0, 0, {
      label: 'Give me some zombies',
      width: 320,
      height: 70,
      fill: COLORS.accent,
      onClick: () => this.scene.start('Game', { level: 1 }),
    })

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
    this.title.setFontSize(`${Math.round(60 * font)}px`)

    const firstX = marginX + columnWidth / 2
    this.headings.forEach((heading, index) => {
      const x = firstX + index * (columnWidth + gutterX)
      heading.setPosition(x, height / 2 - 140)
      heading.setFontSize(`${Math.round(26 * font)}px`)

      this.captions[index]?.setPosition(x, height / 2 - 100)
      this.captions[index]?.setFontSize(`${Math.round(30 * font)}px`)
      this.captions[index]?.setWordWrapWidth(columnWidth)

      const art = this.art[index]
      if (!art) return
      // The original drew each control diagram at its native size, centred in
      // the column; only shrink if the column is narrower than the art.
      const scale = Math.min(1, (columnWidth * 1.1) / art.width) * font
      art.setPosition(x, height / 2 + 30).setScale(scale)
    })

    this.button.layout(width / 2, height - marginY, width / 2, 70, 58 * font)
  }
}
