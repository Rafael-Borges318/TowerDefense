import Phaser from 'phaser'
import type { ITargetingStrategy, EnemyLike, Damageable, GameSceneLike } from '../patterns/TargetingStrategy'
import { NearestTargeting } from '../patterns/TargetingStrategy'
import { Projectile } from './Projectile'
import towersConfig from '../config/towers.json'
import { ProgressManager } from '../managers/ProgressManager'
import {
  MAGE_SLOW_ZONE_RADIUS,
  MAGE_SLOW_ZONE_DURATION,
  SLOW_EFFECT_REFRESH_MS,
} from '../constants/game'

export type TowerType = 'archer' | 'mage' | 'mortar'
export type FiringMode = 'heavy' | 'normal' | 'rapid'

export const FIRING_MODES: Record<FiringMode, { damageMult: number; rateMult: number; label: string; desc: string; color: string }> = {
  heavy:  { damageMult: 1.8,  rateMult: 1.75, label: '⚡ Potente', desc: '+80% dano / −cadência',  color: '#ff9944' },
  normal: { damageMult: 1.0,  rateMult: 1.00, label: '⚖ Normal',  desc: 'Padrão',                  color: '#aaaacc' },
  rapid:  { damageMult: 0.55, rateMult: 0.45, label: '💨 Rápido', desc: '+cadência / −45% dano',   color: '#44aaff' },
}

export interface TowerLevel {
  cost: number
  upgradeCost: number
  damage: number
  fireRate: number
  range: number
  aoeRadius?: number
  special?: string
  bodyColor: string
  accentColor: string
  width: number
  height: number
  label: string
}

export interface TowerDef {
  damageType: 'physical' | 'magic'
  levels: TowerLevel[]
}

export const TOWERS_CFG = towersConfig as Record<TowerType, TowerDef>

export class Tower extends Phaser.GameObjects.GameObject {
  x: number
  y: number
  level: number = 1
  active: boolean = true

  readonly type: TowerType
  private strategy: ITargetingStrategy
  private graphics: Phaser.GameObjects.Graphics
  private rangeGraphics: Phaser.GameObjects.Graphics
  private disruptGraphics: Phaser.GameObjects.Graphics
  private archerImage: Phaser.GameObjects.Image | null = null
  private magoImage: Phaser.GameObjects.Image | null = null
  private morteiroImage: Phaser.GameObjects.Image | null = null
  private slowZone: { graphics: Phaser.GameObjects.Graphics; x: number; y: number; radius: number; until: number } | null = null
  private lastFiredAt: number = 0
  private disruptedUntil: number = 0
  private investedGold: number = 0
  private firingMode: FiringMode = 'normal'

  constructor(scene: Phaser.Scene, x: number, y: number, type: TowerType, strategy: ITargetingStrategy) {
    super(scene, 'Tower')
    this.x = x
    this.y = y
    this.type = type
    this.strategy = strategy

    const cfg = this.getBaseCfg()
    this.investedGold = cfg.cost

    this.disruptGraphics = scene.add.graphics()
    this.rangeGraphics   = scene.add.graphics()
    this.graphics        = scene.add.graphics()

    if (this.type === 'archer' && scene.textures.exists('torre_arqueiro')) {
      this.archerImage = scene.add.image(x, y, this.textureKey('torre_arqueiro')).setDisplaySize(100, 100).setDepth(10)
    }
    if (this.type === 'mage' && scene.textures.exists('torre_mago')) {
      this.magoImage = scene.add.image(x, y, this.textureKey('torre_mago')).setDisplaySize(100, 100).setDepth(10)
    }
    if (this.type === 'mortar' && scene.textures.exists('torre_morteiro')) {
      this.morteiroImage = scene.add.image(x, y, this.textureKey('torre_morteiro')).setDisplaySize(90, 90).setDepth(10)
    }

    this.draw()
    scene.sys.updateList.add(this)
  }

  private getBaseCfg(): TowerLevel {
    return TOWERS_CFG[this.type].levels[this.level - 1]
  }

  private getStats() {
    const cfg = this.getBaseCfg()
    const pm = ProgressManager.getInstance()
    const dmgMult = pm.getDamageMultiplier(this.type)
    const aoeMult = pm.getAoeMultiplier()
    const mode = FIRING_MODES[this.firingMode]
    return {
      ...cfg,
      damage:     Math.floor(cfg.damage * dmgMult * mode.damageMult),
      fireRate:   Math.floor(cfg.fireRate * mode.rateMult),
      aoeRadius:  cfg.aoeRadius ? Math.floor(cfg.aoeRadius * aoeMult) : 0,
      damageType: TOWERS_CFG[this.type].damageType,
    }
  }

  private textureKey(base: string): string {
    if (this.level === 2) return `${base}_2`
    if (this.level === 3) return `${base}_3`
    return base
  }

  private draw(disrupted: boolean = false) {
    const cfg = this.getBaseCfg()
    const body   = Number(cfg.bodyColor)
    const accent = Number(cfg.accentColor)
    const hw = cfg.width  / 2
    const hh = cfg.height / 2
    const bx = this.x - hw
    const by = this.y - hh

    this.graphics.clear()

    if (!this.archerImage && !this.magoImage && !this.morteiroImage) {
      this.graphics.fillStyle(body)
      this.graphics.fillRect(bx, by, cfg.width, cfg.height)
      this.graphics.lineStyle(2, accent, 1)
      this.graphics.strokeRect(bx, by, cfg.width, cfg.height)

      if (this.type === 'archer')      this.drawArcher(bx, by, cfg, accent)
      else if (this.type === 'mage')   this.drawMage(bx, by, cfg, accent)
      else                             this.drawMortar(bx, by, cfg, accent)
    }

    this.disruptGraphics.clear()
    if (disrupted) {
      this.disruptGraphics.lineStyle(2, 0xff4400, 0.8)
      this.disruptGraphics.strokeRect(bx - 3, by - 3, cfg.width + 6, cfg.height + 6)
      this.disruptGraphics.fillStyle(0xff4400, 0.1)
      this.disruptGraphics.fillRect(bx - 3, by - 3, cfg.width + 6, cfg.height + 6)
    }
  }

  private drawArcher(bx: number, by: number, cfg: TowerLevel, accent: number) {
    this.graphics.fillStyle(accent)
    this.graphics.fillTriangle(this.x, by - 8, this.x - 5, by, this.x + 5, by)

    if (this.level === 2) {
      this.graphics.lineStyle(2, accent)
      this.graphics.beginPath()
      this.graphics.arc(this.x, by - 6, 8, Math.PI * 1.2, Math.PI * 1.8)
      this.graphics.strokePath()
    }
    if (this.level === 3) {
      for (let i = -1; i <= 1; i++) {
        this.graphics.fillStyle(accent)
        this.graphics.fillTriangle(this.x + i * 6, by - 10, this.x + i * 6 - 3, by - 4, this.x + i * 6 + 3, by - 4)
      }
      this.graphics.lineStyle(1, 0xFFD700)
      this.graphics.strokeRect(bx + 2, by + 2, cfg.width - 4, cfg.height - 4)
    }
  }

  private drawMage(bx: number, by: number, cfg: TowerLevel, accent: number) {
    this.graphics.fillStyle(accent, 0.9)
    this.graphics.fillCircle(this.x, by - 6, this.level === 3 ? 8 : 6)

    if (this.level === 2) {
      this.graphics.lineStyle(1, accent)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        this.graphics.beginPath()
        this.graphics.moveTo(this.x, by - 6)
        this.graphics.lineTo(this.x + Math.cos(a) * 10, by - 6 + Math.sin(a) * 10)
        this.graphics.strokePath()
      }
    }
    if (this.level === 3) {
      this.graphics.fillStyle(0x00FFFF, 0.8)
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2
        this.graphics.fillCircle(this.x + Math.cos(a) * 16, this.y + Math.sin(a) * 16, 3)
      }
      this.graphics.lineStyle(1, 0x00FFFF, 0.6)
      this.graphics.strokeRect(bx + 2, by + 2, cfg.width - 4, cfg.height - 4)
    }
  }

  private drawMortar(bx: number, by: number, cfg: TowerLevel, accent: number) {
    this.graphics.fillStyle(accent)
    const barrelLen = 10 + this.level * 3
    this.graphics.fillRect(this.x - 4, by - barrelLen, 8, barrelLen)

    if (this.level >= 2) {
      this.graphics.lineStyle(3, accent)
      this.graphics.strokeRect(bx + 3, by + 3, cfg.width - 6, 6)
    }
    if (this.level === 3) {
      this.graphics.fillStyle(0xFF4500, 0.5)
      this.graphics.fillCircle(this.x, by, 8)
      this.graphics.fillStyle(0xFFD700)
      this.graphics.fillCircle(this.x, by - barrelLen - 4, 5)
    }
  }

  showRange(show: boolean) {
    this.rangeGraphics.clear()
    if (show) {
      const cfg = this.getBaseCfg()
      this.rangeGraphics.lineStyle(1, 0xffffff, 0.2)
      this.rangeGraphics.strokeCircle(this.x, this.y, cfg.range)
    }
  }

  disrupt(duration: number) {
    this.disruptedUntil = this.scene.time.now + duration
    this.draw(true)
    this.scene.time.delayedCall(duration, () => {
      if (this.active) this.draw(false)
    })
  }

  upgrade(): number {
    if (this.level >= 3) return 0
    const cost = this.getBaseCfg().upgradeCost
    this.investedGold += cost
    this.level++
    if (this.archerImage)   this.archerImage.setTexture(this.textureKey('torre_arqueiro'))
    if (this.magoImage)     this.magoImage.setTexture(this.textureKey('torre_mago'))
    if (this.morteiroImage) {
      this.morteiroImage.setTexture(this.textureKey('torre_morteiro'))
      this.morteiroImage.setDisplaySize(90, 90)
    }
    this.draw()
    return cost
  }

  getUpgradeCost(): number {
    if (this.level >= 3) return 0
    return this.getBaseCfg().upgradeCost
  }

  getSellValue(): number { return Math.floor(this.investedGold * 0.5) }
  getLabel(): string { return this.getBaseCfg().label }
  setStrategy(s: ITargetingStrategy) { this.strategy = s }
  getFiringMode(): FiringMode { return this.firingMode }
  setFiringMode(mode: FiringMode) { this.firingMode = mode }

  preUpdate(time: number, _delta: number) {
    if (!this.active) return

    if (this.slowZone) {
      if (time >= this.slowZone.until) {
        this.slowZone.graphics.destroy()
        this.slowZone = null
      } else {
        const enemies = (this.scene as GameSceneLike).getEnemies?.() ?? []
        for (const e of enemies) {
          const dx = e.x - this.slowZone.x
          const dy = e.y - this.slowZone.y
          if (Math.sqrt(dx * dx + dy * dy) <= this.slowZone.radius) {
            e.applyEffect('slow', SLOW_EFFECT_REFRESH_MS)
          }
        }
      }
    }

    if (time < this.disruptedUntil) return

    const cfg = this.getStats()
    if (time - this.lastFiredAt < cfg.fireRate) return

    const enemies: EnemyLike[] = (this.scene as GameSceneLike).getEnemies?.() ?? []
    const inRange = enemies.filter(e => {
      const dx = e.x - this.x
      const dy = e.y - this.y
      return Math.sqrt(dx * dx + dy * dy) <= cfg.range
    })

    const primary = this.strategy.selectTarget(inRange)
    if (!primary) return

    this.lastFiredAt = time

    if (cfg.special === 'slow' && !this.slowZone) {
      const g = this.scene.add.graphics().setDepth(5)
      g.fillStyle(0x88eeff, 0.22)
      g.fillCircle(primary.x, primary.y, MAGE_SLOW_ZONE_RADIUS)
      g.lineStyle(2, 0xaaf0ff, 0.6)
      g.strokeCircle(primary.x, primary.y, MAGE_SLOW_ZONE_RADIUS)
      this.slowZone = { graphics: g, x: primary.x, y: primary.y, radius: MAGE_SLOW_ZONE_RADIUS, until: time + MAGE_SLOW_ZONE_DURATION }
    }

    const spawnX = this.x
    const spawnY = this.archerImage  ? this.y - 22
                 : this.morteiroImage ? this.y - 32
                 : this.y

    if (cfg.special === 'triple_shot') {
      const nearest = new NearestTargeting(this.x, this.y)
      const pool = [...inRange]
      const targets: EnemyLike[] = []
      for (let i = 0; i < 3 && pool.length > 0; i++) {
        const t = nearest.selectTarget(pool)
        if (!t) break
        targets.push(t)
        pool.splice(pool.indexOf(t), 1)
      }
      if (targets.length === 0) targets.push(primary)
      for (const t of targets) {
        new Projectile(this.scene, spawnX, spawnY, t as Damageable, cfg.damage, { damageType: cfg.damageType, useArrow: this.type === 'archer' })
      }
    } else {
      new Projectile(this.scene, spawnX, spawnY, primary as Damageable, cfg.damage, {
        damageType: cfg.damageType,
        slowDuration: 0,
        aoeRadius: cfg.special === 'aoe' ? cfg.aoeRadius : 0,
        useArrow: this.type === 'archer',
        bulletColor: this.type === 'mortar' ? 0x222222 : undefined,
      })
    }
  }

  destroy() {
    this.active = false
    this.graphics.destroy()
    this.rangeGraphics.destroy()
    this.disruptGraphics.destroy()
    this.archerImage?.destroy()
    this.magoImage?.destroy()
    this.morteiroImage?.destroy()
    this.slowZone?.graphics.destroy()
    super.destroy()
  }
}
