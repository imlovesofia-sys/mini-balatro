# Redesign Visual Cyber-Casino — Blefe Roguelike

**Objetivo**: Transformar a UI em estética cyber-casino mística com filtro CRT, sem perder a essência original do jogo.

**Restrições Críticas**:
- NÃO MEXER em nenhum arquivo `.js` — zero alterações em lógica, mecânicas, IDs, classLists
- NÃO FAZER DEPLOY — plano apenas
- Alterar APENAS `public/css/style.css` e `public/index.html` (apenas adicionar wrappers decorativos/elementos visuais; NUNCA remover IDs ou classes que ui.js referencia)
- Preservar: `#screen-*`, `#hand-cards`, `#jokers-list`, `#consumables-list`, `#shop-jokers`, `#shop-consumables`, `.card-wrapper`, `.joker`, `.consumable-btn`, `.pack-card-slot`, `#eval-box`, `#blind-box`, `#score-box`, `#deck-pile`, `.screen.active`, `.card.selected`, `.card.stone`, `.card.gold`, `.card.musical`

## Paleta Cyber-Casino (CSS Custom Properties)

```css
:root {
  --crt-magenta: #ff2d95;
  --crt-cyan: #22d3ee;
  --crt-amber: #fbbf24;
  --crt-emerald: #34d399;
  --crt-violet: #a78bfa;
  --crt-red: #ff4545;
  --neon-magenta-core: #ff69b4;
  --neon-cyan-core: #67e8f9;
  --neon-amber-core: #fde68a;
  --bg-deep: #0a0a1a;
  --bg-panel: rgba(15, 15, 35, 0.85);
  --felt-green: #1a5c3a;
}
```

## Fase 0: Filtro CRT Global (index.html + style.css)

**Objetivo**: Aplicar efeito monitor CRT sutil em toda a tela.

### index.html
- Adicionar SVG filter invisível no `<body>` para barrel distortion e chromatic aberration:
  ```html
  <svg style="display:none">
    <filter id="crt-barrel">
      <feTurbulence type="turbulence" baseFrequency="0.008" numOctaves="1" result="t"/>
      <feDisplacementMap in="SourceGraphic" in2="t" scale="4" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="crt-chromatic">
      <feOffset in="SourceGraphic" dx="1.5" dy="0" result="r"/>
      <feColorMatrix in="r" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red"/>
      <feOffset in="SourceGraphic" dx="-1.5" dy="0" result="b"/>
      <feColorMatrix in="b" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue"/>
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green"/>
      <feBlend in="red" in2="green" mode="screen" result="rg"/>
      <feBlend in="rg" in2="blue" mode="screen"/>
    </filter>
  </svg>
  ```
- Adicionar `<div id="crt-overlay"></div>` como primeiro filho de `#app` (para scanlines + vignette)

### style.css — CRT overlay
```css
#crt-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.08) 0px,
    rgba(0, 0, 0, 0.08) 1px,
    transparent 1px,
    transparent 3px
  );
}
#crt-overlay::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse, transparent 55%, rgba(0,0,0,0.45) 100%);
}
```

### style.css — Aplicar filtros no #app
```css
#app {
  filter: url(#crt-barrel) url(#crt-chromatic);
  animation: crt-flicker 8s infinite;
}
@keyframes crt-flicker {
  0%, 100% { opacity: 1; }
  3% { opacity: 0.97; }
  6% { opacity: 1; }
  48% { opacity: 0.98; }
  50% { opacity: 0.96; }
  52% { opacity: 1; }
  78% { opacity: 0.98; }
  80% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  #app { filter: none; animation: none; }
  #crt-overlay { display: none; }
}
```

**Aceitação**: Efeito CRT visível mas sútil; sem flicker que cause enjoo; respeita reduced-motion.

---

## Fase 1: Menu Principal + Telas Secundárias

**Objetivo**: Menu com estética cyber-casino, fundo com gradiente neon sutil.

### style.css — Menu
- `#screen-menu`: fundo `linear-gradient(135deg, var(--bg-deep) 0%, #1a0a2e 50%, #0a1a2e 100%)`
- `.title` (BLEFE): manter 6rem, adicionar `text-shadow` neon magenta:
  ```css
  text-shadow: 0 0 4px #fff, 0 0 12px var(--crt-magenta), 0 0 30px var(--crt-magenta), 0 0 60px rgba(255,45,149,0.4);
  ```
- `.subtitle`: cor `var(--crt-cyan)`, text-shadow cyan sutil
- `.menu-buttons button`: manter gradiente laranja, adicionar `box-shadow` neon no hover
- `#screen-howto`: fundo escuro com borda neon cyan sutil
- `#screen-podium`, `#screen-gameover`: mesmos fondos escuros, títulos com neon glow

### style.css — Botões globais
- Adicionar transição `box-shadow 0.3s` em todos os `button`
- Hover: `box-shadow: 0 0 12px var(--crt-cyan), 0 0 24px rgba(34,211,238,0.3)`

**Aceitação**: Menu com visual cyber-casino; botões com glow neon no hover; sem quebrar navegação.

---

## Fase 2: Tela de Jogo — Layout 3 Colunas

**Objetivo**: Painéis do jogo com estética cyber-casino, sem mudar grid nem estrutura.

### style.css — Painéis
- `#left-panel`, `#right-panel`: fundo `var(--bg-panel)` com `border: 1px solid rgba(34,211,238,0.15)` e `border-radius: 8px`
- `#center-panel`: fundo transparente (fica sobre a mesa verde)
- `#blind-box`, `#score-box`, `#eval-box`: borda neon cyan sutil, fundo escuro semi-transparente
- `.progress-fill`: gradiente de `var(--crt-emerald)` para `var(--crt-cyan)` (manter)

### style.css — Mesa verde
- `body` ou `#screen-game`: manter fundo verde escuro (`#0f3d2e`) como "mesa de cassino"
- Adicionar textura sutil com `radial-gradient` para simular feltro

### style.css — Cartas
- `.card`: manter dimensões 110x155px, adicionar `border-radius: 8px`
- `.card.selected`: manter outline dourado, adicionar `box-shadow: 0 0 16px rgba(251,191,36,0.6)`
- `.card.gold`: manter glow, intensificar com `box-shadow: 0 0 20px rgba(251,191,36,0.8)`
- `.card.musical`: manter pseudo-elements, adicionar `box-shadow: 0 0 12px rgba(167,139,250,0.5)`
- `.card.stone`: adicionar textura granito via `background-image` com noise sutil

### style.css — Curingas
- `.joker`: manter 150x220px, adicionar `border-radius: 10px`
- `.joker.rarity-uncommon`: borda `var(--crt-cyan)` com glow
- `.joker.rarity-rare`: borda `var(--crt-violet)` com glow pulsante
- `.joker.rarity-legendary`: manter `legendaryGlow`, intensificar com `box-shadow` amber
- `.joker-tooltip`: fundo `var(--bg-panel)`, borda neon cyan

### style.css — Consumíveis
- `.consumable-btn`: manter 90px, adicionar `border-radius: 8px`, borda neon amber sutil

### style.css — Área de ação
- `#btn-play-hand`: manter verde, adicionar glow neon emerald no hover
- `#btn-discard`: manter vermelho, adicionar glow neon red no hover
- `#action-buttons`, `#selection-buttons`: manter estilos existentes

**Aceitação**: Jogo visualmente mais rico com painéis cyber-casino; grid inalterado; todas as interações funcionam.

---

## Fase 3: Loja — Placa Neon + Itens

**Objetivo**: Loja com placa neon "LOJA" e itens com animações de borda.

### index.html
- Adicionar wrapper decorativo ao redor de `#shop-sign` (não substituir, apenas envolver):
  ```html
  <div id="shop-sign-wrapper">
    <div id="shop-sign">...</div>
  </div>
  ```

### style.css — Placa neon
- `#shop-sign-wrapper`: posicionamento relativo, centralizado
- `.sign-board`: manter gradiente, adicionar `text-shadow` neon para "LOJA":
  ```css
  text-shadow: 0 0 4px #fff, 0 0 10px var(--crt-magenta), 0 0 25px var(--crt-magenta);
  ```
- Adicionar pseudo-elemento `::before` com glow pulsante atrás do texto

### style.css — Itens da loja
- `.shop-item`: manter hover lift, adicionar `border: 1px solid rgba(34,211,238,0.2)` e `border-radius: 8px`
- `.shop-item:hover`: adicionar `box-shadow: 0 0 20px rgba(34,211,238,0.4)`
- `.price`: manter verde, adicionar text-shadow neon emerald

### style.css — Pacotes na loja
- `.pack-shop-card`: manter background-image, intensificar `shine` animation
- `.pack-tier-IV`: manter rainbow border, adicionar `box-shadow` amber pulsante

**Aceitação**: Loja com placa neon; itens com bordas cyber-casino; pacotes com brilho intenso.

---

## Fase 4: Pack Modal — Cartas Grandes + Partículas

**Objetivo**: Modal de pacote com cartas maiores e efeitos visuais intensos.

### style.css — Modal
- `.pack-modal-content`: aumentar padding, fundo `var(--bg-panel)` com borda amber
- `.pack-card-slot`: aumentar de 60x84px para 80x112px (ou proporcional)
- Título do pack: `text-shadow` neon amber intenso

### style.css — Animações existentes
- Manter: `packAppear`, `particleBurst`, `cardFlyIn`, `cardFlyOut`, `screenShake`, `tarotGlow`, `cardApplyFlash`, `packFlash`
- Intensificar `particleBurst`: mais partículas (20→30), cores neon
- Intensificar `tarotGlow`: glow mais forte e mais largo

### style.css — Partículas CSS
- `.pack-explosion-container .particle`: manter sistema existente
- Adicionar variação de cor: metade cyan, metade magenta

**Aceitação**: Pack modal com cartas maiores; partículas mais intensas; animações existentes preservadas.

---

## Fase 5: Blind Selection — Holographic Projectors

**Objetivo**: Blind selection com hologramas e símbolos (sem texto exceto boss).

### index.html
- Em `#blind-box`, adicionar wrappers holográficos ao redor dos elementos existentes:
  ```html
  <div id="blind-box">
    <div class="holo-projector" data-blind="small">
      <div class="holo-column"></div>
      <div class="holo-emitter"></div>
    </div>
    <div class="holo-projector" data-blind="big">
      <div class="holo-column"></div>
      <div class="holo-emitter"></div>
    </div>
    <div class="holo-projector" data-blind="boss">
      <div class="holo-column"></div>
      <div class="holo-emitter"></div>
    </div>
    <div id="blind-name"></div>
    <div id="blind-target"></div>
  </div>
  ```
- NÃO remover `#blind-name` nem `#blind-target` (ui.js os usa)

### style.css — Hologramas
- `.holo-projector`: posicionamento relativo, largura fixa
- `.holo-column`: coluna de luz vertical com gradiente linear, `filter: blur(4px)`, `mix-blend-mode: screen`, animação pulsante
- `.holo-emitter`: elipse radial na base, glow pulsante
- Cores por data-blind: small=cyan, big=amber, boss=crimson
- `#blind-name`: manter para boss, mas esconder para small/big via CSS (se possível) ou manter texto sutil

### style.css — Símbolos
- Adicionar pseudo-elementos ou SVG inline para símbolos (escudo, garra, caveira)
- Para boss: manter nome do boss com `text-shadow` neon crimson

**Aceitação**: Blind selection com hologramas pulsantes; boss tem nome; small/big não têm texto visível.

---

## Fase 6: Deck View — Stone Cards + Contadores

**Objetivo**: Deck view com cartas de pedra visíveis e contadores de duplicatas.

### index.html
- Em `#deck-reference` modal, adicionar contadores visuais para duplicatas (se não existirem)

### style.css — Deck reference
- `.deck-card.stone`: textura granito com `background-image` noise, borda `var(--crt-violet)`
- `.deck-card .duplicate-count`: badge grande com fundo neon, `font-size: 1.2rem`, `text-shadow` branco
- Coluna de pedra: destaque com borda violet e glow

### style.css — Contadores
- `.deck-count` (no jogo): manter estilo existente, adicionar `text-shadow` cyan
- Na deck reference: badges de contagem maiores e mais legíveis

**Aceitação**: Stone cards com textura visual; contadores de duplicatas claros e grandes.

---

## Fase 7: Ajustes Finais + Responsividade

### style.css — Responsividade
- Manter `@media (max-width: 768px)` existente
- CRT overlay: `display: none` em mobile (performance)
- Hologramas: simplificar em mobile (menos blur, menos partículas)
- Pack cards: manter tamanho menor em mobile

### style.css — Performance
- Todos os efeitos animados usam `transform` ou `opacity` (compositor-friendly)
- `will-change` aplicado apenas em elementos ativamente animados
- `@media (prefers-reduced-motion: reduce)` desativa: CRT flicker, hologramas, partículas, border animations — mantém apenas cores e glow estático

**Aceitação**: Mobile funciona sem lag; reduced-motion respeitado; 60fps em desktop.

---

## Matriz de Dependências

```
Fase 0 (CRT) ──┐
Fase 1 (Menu) ─┤──> Fase 7 (Final)
Fase 2 (Game) ─┤
Fase 3 (Shop) ─┤
Fase 4 (Pack) ─┤
Fase 5 (Blind) ┤
Fase 6 (Deck) ─┘
```
Fases 0-6 são independentes entre si. Fase 7 depende de todas.

## Arquivos Modificados

| Arquivo | Tipo de mudança |
|---------|----------------|
| `public/index.html` | Adicionar SVG filters, `#crt-overlay`, wrappers holográficos decorativos |
| `public/css/style.css` | Todas as mudanças visuais (CRT, neon, hologramas, partículas, responsividade) |

## Arquivos NÃO Modificados

Todos os `.js` — zero alterações. Todos os IDs e classes referencedadas por ui.js/game.js/main.js/shop.js permanecem intactos.

## QA (Agent-Executado)

1. **F1**: Abrir jogo no browser → verificar que CRT overlay visível (scanlines + vignette)
2. **F2**: Navegar por todas as telas (menu, como jogar, jogo, loja, game over, pódio) → nenhuma quebra
3. **F3**: Jogar uma rodada completa → selecionar cartas, jogar mão, verificar scoring animation funciona
4. **F4**: Abrir loja → verificar placa neon, hover glow nos itens
5. **F5**: Abrir pack → verificar cartas maiores, animações de partículas
6. **F6**: Clicar no deck → verificar stone cards com textura, contadores visíveis
7. **F7**: Testar em mobile (DevTools responsive) → layout não quebra
8. **F8**: Ativar `prefers-reduced-motion` → animações desabilitadas, visual estático
