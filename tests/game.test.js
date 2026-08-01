import { describe, it, expect } from './test-helper.js';
import { state, resetState } from '../public/js/state.js';
import { BLINDS, STARTING_MONEY, STARTING_HANDS, STARTING_DISCARDS, HAND_SIZE, BASE_REROLL_COST, BLIND_REWARD, generateInfiniteAnte } from '../public/js/constants.js';
import { startRun, startBlind, playHand, discardHand, advanceToNextBlind, applyCashout, leaveShopAndContinue, getCurrentBlindInfo, confirmBlindSelection, skipBlind, reorderJokers, sortHand, getBlind, getBossEffect, enterInfiniteMode, doBuyItem, doSellJoker, doReroll } from '../public/js/game.js';

function makeCard(rank, suit, overrides = {}) {
  return { rank, suit, ...overrides };
}

function handContainsRanks(hand, ranks) {
  const handRanks = hand.map(c => c.rank);
  for (const r of ranks) {
    if (!handRanks.includes(r)) return false;
  }
  return true;
}

describe('startRun', () => {
  it('resets state to initial values', () => {
    resetState();
    state.money = 999;
    state.totalScore = 500;
    startRun();
    expect(state.money).toBe(STARTING_MONEY);
    expect(state.totalScore).toBe(0);
  });

  it('sets startTime to Date.now()', () => {
    resetState();
    const before = Date.now();
    startRun();
    expect(state.startTime).toBeGreaterThanOrEqual(before);
  });

  it('creates and shuffles deck', () => {
    resetState();
    startRun();
    expect(state.deck.length).toBeGreaterThan(0);
  });

  it('sets currentBlindIndex to 0', () => {
    resetState();
    state.currentBlindIndex = 5;
    startRun();
    expect(state.currentBlindIndex).toBe(0);
  });

  it('sets extraHandsPerRound to 0', () => {
    resetState();
    state.extraHandsPerRound = 3;
    startRun();
    expect(state.extraHandsPerRound).toBe(0);
  });

  it('calls startBlind internally (phase is blind)', () => {
    resetState();
    startRun();
    expect(state.phase).toBe('blind');
  });
});

describe('startBlind', () => {
  it('sets roundScore to 0', () => {
    resetState();
    startRun();
    state.roundScore = 999;
    startBlind();
    expect(state.roundScore).toBe(0);
  });

  it('sets hands to STARTING_HANDS + extraHandsPerRound', () => {
    resetState();
    startRun();
    state.extraHandsPerRound = 2;
    startBlind();
    expect(state.hands).toBe(STARTING_HANDS + 2);
  });

  it('sets discards to STARTING_DISCARDS', () => {
    resetState();
    startRun();
    startBlind();
    expect(state.discards).toBe(STARTING_DISCARDS);
  });

  it('clears selectedIndices', () => {
    resetState();
    startRun();
    state.selectedIndices = new Set([0, 1, 2]);
    startBlind();
    expect(state.selectedIndices.size).toBe(0);
  });

  it('resets rerollCost to BASE_REROLL_COST', () => {
    resetState();
    startRun();
    state.rerollCost = 99;
    startBlind();
    expect(state.rerollCost).toBe(BASE_REROLL_COST);
  });

  it('resets previousHand to null', () => {
    resetState();
    startRun();
    state.previousHand = { handType: {} };
    startBlind();
    expect(state.previousHand).toBeNull();
  });

  it('resets consumableUsedThisRound to false', () => {
    resetState();
    startRun();
    state.consumableUsedThisRound = true;
    startBlind();
    expect(state.consumableUsedThisRound).toBe(false);
  });

  it('resets playedCardsThisRound to empty', () => {
    resetState();
    startRun();
    state.playedCardsThisRound = [{ rank: 'A', suit: 'Hearts' }];
    startBlind();
    expect(state.playedCardsThisRound).toHaveLength(0);
  });

  it('resets playedHandTypes to empty', () => {
    resetState();
    startRun();
    state.playedHandTypes = ['pair'];
    startBlind();
    expect(state.playedHandTypes).toHaveLength(0);
  });

  it('sets phase to blind', () => {
    resetState();
    startRun();
    startBlind();
    expect(state.phase).toBe('blind');
  });

  it('draws HAND_SIZE cards to hand', () => {
    resetState();
    startRun();
    startBlind();
    expect(state.hand.length).toBe(HAND_SIZE);
  });

  it('sets bossEffect to null for non-boss blind', () => {
    resetState();
    startRun();
    state.currentBlindIndex = 0;
    startBlind();
    expect(state.bossEffect).toBeNull();
  });

  it('applies boss effect for boss blind', () => {
    resetState();
    startRun();
    state.currentBlindIndex = 2;
    startBlind();
    expect(state.bossEffect).toBeTruthy();
  });

  it('applies extraHands from boss effect', () => {
    resetState();
    startRun();
    state.currentBlindIndex = 2;
    state.pendingBossEffect = { extraHands: -1 };
    startBlind();
    expect(state.hands).toBeLessThan(STARTING_HANDS);
  });

  it('applies extraDiscards from boss effect', () => {
    resetState();
    startRun();
    state.currentBlindIndex = 2;
    state.pendingBossEffect = { extraDiscards: -1 };
    startBlind();
    expect(state.discards).toBeLessThan(STARTING_DISCARDS);
  });

  it('applies rerollCost from boss effect', () => {
    resetState();
    startRun();
    state.currentBlindIndex = 2;
    state.pendingBossEffect = { rerollCost: 10 };
    startBlind();
    expect(state.rerollCost).toBe(10);
  });

  it('clears pendingBossEffect after applying', () => {
    resetState();
    startRun();
    state.currentBlindIndex = 2;
    state.pendingBossEffect = { extraHands: 1 };
    startBlind();
    expect(state.pendingBossEffect).toBeNull();
  });

  it('inversion joker swaps hands and discards', () => {
    resetState();
    startRun();
    state.jokers = [{ id: 'j42', name: 'Inversão', effect: { type: 'inversion' } }];
    const origHands = STARTING_HANDS;
    startBlind();
    expect(state.hands).toBe(STARTING_DISCARDS);
    expect(state.discards).toBe(origHands);
  });

  it('balance joker halves hands (floor)', () => {
    resetState();
    startRun();
    state.jokers = [{ id: 'j43', name: 'Equilíbrio', effect: { type: 'balance' } }];
    startBlind();
    expect(state.hands).toBe(Math.floor(STARTING_HANDS / 2));
  });

  it('balance joker minimum hands is 1', () => {
    resetState();
    startRun();
    state.jokers = [{ id: 'j43', name: 'Equilíbrio', effect: { type: 'balance' } }];
    state.extraHandsPerRound = 0;
    startBlind();
    expect(state.hands).toBeGreaterThanOrEqual(1);
  });

  it('removes overclock joker when multiplier <= 0', () => {
    resetState();
    startRun();
    state.overclockMultiplier = 0;
    state.jokers = [{ id: 'j35', name: 'Overclock', effect: { type: 'overclock' } }];
    startBlind();
    expect(state.jokers.length).toBe(0);
  });

  it('keeps overclock joker when multiplier > 0', () => {
    resetState();
    startRun();
    state.overclockMultiplier = 5;
    state.jokers = [{ id: 'j35', name: 'Overclock', effect: { type: 'overclock' } }];
    startBlind();
    expect(state.jokers.length).toBe(1);
  });
});

describe('playHand', () => {
  it('returns error when phase is not blind', () => {
    resetState();
    startRun();
    state.phase = 'shop';
    const result = playHand();
    expect(result.ok).toBe(false);
  });

  it('returns error when no selection', () => {
    resetState();
    startRun();
    state.selectedIndices = new Set();
    const result = playHand();
    expect(result.ok).toBe(false);
  });

  it('returns error when hands <= 0', () => {
    resetState();
    startRun();
    state.hands = 0;
    state.selectedIndices = new Set([0]);
    const result = playHand();
    expect(result.ok).toBe(false);
  });

  it('reduces hands by 1', () => {
    resetState();
    startRun();
    const handsBefore = state.hands;
    state.selectedIndices = new Set([0]);
    playHand();
    expect(state.hands).toBe(handsBefore - 1);
  });

  it('increments handsPlayedThisRound', () => {
    resetState();
    startRun();
    expect(state.handsPlayedThisRound).toBe(0);
    state.selectedIndices = new Set([0]);
    playHand();
    expect(state.handsPlayedThisRound).toBe(1);
  });

  it('adds score to roundScore', () => {
    resetState();
    startRun();
    state.selectedIndices = new Set([0]);
    const result = playHand();
    expect(state.roundScore).toBeGreaterThan(0);
  });

  it('adds score to totalScore', () => {
    resetState();
    startRun();
    state.selectedIndices = new Set([0]);
    playHand();
    expect(state.totalScore).toBeGreaterThan(0);
  });

  it('sets previousHand after playing', () => {
    resetState();
    startRun();
    state.selectedIndices = new Set([0]);
    playHand();
    expect(state.previousHand).toBeTruthy();
    expect(state.previousHand.handType).toBeTruthy();
  });

  it('sets lastPlayedHand after playing', () => {
    resetState();
    startRun();
    state.selectedIndices = new Set([0]);
    playHand();
    expect(state.lastPlayedHand).toBeTruthy();
    expect(state.lastPlayedHand.handName).toBeTruthy();
  });

  it('adds played cards to playedCardsThisRound', () => {
    resetState();
    startRun();
    state.selectedIndices = new Set([0, 1]);
    playHand();
    expect(state.playedCardsThisRound.length).toBe(2);
  });

  it('adds hand type to playedHandTypes', () => {
    resetState();
    startRun();
    state.selectedIndices = new Set([0]);
    playHand();
    expect(state.playedHandTypes.length).toBe(1);
    expect(typeof state.playedHandTypes[0]).toBe('string');
  });

  it('returns blindCleared when score >= target', () => {
    resetState();
    startRun();
    state.roundScore = BLINDS[0].target - 1;
    state.selectedIndices = new Set([0]);
    const result = playHand();
    expect(result.blindCleared).toBe(true);
  });

  it('returns gameOver when hands <= 0 and score < target', () => {
    resetState();
    startRun();
    state.hands = 1;
    state.roundScore = 0;
    state.selectedIndices = new Set([0]);
    const result = playHand();
    // With low starting score, should trigger gameOver
    expect(result.gameOver || state.phase === 'gameover').toBe(true);
  });

  it('sets phase to transition on blindCleared', () => {
    resetState();
    startRun();
    state.roundScore = BLINDS[0].target;
    state.selectedIndices = new Set([0]);
    playHand();
    expect(state.phase).toBe('transition');
  });

  it('sets phase to gameOver when out of hands', () => {
    resetState();
    startRun();
    state.hands = 1;
    state.roundScore = 0;
    state.selectedIndices = new Set([0]);
    const result = playHand();
    expect(result.gameOver).toBe(true);
    expect(state.phase).toBe('gameover');
  });

  it('clears selectedIndices after playing', () => {
    resetState();
    startRun();
    state.selectedIndices = new Set([0, 1, 2]);
    playHand();
    expect(state.selectedIndices.size).toBe(0);
  });

  it('moves played cards to usedPile', () => {
    resetState();
    startRun();
    state.selectedIndices = new Set([0]);
    const cardBefore = { ...state.hand[0] };
    playHand();
    const inUsed = state.usedPile.some(c => c.rank === cardBefore.rank && c.suit === cardBefore.suit);
    expect(inUsed).toBe(true);
  });

  it('sets firstActionThisRound to play on first action', () => {
    resetState();
    startRun();
    state.selectedIndices = new Set([0]);
    playHand();
    expect(state.firstActionThisRound).toBe('play');
  });

  it('does not overwrite firstActionThisRound on second action', () => {
    resetState();
    startRun();
    state.selectedIndices = new Set([0]);
    playHand();
    state.selectedIndices = new Set([0]);
    playHand();
    expect(state.firstActionThisRound).toBe('play');
  });
});

describe('discardHand', () => {
  it('returns error when phase is not blind', () => {
    resetState();
    startRun();
    state.phase = 'shop';
    const result = discardHand();
    expect(result.ok).toBe(false);
  });

  it('returns error when no selection', () => {
    resetState();
    startRun();
    state.selectedIndices = new Set();
    const result = discardHand();
    expect(result.ok).toBe(false);
  });

  it('returns error when discards <= 0', () => {
    resetState();
    startRun();
    state.discards = 0;
    state.selectedIndices = new Set([0]);
    const result = discardHand();
    expect(result.ok).toBe(false);
  });

  it('reduces discards by 1', () => {
    resetState();
    startRun();
    const discBefore = state.discards;
    state.selectedIndices = new Set([0]);
    discardHand();
    expect(state.discards).toBe(discBefore - 1);
  });

  it('removes discarded cards from hand (refills via drawCards)', () => {
    resetState();
    startRun();
    const discardedCard = state.hand[0];
    state.selectedIndices = new Set([0]);
    discardHand();
    expect(state.usedPile).toContain(discardedCard);
  });

  it('adds discarded cards to usedPile', () => {
    resetState();
    startRun();
    const usedBefore = state.usedPile.length;
    state.selectedIndices = new Set([0]);
    discardHand();
    expect(state.usedPile.length).toBeGreaterThan(usedBefore);
  });

  it('draws new cards to replace discarded', () => {
    resetState();
    startRun();
    state.selectedIndices = new Set([0]);
    discardHand();
    expect(state.hand.length).toBe(HAND_SIZE);
  });

  it('clears selectedIndices after discarding', () => {
    resetState();
    startRun();
    state.selectedIndices = new Set([0, 1]);
    discardHand();
    expect(state.selectedIndices.size).toBe(0);
  });

  it('sets firstActionThisRound to discard on first action', () => {
    resetState();
    startRun();
    state.selectedIndices = new Set([0]);
    discardHand();
    expect(state.firstActionThisRound).toBe('discard');
  });

  it('perfect discard (5 cards as first action) triggers flag', () => {
    resetState();
    startRun();
    state.selectedIndices = new Set([0, 1, 2, 3, 4]);
    discardHand();
    expect(state.perfectDiscardTriggered).toBe(true);
  });

  it('discard fewer than 5 does not trigger perfect discard', () => {
    resetState();
    startRun();
    state.selectedIndices = new Set([0, 1, 2]);
    discardHand();
    expect(state.perfectDiscardTriggered).toBe(false);
  });

  it('destroyOnDiscard joker destroys a random card', () => {
    resetState();
    startRun();
    const joker = { id: 'j29', name: 'Bug de Sintaxe', effect: { type: 'destroyOnDiscard' }, bonusXMult: 0 };
    state.jokers = [joker];
    state.selectedIndices = new Set([0]);
    discardHand();
    expect(state.destroyedByBug).toBe(1);
  });

  it('destroyOnDiscard joker increments bonusXMult', () => {
    resetState();
    startRun();
    const joker = { id: 'j29', name: 'Bug de Sintaxe', effect: { type: 'destroyOnDiscard' }, bonusXMult: 0 };
    state.jokers = [joker];
    state.selectedIndices = new Set([0]);
    discardHand();
    expect(joker.bonusXMult).toBe(0.5);
  });
});

describe('advanceToNextBlind', () => {
  it('increments currentBlindIndex', () => {
    resetState();
    startRun();
    const idxBefore = state.currentBlindIndex;
    advanceToNextBlind();
    expect(state.currentBlindIndex).toBe(idxBefore + 1);
  });

  it('returns cashout result for non-final blind', () => {
    resetState();
    startRun();
    state.currentBlindIndex = 0;
    const result = advanceToNextBlind();
    expect(result.cashout).toBe(true);
    expect(result.breakdown).toBeTruthy();
  });

  it('returns cycleComplete when all blinds done (non-infinite)', () => {
    resetState();
    startRun();
    state.currentBlindIndex = BLINDS.length - 1;
    state.infiniteMode = false;
    const result = advanceToNextBlind();
    expect(result.cycleComplete).toBe(true);
  });

  it('blindCleared increments totalBossesDefeated for boss', () => {
    resetState();
    startRun();
    state.currentBlindIndex = 2;
    advanceToNextBlind();
    expect(state.totalBossesDefeated).toBe(1);
  });

  it('boss defeat reduces overclockMultiplier by 0.5', () => {
    resetState();
    startRun();
    state.currentBlindIndex = 2;
    state.overclockMultiplier = 5;
    advanceToNextBlind();
    expect(state.overclockMultiplier).toBe(4.5);
  });

  it('breakdown includes blindReward', () => {
    resetState();
    startRun();
    state.currentBlindIndex = 0;
    const result = advanceToNextBlind();
    expect(result.breakdown.blindReward).toBe(BLIND_REWARD);
  });

  it('breakdown includes handsRemaining', () => {
    resetState();
    startRun();
    state.currentBlindIndex = 0;
    const result = advanceToNextBlind();
    expect(typeof result.breakdown.handsRemaining).toBe('number');
  });

  it('breakdown totalEarned equals sum of parts', () => {
    resetState();
    startRun();
    state.currentBlindIndex = 0;
    const result = advanceToNextBlind();
    const b = result.breakdown;
    expect(b.totalEarned).toBe(b.blindReward + b.handsRemaining + b.jokerRewards);
  });
});

describe('applyCashout', () => {
  it('adds blindReward + handsRemaining to money', () => {
    resetState();
    startRun();
    state.money = 0;
    state.cashoutBreakdown = { blindReward: 5, handsRemaining: 3, jokerRewards: 0, totalEarned: 8 };
    applyCashout();
    expect(state.money).toBe(8);
  });

  it('sets phase to shop', () => {
    resetState();
    startRun();
    state.cashoutBreakdown = { blindReward: 5, handsRemaining: 3, jokerRewards: 0, totalEarned: 8 };
    applyCashout();
    expect(state.phase).toBe('shop');
  });

  it('generates shop items', () => {
    resetState();
    startRun();
    state.cashoutBreakdown = { blindReward: 5, handsRemaining: 3, jokerRewards: 0, totalEarned: 8 };
    applyCashout();
    expect(state.shopItems.length).toBeGreaterThan(0);
  });

  it('clears cashoutBreakdown', () => {
    resetState();
    startRun();
    state.cashoutBreakdown = { blindReward: 5, handsRemaining: 3, jokerRewards: 0, totalEarned: 8 };
    applyCashout();
    expect(state.cashoutBreakdown).toBeNull();
  });
});

describe('leaveShopAndContinue', () => {
  it('returns { blind: true }', () => {
    const result = leaveShopAndContinue();
    expect(result.blind).toBe(true);
  });
});

describe('getCurrentBlindInfo', () => {
  it('returns blind name', () => {
    resetState();
    startRun();
    const info = getCurrentBlindInfo();
    expect(info.name).toBeTruthy();
  });

  it('returns blind target', () => {
    resetState();
    startRun();
    const info = getCurrentBlindInfo();
    expect(info.target).toBeGreaterThan(0);
  });

  it('returns boss: false for small blind', () => {
    resetState();
    startRun();
    state.currentBlindIndex = 0;
    const info = getCurrentBlindInfo();
    expect(info.boss).toBe(false);
  });

  it('returns boss: true for boss blind', () => {
    resetState();
    startRun();
    state.currentBlindIndex = 2;
    const info = getCurrentBlindInfo();
    expect(info.boss).toBe(true);
  });

  it('returns pendingBossEffect for boss blind', () => {
    resetState();
    startRun();
    state.currentBlindIndex = 2;
    state.pendingBossEffect = null;
    const info = getCurrentBlindInfo();
    expect(info.bossEffect).toBeTruthy();
  });

  it('returns null bossEffect for non-boss blind', () => {
    resetState();
    startRun();
    state.currentBlindIndex = 0;
    const info = getCurrentBlindInfo();
    expect(info.bossEffect).toBeNull();
  });

  it('returns BLIND_REWARD as reward', () => {
    resetState();
    startRun();
    const info = getCurrentBlindInfo();
    expect(info.reward).toBe(BLIND_REWARD);
  });
});

describe('confirmBlindSelection', () => {
  it('returns { blind: true }', () => {
    resetState();
    startRun();
    const result = confirmBlindSelection();
    expect(result.blind).toBe(true);
  });

  it('starts the blind (phase = blind)', () => {
    resetState();
    startRun();
    state.phase = 'blind_select';
    confirmBlindSelection();
    expect(state.phase).toBe('blind');
  });
});

describe('skipBlind', () => {
  it('increments currentBlindIndex', () => {
    resetState();
    startRun();
    const idx = state.currentBlindIndex;
    skipBlind();
    expect(state.currentBlindIndex).toBe(idx + 1);
  });

  it('returns blind_select for non-final blind', () => {
    resetState();
    startRun();
    const result = skipBlind();
    expect(result.blind).toBe(true);
  });

  it('returns victory when skipping last blind', () => {
    resetState();
    startRun();
    state.currentBlindIndex = BLINDS.length - 1;
    const result = skipBlind();
    expect(result.victory).toBe(true);
  });

  it('sets phase to blind_select for non-final blind', () => {
    resetState();
    startRun();
    skipBlind();
    expect(state.phase).toBe('blind_select');
  });

  it('sets phase to victory for last blind', () => {
    resetState();
    startRun();
    state.currentBlindIndex = BLINDS.length - 1;
    skipBlind();
    expect(state.phase).toBe('victory');
  });
});

describe('reorderJokers', () => {
  it('moves joker from index 0 to index 2', () => {
    resetState();
    state.jokers = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    reorderJokers(0, 2);
    expect(state.jokers[0].id).toBe('b');
    expect(state.jokers[1].id).toBe('c');
    expect(state.jokers[2].id).toBe('a');
  });

  it('moves joker from index 2 to index 0', () => {
    resetState();
    state.jokers = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    reorderJokers(2, 0);
    expect(state.jokers[0].id).toBe('c');
    expect(state.jokers[1].id).toBe('a');
    expect(state.jokers[2].id).toBe('b');
  });

  it('same index is no-op', () => {
    resetState();
    state.jokers = [{ id: 'a' }, { id: 'b' }];
    reorderJokers(1, 1);
    expect(state.jokers[0].id).toBe('a');
    expect(state.jokers[1].id).toBe('b');
  });
});

describe('sortHand', () => {
  it('sets sortMode', () => {
    resetState();
    startRun();
    sortHand('suit');
    expect(state.sortMode).toBe('suit');
  });

  it('clears selectedIndices', () => {
    resetState();
    startRun();
    state.selectedIndices = new Set([0, 1]);
    sortHand('rank');
    expect(state.selectedIndices.size).toBe(0);
  });
});

describe('getBlind', () => {
  it('returns current blind from BLINDS array', () => {
    resetState();
    startRun();
    const blind = getBlind();
    expect(blind).toBeTruthy();
    expect(blind.target).toBeGreaterThan(0);
  });
});

describe('getBossEffect', () => {
  it('returns null when no boss effect', () => {
    resetState();
    startRun();
    state.bossEffect = null;
    expect(getBossEffect()).toBeNull();
  });

  it('returns boss effect when set', () => {
    resetState();
    startRun();
    state.bossEffect = { id: 'test' };
    expect(getBossEffect().id).toBe('test');
  });
});

describe('enterInfiniteMode', () => {
  it('sets infiniteMode to true', () => {
    resetState();
    startRun();
    enterInfiniteMode();
    expect(state.infiniteMode).toBe(true);
  });

  it('increments currentCycle', () => {
    resetState();
    startRun();
    const cycleBefore = state.currentCycle;
    enterInfiniteMode();
    expect(state.currentCycle).toBe(cycleBefore + 1);
  });

  it('increments currentAnte', () => {
    resetState();
    startRun();
    const anteBefore = state.currentAnte;
    enterInfiniteMode();
    expect(state.currentAnte).toBe(anteBefore + 1);
  });

  it('pushes new blinds to BLINDS array', () => {
    resetState();
    startRun();
    const blindsBefore = BLINDS.length;
    enterInfiniteMode();
    expect(BLINDS.length).toBe(blindsBefore + 3);
  });

  it('sets currentBlindIndex to new blinds start', () => {
    resetState();
    startRun();
    enterInfiniteMode();
    expect(state.currentBlindIndex).toBe(BLINDS.length - 3);
  });
});

describe('doBuyItem / doSellJoker / doReroll', () => {
  it('doBuyItem delegates to buyItem', () => {
    resetState();
    startRun();
    state.money = 20;
    state.shopItems = [{ kind: 'joker', data: { id: 'test', cost: 5, effect: { type: 'test' } }, price: 5, sold: false }];
    const result = doBuyItem(0);
    expect(result.ok).toBe(true);
  });

  it('doSellJoker delegates to sellJoker', () => {
    resetState();
    state.jokers = [{ id: 'test', cost: 5, effect: { type: 'test' } }];
    const result = doSellJoker(0);
    expect(typeof result).toBe('number');
    expect(result).toBe(2);
  });

  it('doReroll delegates to rerollShop', () => {
    resetState();
    state.money = 20;
    state.rerollCost = 5;
    const result = doReroll();
    expect(result).toBe(true);
  });
});
