import { TILE_SIZE } from '../config'
import type { TmxMap } from './tmx'

/**
 * Spawn tables per level.
 *
 * Levels 1 and 2 placed their entities in the scene scripts rather than the
 * TMX object layers, so they get explicit overrides ported from the original
 * `level1.coffee` / `level2.coffee`. Levels 3-6 used
 * `map.addObjectsToStage()`, so their spawns are read from the object groups.
 *
 * Object coordinates follow the original convention: the object's x/y is the
 * top-left of its cell, and the entity is centred one half-tile in.
 */

export interface Point {
  x: number
  y: number
}

export type EnemyArchetype = 'walker' | 'runner' | 'brute' | 'spitter'

export interface ZombieSpawn extends Point {
  /** Original quirk: `startLeft` true actually means "walk right first". */
  startLeft?: boolean
  archetype?: EnemyArchetype
}

export type ItemKind = 'key' | 'door' | 'gun' | 'health' | 'exit_sign'

export interface ItemSpawn extends Point {
  kind: ItemKind
  bullets?: number
}

export interface LevelSpawns {
  player: Point
  zombies: ZombieSpawn[]
  items: ItemSpawn[]
}

/** Mirrors the original `Q.tilePos(col, row)`: centre of a tile, supports .5. */
function tilePos(col: number, row: number): Point {
  return { x: col * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 }
}

/** Player start per level, ported from `Q.tilePos(...)` in each scene. */
const PLAYER_START: Record<number, Point> = {
  1: tilePos(3.5, 9),
  2: tilePos(2.5, 9),
  3: tilePos(24.5, 14),
  4: tilePos(3, 23),
  5: tilePos(49.5, 21),
  6: tilePos(3, 3),
}

const SPAWN_OVERRIDES: Record<number, { zombies: ZombieSpawn[]; items: ItemSpawn[] }> = {
  1: {
    zombies: [tilePos(14, 9)],
    items: [
      { kind: 'key', ...tilePos(14.5, 9) },
      { kind: 'door', ...tilePos(27, 9) },
      { kind: 'gun', bullets: 3, ...tilePos(14.5, 3) },
      { kind: 'health', ...tilePos(14.5, 15) },
    ],
  },
  2: {
    zombies: [
      tilePos(9, 6),
      { ...tilePos(8, 12), startLeft: true },
      { ...tilePos(20, 6), startLeft: true },
      tilePos(21, 12),
    ],
    items: [
      { kind: 'key', ...tilePos(14.5, 3) },
      { kind: 'door', ...tilePos(27, 9) },
      { kind: 'gun', bullets: 6, ...tilePos(14.5, 9) },
      { kind: 'health', ...tilePos(14.5, 15) },
    ],
  },
}

/**
 * Level 5 is a symmetric arena: the original skipped the map's Key/Door/Health
 * objects and instead picked one of four mirrored placements at random, then
 * always added two more health pickups. Ported from `level5.coffee`.
 */
const LEVEL5_LAYOUTS: { door: Point; sign: Point; key: Point; health: Point[] }[] = [
  {
    door: tilePos(50, 3),
    sign: tilePos(48, 3),
    key: tilePos(49.5, 39),
    health: [tilePos(5, 21), tilePos(94, 21)],
  },
  {
    door: tilePos(49, 39),
    sign: tilePos(51, 39),
    key: tilePos(49.5, 3),
    health: [tilePos(5, 21), tilePos(94, 21)],
  },
  {
    door: tilePos(4, 21),
    sign: tilePos(6, 21),
    key: tilePos(94, 21),
    health: [tilePos(49.5, 39), tilePos(49.5, 3)],
  },
  {
    door: tilePos(95, 21),
    sign: tilePos(93, 21),
    key: tilePos(5, 21),
    health: [tilePos(49.5, 39), tilePos(49.5, 3)],
  },
]

const LEVEL5_BONUS_HEALTH = [tilePos(4.5, 6), tilePos(94.5, 7)]

function healthAt(point: Point): ItemSpawn {
  return { kind: 'health', x: point.x, y: point.y }
}

/** TMX pickups it still wants plus the randomised layout, minus the skipped kinds. */
function level5Items(base: ItemSpawn[]): ItemSpawn[] {
  const layout =
    LEVEL5_LAYOUTS[Math.floor(Math.random() * LEVEL5_LAYOUTS.length)] ?? LEVEL5_LAYOUTS[0]!
  return [
    ...base.filter((item) => item.kind !== 'key' && item.kind !== 'door' && item.kind !== 'health'),
    { kind: 'key', ...layout.key },
    { kind: 'door', ...layout.door },
    { kind: 'exit_sign', ...layout.sign },
    ...layout.health.map(healthAt),
    ...LEVEL5_BONUS_HEALTH.map(healthAt),
  ]
}

const ITEM_KINDS: Record<string, ItemKind> = {
  key: 'key',
  door: 'door',
  gun: 'gun',
  health: 'health',
  exit_sign: 'exit_sign',
  exitsign: 'exit_sign',
  sign: 'exit_sign',
}

function spawnsFromObjects(tmx: TmxMap): { zombies: ZombieSpawn[]; items: ItemSpawn[] } {
  const zombies: ZombieSpawn[] = []
  for (const obj of tmx.objects['enemies'] ?? []) {
    if (obj.name.toLowerCase() !== 'zombie') continue
    zombies.push({
      x: obj.x + tmx.tileWidth / 2,
      y: obj.y + tmx.tileHeight / 2,
      startLeft: obj.properties['startLeft'] === 'true',
    })
  }

  const items: ItemSpawn[] = []
  for (const obj of tmx.objects['items'] ?? []) {
    const kind = ITEM_KINDS[obj.name.toLowerCase()]
    if (!kind) continue

    const spawn: ItemSpawn = {
      kind,
      x: obj.x + tmx.tileWidth / 2,
      y: obj.y + tmx.tileHeight / 2,
    }

    const bullets = Number.parseInt(obj.properties['bullets'] ?? '', 10)
    if (Number.isFinite(bullets) && bullets > 0) spawn.bullets = bullets
    items.push(spawn)
  }

  return { zombies, items }
}

export function getLevelSpawns(level: number, tmx: TmxMap): LevelSpawns {
  const player = PLAYER_START[level] ?? tilePos(3, 9)
  const override = SPAWN_OVERRIDES[level]
  const base = override ?? spawnsFromObjects(tmx)

  // Copy the spawns so the archetype assignment never mutates the tables above.
  const zombies = base.zombies.map((spawn) => Object.assign({}, spawn))
  const archetypes = archetypeList(level, zombies.length)
  zombies.forEach((spawn, index) => {
    spawn.archetype = archetypes[index] ?? 'walker'
  })

  return {
    player,
    zombies,
    items:
      level === 5 ? level5Items(base.items) : base.items.map((item) => Object.assign({}, item)),
  }
}

/**
 * Enemy mix per level, tuned for escalating action: level 1 stays a gentle
 * tutorial, later levels fold in runners, armoured brutes and ranged spitters.
 * Counts sum to each level's zombie total.
 */
const LEVEL_MIX: Record<number, Partial<Record<EnemyArchetype, number>>> = {
  1: { walker: 1 },
  2: { walker: 3, runner: 1 },
  3: { walker: 4, runner: 2, brute: 1, spitter: 1 },
  4: { walker: 6, runner: 3, brute: 2, spitter: 2 },
  5: { walker: 9, runner: 5, brute: 3, spitter: 2 },
  6: { walker: 10, runner: 6, brute: 4, spitter: 3 },
}

const MIX_ORDER: EnemyArchetype[] = ['walker', 'runner', 'brute', 'spitter']

/** Round-robins the mix so archetypes are spread across the level, not clumped. */
function archetypeList(level: number, count: number): EnemyArchetype[] {
  const mix = LEVEL_MIX[level]
  const list: EnemyArchetype[] = []
  if (!mix) return Array.from({ length: count }, () => 'walker' as EnemyArchetype)

  const buckets = MIX_ORDER.map((kind) => ({ kind, remaining: mix[kind] ?? 0 }))
  while (list.length < count) {
    let added = false
    for (const bucket of buckets) {
      if (bucket.remaining <= 0 || list.length >= count) continue
      list.push(bucket.kind)
      bucket.remaining -= 1
      added = true
    }
    if (!added) break
  }

  while (list.length < count) list.push('walker')
  return list
}
