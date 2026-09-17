import Phaser from 'phaser'
import { GameState } from '../state/GameState'

/** Loads persisted progress and hands control to the preloader. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  create(): void {
    GameState.load()

    const splash = document.getElementById('boot')
    if (splash) {
      splash.classList.add('hidden')
      splash.addEventListener('transitionend', () => splash.remove(), { once: true })
    }

    this.scene.start('Preload')
  }
}
