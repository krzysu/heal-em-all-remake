import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseTmx, toTileIndices } from './tmx'
import { getLevelSpawns } from './levels'
import { TOTAL_LEVELS } from '../config'

const tmxPath = (level: number): string =>
  resolve(process.cwd(), `public/assets/data/level${level}.tmx`)

const loadMap = (level: number) => parseTmx(readFileSync(tmxPath(level), 'utf8'))

/** Sums the per-level enemy mix so it can be compared with the map's zombies. */
const MIX_TOTALS: Record<number, number> = { 1: 1, 2: 4, 3: 8, 4: 13, 5: 19, 6: 23 }

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
  it('uses the hand-ported tables for levels 1 and 2', () => {
    expect(getLevelSpawns(1, loadMap(1)).zombies).toHaveLength(1)
    expect(getLevelSpawns(2, loadMap(2)).zombies).toHaveLength(4)
  })

  it('matches the documented enemy total for every level', () => {
    for (let level = 1; level <= TOTAL_LEVELS; level++) {
      expect(getLevelSpawns(level, loadMap(level)).zombies).toHaveLength(MIX_TOTALS[level] ?? 0)
    }
  })

  it('assigns an archetype to every zombie, spread rather than clumped', () => {
    const spawns = getLevelSpawns(3, loadMap(3)).zombies
    expect(spawns.every((spawn) => spawn.archetype !== undefined)).toBe(true)
    // Round-robin order means the first four differ.
    expect(new Set(spawns.slice(0, 4).map((s) => s.archetype)).size).toBe(4)
  })

  it('gives level 5 the randomised key/door/sign layout and four health packs', () => {
    for (let attempt = 0; attempt < 20; attempt++) {
      const items = getLevelSpawns(5, loadMap(5)).items
      const kinds = items.map((item) => item.kind)
      expect(kinds.filter((kind) => kind === 'key')).toHaveLength(1)
      expect(kinds.filter((kind) => kind === 'door')).toHaveLength(1)
      expect(kinds.filter((kind) => kind === 'exit_sign')).toHaveLength(1)
      expect(kinds.filter((kind) => kind === 'health')).toHaveLength(4)
      expect(kinds.filter((kind) => kind === 'gun')).toHaveLength(4)
    }
  })

  it('never mutates the shared spawn tables', () => {
    const first = getLevelSpawns(2, loadMap(2)).zombies
    first[0]!.x = -1
    const second = getLevelSpawns(2, loadMap(2)).zombies
    expect(second[0]!.x).not.toBe(-1)
  })
})
