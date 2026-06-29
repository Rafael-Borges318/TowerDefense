import Phaser from 'phaser'
import type { Damageable, DamageType, GameSceneLike } from '../patterns/TargetingStrategy'
import { PROJECTILE_SPEED, PROJECTILE_HIT_RADIUS } from '../constants/game'

interface ProjectileOptions {
  damageType: DamageType
  slowDuration?: number
  aoeRadius?: number
  useArrow?: boolean
  bulletColor?: number
}

export class Projectile extends Phaser.GameObjects.GameObject {
  x: number
  y: number
  active: boolean = true

  private target: Damageable
  private damage: number
  private damageType: DamageType
  private slowDuration: number
  private aoeRadius: number
  private bulletColor: number

  private graphics: Phaser.GameObjects.Graphics | null = null
  private arrowImage: Phaser.GameObjects.Image | null = null

  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    target: Damageable,
    damage: number,
    options: ProjectileOptions,
  ) {
    super(scene, 'Projectile')
    this.x = x
    this.y = y
    this.target       = target
    this.damage       = damage
    this.damageType   = options.damageType
    this.slowDuration = options.slowDuration ?? 0
    this.aoeRadius    = options.aoeRadius    ?? 0
    this.bulletColor  = options.bulletColor  ?? (options.damageType === 'magic' ? 0xcc44ff : 0xffee00)

    if (options.useArrow && this.aoeRadius === 0 && scene.textures.exists('arrow')) {
      this.arrowImage = scene.add.image(x, y, 'arrow').setScale(0.8).setDepth(13)
      this.arrowImage.setRotation(Math.atan2(target.y - y, target.x - x))
    } else {
      this.graphics = scene.add.graphics().setDepth(13)
      this.drawBullet()
    }

    scene.sys.updateList.add(this)
  }

  private drawBullet() {
    if (!this.graphics) return
    this.graphics.clear()
    this.graphics.fillStyle(this.bulletColor)
    this.graphics.fillCircle(this.x, this.y, this.aoeRadius > 0 ? 7 : 5)
    if (this.damageType === 'magic') {
      this.graphics.lineStyle(1, 0xffffff, 0.5)
      this.graphics.strokeCircle(this.x, this.y, 8)
    }
  }

  preUpdate(_time: number, delta: number) {
    if (!this.active) return
    if (!this.target.active) { this.destroy(); return }

    const dx = this.target.x - this.x
    const dy = this.target.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < PROJECTILE_HIT_RADIUS) { this.hit(); return }

    const step = (PROJECTILE_SPEED * delta) / 1000
    this.x += (dx / dist) * step
    this.y += (dy / dist) * step

    if (this.arrowImage) {
      this.arrowImage.setPosition(this.x, this.y).setRotation(Math.atan2(dy, dx))
    } else {
      this.drawBullet()
    }
  }

  private hit() {
    if (this.aoeRadius > 0) {
      this.doAoe()
    } else {
      if (this.slowDuration > 0) this.target.applyEffect('slow', this.slowDuration)
      this.target.takeDamage(this.damage, this.damageType)
    }
    this.showImpact()
    this.destroy()
  }

  private doAoe() {
    const enemies = (this.scene as GameSceneLike).getEnemies?.() ?? []
    let hit = false

    for (const e of enemies) {
      const dx = e.x - this.x
      const dy = e.y - this.y
      if (Math.sqrt(dx * dx + dy * dy) <= this.aoeRadius) {
        e.takeDamage(this.damage, this.damageType)
        hit = true
      }
    }

    if (!hit) this.target.takeDamage(this.damage, this.damageType)

    const g = this.scene.add.graphics().setDepth(14)
    g.lineStyle(2, 0xff6600, 0.8)
    g.strokeCircle(this.x, this.y, this.aoeRadius)
    g.fillStyle(0xff6600, 0.15)
    g.fillCircle(this.x, this.y, this.aoeRadius)
    this.scene.time.delayedCall(250, () => g.destroy())
  }

  private showImpact() {
    const g = this.scene.add.graphics().setDepth(14)
    const color = this.damageType === 'magic' ? 0xcc44ff : 0xffee00
    g.fillStyle(color, 0.6)
    g.fillCircle(this.x, this.y, 8)
    this.scene.time.delayedCall(120, () => g.destroy())
  }

  destroy() {
    this.active = false
    this.graphics?.destroy()
    this.arrowImage?.destroy()
    super.destroy()
  }
}
