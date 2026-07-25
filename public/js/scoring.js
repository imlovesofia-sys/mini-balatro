import { RANK_VALUE } from './constants.js';

export function calculateScore(playedCards, scoringIdx, handType, jokers, stateContext) {
  let chips = handType.chips;
  let mult = handType.mult;
  let moneyBonus = 0;
  const events = [];

  const hasProbabilityDouble = jokers.some(j => j.effect.type === 'probabilityDouble');

  playedCards.forEach((card, i) => {
    if (!scoringIdx.has(i)) {
      events.push({ type: 'cardSkipped', cardIndex: i });
      return;
    }
    if (stateContext.cardAllowed && !stateContext.cardAllowed(card)) {
      events.push({ type: 'cardBlocked', cardIndex: i });
      return;
    }
    const v = card.stone ? 50 : (RANK_VALUE[card.rank] || 0);
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
        const chanceVal = hasProbabilityDouble ? e.chance * 2 : e.chance;
        if (Math.random() < chanceVal) {
          if (e.bonus.type === 'xMult') { mult *= e.bonus.value; emit('xmult', e.bonus.value); }
          else if (e.bonus.type === 'flatMult') { mult += e.bonus.value; emit('mult', e.bonus.value); }
        }
        break;
      }
      case 'lowRankBonus': {
        const lowCards = playedCards.filter((c, i) => scoringIdx.has(i) && RANK_VALUE[c.rank] <= 4);
        if (lowCards.length > 0) {
          const chipsBonus = lowCards.length * 25;
          const multBonus = lowCards.length * 5;
          chips += chipsBonus;
          mult += multBonus;
          emit('chips', chipsBonus);
          emit('mult', multBonus);
        }
        break;
      }
      case 'parityBonus': {
        playedCards.forEach((card, i) => {
          if (!scoringIdx.has(i)) return;
          const val = card.stone ? 50 : (RANK_VALUE[card.rank] || 0);
          if (val % 2 === 0) {
            chips += 10;
            events.push({ type: 'joker', jokerIndex: j, name: joker.name, kind: 'chips', value: 10, chips, mult });
          } else {
            mult += 4;
            events.push({ type: 'joker', jokerIndex: j, name: joker.name, kind: 'mult', value: 4, chips, mult });
          }
        });
        break;
      }
      case 'allBlackHand': {
        const allBlack = playedCards.length > 0 && playedCards.every(c => c.suit === 'Clubs' || c.suit === 'Spades');
        if (allBlack) {
          mult *= 1.5;
          emit('xmult', 1.5);
        }
        break;
      }
      case 'stoneBonus': {
        const stoneCards = playedCards.filter((c, i) => scoringIdx.has(i) && c.stone);
        if (stoneCards.length > 0) {
          const cBonus = stoneCards.length * 30;
          const mBonus = stoneCards.length * 10;
          chips += cBonus;
          mult += mBonus;
          emit('chips', cBonus);
          emit('mult', mBonus);
        }
        break;
      }
      case 'spadeDoubleScore': {
        const spades = playedCards.filter((c, i) => scoringIdx.has(i) && c.suit === 'Spades');
        spades.forEach(card => {
          const v = card.stone ? 50 : (RANK_VALUE[card.rank] || 0);
          chips += v;
          events.push({ type: 'joker', jokerIndex: j, name: joker.name, kind: 'chips', value: v, chips, mult });
        });
        break;
      }
      case 'suitCombo': {
        const hasClubs = playedCards.some(c => c.suit === 'Clubs');
        const hasDiamonds = playedCards.some(c => c.suit === 'Diamonds');
        if (hasClubs && hasDiamonds) {
          chips += 15;
          emit('chips', 15);
        }
        break;
      }
      case 'rankSequenceBonus': {
        const prev = stateContext.previousHand;
        if (prev && prev.cards.some(c => c.rank === 'K')) {
          const queens = playedCards.filter((c, i) => scoringIdx.has(i) && c.rank === 'Q');
          if (queens.length > 0) {
            const bonus = Math.pow(2, queens.length);
            mult *= bonus;
            emit('xmult', bonus);
          }
        }
        break;
      }
      case 'sequentialHandBonus': {
        const prev = stateContext.previousHand;
        if (prev && prev.handType && prev.handType.id === handType.id) {
          const prevMult = prev.finalMult || 1;
          if (prevMult > 1) {
            mult *= prevMult;
            emit('xmult', prevMult);
          }
        }
        break;
      }
      case 'matchBaseChips': {
        const prev = stateContext.previousHand;
        if (prev && prev.baseChips === handType.chips) {
          moneyBonus += 15;
          emit('money', 15);
        }
        break;
      }
      case 'overclock': {
        const ocMult = stateContext.overclockMultiplier || 5;
        if (ocMult > 0) {
          mult *= ocMult;
          emit('xmult', ocMult);
        }
        break;
      }
      case 'perfectDiscard': {
        if (stateContext.perfectDiscardTriggered && stateContext.handsPlayedThisRound === 0) {
          mult *= 3;
          emit('xmult', 3);
          stateContext.perfectDiscardTriggered = false;
        }
        break;
      }
      case 'shopPurchaseBonus': {
        const bonus = joker.bonusMult || 0;
        if (bonus > 0) {
          mult += bonus;
          emit('mult', bonus);
        }
        break;
      }
      case 'destroyOnDiscard': {
        const xBonus = 1 + (joker.bonusXMult || 0);
        if (xBonus > 1) {
          mult *= xBonus;
          emit('xmult', xBonus);
        }
        break;
      }
      case 'suitMastery': {
        const sBonus = joker.suitBonus || 0;
        if (sBonus > 0) {
          chips += sBonus;
          emit('chips', sBonus);
        }
        break;
      }
      case 'roundEnd':
      case 'dividends':
      case 'realEstate':
      case 'onReroll':
      case 'tarotHook':
      case 'extraSlot':
        break;
    }
  });

  const finalScore = Math.floor(chips * mult);
  return { score: finalScore, chips, mult, events, moneyBonus };
}

export function applyRoundEndRewards(jokers, stateContext) {
  let money = 0;
  const hasSuitMastery = jokers.find(j => j.effect.type === 'suitMastery');

  for (const joker of jokers) {
    const e = joker.effect;
    switch (e.type) {
      case 'roundEnd':
        money += e.reward;
        break;
      case 'dividends': {
        const diamondsInDeck = stateContext.deck.filter(c => c.suit === 'Diamonds').length;
        money += diamondsInDeck;
        break;
      }
      case 'realEstate': {
        const handsWithDiamonds = (stateContext.handsPlayedWithDiamonds || 0);
        money += handsWithDiamonds * 3;
        break;
      }
      case 'shopPurchaseBonus': {
        money += (stateContext.shopPurchases || 0) * 2;
        break;
      }
    }
  }

  if (hasSuitMastery && stateContext.masteredSuit) {
    const suit = stateContext.masteredSuit;
    const bonus = stateContext.deck.filter(c => c.suit === suit).length * 15;
    if (bonus > 0) {
      jokers.forEach(j => {
        if (j.effect.type === 'suitMastery') {
          j.suitBonus = (j.suitBonus || 0) + bonus;
        }
      });
    }
  }

  stateContext.money += money;
  return money;
}
