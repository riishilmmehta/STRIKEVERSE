export const RED_FLAME_LOGO_SRC = '/assets/aistudio/image_a17ea6b2.png';

/** Studio Logo Cinematic timing: 20.0s unhurried slow-burn reveal (skippable after 1.0s) */
export const STUDIO_LOGO_TOTAL_SEC = 20.0;
export const STUDIO_LOGO_SKIP_UNLOCK_SEC = 1.0;

/** Loading screen timing: 30.0s cold-boot showcase so players enjoy multiple game posters */
export const COLD_BOOT_LOADING_MS = 30000;
export const HUB_REENTRY_LOADING_MS = 3500;
export const LOADING_TIP_INTERVAL_MS = 5000;
export const LOADING_POSTER_CROSSFADE_MS = 5500;

export type StudioCinematicPhase =
  | 'ember_pulse'
  | 'flame_wipe'
  | 'logo_resolve'
  | 'wordmark_burn'
  | 'lockup_hold'
  | 'fade_out'
  | 'done';

export interface StudioCinematicState {
  elapsedSec: number;
  phase: StudioCinematicPhase;
  canSkip: boolean;
  /** 0..1 intensity of central breathing coal ember (0.0s-0.8s) */
  emberGlow: number;
  /** 0..1 left-to-right flame sheet wipe progress (0.8s-1.6s) */
  wipeProgress: number;
  /** 0..1 logo particle convergence & icon opacity (1.6s-2.4s) */
  logoResolve: number;
  /** 0..1 RED FLAME GAMES wordmark burn-in progress (2.4s-3.0s) */
  wordmarkReveal: number;
  /** 0..1 single ambient pulse during full lockup hold (3.0s-3.6s) */
  lockupPulse: number;
  /** 0..1 final fade to pure black (3.6s-4.0s) */
  fadeToBlack: number;
  /** Whether the 4.0s sequence has completed */
  finished: boolean;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function getStudioCinematicState(elapsedSec: number): StudioCinematicState {
  const t = Math.max(0, elapsedSec);

  let phase: StudioCinematicPhase = 'ember_pulse';
  if (t >= STUDIO_LOGO_TOTAL_SEC) phase = 'done';
  else if (t >= 18.0) phase = 'fade_out';
  else if (t >= 15.0) phase = 'lockup_hold';
  else if (t >= 12.0) phase = 'wordmark_burn';
  else if (t >= 8.0) phase = 'logo_resolve';
  else if (t >= 4.0) phase = 'flame_wipe';

  // Slow, hypnotic breathing coal ember during 0.0s - 4.0s
  const emberBreath = 0.52 + 0.48 * Math.sin(t * Math.PI * 0.75);
  const emberGlow =
    t < 4.2
      ? emberBreath * smoothstep(0.0, 0.9, t)
      : Math.max(0, 1 - (t - 4.2) * 1.1);
  // Slow sweeping sheet of fire across 4.0s - 8.0s
  const wipeProgress = smoothstep(4.0, 8.0, t);
  // Gradual particle convergence & uploaded flame logo formation across 7.6s - 12.0s
  const logoResolve = smoothstep(7.6, 12.0, t);
  // Unhurried heat-shimmer wordmark burn-in across 12.0s - 15.0s
  const wordmarkReveal = smoothstep(12.0, 15.0, t);
  // Single warm ambient glow pulse across the 15.0s - 18.0s full lock-up hold
  const lockupPulse =
    t >= 15.0 && t <= 18.0
      ? Math.sin(((t - 15.0) / 3.0) * Math.PI)
      : 0;
  // Smooth 2.0s fade to pure black (18.0s - 20.0s)
  const fadeToBlack = smoothstep(18.0, 20.0, t);

  return {
    elapsedSec: t,
    phase,
    canSkip: t >= STUDIO_LOGO_SKIP_UNLOCK_SEC,
    emberGlow,
    wipeProgress,
    logoResolve,
    wordmarkReveal,
    lockupPulse,
    fadeToBlack,
    finished: t >= STUDIO_LOGO_TOTAL_SEC,
  };
}

export interface LoadingPosterAsset {
  id: string;
  src: string;
  title: string;
  category:
    | 'Hero Mid-Combo'
    | 'Nexus City'
    | 'Dojo Plot'
    | 'Living World Event'
    | 'Victory Highlight';
  alt: string;
}

/** 16 bundled, pre-optimized real in-game 3D renders from STRIKEVERSE */
export const LOADING_POSTERS: LoadingPosterAsset[] = [
  {
    id: 'poster-01',
    src: '/assets/posters/poster-01.jpg',
    title: 'Nexus City · Hero Arrival',
    category: 'Victory Highlight',
    alt: 'Kairo standing ready at the golden central ring of Nexus City Plaza',
  },
  {
    id: 'poster-02',
    src: '/assets/posters/poster-02.jpg',
    title: 'Nexus City Plaza · Grand Spire',
    category: 'Nexus City',
    alt: 'Wide view of Nexus City central spire and rival fighters in the hub plaza',
  },
  {
    id: 'poster-03',
    src: '/assets/posters/poster-03.jpg',
    title: 'Solar Dash Palm · Plaza Showcase',
    category: 'Hero Mid-Combo',
    alt: 'Hero executing a blazing Solar Dash Palm skill across Nexus City',
  },
  {
    id: 'poster-04',
    src: '/assets/posters/poster-04.jpg',
    title: 'Colosseum Mirrors · 1v1 Showdown',
    category: 'Living World Event',
    alt: 'Two fighters facing off inside the glowing Colosseum Mirrors arena',
  },
  {
    id: 'poster-05',
    src: '/assets/posters/poster-05.jpg',
    title: 'Skyward Combo Exchange',
    category: 'Hero Mid-Combo',
    alt: 'Close-quarters Light and Heavy combo exchange in the 1v1 Colosseum',
  },
  {
    id: 'poster-06',
    src: '/assets/posters/poster-06.jpg',
    title: 'Red Flame Arena Surge',
    category: 'Hero Mid-Combo',
    alt: 'High-energy skill clash sending sparks across the mirrored colosseum floor',
  },
  {
    id: 'poster-07',
    src: '/assets/posters/poster-07.jpg',
    title: 'Phantom Rooftop · Battle Royale',
    category: 'Living World Event',
    alt: 'Six fighters encircling the shrinking Phantom Rooftop survival ring',
  },
  {
    id: 'poster-08',
    src: '/assets/posters/poster-08.jpg',
    title: 'Last Hero Standing · Clash',
    category: 'Living World Event',
    alt: 'Mid-fight Battle Royale skirmish among rooftop supply crates',
  },
  {
    id: 'poster-09',
    src: '/assets/posters/poster-09.jpg',
    title: 'Hollow Citadel · Boss Trial',
    category: 'Living World Event',
    alt: 'Facing Boss Trial challenger inside the dramatic Hollow Citadel arena',
  },
  {
    id: 'poster-10',
    src: '/assets/posters/poster-10.jpg',
    title: 'Boss Counter-Combo Strike',
    category: 'Hero Mid-Combo',
    alt: 'Mid-combo impact strike against a Campaign boss in Hollow Citadel',
  },
  {
    id: 'poster-11',
    src: '/assets/posters/poster-11.jpg',
    title: 'Master Builder Dojo Plot',
    category: 'Dojo Plot',
    alt: 'Custom player-built Dojo courtyard with lanterns and training blocks',
  },
  {
    id: 'poster-12',
    src: '/assets/posters/poster-12.jpg',
    title: 'Dojo Training Dummy Drill',
    category: 'Dojo Plot',
    alt: 'Practicing high-damage combo chains on a Training Dummy in a custom Dojo',
  },
  {
    id: 'poster-13',
    src: '/assets/posters/poster-13.jpg',
    title: 'Nexus City · West Promenade',
    category: 'Nexus City',
    alt: 'Wide scenic view of Nexus City portal district and sunlit skyline',
  },
  {
    id: 'poster-14',
    src: '/assets/posters/poster-14.jpg',
    title: 'Champion Victory Flex',
    category: 'Victory Highlight',
    alt: 'Hero celebrating with a victory emote pose in Nexus City',
  },
  {
    id: 'poster-15',
    src: '/assets/posters/poster-15.jpg',
    title: 'Aerial Slam · Colosseum Peak',
    category: 'Hero Mid-Combo',
    alt: 'Airborne heavy attack descent inside the Colosseum Mirrors ring',
  },
  {
    id: 'poster-16',
    src: '/assets/posters/poster-16.jpg',
    title: 'Rooftop Dusk Finisher',
    category: 'Victory Highlight',
    alt: 'Dynamic dusk combat moment high above Nexus City rooftops',
  },
];

export const GAMEPLAY_TIPS: string[] = [
  'Tap Block right before a hit lands to Parry and stun your opponent.',
  'Chain Light, Light, Heavy (J-J-K) to launch rivals with Skyward Launcher.',
  'Swipe up on the movement joystick—or press Space—to leap over low sweeps.',
  'Build a Training Dummy in your Dojo to practice Dragon Finisher (K-J-K) timings.',
  '1v1 Arena duels run up to 4 intense rounds—first to 3 wins or Round 4 clutch takes the bout.',
  'Climb all 50 Arena Ranks from Stray to Omni to auto-unlock exclusive Tier Rank Emotes.',
  'Trigger your Pet Ability [G] mid-combo to extend pressure while your stamina recharges.',
  'Visit the Trading Post in Nexus City to swap Dojo blocks and preview Rank Rewards.',
  'Watch for golden enemy telegraphs—a Perfect Parry restores stamina and opens a free counter.',
  'In Battle Royale, break orange supply crates early to gain bonus Ultimate charge.',
  'Switch Arena biomes in Nexus City to battle across Salt Flats, Karst Cenotes, and Ashlands.',
  'Reach 20, 50, or 100 hits to unleash Combo Milestone golden flares and peak Frenzy damage.',
];

export interface SeasonBadgeInfo {
  seasonNumber: number;
  seasonName: string;
  chapterLabel: string;
}

export const CURRENT_SEASON_INFO: SeasonBadgeInfo = {
  seasonNumber: 1,
  seasonName: 'Red Flame Awakening',
  chapterLabel: 'Season 1 · Chapter I',
};

export function pickRandomPosterIndex(
  total: number,
  excludeIndex = -1,
  rand: () => number = Math.random
): number {
  if (total <= 1) return 0;
  const raw = Math.floor(Math.max(0, Math.min(0.999999, rand())) * total);
  if (raw !== excludeIndex) return raw;
  return (raw + 1) % total;
}

/**
 * Smooth client-side loading progress bar so it NEVER visually stalls or regresses,
 * even when underlying asset/scene work happens in uneven bursts.
 */
export function advanceSmoothedProgress(
  currentPct: number,
  targetPct: number,
  dtSec: number
): number {
  const clampedTarget = Math.max(0, Math.min(100, targetPct));
  const clampedCurrent = Math.max(0, Math.min(100, currentPct));
  if (clampedCurrent >= clampedTarget) return clampedCurrent;
  const gap = clampedTarget - clampedCurrent;
  // Minimum creep speed ensures visible continuous motion; eases gracefully toward target
  const minStep = Math.max(12 * dtSec, gap * Math.min(1, dtSec * 4.5));
  return Math.min(clampedTarget, clampedCurrent + minStep);
}
