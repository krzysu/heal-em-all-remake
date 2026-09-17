import Phaser from 'phaser'
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TILE_SIZE, TUNING } from '../config'
import { bus, Events, GameState, type RunState } from '../state/GameState'
import { Player } from '../entities/Player'
import { Zombie } from '../entities/Zombie'
import { Human } from '../entities/Human'
import { DeadZombie } from '../entities/DeadZombie'
import { Bullet } from '../entities/Bullet'
import { Item } from '../entities/Item'
import { parseTmx, toTileIndices, type TmxMap } from '../levels/tmx'
import { getLevelSpawns, type ItemSpawn, type Point, type ZombieSpawn } from '../levels/levels'

/**
 * The vertical slice: a real Tiled level, fully playable.
 *
 * Pipeline: cached TMX text -> `parseTmx` -> Phaser array tilemap (collision)
 * plus a decoration layer, then entities spawned from the per-level tables in
 * `levels.ts`. Everything is wired by hand in `update()` rather than through
 * physics groups so each interaction is explicit and cheap.
 */
export class GameScene extends Phaser.Scene {
  private level = 1
  private run!: RunState
  private tmx!: TmxMap
  private solids!: Phaser.Tilemaps.TilemapLayer
  private mapHeightPx = 0
  private spawnPoint!: Point

  private player!: Player
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private keyA!: Phaser.Input.Keyboard.Key
  private keyD!: Phaser.Input.Keyboard.Key
  private keyW!: Phaser.Input.Keyboard.Key
  private keyFire!: Phaser.Input.Keyboard.Key

  private zombies: Zombie[] = []
  private humans: Human[] = []
  private deadZombies: DeadZombie[] = []
  private bullets: Bullet[] = []
  private items: Item[] = []
  private door: Item | null = null

  private nextFireAt = 0
  private doorPrompted = false
  private finished = false
  private jumpQueued = false
  private music?: Phaser.Sound.BaseSound

  constructor() {
    super('Game')
  }

  create(data: { level?: number }): void {
    this.level = data.level ?? 1
    this.run = GameState.startRun(this.level)
    this.resetCollections()

    const xml = this.cache.text.get(`level${this.level}`) as string | undefined
    if (!xml) {
      console.error(`[GameScene] no map loaded for level ${this.level}`)
      this.scene.start('LevelSelect')
      return
    }

    this.tmx = parseTmx(xml)
    this.buildLevel()
    this.spawnEntities(getLevelSpawns(this.level, this.tmx))
    this.bindInput()

    this.scene.launch('Hud', { level: this.level })
    this.publishRunState()
    bus.emit(Events.info, 'I need to find the way out of here')

    this.music = this.sound.add('playerBg', { loop: true, volume: 0.4 })
    this.music.play()

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.music?.stop()
      this.scene.stop('Hud')
    })
  }

  override update(time: number): void {
    if (!this.player || !this.player.active) return

    const jumpPressed = this.jumpQueued
    this.jumpQueued = false

    const jumpHeld =
      this.cursors.up.isDown || this.cursors.space.isDown || this.keyW.isDown

    this.player.move(
      {
        left: this.cursors.left.isDown || this.keyA.isDown,
        right: this.cursors.right.isDown || this.keyD.isDown,
        jumpPressed,
        jumpHeld,
      },
      time,
    )

    this.handleWeapon(time)
    this.updateItems()
    this.updateZombies(time)
    this.updateBullets()
    this.updateHumans()
    this.handleDoor(jumpPressed)
    this.checkFallOut(time)
  }

  // ---------------------------------------------------------------- level ---

  private resetCollections(): void {
    this.zombies = []
    this.humans = []
    this.deadZombies = []
    this.bullets = []
    this.items = []
    this.door = null
    this.nextFireAt = 0
    this.doorPrompted = false
    this.finished = false
    this.jumpQueued = false
  }

  private buildLevel(): void {
    const collision = this.tmx.layers.find((layer) => layer.name === 'collision')
    if (!collision) throw new Error(`level ${this.level} has no collision layer`)

    const map = this.make.tilemap({
      data: toTileIndices(collision.tiles),
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    })
    const tileset = map.addTilesetImage('map_tiles_70', 'map_tiles', TILE_SIZE, TILE_SIZE)
    if (!tileset) throw new Error('failed to link the map tileset')

    const solids = map.createLayer(0, tileset, 0, 0) as Phaser.Tilemaps.TilemapLayer | null
    if (!solids) throw new Error('failed to create the collision layer')
    solids.setCollisionByExclusion([-1])
    this.solids = solids

    const foreground = this.tmx.layers.find((layer) => layer.name === 'foreground')
    if (foreground) {
      const layer = map.createBlankLayer(
        'foreground',
        tileset,
        0,
        0,
        this.tmx.width,
        this.tmx.height,
        TILE_SIZE,
        TILE_SIZE,
      )
      if (layer) {
        const indices = toTileIndices(foreground.tiles)
        indices.forEach((row, rowIndex) =>
          row.forEach((index, colIndex) => {
            if (index >= 0) layer.putTileAt(index, colIndex, rowIndex)
          }),
        )
        layer.setDepth(-50)
      }
    }

    this.mapHeightPx = this.tmx.height * TILE_SIZE
    const worldWidth = this.tmx.width * TILE_SIZE

    this.physics.world.setBounds(0, 0, worldWidth, this.mapHeightPx)
    this.cameras.main.setBounds(0, 0, worldWidth, this.mapHeightPx)
    this.cameras.main.setBackgroundColor(COLORS.bg)
    this.cameras.main.roundPixels = true

    this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'background')
      .setOrigin(0)
      .setScrollFactor(0)
      .setAlpha(0.35)
      .setDepth(-100)
  }

  private spawnEntities(spawns: ReturnType<typeof getLevelSpawns>): void {
    this.spawnPoint = spawns.player

    this.player = new Player(this, spawns.player.x, spawns.player.y)
    this.physics.add.collider(this.player, this.solids)
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12)

    for (const spawn of spawns.zombies) this.spawnZombie(spawn)
    for (const spawn of spawns.items) this.spawnItem(spawn)

    this.run.zombiesAvailable = this.zombies.length
    this.run.healthAvailable = this.items.filter((item) => item.kind === 'health').length
  }

  private spawnItem(spawn: ItemSpawn): void {
    const item = new Item(this, spawn)
    this.items.push(item)
    if (item.kind === 'door') this.door = item
  }

  private spawnZombie(spawn: ZombieSpawn): Zombie {
    const zombie = new Zombie(this, spawn)
    this.zombies.push(zombie)

    const solidCollider = this.physics.add.collider(zombie, this.solids)
    zombie.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.physics.world.removeCollider(solidCollider)
      this.zombies = this.zombies.filter((entry) => entry !== zombie)
      this.refreshZombieCount()
    })
    zombie.on('died', () => this.onZombieDown(zombie))
    zombie.on('alert', () => this.sound.play('zombieNotice', { volume: 0.6 }))

    this.refreshZombieCount()
    return zombie
  }

  private spawnHuman(x: number, y: number): void {
    const human = new Human(this, x, y)
    this.humans.push(human)

    const solidCollider = this.physics.add.collider(human, this.solids)
    human.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.physics.world.removeCollider(solidCollider)
      this.humans = this.humans.filter((entry) => entry !== human)
    })
    human.on('reverted', (source: Human) => {
      this.spawnZombie({ x: source.x, y: source.y, startLeft: Math.random() < 0.5 }).markWasHuman()
    })

    this.sound.play('humanCreated', { volume: 0.7 })
  }

  private spawnDeadZombie(x: number, y: number): void {
    const dead = new DeadZombie(this, x, y)
    this.deadZombies.push(dead)
    const solidCollider = this.physics.add.collider(dead, this.solids)
    dead.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.physics.world.removeCollider(solidCollider)
      this.deadZombies = this.deadZombies.filter((entry) => entry !== dead)
    })
  }

  private onZombieDown(zombie: Zombie): void {
    const { x, y } = zombie
    const wasHuman = zombie.wasHuman
    zombie.destroy()

    if (wasHuman) this.spawnDeadZombie(x, y)
    else this.spawnHuman(x, y)
  }

  private refreshZombieCount(): void {
    this.run.zombiesRemaining = this.zombies.length
    bus.emit(Events.zombiesChanged, this.zombies.length)
  }

  // ---------------------------------------------------------------- input ---

  private bindInput(): void {
    const keyboard = this.input.keyboard
    if (!keyboard) return

    this.cursors = keyboard.createCursorKeys()
    this.keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this.keyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    this.keyFire = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X)

    // Queue the press from the event so a tap between two frames is never lost.
    const queueJump = (): void => {
      this.jumpQueued = true
    }
    keyboard.on('keydown-UP', queueJump)
    keyboard.on('keydown-SPACE', queueJump)
    keyboard.on('keydown-W', queueJump)

    keyboard.on('keydown-ESC', () => this.scene.start('LevelSelect'))
    keyboard.on('keydown-R', () => this.scene.restart({ level: this.level }))
  }

  private publishRunState(): void {
    bus.emit(Events.livesChanged, this.run.lives)
    bus.emit(Events.bulletsChanged, this.run.bullets)
    bus.emit(Events.keyChanged, this.run.hasKey)
    bus.emit(Events.zombiesChanged, this.zombies.length)
  }

  // -------------------------------------------------------------- systems ---

  private handleWeapon(time: number): void {
    if (!this.player.armed) return

    if (!this.keyFire.isDown || time < this.nextFireAt) return

    if (this.run.bullets <= 0) {
      this.nextFireAt = time + TUNING.fireCooldownMs
      bus.emit(Events.info, "I'm out of ammo")
      return
    }

    this.nextFireAt = time + TUNING.fireCooldownMs
    this.run.bullets -= 1
    bus.emit(Events.bulletsChanged, this.run.bullets)
    this.sound.play('gunShot', { volume: 0.5 })

    const bullet = Bullet.spawnFor(this, this.player)
    this.bullets.push(bullet)

    const solidCollider = this.physics.add.collider(bullet, this.solids, () => bullet.dissipate())
    bullet.once('wasted', () => {
      this.run.bulletsWasted += 1
    })
    bullet.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.physics.world.removeCollider(solidCollider)
      this.bullets = this.bullets.filter((entry) => entry !== bullet)
    })
  }

  private updateItems(): void {
    if (this.finished) return

    for (const item of [...this.items]) {
      if (!item.active || item.kind === 'door' || item.kind === 'exit_sign') continue
      if (this.physics.overlap(this.player, item)) this.collectItem(item)
    }
  }

  private updateZombies(time: number): void {
    for (const zombie of this.zombies) {
      if (!zombie.active) continue
      zombie.think(time, this.player, this.solids)

      if (zombie.y > this.mapHeightPx + 120) {
        zombie.destroy()
        continue
      }

      if (this.physics.overlap(this.player, zombie)) this.hurtPlayer()
    }
  }

  private updateBullets(): void {
    for (const bullet of [...this.bullets]) {
      if (!bullet.active) continue

      let hit = false
      for (const zombie of this.zombies) {
        if (!zombie.active) continue
        if (!this.physics.overlap(bullet, zombie)) continue

        hit = true
        bullet.consume()
        zombie.hit()
        break
      }
      if (hit) continue
    }
  }

  private updateHumans(): void {
    for (const human of this.humans) {
      if (!human.active || human.isInvincible) continue

      for (const zombie of this.zombies) {
        if (!zombie.active) continue
        if (!this.physics.overlap(human, zombie)) continue

        zombie.play('zombie:attack')
        human.infect()
        break
      }
    }
  }

  private handleDoor(enterPressed: boolean): void {
    const door = this.door
    if (!door || !door.active || this.finished) return

    if (!this.physics.overlap(this.player, door)) {
      this.doorPrompted = false
      return
    }

    if (!door.opened) {
      if (this.run.hasKey) {
        this.run.hasKey = false
        door.open()
        bus.emit(Events.keyChanged, false)
        bus.emit(Events.info, "Nice! Now I need to 'jump' inside the door")
        this.sound.play('collected', { volume: 0.7 })
      } else if (!this.doorPrompted) {
        this.doorPrompted = true
        bus.emit(Events.info, 'I need the key')
      }
      return
    }

    // Same button as jumping, exactly like the original: jump into the door.
    if (enterPressed) this.finishLevel()
  }

  private checkFallOut(time: number): void {
    if (this.player.y <= this.mapHeightPx + 60) return

    this.player.setPosition(this.spawnPoint.x, this.spawnPoint.y)
    this.player.setVelocity(0, 0)
    this.hurtPlayer(time)
  }

  private collectItem(item: Item): void {
    switch (item.kind) {
      case 'key':
        this.run.hasKey = true
        bus.emit(Events.keyChanged, true)
        bus.emit(Events.info, 'I found the key, now I need to find the door')
        this.sound.play('collected', { volume: 0.7 })
        item.destroy()
        break

      case 'gun':
        if (!this.player.armed) {
          this.player.equipGun()
          this.run.hasGun = true
          this.run.bullets = item.bullets
          this.run.bulletsAvailable = item.bullets
          bus.emit(Events.info, 'I found a gun, I can shoot now')
        } else {
          this.run.bullets += item.bullets
          this.run.bulletsAvailable += item.bullets
          bus.emit(Events.info, 'More ammo, more healed zombies!')
        }
        bus.emit(Events.bulletsChanged, this.run.bullets)
        this.sound.play('collected', { volume: 0.7 })
        item.destroy()
        break

      case 'health':
        this.run.lives += 1
        this.run.healthCollected += 1
        bus.emit(Events.livesChanged, this.run.lives)
        bus.emit(Events.info, 'I feel better now!')
        this.sound.play('collected', { volume: 0.7 })
        item.destroy()
        break

      case 'door':
      case 'exit_sign':
        break
    }
  }

  private hurtPlayer(time = this.time.now): void {
    if (!this.player.startInvincibility(time)) return

    this.run.lives -= 1
    bus.emit(Events.livesChanged, this.run.lives)
    this.sound.play('playerHit', { volume: 0.7 })

    if (this.run.lives <= 0) {
      this.scene.start('GameOver')
      return
    }

    bus.emit(Events.info, 'That hurts!')
    if (this.run.lives === 1) bus.emit(Events.info, 'I need to be more careful')
  }

  private finishLevel(): void {
    this.finished = true

    this.run.zombiesHealed = this.humans.filter((human) => human.active).length
    const total = this.run.zombiesAvailable
    const score = total > 0 ? this.run.zombiesHealed / total : 1
    const stars = score <= 0.5 ? 1 : score < 0.9 ? 2 : 3

    GameState.completeRun({ stars, nextLevel: this.level + 1 })
    this.scene.start('LevelSummary')
  }
}
