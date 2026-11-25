import test from 'node:test';
import assert from 'node:assert/strict';
import { getRankEmblemSpec, LANDMARK_RANK_NUMBERS } from './rankEmblems';

test('getRankEmblemSpec assigns distinct tier frame shapes across all 5 Arena Tiers', () => {
  const t1 = getRankEmblemSpec(1); // Stray (The Uncharted)
  const t2 = getRankEmblemSpec(11); // Seeker (The Wilds)
  const t3 = getRankEmblemSpec(21); // Pioneer (The Frontier)
  const t4 = getRankEmblemSpec(31); // Harbinger (The Mythic)
  const t5 = getRankEmblemSpec(41); // Ascendant (The Cosmic)

  const shapes = new Set([
    t1.frameShape,
    t2.frameShape,
    t3.frameShape,
    t4.frameShape,
    t5.frameShape,
  ]);
  assert.equal(shapes.size, 5, 'All 5 rank tiers must have distinct frame shapes');
  assert.equal(t1.tierName, 'The Uncharted');
  assert.equal(t2.tierName, 'The Wilds');
  assert.equal(t3.tierName, 'The Frontier');
  assert.equal(t4.tierName, 'The Mythic');
  assert.equal(t5.tierName, 'The Cosmic');
});

test('Landmark ranks like Apex (#49) and Omni (#50) receive unique bespoke icons', () => {
  const apex = getRankEmblemSpec(49);
  const omni = getRankEmblemSpec(50);
  const baseCosmic = getRankEmblemSpec(41);

  assert.equal(apex.rankName, 'Apex');
  assert.equal(apex.isLandmarkRank, true);
  assert.equal(apex.glyph, 'apex_spire');
  assert.notEqual(apex.glyph, baseCosmic.glyph);

  assert.equal(omni.rankName, 'Omni');
  assert.equal(omni.isLandmarkRank, true);
  assert.equal(omni.glyph, 'omni_infinity');
  assert.notEqual(omni.glyph, apex.glyph);
  assert.ok(LANDMARK_RANK_NUMBERS.includes(49));
  assert.ok(LANDMARK_RANK_NUMBERS.includes(50));
});
