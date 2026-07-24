export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const SUITS = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];

export const SUIT_SYMBOL = {
  Hearts: '♥',
  Diamonds: '♦',
  Clubs: '♣',
  Spades: '♠'
};

export const RANK_VALUE = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 10, 'Q': 10, 'K': 10, 'A': 11
};

export const RANK_INDEX = Object.fromEntries(RANKS.map((r, i) => [r, i]));

export const POKER_HANDS = [
  { id: 'high', name: 'Carta Alta', chips: 5, mult: 1, tier: 0 },
  { id: 'pair', name: 'Par', chips: 10, mult: 2, tier: 1 },
  { id: 'twoPair', name: 'Dois Pares', chips: 20, mult: 2, tier: 2 },
  { id: 'three', name: 'Trinca', chips: 30, mult: 3, tier: 3 },
  { id: 'straight', name: 'Sequência', chips: 30, mult: 4, tier: 4 },
  { id: 'flush', name: 'Flush', chips: 35, mult: 4, tier: 5 },
  { id: 'fullHouse', name: 'Full House', chips: 40, mult: 4, tier: 6 },
  { id: 'four', name: 'Quadra', chips: 60, mult: 7, tier: 7 },
  { id: 'straightFlush', name: 'Straight Flush', chips: 100, mult: 8, tier: 8 },
  { id: 'royalFlush', name: 'Royal Flush', chips: 100, mult: 8, tier: 9 }
];

export const HAND_BY_ID = Object.fromEntries(POKER_HANDS.map(h => [h.id, h]));

export const BLINDS = [
  { id: 'small', name: 'Blind Pequeno', target: 300, boss: false },
  { id: 'big', name: 'Blind Grande', target: 450, boss: false },
  { id: 'boss', name: 'Blind do Chefe', target: 600, boss: true }
];

export const BOSS_EFFECTS = [
  { id: 'blind', name: 'O Cego', desc: 'Naipes de ♥ não pontuam', applies: (card) => card.suit !== 'Hearts' },
  { id: 'fool', name: 'A Garra', desc: 'Cartas de figura (J/Q/K) não pontuam', applies: (card) => !['J', 'Q', 'K'].includes(card.rank) },
  { id: 'tyrant', name: 'O Tirano', desc: '-1 mão por rodada', extraHands: -1 },
  { id: 'merchant', name: 'O Mercador', desc: 'Reroll custa $10', rerollCost: 10 },
  { id: 'unlucky', name: 'O Azarado', desc: 'Descartes reduzidos em 1', extraDiscards: -1 }
];

export const JOKERS = [
  { id: 'j1', name: 'Curinga de Fogo', rarity: 'common', cost: 4, effect: { type: 'flatMult', value: 4 }, desc: '+4 Mult' },
  { id: 'j2', name: 'Curinga Gelado', rarity: 'common', cost: 4, effect: { type: 'flatChips', value: 30 }, desc: '+30 Fichas' },
  { id: 'j3', name: 'Curinga Ávido', rarity: 'uncommon', cost: 5, effect: { type: 'perSuit', suit: 'Hearts', value: 3, target: 'mult' }, desc: '+3 Mult por ♥ na mão' },
  { id: 'j4', name: 'Curinga Dourado', rarity: 'uncommon', cost: 5, effect: { type: 'roundEnd', reward: 4 }, desc: '+$4 ao fim da rodada' },
  { id: 'j5', name: 'Curinga Multiplicador', rarity: 'rare', cost: 8, effect: { type: 'xMult', value: 1.5 }, desc: '×1.5 Mult' },
  { id: 'j6', name: 'Curinga de Par', rarity: 'common', cost: 4, effect: { type: 'onHand', minTier: 1, bonus: { type: 'flatMult', value: 20 } }, desc: '+20 Mult se mão for Par ou melhor' },
  { id: 'j7', name: 'Curinga Estratégico', rarity: 'uncommon', cost: 6, effect: { type: 'perJoker', value: 3 }, desc: '+3 Mult por Curinga ativo' },
  { id: 'j8', name: 'Curinga Real', rarity: 'rare', cost: 8, effect: { type: 'onHand', minTier: 9, bonus: { type: 'xMult', value: 3 } }, desc: '×3 Mult em Royal Flush' },
  { id: 'j9', name: 'Curinga Econômico', rarity: 'uncommon', cost: 5, effect: { type: 'moneyPerDollar', value: 2 }, desc: '+2 Fichas por $1 em mãos' },
  { id: 'j10', name: 'Curinga Sortudo', rarity: 'uncommon', cost: 5, effect: { type: 'chance', chance: 0.25, bonus: { type: 'xMult', value: 2 } }, desc: '25% de chance de ×2 Mult' },
  { id: 'j11', name: 'Curinga de Ouro', rarity: 'common', cost: 5, effect: { type: 'flatMult', value: 6 }, desc: '+6 Mult' },
  { id: 'j12', name: 'Curinga Azul', rarity: 'common', cost: 4, effect: { type: 'flatChips', value: 50 }, desc: '+50 Fichas' },
  { id: 'j13', name: 'Curinga Rubi', rarity: 'uncommon', cost: 5, effect: { type: 'perSuit', suit: 'Diamonds', value: 4, target: 'mult' }, desc: '+4 Mult por ♦ na mão' },
  { id: 'j14', name: 'Curinga Ônix', rarity: 'uncommon', cost: 5, effect: { type: 'perSuit', suit: 'Spades', value: 4, target: 'chips' }, desc: '+4 Fichas por ♠ na mão' },
  { id: 'j15', name: 'Curinga Branco', rarity: 'common', cost: 4, effect: { type: 'onHand', minTier: 5, bonus: { type: 'flatChips', value: 40 } }, desc: '+40 Fichas em Flush ou melhor' },
  { id: 'j16', name: 'Curinga Místico', rarity: 'rare', cost: 8, effect: { type: 'onScore', threshold: 100, bonus: { type: 'flatMult', value: 15 } }, desc: '+15 Mult se pontuação antes dele > 100' },
  { id: 'j17', name: 'Curinga da Casa', rarity: 'rare', cost: 7, effect: { type: 'onHand', minTier: 6, bonus: { type: 'xMult', value: 2 } }, desc: '×2 Mult em Full House ou melhor' },
  { id: 'j18', name: 'Curinga da Sequência', rarity: 'uncommon', cost: 5, effect: { type: 'onHand', minTier: 4, bonus: { type: 'flatMult', value: 30 } }, desc: '+30 Mult em Sequência ou melhor' },
  { id: 'j19', name: 'Curinga da Quadra', rarity: 'uncommon', cost: 6, effect: { type: 'onHand', minTier: 7, bonus: { type: 'flatMult', value: 40 } }, desc: '+40 Mult em Quadra ou melhor' },
  { id: 'j20', name: 'Curinga Supremo', rarity: 'rare', cost: 10, effect: { type: 'xMult', value: 2 }, desc: '×2 Mult' }
];

export const TAROT_CARDS = [
  { id: 't1', name: 'O Mago', desc: '+$3', effect: 'money', value: 3 },
  { id: 't2', name: 'A Sacerdotisa', desc: '+$5', effect: 'money', value: 5 },
  { id: 't3', name: 'A Imperatriz', desc: '+1 mão por rodada (permanente)', effect: 'extraHand', value: 1 },
  { id: 't4', name: 'O Imperador', desc: 'Destrói 2 cartas do deck e ganha +$3', effect: 'destroyAndMoney', destroyCount: 2, value: 3 },
  { id: 't5', name: 'O Hierofante', desc: 'Converte 2 cartas aleatórias do deck para ♥', effect: 'convertSuit', suit: 'Hearts', count: 2 },
  { id: 't6', name: 'Os Amantes', desc: 'Duplica 1 carta aleatória do deck', effect: 'duplicateCard', count: 1 },
  { id: 't7', name: 'O Carro', desc: 'Destrói 3 cartas aleatórias do deck', effect: 'destroyAndMoney', destroyCount: 3, value: 0 },
  { id: 't8', name: 'A Justiça', desc: 'Converte 2 cartas aleatórias do deck para ♠', effect: 'convertSuit', suit: 'Spades', count: 2 },
  { id: 't9', name: 'Roda da Fortuna', desc: 'Ganha $3 a $12 aleatório', effect: 'randomMoney', min: 3, max: 12 },
  { id: 't10', name: 'A Força', desc: 'Aumenta rank de 2 cartas aleatórias em 1', effect: 'upgradeRank', count: 2 }
];

export const SPECTRAL_CARDS = [
  { id: 's1', name: 'Familiar', desc: 'Destrói 2 cartas do deck e cria 1 Curinga raro', effect: 'familiar', destroyCount: 2 },
  { id: 's2', name: 'Grim', desc: 'Destrói 1 carta e adiciona 2 As aleatórios', effect: 'grim', destroyCount: 1 },
  { id: 's3', name: 'Encantamento', desc: 'Destrói 1 carta e adiciona 3 números aleatórios do mesmo naipe', effect: 'incantation', destroyCount: 1 },
  { id: 's4', name: 'Sessão', desc: 'Cria 1 Tarô aleatório na bolsa', effect: 'seance' },
  { id: 's5', name: 'Hex', desc: 'Cria 1 Curinga aleatório (se tiver espaço)', effect: 'hex' },
  { id: 's6', name: 'Médium', desc: '+$10', effect: 'money', value: 10 }
];

export const STARTING_MONEY = 4;
export const STARTING_HANDS = 4;
export const STARTING_DISCARDS = 3;
export const HAND_SIZE = 8;
export const MAX_JOKERS = 5;
export const MAX_CONSUMABLES = 2;
export const BASE_REROLL_COST = 5;
export const BLIND_REWARD = 5;
