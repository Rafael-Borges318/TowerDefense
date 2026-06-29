import Phaser from 'phaser'
import { BaseScene } from './BaseScene'
import type { CodexTab } from '../data/codexData'
import { TowerFactory } from '../factories/TowerFactory'
import { WaveManager } from '../managers/WaveManager'
import { GameManager } from '../managers/GameManager'
import { EconomyManager } from '../managers/EconomyManager'
import { ProgressManager } from '../managers/ProgressManager'
import { EventBus, Events } from '../events/EventBus'
import { Tower, type TowerType, type FiringMode, FIRING_MODES, TOWERS_CFG } from '../entities/Tower'
import type { Damageable } from '../patterns/TargetingStrategy'
import { NearestTargeting, StrongestTargeting, FirstTargeting } from '../patterns/TargetingStrategy'

interface Point { x: number; y: number }
interface TowerSlot {
  x: number; y: number
  tower: Tower | null
  graphics: Phaser.GameObjects.Graphics
}

// ── Fase 1 — waypoints rastreados do mapa fase1.png (800×560) ──
// Trajeto: →  ↑  ←  ↓  ←  ↑  →  ↑  →  ↓  ←  ↓(saída)
const WAYPOINTS_P1: Point[] = [
  { x: 0,   y: 220 },  // entrada esquerda
  { x: 400, y: 220 },  // → direita
  { x: 400, y: 90 },  // ↑ cima
  { x: 280, y: 90 },  // ← esquerda
  { x: 280, y: 440 },  // ↓ baixo
  { x: 140,  y: 440 },  // ← esquerda (pequeno)
  { x: 140,  y: 320 },  // ↑ cima (grande)
  { x: 510, y: 320 },  // → direita
  { x: 510, y: 185  },  // ↑ cima (pequeno)
  { x: 600, y: 185  },  // → direita
  { x: 600, y: 405 },  // ↓ baixo
  { x: 365, y: 405 },  // ← esquerda
  { x: 365, y: 560 },  // ↓ saída pelo baixo

  

]

const SLOT_POSITIONS_P1: Point[] = [
  { x: 215, y: 155 },  // bolsão entre trechos horizontais topo/entrada
  { x: 460, y: 245 },  // área direita, altura média
  { x: 460, y: 440 },  // extremo direito, meio
  { x: 215, y: 365 },  // área baixo, depois do horizontal final
]

// ── Fase 2 — (fase2pixel.png) ──
const WAYPOINTS_P2: Point[] = [
  { x: 375, y: 0   },
  { x: 375, y: 160 },
  { x: 125,  y: 160 },
  { x: 125,  y: 80  },
  { x: 230, y: 80  },
  { x: 230, y: 480 },
  { x: 125, y: 480 },
  { x: 125, y: 380 },
  { x: 670, y: 380 },
  { x: 670, y: 480 },
  { x: 580, y: 480 },
  { x: 580, y: 80 },
  { x: 665, y: 80 },
  { x: 665, y: 160 },
  { x: 430, y: 160 },
  { x: 430, y: -30 },
]

const SLOT_POSITIONS_P2: Point[] = [
  { x: 400, y: 210 },
  { x: 160, y: 310 },
  { x: 640, y: 290 },
  { x: 400, y: 450 },
]

// ── Fase 3 — entrada topo-esquerda, saída direita ──
// Trajeto: ↓ → ↑ ← ↓ → ↓ ← ↑ → ↓ →(saída)
const WAYPOINTS_P3: Point[] = [
  { x: 110,  y: 0   },  // entrada topo
  { x: 110,  y: 200 },  // ↓ baixo
  { x: 385, y: 200 },  // → direita
  { x: 385, y: 110  },  // ↑ cima
  { x: 265, y: 110  },  // ← esquerda
  { x: 265, y: 320 },  // ↓ baixo
  { x: 565, y: 320 },  // → direita
  { x: 565, y: 420 },  // ↓ baixo
  { x: 455, y: 420 },  // ← esquerda
  { x: 455, y: 200 },  // ↑ cima
  { x: 690, y: 200 },  // → direita
  { x: 690, y: 430 },  // ↓ baixo
  { x: 790, y: 430 },  // → saída direita
]

const SLOT_POSITIONS_P3: Point[] = [
  { x: 470, y: 150 },  // cobre horizontal y=60 e y=180
  { x: 190, y: 150 },  // cobre x=150 vertical e y=180
  { x: 400, y: 400 },  // cobre y=380 e y=500
  { x: 760, y: 280 },  // cobre y=380 e y=500
] 

// ── Fase 4 — cobra, entrada esquerda-baixo, saída direita ──
// Trajeto: → ↑ → ↓ → ↑ → ↓ → ↑ → ↓ → ↑ → ↓ → ↑ → ↓ → ↑ → ↓ →(saída)
const WAYPOINTS_P4: Point[] = [
   { x: 0,   y: 320 },  // entrada esquerda
  { x: 40,  y: 320 },  // → direita
  { x: 40,  y: 260  },  // ↑ cima
  { x: 110, y: 260  },  // → direita
  { x: 110, y: 370 },  // ↓ baixo
  { x: 180, y: 370 },  // → direita
  { x: 180, y: 190  },  // ↑ cima
  { x: 235, y: 190  },  // → direita
  { x: 235, y: 420 },  // ↓ baixo
  { x: 310, y: 420 },  // → direita
  { x: 310, y: 115  },  // ↑ cima
  { x: 365, y: 115  },  // → direita
  { x: 365, y: 480 },  // ↓ baixo
  { x: 435, y: 480 },  // → direita
  { x: 435, y: 110  },  // ↑ cima
  { x: 490, y: 110  },  // → direita
  { x: 490, y: 420 },  // ↓ baixo
  { x: 565, y: 420 },  // → direita
  { x: 565, y: 180  },  // ↑ cima
  { x: 625, y: 180  },  // → direita
  { x: 625, y: 375 },  // ↓ baixo
  { x: 695, y: 375 },  // → direita
  { x: 695, y: 265  },  // ↑ cima
  { x: 750, y: 265  },  // → direita
  { x: 750, y: 320 },  // ↓ baixo
  { x: 800, y: 320 },  // → saída direita
]

const SLOT_POSITIONS_P4: Point[] = [
  { x: 100,  y: 200 },  // entre colunas x=60 e x=120
  { x: 320, y: 480 },  // entre colunas x=300 e x=360
  { x: 475, y: 75 },  // entre colunas x=480 e x=540
  { x: 740, y: 390 },  // entre coluna x=720 e saída
]


const TOWER_LABELS: Record<TowerType, string> = {
  archer: 'Arqueiro',
  mage:   'Mago',
  mortar: 'Morteiro',
}

export class GameScene extends BaseScene {
  private slots: TowerSlot[] = []
  private waveManager!: WaveManager
  private phase: number = 1

  private hudLives!: Phaser.GameObjects.Text
  private hudGold!: Phaser.GameObjects.Text
  private hudWave!: Phaser.GameObjects.Text
  private hudPhase!: Phaser.GameObjects.Text
  private hordeBtn!: Phaser.GameObjects.Text

  private popup: Phaser.GameObjects.Container | null = null
  private towers: Tower[] = []
  private codexContainer: Phaser.GameObjects.Container | null = null

  constructor() { super('GameScene') }

  preload() {
    this.load.spritesheet('orc_walk',  'assets/orc_walk.png',  { frameWidth: 100, frameHeight: 100 })
    this.load.spritesheet('orc_idle',  'assets/orc_idle.png',  { frameWidth: 100, frameHeight: 100 })
    this.load.spritesheet('orc_hurt',  'assets/orc_hurt.png',  { frameWidth: 100, frameHeight: 100 })
    this.load.spritesheet('orc_death', 'assets/orc_death.png', { frameWidth: 100, frameHeight: 100 })
    this.load.image('arrow',          'assets/arrow.png')
    this.load.image('torre_arqueiro',   'assets/torreArqueiro.png')
    this.load.image('torre_arqueiro_2', 'assets/torreArqueiro1.png')
    this.load.image('torre_arqueiro_3', 'assets/torreArqueiro2.png')
    this.load.image('torre_mago',       'assets/torreMago.png')
    this.load.image('torre_mago_2',     'assets/torreMago1.png')
    this.load.image('torre_mago_3',     'assets/torreMago2.png')
    this.load.image('torre_morteiro',   'assets/torreMorteiro.png')
    this.load.image('torre_morteiro_2', 'assets/torreMorteiro1.png')
    this.load.image('torre_morteiro_3', 'assets/torreMorteiro2.png')
    this.load.image('map_fase1', 'assets/fase1pixel.png')
    this.load.image('map_fase2', 'assets/fase2pixel.png')
    this.load.image('map_fase3', 'assets/fase3pixel.png')
    this.load.image('map_fase4', 'assets/fase4pixel.png')

    for (let i = 0; i < 10; i++) {
      const frameStr = i.toString().padStart(3, '0')
      this.load.image(`boss_walk_${i}`,  `assets/bossfinal/1_TROLL/Troll_01_1_WALK_${frameStr}.png`)
      this.load.image(`boss_hurt_${i}`,  `assets/bossfinal/1_TROLL/Troll_01_1_HURT_${frameStr}.png`)
      this.load.image(`boss_death_${i}`, `assets/bossfinal/1_TROLL/Troll_01_1_DIE_${frameStr}.png`)
      this.load.image(`boss_idle_${i}`,  `assets/bossfinal/1_TROLL/Troll_01_1_IDLE_${frameStr}.png`)
    }
  }

  private createAnimations() {
    if (this.anims.exists('orc_walk')) return
    this.anims.create({ key: 'orc_walk',  frames: this.anims.generateFrameNumbers('orc_walk',  { start: 0, end: 7 }), frameRate: 10, repeat: -1 })
    this.anims.create({ key: 'orc_idle',  frames: this.anims.generateFrameNumbers('orc_idle',  { start: 0, end: 5 }), frameRate: 8,  repeat: -1 })
    this.anims.create({ key: 'orc_hurt',  frames: this.anims.generateFrameNumbers('orc_hurt',  { start: 0, end: 3 }), frameRate: 12, repeat: 0 })
    this.anims.create({ key: 'orc_death', frames: this.anims.generateFrameNumbers('orc_death', { start: 0, end: 3 }), frameRate: 6,  repeat: 0 })

    // Boss animations
    const createBossAnim = (key: string, prefix: string, repeat: number, frameRate: number) => {
      const frames: { key: string }[] = []
      for (let i = 0; i < 10; i++) {
        frames.push({ key: `${prefix}_${i}` })
      }
      this.anims.create({ key, frames, frameRate, repeat })
    }
    createBossAnim('boss_walk', 'boss_walk', -1, 10)
    createBossAnim('boss_idle', 'boss_idle', -1, 8)
    createBossAnim('boss_hurt', 'boss_hurt', 0, 12)
    createBossAnim('boss_death', 'boss_death', 0, 10)
  }

  create(data?: { phase?: number }) {
    this.createAnimations()
    this.phase = data?.phase ?? 1

    GameManager.reset()
    EconomyManager.reset(this.phase)

    const waypoints = this.phase === 1 ? WAYPOINTS_P1
                    : this.phase === 2 ? WAYPOINTS_P2
                    : this.phase === 3 ? WAYPOINTS_P3
                    : WAYPOINTS_P4
    const slotPositions = this.phase === 1 ? SLOT_POSITIONS_P1
                        : this.phase === 2 ? SLOT_POSITIONS_P2
                        : this.phase === 3 ? SLOT_POSITIONS_P3
                        : SLOT_POSITIONS_P4

    this.waveManager = new WaveManager(this, waypoints, this.phase)

    if (this.phase === 1) {
      this.add.image(400, 280, 'map_fase1').setDisplaySize(800, 560)
      this.drawMapMarkers(WAYPOINTS_P1)
    } else if (this.phase === 2) {
      this.add.image(400, 280, 'map_fase2').setDisplaySize(800, 560)
      this.drawMapMarkers(WAYPOINTS_P2, 'down')
    } else if (this.phase === 3) {
      this.add.image(400, 280, 'map_fase3').setDisplaySize(800, 560)
      this.drawMapMarkers(WAYPOINTS_P3)
    } else {
      this.add.image(400, 280, 'map_fase4').setDisplaySize(800, 560)
      this.drawMapMarkers(WAYPOINTS_P4)
    }
    this.createSlots(slotPositions)
    this.createHUD()

    EventBus.on(Events.ENEMY_REACHED_END, this.refreshHUD, this)
    EventBus.on(Events.ENEMY_DIED,        this.refreshHUD, this)
    EventBus.on(Events.GOLD_CHANGED,      this.refreshHUD, this)
    EventBus.on(Events.GAME_OVER,         this.onGameOver, this)
    EventBus.on(Events.HORDE_COMPLETE,    this.onHordeComplete, this)
    EventBus.on(Events.PHASE_COMPLETE,    this.onPhaseComplete, this)
    EventBus.on(Events.SHAMAN_CURSE,      this.onShamanCurse, this)

    this.input.on('pointerdown', this.onSceneClick, this)
    this.input.keyboard!.on('keydown-ESC', this.openPause, this)
    this.createCodexButton()
    this.refreshHUD()
  }

  private drawMapMarkers(waypoints: Point[], entryDir: 'right' | 'down' = 'right') {
    const g = this.add.graphics()
    const start = waypoints[0]
    const last  = waypoints[waypoints.length - 1]

    const ex     = entryDir === 'down' ? start.x      : start.x + 20
    const ey     = entryDir === 'down' ? start.y + 20 : start.y
    const arrow  = entryDir === 'down' ? '▼' : '▶'
    g.fillStyle(0x003300, 0.75); g.fillCircle(ex, ey, 16)
    g.lineStyle(3, 0x00ff44, 0.9); g.strokeCircle(ex, ey, 16)
    this.add.text(ex, ey, arrow, { fontSize: '12px', color: '#00ff88' }).setOrigin(0.5)

    const cy = last.y < 0 ? 20  : last.y > 540 ? 543 : last.y - 20
    const ty = last.y < 0 ? cy + 35 : cy - 35
    g.fillStyle(0x220000, 0.75); g.fillCircle(last.x, cy, 16)
    g.lineStyle(3, 0xff4444, 0.9); g.strokeCircle(last.x, cy, 16)
    this.add.text(last.x, ty, '🏰', { fontSize: '24px' }).setOrigin(0.5)
  }

  private createSlots(positions: Point[]) {
    for (const pos of positions) {
      const g = this.add.graphics()
      this.drawEmptySlot(g, pos.x, pos.y)

      const slot: TowerSlot = { x: pos.x, y: pos.y, tower: null, graphics: g }
      this.slots.push(slot)

      const hitArea = this.add.rectangle(pos.x, pos.y, 56, 56, 0, 0).setInteractive({ cursor: 'pointer' })
      hitArea.on('pointerdown', () => {
        this.openSlotPopup(slot)
      })
    }
  }

  private drawEmptySlot(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    g.clear()
    g.fillStyle(0x000000, 0.2)
    g.fillRect(x - 25, y - 25, 50, 50)
    g.lineStyle(2, 0xaaffaa, 0.4)
    const s = 25
    // dashed border
    for (let d = 0; d < 50; d += 12) {
      const dp = Math.min(d + 7, 50)
      g.beginPath(); g.moveTo(x - s + d, y - s); g.lineTo(x - s + dp, y - s); g.strokePath()
      g.beginPath(); g.moveTo(x + s, y - s + d); g.lineTo(x + s, y - s + dp); g.strokePath()
      g.beginPath(); g.moveTo(x + s - d, y + s); g.lineTo(x + s - dp, y + s); g.strokePath()
      g.beginPath(); g.moveTo(x - s, y + s - d); g.lineTo(x - s, y + s - dp); g.strokePath()
    }
  }

  private createHUD() {
    const g = this.add.graphics()
    g.fillStyle(0x000000, 0.75)
    g.fillRect(0, 0, 800, 44)

    this.hudPhase = this.add.text(10,  12, '', { fontSize: '14px', color: '#ffaa44' })
    this.hudGold  = this.add.text(70,  12, '', { fontSize: '14px', color: '#ffcc00' })
    this.hudLives = this.add.text(150, 12, '', { fontSize: '14px', color: '#ff6666' })
    this.hudWave  = this.add.text(250, 12, '', { fontSize: '14px', color: '#66ccff' })

    this.hordeBtn = this.add.text(490, 8, '[ ▶ Iniciar Horda ]', {
      fontSize: '14px', color: '#ffffff',
      backgroundColor: '#225522', padding: { x: 8, y: 5 }
    }).setInteractive({ cursor: 'pointer' })
    this.hordeBtn.on('pointerdown', () => this.startNextHorde())
    this.hordeBtn.on('pointerover', () => this.hordeBtn.setAlpha(0.8))
    this.hordeBtn.on('pointerout',  () => this.hordeBtn.setAlpha(1))

    const pauseBtn = this.add.text(690, 8, '⏸', {
      fontSize: '16px', color: '#aaccff',
      backgroundColor: '#112244', padding: { x: 8, y: 5 }
    }).setInteractive({ cursor: 'pointer' })
    pauseBtn.on('pointerover', () => pauseBtn.setAlpha(0.8))
    pauseBtn.on('pointerout',  () => pauseBtn.setAlpha(1))
    pauseBtn.on('pointerdown', () => this.openPause())
  }

  private refreshHUD() {
    const gm = GameManager.getInstance()
    const em = EconomyManager.getInstance()
    const wm = this.waveManager

    this.hudPhase.setText(`Fase ${wm.getPhase()}`)
    this.hudGold.setText(`💰 ${em.getGold()}`)
    this.hudLives.setText(`❤️  ${gm.getLives()}/${gm.getMaxLives()}`)
    this.hudWave.setText(`Horda ${wm.getCurrentHorde()}/${wm.getTotalHordes()}`)
  }

  private startNextHorde() {
    if (GameManager.getInstance().isGameOver()) return
    this.hordeBtn.setText('⚔️  Em andamento...').disableInteractive()
    this.waveManager.startNextHorde()
    this.refreshHUD()
  }

  private onHordeComplete(data: { horde: number; total: number; bonus: number }) {
    this.refreshHUD()
    this.showMessage(`Horda ${data.horde}/${data.total} concluída! +${data.bonus} ouro`, 0xffcc00)

    if (data.horde < data.total) {
      this.time.delayedCall(1200, () => {
        this.hordeBtn.setText('[ ▶ Próxima Horda ]').setInteractive({ cursor: 'pointer' })
      })
    }
  }

  private onPhaseComplete(data: { phase: number }) {
    const gm = GameManager.getInstance()
    const stars = gm.calcStars()
    ProgressManager.getInstance().addStars(stars)
    ProgressManager.getInstance().advancePhase()

    this.showPhaseCompleteOverlay(data.phase, stars, gm.getScore())
  }

  private showPhaseCompleteOverlay(phase: number, stars: number, score: number) {
    this.closePopup()
    const ov = this.add.container(0, 0).setDepth(50)

    const dim = this.add.graphics()
    dim.fillStyle(0x000000, 0.8)
    dim.fillRect(0, 0, 800, 560)
    ov.add(dim)

    const panel = this.add.graphics()
    panel.fillStyle(0x111133, 1)
    panel.fillRoundedRect(200, 120, 400, 300, 14)
    panel.lineStyle(2, 0x4466cc)
    panel.strokeRoundedRect(200, 120, 400, 300, 14)
    ov.add(panel)

    ov.add(this.add.text(400, 150, `Fase ${phase} Concluída!`, {
      fontSize: '26px', color: '#ffcc00', fontStyle: 'bold'
    }).setOrigin(0.5))

    ov.add(this.add.text(400, 190, `Pontuação: ${score}`, {
      fontSize: '18px', color: '#ffffff'
    }).setOrigin(0.5))

    // stars
    const starStr = '⭐'.repeat(stars) + '☆'.repeat(3 - stars)
    ov.add(this.add.text(400, 230, starStr, { fontSize: '30px' }).setOrigin(0.5))
    ov.add(this.add.text(400, 270, `+${stars} estrela${stars > 1 ? 's' : ''} ganhas!`, {
      fontSize: '15px', color: '#ffcc66'
    }).setOrigin(0.5))

    const btnUpg = this.add.text(310, 330, '[ 🔧 Melhorias ]', {
      fontSize: '16px', color: '#aaddff', backgroundColor: '#112244', padding: { x: 10, y: 8 }
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' })
    btnUpg.on('pointerdown', () => {
      ov.destroy()
      this.shutdown()
      this.scene.start('UpgradeScene', { nextPhase: this.phase + 1 })
    })
    ov.add(btnUpg)

    const btnNext = this.add.text(490, 330, '[ ▶ Próxima Fase ]', {
      fontSize: '16px', color: '#aaffaa', backgroundColor: '#112211', padding: { x: 10, y: 8 }
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' })
    btnNext.on('pointerdown', () => {
      ov.destroy()
      this.shutdown()
      this.scene.start('GameScene', { phase: this.phase + 1 })
    })
    ov.add(btnNext)

    const btnMenu = this.add.text(400, 390, '[ Menu ]', {
      fontSize: '14px', color: '#888899'
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' })
    btnMenu.on('pointerdown', () => {
      ov.destroy()
      this.shutdown()
      this.scene.start('MenuScene')
    })
    ov.add(btnMenu)
  }

  private onGameOver(data: { score: number }) {
    this.scene.start('GameOverScene', { score: data.score, phase: this.phase })
  }

  private onShamanCurse(data: { x: number; y: number; range: number; duration: number }) {
    for (const t of this.towers) {
      if (!t.active) continue
      const dx = t.x - data.x
      const dy = t.y - data.y
      if (Math.sqrt(dx * dx + dy * dy) <= data.range) {
        t.disrupt(data.duration)
      }
    }
    // visual pulse
    const g = this.add.graphics()
    g.lineStyle(2, 0xff8800, 0.7)
    g.strokeCircle(data.x, data.y, data.range)
    g.fillStyle(0xff8800, 0.08)
    g.fillCircle(data.x, data.y, data.range)
    this.time.delayedCall(400, () => g.destroy())
  }

  private openSlotPopup(slot: TowerSlot) {
    this.closePopup()
    const gm = GameManager.getInstance()
    if (gm.isGameOver()) return

    const popH = slot.tower ? 300 : 115
    const px = Math.min(slot.x + 30, 590)
    const py = Math.max(50, Math.min(slot.y + 35, 560 - popH - 10))

    this.popup = this.add.container(px, py).setDepth(20)

    if (!slot.tower) {
      this.buildPopup(slot)
    } else {
      this.upgradePopup(slot)
    }

    const closeX = this.add.text(185, -6, '✕', { fontSize: '14px', color: '#ff6666' })
      .setInteractive({ cursor: 'pointer' })
    closeX.on('pointerdown', () => this.closePopup())
    this.popup.add(closeX)
  }

  private buildPopup(slot: TowerSlot) {
    const em = EconomyManager.getInstance()
    const types: TowerType[] = ['archer', 'mage', 'mortar']
    const popW = 180

    const bg = this.add.graphics()
    bg.fillStyle(0x111122, 0.97)
    bg.fillRoundedRect(-5, -8, popW, 110, 8)
    bg.lineStyle(1, 0x4466aa)
    bg.strokeRoundedRect(-5, -8, popW, 110, 8)
    this.popup!.add(bg)

    this.popup!.add(this.add.text(0, 3, 'Construir Torre', { fontSize: '13px', color: '#aaddff', fontStyle: 'bold' }))

    types.forEach((type, i) => {
      const cfg = TOWERS_CFG[type].levels[0]
      const cost = cfg.cost
      const canBuild = em.canAfford(cost)
      const label = `${TOWER_LABELS[type]}  ${cost}💰`
      const special = type === 'archer' ? '(físico)' : type === 'mage' ? '(mágico)' : '(AoE)'
      const color = canBuild ? '#ffffff' : '#666666'

      const btn = this.add.text(0, 26 + i * 28, `${label} ${special}`, {
        fontSize: '12px', color,
        backgroundColor: canBuild ? '#1a2a1a' : '#111111',
        padding: { x: 5, y: 3 }
      }).setInteractive({ cursor: canBuild ? 'pointer' : 'default' })

      if (canBuild) {
        btn.on('pointerover', () => btn.setAlpha(0.8))
        btn.on('pointerout',  () => btn.setAlpha(1))
        btn.on('pointerdown', () => {
          if (em.spend(cost)) {
            const tower = TowerFactory.create(slot.x, slot.y, type, this)
            slot.tower = tower
            slot.graphics.clear()
            this.towers.push(tower)
          }
          this.closePopup()
          this.refreshHUD()
        })
      }
      this.popup!.add(btn)
    })
  }

  private upgradePopup(slot: TowerSlot) {
    const tower = slot.tower!
    const em = EconomyManager.getInstance()
    const lvl = tower.level
    const label = tower.getLabel()

    const popW = 200
    const popH = 300
    const bg = this.add.graphics()
    bg.fillStyle(0x111122, 0.97)
    bg.fillRoundedRect(-5, -8, popW, popH, 8)
    bg.lineStyle(1, 0x4466aa)
    bg.strokeRoundedRect(-5, -8, popW, popH, 8)
    this.popup!.add(bg)

    this.popup!.add(this.add.text(0, 3, label, { fontSize: '14px', color: '#ffcc00', fontStyle: 'bold' }))

    // --- Alvo ---
    this.popup!.add(this.add.text(0, 26, 'Alvo:', { fontSize: '11px', color: '#aaaacc' }))
    const strategies = [
      { label: 'Mais próximo', factory: () => new NearestTargeting(slot.x, slot.y) },
      { label: 'Mais forte',   factory: () => new StrongestTargeting() },
      { label: 'Primeiro',     factory: () => new FirstTargeting() },
    ]
    strategies.forEach((s, i) => {
      const btn = this.add.text(0, 40 + i * 20, `  ◆ ${s.label}`, { fontSize: '11px', color: '#88ccff' })
        .setInteractive({ cursor: 'pointer' })
      btn.on('pointerdown', () => { tower.setStrategy(s.factory()); this.closePopup() })
      this.popup!.add(btn)
    })

    // --- Modo de Disparo ---
    this.popup!.add(this.add.text(0, 103, 'Modo de Disparo:', { fontSize: '11px', color: '#aaaacc' }))

    const modeKeys: FiringMode[] = ['heavy', 'normal', 'rapid']
    const currentMode = tower.getFiringMode()

    modeKeys.forEach((key, i) => {
      const def = FIRING_MODES[key]
      const isActive = key === currentMode
      const bullet = isActive ? '●' : '○'
      const btn = this.add.text(0, 117 + i * 22, `${bullet} ${def.label}`, {
        fontSize: '12px',
        color: isActive ? def.color : '#667799',
        fontStyle: isActive ? 'bold' : 'normal',
      }).setInteractive({ cursor: 'pointer' })
      const descTxt = this.add.text(22, 130 + i * 22, def.desc, {
        fontSize: '9px', color: isActive ? '#bbbbcc' : '#445566',
      })
      btn.on('pointerdown', () => { tower.setFiringMode(key); this.closePopup() })
      this.popup!.add(btn)
      this.popup!.add(descTxt)
    })

    // --- Upgrade / Special ---
    if (lvl < 3) {
      const upgCost = tower.getUpgradeCost()
      const canUpg = em.canAfford(upgCost)
      const nextCfg = TOWERS_CFG[tower.type].levels[lvl]
      const special = nextCfg.special ? ` ✨ ${nextCfg.special}` : ''
      const upgBtn = this.add.text(0, 188, `⬆ Nv.${lvl + 1}${special} (${upgCost}💰)`, {
        fontSize: '12px', color: canUpg ? '#44ff88' : '#886644',
        backgroundColor: canUpg ? '#1a3a1a' : '#1a1a1a',
        padding: { x: 5, y: 4 }
      }).setInteractive({ cursor: canUpg ? 'pointer' : 'default' })
      if (canUpg) {
        upgBtn.on('pointerdown', () => {
          if (em.spend(upgCost)) tower.upgrade()
          this.closePopup()
          this.refreshHUD()
        })
      }
      this.popup!.add(upgBtn)
    } else {
      const cfg = TOWERS_CFG[tower.type].levels[2]
      this.popup!.add(this.add.text(0, 188, `✨ Poder: ${cfg.special ?? '—'}`, { fontSize: '12px', color: '#ffcc00' }))
      this.popup!.add(this.add.text(0, 207, '★ Nível máximo', { fontSize: '11px', color: '#ffcc44' }))
    }

    // --- Vender ---
    tower.showRange(true)
    const sellVal = tower.getSellValue()
    const sellBtn = this.add.text(0, 222, `🪙 Vender (+${sellVal}💰)`, {
      fontSize: '12px', color: '#ffaa44',
      backgroundColor: '#2a1a0a', padding: { x: 5, y: 4 }
    }).setInteractive({ cursor: 'pointer' })
    sellBtn.on('pointerdown', () => {
      em.add(sellVal)
      this.towers = this.towers.filter(t => t !== tower)
      tower.destroy()
      slot.tower = null
      this.drawEmptySlot(slot.graphics, slot.x, slot.y)
      this.closePopup()
      this.refreshHUD()
    })
    this.popup!.add(sellBtn)
  }

  private createCodexButton() {
    const btn = this.add.text(795, 554, '📖', { fontSize: '22px' })
      .setOrigin(1, 1).setDepth(80).setInteractive({ cursor: 'pointer' })
    btn.on('pointerover', () => btn.setAlpha(0.75))
    btn.on('pointerout',  () => btn.setAlpha(1))
    btn.on('pointerdown', () => {
      if (this.codexContainer) { this.codexContainer.destroy(); return }
      this.openCodex('enemies')
    })
  }

  private openCodex(tab: CodexTab) {
    const c = this.openCodexPanel(tab, (t) => this.openCodex(t))
    c.on('destroy', () => { this.codexContainer = null })
    this.codexContainer = c
  }

  private closePopup() {
    if (this.popup) {
      this.slots.forEach(s => s.tower?.showRange(false))
      this.popup.destroy()
      this.popup = null
    }
  }

  private onSceneClick(_ptr: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) {
    // If the click landed on any interactive object (slot, button, etc.) don't close
    if (currentlyOver.length > 0) return
    if (this.popup) this.closePopup()
  }

  private showMessage(text: string, color: number = 0xffffff) {
    const hex = '#' + color.toString(16).padStart(6, '0')
    const msg = this.add.text(400, 260, text, {
      fontSize: '20px', color: hex, stroke: '#000000', strokeThickness: 4,
      backgroundColor: '#00000088', padding: { x: 14, y: 8 }
    }).setOrigin(0.5).setDepth(100)
    this.time.delayedCall(2200, () => msg.destroy())
  }

  private openPause() {
    if (GameManager.getInstance().isGameOver()) return
    this.scene.launch('PauseScene')
    this.scene.pause()
  }

  getEnemies(): Damageable[] {
    return (this.waveManager?.getEnemies() ?? []) as Damageable[]
  }

  shutdown() {
    EventBus.off(Events.ENEMY_REACHED_END, this.refreshHUD, this)
    EventBus.off(Events.ENEMY_DIED,        this.refreshHUD, this)
    EventBus.off(Events.GOLD_CHANGED,      this.refreshHUD, this)
    EventBus.off(Events.GAME_OVER,         this.onGameOver, this)
    EventBus.off(Events.HORDE_COMPLETE,    this.onHordeComplete, this)
    EventBus.off(Events.PHASE_COMPLETE,    this.onPhaseComplete, this)
    EventBus.off(Events.SHAMAN_CURSE,      this.onShamanCurse, this)
    this.waveManager?.destroy()
  }
}
