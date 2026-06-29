import { SupabaseService } from '../services/SupabaseService'
import { ProgressManager } from '../managers/ProgressManager'
import { BaseScene } from './BaseScene'

interface GameOverData { score: number; phase: number }

export class GameOverScene extends BaseScene {
  constructor() { super('GameOverScene') }

  create(data: GameOverData) {
    const w = this.scale.width
    const { score = 0, phase = 1 } = data ?? {}

    const bg = this.add.graphics()
    bg.fillGradientStyle(0x0a0a1e, 0x0a0a1e, 0x1a0505, 0x1a0505, 1)
    bg.fillRect(0, 0, w, 560)

    this.add.text(w / 2, 80, '💀 GAME OVER', {
      fontSize: '50px', color: '#ff4444', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5)

    this.add.text(w / 2, 155, `Fase alcançada: ${phase}`, {
      fontSize: '18px', color: '#ffaa44',
    }).setOrigin(0.5)

    this.add.text(w / 2, 190, `Pontuação final: ${score}`, {
      fontSize: '24px', color: '#ffcc00', fontStyle: 'bold',
    }).setOrigin(0.5)

    this.add.text(w / 2, 240, 'Salvar no ranking:', { fontSize: '15px', color: '#aaaacc' }).setOrigin(0.5)

    const inputEl = document.createElement('input')
    inputEl.type = 'text'
    inputEl.placeholder = 'Seu nome...'
    inputEl.maxLength = 20
    inputEl.style.cssText = `
      font-size: 17px; padding: 7px 14px; border-radius: 6px;
      border: 2px solid #4466aa; background: #111133;
      color: #ffffff; outline: none; text-align: center; width: 200px;
    `
    const domInput = this.add.dom(w / 2, 275, inputEl)
    const cleanupDom = () => { domInput.destroy(); inputEl.remove() }

    const statusText = this.add.text(w / 2, 312, '', { fontSize: '13px', color: '#88ffaa' }).setOrigin(0.5)

    const saveBtn = this.add.text(w / 2, 345, '[ 💾 Salvar Score ]', {
      fontSize: '16px', color: '#ffffff', backgroundColor: '#224488', padding: { x: 18, y: 9 },
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' })

    saveBtn.on('pointerdown', async () => {
      const name = inputEl.value.trim()
      if (!name) { statusText.setText('Digite um nome primeiro!').setColor('#ff6666'); return }
      saveBtn.disableInteractive().setAlpha(0.5)
      statusText.setText('Salvando...').setColor('#aaaacc')
      await SupabaseService.saveScore(name, score)
      statusText.setText('Score salvo! ✓').setColor('#44ff88')
      cleanupDom()
    })

    const pm = ProgressManager.getInstance()

    this.makeBtn(w / 2, 415, '🔄 Tentar Novamente', 0x1a3a1a, '#aaffaa', () => {
      cleanupDom()
      this.scene.start('GameScene', { phase })
    })

    if (pm.getTotalStars() > 0) {
      this.makeBtn(w / 2, 465, '🔧 Ver Melhorias', 0x1a1228, '#cc88ff', () => {
        cleanupDom()
        this.scene.start('UpgradeScene', { nextPhase: phase })
      })
    }

    this.makeBtn(w / 2, pm.getTotalStars() > 0 ? 515 : 465, '🏠 Menu Principal', 0x221144, '#aaaacc', () => {
      cleanupDom()
      this.scene.start('MenuScene')
    })
  }
}
