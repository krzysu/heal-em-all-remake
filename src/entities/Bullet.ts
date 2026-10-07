import Phaser from 'phaser'
import { TUNING } from '../config'
import type { Player } from './Player'

export interface BulletOptions {
  /** Rounds are flat by default; the spread shot fans them out. */
  angleDeg?: number
  /** Hits this round counts for. A charged round punches armour. */
  power?: number
  heavy?: boolean
}

/**
 * The doctor's healing round.
 *
 * Travels flat and fast, dies when it hits terrain, reaches its range, or
 * leaves the map. Only hitting a zombie is "productive"; everything else
 * counts as wasted ammo on the level summary.
 */
export class Bullet extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body

  /** Hits this round deals when it lands. 1 normally, 3 when charged. */
  readonly power: number

  private readonly startX: number
  private spent = false

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    direction: 1 | -1,
    options: BulletOptions = {},
  ) {
    super(scene, x, y, 'bullet', 'bullet:0')

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.power = options.power ?? 1
    this.startX = x
    this.body.setAllowGravity(false)
    this.body.setSize(11, 8)
    this.setDepth(30)
    this.setFlipX(direction < 0)

    const angle = Phaser.Math.DegToRad(options.angleDeg ?? 0)
    const vx = Math.cos(angle) * TUNING.bulletSpeed * direction
    const vy = Math.sin(angle) * TUNING.bulletSpeed
    this.setVelocity(vx, vy)

    if (options.heavy) {
      this.setScale(1.8)
      this.setTint(0xfff2a0)
    }

    this.play('bullet:fly')
  }

  /** Wasted on terrain/range/map edge. */
  dissipate(): void {
    if (this.spent) return
    this.spent = true
    this.emit('wasted', this)
    this.destroy()
  }

  /** Hit a zombie: no ammo is wasted. */
  consume(): void {
    if (this.spent) return
    this.spent = true
    this.destroy()
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta)

    if (this.spent) return

    // `UpdateList.shutdown` can leave a destroyed object in the update list for
    // one more frame, with `scene` already nulled.
    const world = this.scene?.physics?.world
    if (!world) return

    if (Math.abs(this.x - this.startX) > TUNING.bulletRange) {
      this.dissipate()
      return
    }

    const bounds = world.bounds
    if (this.x < bounds.left || this.x > bounds.right || this.y < bounds.top) {
      this.dissipate()
    }
  }

  /** Convenience for the scene's overlap handlers. */
  static spawnFor(scene: Phaser.Scene, player: Player, options: BulletOptions = {}): Bullet {
    const muzzleX = player.x + player.facing * 15
    return new Bullet(scene, muzzleX, player.y + 3, player.facing, options)
  }
}
