# Tower Defense

Tower Defense 2D construido com **Phaser 3**, **TypeScript** e **Vite**.

## Como rodar

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000` no navegador.

## Como jogar

1. Clique em **JOGAR** no menu
2. Clique em um slot de torre (quadrado tracejado) para construir uma torre
3. Clique em **[ Iniciar Horda ]** para comecar a horda de inimigos
4. Clique em uma torre existente para:
   - Alterar estrategia de mira (Mais proximo / Mais forte / Primeiro)
   - Alterar modo de disparo (Pesado / Normal / Rapido)
   - Fazer upgrade (ate nivel 3, cada nivel desbloqueia poder especial)
   - Vender a torre por parte do valor investido
5. Sobreviva a todas as fases sem perder todas as vidas
6. Use o botao (canto inferior direito) para abrir o Codex de inimigos e torres

---

## Estrutura das Fases

O jogo possui **4 fases** progressivas, cada uma com mapa visual proprio e 5 hordas de inimigos:

| Fase | Mapa | Hordas | Boss |
|------|------|--------|------|
| 1 | fase1pixel.png | 5 | Nao |
| 2 | Mapa procedural | 5 | Nao |
| 3 | fase3pixel.png | 5 | Nao |
| 4 | fase4pixel.png | 5 + 1 Boss | Sim (Super Orc) |

### Boss Final - Super Orc

- Aparece **sozinho** como a **6a e ultima horda da Fase 4**
- HP: 1200 | Velocidade: muito lenta
- Resistencia fisica: 30% | Resistencia magica: 30%
- Recompensa: 150 ouro
- Usa sprites animados exclusivos (Troll_01_1_WALK/HURT/DIE/IDLE)

---

## Inimigos

| Tipo | HP | Velocidade | Resist. Fisica | Resist. Magica | Recompensa |
|------|----|------------|----------------|----------------|------------|
| Goblin | 80 | 130 | 0% | 0% | 8 ouro |
| Troll | 210 | 55 | 25% | 0% | 30 ouro |
| Xama | 160 | 80 | 0% | 65% | 20 ouro |
| Super Orc (Boss) | 1200 | 30 | 30% | 30% | 150 ouro |

> **Escalamento de HP**: cada horda dentro de uma fase aplica +5% cumulativo de HP nos inimigos.

### Regras de aparicao por horda:
- **Goblins**: presentes em todas as hordas
- **Trolls**: aparecem a partir da horda 2, ou em qualquer horda nas fases 2+
- **Xamas**: aparecem a partir da horda 4, ou em qualquer horda nas fases 3+
- **Boss**: exclusivo da ultima horda da Fase 4, aparece sozinho

### Habilidade especial - Xama
O Xama lanca uma **maldicao** a cada 3,5 segundos: todas as torres no raio de 130px ficam **perturbadas por 2 segundos** (incapazes de atirar).

---

## Torres

| Torre | Tipo de Dano | Alcance | Custo | Nivel 3 |
|-------|-------------|---------|-------|---------|
| Arqueiro | Fisico | 130 | 80 ouro | Tiro Triplo |
| Mago | Magico | 120 | 110 ouro | Lentidao nas vitimas |
| Morteiro | Fisico AoE | 150 | 130 ouro | Explosao em area |

### Modos de Disparo
- **Pesado (Heavy)**: dano alto, cadencia baixa
- **Normal**: equilibrio entre dano e velocidade
- **Rapido (Rapid)**: dano reduzido, altissima cadencia

### Estrategias de Mira
- **Mais proximo** - ataca o inimigo mais proximo da torre
- **Mais forte** - ataca o inimigo com maior HP atual
- **Primeiro** - ataca o inimigo mais avancado no caminho

---

## Arquitetura e Padroes de Projeto

### Observer (EventBus)
`EventBus` e um Singleton que estende `Phaser.Events.EventEmitter`. Toda comunicacao entre entidades ocorre por eventos (`ENEMY_DIED`, `ENEMY_REACHED_END`, `GOLD_CHANGED`, `GAME_OVER`, `HORDE_COMPLETE`, `PHASE_COMPLETE`, `SHAMAN_CURSE`).

### Strategy (TargetingStrategy)
A `Tower` recebe uma implementacao de `ITargetingStrategy` e pode troca-la em tempo real:
- **NearestTargeting** - ataca o inimigo mais proximo
- **StrongestTargeting** - ataca o inimigo com mais HP
- **FirstTargeting** - ataca o inimigo mais avancado no caminho

### Factory (EnemyFactory / TowerFactory)
Centralizam a criacao de objetos, lendo stats dos JSONs de config.

### Singleton (GameManager, EconomyManager, ProgressManager)
Acesso via `getInstance()` garante estado global consistente.

---

## Configuracao Supabase (opcional)

Para ativar o leaderboard, crie uma tabela no Supabase:

```sql
create table leaderboard (
  id bigint generated always as identity primary key,
  name text not null,
  score integer not null,
  created_at timestamptz default now()
);
alter table leaderboard enable row level security;
create policy "Allow inserts" on leaderboard for insert with check (true);
create policy "Allow reads" on leaderboard for select using (true);
```

E preencha o `.env`:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

---

## Estrutura de pastas

```
src/
  config/     enemies.json, towers.json
  entities/   Enemy, Tower, Projectile
  events/     EventBus
  factories/  EnemyFactory, TowerFactory
  managers/   GameManager, WaveManager, EconomyManager, ProgressManager
  patterns/   ITargetingStrategy + 3 implementacoes
  scenes/     MenuScene, GameScene, GameOverScene, PauseScene, UpgradeScene
  services/   SupabaseService
  main.ts
```

---

## Changelog - Alteracoes realizadas em 27/06/2026

### Mudanca principal: Boss Final movido da Fase 1 para a Fase 4

**Contexto:** O boss final (Super Orc / Troll) estava configurado para aparecer ao fim da Fase 1.
Por solicitacao, ele foi movido para aparecer exclusivamente ao fim da Fase 4, a ultima e mais dificil fase,
como inimigo solo (sem outros inimigos na mesma horda).

---

#### Arquivo modificado: src/managers/WaveManager.ts

Linha 49-56 - Condicao de geracao do boss:

ANTES:
  // Final boss at the end of Phase 1
  if (phase === 1) { ... }

DEPOIS:
  // Final boss at the end of Phase 4 (the last phase) - appears alone
  if (phase === 4) { ... }

Efeito pratico:
- Fase 1: passa a ter exatamente 5 hordas (antes eram 6, a ultima sendo o boss)
- Fase 4: passa a ter 6 hordas, sendo a 6a e ultima composta exclusivamente pelo boss

Nenhum outro parametro do boss foi alterado:
- HP: 1200 (inalterado)
- Velocidade: 30 (inalterada)
- Resistencia fisica: 30% (inalterada)
- Resistencia magica: 30% (inalterada)
- Recompensa: 150 ouro (inalterada)
- Escala visual: 0.18 (inalterada)
- Sprites e animacoes: identicos

---

#### Arquivo modificado: src/scenes/GameScene.ts

Linha 862 - Codex de inimigos (texto descritivo):

ANTES: 'O terrivel chefe da Fase 1!'
DEPOIS: 'O terrivel chefe final - Fase 4!'

O painel de informacoes do Codex agora exibe corretamente que o Super Orc e o boss da Fase 4.

---

### Validacao e testes realizados

1. Compilacao TypeScript (npx tsc --noEmit): SEM ERROS - projeto compila limpo apos as alteracoes
2. Servidor de desenvolvimento (npm run dev): iniciado com sucesso em http://localhost:3000
3. Revisao completa do codigo-fonte:
   - WaveManager.ts - logica de geracao e spawning de hordas
   - Enemy.ts - entidade de inimigo, stats, animacoes, sistema de dano
   - GameScene.ts - cenas, mapas, HUD, Codex, popups de torres
   - enemies.json - configuracao de stats de todos os inimigos
   - towers.json - configuracao de torres e upgrades
4. Verificacao de integridade: confirmado que o boss aparece sozinho (count: 1)
   na horda adicional da Fase 4, sem mistura com outros tipos de inimigo.

---

### Resumo do impacto por fase

| Fase | Hordas (antes) | Hordas (depois) | Boss? |
|------|----------------|-----------------|-------|
| 1 | 6 (5 + boss) | 5 | Nao |
| 2 | 5 | 5 | Nao |
| 3 | 5 | 5 | Nao |
| 4 | 5 | 6 (5 + boss) | Sim (Solo) |
