import type { TowerType } from '../entities/Tower'

interface UpgradeTree {
  archer_damage: number
  mage_damage: number
  mortar_aoe: number
  extra_life: number
}

interface ProgressData {
  currentPhase: number
  totalStars: number
  upgrades: UpgradeTree
}

const STORAGE_KEY = 'td_progress'
const DEFAULT: ProgressData = {
  currentPhase: 1,
  totalStars: 0,
  upgrades: { archer_damage: 0, mage_damage: 0, mortar_aoe: 0, extra_life: 0 }
}

const UPGRADE_MAX_LEVEL = 3
const UPGRADE_COST_PER_LEVEL = 1

export class ProgressManager {
  private static _instance: ProgressManager | null = null
  private data: ProgressData

  private constructor() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      this.data = raw ? { ...DEFAULT, ...JSON.parse(raw), upgrades: { ...DEFAULT.upgrades, ...JSON.parse(raw).upgrades } } : { ...DEFAULT, upgrades: { ...DEFAULT.upgrades } }
    } catch {
      this.data = { ...DEFAULT, upgrades: { ...DEFAULT.upgrades } }
    }
  }

  static getInstance(): ProgressManager {
    if (!ProgressManager._instance) ProgressManager._instance = new ProgressManager()
    return ProgressManager._instance
  }

  private save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)) } catch { /* */ }
  }

  getCurrentPhase(): number { return this.data.currentPhase }
  getTotalStars(): number { return this.data.totalStars }
  getUpgrades(): Readonly<UpgradeTree> { return this.data.upgrades }

  addStars(n: number) { this.data.totalStars += n; this.save() }

  advancePhase() {
    this.data.currentPhase++
    this.save()
  }

  resetPhase() {
    this.data.currentPhase = 1
    this.save()
  }

  canUpgrade(key: keyof UpgradeTree): boolean {
    const level = this.data.upgrades[key]
    return level < UPGRADE_MAX_LEVEL && this.data.totalStars >= UPGRADE_COST_PER_LEVEL
  }

  purchaseUpgrade(key: keyof UpgradeTree): boolean {
    if (!this.canUpgrade(key)) return false
    this.data.totalStars -= UPGRADE_COST_PER_LEVEL
    this.data.upgrades[key]++
    this.save()
    return true
  }

  getUpgradeCost(_key: keyof UpgradeTree): number { return UPGRADE_COST_PER_LEVEL }
  getUpgradeMaxLevel(): number { return UPGRADE_MAX_LEVEL }

  getDamageMultiplier(type: TowerType): number {
    if (type === 'archer') return 1 + this.data.upgrades.archer_damage * 0.15
    if (type === 'mage')   return 1 + this.data.upgrades.mage_damage * 0.15
    return 1
  }

  getAoeMultiplier(): number {
    return 1 + this.data.upgrades.mortar_aoe * 0.20
  }

  getExtraLives(): number { return this.data.upgrades.extra_life }
}
