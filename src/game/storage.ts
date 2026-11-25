import { DEFAULT_CUSTOMIZATION, INITIAL_DAILY_QUESTS } from './combatRules';
import { DEFAULT_DAILY_STREAK_STATE } from './dailyStreak';
import type { DailyStreakState } from './dailyStreak';
import { DEFAULT_DOJO_SOCIAL_STATE } from './dojoLeaderboard';
import type { DojoSocialState } from './dojoLeaderboard';
import { DEFAULT_DOJO_BLOCKS } from './dojoRules';
import { DEFAULT_ARENA_RANK_STATE, normalizeArenaRankState } from './arenaRanks';
import type { ArenaRankProgressState } from './arenaRanks';
import { DEFAULT_CLAN_EMBLEM, validateClanEmblem } from './clanEmblem';
import { normalizeCombatArchive } from './combatLog';
import { DEFAULT_DOJO_AUDIO_TRACK, normalizeDojoAudioTrack } from './dojoAudio';
import { DEFAULT_DOJO_WEATHER_STATE } from './dojoWeather';
import type { DojoWeatherState } from './dojoWeather';
import { DEFAULT_STORE_STATE, normalizeStoreState } from './storeCatalog';
import type { StoreInventoryState } from './storeCatalog';
import type {
  ClanEmblemConfig,
  CombatLogEntry,
  DailyQuest,
  DojoAudioTrackId,
  DojoBlock,
  DojoWeatherId,
  HeroCustomization,
} from './types';

const STORAGE_KEYS = {
  customization: 'strikeverse_hero_v1',
  dojo: 'strikeverse_dojo_v1',
  dojoSocial: 'strikeverse_dojo_social_v1',
  dojoWeather: 'strikeverse_dojo_weather_v1',
  dojoAudio: 'strikeverse_dojo_audio_v1',
  clanEmblem: 'strikeverse_clan_emblem_v1',
  combatArchive: 'strikeverse_combat_archive_v1',
  storeInventory: 'strikeverse_store_v1',
  arenaRank: 'strikeverse_arena_rank_v1',
  dailyStreak: 'strikeverse_daily_streak_v1',
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

export function loadDailyStreakState(): DailyStreakState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.dailyStreak);
    if (!raw) return { ...DEFAULT_DAILY_STREAK_STATE };
    const parsed = JSON.parse(raw) as Partial<DailyStreakState>;
    return {
      ...DEFAULT_DAILY_STREAK_STATE,
      ...parsed,
      streakDays: typeof parsed.streakDays === 'number' ? Math.max(0, parsed.streakDays) : 0,
      longestStreak:
        typeof parsed.longestStreak === 'number' ? Math.max(0, parsed.longestStreak) : 0,
      lastClaimDate: typeof parsed.lastClaimDate === 'string' ? parsed.lastClaimDate : null,
      totalClaimedCoins:
        typeof parsed.totalClaimedCoins === 'number' ? Math.max(0, parsed.totalClaimedCoins) : 0,
    };
  } catch {
    return { ...DEFAULT_DAILY_STREAK_STATE };
  }
}

export function saveDailyStreakState(streak: DailyStreakState): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.dailyStreak, JSON.stringify(streak));
  } catch {
    // Ignore storage quota errors
  }
}

const VALID_WEATHERS: Set<DojoWeatherId> = new Set([
  'clear_day',
  'cherry_blossom',
  'sunset_gloom',
  'neon_night',
]);

export function loadDojoWeatherState(): DojoWeatherState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.dojoWeather);
    if (!raw) {
      return {
        activeWeather: DEFAULT_DOJO_WEATHER_STATE.activeWeather,
        unlockedIds: [...DEFAULT_DOJO_WEATHER_STATE.unlockedIds],
      };
    }
    const parsed = JSON.parse(raw) as Partial<DojoWeatherState>;
    const activeWeather =
      parsed.activeWeather && VALID_WEATHERS.has(parsed.activeWeather)
        ? parsed.activeWeather
        : 'clear_day';
    const rawUnlocked = Array.isArray(parsed.unlockedIds)
      ? parsed.unlockedIds.filter((id): id is DojoWeatherId => VALID_WEATHERS.has(id))
      : [];
    const unlockedIds: DojoWeatherId[] = rawUnlocked.includes('clear_day')
      ? rawUnlocked
      : ['clear_day', ...rawUnlocked];
    return { activeWeather, unlockedIds };
  } catch {
    return {
      activeWeather: DEFAULT_DOJO_WEATHER_STATE.activeWeather,
      unlockedIds: [...DEFAULT_DOJO_WEATHER_STATE.unlockedIds],
    };
  }
}

export function saveDojoWeatherState(weather: DojoWeatherState): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.dojoWeather, JSON.stringify(weather));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadClanEmblem(): ClanEmblemConfig {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.clanEmblem);
    if (!raw) return { ...DEFAULT_CLAN_EMBLEM };
    const parsed = JSON.parse(raw) as Partial<ClanEmblemConfig>;
    return validateClanEmblem(parsed);
  } catch {
    return { ...DEFAULT_CLAN_EMBLEM };
  }
}

export function saveClanEmblem(emblem: ClanEmblemConfig): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.clanEmblem, JSON.stringify(validateClanEmblem(emblem)));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadDojoAudioTrack(): DojoAudioTrackId {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.dojoAudio);
    if (!raw) return DEFAULT_DOJO_AUDIO_TRACK;
    return normalizeDojoAudioTrack(raw);
  } catch {
    return DEFAULT_DOJO_AUDIO_TRACK;
  }
}

export function saveDojoAudioTrack(track: DojoAudioTrackId): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.dojoAudio, normalizeDojoAudioTrack(track));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadCombatArchive(): CombatLogEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.combatArchive);
    if (!raw) return [];
    return normalizeCombatArchive(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveCombatArchive(entries: CombatLogEntry[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.combatArchive, JSON.stringify(entries.slice(0, 10)));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadStoreInventory(): StoreInventoryState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.storeInventory);
    if (!raw) return normalizeStoreState(DEFAULT_STORE_STATE);
    return normalizeStoreState(JSON.parse(raw) as Partial<StoreInventoryState>);
  } catch {
    return normalizeStoreState(DEFAULT_STORE_STATE);
  }
}

export function saveStoreInventory(store: StoreInventoryState): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.storeInventory, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadArenaRankState(): ArenaRankProgressState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.arenaRank);
    if (!raw) return { ...DEFAULT_ARENA_RANK_STATE };
    return normalizeArenaRankState(JSON.parse(raw) as Partial<ArenaRankProgressState>);
  } catch {
    return { ...DEFAULT_ARENA_RANK_STATE };
  }
}

export function saveArenaRankState(rankState: ArenaRankProgressState): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.arenaRank, JSON.stringify(rankState));
  } catch {
    // Ignore storage quota errors
  }
}

