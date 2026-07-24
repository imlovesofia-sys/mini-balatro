export const state = {
  deck: [],
  hand: [],
  usedPile: [],
  jokers: [],
  consumables: [],
  currentBlindIndex: 0,
  bossEffect: null,
  money: 0,
  hands: 0,
  discards: 0,
  roundScore: 0,
  totalScore: 0,
  selectedIndices: new Set(),
  rerollCost: 5,
  extraHandsPerRound: 0,
  phase: 'menu',
  sortMode: 'rank',
  shopItems: [],
  lastPlayedHand: null,
  lastScoreDetails: null
};

export function resetState() {
  state.deck = [];
  state.hand = [];
  state.usedPile = [];
  state.jokers = [];
  state.consumables = [];
  state.currentBlindIndex = 0;
  state.bossEffect = null;
  state.money = 0;
  state.hands = 0;
  state.discards = 0;
  state.roundScore = 0;
  state.totalScore = 0;
  state.selectedIndices = new Set();
  state.rerollCost = 5;
  state.extraHandsPerRound = 0;
  state.phase = 'menu';
  state.sortMode = 'rank';
  state.shopItems = [];
  state.lastPlayedHand = null;
  state.lastScoreDetails = null;
}
