import type { DailyStreakSummary } from '../game/dailyStreak';

interface DailyRewardModalProps {
  summary: DailyStreakSummary;
  coins: number;
  justClaimedCoins: number | null;
  onClaim: () => void;
  onEnterGame: () => void;
  onClose: () => void;
}

export function DailyRewardModal({
  summary,
  coins,
  justClaimedCoins,
  onClaim,
  onEnterGame,
  onClose,
}: DailyRewardModalProps) {
  return (
    <div
      className="fixed inset-0 z-40 bg-[#060a14]/82 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-reward-title"
        className="w-full max-w-2xl bg-[#0e1526] border border-slate-700/90 clip-bevel shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-4 px-5 sm:px-6 py-4 bg-[#0b101b] border-b border-slate-800">
          <div>
            <h2
              id="daily-reward-title"
              className="font-display font-bold text-2xl sm:text-3xl tracking-wide uppercase text-white leading-none"
            >
              Daily Login Streak
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
              Log in on consecutive days to unlock bigger soft currency Coin bonuses
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Daily Reward"
            className="h-10 px-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-display font-bold text-xs uppercase tracking-wider cursor-pointer shrink-0"
          >
            Close
          </button>
        </header>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Streak Stats Strip */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#0b101b] border border-slate-800 px-3.5 py-3">
              <div className="text-[11px] text-slate-400">Active Streak</div>
              <div className="mt-0.5 font-display font-bold text-xl text-amber-300 font-mono-num">
                {summary.effectiveStreak} {summary.effectiveStreak === 1 ? 'Day' : 'Days'}
              </div>
            </div>
            <div className="bg-[#0b101b] border border-slate-800 px-3.5 py-3">
              <div className="text-[11px] text-slate-400">Best Streak</div>
              <div className="mt-0.5 font-display font-bold text-xl text-sky-300 font-mono-num">
                {summary.longestStreak} {summary.longestStreak === 1 ? 'Day' : 'Days'}
              </div>
            </div>
            <div className="bg-[#0b101b] border border-slate-800 px-3.5 py-3">
              <div className="text-[11px] text-slate-400">Your Balance</div>
              <div className="mt-0.5 font-display font-bold text-xl text-emerald-300 font-mono-num">
                {coins.toLocaleString()} Coins
              </div>
            </div>
          </div>

          {summary.streakReset && summary.canClaim && (
            <p className="text-xs text-slate-300 bg-[#0b101b] border border-slate-800 px-3.5 py-2.5">
              A day was missed, so your streak starts fresh at Day 1 today. Claim now to begin a new run.
            </p>
          )}

          {justClaimedCoins !== null && (
            <div
              role="status"
              className="bg-emerald-500/15 border border-emerald-400/50 px-4 py-3 flex items-center justify-between gap-3"
            >
              <span className="text-sm font-semibold text-emerald-200">
                Daily Reward claimed! +{justClaimedCoins.toLocaleString()} Coins added to your balance.
              </span>
              <span className="font-mono-num text-xs font-bold text-emerald-300 whitespace-nowrap">
                Day {summary.effectiveStreak} Complete
              </span>
            </div>
          )}

          {/* 7-Day Escalating Coin Ladder */}
          <section aria-label="7-Day Streak Ladder">
            <div className="flex items-baseline justify-between mb-2.5">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-300">
                Week {summary.cycleNumber} Bonus Ladder
              </h3>
              <span className="text-xs text-slate-400 font-mono-num">
                {summary.canClaim
                  ? `Today: +${summary.todayRewardCoins} Coins`
                  : `Tomorrow: +${summary.nextRewardCoins} Coins`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {summary.ladder.map((slot) => {
                const isJackpot = slot.cycleDay === 7;
                const cardStyle =
                  slot.status === 'available'
                    ? 'bg-amber-500/15 border-amber-400 text-white'
                    : slot.status === 'claimed'
                      ? 'bg-emerald-500/10 border-emerald-500/45 text-slate-200'
                      : 'bg-[#0b101b] border-slate-800 text-slate-400';

                return (
                  <div
                    key={slot.dayNumber}
                    className={`border p-3 flex flex-col justify-between gap-2 ${cardStyle} ${
                      isJackpot ? 'col-span-2' : ''
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-display font-bold text-xs uppercase tracking-wider text-slate-300 font-mono-num">
                        Day {slot.dayNumber}
                      </span>
                      <span
                        className={`text-[11px] font-semibold ${
                          slot.status === 'claimed'
                            ? 'text-emerald-300'
                            : slot.status === 'available'
                              ? 'text-amber-300'
                              : 'text-slate-500'
                        }`}
                      >
                        {slot.status === 'claimed'
                          ? 'Claimed'
                          : slot.status === 'available'
                            ? 'Ready'
                            : 'Locked'}
                      </span>
                    </div>

                    <div>
                      <div
                        className={`font-display font-bold font-mono-num leading-tight ${
                          isJackpot ? 'text-2xl text-amber-300' : 'text-lg text-white'
                        }`}
                      >
                        +{slot.coins} <span className="text-xs font-normal text-slate-300">Coins</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">{slot.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Primary Action Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
            {summary.canClaim ? (
              <button
                type="button"
                onClick={onClaim}
                className="clip-angled-sm h-11 px-6 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm tracking-wider uppercase cursor-pointer whitespace-nowrap"
              >
                Claim +{summary.todayRewardCoins} Coins
              </button>
            ) : (
              <button
                type="button"
                onClick={onEnterGame}
                className="clip-angled-sm h-11 px-6 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm tracking-wider uppercase cursor-pointer whitespace-nowrap"
              >
                Enter Nexus City
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-display font-bold text-xs tracking-wider uppercase cursor-pointer whitespace-nowrap"
            >
              Back to Title
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
