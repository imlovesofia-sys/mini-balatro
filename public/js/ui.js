import { SUIT_SYMBOL, RANK_VALUE } from './constants.js';

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

export function renderHand(hand, selectedIndices, container, newCount = 0, onSelectionChange = null) {
  container.innerHTML = '';
  const firstNew = hand.length - newCount;
  hand.forEach((card, i) => {
    const div = document.createElement('div');
    div.className = 'card-wrapper';
    if (newCount > 0 && i >= firstNew) {
      div.classList.add('deal-in');
      div.style.animationDelay = `${(i - firstNew) * 70}ms`;
    }
    div.innerHTML = cardToHTML(card, selectedIndices.has(i));
    div.addEventListener('click', () => {
      if (selectedIndices.has(i)) selectedIndices.delete(i);
      else {
        if (selectedIndices.size < 5) selectedIndices.add(i);
      }
      renderHand(hand, selectedIndices, container, 0, onSelectionChange);
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

export function renderJokers(jokers, container) {
  container.innerHTML = '';
  jokers.forEach(j => {
    const div = document.createElement('div');
    div.className = `joker rarity-${j.rarity}`;
    div.innerHTML = `<div class="joker-name">${j.name}</div><div class="joker-desc">${j.desc}</div>`;
    div.title = j.desc;
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

export function renderShopItems(items, container, onBuy) {
  container.innerHTML = '';
  items.forEach((item, i) => {
    if (!item || item.sold) {
      const placeholder = document.createElement('div');
      placeholder.className = 'shop-slot empty';
      placeholder.textContent = 'Vendido';
      container.appendChild(placeholder);
      return;
    }
    const div = document.createElement('div');
    div.className = 'shop-item';
    let inner = '';
    if (item.kind === 'joker') {
      inner = `<div class="joker rarity-${item.data.rarity}">
        <div class="joker-name">${item.data.name}</div>
        <div class="joker-desc">${item.data.desc}</div>
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
    container.appendChild(div);
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
    li.innerHTML = `<span class="medal">${medal}</span> <span class="name">${s.name}</span> <span class="score">${s.score.toLocaleString('pt-BR')}</span>`;
    container.appendChild(li);
  });
}

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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
  const totalEl = document.getElementById('eval-total');

  nameEl.textContent = details.handName;
  chipsEl.textContent = details.baseChips;
  multEl.textContent = details.baseMult;
  totalEl.textContent = '';
  evalBox.classList.add('scoring');

  await sleep(350);

  for (const ev of details.events) {
    if (ev.type === 'card') {
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
      const jEl = jokersContainer.children[ev.jokerIndex];
      if (jEl) {
        jEl.classList.remove('joker-proc');
        void jEl.offsetWidth;
        jEl.classList.add('joker-proc');
        const label = ev.kind === 'xmult' ? `×${ev.value}` : `+${ev.value}`;
        floatText(jEl, label, ev.kind);
      }
      chipsEl.textContent = ev.chips;
      multEl.textContent = round2(ev.mult);
      bumpNum(ev.kind === 'chips' ? chipsEl : multEl);
      await sleep(380);
    }
  }

  await sleep(200);
  totalEl.textContent = `= ${details.score.toLocaleString('pt-BR')}`;
  totalEl.classList.remove('total-pop');
  void totalEl.offsetWidth;
  totalEl.classList.add('total-pop');
  await sleep(900);

  evalBox.classList.remove('scoring');
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
