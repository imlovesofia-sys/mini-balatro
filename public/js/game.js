import { state, resetState } from './state.js';
import { BLINDS, STARTING_MONEY, STARTING_HANDS, STARTING_DISCARDS, HAND_SIZE, BASE_REROLL_COST, BLIND_REWARD, RANK_INDEX } from './constants.js';
import { createDeck, shuffle, drawCards, discardFromHand, recycleCards } from './deck.js';
import { evaluateBestHand } from './poker.js';
import { calculateScore, applyRoundEndRewards } from './scoring.js';
import { generateShopItems, rerollShop, buyItem } from './shop.js';
import { applyConsumable, pickBossEffect } from './consumables.js';

export function startRun() {
  resetState();
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

  recycleCards(state);

  if (blind.boss) {
    state.bossEffect = pickBossEffect();
    if (state.bossEffect.extraHands) state.hands += state.bossEffect.extraHands;
    if (state.bossEffect.extraDiscards) state.discards += state.bossEffect.extraDiscards;
    if (state.bossEffect.rerollCost) state.rerollCost = state.bossEffect.rerollCost;
  } else {
    state.bossEffect = null;
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

  const selectedArr = [...state.selectedIndices].sort((a, b) => a - b);
  const played = selectedArr.map(i => state.hand[i]);
  const result = evaluateBestHand(played);

  const scoringIdx = new Set();
  played.forEach((c, i) => { if (result.cards.includes(c)) scoringIdx.add(i); });

  let cardBlocked = null;
  if (state.bossEffect && state.bossEffect.applies) {
    cardBlocked = state.bossEffect.applies;
  }

  const scoreResult = calculateScore(played, scoringIdx, result.type, state.jokers, {
    money: state.money,
    cardBlocked
  });

  state.roundScore += scoreResult.score;
  state.totalScore += scoreResult.score;
  state.hands -= 1;

  for (let i = selectedArr.length - 1; i >= 0; i--) {
    state.usedPile.push(state.hand[selectedArr[i]]);
    state.hand.splice(selectedArr[i], 1);
  }
  state.selectedIndices = new Set();

  state.lastPlayedHand = {
    handName: result.type.name,
    cards: played,
    scoringIdx,
    blocked: played.map(c => (cardBlocked ? !cardBlocked(c) : false)),
    baseChips: result.type.chips,
    baseMult: result.type.mult,
    score: scoreResult.score,
    chips: scoreResult.chips,
    mult: scoreResult.mult,
    events: scoreResult.events
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

  const indices = [...state.selectedIndices];
  discardFromHand(state, indices);
  state.selectedIndices = new Set();
  state.discards -= 1;

  drawCards(state, HAND_SIZE - state.hand.length);
  applySort();
  return { ok: true };
}

export function advanceToNextBlind() {
  state.money += BLIND_REWARD;
  state.money += state.hands;
  const reward = applyRoundEndRewards(state.jokers, state);

  state.currentBlindIndex += 1;
  if (state.currentBlindIndex >= BLINDS.length) {
    state.phase = 'victory';
    return { victory: true };
  }

  state.phase = 'shop';
  state.shopItems = generateShopItems(state);
  return { shop: true, reward, bonusMoney: reward };
}

export function doBuyItem(index) {
  return buyItem(state, index);
}

export function doReroll() {
  return rerollShop(state);
}

export function doUseConsumable(index) {
  return applyConsumable(state, index);
}

export function leaveShopAndContinue() {
  startBlind();
  return { blind: true };
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
