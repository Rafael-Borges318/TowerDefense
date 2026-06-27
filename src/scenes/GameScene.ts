import Phaser from 'phaser'
import { TowerFactory } from '../factories/TowerFactory'
import { WaveManager } from '../managers/WaveManager'
import { GameManager } from '../managers/GameManager'
import { EconomyManager } from '../managers/EconomyManager'
import { ProgressManager } from '../managers/ProgressManager'
import { EventBus, Events } from '../events/EventBus'
import { Tower, type TowerType, type FiringMode, FIRING_MODES } from '../entities/Tower'
import type { EnemyLike } from '../patterns/TargetingStrategy'
import { NearestTargeting, StrongestTargeting, FirstTargeting } from '../patterns/TargetingStrategy'
import towersConfig from '../config/towers.json'

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
  { x: 120, y: 0   },
  { x: 120, y: 480 },
  { x: 60,  y: 480 },
  { x: 60,  y: 80  },
  { x: 700, y: 80  },
  { x: 700, y: 400 },
  { x: 200, y: 400 },
  { x: 200, y: 160 },
  { x: 620, y: 160 },
  { x: 620, y: 340 },
  { x: 300, y: 340 },
  { x: 300, y: 240 },
  { x: 520, y: 240 },
  { x: 520, y: 300 },
  { x: 360, y: 300 },
  { x: 360, y: -30 },
]

const SLOT_POSITIONS_P2: Point[] = [
  { x: 400, y: 130 },
  { x: 160, y: 310 },
  { x: 640, y: 290 },
  { x: 400, y: 450 },
]

// ── Fase 3 ──
const WAYPOINTS_P3: Point[] = [
  { x: 0,   y: 100 },
  { x: 200, y: 100 },
  { x: 200, y: 250 },
  { x: 100, y: 250 },
  { x: 100, y: 400 },
  { x: 350, y: 400 },
  { x: 350, y: 150 },
  { x: 550, y: 150 },
  { x: 550, y: 350 },
  { x: 450, y: 350 },
  { x: 450, y: 480 },
  { x: 700, y: 480 },
  { x: 700, y: 250 },
  { x: 800, y: 250 }
]

const SLOT_POSITIONS_P3: Point[] = [
  { x: 100, y: 180 },
  { x: 250, y: 320 },
  { x: 450, y: 220 },
  { x: 400, y: 450 },
  { x: 620, y: 250 },
  { x: 620, y: 420 },
  { x: 750, y: 150 }
]

// ── Fase 4 ──
const WAYPOINTS_P4: Point[] = [
  { x: 0,   y: 450 },
  { x: 150, y: 450 },
  { x: 150, y: 200 },
  { x: 300, y: 200 },
  { x: 300, y: 450 },
  { x: 450, y: 450 },
  { x: 450, y: 100 },
  { x: 600, y: 100 },
  { x: 600, y: 350 },
  { x: 700, y: 350 },
  { x: 700, y: 560 }
]

const SLOT_POSITIONS_P4: Point[] = [
  { x: 80,  y: 350 },
  { x: 220, y: 300 },
  { x: 380, y: 320 },
  { x: 520, y: 250 },
  { x: 520, y: 480 },
  { x: 650, y: 200 },
  { x: 750, y: 450 }
]

// ── Fases 5+ — mapa procedural ──
const WAYPOINTS: Point[] = [
  { x: 50,  y: 300 },
  { x: 200, y: 300 },
  { x: 200, y: 150 },
  { x: 400, y: 150 },
  { x: 400, y: 420 },
  { x: 600, y: 420 },
  { x: 600, y: 200 },
  { x: 760, y: 200 },
]

const SLOT_POSITIONS: Point[] = [
  { x: 300, y: 80  },
  { x: 500, y: 290 },
  { x: 690, y: 320 },
  { x: 120, y: 375 },
]

const TOWER_LABELS: Record<TowerType, string> = {
  archer: 'Arqueiro',
  mage:   'Mago',
  mortar: 'Morteiro',
}

export class GameScene extends Phaser.Scene {
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
    // map_fase3 e map_fase4 serão carregados quando os arquivos existirem

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
                    : this.phase === 4 ? WAYPOINTS_P4
                    : WAYPOINTS
    const slotPositions = this.phase === 1 ? SLOT_POSITIONS_P1
                        : this.phase === 2 ? SLOT_POSITIONS_P2
                        : this.phase === 3 ? SLOT_POSITIONS_P3
                        : this.phase === 4 ? SLOT_POSITIONS_P4
                        : SLOT_POSITIONS

    this.waveManager = new WaveManager(this, waypoints, this.phase)

    if (this.phase === 1) {
      this.add.image(400, 280, 'map_fase1').setDisplaySize(800, 560)
      this.drawPhase1Markers()
    } else if (this.phase === 2) {
      this.add.image(400, 280, 'map_fase2').setDisplaySize(800, 560)
      this.drawPhase2Markers()
    } else if (this.phase === 3) {
      this.add.image(400, 280, 'map_fase3').setDisplaySize(800, 560)
      this.drawMarkersForPhase(WAYPOINTS_P3)
    } else if (this.phase === 4) {
      this.add.image(400, 280, 'map_fase4').setDisplaySize(800, 560)
      this.drawMarkersForPhase(WAYPOINTS_P4)
    } else {
      this.drawBackground()
      this.drawPath()
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

  private drawBackground() {
    const g = this.add.graphics()

    // Base grass gradient
    g.fillGradientStyle(0x1e3a0e, 0x1e3a0e, 0x0d2206, 0x0d2206, 1)
    g.fillRect(0, 0, 800, 560)

    // Multi-shade grass patches for texture
    const rng = new Phaser.Math.RandomDataGenerator(['td-map'])
    const grassShades = [0x1a3509, 0x224410, 0x2a5214, 0x163008]
    for (let i = 0; i < 220; i++) {
      const gx = rng.integerInRange(0, 795)
      const gy = rng.integerInRange(0, 555)
      g.fillStyle(grassShades[i % grassShades.length], rng.realInRange(0.25, 0.55))
      g.fillEllipse(gx, gy, rng.integerInRange(14, 38), rng.integerInRange(8, 22))
    }

    // Rock clusters (grey ovals)
    const rockAreas = [
      [60, 80], [330, 60], [700, 70], [70, 470], [730, 470],
      [460, 310], [150, 200], [640, 350],
    ]
    for (const [rx, ry] of rockAreas) {
      g.fillStyle(0x445544, 0.7)
      g.fillEllipse(rx, ry, 22, 14)
      g.fillStyle(0x556655, 0.5)
      g.fillEllipse(rx + 10, ry + 4, 14, 9)
      g.fillStyle(0x334433, 0.5)
      g.fillEllipse(rx - 8, ry + 5, 12, 8)
    }

    this.drawTrees(g)
  }

  private drawTrees(g: Phaser.GameObjects.Graphics) {
    // Trees in safe zones (away from the path)
    const treeSets: Array<{ x: number; y: number; size: number }> = [
      // top-left cluster
      { x: 55,  y: 50,  size: 20 }, { x: 90,  y: 40,  size: 16 }, { x: 35,  y: 70,  size: 18 },
      { x: 120, y: 60,  size: 14 }, { x: 70,  y: 90,  size: 15 },
      // top-center cluster (between x200 vertical and x400 vertical, above y130)
      { x: 295, y: 50,  size: 18 }, { x: 330, y: 35,  size: 15 }, { x: 260, y: 65,  size: 14 },
      { x: 355, y: 62,  size: 16 }, { x: 310, y: 88,  size: 13 },
      // top-right cluster
      { x: 660, y: 45,  size: 18 }, { x: 700, y: 30,  size: 15 }, { x: 740, y: 55,  size: 16 },
      // bottom-left
      { x: 60,  y: 460, size: 17 }, { x: 100, y: 480, size: 14 }, { x: 40,  y: 500, size: 16 },
      // bottom-center (below y438, x400-600)
      { x: 480, y: 480, size: 15 }, { x: 520, y: 500, size: 18 }, { x: 555, y: 468, size: 14 },
      // bottom-right
      { x: 660, y: 480, size: 16 }, { x: 700, y: 500, size: 18 }, { x: 740, y: 460, size: 15 },
      // right-side (x620+, y0-180)
      { x: 680, y: 100, size: 14 }, { x: 720, y: 120, size: 16 },
    ]
    for (const { x, y, size } of treeSets) {
      // Trunk
      g.fillStyle(0x5a3510, 1)
      g.fillRect(x - 3, y + size * 0.5, 6, size * 0.6)
      // Shadow foliage
      g.fillStyle(0x0d2a06, 0.7)
      g.fillTriangle(x, y - size * 0.8, x - size * 0.9, y + size * 0.5, x + size * 0.9, y + size * 0.5)
      // Main foliage (two layers)
      g.fillStyle(0x1a4a0a, 1)
      g.fillTriangle(x, y - size, x - size * 0.85, y + size * 0.3, x + size * 0.85, y + size * 0.3)
      g.fillStyle(0x22640e, 1)
      g.fillTriangle(x, y - size * 1.1, x - size * 0.65, y + size * 0.0, x + size * 0.65, y + size * 0.0)
      // Highlight
      g.fillStyle(0x2a7a14, 0.5)
      g.fillTriangle(x, y - size * 1.05, x - size * 0.3, y - size * 0.1, x + size * 0.05, y - size * 0.1)
    }
  }

  private drawPath() {
    const g = this.add.graphics()
    const PATH_W = 36

    // --- Shadow layer (offset down-right for depth) ---
    g.fillStyle(0x1a1005, 0.6)
    for (let i = 0; i < WAYPOINTS.length - 1; i++) {
      const a = WAYPOINTS[i]; const b = WAYPOINTS[i + 1]
      const horiz = a.y === b.y
      const mx = Math.min(a.x, b.x) - (horiz ? 0 : PATH_W / 2)
      const my = Math.min(a.y, b.y) - (horiz ? PATH_W / 2 : 0)
      const w = horiz ? Math.abs(b.x - a.x) : PATH_W
      const h = horiz ? PATH_W : Math.abs(b.y - a.y)
      g.fillRect(mx + 4, my + 4, w, h)
    }

    // --- Base path (dirt/stone) ---
    for (let i = 0; i < WAYPOINTS.length - 1; i++) {
      const a = WAYPOINTS[i]; const b = WAYPOINTS[i + 1]
      const horiz = a.y === b.y
      const mx = Math.min(a.x, b.x) - (horiz ? 0 : PATH_W / 2)
      const my = Math.min(a.y, b.y) - (horiz ? PATH_W / 2 : 0)
      const w = horiz ? Math.abs(b.x - a.x) : PATH_W
      const h = horiz ? PATH_W : Math.abs(b.y - a.y)

      // Base stone color
      g.fillStyle(0x5c4a2a, 1)
      g.fillRect(mx, my, w, h)

      // Lighter center strip
      g.fillStyle(0x6e5a36, 0.8)
      const cx = horiz ? 0 : 5; const cy = horiz ? 5 : 0
      const cw = w - (horiz ? 0 : 10); const ch = h - (horiz ? 10 : 0)
      g.fillRect(mx + cx, my + cy, cw, ch)

      // Cobblestone texture: staggered grid of dark lines
      g.lineStyle(1, 0x3a2a10, 0.55)
      const stoneW = 16; const stoneH = 12
      for (let sx = mx; sx < mx + w; sx += stoneW) {
        for (let sy = my; sy < my + h; sy += stoneH) {
          const offset = Math.floor((sy - my) / stoneH) % 2 === 0 ? 0 : stoneW / 2
          g.strokeRect(sx + offset, sy, stoneW, stoneH)
        }
      }

      // Top/left highlight edge (simulates light from top-left)
      g.lineStyle(2, 0x8a7050, 0.6)
      if (horiz) {
        g.lineBetween(mx, my, mx + w, my)
      } else {
        g.lineBetween(mx, my, mx, my + h)
      }

      // Bottom/right shadow edge
      g.lineStyle(2, 0x2a1a05, 0.7)
      if (horiz) {
        g.lineBetween(mx, my + h, mx + w, my + h)
      } else {
        g.lineBetween(mx + w, my, mx + w, my + h)
      }
    }

    // --- Arrow direction indicators along path ---
    g.lineStyle(2, 0xc8a050, 0.4)
    for (let i = 0; i < WAYPOINTS.length - 1; i++) {
      const a = WAYPOINTS[i]; const b = WAYPOINTS[i + 1]
      const cx = (a.x + b.x) / 2; const cy = (a.y + b.y) / 2
      const dx = b.x - a.x; const dy = b.y - a.y
      const len = Math.sqrt(dx * dx + dy * dy)
      const nx = dx / len; const ny = dy / len
      const perp = { x: -ny * 5, y: nx * 5 }
      // small chevron
      g.beginPath()
      g.moveTo(cx - nx * 7 + perp.x, cy - ny * 7 + perp.y)
      g.lineTo(cx + nx * 7, cy + ny * 7)
      g.lineTo(cx - nx * 7 - perp.x, cy - ny * 7 - perp.y)
      g.strokePath()
    }

    // --- Start portal ---
    const start = WAYPOINTS[0]
    g.fillStyle(0x003300, 0.8)
    g.fillCircle(start.x, start.y, 16)
    g.lineStyle(3, 0x00ff44, 0.9)
    g.strokeCircle(start.x, start.y, 16)
    g.lineStyle(1, 0x88ffaa, 0.5)
    g.strokeCircle(start.x, start.y, 11)
    this.add.text(start.x, start.y, '▶', { fontSize: '12px', color: '#00ff88' }).setOrigin(0.5)

    // --- End (castle) ---
    const last = WAYPOINTS[WAYPOINTS.length - 1]
    g.fillStyle(0x220000, 0.8)
    g.fillCircle(last.x, last.y, 16)
    g.lineStyle(3, 0xff4444, 0.9)
    g.strokeCircle(last.x, last.y, 16)
    this.add.text(last.x, last.y - 32, '🏰', { fontSize: '24px' }).setOrigin(0.5)
  }

  private drawPhase1Markers() {
    const g = this.add.graphics()

    // Entry marker — left edge
    const start = WAYPOINTS_P1[0]
    g.fillStyle(0x003300, 0.75); g.fillCircle(start.x + 20, start.y, 16)
    g.lineStyle(3, 0x00ff44, 0.9); g.strokeCircle(start.x + 20, start.y, 16)
    this.add.text(start.x + 20, start.y, '▶', { fontSize: '12px', color: '#00ff88' }).setOrigin(0.5)

    // Castle marker — bottom exit
    const exitX = WAYPOINTS_P1[WAYPOINTS_P1.length - 1].x
    g.fillStyle(0x220000, 0.75); g.fillCircle(exitX, 543, 16)
    g.lineStyle(3, 0xff4444, 0.9); g.strokeCircle(exitX, 543, 16)
    this.add.text(exitX, 508, '🏰', { fontSize: '24px' }).setOrigin(0.5)
  }

  private drawPhase2Markers() {
    const g = this.add.graphics()

    const start = WAYPOINTS_P2[0]
    g.fillStyle(0x003300, 0.75); g.fillCircle(start.x, start.y + 20, 16)
    g.lineStyle(3, 0x00ff44, 0.9); g.strokeCircle(start.x, start.y + 20, 16)
    this.add.text(start.x, start.y + 20, '▼', { fontSize: '12px', color: '#00ff88' }).setOrigin(0.5)

    const exitX = WAYPOINTS_P2[WAYPOINTS_P2.length - 1].x
    g.fillStyle(0x220000, 0.75); g.fillCircle(exitX, 20, 16)
    g.lineStyle(3, 0xff4444, 0.9); g.strokeCircle(exitX, 20, 16)
    this.add.text(exitX, 52, '🏰', { fontSize: '24px' }).setOrigin(0.5)
  }

  private drawMarkersForPhase(waypoints: Point[]) {
    const g = this.add.graphics()

    const start = waypoints[0]
    g.fillStyle(0x003300, 0.75); g.fillCircle(start.x + 20, start.y, 16)
    g.lineStyle(3, 0x00ff44, 0.9); g.strokeCircle(start.x + 20, start.y, 16)
    this.add.text(start.x + 20, start.y, '▶', { fontSize: '12px', color: '#00ff88' }).setOrigin(0.5)

    const last = waypoints[waypoints.length - 1]
    g.fillStyle(0x220000, 0.75); g.fillCircle(last.x, last.y - 20, 16)
    g.lineStyle(3, 0xff4444, 0.9); g.strokeCircle(last.x, last.y - 20, 16)
    this.add.text(last.x, last.y - 52, '🏰', { fontSize: '24px' }).setOrigin(0.5)
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
      const cfg = (towersConfig as any)[type].levels[0]
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
      const nextCfg = (towersConfig as any)[tower.type].levels[lvl]
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
      const cfg = (towersConfig as any)[tower.type].levels[2]
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
      if (this.codexContainer) {
        this.codexContainer.destroy()
        this.codexContainer = null
      } else {
        this.openCodex('enemies')
      }
    })
  }

  private openCodex(tab: 'enemies' | 'towers') {
    if (this.codexContainer) { this.codexContainer.destroy() }

    const px = 490; const py = 52; const pw = 302; const ph = 410
    const c = this.add.container(0, 0).setDepth(80)
    this.codexContainer = c

    // panel background
    const bg = this.add.graphics()
    bg.fillStyle(0x080f20, 0.97)
    bg.fillRoundedRect(px, py, pw, ph, 10)
    bg.lineStyle(2, 0x4a6aaa, 0.9)
    bg.strokeRoundedRect(px, py, pw, ph, 10)
    c.add(bg)

    c.add(this.add.text(px + pw / 2, py + 15, '📖  Codex', {
      fontSize: '15px', color: '#ddc880', fontStyle: 'bold'
    }).setOrigin(0.5))

    // tabs
    const tabDefs: Array<{ key: 'enemies' | 'towers'; label: string }> = [
      { key: 'enemies', label: '⚔ Inimigos' },
      { key: 'towers',  label: '🏹 Torres'  },
    ]
    tabDefs.forEach(({ key, label }, i) => {
      const active = key === tab
      const tx = px + 14 + i * 143
      const tbg = this.add.graphics()
      tbg.fillStyle(active ? 0x2a3f6a : 0x111828, 1)
      tbg.fillRoundedRect(tx, py + 32, 134, 24, 5)
      if (active) { tbg.lineStyle(1, 0x4a6aaa); tbg.strokeRoundedRect(tx, py + 32, 134, 24, 5) }
      c.add(tbg)
      const ttxt = this.add.text(tx + 67, py + 44, label, {
        fontSize: '12px', color: active ? '#ffffff' : '#667799'
      }).setOrigin(0.5).setInteractive({ cursor: 'pointer' })
      ttxt.on('pointerdown', () => this.openCodex(key))
      c.add(ttxt)
    })

    const cy = py + 66

    if (tab === 'enemies') {
      const entries = [
        { name: 'Goblin',  color: 0x22cc44, hex: '#22dd66', lines: ['HP: 60  |  Vel: rápida', 'Sem resistências', 'Recompensa: 8💰'] },
        { name: 'Troll',   color: 0x9966cc, hex: '#bb88ff', lines: ['HP: 160  |  Vel: lenta', 'Resist. física: 25%', 'Recompensa: 30💰'] },
        { name: 'Xamã',    color: 0xcc8822, hex: '#ffbb44', lines: ['HP: 120  |  Vel: média', 'Resist. mágica: 65%', 'Amaldiçoa torres próximas', 'Recompensa: 20💰'] },
        { name: 'Super Orc', color: 0xff3333, hex: '#ff4444', lines: ['HP: 1200 |  Vel: muito lenta', 'Resistências: 30% Fís. / 30% Mág.', 'O terrível chefe da Fase 1!', 'Recompensa: 150💰'] },
      ]
      entries.forEach(({ name, color, hex, lines }, i) => {
        const ey = cy + i * 112
        const dot = this.add.graphics()
        dot.fillStyle(color, 1)
        dot.fillCircle(px + 22, ey + 18, 11)
        dot.lineStyle(2, 0xffffff, 0.2)
        dot.strokeCircle(px + 22, ey + 18, 11)
        c.add(dot)
        c.add(this.add.text(px + 42, ey + 9, name, { fontSize: '14px', color: hex, fontStyle: 'bold' }))
        lines.forEach((line, j) => {
          c.add(this.add.text(px + 18, ey + 28 + j * 18, `• ${line}`, { fontSize: '11px', color: '#99aacc' }))
        })
        if (i < entries.length - 1) {
          const sep = this.add.graphics()
          sep.lineStyle(1, 0x2a3550, 0.8)
          sep.lineBetween(px + 10, ey + 105, px + pw - 10, ey + 105)
          c.add(sep)
        }
      })
    } else {
      const entries = [
        { name: 'Arqueiro', color: '#D2691E', sq: 0xD2691E, lines: ['Dano: físico  |  Alcance: 130', 'Nv2: arco potenciado', 'Nv3: tiro triplo ✨', 'Custo: 80💰'] },
        { name: 'Mago',     color: '#DA70D6', sq: 0xDA70D6, lines: ['Dano: mágico  |  Alcance: 120', 'Nv2: projéteis mais fortes', 'Nv3: lentidão nas vítimas ✨', 'Custo: 110💰'] },
        { name: 'Morteiro', color: '#9aaa88', sq: 0x808080, lines: ['Dano: físico AoE  |  Alcance: 150', 'Nv2: barril reforçado', 'Nv3: explosão em área ✨', 'Custo: 130💰'] },
      ]
      entries.forEach(({ name, color, sq, lines }, i) => {
        const ty = cy + i * 112
        const sq2 = this.add.graphics()
        sq2.fillStyle(sq, 1); sq2.fillRect(px + 12, ty + 8, 18, 18)
        sq2.lineStyle(1, 0xffffff, 0.2); sq2.strokeRect(px + 12, ty + 8, 18, 18)
        c.add(sq2)
        c.add(this.add.text(px + 40, ty + 9, name, { fontSize: '14px', color, fontStyle: 'bold' }))
        lines.forEach((line, j) => {
          c.add(this.add.text(px + 18, ty + 28 + j * 18, `• ${line}`, { fontSize: '11px', color: '#99aacc' }))
        })
        if (i < entries.length - 1) {
          const sep = this.add.graphics()
          sep.lineStyle(1, 0x2a3550, 0.8)
          sep.lineBetween(px + 10, ty + 105, px + pw - 10, ty + 105)
          c.add(sep)
        }
      })
    }

    // close button
    const closeBtn = this.add.text(px + pw - 8, py + 6, '✕', {
      fontSize: '13px', color: '#ff6666'
    }).setOrigin(1, 0).setInteractive({ cursor: 'pointer' })
    closeBtn.on('pointerdown', () => { this.codexContainer?.destroy(); this.codexContainer = null })
    c.add(closeBtn)
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

  getEnemies(): EnemyLike[] {
    return this.waveManager?.getEnemies() ?? []
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
