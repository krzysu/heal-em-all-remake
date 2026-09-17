import Phaser from 'phaser'
import { COLORS, TILE_SIZE } from '../config'
import { bus, Events, GameState } from '../state/GameState'
import { Player } from '../entities/Player'

const WORLD_WIDTH = 2560
const WORLD_HEIGHT = 720

interface Slab {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Phase 1 playable teaser.
 *
 * This is intentionally NOT the real level pipeline — it hand-builds a flat
 * strip so we can validate the asset conversion, Arcade physics, camera and
 * HUD plumbing. PHASE 2 replaces all of this with the Tiled level loader and
 * the real entity set.
 */
export class GameScene extends Phaser.Scene {
  private player!: Player
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private keyA!: Phaser.Input.Keyboard.Key
  private keyD!: Phaser.Input.Keyboard.Key
  private keyW!: Phaser.Input.Keyboard.Key
  private solids: Phaser.GameObjects.GameObject[] = []
  private level = 1

  constructor() {
    super('Game')
  }

  create(data: { level?: number }): void {
    this.level = data.level ?? 1
    GameState.startRun(this.level)

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    this.cameras.main.setBackgroundColor(COLORS.bg)

    this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 'background').setOrigin(0).setAlpha(0.5)

    const groundTop = WORLD_HEIGHT - TILE_SIZE
    this.addSlab({ x: 0, y: groundTop, width: WORLD_WIDTH, height: TILE_SIZE })
    this.addSlab({ x: 380, y: groundTop - 130, width: 210, height: 28 })
    this.addSlab({ x: 720, y: groundTop - 240, width: 150, height: 28 })
    this.addSlab({ x: 1080, y: groundTop - 150, width: 260, height: 28 })
    this.addSlab({ x: 1500, y: groundTop - 300, width: 180, height: 28 })

    this.player = new Player(this, 140, groundTop - 120)
    for (const solid of this.solids) {
      this.physics.add.collider(this.player, solid)
    }

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12)

    const keyboard = this.input.keyboard
    if (keyboard) {
      this.cursors = keyboard.createCursorKeys()
      this.keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
      this.keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
      this.keyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W)
      keyboard.on('keydown-ESC', () => this.scene.start('LevelSelect'))
      keyboard.on('keydown-R', () => this.scene.restart({ level: this.level }))
    }

    this.scene.launch('Hud', { level: this.level })

    bus.emit(Events.livesChanged, GameState.currentRun?.lives ?? 3)
    bus.emit(Events.bulletsChanged, 0)
    bus.emit(Events.zombiesChanged, 0)
    bus.emit(Events.keyChanged, false)

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.stop('Hud')
      this.solids = []
    })
  }

  override update(time: number): void {
    if (!this.cursors) return

    const left = this.cursors.left.isDown || this.keyA.isDown
    const right = this.cursors.right.isDown || this.keyD.isDown
    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.keyW)

    this.player.move({ left, right, jumpPressed }, time)
  }

  private addSlab(slab: Slab): void {
    const body = this.add
      .rectangle(
        slab.x + slab.width / 2,
        slab.y + slab.height / 2,
        slab.width,
        slab.height,
        Phaser.Display.Color.HexStringToColor(COLORS.panel).color,
      )
      .setStrokeStyle(2, 0x000000, 0.3)

    this.physics.add.existing(body, true)
    this.solids.push(body)
  }
}
