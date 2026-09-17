/**
 * Global game constants. Tuning lives here so gameplay code stays readable.
 */

/** Design resolution. Phaser's FIT scale mode letterboxes this to any screen. */
export const GAME_WIDTH = 640
export const GAME_HEIGHT = 360

/** Original maps use 70px tiles. Keep the art's native grid. */
export const TILE_SIZE = 70

export const TOTAL_LEVELS = 6

export const COLORS = {
  bg: '#3c4556',
  title: '#f2da38',
  accent: '#c4da4a',
  danger: '#ec655d',
  muted: '#9ca2ae',
  ink: '#353b47',
  panel: '#232322',
} as const

export const FONTS = {
  title: 'Jolly Lodger',
  body: 'Boogaloo',
} as const

/** Reuse the original save keys so old progress is not lost. */
export const STORAGE_KEYS = {
  availableLevel: 'zombieGame:availableLevel',
  levelProgress: 'zombieGame:levelProgress',
} as const

/** Asset paths are relative to Vite's BASE_URL. */
export const ASSET_BASE = `${import.meta.env.BASE_URL}assets`

export const ASSETS = {
  images: {
    characters: 'images/characters.png',
    items: 'images/items.png',
    hud: 'images/hud.png',
    others: 'images/others.png',
    bullet: 'images/bullet.png',
    mapTiles: 'images/map_tiles.png',
    gradientTop: 'images/gradient-top.png',
    background: 'images/bg-blured.jpg',
  },
  /** Legacy hand-authored frame atlases (see assets/legacyAtlas.ts). */
  atlases: {
    characters: 'data/characters.json',
    items: 'data/items.json',
    hud: 'data/hud.json',
    others: 'data/others.json',
    bullet: 'data/bullet.json',
  },
  audio: {
    zombieMode: 'audio/zombie_mode.mp3',
    playerBg: 'audio/player_bg.mp3',
    zombieNotice: 'audio/zombie_notice.mp3',
    gunShot: 'audio/gun_shot.mp3',
    collected: 'audio/collected.mp3',
    playerHit: 'audio/player_hit.mp3',
    humanCreated: 'audio/human_created.mp3',
  },
  levels: (n: number) => `data/level${n}.tmx`,
} as const

/**
 * Physics feel. Original Quintus values were jumpSpeed -660 / speed 330;
 * Arcade Physics needs its own tuning, so treat these as a starting point.
 */
export const TUNING = {
  gravityY: 1800,
  moveSpeed: 330,
  jumpVelocity: -620,
  /** Grace period after walking off a ledge where a jump still works. */
  coyoteTimeMs: 100,
  /** How early a jump press is remembered before landing. */
  jumpBufferMs: 120,
} as const
