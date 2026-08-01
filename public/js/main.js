import { state } from './state.js';
import { SUIT_SYMBOL, BLINDS } from './constants.js';
import {
  showScreen, renderHand, renderJokers, renderConsumables,
  renderPackShopItem, renderPodiumScore, renderPodiumTime, showMessage,
  animateCardsOut, runScoringSequence,
  initHandsReference, initDeckReference,
  openPackAnimation, selectTarotPack,
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
  startMusic, toggleMusic,
  toggleSfx,
  sfxClick, sfxBuy, sfxWin, sfxLose, sfxDeal, sfxDiscard,
  sfxExplosion, sfxApply
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
    showBlindSelect();
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

  document.querySelectorAll('.podium-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      sfxClick();
      document.querySelectorAll('.podium-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      document.getElementById('podium-tab-score').style.display = target === 'score' ? '' : 'none';
      document.getElementById('podium-tab-time').style.display = target === 'time' ? '' : 'none';
    });
  });

  document.getElementById('btn-infinite-mode').addEventListener('click', () => {
    sfxClick();
    Game.enterInfiniteMode();
    showBlindSelect();
  });

  document.getElementById('btn-cycle-menu').addEventListener('click', () => {
    sfxClick();
    showScreen('screen-menu');
  });

  document.getElementById('btn-save-cycle-time').addEventListener('click', () => {
    sfxClick();
    onSaveCycleTime();
  });

  initHandsReference();
  initDeckReference(() => state);
}

function showBlindSelect() {
  const container = document.getElementById('blind-select-cards');
  container.innerHTML = '';

  const BLIND_META = [
    { type: 'small', icon: '▼', label: 'Blind Pequeno', cssClass: 'blind-small' },
    { type: 'big', icon: '◆', label: 'Blind Grande', cssClass: 'blind-big' },
    { type: 'boss', icon: '♥', label: '', cssClass: 'blind-boss' }
  ];

  const blind = (state.blinds || BLINDS)[state.currentBlindIndex];
  if (!blind) return;
  const currentAnte = blind.ante;
  const allBlinds = state.blinds || BLINDS;
  const anteBlinds = allBlinds.filter(b => b.ante === currentAnte);
  const blindInfo = Game.getCurrentBlindInfo();

  anteBlinds.forEach((blindData, idx) => {
    const meta = BLIND_META[idx];
    const isCurrent = state.currentBlindIndex === allBlinds.indexOf(blindData);
    const bossName = idx === 2 ? (blindInfo.bossEffect ? blindInfo.bossEffect.name : 'Blind do Chefe') : '';
    const bossDesc = idx === 2 && blindInfo.bossEffect ? blindInfo.bossEffect.desc : '';
    const target = blindData.target.toLocaleString('pt-BR');
    const reward = idx === 2 ? blindInfo.reward + 2 : blindInfo.reward;

    const card = document.createElement('div');
    card.className = `blind-card ${meta.cssClass}${isCurrent ? '' : ' upcoming'}`;

    const displayName = bossName || meta.label;

    card.innerHTML = `
      <div class="blind-card-icon">${idx === 0 ? 'SMALL<br>BLIND' : idx === 1 ? 'BIG<br>BLIND' : '♥'}</div>
      <div class="blind-card-title">${displayName}</div>
      <div class="blind-card-info">
        <div class="blind-card-info-label">Meta de pontuação</div>
        <div class="blind-card-info-value">★ ${target}</div>
      </div>
      ${bossDesc ? `<div class="blind-card-effect">${bossDesc}</div>` : '<div class="blind-card-effect">&nbsp;</div>'}
      <div class="blind-card-info">
        <div class="blind-card-info-label">Recompensa</div>
        <div class="blind-card-info-value reward">$${reward}</div>
      </div>
      <div class="blind-card-btns">
        ${isCurrent
          ? `<button class="btn-select">Selecionar</button>${idx < 2 ? '<button class="btn-skip">Pular</button>' : ''}`
          : ''
        }
      </div>
    `;

    if (isCurrent) {
      card.querySelector('.btn-select').addEventListener('click', (e) => {
        e.stopPropagation();
        sfxClick();
        Game.confirmBlindSelection();
        renderGame();
        showScreen('screen-game');
      });

      const skipBtn = card.querySelector('.btn-skip');
      if (skipBtn) {
        skipBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          sfxClick();
          Game.skipBlind();
          showBlindSelect();
        });
      }
    }

    container.appendChild(card);
  });

  showScreen('screen-blind-select');
}

function showCashout(breakdown) {
  const linesContainer = document.getElementById('cashout-lines');
  const totalEl = document.getElementById('cashout-total');
  const totalValueEl = document.getElementById('cashout-total-value');
  const btn = document.getElementById('cashout-btn');

  linesContainer.innerHTML = '';
  totalEl.classList.remove('visible');
  btn.disabled = true;
  btn.style.opacity = '0.5';

  const lines = [
    { label: 'Recompensa do Blind', value: `$${breakdown.blindReward}` },
    { label: 'Mãos Restantes', value: `$${breakdown.handsRemaining}` },
  ];

  if (breakdown.jokerRewards > 0) {
    lines.push({ label: 'Bônus de Curinga', value: `$${breakdown.jokerRewards}` });
  }

  lines.forEach((line, i) => {
    const div = document.createElement('div');
    div.className = 'cashout-line';
    div.innerHTML = `
      <span class="cashout-line-label">${line.label}</span>
      <span class="cashout-line-value">${line.value}</span>
    `;
    linesContainer.appendChild(div);

    setTimeout(() => {
      div.classList.add('visible');
      sfxClick();
    }, 400 + (i * 350));
  });

  const totalDelay = 400 + (lines.length * 350) + 200;
  setTimeout(() => {
    totalValueEl.textContent = `$${breakdown.totalEarned}`;
    totalEl.classList.add('visible');
    sfxClick();
  }, totalDelay);

  setTimeout(() => {
    btn.disabled = false;
    btn.style.opacity = '1';
  }, totalDelay + 400);

  btn.onclick = () => {
    sfxClick();
    Game.applyCashout();
    renderShop();
    showScreen('screen-shop');
  };

  showScreen('screen-cashout');
}

window.onJokerReorder = function(fromIndex, toIndex) {
  Game.reorderJokers(fromIndex, toIndex);
  renderGame();
};

let busy = false;
let pendingConsumableIndex = null;

export function renderGame(opts = {}) {
  const blind = Game.getBlind();
  if (!blind) return;
  const boss = Game.getBossEffect();
  const blindPosition = (state.currentBlindIndex % 3) + 1;
  const roundLabel = `Rodada ${blindPosition}/3`;
  document.getElementById('blind-name').textContent = roundLabel + (boss ? ` — ${boss.name}` : '');
  document.getElementById('blind-target').textContent = `${blind.name} — Meta: ${blind.target}`;
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
      try {
        const advance = Game.advanceToNextBlind();
        if (advance.cycleComplete) {
          showCycleComplete();
        } else if (advance.victory) {
          await showGameOver(true);
        } else if (advance.cashout) {
          showCashout(advance.breakdown);
        }
      } catch (e) {
        console.error('advanceToNextBlind error:', e);
      } finally {
        busy = false;
      }
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
  if (!blind) return;
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
  if (!item || item.sold) return;
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
    return { needsCards: true, required: count || 1, type: 'gold' };
  }
  if (effectType === 'addMusical') {
    return { needsCards: true, required: count || 1, type: 'musical' };
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
  showBlindSelect();
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

function showCycleComplete() {
  sfxWin();
  const elapsed = Date.now() - state.startTime;
  const minutes = Math.floor(elapsed / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  document.getElementById('cycle-number').textContent = state.currentCycle;
  document.getElementById('cycle-time').textContent = timeStr;
  document.getElementById('cycle-score').textContent = state.totalScore.toLocaleString('pt-BR');
  document.getElementById('cycle-antes').textContent = state.currentAnte;
  
  showScreen('screen-cycle-complete');
}

async function onSaveScore() {
  const name = document.getElementById('player-name').value.trim() || 'Anônimo';
  const elapsed = Date.now() - state.startTime;
  const minutes = Math.floor(elapsed / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const res = await submitScore(name, state.totalScore, timeStr);
  if (res.ok) {
    showMessage('Placar salvo!');
    await showPodium();
    showScreen('screen-podium');
  } else {
    showMessage('Erro ao salvar');
  }
}

async function onSaveCycleTime() {
  const name = document.getElementById('cycle-player-name').value.trim() || 'Anônimo';
  const elapsed = Date.now() - state.startTime;
  const minutes = Math.floor(elapsed / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const res = await submitScore(name, state.totalScore, timeStr);
  if (res.ok) {
    showMessage('Tempo salvo!');
  } else {
    showMessage('Erro ao salvar');
  }
}

async function showPodium() {
  const scores = await fetchScores();
  renderPodiumScore(scores, document.getElementById('podium-list-score'));
  renderPodiumTime(scores, document.getElementById('podium-list-time'));
}

setupApp();
