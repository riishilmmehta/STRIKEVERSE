import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_BIOMES,
  ARENA_BIOME_ORDER,
  ARENA_RANKS,
  ARENA_TIERS,
  DEFAULT_ARENA_RANK_STATE,
  MAX_HERO_LEVEL,
  applyXpGain,
  getArenaRankSpec,
  recordArenaWin,
} from './arenaRanks';

test('ARENA_RANKS defines all 50 exact ranks across 5 tiers', () => {
  assert.equal(ARENA_TIERS.length, 5);
  assert.equal(ARENA_RANKS.length, 50);

  const expectedNames = [
    // Tier 1: The Uncharted (1-10)
    'Stray', 'Drifter', 'Wanderer', 'Forager', 'Scout',
    'Tracker', 'Outrider', 'Wayfinder', 'Trailblazer', 'Pathbreaker',
    // Tier 2: The Wilds (11-20)
    'Seeker', 'Stalker', 'Prowler', 'Trapper', 'Tamer',
    'Ranger', 'Warden', 'Sentinel', 'Outlaw', 'Survivalist',
    // Tier 3: The Frontier (21-30)
    'Pioneer', 'Vanguard', 'Expeditionary', 'Conqueror', 'Tempest',
    'Stormbringer', 'Dreadnought', 'Colossus', 'Warlord', 'Overlord',
    // Tier 4: The Mythic (31-40)
    'Harbinger', 'Omen', 'Oracle', 'Phantasm', 'Wraith',
    'Archon', 'Sovereign', 'Monarch', 'Emperor', 'Paragon',
    // Tier 5: The Cosmic (41-50)
    'Ascendant', 'Astral', 'Celestial', 'Nova', 'Eclipse',
    'Singularity', 'Leviathan', 'Titan', 'Apex', 'Omni',
  ];

  assert.deepEqual(
    ARENA_RANKS.map((r) => r.name),
    expectedNames
  );
  assert.equal(getArenaRankSpec(1).tierName, 'The Uncharted');
  assert.equal(getArenaRankSpec(11).tierName, 'The Wilds');
  assert.equal(getArenaRankSpec(21).tierName, 'The Frontier');
  assert.equal(getArenaRankSpec(31).tierName, 'The Mythic');
  assert.equal(getArenaRankSpec(50).tierName, 'The Cosmic');
  assert.equal(getArenaRankSpec(50).name, 'Omni');
});

test('5 distinct arena biomes exist and Salt Flats & Mirrors has zero cover', () => {
  assert.equal(ARENA_BIOME_ORDER.length, 5);
  assert.equal(ARENA_BIOMES.salt_flats.name, 'Salt Flats & Mirrors');
  assert.equal(ARENA_BIOMES.salt_flats.hasCover, false);
  assert.equal(ARENA_BIOMES.karst_cenotes.name, 'Karst Towers & Cenotes');
  assert.equal(ARENA_BIOMES.wildfire_ashlands.name, 'Post-Wildfire Ashlands');
  assert.equal(ARENA_BIOMES.geothermal_springs.name, 'Geothermal Rainbow Springs');
  assert.equal(ARENA_BIOMES.kelp_brine.name, 'Kelp Forests & Brine Pools');
});

test('recordArenaWin promotes across ranks, shifts biome on tier change, and caps at Rank 50 Omni', () => {
  let state = { ...DEFAULT_ARENA_RANK_STATE };
  const first = recordArenaWin(state);
  assert.equal(first.rankedUp, true);
  assert.equal(first.next.rank, 2);
  assert.equal(first.newRankSpec.name, 'Drifter');

  // Jump to Rank 10 (Pathbreaker) and verify promotion to Rank 11 (Seeker) switches to Karst Cenotes
  state = {
    rank: 10,
    winsInRank: 0,
    totalArenaWins: 9,
    selectedBiome: 'salt_flats',
  };
  const tierUp = recordArenaWin(state);
  assert.equal(tierUp.rankedUp, true);
  assert.equal(tierUp.tierChanged, true);
  assert.equal(tierUp.next.rank, 11);
  assert.equal(tierUp.newRankSpec.name, 'Seeker');
  assert.equal(tierUp.next.selectedBiome, 'karst_cenotes');

  // Verify Rank 50 stays capped at Omni
  const omniWin = recordArenaWin({
    rank: 50,
    winsInRank: 3,
    totalArenaWins: 120,
    selectedBiome: 'kelp_brine',
  });
  assert.equal(omniWin.rankedUp, false);
  assert.equal(omniWin.next.rank, 50);
  assert.equal(omniWin.next.totalArenaWins, 121);
});

test('Hero level cap is 100 and applyXpGain levels up cleanly and clamps at MAX_HERO_LEVEL', () => {
  assert.equal(MAX_HERO_LEVEL, 100);

  const step = applyXpGain(1, 0, 150);
  assert.equal(step.leveledUp, true);
  assert.equal(step.level, 2);

  const maxed = applyXpGain(98, 0, 500_000);
  assert.equal(maxed.level, 100);
  assert.equal(maxed.xp, 0);
  assert.equal(maxed.leveledUp, true);
});
