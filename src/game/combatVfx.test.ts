import test from 'node:test';
import assert from 'node:assert/strict';
import { COMBO_TABLE } from './combatRules';
import {
  computeComboFrenzyEffect,
  decayCameraTrauma,
  resolveHitVfxProfile,
  resolveSlashArcProfile,
  sampleCameraShake,
} from './combatVfx';

test('Heavy finishers produce stronger hit-sparks, trauma shake, and FOV kick than Light jabs', () => {
  const light = resolveHitVfxProfile({
    move: COMBO_TABLE.L,
    auraHex: '#f59e0b',
    comboCount: 1,
  });
  const heavy = resolveHitVfxProfile({
    move: COMBO_TABLE.H,
    auraHex: '#f59e0b',
    comboCount: 2,
  });
  const finisher = resolveHitVfxProfile({
    move: COMBO_TABLE.LLH,
    auraHex: '#f59e0b',
    comboCount: 3,
  });

  assert.equal(light.kind, 'light');
  assert.equal(heavy.kind, 'heavy');
  assert.equal(finisher.kind, 'finisher');

  assert.ok(heavy.sparkCount > light.sparkCount);
  assert.ok(finisher.sparkCount > heavy.sparkCount);
  assert.ok(finisher.shakeTrauma > heavy.shakeTrauma);
  assert.ok(heavy.shakeTrauma > light.shakeTrauma);
  assert.ok(finisher.fovKick > light.fovKick);
});

test('Parry and Block VFX profiles differentiate cleanly', () => {
  const parry = resolveHitVfxProfile({
    kindOverride: 'parry',
    auraHex: '#06b6d4',
    comboCount: 0,
  });
  const block = resolveHitVfxProfile({
    kindOverride: 'block',
    auraHex: '#06b6d4',
    comboCount: 0,
  });

  assert.ok(parry.sparkCount > block.sparkCount);
  assert.ok(parry.shakeTrauma > block.shakeTrauma);
  assert.ok(parry.hitstop > block.hitstop);
});

test('Slash-arc profiles map cleanly to existing Light/Heavy animation durations', () => {
  const jabArc = resolveSlashArcProfile(COMBO_TABLE.L);
  const slamArc = resolveSlashArcProfile(COMBO_TABLE.LHH);
  const sweepArc = resolveSlashArcProfile(COMBO_TABLE.LH);

  assert.ok(slamArc.radius > jabArc.radius);
  assert.ok(sweepArc.arcSpan > jabArc.arcSpan);
  assert.ok(sweepArc.yOffset < jabArc.yOffset);
});

test('Trauma-squared camera shake scales nonlinearly and decays smoothly to zero', () => {
  const zero = sampleCameraShake(0, 1.5);
  assert.equal(zero.offsetX, 0);
  assert.equal(zero.rollZ, 0);

  const half = sampleCameraShake(0.5, 1.2);
  const full = sampleCameraShake(1.0, 1.2);
  assert.ok(Math.abs(full.offsetX) > Math.abs(half.offsetX) * 3.5);
  assert.ok(Math.abs(full.rollZ) > Math.abs(half.rollZ) * 3.5);

  const decayed = decayCameraTrauma(0.5, 0.25);
  assert.equal(decayed, 0);
});

test('Combo Frenzy scales chromatic aberration, lens distortion, and FOV progressively with combo chain', () => {
  const idle = computeComboFrenzyEffect({ comboCount: 0, comboTimer: 0 });
  assert.equal(idle.intensity, 0);
  assert.equal(idle.chromaticOffset, 0);
  assert.equal(idle.distortionStrength, 0);
  assert.equal(idle.tier, 'none');

  const hit1 = computeComboFrenzyEffect({ comboCount: 1, comboTimer: 2.2 });
  const hit4 = computeComboFrenzyEffect({ comboCount: 4, comboTimer: 2.2 });
  const hit10 = computeComboFrenzyEffect({ comboCount: 10, comboTimer: 2.2 });

  assert.equal(hit1.tier, 'building');
  assert.equal(hit4.tier, 'frenzy');
  assert.equal(hit10.tier, 'overdrive');

  assert.ok(hit1.intensity > 0);
  assert.ok(hit4.chromaticOffset > hit1.chromaticOffset);
  assert.ok(hit10.chromaticOffset > hit4.chromaticOffset);
  assert.ok(hit10.distortionStrength > hit4.distortionStrength);
  assert.ok(hit10.fovBoost > hit1.fovBoost);

  // Tail fade smoothly reduces intensity near combo expiration
  const fading = computeComboFrenzyEffect({ comboCount: 6, comboTimer: 0.1 });
  const fresh = computeComboFrenzyEffect({ comboCount: 6, comboTimer: 2.0 });
  assert.ok(fading.intensity < fresh.intensity * 0.4);

  // Ultimate spikes into overdrive immediately
  const ult = computeComboFrenzyEffect({ comboCount: 0, comboTimer: 0, isUltimate: true });
  assert.equal(ult.tier, 'overdrive');
  assert.ok(ult.intensity >= 0.9);
});

