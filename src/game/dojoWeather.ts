import type { DojoWeatherId } from './types';

export type WeatherParticleMode = 'none' | 'petals' | 'embers' | 'neon_rain';

export interface DojoWeatherSpec {
  id: DojoWeatherId;
  name: string;
  shortLabel: string;
  tagline: string;
  costCoins: number;
  earnRuleLabel: string;
  accentHex: string;
  skyHex: string;
  fogHex: string;
  fogNear: number;
  fogFar: number;
  hemiSkyHex: string;
  hemiGroundHex: string;
  hemiIntensity: number;
  sunColorHex: string;
  sunIntensity: number;
  sunPosition: [number, number, number];
  rimColorHex: string;
  rimIntensity: number;
  exposure: number;
  floorTintHex: string;
  particleMode: WeatherParticleMode;
  particleColors: [string, string, string];
  particleCount: number;
  fallSpeed: number;
  driftSpeed: number;
}

export interface DojoWeatherState {
  activeWeather: DojoWeatherId;
  unlockedIds: DojoWeatherId[];
}

export interface WeatherProgressSnapshot {
  wins: number;
  highestBossCleared: number;
  dojoBlockCount: number;
}

export const DOJO_WEATHER_ORDER: DojoWeatherId[] = [
  'clear_day',
  'cherry_blossom',
  'sunset_gloom',
  'neon_night',
];

export const DOJO_WEATHER_SPECS: Record<DojoWeatherId, DojoWeatherSpec> = {
  clear_day: {
    id: 'clear_day',
    name: 'Sunlit Courtyard',
    shortLabel: 'Clear Day',
    tagline: 'Bright golden daylight over warm tatami timber.',
    costCoins: 0,
    earnRuleLabel: 'Default Weather',
    accentHex: '#f59e0b',
    skyHex: '#fde68a',
    fogHex: '#fef3c7',
    fogNear: 42,
    fogFar: 165,
    hemiSkyHex: '#dbeafe',
    hemiGroundHex: '#7c2d12',
    hemiIntensity: 0.74,
    sunColorHex: '#fff1d0',
    sunIntensity: 1.42,
    sunPosition: [16, 28, 18],
    rimColorHex: '#38bdf8',
    rimIntensity: 0.55,
    exposure: 0.98,
    floorTintHex: '#ffffff',
    particleMode: 'none',
    particleColors: ['#fef3c7', '#fde68a', '#ffffff'],
    particleCount: 0,
    fallSpeed: 0,
    driftSpeed: 0,
  },
  cherry_blossom: {
    id: 'cherry_blossom',
    name: 'Cherry Blossom Rain',
    shortLabel: 'Sakura Rain',
    tagline: 'Drifting sakura petals beneath warm spring-rose skies.',
    costCoins: 150,
    earnRuleLabel: 'Free at 1 Win',
    accentHex: '#f472b6',
    skyHex: '#f9a8d4',
    fogHex: '#fce7f3',
    fogNear: 34,
    fogFar: 145,
    hemiSkyHex: '#ffe4e6',
    hemiGroundHex: '#9d174d',
    hemiIntensity: 0.82,
    sunColorHex: '#fff0f5',
    sunIntensity: 1.32,
    sunPosition: [14, 24, 16],
    rimColorHex: '#f472b6',
    rimIntensity: 0.68,
    exposure: 1.02,
    floorTintHex: '#ffeaf2',
    particleMode: 'petals',
    particleColors: ['#f472b6', '#fbcfe8', '#fda4af'],
    particleCount: 150,
    fallSpeed: 1.75,
    driftSpeed: 1.9,
  },
  sunset_gloom: {
    id: 'sunset_gloom',
    name: 'Sunset Gloom',
    shortLabel: 'Sunset Gloom',
    tagline: 'Smoldering crimson dusk with drifting cinder embers.',
    costCoins: 220,
    earnRuleLabel: 'Free at 3 Wins',
    accentHex: '#f97316',
    skyHex: '#4c1d2e',
    fogHex: '#7c2d12',
    fogNear: 28,
    fogFar: 125,
    hemiSkyHex: '#fb923c',
    hemiGroundHex: '#1e1b4b',
    hemiIntensity: 0.56,
    sunColorHex: '#ff7b3b',
    sunIntensity: 1.32,
    sunPosition: [-22, 11, -14],
    rimColorHex: '#c084fc',
    rimIntensity: 0.85,
    exposure: 0.92,
    floorTintHex: '#c67d62',
    particleMode: 'embers',
    particleColors: ['#fb923c', '#f97316', '#fde047'],
    particleCount: 135,
    fallSpeed: 0.85,
    driftSpeed: 2.35,
  },
  neon_night: {
    id: 'neon_night',
    name: 'Neon Night',
    shortLabel: 'Neon Night',
    tagline: 'Midnight cyber downpour lit by electric cyan & magenta.',
    costCoins: 300,
    earnRuleLabel: 'Free at 10+ Blocks or Boss 2',
    accentHex: '#22d3ee',
    skyHex: '#070b1a',
    fogHex: '#111936',
    fogNear: 24,
    fogFar: 118,
    hemiSkyHex: '#38bdf8',
    hemiGroundHex: '#4c1d95',
    hemiIntensity: 0.46,
    sunColorHex: '#93c5fd',
    sunIntensity: 0.78,
    sunPosition: [12, 22, -16],
    rimColorHex: '#e879f9',
    rimIntensity: 1.38,
    exposure: 0.98,
    floorTintHex: '#4a5a8c',
    particleMode: 'neon_rain',
    particleColors: ['#22d3ee', '#e879f9', '#38bdf8'],
    particleCount: 175,
    fallSpeed: 15.5,
    driftSpeed: 2.4,
  },
};

export const DEFAULT_DOJO_WEATHER_STATE: DojoWeatherState = {
  activeWeather: 'clear_day',
  unlockedIds: ['clear_day'],
};

export function isWeatherEarnedByProgress(
  id: DojoWeatherId,
  progress: WeatherProgressSnapshot
): boolean {
  if (id === 'clear_day') return true;
  if (id === 'cherry_blossom') return progress.wins >= 1;
  if (id === 'sunset_gloom') return progress.wins >= 3;
  if (id === 'neon_night') {
    return progress.dojoBlockCount >= 10 || progress.highestBossCleared >= 1;
  }
  return false;
}

export function isWeatherUnlocked(
  id: DojoWeatherId,
  state: DojoWeatherState,
  progress: WeatherProgressSnapshot
): boolean {
  return (
    id === 'clear_day' ||
    state.unlockedIds.includes(id) ||
    isWeatherEarnedByProgress(id, progress)
  );
}

export function getWeatherUnlockStatus(
  id: DojoWeatherId,
  state: DojoWeatherState,
  progress: WeatherProgressSnapshot
): { unlocked: boolean; source: 'default' | 'purchased' | 'earned' | 'locked' } {
  if (id === 'clear_day') return { unlocked: true, source: 'default' };
  if (state.unlockedIds.includes(id)) return { unlocked: true, source: 'purchased' };
  if (isWeatherEarnedByProgress(id, progress)) return { unlocked: true, source: 'earned' };
  return { unlocked: false, source: 'locked' };
}

export function purchaseDojoWeather(
  state: DojoWeatherState,
  id: DojoWeatherId,
  currentCoins: number,
  progress: WeatherProgressSnapshot
): {
  purchased: boolean;
  state: DojoWeatherState;
  remainingCoins: number;
  reason?: string;
} {
  const spec = DOJO_WEATHER_SPECS[id];
  if (!spec) {
    return { purchased: false, state, remainingCoins: currentCoins, reason: 'Unknown weather' };
  }
  if (isWeatherUnlocked(id, state, progress)) {
    return {
      purchased: false,
      state: { ...state, activeWeather: id },
      remainingCoins: currentCoins,
      reason: 'Already unlocked',
    };
  }
  if (currentCoins < spec.costCoins) {
    return {
      purchased: false,
      state,
      remainingCoins: currentCoins,
      reason: `Need ${spec.costCoins - currentCoins} more coins`,
    };
  }
  const nextUnlocked = state.unlockedIds.includes(id)
    ? state.unlockedIds
    : [...state.unlockedIds, id];
  return {
    purchased: true,
    state: {
      activeWeather: id,
      unlockedIds: nextUnlocked,
    },
    remainingCoins: currentCoins - spec.costCoins,
  };
}

export function selectDojoWeather(
  state: DojoWeatherState,
  id: DojoWeatherId,
  progress: WeatherProgressSnapshot
): { selected: boolean; state: DojoWeatherState } {
  if (!isWeatherUnlocked(id, state, progress)) {
    return { selected: false, state };
  }
  return {
    selected: true,
    state: {
      ...state,
      activeWeather: id,
    },
  };
}
