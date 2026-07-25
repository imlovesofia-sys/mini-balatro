import { JOKERS, TAROT_CARDS, SPECTRAL_CARDS, BASE_REROLL_COST, MAX_JOKERS, MAX_CONSUMABLES } from './constants.js';

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPickJoker(available) {
  if (available.length === 0) return null;
  const weights = available.map(j => {
    if (j.rarity === 'common') return 5;
    if (j.rarity === 'uncommon') return 3;
    return 1;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < available.length; i++) {
    r -= weights[i];
    if (r <= 0) return available[i];
  }
  return available[available.length - 1];
}

export function generateShopItems(state) {
  const items = [];
  const availableJokers = JOKERS.filter(j => !state.jokers.find(x => x.id === j.id));
  for (let i = 0; i < 2; i++) {
    const joker = weightedPickJoker(availableJokers);
    if (!joker) break;
    const idx = availableJokers.findIndex(j => j.id === joker.id);
    availableJokers.splice(idx, 1);
    items.push({ kind: 'joker', data: joker, price: joker.cost, sold: false });
  }
  const allConsumables = [
    ...TAROT_CARDS.map(c => ({ kind: 'tarot', data: c, price: 3 })),
    ...SPECTRAL_CARDS.map(c => ({ kind: 'spectral', data: c, price: 4 }))
  ];
  for (let i = 0; i < 2; i++) {
    const c = pick(allConsumables);
    items.push({ kind: c.kind, data: c.data, price: c.price, sold: false });
  }
  return items;
}

export function rerollShop(state) {
  if (state.money < state.rerollCost) return false;
  state.money -= state.rerollCost;
  state.rerollCost += 1;

  const homeBroker = state.jokers.find(j => j.effect.type === 'onReroll');
  if (homeBroker) {
    const hasDouble = state.jokers.some(j => j.effect.type === 'probabilityDouble');
    const winChance = hasDouble ? 0.20 : 0.10;
    const loseChance = hasDouble ? 0.10 : 0.05;
    const roll = Math.random();
    if (roll < winChance) {
      state.money *= 2;
    } else if (roll < winChance + loseChance) {
      state.money = 0;
    }
  }

  state.shopItems = generateShopItems(state);
  return true;
}

export function buyItem(state, index) {
  const item = state.shopItems[index];
  if (!item || item.sold) return { ok: false, reason: 'Indisponível' };
  if (state.money < item.price) return { ok: false, reason: 'Dinheiro insuficiente' };
  if (item.kind === 'joker') {
    const maxJ = state.bossEffect && state.bossEffect.maxJokers ? state.bossEffect.maxJokers : MAX_JOKERS;
    if (state.jokers.length >= maxJ) return { ok: false, reason: 'Sem espaço para Curingas' };
    state.jokers.push(item.data);

    const rotaJoker = state.jokers.find(j => j.effect.type === 'shopPurchaseBonus');
    if (rotaJoker) {
      rotaJoker.bonusMult = (rotaJoker.bonusMult || 0) + rotaJoker.effect.value;
    }
  } else {
    const maxC = state.bossEffect && state.bossEffect.maxConsumables ? state.bossEffect.maxConsumables : MAX_CONSUMABLES;
    if (state.consumables.length >= maxC) return { ok: false, reason: 'Sem espaço para consumíveis' };
    state.consumables.push(item.data);
  }
  state.money -= item.price;
  state.shopPurchases++;
  item.sold = true;
  return { ok: true };
}
