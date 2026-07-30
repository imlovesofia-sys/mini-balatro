# Redesign Visual Total — Blefe Roguelike

REGRAS CRÍTICAS:
- NÃO MEXER em nenhum arquivo .js, mecânicas, lógica, IDs de elementos, classLists aplicadas dinamicamente.
- Apenas `public/css/style.css` e `public/index.html` (apenas adicionar elementos decorativos/wrappers; NÃO remover IDs existentes nem classes referencedadas por ui.js).

## TODOs

- [ ] 1. Redesign base — tipografia, paleta global, fundos, botões globais (style.css topo + index.html google fonts). Manter classes/IDs DOM existentes.
- [ ] 2. Redesign menu/principal/tela como jogar/pódio/gameover
- [ ] 3. Redesign layout jogo — painéis, cartas, curingas, consumíveis, áreas
- [ ] 4. Redesign loja + telas de modais (pack modal, hands reference, deck reference)

## Final Verification Wave

- [ ] F1. Verificar IDs/classes referencedadas por ui.js intactos
- [ ] F2. Verificar responsividade mobile mantida
- [ ] F3. Verificar animações de proc/score/destroy ainda funcionam (classes não removidas)
- [ ] F4. Teste hands-on via browser (Playwright) — abrir jogo, jogar uma rodada simples, verificar visual
