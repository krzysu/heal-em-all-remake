import Phaser from 'phaser'
import type { ItemKind, ItemSpawn } from '../levels/levels'

const FRAME: Record<ItemKind, string> = {
  key: 'key:0',
  gun: 'gun:0',
  health: 'health:0',
  door: 'door_closed:0',
  exit_sign: 'exit_sign:0',
}

/**
 * The original nudged floating pickups up 15px and centred the tall door and
 * sign on their tile. Kept identical so the levels read the same.
 */
const Y_OFFSET: Record<ItemKind, number> = {
  key: -15,
  gun: -15,
  health: -15,
  door: -30,
  exit_sign: 4,
}

/**
 * Generic level pickup. Behaviour lives in the scene, which switches on `kind`;
 * this owns only presentation and the door's opened state.
 */
export class Item extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.StaticBody

  readonly kind: ItemKind
  bullets = 0
  opened = false

  constructor(scene: Phaser.Scene, spawn: ItemSpawn) {
    super(scene, spawn.x, spawn.y + Y_OFFSET[spawn.kind], 'items', FRAME[spawn.kind])

    this.kind = spawn.kind
    this.bullets = spawn.bullets ?? 0

    scene.add.existing(this)
    scene.physics.add.existing(this, true)
    this.setDepth(10)
  }

  open(): void {
    this.opened = true
    this.setFrame('door_open:0')
    this.body.updateFromGameObject()
  }
}
