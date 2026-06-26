import Phaser from 'phaser'
import { EnemyFactory } from '../factories/EnemyFactory'
import type { EnemyType } from '../entities/Enemy'
import type { Enemy } from '../entities/Enemy'
import type { EnemyLike } from '../patterns/TargetingStrategy'
import { EventBus, Events } from '../events/EventBus'

interface Point { x: number; y: number }
interface HordeDef { enemies: { type: EnemyType; count: number }[]; interval: number; bonus: number }

const HORDES_PER_PHASE = 5
const HEALTH_SCALE_PER_HORDE = 0.05

function generateHordes(phase: number): HordeDef[] {
<<<<<<< HEAD
  const count = 10
=======
  const count = HORDES_PER_PHASE
>>>>>>> df5c28c1a38f3b55f3c03d1db9484ad774e698b4
  const hordes: HordeDef[] = []

  for (let h = 0; h < count; h++) {
    const hNum = h + 1

    // Goblins: start small on horde 1, grow gently across 5 hordes.
    // Base: 6 + (phase-1)*3 so later phases open stronger.
    // Growth: +2 per horde within the phase.
    const goblinCount = 6 + (phase - 1) * 3 + hNum * 2

    const enemies: { type: EnemyType; count: number }[] = [
<<<<<<< HEAD
      { type: 'goblin', count: 12 + phase * 2 + hNum * 5 }
=======
      { type: 'goblin', count: goblinCount }
>>>>>>> df5c28c1a38f3b55f3c03d1db9484ad774e698b4
    ]

    // Trolls appear from horde 2 onward (or phase 2+).
    if (hNum >= 2 || phase >= 2) {
<<<<<<< HEAD
      enemies.push({ type: 'troll', count: Math.max(2, Math.floor(phase * 2.5 + hNum * 1.6)) })
    }
    if (hNum >= 3 || phase >= 3) {
      enemies.push({ type: 'shaman', count: Math.max(1, Math.floor(phase * 1.5 + hNum * 0.9)) })
=======
      const trollCount = Math.max(1, Math.floor((phase - 1) * 1.5 + hNum * 0.8))
      enemies.push({ type: 'troll', count: trollCount })
    }

    // Shamans appear from horde 4 onward (or phase 3+).
    if (hNum >= 4 || phase >= 3) {
      const shamanCount = Math.max(1, Math.floor((phase - 1) * 0.8 + (hNum - 3) * 0.7))
      enemies.push({ type: 'shaman', count: shamanCount })
>>>>>>> df5c28c1a38f3b55f3c03d1db9484ad774e698b4
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
  private currentHealthMultiplier: number = 1
  private spawnQueue: EnemyType[] = []
  private spawnTimer: Phaser.Time.TimerEvent | null = null
  private activeCount: number = 0
  private isSpawning: boolean = false
  private aliveEnemies: Enemy[] = []
  private hordeCompleting: boolean = false

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
    if (this.activeCount === 0 && !this.isSpawning && this.currentHorde > 0 && !this.hordeCompleting) {
      this.hordeCompleting = true
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

    // 5% cumulative health increase per horde (horde 1 = base, horde 2 = +5%, etc.)
    this.currentHealthMultiplier = Math.pow(1 + HEALTH_SCALE_PER_HORDE, this.currentHorde - 1)

    this.spawnQueue = []
    for (const entry of def.enemies) {
      for (let i = 0; i < entry.count; i++) this.spawnQueue.push(entry.type)
    }
    Phaser.Utils.Array.Shuffle(this.spawnQueue)

    this.activeCount = this.spawnQueue.length
    this.hordeCompleting = false
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

    const enemy = EnemyFactory.create(type, this.waypoints, this.scene, this.currentHealthMultiplier)
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
