import { POKER_HANDS, RANK_INDEX } from './constants.js';

function rankIdx(r) { return RANK_INDEX[r]; }

function countBy(arr, keyFn) {
  const map = new Map();
  for (const x of arr) {
    const k = keyFn(x);
    map.set(k, (map.get(k) || 0) + 1);
  }
  return map;
}

function evaluateFive(cards) {
  if (cards.length === 0) return { type: POKER_HANDS[0], cards: [] };

  const rankCounts = countBy(cards, c => c.rank);
  const suitCounts = countBy(cards, c => c.suit);
  const sorted = [...cards].sort((a, b) => rankIdx(a.rank) - rankIdx(b.rank));
  const ranks = sorted.map(c => c.rank);

  const isFlush = cards.length >= 5 && Math.max(...suitCounts.values()) >= 5;

  const isStraight = (() => {
    if (cards.length < 5) return false;
    const indices = [...new Set(ranks)].map(rankIdx).sort((a, b) => a - b);
    if (indices.length < 5) return false;
    const hasWheel = indices.includes(0) && indices.includes(1) && indices.includes(2) && indices.includes(3) && indices.includes(12);
    if (hasWheel) return true;
    for (let i = 0; i <= indices.length - 5; i++) {
      if (indices[i + 4] - indices[i] === 4) return true;
    }
    return false;
  })();

  const counts = [...rankCounts.values()].sort((a, b) => b - a);

  const topRanks = [...rankCounts.entries()].sort((a, b) => b[1] - a[1]);

  if (counts[0] === 5 && isFlush) {
    return { type: POKER_HANDS.find(h => h.id === 'flushFive'), cards: sorted };
  }
  if (counts[0] === 5) {
    return { type: POKER_HANDS.find(h => h.id === 'fiveOfKind'), cards: sorted };
  }
  if (cards.length >= 5 && isFlush && isStraight) {
    const highCards = sorted.slice(-5);
    const royalRanks = new Set(['10', 'J', 'Q', 'K', 'A']);
    const isRoyal = highCards.length === 5 && highCards.every(c => royalRanks.has(c.rank))
      && new Set(highCards.map(c => c.rank)).size === 5;
    return {
      type: isRoyal ? POKER_HANDS.find(h => h.id === 'royalFlush') : POKER_HANDS.find(h => h.id === 'straightFlush'),
      cards: highCards
    };
  }
  if (counts[0] === 4) {
    const fourRank = topRanks[0][0];
    return { type: POKER_HANDS.find(h => h.id === 'four'), cards: cards.filter(c => c.rank === fourRank) };
  }
  if (counts[0] === 3 && counts[1] === 2) {
    const threeRank = topRanks[0][0];
    const pairRank = topRanks[1][0];
    return { type: POKER_HANDS.find(h => h.id === 'fullHouse'), cards: cards.filter(c => c.rank === threeRank || c.rank === pairRank) };
  }
  if (isFlush) {
    return { type: POKER_HANDS.find(h => h.id === 'flush'), cards: sorted.slice(-5) };
  }
  if (isStraight) {
    return { type: POKER_HANDS.find(h => h.id === 'straight'), cards: sorted.slice(-5) };
  }
  if (counts[0] === 3) {
    const threeRank = topRanks[0][0];
    return { type: POKER_HANDS.find(h => h.id === 'three'), cards: cards.filter(c => c.rank === threeRank) };
  }
  if (counts[0] === 2 && counts[1] === 2) {
    const pair1 = topRanks[0][0];
    const pair2 = topRanks[1][0];
    return { type: POKER_HANDS.find(h => h.id === 'twoPair'), cards: cards.filter(c => c.rank === pair1 || c.rank === pair2) };
  }
  if (counts[0] === 2) {
    const pairRank = topRanks[0][0];
    return { type: POKER_HANDS.find(h => h.id === 'pair'), cards: cards.filter(c => c.rank === pairRank) };
  }
  return { type: POKER_HANDS.find(h => h.id === 'high'), cards: [sorted[sorted.length - 1]] };
}

export function evaluateBestHand(cards) {
  if (cards.length === 0) return { type: POKER_HANDS[0], cards: [] };
  if (cards.length <= 5) return evaluateFive(cards);

  const combos = combinations(cards, 5);
  let best = null;
  for (const combo of combos) {
    const result = evaluateFive(combo);
    if (!best || result.type.tier > best.type.tier) {
      best = result;
      if (best.type.id === 'flushFive') break;
    }
  }
  return best;
}

function combinations(arr, k) {
  const result = [];
  const recurse = (start, chosen) => {
    if (chosen.length === k) { result.push([...chosen]); return; }
    for (let i = start; i < arr.length; i++) {
      chosen.push(arr[i]);
      recurse(i + 1, chosen);
      chosen.pop();
    }
  };
  recurse(0, []);
  return result;
}
