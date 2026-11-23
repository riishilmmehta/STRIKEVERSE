import { useState } from 'react';
import { CAMPAIGN_BOSSES, HERO_CLASSES, computeComboMeterState } from '../game/combatRules';
import type { ComboRank } from '../game/combatRules';
import { DOJO_CATALOG } from '../game/dojoRules';
import type {
  DojoBlockType,
  EmoteId,
  HeroCustomization,
  HudSnapshot,
  WorldZone,
} from '../game/types';

interface GameHudProps {
  hud: HudSnapshot;
  hero: HeroCustomization;
  onSwitchZone: (zone: WorldZone, bossIdx?: number) => void;
  onOpenCustomize: () => void;
  onOpenLeaderboard: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onEmote: (emote: EmoteId) => void;
  onPortalInteract: () => void;
  onDojoMode: (mode: 'play' | 'build') => void;
  onSelectDojoBlock: (type: DojoBlockType) => void;
  onPlaceDojoBlock: () => void;
  onRemoveDojoBlock: () => void;
  visitingLiked: boolean;
  onToggleVisitingLike: () => void;
  onReturnToMyDojo: () => void;
}

const ZONE_TABS: { id: WorldZone; label: string }[] = [
  { id: 'hub', label: 'Nexus City' },
  { id: 'arena', label: '1v1 Arena' },
  { id: 'campaign', label: 'Campaign' },
  { id: 'dojo', label: 'My Dojo' },
  { id: 'royale', label: 'Royale' },
];

const EMOTE_LIST: { id: EmoteId; label: string; key: string }[] = [
  { id: 'flex', label: 'Flex', key: '1' },
  { id: 'shadowbox', label: 'Warmup', key: '2' },
  { id: 'bow', label: 'Dojo Bow', key: '3' },
  { id: 'dance', label: 'Hype', key: '4' },
];

export function GameHud({
  hud,
  hero,
  onSwitchZone,
  onOpenCustomize,
  onOpenLeaderboard,
  onToggleMute,
  onPause,
  onEmote,
  onPortalInteract,
  onDojoMode,
  onSelectDojoBlock,
  onPlaceDojoBlock,
  onRemoveDojoBlock,
  visitingLiked,
  onToggleVisitingLike,
  onReturnToMyDojo,
}: GameHudProps) {
  const [showEmotes, setShowEmotes] = useState(false);

  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const ghostHpPct = Math.max(hpPct, Math.min(100, (hud.ghostHp / Math.max(1, hud.maxHp)) * 100));
  const stamPct = Math.max(0, Math.min(100, (hud.stamina / Math.max(1, hud.maxStamina)) * 100));
  const ultPct = Math.max(0, Math.min(100, hud.ultimate));
  const cls = HERO_CLASSES[hero.classId];

  const isCriticalHp = hpPct > 0 && hpPct <= 25;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none">
      {/* Subtle critical low-HP peripheral vignette */}
      {isCriticalHp && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 90px rgba(239, 68, 68, 0.45)',
          }}
        />
      )}

      {/* Cinematic Slow-Motion Combo Finisher Letterbox Bars */}
      <div
        aria-hidden="true"
        className={`fixed inset-x-0 top-0 bg-slate-950/95 pointer-events-none transition-all duration-150 ${
          hud.finisherActive ? 'h-7 border-b border-amber-400/60' : 'h-0'
        }`}
      />
      <div
        aria-hidden="true"
        className={`fixed inset-x-0 bottom-0 bg-slate-950/95 pointer-events-none transition-all duration-150 ${
          hud.finisherActive ? 'h-7 border-t border-amber-400/60' : 'h-0'
        }`}
      />
      {hud.finisherActive && (
        <div className="fixed left-1/2 bottom-10 -translate-x-1/2 pointer-events-none text-center animate-combo-pop">
          <div className="clip-angled px-4 py-1 bg-amber-400 text-slate-950 font-display font-bold text-xs sm:text-sm tracking-[0.22em] uppercase shadow-xl">
            COMBO FINISHER · {hud.finisherName}
          </div>
        </div>
      )}

      {/* TOP ROW: Compact perimeter clusters leaving >=85% center viewport clear */}
      <div className="flex items-start justify-between gap-3 p-3 sm:p-4">
        {/* TOP-LEFT: Hero Vitality, Stamina & Ultimate */}
        <div className="pointer-events-auto bg-[#0b101b]/88 border border-slate-700/80 clip-bevel px-3.5 py-2.5 w-60 sm:w-72 shadow-lg">
          <div className="flex items-baseline justify-between mb-1.5">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="font-display font-bold text-sm tracking-wide text-white truncate">
                {hero.name}
              </span>
              <span className="text-[11px] text-amber-400 font-medium whitespace-nowrap">
                {cls.name}
              </span>
            </div>
            <span className="font-mono-num text-xs font-bold text-slate-200 whitespace-nowrap">
              {hud.hp}/{hud.maxHp}
            </span>
          </div>

          {/* HP Bar with trailing damage ghost bar */}
          <div className="relative h-3 bg-slate-900 overflow-hidden mb-1.5">
            <div
              className="absolute inset-y-0 left-0 bg-amber-300/70 transition-all duration-150"
              style={{ width: `${ghostHpPct}%` }}
            />
            <div
              className={`absolute inset-y-0 left-0 transition-all duration-75 ${
                isCriticalHp ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${hpPct}%` }}
            />
          </div>

          {/* Stamina + Ultimate dual strip */}
          <div className="grid grid-cols-2 gap-2 items-center">
            <div>
              <div className="flex justify-between text-[10px] font-mono-num text-slate-400 mb-0.5">
                <span>STAM</span>
                <span>{hud.stamina}</span>
              </div>
              <div className="h-1.5 bg-slate-900 overflow-hidden">
                <div
                  className="h-full bg-sky-400 transition-all duration-75"
                  style={{ width: `${stamPct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-mono-num text-amber-300 mb-0.5">
                <span>ULT</span>
                <span>{ultPct}%</span>
              </div>
              <div className="h-1.5 bg-slate-900 overflow-hidden">
                <div
                  className={`h-full transition-all duration-100 ${
                    ultPct >= 100 ? 'bg-amber-400' : 'bg-amber-600'
                  }`}
                  style={{ width: `${ultPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-300 font-mono-num">
            <span>LVL {hud.level}</span>
            <span>{hud.coins} COINS</span>
          </div>
        </div>

        {/* TOP-CENTER: Seamless World Zone Switcher + Active Boss/Opponent Vitality */}
        <div className="flex flex-col items-center gap-2 max-w-[46vw]">
          <nav
            aria-label="World Zones"
            className="pointer-events-auto flex items-center gap-1 bg-[#0b101b]/88 border border-slate-700/80 p-1 shadow-lg overflow-x-auto max-w-full"
          >
            {ZONE_TABS.map((tab) => {
              const active = hud.zone === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSwitchZone(tab.id);
                  }}
                  className={`px-2.5 py-1 text-xs font-display font-bold tracking-wide uppercase whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Opponent / Boss Health Bar */}
          {hud.opponent && (
            <div className="bg-[#0b101b]/90 border border-rose-500/45 clip-bevel px-4 py-2 w-72 sm:w-96 shadow-lg">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <div className="min-w-0">
                  <span className="font-display font-bold text-sm text-white tracking-wider">
                    {hud.opponent.name}
                  </span>
                  <span className="ml-2 text-[11px] text-rose-300 truncate">
                    {hud.opponent.title}
                  </span>
                </div>
                <span className="font-mono-num text-xs font-bold text-rose-200 whitespace-nowrap">
                  {hud.opponent.hp}/{hud.opponent.maxHp}
                </span>
              </div>
              <div className="relative h-2.5 bg-slate-900 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-amber-300/75 transition-all duration-150"
                  style={{
                    width: `${Math.min(100, (hud.opponent.ghostHp / Math.max(1, hud.opponent.maxHp)) * 100)}%`,
                  }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-rose-500 transition-all duration-75"
                  style={{
                    width: `${Math.min(100, (hud.opponent.hp / Math.max(1, hud.opponent.maxHp)) * 100)}%`,
                  }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px]">
                {hud.opponent.telegraphing ? (
                  <span className="font-display font-bold text-amber-300 uppercase tracking-wider">
                    INCOMING STRIKE — TAP PARRY [L]!
                  </span>
                ) : hud.opponent.staggered ? (
                  <span className="font-display font-bold text-emerald-300 uppercase tracking-wider">
                    STUNNED — LAUNCH COMBO [J-J-K]!
                  </span>
                ) : (
                  <span className="text-slate-300 truncate">
                    {hud.opponent.lessonHint ?? 'Chain Light [J] & Heavy [K] attacks'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Campaign Boss Selector Strip */}
          {hud.zone === 'campaign' && (
            <div className="pointer-events-auto flex items-center gap-1.5 bg-[#0b101b]/88 border border-slate-700/80 px-2 py-1">
              {CAMPAIGN_BOSSES.map((boss) => {
                const locked = boss.index > hud.highestBossCleared + 1;
                const active = hud.activeBossIndex === boss.index;
                return (
                  <button
                    key={boss.index}
                    type="button"
                    tabIndex={-1}
                    disabled={locked}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onSwitchZone('campaign', boss.index);
                    }}
                    className={`px-2 py-0.5 text-[11px] font-display font-bold uppercase whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-rose-500 text-white'
                        : locked
                          ? 'text-slate-500 cursor-not-allowed'
                          : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {locked ? `LOCKED B${boss.index + 1}` : `B${boss.index + 1}: ${boss.name}`}
                  </button>
                );
              })}
            </div>
          )}

          {/* Last Hero Standing Counter */}
          {hud.zone === 'royale' && (
            <div className="bg-[#0b101b]/90 border border-cyan-400/50 clip-angled-sm px-4 py-1.5 flex items-center gap-4 text-xs font-mono-num">
              <span className="text-cyan-300 font-bold">
                ALIVE: {hud.royaleAlive}/{hud.royaleTotal}
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-amber-300">RING: {hud.royaleRingRadius}m</span>
            </div>
          )}
        </div>

        {/* TOP-RIGHT: Compact Square Utility Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          {hud.zone === 'hub' && (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenLeaderboard();
              }}
              aria-label="Open Dojo Leaderboard"
              title="Dojo Leaderboard [B]"
              className="h-10 px-3 bg-[#0b101b]/90 hover:bg-slate-800 border border-amber-400/65 text-amber-200 font-display font-bold text-xs tracking-wide uppercase flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2">
                <path d="M6 9H4a2 2 0 0 1-2-2V5h4" />
                <path d="M18 9h2a2 2 0 0 0 2-2V5h-4" />
                <path d="M6 4h12v6a6 6 0 0 1-12 0V4Z" />
                <path d="M12 16v4" />
                <path d="M8 20h8" />
              </svg>
              <span className="hidden sm:inline">Dojos [B]</span>
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenCustomize();
            }}
            aria-label="Customize Hero"
            title="Customize Hero [C]"
            className="h-10 px-3 bg-[#0b101b]/88 hover:bg-slate-800 border border-sky-400/50 text-sky-200 font-display font-bold text-xs tracking-wide uppercase flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2">
              <circle cx="12" cy="7" r="4" />
              <path d="M5 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2" />
            </svg>
            <span className="hidden sm:inline">Style [C]</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              setShowEmotes((v) => !v);
            }}
            aria-label="Toggle Emotes"
            title="Emotes [1-4]"
            className={`w-10 h-10 bg-[#0b101b]/88 hover:bg-slate-800 border flex items-center justify-center cursor-pointer ${
              showEmotes ? 'border-amber-400 text-amber-300' : 'border-slate-700 text-slate-200'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={hud.muted ? 'Unmute Audio' : 'Mute Audio'}
            title="Mute / Unmute [M]"
            className="w-10 h-10 bg-[#0b101b]/88 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              {hud.muted ? (
                <line x1="23" y1="9" x2="17" y2="15" />
              ) : (
                <path d="M15.5 8.5a5 5 0 0 1 0 7" />
              )}
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            aria-label="Pause Game"
            title="Pause [P / Esc]"
            className="w-10 h-10 bg-[#0b101b]/88 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <rect x="6" y="5" width="4" height="14" />
              <rect x="14" y="5" width="4" height="14" />
            </svg>
          </button>
        </div>
      </div>

      {/* Emote Quick Bar (appears cleanly under top-right when toggled) */}
      {showEmotes && (
        <div className="pointer-events-auto fixed top-16 right-4 bg-[#0b101b]/95 border border-slate-700 p-2 flex items-center gap-1.5 shadow-xl">
          {EMOTE_LIST.map((em) => (
            <button
              key={em.id}
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onEmote(em.id);
                setShowEmotes(false);
              }}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-xs font-display font-bold uppercase text-slate-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              {em.label} [{em.key}]
            </button>
          ))}
        </div>
      )}

      {/* 3D-Projected Floating Hit Numbers & Impact Tags */}
      {hud.damagePopups.map((pop) => {
        const progress = Math.min(1, pop.age / pop.maxAge);
        const risePx = progress * 44;
        const opacity = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;
        const colorClass =
          pop.tone === 'parry'
            ? 'text-yellow-300 text-2xl sm:text-3xl'
            : pop.tone === 'finisher'
              ? 'text-amber-300 text-3xl sm:text-4xl'
              : pop.tone === 'heavy'
                ? 'text-orange-300 text-2xl sm:text-3xl'
                : pop.tone === 'block'
                  ? 'text-sky-300 text-lg'
                  : 'text-white text-xl sm:text-2xl';
        return (
          <div
            key={pop.id}
            className="fixed pointer-events-none font-display font-bold font-mono-num hud-text-shadow text-center"
            style={{
              left: `${pop.screenX}%`,
              top: `${pop.screenY}%`,
              opacity,
              transform: `translate(-50%, calc(-50% - ${risePx}px)) scale(${1.15 - progress * 0.2})`,
            }}
          >
            <div className={`leading-none ${colorClass}`}>{pop.value}</div>
            {pop.label && (
              <div className="text-[10px] sm:text-xs tracking-wider uppercase text-amber-200 leading-tight">
                {pop.label}
              </div>
            )}
          </div>
        );
      })}

      {/* CENTER-RIGHT: Dedicated Visual Combo Meter (Rank, Hit Count, Move Chain & Window Timer) */}
      {(() => {
        const meter = computeComboMeterState(
          hud.comboCount,
          hud.comboTimer,
          hud.comboMaxTimer
        );
        if (!meter.active) return null;

        const rankPalette: Record<
          ComboRank,
          { border: string; badgeBg: string; countText: string; barBg: string; stripe: string }
        > = {
          C: {
            border: 'border-sky-400/70',
            badgeBg: 'bg-sky-400 text-slate-950',
            countText: 'text-sky-300',
            barBg: 'bg-sky-400',
            stripe: 'bg-sky-400',
          },
          B: {
            border: 'border-amber-400/80',
            badgeBg: 'bg-amber-400 text-slate-950',
            countText: 'text-amber-300',
            barBg: 'bg-amber-400',
            stripe: 'bg-amber-400',
          },
          A: {
            border: 'border-orange-400/85',
            badgeBg: 'bg-orange-500 text-slate-950',
            countText: 'text-orange-300',
            barBg: 'bg-orange-400',
            stripe: 'bg-orange-500',
          },
          S: {
            border: 'border-rose-400/90',
            badgeBg: 'bg-rose-500 text-white',
            countText: 'text-rose-300',
            barBg: 'bg-rose-500',
            stripe: 'bg-rose-500',
          },
          'S+': {
            border: 'border-yellow-300',
            badgeBg: 'bg-yellow-300 text-slate-950',
            countText: 'text-yellow-300',
            barBg: 'bg-yellow-300',
            stripe: 'bg-yellow-300',
          },
        };

        const pal = rankPalette[meter.rank];
        const seqTokens = hud.comboSequence
          ? hud.comboSequence.split(/[\s·-]+/).filter(Boolean)
          : [];
        const pct = Math.max(0, Math.min(100, meter.progress * 100));

        return (
          <section
            aria-label="Combo Meter"
            className={`fixed right-4 top-24 sm:right-6 sm:top-28 w-52 sm:w-60 bg-[#0b101b]/92 border ${pal.border} clip-bevel shadow-xl overflow-hidden pointer-events-none`}
          >
            {/* Left vertical accent energy bar */}
            <div className={`absolute inset-y-0 left-0 w-1 ${pal.stripe}`} />

            <div className="pl-3.5 pr-3 py-2.5">
              {/* Row 1: Rank Emblem + Tier + Animated Hit Counter */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`clip-angled-sm px-2 py-0.5 font-display font-bold text-base leading-tight ${pal.badgeBg}`}
                  >
                    {meter.rank}
                  </div>
                  <div className="min-w-0">
                    <div className="font-display font-bold text-[11px] tracking-widest uppercase text-slate-200 leading-tight truncate">
                      {meter.tierLabel}
                    </div>
                    <div className="flex items-center gap-1.5 font-mono-num text-[10px] font-bold leading-tight">
                      <span className="text-emerald-300">+{meter.damageBonusPct}% DMG</span>
                      {hud.comboCount >= 4 && (
                        <span className="text-amber-300 tracking-wider uppercase animate-pulse">
                          {hud.comboCount >= 8 ? 'OVERDRIVE' : 'FRENZY'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  key={hud.comboCount}
                  className="text-right animate-combo-pop shrink-0"
                >
                  <div
                    className={`font-display font-bold text-3xl sm:text-4xl font-mono-num leading-none hud-text-shadow ${pal.countText}`}
                  >
                    {hud.comboCount}x
                  </div>
                  <div className="text-[9px] font-display font-bold tracking-widest uppercase text-slate-400">
                    COMBO
                  </div>
                </div>
              </div>

              {/* Row 2: Active Move Name & L/H Sequence Tokens */}
              <div className="mt-2 pt-1.5 border-t border-slate-800/90 flex items-center justify-between gap-2">
                <span className="font-display font-bold text-xs uppercase tracking-wide text-white truncate">
                  {hud.comboMoveName || 'STRIKE'}
                </span>
                {seqTokens.length > 0 && (
                  <div className="flex items-center gap-1 shrink-0">
                    {seqTokens.map((tok, i) => (
                      <span
                        key={`${tok}-${i}`}
                        className={`px-1.5 py-0.5 text-[10px] font-mono-num font-bold leading-none ${
                          tok === 'H'
                            ? 'bg-rose-500/90 text-white'
                            : 'bg-amber-400/90 text-slate-950'
                        }`}
                      >
                        {tok}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Row 3: Brief Window Timer Countdown Bar */}
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] font-mono-num mb-1">
                  <span
                    className={`font-display font-bold tracking-wider uppercase ${
                      meter.isUrgent ? 'text-rose-400 animate-pulse' : 'text-slate-400'
                    }`}
                  >
                    {meter.isUrgent ? 'CHAIN FADING' : 'WINDOW'}
                  </span>
                  <span
                    className={`font-bold ${
                      meter.isUrgent ? 'text-rose-300' : 'text-slate-200'
                    }`}
                  >
                    {meter.secondsRemaining.toFixed(1)}s
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Combo Window Timer"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(pct)}
                  className="relative h-2 bg-slate-900 overflow-hidden border border-slate-800"
                >
                  <div
                    className={`h-full transition-[width] duration-75 ${
                      meter.isUrgent ? 'bg-rose-500' : pal.barBg
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Row 4: Live Next-Finisher Sequence Prompt */}
              {hud.nextFinisherHint && (
                <div className="mt-1.5 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono-num">
                  <span className="font-display font-bold uppercase tracking-wider text-amber-300">
                    FINISHER
                  </span>
                  <span className="text-amber-200 truncate font-bold">
                    {hud.nextFinisherHint}
                  </span>
                </div>
              )}
            </div>
          </section>
        );
      })()}

      {/* UPPER-CENTER: Action Callouts (Perfect Parry, Wall Bounce, Crate Smash, Zone Entry) */}
      {hud.callout && (
        <div
          key={hud.callout.id}
          className="fixed left-1/2 top-36 -translate-x-1/2 text-center animate-combo-pop pointer-events-none"
        >
          <div
            className={`font-display font-bold text-2xl sm:text-3xl tracking-wider uppercase hud-text-shadow ${
              hud.callout.tone === 'amber'
                ? 'text-amber-300'
                : hud.callout.tone === 'cyan'
                  ? 'text-cyan-300'
                  : hud.callout.tone === 'emerald'
                    ? 'text-emerald-300'
                    : 'text-rose-400'
            }`}
          >
            {hud.callout.text}
          </div>
          {hud.callout.subtext && (
            <div className="text-xs sm:text-sm font-medium text-white tracking-wide hud-text-shadow">
              {hud.callout.subtext}
            </div>
          )}
        </div>
      )}

      {/* BOTTOM-CENTER: Contextual Portal Prompt */}
      {hud.portalPrompt && (
        <div className="pointer-events-auto fixed bottom-6 left-1/2 -translate-x-1/2">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onPortalInteract();
            }}
            className="clip-angled px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm tracking-wider uppercase shadow-xl flex items-center gap-3 cursor-pointer whitespace-nowrap"
          >
            <span>Enter {hud.portalPrompt.label}</span>
            <span className="text-xs font-mono-num bg-slate-950/20 px-1.5 py-0.5">[F]</span>
          </button>
        </div>
      )}

      {/* BOTTOM-CENTER: Community Dojo Visitor Bar OR Dojo Sandbox Builder Dock */}
      {hud.zone === 'dojo' && hud.visitingDojo && (
        <div
          aria-label="Visiting Community Dojo"
          className="pointer-events-auto fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#0b101b]/94 border border-sky-400/60 px-4 py-2.5 flex flex-wrap items-center justify-center gap-3 max-w-[92vw] shadow-xl"
        >
          <div className="text-xs">
            <span className="font-display font-bold uppercase tracking-wide text-white">
              {hud.visitingDojo.dojoName}
            </span>
            <span className="text-slate-400 ml-2">
              by {hud.visitingDojo.ownerName} · {hud.visitingDojo.themeTag}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleVisitingLike();
              }}
              aria-pressed={visitingLiked}
              className={`px-3 py-1.5 text-xs font-display font-bold uppercase tracking-wider border cursor-pointer whitespace-nowrap transition-colors ${
                visitingLiked
                  ? 'bg-rose-500 border-rose-400 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-rose-400 hover:text-rose-300'
              }`}
            >
              {visitingLiked ? '♥ Liked' : '♡ Like Dojo'}
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenLeaderboard();
              }}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-display font-bold uppercase tracking-wider cursor-pointer whitespace-nowrap"
            >
              Leaderboard [B]
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onReturnToMyDojo();
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 text-xs font-display font-bold uppercase tracking-wider cursor-pointer whitespace-nowrap"
            >
              My Dojo
            </button>
          </div>
        </div>
      )}

      {hud.zone === 'dojo' && !hud.visitingDojo && (
        <div className="pointer-events-auto fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#0b101b]/92 border border-emerald-500/50 px-3 py-2 flex flex-wrap items-center justify-center gap-2 max-w-[92vw] shadow-xl">
          <div className="flex items-center border border-slate-700">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onDojoMode('play');
              }}
              className={`px-2.5 py-1 text-xs font-display font-bold uppercase cursor-pointer ${
                hud.dojoMode === 'play' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300'
              }`}
            >
              Train
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onDojoMode('build');
              }}
              className={`px-2.5 py-1 text-xs font-display font-bold uppercase cursor-pointer ${
                hud.dojoMode === 'build' ? 'bg-amber-500 text-slate-950' : 'text-slate-300'
              }`}
            >
              Build ({hud.dojoBlockCount}/32)
            </button>
          </div>

          {hud.dojoMode === 'build' && (
            <>
              <div className="flex items-center gap-1">
                {(Object.keys(DOJO_CATALOG) as DojoBlockType[]).map((type) => {
                  const item = DOJO_CATALOG[type];
                  const active = hud.selectedDojoBlock === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onSelectDojoBlock(type);
                      }}
                      title={`${item.label} · ${item.role}`}
                      className={`px-2 py-1 text-[11px] font-display font-bold uppercase whitespace-nowrap cursor-pointer border ${
                        active
                          ? 'bg-sky-400 text-slate-950 border-sky-200'
                          : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onPlaceDojoBlock();
                }}
                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-display font-bold uppercase cursor-pointer whitespace-nowrap"
              >
                Place Here
              </button>

              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onRemoveDojoBlock();
                }}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-display font-bold uppercase cursor-pointer whitespace-nowrap"
              >
                Remove
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
