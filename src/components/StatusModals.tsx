import { useEffect, useState } from 'react';
import { MAX_HERO_LEVEL } from '../game/arenaRanks';
import { getTopArchivedFinishers } from '../game/combatLog';
import type {
  CombatLogEntry,
  DailyQuest,
  MatchSummary,
  ReplayHighlightClip,
  WorldZone,
} from '../game/types';
import { PWAInstallButton } from './PWAInstallButton';
import { RankEmblemIcon } from './RankEmblemIcon';

interface PauseModalProps {
  autoAssist: boolean;
  quests: DailyQuest[];
  showReturnToHub?: boolean;
  onToggleAutoAssist: (enabled: boolean) => void;
  onResume: () => void;
  onRestart: () => void;
  onReturnToHub?: () => void;
  onReturnToTitle: () => void;
}

export function PauseModal({
  autoAssist,
  quests,
  showReturnToHub = false,
  onToggleAutoAssist,
  onResume,
  onRestart,
  onReturnToHub,
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
          <PWAInstallButton variant="modal" />
          {showReturnToHub && onReturnToHub && (
            <button
              type="button"
              onClick={onReturnToHub}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-amber-400/50 text-amber-200 font-display font-bold text-xs tracking-wider uppercase cursor-pointer"
            >
              Return to Nexus City
            </button>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onRestart}
              className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-display font-bold text-xs tracking-wider uppercase cursor-pointer"
            >
              Restart Match
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
  combatLog?: CombatLogEntry[];
  combatArchive?: CombatLogEntry[];
  onPlayAgain: () => void;
  onNextMatch: () => void;
  onReplayVoiceLine?: (summary: MatchSummary) => void;
  onNextBoss: (nextIdx: number) => void;
  onReturnZone: (zone: WorldZone) => void;
}

export function MatchEndModal({
  summary,
  combatLog = [],
  combatArchive = [],
  onPlayAgain,
  onNextMatch,
  onReplayVoiceLine,
  onNextBoss,
  onReturnZone,
}: MatchEndModalProps) {
  const [revealStep, setRevealStep] = useState(0);
  const [replayOpen, setReplayOpen] = useState(false);
  const [replayIdx, setReplayIdx] = useState(0);
  const [replayCopied, setReplayCopied] = useState(false);

  // Staggered dopamine-paced sequential reward reveals (XP -> Coins -> Item Drop / Rank)
  useEffect(() => {
    setRevealStep(0);
    setReplayOpen(false);
    setReplayIdx(0);
    setReplayCopied(false);
    const t1 = window.setTimeout(() => setRevealStep(1), 120);
    const t2 = window.setTimeout(() => setRevealStep(2), 460);
    const t3 = window.setTimeout(() => setRevealStep(3), 800);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [summary]);

  const highlightClips: ReplayHighlightClip[] =
    summary.replayHighlights && summary.replayHighlights.length > 0
      ? summary.replayHighlights
      : [
          {
            id: 1,
            timestampSec: Math.max(2, Math.round(summary.elapsedSeconds * 0.45)),
            kind: summary.parriesLanded > 0 ? 'parry' : 'combo',
            title:
              summary.parriesLanded > 0
                ? `${summary.parriesLanded}x Perfect Parry Turnaround`
                : `${Math.max(1, summary.maxCombo)}-Hit Assault Chain`,
            detail: `Peak momentum sequence — ${summary.damageDealt} total match damage`,
            damage: Math.max(24, Math.round(summary.damageDealt * 0.32)),
            impactScore: 80,
            accentHex: '#f59e0b',
          },
          {
            id: 2,
            timestampSec: Math.max(3, summary.elapsedSeconds),
            kind: 'ko',
            title: summary.victory ? 'Red Flame Final Knockout' : 'Final Exchange',
            detail: summary.subtitle,
            damage: Math.max(32, Math.round(summary.damageDealt * 0.25)),
            impactScore: 95,
            accentHex: summary.victory ? '#ef4444' : '#38bdf8',
          },
        ];

  // Auto-advance highlight clips while Cinematic Highlight Replay is open
  useEffect(() => {
    if (!replayOpen || highlightClips.length <= 1) return;
    const interval = window.setInterval(() => {
      setReplayIdx((prev) => (prev + 1) % highlightClips.length);
    }, 2600);
    return () => window.clearInterval(interval);
  }, [replayOpen, highlightClips.length]);

  const topFinishers = getTopArchivedFinishers(
    combatArchive.length > 0 ? combatArchive : combatLog,
    3
  );
  const peakStringDamage = topFinishers.reduce(
    (max, entry) => Math.max(max, entry.totalDamage),
    0
  );
  const xpPct =
    typeof summary.xpAfter === 'number' && typeof summary.xpToNext === 'number' && summary.xpToNext > 0
      ? Math.max(0, Math.min(100, Math.round((summary.xpAfter / summary.xpToNext) * 100)))
      : 0;
  const rankWinPct = summary.arenaProgress
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(
            (summary.arenaProgress.winsInRank / Math.max(1, summary.arenaProgress.winsRequired)) *
              100
          )
        )
      )
    : 0;

  const activeClip = highlightClips[Math.min(replayIdx, highlightClips.length - 1)];

  const handleCopyReplaySummary = () => {
    const roundTag = summary.roundScore
      ? ` (${summary.roundScore.playerRounds}-${summary.roundScore.opponentRounds})`
      : '';
    const text = `STRIKEVERSE ${summary.victory ? 'VICTORY' : 'HIGHLIGHT REEL'}${roundTag} · ${summary.damageDealt} DMG · ${summary.maxCombo}x Max Combo · ${summary.parriesLanded} Parries · Top Clip: ${activeClip.title}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setReplayCopied(true);
    window.setTimeout(() => setReplayCopied(false), 2400);
  };

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center p-4 ${
        summary.victory ? 'bg-[#080914]/82' : 'bg-[#090810]/86'
      }`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={summary.victory ? 'Victory Summary' : 'Defeat Summary'}
        className={`w-full max-w-xl max-h-[92vh] overflow-y-auto bg-[#0c1222] border-2 clip-bevel p-5 sm:p-6 shadow-2xl ${
          summary.victory ? 'border-amber-400/80' : 'border-rose-500/75'
        }`}
      >
        {/* Dramatic VICTORY / DEFEAT Red-Flame Stamp Header */}
        <div
          className={`animate-stamp-slam relative px-4 py-3.5 mb-4 border overflow-hidden ${
            summary.victory
              ? 'bg-gradient-to-r from-rose-950/80 via-amber-950/55 to-slate-950/90 border-amber-400/70'
              : 'bg-gradient-to-r from-rose-950/75 via-slate-900/90 to-slate-950/95 border-rose-500/60'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-display font-bold tracking-[0.28em] uppercase text-rose-400">
              {summary.victory ? 'RED FLAME TRIUMPH' : 'COMBAT DEBRIEF'}
            </span>
            {summary.roundScore && (
              <span className="px-2 py-0.5 bg-slate-950/90 border border-amber-400/60 font-mono-num text-[11px] font-bold text-amber-300">
                {summary.roundScore.maxRounds ?? 4}-ROUND DUEL · {summary.roundScore.playerRounds} – {summary.roundScore.opponentRounds}
              </span>
            )}
          </div>
          <div
            className={`font-display font-bold text-3xl sm:text-4xl tracking-[0.1em] uppercase leading-tight ${
              summary.victory ? 'text-amber-300' : 'text-rose-400'
            }`}
          >
            {summary.victory ? 'VICTORY' : 'DEFEAT'}
            <span className="ml-2.5 text-base sm:text-lg text-white tracking-wider font-semibold">
              · {summary.title}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">{summary.subtitle}</p>
        </div>

        {/* Character-Specific Victory / Defeat Spoken Voice Line */}
        {summary.voiceLine && (
          <div
            data-testid="match-voice-line"
            className="mb-4 px-3.5 py-2.5 bg-slate-950/85 border border-amber-500/35 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div
                className="text-[10px] font-display font-bold uppercase tracking-[0.2em]"
                style={{ color: summary.voiceLine.accentHex }}
              >
                {summary.voiceLine.personaLabel} · {summary.victory ? 'Victory Line' : 'Defeat Line'}
              </div>
              <p className="text-xs sm:text-sm italic text-amber-50/95 mt-0.5 leading-snug">
                &ldquo;{summary.voiceLine.line}&rdquo;
              </p>
            </div>
            {onReplayVoiceLine && (
              <button
                type="button"
                onClick={() => onReplayVoiceLine(summary)}
                aria-label="Replay Character Voice Line"
                title="Replay Voice Line"
                className="w-9 h-9 bg-slate-900 hover:bg-slate-800 border border-amber-400/45 text-amber-300 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                  <path d="M19 5a9 9 0 0 1 0 14" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* 4-Tile Match Stats Summary */}
        <div
          aria-label="Match Statistics"
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4"
        >
          <div className="bg-slate-900/90 border border-slate-800 p-2.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Damage Dealt</div>
            <div className="font-display font-bold text-xl text-rose-300 font-mono-num">
              {summary.damageDealt}
            </div>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 p-2.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Longest Combo</div>
            <div className="font-display font-bold text-xl text-amber-300 font-mono-num">
              {summary.maxCombo}x
            </div>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 p-2.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Parries Landed</div>
            <div className="font-display font-bold text-xl text-cyan-300 font-mono-num">
              {summary.parriesLanded}
            </div>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 p-2.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Match Time</div>
            <div className="font-display font-bold text-xl text-white font-mono-num">
              {summary.elapsedSeconds}s
            </div>
          </div>
        </div>

        {/* Sequential Staggered Rewards Stack (Reveals 1-by-1) */}
        <div aria-label="Rewards Earned" className="space-y-2.5 mb-4">
          {/* Reward 1: XP & Hero Level */}
          {revealStep >= 1 && (
            <div
              aria-label="Level Up Progression"
              className={`animate-reward-pop p-3 border ${
                summary.leveledUp
                  ? 'bg-emerald-500/12 border-emerald-400/75'
                  : 'bg-slate-900/85 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-xs uppercase tracking-wider text-white">
                    {typeof summary.levelBefore === 'number' && typeof summary.levelAfter === 'number'
                      ? summary.leveledUp
                        ? `HERO LVL ${summary.levelBefore} → LVL ${summary.levelAfter}`
                        : `HERO LEVEL ${summary.levelAfter}/${MAX_HERO_LEVEL}`
                      : 'HERO EXPERIENCE'}
                  </span>
                  {summary.leveledUp && (
                    <span className="px-1.5 py-0.5 bg-emerald-400 text-slate-950 font-display font-bold text-[10px] uppercase tracking-wider">
                      LEVEL UP!
                    </span>
                  )}
                </div>
                <span className="font-mono-num text-sm font-bold text-emerald-300">
                  +{summary.xpEarned} XP
                </span>
              </div>

              {typeof summary.xpAfter === 'number' && typeof summary.xpToNext === 'number' && (
                <div>
                  <div className="h-2 bg-slate-950 border border-slate-800 overflow-hidden mb-1">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-300"
                      style={{ width: `${xpPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono-num text-slate-300">
                    <span>
                      {summary.xpAfter} / {summary.xpToNext} XP to Next Level
                    </span>
                    <span className="text-emerald-300 font-bold">{xpPct}%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reward 2: Coins Bounty */}
          {revealStep >= 2 && (
            <div className="animate-reward-pop flex items-center justify-between gap-3 px-3.5 py-2.5 bg-amber-500/10 border border-amber-400/55">
              <div>
                <div className="font-display font-bold text-xs uppercase tracking-wider text-amber-200">
                  MATCH BOUNTY · NEXUS CREDITS
                </div>
                <div className="text-[11px] text-slate-300">
                  Spend in the Trading Post, Emote Store, or Dojo Weather Vault
                </div>
              </div>
              <span className="font-display font-bold text-xl font-mono-num text-amber-300 shrink-0">
                +{summary.coinsEarned} COINS
              </span>
            </div>
          )}

          {/* Reward 3: Item Drop + 1v1 Arena Rank Progress */}
          {revealStep >= 3 && summary.itemDrop && (
            <div
              aria-label="Match Item Drop"
              className="animate-reward-pop px-3.5 py-2.5 bg-slate-950/90 border flex items-center justify-between gap-3"
              style={{ borderColor: `${summary.itemDrop.accentHex}99` }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="px-1.5 py-0.5 text-[9px] font-display font-bold uppercase tracking-widest text-slate-950"
                    style={{ backgroundColor: summary.itemDrop.accentHex }}
                  >
                    {summary.itemDrop.rarity} DROP
                  </span>
                  <span className="font-display font-bold text-sm uppercase tracking-wide text-white truncate">
                    {summary.itemDrop.name}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5 truncate">
                  {summary.itemDrop.description}
                </div>
              </div>
              <span className="text-xs font-display font-bold uppercase text-amber-300 shrink-0">
                CLAIMED
              </span>
            </div>
          )}

          {revealStep >= 3 && summary.arenaProgress && (
            <div
              aria-label="1v1 Arena Rank Progression"
              className="animate-reward-pop p-3 bg-slate-950/90 border"
              style={{ borderColor: `${summary.arenaProgress.accentHex}88` }}
            >
              <div className="flex items-center gap-3">
                <RankEmblemIcon rank={summary.arenaProgress.rankAfter} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className="font-display font-bold text-sm uppercase tracking-wider truncate"
                      style={{ color: summary.arenaProgress.accentHex }}
                    >
                      {summary.arenaProgress.rankedUp
                        ? `RANK #${summary.arenaProgress.rankBefore} → #${summary.arenaProgress.rankAfter} ${summary.arenaProgress.rankNameAfter}`
                        : `RANK #${summary.arenaProgress.rankAfter} · ${summary.arenaProgress.rankNameAfter}`}
                    </div>
                    {summary.arenaProgress.rankedUp && (
                      <span className="px-1.5 py-0.5 bg-amber-400 text-slate-950 font-display font-bold text-[10px] uppercase shrink-0">
                        RANK UP!
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-300 mb-1.5">
                    Tier {summary.arenaProgress.tierAfter}: {summary.arenaProgress.tierNameAfter}
                  </div>
                  <div className="h-2 bg-slate-900 border border-slate-800 overflow-hidden mb-1">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${summary.arenaProgress.rankAfter >= 50 ? 100 : rankWinPct}%`,
                        backgroundColor: summary.arenaProgress.accentHex,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono-num text-slate-300">
                    <span>
                      {summary.arenaProgress.rankAfter >= 50
                        ? 'MAX RANK · OMNI ACHIEVED'
                        : `${summary.arenaProgress.winsInRank}/${summary.arenaProgress.winsRequired} Wins to Next Rank`}
                    </span>
                    <span style={{ color: summary.arenaProgress.accentHex }}>
                      Rank {summary.arenaProgress.rankAfter}/50
                    </span>
                  </div>
                </div>
              </div>

              {summary.arenaProgress.unlockedEmoteName && (
                <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-display font-bold uppercase tracking-wider text-amber-300">
                    ★ New Tier Rank Emote Unlocked
                  </span>
                  <span className="font-display font-bold uppercase text-white">
                    {summary.arenaProgress.unlockedEmoteName}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Auto-Generated Cinematic Highlight Replay Reel */}
        {replayOpen && (
          <section
            aria-label="Cinematic Highlight Replay"
            className="mb-4 bg-slate-950/95 border border-rose-500/65 p-3.5 space-y-2.5 animate-reward-pop"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-rose-500 animate-pulse inline-block" />
                <span className="font-display font-bold text-xs uppercase tracking-widest text-amber-300">
                  CINEMATIC HIGHLIGHT REEL · CLIP {replayIdx + 1}/{highlightClips.length}
                </span>
              </div>
              <span className="font-mono-num text-[11px] text-slate-400">
                @{activeClip.timestampSec}s
              </span>
            </div>

            <div
              className="p-3 bg-[#0e1526] border"
              style={{ borderColor: `${activeClip.accentHex}88` }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display font-bold text-sm uppercase tracking-wider text-white">
                  {activeClip.title}
                </span>
                <span
                  className="font-mono-num text-xs font-bold px-1.5 py-0.5 text-slate-950"
                  style={{ backgroundColor: activeClip.accentHex }}
                >
                  {activeClip.damage > 0 ? `${activeClip.damage} DMG` : activeClip.kind.toUpperCase()}
                </span>
              </div>
              <div className="text-xs text-slate-300 mt-1">{activeClip.detail}</div>
            </div>

            {/* Clip selector timeline */}
            <div className="flex items-center gap-1.5">
              {highlightClips.map((clip, i) => (
                <button
                  key={clip.id}
                  type="button"
                  onClick={() => setReplayIdx(i)}
                  className={`flex-1 py-1 px-2 text-[10px] font-display font-bold uppercase border cursor-pointer truncate transition-colors ${
                    i === replayIdx
                      ? 'bg-amber-400 text-slate-950 border-amber-200'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  #{i + 1} {clip.kind}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleCopyReplaySummary}
              className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-display font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
            >
              {replayCopied ? '✓ HIGHLIGHT REEL COPIED TO CLIPBOARD' : 'COPY & SHARE HIGHLIGHT CARD'}
            </button>
          </section>
        )}

        {/* Post-Match Combat Log & Archive — Top Persisted Finisher Sequences & Peak Damage */}
        {!replayOpen && topFinishers.length > 0 && (
          <div className="mb-4 bg-slate-900/80 border border-amber-400/35 p-3">
            <div className="flex items-center justify-between text-[11px] font-display font-bold uppercase tracking-wider text-amber-300 mb-2">
              <span>Combat Archive · Top Sequences</span>
              <span className="font-mono-num text-slate-300">
                PEAK {peakStringDamage} DMG · {combatArchive.length}/10 Saved
              </span>
            </div>
            <div className="space-y-1.5">
              {topFinishers.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-2 text-xs bg-slate-950/90 border border-slate-800 px-2.5 py-1.5"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono-num text-amber-400 font-bold">#{idx + 1}</span>
                    <span className="font-display font-bold uppercase text-white truncate">
                      {entry.moveName}
                    </span>
                    <span className="font-mono-num text-[10px] text-slate-400">
                      ({entry.tokens.join('-')})
                    </span>
                  </div>
                  <span className="font-mono-num font-bold text-amber-300 shrink-0">
                    {entry.totalDamage} DMG
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Primary Action Buttons: Next Match (after win) / Rematch / Share Replay / Return to Nexus City */}
        <div className="flex flex-col gap-2">
          {summary.victory && summary.hasNextBoss && typeof summary.bossIndex === 'number' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                data-start="true"
                onClick={() => onNextBoss(summary.bossIndex! + 1)}
                className="clip-angled-sm w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm tracking-wider uppercase cursor-pointer"
              >
                Next Boss Trial
              </button>
              <button
                type="button"
                onClick={onNextMatch}
                className="w-full py-3 bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 hover:brightness-110 text-white font-display font-bold text-sm tracking-wider uppercase cursor-pointer"
              >
                Next Match
              </button>
            </div>
          ) : summary.victory ? (
            <button
              type="button"
              data-start="true"
              onClick={onNextMatch}
              className="clip-angled-sm w-full py-3 bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 hover:brightness-110 text-slate-950 font-display font-bold text-sm tracking-wider uppercase cursor-pointer shadow-lg"
            >
              Next Match
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onPlayAgain}
              className="clip-angled-sm w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm tracking-wider uppercase cursor-pointer"
            >
              Rematch Rival
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setReplayOpen((v) => !v)}
              className={`py-2.5 border font-display font-bold text-xs tracking-wider uppercase cursor-pointer transition-colors ${
                replayOpen
                  ? 'bg-rose-500 border-rose-300 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 border-rose-500/60 text-rose-200'
              }`}
            >
              {replayOpen ? 'Close Replay' : 'Share Replay'}
            </button>
            <button
              type="button"
              onClick={() => onReturnZone('hub')}
              className="py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-display font-bold text-xs tracking-wider uppercase cursor-pointer"
            >
              Return to Nexus City
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

