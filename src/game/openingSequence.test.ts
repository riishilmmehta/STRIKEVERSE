import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COLD_BOOT_LOADING_MS,
  GAMEPLAY_TIPS,
  HUB_REENTRY_LOADING_MS,
  LOADING_POSTERS,
  STUDIO_LOGO_SKIP_UNLOCK_SEC,
  STUDIO_LOGO_TOTAL_SEC,
  advanceSmoothedProgress,
  getStudioCinematicState,
  pickRandomPosterIndex,
} from './openingSequence';

test('Studio Logo Cinematic obeys slow 20.0s shot-by-shot schedule and 1.0s skip unlock', () => {
  assert.equal(STUDIO_LOGO_TOTAL_SEC, 20.0);
  assert.equal(STUDIO_LOGO_SKIP_UNLOCK_SEC, 1.0);

  const s0 = getStudioCinematicState(0.5);
  assert.equal(s0.phase, 'ember_pulse');
  assert.equal(s0.canSkip, false);
  assert.ok(s0.emberGlow > 0);
  assert.equal(s0.wipeProgress, 0);

  const s0Mid = getStudioCinematicState(2.2);
  assert.equal(s0Mid.phase, 'ember_pulse');
  assert.equal(s0Mid.canSkip, true);

  const s1 = getStudioCinematicState(6.0);
  assert.equal(s1.phase, 'flame_wipe');
  assert.ok(s1.wipeProgress > 0.2 && s1.wipeProgress < 0.9);

  const s2 = getStudioCinematicState(10.0);
  assert.equal(s2.phase, 'logo_resolve');
  assert.ok(s2.logoResolve > 0.3);

  const s3 = getStudioCinematicState(13.5);
  assert.equal(s3.phase, 'wordmark_burn');
  assert.ok(s3.wordmarkReveal > 0.2 && s3.wordmarkReveal < 0.9);

  const s4 = getStudioCinematicState(16.5);
  assert.equal(s4.phase, 'lockup_hold');
  assert.ok(s4.lockupPulse > 0.8);

  const s5 = getStudioCinematicState(19.0);
  assert.equal(s5.phase, 'fade_out');
  assert.ok(s5.fadeToBlack > 0.4);

  const s6 = getStudioCinematicState(20.1);
  assert.equal(s6.phase, 'done');
  assert.equal(s6.finished, true);
});

test('GTA Loading Screen runs 30s cold-boot showcase with 15-20 bundled posters and no immediate repeats', () => {
  assert.ok(LOADING_POSTERS.length >= 15 && LOADING_POSTERS.length <= 20);
  assert.ok(GAMEPLAY_TIPS.length >= 10);
  assert.equal(COLD_BOOT_LOADING_MS, 30000);
  assert.ok(HUB_REENTRY_LOADING_MS < 5000);

  const uniquePaths = new Set(LOADING_POSTERS.map((p) => p.src));
  assert.equal(uniquePaths.size, LOADING_POSTERS.length);

  for (let exclude = 0; exclude < LOADING_POSTERS.length; exclude++) {
    const picked = pickRandomPosterIndex(
      LOADING_POSTERS.length,
      exclude,
      () => exclude / LOADING_POSTERS.length
    );
    assert.notEqual(picked, exclude, 'Must not repeat immediately prior poster');
  }
});

test('advanceSmoothedProgress advances monotonically without stalling or regressing', () => {
  let pct = 0;
  for (let i = 0; i < 20; i++) {
    const next = advanceSmoothedProgress(pct, 100, 0.05);
    if (pct < 100) {
      assert.ok(next > pct, `Progress must increase strictly on step ${i}`);
    } else {
      assert.equal(next, 100);
    }
    pct = next;
  }
  assert.equal(pct, 100);
  assert.equal(advanceSmoothedProgress(75, 50, 0.1), 75);
});
