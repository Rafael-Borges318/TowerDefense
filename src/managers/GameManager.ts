import { EventBus, Events } from '../events/EventBus'
import { ProgressManager } from './ProgressManager'

type GameState = 'playing' | 'gameover'

export class GameManager {
  private static _instance: GameManager | null = null

  private lives: number
  private state: GameState = 'playing'
  private score: number = 0

  private constructor() {
    const extra = ProgressManager.getInstance().getExtraLives()
    this.lives = 5 + extra
    EventBus.on(Events.ENEMY_REACHED_END, this.onEnemyReachedEnd, this)
  }

  static getInstance(): GameManager {
    if (!GameManager._instance) GameManager._instance = new GameManager()
    return GameManager._instance
  }

  static reset() {
    if (GameManager._instance) {
      EventBus.off(Events.ENEMY_REACHED_END, GameManager._instance.onEnemyReachedEnd, GameManager._instance)
    }
    GameManager._instance = null
  }

  private onEnemyReachedEnd() {
    this.lives--
    if (this.lives <= 0) {
      this.lives = 0
      this.state = 'gameover'
      EventBus.emit(Events.GAME_OVER, { score: this.score })
    }
  }

  getLives(): number { return this.lives }
  getMaxLives(): number { return 5 + ProgressManager.getInstance().getExtraLives() }
  getState(): GameState { return this.state }
  getScore(): number { return this.score }
  addScore(amount: number) { this.score += amount }
  isGameOver(): boolean { return this.state === 'gameover' }

  calcStars(): number {
    const max = this.getMaxLives()
    if (this.lives >= max) return 3
    if (this.lives >= Math.ceil(max * 0.6)) return 2
    return 1
  }
}
