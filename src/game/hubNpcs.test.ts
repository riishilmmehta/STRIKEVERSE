import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HUB_CITY_NPCS } from './hubNpcs';

describe('Nexus City Hub NPC roster', () => {
  it('spawns 8 distinct Nexus City bots (4 original + 4 newly added)', () => {
    assert.equal(HUB_CITY_NPCS.length, 8);
    const ids = new Set(HUB_CITY_NPCS.map((n) => n.id));
    const names = new Set(HUB_CITY_NPCS.map((n) => n.name));
    assert.equal(ids.size, 8);
    assert.equal(names.size, 8);
  });

  it('places all 8 bots safely inside Nexus City plaza without overlapping spawn, spire, or each other', () => {
    const playerSpawn = { x: 0, z: 9.0 };
    const centralSpire = { x: 0, z: -6.5 };

    for (let i = 0; i < HUB_CITY_NPCS.length; i++) {
      const a = HUB_CITY_NPCS[i];
      const distFromOrigin = Math.hypot(a.x, a.z);
      assert.ok(distFromOrigin <= 18.5, `${a.name} should stay within plaza bounds`);
      assert.ok(
        Math.hypot(a.x - playerSpawn.x, a.z - playerSpawn.z) >= 3.2,
        `${a.name} should leave player spawn clear`
      );
      assert.ok(
        Math.hypot(a.x - centralSpire.x, a.z - centralSpire.z) >= 3.5,
        `${a.name} should not clip central spire`
      );
      for (let j = i + 1; j < HUB_CITY_NPCS.length; j++) {
        const b = HUB_CITY_NPCS[j];
        assert.ok(
          Math.hypot(a.x - b.x, a.z - b.z) >= 3.0,
          `${a.name} and ${b.name} should not overlap`
        );
      }
    }
  });
});
