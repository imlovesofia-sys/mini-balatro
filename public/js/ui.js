import { SUIT_SYMBOL, POKER_HANDS, SUITS } from './constants.js';
import { sfxCardScore, sfxJokerProc } from './audio.js';

function getJokerImageStyle(joker) {
  return {
    backgroundImage: `url('/img/jokers/${joker.id}.png')`,
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center'
  };
}

export function cardToHTML(card, selected = false) {
  const symbol = SUIT_SYMBOL[card.suit];
  const isRed = card.suit === 'Hearts' || card.suit === 'Diamonds';
  const colorClass = isRed ? 'red' : 'black';
  return `<div class="card ${colorClass} ${selected ? 'selected' : ''}">
    <div class="card-corner top-left"><span class="rank">${card.rank}</span><span class="suit">${symbol}</span></div>
    <div class="card-center">${symbol}</div>
    <div class="card-corner bottom-right"><span class="rank">${card.rank}</span><span class="suit">${symbol}</span></div>
  </div>`;
}

export function renderHand(hand, selectedIndices, container, newCount = 0, onSelectionChange = null, hasExtraSlot = false) {
  container.innerHTML = '';
  const firstNew = hand.length - newCount;
  hand.forEach((card, i) => {
    const div = document.createElement('div');
    div.className = 'card-wrapper';
    if (newCount > 0 && i >= firstNew) {
      div.classList.add('deal-in');
      div.style.animationDelay = `${(i - firstNew) * 70}ms`;
    }
    const isSelected = selectedIndices.has(i);
    const isExtraSelected = isSelected && hasExtraSlot && selectedIndices.size > 5;
    div.innerHTML = cardToHTML(card, isSelected);
    if (isExtraSelected) {
      div.classList.add('extra-slot-selected');
    }
    div.addEventListener('click', () => {
      if (selectedIndices.has(i)) selectedIndices.delete(i);
      else {
        const maxSelect = hasExtraSlot ? 6 : 5;
        if (selectedIndices.size < maxSelect) selectedIndices.add(i);
      }
      renderHand(hand, selectedIndices, container, 0, onSelectionChange, hasExtraSlot);
      if (onSelectionChange) onSelectionChange();
    });
    container.appendChild(div);
  });
}

export function animateCardsOut(container, indices, type) {
  return new Promise(resolve => {
    const wrappers = container.querySelectorAll('.card-wrapper');
    const sorted = [...indices].sort((a, b) => a - b);
    if (sorted.length === 0) { resolve(); return; }
    let maxDelay = 0;
    sorted.forEach((idx, k) => {
      const w = wrappers[idx];
      if (!w) return;
      w.style.animationDelay = `${k * 60}ms`;
      w.classList.add(type === 'play' ? 'playing' : 'discarding');
      maxDelay = k * 60;
    });
    setTimeout(resolve, 480 + maxDelay);
  });
}

export function renderJokers(jokers, container, onSell = null) {
  container.innerHTML = '';
  jokers.forEach((j, idx) => {
    const div = document.createElement('div');
    div.className = `joker rarity-${j.rarity}`;
    Object.assign(div.style, getJokerImageStyle(j));
    const sellPrice = Math.max(1, j.cost - 3);
    div.innerHTML = `
      <div class="joker-name">${j.name}</div>
      <div class="joker-tooltip">
        <div class="tooltip-title">${j.name}</div>
        <div class="tooltip-desc">${j.desc}</div>
      </div>
      ${onSell ? `<button class="sell-btn" data-idx="${idx}">Vender ($${sellPrice})</button>` : ''}
    `;
    if (onSell) {
      div.addEventListener('click', (e) => {
        if (e.target.classList.contains('sell-btn')) {
          e.stopPropagation();
          onSell(parseInt(e.target.dataset.idx));
          return;
        }
        container.querySelectorAll('.joker.show-sell').forEach(j => {
          if (j !== div) j.classList.remove('show-sell');
        });
        div.classList.toggle('show-sell');
      });
    }
    container.appendChild(div);
  });
}

export function renderConsumables(consumables, container, onUse) {
  container.innerHTML = '';
  consumables.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = 'consumable-btn';
    btn.innerHTML = `<strong>${c.name}</strong><br><span class="small">${c.desc}</span>`;
    btn.addEventListener('click', () => onUse(i));
    container.appendChild(btn);
  });
}

export function renderShopItems(items, jokersContainer, consumablesContainer, onBuy) {
  jokersContainer.innerHTML = '';
  consumablesContainer.innerHTML = '';

  items.forEach((item, i) => {
    if (!item || item.sold) {
      const placeholder = document.createElement('div');
      placeholder.className = 'shop-slot empty';
      placeholder.textContent = 'Vendido';
      if (item && item.kind === 'joker') {
        jokersContainer.appendChild(placeholder);
      } else {
        consumablesContainer.appendChild(placeholder);
      }
      return;
    }

    const div = document.createElement('div');
    div.className = 'shop-item';
    let inner = '';

    if (item.kind === 'joker') {
      const j = item.data;
      const styleObj = getJokerImageStyle(j);
      const styleStr = Object.entries(styleObj).map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${v}`).join(';');
      inner = `<div class="joker rarity-${j.rarity}" style="${styleStr}">
        <div class="joker-name">${j.name}</div>
        <div class="joker-tooltip">
          <div class="tooltip-title">${j.name}</div>
          <div class="tooltip-desc">${j.desc}</div>
        </div>
      </div>`;
      inner += `<div class="price">$${item.price}</div>`;
      div.innerHTML = inner;
      div.addEventListener('click', () => onBuy(i));
      jokersContainer.appendChild(div);

    } else {
      inner = `<div class="consumable-shop">
        <div class="consumable-name">${item.data.name}</div>
        <div class="consumable-desc">${item.data.desc}</div>
      </div>`;
      inner += `<div class="price">$${item.price}</div>`;
      div.innerHTML = inner;
      div.addEventListener('click', () => onBuy(i));
      consumablesContainer.appendChild(div);
    }
  });
}

export function renderPodium(scores, container) {
  container.innerHTML = '';
  if (scores.length === 0) {
    container.innerHTML = '<li class="empty">Nenhum placar ainda!</li>';
    return;
  }
  scores.forEach((s, i) => {
    const li = document.createElement('li');
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    li.innerHTML = `<span class="medal">${medal}</span> <span class="name">${escapeHTML(s.name)}</span> <span class="score">${s.score.toLocaleString('pt-BR')}</span>`;
    container.appendChild(li);
  });
}

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const DISPLAY_ORDER = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function floatText(parent, text, kind) {
  const span = document.createElement('span');
  span.className = `float-text float-${kind}`;
  span.textContent = text;
  parent.appendChild(span);
  setTimeout(() => span.remove(), 900);
}

function bumpNum(el) {
  el.classList.remove('num-tick');
  void el.offsetWidth;
  el.classList.add('num-tick');
}

const round2 = (n) => Math.round(n * 100) / 100;

export async function runScoringSequence({ handContainer, selectedArr, details, jokersContainer }) {
  const wrappers = handContainer.querySelectorAll('.card-wrapper');
  wrappers.forEach((w, i) => {
    if (!selectedArr.includes(i)) w.classList.add('dimmed');
  });

  const evalBox = document.getElementById('eval-box');
  const nameEl = document.getElementById('eval-hand-name');
  const chipsEl = document.getElementById('eval-chips');
  const multEl = document.getElementById('eval-mult');

  nameEl.textContent = details.handName;
  chipsEl.textContent = details.baseChips;
  multEl.textContent = details.baseMult;
  evalBox.classList.add('scoring');

  await sleep(350);

  for (const ev of details.events) {
    if (ev.type === 'card') {
      sfxCardScore();
      const w = wrappers[selectedArr[ev.cardIndex]];
      if (w) {
        w.classList.remove('card-proc');
        void w.offsetWidth;
        w.classList.add('card-proc');
        floatText(w, `+${ev.value}`, 'chips');
      }
      chipsEl.textContent = ev.chips;
      bumpNum(chipsEl);
      await sleep(300);
    } else if (ev.type === 'cardSkipped') {
      const w = wrappers[selectedArr[ev.cardIndex]];
      if (w) w.classList.add('skipped-card');
      await sleep(120);
    } else if (ev.type === 'cardBlocked') {
      const w = wrappers[selectedArr[ev.cardIndex]];
      if (w) {
        w.classList.add('blocked-card');
        floatText(w, '✕', 'blocked');
      }
      await sleep(200);
    } else if (ev.type === 'joker') {
      sfxJokerProc();
      const jEl = jokersContainer.children[ev.jokerIndex];
      if (jEl) {
        jEl.classList.remove('joker-proc');
        void jEl.offsetWidth;
        jEl.classList.add('joker-proc');
        const label = ev.kind === 'xmult' ? `×${ev.value}` : ev.kind === 'money' ? `$${ev.value}` : `+${ev.value}`;
        floatText(jEl, label, ev.kind);
      }
      chipsEl.textContent = ev.chips;
      multEl.textContent = round2(ev.mult);
      if (ev.kind === 'chips' || ev.kind === 'money') bumpNum(chipsEl);
      else bumpNum(multEl);
      await sleep(380);
    }
  }

  await sleep(200);

  evalBox.classList.remove('scoring');
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function showMessage(msg, duration = 2000) {
  let box = document.getElementById('message-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'message-box';
    document.body.appendChild(box);
  }
  box.textContent = msg;
  box.classList.add('show');
  setTimeout(() => box.classList.remove('show'), duration);
}

export function initHandsReference() {
  const overlay = document.getElementById('hands-reference');
  const list = document.getElementById('hands-reference-list');
  const btnClose = document.getElementById('btn-close-hands');
  const evalBox = document.getElementById('eval-box');

  list.innerHTML = '';
  POKER_HANDS.forEach(h => {
    const item = document.createElement('div');
    item.className = 'hand-ref-item';
    item.innerHTML = `
      <span class="hand-ref-name">${h.name}</span>
      <span class="hand-ref-stats">
        <span class="hand-ref-chips">${h.chips}</span> fichas
        &nbsp;×&nbsp;
        <span class="hand-ref-mult">${h.mult}</span> mult
      </span>
    `;
    list.appendChild(item);
  });

  evalBox.addEventListener('click', () => {
    overlay.classList.add('active');
  });

  btnClose.addEventListener('click', () => {
    overlay.classList.remove('active');
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('active');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') overlay.classList.remove('active');
  });
}

export function initDeckReference(getState) {
  const overlay = document.getElementById('deck-reference');
  const grid = document.getElementById('deck-reference-grid');
  const btnClose = document.getElementById('btn-close-deck');
  const deckPile = document.getElementById('deck-pile');

  function render() {
    const state = getState();
    grid.innerHTML = '';
    SUITS.forEach(suit => {
      const isRed = suit === 'Hearts' || suit === 'Diamonds';
      const suitLabel = document.createElement('div');
      suitLabel.className = 'deck-suit-label ' + (isRed ? 'red' : 'black');
      suitLabel.textContent = SUIT_SYMBOL[suit];
      grid.appendChild(suitLabel);

      DISPLAY_ORDER.forEach(rank => {
        const card = state.deck.find(c => c.suit === suit && c.rank === rank);
        const inHand = state.hand.some(c => c.suit === suit && c.rank === rank);
        const inUsed = state.usedPile.some(c => c.suit === suit && c.rank === rank);
        const colorClass = isRed ? 'red' : 'black';
        let statusClass = '';
        if (inHand) statusClass = 'in-hand';
        else if (inUsed) statusClass = 'played';
        else if (card) statusClass = 'in-deck';
        else return;

        const el = document.createElement('div');
        el.className = `deck-card ${colorClass} ${statusClass}`;
        el.innerHTML = `
          <span class="dc-rank">${rank}</span>
          <span class="dc-center">${SUIT_SYMBOL[suit]}</span>
        `;
        grid.appendChild(el);
      });
    });
  }

  deckPile.addEventListener('click', () => {
    render();
    overlay.classList.add('active');
  });

  btnClose.addEventListener('click', () => {
    overlay.classList.remove('active');
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('active');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') overlay.classList.remove('active');
  });
}
