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

    const suitMasteryJoker = jokers.find(j => j.effect.type === 'suitMastery');
    if (suitMasteryJoker && suitMasteryJoker.masteredSuit && card.suit === suitMasteryJoker.masteredSuit && !suitMasteryJoker.suitMasteryUsedInHand) {
      const sBonus = suitMasteryJoker.suitBonus || 0;
      if (sBonus > 0) {
        chips += sBonus;
        suitMasteryJoker.suitMasteryUsedInHand = true;
        const jIdx = jokers.indexOf(suitMasteryJoker);
        events.push({ type: 'joker', jokerIndex: jIdx, name: suitMasteryJoker.name, kind: 'chips', value: sBonus, chips, mult });
      }
    }

    jokers.forEach((joker, j) => {
      if (joker.effect.type === 'envy') return;
      const e = joker.effect;
      const emit = (kind, value) =>
        events.push({ type: 'joker', jokerIndex: j, name: joker.name, kind, value, chips, mult });

      switch (e.type) {
        case 'perSuit': {
          if (card.suit === e.suit) {
            if (e.target === 'mult') { mult += e.value; emit('mult', e.value); }
            else { chips += e.value; emit('chips', e.value); }
          }
          break;
        }
        case 'lowRankBonus': {
          if (RANK_VALUE[card.rank] <= 4) {
            chips += 25; mult += 5;
            emit('chips', 25);
            emit('mult', 5);
          }
          break;
        }
        case 'stoneBonus': {
          if (card.stone) {
            chips += 30; mult += 10;
            emit('chips', 30);
            emit('mult', 10);
          }
          break;
        }
        case 'spadeDoubleScore': {
          if (card.suit === 'Spades') {
            const sv = card.stone ? 50 : (RANK_VALUE[card.rank] || 0);
            chips += sv;
            emit('chips', sv);
          }
          break;
        }
        case 'parityBonus': {
          const val = card.stone ? 50 : (RANK_VALUE[card.rank] || 0);
          if (val % 2 === 0) {
            chips += 10;
            emit('chips', 10);
          } else {
            mult += 4;
            emit('mult', 4);
          }
          break;
        }
        case 'rankSequenceBonus': {
          const prev = stateContext.previousHand;
          if (prev && prev.cards.some(c => c.rank === 'K') && card.rank === 'Q') {
            mult *= 2;
            emit('xmult', 2);
          }
          break;
        }
      }
    });

    jokers.forEach((joker, j) => {
      if (joker.effect.type !== 'envy') return;
      const envyIdx = jokers.indexOf(joker);
      const rightJoker = envyIdx < jokers.length - 1 ? jokers[envyIdx + 1] : null;
      if (!rightJoker || !rightJoker.effect) return;
      const re = rightJoker.effect;
      const emit = (kind, value) =>
        events.push({ type: 'joker', jokerIndex: j, name: joker.name, kind, value, chips, mult });

      switch (re.type) {
        case 'perSuit':
          if (card.suit === re.suit) {
            if (re.target === 'mult') { mult += re.value; emit('mult', re.value); }
            else { chips += re.value; emit('chips', re.value); }
          }
          break;
        case 'lowRankBonus':
          if (RANK_VALUE[card.rank] <= 4) { chips += 25; mult += 5; emit('chips', 25); emit('mult', 5); }
          break;
        case 'stoneBonus':
          if (card.stone) { chips += 30; mult += 10; emit('chips', 30); emit('mult', 10); }
          break;
        case 'spadeDoubleScore':
          if (card.suit === 'Spades') { const sv = card.stone ? 50 : (RANK_VALUE[card.rank] || 0); chips += sv; emit('chips', sv); }
          break;
        case 'parityBonus': {
          const val = card.stone ? 50 : (RANK_VALUE[card.rank] || 0);
          if (val % 2 === 0) { chips += 10; emit('chips', 10); } else { mult += 4; emit('mult', 4); }
          break;
        }
        case 'rankSequenceBonus': {
          const prev = stateContext.previousHand;
          if (prev && prev.cards.some(c => c.rank === 'K') && card.rank === 'Q') { mult *= 2; emit('xmult', 2); }
          break;
        }
      }
    });
  });

  jokers.forEach((joker, j) => {
    if (joker.effect.type === 'envy') return;
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
      case 'allBlackHand': {
        const allBlack = playedCards.length > 0 && playedCards.every(c => c.suit === 'Clubs' || c.suit === 'Spades');
        if (allBlack) {
          mult *= 1.5;
          emit('xmult', 1.5);
        }
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
      case 'sequentialHandBonus': {
        const prev = stateContext.previousHand;
        if (prev && prev.handType && prev.handType.id === handType.id && stateContext.handsPlayedThisRound === 1) {
          const prevMult = prev.finalMult || 1;
          if (prevMult > 1) {
            const bonusMult = Math.floor(prevMult / 2);
            mult += bonusMult;
            emit('mult', bonusMult);
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
        break;
      }
      case 'balance': {
        mult += joker.effect.mult || 25;
        emit('mult', joker.effect.mult || 25);
        break;
      }
      case 'perSuit':
      case 'lowRankBonus':
      case 'stoneBonus':
      case 'spadeDoubleScore':
      case 'parityBonus':
      case 'rankSequenceBonus':
        break;
      case 'roundEnd':
      case 'dividends':
      case 'realEstate':
      case 'onReroll':
      case 'tarotHook':
      case 'extraSlot':
      case 'mikuMusicalDouble':
        break;
    }
  });

  jokers.forEach((joker, j) => {
    if (joker.effect.type !== 'envy') return;
    const envyIdx = jokers.indexOf(joker);
    const rightJoker = envyIdx < jokers.length - 1 ? jokers[envyIdx + 1] : null;
    if (!rightJoker || !rightJoker.effect) return;
    const re = rightJoker.effect;
    const emit = (kind, value) =>
      events.push({ type: 'joker', jokerIndex: j, name: joker.name, kind, value, chips, mult });

    switch (re.type) {
      case 'flatMult':
        mult += re.value;
        emit('mult', re.value);
        break;
      case 'flatChips':
        chips += re.value;
        emit('chips', re.value);
        break;
      case 'xMult':
        mult *= re.value;
        emit('xmult', re.value);
        break;
      case 'overclock': {
        const ocMult = stateContext.overclockMultiplier || 5;
        if (ocMult > 0) { mult *= ocMult; emit('xmult', ocMult); }
        break;
      }
      case 'perfectDiscard':
        if (stateContext.perfectDiscardTriggered && stateContext.handsPlayedThisRound === 0) {
          mult *= 3;
          emit('xmult', 3);
        }
        break;
      case 'matchBaseChips': {
        const prev = stateContext.previousHand;
        if (prev && prev.baseChips === handType.chips) {
          moneyBonus += 15;
          emit('money', 15);
        }
        break;
      }
      case 'sequentialHandBonus': {
        const prev = stateContext.previousHand;
        if (prev && prev.handType && prev.handType.id === handType.id && stateContext.handsPlayedThisRound === 1) {
          const prevMult = prev.finalMult || 1;
          if (prevMult > 1) {
            const bonusMult = Math.floor(prevMult / 2);
            mult += bonusMult;
            emit('mult', bonusMult);
          }
        }
        break;
      }
      case 'shopPurchaseBonus': {
        const bonus = rightJoker.bonusMult || 0;
        if (bonus > 0) { mult += bonus; emit('mult', bonus); }
        break;
      }
      case 'destroyOnDiscard': {
        const xBonus = 1 + (rightJoker.bonusXMult || 0);
        if (xBonus > 1) { mult *= xBonus; emit('xmult', xBonus); }
        break;
      }
      case 'suitCombo': {
        const hasClubs = playedCards.some(c => c.suit === 'Clubs');
        const hasDiamonds = playedCards.some(c => c.suit === 'Diamonds');
        if (hasClubs && hasDiamonds) { chips += 15; emit('chips', 15); }
        break;
      }
      case 'allBlackHand': {
        const allBlack = playedCards.length > 0 && playedCards.every(c => c.suit === 'Clubs' || c.suit === 'Spades');
        if (allBlack) { mult *= 1.5; emit('xmult', 1.5); }
        break;
      }
    }
  });

  const finalScore = Math.floor(chips * mult);
  return { score: finalScore, chips, mult, events, moneyBonus };
}

export function calculateSintonia(playedCards, jokers, stateContext, baseChips, baseMult) {
  const ROYALTY = new Set(['J', 'Q', 'K']);
  const musicalGroups = new Map();

  playedCards.forEach((card, i) => {
    if (!card.musical) return;
    if (stateContext.cardAllowed && !stateContext.cardAllowed(card)) return;

    let key;
    if (ROYALTY.has(card.rank)) {
      key = `${card.suit}-royal`;
    } else {
      key = `${card.suit}-${card.rank}`;
    }

    if (!musicalGroups.has(key)) musicalGroups.set(key, []);
    musicalGroups.get(key).push({ card, index: i });
  });

  const sintoniaResults = [];

  for (const [key, group] of musicalGroups) {
    if (group.length < 2) continue;

    for (let rep = 1; rep < group.length; rep++) {
      let chips = baseChips;
      let mult = baseMult;
      const repEvents = [];
      const grayIndices = [];

      for (let g = 0; g < rep; g++) {
        grayIndices.push(group[g].index);
      }

      const hasMikuMusicalDouble = jokers.some(j => j.effect.type === 'mikuMusicalDouble');

      for (let c = rep; c < group.length; c++) {
        const target = group[c];
        let v = target.card.stone ? 50 : (RANK_VALUE[target.card.rank] || 0);
        if (hasMikuMusicalDouble) v *= 2;
        chips += v;
        repEvents.push({ type: 'sintoniaCard', cardIndex: target.index, kind: 'chips', value: v, chips, mult, repIndex: rep });

        if (hasMikuMusicalDouble) {
          const mikuJoker = jokers.find(j => j.effect.type === 'mikuMusicalDouble');
          if (mikuJoker) {
            const mIdx = jokers.indexOf(mikuJoker);
            const mikuBonus = v / 2;
            repEvents.push({ type: 'sintoniaJoker', jokerIndex: mIdx, name: mikuJoker.name, kind: 'chips', value: mikuBonus, chips, mult, repIndex: rep });
          }
        }

        const suitMasteryJoker = jokers.find(j => j.effect.type === 'suitMastery');
        if (suitMasteryJoker && suitMasteryJoker.masteredSuit && target.card.suit === suitMasteryJoker.masteredSuit && !suitMasteryJoker.suitMasteryUsedInHand) {
          const sBonus = suitMasteryJoker.suitBonus || 0;
          if (sBonus > 0) {
            chips += sBonus;
            suitMasteryJoker.suitMasteryUsedInHand = true;
            const jIdx = jokers.indexOf(suitMasteryJoker);
            repEvents.push({ type: 'sintoniaJoker', jokerIndex: jIdx, name: suitMasteryJoker.name, kind: 'chips', value: sBonus, chips, mult, repIndex: rep });
          }
        }

        jokers.forEach((joker, j) => {
          const e = joker.effect;
          const emit = (kind, value) =>
            repEvents.push({ type: 'sintoniaJoker', jokerIndex: j, name: joker.name, kind, value, chips, mult, repIndex: rep });

          switch (e.type) {
            case 'perSuit': {
              if (target.card.suit === e.suit) {
                if (e.target === 'mult') { mult += e.value; emit('mult', e.value); }
                else { chips += e.value; emit('chips', e.value); }
              }
              break;
            }
            case 'lowRankBonus': {
              if (RANK_VALUE[target.card.rank] <= 4) {
                chips += 25; mult += 5;
                emit('chips', 25);
                emit('mult', 5);
              }
              break;
            }
            case 'stoneBonus': {
              if (target.card.stone) {
                chips += 30; mult += 10;
                emit('chips', 30);
                emit('mult', 10);
              }
              break;
            }
            case 'spadeDoubleScore': {
              if (target.card.suit === 'Spades') {
                const sv = target.card.stone ? 50 : (RANK_VALUE[target.card.rank] || 0);
                chips += sv;
                emit('chips', sv);
              }
              break;
            }
            case 'parityBonus': {
              const val = target.card.stone ? 50 : (RANK_VALUE[target.card.rank] || 0);
              if (val % 2 === 0) {
                chips += 10;
                emit('chips', 10);
              } else {
                mult += 4;
                emit('mult', 4);
              }
              break;
            }
          }
        });
      }

      jokers.forEach((joker, j) => {
        const e = joker.effect;
        const emit = (kind, value) =>
          repEvents.push({ type: 'sintoniaJoker', jokerIndex: j, name: joker.name, kind, value, chips, mult, repIndex: rep });

        switch (e.type) {
          case 'flatMult': mult += e.value; emit('mult', e.value); break;
          case 'flatChips': chips += e.value; emit('chips', e.value); break;
          case 'xMult': mult *= e.value; emit('xmult', e.value); break;
          case 'perJoker': {
            const bonus = jokers.length * e.value;
            mult += bonus; emit('mult', bonus);
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
          case 'perSuit':
          case 'lowRankBonus':
          case 'stoneBonus':
          case 'spadeDoubleScore':
          case 'parityBonus':
          case 'roundEnd':
          case 'dividends':
          case 'realEstate':
          case 'onReroll':
          case 'tarotHook':
          case 'extraSlot':
          case 'destroyOnDiscard':
          case 'suitMastery':
          case 'matchBaseChips':
          case 'sequentialHandBonus':
          case 'rankSequenceBonus':
          case 'perfectDiscard':
          case 'shopPurchaseBonus':
          case 'allBlackHand':
          case 'suitCombo':
          case 'probabilityDouble':
          case 'mikuMusicalDouble':
            break;
        }
      });

      const finalScore = Math.floor(chips * mult);
      sintoniaResults.push({
        repIndex: rep,
        grayIndices,
        score: finalScore,
        chips,
        mult,
        events: repEvents
      });
    }
  }

  return sintoniaResults;
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
    const discardCount = (stateContext.suitDiscardCounts && stateContext.suitDiscardCounts[suit]) || 0;
    const bonus = discardCount * 15;
    jokers.forEach(j => {
      if (j.effect.type === 'suitMastery') {
        j.suitBonus = bonus;
        j.masteredSuit = suit;
        j.suitMasteryUsedInHand = false;
      }
    });
  }

  const goldCards = stateContext.hand.filter(c => c.gold).length;
  if (goldCards > 0) {
    money += goldCards * 3;
  }

  stateContext.money += money;
  return money;
}
