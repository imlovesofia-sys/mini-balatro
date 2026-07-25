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
  lastScoreDetails: null,

  previousHand: null,
  discardCountThisRound: 0,
  consumableUsedThisRound: false,
  playedCardsThisRound: [],
  playedHandTypes: [],
  shopPurchases: 0,
  totalBossesDefeated: 0,
  firstActionThisRound: null,
  perfectDiscardTriggered: false,

  suitDiscardCounts: { Hearts: 0, Diamonds: 0, Clubs: 0, Spades: 0 },
  masteredSuit: null,
  destroyedByBug: 0,
  overclockMultiplier: 5,
  hasExtraSlot: false,
  handsPlayedWithDiamonds: 0
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

  state.previousHand = null;
  state.discardCountThisRound = 0;
  state.consumableUsedThisRound = false;
  state.playedCardsThisRound = [];
  state.playedHandTypes = [];
  state.shopPurchases = 0;
  state.totalBossesDefeated = 0;
  state.firstActionThisRound = null;
  state.perfectDiscardTriggered = false;

  state.suitDiscardCounts = { Hearts: 0, Diamonds: 0, Clubs: 0, Spades: 0 };
  state.masteredSuit = null;
  state.destroyedByBug = 0;
  state.overclockMultiplier = 5;
  state.hasExtraSlot = false;
  state.handsPlayedWithDiamonds = 0;
}
