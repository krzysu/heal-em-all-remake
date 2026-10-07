import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LEVEL_MAP_PATH, SCREEN, TILE_SIZE, TOTAL_LEVELS } from '../config'
import { parseTmx, toTileIndices } from './tmx'
import { getLevelSpawns } from './levels'

const tmxPath = (level: number): string =>
  resolve(process.cwd(), `public/assets/data/level${level}.tmx`)

const loadMap = (level: number) => parseTmx(readFileSync(tmxPath(level), 'utf8'))

const campaignPath = (level: number): string =>
  resolve(process.cwd(), 'public/assets', LEVEL_MAP_PATH(level))

const loadRoom = (level: number) => parseTmx(readFileSync(campaignPath(level), 'utf8'))

describe('parseTmx', () => {
  it('reads the map header and layers of every original level', () => {
    for (let level = 1; level <= TOTAL_LEVELS; level++) {
      const map = loadMap(level)
      expect(map.width).toBeGreaterThan(0)
      expect(map.height).toBeGreaterThan(0)
      expect(map.tileWidth).toBe(70)
      expect(map.layers.map((layer) => layer.name)).toEqual(['collision', 'foreground'])
      expect(map.layers[0]?.tiles).toHaveLength(map.height)
      expect(map.layers[0]?.tiles[0]).toHaveLength(map.width)
    }
  })

  it('keeps gid 0 for empty cells so callers can offset by one', () => {
    const map = loadMap(1)
    const collision = map.layers[0]
    expect(collision?.tiles.some((row) => row.includes(0))).toBe(true)
    const indices = toTileIndices(collision?.tiles ?? [])
    expect(indices.some((row) => row.includes(-1))).toBe(true)
  })

  it('rejects XML without a map element', () => {
    expect(() => parseTmx('<not-a-map />')).toThrow(/missing a <map>/)
  })
})

describe('getLevelSpawns', () => {
  it('reads the archetype and startLeft a map declares', () => {
    const map = loadRoom(2)
    const spawns = getLevelSpawns(2, map)
    const declared = new Set(
      (map.objects['enemies'] ?? []).map((obj) => obj.properties['archetype']),
    )
    expect(spawns.zombies.length).toBeGreaterThan(0)
    expect(spawns.zombies.every((spawn) => declared.has(spawn.archetype ?? ''))).toBe(true)
    // The generator flags the left-half zombies as walking right first.
    expect(spawns.zombies.some((spawn) => spawn.startLeft === true)).toBe(true)
    expect(new Set(spawns.zombies.map((spawn) => spawn.archetype)).size).toBeGreaterThan(1)
  })

  it('never mutates the shared spawn tables', () => {
    const first = getLevelSpawns(2, loadRoom(2)).zombies
    first[0]!.x = -1
    const second = getLevelSpawns(2, loadRoom(2)).zombies
    expect(second[0]!.x).not.toBe(-1)
  })
})

describe('the single-screen room set', () => {
  it('is one screen per room, with both layers present', () => {
    for (let level = 1; level <= TOTAL_LEVELS; level++) {
      const map = loadRoom(level)
      expect(map.width).toBe(SCREEN.tilesWide)
      expect(map.height).toBe(SCREEN.tilesHigh)
      expect(map.layers.map((layer) => layer.name)).toEqual(['collision', 'foreground'])
      expect(map.layers[0]?.tiles.some((row) => row.some((gid) => gid > 0))).toBe(true)
    }
  })

  it('carries its own player start, hint and one key / door / sign per room', () => {
    for (let level = 1; level <= TOTAL_LEVELS; level++) {
      const map = loadRoom(level)
      const spawns = getLevelSpawns(level, map)
      expect(map.objects['player']).toHaveLength(1)
      expect(spawns.hint).toBeTruthy()
      expect(spawns.zombies.length).toBeGreaterThan(0)

      const kinds = spawns.items.map((item) => item.kind)
      expect(kinds.filter((kind) => kind === 'key')).toHaveLength(1)
      expect(kinds.filter((kind) => kind === 'door')).toHaveLength(1)
      expect(kinds.filter((kind) => kind === 'exit_sign')).toHaveLength(1)
      expect(kinds.filter((kind) => kind === 'gun').length).toBeGreaterThan(0)

      // Room 5 is the ammo trap: one bullet in front of the brute, a real clip
      // behind him, so the charge shot is the only way through.
      const bullets = spawns.items.reduce((total, item) => total + (item.bullets ?? 0), 0)
      if (level === 5) expect(bullets).toBe(7)
    }
  })

  it('stands the player on solid ground and every zombie over a platform', () => {
    for (let level = 1; level <= TOTAL_LEVELS; level++) {
      const map = loadRoom(level)
      const collision = map.layers[0]
      const solidAt = (x: number, y: number): number =>
        collision?.tiles[Math.floor(y / TILE_SIZE)]?.[Math.floor(x / TILE_SIZE)] ?? 0

      const spawns = getLevelSpawns(level, map)
      expect(solidAt(spawns.player.x, spawns.player.y + 49)).toBeGreaterThan(0)

      for (const zombie of spawns.zombies) {
        expect(solidAt(zombie.x, zombie.y + 49)).toBeGreaterThan(0)
      }
      for (const item of spawns.items) {
        // Items float one cell above their platform.
        expect(solidAt(item.x, item.y + TILE_SIZE / 2)).toBeGreaterThan(0)
      }
    }
  })
})
