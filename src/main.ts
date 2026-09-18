import Phaser from 'phaser'
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TUNING } from './config'
import { installOrientationGate } from './ui/orientation'
import { BootScene } from './scenes/BootScene'
import { PreloadScene } from './scenes/PreloadScene'
import { StartScene } from './scenes/StartScene'
import { ControlsScene } from './scenes/ControlsScene'
import { LevelSelectScene } from './scenes/LevelSelectScene'
import { GameScene } from './scenes/GameScene'
import { HudScene } from './scenes/HudScene'
import { LevelSummaryScene } from './scenes/LevelSummaryScene'
import { GameOverScene } from './scenes/GameOverScene'
import { EndScene } from './scenes/EndScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.bg,
  // The original drew the world 1:1 at device pixel ratio 1 with smoothing on:
  // its art is vector-ish and its UI is web fonts, so nearest-neighbour sampling
  // made the remaster look harsher than the source rather than sharper.
  pixelArt: false,
  roundPixels: false,
  // Touch controls need several simultaneous pointers: move + jump + fire.
  // The touch plugin defaults to on only for touch-capable devices; enabling it
  // unconditionally is harmless (mouse still works) and keeps the controls
  // testable with the `?touch=1` override.
  input: {
    activePointers: 4,
    touch: true,
  },
  title: "Heal'em All",
  version: '0.1.0',
  scale: {
    // EXPAND fills the parent by growing the design space on whichever axis has
    // spare room, so there are never letterbox bars: a wide monitor sees more
    // world horizontally, a tall one more vertically. The canvas stays 1 design
    // pixel per canvas pixel (unlike FIT's downscale), so text stays sharp.
    // Scenes read the live `scale.width/height` and re-layout on RESIZE.
    mode: Phaser.Scale.EXPAND,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: TUNING.gravityY },
      debug: false,
    },
  },
  scene: [
    BootScene,
    PreloadScene,
    StartScene,
    ControlsScene,
    LevelSelectScene,
    GameScene,
    HudScene,
    LevelSummaryScene,
    GameOverScene,
    EndScene,
  ],
}

export const game = new Phaser.Game(config)

installOrientationGate(game)

// Progressive web app: the service worker unlocks installability (and a cached
// offline shell). Registered in production only so Vite's dev server and HMR are
// never intercepted; without it the game still runs.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
  })
}

// Dev-only handle so the game can be driven from the console / automated smoke
// checks. Stripped from production builds.
if (import.meta.env.DEV) {
  ;(window as unknown as { game: Phaser.Game }).game = game
}
