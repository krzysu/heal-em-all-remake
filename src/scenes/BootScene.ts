import Phaser from 'phaser'
import { GameState } from '../state/GameState'
import { whenFontsReady } from '../ui/fonts'

/** Loads persisted progress and hands control to the preloader. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  async create(): Promise<void> {
    GameState.load()

    // Keep the DOM splash up until the web fonts are ready, so the first Phaser
    // text is rasterised with the real face instead of a fallback.
    await whenFontsReady()

    const splash = document.getElementById('boot')
    if (splash) {
      splash.classList.add('hidden')
      splash.addEventListener('transitionend', () => splash.remove(), { once: true })
    }

    this.scene.start('Preload')
  }
}
