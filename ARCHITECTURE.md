# Architecture

## Camadas

### `src/config/`
JSONs puros com todos os stats do jogo (`enemies.json`, `towers.json`). Nenhum número de balanceamento existe no TypeScript. Isso permite ajustar o jogo sem recompilar lógica.

### `src/events/`
**EventBus** — Singleton que estende `Phaser.Events.EventEmitter`. É o único canal de comunicação entre entidades. Exporta também o objeto `Events` com os nomes dos eventos como constantes tipadas, evitando strings mágicas espalhadas pelo código.

Exemplo de fluxo:
```
Enemy morre → EventBus.emit('enemy:died', { reward })
  → EconomyManager ouve → adiciona gold
  → GameManager.addScore() é chamado
  → HUD atualiza via 'economy:gold_changed'
```

### `src/entities/`
- **Enemy** — Se move entre waypoints, aplica armor na redução de dano, emite eventos ao morrer ou chegar ao fim. Não conhece Tower, GameManager nem EconomyManager.
- **Tower** — Busca inimigos via `scene.getEnemies()`, delega a escolha do alvo à estratégia injetada, cria Projectiles. Não conhece Enemy diretamente (usa a interface `EnemyLike`).
- **Projectile** — Persegue o alvo e chama `takeDamage()` via duck typing ao colisão. Se auto-destrói quando o alvo some.

Regra: nenhuma entidade importa outra entidade diretamente.

### `src/factories/`
- **EnemyFactory** — `create(type, waypoints, scene)` — lê o config do JSON e instancia Enemy.
- **TowerFactory** — `create(x, y, scene)` — instancia a estratégia padrão (NearestTargeting) e cria Tower no nível 1.

Justificativa: isola a lógica de construção dos consumidores. Se o processo mudar (ex: pooling de objetos), só a factory muda.

### `src/patterns/`
Interface `ITargetingStrategy` + três implementações:

| Classe | Critério |
|---|---|
| `NearestTargeting` | Menor distância euclidiana à torre |
| `StrongestTargeting` | Maior HP atual |
| `FirstTargeting` | Maior `waypointIndex` (mais avançado no caminho) |

A `Tower` aceita qualquer implementação via `setStrategy()` em runtime — padrão **Strategy** clássico. A estratégia nunca é instanciada dentro de Tower.

### `src/managers/`
Todos são Singletons com `getInstance()` e método estático `reset()` para limpar ao reiniciar a partida.

- **GameManager** — Vidas, estado (playing/gameover), score. Ouve `enemy:reached_end` e emite `game:over`.
- **EconomyManager** — Gold do jogador. Ouve `enemy:died` para creditar reward. Emite `economy:gold_changed` para o HUD.
- **WaveManager** — Não é Singleton (pertence à GameScene). Gerencia a fila de spawn com `Phaser.Time.TimerEvent`. Detecta fim de wave pelo contador de inimigos ativos.

### `src/scenes/`
- **MenuScene** — Tela inicial, botões Play e Leaderboard. Consulta Supabase de forma assíncrona e exibe overlay com ranking.
- **GameScene** — Orquestra tudo: desenha o caminho, cria slots, inicializa managers, mantém a lista de inimigos ativos para as torres consultarem via `getEnemies()`. Gerencia o popup de construção/upgrade/estratégia.
- **GameOverScene** — Recebe `{ score, won }` via `scene.start`. Exibe input DOM para nome, chama `SupabaseService.saveScore()`.

### `src/services/`
**SupabaseService** — Instância única criada no módulo. Se as env vars `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` não existirem, o client fica `null` e todos os métodos retornam sem erros. O jogo funciona completamente offline.

## Decisões de design

**Por que `EnemyLike` em vez de importar `Enemy` em `Tower`?**
Tower e Enemy são entidades que poderiam ser refatoradas independentemente. Usar a interface `EnemyLike` quebra a dependência circular potencial e respeita a regra de que entidades não se importam diretamente.

**Por que `scene.getEnemies()` em vez de passar a lista via construtor?**
A Tower precisa da lista atualizada a cada frame. Passar via construtor seria uma snapshot. O método na cena funciona como um repositório leve sem introduzir uma camada extra.

**Por que WaveManager não é Singleton?**
Ele pertence ao ciclo de vida da GameScene. Ao reiniciar a partida, uma nova instância com estado limpo é criada automaticamente com a cena.
