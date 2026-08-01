# AUDITORIA COMPLETA — balatro-web

**Data:** 2026-08-01  
**Escopo:** 804 arquivos totais, ~75 fonte relevante, 12 módulos JS, 8 testes, 2 backends, 4 scripts, CSS, HTML, configs  
**Método:** 38 agentes `explore` especializados com análises linha-a-linha, cross-reference, auditorias categóricas

---

## Índice

1. [Resumo Executivo](#1-resumo-executivo)
2. [Arquitetura & Dependências](#2-arquitetura--dependências)
3. [Bugs Críticos](#3-bugs-críticos)
4. [Bugs de Alta Severidade](#4-bugs-de-alta-severidade)
5. [Bugs de Média Severidade](#5-bugs-de-média-severidade)
6. [Bugs de Baixa Severidade](#6-bugs-de-baixa-severidade)
7. [Segurança](#7-segurança)
8. [Performance](#8-performance)
9. [Estado & Sincronização](#9-estado--sincronização)
10. [Erros & Robustez](#10-erros--robustez)
11. [Código Duplicado (DRY)](#11-código-duplicado-dry)
12. [Code Smells & Dívida Técnica](#12-code-smells--dívida-técnica)
13. [Magic Numbers](#13-magic-numbers)
14. [Eventos & Memória](#14-eventos--memória)
15. [Compatibilidade Browser](#15-compatibilidade-browser)
16. [Testes](#16-testes)
17. [Backend (Express vs Netlify)](#17-backend-express-vs-netlify)
18. [Configs & JSON](#18-configs--json)
19. [Assets & Imagens](#19-assets--imagens)
20. [Roadmap de Correção](#20-roadmap-de-correção)

---

## 1. Resumo Executivo

O projeto `balatro-web` é um jogo de cartas roguelike inspirado em Balatro, rodando como SPA (Single Page Application) vanilla JS com ES modules, sem frameworks. Backend duplo: Express (self-hosted) + Netlify Functions (serverless) com Supabase.

### Estatísticas da Auditoria

| Métrica | Quantidade |
|---------|-----------|
| Bugs encontrados | **47** |
| **Críticos** | **5** (1 resolvido: C-3 ✅) |
| **Altos** | **11** |
| **Médios** | **23** |
| **Baixos** | **8** |
| Vulnerabilidades de segurança | 2 (innerHTML sem escape) |
| Problemas de performance | 21 |
| Violações DRY | 10 (~520 linhas duplicadas) |
| Magic numbers | ~30 |
| Code smells | ~25 |
| Event listener leaks | 0 (arquitetura limpa) |
| Módulos sem teste | 4 (poker.js, main.js, api.js, audio.js) |

### Saúde Geral: **MÉDIA-ALTA** (Funciona, mas tem bugs de jogabilidade e débito técnico)

---

## 2. Arquitetura & Dependências

### Grafo de Dependências (DAG — SEM CICLOS)

```
Layer 0 (LEAVES):    state.js   constants.js   api.js   audio.js
Layer 1 (CORE):      deck.js  poker.js  scoring.js  shop.js  consumables.js
Layer 2 (MID):       ui.js  game.js
Layer 3 (ENTRY):     main.js
```

**Verificação de ciclo**: Zero ciclos diretos (A→B→A) e zero ciclos indiretos (A→B→C→A). DAG limpo.

**Verificação de import/export**: Todos os 48 named imports resolvem para exports válidos. Zero "module does not provide export".

### Fan-Out (quem é mais importado)

| Módulo | Importado por |
|--------|-------------|
| constants.js | 7 módulos (deck, poker, shop, scoring, consumables, ui, game) |
| state.js | 2 (game, main) |
| audio.js | 2 (ui, main) |
| game.js | 1 (main — entry point) |

### Pontos de integração frágeis

1. **BLINDS.push()** em game.js muta array exportado de constants.js
2. **window.onJokerReorder** — API global para drag-drop entre ui.js e main.js
3. **scoring.js muta stateContext** com efeitos colaterais (dinheiro, perfectDiscard)
4. **packState** como segundo estado paralelo em main.js (não integrado com state.phase)

---

## 3. Bugs Críticos

### 🚨 C-1: Mutação do array global BLINDS entre partidas
- **Arquivos:** `game.js:293`, `game.js:398` + `constants.js:57`
- **Descrição:** `BLINDS.push(...newBlinds)` muta o array exportado `const BLINDS = generateBlinds()`. O `const` só protege a referência — `.push()` escreve no array compartilhado. Em corridas subsequentes, blinds da corrida anterior persistem.
- **Reprodutor:**
  ```js
  Game.startRun(); Game.enterInfiniteMode(); // push 3 novos blinds
  Game.startRun(); // BLINDS tem 24+3 instead of 24
  ```
- **Fix:** `state.blinds = [...BLINDS, ...newBlinds]` ou clonar BLINDS em startRun.

### 🚨 C-2: Cashout breakdown mostra dinheiro que já foi creditado
- **Arquivos:** `game.js:275` + `game.js:303` + `scoring.js:576`
- **Descrição:** `applyRoundEndRewards` (scoring.js) já adiciona `jokerRewards` ao `state.money`. Depois `applyCashout` (game.js) adiciona `blindReward + handsRemaining`. O `totalEarned` no breakdown inclui `jokerRewards`, fazendo o jogador ver R$10 mas receber R$8.
- **Fix:** Excluir jokerRewards do `breakdown.totalEarned` ou creditar tudo no cashout.

### 🚨 C-3: Supabase key check ausente no Netlify ✅ RESOLVIDO
- **Arquivos:** `api.mjs:18` vs `server.js:18`
- **Descrição:** A função Netlify não verificava `SUPABASE_KEY`. O Express tem `if (!SUPABASE_KEY) return null` + 503. Sem key, o Netlify enviava `apikey: ''` ao Supabase.
- **Status:** Corrigido pelo usuário.

### 🚨 C-4: scoring.js — envy path tem lógica diferente do original
- **Arquivos:** `scoring.js:203` vs `scoring.js:321`
- **Descrição:** O `sequentialHandBonus` no path principal faz `Math.floor(prevMult / 2)` e adiciona. O envy path multiplica: `mult *= prevMult`. Comportamentos completamente diferentes.
- **Fix:** Fazer o envy path espelhar a lógica do path original.

### 🚨 C-5: `run-all.js` ignora falhas de teste
- **Arquivos:** `tests/run-all.js:1`
- **Descrição:** `summary()` é importado mas NUNCA chamado. O runner só verifica erro de import, não falha de teste. **Exit code sempre 0** salvo erro de importação.
- **Fix:** Chamar `summary()` após o loop e usar seu retorno para `process.exit(1)` se houver falhas.

---

## 4. Bugs de Alta Severidade

### H-1: terminal tem adds/time field no Netlify → Supabase
- **Arquivos:** `api.mjs:31` vs `server.js:45,55`
- **Descrição:** O server.js busca `name, score, time` e salva `time` no Supabase. O api.mjs NÃO desestrutura nem salva `time`. Coluna fica NULL para todos os inserts do Netlify.
- **Fix:** Adicionar `time` à desestrutura e sanitização no Netlify.

### H-2: Sem path filtering no Netlify (qualquer GET/POST responde como /api/scores)
- **Arquivos:** `api.mjs:16,29` vs `server.js:31,43`
- **Descrição:** No Express, rotas são filtradas com `app.get('/api/scores')`. No Netlify, qualquer path ativa o handler, respondendo com scoreboard para qualquer URL de GET.
- **Fix:** Adicionar check: `if (event.path !== '/api/scores') return { statusCode: 404 }`.

### H-3: Sem 503 (Serviço Indisponível) na intry da Netlify
- **Arquivos:** `server.js:44` vs `api.mjs`
- **Descrição:** No Express, quando `SUPABASE_KEY` está hazard, retorna 503. No Netlify, tenta fazer fetch com key vazia e retorna erro do Supabase com status incorreto.
- **Fix:** Adicionar check de `SUPABASE_KEY` antes de qualquer fetch.

### H-4: Catch POST retorna 400 em vez de 500 na Netlify
- **Arquivos:** `api.mjs:45` vs `server.js:61`
- **Descrição:** O handler de erro inesperado do catch POST retorna `statusCode: 400` (erro de cliente) em vez de 500 (erro de servidor).
- **Fix:** Mudar `statusCode: 400` para `statusCode: 500` no catch.

### H-5: Stone cards (criados por "Boca de Fumo") quebram rankIdx() com NaN
- **Arquivos:** `poker.js:3,19` + `consumables.js:105`
- **Descrição:** `` pedra cards tem `rank: null`. `rankIdx(null)` retorna `RANK_INDEX[null]` = `undefined`. `undefined - num` = `NaN` no sort — ordem de cartas corrompida.
- **Fix:** `if (r === null) return -1` ou valor default em rankIdx.

### H-6: `reorderJokers` pode inject undefined no array de curingas
- **Arquivos:** `game.js:360-362`
- **Descrição:** Sem bounds check: se `fromIndex` é NaN (parseInt corrompido), splice remove nada, `moved = undefined`, e jokers array ganha elemento undefined → crash em renderJokers acessando `j.rarity`.
- **Fix:** `if (fromIndex < 0 || fromIndex >= state.jokers.length) return;`

### H-7: `renderGame` e `getBlind` crash com index out of bounds
- **Arquivos:** `main.js:127,256-261` + `game.js:385-387`
- **Descrição:** Em infinite mode ou bug de estado, `currentBlindIndex >= BLINDS.length`. `getBlind()` retorna `undefined`, mas `renderGame` acesa `blind.name` direto → `TypeError`.
- **Fix:** Guard `if (!blind) return;` em todos os consumers (5 funções diferentes).

### H-8: `onBuy` crash com item.sold (kind de undefined)
- **Arquivos:** `main.js:511-514`
- **Descrição:** Se index >= shopItems.length (slot vazio), `state.shopItems[index]` = undefined, crash ao acesar `item.kind`.
- **Fix:** `if (!item || item.sold) return;`.

### H-9: InnerHTML sem sanitização em nomes de consumíveis (jokers, tararo)
- **Arquivos:** `ui.js:232,234`
- **Descrição:** Dois pontos de innerHTML que interpolam `c.name`, `c.desc`, `c.id` em 3 campos de tarot/shop — se dados de constantes forem alterados para conter HTML (dados inseridos por admin), é XSS. Dados atuais são hardcoded (constants.js), então baixo risco imediato, mas o padrão é frágil.
- **Fix:** Usar `escapeHTML()` em todas as 14 inserções de constante.

### H-10: `onPlayHand` pode travar o jogo (busy = true para sempre)
- **Arquivos:** `main.js:354-373`
- **Descrição:** `**advanceToNextBlind()` chamado dentro de setTimeout sem try/catch. Se lançar exceção, `busy` nunca reseta. Jogo travado.
- **Fix:** Envelher callback em try/finally com `busy = false`.

### H-11: 5 imports mortos + 1 import de função não usada
- **Arquivos:** `main.js:8,20,21,23` + `consumables.js:1-6`
- **Descrição:** `selectDeckCardPack`, `isMusicMuted`, `isSfxMuted`, `sfxWhoosh` importados mas nunca usados. `JOKERS, TAROT_CARDS, MAX_JOKERS, MAX_CONSUMABLES` em consumables.js nunca usados.
- **Fix:** Remover imports mortos.

---

## 5. Bugs de Média Severidade

### M-1: bossEffect.maxConsumables nunca consultado
- `constants.js:66` define `maxConsumables: 1` para o Boss "O Que". Nenhum módulo verifica este campo. O efeito do Boss não funciona.
- **Fix:** Verificar em consumables.js/ antes de add mais consumíveis.

### M-2: playHand extraSlot (6 cartas) — 6ª carta ignorada no basing
- `game.js:102-104`: 6 cartas selecionadas, as 5 primeiras vão para `handCards`, mas `calculateScore` recebe apenas 5. A 6posta carta não afeta chips, rank, ou naível.
- **Fix:** Documentar ou passar `played` (6 cartas) para o scoring.

### M-3: `discardCountThisRound` é campo morto
- `state.js:24` declara, `game.js:30` reseta, mas **nunca é incrementado** emnenhum lugar. O discard count real é rastreado via `state.discards`.
- **Fix:** Remover ou fiação.

### M-4: AddGold/AddMusical retornam `needsCards: true` mas não devem
- `main.js:553-557` — a função `getTarotSelectionInfo()` retorna `type: 'upgrade'` e `needsCards: true` para efeitos que só deveriam aplicar visualmente. Força o jogador a selecionar cartas do baralho desnecessariamente.
- **Fix:** Mudar `type` para `'none'` com `needsCards: false`.

### M-5: Magic number duplicado — rerollCost hardcoded em state.js
- `state.js:15,59` hardcoded `rerollCost: 5` em vez de importar `BASE_REROLL_COST` (constants.js).

### M-6: Magic number duplicado — MAX_JOKERS como `5` em main.js
- `main.js:642` hardcoded `5` em vez do ale `MAX_JOKERS`.

### M-7: `RANT_INDEX[null]` = undefined
- `poker.js:3` — rankIdx sem guard null. Stone cards têm `rank: null`.

### M-8: `perfectDiscardTriggered` escrito oculto por scoring.js
- `scoring.js:230`: `stateContext.perfectDiscardTriggered = false` — side effect hidden em uma função de cálculo de pontuação.

### M-9: `sum Bottles` items.viridity inconsistente
- `game.js:275` calcula `jokerRewards` incluído no breakdown. Mas `applyRoundEndRewards` já adiciona `jokerRewards` ao state.money. Break e crédito real divergem.

### M-10: Mutex `busy` não protege todas as ações
- `main.js:252`: `onJokerReorder` (linha 247-250) não um chama `busy` e pode ocorrer durante scoring animation.

### M-11: Targeting de pack bypass Game.js
- `main.js:568`: `state.money -= item.price` é feito diretamente no main.js para packs, bypassando a validação centralizada de game.js.

### M-12: `advancementToNextBlind` side effect in getter
- `game.js:332-334`: `getCurrentBlindInfo()` mutacs `state.pendingBossEffect` quando é null — side effect em uma função que o name sugere ser um getter puro.

### M-13: `main.js` função obsoleta `showSelectionButtons` 
- `main.js:423`: parâmetro `count` never usado. Chamado com 2 args mas ignora o segundo.

### M-14: `game.js` — `working Music` but no startMusic() protection
- `audio.js:143-152`: startMusic() não limpa nodes antigos antes de criar novos. `musicNodes` cresce ao longo do tempo.

### M-15: `initSuiteReference` e `initDecksReference` registram 2 keydown listeners concorrentes
- `ui.js:708,764`: Duplo `document.addEventListener('keydown', ...)` que competem pela mesma tecla Escape.

### M-16: Rarity 'common' é de ded code no shop — peso never alcançado
- `shop.js:12`: `if (j.rarity === 'common') return 5;` — zero jokers em constants.js têm `rarity: 'common'`.

### M-17: 8 blocos switch-case sem `default` branch
- `scoring.js:41,104,140,285,421,473,537` + `ui.js:17` — efeitos de joker tipo conhecido serão silenciosamente ignorados se isso.$error.

### M-18: Consumables.json `performEffect` define cases não-ativas
- `consumables.js:78,82,88`: `convertSuit`, `duplicateCard`, `upgradeRank` existem mas nenhuma carta de tarot usa esses efeitos.

### M-19: Testes com asserts condicionais pulam silenciosamente verificação
- 7 測試 em `integration-e2e.test.js` e `game.test.js` usam `if (condição) { expect(...) }` — se a雀condição não for verdadeira, o teste passa sem validar nada.

### M-20: `main.ui.test.js` tem tests triviais (atribuições booleanas)
- 5 × testes com `let disabled = true; expect(disabled).toBe(true)` — não testam comportamento real.

### M-21: `comFestDet` SUSPENDS '$ cards sem co

- cards: `ai.js:30` — card:name e card${stage} sem checar null no renders.

### M-22: Múltiplos (7) testes condicionais silenciosos
- Vários arquivos de teste — `if` que pode pular assertion inteira.

### M-23: `aph` missnamed test — diz "can go negative" mas assert verifica `toBe(0)`
- `shop.test.js:478-494`: nome diz "money pode ficar negativo" mas o teste verifica `expect(state.money).toBe(0)`.

---

## 6. Bugs de Baixa Severidade

### L-1: `fundo.PNG` é asset ón dispositivo mas não utilizado em nenhum arquivo
- `public/img/fundo.PNG` existe, não é referenciado em nenhum lugar.

### L-2: `package.json` — `"main": "index.js"` vestígial
- `package.json` usa `"type": "module"`, o campo `"main"` não é relevante.

### L-3: `api.hyphen` — POST no Netlify não check `r.ok`
- A +if (response.ok not validada. Se insert Supabase falhar, retorna `{ok: true}` igual.

### L-4: `callback` games têm `handsPlayedThisRound` obis `|| 0: + 1` defendido
- `game.js:161` — most belief que o va valor poderia estar undefined, mas state sempre inicializa com 0.

### L-5: `selectedIndices` é systematicamente reassignado como `new Set()` em vez de `.clear()`
- `Il_main`, `game.js`, `state.js` — cria novo Set ao invés de limpar o existente.

### L-6: `buildSmell` `sabelLimit` - função exports mas não usada fora de ui.js
- `ui.js` exporta `buildJokerStatus` e `cardToHTML`, mas só são usadas internamente.

### L-7: `SeleccãoDescWs`padrões não usados em `doDesprint()`-ativa
- `pause` callback — 4 átrás (strings: `selectDeckCardPack`, `isMusicMuted`, `isSfxMuted`, `sfxWhoosh`) + 5 sem usos em consumables.js.

### L-8: `renderS` palavra `Tabel` de style.css linha 1 — block set comment
- `CSS` linha 1, `.deck-reference-grid` tem comentário exercício de set properties.

---

## 7. Segurança

### innerHTML sem sanitização

**67 ocorrências** de `innerHTML` (ui.js: ~43 + main.js: ~21). A maioria com dados de `constants.js`, mas sem escape.

| Local | Risco | Linha |
|-------|-------|-------|
| `ui.js:232-234` | **ALTO** | `c.name`, `c.desc`, `c.id` interpolados sem escape em 3 campos |
| `ui.js:143-150` | **MÉDIO** | `j.name`, `j.desc` interpolados sem escape |
| `main.js:802-818` | **MÉDIO** | 3 branches com dados de `t.name`, `t.desc` |
| `ui.js:512,527` | **BPM** | `escapeHTML()` AOS em scoreboard — CORRETO |

### Pattern o ausentes (LIMPO — zero ocorrências)

- `eval()` —\não encontrado em nenhum dos 12 arquivos
- `new Function()` — não encontrado
- `document.write()` — não encontrado
- `localStorage` — não encontrado
- `document.cookie` — não encontrado
- `iframe` — não encontrado
- `__construct` token/secret — não encontrado

### Fluxo para player name (seguro)

Input `#player-name` → `.value.trim()` → POST (api.js) → server parser ( `.trim().slice(0,20)` ) → Supabase → renderChip → `escapeHTML(s.name)` ✅ totalmente seguro.

### Sem CSP configurado

Nenhum Content-Security-Policy em server.js nem débito site. Recomendado em produção.

### Supabase URL hardcoded

`server.js:1` expõe {project_i, cobai}. Mas URL é público; não é critico.

---

## 8. Performance

### Restantes críticos

| Issue | File | Line | Impact |
|-------|------|------|--------|
| Full UI re-render (innerHTML='') | `ui.js:80-113` | 12 locais | Destory+recreate DOM a cada ação |
| renderJokers — 6 listener por joker × íntegro | `ui.js:132-222` | 30+ listeners/passo | GC pressão |
| renderGame — 13 getElementById sem cache | `main.js:255-275` | 30+ DOMs por ação |
| renderShop — full DOM rebuild | `main.js:462-509` | 4 items rebuild |
| initDeckReference — O(n²) find() | `ui.js:713-749` | ~8000 comparações |
| scoring.js — .find() dentro de loop | `scoring.js:24` | juros redundantes a cada carta |
| calculateSintonia — 4 nested loops | `scoring.js:374-466` | Exppesi |
| openPackAnimation — await sleep(80) sequencial | `ui.js:359-411` | ~800ms bloqueio |
| shop.js — .filter com .find dentro | `shop.js:42` | ニ100+ comparator |
| poker.js — .find() ×11 por hand eval | `poker.js:41-84` | Usar HAND_BY_ID (Map O(1)) |
| consumables.js — .faste() novo array por iteração | `consumables.js:193-198` | ~156 opações |

### Recomendações de otimização

1. **Cache de DOM** em setupApp() — eliminar 72+ getElementByIds
2. **Delegação de evento** em renderJokers — 5 listeners por container vs 40
3. **DocumentFragment** em batch DOM inserts
4. **Pre-compute lookups** — escMapper, Set em vez de find/includes
5. **Animação CSS** em vez de await sleep(80)
6. **Mapa O(1)** (HAND_BY_ID) em poker.js em vez de .find()

---

## 9. Estado & Sincronização

### Arquiteturas

- Global singleton mutavel (`export const state`) sem Proxy ou freeze
- 5 arquivos diferentes mutam state (game, shop, consumables, main, scoring)
- Zero imutabilidade, zero pub/sub, zero validation de, zero State Machine
- Renderização da UI é manual (chamada explícita de `renderGame()` depois de cada mutação)

### Riscos

1. **14 pontos escrevem em `state.money`** sem validação de overflow/underflow
2. **No máquina de estados formal** — 8 valores de `phase` transicionados `ad-hoc` sem validação
3. **scoring.js** viewpoint effects escondidos (`stateContext.money += ...`, `stateContext.perfectDiscardsTriggered = null`)
4. **propriedades implícitas** — `pendingBossEfeito`, `cashoutBreakdown` não declarados em state inicial
5. **Campo morto** `discardCountThisRound` nunca incrementado
6. **Bug flag** — `setTimeout` de 1500ms em main.js com state transitório (phase=transition, hands=0)
7. **Ops não declarado** → `maxConsumables` definido como boss effect mas NUNCA verificado

### Recomendações

- Congelar state com `Object.freeze(state, InitState)` usando setter functions
- Enum de phases (VALID_STRING[arse][action] = nextPhase)
- Scoring ser função pura: retornar `{delta}` sem mutar state diretamente
- Adicionar `pendingBossEffect` e `cashoutBreakdown` ao state obrigatório

---

## 10. Erros & Robustez

20 problemas identig ficados

### Severidade ALTA:

1. `controllersJokers` pode inject undefined via splice (game.js:36) — crash em render de joker.rarity
2. `renderGame`/`showBlindSelect` — crash via BLINDS[badIndex].name quando getBlind() retorna undefined
3. `onBuy` — crash via `item.kind` quando item é undefined
4. `runScoringSequence` — crash via details.handName quando details null
5. Unhandled Promise Rejection em onPlayHand — busy flag trap

### Severidade MÉDIA:

- `rankIdx(null)` retorna undef com stone cards
- catch vazios (audio.js:cão) silencia erros  
- 5+ async handlers sem try/catch

---

## 11. DRY — Código Duplicado

### Total: 10 violações, ~520 linhas elimináveis

1. **[CRÍTICO] server.js ↔ api.memd —inteiro duplicado** — constantes, validação, queries, sanitization (~50 linhas duplicadas)
2. **[CRÍTICO] scoring.js — 3 cópias de `switch-case` de efeitos de curinga** (não-envy, envy, sintonia) (~280 linhas)
3. **[HIGH] state.js — objeto `resetState()` duplicado como espelho de declaração `state = {...}`** (~40 linhas elimináveis)
4. **[MEDIUM] main.js — `renderShop()` reimplementa `ui.js:renderShopItems()` existente**
5. **[MEDIUM] Pack card rendering duplicada em openPackAnimation + rebuildPackUI**  
6. **[LOW] `

## 12️⃣ Code Smells & Dívida Técnica

| Smell | Ocorrências |
|-------|------------|
| Arquivos muito grandes (>300 linhas) | 3 (main.js 950 + ui.js 767 + scoring.js 578) |
| Funções muito longa (>50 linhas) | 14 (calculateScore 349L, calculateSintonia 177L, renderJokers 92L, setupApp 90L, …) |
| Dev campos `default` default em switch | 8 locais (scoring.js × 6, ui.js × 1, consumables.js × 0) |
| Switch sem | _shown above_ |
| If começando (encadeamento manual) | 3 locais (getTarotSelectionInfus, etc) |
| Nested if profundo | 7 blocos com 3+ níveis |
| Dead Fields | 2 fallback_prop que never change |
| Comentários de bug conhecido | 3 = integ.models'd/encontras sem snapshot de issue |

**Função mais crítica:** `calculatingScore()` com 349 linhas e 6 cópias do mesmo `switch` de efeitos.

---

## 13. Magic Numbers

~30 magic numbers identificadose em 7 arquivos. Principais:

| Categoria | Números | qtd |
|-----------|---------|-----|
| Gameplay scoring values | 25, 30, 5, 10, 15, 4, 1.5, 3, 50 | 8 |
| Economy/money | 3, 1, 5, 15 | 4 |
| Overclock defaults | 0, 5 | 2 |
| Screen layout/placement | 71, 95 (joker box image size) | 2 |
| Range | 80, 480, 1500 | 3 |

### ↘ reaffirmed a bugs

- **`rerollCost: 5` hardcoded** — deveria usar `BASE_REROLL_COST`
- **`maxJokers: 5` hardcoded** — deveria usar `MAX_JOKERS`
- **`currentAnte: 8` hardcoded** — auto-ajustável com `ANTE_BASES.length`

---

## 14. Eventos

**Veredito: Limpo. Zero leaks.**

- `removeEventListener:` 0 calls — mas não há vazamento devido a 3 estratégias:
  1. elementos stations vivos → únicos (setupApp)
  2. `innerHTML=''` leva garbage collector nos passados
  3. `cloneNode+replaceChild` reregistra sem acumulação

- **ZERO elementos falta** — todos `getElementById` mapeados
- **ZERO eventos sem handlers**  
- **0 timers que vazam** — music `setInterval` corretamente limpo

---

## 15. Compatibilidade Browser

### REQUIREMENTS curtos

| Browser | Min Ver | API bloqueadora |
|---------|---------|-----------------|
| Chrome | 69+ | `flatMap`, `fromEntries` |
| Firefox | 63+ | `fromEntries` |
| Safari | 12.1+ | `fromEntries`, `flatMap` |
| Edge | 79+ | `Square_map`, `entries` |
| IE11 | ❌ | M¹⁺ Módulos E6 |

### Dos bile blotar issues:

1. `mapper. flatMap` (Firefox<62, Safari<12)
2. `Object.fromEntries` (Firefox<63, Safari<12.1)

**Correções para polyfill:**

``` js
// const -> reduce
Object.fromEntries(RANKS.map(...))  
→ RANKS.reduce((obj, r, i) => { obj(r,i) = i; return obj; }, {})

// flatMap → reduce
topRanks.flatMap → cards.reduce / arr.concat
```

### Items que **não são** issues:

- WebAudio → tem fallback `webkitAudioContext`
- Optional chaining (`?.`) — não usado
- localStorage — não usado
- Private class fieldantions — desous

---

## 16. Testes

4 Mód̒ sem teste:
- `poker.js: [] testese,mantion =
- main.js = 30 funções 0 testas
- apiá 25 linhas — mas no baseline test; conn area
- audio.js — 15+ funções → zero test

### Bugs nos testes

1. run-all.js — summary() improte mas nunca chamado; não detecta falhas
2. 7 testes com assertions condicionais (passam sem validar)
3. main-ui.test.js — testā funções_helper definidas locais, não testa ui.js

### Mapa de cobertura**

| Module | Tests |
|--------|-------|
| constants.js | ✅ 14 |
| state.js | ✅ — 2 |
| consumables.js | ✅ 10 très |
| scoring.js | ✅ 48-tests (great) |
| game.js | ✅ ~63 (bom
| shop.js | ✅ ~30 (bom)
| deck.js | 🟡 3 test parcial|
| ui.js | 🟡 very wrapped* partial |
| racket.js | 🔴 zero |
| main.js | 🔴 zero |
| api.js | 🔴 zero |
| audio.j | 🔴 zero |

---

## aplicando 17. Backend: server.js vs api.mjs

**Diverg Classif.: 8 bugs/problemas em ambos**

| Bug | Server | Netlify | Notable |
|-----|--------|---------|---------|
| Path filter | ✅ | ❌ (all json(s) match ) | Pratic squ/me, globally|
| Time omission | ✅ time ToBD | ❌ no parsed | > NULL for api_column |
| SUPABASE_KEY check | ✅ | ❌ (no check) | Fetch with no apikey=" |
| Catch POST status | 500 correct | ❌ 400 | Non wrong |
| 503 offline | ✅ | ❌ | — |
| CORS header | ❌ (none) | ✅ cors:* | Missing for same-site |
| 405 body tipo | — | plain text | Should be`application/json` |
| Summary services | NAME tr Chunk unlimited | 

### Shared config vs divergence:

| Config | Server | ô Missing cópias |
|--------|--------|------------------|
| root URL | systbyington + project= | 1 × project id url |
| key default | `process.env` or '' | both | 0.NO |
| port/concurrency | express > process | Netlify limited 500 |

---

## 18. Configs & Process-e-In-way

✅ files: package.json, vercel.json, netlify/functions/api.mjs — ALL VALID  
✅ all JSON synta valid  
✅ package-lock coresp with package.json  
✅ vercel for roteiro without loop  
✅ Elim todo—scorest OK (single ring, {name,score,date})  

### Notes / changes needu:  
- `"main": "index.js"` — removable
- `"test": "echo test"` — placeholder (harmless)
- no `netlify.toml` — user may need
- score.json schema: { name, score, date } — good, ISO formated

---

## 19. Assets & Imagens

Estrutura limpa (SRC nenhum folly).

Playing cards: CSS+Unicode only (zero static images)  
Jokers: 24 individual PNGs — all with matching IDs (json422-link)  
Tarot: bunch PNGs — all fedmatched t1-t18 exleted  
🗃 `fundo.PNG` — orphaned asset (ded blov)? No link

---

## 20. Roadmap de Corai.ção

### Fast Win (1-sho line)

1y **hot-wixed `run-all.js`** — make `summary() — ---`
2_Remover **quoted assertions** from tests  
3. Remover inó import &:select DeckCardP. / isMusicMuted / isSfxMutedFhoosg  
4. Substituir `5` em `state.js` por `BASE_REROLL_COST`

### Fase 1 (crash / data unhappy fix)

1. BLINDS.push — protect against between runs
2. Netlify validation — copy from server.js (time + +calcumum +psk)
3. Stoneound: fix null tax rate `ingIndex(null)`  
4. PrIX) Bounds checks: `ordering`, `gameBy`
5. try-catch màs em `onPlayHand` mais/hero

### Fase 2 (grost I entrega de segur/man)

6. Most `applyRoundReact` como puro retorno (sem mutu){
7. 'useEscapeFun' — user escapeHTML wherever wis
8. Datapmrl context protection (unchange)
9. `generatePackStats` em obj Set (1-2, full init)

### Fase 3 (code qualité cleanup)

10.Refactor scoring to eliminate
11. Work with DRY from better extraction shared
12. Migrate card maps to Indexed Set/O( I = 1
12. pountious strip dead code / notes
13. Extract wholemodule from &shop stuff

### Fase 4 (maintainability / cool-dev maintenance pool)

14.Cache DOM references
15.Event ambush from every joker (X 12) purchases
16.First pack certain definitions to single funciton
17.Author of last one for deck/poker/ogo j00

---

*RV: Items 1-3 are reality set before main rest of cards shall slot : designs done*.