import { state } from './state.js';
import {
  showScreen, renderHand, renderJokers, renderConsumables,
  renderShopItems, renderPodium, showMessage,
  animateCardsOut, runScoringSequence,
  initHandsReference, initDeckReference
} from './ui.js';
import { evaluateBestHand } from './poker.js';
import { fetchScores, submitScore } from './api.js';
import * as Game from './game.js';
import {
  startMusic, toggleMusic, isMusicMuted,
  toggleSfx, isSfxMuted,
  sfxClick, sfxBuy, sfxWin, sfxLose, sfxDeal, sfxDiscard
} from './audio.js';

export function setupApp() {
  const btnMusic = document.getElementById('btn-music');
  const btnSfx = document.getElementById('btn-sfx');
  btnMusic.addEventListener('click', () => {
    sfxClick();
    const on = toggleMusic();
    btnMusic.classList.toggle('muted', !on);
    btnMusic.textContent = on ? '♫' : '♪';
  });
  btnSfx.addEventListener('click', () => {
    const on = toggleSfx();
    btnSfx.classList.toggle('muted', !on);
    btnSfx.textContent = on ? '🔊' : '🔇';
    if (on) sfxClick();
  });

  document.getElementById('btn-start').addEventListener('click', () => {
    sfxClick();
    startMusic();
    Game.startRun();
    renderGame();
    showScreen('screen-game');
  });

  document.getElementById('btn-podium-menu').addEventListener('click', async () => {
    sfxClick();
    await showPodium();
    showScreen('screen-podium');
  });

  document.getElementById('btn-howto').addEventListener('click', () => {
    sfxClick();
    showScreen('screen-howto');
  });

  document.getElementById('btn-back-howto').addEventListener('click', () => {
    sfxClick();
    showScreen('screen-menu');
  });

  document.getElementById('btn-play-hand').addEventListener('click', onPlayHand);
  document.getElementById('btn-discard').addEventListener('click', onDiscard);
  document.getElementById('btn-sort-suit').addEventListener('click', () => onSort('suit'));
  document.getElementById('btn-sort-rank').addEventListener('click', () => onSort('rank'));

  document.getElementById('btn-reroll').addEventListener('click', onReroll);
  document.getElementById('btn-leave-shop').addEventListener('click', onLeaveShop);

  document.getElementById('btn-save-score').addEventListener('click', onSaveScore);
  document.getElementById('btn-podium-go').addEventListener('click', async () => {
    sfxClick();
    await showPodium();
    showScreen('screen-podium');
  });
  document.getElementById('btn-menu').addEventListener('click', () => {
    sfxClick();
    showScreen('screen-menu');
  });
  document.getElementById('btn-back-podium').addEventListener('click', () => {
    sfxClick();
    showScreen('screen-menu');
  });

  initHandsReference();
  initDeckReference(() => state);
}

let busy = false;

export function renderGame(opts = {}) {
  const blind = Game.getBlind();
  const boss = Game.getBossEffect();
  document.getElementById('blind-name').textContent = blind.name + (boss ? ` (${boss.name})` : '');
  document.getElementById('blind-target').textContent = boss ? boss.desc : `Meta: ${blind.target}`;
  document.getElementById('round-score').textContent = state.roundScore.toLocaleString('pt-BR');
  document.getElementById('target-value').textContent = blind.target.toLocaleString('pt-BR');
  document.getElementById('progress-fill').style.width =
    `${Math.min(100, (state.roundScore / blind.target) * 100)}%`;
  document.getElementById('hands-left').textContent = `Mãos: ${state.hands}`;
  document.getElementById('discards-left').textContent = `Descartes: ${state.discards}`;
  document.getElementById('money').textContent = `$${state.money}`;
  document.getElementById('deck-count').textContent = `${state.deck.length} cartas`;

  renderHand(state.hand, state.selectedIndices, document.getElementById('hand-cards'), opts.newCards || 0, updateEvalPreview, state.hasExtraSlot);
  renderJokers(state.jokers, document.getElementById('jokers-list'), onSell);
  renderConsumables(state.consumables, document.getElementById('consumables-list'), onUseConsumable);
  updateEvalPreview();
}

export function updateEvalPreview() {
  const nameEl = document.getElementById('eval-hand-name');
  const chipsEl = document.getElementById('eval-chips');
  const multEl = document.getElementById('eval-mult');
  if (busy) return;
  if (state.selectedIndices.size === 0) {
    nameEl.textContent = 'Selecione cartas';
    chipsEl.textContent = '0';
    multEl.textContent = '0';
    return;
  }
  let cards = [...state.selectedIndices].sort((a, b) => a - b).map(i => state.hand[i]);
  if (state.hasExtraSlot && cards.length === 6) {
    cards = cards.slice(0, 5);
  }
  const result = evaluateBestHand(cards);
  nameEl.textContent = result.type.name;
  chipsEl.textContent = result.type.chips;
  multEl.textContent = result.type.mult;
}

function bumpScore() {
  const el = document.getElementById('round-score');
  el.classList.remove('score-bump');
  void el.offsetWidth;
  el.classList.add('score-bump');
}

async function onPlayHand() {
  if (busy) return;
  if (state.selectedIndices.size === 0) {
    showMessage('Selecione pelo menos 1 carta');
    return;
  }
  busy = true;
  const handContainer = document.getElementById('hand-cards');
  const handBefore = state.hand.length;
  const selectedArr = [...state.selectedIndices].sort((a, b) => a - b);

  const result = Game.playHand();
  if (!result.ok) {
    showMessage(result.reason);
    renderGame();
    busy = false;
    return;
  }

  let scoringArr = selectedArr;
  if (state.hasExtraSlot && selectedArr.length === 6) {
    scoringArr = selectedArr.slice(0, 5);
  }

  if (result.scoreDetails) {
    await runScoringSequence({
      handContainer,
      selectedArr: scoringArr,
      details: result.scoreDetails,
      jokersContainer: document.getElementById('jokers-list')
    });
  }

  const kept = handBefore - selectedArr.length;
  const newCards = Math.max(0, state.hand.length - kept);

  renderGame({ newCards });
  if (newCards > 0) sfxDeal();
  bumpScore();

  if (result.blindCleared) {
    sfxWin();
    showMessage('Blind derrotado!');
    setTimeout(async () => {
      const advance = Game.advanceToNextBlind();
      if (advance.victory) {
        await showGameOver(true);
      } else if (advance.shop) {
        renderShop();
        showScreen('screen-shop');
      }
      busy = false;
    }, 1500);
  } else if (result.gameOver) {
    await showGameOver(false);
    busy = false;
  } else {
    busy = false;
  }
}

async function onDiscard() {
  if (busy) return;
  if (state.selectedIndices.size === 0) {
    showMessage('Selecione pelo menos 1 carta');
    return;
  }
  if (state.discards <= 0) {
    showMessage('Sem descartes restantes');
    return;
  }
  busy = true;
  const handContainer = document.getElementById('hand-cards');
  const handBefore = state.hand.length;
  const selectedCount = state.selectedIndices.size;
  await animateCardsOut(handContainer, state.selectedIndices, 'discard');

  const result = Game.discardHand();
  if (!result.ok) {
    showMessage(result.reason);
    renderGame();
    busy = false;
    return;
  }
  sfxDiscard();

  const kept = handBefore - selectedCount;
  const newCards = Math.max(0, state.hand.length - kept);
  renderGame({ newCards });
  if (newCards > 0) sfxDeal();
  busy = false;
}

function onSort(mode) {
  if (busy || state.phase !== 'blind') return;
  Game.sortHand(mode);
  renderGame();
}

function renderShop() {
  document.getElementById('shop-money').textContent = `$${state.money}`;
  document.getElementById('btn-reroll').textContent = `Reroll ($${state.rerollCost})`;

  const blind = Game.getBlind();
  const boss = Game.getBossEffect();
  document.getElementById('shop-blind-text').textContent =
    blind.name + (boss ? ` (${boss.name})` : '');

  renderShopItems(
    state.shopItems,
    document.getElementById('shop-jokers'),
    document.getElementById('shop-consumables'),
    onBuy
  );

  renderJokers(state.jokers, document.getElementById('shop-owned-list'), onSell);
}

function onBuy(index) {
  sfxClick();
  const result = Game.doBuyItem(index);
  if (!result.ok) {
    showMessage(result.reason);
    return;
  }
  sfxBuy();
  renderShop();
}

function onSell(index) {
  sfxClick();
  const price = Game.doSellJoker(index);
  if (price === false) return;
  showMessage(`Vendido por $${price}`);
  renderGame();
}

function onReroll() {
  sfxClick();
  const ok = Game.doReroll();
  if (!ok) {
    showMessage('Dinheiro insuficiente para reroll');
    return;
  }
  sfxBuy();
  renderShop();
}

function onLeaveShop() {
  sfxClick();
  Game.leaveShopAndContinue();
  renderGame();
  showScreen('screen-game');
}

function onUseConsumable(index) {
  const result = Game.doUseConsumable(index);
  if (!result.ok) {
    showMessage(result.reason);
    return;
  }
  showMessage(result.message || 'Consumível usado');
  renderGame();
}

async function showGameOver(victory) {
  if (victory) sfxWin(); else sfxLose();
  const title = document.getElementById('gameover-title');
  title.textContent = victory ? 'Vitória!' : 'Fim de Jogo';
  title.className = victory ? 'victory' : 'defeat';
  document.getElementById('gameover-score').textContent =
    `Pontuação final: ${state.totalScore.toLocaleString('pt-BR')}`;
  document.getElementById('player-name').value = '';
  showScreen('screen-gameover');
}

async function onSaveScore() {
  const name = document.getElementById('player-name').value.trim() || 'Anônimo';
  const res = await submitScore(name, state.totalScore);
  if (res.ok) {
    showMessage('Placar salvo!');
    await showPodium();
    showScreen('screen-podium');
  } else {
    showMessage('Erro ao salvar');
  }
}

async function showPodium() {
  const scores = await fetchScores();
  renderPodium(scores, document.getElementById('podium-list'));
}

setupApp();
