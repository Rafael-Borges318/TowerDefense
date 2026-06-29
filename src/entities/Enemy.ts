import Phaser from 'phaser'
import { EventBus, Events } from '../events/EventBus'
import type { DamageType, Damageable } from '../patterns/TargetingStrategy'
import enemiesConfig from '../config/enemies.json'
import { SLOW_SPEED_MULTIPLIER, ENEMY_DEATH_CLEANUP_MS } from '../constants/game'

export type EnemyType = 'goblin' | 'troll' | 'shaman' | 'boss'

interface Point { x: number; y: number }

interface EnemyConfig {
  health: number
  speed: number
  physicalResist: number
  magicResist: number
  reward: number
  curseInterval?: number
  curseDuration?: number
  curseRange?: number
}

const ENEMY_CFG = enemiesConfig as Record<EnemyType, EnemyConfig>

const SPRITE_CFG: Record<EnemyType, { scale: number; tint?: number }> = {
  goblin: { scale: 1.6 },
  troll:  { scale: 2.3,  tint: 0xddaaff },
  shaman: { scale: 1.9, tint: 0xffcc88 },
  boss:   { scale: 0.18 },
}

export class Enemy extends Phaser.GameObjects.GameObject implements Damageable {
  x: number
  y: number
  health: number
  waypointIndex: number = 0
  active: boolean = true

  private maxHealth: number
  private speed: number
  private physicalResist: number
  private magicResist: number
  private reward: number
  private waypoints: Point[]

  private sprite: Phaser.GameObjects.Sprite
  private healthBar: Phaser.GameObjects.Graphics
  private effectGraphics: Phaser.GameObjects.Graphics
  private isPlayingHurt: boolean = false

  private slowUntil: number = 0
  readonly enemyType: EnemyType

  // shaman-only
  private lastCurseAt: number = 0
  private curseInterval: number = 0
  private curseDuration: number = 0
  private curseRange: number = 0

  constructor(scene: Phaser.Scene, type: EnemyType, waypoints: Point[], healthMultiplier: number = 1) {
    super(scene, 'Enemy')
    this.enemyType = type
    const cfg = ENEMY_CFG[type]

    const scaledHealth = Math.round(cfg.health * healthMultiplier)
    this.health    = scaledHealth
    this.maxHealth = scaledHealth
    this.speed     = cfg.speed
    this.physicalResist = cfg.physicalResist
    this.magicResist    = cfg.magicResist
    this.reward    = cfg.reward
    this.waypoints = waypoints

    if (type === 'shaman') {
      this.curseInterval = cfg.curseInterval ?? 0
      this.curseDuration = cfg.curseDuration ?? 0
      this.curseRange    = cfg.curseRange    ?? 0
    }

    const start = waypoints[0]
    this.x = start.x
    this.y = start.y

    const sc = SPRITE_CFG[type]
    const texKey = type === 'boss' ? 'boss_walk_0' : 'orc_walk'
    this.sprite = scene.add.sprite(start.x, start.y, texKey)
    this.sprite.setScale(sc.scale).setDepth(10)
    if (sc.tint) this.sprite.setTint(sc.tint)

    const animKey = type === 'boss' ? 'boss_walk' : 'orc_walk'
    this.sprite.play(animKey)

    this.effectGraphics = scene.add.graphics().setDepth(11)
    this.healthBar      = scene.add.graphics().setDepth(12)

    this.drawHealthBar()
    scene.sys.updateList.add(this)
  }

  private drawHealthBar() {
    const w = this.enemyType === 'boss' ? 50 : 34
    const bx = this.x - w / 2
    const offset = this.enemyType === 'boss' ? 50 : 26
    const by = this.y - this.sprite.displayHeight / 2 + offset
    const ratio = Math.max(0, this.health / this.maxHealth)
    this.healthBar.clear()
    this.healthBar.fillStyle(0x440000)
    this.healthBar.fillRect(bx, by, w, 3)
    this.healthBar.fillStyle(0x00ff44)
    this.healthBar.fillRect(bx, by, w * ratio, 3)
  }

  preUpdate(time: number, delta: number) {
    if (!this.active) return

    if (this.enemyType === 'shaman' && this.curseInterval > 0) {
      if (time - this.lastCurseAt >= this.curseInterval) {
        this.lastCurseAt = time
        EventBus.emit(Events.SHAMAN_CURSE, {
          x: this.x, y: this.y,
          range: this.curseRange,
          duration: this.curseDuration,
        })
      }
    }

    const target = this.waypoints[this.waypointIndex]
    if (!target) return

    const isSlowed = time < this.slowUntil
    const effectiveSpeed = isSlowed ? this.speed * SLOW_SPEED_MULTIPLIER : this.speed
    const dx = target.x - this.x
    const dy = target.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const step = (effectiveSpeed * delta) / 1000

    if (Math.abs(dx) > 1) this.sprite.setFlipX(dx < 0)

    if (dist <= step) {
      this.x = target.x
      this.y = target.y
      this.waypointIndex++
      if (this.waypointIndex >= this.waypoints.length) {
        EventBus.emit(Events.ENEMY_REACHED_END)
        this.destroy()
        return
      }
    } else {
      this.x += (dx / dist) * step
      this.y += (dy / dist) * step
    }

    this.sprite.setPosition(this.x, this.y)
    this.drawHealthBar()
    this.effectGraphics.clear()
  }

  takeDamage(amount: number, damageType: DamageType) {
    const resist = damageType === 'physical' ? this.physicalResist : this.magicResist
    const effective = Math.max(1, Math.floor(amount * (1 - resist / 100)))
    this.health -= effective

    if (this.health <= 0) {
      EventBus.emit(Events.ENEMY_DIED, { reward: this.reward })
      this.destroy()
    } else if (!this.isPlayingHurt && this.sprite.active) {
      this.isPlayingHurt = true
      const hurtAnim = this.enemyType === 'boss' ? 'boss_hurt' : 'orc_hurt'
      this.sprite.play(hurtAnim)
      this.sprite.once('animationcomplete', () => {
        if (this.active && this.sprite.active) {
          this.isPlayingHurt = false
          const walkAnim = this.enemyType === 'boss' ? 'boss_walk' : 'orc_walk'
          this.sprite.play(walkAnim)
        }
      })
    }
  }

  applyEffect(type: string, duration: number) {
    if (!this.active || !this.scene) return
    if (type === 'slow') {
      this.slowUntil = this.scene.time.now + duration
    }
  }

  destroy() {
    this.active = false
    const scene = this.scene

    if (this.sprite?.active) {
      const deathAnim = this.enemyType === 'boss' ? 'boss_death' : 'orc_death'
      this.sprite.play(deathAnim)
      this.sprite.once('animationcomplete', () => {
        if (this.sprite?.active) this.sprite.destroy()
      })
      scene?.time.delayedCall(ENEMY_DEATH_CLEANUP_MS, () => {
        if (this.sprite?.active) this.sprite.destroy()
      })
    }

    this.healthBar?.destroy()
    this.effectGraphics?.destroy()
    super.destroy()
  }
}
