import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as config from '../config'
import type { getLevelSpawns as spawnsFor } from './levels'
import { parseTmx } from './tmx'

/**
 * The classic six are no longer the campaign, but they are still in the repo
 * and still loadable (`LEVEL_SET = 'classic'`), so their behaviour stays
 * covered. `levels.ts` reads `LEVEL_SET` at call time, so mocking the config
 * module and re-importing is enough to test that path from the same build.
 */
let getLevelSpawns: typeof spawnsFor

const tmxPath = (level: number): string =>
  resolve(process.cwd(), `public/assets/data/level${level}.tmx`)

const loadMap = (level: number) => parseTmx(readFileSync(tmxPath(level), 'utf8'))

/** Sums the per-level enemy mix so it can be compared with the map's zombies. */
const MIX_TOTALS: Record<number, number> = { 1: 1, 2: 4, 3: 8, 4: 13, 5: 19, 6: 23 }

describe('getLevelSpawns (classic set)', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.doMock('../config', async () => {
      const actual = await vi.importActual<typeof config>('../config')
      return { ...actual, LEVEL_SET: 'classic' }
    })
    const levels = await import('./levels')
    getLevelSpawns = levels.getLevelSpawns
  })

  it('uses the hand-ported tables for levels 1 and 2', () => {
    expect(getLevelSpawns(1, loadMap(1)).zombies).toHaveLength(1)
    expect(getLevelSpawns(2, loadMap(2)).zombies).toHaveLength(4)
  })

  it('matches the documented enemy total for every level', () => {
    for (let level = 1; level <= 6; level++) {
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
      const kinds = getLevelSpawns(5, loadMap(5)).items.map((item) => item.kind)
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
