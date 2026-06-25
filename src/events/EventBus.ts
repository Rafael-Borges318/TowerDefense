import Phaser from 'phaser'

class EventBusClass extends Phaser.Events.EventEmitter {
  private static _instance: EventBusClass | null = null
  private constructor() { super() }
  static getInstance(): EventBusClass {
    if (!EventBusClass._instance) EventBusClass._instance = new EventBusClass()
    return EventBusClass._instance
  }
}

export const EventBus = EventBusClass.getInstance()

export const Events = {
  ENEMY_REACHED_END: 'enemy:reached_end',
  ENEMY_DIED:        'enemy:died',
  GAME_OVER:         'game:over',
  HORDE_COMPLETE:    'horde:complete',
  PHASE_COMPLETE:    'phase:complete',
  GOLD_CHANGED:      'economy:gold_changed',
  SHAMAN_CURSE:      'shaman:curse',
} as const
