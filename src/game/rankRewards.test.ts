import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ARENA_BIOME_MUSIC_SPECS,
  getBiomeMusicSpec,
  getBiomeMusicTrackId,
  isArenaBiomeMusicTrack,
} from './arenaBiomeAudio';
import { ARENA_BIOME_ORDER } from './arenaRanks';
import {
  RANK_EMOTE_REWARDS,
  getNewlyUnlockedRankEmote,
  getNextRankEmoteReward,
  getUnlockedRankEmotes,
  isRankEmoteUnlocked,
  mergeOwnedAndRankEmotes,
} from './rankRewards';

test('auto-unlocks exclusive Rank Emotes at each of the 5 Arena Rank Tiers', () => {
  assert.equal(RANK_EMOTE_REWARDS.length, 5);
  assert.deepEqual(getUnlockedRankEmotes(1), ['rank_uncharted_flex']);
  assert.deepEqual(getUnlockedRankEmotes(10), ['rank_uncharted_flex']);
  assert.deepEqual(getUnlockedRankEmotes(11), ['rank_uncharted_flex', 'rank_wilds_prowl']);
  assert.deepEqual(getUnlockedRankEmotes(21), [
    'rank_uncharted_flex',
    'rank_wilds_prowl',
    'rank_frontier_salute',
  ]);
  assert.deepEqual(getUnlockedRankEmotes(31), [
    'rank_uncharted_flex',
    'rank_wilds_prowl',
    'rank_frontier_salute',
    'rank_mythic_ascension',
  ]);
  assert.deepEqual(getUnlockedRankEmotes(41), [
    'rank_uncharted_flex',
    'rank_wilds_prowl',
    'rank_frontier_salute',
    'rank_mythic_ascension',
    'rank_cosmic_meditation',
  ]);
  assert.equal(isRankEmoteUnlocked('rank_cosmic_meditation', 40), false);
  assert.equal(isRankEmoteUnlocked('rank_cosmic_meditation', 50), true);
});

test('detects newly unlocked Rank Emote when crossing a Tier boundary', () => {
  assert.equal(getNewlyUnlockedRankEmote(1, 2), null);
  assert.equal(getNewlyUnlockedRankEmote(10, 11)?.id, 'rank_wilds_prowl');
  assert.equal(getNewlyUnlockedRankEmote(20, 21)?.id, 'rank_frontier_salute');
  assert.equal(getNewlyUnlockedRankEmote(30, 31)?.id, 'rank_mythic_ascension');
  assert.equal(getNewlyUnlockedRankEmote(40, 41)?.id, 'rank_cosmic_meditation');
  assert.equal(getNewlyUnlockedRankEmote(49, 50), null);
});

test('tracks next upcoming Rank Emote milestone and merges owned emotes cleanly', () => {
  assert.equal(getNextRankEmoteReward(1)?.id, 'rank_wilds_prowl');
  assert.equal(getNextRankEmoteReward(25)?.id, 'rank_mythic_ascension');
  assert.equal(getNextRankEmoteReward(41), null);

  const merged = mergeOwnedAndRankEmotes(['flex', 'bow', 'rank_uncharted_flex'], 21);
  assert.ok(merged.includes('flex'));
  assert.ok(merged.includes('rank_uncharted_flex'));
  assert.ok(merged.includes('rank_wilds_prowl'));
  assert.ok(merged.includes('rank_frontier_salute'));
  assert.equal(merged.filter((e) => e === 'rank_uncharted_flex').length, 1);
});

test('maps every 1v1 Arena biome to a distinct dynamic music theme', () => {
  const seenTracks = new Set<string>();
  for (const biomeId of ARENA_BIOME_ORDER) {
    const spec = getBiomeMusicSpec(biomeId);
    const trackId = getBiomeMusicTrackId(biomeId);
    assert.equal(spec.trackId, trackId);
    assert.equal(isArenaBiomeMusicTrack(trackId), true);
    assert.ok(spec.stepMs >= 200 && spec.stepMs <= 600);
    assert.ok(spec.title.length > 3);
    assert.ok(spec.instrumentTag.length > 5);
    seenTracks.add(trackId);
  }
  assert.equal(seenTracks.size, ARENA_BIOME_ORDER.length);
  assert.equal(ARENA_BIOME_MUSIC_SPECS.salt_flats.trackId, 'biome_salt_flats');
  assert.equal(ARENA_BIOME_MUSIC_SPECS.karst_cenotes.trackId, 'biome_karst_cenotes');
  assert.equal(ARENA_BIOME_MUSIC_SPECS.wildfire_ashlands.trackId, 'biome_wildfire_ashlands');
});
