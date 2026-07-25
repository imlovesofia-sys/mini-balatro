import { RANKS, SUITS } from './constants.js';

export function createDeck() {
  const deck = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function drawCards(state, count) {
  const drawn = [];
  for (let i = 0; i < count; i++) {
    if (state.deck.length === 0) break;
    const card = state.deck.pop();
    card._new = true;
    drawn.push(card);
  }
  state.hand.push(...drawn);
  return drawn;
}

export function clearNewFlags(hand) {
  for (const card of hand) {
    card._new = false;
  }
}

export function discardFromHand(state, indices) {
  const discarded = [];
  const sorted = [...indices].sort((a, b) => b - a);
  for (const idx of sorted) {
    discarded.push(state.hand[idx]);
    state.usedPile.push(state.hand[idx]);
    state.hand.splice(idx, 1);
  }
  return discarded;
}

export function recycleCards(state) {
  state.deck.push(...state.hand.splice(0));
  state.deck.push(...state.usedPile.splice(0));
}
