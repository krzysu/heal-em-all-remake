import { TILE_SIZE } from '../config'

/**
 * Minimal runtime reader for the original Tiled `.tmx` maps.
 *
 * The maps are engine-agnostic data, so rather than resaving them we parse the
 * XML they already ship as. Phaser cannot load TMX directly (only Tiled JSON),
 * but the maps are simple: orthogonal tile layers plus object groups, all
 * inline. This produces exactly the shapes Phaser needs.
 *
 * Everything carries over untouched, and Tiled remains the authoring tool.
 */

interface TmxObject {
  name: string
  type?: string | undefined
  x: number
  y: number
  width: number
  height: number
  properties: Record<string, string>
}

interface TmxLayerData {
  name: string
  width: number
  height: number
  /** Raw gids per row, 0 meaning an empty cell. */
  tiles: number[][]
}

export interface TmxMap {
  width: number
  height: number
  tileWidth: number
  tileHeight: number
  layers: TmxLayerData[]
  /** Object groups keyed by group name (`items`, `player`, `enemies`). */
  objects: Record<string, TmxObject[]>
}

function num(value: string | null, fallback = 0): number {
  if (value === null) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function parseTmx(xml: string): TmxMap {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const mapEl = doc.querySelector('map')
  if (!mapEl) throw new Error('TMX is missing a <map> element')

  const width = num(mapEl.getAttribute('width'))
  const height = num(mapEl.getAttribute('height'))
  const tileWidth = num(mapEl.getAttribute('tilewidth'), TILE_SIZE)
  const tileHeight = num(mapEl.getAttribute('tileheight'), TILE_SIZE)

  const layers: TmxLayerData[] = []
  for (const layerEl of Array.from(doc.querySelectorAll('layer'))) {
    const layerWidth = num(layerEl.getAttribute('width'), width)
    const layerHeight = num(layerEl.getAttribute('height'), height)
    const gids = Array.from(layerEl.querySelectorAll('tile')).map((tileEl) =>
      num(tileEl.getAttribute('gid')),
    )

    const tiles: number[][] = []
    for (let row = 0; row < layerHeight; row++) {
      const line: number[] = []
      for (let col = 0; col < layerWidth; col++) {
        line.push(gids[row * layerWidth + col] ?? 0)
      }
      tiles.push(line)
    }

    layers.push({
      name: layerEl.getAttribute('name') ?? '',
      width: layerWidth,
      height: layerHeight,
      tiles,
    })
  }

  const objects: Record<string, TmxObject[]> = {}
  for (const groupEl of Array.from(doc.querySelectorAll('objectgroup'))) {
    const groupName = groupEl.getAttribute('name') ?? ''
    const list: TmxObject[] = []

    for (const objEl of Array.from(groupEl.querySelectorAll('object'))) {
      const properties: Record<string, string> = {}
      for (const propEl of Array.from(objEl.querySelectorAll('property'))) {
        const propName = propEl.getAttribute('name')
        if (propName) properties[propName] = propEl.getAttribute('value') ?? ''
      }

      list.push({
        name: objEl.getAttribute('name') ?? '',
        type: objEl.getAttribute('type') ?? undefined,
        x: num(objEl.getAttribute('x')),
        y: num(objEl.getAttribute('y')),
        width: num(objEl.getAttribute('width')),
        height: num(objEl.getAttribute('height')),
        properties,
      })
    }

    objects[groupName] = list
  }

  return { width, height, tileWidth, tileHeight, layers, objects }
}

/**
 * TMX gids are 1-based (tileset `firstgid=1`) and 0 means empty, while Phaser
 * array maps are 0-based with -1 meaning empty.
 */
export function toTileIndices(tiles: number[][]): number[][] {
  return tiles.map((row) => row.map((gid) => (gid <= 0 ? -1 : gid - 1)))
}
