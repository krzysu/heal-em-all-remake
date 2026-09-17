import Phaser from 'phaser'
import { ASSETS, ASSET_BASE, COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH, TILE_SIZE } from '../config'
import { registerLegacyAtlas } from '../assets/legacyAtlas'
import { registerAnimations } from '../assets/animations'

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

    this.scene.start('Start')
  }

  private queueAssets(): void {
    const { images, atlases, audio } = ASSETS

    // Background is stretched as a tile sprite, not used as a sprite frame.
    this.load.image('background', `${ASSET_BASE}/${images.background}`)

    // The tile sheet is the one sheet we want sliced on load.
    this.load.spritesheet('map_tiles', `${ASSET_BASE}/${images.mapTiles}`, {
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
    })

    for (const [key, path] of Object.entries(images)) {
      if (key === 'background' || key === 'mapTiles') continue
      this.load.image(key, `${ASSET_BASE}/${path}`)
    }

    for (const [key, path] of Object.entries(atlases)) {
      this.load.json(`atlas:${key}`, `${ASSET_BASE}/${path}`)
    }

    for (const [key, path] of Object.entries(audio)) {
      this.load.audio(key, `${ASSET_BASE}/${path}`)
    }

    // TODO(Phase 2): load Tiled levels once the TMX -> Tiled JSON pass is done.
  }

  private drawProgress(): void {
    const centerX = GAME_WIDTH / 2
    const centerY = GAME_HEIGHT / 2 + 36
    const barWidth = 260
    const barHeight = 12
    const barLeft = centerX - barWidth / 2
    const accent = Phaser.Display.Color.HexStringToColor(COLORS.accent).color

    this.add
      .text(centerX, centerY - 92, "Heal'em All", {
        fontFamily: FONTS.title,
        fontSize: '64px',
        color: COLORS.title,
      })
      .setOrigin(0.5)

    this.add
      .text(centerX, centerY - 46, "There's a cure for zombies", {
        fontFamily: FONTS.title,
        fontSize: '24px',
        color: COLORS.danger,
      })
      .setOrigin(0.5)

    const status = this.add
      .text(centerX, centerY - 20, 'Loading...', {
        fontFamily: FONTS.body,
        fontSize: '16px',
        color: COLORS.muted,
      })
      .setOrigin(0.5)

    const graphics = this.add.graphics()

    const draw = (value: number): void => {
      graphics.clear()
      graphics.fillStyle(0x9ca2ae, 0.25)
      graphics.fillRect(barLeft, centerY + 24, barWidth, barHeight)
      graphics.fillStyle(accent, 1)
      graphics.fillRect(barLeft, centerY + 24, barWidth * value, barHeight)
    }

    draw(0)

    this.load.on('progress', (value: number) => {
      draw(Phaser.Math.Clamp(value, 0, 1))
      status.setText(`Loading... ${Math.round(value * 100)}%`)
    })

    this.load.on('complete', () => {
      draw(1)
      status.setText('Ready')
    })
  }
}
