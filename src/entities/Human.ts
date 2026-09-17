import Phaser from 'phaser'
import { TUNING } from '../config'

/**
 * A cured zombie, now a very relieved human.
 *
 * It is harmless but fragile: after a short grace period any zombie that
 * touches it re-infects it, so the player has to keep them alive.
 */
export class Human extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body

  private invincibleUntil: number
  private reverting = false
  private infectedByPlayer = false

  constructor(scene: Phaser.Scene, x: number, y: number, invincibleMs = TUNING.humanInvincibleMs) {
    super(scene, x, y, 'characters', 'human:0')

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.body.setSize(26, 86).setOffset(12, 13)
    this.body.setMaxVelocity(TUNING.maxFallSpeed, TUNING.maxFallSpeed)
    this.setDepth(20)

    this.invincibleUntil = scene.time.now + invincibleMs
    this.play('human:intro')
    this.once('animationcomplete-human:intro', () => {
      if (this.active) this.play('human:stand')
    })
  }

  get isInvincible(): boolean {
    return this.scene.time.now < this.invincibleUntil
  }

  /**
   * Re-infected and starts the outro, then emits `reverted` with whether the
   * zombie-mode player caused it. A zombie player ignores the grace period.
   */
  infect(byZombiePlayer = false): void {
    if (this.reverting) return
    if (!byZombiePlayer && this.isInvincible) return

    this.reverting = true
    this.infectedByPlayer = byZombiePlayer

    this.play('human:outro')
    this.once('animationcomplete-human:outro', () => {
      this.emit('reverted', this, this.infectedByPlayer)
      this.destroy()
    })
  }
}
