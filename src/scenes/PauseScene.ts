import Phaser from 'phaser'

export class PauseScene extends Phaser.Scene {
  constructor() { super('PauseScene') }

  create() {
    const W = 800; const H = 560

    // Dim overlay
    const dim = this.add.graphics()
    dim.fillStyle(0x000000, 0.65)
    dim.fillRect(0, 0, W, H)

    // Panel
    const pw = 320; const ph = 240
    const px = (W - pw) / 2; const py = (H - ph) / 2
    const panel = this.add.graphics()
    panel.fillStyle(0x0d1a2e, 0.98)
    panel.fillRoundedRect(px, py, pw, ph, 12)
    panel.lineStyle(2, 0x4a7acc, 1)
    panel.strokeRoundedRect(px, py, pw, ph, 12)

    this.add.text(W / 2, py + 38, '⏸  JOGO PAUSADO', {
      fontSize: '24px', color: '#ddeeff', fontStyle: 'bold'
    }).setOrigin(0.5)

    // Continuar
    const resumeBtn = this.add.text(W / 2, py + 110, '▶  Continuar', {
      fontSize: '18px', color: '#aaffaa',
      backgroundColor: '#1a3a1a', padding: { x: 24, y: 10 }
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' })
    resumeBtn.on('pointerover', () => resumeBtn.setAlpha(0.8))
    resumeBtn.on('pointerout',  () => resumeBtn.setAlpha(1))
    resumeBtn.on('pointerdown', () => this.resume())

    // Menu
    const menuBtn = this.add.text(W / 2, py + 170, 'Menu Principal', {
      fontSize: '16px', color: '#ccbbff',
      backgroundColor: '#1a0e33', padding: { x: 20, y: 8 }
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' })
    menuBtn.on('pointerover', () => menuBtn.setAlpha(0.8))
    menuBtn.on('pointerout',  () => menuBtn.setAlpha(1))
    menuBtn.on('pointerdown', () => this.goToMenu())

    // ESC também retoma
    this.input.keyboard!.once('keydown-ESC', () => this.resume())
  }

  private resume() {
    this.scene.resume('GameScene')
    this.scene.stop()
  }

  private goToMenu() {
    const gameScene = this.scene.get('GameScene') as any
    gameScene.shutdown?.()
    this.scene.stop('GameScene')
    this.scene.stop()
    this.scene.start('MenuScene')
  }
}
