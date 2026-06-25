import Phaser from 'phaser'
import { EnemyFactory } from '../factories/EnemyFactory'
import type { EnemyType } from '../entities/Enemy'
import type { Enemy } from '../entities/Enemy'
import type { EnemyLike } from '../patterns/TargetingStrategy'
import { EventBus, Events } from '../events/EventBus'

interface Point { x: number; y: number }
interface HordeDef { enemies: { type: EnemyType; count: number }[]; interval: number; bonus: number }

function generateHordes(phase: number): HordeDef[] {
  const count = 2 + phase
  const hordes: HordeDef[] = []

  for (let h = 0; h < count; h++) {
    const hNum = h + 1
    const enemies: { type: EnemyType; count: number }[] = [
      { type: 'goblin', count: 4 + phase + hNum * 2 }
    ]
    if (hNum >= 2 || phase >= 2) {
      enemies.push({ type: 'troll', count: Math.max(1, Math.floor(phase * 1.2 + hNum * 0.7)) })
    }
    if (hNum >= 3 || phase >= 3) {
      enemies.push({ type: 'shaman', count: Math.max(1, Math.floor(phase * 0.7 + hNum * 0.4)) })
    }
    hordes.push({
      enemies,
      interval: Math.max(450, 1200 - phase * 60 - hNum * 40),
      bonus: 25 + phase * 8
    })
  }
  return hordes
}

export class WaveManager {
  private scene: Phaser.Scene
  private waypoints: Point[]
  private phase: number

  private hordes: HordeDef[]
  private currentHorde: number = 0
  private spawnQueue: EnemyType[] = []
  private spawnTimer: Phaser.Time.TimerEvent | null = null
  private activeCount: number = 0
  private isSpawning: boolean = false
  private aliveEnemies: Enemy[] = []

  constructor(scene: Phaser.Scene, waypoints: Point[], phase: number) {
    this.scene = scene
    this.waypoints = waypoints
    this.phase = phase
    this.hordes = generateHordes(phase)

    EventBus.on(Events.ENEMY_DIED, this.onEnemyRemoved, this)
    EventBus.on(Events.ENEMY_REACHED_END, this.onEnemyRemoved, this)
  }

  private onEnemyRemoved() {
    this.activeCount = Math.max(0, this.activeCount - 1)
    this.aliveEnemies = this.aliveEnemies.filter(e => e.active)
    if (this.activeCount === 0 && !this.isSpawning && this.currentHorde > 0) {
      this.onHordeComplete()
    }
  }

  getCurrentHorde(): number { return this.currentHorde }
  getTotalHordes(): number { return this.hordes.length }
  isLastHorde(): boolean { return this.currentHorde >= this.hordes.length }
  getPhase(): number { return this.phase }

  getEnemies(): EnemyLike[] {
    this.aliveEnemies = this.aliveEnemies.filter(e => e.active)
    return this.aliveEnemies as EnemyLike[]
  }

  startNextHorde() {
    if (this.currentHorde >= this.hordes.length) {
      EventBus.emit(Events.PHASE_COMPLETE)
      return
    }

    const def = this.hordes[this.currentHorde]
    this.currentHorde++

    this.spawnQueue = []
    for (const entry of def.enemies) {
      for (let i = 0; i < entry.count; i++) this.spawnQueue.push(entry.type)
    }
    Phaser.Utils.Array.Shuffle(this.spawnQueue)

    this.activeCount = this.spawnQueue.length
    this.isSpawning = true

    this.spawnTimer = this.scene.time.addEvent({
      delay: def.interval,
      callback: this.spawnNext,
      callbackScope: this,
      repeat: this.spawnQueue.length - 1,
    })
  }

  private spawnNext() {
    const type = this.spawnQueue.shift()
    if (!type) { this.isSpawning = false; return }

    const enemy = EnemyFactory.create(type, this.waypoints, this.scene)
    this.aliveEnemies.push(enemy)

    if (this.spawnQueue.length === 0) this.isSpawning = false
  }

  private onHordeComplete() {
    const def = this.hordes[this.currentHorde - 1]
    EventBus.emit(Events.HORDE_COMPLETE, {
      horde: this.currentHorde,
      total: this.hordes.length,
      bonus: def.bonus
    })

    if (this.currentHorde >= this.hordes.length) {
      this.scene.time.delayedCall(800, () => {
        EventBus.emit(Events.PHASE_COMPLETE, { phase: this.phase })
      })
    }
  }

  destroy() {
    this.spawnTimer?.remove()
    EventBus.off(Events.ENEMY_DIED, this.onEnemyRemoved, this)
    EventBus.off(Events.ENEMY_REACHED_END, this.onEnemyRemoved, this)
  }
}
