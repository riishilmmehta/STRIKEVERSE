import { useEffect, useRef, useState } from 'react';
import {
  COLD_BOOT_LOADING_MS,
  CURRENT_SEASON_INFO,
  GAMEPLAY_TIPS,
  HUB_REENTRY_LOADING_MS,
  LOADING_POSTERS,
  LOADING_POSTER_CROSSFADE_MS,
  LOADING_TIP_INTERVAL_MS,
  advanceSmoothedProgress,
  pickRandomPosterIndex,
} from '../game/openingSequence';
import { RedFlameWordmark, loadProcessedRedFlameLogo } from './RedFlameLogoMark';

export type LoadingScreenMode = 'cold_boot' | 'zone_transition';

interface GtaLoadingScreenProps {
  mode: LoadingScreenMode;
  destinationLabel?: string;
  /** Optional pin for deterministic screenshot testing (defaults to random rotation) */
  initialPosterIndex?: number;
  /** Optional manual hold (e.g. ?loading=1 inspection) */
  holdIndefinitely?: boolean;
  onComplete: () => void;
}

/** Remember last poster across loads so returning players always see fresh posters */
let lastShownPosterIdx = -1;
let lastShownTipIdx = -1;

export function GtaLoadingScreen({
  mode,
  destinationLabel,
  initialPosterIndex,
  holdIndefinitely = false,
  onComplete,
}: GtaLoadingScreenProps) {
  const durationMs = mode === 'cold_boot' ? COLD_BOOT_LOADING_MS : HUB_REENTRY_LOADING_MS;

  const [primaryIdx, setPrimaryIdx] = useState<number>(() => {
    const picked =
      typeof initialPosterIndex === 'number' && initialPosterIndex >= 0
        ? initialPosterIndex % LOADING_POSTERS.length
        : pickRandomPosterIndex(LOADING_POSTERS.length, lastShownPosterIdx);
    lastShownPosterIdx = picked;
    return picked;
  });

  const [secondaryIdx, setSecondaryIdx] = useState<number>(() =>
    pickRandomPosterIndex(LOADING_POSTERS.length, primaryIdx)
  );
  const [showSecondary, setShowSecondary] = useState(false);

  const [tipIdx, setTipIdx] = useState<number>(() => {
    const picked = pickRandomPosterIndex(GAMEPLAY_TIPS.length, lastShownTipIdx);
    lastShownTipIdx = picked;
    return picked;
  });
  const [tipVisible, setTipVisible] = useState(true);
  const [progressPct, setProgressPct] = useState(2);
  const [seasonLogoUrl, setSeasonLogoUrl] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let active = true;
    loadProcessedRedFlameLogo().then((res) => {
      if (active) setSeasonLogoUrl(res.dataUrl);
    });
    return () => {
      active = false;
    };
  }, []);

  // Crossfade to a fresh random in-game poster every 5.5s across the 30s showcase (never hard-cut)
  useEffect(() => {
    if (durationMs < LOADING_POSTER_CROSSFADE_MS && !holdIndefinitely) return;
    const crossfadeTimer = window.setInterval(() => {
      setShowSecondary((prev) => {
        const nextShowing = !prev;
        const nextIdx = pickRandomPosterIndex(LOADING_POSTERS.length, lastShownPosterIdx);
        lastShownPosterIdx = nextIdx;
        if (nextShowing) {
          setSecondaryIdx(nextIdx);
        } else {
          setPrimaryIdx(nextIdx);
        }
        return nextShowing;
      });
    }, LOADING_POSTER_CROSSFADE_MS);
    return () => window.clearInterval(crossfadeTimer);
  }, [durationMs, holdIndefinitely]);

  // Smoothly fade tips in/out every ~4 seconds instead of snapping
  useEffect(() => {
    let swapTimer = 0;
    const interval = window.setInterval(() => {
      setTipVisible(false);
      swapTimer = window.setTimeout(() => {
        setTipIdx((prev) => {
          const next = (prev + 1) % GAMEPLAY_TIPS.length;
          lastShownTipIdx = next;
          return next;
        });
        setTipVisible(true);
      }, 360);
    }, LOADING_TIP_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
      if (swapTimer) window.clearTimeout(swapTimer);
    };
  }, []);

  // Client-side smoothed ember progress bar (never visually stalls)
  useEffect(() => {
    let rafId = 0;
    let done = false;
    let smoothed = 4;
    let elapsedMs = 0;
    let prev = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      elapsedMs += dt * 1000;
      const rawPct = holdIndefinitely
        ? Math.min(82, 18 + (elapsedMs / 3600) * 64)
        : Math.min(100, (elapsedMs / durationMs) * 100);

      smoothed = advanceSmoothedProgress(smoothed, rawPct, dt);
      setProgressPct(smoothed);

      if (!holdIndefinitely && smoothed >= 99.6 && elapsedMs >= durationMs) {
        if (!done) {
          done = true;
          setProgressPct(100);
          window.setTimeout(() => onCompleteRef.current(), 120);
        }
        return;
      }
      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [durationMs, holdIndefinitely]);

  const primaryPoster = LOADING_POSTERS[primaryIdx];
  const secondaryPoster = LOADING_POSTERS[secondaryIdx];
  const activePoster = showSecondary ? secondaryPoster : primaryPoster;
  const pctDisplay = Math.min(100, Math.max(1, Math.round(progressPct)));

  return (
    <div
      data-testid="gta-loading-screen"
      role="status"
      aria-live="polite"
      aria-label={`Loading ${destinationLabel ?? 'STRIKEVERSE'}`}
      className="fixed inset-0 z-50 bg-[#050507] overflow-hidden select-none"
    >
      {/* 1. Full-bleed rotating in-game poster gallery with subtle ~2.5% Ken Burns push-in & smooth crossfade */}
      <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-[#160808] via-[#0d080c] to-[#050507]">
        {!brokenImages[primaryPoster.id] && (
          <img
            src={primaryPoster.src}
            alt={primaryPoster.alt}
            referrerPolicy="no-referrer"
            onError={() => setBrokenImages((b) => ({ ...b, [primaryPoster.id]: true }))}
            className="absolute inset-0 w-full h-full object-cover animate-ken-burns transition-opacity duration-900 ease-in-out"
            style={{ opacity: showSecondary ? 0 : 1 }}
          />
        )}
        {!brokenImages[secondaryPoster.id] && (
          <img
            src={secondaryPoster.src}
            alt={secondaryPoster.alt}
            referrerPolicy="no-referrer"
            onError={() => setBrokenImages((b) => ({ ...b, [secondaryPoster.id]: true }))}
            className="absolute inset-0 w-full h-full object-cover animate-ken-burns transition-opacity duration-900 ease-in-out"
            style={{ opacity: showSecondary ? 1 : 0 }}
          />
        )}
      </div>

      {/* 6. Top-right corner: current Season/Chapter name & Red Flame thumbnail icon */}
      <div
        data-testid="loading-season-badge"
        className="fixed top-5 right-6 z-20 flex items-center gap-3 bg-black/68 border border-amber-500/35 px-3.5 py-2 shadow-lg"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-red-950 via-black to-amber-950 border border-orange-500/50 flex items-center justify-center shrink-0 overflow-hidden">
          {seasonLogoUrl ? (
            <img
              src={seasonLogoUrl}
              alt="Season 1 Red Flame Thumbnail"
              referrerPolicy="no-referrer"
              className="w-5 h-6 object-contain"
            />
          ) : (
            <span className="w-3 h-4 bg-gradient-to-t from-red-600 via-orange-500 to-amber-300 inline-block" />
          )}
        </div>
        <div className="text-right leading-tight">
          <div className="text-[10px] font-display font-semibold uppercase tracking-[0.2em] text-amber-300/90">
            {CURRENT_SEASON_INFO.chapterLabel}
          </div>
          <div className="text-xs font-display font-bold uppercase tracking-wider text-white">
            {CURRENT_SEASON_INFO.seasonName}
          </div>
        </div>
      </div>

      {/* 2. Dark gradient scrim strictly at the bottom third of the screen only */}
      <div
        aria-hidden="true"
        className="fixed inset-x-0 bottom-0 h-[36vh] pointer-events-none z-10"
        style={{
          background:
            'linear-gradient(0deg, rgba(4, 3, 5, 0.96) 0%, rgba(4, 3, 5, 0.78) 48%, rgba(4, 3, 5, 0) 100%)',
        }}
      />

      {/* Bottom third content strip: Tip (Left) · Ember Progress Bar (Dead-Center) · Red Flame Wordmark (Right) */}
      <div className="fixed inset-x-0 bottom-0 z-20 px-6 sm:px-10 pb-6 sm:pb-8 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_minmax(280px,400px)_1fr] items-end gap-5 sm:gap-8">
          {/* 3. Bottom-left: rotating single-line gameplay tip (stealth tutorial) */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-display font-semibold uppercase tracking-[0.22em] text-orange-400/90 mb-1.5">
              <span>{activePoster.category}</span>
              <span aria-hidden="true" className="text-amber-200/35">·</span>
              <span className="text-amber-100/75 truncate">{activePoster.title}</span>
            </div>
            <p
              data-testid="loading-tip"
              className={`text-sm sm:text-[15px] font-medium text-amber-50/95 leading-snug transition-opacity duration-350 max-w-xl [text-shadow:0_1px_4px_rgba(0,0,0,0.9)] ${
                tipVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {GAMEPLAY_TIPS[tipIdx]}
            </p>
          </div>

          {/* 4. Bottom-center: slim glowing Red Flame ember progress bar + tabular percentage */}
          <div className="w-full">
            <div className="flex items-center justify-between text-[11px] font-display uppercase tracking-[0.18em] mb-2">
              <span className="text-amber-200/80 truncate">
                {destinationLabel ? `Entering ${destinationLabel}` : 'Loading World'}
              </span>
              <span
                data-testid="loading-percentage"
                className="font-mono-num font-bold text-amber-300 ml-3 shrink-0"
              >
                {pctDisplay}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={pctDisplay}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Loading Progress"
              className="relative h-1.5 w-full bg-red-950/65 overflow-hidden border border-orange-900/50"
            >
              <div
                className="relative h-full bg-gradient-to-r from-red-700 via-orange-500 to-amber-300 transition-[width] duration-100 ease-linear"
                style={{
                  width: `${progressPct}%`,
                  boxShadow: '0 0 12px rgba(249, 115, 22, 0.85), 0 0 4px rgba(250, 204, 21, 0.9)',
                }}
              >
                {/* Bright incandescent ember tip */}
                <span
                  aria-hidden="true"
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-amber-200 shadow-[0_0_10px_#fef08a]"
                />
              </div>
            </div>
          </div>

          {/* 5. Bottom-right: small, static Red Flame Games studio logo + wordmark */}
          <div className="flex md:justify-end">
            <RedFlameWordmark compact />
          </div>
        </div>
      </div>
    </div>
  );
}
