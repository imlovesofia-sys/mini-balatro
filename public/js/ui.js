import { SUIT_SYMBOL, POKER_HANDS, SUITS } from './constants.js';
import { sfxCardScore, sfxJokerProc, sfxSintonia } from './audio.js';

export function getJokerImageStyle(joker) {
  return {
    backgroundImage: `url('/img/jokers/${joker.id}.png')`,
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center'
  };
}

export function buildJokerStatus(joker, state) {
  const e = joker.effect;
  const lines = [];

  switch (e.type) {
    case 'suitMastery': {
      const counts = state && state.suitDiscardCounts;
      if (counts) {
        for (const [suit, count] of Object.entries(counts)) {
          if (count > 0) {
            lines.push(`${SUIT_SYMBOL[suit] || suit} descartado: ${count}`);
          }
        }
      }
      if (joker.masteredSuit) {
        lines.push(`Naipe mestre: ${SUIT_SYMBOL[joker.masteredSuit] || joker.masteredSuit}`);
        lines.push(`+${joker.suitBonus || 0} Fichas (1ª carta)`);
      }
      break;
    }
    case 'shopPurchaseBonus': {
      lines.push(`Mult acumulado: +${joker.bonusMult || 0}`);
      break;
    }
    case 'overclock': {
      const mult = state && state.overclockMultiplier != null ? state.overclockMultiplier : 5;
      lines.push(`×${mult} Mult restante`);
      break;
    }
    case 'destroyOnDiscard': {
      const xBonus = 1 + (joker.bonusXMult || 0);
      lines.push(`×${xBonus.toFixed(1)} Mult`);
      if (state && state.destroyedByBug) lines.push(`Cartas destruídas: ${state.destroyedByBug}`);
      break;
    }
    case 'mikuMusicalDouble': {
      lines.push('×2 Fichas (sintonia)');
      break;
    }
  }

  return lines;
}

export function cardToHTML(card, selected = false) {
  if (card.stone) {
    return `<div class="card stone ${selected ? 'selected' : ''}" style="background:linear-gradient(135deg,#78716c,#57534e);border-color:#44403c;">
      <div class="card-corner top-left"><span class="rank" style="color:#d6d3d1;">🪨</span></div>
      <div class="card-center" style="color:#d6d3d1;font-size:1.5rem;">🪨</div>
      <div class="card-corner bottom-right"><span class="rank" style="color:#d6d3d1;">🪨</span></div>
    </div>`;
  }
  const symbol = SUIT_SYMBOL[card.suit];
  const isRed = card.suit === 'Hearts' || card.suit === 'Diamonds';
  const colorClass = isRed ? 'red' : 'black';
  const goldClass = card.gold ? 'gold' : '';
  const musicalClass = card.musical ? 'musical' : '';
  const propertyIcon = card.gold ? '<span class="card-property-icon gold-icon">💰</span>' : '';
  const musicalIcon = card.musical ? '<span class="card-property-icon musical-icon">🎵</span>' : '';
  return `<div class="card ${colorClass} ${goldClass} ${musicalClass} ${selected ? 'selected' : ''}">
    <div class="card-corner top-left"><span class="rank">${card.rank}</span><span class="suit">${symbol}</span></div>
    <div class="card-center">${symbol}</div>
    <div class="card-property-icons">${propertyIcon}${musicalIcon}</div>
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

  if (container.requestCenterCheck) cancelAnimationFrame(container.requestCenterCheck);
  container.requestCenterCheck = requestAnimationFrame(() => {
    const hasOverflow = container.scrollWidth > container.clientWidth + 2;
    container.classList.toggle('centered-when-fits', !hasOverflow);
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

export function renderJokers(jokers, container, onSell = null, state = null) {
  container.innerHTML = '';
  jokers.forEach((j, idx) => {
    const div = document.createElement('div');
    div.className = `joker rarity-${j.rarity}`;
    Object.assign(div.style, getJokerImageStyle(j));
    const sellPrice = Math.max(1, j.cost - 3);
    const statusLines = state ? buildJokerStatus(j, state) : [];
    const statusHtml = statusLines.length > 0
      ? `<div class="tooltip-stats">${statusLines.map(l => `<div>${l}</div>`).join('')}</div>`
      : '';
    div.innerHTML = `
      <div class="joker-name">${j.name}</div>
      <div class="joker-tooltip">
        <div class="tooltip-title">${j.name}</div>
        <div class="tooltip-desc">${j.desc}</div>${statusHtml}
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
    const hasImage = c.id && c.id.match(/^t\d+$/);
    if (hasImage) {
      btn.innerHTML = `<img src="/img/fortuna/${c.id}.png" alt="${c.name}" class="consumable-img"><br><strong>${c.name}</strong><br><span class="small">${c.desc}</span>`;
    } else {
      btn.innerHTML = `<strong>${c.name}</strong><br><span class="small">${c.desc}</span>`;
    }
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
      const hasImage = item.data.id && item.data.id.match(/^t\d+$/);
      if (hasImage) {
        inner = `<div class="consumable-shop">
          <img src="/img/fortuna/${item.data.id}.png" alt="${item.data.name}" class="consumable-shop-img">
          <div class="consumable-name">${item.data.name}</div>
          <div class="consumable-desc">${item.data.desc}</div>
        </div>`;
      } else {
        inner = `<div class="consumable-shop">
          <div class="consumable-name">${item.data.name}</div>
          <div class="consumable-desc">${item.data.desc}</div>
        </div>`;
      }
      inner += `<div class="price">$${item.price}</div>`;
      div.innerHTML = inner;
      div.addEventListener('click', () => onBuy(i));
      consumablesContainer.appendChild(div);
    }
  });
}

export function renderPackShopItem(item, index, container, onBuy) {
  const div = document.createElement('div');
  div.className = `pack-shop-card pack-tier-${item.tier.id}`;
  div.innerHTML = `
    <div class="pack-shop-name">${item.tier.name}</div>
    <div class="pack-shop-price">$${item.price}</div>
  `;
  div.addEventListener('click', () => onBuy(index));
  container.appendChild(div);
}

export async function openPackAnimation(tier, tarotCards, deckCards) {
  const modal = document.getElementById('pack-modal');
  const title = document.getElementById('pack-title');
  const subtitle = document.getElementById('pack-subtitle');
  const deckRow = document.getElementById('pack-deck-cards');
  const tarotRow = document.getElementById('pack-tarot-cards');
  const explosion = document.getElementById('pack-explosion');

  modal.className = 'modal-overlay active';
  modal.classList.add(`pack-tier-${tier.id}`);
  title.textContent = tier.name;
  subtitle.textContent = `Escolha ${tier.picks} tarô${tier.picks > 1 ? 's' : ''}`;

  deckRow.innerHTML = '';
  tarotRow.innerHTML = '';
  explosion.innerHTML = '';

  explosion.classList.remove('pack-active');
  void explosion.offsetWidth;
  explosion.classList.add('pack-active');

  const app = document.getElementById('app');
  app.classList.add('screen-shake');
  setTimeout(() => app.classList.remove('screen-shake'), 350);

  const flash = document.createElement('div');
  flash.className = 'pack-flash-overlay';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 500);

  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'pack-particle';
    const size = Math.random() * 8 + 4;
    const tx = (Math.random() - 0.5) * 400;
    const ty = (Math.random() - 0.5) * 400;
    p.style.cssText = `
      width:${size}px;height:${size}px;
      left:50%;top:50%;
      background:${Math.random() > 0.5 ? '#f59e0b' : '#fbbf24'};
      --tx:${tx}px;--ty:${ty}px;
      animation-delay:${Math.random() * 0.15}s;
    `;
    explosion.appendChild(p);
  }

  await sleep(400);

  for (let i = 0; i < deckCards.length; i++) {
    const slot = document.createElement('div');
    slot.className = 'pack-card-slot deck-card';
    slot.dataset.index = i;
    const c = deckCards[i];
    const isRed = c.suit === 'Hearts' || c.suit === 'Diamonds';
    const suitSymbol = SUIT_SYMBOL[c.suit] || '♠';
    slot.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;color:${isRed ? '#ef4444' : '#1e293b'};font-weight:bold;">
      <span style="font-size:1rem;">${c.rank}</span>
      <span style="font-size:0.9rem;">${suitSymbol}</span>
    </div>`;
    slot.style.background = '#fefce8';
    slot.style.border = '2px solid #1e293b';
    deckRow.appendChild(slot);
    await sleep(80);
  }

  for (let i = 0; i < tarotCards.length; i++) {
    const slot = document.createElement('div');
    slot.className = 'pack-card-slot pack-card-tooltip';
    slot.dataset.index = i;
    const t = tarotCards[i];
    const isLegendary = !!t.isLegendary;
    const hasTarotImg = t.id && (t.id.match(/^t\d+$/) || t.id.match(/^s\d+$/));
    const hasJokerImg = t.id && t.id.match(/^j\d+$/);
    if (isLegendary && hasJokerImg) {
      slot.style.backgroundImage = `url('/img/jokers/${t.id}.png')`;
      slot.style.backgroundSize = 'cover';
      slot.style.backgroundPosition = 'center';
      slot.style.borderColor = '#22d3ee';
      slot.innerHTML = `<div class="pack-legendary-badge">LENDÁRIA</div>
        <div class="joker-tooltip">
          <div class="tooltip-title">${t.name}</div>
          <div class="tooltip-desc">${t.desc}</div>
        </div>`;
    } else if (hasTarotImg) {
      const imgPath = `/img/fortuna/${t.id}.png`;
      slot.innerHTML = `<img src="${imgPath}" alt="${t.name}">
        <div class="joker-tooltip">
          <div class="tooltip-title">${t.name}</div>
          <div class="tooltip-desc">${t.desc}</div>
        </div>`;
    } else {
      slot.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:0.5rem;color:#e2e8f0;">${t.name}</div>
        <div class="joker-tooltip">
          <div class="tooltip-title">${t.name}</div>
          <div class="tooltip-desc">${t.desc}</div>
        </div>`;
      slot.style.background = '#1e1b4b';
    }
    tarotRow.appendChild(slot);
    await sleep(80);
  }

  return { modal, deckRow, tarotRow, title, subtitle };
}

export function selectTarotPack(slot) {
  document.querySelectorAll('#pack-tarot-cards .pack-card-slot').forEach(s => {
    s.classList.remove('selected', 'tarot-glow');
  });
  slot.classList.add('selected', 'tarot-glow');
}

export function selectDeckCardPack(slot) {
  document.querySelectorAll('#pack-deck-cards .pack-card-slot').forEach(s => {
    s.classList.remove('selected');
  });
  slot.classList.add('selected');
}

export async function flashDeckCard(slot) {
  const app = document.getElementById('app');
  app.classList.add('screen-shake');
  slot.classList.add('card-apply-flash');
  await sleep(600);
  slot.classList.remove('card-apply-flash');
  app.classList.remove('screen-shake');
}

export async function animateDestroy(slot) {
  slot.classList.add('card-destroy');
  await sleep(800);
  slot.classList.add('pack-card-removed');
  await sleep(500);
}

export async function animateConvert(slot) {
  slot.classList.add('card-convert');
  const app = document.getElementById('app');
  app.classList.add('screen-shake');
  await sleep(600);
  slot.classList.remove('card-convert');
  app.classList.remove('screen-shake');
}

export async function animateUpgrade(slot) {
  slot.classList.add('card-upgrade');
  await sleep(500);
  slot.classList.remove('card-upgrade');
}

export async function animateDuplicate(slot) {
  slot.classList.add('card-duplicate');
  await sleep(600);
  slot.classList.remove('card-duplicate');
}

export function flashNoSelect(slot) {
  slot.classList.add('pack-no-select');
  setTimeout(() => slot.classList.remove('pack-no-select'), 400);
}

export async function closePackAnimation() {
  const modal = document.getElementById('pack-modal');
  const deckRow = document.getElementById('pack-deck-cards');
  const tarotRow = document.getElementById('pack-tarot-cards');
  const deckSlots = deckRow.querySelectorAll('.pack-card-slot');
  const tarotSlots = tarotRow.querySelectorAll('.pack-card-slot');

  for (const slot of deckSlots) {
    const outX = (Math.random() - 0.5) * 600;
    const outY = -Math.random() * 400 - 100;
    const outR = (Math.random() - 0.5) * 360;
    slot.style.setProperty('--outX', `${outX}px`);
    slot.style.setProperty('--outY', `${outY}px`);
    slot.style.setProperty('--outR', `${outR}deg`);
    slot.classList.add('pack-card-flyout');
  }
  for (const slot of tarotSlots) {
    const outX = (Math.random() - 0.5) * 600;
    const outY = Math.random() * 400 + 100;
    const outR = (Math.random() - 0.5) * 360;
    slot.style.setProperty('--outX', `${outX}px`);
    slot.style.setProperty('--outY', `${outY}px`);
    slot.style.setProperty('--outR', `${outR}deg`);
    slot.classList.add('pack-card-flyout');
  }

  await sleep(500);
  modal.className = 'modal-overlay';
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
    } else if (ev.type === 'sintoniaGray') {
      for (const idx of ev.grayIndices) {
        const w = wrappers[selectedArr[idx]];
        if (w) w.classList.add('sintonia-done');
      }
      await sleep(200);
    } else if (ev.type === 'sintoniaCard') {
      sfxSintonia(ev.repIndex);
      const w = wrappers[selectedArr[ev.cardIndex]];
      if (w) {
        w.classList.remove('sintonia-proc');
        void w.offsetWidth;
        w.classList.add('sintonia-proc');
        floatText(w, `🎵 +${ev.value}`, 'sintonia');
      }
      chipsEl.textContent = ev.chips;
      multEl.textContent = round2(ev.mult);
      bumpNum(chipsEl);
      await sleep(400);
    } else if (ev.type === 'sintoniaJoker') {
      sfxSintonia(ev.repIndex);
      const jEl = jokersContainer.children[ev.jokerIndex];
      if (jEl) {
        jEl.classList.remove('joker-proc');
        void jEl.offsetWidth;
        jEl.classList.add('joker-proc');
        const label = ev.kind === 'xmult' ? `×${ev.value}` : ev.kind === 'money' ? `$${ev.value}` : `+${ev.value}`;
        floatText(jEl, `🎵 ${label}`, ev.kind);
      }
      chipsEl.textContent = ev.chips;
      multEl.textContent = round2(ev.mult);
      if (ev.kind === 'chips' || ev.kind === 'money') bumpNum(chipsEl);
      else bumpNum(multEl);
      await sleep(400);
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
