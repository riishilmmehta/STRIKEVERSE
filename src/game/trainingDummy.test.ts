import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_DOJO_BLOCKS, placeDojoBlock } from './dojoRules';
import {
  TRAINING_DUMMY_ORDER,
  TRAINING_DUMMY_VARIANTS,
  getDummyVariantSpec,
  isInteractiveDummyBlock,
  resolveDummyVariant,
} from './trainingDummy';

test('Training Dummy variants cover static post and all 3 Campaign boss AI policies', () => {
  assert.deepEqual(TRAINING_DUMMY_ORDER, [
    'static',
    'kaito_duelist',
    'iron_charger',
    'vex_flanker',
  ]);
  assert.equal(TRAINING_DUMMY_VARIANTS.static.aiPolicy, null);
  assert.equal(TRAINING_DUMMY_VARIANTS.kaito_duelist.aiPolicy, 'duelist');
  assert.equal(TRAINING_DUMMY_VARIANTS.iron_charger.aiPolicy, 'charger');
  assert.equal(TRAINING_DUMMY_VARIANTS.vex_flanker.aiPolicy, 'flanker');

  // Every active Campaign dummy must have a readable 0.45-0.75s telegraph for parry practice
  for (const id of ['kaito_duelist', 'iron_charger', 'vex_flanker'] as const) {
    const spec = TRAINING_DUMMY_VARIANTS[id];
    assert.ok(spec.telegraphDuration >= 0.45 && spec.telegraphDuration <= 0.75);
    assert.ok(spec.maxHp >= 150);
    assert.ok(spec.leashRadius >= 6);
  }
});

test('placeDojoBlock attaches selected dummyVariant and migrates legacy blocks safely', () => {
  const placed = placeDojoBlock(DEFAULT_DOJO_BLOCKS, 'dummy', 8, 4, 0, 'iron_charger');
  assert.ok(placed.placed);
  assert.equal(placed.placed.dummyVariant, 'iron_charger');
  assert.equal(isInteractiveDummyBlock(placed.placed), true);

  const staticPlaced = placeDojoBlock(placed.blocks, 'dummy', -8, 4, 0);
  assert.ok(staticPlaced.placed);
  assert.equal(staticPlaced.placed.dummyVariant, 'static');
  assert.equal(isInteractiveDummyBlock(staticPlaced.placed), false);

  // Legacy saved dummy block without dummyVariant field defaults safely to static
  const legacyBlock: import('./types').DojoBlock = {
    id: 'old-1',
    type: 'dummy',
    x: 0,
    z: 0,
    rotation: 0,
  };
  assert.equal(resolveDummyVariant(legacyBlock.dummyVariant), 'static');
  assert.equal(getDummyVariantSpec(legacyBlock.dummyVariant).id, 'static');
  assert.equal(isInteractiveDummyBlock(legacyBlock), false);
});
