import Phaser from 'phaser'
import { COLORS, FONTS, GAME_WIDTH } from '../config'
import { bus, Events, GameState } from '../state/GameState'

/** Screen-space overlay that runs in parallel with the gameplay scene. */
export class HudScene extends Phaser.Scene {
  private statusLabel!: Phaser.GameObjects.Text
  private infoLabel!: Phaser.GameObjects.Text
  private avatar!: Phaser.GameObjects.Image

  private lives = 3
  private bullets = 0
  private zombies = 0
  private hasKey = false

  constructor() {
    super('Hud')
  }

  create(data: { level?: number }): void {
    this.lives = GameState.currentRun?.lives ?? 3
    this.bullets = 0
    this.zombies = 0
    this.hasKey = false

    this.add.rectangle(0, 0, GAME_WIDTH, 30, 0x232322, 0.85).setOrigin(0)

    this.add.text(12, 6, `LEVEL ${data.level ?? 1}`, {
      fontFamily: FONTS.body,
      fontSize: '18px',
      color: COLORS.title,
    })

    // Right-aligned single line so the counters can never overlap.
    this.statusLabel = this.add
      .text(GAME_WIDTH - 12, 6, '', {
        fontFamily: FONTS.body,
        fontSize: '18px',
        color: COLORS.accent,
      })
      .setOrigin(1, 0)

    this.avatar = this.add.image(28, 48, 'hud', 'hud_player:0').setScale(0.5)

    this.infoLabel = this.add
      .text(GAME_WIDTH / 2 + 20, 38, '', {
        fontFamily: FONTS.body,
        fontSize: '16px',
        color: COLORS.title,
        backgroundColor: 'rgba(35,35,34,0.6)',
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0.5, 0)
      .setAlpha(0)

    this.refresh()

    bus.on(Events.livesChanged, this.onLives, this)
    bus.on(Events.bulletsChanged, this.onBullets, this)
    bus.on(Events.zombiesChanged, this.onZombies, this)
    bus.on(Events.keyChanged, this.onKey, this)
    bus.on(Events.playerMode, this.onPlayerMode, this)
    bus.on(Events.info, this.onInfo, this)

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      bus.off(Events.livesChanged, this.onLives, this)
      bus.off(Events.bulletsChanged, this.onBullets, this)
      bus.off(Events.zombiesChanged, this.onZombies, this)
      bus.off(Events.keyChanged, this.onKey, this)
      bus.off(Events.playerMode, this.onPlayerMode, this)
      bus.off(Events.info, this.onInfo, this)
    })
  }

  private refresh(): void {
    const parts = [`LIVES ${this.lives}`, `AMMO ${this.bullets}`, `Z ${this.zombies}`]
    if (this.hasKey) parts.push('KEY')
    this.statusLabel.setText(parts.join('   '))
  }

  private onInfo(message: string): void {
    this.infoLabel.setText(message)
    this.infoLabel.setAlpha(1)
    this.tweens.killTweensOf(this.infoLabel)
    this.tweens.add({
      targets: this.infoLabel,
      alpha: 0,
      delay: 2600,
      duration: 500,
    })
  }

  private onPlayerMode(mode: 'doctor' | 'zombie'): void {
    this.avatar.setFrame(mode === 'zombie' ? 'hud_zombie_player:0' : 'hud_player:0')
  }

  private onLives(value: number): void {
    this.lives = value
    this.refresh()
  }

  private onBullets(value: number): void {
    this.bullets = value
    this.refresh()
  }

  private onZombies(value: number): void {
    this.zombies = value
    this.refresh()
  }

  private onKey(value: boolean): void {
    this.hasKey = value
    this.refresh()
  }
}
