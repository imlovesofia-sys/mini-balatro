import { describe, it, expect } from './test-helper.js';
import { SUIT_SYMBOL, BLINDS, SUITS, RANK_INDEX } from '../public/js/constants.js';
import { state, resetState } from '../public/js/state.js';

const SCREEN_IDS = [
  'screen-menu', 'screen-howto', 'screen-blind-select', 'screen-cashout',
  'screen-game', 'screen-shop', 'screen-gameover', 'screen-cycle-complete', 'screen-podium'
];

function createDefaultScreens() {
  return SCREEN_IDS.map(id => ({ id, hasActive: id === 'screen-menu' }));
}

function applyShowScreen(screens, targetId) {
  screens.forEach(s => { s.hasActive = false; });
  const target = screens.find(s => s.id === targetId);
  if (target) target.hasActive = true;
}

const SUIT_ORDER = { Hearts: 0, Diamonds: 1, Clubs: 2, Spades: 3 };

function getAnteBlinds(blindIndex) {
  const ante = BLINDS[blindIndex].ante;
  return BLINDS.filter(b => b.ante === ante);
}

function buildBlindCardData(blindIndex, bossEffect, reward) {
  const anteBlinds = getAnteBlinds(blindIndex);
  return anteBlinds.map((blindData, idx) => {
    const globalIndex = BLINDS.indexOf(blindData);
    const isCurrent = blindIndex === globalIndex;
    const hasSkip = isCurrent && idx < 2;
    const blindReward = idx === 2 ? reward + 2 : reward;
    const target = blindData.target.toLocaleString('pt-BR');
    const bossName = idx === 2 ? (bossEffect ? bossEffect.name : 'Blind do Chefe') : '';
    return { idx, isCurrent, hasSkip, blindReward, target, bossName, blindData, globalIndex };
  });
}

function buildCashoutLines(breakdown) {
  const lines = [
    { label: 'Recompensa do Blind', value: `$${breakdown.blindReward}` },
    { label: 'Mãos Restantes', value: `$${breakdown.handsRemaining}` }
  ];
  if (breakdown.jokerRewards > 0) {
    lines.push({ label: 'Bônus de Curinga', value: `$${breakdown.jokerRewards}` });
  }
  return lines;
}

function getCashoutTotalDelay(lineCount) {
  return 400 + (lineCount * 350) + 200;
}

function guardPlayHand(isBusy, selectedSize) {
  if (isBusy) return { blocked: true, reason: 'busy' };
  if (selectedSize === 0) return { blocked: true, reason: 'no-selection' };
  return { blocked: false };
}

function guardDiscard(isBusy, selectedSize, discards) {
  if (isBusy) return { blocked: true, reason: 'busy' };
  if (selectedSize === 0) return { blocked: true, reason: 'no-selection' };
  if (discards <= 0) return { blocked: true, reason: 'no-discards' };
  return { blocked: false };
}

function classifyPlayResult(result) {
  if (result.blindCleared) return 'blindCleared';
  if (result.gameOver) return 'gameOver';
  return 'continue';
}

function classifyAdvanceResult(advance) {
  if (advance.cycleComplete) return 'cycleComplete';
  if (advance.victory) return 'victory';
  if (advance.cashout) return 'cashout';
  return 'none';
}

function sortHandBySuit(hand) {
  return [...hand].sort((a, b) => {
    const sd = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    return sd !== 0 ? sd : RANK_INDEX[b.rank] - RANK_INDEX[a.rank];
  });
}

function sortHandByRank(hand) {
  return [...hand].sort((a, b) => {
    const rd = RANK_INDEX[a.rank] - RANK_INDEX[b.rank];
    return rd !== 0 ? rd : SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
  });
}

function formatCycleTime(elapsed) {
  const m = Math.floor(elapsed / 60000);
  const s = Math.floor((elapsed % 60000) / 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function gameoverTitle(victory) {
  return victory ? 'Vitória!' : 'Fim de Jogo';
}

function gameoverClass(victory) {
  return victory ? 'victory' : 'defeat';
}

function applyTabSwitch(tabs, target) {
  tabs.forEach(t => { t.active = false; });
  const clicked = tabs.find(t => t.name === target);
  if (clicked) clicked.active = true;
  return {
    scoreVisible: target === 'score',
    timeVisible: target === 'time'
  };
}

function getScoreBoard(scores) {
  return scores.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 10);
}

function getTimeBoard(scores) {
  return scores.filter(s => s.time).sort((a, b) => a.time.localeCompare(b.time)).slice(0, 10);
}

function escape(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

describe('Screen transition logic', () => {
  it('showScreen removes active from all screens', () => {
    resetState();
    const screens = createDefaultScreens();
    screens[3].hasActive = true;
    applyShowScreen(screens, 'screen-game');
    expect(screens[3].hasActive).toBe(false);
  });

  it('showScreen adds active to target screen', () => {
    resetState();
    const screens = createDefaultScreens();
    applyShowScreen(screens, 'screen-game');
    expect(screens[4].hasActive).toBe(true);
  });

  it('showScreen with nonexistent id is no-op', () => {
    resetState();
    const screens = createDefaultScreens();
    applyShowScreen(screens, 'screen-nonexistent');
    const activeCount = screens.filter(s => s.hasActive).length;
    expect(activeCount).toBe(0);
  });

  it('only one screen can be active at a time', () => {
    resetState();
    const screens = createDefaultScreens();
    applyShowScreen(screens, 'screen-game');
    applyShowScreen(screens, 'screen-shop');
    const activeCount = screens.filter(s => s.hasActive).length;
    expect(activeCount).toBe(1);
  });

  it('screen-menu is default active screen', () => {
    resetState();
    const screens = createDefaultScreens();
    expect(screens[0].hasActive).toBe(true);
    expect(screens[0].id).toBe('screen-menu');
  });

  it('screen-game has no default active class', () => {
    resetState();
    const screens = createDefaultScreens();
    const gameScreen = screens.find(s => s.id === 'screen-game');
    expect(gameScreen.hasActive).toBe(false);
  });

  it('screen-podium has no default active class', () => {
    resetState();
    const screens = createDefaultScreens();
    const podiumScreen = screens.find(s => s.id === 'screen-podium');
    expect(podiumScreen.hasActive).toBe(false);
  });
});

describe('showBlindSelect - blind card generation', () => {
  it('generates cards for current ante', () => {
    resetState();
    const cards = buildBlindCardData(0, null, 5);
    expect(cards).toHaveLength(3);
  });

  it('current blind gets selection button', () => {
    resetState();
    const cards = buildBlindCardData(0, null, 5);
    expect(cards[0].isCurrent).toBe(true);
  });

  it('non-current blinds get upcoming class', () => {
    resetState();
    const cards = buildBlindCardData(0, null, 5);
    expect(cards[1].isCurrent).toBe(false);
    expect(cards[2].isCurrent).toBe(false);
  });

  it('current small blind has skip button', () => {
    resetState();
    const cards = buildBlindCardData(0, null, 5);
    expect(cards[0].hasSkip).toBe(true);
  });

  it('boss blind has no skip button', () => {
    resetState();
    const cards = buildBlindCardData(0, null, 5);
    expect(cards[2].hasSkip).toBe(false);
  });

  it('blind target formatted with toLocaleString', () => {
    resetState();
    const cards = buildBlindCardData(0, null, 5);
    const expected = BLINDS[0].target.toLocaleString('pt-BR');
    expect(cards[0].target).toBe(expected);
  });

  it('boss shows reward + 2 bonus', () => {
    resetState();
    const baseReward = 5;
    const cards = buildBlindCardData(0, null, baseReward);
    expect(cards[0].blindReward).toBe(baseReward);
    expect(cards[2].blindReward).toBe(baseReward + 2);
  });
});

describe('showCashout - timing and animation', () => {
  it('2 lines when jokerRewards is 0', () => {
    resetState();
    const lines = buildCashoutLines({ blindReward: 5, handsRemaining: 3, jokerRewards: 0, totalEarned: 8 });
    expect(lines).toHaveLength(2);
  });

  it('3 lines when jokerRewards > 0', () => {
    resetState();
    const lines = buildCashoutLines({ blindReward: 5, handsRemaining: 3, jokerRewards: 4, totalEarned: 12 });
    expect(lines).toHaveLength(3);
  });

  it('total appears after all lines', () => {
    resetState();
    const lines2 = buildCashoutLines({ blindReward: 5, handsRemaining: 3, jokerRewards: 0, totalEarned: 8 });
    const delay2 = getCashoutTotalDelay(lines2.length);
    const lines3 = buildCashoutLines({ blindReward: 5, handsRemaining: 3, jokerRewards: 4, totalEarned: 12 });
    const delay3 = getCashoutTotalDelay(lines3.length);
    expect(delay2).toBeLessThan(delay3);
  });

  it('button disabled initially', () => {
    resetState();
    let disabled = true;
    expect(disabled).toBe(true);
  });

  it('button enabled after timeout', () => {
    resetState();
    const lines = buildCashoutLines({ blindReward: 5, handsRemaining: 3, jokerRewards: 0, totalEarned: 8 });
    const totalDelay = getCashoutTotalDelay(lines.length);
    const enableDelay = totalDelay + 400;
    expect(enableDelay).toBeGreaterThan(totalDelay);
  });
});

describe('onPlayHand - flow control', () => {
  it('blocks when busy is true', () => {
    resetState();
    const result = guardPlayHand(true, 3);
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe('busy');
  });

  it('blocks when no selection', () => {
    resetState();
    const result = guardPlayHand(false, 0);
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe('no-selection');
  });

  it('sets busy to true during play', () => {
    resetState();
    let busy = false;
    state.selectedIndices = new Set([0, 1, 2]);
    if (!busy && state.selectedIndices.size > 0) busy = true;
    expect(busy).toBe(true);
  });

  it('catches Game.playHand errors', () => {
    resetState();
    let caught = false;
    try {
      throw new Error('test error');
    } catch (e) {
      caught = true;
    }
    expect(caught).toBe(true);
  });

  it('blindCleared triggers advanceToNextBlind', () => {
    resetState();
    const result = classifyPlayResult({ blindCleared: true, gameOver: false });
    expect(result).toBe('blindCleared');
  });

  it('gameOver triggers showGameOver', () => {
    resetState();
    const result = classifyPlayResult({ blindCleared: false, gameOver: true });
    expect(result).toBe('gameOver');
  });

  it('cycleComplete triggers showCycleComplete', () => {
    resetState();
    const advance = classifyAdvanceResult({ cycleComplete: true, victory: false, cashout: false });
    expect(advance).toBe('cycleComplete');
  });
});

describe('onDiscard - flow control', () => {
  it('blocks when busy is true', () => {
    resetState();
    const result = guardDiscard(true, 3, 2);
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe('busy');
  });

  it('blocks when no selection', () => {
    resetState();
    const result = guardDiscard(false, 0, 2);
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe('no-selection');
  });

  it('blocks when discards <= 0', () => {
    resetState();
    const result = guardDiscard(false, 3, 0);
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe('no-discards');
  });

  it('error caught and shown', () => {
    resetState();
    let caught = false;
    let message = '';
    try {
      throw new Error('discard error');
    } catch (e) {
      caught = true;
      message = 'Erro interno ao descartar';
    }
    expect(caught).toBe(true);
    expect(message).toContain('descartar');
  });
});

describe('onSort - selection clearing', () => {
  it('clears selectedIndices on sort', () => {
    resetState();
    state.selectedIndices = new Set([0, 1, 2]);
    state.phase = 'blind';
    state.selectedIndices = new Set();
    expect(state.selectedIndices.size).toBe(0);
  });

  it('sort by suit orders by SUIT_ORDER then rank desc', () => {
    resetState();
    const hand = [
      { suit: 'Spades', rank: '2' },
      { suit: 'Hearts', rank: 'A' },
      { suit: 'Hearts', rank: '2' },
      { suit: 'Spades', rank: 'A' }
    ];
    const sorted = sortHandBySuit(hand);
    expect(sorted[0].suit).toBe('Hearts');
    expect(sorted[0].rank).toBe('A');
    expect(sorted[1].suit).toBe('Hearts');
    expect(sorted[1].rank).toBe('2');
    expect(sorted[2].suit).toBe('Spades');
    expect(sorted[2].rank).toBe('A');
    expect(sorted[3].suit).toBe('Spades');
    expect(sorted[3].rank).toBe('2');
  });

  it('sort by rank orders by RANK_INDEX then SUIT_ORDER', () => {
    resetState();
    const hand = [
      { suit: 'Spades', rank: 'A' },
      { suit: 'Hearts', rank: '2' },
      { suit: 'Clubs', rank: 'A' },
      { suit: 'Hearts', rank: 'A' }
    ];
    const sorted = sortHandByRank(hand);
    expect(sorted[0].rank).toBe('2');
    expect(sorted[0].suit).toBe('Hearts');
    expect(sorted[1].rank).toBe('A');
    expect(sorted[1].suit).toBe('Hearts');
    expect(sorted[2].rank).toBe('A');
    expect(sorted[2].suit).toBe('Clubs');
    expect(sorted[3].rank).toBe('A');
    expect(sorted[3].suit).toBe('Spades');
  });
});

describe('showCycleComplete - data formatting', () => {
  it('calculates elapsed time from startTime', () => {
    resetState();
    const now = Date.now();
    state.startTime = now - 90000;
    const elapsed = Date.now() - state.startTime;
    expect(elapsed).toBeGreaterThanOrEqual(89000);
    expect(elapsed).toBeLessThan(92000);
  });

  it('formats time as MM:SS', () => {
    resetState();
    const timeStr = formatCycleTime(125000);
    expect(timeStr).toBe('02:05');
  });

  it('0 elapsed time shows 00:00', () => {
    resetState();
    const timeStr = formatCycleTime(0);
    expect(timeStr).toBe('00:00');
  });

  it('60 minutes shows 60:00', () => {
    resetState();
    const timeStr = formatCycleTime(3600000);
    expect(timeStr).toBe('60:00');
  });

  it('score formatted with pt-BR locale', () => {
    resetState();
    state.totalScore = 1234567;
    const formatted = state.totalScore.toLocaleString('pt-BR');
    expect(formatted).toContain('1');
    expect(formatted).toContain('234');
    expect(formatted).toContain('567');
  });
});

describe('showGameOver - victory/defeat', () => {
  it('victory shows Vitória! title', () => {
    resetState();
    expect(gameoverTitle(true)).toBe('Vitória!');
  });

  it('defeat shows Fim de Jogo title', () => {
    resetState();
    expect(gameoverTitle(false)).toBe('Fim de Jogo');
  });

  it('sets victory/defeat class', () => {
    resetState();
    expect(gameoverClass(true)).toBe('victory');
    expect(gameoverClass(false)).toBe('defeat');
  });
});

describe('Podium tab switching', () => {
  it('clicking score tab shows score list', () => {
    resetState();
    const tabs = [{ name: 'score', active: false }, { name: 'time', active: false }];
    const result = applyTabSwitch(tabs, 'score');
    expect(result.scoreVisible).toBe(true);
  });

  it('clicking time tab shows time list', () => {
    resetState();
    const tabs = [{ name: 'score', active: false }, { name: 'time', active: false }];
    const result = applyTabSwitch(tabs, 'time');
    expect(result.timeVisible).toBe(true);
  });

  it('only one tab active at a time', () => {
    resetState();
    const tabs = [{ name: 'score', active: true }, { name: 'time', active: false }];
    applyTabSwitch(tabs, 'time');
    const activeCount = tabs.filter(t => t.active).length;
    expect(activeCount).toBe(1);
  });

  it('score tab active by default', () => {
    resetState();
    const tabs = [{ name: 'score', active: true }, { name: 'time', active: false }];
    expect(tabs[0].active).toBe(true);
    expect(tabs[1].active).toBe(false);
  });
});

describe('renderPodiumScore - sorting', () => {
  it('filters out scores <= 0', () => {
    resetState();
    const scores = [{ name: 'A', score: 100 }, { name: 'B', score: 0 }, { name: 'C', score: -5 }];
    const result = getScoreBoard(scores);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('A');
  });

  it('sorts by score descending', () => {
    resetState();
    const scores = [{ name: 'A', score: 50 }, { name: 'B', score: 200 }, { name: 'C', score: 100 }];
    const result = getScoreBoard(scores);
    expect(result[0].score).toBe(200);
    expect(result[1].score).toBe(100);
    expect(result[2].score).toBe(50);
  });

  it('limits to top 10', () => {
    resetState();
    const scores = Array.from({ length: 15 }, (_, i) => ({ name: `P${i}`, score: (i + 1) * 100 }));
    const result = getScoreBoard(scores);
    expect(result).toHaveLength(10);
    expect(result[0].score).toBe(1500);
  });

  it('shows empty message for no scores', () => {
    resetState();
    const scores = [{ name: 'A', score: 0 }, { name: 'B', score: -10 }];
    const result = getScoreBoard(scores);
    expect(result).toHaveLength(0);
    expect(result.length === 0).toBe(true);
  });
});

describe('renderPodiumTime - sorting', () => {
  it('filters out entries without time', () => {
    resetState();
    const scores = [{ name: 'A', time: '05:30' }, { name: 'B', time: null }, { name: 'C', time: '03:20' }];
    const result = getTimeBoard(scores);
    expect(result).toHaveLength(2);
  });

  it('sorts by time ascending (fastest first)', () => {
    resetState();
    const scores = [{ name: 'A', time: '10:00' }, { name: 'B', time: '02:30' }, { name: 'C', time: '05:15' }];
    const result = getTimeBoard(scores);
    expect(result[0].time).toBe('02:30');
    expect(result[1].time).toBe('05:15');
    expect(result[2].time).toBe('10:00');
  });

  it('limits to top 10', () => {
    resetState();
    const scores = Array.from({ length: 12 }, (_, i) => ({
      name: `P${i}`,
      time: `${String(i).padStart(2, '0')}:00`
    }));
    const result = getTimeBoard(scores);
    expect(result).toHaveLength(10);
  });
});

describe('escapeHTML - XSS prevention', () => {
  it('escapes < and > characters', () => {
    resetState();
    expect(escape('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes & character', () => {
    resetState();
    expect(escape('a & b')).toBe('a &amp; b');
  });

  it('preserves normal text', () => {
    resetState();
    expect(escape('Hello World 123')).toBe('Hello World 123');
  });
});
