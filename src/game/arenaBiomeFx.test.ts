import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_BIOME_PARTICLES, getArenaBiomeParticleSpec } from './arenaBiomeFx';
import { HUB_CITY_NPCS } from './hubNpcs';

test('Arena biome particle presets define falling salt crystals, rising Karst mist, and Wildfire embers & ash', () => {
  const salt = getArenaBiomeParticleSpec('salt_flats');
  assert.equal(salt.mode, 'salt_crystals');
  assert.ok(salt.verticalSpeed < 0, 'Salt crystals must fall downward');
  assert.ok(salt.primaryCount >= 100);

  const karst = getArenaBiomeParticleSpec('karst_cenotes');
  assert.equal(karst.mode, 'rising_mist');
  assert.ok(karst.verticalSpeed > 0, 'Karst mist must rise upward');
  assert.ok(karst.secondaryCount >= 60);

  const ash = getArenaBiomeParticleSpec('wildfire_ashlands');
  assert.equal(ash.mode, 'embers_and_ash');
  assert.ok(ash.verticalSpeed > 0, 'Glowing embers must rise upward');
  assert.ok(ash.primaryCount >= 80 && ash.secondaryCount >= 60, 'Ashlands must emit both embers and floating ash');

  assert.equal(Object.keys(ARENA_BIOME_PARTICLES).length, 5);
});

test('All 8 Nexus City bots have valid 1..50 Arena Ranks spanning multiple tiers including Apex and Omni', () => {
  assert.equal(HUB_CITY_NPCS.length, 8);
  const ranks = HUB_CITY_NPCS.map((n) => n.arenaRank);
  for (const r of ranks) {
    assert.ok(Number.isInteger(r) && r >= 1 && r <= 50, `Invalid bot arenaRank ${r}`);
  }
  assert.ok(ranks.includes(49), 'Expected an Apex (#49) rival bot in Nexus City');
  assert.ok(ranks.includes(50), 'Expected an Omni (#50) rival bot in Nexus City');
});
