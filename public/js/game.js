import { state, resetState } from './state.js';
import { BLINDS, STARTING_MONEY, STARTING_HANDS, STARTING_DISCARDS, HAND_SIZE, BASE_REROLL_COST, BLIND_REWARD, RANK_INDEX, SUITS, generateInfiniteAnte } from './constants.js';
import { createDeck, shuffle, drawCards, discardFromHand, recycleCards } from './deck.js';
import { evaluateBestHand } from './poker.js';
import { calculateScore, applyRoundEndRewards, calculateSintonia } from './scoring.js';
import { generateShopItems, rerollShop, buyItem, sellJoker } from './shop.js';
import { applyConsumable, pickBossEffect } from './consumables.js';

export function startRun() {
  resetState();
  state.startTime = Date.now();
  state.deck = createDeck();
  shuffle(state.deck);
  state.money = STARTING_MONEY;
  state.currentBlindIndex = 0;
  state.totalScore = 0;
  state.extraHandsPerRound = 0;
  startBlind();
}

export function startBlind() {
  const blind = BLINDS[state.currentBlindIndex];
  state.roundScore = 0;
  state.hands = STARTING_HANDS + state.extraHandsPerRound;
  state.discards = STARTING_DISCARDS;
  state.selectedIndices = new Set();
  state.rerollCost = BASE_REROLL_COST;

  state.previousHand = null;
  state.discardCountThisRound = 0;
  state.consumableUsedThisRound = false;
  state.playedCardsThisRound = [];
  state.playedHandTypes = [];
  state.shopPurchases = 0;
  state.firstActionThisRound = null;
  state.perfectDiscardTriggered = false;
  state.suitDiscardCounts = { Hearts: 0, Diamonds: 0, Clubs: 0, Spades: 0 };
  state.masteredSuit = null;
  state.jokers.forEach(j => {
    if (j.effect.type === 'suitMastery') {
      j.masteredSuit = null;
      j.suitBonus = 0;
      j.suitMasteryUsedInHand = false;
    }
  });
  state.handsPlayedThisRound = 0;
  state.handsPlayedWithDiamonds = 0;

  state.hasExtraSlot = state.jokers.some(j => j.effect.type === 'extraSlot');

  const ocJoker = state.jokers.find(j => j.effect.type === 'overclock');
  if (ocJoker) {
    if (state.overclockMultiplier <= 0) {
      const idx = state.jokers.indexOf(ocJoker);
      if (idx !== -1) state.jokers.splice(idx, 1);
    }
  }

  recycleCards(state);

  if (blind.boss) {
    state.bossEffect = state.pendingBossEffect || pickBossEffect();
    state.pendingBossEffect = null;
    if (state.bossEffect.extraHands) state.hands = Math.max(1, state.hands + state.bossEffect.extraHands);
    if (state.bossEffect.extraDiscards) state.discards = Math.max(1, state.discards + state.bossEffect.extraDiscards);
    if (state.bossEffect.rerollCost) state.rerollCost = state.bossEffect.rerollCost;
  } else {
    state.bossEffect = null;
    state.pendingBossEffect = null;
  }

  const hasInversion = state.jokers.some(j => j.effect.type === 'inversion');
  const balanceJoker = state.jokers.find(j => j.effect.type === 'balance');
  if (balanceJoker) {
    state.hands = Math.max(1, Math.floor(state.hands / 2));
  }
  if (hasInversion) {
    const temp = state.hands;
    state.hands = state.discards;
    state.discards = temp;
  }

  shuffle(state.deck);
  drawCards(state, HAND_SIZE);
  applySort();
  state.phase = 'blind';
}

export function playHand() {
  if (state.phase !== 'blind') return { ok: false, reason: 'Aguarde...' };
  if (state.selectedIndices.size === 0) return { ok: false, reason: 'Selecione pelo menos 1 carta' };
  if (state.hands <= 0) return { ok: false, reason: 'Sem mãos restantes' };

  if (state.firstActionThisRound === null) {
    state.firstActionThisRound = 'play';
  }

  const selectedArr = [...state.selectedIndices].sort((a, b) => a - b);
  const played = selectedArr.map(i => state.hand[i]);

  let handCards = played;
  if (state.hasExtraSlot && played.length === 6) {
    handCards = played.slice(0, 5);
  }

  const result = evaluateBestHand(handCards);

  const scoringIdx = new Set();
  handCards.forEach((c, i) => { if (result.cards.includes(c)) scoringIdx.add(i); });

  let cardAllowed = null;
  if (state.bossEffect && state.bossEffect.applies) {
    cardAllowed = state.bossEffect.applies;
  }

  state.jokers.forEach(j => {
    if (j.effect.type === 'suitMastery') {
      j.suitMasteryUsedInHand = false;
    }
  });

  const scoreResult = calculateScore(handCards, scoringIdx, result.type, state.jokers, {
    money: state.money,
    cardAllowed,
    previousHand: state.previousHand,
    perfectDiscardTriggered: state.perfectDiscardTriggered,
    handsPlayedThisRound: state.handsPlayedThisRound,
    overclockMultiplier: state.overclockMultiplier
  });

  state.roundScore += scoreResult.score;
  state.totalScore += scoreResult.score;
  if (scoreResult.moneyBonus) state.money += scoreResult.moneyBonus;
  state.perfectDiscardTriggered = false;
  state.hands -= 1;
  state.handsPlayedThisRound++;

  const sintoniaResults = calculateSintonia(handCards, state.jokers, {
    money: state.money,
    cardAllowed,
    previousHand: state.previousHand,
    perfectDiscardTriggered: state.perfectDiscardTriggered,
    handsPlayedThisRound: state.handsPlayedThisRound,
    overclockMultiplier: state.overclockMultiplier
  }, result.type.chips, result.type.mult);

  let totalSintoniaScore = 0;
  const allSintoniaEvents = [];
  for (const s of sintoniaResults) {
    totalSintoniaScore += s.score;
    if (s.grayIndices && s.grayIndices.length > 0) {
      allSintoniaEvents.push({ type: 'sintoniaGray', grayIndices: s.grayIndices, repIndex: s.repIndex });
    }
    allSintoniaEvents.push(...s.events);
  }
  state.roundScore += totalSintoniaScore;
  state.totalScore += totalSintoniaScore;

  const hasDiamonds = played.some(c => c.suit === 'Diamonds');
  if (hasDiamonds) {
    state.handsPlayedWithDiamonds = (state.handsPlayedWithDiamonds || 0) + 1;
  }

  state.playedCardsThisRound.push(...played);
  state.playedHandTypes.push(result.type.id);

  state.previousHand = {
    handType: result.type,
    cards: played,
    baseChips: result.type.chips,
    finalChips: scoreResult.chips,
    finalMult: scoreResult.mult,
    score: scoreResult.score
  };

  for (let i = selectedArr.length - 1; i >= 0; i--) {
    state.usedPile.push(state.hand[selectedArr[i]]);
    state.hand.splice(selectedArr[i], 1);
  }
  state.selectedIndices = new Set();

  state.lastPlayedHand = {
    handName: result.type.name,
    cards: played,
    scoringIdx,
    blocked: played.map(c => (cardAllowed ? !cardAllowed(c) : false)),
    baseChips: result.type.chips,
    baseMult: result.type.mult,
    score: scoreResult.score + totalSintoniaScore,
    chips: scoreResult.chips,
    mult: scoreResult.mult,
    events: [...scoreResult.events, ...allSintoniaEvents]
  };

  drawCards(state, HAND_SIZE - state.hand.length);
  applySort();

  const blind = BLINDS[state.currentBlindIndex];
  if (state.roundScore >= blind.target) {
    state.phase = 'transition';
    return { ok: true, blindCleared: true, scoreDetails: state.lastPlayedHand };
  }
  if (state.hands <= 0) {
    state.phase = 'gameover';
    return { ok: true, gameOver: true, scoreDetails: state.lastPlayedHand };
  }
  return { ok: true, scoreDetails: state.lastPlayedHand };
}

export function discardHand() {
  if (state.phase !== 'blind') return { ok: false, reason: 'Aguarde...' };
  if (state.selectedIndices.size === 0) return { ok: false, reason: 'Selecione pelo menos 1 carta' };
  if (state.discards <= 0) return { ok: false, reason: 'Sem descartes restantes' };

  if (state.firstActionThisRound === null) {
    state.firstActionThisRound = 'discard';
  }

  const indices = [...state.selectedIndices];
  const discardedCards = indices.map(i => state.hand[i]);

  discardedCards.forEach(card => {
    if (card.stone || !card.suit) return;
    state.suitDiscardCounts[card.suit]++;
  });

  const maxCount = Math.max(...Object.values(state.suitDiscardCounts));
  if (maxCount > 0) {
    const topSuits = Object.entries(state.suitDiscardCounts)
      .filter(([, count]) => count === maxCount)
      .map(([suit]) => suit);
    state.masteredSuit = topSuits[Math.floor(Math.random() * topSuits.length)];
    state.jokers.forEach(j => {
      if (j.effect.type === 'suitMastery') {
        j.masteredSuit = state.masteredSuit;
        j.suitBonus = maxCount * 15;
      }
    });
  }

  discardFromHand(state, indices);
  state.selectedIndices = new Set();
  state.discards -= 1;

  const bugJoker = state.jokers.find(j => j.effect.type === 'destroyOnDiscard');
  if (bugJoker && state.hand.length > 0) {
    const randomIdx = Math.floor(Math.random() * state.hand.length);
    const destroyed = state.hand.splice(randomIdx, 1)[0];
    state.usedPile.push(destroyed);
    state.destroyedByBug++;
    bugJoker.bonusXMult = (bugJoker.bonusXMult || 0) + 0.5;
  }

  if (state.firstActionThisRound === 'discard' && indices.length === 5) {
    state.perfectDiscardTriggered = true;
  }

  drawCards(state, HAND_SIZE - state.hand.length);
  applySort();
  return { ok: true };
}

export function advanceToNextBlind() {
  const blind = BLINDS[state.currentBlindIndex];
  if (!blind) return { error: 'no blind' };

  if (blind.boss) {
    state.totalBossesDefeated += 1;
    state.overclockMultiplier = Math.max(0, state.overclockMultiplier - 0.5);
  }

  const blindReward = BLIND_REWARD;
  const handsRemaining = state.hands;
  const jokerRewards = applyRoundEndRewards(state.jokers, state);
  const totalEarned = blindReward + handsRemaining + jokerRewards;

  state.cashoutBreakdown = {
    blindReward,
    handsRemaining,
    jokerRewards,
    totalEarned
  };

  state.currentBlindIndex += 1;

  if (state.currentBlindIndex >= BLINDS.length) {
    if (!state.infiniteMode) {
      state.phase = 'cycle_complete';
      return { cycleComplete: true, breakdown: state.cashoutBreakdown };
    }
    const newBlinds = generateInfiniteAnte(state.currentAnte);
    BLINDS.push(...newBlinds);
    state.currentAnte++;
  }

  state.phase = 'cashout';
  return { cashout: true, breakdown: state.cashoutBreakdown };
}

export function applyCashout() {
  const breakdown = state.cashoutBreakdown;
  if (!breakdown) return;
  state.money += breakdown.blindReward + breakdown.handsRemaining;
  state.cashoutBreakdown = null;
  state.phase = 'shop';
  state.shopItems = generateShopItems(state);
  return { shop: true };
}

export function doBuyItem(index) {
  return buyItem(state, index);
}

export function doSellJoker(index) {
  return sellJoker(state, index);
}

export function doReroll() {
  return rerollShop(state);
}

export function doUseConsumable(index, selectedCards) {
  return applyConsumable(state, index, selectedCards);
}

export function leaveShopAndContinue() {
  return { blind: true };
}

export function getCurrentBlindInfo() {
  const blind = BLINDS[state.currentBlindIndex];
  if (!state.pendingBossEffect) {
    state.pendingBossEffect = pickBossEffect();
  }
  const bossEffect = blind.boss ? state.pendingBossEffect : null;
  return {
    name: blind.name,
    target: blind.target,
    boss: blind.boss,
    bossEffect: bossEffect,
    reward: BLIND_REWARD
  };
}

export function confirmBlindSelection() {
  startBlind();
  return { blind: true };
}

export function skipBlind() {
  state.currentBlindIndex += 1;
  if (state.currentBlindIndex >= BLINDS.length) {
    state.phase = 'victory';
    return { victory: true };
  }
  state.phase = 'blind_select';
  return { blind: true };
}

export function reorderJokers(fromIndex, toIndex) {
  const [moved] = state.jokers.splice(fromIndex, 1);
  state.jokers.splice(toIndex, 0, moved);
}

const SUIT_ORDER = { Hearts: 0, Diamonds: 1, Clubs: 2, Spades: 3 };

function applySort() {
  if (state.sortMode === 'suit') {
    state.hand.sort((a, b) =>
      SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit] || RANK_INDEX[b.rank] - RANK_INDEX[a.rank]
    );
  } else {
    state.hand.sort((a, b) =>
      RANK_INDEX[a.rank] - RANK_INDEX[b.rank] || SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit]
    );
  }
}

export function sortHand(mode) {
  state.sortMode = mode;
  applySort();
  state.selectedIndices = new Set();
}

export function getBlind() {
  return BLINDS[state.currentBlindIndex];
}

export function getBossEffect() {
  return state.bossEffect;
}

export function enterInfiniteMode() {
  state.infiniteMode = true;
  state.currentCycle++;
  state.currentAnte++;
  const newBlinds = generateInfiniteAnte(state.currentAnte);
  BLINDS.push(...newBlinds);
  state.currentBlindIndex = BLINDS.length - 3;
}
