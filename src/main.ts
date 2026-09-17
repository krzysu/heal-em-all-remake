import Phaser from 'phaser'
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TUNING } from './config'
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
  title: "Heal'em All",
  version: '0.1.0',
  scale: {
    // The original drew the world 1:1 against the window; RESIZE keeps that
    // behaviour instead of letterboxing a small design resolution.
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.NO_CENTER,
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

// Dev-only handle so the game can be driven from the console / automated smoke
// checks. Stripped from production builds.
if (import.meta.env.DEV) {
  ;(window as unknown as { game: Phaser.Game }).game = game
}
