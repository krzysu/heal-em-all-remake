import Phaser from 'phaser'
import { TUNING } from '../config'
import type { Player } from './Player'
import type { ZombieSpawn } from '../levels/levels'

/**
 * A walker: the original's only enemy.
 *
 * It patrols its platform, turns at ledges, and chases the player when it
 * spots them in a 350px horizontal band (the original's line of sight). Bullets
 * "heal" it, turning it back into a human — unless it was a human to begin
 * with, in which case it is already beyond help and dies.
 */
export class Zombie extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body

  private lifePoints = 1
  private direction: 1 | -1
  private sightMemoryUntil = 0
  private nextAlertAt = 0
  private wasHumanBefore = false

  constructor(scene: Phaser.Scene, spawn: ZombieSpawn) {
    super(scene, spawn.x, spawn.y, 'characters', 'zombie:0')

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.body.setSize(26, 86).setOffset(12, 13)
    this.body.setMaxVelocity(TUNING.maxFallSpeed, TUNING.maxFallSpeed)
    this.setDepth(20)

    // Original quirk: `startLeft` true means it actually starts walking right.
    this.direction = spawn.startLeft ? 1 : -1
    this.play('zombie:run')
  }

  get wasHuman(): boolean {
    return this.wasHumanBefore
  }

  markWasHuman(): void {
    this.wasHumanBefore = true
  }

  think(time: number, player: Player, solids: Phaser.Tilemaps.TilemapLayer): void {
    if (!this.active) return

    const sight = this.canSee(player)
    if (sight !== 0) {
      this.sightMemoryUntil = time + TUNING.zombieSightMemoryMs

      if (time >= this.nextAlertAt) {
        this.nextAlertAt = time + TUNING.zombieAlertCooldownMs
        this.play('zombie:attack')
        this.emit('alert')
      }

      if (this.direction !== sight) this.direction = sight
    }

    const onGround = this.body.blocked.down || this.body.touching.down
    const aheadX = this.body.center.x + this.direction * (this.body.halfWidth + 6)
    const groundAhead = solids.getTileAtWorldXY(aheadX, this.body.bottom + 6)

    if (!groundAhead && onGround && sight === 0 && time > this.sightMemoryUntil) {
      this.direction = this.direction === 1 ? -1 : 1
    }

    this.setVelocityX(this.direction * TUNING.zombieSpeed)
    this.setFlipX(this.direction < 0)

    if (!this.isPlayingOneShot()) {
      if (this.body.velocity.y !== 0) this.play('zombie:fall', true)
      else this.play('zombie:run', true)
    }
  }

  /** Returns -1 (player to the left), 1 (right) or 0 (not visible). */
  private canSee(player: Player): 1 | -1 | 0 {
    if (!player.active) return 0

    const sameLevel = player.y > this.y - 10 && player.y < this.y + 10
    if (!sameLevel) return 0

    const delta = player.x - this.x
    if (Math.abs(delta) > TUNING.zombieSightRange) return 0
    return delta < 0 ? -1 : 1
  }

  private isPlayingOneShot(): boolean {
    const key = this.anims.currentAnim?.key
    if (key === 'zombie:attack' || key === 'zombie:hit') return this.anims.isPlaying
    return false
  }

  /** Heal a point of zombie-ness. Returns true when the zombie dies. */
  hit(): boolean {
    this.lifePoints -= 1
    if (this.lifePoints > 0) {
      this.play('zombie:hit')
      return false
    }

    this.emit('died', this)
    return true
  }
}
