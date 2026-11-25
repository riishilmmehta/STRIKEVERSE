import type { ArenaBiomeId } from './types';

export const MAX_HERO_LEVEL = 100;

export interface ArenaTierSpec {
  tier: 1 | 2 | 3 | 4 | 5;
  name: string;
  minRank: number;
  maxRank: number;
  description: string;
  accentHex: string;
  biomeId: ArenaBiomeId;
}

export interface ArenaRankSpec {
  rank: number; // 1..50
  name: string;
  tier: 1 | 2 | 3 | 4 | 5;
  tierName: string;
  accentHex: string;
  biomeId: ArenaBiomeId;
  winsRequiredToAdvance: number;
}

export interface ArenaBiomeSpec {
  id: ArenaBiomeId;
  name: string;
  shortLabel: string;
  tier: 1 | 2 | 3 | 4 | 5;
  subtitle: string;
  hazardNote: string;
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
  hasCover: boolean;
}

export const ARENA_TIERS: ArenaTierSpec[] = [
  {
    tier: 1,
    name: 'The Uncharted',
    minRank: 1,
    maxRank: 10,
    description: 'Entering the world, learning basic survival, and taking the first steps off the beaten path.',
    accentHex: '#e2e8f0',
    biomeId: 'salt_flats',
  },
  {
    tier: 2,
    name: 'The Wilds',
    minRank: 11,
    maxRank: 20,
    description: 'Adapting to harsh biomes, hunting dangerous fauna, and mastering terrain.',
    accentHex: '#2dd4bf',
    biomeId: 'karst_cenotes',
  },
  {
    tier: 3,
    name: 'The Frontier',
    minRank: 21,
    maxRank: 30,
    description: 'Leading expeditions, conquering extreme hazards, and claiming territory.',
    accentHex: '#fb923c',
    biomeId: 'wildfire_ashlands',
  },
  {
    tier: 4,
    name: 'The Mythic',
    minRank: 31,
    maxRank: 40,
    description: 'Transcending ordinary limits and becoming a legend across multiple worlds.',
    accentHex: '#facc15',
    biomeId: 'geothermal_springs',
  },
  {
    tier: 5,
    name: 'The Cosmic',
    minRank: 41,
    maxRank: 50,
    description: 'Endgame mastery reserved for players who have conquered every biome and challenge.',
    accentHex: '#34d399',
    biomeId: 'kelp_brine',
  },
];

const RANK_NAMES_BY_TIER: Record<1 | 2 | 3 | 4 | 5, string[]> = {
  1: [
    'Stray',
    'Drifter',
    'Wanderer',
    'Forager',
    'Scout',
    'Tracker',
    'Outrider',
    'Wayfinder',
    'Trailblazer',
    'Pathbreaker',
  ],
  2: [
    'Seeker',
    'Stalker',
    'Prowler',
    'Trapper',
    'Tamer',
    'Ranger',
    'Warden',
    'Sentinel',
    'Outlaw',
    'Survivalist',
  ],
  3: [
    'Pioneer',
    'Vanguard',
    'Expeditionary',
    'Conqueror',
    'Tempest',
    'Stormbringer',
    'Dreadnought',
    'Colossus',
    'Warlord',
    'Overlord',
  ],
  4: [
    'Harbinger',
    'Omen',
    'Oracle',
    'Phantasm',
    'Wraith',
    'Archon',
    'Sovereign',
    'Monarch',
    'Emperor',
    'Paragon',
  ],
  5: [
    'Ascendant',
    'Astral',
    'Celestial',
    'Nova',
    'Eclipse',
    'Singularity',
    'Leviathan',
    'Titan',
    'Apex',
    'Omni',
  ],
};

export const ARENA_RANKS: ArenaRankSpec[] = ARENA_TIERS.flatMap((tierSpec) =>
  RANK_NAMES_BY_TIER[tierSpec.tier].map((name, idx) => {
    const rank = (tierSpec.tier - 1) * 10 + idx + 1;
    // Fast early progression (1 win per rank in Tier 1, scaling up gently to 3 in Tier 5)
    const winsRequiredToAdvance = tierSpec.tier <= 2 ? 1 : tierSpec.tier <= 4 ? 2 : 3;
    return {
      rank,
      name,
      tier: tierSpec.tier,
      tierName: tierSpec.name,
      accentHex: tierSpec.accentHex,
      biomeId: tierSpec.biomeId,
      winsRequiredToAdvance,
    };
  })
);

export const ARENA_BIOME_ORDER: ArenaBiomeId[] = [
  'salt_flats',
  'karst_cenotes',
  'wildfire_ashlands',
  'geothermal_springs',
  'kelp_brine',
];

export const ARENA_BIOMES: Record<ArenaBiomeId, ArenaBiomeSpec> = {
  salt_flats: {
    id: 'salt_flats',
    name: 'Salt Flats & Mirrors',
    shortLabel: 'Colosseum Mirrors',
    tier: 1,
    subtitle: 'Nexus City Colosseum mirror-salt floor framed by tiered stands, Red Flame banners, and zero cover.',
    hazardNote: 'Nexus Colosseum · Zero Cover',
    accentHex: '#f97316',
    skyHex: '#18182c',
    fogHex: '#281f36',
    fogNear: 42,
    fogFar: 175,
    hemiSkyHex: '#fed7aa',
    hemiGroundHex: '#1e1b4b',
    hemiIntensity: 0.78,
    sunColorHex: '#ffedd5',
    sunIntensity: 1.55,
    sunPosition: [18, 28, 16],
    rimColorHex: '#f97316',
    rimIntensity: 0.96,
    exposure: 1.04,
    hasCover: false,
  },
  karst_cenotes: {
    id: 'karst_cenotes',
    name: 'Karst Towers & Cenotes',
    shortLabel: 'Karst Cenotes',
    tier: 2,
    subtitle: 'Steep jagged limestone pillars veiled in mist above glowing emerald-teal cenote sinkholes.',
    hazardNote: 'Jagged Limestone Pillars · Mist',
    accentHex: '#2dd4bf',
    skyHex: '#99f6e4',
    fogHex: '#ccfbf1',
    fogNear: 24,
    fogFar: 120,
    hemiSkyHex: '#ccfbf1',
    hemiGroundHex: '#115e59',
    hemiIntensity: 0.78,
    sunColorHex: '#ecfeff',
    sunIntensity: 1.32,
    sunPosition: [14, 26, -12],
    rimColorHex: '#14b8a6',
    rimIntensity: 0.84,
    exposure: 0.98,
    hasCover: true,
  },
  wildfire_ashlands: {
    id: 'wildfire_ashlands',
    name: 'Post-Wildfire Ashlands',
    shortLabel: 'Ashlands',
    tier: 3,
    subtitle: 'Charred obsidian trunks paired with vivid neon wildflowers and smoldering embers beneath the ash.',
    hazardNote: 'Smoldering Embers · Charred Trunks',
    accentHex: '#fb923c',
    skyHex: '#2c1622',
    fogHex: '#4a1d24',
    fogNear: 22,
    fogFar: 115,
    hemiSkyHex: '#f472b6',
    hemiGroundHex: '#431407',
    hemiIntensity: 0.62,
    sunColorHex: '#fb923c',
    sunIntensity: 1.36,
    sunPosition: [-20, 14, -10],
    rimColorHex: '#f43f5e',
    rimIntensity: 1.12,
    exposure: 0.96,
    hasCover: true,
  },
  geothermal_springs: {
    id: 'geothermal_springs',
    name: 'Geothermal Rainbow Springs',
    shortLabel: 'Rainbow Springs',
    tier: 4,
    subtitle: 'Boiling geysers, sulfur vents, and vibrant mineral terraces with fragile crusts underfoot.',
    hazardNote: 'Boiling Sulfur Vents · Fragile Crust',
    accentHex: '#facc15',
    skyHex: '#fed7aa',
    fogHex: '#fef08a',
    fogNear: 26,
    fogFar: 132,
    hemiSkyHex: '#fef3c7',
    hemiGroundHex: '#0f766e',
    hemiIntensity: 0.82,
    sunColorHex: '#fde047',
    sunIntensity: 1.46,
    sunPosition: [20, 22, 16],
    rimColorHex: '#22d3ee',
    rimIntensity: 0.92,
    exposure: 1.0,
    hasCover: true,
  },
  kelp_brine: {
    id: 'kelp_brine',
    name: 'Kelp Forests & Brine Pools',
    shortLabel: 'Kelp & Brine',
    tier: 5,
    subtitle: 'Towering underwater kelp canopy mazes hiding dense toxic brine pools along the seabed.',
    hazardNote: 'Towering Kelp Canopy · Toxic Brine',
    accentHex: '#34d399',
    skyHex: '#042f2e',
    fogHex: '#064e3b',
    fogNear: 18,
    fogFar: 102,
    hemiSkyHex: '#2dd4bf',
    hemiGroundHex: '#022c22',
    hemiIntensity: 0.68,
    sunColorHex: '#5eead4',
    sunIntensity: 1.18,
    sunPosition: [6, 32, 8],
    rimColorHex: '#a3e635',
    rimIntensity: 1.24,
    exposure: 1.02,
    hasCover: true,
  },
};

export interface ArenaRankProgressState {
  rank: number; // 1..50
  winsInRank: number;
  totalArenaWins: number;
  selectedBiome: ArenaBiomeId;
}

export const DEFAULT_ARENA_RANK_STATE: ArenaRankProgressState = {
  rank: 1,
  winsInRank: 0,
  totalArenaWins: 0,
  selectedBiome: 'salt_flats',
};

export function getArenaRankSpec(rank: number): ArenaRankSpec {
  const clamped = Math.max(1, Math.min(50, Math.floor(rank)));
  return ARENA_RANKS[clamped - 1];
}

export function normalizeArenaRankState(
  raw: Partial<ArenaRankProgressState> | null | undefined
): ArenaRankProgressState {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_ARENA_RANK_STATE };
  }
  const rank =
    typeof raw.rank === 'number' && Number.isFinite(raw.rank)
      ? Math.max(1, Math.min(50, Math.floor(raw.rank)))
      : 1;
  const spec = getArenaRankSpec(rank);
  const winsInRank =
    typeof raw.winsInRank === 'number' && Number.isFinite(raw.winsInRank)
      ? Math.max(0, Math.min(spec.winsRequiredToAdvance, Math.floor(raw.winsInRank)))
      : 0;
  const totalArenaWins =
    typeof raw.totalArenaWins === 'number' && Number.isFinite(raw.totalArenaWins)
      ? Math.max(0, Math.floor(raw.totalArenaWins))
      : 0;
  const selectedBiome: ArenaBiomeId =
    raw.selectedBiome && ARENA_BIOMES[raw.selectedBiome]
      ? raw.selectedBiome
      : spec.biomeId;
  return { rank, winsInRank, totalArenaWins, selectedBiome };
}

export function recordArenaWin(state: ArenaRankProgressState): {
  next: ArenaRankProgressState;
  rankedUp: boolean;
  tierChanged: boolean;
  newRankSpec: ArenaRankSpec;
} {
  const curSpec = getArenaRankSpec(state.rank);
  const totalArenaWins = state.totalArenaWins + 1;

  if (state.rank >= 50) {
    return {
      next: {
        ...state,
        rank: 50,
        winsInRank: curSpec.winsRequiredToAdvance,
        totalArenaWins,
      },
      rankedUp: false,
      tierChanged: false,
      newRankSpec: curSpec,
    };
  }

  const nextWinsInRank = state.winsInRank + 1;
  if (nextWinsInRank >= curSpec.winsRequiredToAdvance) {
    const newRank = Math.min(50, state.rank + 1);
    const newSpec = getArenaRankSpec(newRank);
    const tierChanged = newSpec.tier !== curSpec.tier;
    return {
      next: {
        rank: newRank,
        winsInRank: 0,
        totalArenaWins,
        selectedBiome: tierChanged ? newSpec.biomeId : state.selectedBiome,
      },
      rankedUp: true,
      tierChanged,
      newRankSpec: newSpec,
    };
  }

  return {
    next: {
      ...state,
      winsInRank: nextWinsInRank,
      totalArenaWins,
    },
    rankedUp: false,
    tierChanged: false,
    newRankSpec: curSpec,
  };
}

export function computeXpToNextLevel(level: number): number {
  const clamped = Math.max(1, Math.min(MAX_HERO_LEVEL, Math.floor(level)));
  return 100 + clamped * 25;
}

export function applyXpGain(
  currentLevel: number,
  currentXp: number,
  gainedXp: number
): { level: number; xp: number; leveledUp: boolean } {
  let level = Math.max(1, Math.min(MAX_HERO_LEVEL, Math.floor(currentLevel)));
  let xp = Math.max(0, Math.floor(currentXp + Math.max(0, gainedXp)));
  let leveledUp = false;

  while (level < MAX_HERO_LEVEL && xp >= computeXpToNextLevel(level)) {
    xp -= computeXpToNextLevel(level);
    level += 1;
    leveledUp = true;
  }

  if (level >= MAX_HERO_LEVEL) {
    level = MAX_HERO_LEVEL;
    xp = 0;
  }

  return { level, xp, leveledUp };
}
