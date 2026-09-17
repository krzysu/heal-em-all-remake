import Phaser from 'phaser'
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH, TOTAL_LEVELS } from '../config'
import { GameState } from '../state/GameState'
import { createTextButton } from '../ui/buttons'

const COLUMNS = 3

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelect')
  }

  create(): void {
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'background').setOrigin(0).setAlpha(0.4)
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1d2430, 0.55).setOrigin(0)

    this.add
      .text(GAME_WIDTH / 2, 40, 'Everything begins here!', {
        fontFamily: FONTS.title,
        fontSize: '46px',
        color: COLORS.title,
      })
      .setOrigin(0.5)

    const gapX = 168
    const gapY = 124
    const startX = GAME_WIDTH / 2 - gapX
    const startY = 134

    for (let level = 1; level <= TOTAL_LEVELS; level++) {
      const index = level - 1
      const column = index % COLUMNS
      const row = Math.floor(index / COLUMNS)
      this.createLevelNode(level, startX + column * gapX, startY + row * gapY)
    }

    createTextButton(this, 84, GAME_HEIGHT - 32, {
      label: 'Back',
      width: 110,
      height: 40,
      fontSize: 22,
      fill: COLORS.muted,
      onClick: () => this.scene.start('Start'),
    })
  }

  private createLevelNode(level: number, x: number, y: number): void {
    const unlocked = GameState.isUnlocked(level)
    const texture = unlocked ? 'ui_level_button:0' : 'ui_level_button_locked:0'
    const scale = 0.56

    const image = this.add.image(x, y, 'others', texture).setScale(scale)
    if (!unlocked) {
      image.setTint(0x5a6270)
    }

    this.add
      .text(x, y - 6, String(level), {
        fontFamily: FONTS.title,
        fontSize: '44px',
        color: unlocked ? COLORS.ink : '#7b8492',
      })
      .setOrigin(0.5)

    const stars = GameState.starsFor(level)
    if (stars > 0) {
      const spacing = 22
      const firstX = x - ((stars - 1) * spacing) / 2
      for (let i = 0; i < stars; i++) {
        this.add.image(firstX + i * spacing, y + 34, 'others', 'ui_level_score_small:0').setScale(0.6)
      }
    }

    if (!unlocked) return

    image.setInteractive({ useHandCursor: true })
    image.on('pointerover', () => image.setScale(scale * 1.06))
    image.on('pointerout', () => image.setScale(scale))
    image.on('pointerup', () => this.scene.start('Game', { level }))
  }
}
