import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_DOJO_BLOCKS } from './dojoRules';
import {
  COMMUNITY_DOJO_BUILDERS,
  DEFAULT_DOJO_SOCIAL_STATE,
  PLAYER_DOJO_ID,
  buildDojoLeaderboard,
  computeDojoPopularity,
  promotePlayerDojo,
  recordDojoVisit,
  toggleDojoLike,
  updatePlayerDojoName,
} from './dojoLeaderboard';

test('computeDojoPopularity weighs likes 3x higher than visits and clamps negatives', () => {
  assert.equal(computeDojoPopularity(100, 50), 250);
  assert.equal(computeDojoPopularity(0, 0), 0);
  assert.equal(computeDojoPopularity(-10, -5), 0);
});

test('buildDojoLeaderboard ranks community builders and player accurately across sort modes', () => {
  const byPop = buildDojoLeaderboard({
    social: DEFAULT_DOJO_SOCIAL_STATE,
    playerName: 'KAIRO',
    playerClassId: 'striker',
    playerAccentHex: '#f59e0b',
    playerBlocks: DEFAULT_DOJO_BLOCKS,
    sortBy: 'popularity',
  });

  assert.equal(byPop.length, COMMUNITY_DOJO_BUILDERS.length + 1);
  assert.equal(byPop[0].rank, 1);
  assert.equal(byPop[0].ownerName, 'Zara Vance');

  for (let i = 1; i < byPop.length; i++) {
    assert.ok(byPop[i - 1].popularity >= byPop[i].popularity);
    assert.equal(byPop[i].rank, i + 1);
  }

  const byLikes = buildDojoLeaderboard({
    social: DEFAULT_DOJO_SOCIAL_STATE,
    playerName: 'KAIRO',
    playerClassId: 'striker',
    playerAccentHex: '#f59e0b',
    playerBlocks: DEFAULT_DOJO_BLOCKS,
    sortBy: 'likes',
  });
  for (let i = 1; i < byLikes.length; i++) {
    assert.ok(byLikes[i - 1].likes >= byLikes[i].likes);
  }

  const byVisits = buildDojoLeaderboard({
    social: DEFAULT_DOJO_SOCIAL_STATE,
    playerName: 'KAIRO',
    playerClassId: 'striker',
    playerAccentHex: '#f59e0b',
    playerBlocks: DEFAULT_DOJO_BLOCKS,
    sortBy: 'visits',
  });
  for (let i = 1; i < byVisits.length; i++) {
    assert.ok(byVisits[i - 1].visits >= byVisits[i].visits);
  }
});

test('search filter preserves each builder global rank', () => {
  const filtered = buildDojoLeaderboard({
    social: DEFAULT_DOJO_SOCIAL_STATE,
    playerName: 'KAIRO',
    playerClassId: 'striker',
    playerAccentHex: '#f59e0b',
    playerBlocks: DEFAULT_DOJO_BLOCKS,
    sortBy: 'popularity',
    searchQuery: 'KAIRO',
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, PLAYER_DOJO_ID);
  assert.ok(filtered[0].rank > 1 && filtered[0].rank <= COMMUNITY_DOJO_BUILDERS.length + 1);
});

test('toggleDojoLike increments and decrements community likes/popularity and disallows self-like', () => {
  const selfRes = toggleDojoLike(DEFAULT_DOJO_SOCIAL_STATE, PLAYER_DOJO_ID);
  assert.equal(selfRes.liked, false);
  assert.equal(selfRes.state.likedEntryIds.length, 0);

  const targetId = COMMUNITY_DOJO_BUILDERS[0].id;
  const likedRes = toggleDojoLike(DEFAULT_DOJO_SOCIAL_STATE, targetId);
  assert.equal(likedRes.liked, true);

  const afterLike = buildDojoLeaderboard({
    social: likedRes.state,
    playerName: 'KAIRO',
    playerClassId: 'striker',
    playerAccentHex: '#f59e0b',
    playerBlocks: DEFAULT_DOJO_BLOCKS,
  });
  const top = afterLike.find((e) => e.id === targetId)!;
  assert.equal(top.likes, COMMUNITY_DOJO_BUILDERS[0].baseLikes + 1);
  assert.equal(top.popularity, computeDojoPopularity(top.visits, top.likes));
  assert.equal(top.likedByPlayer, true);

  const unlikedRes = toggleDojoLike(likedRes.state, targetId);
  assert.equal(unlikedRes.liked, false);
  assert.equal(unlikedRes.state.likedEntryIds.length, 0);
});

test('recordDojoVisit increments target visits and awards first-visit reciprocity to player Dojo', () => {
  const targetId = COMMUNITY_DOJO_BUILDERS[1].id;
  const first = recordDojoVisit(DEFAULT_DOJO_SOCIAL_STATE, targetId);
  assert.equal(first.firstVisitBonus, true);
  assert.equal(first.state.extraVisitsById[targetId], 1);
  assert.ok(first.state.playerVisits > DEFAULT_DOJO_SOCIAL_STATE.playerVisits);
  assert.ok(first.state.playerLikes > DEFAULT_DOJO_SOCIAL_STATE.playerLikes);

  const second = recordDojoVisit(first.state, targetId);
  assert.equal(second.firstVisitBonus, false);
  assert.equal(second.state.extraVisitsById[targetId], 2);
  assert.equal(second.state.playerVisits, first.state.playerVisits);
});

test('promotePlayerDojo scales with block count and elevates player ranking cleanly', () => {
  const smallPromote = promotePlayerDojo(DEFAULT_DOJO_SOCIAL_STATE, 4);
  const largePromote = promotePlayerDojo(DEFAULT_DOJO_SOCIAL_STATE, 20);

  assert.ok(largePromote.gainedVisits > smallPromote.gainedVisits);
  assert.ok(largePromote.gainedLikes > smallPromote.gainedLikes);

  let state = DEFAULT_DOJO_SOCIAL_STATE;
  const initialRank = buildDojoLeaderboard({
    social: state,
    playerName: 'KAIRO',
    playerClassId: 'striker',
    playerAccentHex: '#f59e0b',
    playerBlocks: DEFAULT_DOJO_BLOCKS,
  }).find((e) => e.isPlayer)!.rank;

  for (let i = 0; i < 4; i++) {
    state = promotePlayerDojo(state, 16).state;
  }

  const boostedRank = buildDojoLeaderboard({
    social: state,
    playerName: 'KAIRO',
    playerClassId: 'striker',
    playerAccentHex: '#f59e0b',
    playerBlocks: DEFAULT_DOJO_BLOCKS,
  }).find((e) => e.isPlayer)!.rank;

  assert.ok(boostedRank < initialRank);

  const renamed = updatePlayerDojoName(state, '  Dragon Peak Arena  ');
  assert.equal(renamed.playerDojoName, 'Dragon Peak Arena');
  const fallback = updatePlayerDojoName(state, '   ');
  assert.equal(fallback.playerDojoName, DEFAULT_DOJO_SOCIAL_STATE.playerDojoName);
});
