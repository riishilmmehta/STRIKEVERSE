export interface DailyRewardTier {
  cycleDay: number; // 1..7
  coins: number;
  label: string;
}

export const DAILY_STREAK_REWARDS: DailyRewardTier[] = [
  { cycleDay: 1, coins: 75, label: 'Warmup Bonus' },
  { cycleDay: 2, coins: 110, label: 'Returning Fighter' },
  { cycleDay: 3, coins: 150, label: 'Rising Contender' },
  { cycleDay: 4, coins: 200, label: 'Combo Master' },
  { cycleDay: 5, coins: 260, label: 'Dojo Legend' },
  { cycleDay: 6, coins: 340, label: 'Arena Elite' },
  { cycleDay: 7, coins: 500, label: 'Champion Jackpot' },
];

export const CYCLE_VETERAN_BONUS_STEP = 25;
export const MAX_CYCLE_VETERAN_BONUS = 150;

export interface DailyStreakState {
  streakDays: number;
  longestStreak: number;
  lastClaimDate: string | null; // YYYY-MM-DD (local calendar date)
  totalClaimedCoins: number;
}

export const DEFAULT_DAILY_STREAK_STATE: DailyStreakState = {
  streakDays: 0,
  longestStreak: 0,
  lastClaimDate: null,
  totalClaimedCoins: 0,
};

export interface DailyLadderSlot {
  dayNumber: number;
  cycleDay: number;
  coins: number;
  label: string;
  status: 'claimed' | 'available' | 'upcoming';
}

export interface DailyStreakSummary {
  canClaim: boolean;
  claimedToday: boolean;
  effectiveStreak: number;
  longestStreak: number;
  nextClaimDay: number;
  todayRewardCoins: number;
  nextRewardCoins: number;
  streakReset: boolean;
  cycleNumber: number;
  ladder: DailyLadderSlot[];
}

export function formatLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Exact integer calendar-day delta between two YYYY-MM-DD keys (DST-safe via UTC midnight).
 */
export function diffCalendarDays(fromDateKey: string, toDateKey: string): number {
  const [fy, fm, fd] = fromDateKey.split('-').map(Number);
  const [ty, tm, td] = toDateKey.split('-').map(Number);
  if (!fy || !fm || !fd || !ty || !tm || !td) return 999;
  const fromUtc = Date.UTC(fy, fm - 1, fd);
  const toUtc = Date.UTC(ty, tm - 1, td);
  return Math.round((toUtc - fromUtc) / 86_400_000);
}

/**
 * Returns the coin reward for a given 1-indexed consecutive streak day.
 * Repeats the 7-day ladder with an escalating veteran cycle bonus (+25 per full week, capped at +150).
 */
export function getRewardForStreakDay(streakDay: number): {
  cycleDay: number;
  coins: number;
  label: string;
} {
  const safeDay = Math.max(1, Math.floor(streakDay));
  const cycleIndex = Math.floor((safeDay - 1) / 7);
  const tierIndex = (safeDay - 1) % 7;
  const tier = DAILY_STREAK_REWARDS[tierIndex];
  const veteranBonus = Math.min(MAX_CYCLE_VETERAN_BONUS, cycleIndex * CYCLE_VETERAN_BONUS_STEP);
  return {
    cycleDay: tier.cycleDay,
    coins: tier.coins + veteranBonus,
    label: tier.label,
  };
}

export function evaluateDailyStreak(
  state: DailyStreakState,
  todayKey: string = formatLocalDateKey()
): DailyStreakSummary {
  const safeStreak = Math.max(0, Math.floor(state.streakDays));
  const safeLongest = Math.max(safeStreak, Math.floor(state.longestStreak));

  let claimedToday = false;
  let effectiveStreak = 0;
  let streakReset = false;

  if (state.lastClaimDate) {
    const delta = diffCalendarDays(state.lastClaimDate, todayKey);
    if (delta <= 0) {
      // Already claimed today (or clock moved slightly backward)
      claimedToday = true;
      effectiveStreak = Math.max(1, safeStreak);
    } else if (delta === 1) {
      // Consecutive day! Streak continues cleanly.
      claimedToday = false;
      effectiveStreak = safeStreak;
    } else {
      // Missed at least one full calendar day -> streak resets to Day 1 on next claim.
      claimedToday = false;
      effectiveStreak = 0;
      streakReset = safeStreak > 0;
    }
  }

  const canClaim = !claimedToday;
  const nextClaimDay = effectiveStreak + 1;
  const currentCycleIndex = claimedToday
    ? Math.floor((Math.max(1, effectiveStreak) - 1) / 7)
    : Math.floor((nextClaimDay - 1) / 7);
  const cycleBaseDay = currentCycleIndex * 7;

  const ladder: DailyLadderSlot[] = DAILY_STREAK_REWARDS.map((tier) => {
    const dayNumber = cycleBaseDay + tier.cycleDay;
    const reward = getRewardForStreakDay(dayNumber);
    let status: DailyLadderSlot['status'];
    if (dayNumber <= effectiveStreak) {
      status = 'claimed';
    } else if (canClaim && dayNumber === nextClaimDay) {
      status = 'available';
    } else {
      status = 'upcoming';
    }
    return {
      dayNumber,
      cycleDay: tier.cycleDay,
      coins: reward.coins,
      label: reward.label,
      status,
    };
  });

  const todayRewardCoins = canClaim
    ? getRewardForStreakDay(nextClaimDay).coins
    : getRewardForStreakDay(effectiveStreak).coins;
  const nextRewardCoins = getRewardForStreakDay(
    canClaim ? nextClaimDay + 1 : effectiveStreak + 1
  ).coins;

  return {
    canClaim,
    claimedToday,
    effectiveStreak,
    longestStreak: safeLongest,
    nextClaimDay,
    todayRewardCoins,
    nextRewardCoins,
    streakReset,
    cycleNumber: currentCycleIndex + 1,
    ladder,
  };
}

export function claimDailyReward(
  state: DailyStreakState,
  todayKey: string = formatLocalDateKey()
): {
  claimed: boolean;
  rewardCoins: number;
  newStreak: number;
  state: DailyStreakState;
} {
  const summary = evaluateDailyStreak(state, todayKey);
  if (!summary.canClaim) {
    return {
      claimed: false,
      rewardCoins: 0,
      newStreak: summary.effectiveStreak,
      state,
    };
  }

  const newStreak = summary.nextClaimDay;
  const rewardCoins = summary.todayRewardCoins;

  return {
    claimed: true,
    rewardCoins,
    newStreak,
    state: {
      streakDays: newStreak,
      longestStreak: Math.max(summary.longestStreak, newStreak),
      lastClaimDate: todayKey,
      totalClaimedCoins: state.totalClaimedCoins + rewardCoins,
    },
  };
}
