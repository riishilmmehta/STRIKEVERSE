import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DAILY_STREAK_REWARDS,
  DEFAULT_DAILY_STREAK_STATE,
  claimDailyReward,
  diffCalendarDays,
  evaluateDailyStreak,
  getRewardForStreakDay,
} from './dailyStreak';

test('fresh player starts eligible for Day 1 reward and claiming is idempotent on same day', () => {
  const eval1 = evaluateDailyStreak(DEFAULT_DAILY_STREAK_STATE, '2026-11-23');
  assert.equal(eval1.canClaim, true);
  assert.equal(eval1.claimedToday, false);
  assert.equal(eval1.nextClaimDay, 1);
  assert.equal(eval1.todayRewardCoins, DAILY_STREAK_REWARDS[0].coins);
  assert.equal(eval1.ladder[0].status, 'available');

  const claim1 = claimDailyReward(DEFAULT_DAILY_STREAK_STATE, '2026-11-23');
  assert.equal(claim1.claimed, true);
  assert.equal(claim1.rewardCoins, 75);
  assert.equal(claim1.newStreak, 1);
  assert.equal(claim1.state.lastClaimDate, '2026-11-23');

  // Re-claiming on the same day must not double-award coins
  const duplicate = claimDailyReward(claim1.state, '2026-11-23');
  assert.equal(duplicate.claimed, false);
  assert.equal(duplicate.rewardCoins, 0);
  assert.equal(duplicate.state.totalClaimedCoins, 75);

  const afterEval = evaluateDailyStreak(claim1.state, '2026-11-23');
  assert.equal(afterEval.canClaim, false);
  assert.equal(afterEval.claimedToday, true);
  assert.equal(afterEval.effectiveStreak, 1);
  assert.equal(afterEval.ladder[0].status, 'claimed');
  assert.equal(afterEval.ladder[1].status, 'upcoming');
});

test('consecutive daily logins escalate coins through Day 7 and add veteran cycle bonus on Day 8', () => {
  let state = DEFAULT_DAILY_STREAK_STATE;
  const dates = [
    '2026-11-23',
    '2026-11-24',
    '2026-11-25',
    '2026-11-26',
    '2026-11-27',
    '2026-11-28',
    '2026-11-29',
  ];

  let prevReward = 0;
  for (let i = 0; i < dates.length; i++) {
    const res = claimDailyReward(state, dates[i]);
    assert.equal(res.claimed, true);
    assert.equal(res.newStreak, i + 1);
    assert.ok(res.rewardCoins > prevReward);
    prevReward = res.rewardCoins;
    state = res.state;
  }

  assert.equal(state.streakDays, 7);
  assert.equal(prevReward, 500);

  // Day 8 enters Cycle 2 with +25 veteran cycle bonus over Day 1 base (75 + 25 = 100)
  const day8Eval = evaluateDailyStreak(state, '2026-11-30');
  assert.equal(day8Eval.canClaim, true);
  assert.equal(day8Eval.nextClaimDay, 8);
  assert.equal(day8Eval.cycleNumber, 2);
  assert.equal(day8Eval.todayRewardCoins, 100);
  assert.equal(getRewardForStreakDay(8).coins, 100);
});

test('missing a calendar day resets streak cleanly while preserving longestStreak record', () => {
  const day1 = claimDailyReward(DEFAULT_DAILY_STREAK_STATE, '2026-11-20').state;
  const day2 = claimDailyReward(day1, '2026-11-21').state;
  const day3 = claimDailyReward(day2, '2026-11-22').state;
  assert.equal(day3.longestStreak, 3);

  // Skipped Nov 23 -> logging in on Nov 24 resets streak back to Day 1
  const missedEval = evaluateDailyStreak(day3, '2026-11-24');
  assert.equal(missedEval.canClaim, true);
  assert.equal(missedEval.effectiveStreak, 0);
  assert.equal(missedEval.nextClaimDay, 1);
  assert.equal(missedEval.streakReset, true);
  assert.equal(missedEval.longestStreak, 3);

  const resumed = claimDailyReward(day3, '2026-11-24');
  assert.equal(resumed.claimed, true);
  assert.equal(resumed.newStreak, 1);
  assert.equal(resumed.state.longestStreak, 3);
});

test('diffCalendarDays handles month and leap-year boundaries accurately', () => {
  assert.equal(diffCalendarDays('2026-11-30', '2026-12-01'), 1);
  assert.equal(diffCalendarDays('2024-02-28', '2024-03-01'), 2);
  assert.equal(diffCalendarDays('2026-12-31', '2027-01-01'), 1);
});
