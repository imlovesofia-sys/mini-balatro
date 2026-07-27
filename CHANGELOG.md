# Changelog — Blefe (Balatro Clone)

## Sessão 26/07/2026

### Flush Five & Five of a Kind
- **Flush Five**: 5 cartas mesmo rank + mesmo naipe. Tier 11, 120 fichas × 12 mult (melhor mão)
- **Five of a Kind**: 5 cartas mesmo rank. Tier 10, 120 fichas × 10 mult (segunda melhor)
- Adicionados em `constants.js` (POKER_HANDS) e detectados em `poker.js` (evaluateFive)
- Early-exit atualizado em evaluateBestHand para Flush Five

### Cartas Fortuna — Imagens Individuais
- 11 PNGs copiados de `D:\fortuna\` para `public\img\fortuna\` com nomes corretos:
  - `o  mago.PNG` → `t1.png`
  - `a sarcedotiza.PNG` → `t2.png`
  - `a imperatriz.PNG` → `t3.png`
  - `o corvo.PNG` → `t4.png`
  - `oos amantes.PNG` → `t8.png`
  - `a tempestadde.PNG` → `t9.png`
  - `a roleeta.PNG` → `t10.png`
  - `o martelo.PNG` → `t11.png`
  - `boca de fumo.PNG` → `t16.png`
  - `o negao.PNG` → `t17.png`
  - `a ganacia.PNG` → `t18.png`
- Imagens antigas do sprite recortado removidas (t5, t7, t12, t13)

### Cartas Fortuna — Remoções
Removidas do TAROT_CARDS em `constants.js`:
- **t5** O Louco
- **t7** O Sol
- **t12** A Lua
- **t13** A Estrela

### Cartas Fortuna — Lista Final (14 cartas)
| ID | Nome | Efeito | Imagem |
|---|---|---|---|
| t1 | O Mago | +$3 | ✅ |
| t2 | A Sacerdotisa | +$5 | ✅ |
| t3 | A Imperatriz | +1 mão permanente | ✅ |
| t4 | O Corvo | Destrói 2 + $3 | ✅ |
| t6 | Lovely | Converte 2 → ♥ | ❌ |
| t8 | Os Amantes | Duplica 1 carta p/ deck | ✅ |
| t9 | A Tempestade | Destrói 3 cartas | ✅ |
| t10 | A Roleta | $3–$12 aleatório | ✅ |
| t11 | O Martelo | Rank +1 em 2 cartas | ✅ |
| t14 | A Força | Adiciona Ouro a 2 | ❌ |
| t15 | A Justiça | Adiciona Musical a 2 | ❌ |
| t16 | Boca de Fumo | Cria 2 Pedra no deck | ✅ |
| t17 | O Negão | Converte 2 → ♠ | ✅ |
| t18 | Ganância | Converte 2 → ♦ | ✅ |

### Bug Sintonia Corrigido
- **Problema**: ao jogar 5 K♠ musicais, sintonia só reativava a partir da 4ª carta
- **Causa**: `calculateSintonia()` filtrava por `scoringIdx` (apenas cartas do poker hand), excluindo cartas musicais fora do best hand
- **Solução**: removido filtro `scoringIdx.has(i)` — agora filtra apenas por `card.musical` e boss effect
- Arquivo: `scoring.js:233-235`

### Hierarquia de Mãos Atualizada
```
Flush Five (11) > Five of Kind (10) > Royal Flush (9) > Straight Flush (8) > Quadra (7) > Full House (6) > Flush (5) > Sequência (4) > Trinca (3) > Dois Pares (2) > Par (1) > Carta Alta (0)
```

### Pendente
- Criar imagens para t6 Lovely, t14 A Força, t15 A Justiça (usuário disse que arrumaria depois)
