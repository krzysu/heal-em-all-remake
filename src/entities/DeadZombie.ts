import Phaser from 'phaser'
import { TUNING } from '../config'

/**
 * What is left of a zombie that was once human: it collapses and stays down.
 * Purely cosmetic, but it keeps the level readable.
 */
export class DeadZombie extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'characters', 'zombie:16')

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.body.setSize(30, 24).setOffset(10, 74)
    this.body.setMaxVelocity(TUNING.maxFallSpeed, TUNING.maxFallSpeed)
    this.setDepth(18)

    this.play('zombie:dead')
  }
}
