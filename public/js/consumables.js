import { JOKERS, TAROT_CARDS, RANKS, SUITS, MAX_JOKERS, MAX_CONSUMABLES, BOSS_EFFECTS } from './constants.js';

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function applyConsumable(state, consumableIndex) {
  const c = state.consumables[consumableIndex];
  if (!c) return { ok: false, reason: 'Nada para usar' };
  const msg = performEffect(state, c);
  state.consumables.splice(consumableIndex, 1);
  return { ok: true, message: msg };
}

function performEffect(state, c) {
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
      state.extraHandsPerRound += c.value;
      return '+1 mão por rodada permanentemente';
    case 'destroyAndMoney': {
      const destroyed = destroyRandomFromDeck(state, c.destroyCount || 2);
      if (c.value) state.money += c.value;
      return `Destruiu ${destroyed} carta(s)${c.value ? ` e +$${c.value}` : ''}`;
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
    case 'familiar': {
      destroyRandomFromDeck(state, c.destroyCount || 2);
      if (state.jokers.length < MAX_JOKERS) {
        const rare = JOKERS.filter(j => j.rarity === 'rare');
        if (rare.length > 0) {
          state.jokers.push({ ...pickRandom(rare) });
          return 'Familiar: Curinga raro criado';
        }
      }
      return 'Familiar: sem espaço ou curingas raros';
    }
    case 'grim': {
      destroyRandomFromDeck(state, 1);
      for (let i = 0; i < 2; i++) {
        state.deck.push({ rank: 'A', suit: pickRandom(SUITS) });
      }
      return 'Grim: adicionou 2 Ases';
    }
    case 'incantation': {
      if (state.deck.length === 0) return 'Deck vazio';
      const idx = Math.floor(Math.random() * state.deck.length);
      const removed = state.deck.splice(idx, 1)[0];
      const numbers = RANKS.filter(r => !['J', 'Q', 'K', 'A'].includes(r));
      for (let i = 0; i < 3; i++) {
        state.deck.push({ rank: pickRandom(numbers), suit: removed.suit });
      }
      return 'Encantamento: +3 cartas do naipe';
    }
    case 'seance': {
      if (state.consumables.length >= MAX_CONSUMABLES) return 'Sem espaço para consumíveis';
      state.consumables.push({ ...pickRandom(TAROT_CARDS) });
      return 'Sessão: criou um Tarô';
    }
    case 'hex': {
      if (state.jokers.length >= MAX_JOKERS) return 'Sem espaço para Curingas';
      state.jokers.push({ ...pickRandom(JOKERS) });
      return 'Hex: criou um Curinga';
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
    if (state.deck.length === 0) break;
    const idx = Math.floor(Math.random() * state.deck.length);
    state.deck[idx].suit = suit;
    converted++;
  }
  return converted;
}

export function pickBossEffect() {
  return pickRandom(BOSS_EFFECTS);
}
