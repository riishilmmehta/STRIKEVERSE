import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_COMBAT_ARCHIVE_ENTRIES,
  MAX_COMBAT_LOG_ENTRIES,
  archiveFinisherEntry,
  createCombatLogState,
  flushCombatLogString,
  getCombatLogPeakDamage,
  getTopArchivedFinishers,
  normalizeCombatArchive,
  recordCombatLogHit,
} from './combatLog';

test('Combo Finisher commits immediately to Combat Log with summed damage and tokens', () => {
  let log = createCombatLogState();
  log = recordCombatLogHit(log, {
    token: 'L',
    moveName: 'Quick Jab',
    damage: 11,
    targetName: 'KAITO DUMMY',
    isFinisher: false,
    comboCount: 1,
  });
  assert.equal(log.entries.length, 0);

  log = recordCombatLogHit(log, {
    token: 'L',
    moveName: 'Twin Strike',
    damage: 14,
    targetName: 'KAITO DUMMY',
    isFinisher: false,
    comboCount: 2,
  });
  log = recordCombatLogHit(log, {
    token: 'H',
    moveName: 'Skyward Launcher',
    damage: 36,
    targetName: 'KAITO DUMMY',
    isFinisher: true,
    comboCount: 3,
  });

  assert.equal(log.entries.length, 1);
  assert.equal(log.active, null);
  assert.equal(log.entries[0].sequence, 'LLH');
  assert.deepEqual(log.entries[0].tokens, ['L', 'L', 'H']);
  assert.equal(log.entries[0].moveName, 'Skyward Launcher');
  assert.equal(log.entries[0].hits, 3);
  assert.equal(log.entries[0].totalDamage, 61);
  assert.equal(log.entries[0].isFinisher, true);
  assert.equal(log.entries[0].rank, 'B');
});

test('flushCombatLogString logs 2+ hit strings and ignores stray 1-hit pokes', () => {
  let log = createCombatLogState();
  log = recordCombatLogHit(log, {
    token: 'L',
    moveName: 'Quick Jab',
    damage: 10,
    targetName: 'RYUJI',
    isFinisher: false,
    comboCount: 1,
  });
  log = flushCombatLogString(log);
  assert.equal(log.entries.length, 0);

  log = recordCombatLogHit(log, {
    token: 'L',
    moveName: 'Quick Jab',
    damage: 10,
    targetName: 'RYUJI',
    isFinisher: false,
    comboCount: 1,
  });
  log = recordCombatLogHit(log, {
    token: 'H',
    moveName: 'Crescent Sweep',
    damage: 19,
    targetName: 'RYUJI',
    isFinisher: false,
    comboCount: 2,
  });
  log = flushCombatLogString(log);

  assert.equal(log.entries.length, 1);
  assert.equal(log.entries[0].sequence, 'LH');
  assert.equal(log.entries[0].moveName, 'Crescent Sweep');
  assert.equal(log.entries[0].totalDamage, 29);
  assert.equal(log.entries[0].isFinisher, false);
});

test('Combat Log caps strictly at the last 5 entries newest-first and reports peak damage', () => {
  let log = createCombatLogState();
  const damages = [32, 74, 48, 95, 52, 61, 83];
  damages.forEach((dmg, idx) => {
    log = recordCombatLogHit(log, {
      token: 'L',
      moveName: 'Quick Jab',
      damage: 10,
      targetName: 'IRON BULL',
      isFinisher: false,
      comboCount: 1,
    });
    log = recordCombatLogHit(log, {
      token: 'H',
      moveName: `Finisher #${idx + 1}`,
      damage: dmg - 10,
      targetName: 'IRON BULL',
      isFinisher: true,
      comboCount: 2,
    });
  });

  assert.equal(log.entries.length, MAX_COMBAT_LOG_ENTRIES);
  assert.equal(log.entries.length, 5);
  // Newest first: #7 (83), #6 (61), #5 (52), #4 (95), #3 (48)
  assert.deepEqual(
    log.entries.map((e) => e.totalDamage),
    [83, 61, 52, 95, 48]
  );
  assert.equal(getCombatLogPeakDamage(log.entries), 95);
});

test('Combat Archive persists only finishers up to 10 entries and returns highest-scoring sequences', () => {
  let archive = normalizeCombatArchive(null);
  assert.equal(archive.length, 0);

  // Non-finisher should be ignored
  archive = archiveFinisherEntry(archive, {
    id: 999,
    sequence: 'LH',
    tokens: ['L', 'H'],
    moveName: 'Crescent Sweep',
    hits: 2,
    totalDamage: 40,
    isFinisher: false,
    targetName: 'RYUJI',
    rank: 'B',
  });
  assert.equal(archive.length, 0);

  // Add 12 finishers; archive should retain the newest 10
  for (let i = 1; i <= 12; i++) {
    archive = archiveFinisherEntry(archive, {
      id: i,
      sequence: 'LLH',
      tokens: ['L', 'L', 'H'],
      moveName: `Dragon Finisher #${i}`,
      hits: 3 + (i % 3),
      totalDamage: 50 + i * 7,
      isFinisher: true,
      targetName: 'KAITO',
      rank: 'S',
    });
  }

  assert.equal(archive.length, MAX_COMBAT_ARCHIVE_ENTRIES);
  assert.equal(archive.length, 10);
  assert.equal(archive[0].id, 12);
  assert.equal(archive[9].id, 3);

  const top3 = getTopArchivedFinishers(archive, 3);
  assert.equal(top3.length, 3);
  assert.ok(top3[0].totalDamage >= top3[1].totalDamage);
  assert.ok(top3[1].totalDamage >= top3[2].totalDamage);
  assert.equal(top3[0].id, 12);

  // Round-trip normalize handles persisted JSON cleanly
  const restored = normalizeCombatArchive(JSON.parse(JSON.stringify(archive)));
  assert.equal(restored.length, 10);
  assert.equal(restored[0].moveName, 'Dragon Finisher #12');
});

