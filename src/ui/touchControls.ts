import Phaser from 'phaser'
import { FONTS } from '../config'
import { isTouchDevice, resetTouchInput, touchInput } from './touchInput'

/**
 * On-screen controls for touch devices: a two-way movement pad bottom-left and
 * jump / fire buttons bottom-right, mirroring the keyboard bindings (jump on
 * the right hand, fire above it, movement on the left thumb).
 *
 * It lives in `HudScene` because that camera is anchored at (0, 0) with a known
 * zoom, so hit-testing is just `pointer / zoom`. Pointers are matched to
 * zones here and the result is written to the shared `touchInput` singleton,
 * which `GameScene` polls each frame.
 */

type ZoneKind = 'left' | 'right' | 'jump' | 'fire'

/** Movement pad, in the HUD's zoomed view space. Anchored to the bottom edge. */
const PAD_WIDTH = 240
const PAD_HEIGHT = 160
const PAD_MARGIN = 28
const ARROW_INSET = PAD_WIDTH * 0.28

const BUTTON_RADIUS = 68

const FILL = 0xffffff
const FILL_ALPHA = 0.18
const FILL_ALPHA_DOWN = 0.4
const LINE_ALPHA = 0.55

export class TouchControls {
  private readonly scene: Phaser.Scene
  private readonly root: Phaser.GameObjects.Container
  private readonly pad: Phaser.GameObjects.Graphics
  private readonly jump: Phaser.GameObjects.Graphics
  private readonly fire: Phaser.GameObjects.Graphics
  private readonly jumpLabel: Phaser.GameObjects.Text
  private readonly fireLabel: Phaser.GameObjects.Text
  private readonly padRect = new Phaser.Geom.Rectangle()
  private readonly jumpCenter = new Phaser.Math.Vector2()
  private readonly fireCenter = new Phaser.Math.Vector2()
  private readonly active = new Map<number, ZoneKind>()
  private readonly pressed: Record<ZoneKind, boolean> = {
    left: false,
    right: false,
    jump: false,
    fire: false,
  }

  /** Whether this device gets touch controls at all. */
  private readonly supported = isTouchDevice()
  private shown = false
  /** The HUD camera zoom, so pointer positions map back to view coordinates. */
  private zoom: number

  constructor(scene: Phaser.Scene, zoom: number) {
    this.scene = scene
    this.zoom = zoom

    this.pad = scene.add.graphics()
    this.jump = scene.add.graphics()
    this.fire = scene.add.graphics()
    this.jumpLabel = scene.add
      .text(0, 0, 'JUMP', {
        fontFamily: FONTS.body,
        fontSize: '28px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
    this.fireLabel = scene.add
      .text(0, 0, 'FIRE', {
        fontFamily: FONTS.body,
        fontSize: '28px',
        color: '#ffffff',
      })
      .setOrigin(0.5)

    this.root = scene.add
      .container(0, 0, [this.pad, this.jump, this.fire, this.jumpLabel, this.fireLabel])
      .setDepth(900)
      .setVisible(false)

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this)
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this)
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this)
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this)

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy())

    this.layout(this.zoom)
    this.setPaused(false)
  }

  /**
   * Hides and clears the controls while the game is paused, so a touch that
   * lands under the pause overlay cannot get stuck down.
   */
  setPaused(paused: boolean): void {
    const show = this.supported && !paused
    if (show === this.shown) return

    this.shown = show
    this.root.setVisible(show)
    this.active.clear()
    this.sync()
    if (!show) resetTouchInput()
  }

  /** Recomputes positions from the current view size and camera zoom. */
  layout(zoom: number): void {
    this.zoom = zoom
    const width = this.scene.scale.width / this.zoom
    const height = this.scene.scale.height / this.zoom

    this.padRect.setTo(PAD_MARGIN, height - PAD_HEIGHT - PAD_MARGIN, PAD_WIDTH, PAD_HEIGHT)
    this.jumpCenter.set(width - 190, height - 160)
    this.fireCenter.set(width - 80, height - 300)
    this.jumpLabel.setPosition(this.jumpCenter.x, this.jumpCenter.y)
    this.fireLabel.setPosition(this.fireCenter.x, this.fireCenter.y)

    this.drawPad()
    this.drawButton(this.jump, this.jumpCenter, this.pressed.jump)
    this.drawButton(this.fire, this.fireCenter, this.pressed.fire)
  }

  // ------------------------------------------------------------- pointers ---

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    this.updatePointer(pointer)
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.isDown) this.updatePointer(pointer)
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.active.delete(pointer.id)) return
    this.sync()
  }

  private updatePointer(pointer: Phaser.Input.Pointer): void {
    if (!this.shown) return

    const zone = this.zoneAt(pointer.x / this.zoom, pointer.y / this.zoom)
    if (!zone) {
      if (this.active.delete(pointer.id)) this.sync()
      return
    }

    const previous = this.active.get(pointer.id)
    if (previous === zone) return

    this.active.set(pointer.id, zone)
    // Sliding into the jump button counts as a press, like pressing it.
    if (zone === 'jump') touchInput.jumpQueued = true
    this.sync()
  }

  private zoneAt(x: number, y: number): ZoneKind | null {
    if (this.padRect.contains(x, y)) return x < this.padRect.centerX ? 'left' : 'right'
    if (Phaser.Math.Distance.Between(x, y, this.jumpCenter.x, this.jumpCenter.y) <= BUTTON_RADIUS) {
      return 'jump'
    }
    if (Phaser.Math.Distance.Between(x, y, this.fireCenter.x, this.fireCenter.y) <= BUTTON_RADIUS) {
      return 'fire'
    }
    return null
  }

  /** Recomputes the shared state and repaints any button that changed. */
  private sync(): void {
    const next: Record<ZoneKind, boolean> = { left: false, right: false, jump: false, fire: false }
    for (const zone of this.active.values()) next[zone] = true

    touchInput.left = next.left
    touchInput.right = next.right
    touchInput.jumpHeld = next.jump
    touchInput.fireHeld = next.fire

    if (next.left !== this.pressed.left || next.right !== this.pressed.right) {
      this.pressed.left = next.left
      this.pressed.right = next.right
      this.drawPad()
    }
    if (next.jump !== this.pressed.jump) {
      this.pressed.jump = next.jump
      this.drawButton(this.jump, this.jumpCenter, next.jump)
    }
    if (next.fire !== this.pressed.fire) {
      this.pressed.fire = next.fire
      this.drawButton(this.fire, this.fireCenter, next.fire)
    }
  }

  // -------------------------------------------------------------- drawing ---

  private drawPad(): void {
    const graphics = this.pad
    const { x, y, width, height, centerY } = this.padRect
    graphics.clear()

    graphics.fillStyle(FILL, FILL_ALPHA)
    graphics.fillRoundedRect(x, y, width, height, 32)

    if (this.pressed.left || this.pressed.right) {
      const half = width / 2
      const pressX = this.pressed.left ? x : x + half
      graphics.fillStyle(FILL, FILL_ALPHA_DOWN)
      graphics.fillRoundedRect(pressX + 6, y + 6, half - 12, height - 12, 26)
    }

    graphics.fillStyle(FILL, LINE_ALPHA)
    const leftX = x + ARROW_INSET
    const rightX = x + width - ARROW_INSET
    graphics.fillTriangle(leftX + 20, centerY - 26, leftX + 20, centerY + 26, leftX - 18, centerY)
    graphics.fillTriangle(
      rightX - 20,
      centerY - 26,
      rightX - 20,
      centerY + 26,
      rightX + 18,
      centerY,
    )
  }

  private drawButton(
    graphics: Phaser.GameObjects.Graphics,
    center: Phaser.Math.Vector2,
    pressed: boolean,
  ): void {
    graphics.clear()
    graphics.fillStyle(FILL, pressed ? FILL_ALPHA_DOWN : FILL_ALPHA)
    graphics.fillCircle(center.x, center.y, BUTTON_RADIUS)
    graphics.lineStyle(4, FILL, LINE_ALPHA)
    graphics.strokeCircle(center.x, center.y, BUTTON_RADIUS)
  }

  private destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this)
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this)
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this)
    this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this)
    resetTouchInput()
  }
}
