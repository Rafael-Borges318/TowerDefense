import Phaser from 'phaser'
import type { EnemyLike, DamageType } from '../patterns/TargetingStrategy'

interface ProjectileOptions {
  damageType: DamageType
  slowDuration?: number
  aoeRadius?: number
  useArrow?: boolean
}

export class Projectile extends Phaser.GameObjects.GameObject {
  x: number
  y: number
  active: boolean = true

  private target: EnemyLike
  private damage: number
  private damageType: DamageType
  private slowDuration: number
  private aoeRadius: number
  private speed: number = 380

  private graphics: Phaser.GameObjects.Graphics | null = null
  private arrowImage: Phaser.GameObjects.Image | null = null

  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    target: EnemyLike,
    damage: number,
    options: ProjectileOptions
  ) {
    super(scene, 'Projectile')
    this.x = x
    this.y = y
    this.target = target
    this.damage = damage
    this.damageType = options.damageType
    this.slowDuration = options.slowDuration ?? 0
    this.aoeRadius    = options.aoeRadius ?? 0

    if (options.useArrow && this.aoeRadius === 0 && scene.textures.exists('arrow')) {
      this.arrowImage = scene.add.image(x, y, 'arrow').setScale(0.8).setDepth(13)
      const angle = Math.atan2(target.y - y, target.x - x)
      this.arrowImage.setRotation(angle)
    } else {
      this.graphics = scene.add.graphics().setDepth(13)
      this.drawBullet()
    }

    scene.sys.updateList.add(this)
  }

  private drawBullet() {
    if (!this.graphics) return
    this.graphics.clear()
    const color = this.damageType === 'magic' ? 0xcc44ff : 0xffee00
    this.graphics.fillStyle(color)
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

    if (dist < 12) { this.hit(); return }

    const step = (this.speed * delta) / 1000
    this.x += (dx / dist) * step
    this.y += (dy / dist) * step

    if (this.arrowImage) {
      const angle = Math.atan2(dy, dx)
      this.arrowImage.setPosition(this.x, this.y).setRotation(angle)
    } else {
      this.drawBullet()
    }
  }

  private hit() {
    const target = this.target as any

    if (this.aoeRadius > 0) {
      this.doAoe()
    } else {
      // Apply slow BEFORE damage — takeDamage can destroy the enemy, nullifying this.scene
      if (this.slowDuration > 0 && typeof target.applyEffect === 'function') {
        target.applyEffect('slow', this.slowDuration)
      }
      if (typeof target.takeDamage === 'function') {
        target.takeDamage(this.damage, this.damageType)
      }
    }

    this.showImpact()
    this.destroy()
  }

  private doAoe() {
    const enemies: EnemyLike[] = (this.scene as any).getEnemies?.() ?? []
    let hit = false

    for (const e of enemies) {
      const dx = e.x - this.x
      const dy = e.y - this.y
      if (Math.sqrt(dx * dx + dy * dy) <= this.aoeRadius) {
        const enemy = e as any
        if (typeof enemy.takeDamage === 'function') {
          enemy.takeDamage(this.damage, this.damageType)
          hit = true
        }
      }
    }

    if (!hit) {
      const t = this.target as any
      if (typeof t.takeDamage === 'function') t.takeDamage(this.damage, this.damageType)
    }

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
