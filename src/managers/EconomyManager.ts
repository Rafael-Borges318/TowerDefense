import { EventBus, Events } from '../events/EventBus'
import { GameManager } from './GameManager'

export class EconomyManager {
  private static _instance: EconomyManager | null = null

  private gold: number

  private constructor(phase: number) {
    this.gold = 100 + phase * 50
    EventBus.on(Events.ENEMY_DIED, this.onEnemyDied, this)
    EventBus.on(Events.HORDE_COMPLETE, this.onHordeComplete, this)
  }

  static getInstance(): EconomyManager {
    if (!EconomyManager._instance) throw new Error('EconomyManager not initialized. Call reset(phase) first.')
    return EconomyManager._instance
  }

  static reset(phase: number = 1) {
    if (EconomyManager._instance) {
      EventBus.off(Events.ENEMY_DIED, EconomyManager._instance.onEnemyDied, EconomyManager._instance)
      EventBus.off(Events.HORDE_COMPLETE, EconomyManager._instance.onHordeComplete, EconomyManager._instance)
    }
    EconomyManager._instance = new EconomyManager(phase)
  }

  private onEnemyDied(data: { reward: number }) {
    this.gold += data.reward
    GameManager.getInstance().addScore(data.reward)
    EventBus.emit(Events.GOLD_CHANGED, { gold: this.gold })
  }

  private onHordeComplete(data: { bonus: number }) {
    this.gold += data.bonus
    GameManager.getInstance().addScore(data.bonus)
    EventBus.emit(Events.GOLD_CHANGED, { gold: this.gold })
  }

  getGold(): number { return this.gold }

  spend(amount: number): boolean {
    if (this.gold < amount) return false
    this.gold -= amount
    EventBus.emit(Events.GOLD_CHANGED, { gold: this.gold })
    return true
  }

  add(amount: number) {
    this.gold += amount
    EventBus.emit(Events.GOLD_CHANGED, { gold: this.gold })
  }

  canAfford(amount: number): boolean { return this.gold >= amount }
}
