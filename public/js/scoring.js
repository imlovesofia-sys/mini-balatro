import { RANK_VALUE } from './constants.js';

export function calculateScore(playedCards, scoringIdx, handType, jokers, stateContext) {
  let chips = handType.chips;
  let mult = handType.mult;
  const events = [];

  playedCards.forEach((card, i) => {
    if (!scoringIdx.has(i)) {
      events.push({ type: 'cardSkipped', cardIndex: i });
      return;
    }
    if (stateContext.cardBlocked && !stateContext.cardBlocked(card)) {
      events.push({ type: 'cardBlocked', cardIndex: i });
      return;
    }
    const v = RANK_VALUE[card.rank] || 0;
    chips += v;
    events.push({ type: 'card', cardIndex: i, kind: 'chips', value: v, chips, mult });
  });

  jokers.forEach((joker, j) => {
    const e = joker.effect;
    const emit = (kind, value) =>
      events.push({ type: 'joker', jokerIndex: j, name: joker.name, kind, value, chips, mult });

    switch (e.type) {
      case 'flatMult':
        mult += e.value; emit('mult', e.value); break;
      case 'flatChips':
        chips += e.value; emit('chips', e.value); break;
      case 'xMult':
        mult *= e.value; emit('xmult', e.value); break;
      case 'perSuit': {
        const count = playedCards.filter(c => c.suit === e.suit).length;
        if (count > 0) {
          const total = count * e.value;
          if (e.target === 'mult') { mult += total; emit('mult', total); }
          else { chips += total; emit('chips', total); }
        }
        break;
      }
      case 'perJoker': {
        const bonus = jokers.length * e.value;
        mult += bonus; emit('mult', bonus);
        break;
      }
      case 'moneyPerDollar': {
        const bonus = stateContext.money * e.value;
        chips += bonus; emit('chips', bonus);
        break;
      }
      case 'onHand': {
        if (handType.tier >= e.minTier) {
          if (e.bonus.type === 'flatMult') { mult += e.bonus.value; emit('mult', e.bonus.value); }
          else if (e.bonus.type === 'flatChips') { chips += e.bonus.value; emit('chips', e.bonus.value); }
          else if (e.bonus.type === 'xMult') { mult *= e.bonus.value; emit('xmult', e.bonus.value); }
        }
        break;
      }
      case 'onScore': {
        const currentScore = chips * mult;
        if (currentScore > e.threshold) {
          if (e.bonus.type === 'flatMult') { mult += e.bonus.value; emit('mult', e.bonus.value); }
          else if (e.bonus.type === 'xMult') { mult *= e.bonus.value; emit('xmult', e.bonus.value); }
        }
        break;
      }
      case 'chance': {
        if (Math.random() < e.chance) {
          if (e.bonus.type === 'xMult') { mult *= e.bonus.value; emit('xmult', e.bonus.value); }
          else if (e.bonus.type === 'flatMult') { mult += e.bonus.value; emit('mult', e.bonus.value); }
        }
        break;
      }
      case 'roundEnd':
        break;
    }
  });

  const finalScore = Math.floor(chips * mult);
  return { score: finalScore, chips, mult, events };
}

export function applyRoundEndRewards(jokers, stateContext) {
  let money = 0;
  for (const joker of jokers) {
    if (joker.effect.type === 'roundEnd') {
      money += joker.effect.reward;
    }
  }
  stateContext.money += money;
  return money;
}
