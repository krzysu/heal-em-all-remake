import Phaser from 'phaser'

/**
 * Cross-scene glue: the event bus plus the state store. The store itself is a
 * plain module (`./store`) so it can be unit tested without Phaser.
 */
export { GameState, type RunState } from './store'

export const Events = {
  livesChanged: 'lives:changed',
  bulletsChanged: 'bullets:changed',
  zombiesChanged: 'zombies:changed',
  keyChanged: 'key:changed',
  playerMode: 'player:mode',
  info: 'info',
} as const

/** Cross-scene event bus (HUD listens, gameplay emits). */
export const bus = new Phaser.Events.EventEmitter()
