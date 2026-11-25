import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildClanSiegeMatchPlan,
  evaluateClanSiegeOutcome,
  getRivalClanById,
  getRivalClanForDojoId,
  PLAYER_CLAN_SPEC,
  RIVAL_CLANS,
  summarizeDojoObstacles,
} from './clanSiege';
import { DEFAULT_DOJO_BLOCKS, DOJO_PLOT_HALF_SIZE } from './dojoRules';
import type { DojoBlock } from './types';

describe('clanSiege match planning & outcome logic', () => {
  it('builds a valid 2v2 siege plan in a rival clan Dojo with safe non-overlapping spawns', () => {
    const plan = buildClanSiegeMatchPlan(
      {
        format: '2v2',
        rivalClanId: 'clan-neon',
        venue: 'rival_dojo',
      },
      DEFAULT_DOJO_BLOCKS,
      'My Courtyard',
      'KAIRO',
      'clear_day'
    );

    assert.equal(plan.format, '2v2');
    assert.equal(plan.teamSize, 2);
    assert.equal(plan.allyClanTag, PLAYER_CLAN_SPEC.tag);
    assert.equal(plan.rivalClanTag, 'NEO');
    assert.equal(plan.isHomeDefense, false);
    assert.equal(plan.weather, 'neon_night');
    assert.equal(plan.spawns.length, 4);

    const allies = plan.spawns.filter((s) => s.team === 'ally');
    const enemies = plan.spawns.filter((s) => s.team === 'enemy');
    assert.equal(allies.length, 2);
    assert.equal(enemies.length, 2);
    assert.equal(allies.filter((s) => s.isPlayer).length, 1);
    assert.equal(enemies.filter((s) => s.isPlayer).length, 0);

    // Verify all spawns stay within Dojo bounds and avoid solid obstacles & other spawns
    for (let i = 0; i < plan.spawns.length; i++) {
      const a = plan.spawns[i];
      assert.ok(Math.abs(a.x) <= DOJO_PLOT_HALF_SIZE - 2.0);
      assert.ok(Math.abs(a.z) <= DOJO_PLOT_HALF_SIZE - 2.0);
      for (let j = i + 1; j < plan.spawns.length; j++) {
        const b = plan.spawns[j];
        assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= 1.8);
      }
      for (const blk of plan.blocks) {
        if (blk.type === 'trampoline' || blk.type === 'dashpad') continue;
        assert.ok(Math.hypot(a.x - blk.x, a.z - blk.z) >= 1.8);
      }
    }
  });

  it('builds a 4v4 Home Defense plan using the player Dojo blocks and weather', () => {
    const plan = buildClanSiegeMatchPlan(
      {
        format: '4v4',
        rivalClanId: 'clan-iron',
        venue: 'player_dojo',
      },
      DEFAULT_DOJO_BLOCKS,
      'Kairo Sky Dojo',
      'KAIRO',
      'cherry_blossom'
    );

    assert.equal(plan.format, '4v4');
    assert.equal(plan.teamSize, 4);
    assert.equal(plan.isHomeDefense, true);
    assert.equal(plan.venueName, 'Kairo Sky Dojo');
    assert.equal(plan.weather, 'cherry_blossom');
    assert.equal(plan.spawns.length, 8);
    assert.equal(plan.spawns.filter((s) => s.team === 'ally').length, 4);
    assert.equal(plan.spawns.filter((s) => s.team === 'enemy').length, 4);
    assert.equal(plan.obstacles.total, DEFAULT_DOJO_BLOCKS.length);
  });

  it('accurately summarizes dynamic Dojo obstacles (trampolines, dashpads, crates, pillars)', () => {
    const customBlocks: DojoBlock[] = [
      { id: 'b1', type: 'trampoline', x: 0, z: 0, rotation: 0 },
      { id: 'b2', type: 'trampoline', x: 4, z: 0, rotation: 0 },
      { id: 'b3', type: 'dashpad', x: -4, z: 0, rotation: 0 },
      { id: 'b4', type: 'crate', x: 2, z: 4, rotation: 0 },
      { id: 'b5', type: 'lantern', x: -2, z: 4, rotation: 0 },
      { id: 'b6', type: 'trophy', x: 0, z: -6, rotation: 0 },
      { id: 'b7', type: 'dummy', x: 6, z: 6, rotation: 0 },
    ];
    const summary = summarizeDojoObstacles(customBlocks);
    assert.deepEqual(summary, {
      trampolines: 2,
      dashpads: 1,
      crates: 1,
      pillars: 3,
      total: 7,
    });
  });

  it('maps rival clans cleanly by id and community dojo id', () => {
    assert.equal(getRivalClanById('clan-sakura').tag, 'SKR');
    assert.equal(getRivalClanById('nonexistent').id, RIVAL_CLANS[0].id);
    assert.equal(getRivalClanForDojoId('dojo-jax').tag, 'IRN');
    assert.ok(RIVAL_CLANS.some((c) => c.id === getRivalClanForDojoId('dojo-custom-99').id));
  });

  it('evaluates victory, defeat, and ongoing match states with format-scaled rewards', () => {
    const ongoing = evaluateClanSiegeOutcome({
      allyAlive: 2,
      enemyAlive: 1,
      playerKo: false,
      format: '2v2',
    });
    assert.equal(ongoing.finished, false);

    const win2v2 = evaluateClanSiegeOutcome({
      allyAlive: 1,
      enemyAlive: 0,
      playerKo: false,
      format: '2v2',
    });
    assert.equal(win2v2.finished, true);
    assert.equal(win2v2.victory, true);
    assert.equal(win2v2.coinsEarned, 190);

    const win4v4 = evaluateClanSiegeOutcome({
      allyAlive: 3,
      enemyAlive: 0,
      playerKo: false,
      format: '4v4',
    });
    assert.equal(win4v4.finished, true);
    assert.equal(win4v4.victory, true);
    assert.ok(win4v4.coinsEarned > win2v2.coinsEarned);

    const lossPlayerKo = evaluateClanSiegeOutcome({
      allyAlive: 2,
      enemyAlive: 2,
      playerKo: true,
      format: '4v4',
    });
    assert.equal(lossPlayerKo.finished, true);
    assert.equal(lossPlayerKo.victory, false);
    assert.ok(lossPlayerKo.coinsEarned > 0);
  });
});
