import Phaser from 'phaser'
import { ProgressManager } from '../managers/ProgressManager'

interface UpgradeCardDef {
  key: 'archer_damage' | 'mage_damage' | 'mortar_aoe' | 'extra_life'
  title: string
  icon: string
  desc: (lvl: number) => string
  color: number
}

const CARDS: UpgradeCardDef[] = [
  {
    key: 'archer_damage', icon: '🏹', title: 'Flechas Reforçadas',
    desc: (l) => `+${l * 15}% dano físico do Arqueiro`,
    color: 0x8B4513
  },
  {
    key: 'mage_damage', icon: '🔮', title: 'Foco Arcano',
    desc: (l) => `+${l * 15}% dano mágico do Mago`,
    color: 0x800080
  },
  {
    key: 'mortar_aoe', icon: '💣', title: 'Carcaça de Ferro',
    desc: (l) => `+${l * 20}% raio de explosão do Morteiro`,
    color: 0x404040
  },
  {
    key: 'extra_life', icon: '❤️', title: 'Muralha Reforçada',
    desc: (l) => `+${l} vida extra por partida`,
    color: 0xcc2222
  },
]

export class UpgradeScene extends Phaser.Scene {
  private nextPhase: number = 1
  private cards: Phaser.GameObjects.Container[] = []

  constructor() { super('UpgradeScene') }

  create(data?: { nextPhase?: number }) {
    this.nextPhase = data?.nextPhase ?? 1

    const bg = this.add.graphics()
    bg.fillGradientStyle(0x080818, 0x080818, 0x100828, 0x100828, 1)
    bg.fillRect(0, 0, 800, 560)

    const pm = ProgressManager.getInstance()

    this.add.text(400, 30, '🔧 Melhorias Permanentes', {
      fontSize: '26px', color: '#ffcc00', fontStyle: 'bold'
    }).setOrigin(0.5)

    this.add.text(400, 68, `⭐ ${pm.getTotalStars()} estrelas disponíveis`, {
      fontSize: '16px', color: '#ffeeaa'
    }).setOrigin(0.5)

    this.add.text(400, 90, `Cada upgrade custa 1 estrela   •   Máximo nível 3`, {
      fontSize: '12px', color: '#888899'
    }).setOrigin(0.5)

    CARDS.forEach((card, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const cx = 215 + col * 370
      const cy = 160 + row * 170
      this.buildCard(card, cx, cy, pm)
    })

    const btnNext = this.add.text(400, 500, `[ ▶ Iniciar Fase ${this.nextPhase} ]`, {
      fontSize: '20px', color: '#aaffaa',
      backgroundColor: '#112211', padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' })
    btnNext.on('pointerover', () => btnNext.setAlpha(0.8))
    btnNext.on('pointerout',  () => btnNext.setAlpha(1))
    btnNext.on('pointerdown', () => this.scene.start('GameScene', { phase: this.nextPhase }))

    const btnMenu = this.add.text(400, 540, '[ Menu ]', {
      fontSize: '13px', color: '#666688'
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' })
    btnMenu.on('pointerdown', () => this.scene.start('MenuScene'))
  }

  private buildCard(def: UpgradeCardDef, cx: number, cy: number, pm: ProgressManager) {
    const container = this.add.container(cx, cy)
    this.cards.push(container)
    this.refreshCard(container, def, pm)
  }

  private refreshCard(
    container: Phaser.GameObjects.Container,
    def: UpgradeCardDef,
    pm: ProgressManager
  ) {
    container.removeAll(true)

    const lvl = pm.getUpgrades()[def.key]
    const maxLvl = pm.getUpgradeMaxLevel()
    const cost = pm.getUpgradeCost(def.key)
    const canUpg = pm.canUpgrade(def.key)

    const bodyColor = def.color
    const w = 320, h = 130

    const bg = this.add.graphics()
    bg.fillStyle(bodyColor, 0.25)
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10)
    bg.lineStyle(2, bodyColor, canUpg ? 0.9 : 0.3)
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10)
    container.add(bg)

    container.add(this.add.text(-w / 2 + 14, -h / 2 + 12, `${def.icon} ${def.title}`, {
      fontSize: '15px', color: '#ffffff', fontStyle: 'bold'
    }))

    const levelDots = '●'.repeat(lvl) + '○'.repeat(maxLvl - lvl)
    container.add(this.add.text(-w / 2 + 14, -h / 2 + 36, levelDots, {
      fontSize: '16px', color: '#ffcc00'
    }))

    container.add(this.add.text(-w / 2 + 14, -h / 2 + 60, def.desc(lvl), {
      fontSize: '13px', color: '#bbccee'
    }))

    if (lvl >= maxLvl) {
      container.add(this.add.text(-w / 2 + 14, -h / 2 + 86, '✅ Nível máximo', {
        fontSize: '12px', color: '#44ff88'
      }))
    } else {
      const btnText = `⬆ Upgrade (${cost}⭐)`
      const btn = this.add.text(-w / 2 + 14, -h / 2 + 86, btnText, {
        fontSize: '13px',
        color: canUpg ? '#aaffaa' : '#666666',
        backgroundColor: canUpg ? '#1a3a1a' : '#111111',
        padding: { x: 8, y: 4 }
      })

      if (canUpg) {
        btn.setInteractive({ cursor: 'pointer' })
        btn.on('pointerover', () => btn.setAlpha(0.8))
        btn.on('pointerout',  () => btn.setAlpha(1))
        btn.on('pointerdown', () => {
          if (pm.purchaseUpgrade(def.key)) {
            this.refreshCard(container, def, pm)
            // refresh star count
            this.scene.restart({ nextPhase: this.nextPhase })
          }
        })
      }
      container.add(btn)
    }
  }
}
