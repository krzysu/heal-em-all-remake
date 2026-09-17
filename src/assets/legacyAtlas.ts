import type Phaser from 'phaser'

/**
 * The original game's sprite sheets ship as hand-authored JSON, not the atlas
 * format Phaser expects. Quintus laid frames out left-to-right, wrapping every
 * `cols` columns from an origin of (sx, sy), each frame `tilew` x `tileh`.
 *
 * This registers each frame on an already-loaded texture under the key
 * `"<name>:<index>"`, so gameplay code can do:
 *
 *   this.physics.add.sprite(x, y, 'characters', 'player:1')
 *
 * Frame indices match the original animation definitions, so porting an
 * animation is a straight mapping.
 */

export interface LegacyFrame {
  sx: number
  sy: number
  cols: number
  tilew: number
  tileh: number
  frames: number
}

export type LegacyAtlas = Record<string, LegacyFrame>

function isLegacyAtlas(value: unknown): value is LegacyAtlas {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function registerLegacyAtlas(
  scene: Phaser.Scene,
  textureKey: string,
  atlasKey: string,
): number {
  const data: unknown = scene.cache.json.get(atlasKey)
  if (!isLegacyAtlas(data)) {
    console.warn(`[legacyAtlas] "${atlasKey}" is not a valid atlas`)
    return 0
  }

  const texture = scene.textures.get(textureKey)
  let added = 0

  for (const [name, def] of Object.entries(data)) {
    // Some entries omit `cols` (single-column sheets).
    const cols = def.cols > 0 ? def.cols : def.frames
    if (cols <= 0) continue

    for (let i = 0; i < def.frames; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      texture.add(
        `${name}:${i}`,
        0,
        def.sx + col * def.tilew,
        def.sy + row * def.tileh,
        def.tilew,
        def.tileh,
      )
      added++
    }
  }

  return added
}
