import { DEFAULT_CUSTOMIZATION, INITIAL_DAILY_QUESTS } from './combatRules';
import { DEFAULT_DOJO_SOCIAL_STATE } from './dojoLeaderboard';
import type { DojoSocialState } from './dojoLeaderboard';
import { DEFAULT_DOJO_BLOCKS } from './dojoRules';
import type { DailyQuest, DojoBlock, HeroCustomization } from './types';

const STORAGE_KEYS = {
  customization: 'strikeverse_hero_v1',
  dojo: 'strikeverse_dojo_v1',
  dojoSocial: 'strikeverse_dojo_social_v1',
  progress: 'strikeverse_progress_v1',
};

export interface PlayerProgress {
  coins: number;
  level: number;
  xp: number;
  wins: number;
  highestBossCleared: number;
  autoAssist: boolean;
  muted: boolean;
  dailyQuests: DailyQuest[];
}

export const DEFAULT_PROGRESS: PlayerProgress = {
  coins: 350,
  level: 1,
  xp: 0,
  wins: 0,
  highestBossCleared: -1,
  autoAssist: true,
  muted: false,
  dailyQuests: INITIAL_DAILY_QUESTS.map((q) => ({ ...q })),
};

export function loadCustomization(): HeroCustomization {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.customization);
    if (!raw) return { ...DEFAULT_CUSTOMIZATION };
    const parsed = JSON.parse(raw) as Partial<HeroCustomization>;
    return { ...DEFAULT_CUSTOMIZATION, ...parsed };
  } catch {
    return { ...DEFAULT_CUSTOMIZATION };
  }
}

export function saveCustomization(hero: HeroCustomization): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.customization, JSON.stringify(hero));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadDojoBlocks(): DojoBlock[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.dojo);
    if (!raw) return DEFAULT_DOJO_BLOCKS.map((b) => ({ ...b }));
    const parsed = JSON.parse(raw) as DojoBlock[];
    if (!Array.isArray(parsed)) return DEFAULT_DOJO_BLOCKS.map((b) => ({ ...b }));
    return parsed;
  } catch {
    return DEFAULT_DOJO_BLOCKS.map((b) => ({ ...b }));
  }
}

export function saveDojoBlocks(blocks: DojoBlock[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.dojo, JSON.stringify(blocks));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadProgress(): PlayerProgress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.progress);
    if (!raw) {
      return {
        ...DEFAULT_PROGRESS,
        dailyQuests: INITIAL_DAILY_QUESTS.map((q) => ({ ...q })),
      };
    }
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      dailyQuests: Array.isArray(parsed.dailyQuests) && parsed.dailyQuests.length > 0
        ? parsed.dailyQuests
        : INITIAL_DAILY_QUESTS.map((q) => ({ ...q })),
    };
  } catch {
    return {
      ...DEFAULT_PROGRESS,
      dailyQuests: INITIAL_DAILY_QUESTS.map((q) => ({ ...q })),
    };
  }
}

export function saveProgress(progress: PlayerProgress): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadDojoSocialState(): DojoSocialState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.dojoSocial);
    if (!raw) {
      return {
        ...DEFAULT_DOJO_SOCIAL_STATE,
        likedEntryIds: [],
        visitedEntryIds: [],
        extraVisitsById: {},
      };
    }
    const parsed = JSON.parse(raw) as Partial<DojoSocialState>;
    return {
      ...DEFAULT_DOJO_SOCIAL_STATE,
      ...parsed,
      likedEntryIds: Array.isArray(parsed.likedEntryIds) ? parsed.likedEntryIds : [],
      visitedEntryIds: Array.isArray(parsed.visitedEntryIds) ? parsed.visitedEntryIds : [],
      extraVisitsById:
        parsed.extraVisitsById && typeof parsed.extraVisitsById === 'object'
          ? parsed.extraVisitsById
          : {},
    };
  } catch {
    return {
      ...DEFAULT_DOJO_SOCIAL_STATE,
      likedEntryIds: [],
      visitedEntryIds: [],
      extraVisitsById: {},
    };
  }
}

export function saveDojoSocialState(social: DojoSocialState): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.dojoSocial, JSON.stringify(social));
  } catch {
    // Ignore storage quota errors
  }
}
