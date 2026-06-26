import Phaser from 'phaser'
import { MenuScene } from './scenes/MenuScene'
import { GameScene } from './scenes/GameScene'
import { GameOverScene } from './scenes/GameOverScene'
import { UpgradeScene } from './scenes/UpgradeScene'
import { PauseScene } from './scenes/PauseScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#0a0a1e',
  parent: 'game-container',
  antialias: true,
  roundPixels: false,
  dom: { createContainer: true },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 800,
    height: 560,
  },
  scene: [MenuScene, GameScene, PauseScene, GameOverScene, UpgradeScene],
}

new Phaser.Game(config)
