import { describe, it, expect } from './test-helper.js';
import { RANK_VALUE, POKER_HANDS, JOKERS } from '../public/js/constants.js';
import { calculateScore, calculateSintonia, applyRoundEndRewards } from '../public/js/scoring.js';

describe('calculateScore - Phase 1: Per-card scoring', () => {
  it('returns base chips*mult for empty playedCards', () => {
    const result = calculateScore([], new Set(), { id: 'high', chips: 10, mult: 2, tier: 0 }, [], {});
    expect(result.score).toBe(20);
  });

  it('returns base chips*mult for empty scoringIdx (all cards skipped)', () => {
    const result = calculateScore([{ rank: 'A', suit: 'Spades' }], new Set(), { id: 'high', chips: 10, mult: 2, tier: 0 }, [], {});
    expect(result.score).toBe(20);
  });

  it('stone card gives 50 chips regardless of rank', () => {
    const result = calculateScore([{ rank: '2', suit: 'Hearts', stone: true }], new Set([0]), { id: 'high', chips: 5, mult: 1, tier: 0 }, [], {});
    expect(result.chips).toBe(55);
  });

  it('card with unknown rank gives 0 chips', () => {
    const result = calculateScore([{ rank: 'X', suit: 'Hearts' }], new Set([0]), { id: 'high', chips: 5, mult: 1, tier: 0 }, [], {});
    expect(result.chips).toBe(5);
  });

  it('perSuit joker adds chips for matching suit', () => {
    const jokers = [{ name: 'Suit Joker', effect: { type: 'perSuit', suit: 'Hearts', target: 'chips', value: 10 } }];
    const result = calculateScore([{ rank: '2', suit: 'Hearts' }], new Set([0]), { id: 'high', chips: 5, mult: 1, tier: 0 }, jokers, {});
    expect(result.chips).toBe(17);
  });

  it('perSuit joker adds mult for matching suit', () => {
    const jokers = [{ name: 'Suit Joker', effect: { type: 'perSuit', suit: 'Hearts', target: 'mult', value: 3 } }];
    const result = calculateScore([{ rank: '2', suit: 'Hearts' }], new Set([0]), { id: 'high', chips: 5, mult: 1, tier: 0 }, jokers, {});
    expect(result.mult).toBe(4);
  });

  it('lowRankBonus adds 25 chips for rank <= 4 (2,3,4)', () => {
    const jokers = [{ name: 'Low Rank', effect: { type: 'lowRankBonus' } }];
    const result = calculateScore([{ rank: '2', suit: 'Hearts' }], new Set([0]), { id: 'high', chips: 5, mult: 1, tier: 0 }, jokers, {});
    expect(result.chips).toBe(32);
  });

  it('lowRankBonus adds 5 mult for rank <= 4', () => {
    const jokers = [{ name: 'Low Rank', effect: { type: 'lowRankBonus' } }];
    const result = calculateScore([{ rank: '3', suit: 'Hearts' }], new Set([0]), { id: 'high', chips: 5, mult: 1, tier: 0 }, jokers, {});
    expect(result.mult).toBe(6);
  });

  it('stoneBonus adds 30 chips for stone cards', () => {
    const jokers = [{ name: 'Stone Bonus', effect: { type: 'stoneBonus' } }];
    const result = calculateScore([{ rank: '2', suit: 'Hearts', stone: true }], new Set([0]), { id: 'high', chips: 5, mult: 1, tier: 0 }, jokers, {});
    expect(result.chips).toBe(85);
  });

  it('stoneBonus adds 10 mult for stone cards', () => {
    const jokers = [{ name: 'Stone Bonus', effect: { type: 'stoneBonus' } }];
    const result = calculateScore([{ rank: '2', suit: 'Hearts', stone: true }], new Set([0]), { id: 'high', chips: 5, mult: 1, tier: 0 }, jokers, {});
    expect(result.mult).toBe(11);
  });

  it('spadeDoubleScore adds rank_value chips for Spades', () => {
    const jokers = [{ name: 'Spade Double', effect: { type: 'spadeDoubleScore' } }];
    const result = calculateScore([{ rank: 'K', suit: 'Spades' }], new Set([0]), { id: 'high', chips: 5, mult: 1, tier: 0 }, jokers, {});
    expect(result.chips).toBe(25);
  });

  it('parityBonus adds 10 chips for even ranks', () => {
    const jokers = [{ name: 'Parity', effect: { type: 'parityBonus' } }];
    const result = calculateScore([{ rank: '2', suit: 'Hearts' }], new Set([0]), { id: 'high', chips: 5, mult: 1, tier: 0 }, jokers, {});
    expect(result.chips).toBe(17);
  });

  it('parityBonus adds 4 mult for odd ranks', () => {
    const jokers = [{ name: 'Parity', effect: { type: 'parityBonus' } }];
    const result = calculateScore([{ rank: '3', suit: 'Hearts' }], new Set([0]), { id: 'high', chips: 5, mult: 1, tier: 0 }, jokers, {});
    expect(result.mult).toBe(5);
  });

  it('cardBlocked by boss effect emits cardBlocked event', () => {
    const stateContext = { cardAllowed: (card) => card.suit !== 'Hearts' };
    const result = calculateScore([{ rank: 'A', suit: 'Hearts' }], new Set([0]), { id: 'high', chips: 5, mult: 1, tier: 0 }, [], stateContext);
    const blocked = result.events.filter(e => e.type === 'cardBlocked');
    expect(blocked.length).toBe(1);
  });

  it('suitMastery adds suitBonus chips for first card of mastered suit', () => {
    const jokers = [{ name: 'Mastery', effect: { type: 'suitMastery' }, masteredSuit: 'Hearts', suitBonus: 30, suitMasteryUsedInHand: false }];
    const result = calculateScore([{ rank: '2', suit: 'Hearts' }], new Set([0]), { id: 'high', chips: 5, mult: 1, tier: 0 }, jokers, {});
    expect(result.chips).toBe(37);
  });
});

describe('calculateScore - Phase 2: Global joker effects', () => {
  it('flatMult adds value to mult', () => {
    const jokers = [{ name: 'Flat Mult', effect: { type: 'flatMult', value: 5 } }];
    const result = calculateScore([], new Set(), { id: 'high', chips: 5, mult: 2, tier: 0 }, jokers, {});
    expect(result.mult).toBe(7);
    expect(result.score).toBe(35);
  });

  it('flatChips adds value to chips', () => {
    const jokers = [{ name: 'Flat Chips', effect: { type: 'flatChips', value: 20 } }];
    const result = calculateScore([], new Set(), { id: 'high', chips: 5, mult: 2, tier: 0 }, jokers, {});
    expect(result.chips).toBe(25);
    expect(result.score).toBe(50);
  });

  it('xMult multiplies mult by value', () => {
    const jokers = [{ name: 'X Mult', effect: { type: 'xMult', value: 3 } }];
    const result = calculateScore([], new Set(), { id: 'high', chips: 5, mult: 2, tier: 0 }, jokers, {});
    expect(result.mult).toBe(6);
    expect(result.score).toBe(30);
  });

  it('perJoker adds jokers.length * value to mult', () => {
    const jokers = [{ name: 'Per Joker', effect: { type: 'perJoker', value: 3 } }];
    const result = calculateScore([], new Set(), { id: 'high', chips: 5, mult: 2, tier: 0 }, jokers, {});
    expect(result.mult).toBe(5);
    expect(result.score).toBe(25);
  });

  it('moneyPerDollar adds money * value to chips', () => {
    const jokers = [{ name: 'Money Joker', effect: { type: 'moneyPerDollar', value: 1 } }];
    const result = calculateScore([], new Set(), { id: 'high', chips: 5, mult: 2, tier: 0 }, jokers, { money: 5 });
    expect(result.chips).toBe(10);
    expect(result.score).toBe(20);
  });

  it('onHand applies bonus when hand tier >= minTier', () => {
    const jokers = [{ name: 'On Hand', effect: { type: 'onHand', minTier: 3, bonus: { type: 'flatMult', value: 10 } } }];
    const result = calculateScore([], new Set(), { id: 'three', chips: 30, mult: 3, tier: 3 }, jokers, {});
    expect(result.mult).toBe(13);
    expect(result.score).toBe(390);
  });

  it('onHand does NOT apply when hand tier < minTier', () => {
    const jokers = [{ name: 'On Hand', effect: { type: 'onHand', minTier: 3, bonus: { type: 'flatMult', value: 10 } } }];
    const result = calculateScore([], new Set(), { id: 'pair', chips: 10, mult: 2, tier: 1 }, jokers, {});
    expect(result.mult).toBe(2);
    expect(result.score).toBe(20);
  });

  it('onScore applies when chips*mult > threshold', () => {
    const jokers = [{ name: 'On Score', effect: { type: 'onScore', threshold: 50, bonus: { type: 'flatMult', value: 10 } } }];
    const result = calculateScore([], new Set(), { id: 'high', chips: 10, mult: 6, tier: 0 }, jokers, {});
    expect(result.mult).toBe(16);
    expect(result.score).toBe(160);
  });

  it('onScore does NOT apply when below threshold', () => {
    const jokers = [{ name: 'On Score', effect: { type: 'onScore', threshold: 200, bonus: { type: 'flatMult', value: 10 } } }];
    const result = calculateScore([], new Set(), { id: 'high', chips: 10, mult: 3, tier: 0 }, jokers, {});
    expect(result.mult).toBe(3);
    expect(result.score).toBe(30);
  });

  it('chance applies with probability', () => {
    const origRandom = Math.random;
    Math.random = () => 0.1;
    try {
      const jokers = [{ name: 'Lucky', effect: { type: 'chance', chance: 0.5, bonus: { type: 'xMult', value: 2 } } }];
      const result = calculateScore([], new Set(), { id: 'high', chips: 5, mult: 1, tier: 0 }, jokers, {});
      expect(result.mult).toBe(2);
      expect(result.score).toBe(10);
    } finally {
      Math.random = origRandom;
    }
  });

  it('allBlackHand multiplies mult by 1.5 when all clubs/spades', () => {
    const jokers = [{ name: 'All Black', effect: { type: 'allBlackHand' } }];
    const cards = [{ rank: '2', suit: 'Clubs' }, { rank: '3', suit: 'Spades' }];
    const result = calculateScore(cards, new Set([0, 1]), { id: 'high', chips: 5, mult: 2, tier: 0 }, jokers, {});
    expect(result.mult).toBe(3);
    expect(result.score).toBe(30);
  });

  it('allBlackHand does NOT apply with mixed suits', () => {
    const jokers = [{ name: 'All Black', effect: { type: 'allBlackHand' } }];
    const cards = [{ rank: '2', suit: 'Clubs' }, { rank: '3', suit: 'Hearts' }];
    const result = calculateScore(cards, new Set([0, 1]), { id: 'high', chips: 5, mult: 2, tier: 0 }, jokers, {});
    expect(result.mult).toBe(2);
    expect(result.score).toBe(20);
  });

  it('suitCombo adds 15 chips when clubs+diamonds present', () => {
    const jokers = [{ name: 'Suit Combo', effect: { type: 'suitCombo' } }];
    const cards = [{ rank: '2', suit: 'Clubs' }, { rank: '3', suit: 'Diamonds' }];
    const result = calculateScore(cards, new Set([0, 1]), { id: 'high', chips: 5, mult: 2, tier: 0 }, jokers, {});
    expect(result.chips).toBe(25);
    expect(result.score).toBe(50);
  });

  it('overclock multiplies mult by overclockMultiplier', () => {
    const jokers = [{ name: 'Overclock', effect: { type: 'overclock' } }];
    const result = calculateScore([], new Set(), { id: 'high', chips: 5, mult: 2, tier: 0 }, jokers, { overclockMultiplier: 5 });
    expect(result.mult).toBe(10);
    expect(result.score).toBe(50);
  });

  it('perfectDiscard multiplies mult by 3 when triggered', () => {
    const jokers = [{ name: 'Perfect Discard', effect: { type: 'perfectDiscard' } }];
    const result = calculateScore([], new Set(), { id: 'high', chips: 5, mult: 2, tier: 0 }, jokers, { perfectDiscardTriggered: true, handsPlayedThisRound: 0 });
    expect(result.mult).toBe(6);
    expect(result.score).toBe(30);
  });
});

describe('calculateScore - Phase 3: Envy effects', () => {
  it('envy copies flatMult from right joker', () => {
    const jokers = [
      { name: 'Envy', effect: { type: 'envy' } },
      { name: 'Flat Mult', effect: { type: 'flatMult', value: 5 } }
    ];
    const result = calculateScore([{ rank: '2', suit: 'Hearts' }], new Set([0]), { id: 'high', chips: 5, mult: 1, tier: 0 }, jokers, {});
    expect(result.mult).toBe(11);
  });

  it('envy copies flatChips from right joker', () => {
    const jokers = [
      { name: 'Envy', effect: { type: 'envy' } },
      { name: 'Flat Chips', effect: { type: 'flatChips', value: 20 } }
    ];
    const result = calculateScore([{ rank: '2', suit: 'Hearts' }], new Set([0]), { id: 'high', chips: 5, mult: 1, tier: 0 }, jokers, {});
    expect(result.chips).toBe(47);
  });

  it('envy copies xMult from right joker', () => {
    const jokers = [
      { name: 'Envy', effect: { type: 'envy' } },
      { name: 'X Mult', effect: { type: 'xMult', value: 3 } }
    ];
    const result = calculateScore([{ rank: '2', suit: 'Hearts' }], new Set([0]), { id: 'high', chips: 5, mult: 1, tier: 0 }, jokers, {});
    expect(result.mult).toBe(9);
  });

  it('envy as last joker (no right) does nothing', () => {
    const jokers = [{ name: 'Envy', effect: { type: 'envy' } }];
    const result = calculateScore([{ rank: '2', suit: 'Hearts' }], new Set([0]), { id: 'high', chips: 5, mult: 1, tier: 0 }, jokers, {});
    expect(result.chips).toBe(7);
    expect(result.mult).toBe(1);
    expect(result.score).toBe(7);
  });

  it('two consecutive envies chain copies', () => {
    const jokers = [
      { name: 'Envy1', effect: { type: 'envy' } },
      { name: 'Envy2', effect: { type: 'envy' } },
      { name: 'Flat Mult', effect: { type: 'flatMult', value: 5 } }
    ];
    const result = calculateScore([{ rank: '2', suit: 'Hearts' }], new Set([0]), { id: 'high', chips: 5, mult: 1, tier: 0 }, jokers, {});
    expect(result.mult).toBe(11);
  });

  it('envy copies overclock from right joker', () => {
    const jokers = [
      { name: 'Envy', effect: { type: 'envy' } },
      { name: 'Overclock', effect: { type: 'overclock' } }
    ];
    const result = calculateScore([{ rank: '2', suit: 'Hearts' }], new Set([0]), { id: 'high', chips: 5, mult: 1, tier: 0 }, jokers, { overclockMultiplier: 5 });
    expect(result.mult).toBe(25);
  });

  it('envy copies matchBaseChips from right joker', () => {
    const jokers = [
      { name: 'Envy', effect: { type: 'envy' } },
      { name: 'Match', effect: { type: 'matchBaseChips' } }
    ];
    const result = calculateScore([{ rank: '2', suit: 'Hearts' }], new Set([0]), { id: 'high', chips: 10, mult: 1, tier: 0 }, jokers, { previousHand: { baseChips: 10 } });
    expect(result.moneyBonus).toBe(30);
  });

  it('sequentialHandBonus applies when same hand type as previous', () => {
    const jokers = [{ name: 'Sequential', effect: { type: 'sequentialHandBonus' } }];
    const stateContext = { previousHand: { handType: { id: 'pair' }, finalMult: 3 }, handsPlayedThisRound: 1 };
    const result = calculateScore([{ rank: '2', suit: 'Hearts' }], new Set([0]), { id: 'pair', chips: 10, mult: 2, tier: 1 }, jokers, stateContext);
    expect(result.mult).toBe(3); // 2 + floor(3/2) = 2 + 1 = 3
    expect(result.score).toBe(36); // 12 * 3
  });

  it('sequentialHandBonus requires handsPlayedThisRound === 1', () => {
    const jokers = [{ name: 'Sequential', effect: { type: 'sequentialHandBonus' } }];
    const stateContext = { previousHand: { handType: { id: 'pair' }, finalMult: 3 }, handsPlayedThisRound: 0 };
    const result = calculateScore([{ rank: '2', suit: 'Hearts' }], new Set([0]), { id: 'pair', chips: 10, mult: 2, tier: 1 }, jokers, stateContext);
    expect(result.mult).toBe(2);
    expect(result.score).toBe(24);
  });

  it('matchBaseChips adds $15 when base chips match', () => {
    const jokers = [{ name: 'Match', effect: { type: 'matchBaseChips' } }];
    const result = calculateScore([], new Set(), { id: 'high', chips: 10, mult: 1, tier: 0 }, jokers, { previousHand: { baseChips: 10 } });
    expect(result.moneyBonus).toBe(15);
  });
});

describe('calculateScore - Phase 4: Final calculation', () => {
  it('finalScore is Math.floor(chips * mult)', () => {
    const jokers = [{ name: 'X Mult', effect: { type: 'xMult', value: 1.5 } }];
    const result = calculateScore([], new Set(), { id: 'high', chips: 5, mult: 3, tier: 0 }, jokers, {});
    expect(result.score).toBe(22);
  });

  it('score with large joker array doesn\'t overflow', () => {
    const jokers = [];
    for (let i = 0; i < 50; i++) {
      jokers.push({ name: 'Flat Mult ' + i, effect: { type: 'flatMult', value: 1 } });
    }
    const result = calculateScore([{ rank: '2', suit: 'Hearts' }], new Set([0]), { id: 'high', chips: 5, mult: 1, tier: 0 }, jokers, {});
    expect(result.mult).toBe(51);
    expect(result.score).toBe(357);
  });

  it('score with zero chips returns 0', () => {
    const result = calculateScore([], new Set(), { id: 'high', chips: 0, mult: 5, tier: 0 }, [], {});
    expect(result.score).toBe(0);
  });

  it('score with zero mult returns 0', () => {
    const result = calculateScore([], new Set(), { id: 'high', chips: 5, mult: 0, tier: 0 }, [], {});
    expect(result.score).toBe(0);
  });

  it('score accumulates across all phases correctly', () => {
    const jokers = [{ name: 'Flat Mult', effect: { type: 'flatMult', value: 3 } }];
    const result = calculateScore([{ rank: 'A', suit: 'Spades' }], new Set([0]), { id: 'high', chips: 10, mult: 2, tier: 0 }, jokers, {});
    expect(result.chips).toBe(21);
    expect(result.mult).toBe(5);
    expect(result.score).toBe(105);
  });
});

describe('calculateSintonia', () => {
  it('returns empty array for no musical cards', () => {
    const result = calculateSintonia([{ rank: 'A', suit: 'Spades', musical: false }], [], {}, 5, 1);
    expect(result).toEqual([]);
  });

  it('returns empty array for single musical card (no groups)', () => {
    const result = calculateSintonia([{ rank: 'A', suit: 'Spades', musical: true }], [], {}, 5, 1);
    expect(result).toEqual([]);
  });

  it('generates repetitions for group of 2+ musical cards', () => {
    const cards = [
      { rank: '2', suit: 'Hearts', musical: true },
      { rank: '2', suit: 'Hearts', musical: true }
    ];
    const result = calculateSintonia(cards, [], {}, 5, 1);
    expect(result.length).toBeGreaterThan(0);
  });

  it('group of 2 produces 1 repetition', () => {
    const cards = [
      { rank: '2', suit: 'Hearts', musical: true },
      { rank: '2', suit: 'Hearts', musical: true }
    ];
    const result = calculateSintonia(cards, [], {}, 5, 1);
    expect(result.length).toBe(1);
  });

  it('group of 3 produces 2 repetitions', () => {
    const cards = [
      { rank: '2', suit: 'Hearts', musical: true },
      { rank: '2', suit: 'Hearts', musical: true },
      { rank: '2', suit: 'Hearts', musical: true }
    ];
    const result = calculateSintonia(cards, [], {}, 5, 1);
    expect(result.length).toBe(2);
  });

  it('blocks musical card when cardAllowed returns false', () => {
    const cards = [
      { rank: '2', suit: 'Hearts', musical: true },
      { rank: '2', suit: 'Hearts', musical: true }
    ];
    const result = calculateSintonia(cards, [], { cardAllowed: () => false }, 5, 1);
    expect(result).toEqual([]);
  });

  it('mikuMusicalDouble doubles chip value', () => {
    const cards = [
      { rank: '2', suit: 'Hearts', musical: true },
      { rank: '2', suit: 'Hearts', musical: true }
    ];
    const jokers = [{ name: 'Miku', effect: { type: 'mikuMusicalDouble' } }];
    const result = calculateSintonia(cards, jokers, {}, 5, 1);
    expect(result.length).toBe(1);
    expect(result[0].chips).toBe(9);
  });

  it('overclock applies to sintonia score', () => {
    const cards = [
      { rank: '2', suit: 'Hearts', musical: true },
      { rank: '2', suit: 'Hearts', musical: true }
    ];
    const jokers = [{ name: 'Overclock', effect: { type: 'overclock' } }];
    const result = calculateSintonia(cards, jokers, { overclockMultiplier: 5 }, 5, 1);
    expect(result.length).toBe(1);
    expect(result[0].mult).toBe(5);
    expect(result[0].score).toBe(35);
  });
});

describe('applyRoundEndRewards', () => {
  it('roundEnd joker adds reward to money', () => {
    const jokers = [{ name: 'Round End', effect: { type: 'roundEnd', reward: 5 } }];
    const stateContext = { money: 10, hand: [], deck: [] };
    const result = applyRoundEndRewards(jokers, stateContext);
    expect(result).toBe(5);
    expect(stateContext.money).toBe(15);
  });

  it('dividends joker adds diamond count to money', () => {
    const jokers = [{ name: 'Dividends', effect: { type: 'dividends' } }];
    const stateContext = { money: 10, hand: [], deck: [{ suit: 'Hearts' }, { suit: 'Diamonds' }, { suit: 'Diamonds' }] };
    const result = applyRoundEndRewards(jokers, stateContext);
    expect(result).toBe(2);
    expect(stateContext.money).toBe(12);
  });

  it('realEstate joker adds handsPlayedWithDiamonds * 3', () => {
    const jokers = [{ name: 'Real Estate', effect: { type: 'realEstate' } }];
    const stateContext = { money: 10, hand: [], deck: [], handsPlayedWithDiamonds: 2 };
    const result = applyRoundEndRewards(jokers, stateContext);
    expect(result).toBe(6);
    expect(stateContext.money).toBe(16);
  });

  it('shopPurchaseBonus joker adds shopPurchases * 2', () => {
    const jokers = [{ name: 'Shop Bonus', effect: { type: 'shopPurchaseBonus' } }];
    const stateContext = { money: 10, hand: [], deck: [], shopPurchases: 3 };
    const result = applyRoundEndRewards(jokers, stateContext);
    expect(result).toBe(6);
    expect(stateContext.money).toBe(16);
  });

  it('gold cards in hand add 3 each', () => {
    const jokers = [];
    const stateContext = { money: 10, hand: [{ gold: true }, { gold: true }, { gold: false }], deck: [] };
    const result = applyRoundEndRewards(jokers, stateContext);
    expect(result).toBe(6);
    expect(stateContext.money).toBe(16);
  });

  it('returns total money earned', () => {
    const jokers = [{ name: 'Round End', effect: { type: 'roundEnd', reward: 5 } }];
    const stateContext = { money: 10, hand: [{ gold: true }], deck: [] };
    const result = applyRoundEndRewards(jokers, stateContext);
    expect(result).toBe(8);
    expect(stateContext.money).toBe(18);
  });

  it('handles empty joker array', () => {
    const stateContext = { money: 10, hand: [], deck: [] };
    const result = applyRoundEndRewards([], stateContext);
    expect(result).toBe(0);
    expect(stateContext.money).toBe(10);
  });
});
