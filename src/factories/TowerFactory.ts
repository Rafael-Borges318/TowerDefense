import Phaser from 'phaser'
import { Tower, type TowerType } from '../entities/Tower'
import { NearestTargeting } from '../patterns/TargetingStrategy'

export class TowerFactory {
  static create(x: number, y: number, type: TowerType, scene: Phaser.Scene): Tower {
    const strategy = new NearestTargeting(x, y)
    return new Tower(scene, x, y, type, strategy)
  }
}
