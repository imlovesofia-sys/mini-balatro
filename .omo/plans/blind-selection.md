# Blind Selection + Joker 3D + Drag Reorder

**Objetivo**: 3 features novas — tela de seleção de blind 1-de-3, efeitos 3D nos curingas, drag-to-reorder na área de curingas.

**Restrições Críticas**:
- NÃO MEXER em mecânicas de scoring, consumíveis, loja, pacotes
- NÃO FAZER DEPLOY
- Preservar todos os IDs e classes que ui.js/game.js/main.js usam
- Não remover funcionalidade existente

## O que Muda

### 1. Nova Tela de Blind Selection (1-de-3)

**index.html** — Adicionar nova seção `#screen-blind-select`:
```html
<section id="screen-blind-select" class="screen">
  <div class="blind-select-title">Escolha seu Blind</div>
  <div class="blind-select-cards">
    <div class="blind-card" data-blind="small">
      <div class="blind-card-icon blind-small"></div>
      <div class="blind-card-name">Blind Pequeno</div>
      <div class="blind-card-target">META: 300</div>
      <div class="blind-card-reward">$4</div>
    </div>
    <div class="blind-card" data-blind="big">
      <div class="blind-card-icon blind-big"></div>
      <div class="blind-card-name">Big Blind</div>
      <div class="blind-card-target">META: 450</div>
      <div class="blind-card-reward">$4</div>
    </div>
    <div class="blind-card" data-blind="boss">
      <div class="blind-card-icon blind-boss"></div>
      <div class="blind-card-name boss-name">THE OX</div>
      <div class="blind-card-effect">Only Spades Score</div>
      <div class="blind-card-target">META: 600</div>
      <div class="blind-card-reward">$5</div>
    </div>
  </div>
</section>
```

**Nota**: IDs como `#blind-name`, `#blind-target` no painel lateral do jogo permanecem — são usados por ui.js para exibir info durante a rodada. A nova tela é APENAS para a escolha inicial.

### 2. JS para Controlar a Tela (main.js)

**main.js** — Adicionar lógica de seleção de blind:
- Na transição para novo ante, mostrar `#screen-blind-select` em vez de ir direto para o jogo
- Ao clicar em uma `.blind-card`, chamar `Game.startBlind(blindType)` e ir para `#screen-game`
- Atualizar DOM com meta recompensa do blind escolhido

### 3. Visual Quente/Dourado (style.css)

**Paleta**:
```css
:root {
  --felt-dark: #0f3d2e;
  --felt-mid: #1a5c3a;
  --gold-bright: #d4a853;
  --gold-dim: #8b6914;
  --cream: #f5e6c8;
  --red-blind: #c0392b;
  --blue-blind: #2980b9;
  --boss-red: #e74c3c;
}
```

**Estilos principais**:
- Fundo da tela de seleção: **MANTER verde escuro atual** (`var(--felt-dark)` → `#0f3d2e`), sem mudar para marrom
- Cartas de blind: fundo `var(--cream)`, borda `var(--gold-bright)`, `border-radius: 12px`
- Ícones: símbolos simples (triângulo para pequeno, losango para grande, caveira para boss)
- Hover: `transform: translateY(-8px)`, `box-shadow: 0 8px 24px rgba(0,0,0,0.4)`
- Texto: fonte serifada, cor `var(--wood-dark)`, `text-shadow` dourado sutil

## Fluxo Atual vs Novo

### Atual
```
Menu → start → startBlind() direto → jogo
```

### Novo
```
Menu → start → screen-blind-select → jogador escolhe → startBlind() → jogo
```

## 4. Efeitos 3D nos Curingas (style.css)

**Objetivo**: Curingas com visual 3D (perspectiva, rotação, sombra dinâmica).

### CSS — Perspective no container
```css
#jokers-list {
  perspective: 800px;
}
```

### CSS — Joker 3D
```css
.joker {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  transform-style: preserve-3d;
}

.joker:hover {
  transform: rotateY(-8deg) rotateX(4deg) translateY(-6px) scale(1.05);
  box-shadow: 
    8px 8px 16px rgba(0,0,0,0.4),
    -2px -2px 8px rgba(255,255,255,0.1);
}

.joker:active {
  transform: rotateY(-2deg) rotateX(1deg) translateY(-2px) scale(1.02);
  box-shadow: 
    4px 4px 8px rgba(0,0,0,0.3),
    -1px -1px 4px rgba(255,255,255,0.05);
}

/* Brilho 3D na borda */
.joker::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    135deg,
    rgba(255,255,255,0.15) 0%,
    transparent 40%,
    transparent 60%,
    rgba(0,0,0,0.1) 100%
  );
  pointer-events: none;
}
```

### JS — Mouse tracking para rotação dinâmica (main.js ou ui.js)
```javascript
// Opcional: rotação segue o mouse para efeito 3D mais realista
jokerEl.addEventListener('mousemove', (e) => {
  const rect = jokerEl.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width - 0.5;
  const y = (e.clientY - rect.top) / rect.height - 0.5;
  jokerEl.style.transform = `rotateY(${x * 15}deg) rotateX(${-y * 15}deg) translateY(-4px) scale(1.05)`;
});
jokerEl.addEventListener('mouseleave', () => {
  jokerEl.style.transform = '';
});
```

**Aceitação**: Curingas com rotação 3D suave no hover; sombra dinâmica; brilho de borda.

---

## 5. Drag-to-Reorder Curingas (ui.js + main.js)

**Objetivo**: Permitir arrastar curingas para reordenar a ordem na `#jokers-list`.

### Implementação (ui.js — `renderJokers`)
- Adicionar `draggable="true"` em cada `.joker`
- Adicionar `data-index` em cada `.joker` para rastrear posição

### Implementação (main.js — event listeners)
- `dragstart`: salva `dataTransfer` com index de origem
- `dragover`: previne default, mostra indicador visual de drop
- `drop`: lê index de origem + destino, chama `Game.reorderJokers(from, to)`
- `dragend`: limpa estado

### JS — `Game.reorderJokers` (game.js)
```javascript
export function reorderJokers(state, fromIndex, toIndex) {
  const [moved] = state.jokers.splice(fromIndex, 1);
  state.jokers.splice(toIndex, 0, moved);
}
```

### CSS — Indicador de drop
```css
.joker.drag-over {
  border-left: 3px solid var(--gold-bright);
  margin-left: -3px;
}

.joker.dragging {
  opacity: 0.5;
}
```

### CSS — Ghost de arrasto
```css
.joker.dragging {
  opacity: 0.4;
  transform: scale(0.95);
}
```

**Aceitação**: Curingas podem ser arrastados para reordenar; ordem persiste na state; visual de drop claro.

---

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `public/index.html` | Adicionar `#screen-blind-select` com 3 cartas de blind |
| `public/css/style.css` | Estilos tela seleção + 3D curingas + drag indicators |
| `public/js/main.js` | Lógica tela seleção + drag handlers |
| `public/js/ui.js` | `renderJokers` com draggable + data-index |
| `public/js/game.js` | `reorderJokers()` |

## Arquivos NÃO Modificados

- `scoring.js`, `consumables.js`, `shop.js`, `poker.js`, `deck.js`, `state.js`, `audio.js`, `constants.js`

## QA (Agent-Executado)

### Blind Selection
1. Abrir jogo → clicar "Jogar" → tela de seleção aparece com 3 cartas
2. Hover nas cartas → lift + shadow
3. Clicar em uma carta → inicia o blind correspondente
4. Boss blind mostra nome e efeito especial

### Joker 3D
5. Hover em curinga → rotação 3D suave
6. Mouse se move sobre curinga → rotação segue cursor
7. Sombra dinâmica muda com posição do mouse
8. Brilho de borda visível

### Drag Reorder
9. Arrastar curinga → indicador visual aparece
10. Soltar em nova posição → curinga muda de lugar
11. Ordem persiste ao navegar (shop → jogo → shop)
12. Mobile → touch drag funciona (ou desabilitado com fallback)
