import Phaser from 'phaser'
import { ASSETS, ASSET_BASE, COLORS, FONTS, GAME_WIDTH, TILE_SIZE, TOTAL_LEVELS } from '../config'
import { registerLegacyAtlas } from '../assets/legacyAtlas'
import { registerAnimations } from '../assets/animations'
import { createMenuFrame } from '../ui/layout'
import { addSplashHeading, SPLASH } from '../ui/splash'
import { navigate } from '../ui/navigation'
import { BUTTON, TYPE } from '../ui/theme'

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload')
  }

  preload(): void {
    this.drawProgress()
    this.queueAssets()
  }

  create(): void {
    // Legacy JSON atlases are not in Phaser's format; convert them into frames
    // registered on the already-loaded sheets.
    for (const key of Object.keys(ASSETS.atlases)) {
      registerLegacyAtlas(this, key, `atlas:${key}`)
    }

    registerAnimations(this)

    navigate(this, 'Start')
  }

  private queueAssets(): void {
    const { images, atlases, audio } = ASSETS

    // The backdrop is stretched as an image, never used as a frame.
    this.load.image('bg', `${ASSET_BASE}/${images.bg}`)

    // The tile sheet is the one sheet we want sliced on load.
    this.load.spritesheet('map_tiles', `${ASSET_BASE}/${images.mapTiles}`, {
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
    })

    for (const [key, path] of Object.entries(images)) {
      if (key === 'bg' || key === 'mapTiles') continue
      this.load.image(key, `${ASSET_BASE}/${path}`)
    }

    for (const [key, path] of Object.entries(atlases)) {
      this.load.json(`atlas:${key}`, `${ASSET_BASE}/${path}`)
    }

    for (const [key, path] of Object.entries(audio)) {
      this.load.audio(key, `${ASSET_BASE}/${path}`)
    }

    // Maps stay as the original TMX; GameScene parses the XML at runtime.
    for (let level = 1; level <= TOTAL_LEVELS; level++) {
      this.load.text(`level${level}`, `${ASSET_BASE}/${ASSETS.levels(level)}`)
    }
  }

  /**
   * Draws the same heading as the title screen (via `ui/splash.ts`) and a
   * button-shaped progress bar in the Continue button's slot, so the screen does
   * not jump in size or placement when loading hands off to `StartScene`.
   * Rendered before `bg` exists, so the frame has no backdrop.
   */
  private drawProgress(): void {
    const { root, fit } = createMenuFrame(this, { backdrop: false })
    addSplashHeading(this, root)

    const accent = Phaser.Display.Color.HexStringToColor(COLORS.accent).color
    const track = this.add.graphics()
    const status = this.add
      .text(GAME_WIDTH / 2, SPLASH.actionY, 'Loading...', {
        fontFamily: FONTS.title,
        fontSize: `${TYPE.button}px`,
        color: COLORS.ink,
      })
      .setOrigin(0.5)

    root.add([track, status])

    const left = GAME_WIDTH / 2 - BUTTON.primaryWidth / 2
    const top = SPLASH.actionY - BUTTON.height / 2

    const draw = (value: number): void => {
      const filled = BUTTON.primaryWidth * Phaser.Math.Clamp(value, 0, 1)
      track.clear()
      track.fillStyle(Phaser.Display.Color.HexStringToColor(COLORS.muted).color, 0.25)
      track.fillRoundedRect(left, top, BUTTON.primaryWidth, BUTTON.height, BUTTON.radius)
      if (filled <= 0) return
      track.fillStyle(accent, 1)
      track.fillRoundedRect(left, top, filled, BUTTON.height, Math.min(BUTTON.radius, filled / 2))
    }

    draw(0)
    fit()

    this.load.on('progress', (value: number) => {
      draw(value)
      status.setText(`Loading... ${Math.round(value * 100)}%`)
    })

    this.load.on('complete', () => {
      draw(1)
      status.setText('Ready')
    })
  }
}
