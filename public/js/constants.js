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
  { id: 'royalFlush', name: 'Royal Flush', chips: 100, mult: 8, tier: 9 },
  { id: 'fiveOfKind', name: 'Five of a Kind', chips: 120, mult: 10, tier: 10 },
  { id: 'flushFive', name: 'Flush Five', chips: 120, mult: 12, tier: 11 }
];

export const HAND_BY_ID = Object.fromEntries(POKER_HANDS.map(h => [h.id, h]));

export const ANTE_BASES = [300, 800, 2000, 5000, 11000, 20000, 35000, 50000];

export function generateBlinds() {
  const blinds = [];
  ANTE_BASES.forEach((base, ante) => {
    const n = ante + 1;
    blinds.push({ id: `ante${n}-small`, name: `Blind Pequeno`, target: base, boss: false, ante: n });
    blinds.push({ id: `ante${n}-big`, name: `Blind Grande`, target: Math.floor(base * 1.5), boss: false, ante: n });
    blinds.push({ id: `ante${n}-boss`, name: `Blind do Chefe`, target: base * 2, boss: true, ante: n });
  });
  return blinds;
}

export function generateInfiniteAnte(ante) {
  const base = Math.floor(100000 * Math.pow(2.5, ante - 9));
  return [
    { id: `ante${ante}-small`, name: 'Blind Pequeno', target: base, boss: false, ante: ante },
    { id: `ante${ante}-big`, name: 'Blind Grande', target: Math.floor(base * 1.5), boss: false, ante: ante },
    { id: `ante${ante}-boss`, name: 'Blind do Chefe', target: base * 2, boss: true, ante: ante }
  ];
}

export const BLINDS = generateBlinds();

export const BOSS_EFFECTS = [
  { id: 'blind', name: 'O Cego', desc: 'Naipes de ♥ não pontuam', applies: (card) => card.suit !== 'Hearts' },
  { id: 'fool', name: 'A Garra', desc: 'Cartas de figura (J/Q/K) não pontuam', applies: (card) => !['J', 'Q', 'K'].includes(card.rank) },
  { id: 'tyrant', name: 'O Tirano', desc: '-1 mão por rodada', extraHands: -1 },
  { id: 'merchant', name: 'O Mercador', desc: 'Reroll custa $10', rerollCost: 10 },
  { id: 'unlucky', name: 'O Azarado', desc: 'Descartes reduzidos em 1', extraDiscards: -1 },
  { id: 'collector', name: 'O Colecionador', desc: 'Máximo de Curingas reduzido para 3', maxJokers: 3 },
  { id: 'hoarder', name: 'O Acumulador', desc: 'Máximo de Consumíveis reduzido para 1', maxConsumables: 1 }
];

export const JOKER_DISPLAY_W = 71;
export const JOKER_DISPLAY_H = 95;

export const JOKERS = [
  { id: 'j21', name: 'O Acionista', rarity: 'uncommon', cost: 5, spriteIndex: 0,
    effect: { type: 'dividends' }, desc: '+$1 por ♦ restante no deck ao fim da rodada' },
  { id: 'j22', name: 'Fundo Imobiliário', rarity: 'uncommon', cost: 5, spriteIndex: 1,
    effect: { type: 'realEstate' }, desc: '+$3 por mão jogada com ≥1 ♦' },
  { id: 'j23', name: 'A Planilha', rarity: 'rare', cost: 8, spriteIndex: 2,
    effect: { type: 'matchBaseChips' }, desc: '+$15 se Fichas Base = mão anterior' },
  { id: 'j24', name: 'O Home Broker', rarity: 'rare', cost: 7, spriteIndex: 3,
    effect: { type: 'onReroll' }, desc: 'Reroll: 10% dobrar $, 5% perder tudo' },
  { id: 'j25', name: 'A Rota do Motorista', rarity: 'uncommon', cost: 6, spriteIndex: 4,
    effect: { type: 'shopPurchaseBonus', value: 3 }, desc: '+3 Mult permanente por compra na loja' },
  { id: 'j26', name: 'Orientado a Objetos', rarity: 'rare', cost: 8, spriteIndex: 5,
    effect: { type: 'sequentialHandBonus' }, desc: 'Mão igual seguida herda metade do Mult da anterior (soma, não multiplica)' },
  { id: 'j27', name: 'O Terminal', rarity: 'uncommon', cost: 6, spriteIndex: 6,
    effect: { type: 'allBlackHand' }, desc: 'Mão só com ♣/♠ → ×1.5 Mult' },
  { id: 'j28', name: 'Autômato Sophia', rarity: 'rare', cost: 7, spriteIndex: 7,
    effect: { type: 'suitMastery' }, desc: 'Naipe mais descartado vira mestre; +15 fichas por descarte na 1ª carta do naipe que pontuar em cada mão (reseta ao trocar de blind)' },
  { id: 'j29', name: 'Bug de Sintaxe', rarity: 'rare', cost: 8, spriteIndex: 8,
    effect: { type: 'destroyOnDiscard' }, desc: 'Destrói 1 carta a cada descarte; +0.5X Mult permanente' },
  { id: 'j30', name: 'Socket Antigo', rarity: 'uncommon', cost: 5, spriteIndex: 9,
    effect: { type: 'lowRankBonus' }, desc: 'Cartas 2/3/4 → +25 Fichas e +5 Mult' },
  { id: 'j31', name: 'Modo MAX', rarity: 'rare', cost: 9, spriteIndex: 10,
    effect: { type: 'perfectDiscard' }, desc: 'Descarte de 5 cartas como 1ª ação → ×3 Mult na 1ª mão' },
  { id: 'j32', name: 'O Frame Perfeito', rarity: 'uncommon', cost: 5, spriteIndex: 11,
    effect: { type: 'parityBonus' }, desc: 'Cartas pares → +10 Fichas; ímpares → +4 Mult' },
  { id: 'j33', name: 'Cancelamento de Animação', rarity: 'uncommon', cost: 6, spriteIndex: 12,
    effect: { type: 'extraSlot' }, desc: 'Permite selecionar 6ª carta (sem contar pôquer)' },
  { id: 'j34', name: 'Switch Magnético', rarity: 'rare', cost: 8, spriteIndex: 13,
    effect: { type: 'probabilityDouble' }, desc: 'Dobra chance de todos os efeitos de probabilidade' },
  { id: 'j35', name: 'Overclock', rarity: 'rare', cost: 10, spriteIndex: 14,
    effect: { type: 'overclock' }, desc: '+5X Mult, -0.5X por boss, destrói quando chegar a 0' },
  { id: 'j36', name: 'O Cavaleiro Vazio', rarity: 'uncommon', cost: 5, spriteIndex: 15,
    effect: { type: 'stoneBonus' }, desc: 'Cartas de Pedra → +30 Fichas e +10 Mult' },
  { id: 'j37', name: 'Ferrão Afiado', rarity: 'rare', cost: 8, spriteIndex: 16,
    effect: { type: 'spadeDoubleScore' }, desc: 'Cartas de ♠ pontuam 2× na mesma mão' },
  { id: 'j38', name: 'A Tecelã', rarity: 'uncommon', cost: 6, spriteIndex: 17,
    effect: { type: 'tarotHook' }, desc: 'Ao usar Tarô, cria carta com Aço no deck' },
  { id: 'j39', name: 'Coringa da Escala', rarity: 'rare', cost: 7, spriteIndex: 18,
    effect: { type: 'rankSequenceBonus' }, desc: 'Se K pontuou antes, Q → ×2 Mult' },
  { id: 'j40', name: 'Coringa Litorâneo', rarity: 'uncommon', cost: 5, spriteIndex: 19,
    effect: { type: 'suitCombo' }, desc: '♣ e ♦ juntos → +15 Fichas' },
  { id: 'j41', name: 'Inveja', rarity: 'rare', cost: 7, spriteIndex: 21,
    effect: { type: 'envy' }, desc: 'Copia o efeito do curinga à direita' },
  { id: 'j42', name: 'Inversão', rarity: 'rare', cost: 7, spriteIndex: 22,
    effect: { type: 'inversion' }, desc: 'Troca descartes com mãos' },
  { id: 'j43', name: 'Equilíbrio', rarity: 'uncommon', cost: 6, spriteIndex: 23,
    effect: { type: 'balance', mult: 25 }, desc: '-metade das mãos; +25 Mult' }
];

export const LEGENDARY_JOKERS = [
  { id: 'j44', name: 'Hatsune Miku', rarity: 'legendary', cost: 20, spriteIndex: 20,
    effect: { type: 'mikuMusicalDouble' }, desc: 'Cartas musicais reativadas (sintonia) dão o dobro de Fichas' }
];

export const TAROT_CARDS = [
  { id: 't1', name: 'O Mago', desc: '+$3', effect: 'money', value: 3 },
  { id: 't2', name: 'A Sacerdotisa', desc: '+$5', effect: 'money', value: 5 },
  { id: 't3', name: 'A Imperatriz', desc: '+1 mão por rodada (permanente)', effect: 'extraHand', value: 1 },
  { id: 't4', name: 'O Corvo', desc: 'Destrói 2 cartas da mão e ganha +$3', effect: 'destroyAndMoney', destroyCount: 2, value: 3, selectFromHand: true },
  { id: 't6', name: 'Lovely', desc: 'Converte 2 cartas da mão para ♥', effect: 'convertHandSuit', suit: 'Hearts', count: 2, selectFromHand: true },
  { id: 't8', name: 'Os Amantes', desc: 'Duplica 1 carta da mão para o deck', effect: 'duplicateFromHand', count: 1, selectFromHand: true },
  { id: 't9', name: 'A Tempestade', desc: 'Destrói 3 cartas da mão', effect: 'destroyFromHand', destroyCount: 3, selectFromHand: true },
  { id: 't10', name: 'A Roleta', desc: 'Ganha $3 a $12 aleatório', effect: 'randomMoney', min: 3, max: 12 },
  { id: 't11', name: 'O Martelo', desc: 'Aumenta rank de 2 cartas da mão em +1', effect: 'upgradeFromHand', count: 2, selectFromHand: true },
  { id: 't14', name: 'A Força', desc: 'Adiciona Ouro a 2 cartas da mão', effect: 'addGold', count: 2, selectFromHand: true },
  { id: 't15', name: 'A Justiça', desc: 'Adiciona Carta Musical a 2 cartas da mão', effect: 'addMusical', count: 2, selectFromHand: true },
  { id: 't16', name: 'Boca de Fumo', desc: 'Cria 2 cartas de Pedra no deck', effect: 'createStone', count: 2 },
  { id: 't17', name: 'O Negão', desc: 'Converte 2 cartas da mão para ♠', effect: 'convertHandSuit', suit: 'Spades', count: 2, selectFromHand: true },
  { id: 't18', name: 'Ganância', desc: 'Converte 2 cartas da mão para ♦', effect: 'convertHandSuit', suit: 'Diamonds', count: 2, selectFromHand: true }
];

export const SPECTRAL_CARDS = [];

export const PACK_TIERS = [
  { id: 'I', name: 'Fortuna I', picks: 1, options: 2, deckCards: 4, price: 3 },
  { id: 'II', name: 'Fortuna II', picks: 1, options: 2, deckCards: 5, price: 3 },
  { id: 'III', name: 'Fortuna III', picks: 1, options: 4, deckCards: 6, price: 5 },
  { id: 'IV', name: 'Fortuna IV', picks: 2, options: 4, deckCards: 6, price: 8 }
];

export const STARTING_MONEY = 4;
export const STARTING_HANDS = 4;
export const STARTING_DISCARDS = 3;
export const HAND_SIZE = 8;
export const MAX_JOKERS = 5;
export const MAX_CONSUMABLES = 2;
export const BASE_REROLL_COST = 5;
export const BLIND_REWARD = 5;
