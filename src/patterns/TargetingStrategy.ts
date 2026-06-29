import Phaser from 'phaser'

export type DamageType = 'physical' | 'magic'

export interface EnemyLike {
  x: number
  y: number
  health: number
  waypointIndex: number
  active: boolean
}

export interface Damageable extends EnemyLike {
  takeDamage(amount: number, type: DamageType): void
  applyEffect(type: string, duration: number): void
}

export interface GameSceneLike extends Phaser.Scene {
  getEnemies(): Damageable[]
}

export interface ITargetingStrategy {
  selectTarget(enemies: EnemyLike[]): EnemyLike | null
}

function activeOnly(enemies: EnemyLike[]): EnemyLike[] {
  return enemies.filter(e => e.active)
}

export class NearestTargeting implements ITargetingStrategy {
  constructor(private towerX: number, private towerY: number) {}

  selectTarget(enemies: EnemyLike[]): EnemyLike | null {
    const active = activeOnly(enemies)
    if (!active.length) return null
    return active.reduce((best, e) => {
      const d  = (e.x    - this.towerX) ** 2 + (e.y    - this.towerY) ** 2
      const bd = (best.x - this.towerX) ** 2 + (best.y - this.towerY) ** 2
      return d < bd ? e : best
    })
  }
}

export class StrongestTargeting implements ITargetingStrategy {
  selectTarget(enemies: EnemyLike[]): EnemyLike | null {
    const active = activeOnly(enemies)
    if (!active.length) return null
    return active.reduce((a, b) => b.health > a.health ? b : a)
  }
}

export class FirstTargeting implements ITargetingStrategy {
  selectTarget(enemies: EnemyLike[]): EnemyLike | null {
    const active = activeOnly(enemies)
    if (!active.length) return null
    return active.reduce((a, b) => b.waypointIndex > a.waypointIndex ? b : a)
  }
}
