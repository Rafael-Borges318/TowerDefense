export type CodexTab = 'enemies' | 'towers'

export const CODEX_LAYOUT = [
  { col: 0, row: 0 },
  { col: 1, row: 0 },
  { col: 0, row: 1 },
]

export const CODEX_ENEMIES = [
  { name: 'Goblin', dotColor: 0x22cc44, textColor: '#33ee77', lines: ['HP: 60  |  Vel: rápida', 'Sem resistências', 'Recompensa: 8💰', 'Estratégia: qualquer torre'] },
  { name: 'Troll',  dotColor: 0x9966cc, textColor: '#bb88ff', lines: ['HP: 160  |  Vel: lenta', 'Resist. física: 25%', 'Recompensa: 30💰', 'Estratégia: use o Mago'] },
  { name: 'Xamã',   dotColor: 0xcc8822, textColor: '#ffbb44', lines: ['HP: 120  |  Vel: média', 'Resist. mágica: 65%', 'Amaldiçoa torres próximas', 'Recompensa: 20💰'] },
]

export const CODEX_TOWERS = [
  { name: 'Arqueiro', sqColor: 0xD2691E, textColor: '#D2691E', lines: ['Dano: físico  |  Alcance: 130px', 'Dispara flechas numa unidade', 'Nv3: tiro triplo (3 alvos) ✨', 'Custo base: 80💰'] },
  { name: 'Mago',     sqColor: 0xAA55EE, textColor: '#cc88ff', lines: ['Dano: mágico  |  Alcance: 120px', 'Ignora resist. física', 'Nv3: lentidão nas vítimas ✨', 'Custo base: 110💰'] },
  { name: 'Morteiro', sqColor: 0x888888, textColor: '#aaaaaa', lines: ['Dano: físico AoE  |  Alcance: 150px', 'Atinge múltiplos inimigos', 'Nv3: explosão em grande área ✨', 'Custo base: 130💰'] },
]
