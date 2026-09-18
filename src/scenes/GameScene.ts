import Phaser from 'phaser'
import { COLORS, TILE_SIZE, TUNING, WORLD_ZOOM } from '../config'
import { bus, Events, GameState, type RunState } from '../state/GameState'
import { touchInput } from '../ui/touchInput'
import { navigate } from '../ui/navigation'
import { Player, type PlayerMode } from '../entities/Player'
import { Zombie } from '../entities/Zombie'
import { Human } from '../entities/Human'
import { DeadZombie } from '../entities/DeadZombie'
import { Bullet } from '../entities/Bullet'
import { Spit } from '../entities/Spit'
import { Item } from '../entities/Item'
import { parseTmx, toTileIndices, type TmxMap } from '../levels/tmx'
import { getLevelSpawns, type ItemSpawn, type Point, type ZombieSpawn } from '../levels/levels'

/**
 * The vertical slice turned full game loop: real Tiled levels, combat, and
 * Zombie Mode.
 *
 * Pipeline: cached TMX text -> `parseTmx` -> Phaser array tilemap (collision)
 * plus a decoration layer, then entities spawned from the per-level tables in
 * `levels.ts`. Interactions are wired by hand in `update()` rather than through
 * physics groups so each one is explicit and cheap.
 */
export class GameScene extends Phaser.Scene {
  private level = 1
  private run!: RunState
  private tmx!: TmxMap
  private solids!: Phaser.Tilemaps.TilemapLayer
  private mapHeightPx = 0
  private backdrop!: Phaser.GameObjects.Image
  private safePoint!: Point

  private player!: Player
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private keyA!: Phaser.Input.Keyboard.Key
  private keyD!: Phaser.Input.Keyboard.Key
  private keyW!: Phaser.Input.Keyboard.Key
  private keyFire!: Phaser.Input.Keyboard.Key
  private keyFireZ!: Phaser.Input.Keyboard.Key
  private keyX!: Phaser.Input.Keyboard.Key

  private zombies: Zombie[] = []
  private humans: Human[] = []
  private deadZombies: DeadZombie[] = []
  private bullets: Bullet[] = []
  private spits: Spit[] = []
  private items: Item[] = []
  private door: Item | null = null

  private nextFireAt = 0
  private nextSafeAt = 0
  private hitStopUntil = 0
  private doorPrompted = false
  private finished = false
  private jumpQueued = false
  private music?: Phaser.Sound.BaseSound
  private zombieMusic?: Phaser.Sound.BaseSound | undefined

  constructor() {
    super('Game')
  }

  create(data: { level?: number }): void {
    this.level = data.level ?? 1
    this.run = GameState.startRun(this.level)
    this.resetCollections()
    this.ensureSparkTexture()
    // Hit-stop slows the sim; never inherit a slowed world from a restart.
    this.physics.world.timeScale = 1

    const xml = this.cache.text.get(`level${this.level}`) as string | undefined
    if (!xml) {
      console.error(`[GameScene] no map loaded for level ${this.level}`)
      navigate(this, 'LevelSelect')
      return
    }

    this.tmx = parseTmx(xml)
    this.buildLevel()
    this.spawnEntities(getLevelSpawns(this.level, this.tmx))
    this.bindInput()

    this.scene.launch('Hud', { level: this.level })
    this.publishRunState()
    // `scene.launch` is queued until the next frame, so the HUD is not
    // subscribed yet when `create` runs. Delay the intro so it shows up.
    this.time.delayedCall(30, () => bus.emit(Events.info, 'I need to find the way out of here'))

    this.music = this.sound.add('playerBg', { loop: true, volume: 0.4 })
    this.music.play()

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.music?.stop()
      this.zombieMusic?.stop()
      this.music?.destroy()
      this.zombieMusic?.destroy()
      this.scene.stop('Hud')
    })
  }

  override update(time: number): void {
    if (!this.player || !this.player.active) return

    if (this.hitStopUntil > 0 && time >= this.hitStopUntil) {
      this.hitStopUntil = 0
      this.physics.world.timeScale = 1
    }

    const jumpPressed = this.jumpQueued || touchInput.jumpQueued
    this.jumpQueued = false
    touchInput.jumpQueued = false

    // Original jump inputs are up / X ('action'); space fires, so it must not
    // also count as held-jump or firing would siphon jump height. Touch controls
    // mirror the keyboard exactly.
    const jumpHeld =
      this.cursors.up.isDown || this.keyX.isDown || this.keyW.isDown || touchInput.jumpHeld

    this.player.move(
      {
        left: this.cursors.left.isDown || this.keyA.isDown || touchInput.left,
        right: this.cursors.right.isDown || this.keyD.isDown || touchInput.right,
        jumpPressed,
        jumpHeld,
      },
      time,
    )

    this.handleWeapon(time)
    this.updateItems()
    this.updateZombies(time)
    this.updateBullets()
    this.updateSpits()
    this.updateHumans()
    this.cullFallen()
    this.handleDoor(jumpPressed)
    this.checkFallOut(time)
    this.updateSafePoint(time)
  }

  // ---------------------------------------------------------------- level ---

  private resetCollections(): void {
    this.zombies = []
    this.humans = []
    this.deadZombies = []
    this.bullets = []
    this.spits = []
    this.items = []
    this.door = null
    this.nextFireAt = 0
    this.nextSafeAt = 0
    this.hitStopUntil = 0
    this.doorPrompted = false
    this.finished = false
    this.jumpQueued = false
    this.zombieMusic = undefined
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

    // No bottom edge: falling off the map has to actually leave the world so
    // `checkFallOut` can respawn the player (and end Zombie Mode).
    this.physics.world.setBounds(0, 0, worldWidth, this.mapHeightPx, true, true, true, false)
    this.cameras.main.setBounds(0, 0, worldWidth, this.mapHeightPx)
    this.cameras.main.setBackgroundColor(COLORS.bg)
    this.cameras.main.roundPixels = true
    // Show the level at the original's framing: the design space is 1080 tall
    // but the world wants a much closer view, so the camera carries the zoom and
    // every world coordinate (spawns, physics, tiles) stays in level pixels.
    const zoom = WORLD_ZOOM
    this.cameras.main.setZoom(zoom)

    // Full-view graveyard backdrop, matching the menus. It is a scroll-factor-0
    // image, so under camera zoom it maps 1:1 to screen space: position it at the
    // screen centre and scale it to cover the zoomed view.
    this.backdrop = this.add
      .image(this.scale.width / 2, this.scale.height / 2, 'bg')
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setAlpha(0.5)
      .setDepth(-100)
    this.syncBackdrop(zoom)

    const onResize = (): void => this.syncBackdrop(zoom)
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize)
    })
  }

  /** Covers the zoomed view with the graveyard art, centred on screen. */
  private syncBackdrop(zoom: number): void {
    const source = this.textures.get('bg').getSourceImage()
    const cover = Math.max(
      this.scale.width / zoom / source.width,
      this.scale.height / zoom / source.height,
    )
    this.backdrop.setScale(cover)
    this.backdrop.setPosition(this.scale.width / 2, this.scale.height / 2)
  }

  private spawnEntities(spawns: ReturnType<typeof getLevelSpawns>): void {
    this.safePoint = { ...spawns.player }

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
    zombie.on('spit', (direction: 1 | -1) => this.spawnSpit(zombie, direction))

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
    human.on('reverted', (source: Human, byZombiePlayer: boolean) => {
      const zombie = this.spawnZombie({
        x: source.x,
        y: source.y,
        startLeft: Math.random() < 0.5,
      })
      // A zombie player's victims can still be cured; a normal zombie's cannot.
      if (!byZombiePlayer) zombie.markWasHuman()
    })

    this.sound.play('humanCreated', { volume: 0.7 })
    this.burst(x, y, 0x8bd450, 14)
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

    this.setHitStop(this.time.now, 50)
    this.cameras.main.shake(90, 0.004)

    if (wasHuman) {
      this.burst(x, y, 0x9ca2ae, 10)
      this.spawnDeadZombie(x, y)
    } else {
      this.spawnHuman(x, y)
    }
  }

  private refreshZombieCount(): void {
    this.run.zombiesRemaining = this.zombies.length
    bus.emit(Events.zombiesChanged, this.zombies.length)
  }

  private spawnSpit(zombie: Zombie, direction: 1 | -1): void {
    const spit = new Spit(this, zombie.x + direction * 22, zombie.y + 3, direction)
    this.spits.push(spit)
    this.burst(zombie.x + direction * 22, zombie.y + 3, 0x9be86b, 5)

    const solidCollider = this.physics.add.collider(spit, this.solids, () => spit.dissipate())
    spit.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.physics.world.removeCollider(solidCollider)
      this.spits = this.spits.filter((entry) => entry !== spit)
    })
  }

  // ---------------------------------------------------------------- input ---

  private bindInput(): void {
    const keyboard = this.input.keyboard
    if (!keyboard) return

    this.cursors = keyboard.createCursorKeys()
    this.keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this.keyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    this.keyX = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X)
    // Original Quintus bindings: up = 'up', X = 'action' (both jump) and
    // space/Z = 'fire'. Space therefore shoots, not jumps. WASD is an extra.
    this.keyFire = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.keyFireZ = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z)

    // Queue the press from the event so a tap between two frames is never lost.
    const queueJump = (): void => {
      this.jumpQueued = true
    }
    keyboard.on('keydown-UP', queueJump)
    keyboard.on('keydown-X', queueJump)
    keyboard.on('keydown-W', queueJump)

    keyboard.on('keydown-ESC', () => navigate(this, 'LevelSelect'))
    keyboard.on('keydown-R', () => this.scene.restart({ level: this.level }))
    // P and M live on the HUD scene, which owns the pause overlay and the audio
    // button; Space is deliberately not a confirm here because it fires the gun.
  }
  private publishRunState(): void {
    bus.emit(Events.livesChanged, this.run.lives)
    bus.emit(Events.bulletsChanged, this.run.bullets)
    bus.emit(Events.keyChanged, this.run.hasKey)
    bus.emit(Events.zombiesChanged, this.zombies.length)
    bus.emit(Events.playerMode, 'doctor' as PlayerMode)
  }

  // -------------------------------------------------------------- systems ---

  private handleWeapon(time: number): void {
    if (!this.player.armed || this.player.isZombie) return
    if (
      !(this.keyFire.isDown || this.keyFireZ.isDown || touchInput.fireHeld) ||
      time < this.nextFireAt
    ) {
      return
    }

    if (this.run.bullets <= 0) {
      this.nextFireAt = time + TUNING.fireCooldownMs
      bus.emit(Events.info, "I'm out of ammo")
      return
    }

    this.nextFireAt = time + TUNING.fireCooldownMs
    this.run.bullets -= 1
    bus.emit(Events.bulletsChanged, this.run.bullets)
    this.sound.play('gunShot', { volume: 0.5 })

    const muzzleX = this.player.x + this.player.facing * 15
    this.muzzleFlash(muzzleX, this.player.y + 3, this.player.facing)
    this.cameras.main.shake(50, 0.0025)

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
    if (this.finished || this.player.isZombie) return

    for (const item of this.items) {
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

      // A zombie pays the walking dead no attention: only bites the doctor.
      if (!this.player.isZombie && this.physics.overlap(this.player, zombie)) {
        this.hurtPlayer('contact')
      }
    }
  }

  private updateBullets(): void {
    for (const bullet of this.bullets) {
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

  private updateSpits(): void {
    if (this.player.isZombie) return

    for (const spit of this.spits) {
      if (!spit.active) continue
      if (!this.physics.overlap(this.player, spit)) continue

      spit.dissipate()
      this.hurtPlayer('contact')
    }
  }

  private updateHumans(): void {
    for (const human of this.humans) {
      if (!human.active) continue

      // The zombie player spreads the infection to humans, even fresh ones.
      if (this.player.isZombie && this.physics.overlap(this.player, human)) {
        human.infect(true)
        continue
      }

      if (human.isInvincible) continue

      for (const zombie of this.zombies) {
        if (!zombie.active) continue
        if (!this.physics.overlap(human, zombie)) continue

        zombie.play('zombie:attack')
        human.infect(false)
        break
      }
    }
  }

  /** Humans and bodies that drop out of the map must not inflate the score. */
  private cullFallen(): void {
    const limit = this.mapHeightPx + 120

    for (const human of this.humans) {
      if (human.active && human.y > limit) human.destroy()
    }
    this.humans = this.humans.filter((human) => human.active)

    for (const dead of this.deadZombies) {
      if (dead.active && dead.y > limit) dead.destroy()
    }
    this.deadZombies = this.deadZombies.filter((dead) => dead.active)
  }

  private handleDoor(enterPressed: boolean): void {
    const door = this.door
    if (!door || !door.active || this.finished || this.player.isZombie) return

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
        this.burst(door.x, door.y, 0xffe066, 10)
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

    if (this.player.isZombie) {
      this.exitZombieMode(time)
      return
    }

    this.player.setPosition(this.safePoint.x, this.safePoint.y)
    this.player.setVelocity(0, 0)
    this.hurtPlayer('fall', time)
  }

  private updateSafePoint(time: number): void {
    if (time < this.nextSafeAt) return
    if (!this.player.body.blocked.down && !this.player.body.touching.down) return

    this.nextSafeAt = time + 1500
    this.safePoint = { x: this.player.x, y: this.player.y }
  }

  private collectItem(item: Item): void {
    switch (item.kind) {
      case 'key':
        this.run.hasKey = true
        bus.emit(Events.keyChanged, true)
        bus.emit(Events.info, 'I found the key, now I need to find the door')
        this.sound.play('collected', { volume: 0.7 })
        this.burst(item.x, item.y, 0xffe066, 8)
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
        this.burst(item.x, item.y, 0xffe066, 8)
        item.destroy()
        break

      case 'health':
        this.run.lives += 1
        this.run.healthCollected += 1
        bus.emit(Events.livesChanged, this.run.lives)
        bus.emit(Events.info, 'I feel better now!')
        this.sound.play('collected', { volume: 0.7 })
        this.burst(item.x, item.y, 0xec655d, 10)
        item.destroy()
        break

      case 'door':
      case 'exit_sign':
        break
    }
  }

  // ------------------------------------------------------- damage & modes ---

  private hurtPlayer(source: 'contact' | 'fall', time = this.time.now): void {
    if (source === 'contact' && !this.player.startInvincibility(time)) return

    this.run.lives -= 1
    bus.emit(Events.livesChanged, this.run.lives)
    this.sound.play('playerHit', { volume: 0.7 })
    this.cameras.main.shake(150, 0.012)
    this.burst(this.player.x, this.player.y, 0xec655d, 10)
    this.setHitStop(time, TUNING.hitStopMs)

    if (this.run.lives > 0) {
      bus.emit(Events.info, 'That hurts!')
      if (this.run.lives === 1) bus.emit(Events.info, 'I need to be more careful')
      return
    }

    // No lives left. The original turns the doctor into a zombie — unless he is
    // already a zombie, already came back once, or this death was a fall.
    if (source === 'fall' || this.player.wasZombie || this.player.isZombie) {
      this.gameOver()
      return
    }

    this.enterZombieMode(time)
  }

  private enterZombieMode(time: number): void {
    this.run.zombieModeFound = true
    this.player.enterZombieMode()
    bus.emit(Events.playerMode, 'zombie' as PlayerMode)
    bus.emit(Events.info, "I was bitten. I'm turning. Nooo!")
    this.cameras.main.flash(320, 60, 140, 60)
    this.setHitStop(time, 160)

    this.music?.stop()
    this.zombieMusic = this.sound.add('zombieMode', { loop: true, volume: 0.4 })
    this.zombieMusic.play()

    this.time.delayedCall(1800, () => {
      if (this.player.active && this.player.isZombie) {
        bus.emit(Events.info, 'I need to kill myself')
      }
    })
  }

  private exitZombieMode(time: number): void {
    this.run.lives = 3
    bus.emit(Events.livesChanged, this.run.lives)

    this.player.exitZombieMode()
    this.player.setPosition(this.safePoint.x, this.safePoint.y)
    this.player.setVelocity(0, 0)
    this.player.setAlpha(1)

    if (this.run.hasGun) this.player.equipGun()
    bus.emit(Events.playerMode, 'doctor' as PlayerMode)
    bus.emit(Events.bulletsChanged, this.run.bullets)
    bus.emit(Events.info, 'Ok, back to business')

    this.setHitStop(time, 120)
    this.cameras.main.flash(280, 40, 90, 40)

    this.zombieMusic?.stop()
    this.zombieMusic = undefined
    this.music?.play()
  }

  private gameOver(): void {
    this.zombieMusic?.stop()
    this.music?.stop()
    navigate(this, 'GameOver')
  }

  private finishLevel(): void {
    this.finished = true

    // A re-infected human can be healed twice, so never score above the level's
    // zombie total.
    const total = this.run.zombiesAvailable
    this.run.zombiesHealed = Math.min(this.humans.filter((human) => human.active).length, total)
    const score = total > 0 ? this.run.zombiesHealed / total : 1
    const stars = score <= 0.5 ? 1 : score < 0.9 ? 2 : 3

    GameState.completeRun({ stars, nextLevel: this.level + 1 })
    navigate(this, 'LevelSummary')
  }

  // ------------------------------------------------------------------ fx ---

  private setHitStop(time: number, durationMs: number): void {
    this.hitStopUntil = Math.max(this.hitStopUntil, time + durationMs)
    this.physics.world.timeScale = TUNING.hitStopScale
  }

  private ensureSparkTexture(): void {
    if (this.textures.exists('spark')) return

    const graphics = this.add.graphics()
    graphics.fillStyle(0xffffff, 1)
    graphics.fillRect(0, 0, 4, 4)
    graphics.generateTexture('spark', 4, 4)
    graphics.destroy()
  }

  private burst(x: number, y: number, tint: number, count: number): void {
    if (!this.textures.exists('spark')) return

    const emitter = this.add
      .particles(x, y, 'spark', {
        speed: { min: 40, max: 150 },
        angle: { min: 0, max: 360 },
        lifespan: 340,
        scale: { start: 1.1, end: 0 },
        tint,
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(120)

    emitter.explode(count)
    this.time.delayedCall(420, () => emitter.destroy())
  }

  private muzzleFlash(x: number, y: number, direction: 1 | -1): void {
    const flash = this.add
      .image(x + direction * 6, y, 'spark')
      .setScale(3, 2)
      .setTint(0xfff2a0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(110)

    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 4.5,
      scaleY: 3,
      duration: 90,
      onComplete: () => flash.destroy(),
    })
  }
}
