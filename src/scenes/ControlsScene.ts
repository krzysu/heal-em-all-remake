import Phaser from 'phaser'
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH } from '../config'
import { addMenuBackdrop } from '../ui/layout'
import { createTextButton } from '../ui/buttons'

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
    addMenuBackdrop(this, 0.5)

    this.add
      .text(GAME_WIDTH / 2, 56, "How to heal'em in three steps", {
        fontFamily: FONTS.title,
        fontSize: '46px',
        color: COLORS.title,
      })
      .setOrigin(0.5)

    const columnWidth = 150
    const gap = 40
    const totalWidth = STEPS.length * columnWidth + (STEPS.length - 1) * gap
    const startX = (GAME_WIDTH - totalWidth) / 2 + columnWidth / 2

    STEPS.forEach((step, index) => {
      const x = startX + index * (columnWidth + gap)

      this.add
        .text(x, 118, step.heading, {
          fontFamily: FONTS.body,
          fontSize: '24px',
          color: COLORS.danger,
        })
        .setOrigin(0.5)

      this.add
        .text(x, 150, step.caption, {
          fontFamily: FONTS.body,
          fontSize: '26px',
          color: COLORS.muted,
          align: 'center',
          wordWrap: { width: columnWidth + 20 },
        })
        .setOrigin(0.5)

      const art = this.add.image(x, 224, 'others', step.frame)
      const maxWidth = columnWidth + 20
      if (art.width > maxWidth) {
        art.setScale(maxWidth / art.width)
      }
    })

    createTextButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 46, {
      label: 'Give me some zombies',
      width: 300,
      onClick: () => this.scene.start('LevelSelect'),
    })
  }
}
