import type { DailyStreakSummary } from '../game/dailyStreak';
import type { HeroCustomization, WorldZone } from '../game/types';
import { HERO_CLASSES } from '../game/combatRules';
import { PWAInstallButton } from './PWAInstallButton';

interface TitleScreenProps {
  hero: HeroCustomization;
  wins: number;
  level: number;
  coins: number;
  dailyStreak: DailyStreakSummary;
  onStart: (zone: WorldZone) => void;
  onOpenCustomize: () => void;
  onOpenDailyReward: () => void;
}

export function TitleScreen({
  hero,
  wins,
  level,
  coins,
  dailyStreak,
  onStart,
  onOpenCustomize,
  onOpenDailyReward,
}: TitleScreenProps) {
  const cls = HERO_CLASSES[hero.classId];

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 sm:p-10">
      {/* Subtle left-side contrast scrim so typography reads crisply over sunlit sky without hiding the 3D hero on the right */}
      <div
        className="fixed inset-y-0 left-0 w-full sm:w-[46%] pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(8, 13, 24, 0.84) 0%, rgba(8, 13, 24, 0.56) 68%, rgba(8, 13, 24, 0) 100%)',
        }}
      />

      {/* Top row: minimal hero identity line on left + Daily Reward Streak Badge on right */}
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="text-xs font-medium tracking-wider text-slate-300 hud-text-shadow pt-1">
          <span>{hero.name}</span>
          <span className="mx-2 text-slate-500">·</span>
          <span className="text-amber-400">{cls.name}</span>
          <span className="mx-2 text-slate-500">·</span>
          <span className="font-mono-num">LVL {level}</span>
          <span className="mx-2 text-slate-500">·</span>
          <span className="font-mono-num text-emerald-300">{coins.toLocaleString()} COINS</span>
          {wins > 0 && (
            <>
              <span className="mx-2 text-slate-500">·</span>
              <span className="font-mono-num">{wins} WINS</span>
            </>
          )}
        </div>

        {/* Top-Right Utility Cluster: In-App PWA Install + Daily Reward Retention Badge */}
        <div className="flex items-center gap-2.5 shrink-0">
          <PWAInstallButton variant="title" />

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenDailyReward();
            }}
            aria-label="Daily Reward"
            className={`pointer-events-auto clip-bevel px-4 py-2.5 border text-left transition-colors cursor-pointer shadow-xl flex items-center gap-3 shrink-0 ${
              dailyStreak.canClaim
                ? 'bg-[#0b101b]/94 hover:bg-[#131d33] border-amber-400 text-white'
                : 'bg-[#0b101b]/88 hover:bg-[#131d33] border-emerald-400/55 text-slate-200'
            }`}
          >
            <div
              className={`w-9 h-9 clip-angled-sm flex items-center justify-center shrink-0 ${
                dailyStreak.canClaim
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300'
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.2">
                <path d="M12 2v4" />
                <path d="M5 10h14v10H5z" />
                <path d="M3 6h18v4H3z" />
                <path d="M12 6v14" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`font-display font-bold text-xs tracking-wider uppercase ${
                    dailyStreak.canClaim ? 'text-amber-300' : 'text-emerald-300'
                  }`}
                >
                  Daily Reward
                </span>
                <span className="text-[11px] font-mono-num text-slate-400">
                  {dailyStreak.canClaim
                    ? `Day ${dailyStreak.nextClaimDay}`
                    : `Day ${dailyStreak.effectiveStreak} Streak`}
                </span>
              </div>
              <div className="font-display font-bold text-sm font-mono-num leading-tight mt-0.5">
                {dailyStreak.canClaim ? (
                  <span className="text-white">+{dailyStreak.todayRewardCoins} Coins Ready</span>
                ) : (
                  <span className="text-slate-300">
                    Claimed · Next +{dailyStreak.nextRewardCoins}
                  </span>
                )}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Asymmetric Left-Third Hero Emblem & Primary Menu Actions */}
      <div className="relative z-10 max-w-md my-auto pointer-events-auto">
        {/* Custom inline SVG STRIKEVERSE Crest Emblem */}
        <svg
          viewBox="0 0 420 112"
          className="w-[300px] sm:w-[390px] h-auto mb-4 drop-shadow-[0_6px_18px_rgba(0,0,0,0.65)]"
          role="img"
          aria-label="STRIKEVERSE"
        >
          {/* Geometric martial lightning crest mark */}
          <polygon
            points="10,18 46,18 32,48 56,48 16,96 28,60 4,60"
            fill="#f59e0b"
            stroke="#0f172a"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <polygon
            points="44,24 62,24 44,68 32,68"
            fill="#38bdf8"
            stroke="#0f172a"
            strokeWidth="2.5"
          />
          {/* Athletic angled wordmark */}
          <text
            x="72"
            y="62"
            fill="#f8fafc"
            stroke="#0b101b"
            strokeWidth="5"
            paintOrder="stroke fill"
            fontFamily="Chakra Petch, sans-serif"
            fontWeight="700"
            fontSize="48"
            letterSpacing="3"
          >
            STRIKEVERSE
          </text>
          <rect x="74" y="74" width="212" height="4" fill="#f59e0b" />
          <rect x="292" y="74" width="54" height="4" fill="#38bdf8" />
          <text
            x="74"
            y="98"
            fill="#cbd5e1"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontWeight="600"
            fontSize="13"
            letterSpacing="3.5"
          >
            NEXUS CITY · OPEN-WORLD COMBAT
          </text>
        </svg>

        <p className="text-sm sm:text-base text-slate-200 max-w-sm leading-relaxed mb-7 hud-text-shadow">
          Step into Nexus City with your visible 3rd-person hero. Chain Light and Heavy combos,
          master Perfect Parries, battle story bosses, and build your own Dojo.
        </p>

        {/* Exactly 3 clear menu actions */}
        <div className="flex flex-col gap-3 max-w-sm">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStart('hub');
            }}
            className="clip-angled px-6 py-3.5 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-display font-bold text-lg tracking-wider uppercase transition-transform text-left flex items-center justify-between shadow-lg cursor-pointer"
          >
            <span>Enter Nexus City</span>
            <span className="text-xs font-mono-num bg-slate-950/15 px-2 py-0.5">PLAY</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onStart('arena');
              }}
              className="clip-angled-sm px-5 py-3 bg-[#11192b]/95 hover:bg-[#1a2640] border border-amber-500/50 text-slate-100 font-display font-bold text-sm tracking-wide uppercase transition-colors cursor-pointer whitespace-nowrap text-center"
            >
              Quick 1v1 Duel
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenCustomize();
              }}
              className="clip-angled-sm px-5 py-3 bg-[#11192b]/95 hover:bg-[#1a2640] border border-sky-400/50 text-slate-100 font-display font-bold text-sm tracking-wide uppercase transition-colors cursor-pointer whitespace-nowrap text-center"
            >
              Customize Hero
            </button>
          </div>
        </div>
      </div>

      {/* Subtle bottom contrast scrim so control hint reads clearly across entire bottom edge */}
      <div
        className="fixed inset-x-0 bottom-0 h-20 pointer-events-none"
        style={{
          background: 'linear-gradient(0deg, rgba(8, 13, 24, 0.72) 0%, rgba(8, 13, 24, 0) 100%)',
        }}
      />

      {/* Single flat, borderless control hint line in bottom safe margin */}
      <div className="relative z-10 text-xs text-slate-100 font-mono-num tracking-wide hud-text-shadow">
        WASD Move · Drag Look · J Light · K Heavy · L Block / Parry · U Skill · Shift Dash · Space Jump · Enter Start
      </div>
    </div>
  );
}
