import { JOKERS, TAROT_CARDS, RANKS, SUITS, MAX_JOKERS, BOSS_EFFECTS } from './constants.js';

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function needsSelection(consumable) {
  return consumable && consumable.selectFromHand === true;
}

export function applyConsumable(state, consumableIndex, selectedCards) {
  const c = state.consumables[consumableIndex];
  if (!c) return { ok: false, reason: 'Nada para usar' };

  if (needsSelection(c)) {
    if (!selectedCards || selectedCards.length === 0) {
      return { ok: false, reason: 'Selecione cartas primeiro' };
    }
    if (selectedCards.length < (c.count || 1)) {
      return { ok: false, reason: `Selecione ${c.count} carta(s)` };
    }
  }

  const msg = performEffect(state, c, selectedCards);
  state.consumables.splice(consumableIndex, 1);
  state.consumableUsedThisRound = true;

  const tecelaJoker = state.jokers.find(j => j.effect.type === 'tarotHook');
  if (tecelaJoker && c.id && c.id.startsWith('t')) {
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
    state.deck.push({ rank, suit, steel: true });
  }

  return { ok: true, message: msg };
}

export function applyTarotDirectly(state, tarotCard, selectedCards) {
  if (!tarotCard) return { ok: false, reason: 'Nenhum tarô selecionado' };

  const msg = performEffect(state, tarotCard, selectedCards || []);
  return { ok: true, message: msg };
}

function performEffect(state, c, selectedCards) {
  switch (c.effect) {
    case 'money':
      state.money += c.value;
      return `+${c.value} de dinheiro`;
    case 'randomMoney': {
      const amt = c.min + Math.floor(Math.random() * (c.max - c.min + 1));
      state.money += amt;
      return `+${amt} de dinheiro (Roda da Fortuna)`;
    }
    case 'extraHand':
      state.extraHandsPerRound = Math.min(10, state.extraHandsPerRound + c.value);
      return '+1 mão por rodada permanentemente';
    case 'destroyAndMoney': {
      if (selectedCards && selectedCards.length > 0) {
        let destroyed = 0;
        const handIndices = [];
        for (const card of selectedCards) {
          const handIdx = state.hand.indexOf(card);
          if (handIdx !== -1) {
            handIndices.push(handIdx);
            destroyed++;
          }
        }
        handIndices.sort((a, b) => b - a);
        for (const idx of handIndices) state.hand.splice(idx, 1);
        if (c.value) state.money += c.value;
        return `Destruiu ${destroyed} carta(s)${c.value ? ` e +$${c.value}` : ''}`;
      }
      const destroyed2 = destroyRandomFromDeck(state, c.destroyCount || 2);
      if (c.value) state.money += c.value;
      return `Destruiu ${destroyed2} carta(s)${c.value ? ` e +$${c.value}` : ''}`;
    }
    case 'convertSuit': {
      const converted = convertRandomSuit(state, c.suit, c.count || 2);
      return `Converteu ${converted} carta(s) para ${c.suit}`;
    }
    case 'duplicateCard': {
      if (state.deck.length === 0) return 'Deck vazio';
      const card = pickRandom(state.deck);
      state.deck.push({ ...card });
      return `Duplicou ${card.rank}`;
    }
    case 'upgradeRank': {
      let upgraded = 0;
      for (let i = 0; i < (c.count || 2); i++) {
        if (state.deck.length === 0) break;
        const idx = Math.floor(Math.random() * state.deck.length);
        const card = state.deck[idx];
        const rIdx = RANKS.indexOf(card.rank);
        if (rIdx < RANKS.length - 1) {
          card.rank = RANKS[rIdx + 1];
          upgraded++;
        }
      }
      return `Aprimorou ${upgraded} carta(s)`;
    }
    case 'createStone': {
      const count = c.count || 2;
      for (let i = 0; i < count; i++) {
        state.deck.push({ rank: null, suit: null, stone: true });
      }
      return `Criou ${count} cartas de Pedra`;
    }
    case 'addGold': {
      if (!selectedCards) return 'Nenhuma carta selecionada';
      let added = 0;
      for (const card of selectedCards) {
        if (card && !card.gold) {
          card.gold = true;
          added++;
        }
      }
      return `Adicionou Ouro a ${added} carta(s)`;
    }
    case 'addMusical': {
      if (!selectedCards) return 'Nenhuma carta selecionada';
      let added = 0;
      for (const card of selectedCards) {
        if (card && !card.musical) {
          card.musical = true;
          added++;
        }
      }
      return `Adicionou Carta Musical a ${added} carta(s)`;
    }
    case 'convertHandSuit': {
      if (!selectedCards) return 'Nenhuma carta selecionada';
      let converted = 0;
      for (const card of selectedCards) {
        if (card && card.suit !== c.suit) {
          card.suit = c.suit;
          converted++;
        }
      }
      return `Converteu ${converted} carta(s) para ${c.suit}`;
    }
    case 'destroyFromHand': {
      if (!selectedCards) return 'Nenhuma carta selecionada';
      let destroyed = 0;
      const handIndices = [];
      for (const card of selectedCards) {
        const handIdx = state.hand.indexOf(card);
        if (handIdx !== -1) {
          handIndices.push(handIdx);
          destroyed++;
        }
      }
      handIndices.sort((a, b) => b - a);
      for (const idx of handIndices) state.hand.splice(idx, 1);
      return `Destruiu ${destroyed} carta(s)`;
    }
    case 'duplicateFromHand': {
      if (!selectedCards || selectedCards.length === 0) return 'Nenhuma carta selecionada';
      const card = selectedCards[0];
      if (!card) return 'Carta inválida';
      state.deck.push({ rank: card.rank, suit: card.suit, gold: card.gold, musical: card.musical, stone: card.stone, steel: card.steel });
      return `Duplicou ${card.rank} de ${card.suit} para o deck`;
    }
    case 'upgradeFromHand': {
      if (!selectedCards) return 'Nenhuma carta selecionada';
      let upgraded = 0;
      for (const card of selectedCards) {
        if (!card || card.stone) continue;
        const rIdx = RANKS.indexOf(card.rank);
        if (rIdx < RANKS.length - 1) {
          card.rank = RANKS[rIdx + 1];
          upgraded++;
        }
      }
      return `Aprimorou ${upgraded} carta(s) em +1 rank`;
    }
    default:
      return 'Efeito desconhecido';
  }
}

function destroyRandomFromDeck(state, count) {
  let destroyed = 0;
  for (let i = 0; i < count; i++) {
    if (state.deck.length === 0) break;
    const idx = Math.floor(Math.random() * state.deck.length);
    state.deck.splice(idx, 1);
    destroyed++;
  }
  return destroyed;
}

function convertRandomSuit(state, suit, count) {
  let converted = 0;
  for (let i = 0; i < count; i++) {
    const nonStone = state.deck.filter(c => !c.stone);
    if (nonStone.length === 0) break;
    const target = nonStone[Math.floor(Math.random() * nonStone.length)];
    target.suit = suit;
    converted++;
  }
  return converted;
}

export function pickBossEffect() {
  return pickRandom(BOSS_EFFECTS);
}
