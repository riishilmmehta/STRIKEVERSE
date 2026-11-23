import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMPAIGN_BOSSES,
  COMBO_DECAY_DURATION,
  COMBO_TABLE,
  HERO_CLASSES,
  PET_ABILITIES,
  computeComboMeterState,
  computeFinisherMoveDamage,
  computeHeroMaxHp,
  computeScaledDamage,
  consumeBufferedInput,
  gainUltimateMeter,
  resolveComboStep,
  resolveIncomingHit,
  resolveNextFinisherHint,
  stepStamina,
} from './combatRules';
import {
  DEFAULT_DOJO_BLOCKS,
  placeDojoBlock,
  removeNearestDojoBlock,
  snapToDojoGrid,
} from './dojoRules';

test('Light-Light-Heavy produces Skyward Launcher 3-hit combo', () => {
  const step1 = resolveComboStep('', 'L', 0, true);
  assert.equal(step1.move.name, 'Quick Jab');
  assert.equal(step1.nextSequence, 'L');

  const step2 = resolveComboStep(step1.nextSequence, 'L', 0.25, true);
  assert.equal(step2.move.name, 'Twin Strike');
  assert.equal(step2.nextSequence, 'LL');

  const step3 = resolveComboStep(step2.nextSequence, 'H', 0.3, true);
  assert.equal(step3.move.name, 'Skyward Launcher');
  assert.equal(step3.move.isFinisher, true);
  assert.equal(step3.nextSequence, '');
  assert.ok(step3.move.launchY > 5);
});

test('Auto-Assist widens combo link window and input buffer window', () => {
  // 0.8s after L: too late without Auto-Assist (resets to Quick Jab), valid with Auto-Assist (Twin Strike)
  const assisted = resolveComboStep('L', 'L', 0.8, true);
  assert.equal(assisted.move.name, 'Twin Strike');

  const manual = resolveComboStep('L', 'L', 0.8, false);
  assert.equal(manual.move.name, 'Quick Jab');

  // Input buffer at 190ms: accepted with Auto-Assist (220ms), expired without (150ms)
  assert.equal(consumeBufferedInput({ action: 'H', timestamp: 1.0 }, 1.19, true), 'H');
  assert.equal(consumeBufferedInput({ action: 'H', timestamp: 1.0 }, 1.19, false), null);
});

test('Block reduces damage by ~70% and Perfect Parry negates damage and stuns attacker', () => {
  const parry = resolveIncomingHit({
    rawDamage: 30,
    isBlocking: true,
    timeSinceBlockPress: 0.14,
    defenderStamina: 50,
    autoAssist: false,
  });
  assert.equal(parry.outcome, 'parry');
  assert.equal(parry.finalDamage, 0);
  assert.ok(parry.attackerStunDuration > 1.0);

  const block = resolveIncomingHit({
    rawDamage: 30,
    isBlocking: true,
    timeSinceBlockPress: 0.55,
    defenderStamina: 50,
    autoAssist: false,
  });
  assert.equal(block.outcome, 'block');
  assert.equal(block.finalDamage, 9);
  assert.ok(block.staminaCost > 0);

  const rawHit = resolveIncomingHit({
    rawDamage: 30,
    isBlocking: false,
    timeSinceBlockPress: 0,
    defenderStamina: 50,
    autoAssist: false,
  });
  assert.equal(rawHit.outcome, 'hit');
  assert.equal(rawHit.finalDamage, 30);
});

test('Progression power cap keeps veteran advantage within 15%', () => {
  const lvl1 = computeHeroMaxHp('striker', 1);
  const lvl50 = computeHeroMaxHp('striker', 50);
  assert.ok(lvl50 <= Math.round(lvl1 * 1.1501));
});

test('Class roster, damage scaling, stamina regen, and ultimate meter behave deterministically', () => {
  assert.equal(Object.keys(HERO_CLASSES).length, 5);
  assert.equal(CAMPAIGN_BOSSES.length, 3);

  const normalDmg = computeScaledDamage(20, 'striker', 'balanced', 0, false);
  const heavyCounterDmg = computeScaledDamage(20, 'juggernaut', 'heavy', 3, true);
  assert.ok(heavyCounterDmg > normalDmg);

  assert.ok(stepStamina(40, 0.5, false, 1.0) > 40);
  assert.ok(stepStamina(40, 0.5, true, 1.0) < 40);
  assert.equal(gainUltimateMeter(92, 20), 100);
});

test('Dojo sandbox snapping, placement collision check, and deletion work accurately', () => {
  assert.equal(snapToDojoGrid(3.4), 4);
  assert.equal(snapToDojoGrid(-99), -13);

  const placed = placeDojoBlock(DEFAULT_DOJO_BLOCKS, 'trampoline', 8.2, 6.1);
  assert.ok(placed.placed);
  assert.equal(placed.blocks.length, DEFAULT_DOJO_BLOCKS.length + 1);

  // Duplicate on same grid tile should be rejected
  const duplicate = placeDojoBlock(placed.blocks, 'crate', 8.0, 6.0);
  assert.equal(duplicate.placed, null);

  // Spawn doorway protection at (0, 8)
  const blockedSpawn = placeDojoBlock(placed.blocks, 'crate', 0, 8);
  assert.equal(blockedSpawn.placed, null);

  // Remove placed block
  const removed = removeNearestDojoBlock(placed.blocks, 8.0, 6.0);
  assert.ok(removed.removed);
  assert.equal(removed.blocks.length, DEFAULT_DOJO_BLOCKS.length);
});

test('Combo Meter computes rank escalation, damage bonus, progress, and urgency cleanly', () => {
  const inactive = computeComboMeterState(0, 0);
  assert.equal(inactive.active, false);
  assert.equal(inactive.progress, 0);
  assert.equal(inactive.isUrgent, false);

  const starter = computeComboMeterState(1, COMBO_DECAY_DURATION);
  assert.equal(starter.active, true);
  assert.equal(starter.rank, 'C');
  assert.equal(starter.tierLabel, 'CHAIN');
  assert.equal(starter.progress, 1);
  assert.equal(starter.damageBonusPct, 5);
  assert.equal(starter.isUrgent, false);

  const striker = computeComboMeterState(3, 1.2, COMBO_DECAY_DURATION);
  assert.equal(striker.rank, 'B');
  assert.equal(striker.tierLabel, 'STRIKER');
  assert.equal(striker.progress, 0.5);
  assert.equal(striker.damageBonusPct, 15);
  assert.equal(striker.isUrgent, false);

  const flowUrgent = computeComboMeterState(6, 0.48, COMBO_DECAY_DURATION);
  assert.equal(flowUrgent.rank, 'A');
  assert.equal(flowUrgent.tierLabel, 'FLOW');
  assert.equal(flowUrgent.damageBonusPct, 30);
  assert.equal(flowUrgent.isUrgent, true);

  const overdrive = computeComboMeterState(9, 1.8, COMBO_DECAY_DURATION);
  assert.equal(overdrive.rank, 'S');
  assert.equal(overdrive.damageBonusPct, 30);

  const apex = computeComboMeterState(14, 2.4, COMBO_DECAY_DURATION);
  assert.equal(apex.rank, 'S+');
  assert.equal(apex.tierLabel, 'STRIKEVERSE');
});

test('Combo Finishers grant bonus damage, slow-motion timing, and clear next-input hints', () => {
  const llh = COMBO_TABLE.LLH;
  const hlh = COMBO_TABLE.HLH;
  const jab = COMBO_TABLE.L;

  assert.equal(computeFinisherMoveDamage(jab), jab.damage);
  assert.ok(computeFinisherMoveDamage(llh) > llh.damage);
  assert.ok(computeFinisherMoveDamage(hlh) >= Math.round(hlh.damage * 1.45));
  assert.ok((llh.slowMoDuration ?? 0) >= 0.5);
  assert.ok((llh.slowMoTimeScale ?? 1) < 0.35);

  assert.equal(resolveNextFinisherHint('LL'), '[K] → Skyward Launcher');
  assert.equal(resolveNextFinisherHint('LH'), '[K] → Meteor Slam');
  assert.equal(resolveNextFinisherHint('HL'), '[K] → Dragon Finisher');
  assert.equal(resolveNextFinisherHint(''), null);
});

test('Companion Pets define distinct active abilities and passive perks', () => {
  assert.equal(PET_ABILITIES.none.kind, 'none');
  assert.equal(PET_ABILITIES.drone.kind, 'photon_barrage');
  assert.equal(PET_ABILITIES.fox.kind, 'phantom_pounce');
  assert.equal(PET_ABILITIES.orb.kind, 'aegis_nova');

  assert.ok(PET_ABILITIES.drone.ultGainMult > 1);
  assert.ok(PET_ABILITIES.fox.speedBonusMult > 1);
  assert.ok(PET_ABILITIES.fox.stunDuration >= 1.0);
  assert.ok(PET_ABILITIES.orb.healHp >= 20 && PET_ABILITIES.orb.restoreStamina >= 30);
});


