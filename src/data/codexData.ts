export type CodexTab = 'enemies' | 'towers'

export interface EnemyEntry {
  name: string
  imageKey: string
  imageFrame?: number
  imageTint?: number
  textColor: string
  lines: string[]
}

export interface TowerEntry {
  name: string
  sqColor: number
  textColor: string
  lines: string[]
}

export const CODEX_ENEMIES: EnemyEntry[] = [
  {
    name: 'Goblin',
    imageKey: 'orc_walk', imageFrame: 0,
    textColor: '#33ee77',
    lines: ['HP: 80  |  Vel: rápida', 'Sem resistências', 'Recompensa: 8💰', 'Estratégia: qualquer torre'],
  },
  {
    name: 'Troll',
    imageKey: 'orc_walk', imageFrame: 0, imageTint: 0xddaaff,
    textColor: '#bb88ff',
    lines: ['HP: 210  |  Vel: lenta', 'Resist. física: 25%', 'Recompensa: 30💰', 'Estratégia: use o Mago'],
  },
  {
    name: 'Xamã',
    imageKey: 'orc_walk', imageFrame: 0, imageTint: 0xffcc88,
    textColor: '#ffbb44',
    lines: ['HP: 160  |  Vel: média', 'Resist. mágica: 65%', 'Amaldiçoa torres próximas', 'Recompensa: 20💰'],
  },
  {
    name: 'Super Orc (Boss)',
    imageKey: 'boss_walk_0',
    textColor: '#ff6666',
    lines: ['HP: 1200  |  Vel: muito lenta', 'Resist. 30% Fís. / 30% Mág.', 'Chefe final — Fase 4!', 'Recompensa: 150💰'],
  },
]

export const CODEX_TOWERS: TowerEntry[] = [
  {
    name: 'Arqueiro', sqColor: 0xD2691E, textColor: '#D2691E',
    lines: ['Dano: físico  |  Alcance: 130px', 'Dispara flechas numa unidade', 'Nv3: tiro triplo (3 alvos) ✨', 'Custo base: 80💰'],
  },
  {
    name: 'Mago', sqColor: 0xAA55EE, textColor: '#cc88ff',
    lines: ['Dano: mágico  |  Alcance: 120px', 'Ignora resist. física', 'Nv3: lentidão nas vítimas ✨', 'Custo base: 110💰'],
  },
  {
    name: 'Morteiro', sqColor: 0x888888, textColor: '#aaaaaa',
    lines: ['Dano: físico AoE  |  Alcance: 150px', 'Atinge múltiplos inimigos', 'Nv3: explosão em grande área ✨', 'Custo base: 130💰'],
  },
]
