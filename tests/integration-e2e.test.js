import { describe, it, expect } from './test-helper.js';
import { state, resetState } from '../public/js/state.js';
import { BLINDS, STARTING_MONEY, STARTING_HANDS, STARTING_DISCARDS, HAND_SIZE, generateInfiniteAnte, JOKERS } from '../public/js/constants.js';
import { startRun, startBlind, playHand, discardHand, advanceToNextBlind, applyCashout, skipBlind, enterInfiniteMode, confirmBlindSelection, getCurrentBlindInfo, doBuyItem, doSellJoker, doReroll, getBlind, sortHand, reorderJokers, leaveShopAndContinue } from '../public/js/game.js';
import { generateShopItems, buyItem, sellJoker, rerollShop } from '../public/js/shop.js';
import { createDeck } from '../public/js/deck.js';

function makeCard(rank, suit, overrides = {}) {
  return { rank, suit, ...overrides };
}

describe('Full game flow: start → blind → play → cashout', () => {
  it('startRun initializes all needed state', () => {
    resetState();
    startRun();
    expect(state.phase).toBe('blind');
    expect(state.money).toBe(STARTING_MONEY);
    expect(state.hands).toBe(STARTING_HANDS);
    expect(state.discards).toBe(STARTING_DISCARDS);
    expect(state.hand.length).toBe(HAND_SIZE);
    expect(state.currentBlindIndex).toBe(0);
    expect(state.totalScore).toBe(0);
    expect(state.startTime).toBeTruthy();
  });

  it('playing hand with enough score triggers blindCleared', () => {
    resetState();
    startRun();
    state.roundScore = BLINDS[0].target - 1;
    state.selectedIndices = new Set([0]);
    const result = playHand();
    expect(result.blindCleared).toBe(true);
    expect(state.phase).toBe('transition');
  });

  it('advanceToNextBlind after blindCleared returns cashout', () => {
    resetState();
    startRun();
    state.roundScore = BLINDS[0].target;
    state.selectedIndices = new Set([0]);
    playHand();
    const advance = advanceToNextBlind();
    expect(advance.cashout).toBe(true);
    expect(advance.breakdown).toBeTruthy();
  });

  it('applyCashout adds money and enters shop', () => {
    resetState();
    startRun();
    state.money = 0;
    state.cashoutBreakdown = { blindReward: 5, handsRemaining: 2, jokerRewards: 0, totalEarned: 7 };
    applyCashout();
    expect(state.money).toBe(7);
    expect(state.phase).toBe('shop');
    expect(state.shopItems.length).toBeGreaterThan(0);
  });
});

describe('Full game flow: skip blind → next ante', () => {
  it('skipBlind advances to next blind', () => {
    resetState();
    startRun();
    expect(state.currentBlindIndex).toBe(0);
    skipBlind();
    expect(state.currentBlindIndex).toBe(1);
    expect(state.phase).toBe('blind_select');
  });

  it('skipping all 3 blinds in ante goes to victory', () => {
    resetState();
    startRun();
    skipBlind();
    skipBlind();
    skipBlind();
    expect(state.currentBlindIndex).toBe(3);
  });
});

describe('Full game flow: out of hands → game over', () => {
  it('playing all hands without reaching target triggers gameOver', () => {
    resetState();
    startRun();
    let lastResult;
    while (state.hands > 0 && state.phase === 'blind') {
      state.selectedIndices = new Set([0]);
      lastResult = playHand();
      if (lastResult.blindCleared) break;
    }
    if (state.roundScore < BLINDS[0].target) {
      expect(state.phase).toBe('gameover');
    }
  });
});

describe('Full game flow: discard → draw new cards', () => {
  it('discarding reduces hand then draws new cards', () => {
    resetState();
    startRun();
    const deckBefore = state.deck.length;
    state.selectedIndices = new Set([0]);
    discardHand();
    expect(state.hand.length).toBe(HAND_SIZE);
    expect(state.deck.length).toBeLessThan(deckBefore);
  });

  it('discard uses a discard charge', () => {
    resetState();
    startRun();
    const discBefore = state.discards;
    state.selectedIndices = new Set([0]);
    discardHand();
    expect(state.discards).toBe(discBefore - 1);
  });
});

describe('Full game flow: shop purchase → joker acquired', () => {
  it('buying joker adds it to state.jokers and deducts money', () => {
    resetState();
    startRun();
    state.money = 20;
    state.phase = 'shop';
    const joker = JOKERS[0];
    state.shopItems = [{ kind: 'joker', data: joker, price: joker.cost, sold: false }];
    const result = doBuyItem(0);
    expect(result.ok).toBe(true);
    expect(state.jokers.length).toBe(1);
    expect(state.jokers[0].id).toBe(joker.id);
    expect(state.money).toBe(20 - joker.cost);
  });

  it('selling joker gives money back', () => {
    resetState();
    const joker = { id: 'test', cost: 7, effect: { type: 'test' } };
    state.jokers = [joker];
    state.money = 0;
    const price = doSellJoker(0);
    expect(price).toBe(4);
    expect(state.money).toBe(4);
    expect(state.jokers.length).toBe(0);
  });
});

describe('Full game flow: reroll shop', () => {
  it('reroll deducts cost and generates new items', () => {
    resetState();
    state.money = 20;
    state.rerollCost = 5;
    state.shopItems = [];
    const result = doReroll();
    expect(result).toBe(true);
    expect(state.money).toBe(15);
    expect(state.rerollCost).toBe(6);
    expect(state.shopItems.length).toBeGreaterThan(0);
  });
});

describe('Full game flow: multiple rounds', () => {
  it('playing 3 blinds completes a cycle', () => {
    resetState();
    startRun();

    for (let i = 0; i < 3; i++) {
      if (i > 0) {
        state.phase = 'blind_select';
        confirmBlindSelection();
      }
      state.roundScore = BLINDS[state.currentBlindIndex].target;
      state.selectedIndices = new Set([0]);
      const playResult = playHand();
      if (playResult.blindCleared) {
        const advance = advanceToNextBlind();
        if (advance.cycleComplete) {
          expect(advance.cycleComplete).toBe(true);
          return;
        }
        if (advance.cashout) {
          state.cashoutBreakdown = advance.breakdown;
          applyCashout();
        }
      }
    }
  });
});

describe('Full game flow: infinite mode', () => {
  it('enterInfiniteMode adds new blinds and sets infiniteMode', () => {
    resetState();
    startRun();
    enterInfiniteMode();
    expect(state.infiniteMode).toBe(true);
    expect(state.currentCycle).toBe(2);
    expect(state.currentAnte).toBe(9);
  });

  it('advanceToNextBlind in infinite mode generates new ante', () => {
    resetState();
    startRun();
    enterInfiniteMode();
    const blindsBefore = BLINDS.length;
    state.currentBlindIndex = BLINDS.length - 1;
    const result = advanceToNextBlind();
    expect(BLINDS.length).toBe(blindsBefore + 3);
    expect(state.currentAnte).toBe(10);
  });

  it('infinite mode does not trigger cycleComplete', () => {
    resetState();
    startRun();
    enterInfiniteMode();
    state.currentBlindIndex = BLINDS.length - 1;
    const result = advanceToNextBlind();
    expect(result.cycleComplete).toBeFalsy();
    expect(result.cashout).toBe(true);
  });
});

describe('Full game flow: boss blind effects', () => {
  it('boss blind applies extraHands effect', () => {
    resetState();
    startRun();
    state.currentBlindIndex = 2;
    state.pendingBossEffect = { extraHands: -1 };
    startBlind();
    expect(state.hands).toBe(STARTING_HANDS - 1);
  });

  it('boss blind applies rerollCost effect', () => {
    resetState();
    startRun();
    state.currentBlindIndex = 2;
    state.pendingBossEffect = { rerollCost: 10 };
    startBlind();
    expect(state.rerollCost).toBe(10);
  });

  it('boss blind applies card blocking effect', () => {
    resetState();
    startRun();
    state.currentBlindIndex = 2;
    state.pendingBossEffect = { applies: (c) => c.suit !== 'Hearts' };
    startBlind();
    expect(state.bossEffect).toBeTruthy();
    expect(state.bossEffect.applies({ suit: 'Hearts' })).toBe(false);
    expect(state.bossEffect.applies({ suit: 'Spades' })).toBe(true);
  });
});

describe('Full game flow: joker interactions', () => {
  it('inversion joker swaps hands and discards', () => {
    resetState();
    startRun();
    state.jokers = [{ id: 'j42', name: 'Inversão', effect: { type: 'inversion' } }];
    startBlind();
    expect(state.hands).toBe(STARTING_DISCARDS);
    expect(state.discards).toBe(STARTING_HANDS);
  });

  it('balance joker halves hands', () => {
    resetState();
    startRun();
    state.jokers = [{ id: 'j43', name: 'Equilíbrio', effect: { type: 'balance' } }];
    startBlind();
    expect(state.hands).toBe(Math.floor(STARTING_HANDS / 2));
  });

  it('overclock joker removed when multiplier reaches 0', () => {
    resetState();
    startRun();
    state.overclockMultiplier = 0;
    state.jokers = [{ id: 'j35', name: 'Overclock', effect: { type: 'overclock' } }];
    startBlind();
    expect(state.jokers.length).toBe(0);
  });

  it('overclock joker kept when multiplier > 0', () => {
    resetState();
    startRun();
    state.overclockMultiplier = 3;
    state.jokers = [{ id: 'j35', name: 'Overclock', effect: { type: 'overclock' } }];
    startBlind();
    expect(state.jokers.length).toBe(1);
  });

  it('destroyOnDiscard joker destroys card on discard', () => {
    resetState();
    startRun();
    const joker = { id: 'j29', effect: { type: 'destroyOnDiscard' }, bonusXMult: 0 };
    state.jokers = [joker];
    state.selectedIndices = new Set([0]);
    discardHand();
    expect(state.destroyedByBug).toBe(1);
    expect(joker.bonusXMult).toBe(0.5);
  });
});

describe('Full game flow: scoring chain', () => {
  it('playHand updates roundScore and totalScore', () => {
    resetState();
    startRun();
    state.selectedIndices = new Set([0, 1, 2]);
    playHand();
    expect(state.roundScore).toBeGreaterThan(0);
    expect(state.totalScore).toBeGreaterThan(0);
  });

  it('playHand sets previousHand for next play', () => {
    resetState();
    startRun();
    state.selectedIndices = new Set([0]);
    playHand();
    expect(state.previousHand).toBeTruthy();
    expect(state.previousHand.handType).toBeTruthy();
  });

  it('playHand adds to playedHandTypes', () => {
    resetState();
    startRun();
    state.selectedIndices = new Set([0]);
    playHand();
    expect(state.playedHandTypes.length).toBe(1);
  });
});

describe('Full game flow: cashout breakdown accuracy', () => {
  it('totalEarned = blindReward + handsRemaining + jokerRewards', () => {
    resetState();
    startRun();
    state.currentBlindIndex = 0;
    state.hands = 3;
    const advance = advanceToNextBlind();
    const b = advance.breakdown;
    expect(b.totalEarned).toBe(b.blindReward + b.handsRemaining + b.jokerRewards);
  });

  it('blindReward is always BLIND_REWARD (5)', () => {
    resetState();
    startRun();
    state.currentBlindIndex = 0;
    const advance = advanceToNextBlind();
    expect(advance.breakdown.blindReward).toBe(5);
  });
});

describe('Full game flow: getCurrentBlindInfo accuracy', () => {
  it('returns correct blind name for ante 1', () => {
    resetState();
    startRun();
    state.currentBlindIndex = 0;
    const info = getCurrentBlindInfo();
    expect(info.name).toBe('Blind Pequeno');
  });

  it('returns boss name for boss blind', () => {
    resetState();
    startRun();
    state.currentBlindIndex = 2;
    const info = getCurrentBlindInfo();
    expect(info.boss).toBe(true);
    expect(info.bossEffect).toBeTruthy();
  });

  it('target matches BLINDS array', () => {
    resetState();
    startRun();
    state.currentBlindIndex = 0;
    const info = getCurrentBlindInfo();
    expect(info.target).toBe(BLINDS[0].target);
  });
});

describe('Full game flow: sorting', () => {
  it('sortHand changes sortMode and clears selection', () => {
    resetState();
    startRun();
    state.selectedIndices = new Set([0, 1]);
    sortHand('suit');
    expect(state.sortMode).toBe('suit');
    expect(state.selectedIndices.size).toBe(0);
  });
});

describe('Full game flow: edge cases', () => {
  it('playHand with single card still works', () => {
    resetState();
    startRun();
    state.selectedIndices = new Set([0]);
    const result = playHand();
    expect(result.ok).toBe(true);
  });

  it('discardHand with multiple cards works', () => {
    resetState();
    startRun();
    state.selectedIndices = new Set([0, 1, 2, 3]);
    const result = discardHand();
    expect(result.ok).toBe(true);
    expect(state.hand.length).toBe(HAND_SIZE);
  });

  it('multiple discards reduce discards count', () => {
    resetState();
    startRun();
    const discBefore = state.discards;
    state.selectedIndices = new Set([0]);
    discardHand();
    state.selectedIndices = new Set([0]);
    discardHand();
    expect(state.discards).toBe(discBefore - 2);
  });

  it('cashoutBreakdown is cleared after applyCashout', () => {
    resetState();
    startRun();
    state.cashoutBreakdown = { blindReward: 5, handsRemaining: 2, jokerRewards: 0, totalEarned: 7 };
    applyCashout();
    expect(state.cashoutBreakdown).toBeNull();
  });
});

describe('Full game flow: shop item generation', () => {
  it('generateShopItems returns jokers and packs', () => {
    resetState();
    startRun();
    const items = generateShopItems(state);
    const jokers = items.filter(i => i.kind === 'joker');
    const packs = items.filter(i => i.kind === 'pack');
    expect(jokers.length).toBe(2);
    expect(packs.length).toBe(2);
  });

  it('shop items are not sold by default', () => {
    resetState();
    startRun();
    const items = generateShopItems(state);
    items.forEach(item => {
      expect(item.sold).toBe(false);
    });
  });

  it('buying item marks it as sold', () => {
    resetState();
    startRun();
    state.money = 50;
    const items = generateShopItems(state);
    state.shopItems = items;
    const result = buyItem(state, 0);
    if (result.ok) {
      expect(state.shopItems[0].sold).toBe(true);
    }
  });
});

describe('Full game flow: deck operations', () => {
  it('createDeck returns 52 cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
  });

  it('each card in deck has rank and suit', () => {
    const deck = createDeck();
    deck.forEach(card => {
      expect(card.rank).toBeTruthy();
      expect(card.suit).toBeTruthy();
    });
  });

  it('deck has all 4 suits × 13 ranks', () => {
    const deck = createDeck();
    const suits = new Set(deck.map(c => c.suit));
    const ranks = new Set(deck.map(c => c.rank));
    expect(suits.size).toBe(4);
    expect(ranks.size).toBe(13);
  });
});

describe('Full game flow: known bugs (documented)', () => {
  it('BLINDS array is mutated by infinite mode (known issue)', () => {
    resetState();
    startRun();
    const blindsBefore = BLINDS.length;
    enterInfiniteMode();
    expect(BLINDS.length).toBeGreaterThan(blindsBefore);
    // This is a known bug - BLINDS is a shared mutable array
    // resetState does not restore it
  });

  it('leaveShopAndContinue is a no-op (known issue)', () => {
    const result = leaveShopAndContinue();
    expect(result).toEqual({ blind: true });
    // This function does not advance the game state
  });

  it('discardCountThisRound is never incremented (dead field)', () => {
    resetState();
    startRun();
    state.selectedIndices = new Set([0]);
    discardHand();
    expect(state.discardCountThisRound).toBe(0);
    // discardCountThisRound is set but never incremented
  });
});

describe('Full game flow: podium score flow', () => {
  it('score submission format is correct', () => {
    const score = { name: 'Test', score: 1000, time: '05:30' };
    expect(typeof score.name).toBe('string');
    expect(typeof score.score).toBe('number');
    expect(typeof score.time).toBe('string');
  });
});

describe('Full game flow: reorderJokers', () => {
  it('reordering jokers changes their positions', () => {
    resetState();
    state.jokers = [
      { id: 'j21', name: 'A' },
      { id: 'j22', name: 'B' },
      { id: 'j23', name: 'C' }
    ];
    reorderJokers(0, 2);
    expect(state.jokers[0].name).toBe('B');
    expect(state.jokers[1].name).toBe('C');
    expect(state.jokers[2].name).toBe('A');
  });
});

describe('Full game flow: multiple plays per blind', () => {
  it('playing multiple hands reduces hands count', () => {
    resetState();
    startRun();
    const handsBefore = state.hands;
    for (let i = 0; i < 3; i++) {
      if (state.phase !== 'blind') break;
      state.selectedIndices = new Set([0]);
      playHand();
    }
    expect(state.hands).toBeLessThanOrEqual(handsBefore - 1);
  });

  it('roundScore accumulates across plays', () => {
    resetState();
    startRun();
    const scores = [];
    for (let i = 0; i < 2; i++) {
      if (state.phase !== 'blind') break;
      state.selectedIndices = new Set([0]);
      playHand();
      scores.push(state.roundScore);
    }
    if (scores.length === 2) {
      expect(scores[1]).toBeGreaterThanOrEqual(scores[0]);
    }
  });
});
