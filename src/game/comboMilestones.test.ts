import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMBO_MILESTONES,
  resolveComboMilestone,
  shouldTriggerEmoteSpotlight,
} from './comboMilestones';

test('resolveComboMilestone fires exclusively when crossing 20, 50, or 100 hits', () => {
  assert.deepEqual([...COMBO_MILESTONES], [20, 50, 100]);

  assert.equal(resolveComboMilestone(18, 19), null);
  const m20 = resolveComboMilestone(19, 20);
  assert.ok(m20);
  assert.equal(m20.threshold, 20);
  assert.equal(resolveComboMilestone(20, 21), null);

  const m50 = resolveComboMilestone(49, 50);
  assert.ok(m50);
  assert.equal(m50.threshold, 50);
  assert.ok(m50.sparkCount > m20.sparkCount);

  const m100 = resolveComboMilestone(98, 100);
  assert.ok(m100);
  assert.equal(m100.threshold, 100);
  assert.ok(m100.flashOpacity > m50.flashOpacity);

  // Regression guard: decreasing combo never triggers a milestone
  assert.equal(resolveComboMilestone(25, 20), null);
});

test('shouldTriggerEmoteSpotlight triggers on high-level combos (>=5) or finishers', () => {
  assert.equal(shouldTriggerEmoteSpotlight(3, false), false);
  assert.equal(shouldTriggerEmoteSpotlight(4, false), false);
  assert.equal(shouldTriggerEmoteSpotlight(5, false), true);
  assert.equal(shouldTriggerEmoteSpotlight(2, true), true);
});
