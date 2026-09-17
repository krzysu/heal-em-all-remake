import Phaser from 'phaser'
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH, TOTAL_LEVELS } from '../config'
import { GameState } from '../state/GameState'
import { addMenuBackdrop } from '../ui/layout'
import { createTextButton } from '../ui/buttons'

export class LevelSummaryScene extends Phaser.Scene {
  constructor() {
    super('LevelSummary')
  }

  create(): void {
    const run = GameState.currentRun
    const level = run?.level ?? 1
    const hasNext = level < TOTAL_LEVELS

    addMenuBackdrop(this, 0.6)

    this.add
      .text(GAME_WIDTH / 2, 46, 'Well done!', {
        fontFamily: FONTS.title,
        fontSize: '56px',
        color: COLORS.title,
      })
      .setOrigin(0.5)

    const lines = [
      `Level ${level} complete`,
      `Health collected: ${run?.healthCollected ?? 0}/${run?.healthAvailable ?? 0}`,
      `Zombies healed: ${run?.zombiesHealed ?? 0}/${run?.zombiesAvailable ?? 0}`,
      `Bullets wasted: ${run?.bulletsWasted ?? 0}/${run?.bulletsAvailable ?? 0}`,
      `Zombie Mode: ${run?.zombieModeFound ? 'found' : 'not found'}`,
    ]

    this.add
      .text(GAME_WIDTH / 2, 152, lines.join('\n'), {
        fontFamily: FONTS.body,
        fontSize: '22px',
        color: COLORS.accent,
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5)

    this.addStars(GameState.starsFor(level))

    createTextButton(this, GAME_WIDTH / 2 - 118, GAME_HEIGHT - 52, {
      label: 'All levels',
      width: 200,
      height: 48,
      fill: COLORS.title,
      onClick: () => this.scene.start('LevelSelect'),
    })

    if (hasNext) {
      createTextButton(this, GAME_WIDTH / 2 + 118, GAME_HEIGHT - 52, {
        label: 'Play next',
        width: 200,
        height: 48,
        onClick: () => this.scene.start('Game', { level: level + 1 }),
      })
    } else {
      createTextButton(this, GAME_WIDTH / 2 + 118, GAME_HEIGHT - 52, {
        label: 'The end',
        width: 200,
        height: 48,
        fill: COLORS.danger,
        onClick: () => this.scene.start('End'),
      })
    }
  }

  private addStars(earned: number): void {
    const spacing = 46
    const firstX = GAME_WIDTH / 2 - spacing
    for (let index = 0; index < 3; index++) {
      const frame = index < earned ? 'ui_level_score:0' : 'ui_level_score_empty:0'
      this.add.image(firstX + index * spacing, 262, 'others', frame).setScale(0.44)
    }
  }
}
