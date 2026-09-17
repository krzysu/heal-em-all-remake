import Phaser from 'phaser'

/**
 * A spitter's projectile. Travels flat, dies on terrain or after its range,
 * and bites the doctor for a life when it connects.
 */
export class Spit extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body

  private readonly startX: number
  private spent = false
  private readonly range: number

  constructor(scene: Phaser.Scene, x: number, y: number, direction: 1 | -1) {
    super(scene, x, y, 'bullet', 'bullet:0')

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.startX = x
    this.range = 300

    this.body.setAllowGravity(false)
    this.body.setSize(11, 8)
    this.setDepth(29)
    this.setTint(0x9be86b)
    this.setFlipX(direction < 0)
    this.setVelocityX(direction * 240)

    this.play('bullet:fly')
  }

  dissipate(): void {
    if (this.spent) return
    this.spent = true
    this.destroy()
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta)

    if (this.spent) return

    // `UpdateList.shutdown` kills active children with `destroy(true)`, which
    // nulls `scene` but can leave this object in the list for one more frame.
    const world = this.scene?.physics?.world
    if (!world) return

    if (Math.abs(this.x - this.startX) > this.range) this.dissipate()
    if (this.y > world.bounds.bottom) this.dissipate()
  }
}
