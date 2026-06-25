# Tower Defense

Tower Defense 2D construído com **Phaser 3**, **TypeScript** e **Vite**.

## Como rodar

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000` no navegador.

## Como jogar

1. Clique em **JOGAR** no menu
2. Clique em um slot de torre (quadrado tracejado) para construir uma torre (50 gold inicial)
3. Clique em **Iniciar Wave** para começar a onda de inimigos
4. Clique em uma torre existente para:
   - Alterar estratégia de mira (Mais próximo / Mais forte / Primeiro)
   - Fazer upgrade (até nível 3)
5. Sobreviva às 3 waves sem perder todas as 5 vidas

## Arquitetura e Padrões

### Observer (EventBus)
`EventBus` é um Singleton que estende `Phaser.Events.EventEmitter`. Toda comunicação entre entidades ocorre por eventos (`enemy:died`, `enemy:reached_end`, etc.), eliminando acoplamento direto.

### Strategy (TargetingStrategy)
A `Tower` recebe no construtor uma implementação de `ITargetingStrategy`:
- **NearestTargeting** — ataca o inimigo mais próximo
- **StrongestTargeting** — ataca o inimigo com mais HP
- **FirstTargeting** — ataca o inimigo mais avançado no caminho

O jogador pode trocar a estratégia em tempo real no popup da torre.

### Factory (EnemyFactory / TowerFactory)
Centralizam a criação de objetos, lendo stats dos JSONs de config. Permitem mudar o processo de criação sem alterar os consumidores.

### Singleton (GameManager, EconomyManager)
Acesso via `getInstance()` garante estado global consistente sem variáveis globais soltas.

## Configuração Supabase (opcional)

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

## Estrutura de pastas

```
src/
  config/     enemies.json, towers.json
  entities/   Enemy, Tower, Projectile
  events/     EventBus
  factories/  EnemyFactory, TowerFactory
  managers/   GameManager, WaveManager, EconomyManager
  patterns/   ITargetingStrategy + 3 implementações
  scenes/     MenuScene, GameScene, GameOverScene
  services/   SupabaseService
  main.ts
```
