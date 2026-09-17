import Phaser from 'phaser'
import { COLORS, FONTS, GAME_HEIGHT, WORLD_VIEW_HEIGHT } from '../config'
import { bus, Events, GameState } from '../state/GameState'
import { bindScreenKeys } from '../ui/keyboard'
import { applyMutedState, toggleMute } from '../ui/audioButton'

/**
 * HUD rebuilt to the original `hud.coffee` layout: a gradient bar, the doctor's
 * head in the top-left with a speech bubble, and icon counters chained from the
 * right edge. The counter sprites already contain the "x", so only the number is
 * drawn, exactly like the original.
 *
 * The constants below keep the original's pixel sizes, and the camera carries the
 * same zoom as the world so the HUD and the level stay in proportion.
 */

/**
 * The HUD is drawn at the same scale as the level. The original drew both at
 * 1:1 in the live window; the world camera now zooms to reframe the level, so
 * the HUD carries the identical zoom to keep the doctor's head, the counters
 * and the world art in the same proportion as the original.
 */
const HUD_ZOOM = GAME_HEIGHT / WORLD_VIEW_HEIGHT

/** Vertical fade height, from the original's 124px `gradient-top.png` bar. */
const BAR_HEIGHT = 124
const BAR_COLOR = 0x14161a
const BAR_ALPHA_TOP = 0.71

/** Every counter and the speech bubble share this vertical centre. */
const CENTER_Y = 40
/** Avatar frame width; the speech bubble starts at its right edge. */
const AVATAR_WIDTH = 81
const BUBBLE_PADDING = { x: 10, y: 5 }
const NUMBER_SIZE = 34
/** Gaps between counter groups, straight from `hud.coffee`. */
const GROUP_GAP = 20
const KEY_GAP = 34

/**
 * Visible width of the HUD's own coordinate space. The camera is zoomed, so the
 * design width covers fewer HUD pixels; the counters chain from that edge.
 */
function viewWidth(scene: Phaser.Scene): number {
  return scene.scale.width / HUD_ZOOM
}

interface Counter {
  container: Phaser.GameObjects.Container
  icon: Phaser.GameObjects.Image
  text?: Phaser.GameObjects.Text | undefined
  iconGap: number
  /** The zombie head sits outside the number's container, as in the original. */
  standaloneIcon: boolean
}

export class HudScene extends Phaser.Scene {
  private gradient!: Phaser.GameObjects.Graphics
  private avatar!: Phaser.GameObjects.Image
  private bubble!: Phaser.GameObjects.Graphics
  private bubbleText!: Phaser.GameObjects.Text
  private infoFade?: Phaser.Tweens.Tween | undefined

  private enemiesCounter!: Counter
  private bulletsCounter!: Counter
  private healthCounter!: Counter
  private keyCounter!: Counter
  private pauseButton!: Phaser.GameObjects.Image
  private backButton!: Phaser.GameObjects.Image
  private pauseOverlay?: Phaser.GameObjects.Container | undefined
  private paused = false

  private lives = 3
  private bullets = 0
  private zombies = 0
  private hasKey = false

  constructor() {
    super('Hud')
  }

  create(): void {
    applyMutedState(this)

    // `publishRunState` fires before this scene's next update tick, so seed the
    // counters from the run instead of waiting for the first bus event.
    const run = GameState.currentRun
    this.lives = run?.lives ?? 3
    this.bullets = run?.bullets ?? 0
    this.zombies = run?.zombiesRemaining ?? 0
    this.hasKey = run?.hasKey ?? false
    this.paused = false

    // The HUD matches the world's zoom and is anchored to the top-left, so its
    // reference-space constants keep their original meaning. An origin of (0, 0)
    // makes `scroll` the top-left corner of the view, so HUD (0, 0) lands there
    // no matter what the zoom is.
    const camera = this.cameras.main
    camera.setOrigin(0, 0)
    camera.setZoom(HUD_ZOOM)
    camera.setScroll(0, 0)

    this.gradient = this.add.graphics()
    this.drawGradient(viewWidth(this))

    this.avatar = this.add.image(AVATAR_WIDTH / 2, 35.5, 'hud', 'hud_player:0')

    this.bubble = this.add.graphics()
    this.bubbleText = this.add
      .text(0, CENTER_Y, '', {
        fontFamily: FONTS.body,
        fontSize: '24px',
        color: COLORS.panel,
      })
      .setOrigin(0, 0.5)

    this.enemiesCounter = this.makeCounter('hud_zombie:0', COLORS.accent, 0, {
      standaloneIcon: true,
    })
    this.bulletsCounter = this.makeCounter('hud_bullets:0', COLORS.title, 12)
    this.healthCounter = this.makeCounter('hud_health:0', COLORS.danger, 6)
    this.keyCounter = this.makeCounter('hud_key_empty:0', COLORS.accent, 0, { withText: false })
    this.pauseButton = this.createIconButton('hud_pause_button:0', () => this.togglePause())
    this.backButton = this.createIconButton('hud_back_button:0', () => this.leaveLevel())

    this.refresh()
    this.layout()

    bus.on(Events.livesChanged, this.onLives, this)
    bus.on(Events.bulletsChanged, this.onBullets, this)
    bus.on(Events.zombiesChanged, this.onZombies, this)
    bus.on(Events.keyChanged, this.onKey, this)
    bus.on(Events.playerMode, this.onPlayerMode, this)
    bus.on(Events.info, this.onInfo, this)

    bindScreenKeys(this, {
      back: () => this.leaveLevel(),
      pause: () => this.togglePause(),
      mute: () => toggleMute(this),
    })

    const onResize = (): void => this.layout()
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize)

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      bus.off(Events.livesChanged, this.onLives, this)
      bus.off(Events.bulletsChanged, this.onBullets, this)
      bus.off(Events.zombiesChanged, this.onZombies, this)
      bus.off(Events.keyChanged, this.onKey, this)
      bus.off(Events.playerMode, this.onPlayerMode, this)
      bus.off(Events.info, this.onInfo, this)
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize)
      if (this.paused && this.scene.isPaused('Game')) this.scene.resume('Game')
    })
  }

  // --------------------------------------------------------------- layout ---

  private makeCounter(
    frame: string,
    color: string,
    iconGap: number,
    options: { standaloneIcon?: boolean; withText?: boolean } = {},
  ): Counter {
    const { standaloneIcon = false, withText = true } = options
    const icon = this.add.image(0, 0, 'hud', frame)
    const container = this.add.container(0, CENTER_Y, standaloneIcon ? [] : [icon])
    const counter: Counter = { container, icon, iconGap, standaloneIcon, text: undefined }

    if (withText) {
      counter.text = this.add
        .text(0, 0, '0', {
          fontFamily: FONTS.body,
          fontSize: `${NUMBER_SIZE}px`,
          color,
        })
        .setOrigin(0.5)
      container.add(counter.text)
      this.layoutCounterContent(counter)
    }

    return counter
  }

  /** The number sits just left of its icon, as in the original counters. */
  private layoutCounterContent(counter: Counter): void {
    if (!counter.text || counter.standaloneIcon) return
    counter.text.setX(-(counter.icon.width / 2) - counter.iconGap - counter.text.width / 2)
  }

  private createIconButton(frame: string, onClick: () => void): Phaser.GameObjects.Image {
    return this.add
      .image(0, 0, 'hud', frame)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', onClick)
  }

  /** Mirrors `hud.coffee`'s right-to-left chaining and `fit(0, 8)` padding. */
  private counterWidth(counter: Counter): number {
    // The enemy counter is a fixed 60px label in the original, not sized to the digits.
    if (counter.standaloneIcon) return 60 + 16
    const textWidth = counter.text?.width ?? 0
    return counter.icon.width + counter.iconGap + textWidth + 16
  }

  /**
   * Vertical fade from a dark, translucent top edge to fully transparent, so
   * the HUD reads over any level art. Redrawn on resize because the gradient
   * spans the live view width.
   */
  private drawGradient(width: number): void {
    this.gradient.clear()
    this.gradient.fillGradientStyle(
      BAR_COLOR,
      BAR_COLOR,
      BAR_COLOR,
      BAR_COLOR,
      BAR_ALPHA_TOP,
      BAR_ALPHA_TOP,
      0,
      0,
    )
    this.gradient.fillRect(0, 0, width, BAR_HEIGHT)
  }

  private layout(): void {
    const width = viewWidth(this)

    this.drawGradient(width)
    this.avatar.setPosition(AVATAR_WIDTH / 2, 35.5)
    this.pauseButton.setPosition(width - 30, 110)
    this.backButton.setPosition(width - 30, 170)
    if (this.enemiesCounter.standaloneIcon) {
      this.enemiesCounter.icon.setPosition(
        width - this.enemiesCounter.icon.width / 2,
        CENTER_Y - 0.5,
      )
    }
    this.enemiesCounter.container.setPosition(width - 98, CENTER_Y)

    const enemiesWidth = this.counterWidth(this.enemiesCounter)
    const bulletsWidth = this.counterWidth(this.bulletsCounter)
    const healthWidth = this.counterWidth(this.healthCounter)
    const keyWidth = this.counterWidth(this.keyCounter)

    this.bulletsCounter.container.setPosition(
      width - 98 - enemiesWidth / 2 - bulletsWidth / 2 - GROUP_GAP + 30,
      CENTER_Y,
    )
    this.healthCounter.container.setPosition(
      width - 98 - enemiesWidth / 2 - bulletsWidth - healthWidth / 2 - GROUP_GAP,
      CENTER_Y,
    )
    this.keyCounter.container.setPosition(
      width - 98 - enemiesWidth / 2 - bulletsWidth - healthWidth - keyWidth / 2 - KEY_GAP,
      CENTER_Y,
    )

    this.layoutBubble()
    this.layoutPauseOverlay()
  }
  private layoutBubble(): void {
    const text = this.bubbleText.text
    const width = this.bubbleText.width + BUBBLE_PADDING.x * 2
    const height = this.bubbleText.height + BUBBLE_PADDING.y * 2
    const left = AVATAR_WIDTH

    this.bubble.clear()
    if (text.length === 0) return

    this.bubble.fillStyle(0xffffff, 1)
    this.bubble.fillRoundedRect(left, CENTER_Y - height / 2, width, height, 5)
    this.bubbleText.setPosition(left + BUBBLE_PADDING.x, CENTER_Y)
  }

  // -------------------------------------------------------------- counters ---

  private refresh(): void {
    this.enemiesCounter.text?.setText(String(this.zombies))
    this.bulletsCounter.text?.setText(String(this.bullets))
    this.healthCounter.text?.setText(String(this.lives))
    this.keyCounter.icon.setFrame(this.hasKey ? 'hud_key_collected:0' : 'hud_key_empty:0')
    this.healthCounter.icon.setFrame(this.lives <= 1 ? 'hud_health_half:0' : 'hud_health:0')
    // Digits change the counter width, so re-centre the numbers before chaining.
    this.layoutCounterContent(this.enemiesCounter)
    this.layoutCounterContent(this.bulletsCounter)
    this.layoutCounterContent(this.healthCounter)
    this.layout()
  }

  private onLives(value: number): void {
    this.lives = value
    this.refresh()
  }

  private onBullets(value: number): void {
    this.bullets = value
    this.refresh()
  }

  private onZombies(value: number): void {
    this.zombies = value
    this.refresh()
  }

  private onKey(value: boolean): void {
    this.hasKey = value
    this.refresh()
  }

  private onInfo(message: string): void {
    this.bubbleText.setText(message)
    this.bubble.setAlpha(1)
    this.bubbleText.setAlpha(1)
    this.layoutBubble()

    this.infoFade?.remove()
    this.infoFade = this.tweens.add({
      targets: [this.bubble, this.bubbleText],
      alpha: 0,
      delay: 2600,
      duration: 500,
    })
  }

  private onPlayerMode(mode: 'doctor' | 'zombie'): void {
    const zombie = mode === 'zombie'
    this.avatar.setFrame(zombie ? 'hud_zombie_player:0' : 'hud_player:0')
    this.healthCounter.icon.setFrame(
      zombie || this.lives <= 1 ? 'hud_health_half:0' : 'hud_health:0',
    )
  }

  // ----------------------------------------------------------------- menu ---

  private togglePause(): void {
    if (this.paused) {
      this.paused = false
      this.pauseOverlay?.destroy()
      this.pauseOverlay = undefined
      this.scene.resume('Game')
      this.sound.resumeAll()
      return
    }

    this.paused = true
    this.scene.pause('Game')
    this.sound.pauseAll()

    // Positioned in the HUD's own (zoomed) coordinate space, so it centres on
    // screen rather than on the design space the camera no longer maps 1:1.
    const width = viewWidth(this)
    const height = this.scale.height / HUD_ZOOM
    const shade = this.add.rectangle(0, 0, width, height, 0x000000, 0.5).setOrigin(0)
    const label = this.add
      .text(width / 2, height / 2, 'Paused', {
        fontFamily: FONTS.title,
        fontSize: '100px',
        color: COLORS.title,
      })
      .setOrigin(0.5)

    this.pauseOverlay = this.add.container(0, 0, [shade, label]).setDepth(1000)
  }

  private layoutPauseOverlay(): void {
    if (!this.pauseOverlay) return
    const width = viewWidth(this)
    const height = this.scale.height / HUD_ZOOM
    const [shade, label] = this.pauseOverlay.list as [
      Phaser.GameObjects.Rectangle,
      Phaser.GameObjects.Text,
    ]
    shade.setSize(width, height)
    label.setPosition(width / 2, height / 2)
  }

  private leaveLevel(): void {
    this.scene.get('Game').scene.start('LevelSelect')
  }
}
