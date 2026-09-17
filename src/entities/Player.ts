import Phaser from 'phaser'
import { TUNING } from '../config'

/**
 * Placeholder player for the Phase 1 playable teaser.
 *
 * PHASE 2: grow this into the full character — coyote time, jump buffering and
 * variable jump height are already stubbed in `move()` and should be wired to
 * real timers, along with dash, weapons and the zombie-mode state machine.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body

  private lastGroundedAt = 0
  private jumpQueuedAt = Number.NEGATIVE_INFINITY

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'characters', 'player:1')

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setCollideWorldBounds(true)
    // Tighten the body against the 50x100 frame so feet sit on the floor.
    this.body.setSize(26, 86).setOffset(12, 13)

    this.play('player:stand')
  }

  /** Called from the scene's update loop. */
  move(input: { left: boolean; right: boolean; jumpPressed: boolean }, time: number): void {
    const onFloor = this.body.blocked.down || this.body.touching.down
    if (onFloor) {
      this.lastGroundedAt = time
    }

    if (input.jumpPressed) {
      this.jumpQueuedAt = time
    }

    const wantJump = time - this.jumpQueuedAt <= TUNING.jumpBufferMs
    const canJump = time - this.lastGroundedAt <= TUNING.coyoteTimeMs

    if (wantJump && canJump) {
      this.setVelocityY(TUNING.jumpVelocity)
      this.jumpQueuedAt = Number.NEGATIVE_INFINITY
      this.lastGroundedAt = Number.NEGATIVE_INFINITY
    }

    if (input.left === input.right) {
      this.setVelocityX(0)
    } else {
      this.setVelocityX(input.left ? -TUNING.moveSpeed : TUNING.moveSpeed)
      this.setFlipX(input.left)
    }

    // Animation state. PHASE 2: replace with the full state machine.
    if (!onFloor) {
      this.play('player:jump', true)
    } else if (this.body.velocity.x !== 0) {
      this.play('player:run', true)
    } else {
      this.play('player:stand', true)
    }
  }
}
