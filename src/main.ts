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
  pixelArt: true,
  roundPixels: true,
  title: "Heal'em All",
  version: '0.1.0',
  scale: {
    mode: Phaser.Scale.FIT,
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
