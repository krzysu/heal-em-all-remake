import Phaser from 'phaser'

/**
 * Animations ported from the original CoffeeScript definitions.
 *
 * Quintus used `rate` as SECONDS PER FRAME, so Phaser's frameRate is `1 / rate`.
 * The `next` chaining Quintus supported is not part of Phaser animations; the
 * entity code will drive chained states via the animation `complete` event.
 */

interface AnimSpec {
  key: string
  /** Texture key the frames were registered on. */
  texture: string
  /** Sub-atlas name from the legacy JSON (frames are `"<sheet>:<index>"`). */
  sheet: string
  frames: number[]
  /** Original Quintus rate, in seconds per frame. */
  rate: number
  repeat: number
}

const specs: AnimSpec[] = [
  // Player
  { key: 'player:stand', texture: 'characters', sheet: 'player', frames: [1], rate: 1, repeat: -1 },
  { key: 'player:run', texture: 'characters', sheet: 'player', frames: [0, 1, 2, 1], rate: 1 / 4, repeat: -1 },
  { key: 'player:jump', texture: 'characters', sheet: 'player', frames: [3, 4, 5, 4], rate: 1 / 3, repeat: -1 },
  { key: 'player:hit', texture: 'characters', sheet: 'player', frames: [4], rate: 1, repeat: 0 },

  // Player with gun
  { key: 'playerGun:stand', texture: 'characters', sheet: 'player_with_gun', frames: [1], rate: 1, repeat: -1 },
  { key: 'playerGun:run', texture: 'characters', sheet: 'player_with_gun', frames: [0, 1, 2, 1], rate: 1 / 4, repeat: -1 },
  { key: 'playerGun:jump', texture: 'characters', sheet: 'player_with_gun', frames: [3], rate: 1, repeat: -1 },
  { key: 'playerGun:hit', texture: 'characters', sheet: 'player_with_gun', frames: [3], rate: 1, repeat: 0 },

  // Zombie
  { key: 'zombie:run', texture: 'characters', sheet: 'zombie', frames: [0, 1, 2, 3], rate: 0.4, repeat: -1 },
  { key: 'zombie:attack', texture: 'characters', sheet: 'zombie', frames: [8, 9, 10, 11], rate: 1 / 2, repeat: 0 },
  { key: 'zombie:hit', texture: 'characters', sheet: 'zombie', frames: [10], rate: 1, repeat: 0 },
  { key: 'zombie:fall', texture: 'characters', sheet: 'zombie', frames: [4, 5, 6, 7, 7, 7, 7], rate: 1 / 5, repeat: 0 },
  { key: 'zombie:dead', texture: 'characters', sheet: 'zombie', frames: [16, 17, 18, 19, 20, 21], rate: 1 / 3, repeat: 0 },

  // Human
  { key: 'human:intro', texture: 'characters', sheet: 'human', frames: [0, 1, 2, 3], rate: 0.7, repeat: 0 },
  { key: 'human:stand', texture: 'characters', sheet: 'human', frames: [4, 5, 6], rate: 1 / 3, repeat: -1 },
  { key: 'human:outro', texture: 'characters', sheet: 'human', frames: [3, 2, 1, 0], rate: 0.8, repeat: 0 },

  // Zombie player
  { key: 'zombiePlayer:stand', texture: 'characters', sheet: 'zombie_player', frames: [4], rate: 1, repeat: -1 },
  { key: 'zombiePlayer:run', texture: 'characters', sheet: 'zombie_player', frames: [3, 4, 5, 4], rate: 1 / 3, repeat: -1 },
  { key: 'zombiePlayer:jump', texture: 'characters', sheet: 'zombie_player', frames: [3], rate: 1, repeat: -1 },
  { key: 'zombiePlayer:intro', texture: 'characters', sheet: 'zombie_player', frames: [0, 1, 0, 1, 0, 1], rate: 0.8, repeat: 0 },

  // Bullet
  { key: 'bullet:fly', texture: 'bullet', sheet: 'bullet', frames: [0, 1, 2, 3, 4, 5], rate: 0.3, repeat: -1 },
]

export function registerAnimations(scene: Phaser.Scene): void {
  for (const spec of specs) {
    if (scene.anims.exists(spec.key)) continue

    scene.anims.create({
      key: spec.key,
      frames: spec.frames.map((index) => ({ key: spec.texture, frame: `${spec.sheet}:${index}` })),
      frameRate: 1 / spec.rate,
      repeat: spec.repeat,
    })
  }
}
