import Phaser from 'phaser'
import { ProgressManager } from '../managers/ProgressManager'
import { SupabaseService } from '../services/SupabaseService'

export class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene') }

  preload() {
    this.load.image('telaInicial', '/assets/telaInicial.png')
  }

  create() {
    const w = this.scale.width
    const h = this.scale.height
    const pm = ProgressManager.getInstance()

    this.add.image(w / 2, h / 2, 'telaInicial').setDisplaySize(w, h)

    this.add.text(w / 2, 95, '⚔️  TOWER DEFENSE', {
      fontSize: '46px', color: '#ffcc00', fontStyle: 'bold',
      stroke: '#aa6600', strokeThickness: 4
    }).setOrigin(0.5)

    this.add.text(w / 2, 150, 'Defend your castle — survive every wave', {
      fontSize: '15px', color: '#aaaacc'
    }).setOrigin(0.5)

    // progress info
    const phase = pm.getCurrentPhase()
    const stars = pm.getTotalStars()
    this.add.text(w / 2, 190, `Fase atual: ${phase}  |  ⭐ ${stars} estrelas`, {
      fontSize: '14px', color: '#ffeeaa'
    }).setOrigin(0.5)

    this.makeBtn(w / 2, 265, '▶  JOGAR', 0x1a3a1a, '#aaffaa', () => {
      this.scene.start('GameScene', { phase: pm.getCurrentPhase() })
    })

    if (phase > 1) {
      this.makeBtn(w / 2, 330, '🔄 Nova Partida (Fase 1)', 0x1a1a2a, '#8888cc', () => {
        pm.resetPhase()
        this.scene.start('GameScene', { phase: 1 })
      })
    }

    this.makeBtn(w / 2, phase > 1 ? 395 : 330, '🔧 Melhorias', 0x1a1228, '#cc88ff', () => {
      this.scene.start('UpgradeScene', { nextPhase: pm.getCurrentPhase() })
    })

    this.makeBtn(w / 2, phase > 1 ? 460 : 395, '🏆 Leaderboard', 0x221144, '#aa88ff', () => {
      this.showLeaderboard()
    })

    this.add.text(w / 2, h - 20, 'Phaser 3 + TypeScript + Vite', {
      fontSize: '11px', color: '#334455'
    }).setOrigin(0.5)

    this.createCodexButton(w, h)
  }

  private createCodexButton(w: number, h: number) {
    const btn = this.add.text(w - 10, h - 10, '📖 Codex', {
      fontSize: '16px', color: '#ddc880',
      backgroundColor: '#111828', padding: { x: 10, y: 6 }
    }).setOrigin(1, 1).setInteractive({ cursor: 'pointer' })
    btn.on('pointerover', () => btn.setAlpha(0.8))
    btn.on('pointerout',  () => btn.setAlpha(1))

    let codexOpen = false
    let codexCont: Phaser.GameObjects.Container | null = null
    const openCodex = (tab: 'enemies' | 'towers') => {
      codexCont?.destroy()
      codexOpen = true

      const px = 150; const py = 70; const pw = 500; const ph = 420
      const c = this.add.container(0, 0)
      codexCont = c

      const bg = this.add.graphics()
      bg.fillStyle(0x080f20, 0.97)
      bg.fillRoundedRect(px, py, pw, ph, 12)
      bg.lineStyle(2, 0x4a6aaa)
      bg.strokeRoundedRect(px, py, pw, ph, 12)
      c.add(bg)

      c.add(this.add.text(px + pw / 2, py + 18, '📖  Codex — Guia do Jogo', {
        fontSize: '17px', color: '#ddc880', fontStyle: 'bold'
      }).setOrigin(0.5))

      const tabs: Array<{ key: 'enemies' | 'towers'; label: string }> = [
        { key: 'enemies', label: '⚔  Inimigos' },
        { key: 'towers',  label: '🏹  Torres'  },
      ]
      tabs.forEach(({ key, label }, i) => {
        const active = key === tab
        const tx = px + 20 + i * 240
        const tbg = this.add.graphics()
        tbg.fillStyle(active ? 0x2a3f6a : 0x111828)
        tbg.fillRoundedRect(tx, py + 42, 220, 26, 5)
        if (active) { tbg.lineStyle(1, 0x4a6aaa); tbg.strokeRoundedRect(tx, py + 42, 220, 26, 5) }
        c.add(tbg)
        const ttxt = this.add.text(tx + 110, py + 55, label, {
          fontSize: '13px', color: active ? '#ffffff' : '#667799'
        }).setOrigin(0.5).setInteractive({ cursor: 'pointer' })
        ttxt.on('pointerdown', () => openCodex(key))
        c.add(ttxt)
      })

      const cy2 = py + 80
      const colW = pw / 2 - 20

      if (tab === 'enemies') {
        const entries = [
          { name: 'Goblin', color: 0x22cc44, hex: '#33ee77', lines: ['HP: 60  |  Vel: rápida', 'Sem resistências', 'Recompensa: 8💰', 'Estratégia: qualquer torre'] },
          { name: 'Troll',  color: 0x9966cc, hex: '#bb88ff', lines: ['HP: 160  |  Vel: lenta', 'Resist. física: 25%', 'Recompensa: 30💰', 'Estratégia: use o Mago'] },
          { name: 'Xamã',   color: 0xcc8822, hex: '#ffbb44', lines: ['HP: 120  |  Vel: média', 'Resist. mágica: 65%', 'Amaldiçoa torres próximas', 'Recompensa: 20💰'] },
        ]
        const col = [0, 1, 0]
        const row = [0, 0, 1]
        entries.forEach(({ name, color, hex, lines }, i) => {
          const ex = px + 14 + col[i] * (colW + 20)
          const ey = cy2 + row[i] * 175
          const dot = this.add.graphics()
          dot.fillStyle(color, 1); dot.fillCircle(ex + 16, ey + 20, 13)
          dot.lineStyle(2, 0xffffff, 0.2); dot.strokeCircle(ex + 16, ey + 20, 13)
          c.add(dot)
          c.add(this.add.text(ex + 38, ey + 10, name, { fontSize: '15px', color: hex, fontStyle: 'bold' }))
          lines.forEach((line, j) => {
            c.add(this.add.text(ex + 14, ey + 34 + j * 19, `• ${line}`, { fontSize: '11px', color: '#99aacc' }))
          })
        })
      } else {
        const entries = [
          { name: 'Arqueiro', color: '#D2691E', sq: 0xD2691E, lines: ['Dano: físico  |  Alcance: 130px', 'Dispara flechas numa unidade', 'Nv3: tiro triplo (3 alvos) ✨', 'Custo base: 80💰'] },
          { name: 'Mago',     color: '#cc88ff', sq: 0xAA55EE, lines: ['Dano: mágico  |  Alcance: 120px', 'Ignora resist. física', 'Nv3: lentidão nas vítimas ✨', 'Custo base: 110💰'] },
          { name: 'Morteiro', color: '#aaaaaa', sq: 0x888888, lines: ['Dano: físico AoE  |  Alcance: 150px', 'Atinge múltiplos inimigos', 'Nv3: explosão em grande área ✨', 'Custo base: 130💰'] },
        ]
        const col = [0, 1, 0]
        const row = [0, 0, 1]
        entries.forEach(({ name, color, sq, lines }, i) => {
          const tx2 = px + 14 + col[i] * (colW + 20)
          const ty2 = cy2 + row[i] * 175
          const sq2 = this.add.graphics()
          sq2.fillStyle(sq, 1); sq2.fillRect(tx2 + 6, ty2 + 10, 20, 20)
          sq2.lineStyle(1, 0xffffff, 0.2); sq2.strokeRect(tx2 + 6, ty2 + 10, 20, 20)
          c.add(sq2)
          c.add(this.add.text(tx2 + 36, ty2 + 10, name, { fontSize: '15px', color, fontStyle: 'bold' }))
          lines.forEach((line, j) => {
            c.add(this.add.text(tx2 + 14, ty2 + 34 + j * 19, `• ${line}`, { fontSize: '11px', color: '#99aacc' }))
          })
        })
      }

      const closeBtn = this.add.text(px + pw - 10, py + 8, '✕', {
        fontSize: '14px', color: '#ff6666'
      }).setOrigin(1, 0).setInteractive({ cursor: 'pointer' })
      closeBtn.on('pointerdown', () => { c.destroy(); codexCont = null; codexOpen = false })
      c.add(closeBtn)
    }

    btn.on('pointerdown', () => {
      if (codexOpen && codexCont) { codexCont.destroy(); codexCont = null; codexOpen = false }
      else openCodex('enemies')
    })
  }

  private makeBtn(x: number, y: number, label: string, bg: number, color: string, cb: () => void) {
    const btn = this.add.text(x, y, label, {
      fontSize: '20px', color,
      backgroundColor: Phaser.Display.Color.IntegerToColor(bg).rgba,
      padding: { x: 28, y: 11 }, fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' })
    btn.on('pointerover', () => btn.setAlpha(0.8))
    btn.on('pointerout',  () => btn.setAlpha(1))
    btn.on('pointerdown', cb)
    return btn
  }

  private async showLeaderboard() {
    const scores = await SupabaseService.getTopScores()
    const ov = this.add.container(0, 0)

    const dim = this.add.graphics()
    dim.fillStyle(0x000000, 0.88)
    dim.fillRect(0, 0, 800, 560)
    ov.add(dim)

    const panel = this.add.graphics()
    panel.fillStyle(0x0d0d2a)
    panel.fillRoundedRect(210, 70, 380, 390, 12)
    panel.lineStyle(2, 0x4466aa)
    panel.strokeRoundedRect(210, 70, 380, 390, 12)
    ov.add(panel)

    ov.add(this.add.text(400, 100, '🏆 LEADERBOARD', {
      fontSize: '22px', color: '#ffcc00', fontStyle: 'bold'
    }).setOrigin(0.5))

    if (scores.length === 0) {
      ov.add(this.add.text(400, 280, 'Nenhum score salvo ainda.\nJogue e salve sua pontuação!', {
        fontSize: '14px', color: '#888899', align: 'center'
      }).setOrigin(0.5))
    } else {
      scores.forEach((s, i) => {
        ov.add(this.add.text(240, 148 + i * 28, `${i + 1}. ${s.name}`, { fontSize: '14px', color: '#ccddff' }))
        ov.add(this.add.text(560, 148 + i * 28, `${s.score}`, { fontSize: '14px', color: '#ffcc00' }).setOrigin(1, 0))
      })
    }

    const close = this.add.text(400, 428, '[ FECHAR ]', {
      fontSize: '15px', color: '#ffffff', backgroundColor: '#441122', padding: { x: 16, y: 8 }
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' })
    close.on('pointerdown', () => ov.destroy())
    ov.add(close)
  }
}
