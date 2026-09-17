import Phaser from 'phaser'
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH, TOTAL_LEVELS } from '../config'
import { GameState } from '../state/GameState'
import { createTextButton } from '../ui/buttons'

export class LevelSummaryScene extends Phaser.Scene {
  constructor() {
    super('LevelSummary')
  }

  create(): void {
    const run = GameState.currentRun
    const level = run?.level ?? 1
    const hasNext = level < TOTAL_LEVELS

    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'background').setOrigin(0).setAlpha(0.4)
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1d2430, 0.6).setOrigin(0)

    this.add
      .text(GAME_WIDTH / 2, 70, 'Well done!', {
        fontFamily: FONTS.title,
        fontSize: '72px',
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
      .text(GAME_WIDTH / 2, 150, lines.join('\n'), {
        fontFamily: FONTS.body,
        fontSize: '22px',
        color: COLORS.accent,
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5)

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
}
