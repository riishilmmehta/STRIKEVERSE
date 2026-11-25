import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_MAX_ROUNDS,
  ARENA_ROUNDS_TO_WIN,
  createInitialRoundState,
  resolveArenaRoundEnd,
  rollMatchItemDrop,
  selectTopReplayHighlights,
} from './roundRules';
import type { ReplayHighlightClip } from './types';

test('4-Round 1v1 Arena advances through 3-0 sweep, 3-1 victory, 0-3 defeat, and 2-2 Round 4 tiebreak', () => {
  const start = createInitialRoundState();
  assert.equal(start.roundNumber, 1);
  assert.equal(start.playerRounds, 0);
  assert.equal(start.opponentRounds, 0);
  assert.equal(start.roundsToWin, ARENA_ROUNDS_TO_WIN);
  assert.equal(start.maxRounds, ARENA_MAX_ROUNDS);
  assert.equal(start.maxRounds, 4);

  // 3-1 victory across 4 rounds
  const r1 = resolveArenaRoundEnd(start, 'player');
  assert.equal(r1.matchFinished, false);
  assert.equal(r1.next.roundNumber, 2);
  assert.equal(r1.next.bannerText, 'ROUND 2 · FIGHT!');

  const r2 = resolveArenaRoundEnd(r1.next, 'opponent');
  assert.equal(r2.matchFinished, false);
  assert.equal(r2.next.roundNumber, 3);
  assert.equal(r2.next.bannerText, 'ROUND 3 · FIGHT!');

  const r3 = resolveArenaRoundEnd(r2.next, 'player');
  assert.equal(r3.matchFinished, false);
  assert.equal(r3.next.playerRounds, 2);
  assert.equal(r3.next.opponentRounds, 1);
  assert.equal(r3.next.roundNumber, 4);
  assert.equal(r3.next.bannerText, 'FINAL ROUND · FIGHT!');

  const r4Win = resolveArenaRoundEnd(r3.next, 'player');
  assert.equal(r4Win.matchFinished, true);
  assert.equal(r4Win.playerWonMatch, true);
  assert.equal(r4Win.next.playerRounds, 3);
  assert.equal(r4Win.next.opponentRounds, 1);

  // 2-2 tie after Round 4 resolves cleanly without a 5th round (Round 4 clutch winner takes match)
  const r4TieOpponent = resolveArenaRoundEnd(r3.next, 'opponent');
  assert.equal(r4TieOpponent.matchFinished, true);
  assert.equal(r4TieOpponent.playerWonMatch, false);
  assert.equal(r4TieOpponent.next.playerRounds, 2);
  assert.equal(r4TieOpponent.next.opponentRounds, 2);

  // Clean 3-0 sweep finishes in 3 rounds
  const s1 = resolveArenaRoundEnd(start, 'player');
  const s2 = resolveArenaRoundEnd(s1.next, 'player');
  const s3 = resolveArenaRoundEnd(s2.next, 'player');
  assert.equal(s3.matchFinished, true);
  assert.equal(s3.playerWonMatch, true);
  assert.equal(s3.next.playerRounds, 3);

  // Opponent 3-0 sweep -> defeat
  const o1 = resolveArenaRoundEnd(start, 'opponent');
  const o2 = resolveArenaRoundEnd(o1.next, 'opponent');
  const o3 = resolveArenaRoundEnd(o2.next, 'opponent');
  assert.equal(o3.matchFinished, true);
  assert.equal(o3.playerWonMatch, false);
  assert.equal(o3.next.opponentRounds, 3);
});

test('rollMatchItemDrop awards deterministic tier-appropriate loot on victories', () => {
  const lossDrop = rollMatchItemDrop({
    victory: false,
    maxCombo: 2,
    parriesLanded: 1,
    seed: 1,
  });
  assert.equal(lossDrop, undefined);

  const parryDrop = rollMatchItemDrop({
    victory: true,
    maxCombo: 4,
    parriesLanded: 2,
    seed: 3,
  });
  assert.ok(parryDrop);
  assert.equal(parryDrop.name, 'Aegis Parry Sigil');

  const highComboDrop = rollMatchItemDrop({
    victory: true,
    maxCombo: 7,
    parriesLanded: 0,
    seed: 5,
  });
  assert.ok(highComboDrop);
  assert.equal(highComboDrop.rarity, 'Legendary');
});

test('selectTopReplayHighlights picks highest-impact clips and sorts chronologically', () => {
  const clips: ReplayHighlightClip[] = [
    {
      id: 1,
      timestampSec: 5,
      kind: 'combo',
      title: 'Combo A',
      detail: '3-hit',
      damage: 40,
      impactScore: 60,
      accentHex: '#f59e0b',
    },
    {
      id: 2,
      timestampSec: 12,
      kind: 'finisher',
      title: 'Dragon Finisher',
      detail: 'K-J-K',
      damage: 78,
      impactScore: 110,
      accentHex: '#ef4444',
    },
    {
      id: 3,
      timestampSec: 18,
      kind: 'parry',
      title: 'Perfect Parry',
      detail: 'Counter launch',
      damage: 55,
      impactScore: 92,
      accentHex: '#38bdf8',
    },
    {
      id: 4,
      timestampSec: 25,
      kind: 'ko',
      title: 'Final KO',
      detail: 'Knockout',
      damage: 85,
      impactScore: 140,
      accentHex: '#facc15',
    },
  ];

  const top3 = selectTopReplayHighlights(clips, 3);
  assert.equal(top3.length, 3);
  assert.deepEqual(
    top3.map((c) => c.id),
    [2, 3, 4]
  );
});
