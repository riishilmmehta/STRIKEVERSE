import type { DailyQuest, MatchSummary, WorldZone } from '../game/types';

interface PauseModalProps {
  autoAssist: boolean;
  quests: DailyQuest[];
  onToggleAutoAssist: (enabled: boolean) => void;
  onResume: () => void;
  onRestart: () => void;
  onReturnToTitle: () => void;
}

export function PauseModal({
  autoAssist,
  quests,
  onToggleAutoAssist,
  onResume,
  onRestart,
  onReturnToTitle,
}: PauseModalProps) {
  return (
    <div className="fixed inset-0 z-40 bg-[#060a14]/78 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Game Paused"
        className="w-full max-w-md bg-[#0e1526] border border-slate-700 clip-bevel p-6 shadow-2xl"
      >
        <h2 className="font-display font-bold text-2xl tracking-wider uppercase text-white mb-1">
          Paused
        </h2>
        <p className="text-xs text-slate-400 mb-5">
          Combo chains: J-J-K (Skyward Launcher) · J-K-K (Meteor Slam) · K-J-K (Dragon Finisher)
        </p>

        {/* Auto-Assist first-class toggle (GDD pillar 5) */}
        <div className="flex items-center justify-between gap-4 py-3 border-y border-slate-800 mb-4">
          <div>
            <div className="text-sm font-semibold text-white">Auto-Assist Layer</div>
            <div className="text-xs text-slate-400">
              Auto-faces nearest rival and widens combo/parry timing windows
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoAssist}
            onClick={() => onToggleAutoAssist(!autoAssist)}
            className={`px-3 py-1.5 text-xs font-display font-bold uppercase cursor-pointer whitespace-nowrap ${
              autoAssist
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 border border-slate-600'
            }`}
          >
            {autoAssist ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Daily Quests tracker */}
        <div className="mb-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Daily Quests
          </div>
          <div className="space-y-1.5">
            {quests.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between text-xs bg-slate-900/90 px-3 py-2 border border-slate-800"
              >
                <span className={q.completed ? 'text-emerald-300 line-through' : 'text-slate-200'}>
                  {q.label}
                </span>
                <span className="font-mono-num text-amber-300">
                  {q.completed ? 'DONE' : `${q.progress}/${q.target}`}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="clip-angled-sm w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm tracking-wider uppercase cursor-pointer"
          >
            Resume
          </button>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onRestart}
              className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-display font-bold text-xs tracking-wider uppercase cursor-pointer"
            >
              Restart Zone
            </button>
            <button
              type="button"
              onClick={onReturnToTitle}
              className="py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-display font-bold text-xs tracking-wider uppercase cursor-pointer"
            >
              Title Screen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MatchEndModalProps {
  summary: MatchSummary;
  onPlayAgain: () => void;
  onNextBoss: (nextIdx: number) => void;
  onReturnZone: (zone: WorldZone) => void;
}

export function MatchEndModal({
  summary,
  onPlayAgain,
  onNextBoss,
  onReturnZone,
}: MatchEndModalProps) {
  return (
    <div className="fixed inset-0 z-40 bg-[#060a14]/80 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={summary.victory ? 'Victory Summary' : 'Defeat Summary'}
        className="w-full max-w-md bg-[#0e1526] border border-slate-700 clip-bevel p-6 shadow-2xl"
      >
        <div
          className={`font-display font-bold text-3xl tracking-wider uppercase mb-1 ${
            summary.victory ? 'text-amber-400' : 'text-rose-400'
          }`}
        >
          {summary.title}
        </div>
        <p className="text-sm text-slate-300 mb-5">{summary.subtitle}</p>

        {/* Mastery / Progress Stat Tiles */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          <div className="bg-slate-900/90 border border-slate-800 p-3 text-center">
            <div className="text-[11px] uppercase text-slate-400">Max Combo</div>
            <div className="font-display font-bold text-xl text-amber-300 font-mono-num">
              {summary.maxCombo}x
            </div>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 p-3 text-center">
            <div className="text-[11px] uppercase text-slate-400">Parries</div>
            <div className="font-display font-bold text-xl text-cyan-300 font-mono-num">
              {summary.parriesLanded}
            </div>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 p-3 text-center">
            <div className="text-[11px] uppercase text-slate-400">Time</div>
            <div className="font-display font-bold text-xl text-white font-mono-num">
              {summary.elapsedSeconds}s
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs font-mono-num text-emerald-300 bg-slate-900/75 border border-slate-800 px-3.5 py-2.5 mb-5">
          <span>REWARDS EARNED</span>
          <span>
            +{summary.coinsEarned} COINS · +{summary.xpEarned} XP
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {summary.victory && summary.hasNextBoss && typeof summary.bossIndex === 'number' ? (
            <button
              type="button"
              data-start="true"
              onClick={() => onNextBoss(summary.bossIndex! + 1)}
              className="clip-angled-sm w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm tracking-wider uppercase cursor-pointer"
            >
              Next Boss Trial
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onPlayAgain}
              className="clip-angled-sm w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm tracking-wider uppercase cursor-pointer"
            >
              {summary.victory ? 'Play Again' : 'Try Again'}
            </button>
          )}

          <button
            type="button"
            onClick={() => onReturnZone('hub')}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-display font-bold text-xs tracking-wider uppercase cursor-pointer"
          >
            Return to Nexus City
          </button>
        </div>
      </div>
    </div>
  );
}
