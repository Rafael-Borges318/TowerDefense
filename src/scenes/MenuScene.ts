import { ProgressManager } from '../managers/ProgressManager'
import { SupabaseService } from '../services/SupabaseService'
import { BaseScene } from './BaseScene'
import { GAME_W as W, GAME_H as H } from '../constants/game'
import { type CodexTab } from '../data/codexData'

const PHASES = [
  { num: 1, label: 'Fase 1', color: '#aaffaa', bg: 0x0d2a0d },
  { num: 2, label: 'Fase 2', color: '#88ccff', bg: 0x0d1e2a },
  { num: 3, label: 'Fase 3', color: '#ffdd88', bg: 0x2a1e0d },
  { num: 4, label: 'Fase 4', color: '#ff9988', bg: 0x2a0d0d },
]

export class MenuScene extends BaseScene {
  constructor() { super('MenuScene') }

  preload() {
    this.load.image('telaInicial', '/assets/telaInicialPixel.jpeg')
  }

  create() {
    const pm = ProgressManager.getInstance()
    const phase = pm.getCurrentPhase()

    this.add.image(W / 2, H / 2, 'telaInicial').setDisplaySize(W, H)

    this.add.text(W / 2, 95, '⚔️  TOWER DEFENSE', {
      fontSize: '46px', color: '#ffcc00', fontStyle: 'bold',
      stroke: '#aa6600', strokeThickness: 4,
    }).setOrigin(0.5)

    this.add.text(W / 2, 150, 'Defend your castle — survive every wave', {
      fontSize: '15px', color: '#aaaacc',
    }).setOrigin(0.5)

    this.add.text(W / 2, 190, `Fase atual: ${phase}  |  ⭐ ${pm.getTotalStars()} estrelas`, {
      fontSize: '14px', color: '#ffeeaa',
    }).setOrigin(0.5)

    const buttons: Array<{ label: string; bg: number; color: string; cb: () => void }> = [
      { label: '▶  JOGAR',          bg: 0x1a3a1a, color: '#aaffaa', cb: () => this.scene.start('GameScene', { phase }) },
      { label: '🗺  Escolher Fase', bg: 0x0f2233, color: '#88ccff', cb: () => this.showPhaseSelector() },
    ]

    if (phase > 1) {
      buttons.push({
        label: '🔄 Nova Partida (Fase 1)',
        bg: 0x1a1a2a, color: '#8888cc',
        cb: () => { pm.resetPhase(); this.scene.start('GameScene', { phase: 1 }) },
      })
    }

    buttons.push(
      { label: '🔧 Melhorias',   bg: 0x1a1228, color: '#cc88ff', cb: () => this.scene.start('UpgradeScene', { nextPhase: phase }) },
      { label: '🏆 Leaderboard', bg: 0x221144, color: '#aa88ff', cb: () => this.showLeaderboard() },
    )

    buttons.forEach(({ label, bg, color, cb }, i) => {
      this.makeBtn(W / 2, 245 + i * 63, label, bg, color, cb)
    })

    this.add.text(W / 2, H - 20, 'Phaser 3 + TypeScript + Vite', {
      fontSize: '11px', color: '#334455',
    }).setOrigin(0.5)

    this.createCodexButton()
  }

  private showPhaseSelector() {
    const ov = this.add.container(0, 0)

    const dim = this.add.graphics()
    dim.fillStyle(0x000000, 0.82)
    dim.fillRect(0, 0, W, H)
    ov.add(dim)

    const panel = this.add.graphics()
    panel.fillStyle(0x0d1a2e, 0.98)
    panel.fillRoundedRect(250, 120, 300, 300, 12)
    panel.lineStyle(2, 0x4a7acc)
    panel.strokeRoundedRect(250, 120, 300, 300, 12)
    ov.add(panel)

    ov.add(this.add.text(W / 2, 150, 'Escolher Fase', {
      fontSize: '20px', color: '#ddeeff', fontStyle: 'bold',
    }).setOrigin(0.5))

    PHASES.forEach(({ num, label, color, bg }, i) => {
      const btn = this.makeBtn(W / 2, 192 + i * 52, label, bg, color, () => {
        ov.destroy()
        this.scene.start('GameScene', { phase: num })
      })
      ov.add(btn)
    })

    const cancel = this.add.text(W / 2, 400, '[ CANCELAR ]', {
      fontSize: '14px', color: '#778899',
      backgroundColor: '#111822', padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' })
    cancel.on('pointerdown', () => ov.destroy())
    ov.add(cancel)
  }

  private createCodexButton() {
    let codexCont: Phaser.GameObjects.Container | null = null

    const openCodex = (tab: CodexTab) => {
      const c = this.openCodexPanel(tab, openCodex)
      c.on('destroy', () => { codexCont = null })
      codexCont = c
    }

    const btn = this.add.text(W - 10, H - 10, '📖 Codex', {
      fontSize: '16px', color: '#ddc880',
      backgroundColor: '#111828', padding: { x: 10, y: 6 },
    }).setOrigin(1, 1).setInteractive({ cursor: 'pointer' })
    btn.on('pointerover', () => btn.setAlpha(0.8))
    btn.on('pointerout',  () => btn.setAlpha(1))

    btn.on('pointerdown', () => {
      if (codexCont) { codexCont.destroy(); return }
      openCodex('enemies')
    })
  }

  private async showLeaderboard() {
    let scores: Awaited<ReturnType<typeof SupabaseService.getTopScores>> = []
    try {
      scores = await SupabaseService.getTopScores()
    } catch {
      // leaderboard é não-crítico; continua com lista vazia
    }

    const ov = this.add.container(0, 0)

    const dim = this.add.graphics()
    dim.fillStyle(0x000000, 0.88)
    dim.fillRect(0, 0, W, H)
    ov.add(dim)

    const panel = this.add.graphics()
    panel.fillStyle(0x0d0d2a)
    panel.fillRoundedRect(210, 70, 380, 390, 12)
    panel.lineStyle(2, 0x4466aa)
    panel.strokeRoundedRect(210, 70, 380, 390, 12)
    ov.add(panel)

    ov.add(this.add.text(W / 2, 100, '🏆 LEADERBOARD', {
      fontSize: '22px', color: '#ffcc00', fontStyle: 'bold',
    }).setOrigin(0.5))

    if (scores.length === 0) {
      ov.add(this.add.text(W / 2, 280, 'Nenhum score salvo ainda.\nJogue e salve sua pontuação!', {
        fontSize: '14px', color: '#888899', align: 'center',
      }).setOrigin(0.5))
    } else {
      scores.forEach((s, i) => {
        ov.add(this.add.text(240, 148 + i * 28, `${i + 1}. ${s.name}`, { fontSize: '14px', color: '#ccddff' }))
        ov.add(this.add.text(560, 148 + i * 28, `${s.score}`, { fontSize: '14px', color: '#ffcc00' }).setOrigin(1, 0))
      })
    }

    const close = this.add.text(W / 2, 428, '[ FECHAR ]', {
      fontSize: '15px', color: '#ffffff', backgroundColor: '#441122', padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' })
    close.on('pointerdown', () => ov.destroy())
    ov.add(close)
  }
}
