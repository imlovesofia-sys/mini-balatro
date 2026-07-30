import { state } from './state.js';
import { SUIT_SYMBOL } from './constants.js';
import {
  showScreen, renderHand, renderJokers, renderConsumables,
  renderPackShopItem, renderPodium, showMessage,
  animateCardsOut, runScoringSequence,
  initHandsReference, initDeckReference,
  openPackAnimation, selectTarotPack, selectDeckCardPack,
  flashDeckCard, closePackAnimation, getJokerImageStyle,
  animateDestroy, animateConvert, animateUpgrade, animateDuplicate,
  flashNoSelect
} from './ui.js';
import { evaluateBestHand } from './poker.js';
import { fetchScores, submitScore } from './api.js';
import * as Game from './game.js';
import { openPack } from './shop.js';
import { needsSelection, applyTarotDirectly } from './consumables.js';

import {
  startMusic, toggleMusic, isMusicMuted,
  toggleSfx, isSfxMuted,
  sfxClick, sfxBuy, sfxWin, sfxLose, sfxDeal, sfxDiscard,
  sfxExplosion, sfxWhoosh, sfxApply
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

  document.getElementById('btn-confirm-selection').addEventListener('click', onConfirmSelection);
  document.getElementById('btn-cancel-selection').addEventListener('click', onCancelSelection);

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
let pendingConsumableIndex = null;

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
  renderJokers(state.jokers, document.getElementById('jokers-list'), onSell, state);
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

  let result;
  try {
    result = Game.playHand();
  } catch (e) {
    console.error('playHand error:', e);
    showMessage('Erro interno ao jogar');
    renderGame();
    busy = false;
    return;
  }
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

  let result;
  try {
    result = Game.discardHand();
  } catch (e) {
    console.error('discardHand error:', e);
    showMessage('Erro interno ao descartar');
    renderGame();
    busy = false;
    return;
  }
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

function showSelectionButtons(show, count) {
  const selBtns = document.getElementById('selection-buttons');
  const actionBtns = document.getElementById('action-buttons');
  selBtns.style.display = show ? 'flex' : 'none';
  actionBtns.style.display = show ? 'none' : 'flex';
}

function onConfirmSelection() {
  if (pendingConsumableIndex === null) return;
  const consumable = state.consumables[pendingConsumableIndex];
  if (!consumable) { onCancelSelection(); return; }

  const selectedArr = [...state.selectedIndices].sort((a, b) => a - b);
  if (selectedArr.length < (consumable.count || 1)) {
    showMessage(`Selecione ${consumable.count} carta(s)`);
    return;
  }

  const selectedCards = selectedArr.map(i => state.hand[i]);
  const result = Game.doUseConsumable(pendingConsumableIndex, selectedCards);
  if (!result.ok) {
    showMessage(result.reason);
    return;
  }

  pendingConsumableIndex = null;
  state.selectedIndices = new Set();
  showSelectionButtons(false);
  showMessage(result.message || 'Consumível usado');
  renderGame();
}

function onCancelSelection() {
  pendingConsumableIndex = null;
  state.selectedIndices = new Set();
  showSelectionButtons(false);
  renderGame();
}

function renderShop() {
  document.getElementById('shop-money').textContent = `$${state.money}`;
  document.getElementById('btn-reroll').textContent = `Reroll ($${state.rerollCost})`;

  const blind = Game.getBlind();
  const boss = Game.getBossEffect();
  document.getElementById('shop-blind-text').textContent =
    blind.name + (boss ? ` (${boss.name})` : '');

  const jokersContainer = document.getElementById('shop-jokers');
  const packsContainer = document.getElementById('shop-consumables');
  jokersContainer.innerHTML = '';
  packsContainer.innerHTML = '';

  state.shopItems.forEach((item, i) => {
    if (!item || item.sold) {
      const placeholder = document.createElement('div');
      placeholder.className = 'shop-slot empty';
      placeholder.textContent = 'Vendido';
      if (item.kind === 'joker') {
        jokersContainer.appendChild(placeholder);
      } else {
        packsContainer.appendChild(placeholder);
      }
      return;
    }
    if (item.kind === 'joker') {
      const div = document.createElement('div');
      div.className = 'shop-item';
      const j = item.data;
      const styleObj = getJokerImageStyle(j);
      const styleStr = Object.entries(styleObj).map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${v}`).join(';');
      div.innerHTML = `<div class="joker rarity-${j.rarity}" style="${styleStr}">
        <div class="joker-name">${j.name}</div>
        <div class="joker-tooltip">
          <div class="tooltip-title">${j.name}</div>
          <div class="tooltip-desc">${j.desc}</div>
        </div>
      </div><div class="price">$${item.price}</div>`;
      div.addEventListener('click', () => onBuy(i));
      jokersContainer.appendChild(div);
    } else if (item.kind === 'pack') {
      renderPackShopItem(item, i, packsContainer, onBuy);
    }
  });

  renderJokers(state.jokers, document.getElementById('shop-owned-list'), onSell, state);
}

function onBuy(index) {
  sfxClick();
  const item = state.shopItems[index];
  if (item.kind === 'pack') {
    startPackFlow(index);
    return;
  }
  let result;
  try {
    result = Game.doBuyItem(index);
  } catch (e) {
    console.error('doBuyItem error:', e);
    showMessage('Erro interno ao comprar');
    return;
  }
  if (!result.ok) {
    showMessage(result.reason);
    return;
  }
  sfxBuy();
  renderShop();
}

let packState = { active: false, itemIndex: null, tarotCards: [], picksLeft: 0, selectedTarots: [], deckCards: [], selectedDeckIndices: [], phase: 'tarot' };

function getTarotSelectionInfo(tarot) {
  const needsCard = tarot.selectFromHand === true;
  const count = tarot.destroyCount || tarot.count || 0;
  const effectType = tarot.effect;

  if (effectType === 'destroyAndMoney' || effectType === 'destroyFromHand') {
    return { needsCards: true, required: count || 1, type: 'destroy' };
  }
  if (effectType === 'convertHandSuit') {
    return { needsCards: true, required: count || 1, type: 'convert' };
  }
  if (effectType === 'duplicateFromHand') {
    return { needsCards: true, required: count || 1, type: 'duplicate' };
  }
  if (effectType === 'upgradeFromHand') {
    return { needsCards: true, required: count || 1, type: 'upgrade' };
  }
  if (effectType === 'addGold') {
    return { needsCards: true, required: count || 1, type: 'upgrade' };
  }
  if (effectType === 'addMusical') {
    return { needsCards: true, required: count || 1, type: 'upgrade' };
  }
  return { needsCards: false, required: 0, type: 'none' };
}

async function startPackFlow(shopIndex) {
  const item = state.shopItems[shopIndex];
  if (state.money < item.price) {
    showMessage('Dinheiro insuficiente');
    return;
  }
  state.money -= item.price;
  item.sold = true;
  renderShop();

  const tarotCards = openPack(item.tier, state);
  const shuffledDeck = [...state.deck].sort(() => Math.random() - 0.5);
  const deckCards = shuffledDeck.slice(0, item.tier.deckCards);

  packState = {
    active: true,
    itemIndex: shopIndex,
    tier: item.tier,
    tarotCards,
    deckCards,
    picksLeft: item.tier.picks,
    selectedTarots: [],
    selectedDeckIndices: [],
    phase: 'tarot'
  };

  sfxExplosion();
  const { modal, deckRow, tarotRow } = await openPackAnimation(item.tier, tarotCards, deckCards);

  tarotRow.querySelectorAll('.pack-card-slot').forEach((slot, i) => {
    slot.addEventListener('click', () => onPackTarotClick(slot, i));
  });

  deckRow.querySelectorAll('.pack-card-slot').forEach((slot, i) => {
    slot.addEventListener('click', () => onPackDeckClick(slot, i));
  });

  const closeBtn = document.getElementById('pack-close');
  const newCloseBtn = closeBtn.cloneNode(true);
  closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
  newCloseBtn.addEventListener('click', onPackClose);
}

function onPackTarotClick(slot, index) {
  if (!packState.active || packState.phase !== 'tarot') return;
  sfxClick();
  selectTarotPack(slot);

  const tarot = packState.tarotCards[index];

  if (tarot.isLegendary) {
    applyPackLegendary(index);
    return;
  }

  const info = getTarotSelectionInfo(tarot);

  packState.selectedTarots = [index];
  packState.selectedDeckIndices = [];
  packState.currentSelectionInfo = info;

  if (!info.needsCards) {
    applyPackTarot(index);
    return;
  }

  if (info.required > packState.deckCards.length) {
    showMessage(`Precisa de ${info.required} carta(s), mas só tem ${packState.deckCards.length}`);
    slot.classList.remove('selected', 'tarot-glow');
    packState.selectedTarots = [];
    return;
  }

  packState.phase = 'deck-select';
  const labels = { destroy: 'Selecione para destruir', convert: 'Selecione para converter', duplicate: 'Selecione para duplicar', upgrade: 'Selecione para melhorar' };
  document.getElementById('pack-subtitle').textContent = `${labels[info.type] || 'Selecione'} (${info.required} carta(s))`;
}

async function applyPackLegendary(tarotIndex) {
  const legendary = packState.tarotCards[tarotIndex];
  const maxJ = state.bossEffect && state.bossEffect.maxJokers ? state.bossEffect.maxJokers : 5;
  if (state.jokers.length >= maxJ) {
    showMessage('Sem espaço para Curingas');
    const slot = document.querySelectorAll('#pack-tarot-cards .pack-card-slot')[tarotIndex];
    if (slot) slot.classList.remove('selected', 'tarot-glow');
    packState.selectedTarots = [];
    packState.phase = 'tarot';
    return;
  }

  sfxApply();
  state.jokers.push({ ...legendary });
  showMessage(`${legendary.name} adquirida! 🎤`);

  packState.picksLeft--;
  packState.tarotCards.splice(tarotIndex, 1);
  packState.selectedTarots = [];

  if (packState.picksLeft <= 0) {
    await closePackAnimation();
    packState.active = false;
    renderShop();
    renderGame();
    return;
  }

  rebuildPackUI();
}

async function applyPackTarot(tarotIndex) {
  const tarot = packState.tarotCards[tarotIndex];

  sfxApply();

  const result = applyTarotDirectly(state, tarot, []);
  renderShop();
  showMessage(result.message || 'Efeito aplicado');

  packState.picksLeft--;
  packState.tarotCards.splice(tarotIndex, 1);
  packState.selectedTarots = [];

  if (packState.picksLeft <= 0) {
    await closePackAnimation();
    packState.active = false;
    renderShop();
    renderGame();
    return;
  }

  rebuildPackUI();
}

async function onPackDeckClick(slot, deckIndex) {
  if (!packState.active || packState.phase !== 'deck-select') return;

  const info = packState.currentSelectionInfo;
  if (!info || !info.needsCards) return;

  if (packState.selectedDeckIndices.includes(deckIndex)) {
    packState.selectedDeckIndices = packState.selectedDeckIndices.filter(i => i !== deckIndex);
    slot.classList.remove('selected');
    sfxClick();
    return;
  }

  if (packState.selectedDeckIndices.length >= info.required) {
    flashNoSelect(slot);
    return;
  }

  sfxClick();
  packState.selectedDeckIndices.push(deckIndex);
  slot.classList.add('selected');

  if (packState.selectedDeckIndices.length >= info.required) {
    await applyPackTarotWithCards();
  }
}

async function applyPackTarotWithCards() {
  const tarotIndex = packState.selectedTarots[0];
  const tarot = packState.tarotCards[tarotIndex];
  const info = packState.currentSelectionInfo;
  const deckRow = document.getElementById('pack-deck-cards');
  const deckSlots = deckRow.querySelectorAll('.pack-card-slot');

  const selectedCards = packState.selectedDeckIndices.map(i => packState.deckCards[i]);
  const selectedSlots = packState.selectedDeckIndices.map(i => deckSlots[i]);

  sfxApply();

  if (info.type === 'destroy') {
    for (const s of selectedSlots) {
      await animateDestroy(s);
    }
  } else if (info.type === 'convert') {
    for (const s of selectedSlots) {
      await animateConvert(s);
    }
  } else if (info.type === 'duplicate') {
    for (const s of selectedSlots) {
      await animateDuplicate(s);
    }
  } else if (info.type === 'upgrade') {
    for (const s of selectedSlots) {
      await animateUpgrade(s);
    }
  } else {
    for (const s of selectedSlots) {
      await flashDeckCard(s);
    }
  }

  const result = applyTarotDirectly(state, tarot, selectedCards);
  renderShop();
  showMessage(result.message || 'Efeito aplicado');

  const destructiveEffects = ['destroyAndMoney', 'destroyFromHand'];
  if (destructiveEffects.includes(tarot.effect)) {
    const removeIndices = [...packState.selectedDeckIndices].sort((a, b) => b - a);
    for (const idx of removeIndices) {
      packState.deckCards.splice(idx, 1);
    }
  }

  packState.picksLeft--;
  packState.tarotCards.splice(tarotIndex, 1);
  packState.selectedTarots = [];
  packState.selectedDeckIndices = [];

  if (packState.picksLeft <= 0) {
    await closePackAnimation();
    packState.active = false;
    renderShop();
    renderGame();
    return;
  }

  rebuildPackUI();
}

function rebuildPackUI() {
  packState.phase = 'tarot';
  document.getElementById('pack-subtitle').textContent = `Escolha mais ${packState.picksLeft} tarô(s)`;

  const tarotRow = document.getElementById('pack-tarot-cards');
  tarotRow.innerHTML = '';
  for (let i = 0; i < packState.tarotCards.length; i++) {
    const s = document.createElement('div');
    s.className = 'pack-card-slot pack-card-tooltip';
    s.dataset.index = i;
    const t = packState.tarotCards[i];
    const isLegendary = !!t.isLegendary;
    const hasTarotImg = t.id && (t.id.match(/^t\d+$/) || t.id.match(/^s\d+$/));
    const hasJokerImg = t.id && t.id.match(/^j\d+$/);
    if (isLegendary && hasJokerImg) {
      s.style.backgroundImage = `url('/img/jokers/${t.id}.png')`;
      s.style.backgroundSize = 'cover';
      s.style.backgroundPosition = 'center';
      s.innerHTML = `<div class="pack-legendary-badge">LENDÁRIA</div>
        <div class="joker-tooltip">
          <div class="tooltip-title">${t.name}</div>
          <div class="tooltip-desc">${t.desc}</div>
        </div>`;
    } else if (hasTarotImg) {
      s.innerHTML = `<img src="/img/fortuna/${t.id}.png" alt="${t.name}">
        <div class="joker-tooltip">
          <div class="tooltip-title">${t.name}</div>
          <div class="tooltip-desc">${t.desc}</div>
        </div>`;
    } else {
      s.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:0.5rem;color:#e2e8f0;">${t.name}</div>
        <div class="joker-tooltip">
          <div class="tooltip-title">${t.name}</div>
          <div class="tooltip-desc">${t.desc}</div>
        </div>`;
      s.style.background = '#1e1b4b';
    }
    s.addEventListener('click', () => onPackTarotClick(s, i));
    tarotRow.appendChild(s);
  }

  const deckRow = document.getElementById('pack-deck-cards');
  deckRow.innerHTML = '';
  for (let i = 0; i < packState.deckCards.length; i++) {
    const s = document.createElement('div');
    s.className = 'pack-card-slot deck-card';
    s.dataset.index = i;
    const c = packState.deckCards[i];
    const isRed = c.suit === 'Hearts' || c.suit === 'Diamonds';
    const suitSymbol = SUIT_SYMBOL[c.suit] || '♠';
    s.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;color:${isRed ? '#ef4444' : '#1e293b'};font-weight:bold;">
      <span style="font-size:1rem;">${c.rank}</span>
      <span style="font-size:0.9rem;">${suitSymbol}</span>
    </div>`;
    s.style.background = '#fefce8';
    s.style.border = '2px solid #1e293b';
    s.addEventListener('click', () => onPackDeckClick(s, i));
    deckRow.appendChild(s);
  }
}

async function onPackClose() {
  sfxClick();
  if (!packState.active) return;
  await closePackAnimation();
  packState.active = false;
  renderShop();
  renderGame();
}

function onSell(index) {
  sfxClick();
  const price = Game.doSellJoker(index);
  if (price === false) return;
  showMessage(`Vendido por $${price}`);
  renderShop();
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
  const consumable = state.consumables[index];
  if (!consumable) return;

  if (needsSelection(consumable)) {
    pendingConsumableIndex = index;
    state.selectedIndices = new Set();
    showMessage(`Selecione ${consumable.count} carta(s) da mão`, 3000);
    showSelectionButtons(true, consumable.count);
    renderGame();
    return;
  }

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
