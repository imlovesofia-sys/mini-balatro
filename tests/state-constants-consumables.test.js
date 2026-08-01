import { describe, it, expect } from './test-helper.js';
import { state, resetState } from '../public/js/state.js';
import { RANKS, SUITS, SUIT_SYMBOL, RANK_VALUE, RANK_INDEX, POKER_HANDS, HAND_BY_ID, ANTE_BASES, generateBlinds, generateInfiniteAnte, BLINDS, BOSS_EFFECTS, JOKERS, LEGENDARY_JOKERS, TAROT_CARDS, PACK_TIERS, STARTING_MONEY, STARTING_HANDS, STARTING_DISCARDS, HAND_SIZE, MAX_JOKERS, MAX_CONSUMABLES, BASE_REROLL_COST, BLIND_REWARD } from '../public/js/constants.js';
import { needsSelection, applyConsumable, applyTarotDirectly, pickBossEffect } from '../public/js/consumables.js';

function makeState(overrides = {}) {
  return {
    deck: [],
    hand: [],
    usedPile: [],
    jokers: [],
    consumables: [],
    money: 10,
    extraHandsPerRound: 0,
    roundScore: 0,
    totalScore: 0,
    selectedIndices: new Set(),
    bossEffect: null,
    ...overrides
  };
}

function makeCard(rank, suit, overrides = {}) {
  return { rank, suit, ...overrides };
}

describe('state - initial values', () => {
  it('has empty deck', () => {
    resetState();
    expect(Array.isArray(state.deck)).toBe(true);
  });

  it('has empty hand', () => {
    resetState();
    expect(Array.isArray(state.hand)).toBe(true);
  });

  it('has empty jokers', () => {
    resetState();
    expect(Array.isArray(state.jokers)).toBe(true);
  });

  it('has empty consumables', () => {
    resetState();
    expect(Array.isArray(state.consumables)).toBe(true);
  });

  it('money defaults to 0', () => {
    resetState();
    expect(state.money).toBe(0);
  });

  it('phase defaults to menu', () => {
    resetState();
    expect(state.phase).toBe('menu');
  });

  it('sortMode defaults to rank', () => {
    resetState();
    expect(state.sortMode).toBe('rank');
  });

  it('currentBlindIndex defaults to 0', () => {
    resetState();
    expect(state.currentBlindIndex).toBe(0);
  });

  it('rerollCost defaults to 5', () => {
    resetState();
    expect(state.rerollCost).toBe(5);
  });

  it('overclockMultiplier defaults to 5', () => {
    resetState();
    expect(state.overclockMultiplier).toBe(5);
  });

  it('currentCycle defaults to 1', () => {
    resetState();
    expect(state.currentCycle).toBe(1);
  });

  it('infiniteMode defaults to false', () => {
    resetState();
    expect(state.infiniteMode).toBe(false);
  });

  it('currentAnte defaults to 8', () => {
    resetState();
    expect(state.currentAnte).toBe(8);
  });

  it('selectedIndices is a Set', () => {
    resetState();
    expect(state.selectedIndices).toBeInstanceOf(Set);
  });
});

describe('resetState', () => {
  it('clears deck', () => {
    state.deck = [makeCard('A', 'Hearts')];
    resetState();
    expect(state.deck).toHaveLength(0);
  });

  it('clears hand', () => {
    state.hand = [makeCard('K', 'Spades')];
    resetState();
    expect(state.hand).toHaveLength(0);
  });

  it('clears jokers', () => {
    state.jokers = [{ id: 'test' }];
    resetState();
    expect(state.jokers).toHaveLength(0);
  });

  it('clears consumables', () => {
    state.consumables = [{ id: 't1' }];
    resetState();
    expect(state.consumables).toHaveLength(0);
  });

  it('resets money to 0', () => {
    state.money = 999;
    resetState();
    expect(state.money).toBe(0);
  });

  it('resets phase to menu', () => {
    state.phase = 'gameover';
    resetState();
    expect(state.phase).toBe('menu');
  });

  it('resets currentBlindIndex to 0', () => {
    state.currentBlindIndex = 5;
    resetState();
    expect(state.currentBlindIndex).toBe(0);
  });

  it('resets totalScore to 0', () => {
    state.totalScore = 5000;
    resetState();
    expect(state.totalScore).toBe(0);
  });

  it('resets roundScore to 0', () => {
    state.roundScore = 100;
    resetState();
    expect(state.roundScore).toBe(0);
  });

  it('resets extraHandsPerRound to 0', () => {
    state.extraHandsPerRound = 3;
    resetState();
    expect(state.extraHandsPerRound).toBe(0);
  });

  it('resets selectedIndices to empty Set', () => {
    state.selectedIndices = new Set([0, 1]);
    resetState();
    expect(state.selectedIndices.size).toBe(0);
  });

  it('resets rerollCost to 5', () => {
    state.rerollCost = 20;
    resetState();
    expect(state.rerollCost).toBe(5);
  });

  it('resets previousHand to null', () => {
    state.previousHand = {};
    resetState();
    expect(state.previousHand).toBeNull();
  });

  it('resets handsPlayedThisRound to 0', () => {
    state.handsPlayedThisRound = 5;
    resetState();
    expect(state.handsPlayedThisRound).toBe(0);
  });

  it('resets consumableUsedThisRound to false', () => {
    state.consumableUsedThisRound = true;
    resetState();
    expect(state.consumableUsedThisRound).toBe(false);
  });

  it('resets playedCardsThisRound to empty', () => {
    state.playedCardsThisRound = [makeCard('A', 'Hearts')];
    resetState();
    expect(state.playedCardsThisRound).toHaveLength(0);
  });

  it('resets playedHandTypes to empty', () => {
    state.playedHandTypes = ['pair'];
    resetState();
    expect(state.playedHandTypes).toHaveLength(0);
  });

  it('resets totalBossesDefeated to 0', () => {
    state.totalBossesDefeated = 3;
    resetState();
    expect(state.totalBossesDefeated).toBe(0);
  });

  it('resets firstActionThisRound to null', () => {
    state.firstActionThisRound = 'play';
    resetState();
    expect(state.firstActionThisRound).toBeNull();
  });

  it('resets perfectDiscardTriggered to false', () => {
    state.perfectDiscardTriggered = true;
    resetState();
    expect(state.perfectDiscardTriggered).toBe(false);
  });

  it('resets suitDiscardCounts', () => {
    state.suitDiscardCounts = { Hearts: 5, Diamonds: 3, Clubs: 2, Spades: 1 };
    resetState();
    expect(state.suitDiscardCounts.Hearts).toBe(0);
    expect(state.suitDiscardCounts.Diamonds).toBe(0);
    expect(state.suitDiscardCounts.Clubs).toBe(0);
    expect(state.suitDiscardCounts.Spades).toBe(0);
  });

  it('resets masteredSuit to null', () => {
    state.masteredSuit = 'Hearts';
    resetState();
    expect(state.masteredSuit).toBeNull();
  });

  it('resets destroyedByBug to 0', () => {
    state.destroyedByBug = 5;
    resetState();
    expect(state.destroyedByBug).toBe(0);
  });

  it('resets overclockMultiplier to 5', () => {
    state.overclockMultiplier = 0;
    resetState();
    expect(state.overclockMultiplier).toBe(5);
  });

  it('resets hasExtraSlot to false', () => {
    state.hasExtraSlot = true;
    resetState();
    expect(state.hasExtraSlot).toBe(false);
  });

  it('resets handsPlayedWithDiamonds to 0', () => {
    state.handsPlayedWithDiamonds = 3;
    resetState();
    expect(state.handsPlayedWithDiamonds).toBe(0);
  });

  it('resets startTime to null', () => {
    state.startTime = Date.now();
    resetState();
    expect(state.startTime).toBeNull();
  });

  it('resets currentCycle to 1', () => {
    state.currentCycle = 5;
    resetState();
    expect(state.currentCycle).toBe(1);
  });

  it('resets infiniteMode to false', () => {
    state.infiniteMode = true;
    resetState();
    expect(state.infiniteMode).toBe(false);
  });

  it('resets currentAnte to 8', () => {
    state.currentAnte = 15;
    resetState();
    expect(state.currentAnte).toBe(8);
  });

  it('resets sortMode to rank', () => {
    state.sortMode = 'suit';
    resetState();
    expect(state.sortMode).toBe('rank');
  });

  it('resets shopItems to empty', () => {
    state.shopItems = [{ kind: 'joker' }];
    resetState();
    expect(state.shopItems).toHaveLength(0);
  });

  it('resets lastPlayedHand to null', () => {
    state.lastPlayedHand = {};
    resetState();
    expect(state.lastPlayedHand).toBeNull();
  });

  it('resets bossEffect to null', () => {
    state.bossEffect = {};
    resetState();
    expect(state.bossEffect).toBeNull();
  });
});

describe('RANKS', () => {
  it('has 13 ranks', () => {
    expect(RANKS).toHaveLength(13);
  });

  it('starts with 2 and ends with A', () => {
    expect(RANKS[0]).toBe('2');
    expect(RANKS[12]).toBe('A');
  });

  it('contains all expected ranks', () => {
    expect(RANKS).toContain('2');
    expect(RANKS).toContain('10');
    expect(RANKS).toContain('J');
    expect(RANKS).toContain('Q');
    expect(RANKS).toContain('K');
    expect(RANKS).toContain('A');
  });
});

describe('SUITS', () => {
  it('has 4 suits', () => {
    expect(SUITS).toHaveLength(4);
  });

  it('contains Hearts, Diamonds, Clubs, Spades', () => {
    expect(SUITS).toContain('Hearts');
    expect(SUITS).toContain('Diamonds');
    expect(SUITS).toContain('Clubs');
    expect(SUITS).toContain('Spades');
  });
});

describe('SUIT_SYMBOL', () => {
  it('Hearts is ♥', () => {
    expect(SUIT_SYMBOL.Hearts).toBe('♥');
  });

  it('Diamonds is ♦', () => {
    expect(SUIT_SYMBOL.Diamonds).toBe('♦');
  });

  it('Clubs is ♣', () => {
    expect(SUIT_SYMBOL.Clubs).toBe('♣');
  });

  it('Spades is ♠', () => {
    expect(SUIT_SYMBOL.Spades).toBe('♠');
  });
});

describe('RANK_VALUE', () => {
  it('A is 11', () => {
    expect(RANK_VALUE['A']).toBe(11);
  });

  it('K is 10', () => {
    expect(RANK_VALUE['K']).toBe(10);
  });

  it('Q is 10', () => {
    expect(RANK_VALUE['Q']).toBe(10);
  });

  it('J is 10', () => {
    expect(RANK_VALUE['J']).toBe(10);
  });

  it('2 is 2', () => {
    expect(RANK_VALUE['2']).toBe(2);
  });

  it('10 is 10', () => {
    expect(RANK_VALUE['10']).toBe(10);
  });
});

describe('RANK_INDEX', () => {
  it('2 is at index 0', () => {
    expect(RANK_INDEX['2']).toBe(0);
  });

  it('A is at index 12', () => {
    expect(RANK_INDEX['A']).toBe(12);
  });

  it('K is at index 11', () => {
    expect(RANK_INDEX['K']).toBe(11);
  });
});

describe('POKER_HANDS', () => {
  it('has 12 hand types', () => {
    expect(POKER_HANDS).toHaveLength(12);
  });

  it('high is first (tier 0)', () => {
    expect(POKER_HANDS[0].id).toBe('high');
    expect(POKER_HANDS[0].tier).toBe(0);
  });

  it('flushFive is last (tier 11)', () => {
    expect(POKER_HANDS[11].id).toBe('flushFive');
    expect(POKER_HANDS[11].tier).toBe(11);
  });

  it('each hand has id, name, chips, mult, tier', () => {
    POKER_HANDS.forEach(h => {
      expect(typeof h.id).toBe('string');
      expect(typeof h.name).toBe('string');
      expect(typeof h.chips).toBe('number');
      expect(typeof h.mult).toBe('number');
      expect(typeof h.tier).toBe('number');
    });
  });

  it('tiers are in ascending order', () => {
    for (let i = 1; i < POKER_HANDS.length; i++) {
      expect(POKER_HANDS[i].tier).toBeGreaterThan(POKER_HANDS[i - 1].tier);
    }
  });
});

describe('HAND_BY_ID', () => {
  it('has entry for each poker hand', () => {
    POKER_HANDS.forEach(h => {
      expect(HAND_BY_ID[h.id]).toBeTruthy();
    });
  });

  it('pair is accessible by id', () => {
    expect(HAND_BY_ID.pair.name).toBe('Par');
  });
});

describe('ANTE_BASES', () => {
  it('has 8 entries', () => {
    expect(ANTE_BASES).toHaveLength(8);
  });

  it('starts at 300', () => {
    expect(ANTE_BASES[0]).toBe(300);
  });

  it('ends at 50000', () => {
    expect(ANTE_BASES[7]).toBe(50000);
  });

  it('each value is larger than previous', () => {
    for (let i = 1; i < ANTE_BASES.length; i++) {
      expect(ANTE_BASES[i]).toBeGreaterThan(ANTE_BASES[i - 1]);
    }
  });
});

describe('generateBlinds', () => {
  it('generates 24 blinds (8 antes × 3)', () => {
    const blinds = generateBlinds();
    expect(blinds).toHaveLength(24);
  });

  it('each ante has small, big, boss', () => {
    const blinds = generateBlinds();
    for (let ante = 0; ante < 8; ante++) {
      const base = ante * 3;
      expect(blinds[base].boss).toBe(false);
      expect(blinds[base + 1].boss).toBe(false);
      expect(blinds[base + 2].boss).toBe(true);
    }
  });

  it('boss target is 2× base', () => {
    const blinds = generateBlinds();
    expect(blinds[2].target).toBe(ANTE_BASES[0] * 2);
  });

  it('big blind target is floor(base × 1.5)', () => {
    const blinds = generateBlinds();
    expect(blinds[1].target).toBe(Math.floor(ANTE_BASES[0] * 1.5));
  });

  it('small blind target equals base', () => {
    const blinds = generateBlinds();
    expect(blinds[0].target).toBe(ANTE_BASES[0]);
  });

  it('each blind has id, name, target, boss, ante', () => {
    const blinds = generateBlinds();
    blinds.forEach(b => {
      expect(typeof b.id).toBe('string');
      expect(typeof b.name).toBe('string');
      expect(typeof b.target).toBe('number');
      expect(typeof b.boss).toBe('boolean');
      expect(typeof b.ante).toBe('number');
    });
  });
});

describe('generateInfiniteAnte', () => {
  it('returns 3 blinds', () => {
    const result = generateInfiniteAnte(9);
    expect(result).toHaveLength(3);
  });

  it('base for ante 9 is 100000', () => {
    const result = generateInfiniteAnte(9);
    expect(result[0].target).toBe(100000);
  });

  it('ante 10 has higher targets', () => {
    const r9 = generateInfiniteAnte(9);
    const r10 = generateInfiniteAnte(10);
    expect(r10[0].target).toBeGreaterThan(r9[0].target);
  });

  it('boss target is 2× base', () => {
    const result = generateInfiniteAnte(9);
    expect(result[2].target).toBe(result[0].target * 2);
  });

  it('big blind target is floor(base × 1.5)', () => {
    const result = generateInfiniteAnte(9);
    expect(result[1].target).toBe(Math.floor(result[0].target * 1.5));
  });

  it('each blind has correct ante number', () => {
    const result = generateInfiniteAnte(12);
    result.forEach(b => {
      expect(b.ante).toBe(12);
    });
  });
});

describe('BLINDS', () => {
  it('is array of blinds (at least 24)', () => {
    expect(BLINDS.length).toBeGreaterThanOrEqual(24);
  });

  it('has all blind properties', () => {
    BLINDS.forEach(b => {
      expect(b.id).toBeTruthy();
      expect(b.name).toBeTruthy();
      expect(b.target).toBeGreaterThan(0);
    });
  });
});

describe('BOSS_EFFECTS', () => {
  it('has 7 boss effects', () => {
    expect(BOSS_EFFECTS).toHaveLength(7);
  });

  it('each has id, name, desc', () => {
    BOSS_EFFECTS.forEach(e => {
      expect(typeof e.id).toBe('string');
      expect(typeof e.name).toBe('string');
      expect(typeof e.desc).toBe('string');
    });
  });

  it('blind effect blocks Hearts', () => {
    const blind = BOSS_EFFECTS.find(e => e.id === 'blind');
    expect(blind.applies({ suit: 'Hearts' })).toBe(false);
    expect(blind.applies({ suit: 'Spades' })).toBe(true);
  });

  it('fool effect blocks J/Q/K', () => {
    const fool = BOSS_EFFECTS.find(e => e.id === 'fool');
    expect(fool.applies({ rank: 'J' })).toBe(false);
    expect(fool.applies({ rank: 'Q' })).toBe(false);
    expect(fool.applies({ rank: 'K' })).toBe(false);
    expect(fool.applies({ rank: 'A' })).toBe(true);
  });
});

describe('JOKERS', () => {
  it('has 23 jokers (j21-j43)', () => {
    expect(JOKERS).toHaveLength(23);
  });

  it('each joker has id, name, rarity, cost, effect, desc', () => {
    JOKERS.forEach(j => {
      expect(typeof j.id).toBe('string');
      expect(typeof j.name).toBe('string');
      expect(typeof j.rarity).toBe('string');
      expect(typeof j.cost).toBe('number');
      expect(j.effect).toBeTruthy();
      expect(typeof j.desc).toBe('string');
    });
  });

  it('j41 is Envy (envy)', () => {
    const j41 = JOKERS.find(j => j.id === 'j41');
    expect(j41.effect.type).toBe('envy');
  });

  it('j42 is Inversão (inversion)', () => {
    const j42 = JOKERS.find(j => j.id === 'j42');
    expect(j42.effect.type).toBe('inversion');
  });

  it('j43 is Equilíbrio (balance)', () => {
    const j43 = JOKERS.find(j => j.id === 'j43');
    expect(j43.effect.type).toBe('balance');
  });

  it('costs range from 5 to 10', () => {
    JOKERS.forEach(j => {
      expect(j.cost).toBeGreaterThanOrEqual(5);
      expect(j.cost).toBeLessThanOrEqual(10);
    });
  });

  it('rarities are common, uncommon, or rare', () => {
    JOKERS.forEach(j => {
      expect(['common', 'uncommon', 'rare']).toContain(j.rarity);
    });
  });
});

describe('LEGENDARY_JOKERS', () => {
  it('has 1 legendary joker', () => {
    expect(LEGENDARY_JOKERS).toHaveLength(1);
  });

  it('j44 is Hatsune Miku', () => {
    const miku = LEGENDARY_JOKERS[0];
    expect(miku.id).toBe('j44');
    expect(miku.name).toBe('Hatsune Miku');
    expect(miku.rarity).toBe('legendary');
    expect(miku.effect.type).toBe('mikuMusicalDouble');
  });

  it('cost is 20', () => {
    expect(LEGENDARY_JOKERS[0].cost).toBe(20);
  });
});

describe('TAROT_CARDS', () => {
  it('has 14 tarot cards', () => {
    expect(TAROT_CARDS).toHaveLength(14);
  });

  it('each has id, name, desc, effect', () => {
    TAROT_CARDS.forEach(t => {
      expect(typeof t.id).toBe('string');
      expect(typeof t.name).toBe('string');
      expect(typeof t.desc).toBe('string');
      expect(typeof t.effect).toBe('string');
    });
  });

  it('t1 is O Mago (+$3)', () => {
    const t1 = TAROT_CARDS.find(t => t.id === 't1');
    expect(t1.effect).toBe('money');
    expect(t1.value).toBe(3);
  });

  it('selectFromHand cards have correct property', () => {
    const selectCards = TAROT_CARDS.filter(t => t.selectFromHand);
    expect(selectCards.length).toBeGreaterThan(0);
    selectCards.forEach(t => {
      expect(t.selectFromHand).toBe(true);
    });
  });
});

describe('PACK_TIERS', () => {
  it('has 4 tiers', () => {
    expect(PACK_TIERS).toHaveLength(4);
  });

  it('tier I has 1 pick, 2 options', () => {
    const t1 = PACK_TIERS.find(t => t.id === 'I');
    expect(t1.picks).toBe(1);
    expect(t1.options).toBe(2);
  });

  it('tier IV has 2 picks, 4 options', () => {
    const t4 = PACK_TIERS.find(t => t.id === 'IV');
    expect(t4.picks).toBe(2);
    expect(t4.options).toBe(4);
  });
});

describe('Constants exports', () => {
  it('STARTING_MONEY is 4', () => {
    expect(STARTING_MONEY).toBe(4);
  });

  it('STARTING_HANDS is 4', () => {
    expect(STARTING_HANDS).toBe(4);
  });

  it('STARTING_DISCARDS is 3', () => {
    expect(STARTING_DISCARDS).toBe(3);
  });

  it('HAND_SIZE is 8', () => {
    expect(HAND_SIZE).toBe(8);
  });

  it('MAX_JOKERS is 5', () => {
    expect(MAX_JOKERS).toBe(5);
  });

  it('MAX_CONSUMABLES is 2', () => {
    expect(MAX_CONSUMABLES).toBe(2);
  });

  it('BASE_REROLL_COST is 5', () => {
    expect(BASE_REROLL_COST).toBe(5);
  });

  it('BLIND_REWARD is 5', () => {
    expect(BLIND_REWARD).toBe(5);
  });
});

describe('needsSelection', () => {
  it('returns true for consumable with selectFromHand', () => {
    expect(needsSelection({ selectFromHand: true })).toBe(true);
  });

  it('returns false for consumable without selectFromHand', () => {
    expect(needsSelection({ effect: 'money' })).toBe(false);
  });

  it('returns falsy for null consumable', () => {
    expect(needsSelection(null)).toBeFalsy();
  });

  it('returns falsy for undefined', () => {
    expect(needsSelection(undefined)).toBeFalsy();
  });
});

describe('applyConsumable - money', () => {
  it('adds value to money for money effect', () => {
    const s = makeState({ consumables: [{ id: 't1', effect: 'money', value: 3 }] });
    const result = applyConsumable(s, 0);
    expect(result.ok).toBe(true);
    expect(s.money).toBe(13);
  });

  it('removes consumable after use', () => {
    const s = makeState({ consumables: [{ id: 't1', effect: 'money', value: 3 }] });
    applyConsumable(s, 0);
    expect(s.consumables).toHaveLength(0);
  });

  it('sets consumableUsedThisRound to true', () => {
    const s = makeState({ consumables: [{ id: 't1', effect: 'money', value: 3 }] });
    applyConsumable(s, 0);
    expect(s.consumableUsedThisRound).toBe(true);
  });
});

describe('applyConsumable - extraHand', () => {
  it('increments extraHandsPerRound', () => {
    const s = makeState({ consumables: [{ id: 't3', effect: 'extraHand', value: 1 }] });
    applyConsumable(s, 0);
    expect(s.extraHandsPerRound).toBe(1);
  });
});

describe('applyConsumable - randomMoney', () => {
  it('adds random amount between min and max', () => {
    const s = makeState({ consumables: [{ id: 't10', effect: 'randomMoney', min: 3, max: 12 }] });
    const moneyBefore = s.money;
    applyConsumable(s, 0);
    expect(s.money).toBeGreaterThan(moneyBefore);
    expect(s.money).toBeLessThanOrEqual(moneyBefore + 12);
  });
});

describe('applyConsumable - createStone', () => {
  it('creates stone cards in deck', () => {
    const s = makeState({ consumables: [{ id: 't16', effect: 'createStone', count: 2 }] });
    applyConsumable(s, 0);
    expect(s.deck).toHaveLength(2);
    expect(s.deck[0].stone).toBe(true);
  });
});

describe('applyConsumable - destroyFromHand', () => {
  it('destroys selected cards from hand', () => {
    const s = makeState({
      hand: [makeCard('2', 'Hearts'), makeCard('3', 'Spades'), makeCard('4', 'Clubs')],
      consumables: [{ id: 't9', effect: 'destroyFromHand', count: 2, selectFromHand: true }]
    });
    const selected = [s.hand[0], s.hand[1]];
    applyConsumable(s, 0, selected);
    expect(s.hand).toHaveLength(1);
    expect(s.hand[0].rank).toBe('4');
  });
});

describe('applyConsumable - addGold', () => {
  it('adds gold property to selected cards', () => {
    const s = makeState({
      hand: [makeCard('2', 'Hearts')],
      consumables: [{ id: 't14', effect: 'addGold', count: 1, selectFromHand: true }]
    });
    const card = s.hand[0];
    applyConsumable(s, 0, [card]);
    expect(card.gold).toBe(true);
  });
});

describe('applyConsumable - addMusical', () => {
  it('adds musical property to selected cards', () => {
    const s = makeState({
      hand: [makeCard('2', 'Hearts')],
      consumables: [{ id: 't15', effect: 'addMusical', count: 1, selectFromHand: true }]
    });
    const card = s.hand[0];
    applyConsumable(s, 0, [card]);
    expect(card.musical).toBe(true);
  });
});

describe('applyConsumable - convertHandSuit', () => {
  it('converts selected cards to target suit', () => {
    const card1 = makeCard('2', 'Hearts');
    const s = makeState({
      hand: [card1],
      consumables: [{ id: 't6', effect: 'convertHandSuit', suit: 'Hearts', count: 2, selectFromHand: true }]
    });
    applyConsumable(s, 0, [card1]);
    expect(card1.suit).toBe('Hearts');
  });
});

describe('applyConsumable - duplicateFromHand', () => {
  it('duplicates selected card to deck', () => {
    const card1 = makeCard('A', 'Spades');
    const s = makeState({
      hand: [card1],
      consumables: [{ id: 't8', effect: 'duplicateFromHand', count: 1, selectFromHand: true }]
    });
    applyConsumable(s, 0, [card1]);
    expect(s.deck.length).toBe(1);
    expect(s.deck[0].rank).toBe('A');
  });
});

describe('applyConsumable - upgradeFromHand', () => {
  it('upgrades rank of selected cards by +1', () => {
    const s = makeState({
      hand: [makeCard('2', 'Hearts')],
      consumables: [{ id: 't11', effect: 'upgradeFromHand', count: 1, selectFromHand: true }]
    });
    const card = s.hand[0];
    applyConsumable(s, 0, [card]);
    expect(card.rank).toBe('3');
  });

  it('does not upgrade beyond A', () => {
    const card1 = makeCard('A', 'Hearts');
    const s = makeState({
      hand: [card1],
      consumables: [{ id: 't11', effect: 'upgradeFromHand', count: 2, selectFromHand: true }]
    });
    applyConsumable(s, 0, [card1]);
    expect(card1.rank).toBe('A');
  });
});

describe('applyConsumable - error cases', () => {
  it('returns error for empty consumables', () => {
    const s = makeState({ consumables: [] });
    const result = applyConsumable(s, 0);
    expect(result.ok).toBe(false);
  });

  it('returns error for selection required but not provided', () => {
    const s = makeState({ consumables: [{ id: 't9', effect: 'destroyFromHand', selectFromHand: true }] });
    const result = applyConsumable(s, 0);
    expect(result.ok).toBe(false);
  });

  it('returns error for insufficient card count', () => {
    const s = makeState({
      hand: [makeCard('2', 'Hearts')],
      consumables: [{ id: 't9', effect: 'destroyFromHand', count: 3, selectFromHand: true }]
    });
    const result = applyConsumable(s, 0, [makeCard('2', 'Hearts')]);
    expect(result.ok).toBe(false);
  });
});

describe('applyTarotDirectly', () => {
  it('returns error for null tarot', () => {
    const s = makeState();
    const result = applyTarotDirectly(s, null);
    expect(result.ok).toBe(false);
  });

  it('applies money effect directly', () => {
    const s = makeState();
    const result = applyTarotDirectly(s, { effect: 'money', value: 5 });
    expect(result.ok).toBe(true);
    expect(s.money).toBe(15);
  });
});

describe('pickBossEffect', () => {
  it('returns a boss effect', () => {
    const effect = pickBossEffect();
    expect(effect).toBeTruthy();
    expect(effect.id).toBeTruthy();
  });

  it('returns an effect from BOSS_EFFECTS', () => {
    const effect = pickBossEffect();
    const found = BOSS_EFFECTS.find(e => e.id === effect.id);
    expect(found).toBeTruthy();
  });
});

describe('tarotHook joker', () => {
  it('creates steel card in deck after using tarot', () => {
    const tecela = { id: 'j38', name: 'A Tecelã', effect: { type: 'tarotHook' } };
    const s = makeState({
      jokers: [tecela],
      consumables: [{ id: 't1', effect: 'money', value: 3 }]
    });
    applyConsumable(s, 0);
    expect(s.deck.length).toBe(1);
    expect(s.deck[0].steel).toBe(true);
  });

  it('does not create card for non-tarot consumable', () => {
    const tecela = { id: 'j38', name: 'A Tecelã', effect: { type: 'tarotHook' } };
    const s = makeState({
      jokers: [tecela],
      consumables: [{ id: 'x1', effect: 'money', value: 3 }]
    });
    applyConsumable(s, 0);
    expect(s.deck.length).toBe(0);
  });
});
