import Phaser from 'phaser'
import { TUNING } from '../config'
import type { Player } from './Player'
import type { EnemyArchetype, ZombieSpawn } from '../levels/levels'

interface ArchetypeConfig {
  speed: number
  lifePoints: number
  tint: number
  sightRange: number
  /** Vertical tolerance for "same level" line of sight. */
  sightTolerance: number
  ranged: boolean
}

/**
 * The four zombie archetypes. The walker is the original enemy; the rest are
 * the remaster's escalation. Brutes wear the player's bullets, spitters punish
 * camping, runners close gaps fast.
 */
const ARCHETYPES: Record<EnemyArchetype, ArchetypeConfig> = {
  walker: {
    speed: TUNING.zombieSpeed,
    lifePoints: 1,
    tint: 0xffffff,
    sightRange: TUNING.zombieSightRange,
    sightTolerance: 10,
    ranged: false,
  },
  runner: {
    speed: 150,
    lifePoints: 1,
    tint: 0xbfe6ff,
    sightRange: 420,
    sightTolerance: 14,
    ranged: false,
  },
  brute: {
    speed: 42,
    lifePoints: 3,
    tint: 0xc9a3ff,
    sightRange: TUNING.zombieSightRange,
    sightTolerance: 10,
    ranged: false,
  },
  spitter: {
    speed: 0,
    lifePoints: 1,
    tint: 0xffc98a,
    sightRange: 520,
    sightTolerance: 44,
    ranged: true,
  },
}

/**
 * A zombie: walks its platform, turns at ledges, and reacts to the player it
 * can "see" in a horizontal band. Bullets heal it back into a human, unless it
 * was a human to begin with, in which case it is beyond help.
 */
export class Zombie extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body

  readonly archetype: EnemyArchetype
  private readonly config: ArchetypeConfig
  private lifePoints: number
  private direction: 1 | -1
  private sightMemoryUntil = 0
  private nextAlertAt = 0
  private nextSpitAt = 0
  private wasHumanBefore = false

  constructor(scene: Phaser.Scene, spawn: ZombieSpawn) {
    super(scene, spawn.x, spawn.y, 'characters', 'zombie:0')

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.archetype = spawn.archetype ?? 'walker'
    this.config = ARCHETYPES[this.archetype]
    this.lifePoints = this.config.lifePoints

    this.body.setSize(26, 86).setOffset(12, 13)
    this.body.setMaxVelocity(TUNING.maxFallSpeed, TUNING.maxFallSpeed)
    this.setDepth(20)
    if (this.config.tint !== 0xffffff) this.setTint(this.config.tint)

    // Original quirk: `startLeft` true means it actually starts walking right.
    this.direction = spawn.startLeft ? 1 : -1

    if (this.config.ranged) {
      this.anims.stop()
      this.setFrame('zombie:0')
    } else {
      this.play('zombie:run')
    }
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
        this.emit('alert')
      }
      if (this.direction !== sight) this.direction = sight
    }

    if (this.config.ranged) {
      this.setVelocityX(0)
      this.setFlipX(this.direction < 0)
      this.updateRanged(time, sight !== 0)
      return
    }

    const onGround = this.body.blocked.down || this.body.touching.down
    const aheadX = this.body.center.x + this.direction * (this.body.halfWidth + 6)
    const groundAhead = solids.getTileAtWorldXY(aheadX, this.body.bottom + 6)

    if (!groundAhead && onGround && sight === 0 && time > this.sightMemoryUntil) {
      this.direction = this.direction === 1 ? -1 : 1
    }

    this.setVelocityX(this.direction * this.config.speed)
    this.setFlipX(this.direction < 0)

    if (!this.isPlayingOneShot()) {
      if (this.body.velocity.y !== 0) this.play('zombie:fall', true)
      else this.play('zombie:run', true)
    }
  }

  /** Spitters hold position, face the player, and lob a projectile on a timer. */
  private updateRanged(time: number, seesPlayer: boolean): void {
    if (this.isPlayingOneShot()) return

    if (seesPlayer && time >= this.nextSpitAt) {
      this.nextSpitAt = time + 2200
      this.play('zombie:attack')
      this.emit('spit', this.direction)
      return
    }

    if (this.anims.isPlaying) {
      this.anims.stop()
      this.setFrame('zombie:0')
    }
  }

  /** Returns -1 (player to the left), 1 (right) or 0 (not visible). */
  private canSee(player: Player): 1 | -1 | 0 {
    if (!player.active) return 0

    const tolerance = this.config.sightTolerance
    const sameLevel = player.y > this.y - tolerance && player.y < this.y + tolerance
    if (!sameLevel) return 0

    const delta = player.x - this.x
    if (Math.abs(delta) > this.config.sightRange) return 0
    return delta < 0 ? -1 : 1
  }

  private isPlayingOneShot(): boolean {
    const key = this.anims.currentAnim?.key
    if (key === 'zombie:attack' || key === 'zombie:hit') return this.anims.isPlaying
    return false
  }

  /** Damage the zombie. Returns true when it finally goes down. */
  hit(): boolean {
    this.lifePoints -= 1
    if (this.lifePoints > 0) {
      this.play('zombie:hit')
      // Brutes flinch but survive; a quick flash sells the armour.
      this.setAlpha(0.35)
      this.scene.tweens.add({ targets: this, alpha: 1, duration: 110 })
      return false
    }

    this.emit('died', this)
    return true
  }
}
