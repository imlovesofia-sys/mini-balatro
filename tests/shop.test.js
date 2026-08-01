import { describe, it, expect } from './test-helper.js';
import { JOKERS, MAX_JOKERS, PACK_TIERS } from '../public/js/constants.js';
import { generateShopItems, buyItem, sellJoker, rerollShop, openPack } from '../public/js/shop.js';

function makeState(overrides = {}) {
  return {
    jokers: [],
    money: 20,
    shopItems: [],
    shopPurchases: 0,
    rerollCost: 5,
    ...overrides
  };
}

function makeJokerItem(joker) {
  return { kind: 'joker', data: joker, price: joker.cost, sold: false };
}

function makePackItem(tier) {
  return { kind: 'pack', tier, price: tier.price, sold: false };
}

describe('generateShopItems', () => {
  it('returns array of items', () => {
    const result = generateShopItems(makeState());
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns up to 4 items (2 jokers + 2 packs)', () => {
    const items = generateShopItems(makeState());
    expect(items.length).toBe(4);
    const jokers = items.filter(i => i.kind === 'joker');
    const packs = items.filter(i => i.kind === 'pack');
    expect(jokers.length).toBe(2);
    expect(packs.length).toBe(2);
  });

  it('filters out already-owned jokers', () => {
    const owned = { ...JOKERS[0] };
    const state = makeState({ jokers: [owned] });
    const items = generateShopItems(state);
    const jokerItems = items.filter(i => i.kind === 'joker');
    const ownedInShop = jokerItems.find(i => i.data.id === owned.id);
    expect(ownedInShop).toBeFalsy();
  });

  it('handles case when all jokers are owned', () => {
    const allJokers = JOKERS.map(j => ({ ...j }));
    const state = makeState({ jokers: allJokers });
    const items = generateShopItems(state);
    const jokers = items.filter(i => i.kind === 'joker');
    expect(jokers.length).toBe(0);
    expect(items.length).toBe(2);
  });

  it('each item has kind, price, sold properties', () => {
    const items = generateShopItems(makeState());
    items.forEach(item => {
      expect(typeof item.kind).toBe('string');
      expect(typeof item.price).toBe('number');
      expect(typeof item.sold).toBe('boolean');
    });
  });

  it('joker items have data property', () => {
    const items = generateShopItems(makeState());
    const jokerItems = items.filter(i => i.kind === 'joker');
    jokerItems.forEach(item => {
      expect(item.data).toBeTruthy();
      expect(typeof item.data.id).toBe('string');
    });
  });

  it('pack items have tier property', () => {
    const items = generateShopItems(makeState());
    const packItems = items.filter(i => i.kind === 'pack');
    packItems.forEach(item => {
      expect(item.tier).toBeTruthy();
      expect(typeof item.tier.id).toBe('string');
    });
  });

  it('sold defaults to false', () => {
    const items = generateShopItems(makeState());
    items.forEach(item => {
      expect(item.sold).toBe(false);
    });
  });
});

describe('buyItem', () => {
  it('returns ok:true on successful joker purchase', () => {
    const state = makeState({
      shopItems: [makeJokerItem(JOKERS[0])]
    });
    const result = buyItem(state, 0);
    expect(result.ok).toBe(true);
  });

  it('returns ok:true on successful pack purchase', () => {
    const state = makeState({
      shopItems: [makePackItem(PACK_TIERS[0])]
    });
    const result = buyItem(state, 0);
    expect(result.ok).toBe(true);
  });

  it('deducts price from money', () => {
    const joker = JOKERS[0];
    const state = makeState({
      money: 20,
      shopItems: [makeJokerItem(joker)]
    });
    buyItem(state, 0);
    expect(state.money).toBe(20 - joker.cost);
  });

  it('adds joker to state.jokers', () => {
    const joker = JOKERS[0];
    const state = makeState({
      shopItems: [makeJokerItem(joker)]
    });
    buyItem(state, 0);
    expect(state.jokers.length).toBe(1);
    expect(state.jokers[0].id).toBe(joker.id);
  });

  it('marks item as sold', () => {
    const state = makeState({
      shopItems: [makeJokerItem(JOKERS[0])]
    });
    buyItem(state, 0);
    expect(state.shopItems[0].sold).toBe(true);
  });

  it('returns error when index out of bounds', () => {
    const state = makeState();
    const result = buyItem(state, 5);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('Indispon\u00EDvel');
  });

  it('returns error when item already sold', () => {
    const state = makeState({
      shopItems: [{ kind: 'joker', data: JOKERS[0], price: JOKERS[0].cost, sold: true }]
    });
    const result = buyItem(state, 0);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('Indispon\u00EDvel');
  });

  it('returns error when money insufficient', () => {
    const state = makeState({
      money: 0,
      shopItems: [makeJokerItem(JOKERS[0])]
    });
    const result = buyItem(state, 0);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('Dinheiro insuficiente');
  });

  it('returns error when joker slots full (MAX_JOKERS)', () => {
    const jokers = Array.from({ length: MAX_JOKERS }, (_, i) => ({ id: `d${i}` }));
    const state = makeState({
      jokers,
      shopItems: [makeJokerItem(JOKERS[0])]
    });
    const result = buyItem(state, 0);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('Sem espa\u00E7o para Curingas');
  });

  it('returns error when boss reduces maxJokers to 3', () => {
    const jokers = Array.from({ length: 3 }, (_, i) => ({ id: `d${i}` }));
    const state = makeState({
      jokers,
      bossEffect: { maxJokers: 3 },
      shopItems: [makeJokerItem(JOKERS[0])]
    });
    const result = buyItem(state, 0);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('Sem espa\u00E7o para Curingas');
  });

  it('increments shopPurchases counter', () => {
    const state = makeState({
      shopItems: [makeJokerItem(JOKERS[0])]
    });
    expect(state.shopPurchases).toBe(0);
    buyItem(state, 0);
    expect(state.shopPurchases).toBe(1);
  });

  it('increments shopPurchaseBonus joker bonusMult', () => {
    const j25 = { ...JOKERS.find(j => j.id === 'j25') };
    const other = { ...JOKERS.find(j => j.id === 'j21') };
    const state = makeState({
      jokers: [j25],
      shopItems: [makeJokerItem(other)]
    });
    buyItem(state, 0);
    expect(j25.bonusMult).toBe(3);
  });
});

describe('sellJoker', () => {
  it('returns sell price (cost - 3, min 1)', () => {
    const joker = { id: 'test1', cost: 5, effect: { type: 'test' } };
    const state = makeState({ jokers: [joker] });
    const price = sellJoker(state, 0);
    expect(price).toBe(2);
  });

  it('adds sell price to money', () => {
    const joker = { id: 'test2', cost: 5, effect: { type: 'test' } };
    const state = makeState({ jokers: [joker], money: 10 });
    sellJoker(state, 0);
    expect(state.money).toBe(12);
  });

  it('removes joker from state.jokers', () => {
    const state = makeState({ jokers: [{ id: 'test3' }] });
    sellJoker(state, 0);
    expect(state.jokers.length).toBe(0);
  });

  it('returns false for invalid negative index', () => {
    const state = makeState({ jokers: [{ id: 'test4' }] });
    const result = sellJoker(state, -1);
    expect(result).toBe(false);
  });

  it('returns false for index >= jokers.length', () => {
    const state = makeState({ jokers: [{ id: 'test5' }] });
    const result = sellJoker(state, 5);
    expect(result).toBe(false);
  });

  it('cheapest joker sells for $1 minimum', () => {
    const cheapJoker = { id: 'cheap', cost: 2, effect: { type: 'test' } };
    const state = makeState({ jokers: [cheapJoker] });
    const price = sellJoker(state, 0);
    expect(price).toBe(1);
  });

  it('selling j41 (envy) shifts indices of remaining jokers', () => {
    const j21 = { ...JOKERS.find(j => j.id === 'j21') };
    const j41 = { ...JOKERS.find(j => j.id === 'j41') };
    const j25 = { ...JOKERS.find(j => j.id === 'j25') };
    const state = makeState({ jokers: [j21, j41, j25], money: 0 });
    sellJoker(state, 1);
    expect(state.jokers.length).toBe(2);
    expect(state.jokers[0].id).toBe('j21');
    expect(state.jokers[1].id).toBe('j25');
  });

  it('selling shopPurchaseBonus joker stops future triggers', () => {
    const j25 = { ...JOKERS.find(j => j.id === 'j25') };
    const newJoker = { ...JOKERS.find(j => j.id === 'j21') };
    const state = makeState({
      jokers: [j25],
      money: 50,
      shopItems: [makeJokerItem(newJoker)]
    });
    sellJoker(state, 0);
    expect(state.jokers.length).toBe(0);
    buyItem(state, 0);
    const hasBonusMult = state.jokers.some(j => typeof j.bonusMult === 'number');
    expect(hasBonusMult).toBe(false);
  });
});

describe('rerollShop', () => {
  it('returns true on successful reroll', () => {
    const state = makeState({ money: 20 });
    const result = rerollShop(state);
    expect(result).toBe(true);
  });

  it('returns false when money < rerollCost', () => {
    const state = makeState({ money: 3, rerollCost: 5 });
    const result = rerollShop(state);
    expect(result).toBe(false);
  });

  it('deducts rerollCost from money', () => {
    const state = makeState({ money: 20, rerollCost: 5 });
    rerollShop(state);
    expect(state.money).toBe(15);
  });

  it('increments rerollCost by 1', () => {
    const state = makeState({ money: 20, rerollCost: 5 });
    rerollShop(state);
    expect(state.rerollCost).toBe(6);
  });

  it('generates new shop items', () => {
    const state = makeState({ money: 20 });
    rerollShop(state);
    expect(state.shopItems.length).toBeGreaterThan(0);
  });

  it('onReroll joker 10% chance doubles money', () => {
    const j24 = { ...JOKERS.find(j => j.id === 'j24') };
    const state = makeState({ money: 20, jokers: [j24] });
    let callCount = 0;
    const origRandom = Math.random;
    Math.random = () => {
      callCount++;
      if (callCount === 1) return 0.05;
      return 0.5;
    };
    try {
      rerollShop(state);
      expect(state.money).toBe(30);
    } finally {
      Math.random = origRandom;
    }
  });

  it('onReroll joker 5% chance loses all money', () => {
    const j24 = { ...JOKERS.find(j => j.id === 'j24') };
    const state = makeState({ money: 20, jokers: [j24] });
    let callCount = 0;
    const origRandom = Math.random;
    Math.random = () => {
      callCount++;
      if (callCount === 1) return 0.12;
      return 0.5;
    };
    try {
      rerollShop(state);
      expect(state.money).toBe(0);
    } finally {
      Math.random = origRandom;
    }
  });

  it('probabilityDouble doubles onReroll chances', () => {
    const j24 = { ...JOKERS.find(j => j.id === 'j24') };
    const j34 = { ...JOKERS.find(j => j.id === 'j34') };
    const state = makeState({ money: 20, jokers: [j24, j34] });
    let callCount = 0;
    const origRandom = Math.random;
    Math.random = () => {
      callCount++;
      if (callCount === 1) return 0.15;
      return 0.5;
    };
    try {
      rerollShop(state);
      expect(state.money).toBe(30);
    } finally {
      Math.random = origRandom;
    }
  });
});

describe('openPack', () => {
  it('returns array of tarot cards', () => {
    const result = openPack(PACK_TIERS[0], makeState());
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('tier I returns up to 2 options', () => {
    const tier = PACK_TIERS.find(t => t.id === 'I');
    const result = openPack(tier, makeState());
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('tier III returns up to 4 options', () => {
    const tier = PACK_TIERS.find(t => t.id === 'III');
    const result = openPack(tier, makeState());
    expect(result.length).toBeLessThanOrEqual(4);
  });

  it('tier IV has chance for legendary joker', () => {
    const tier = PACK_TIERS.find(t => t.id === 'IV');
    const state = makeState({ jokers: [] });
    let callCount = 0;
    const origRandom = Math.random;
    Math.random = () => {
      callCount++;
      if (callCount <= 4) return 0.5;
      if (callCount === 5) return 0.1;
      return 0.5;
    };
    try {
      const result = openPack(tier, state);
      const legendary = result.find(c => c.isLegendary);
      expect(legendary).toBeTruthy();
    } finally {
      Math.random = origRandom;
    }
  });

  it('returns fewer cards when available < requested', () => {
    const tier = { id: 'test', picks: 1, options: 20, deckCards: 4, price: 3 };
    const result = openPack(tier, makeState());
    expect(result.length).toBeLessThan(20);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('Pack tier constants', () => {
  it('PACK_TIERS has 4 tiers', () => {
    expect(PACK_TIERS.length).toBe(4);
  });

  it('tier I has 1 pick, 2 options, price 3', () => {
    const tier = PACK_TIERS.find(t => t.id === 'I');
    expect(tier.picks).toBe(1);
    expect(tier.options).toBe(2);
    expect(tier.price).toBe(3);
  });

  it('tier IV has 2 picks, 4 options, price 8', () => {
    const tier = PACK_TIERS.find(t => t.id === 'IV');
    expect(tier.picks).toBe(2);
    expect(tier.options).toBe(4);
    expect(tier.price).toBe(8);
  });

  it('all tiers have valid structure', () => {
    PACK_TIERS.forEach(tier => {
      expect(typeof tier.id).toBe('string');
      expect(typeof tier.name).toBe('string');
      expect(typeof tier.picks).toBe('number');
      expect(typeof tier.options).toBe('number');
      expect(typeof tier.price).toBe('number');
      expect(tier.picks).toBeGreaterThan(0);
      expect(tier.options).toBeGreaterThan(0);
      expect(tier.price).toBeGreaterThan(0);
    });
  });
});

describe('Shop edge cases', () => {
  it('buying pack does not check joker slots', () => {
    const jokers = Array.from({ length: MAX_JOKERS }, (_, i) => ({ id: `d${i}` }));
    const state = makeState({
      jokers,
      money: 20,
      shopItems: [makePackItem(PACK_TIERS[0])]
    });
    const result = buyItem(state, 0);
    expect(result.ok).toBe(true);
  });

  it('multiple shop purchases increment bonusMult', () => {
    const j25 = { ...JOKERS.find(j => j.id === 'j25') };
    const first = { ...JOKERS.find(j => j.id === 'j21') };
    const second = { ...JOKERS.find(j => j.id === 'j22') };
    const state = makeState({
      money: 50,
      jokers: [j25],
      shopItems: [makeJokerItem(first), makeJokerItem(second)]
    });
    buyItem(state, 0);
    expect(j25.bonusMult).toBe(3);
    buyItem(state, 1);
    expect(j25.bonusMult).toBe(6);
  });

  it('reroll cost escalates indefinitely', () => {
    const state = makeState({ money: 100, rerollCost: 5 });
    rerollShop(state);
    expect(state.rerollCost).toBe(6);
    rerollShop(state);
    expect(state.rerollCost).toBe(7);
    rerollShop(state);
    expect(state.rerollCost).toBe(8);
  });

  it('onReroll lose-all sets money to zero', () => {
    const j24 = { ...JOKERS.find(j => j.id === 'j24') };
    const state = makeState({ money: 10, jokers: [j24] });
    let callCount = 0;
    const origRandom = Math.random;
    Math.random = () => {
      callCount++;
      if (callCount === 1) return 0.12;
      return 0.5;
    };
    try {
      rerollShop(state);
      expect(state.money).toBe(0);
    } finally {
      Math.random = origRandom;
    }
  });

  it('generateShopItems with null state throws', () => {
    expect(() => generateShopItems(null)).toThrow();
  });
});
