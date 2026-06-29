import Phaser from 'phaser'

export abstract class BaseScene extends Phaser.Scene {
  protected makeBtn(
    x: number, y: number,
    label: string,
    bgColor: number,
    color: string,
    cb: () => void,
  ): Phaser.GameObjects.Text {
    const btn = this.add.text(x, y, label, {
      fontSize: '20px', color,
      backgroundColor: Phaser.Display.Color.IntegerToColor(bgColor).rgba,
      padding: { x: 28, y: 11 }, fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' })
    btn.on('pointerover', () => btn.setAlpha(0.8))
    btn.on('pointerout',  () => btn.setAlpha(1))
    btn.on('pointerdown', cb)
    return btn
  }
}
