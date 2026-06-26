import Phaser from 'phaser'
import { Enemy, type EnemyType } from '../entities/Enemy'

interface Point { x: number; y: number }

export class EnemyFactory {
  static create(type: EnemyType, waypoints: Point[], scene: Phaser.Scene, healthMultiplier: number = 1): Enemy {
    return new Enemy(scene, type, waypoints, healthMultiplier)
  }
}
