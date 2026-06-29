# Tower Defense

Tower Defense 2D construído com **Phaser 3**, **TypeScript** e **Vite**.

---

## Como rodar

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000` no navegador.

---

## Por que Phaser 3?

| Critério | Motivo da escolha |
|---|---|
| **Loop de jogo nativo** | `preUpdate` / `update` por GameObject elimina lógica de tick manual |
| **Scene Manager** | Transições entre Menu → Jogo → Pause → Game Over sem frameworks externos |
| **Asset pipeline** | `this.load.image/spritesheet` com fila automática e callback `create` |
| **Sistema de animações** | `AnimationManager` + `Sprite.play()` cobrem todos os estados dos inimigos |
| **Entrada unificada** | `this.input` cobre mouse, touch e teclado com o mesmo código |
| **Renderização Canvas/WebGL** | Escolha automática por `Phaser.AUTO`; funciona em qualquer navegador moderno |
| **TypeScript nativo** | `@types` oficiais; toda a API fortemente tipada |
| **Sem dependências extras** | Sistema de física, câmera, display e eventos são built-in |

> Alternativas descartadas: **PixiJS** (sem Scene Manager / loop integrado), **Babylon.js** (3D, overhead desnecessário), **Vanilla Canvas** (boilerplate excessivo para um TD com animações e cenas múltiplas).

---

## Arquitetura Geral

```
src/
├── config/       enemies.json, towers.json        ← dados externos (data-driven)
├── constants/    game.ts                           ← constantes numéricas centralizadas
├── data/         codexData.ts                      ← conteúdo do Codex in-game
├── entities/     Tower.ts, Enemy.ts, Projectile.ts ← GameObjects com preUpdate
├── events/       EventBus.ts                       ← barramento global de eventos
├── factories/    TowerFactory.ts, EnemyFactory.ts  ← criação desacoplada
├── managers/     GameManager, EconomyManager,      ← estado global via Singleton
│                 WaveManager, ProgressManager
├── patterns/     TargetingStrategy.ts              ← Strategy pattern
├── scenes/       BaseScene, Menu, Game, Pause,     ← cenas Phaser
│                 GameOver, Upgrade
├── services/     SupabaseService.ts                ← leaderboard remoto
└── main.ts       ← configuração do Phaser.Game
```

### Decisões arquiteturais

| Decisão | Justificativa |
|---|---|
| **Data-driven config** (JSON) | Balancear torres/inimigos sem tocar no código |
| **EventBus global** | Desacopla entidades; Tower não conhece GameManager |
| **Singletons com `reset()`** | Estado limpo a cada partida sem recarregar a página |
| **BaseScene abstrata** | Codex e botões reutilizados em cenas diferentes sem duplicação |
| **Estratégia trocável em runtime** | Jogador muda alvo da torre sem destruir/recriar o objeto |

---

## Padrões de Projeto

### Observer — EventBus

Comunicação entre módulos via eventos nomeados. Nenhuma entidade importa outra diretamente para reportar estado.

```
Events.ENEMY_DIED        → EconomyManager adiciona ouro, GameManager adiciona score
Events.ENEMY_REACHED_END → GameManager desconta vida
Events.GOLD_CHANGED      → HUD atualiza exibição
Events.HORDE_COMPLETE    → bônus de ouro, score, botão da próxima horda
Events.PHASE_COMPLETE    → cálculo de estrelas, overlay de conclusão
Events.GAME_OVER         → transição para GameOverScene
Events.SHAMAN_CURSE      → todas as torres no raio ficam perturbadas
```

### Strategy — TargetingStrategy

`Tower` recebe uma `ITargetingStrategy` e pode trocá-la em tempo real sem reconstrução.

| Classe | Comportamento |
|---|---|
| `NearestTargeting` | Inimigo com menor distância euclidiana da torre |
| `StrongestTargeting` | Inimigo com maior HP atual |
| `FirstTargeting` | Inimigo com maior `waypointIndex` (mais avançado no caminho) |

### Factory — TowerFactory / EnemyFactory

Centralizam a criação de objetos, lendo configurações dos JSONs e instanciando com estratégia padrão (`NearestTargeting`).

### Singleton — GameManager / EconomyManager / ProgressManager / EventBus

Acesso via `getInstance()`; `reset()` zera o estado entre partidas sem vazar referências.

| Singleton | Responsabilidade |
|---|---|
| `GameManager` | Vidas, estado (playing/gameover), score, cálculo de estrelas |
| `EconomyManager` | Ouro atual, `spend()`, `add()`, `canAfford()` |
| `ProgressManager` | Fase atual, estrelas acumuladas, upgrades permanentes (localStorage) |
| `EventBus` | Barramento de eventos (extends `Phaser.Events.EventEmitter`) |

### Template Method — BaseScene

`BaseScene` (abstrata) fornece `makeBtn()` e `openCodexPanel()`. As cenas concretas herdam e customizam sem reimplementar o layout do Codex.

---

## Cenas

| Cena | Conteúdo |
|---|---|
| **MenuScene** | Tela inicial, botão Jogar, seletor de fase, atalho para Upgrades, Leaderboard, Codex |
| **GameScene** | Loop principal: mapa, slots, HUD (ouro/vidas/horda/fase), popups de construção e upgrade |
| **PauseScene** | Overlay de pausa; o `GameScene` fica congelado via `scene.pause()` |
| **GameOverScene** | Score final, input de nome, salvamento no Supabase, botão Retry e Menu |
| **UpgradeScene** | Loja de melhorias permanentes com ouro de estrelas |

---

## Fases e Mapas

| Fase | Mapa | Slots de torre | Hordas normais | Boss |
|---|---|---|---|---|
| 1 | `fase1pixel.png` | 4 | 5 | Não |
| 2 | `fase2pixel.png` | 4 | 5 | Não |
| 3 | `fase3pixel.png` | 4 | 5 | Não |
| 4 | `fase4pixel.png` | 4 | 5 + 1 horda boss | Sim |

- Cada fase tem **4 slots** fixos posicionados manualmente fora do caminho do inimigo.
- O ouro inicial escala por fase: `100 + fase × 50`

| Fase | Ouro inicial |
|---|---|
| 1 | 150 |
| 2 | 200 |
| 3 | 250 |
| 4 | 300 |

---

## Inimigos

### Stats base (sem escalonamento de horda)

| Inimigo | HP | Velocidade (px/s) | Resist. Física | Resist. Mágica | Recompensa |
|---|---|---|---|---|---|
| **Goblin** | 80 | 130 | 0% | 0% | 8 💰 |
| **Troll** | 210 | 55 | 25% | 0% | 30 💰 |
| **Xamã** | 160 | 80 | 0% | 65% | 20 💰 |
| **Super Orc (Boss)** | 1800 | 30 | 30% | 30% | 150 💰 |

### Habilidade especial — Xamã

Emite uma **maldição em área** a cada **3,5 s**: todas as torres dentro de **130 px** ficam **perturbadas por 2 s** (incapazes de atirar). A maldição é representada por um pulso visual laranja.

### Escalonamento de HP por horda

Cada horda dentro de uma fase aplica um multiplicador cumulativo de **+8%**:

| Horda | Multiplicador de HP |
|---|---|
| 1 | 1.00× (base) |
| 2 | 1.08× |
| 3 | 1.17× |
| 4 | 1.26× |
| 5 | 1.36× |

### Composição das hordas

Regras de aparição:
- **Goblin** — todas as hordas, todas as fases
- **Troll** — horda ≥ 2 **ou** fase ≥ 2
- **Xamã** — horda ≥ 4 **ou** fase ≥ 3
- **Boss** — exclusivo da horda extra da Fase 4 (aparece sozinho)

**Fórmulas de contagem (horda `h`, fase `p`):**

```
Goblins  = 6 + (p-1)×3 + h×2
Trolls   = max(1, ⌊(p-1)×1.5 + h×0.8⌋)
Xamãs    = max(1, ⌊(p-1)×0.8 + (h-3)×0.7⌋)
```

**Exemplo — Fase 1:**

| Horda | Goblins | Trolls | Xamãs | Intervalo entre spawns |
|---|---|---|---|---|
| 1 | 8 | — | — | 1100 ms |
| 2 | 10 | 1 | — | 1060 ms |
| 3 | 12 | 2 | — | 1020 ms |
| 4 | 14 | 3 | 1 | 980 ms |
| 5 | 16 | 4 | 1 | 940 ms |

**Exemplo — Fase 4:**

| Horda | Goblins | Trolls | Xamãs | Intervalo entre spawns |
|---|---|---|---|---|
| 1 | 17 | 5 | 1 | 920 ms |
| 2 | 19 | 6 | 1 | 880 ms |
| 3 | 21 | 6 | 2 | 840 ms |
| 4 | 23 | 7 | 3 | 800 ms |
| 5 | 25 | 8 | 3 | 760 ms |
| 6 | — | — | — Boss (1) — | 1000 ms |

> Fórmula do intervalo: `max(450, 1200 − fase×60 − horda×40)` ms

---

## Torres

### Estatísticas por nível

#### Arqueiro (dano físico)

| Nível | Custo | Custo upgrade | Dano | Alcance | Cadência | Especial |
|---|---|---|---|---|---|---|
| I | 50 💰 | 60 💰 | 15 | 130 px | 1,0 s | — |
| II | — | 100 💰 | 28 | 155 px | 0,8 s | — |
| III | — | — | 35 | 170 px | 0,7 s | ✨ Tiro triplo (até 3 alvos) |

#### Mago (dano mágico)

| Nível | Custo | Custo upgrade | Dano | Alcance | Cadência | Especial |
|---|---|---|---|---|---|---|
| I | 75 💰 | 80 💰 | 20 | 110 px | 1,4 s | — |
| II | — | 120 💰 | 38 | 135 px | 1,1 s | — |
| III | — | — | 55 | 155 px | 0,9 s | ✨ Lentidão 2 s nas vítimas |

#### Morteiro (dano físico, AoE)

| Nível | Custo | Custo upgrade | Dano | Alcance | Cadência | Especial |
|---|---|---|---|---|---|---|
| I | 100 💰 | 100 💰 | 30 | 160 px | 2,2 s | AoE |
| II | — | 150 💰 | 55 | 180 px | 1,8 s | AoE |
| III | — | — | 80 | 200 px | 1,4 s | ✨ AoE grande (raio 65 px) |

> **Dano efetivo** = `dano_base × (1 − resistência%) × multiplicador_modo × multiplicador_upgrade`

### Modos de Disparo

Configurável por torre individualmente a qualquer momento (sem custo).

| Modo | Mult. de Dano | Mult. de Cadência | Resultado prático |
|---|---|---|---|
| ⚡ Potente | ×1.8 (+80%) | ×1.75 (mais lento) | Mais dano por tiro, menos tiros por segundo |
| ⚖ Normal | ×1.0 | ×1.0 | Padrão |
| 💨 Rápido | ×0.55 (−45%) | ×0.45 (mais rápido) | Muito mais tiros, dano reduzido |

### Estratégias de Mira

Trocável em runtime via popup da torre (sem custo).

| Estratégia | Lógica |
|---|---|
| Mais próximo (padrão) | Menor distância euclidiana até a torre |
| Mais forte | Maior HP atual |
| Primeiro | Maior `waypointIndex` (mais avançado no caminho) |

### Venda de torres

- Valor de venda = **50% do ouro total investido** (custo base + upgrades comprados)

---

## Sistema de Vidas e Game Over

| Situação | Efeito |
|---|---|
| Inimigo chega ao fim do caminho | −1 vida |
| Vidas chegam a 0 | Game Over → GameOverScene |
| Fase concluída com vidas restantes | Cálculo de estrelas |

**Vidas iniciais:** 5 + bônus do upgrade "Muralha Reforçada" (até +3 = máximo 8 vidas)

---

## Estrelas e Progressão

### Cálculo de estrelas ao completar uma fase

| Vidas restantes | Estrelas ganhas |
|---|---|
| 100% das vidas | ⭐⭐⭐ |
| ≥ 60% das vidas | ⭐⭐ |
| Qualquer outra | ⭐ |

As estrelas ficam salvas em **localStorage** e são usadas como moeda na loja de upgrades permanentes.

---

## Upgrades Permanentes (UpgradeScene)

Desbloqueáveis entre fases ou pelo menu. Custo: **1 estrela por nível**. Máximo: **nível 3** por upgrade.

| Upgrade | Ícone | Efeito por nível | Máximo acumulado |
|---|---|---|---|
| Flechas Reforçadas | 🏹 | +15% dano do Arqueiro | +45% |
| Foco Arcano | 🔮 | +15% dano do Mago | +45% |
| Carcaça de Ferro | 💣 | +20% raio de explosão do Morteiro | +60% |
| Muralha Reforçada | ❤️ | +1 vida por partida | +3 vidas |

> **Total de estrelas necessárias para maxar tudo:** 12 estrelas (4 upgrades × 3 níveis × 1 estrela)

---

## Pontuação (Score)

O score acumula durante a partida:

| Evento | Pontos |
|---|---|
| Inimigo morto | Igual à recompensa em ouro (ex: Goblin = 8 pts) |
| Horda concluída | Igual ao bônus de ouro da horda (25 + fase×8) |

O score final é exibido na GameOverScene e pode ser enviado ao **Leaderboard** (Supabase) com um nome de jogador.

---

## Leaderboard — Supabase

O Supabase é opcional. Sem ele, o jogo funciona normalmente e o botão de salvar score é silenciosamente ignorado.

### Setup

```sql
create table leaderboard (
  id bigint generated always as identity primary key,
  name text not null,
  score integer not null,
  created_at timestamptz default now()
);
alter table leaderboard enable row level security;
create policy "Allow inserts" on leaderboard for insert with check (true);
create policy "Allow reads"   on leaderboard for select  using  (true);
```

Crie um arquivo `.env` na raiz do projeto `jogo/`:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

---

## Codex In-Game

Disponível em qualquer cena (botão 📖 no canto inferior direito). Mostra duas abas:

| Aba | Conteúdo |
|---|---|
| ⚔ Inimigos | Imagem, nome, HP, velocidade, resistências, recompensa e dica estratégica de cada inimigo |
| 🏹 Torres | Imagem real da torre, nome, tipo de dano, alcance, custo base e poder do nível 3 |

---

## Stack Técnico

| Tecnologia | Versão | Papel |
|---|---|---|
| Phaser | ^3.80.1 | Engine de jogo (render, input, cenas, animações) |
| TypeScript | ^5.3.3 | Tipagem estática em toda a codebase |
| Vite | ^5.0.12 | Bundler + HMR para dev rápido |
| @supabase/supabase-js | ^2.39.3 | Client do leaderboard remoto |

---

## Diagrama de Fluxo de Cenas

```
MenuScene
  ├── [ Jogar ]          → GameScene (fase atual)
  ├── [ Escolher Fase ]  → GameScene (fase escolhida)
  ├── [ Melhorias ]      → UpgradeScene
  └── [ Leaderboard ]    → overlay na própria MenuScene

GameScene
  ├── [ ESC / ⏸ ]       → PauseScene (GameScene pausada)
  ├── [ Fase concluída ] → overlay inline
  │     ├── [ Melhorias ]   → UpgradeScene
  │     ├── [ Próxima Fase] → GameScene (fase+1)
  │     └── [ Menu ]        → MenuScene
  └── [ Vidas = 0 ]      → GameOverScene

GameOverScene
  ├── [ Tentar Novamente ] → GameScene (mesma fase)
  ├── [ Ver Melhorias ]    → UpgradeScene (se tiver estrelas)
  └── [ Menu Principal ]   → MenuScene

UpgradeScene
  ├── [ Iniciar Fase X ]   → GameScene
  └── [ Menu ]             → MenuScene
```
