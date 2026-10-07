import Phaser from 'phaser'
import { TUNING } from '../config'
import type { AbilityId } from '../levels/abilities'

export interface PlayerInput {
  left: boolean
  right: boolean
  jumpPressed: boolean
  jumpHeld: boolean
  dashPressed?: boolean
}

export type PlayerMode = 'doctor' | 'zombie'

/**
 * The doctor, and the thing he becomes when he runs out of lives.
 *
 * Movement is a modern action-platformer take on the original: coyote time,
 * jump buffering, variable jump height and a double jump, on top of the
 * original's speed (330) and reach. Zombie Mode swaps the sprite, drops the
 * gun and the double jump, and slows him down — a temporary, disempowering
 * state he has to escape by falling off the map.
 *
 * The double jump and the dash are tools, not starting abilities: the rooms
 * hand them out (see `levels/abilities.ts`), so `setTools` decides what this
 * run may do.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body

  /** 1 = facing right, -1 = facing left. */
  facing: 1 | -1 = 1
  armed = false

  mode: PlayerMode = 'doctor'
  /** True once the player has come back from Zombie Mode this run. */
  wasZombie = false

  private tools: ReadonlySet<AbilityId> = new Set()
  private lastGroundedAt = Number.NEGATIVE_INFINITY
  private jumpQueuedAt = Number.NEGATIVE_INFINITY
  private jumpsUsed = 0
  private jumpCutApplied = false
  private invincibleUntil = 0
  private hurtUntil = 0
  private zombieReady = false
  private dashUntil = 0
  private dashReadyAt = 0
  private dashDirection: 1 | -1 = 1
  private dashesUsed = 0

  /** Set by the scene: spawns a bullet at the muzzle. */
  onFire?: (x: number, y: number, direction: 1 | -1) => void

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'characters', 'player:1')

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setCollideWorldBounds(true)
    this.body.setSize(26, 86).setOffset(12, 13)
    this.body.setMaxVelocity(TUNING.maxFallSpeed, TUNING.maxFallSpeed)
    this.setDepth(100)

    this.play('player:stand')
  }

  /** Tools this run owns. Set once, on level create. */
  setTools(tools: ReadonlySet<AbilityId>): void {
    this.tools = tools
  }

  get hasDash(): boolean {
    return this.tools.has('dash') && !this.isZombie
  }

  get isDashing(): boolean {
    return this.scene.time.now < this.dashUntil
  }

  /** Jumps allowed before touching the ground: 2 only with the double jump. */
  get maxJumps(): number {
    if (this.isZombie) return TUNING.zombiePlayerMaxJumps
    return this.tools.has('doubleJump') ? TUNING.maxJumps : 1
  }

  get isOnGround(): boolean {
    return this.body.blocked.down || this.body.touching.down
  }

  get isZombie(): boolean {
    return this.mode === 'zombie'
  }

  get isInvincible(): boolean {
    return this.scene.time.now < this.invincibleUntil
  }

  /**
   * Air dash: a short burst with i-frames, one per airtime, on a cooldown.
   * In the air it cancels the fall, so the doctor floats across the rift the
   * later rooms are built around. Returns true when the dash actually started.
   */
  dash(time: number, direction: 1 | -1): boolean {
    if (!this.hasDash || time < this.dashReadyAt) return false
    if (!this.isOnGround && this.dashesUsed >= 1) return false

    this.dashDirection = direction
    this.dashUntil = time + TUNING.dashMs
    this.dashReadyAt = time + TUNING.dashCooldownMs
    this.invincibleUntil = Math.max(this.invincibleUntil, time + TUNING.dashInvincibleMs)
    this.setVelocityX(direction * TUNING.dashSpeed)
    if (!this.isOnGround) this.setVelocityY(Math.min(this.body.velocity.y, 0))
    this.setFlipX(direction < 0)
    this.facing = direction < 0 ? -1 : 1
    this.dashesUsed += 1
    return true
  }

  move(input: PlayerInput, time: number): void {
    const onFloor = this.isOnGround
    if (onFloor) {
      this.lastGroundedAt = time
      this.jumpsUsed = 0
      this.jumpCutApplied = false
      this.dashesUsed = 0
    }

    const controllable = !this.isZombie || this.zombieReady

    if (this.isDashing) {
      // The dash owns horizontal motion for its duration.
      this.setVelocityX(this.dashDirection * TUNING.dashSpeed)
      this.updateAnimation(onFloor, time)
      return
    }

    if (controllable && input.jumpPressed) this.jumpQueuedAt = time
    if (controllable && input.dashPressed) {
      const toward = (input.right ? 1 : 0) - (input.left ? 1 : 0)
      this.dash(time, toward === 0 ? this.facing : toward < 0 ? -1 : 1)
    }

    const speed = this.isZombie ? TUNING.zombiePlayerSpeed : TUNING.moveSpeed
    const jumpVelocity = this.isZombie ? TUNING.zombiePlayerJump : TUNING.jumpVelocity
    const maxJumps = this.maxJumps

    const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0)
    if (controllable && direction !== 0) {
      this.setVelocityX(direction * speed)
      this.setFlipX(direction < 0)
      this.facing = direction < 0 ? -1 : 1
    } else {
      this.setVelocityX(0)
    }

    // Releasing jump early trims the arc (once per jump, while rising).
    if (
      controllable &&
      !input.jumpHeld &&
      !this.jumpCutApplied &&
      this.jumpsUsed > 0 &&
      this.body.velocity.y < 0
    ) {
      this.setVelocityY(this.body.velocity.y * TUNING.jumpCutMultiplier)
      this.jumpCutApplied = true
    }

    const buffered = controllable && time - this.jumpQueuedAt <= TUNING.jumpBufferMs
    if (buffered) {
      const withinCoyote = onFloor || time - this.lastGroundedAt <= TUNING.coyoteTimeMs
      if (this.jumpsUsed === 0) {
        // Full-strength jump while grounded or inside the coyote window,
        // otherwise the press spends the first jump as a weaker air jump. With
        // no double jump that air jump does not exist: the press is dropped.
        if (withinCoyote || maxJumps > 1) {
          this.performJump(withinCoyote ? jumpVelocity : TUNING.doubleJumpVelocity)
        }
      } else if (this.jumpsUsed < maxJumps) {
        this.performJump(TUNING.doubleJumpVelocity)
      }
    }

    this.updateAnimation(onFloor, time)
  }

  /** Briefly flash after taking a hit. Returns false if already invincible. */
  startInvincibility(time: number): boolean {
    if (time < this.invincibleUntil) return false

    this.invincibleUntil = time + TUNING.invincibleMs
    this.hurtUntil = time + 260
    this.playIfExists(this.animationKey('hit'))
    this.scene.tweens.add({
      targets: this,
      alpha: { from: 0.25, to: 1 },
      duration: 140,
      repeat: 3,
      yoyo: true,
      onComplete: () => this.setAlpha(1),
    })
    return true
  }

  equipGun(): void {
    if (this.isZombie) return
    this.armed = true
    this.updateAnimation(this.body.blocked.down, this.scene.time.now)
  }

  /** Bitten: turn into the zombie form. Control unlocks after the intro. */
  enterZombieMode(): void {
    this.mode = 'zombie'
    this.armed = false
    this.zombieReady = false
    this.jumpsUsed = 0

    this.setTexture('characters', 'zombie_player:0')
    this.play('zombiePlayer:intro')
    this.once('animationcomplete-zombiePlayer:intro', () => {
      if (!this.active) return
      this.zombieReady = true
      this.play('zombiePlayer:stand')
    })
  }

  /** Back to the doctor after Zombie Mode ends. */
  exitZombieMode(): void {
    this.mode = 'doctor'
    this.wasZombie = true
    this.zombieReady = false
    this.setTexture('characters', 'player:1')
    this.play('player:stand')
  }

  private performJump(velocity: number): void {
    this.setVelocityY(velocity)
    this.jumpsUsed += 1
    this.jumpQueuedAt = Number.NEGATIVE_INFINITY
    this.jumpCutApplied = false
  }

  private animationKey(state: 'stand' | 'run' | 'jump' | 'hit'): string {
    if (this.isZombie) return `zombiePlayer:${state}`
    return this.armed ? `playerGun:${state}` : `player:${state}`
  }

  private playIfExists(key: string, ignoreIfPlaying = true): void {
    if (this.scene.anims.exists(key)) this.play(key, ignoreIfPlaying)
  }

  private updateAnimation(onFloor: boolean, time: number): void {
    if (time < this.hurtUntil) return
    if (this.isZombie && !this.zombieReady) return

    if (!onFloor) {
      this.playIfExists(this.animationKey('jump'))
    } else if (Math.abs(this.body.velocity.x) > 10) {
      this.playIfExists(this.animationKey('run'))
    } else {
      this.playIfExists(this.animationKey('stand'))
    }
  }
}
