import { useEffect, useState } from 'react';
import { getBiomeMusicSpec } from '../game/arenaBiomeAudio';
import {
  ARENA_BIOME_ORDER,
  ARENA_BIOMES,
  ARENA_RANKS,
  ARENA_TIERS,
  MAX_HERO_LEVEL,
} from '../game/arenaRanks';
import {
  getCombatLogPeakDamage,
  MAX_COMBAT_ARCHIVE_ENTRIES,
  MAX_COMBAT_LOG_ENTRIES,
} from '../game/combatLog';
import { CAMPAIGN_BOSSES, HERO_CLASSES, computeComboMeterState } from '../game/combatRules';
import type { ComboRank } from '../game/combatRules';
import { DOJO_AUDIO_ORDER, DOJO_AUDIO_SPECS } from '../game/dojoAudio';
import { DOJO_CATALOG } from '../game/dojoRules';
import { DOJO_WEATHER_ORDER, DOJO_WEATHER_SPECS } from '../game/dojoWeather';
import { getArenaBiomeParticleSpec } from '../game/arenaBiomeFx';
import { LANDMARK_RANK_NUMBERS, getRankEmblemSpec } from '../game/rankEmblems';
import { getNextRankEmoteReward } from '../game/rankRewards';
import { EMOTE_CATALOG } from '../game/storeCatalog';
import { RankEmblemIcon } from './RankEmblemIcon';
import {
  TRAINING_DUMMY_ORDER,
  TRAINING_DUMMY_VARIANTS,
  getDummyVariantSpec,
} from '../game/trainingDummy';
import type {
  ArenaBiomeId,
  DojoAudioTrackId,
  DojoBlockType,
  DojoWeatherId,
  DummyVariantId,
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
  onOpenClanSiege: () => void;
  onOpenTradingPost: () => void;
  onOpenRankRewards: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onEmote: (emote: EmoteId) => void;
  onPortalInteract: () => void;
  onDojoMode: (mode: 'play' | 'build') => void;
  onSelectDojoBlock: (type: DojoBlockType) => void;
  onSelectDummyVariant: (variant: DummyVariantId) => void;
  onSelectDojoWeather: (weather: DojoWeatherId) => void;
  onToggleWeatherCycle: () => void;
  onSelectDojoAudio: (track: DojoAudioTrackId) => void;
  onToggleSpectator: () => void;
  onSelectArenaBiome: (biome: ArenaBiomeId) => void;
  onPlaceDojoBlock: () => void;
  onRemoveDojoBlock: () => void;
  visitingLiked: boolean;
  onToggleVisitingLike: () => void;
  onSiegeVisitingDojo: () => void;
  onReturnToMyDojo: () => void;
}

const ZONE_TABS: { id: WorldZone; label: string }[] = [
  { id: 'hub', label: 'Nexus City' },
  { id: 'arena', label: '1v1 Arena' },
  { id: 'campaign', label: 'Campaign' },
  { id: 'dojo', label: 'My Dojo' },
  { id: 'clan_siege', label: 'Clan Siege' },
  { id: 'royale', label: 'Royale' },
];

export function GameHud({
  hud,
  hero,
  onSwitchZone,
  onOpenCustomize,
  onOpenLeaderboard,
  onOpenClanSiege,
  onOpenTradingPost,
  onOpenRankRewards,
  onToggleMute,
  onPause,
  onEmote,
  onPortalInteract,
  onDojoMode,
  onSelectDojoBlock,
  onSelectDummyVariant,
  onSelectDojoWeather,
  onToggleWeatherCycle,
  onSelectDojoAudio,
  onToggleSpectator,
  onSelectArenaBiome,
  onPlaceDojoBlock,
  onRemoveDojoBlock,
  visitingLiked,
  onToggleVisitingLike,
  onSiegeVisitingDojo,
  onReturnToMyDojo,
}: GameHudProps) {
  const [showEmotes, setShowEmotes] = useState(false);
  const [logCollapsed, setLogCollapsed] = useState(() => hud.zone === 'arena');
  const [logTab, setLogTab] = useState<'live' | 'archive'>('live');
  const [weatherTrayOpen, setWeatherTrayOpen] = useState(false);
  const [audioTrayOpen, setAudioTrayOpen] = useState(false);
  const [arenaDrawerOpen, setArenaDrawerOpen] = useState(false);
  const [rankLadderOpen, setRankLadderOpen] = useState(false);

  const isLiveMatch =
    hud.zone === 'arena' ||
    hud.zone === 'campaign' ||
    hud.zone === 'royale' ||
    hud.zone === 'clan_siege';

  // Keep live battle viewport spotless by closing lobby drawers & emote menus on zone changes
  useEffect(() => {
    setLogCollapsed(hud.zone !== 'dojo');
    if (hud.zone !== 'hub') {
      setArenaDrawerOpen(false);
      setRankLadderOpen(false);
    }
    if (isLiveMatch) {
      setShowEmotes(false);
    }
  }, [hud.zone, isLiveMatch]);

  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const ghostHpPct = Math.max(hpPct, Math.min(100, (hud.ghostHp / Math.max(1, hud.maxHp)) * 100));
  const stamPct = Math.max(0, Math.min(100, (hud.stamina / Math.max(1, hud.maxStamina)) * 100));
  const ultPct = Math.max(0, Math.min(100, hud.ultimate));
  const xpPct = Math.max(0, Math.min(100, Math.round((hud.xp / Math.max(1, hud.xpToNext)) * 100)));
  const cls = HERO_CLASSES[hero.classId];
  const activeLogEntries = logTab === 'live' ? hud.combatLog : hud.combatArchive;
  const peakLogDamage = getCombatLogPeakDamage(activeLogEntries);
  const selectedDummySpec = getDummyVariantSpec(hud.selectedDummyVariant);
  const activeWeatherSpec = DOJO_WEATHER_SPECS[hud.dojoWeather];
  const activeAudioSpec = DOJO_AUDIO_SPECS[hud.dojoAudioTrack];
  const guestAudioSpec = hud.activeAudioTrack ? DOJO_AUDIO_SPECS[hud.activeAudioTrack] : null;
  const activeBiomeMusic = getBiomeMusicSpec(hud.arenaRank.selectedBiome);
  const activeBiomeFx = getArenaBiomeParticleSpec(hud.arenaRank.selectedBiome);
  const nextRankEmote = getNextRankEmoteReward(hud.arenaRank.rank);
  const availableEmotes = hud.ownedEmotes
    .map((id) => EMOTE_CATALOG[id])
    .filter((spec): spec is NonNullable<typeof spec> => Boolean(spec));

  const isCriticalHp = hpPct > 0 && hpPct <= 25;
  const showLetterbox = hud.finisherActive || hud.spectatorActive;

  return (
    <div
      data-hub-bots={hud.hubBotCount}
      className="fixed inset-0 z-10 pointer-events-none"
    >
      {/* Low-HP Danger State: pulsing crimson peripheral vignette in battle */}
      {hud.zone !== 'hub' && isCriticalHp && !hud.matchFinishOverlay && (
        <div
          aria-label="Low Health Danger Warning"
          className="fixed inset-0 pointer-events-none animate-danger-pulse"
          style={{
            boxShadow: 'inset 0 0 115px rgba(220, 38, 38, 0.72)',
          }}
        />
      )}

      {/* Dramatic Slow-Mo Match Finish Overlay (Gold Flash Victory / Desaturated Defeat Stamp) */}
      {hud.matchFinishOverlay && (
        <div
          aria-label={hud.matchFinishOverlay === 'victory' ? 'Victory Finish' : 'Defeat Finish'}
          className="fixed inset-0 z-30 pointer-events-none flex items-center justify-center"
        >
          {hud.matchFinishOverlay === 'victory' ? (
            <>
              <div
                className="fixed inset-0 animate-gold-flash"
                style={{
                  background:
                    'radial-gradient(circle at 50% 48%, rgba(251,191,36,0.52) 0%, rgba(239,68,68,0.22) 48%, rgba(2,6,23,0.45) 100%)',
                }}
              />
              <div className="relative animate-stamp-slam text-center px-8 py-4 bg-[#0b101b]/92 border-2 border-amber-400 clip-angled shadow-2xl">
                <div className="text-[11px] font-display font-bold tracking-[0.35em] uppercase text-rose-400 mb-1">
                  RED FLAME KNOCKOUT
                </div>
                <div className="font-display font-bold text-5xl sm:text-7xl tracking-[0.16em] uppercase text-amber-300 hud-text-shadow leading-none">
                  VICTORY
                </div>
              </div>
            </>
          ) : (
            <>
              <div
                className="fixed inset-0 bg-slate-950/55"
                style={{
                  boxShadow: 'inset 0 0 140px rgba(153, 27, 27, 0.75)',
                }}
              />
              <div className="relative animate-stamp-slam text-center px-8 py-4 bg-[#0b101b]/94 border-2 border-rose-500 clip-angled shadow-2xl">
                <div className="text-[11px] font-display font-bold tracking-[0.35em] uppercase text-slate-400 mb-1">
                  MATCH CONCLUDED
                </div>
                <div className="font-display font-bold text-5xl sm:text-7xl tracking-[0.16em] uppercase text-rose-400 hud-text-shadow leading-none">
                  DEFEAT
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Best-of-3 Arena Round Banner (cleanly spaced below top combat bar, above fighters) */}
      {hud.roundBanner && !hud.matchFinishOverlay && (
        <div
          key={hud.roundBanner}
          aria-label="Round Announcement"
          className="fixed top-[120px] left-1/2 -translate-x-1/2 z-20 pointer-events-none"
        >
          <div className="animate-combo-pop clip-angled px-6 py-2 bg-[#0b101b]/94 border-2 border-rose-500/90 shadow-2xl text-center">
            <div className="font-display font-bold text-2xl sm:text-3xl tracking-[0.14em] uppercase text-white hud-text-shadow whitespace-nowrap">
              {hud.roundBanner}
            </div>
          </div>
        </div>
      )}

      {/* Golden Combo Milestone Screen-Flash Flare (20 / 50 / 100 Combo Hits) */}
      {hud.milestoneFlash && (
        <div
          key={hud.milestoneFlash.id}
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none transition-opacity duration-200"
          style={{
            background: `radial-gradient(circle at 50% 45%, ${hud.milestoneFlash.primaryHex}66 0%, ${hud.milestoneFlash.primaryHex}22 48%, transparent 78%)`,
            opacity: hud.milestoneFlash.opacity,
          }}
        />
      )}

      {/* Cinematic Letterbox Bars (Combo Finisher Slow-Mo OR Dojo Duel Spectator Mode) */}
      <div
        aria-hidden="true"
        className={`fixed inset-x-0 top-0 bg-slate-950/95 pointer-events-none transition-all duration-150 ${
          showLetterbox ? 'h-7 border-b border-amber-400/60' : 'h-0'
        }`}
      />
      <div
        aria-hidden="true"
        className={`fixed inset-x-0 bottom-0 bg-slate-950/95 pointer-events-none transition-all duration-150 ${
          showLetterbox ? 'h-7 border-t border-amber-400/60' : 'h-0'
        }`}
      />

      {hud.finisherActive && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 pointer-events-none text-center animate-combo-pop ${
            hud.zone === 'dojo' ? 'bottom-20' : 'bottom-10'
          }`}
        >
          <div className="clip-angled px-4 py-1 bg-amber-400 text-slate-950 font-display font-bold text-xs sm:text-sm tracking-[0.22em] uppercase shadow-xl">
            COMBO FINISHER · {hud.finisherName}
          </div>
        </div>
      )}

      {/* Emote Spotlight Active Banner */}
      {hud.emoteSpotlightName && !hud.finisherActive && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 pointer-events-none text-center animate-combo-pop">
          <div className="clip-angled-sm px-3.5 py-1 bg-amber-500/95 text-slate-950 font-display font-bold text-[11px] tracking-[0.2em] uppercase shadow-xl">
            ★ EMOTE SPOTLIGHT · {hud.emoteSpotlightName}
          </div>
        </div>
      )}

      {/* Cinematic Spectator Live Broadcast Bar */}
      {hud.zone === 'dojo' && hud.spectatorActive && (
        <div
          aria-label="Cinematic Spectator Controls"
          className="pointer-events-auto fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#0b101b]/95 border border-amber-400/80 clip-angled px-4 py-1.5 flex items-center gap-3 shadow-2xl"
        >
          <span className="w-2 h-2 bg-rose-500 animate-pulse inline-block" />
          <span className="font-display font-bold text-xs tracking-wider uppercase text-amber-300 whitespace-nowrap">
            CINEMATIC SPECTATOR · {hud.spectatorEventLabel}
          </span>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleSpectator();
            }}
            className="px-2.5 py-0.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-[11px] uppercase cursor-pointer whitespace-nowrap"
          >
            Exit [V]
          </button>
        </div>
      )}

      {/* TOP BAR: Live Match = ONE Unified Combat Bar + Quiet Corner Tag | Lobby/Dojo = Social Navigation Header */}
      {isLiveMatch ? (
        <>
          <div className="flex items-start justify-between gap-4 px-3.5 pt-3 sm:px-5 sm:pt-3.5">
            {/* Spacer balancing top-right Mute/Pause icons on wide viewports so the combat bar centers cleanly */}
            <div className="hidden lg:block w-20 shrink-0" aria-hidden="true" />

            {/* ONE UNIFIED TOP COMBAT PANEL (Player Left · VS & Round Center · Opponent Right) */}
            <section
              data-testid="battle-top-bar"
              aria-label="Battle Combat Header"
              className={`pointer-events-auto flex-1 max-w-[920px] mx-auto bg-[#0b101b]/92 border clip-bevel px-3.5 py-2 shadow-xl grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4 ${
                isCriticalHp ? 'border-rose-500/85' : 'border-slate-700/85'
              }`}
            >
              {/* LEFT SIDE: Player Name, Class, HP Bar, STAM & ULT (single compact bar) */}
              <div aria-label="Fighter Vitality" className="min-w-0">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <div className="flex items-baseline gap-1.5 min-w-0">
                    <span className="font-display font-bold text-xs sm:text-sm tracking-wide text-white truncate">
                      {hero.name}
                    </span>
                    <span className="text-[10px] text-amber-400 font-display font-bold uppercase whitespace-nowrap shrink-0">
                      {cls.name}
                    </span>
                    {hud.parryCounterReady && (
                      <span className="text-[10px] text-amber-300 font-display font-bold uppercase whitespace-nowrap shrink-0">
                        · 1.45× COUNTER
                      </span>
                    )}
                    {!hud.parryCounterReady && isCriticalHp && (
                      <span className="text-[10px] text-rose-400 font-display font-bold uppercase whitespace-nowrap shrink-0 animate-pulse">
                        · DANGER
                      </span>
                    )}
                  </div>
                  <span
                    className={`font-mono-num text-[11px] sm:text-xs font-bold whitespace-nowrap shrink-0 ${
                      isCriticalHp ? 'text-rose-400' : 'text-slate-100'
                    }`}
                  >
                    {hud.hp}/{hud.maxHp}
                  </span>
                </div>

                {/* Compact Player HP Bar */}
                <div className="relative h-2.5 bg-slate-900 overflow-hidden mb-1">
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

                {/* Compact Inline STAM & ULT Strip */}
                <div className="grid grid-cols-2 gap-2.5 items-center">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[9px] font-mono-num text-slate-400 shrink-0">STAM</span>
                    <div className="flex-1 h-1.5 bg-slate-900 overflow-hidden">
                      <div
                        className="h-full bg-sky-400 transition-all duration-75"
                        style={{ width: `${stamPct}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono-num text-slate-300 shrink-0">
                      {hud.stamina}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[9px] font-mono-num text-amber-300 shrink-0">ULT</span>
                    <div className="flex-1 h-1.5 bg-slate-900 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-100 ${
                          ultPct >= 100 ? 'bg-amber-400' : 'bg-amber-600'
                        }`}
                        style={{ width: `${ultPct}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono-num text-amber-200 shrink-0">
                      {ultPct}%
                    </span>
                  </div>
                </div>
              </div>

              {/* CENTER: Compact VS Banner + Round Indicator (no redundant YOU/RIVAL labels) */}
              <div
                aria-label="Match Round Status"
                className="flex flex-col items-center justify-center px-2.5 sm:px-3.5 border-x border-slate-800/90 shrink-0 text-center"
              >
                <span className="clip-angled-sm px-2 py-0.5 bg-rose-600 text-amber-200 font-display font-bold text-xs tracking-[0.2em] uppercase leading-none">
                  {hud.zone === 'royale'
                    ? `${hud.royaleAlive}/${hud.royaleTotal}`
                    : hud.zone === 'clan_siege' && hud.clanSiege
                      ? hud.clanSiege.format
                      : 'VS'}
                </span>

                {hud.zone === 'arena' && hud.arenaRounds && (
                  <div className="mt-1 flex flex-col items-center gap-1">
                    <span className="font-mono-num text-[10px] font-bold text-amber-300 tracking-wider whitespace-nowrap leading-none">
                      ROUND {hud.arenaRounds.roundNumber}/{hud.arenaRounds.maxRounds}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: hud.arenaRounds.roundsToWin }).map((_, idx) => (
                          <span
                            key={`p-pip-${idx}`}
                            className={`w-2 h-2 rotate-45 border ${
                              idx < hud.arenaRounds!.playerRounds
                                ? 'bg-emerald-400 border-emerald-200'
                                : 'bg-slate-900 border-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: hud.arenaRounds.roundsToWin }).map((_, idx) => (
                          <span
                            key={`o-pip-${idx}`}
                            className={`w-2 h-2 rotate-45 border ${
                              idx < hud.arenaRounds!.opponentRounds
                                ? 'bg-rose-500 border-rose-300'
                                : 'bg-slate-900 border-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {hud.zone === 'campaign' && (
                  <span className="mt-1 font-mono-num text-[10px] font-bold text-rose-300 tracking-wider whitespace-nowrap">
                    TRIAL {hud.activeBossIndex + 1}/{CAMPAIGN_BOSSES.length}
                  </span>
                )}

                {hud.zone === 'royale' && (
                  <span className="mt-1 font-mono-num text-[10px] font-bold text-cyan-300 tracking-wider whitespace-nowrap">
                    RING {hud.royaleRingRadius}m
                  </span>
                )}

                {hud.zone === 'clan_siege' && hud.clanSiege && (
                  <span className="mt-1 font-mono-num text-[10px] font-bold text-amber-300 tracking-wider whitespace-nowrap">
                    {hud.clanSiege.allyAlive} – {hud.clanSiege.enemyAlive}
                  </span>
                )}
              </div>

              {/* RIGHT SIDE: Enemy Name & HP Bar (exact same compact height as Player side) */}
              <div aria-label="Opponent Vitality" className="min-w-0">
                {hud.opponent ? (
                  <>
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="font-mono-num text-[11px] sm:text-xs font-bold text-rose-200 whitespace-nowrap shrink-0">
                        {hud.opponent.hp}/{hud.opponent.maxHp}
                      </span>
                      <div className="flex items-baseline gap-1.5 min-w-0 justify-end">
                        <span className="text-[10px] text-rose-300 truncate hidden sm:inline">
                          {hud.opponent.title}
                        </span>
                        <span className="font-display font-bold text-xs sm:text-sm tracking-wide text-white truncate">
                          {hud.opponent.name}
                        </span>
                      </div>
                    </div>

                    {/* Symmetrical Opponent HP Bar */}
                    <div className="relative h-2.5 bg-slate-900 overflow-hidden mb-1">
                      <div
                        className="absolute inset-y-0 right-0 bg-amber-300/75 transition-all duration-150"
                        style={{
                          width: `${Math.min(100, (hud.opponent.ghostHp / Math.max(1, hud.opponent.maxHp)) * 100)}%`,
                        }}
                      />
                      <div
                        className="absolute inset-y-0 right-0 bg-rose-500 transition-all duration-75"
                        style={{
                          width: `${Math.min(100, (hud.opponent.hp / Math.max(1, hud.opponent.maxHp)) * 100)}%`,
                        }}
                      />
                    </div>

                    {/* Single-Line Tactical State matching Player STAM/ULT row height */}
                    <div className="text-right text-[10px] leading-tight truncate">
                      {hud.opponent.telegraphing ? (
                        <span className="font-display font-bold text-amber-300 uppercase tracking-wider">
                          INCOMING STRIKE — PARRY [L]!
                        </span>
                      ) : hud.opponent.staggered ? (
                        <span className="font-display font-bold text-emerald-300 uppercase tracking-wider">
                          STUNNED — LAUNCH COMBO [J-J-K]!
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          {hud.opponent.lessonHint ?? 'Chain Light [J] & Heavy [K]'}
                        </span>
                      )}
                    </div>
                  </>
                ) : hud.zone === 'royale' ? (
                  <>
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="font-mono-num text-[11px] font-bold text-cyan-300 whitespace-nowrap">
                        {hud.royaleAlive}/{hud.royaleTotal} ALIVE
                      </span>
                      <span className="font-display font-bold text-xs sm:text-sm tracking-wide text-white truncate">
                        LAST HERO STANDING
                      </span>
                    </div>
                    <div className="relative h-2.5 bg-slate-900 overflow-hidden mb-1">
                      <div
                        className="absolute inset-y-0 right-0 bg-cyan-400 transition-all duration-150"
                        style={{
                          width: `${Math.min(100, (hud.royaleAlive / Math.max(1, hud.royaleTotal)) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-right text-[10px] leading-tight text-slate-400 truncate">
                      Stay inside the shrinking {hud.royaleRingRadius}m ring
                    </div>
                  </>
                ) : hud.zone === 'clan_siege' && hud.clanSiege ? (
                  <>
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="font-mono-num text-[11px] font-bold text-rose-300 whitespace-nowrap">
                        {hud.clanSiege.enemyAlive}/{hud.clanSiege.enemyTotal}
                      </span>
                      <span className="font-display font-bold text-xs sm:text-sm tracking-wide text-white truncate">
                        [{hud.clanSiege.rivalClanTag}] {hud.clanSiege.rivalClanName}
                      </span>
                    </div>
                    <div className="relative h-2.5 bg-slate-900 overflow-hidden mb-1">
                      <div
                        className="absolute inset-y-0 right-0 bg-rose-500 transition-all duration-150"
                        style={{
                          width: `${Math.min(100, (hud.clanSiege.enemyAlive / Math.max(1, hud.clanSiege.enemyTotal)) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-right text-[10px] leading-tight text-slate-400 truncate">
                      [{hud.clanSiege.allyClanTag}] {hud.clanSiege.allyAlive}/{hud.clanSiege.allyTotal} Allies Active
                    </div>
                  </>
                ) : null}
              </div>
            </section>

            {/* TOP-RIGHT LIVE MATCH: Minimal Mute & Pause icons only (non-combat buttons hidden!) */}
            <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleMute();
                }}
                aria-label={hud.muted ? 'Unmute Audio' : 'Mute Audio'}
                title="Mute / Unmute [M]"
                className="w-9 h-9 bg-[#0b101b]/88 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
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
                className="w-9 h-9 bg-[#0b101b]/88 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <rect x="6" y="5" width="4" height="14" />
                  <rect x="14" y="5" width="4" height="14" />
                </svg>
              </button>
            </div>
          </div>

          {/* Quiet single-line corner flavor tag (Arena & Music — never a full-width bar) */}
          <div
            data-testid="arena-flavor-tag"
            className="pointer-events-none fixed top-[92px] left-4 flex items-center gap-1.5 text-[11px] font-display tracking-wide text-slate-100/90 [text-shadow:0_1px_4px_rgba(0,0,0,0.98),0_0_10px_rgba(0,0,0,0.8)]"
          >
            {hud.zone === 'arena' && (
              <>
                <span className="font-semibold text-white">
                  {ARENA_BIOMES[hud.arenaRank.selectedBiome].shortLabel}
                </span>
                <span aria-hidden="true" className="text-white/55">·</span>
                <span className="text-slate-200/85">♫ {activeBiomeMusic.title}</span>
              </>
            )}
            {hud.zone === 'campaign' && (
              <>
                <span className="font-semibold text-white">Hollow Citadel</span>
                <span aria-hidden="true" className="text-white/55">·</span>
                <span className="text-slate-200/85">Boss Trial {hud.activeBossIndex + 1}</span>
              </>
            )}
            {hud.zone === 'royale' && (
              <>
                <span className="font-semibold text-white">Phantom Rooftop</span>
                <span aria-hidden="true" className="text-white/55">·</span>
                <span className="text-slate-200/85">Last Hero Standing</span>
              </>
            )}
            {hud.zone === 'clan_siege' && hud.clanSiege && (
              <>
                <span className="font-semibold text-white">{hud.clanSiege.venueName}</span>
                <span aria-hidden="true" className="text-white/55">·</span>
                <span className="text-slate-200/85">{DOJO_WEATHER_SPECS[hud.clanSiege.weather].shortLabel}</span>
              </>
            )}
          </div>
        </>
      ) : (
        /* LOBBY (NEXUS CITY) & DOJO SANDBOX TOP HEADER */
        <div className="flex items-start justify-between gap-3 p-3 sm:p-4">
          {/* TOP-LEFT: Nexus City Citizen Profile (Hub) OR Dojo Training Vitality (Dojo) */}
          {hud.zone === 'hub' ? (
            <div
              aria-label="Nexus Citizen Profile"
              className="pointer-events-auto bg-[#0b101b]/88 border border-slate-700/80 clip-bevel px-3.5 py-2.5 w-60 sm:w-72 shadow-lg"
            >
              <div className="flex items-center gap-2.5">
                <RankEmblemIcon rank={hud.arenaRank.rank} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display font-bold text-sm tracking-wide text-white truncate">
                      {hero.name}
                    </span>
                    <span className="text-[10px] text-amber-400 font-display font-bold uppercase whitespace-nowrap">
                      {cls.name}
                    </span>
                  </div>
                  <div
                    className="text-[11px] font-display font-bold uppercase tracking-wide truncate"
                    style={{ color: hud.arenaRank.accentHex }}
                  >
                    #{hud.arenaRank.rank} {hud.arenaRank.rankName} · T{hud.arenaRank.tier}
                  </div>
                </div>
              </div>

              <div className="mt-2 pt-1.5 border-t border-slate-800/90 flex items-center justify-between text-[11px] text-slate-300 font-mono-num">
                <span>
                  LVL {hud.level}/{MAX_HERO_LEVEL}
                </span>
                <span className="text-[10px] text-emerald-300">
                  {hud.xp}/{hud.xpToNext} XP
                </span>
                <span className="text-amber-300 font-bold">{hud.coins}c</span>
              </div>
              <div
                aria-label="Hero XP Progress"
                className="mt-1 h-1 bg-slate-900 overflow-hidden"
              >
                <div
                  className="h-full bg-emerald-400 transition-all duration-150"
                  style={{ width: `${xpPct}%` }}
                />
              </div>
            </div>
          ) : (
            <div
              aria-label="Fighter Vitality"
              className="pointer-events-auto bg-[#0b101b]/90 border border-slate-700/80 clip-bevel px-3.5 py-2 w-60 sm:w-68 shadow-lg"
            >
              <div className="flex items-baseline justify-between mb-1">
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
              <div className="relative h-2.5 bg-slate-900 overflow-hidden mb-1">
                <div
                  className="absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-75"
                  style={{ width: `${hpPct}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 items-center text-[10px] font-mono-num">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">STAM</span>
                  <div className="flex-1 h-1.5 bg-slate-900 overflow-hidden">
                    <div className="h-full bg-sky-400" style={{ width: `${stamPct}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-300">ULT</span>
                  <div className="flex-1 h-1.5 bg-slate-900 overflow-hidden">
                    <div className="h-full bg-amber-400" style={{ width: `${ultPct}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TOP-CENTER: Lobby & Sandbox World Zone Switcher (NEVER shown during live battle!) */}
          <div className="flex flex-col items-center gap-2 max-w-[54vw]">
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
                      if (tab.id === 'clan_siege') {
                        onOpenClanSiege();
                      } else {
                        onSwitchZone(tab.id);
                      }
                    }}
                    className={`px-2.5 py-1 text-xs font-display font-bold tracking-wide uppercase whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      active
                        ? tab.id === 'clan_siege'
                          ? 'bg-rose-500 text-white'
                          : 'bg-amber-500 text-slate-950'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* TOP-RIGHT: Lobby & Sandbox Controls (Stage & Ranks lives in Hub Lobby ONLY!) */}
          <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
            {hud.zone === 'hub' && (
              <button
                type="button"
                tabIndex={-1}
                aria-expanded={arenaDrawerOpen}
                aria-label="Toggle 1v1 Arena Stage, Music and Ranks"
                title="Arena Biomes, Music & 50-Rank Ladder"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setArenaDrawerOpen((v) => !v);
                  setShowEmotes(false);
                }}
                className={`h-10 px-2.5 border font-display font-bold text-xs tracking-wide uppercase flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
                  arenaDrawerOpen
                    ? 'bg-amber-400 text-slate-950 border-amber-200'
                    : 'bg-[#0b101b]/90 hover:bg-slate-800 border-amber-400/65 text-amber-200'
                }`}
              >
                <RankEmblemIcon rank={hud.arenaRank.rank} size={20} />
                <span className="hidden sm:inline">Stage &amp; Ranks</span>
                <span className="sm:hidden">Ranks</span>
              </button>
            )}

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenTradingPost();
              }}
              aria-label="Open Dojo Trading Post and Store"
              title="Trading Post & Store [T]"
              className="h-10 px-3 bg-[#0b101b]/90 hover:bg-slate-800 border border-emerald-400/65 text-emerald-200 font-display font-bold text-xs tracking-wide uppercase flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span className="hidden sm:inline">Trade &amp; Store [T]</span>
              <span className="sm:hidden">Shop</span>
            </button>

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
      )}

      {/* Lobby-Only 1v1 Arena Stage, Biome Music & 50-Rank Ladder Drawer */}
      {hud.zone === 'hub' && arenaDrawerOpen && (() => {
        const activeEmblem = getRankEmblemSpec(hud.arenaRank.rank);
        const winPct = Math.max(
          0,
          Math.min(
            100,
            Math.round((hud.arenaRank.winsInRank / Math.max(1, hud.arenaRank.winsRequired)) * 100)
          )
        );
        return (
          <section
            aria-label="1v1 Arena Stage, Music and Rank Drawer"
            className="pointer-events-auto fixed top-16 right-4 w-[360px] sm:w-[430px] max-w-[calc(100vw-2rem)] max-h-[78vh] overflow-y-auto bg-[#0b101b]/95 border border-slate-700 clip-bevel p-4 shadow-2xl space-y-3"
          >
            {/* Header & Current Rank Progress */}
            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <RankEmblemIcon rank={hud.arenaRank.rank} size={38} />
                <div className="min-w-0">
                  <div
                    className="font-display font-bold text-sm uppercase tracking-wider truncate"
                    style={{ color: activeEmblem.primaryHex }}
                  >
                    RANK #{hud.arenaRank.rank} · {hud.arenaRank.rankName}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Tier {hud.arenaRank.tier}: {hud.arenaRank.tierName}
                  </div>
                </div>
              </div>
              <button
                type="button"
                tabIndex={-1}
                aria-label="Close Arena Stage Drawer"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setArenaDrawerOpen(false);
                }}
                className="w-7 h-7 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Rank Promotion Progress & Next Rank Emote */}
            <div className="bg-slate-950/85 border border-slate-800 p-2.5 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono-num">
                <span className="text-slate-300 uppercase font-display font-bold">
                  Wins to Next Rank
                </span>
                <span className="text-amber-300 font-bold">
                  {hud.arenaRank.winsInRank}/{hud.arenaRank.winsRequired} Wins
                </span>
              </div>
              <div className="h-2 bg-slate-900 overflow-hidden border border-slate-800">
                <div
                  className="h-full transition-all duration-200"
                  style={{
                    width: `${hud.arenaRank.rank >= 50 ? 100 : winPct}%`,
                    backgroundColor: activeEmblem.primaryHex,
                  }}
                />
              </div>
              <div className="flex items-center justify-between gap-2 pt-1 text-[10px]">
                <span className="text-slate-400 truncate">
                  {nextRankEmote
                    ? `Next Emote: ${nextRankEmote.name} (Rank #${nextRankEmote.requiredRank})`
                    : 'All 5 Tier Rank Emotes Unlocked!'}
                </span>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setArenaDrawerOpen(false);
                    onOpenRankRewards();
                  }}
                  className="px-2 py-0.5 bg-sky-500/20 hover:bg-sky-400 hover:text-slate-950 border border-sky-400/60 text-sky-200 font-display font-bold uppercase cursor-pointer shrink-0 transition-colors"
                >
                  Rank Rewards
                </button>
              </div>
            </div>

            {/* 5 Arena Biomes & Dynamic Biome Music Switcher */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-display font-bold uppercase tracking-wider text-slate-300">
                  Arena Biome &amp; Dynamic Theme
                </span>
                <span className="text-[10px] font-mono-num text-sky-300">
                  ♫ {activeBiomeMusic.title}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {ARENA_BIOME_ORDER.map((biomeId) => {
                  const b = ARENA_BIOMES[biomeId];
                  const m = getBiomeMusicSpec(biomeId);
                  const active = hud.arenaRank.selectedBiome === biomeId;
                  return (
                    <button
                      key={biomeId}
                      type="button"
                      tabIndex={-1}
                      aria-pressed={active}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onSelectArenaBiome(biomeId);
                      }}
                      className={`px-2.5 py-2 text-left border cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                        active
                          ? 'bg-amber-400/15 border-amber-400 text-white'
                          : 'bg-slate-900/85 border-slate-800 text-slate-200 hover:border-slate-600'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            aria-hidden="true"
                            className="w-2 h-2 inline-block shrink-0"
                            style={{ backgroundColor: b.accentHex }}
                          />
                          <span className="font-display font-bold text-xs uppercase tracking-wide truncate">
                            {b.name}
                          </span>
                        </div>
                        <div className="text-[10px] text-sky-300 truncate mt-0.5">
                          ♫ {m.title} · {m.instrumentTag}
                        </div>
                      </div>
                      {active && (
                        <span className="px-1.5 py-0.5 bg-amber-400 text-slate-950 font-display font-bold text-[9px] uppercase shrink-0">
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-1.5 text-[10px] text-slate-400">
                FX: <span className="text-sky-300">{activeBiomeFx.label}</span> · {hud.arenaRank.biomeHazardNote}
              </div>
            </div>

            {/* Expandable Full 50-Rank & Emblems Ladder */}
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  setRankLadderOpen((v) => !v);
                }}
                className="w-full py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-amber-400/50 text-amber-200 font-display font-bold text-xs uppercase tracking-wider cursor-pointer flex items-center justify-between"
              >
                <span>50-Rank Ladder &amp; Tier Emblems</span>
                <span>{rankLadderOpen ? 'Hide ▲' : 'View All 50 ▼'}</span>
              </button>

              {rankLadderOpen && (
                <div
                  aria-label="50-Rank Arena Ladder"
                  className="mt-2 space-y-2 text-left"
                >
                  <div className="bg-slate-950/90 border border-slate-800 p-2">
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {[
                        { rank: 1, label: 'T1' },
                        { rank: 11, label: 'T2' },
                        { rank: 21, label: 'T3' },
                        { rank: 31, label: 'T4' },
                        { rank: 41, label: 'T5' },
                        { rank: 49, label: 'Apex' },
                        { rank: 50, label: 'Omni' },
                      ].map((item) => {
                        const em = getRankEmblemSpec(item.rank);
                        return (
                          <div
                            key={item.rank}
                            className="flex flex-col items-center justify-center p-1 bg-slate-900/70 border border-slate-800"
                          >
                            <RankEmblemIcon rank={item.rank} size={22} />
                            <span
                              className="text-[9px] font-display font-bold uppercase mt-0.5"
                              style={{ color: em.primaryHex }}
                            >
                              {item.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {ARENA_TIERS.map((tier) => (
                    <div key={tier.tier} className="bg-slate-950/85 border border-slate-800 p-2">
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <RankEmblemIcon rank={tier.minRank} size={16} />
                          <span
                            className="font-display font-bold text-[11px] uppercase tracking-wider truncate"
                            style={{ color: tier.accentHex }}
                          >
                            T{tier.tier}: {tier.name} ({tier.minRank}–{tier.maxRank})
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {ARENA_RANKS.filter((r) => r.tier === tier.tier).map((r) => {
                          const isCurrent = r.rank === hud.arenaRank.rank;
                          const achieved = r.rank < hud.arenaRank.rank;
                          const isLandmark = LANDMARK_RANK_NUMBERS.includes(r.rank);
                          return (
                            <span
                              key={r.rank}
                              className={`px-1.5 py-0.5 text-[10px] font-mono-num inline-flex items-center gap-1 ${
                                isCurrent
                                  ? 'bg-amber-400 text-slate-950 font-bold'
                                  : achieved
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : isLandmark
                                      ? 'bg-slate-900 text-amber-200 border border-amber-500/40'
                                      : 'bg-slate-900 text-slate-300 border border-slate-800'
                              }`}
                            >
                              {isLandmark && <RankEmblemIcon rank={r.rank} size={12} />}
                              <span>
                                {r.rank}. {r.name}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      })()}

      {/* Emote Quick Bar (Lobby & Dojo Only — hidden during live battle) */}
      {!isLiveMatch && showEmotes && (
        <div className="pointer-events-auto fixed top-16 right-4 bg-[#0b101b]/95 border border-slate-700 p-2 flex flex-wrap items-center justify-end gap-1.5 max-w-md shadow-xl">
          {availableEmotes.map((em) => (
            <button
              key={em.id}
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onEmote(em.id);
                setShowEmotes(false);
              }}
              className={`px-2.5 py-1.5 text-xs font-display font-bold uppercase transition-colors cursor-pointer whitespace-nowrap ${
                em.rankOnly
                  ? 'bg-sky-500/20 border border-sky-400/75 text-sky-200 hover:bg-sky-400 hover:text-slate-950'
                  : em.storeOnly
                    ? 'bg-amber-500/20 border border-amber-400/70 text-amber-200 hover:bg-amber-400 hover:text-slate-950'
                    : 'bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-100'
              }`}
            >
              {em.rankOnly ? `★ ${em.label} [${em.key}]` : `${em.label} [${em.key}]`}
            </button>
          ))}
        </div>
      )}

      {/* MID-LEFT: Training Sandbox Combat Log & Archive (Hidden during Live Matches & Hub Lobby; shown post-match in Results) */}
      {hud.zone === 'dojo' && (
      <aside
        aria-label="Combat Log and Archive"
        className="pointer-events-auto fixed left-3 sm:left-4 top-[132px] w-60 sm:w-72 bg-[#0b101b]/88 border border-slate-700/80 clip-bevel shadow-lg overflow-hidden"
      >
        <div className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-[#080d17]/95 border-b border-slate-800">
          <div className="flex items-center gap-1 min-w-0">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                setLogTab('live');
                setLogCollapsed(false);
              }}
              className={`px-1.5 py-0.5 font-display font-bold text-[10px] tracking-wider uppercase cursor-pointer ${
                logTab === 'live'
                  ? 'bg-sky-400 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Log {hud.combatLog.length}/{MAX_COMBAT_LOG_ENTRIES}
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                setLogTab('archive');
                setLogCollapsed(false);
              }}
              className={`px-1.5 py-0.5 font-display font-bold text-[10px] tracking-wider uppercase cursor-pointer ${
                logTab === 'archive'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Archive {hud.combatArchive.length}/{MAX_COMBAT_ARCHIVE_ENTRIES}
            </button>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {peakLogDamage > 0 && (
              <span className="font-mono-num text-[10px] font-bold text-amber-300">
                PEAK {peakLogDamage}
              </span>
            )}
            <button
              type="button"
              tabIndex={-1}
              aria-expanded={!logCollapsed}
              aria-label={logCollapsed ? 'Expand Combat Log' : 'Collapse Combat Log'}
              onClick={(e) => {
                e.currentTarget.blur();
                setLogCollapsed((v) => !v);
              }}
              className="w-5 h-5 flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-mono-num text-xs leading-none cursor-pointer"
            >
              {logCollapsed ? '+' : '−'}
            </button>
          </div>
        </div>

        {!logCollapsed && (
          <div className="max-h-48 sm:max-h-56 overflow-y-auto px-2.5 py-2">
            {activeLogEntries.length === 0 ? (
              <p className="text-[11px] text-slate-400 leading-snug py-1">
                {logTab === 'live'
                  ? 'Land 2+ hit strings or Finishers (J-J-K, J-K-K) to compare sequence damage.'
                  : 'No Finishers archived yet. Execute J-J-K, J-K-K, or K-J-K to persist your top 10 Finishers.'}
              </p>
            ) : (
              <ol
                aria-label={logTab === 'live' ? 'Recent Combo Sequences' : 'Combat Archive Finishers'}
                className="space-y-1.5"
              >
                {activeLogEntries.map((entry) => {
                  const isTop =
                    activeLogEntries.length >= 2 &&
                    peakLogDamage > 0 &&
                    entry.totalDamage === peakLogDamage;
                  const relPct = Math.max(
                    12,
                    Math.round((entry.totalDamage / Math.max(1, peakLogDamage)) * 100)
                  );
                  return (
                    <li
                      key={`${logTab}-${entry.id}`}
                      className={`border px-2 py-1.5 ${
                        entry.isFinisher
                          ? 'bg-amber-500/10 border-amber-400/45'
                          : 'bg-slate-900/75 border-slate-800'
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-display font-bold text-[11px] uppercase tracking-wide text-white truncate">
                            {entry.moveName}
                          </span>
                          {entry.isFinisher && (
                            <span className="px-1 py-0.5 bg-amber-400 text-slate-950 font-display font-bold text-[9px] leading-none uppercase shrink-0">
                              FIN
                            </span>
                          )}
                          {isTop && (
                            <span className="px-1 py-0.5 bg-emerald-400 text-slate-950 font-display font-bold text-[9px] leading-none uppercase shrink-0">
                              TOP
                            </span>
                          )}
                        </div>
                        <span
                          className={`font-mono-num text-xs font-bold whitespace-nowrap shrink-0 ${
                            isTop
                              ? 'text-emerald-300'
                              : entry.isFinisher
                                ? 'text-amber-300'
                                : 'text-slate-100'
                          }`}
                        >
                          {entry.totalDamage} DMG
                        </span>
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-0.5 flex-wrap">
                          {entry.tokens.map((tok, i) => (
                            <span
                              key={`${entry.id}-${tok}-${i}`}
                              className={`px-1 py-0.5 text-[9px] font-mono-num font-bold leading-none ${
                                tok === 'H'
                                  ? 'bg-rose-500/90 text-white'
                                  : tok === 'ULT'
                                    ? 'bg-yellow-300 text-slate-950'
                                    : tok === 'S'
                                      ? 'bg-sky-400 text-slate-950'
                                      : 'bg-amber-400/90 text-slate-950'
                              }`}
                            >
                              {tok}
                            </span>
                          ))}
                        </div>
                        <span className="text-[10px] font-mono-num text-slate-400 truncate">
                          {entry.hits}H · {entry.targetName}
                        </span>
                      </div>

                      {/* Relative damage effectiveness bar */}
                      <div className="mt-1.5 h-1 bg-slate-950/90 overflow-hidden">
                        <div
                          className={`h-full ${
                            isTop
                              ? 'bg-emerald-400'
                              : entry.isFinisher
                                ? 'bg-amber-400'
                                : 'bg-sky-400/80'
                          }`}
                          style={{ width: `${relPct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}
      </aside>
      )}

      {/* 3D-Projected Floating Hit Numbers & Impact Tags (z-30 ABOVE HUD, clamped clear of top panel) */}
      {hud.damagePopups.map((pop) => {
        const progress = Math.min(1, pop.age / pop.maxAge);
        const risePx = progress * 44;
        const opacity = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;
        const clampedTopPct = Math.max(15, Math.min(82, pop.screenY));
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
            className="fixed z-30 pointer-events-none font-display font-bold font-mono-num hud-text-shadow text-center"
            style={{
              left: `${pop.screenX}%`,
              top: `${clampedTopPct}%`,
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
            className={`fixed z-30 right-4 top-28 sm:right-6 w-52 sm:w-58 bg-[#0b101b]/92 border ${pal.border} clip-bevel shadow-xl overflow-hidden pointer-events-none`}
          >
            <div className="px-3.5 py-2.5">
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
                    className={`font-display font-bold font-mono-num leading-none hud-text-shadow ${
                      hud.comboCount >= 8
                        ? 'text-5xl'
                        : hud.comboCount >= 4
                          ? 'text-4xl'
                          : 'text-3xl'
                    } ${pal.countText}`}
                  >
                    {hud.comboCount}x
                  </div>
                  <div className="text-[10px] font-display font-bold tracking-widest uppercase text-amber-200">
                    {hud.comboCount >= 2 ? `${hud.comboCount} HIT COMBO!` : 'HIT'}
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

      {/* UPPER-CENTER: Action Callouts (z-20, cleanly spaced below unified top bar) */}
      {hud.callout && !arenaDrawerOpen && !hud.roundBanner && !hud.matchFinishOverlay && (
        <div
          key={hud.callout.id}
          className={`fixed z-20 left-1/2 -translate-x-1/2 text-center animate-combo-pop pointer-events-none ${
            isLiveMatch ? 'top-[120px]' : 'top-28'
          }`}
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

      {/* BOTTOM-CENTER: Contextual Portal Prompt (yields to Hub Challenge Prompt when standing beside a fighter) */}
      {hud.portalPrompt && !hud.nearbyHubFighter && (
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
              {guestAudioSpec ? ` · ♫ ${guestAudioSpec.shortLabel}` : ''}
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
                onSiegeVisitingDojo();
              }}
              className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-white text-xs font-display font-bold uppercase tracking-wider cursor-pointer whitespace-nowrap"
            >
              Siege 2v2
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

      {hud.zone === 'dojo' && !hud.visitingDojo && !hud.spectatorActive && (
        <div
          aria-label="Dojo Builder Dock"
          className="pointer-events-auto fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#0b101b]/94 border border-emerald-500/55 px-3 py-2 flex flex-col items-center gap-2 max-w-[92vw] shadow-xl"
        >
          {/* Dojo Weather Selector Tray (Purchase with Coins or Earn via Wins/Builds) */}
          {weatherTrayOpen && (
            <div
              aria-label="Dojo Weather Selector"
              className="w-full pb-2 border-b border-slate-800 flex flex-col items-center gap-1.5"
            >
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <span className="font-display font-bold text-[10px] uppercase tracking-wider text-slate-400 mr-1">
                  Weather:
                </span>
                {DOJO_WEATHER_ORDER.map((weatherId) => {
                  const spec = DOJO_WEATHER_SPECS[weatherId];
                  const unlocked = hud.unlockedDojoWeathers.includes(weatherId);
                  const active = hud.dojoWeather === weatherId;
                  const canAfford = hud.coins >= spec.costCoins;
                  return (
                    <button
                      key={weatherId}
                      type="button"
                      tabIndex={-1}
                      aria-pressed={active}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onSelectDojoWeather(weatherId);
                      }}
                      title={
                        unlocked
                          ? `${spec.name} — ${spec.tagline}`
                          : `Unlock ${spec.name} for ${spec.costCoins} Coins (${spec.earnRuleLabel})`
                      }
                      className={`px-2.5 py-1 text-[11px] font-display font-bold uppercase whitespace-nowrap cursor-pointer border transition-colors flex items-center gap-1.5 ${
                        active
                          ? 'bg-sky-400 text-slate-950 border-sky-200'
                          : unlocked
                            ? 'bg-slate-900 text-slate-100 border-slate-700 hover:border-sky-400'
                            : canAfford
                              ? 'bg-amber-500/15 text-amber-200 border-amber-400/60 hover:bg-amber-500 hover:text-slate-950'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="w-2 h-2 inline-block shrink-0"
                        style={{ backgroundColor: spec.accentHex }}
                      />
                      <span>{spec.name}</span>
                      {!unlocked && (
                        <span className="font-mono-num text-[10px] opacity-90">
                          {spec.costCoins}c
                        </span>
                      )}
                    </button>
                  );
                })}
                <button
                  type="button"
                  tabIndex={-1}
                  aria-pressed={hud.dojoWeatherCycle}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onToggleWeatherCycle();
                  }}
                  className={`px-2.5 py-1 text-[11px] font-display font-bold uppercase whitespace-nowrap cursor-pointer border transition-colors ${
                    hud.dojoWeatherCycle
                      ? 'bg-emerald-400 text-slate-950 border-emerald-200'
                      : 'bg-slate-900 text-emerald-300 border-emerald-500/50 hover:bg-slate-800'
                  }`}
                >
                  Auto Cycle: {hud.dojoWeatherCycle ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="text-[11px] text-slate-300 text-center max-w-xl leading-tight">
                {activeWeatherSpec.name}: {activeWeatherSpec.tagline.replace(/\.$/, '')} · Toggle Auto Cycle for live dynamic transitions
              </div>
            </div>
          )}

          {/* Dojo Audio Track Selector Tray (plays when guests visit your Dojo plot) */}
          {audioTrayOpen && (
            <div
              aria-label="Dojo Audio Selector"
              className="w-full pb-2 border-b border-slate-800 flex flex-col items-center gap-1.5"
            >
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <span className="font-display font-bold text-[10px] uppercase tracking-wider text-slate-400 mr-1">
                  Dojo Audio:
                </span>
                {DOJO_AUDIO_ORDER.map((trackId) => {
                  const spec = DOJO_AUDIO_SPECS[trackId];
                  const active = hud.dojoAudioTrack === trackId;
                  return (
                    <button
                      key={trackId}
                      type="button"
                      tabIndex={-1}
                      aria-pressed={active}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onSelectDojoAudio(trackId);
                      }}
                      title={`${spec.name} (${spec.genreTag}) — ${spec.description}`}
                      className={`px-2.5 py-1 text-[11px] font-display font-bold uppercase whitespace-nowrap cursor-pointer border transition-colors flex items-center gap-1.5 ${
                        active
                          ? 'bg-emerald-400 text-slate-950 border-emerald-200'
                          : 'bg-slate-900 text-slate-100 border-slate-700 hover:border-emerald-400'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="w-2 h-2 inline-block shrink-0"
                        style={{ backgroundColor: spec.accentHex }}
                      />
                      <span>{spec.name}</span>
                      <span className="text-[9px] opacity-80">{spec.genreTag}</span>
                    </button>
                  );
                })}
              </div>
              <div className="text-[11px] text-slate-300 text-center max-w-xl leading-tight">
                ♫ {activeAudioSpec.name} ({activeAudioSpec.genreTag}): {activeAudioSpec.description}
              </div>
            </div>
          )}

          {/* Campaign AI Training Dummy Variant Selector (shown when placing Training Dummies) */}
          {hud.dojoMode === 'build' && hud.selectedDojoBlock === 'dummy' && (
            <div className="w-full pb-2 border-b border-slate-800 flex flex-col items-center gap-1.5">
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <span className="font-display font-bold text-[10px] uppercase tracking-wider text-slate-400 mr-1">
                  Dummy AI:
                </span>
                {TRAINING_DUMMY_ORDER.map((variantId) => {
                  const spec = TRAINING_DUMMY_VARIANTS[variantId];
                  const active = hud.selectedDummyVariant === variantId;
                  const activeStyle =
                    variantId === 'kaito_duelist'
                      ? 'bg-sky-400 text-slate-950 border-sky-200'
                      : variantId === 'iron_charger'
                        ? 'bg-orange-500 text-slate-950 border-orange-300'
                        : variantId === 'vex_flanker'
                          ? 'bg-purple-500 text-white border-purple-300'
                          : 'bg-amber-500 text-slate-950 border-amber-300';
                  return (
                    <button
                      key={variantId}
                      type="button"
                      tabIndex={-1}
                      aria-pressed={active}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onSelectDummyVariant(variantId);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-display font-bold uppercase whitespace-nowrap cursor-pointer border transition-colors ${
                        active
                          ? activeStyle
                          : 'bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {spec.label}
                    </button>
                  );
                })}
              </div>
              <div className="text-[11px] text-slate-300 text-center max-w-xl leading-tight">
                {selectedDummySpec.patternHint}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2">
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

            <button
              type="button"
              tabIndex={-1}
              aria-expanded={weatherTrayOpen}
              onClick={(e) => {
                e.currentTarget.blur();
                setAudioTrayOpen(false);
                setWeatherTrayOpen((v) => !v);
              }}
              className={`px-2.5 py-1 text-xs font-display font-bold uppercase cursor-pointer border whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                weatherTrayOpen
                  ? 'bg-sky-400 text-slate-950 border-sky-200'
                  : 'bg-slate-900 text-sky-200 border-sky-500/50 hover:bg-slate-800'
              }`}
            >
              <span
                aria-hidden="true"
                className="w-2 h-2 inline-block shrink-0"
                style={{ backgroundColor: activeWeatherSpec.accentHex }}
              />
              <span>Weather: {activeWeatherSpec.shortLabel}</span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-expanded={audioTrayOpen}
              onClick={(e) => {
                e.currentTarget.blur();
                setWeatherTrayOpen(false);
                setAudioTrayOpen((v) => !v);
              }}
              className={`px-2.5 py-1 text-xs font-display font-bold uppercase cursor-pointer border whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                audioTrayOpen
                  ? 'bg-emerald-400 text-slate-950 border-emerald-200'
                  : 'bg-slate-900 text-emerald-200 border-emerald-500/50 hover:bg-slate-800'
              }`}
            >
              <span
                aria-hidden="true"
                className="w-2 h-2 inline-block shrink-0"
                style={{ backgroundColor: activeAudioSpec.accentHex }}
              />
              <span>Audio: {activeAudioSpec.shortLabel}</span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-pressed={hud.spectatorActive}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleSpectator();
              }}
              className={`px-2.5 py-1 text-xs font-display font-bold uppercase cursor-pointer border whitespace-nowrap transition-colors ${
                hud.spectatorActive
                  ? 'bg-amber-400 text-slate-950 border-amber-200'
                  : 'bg-slate-900 text-amber-200 border-amber-500/50 hover:bg-slate-800'
              }`}
            >
              {hud.spectatorActive ? 'Exit Spectator' : 'Spectator [V]'}
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenClanSiege();
              }}
              className="px-2.5 py-1 bg-rose-500 hover:bg-rose-400 text-white text-xs font-display font-bold uppercase cursor-pointer whitespace-nowrap"
            >
              Clan Siege
            </button>

            {hud.dojoMode === 'play' && !hud.spectatorActive && (
              <span className="text-[11px] text-slate-300 font-medium px-1">
                {hud.activeDummyCount > 0
                  ? `${hud.activeDummyCount} Campaign AI ${hud.activeDummyCount === 1 ? 'Dummy' : 'Dummies'} active · Walk close to parry [L]`
                  : 'Switch to Build to place Campaign AI Training Dummies'}
              </span>
            )}

            {hud.dojoMode === 'build' && (
              <>
                <div className="flex items-center gap-1 flex-wrap justify-center">
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
        </div>
      )}
    </div>
  );
}
