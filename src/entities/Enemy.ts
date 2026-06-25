import Phaser from 'phaser'
import { EventBus, Events } from '../events/EventBus'
import type { DamageType } from '../patterns/TargetingStrategy'
import enemiesConfig from '../config/enemies.json'

export type EnemyType = 'goblin' | 'troll' | 'shaman'

interface Point { x: number; y: number }

const SPRITE_CFG: Record<EnemyType, { scale: number; tint?: number }> = {
  goblin: { scale: 1.6 },
  troll:  { scale: 2.3,  tint: 0xddaaff },
  shaman: { scale: 1.9, tint: 0xffcc88 },
}

export class Enemy extends Phaser.GameObjects.GameObject {
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

  constructor(scene: Phaser.Scene, type: EnemyType, waypoints: Point[]) {
    super(scene, 'Enemy')
    this.enemyType = type
    const cfg = enemiesConfig[type] as any

    this.health    = cfg.health
    this.maxHealth = cfg.health
    this.speed     = cfg.speed
    this.physicalResist = cfg.physicalResist
    this.magicResist    = cfg.magicResist
    this.reward    = cfg.reward
    this.waypoints = waypoints

    if (type === 'shaman') {
      this.curseInterval = cfg.curseInterval
      this.curseDuration = cfg.curseDuration
      this.curseRange    = cfg.curseRange
    }

    const start = waypoints[0]
    this.x = start.x
    this.y = start.y

    const sc = SPRITE_CFG[type]
    this.sprite = scene.add.sprite(start.x, start.y, 'orc_walk')
    this.sprite.setScale(sc.scale).setDepth(10)
    if (sc.tint) this.sprite.setTint(sc.tint)
    this.sprite.play('orc_walk')

    this.effectGraphics = scene.add.graphics().setDepth(11)
    this.healthBar      = scene.add.graphics().setDepth(12)

    this.drawHealthBar()
    scene.sys.updateList.add(this)
  }

  private drawHealthBar() {
    const w = 34
    const bx = this.x - w / 2
    const by = this.y - this.sprite.displayHeight / 2 + 26
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
          duration: this.curseDuration
        })
      }
    }

    const target = this.waypoints[this.waypointIndex]
    if (!target) return

    const isSlowed = time < this.slowUntil
    const effectiveSpeed = isSlowed ? this.speed * 0.45 : this.speed
    const dx = target.x - this.x
    const dy = target.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const step = (effectiveSpeed * delta) / 1000

    // flip sprite to face movement direction
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
    if (isSlowed) {
      this.effectGraphics.lineStyle(2, 0x4488ff, 0.7)
      this.effectGraphics.strokeCircle(this.x, this.y, this.sprite.displayWidth / 2 + 4)
    }
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
      this.sprite.play('orc_hurt')
      this.sprite.once('animationcomplete', () => {
        if (this.active && this.sprite.active) {
          this.isPlayingHurt = false
          this.sprite.play('orc_walk')
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
      this.sprite.play('orc_death')
      this.sprite.once('animationcomplete', () => {
        if (this.sprite?.active) this.sprite.destroy()
      })
      // fallback cleanup in case animation never fires
      scene?.time.delayedCall(900, () => {
        if (this.sprite?.active) this.sprite.destroy()
      })
    }

    this.healthBar?.destroy()
    this.effectGraphics?.destroy()
    super.destroy()
  }
}
