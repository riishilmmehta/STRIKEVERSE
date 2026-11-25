import type { ArenaBiomeId } from './types';

export type ArenaBiomeParticleMode =
  | 'salt_crystals'
  | 'rising_mist'
  | 'embers_and_ash'
  | 'thermal_steam'
  | 'kelp_spores';

export interface ArenaBiomeParticleSpec {
  biomeId: ArenaBiomeId;
  mode: ArenaBiomeParticleMode;
  label: string;
  primaryCount: number;
  secondaryCount: number;
  verticalSpeed: number; // negative = falling, positive = rising
  driftSpeed: number;
  primaryColors: [string, string, string];
  secondaryColors: [string, string, string];
  primaryOpacity: number;
  secondaryOpacity: number;
}

export const ARENA_BIOME_PARTICLES: Record<ArenaBiomeId, ArenaBiomeParticleSpec> = {
  salt_flats: {
    biomeId: 'salt_flats',
    mode: 'salt_crystals',
    label: 'Falling Salt Crystals',
    primaryCount: 150,
    secondaryCount: 35,
    verticalSpeed: -2.6,
    driftSpeed: 0.9,
    primaryColors: ['#ffffff', '#e0f2fe', '#7dd3fc'],
    secondaryColors: ['#bae6fd', '#f8fafc', '#38bdf8'],
    primaryOpacity: 0.92,
    secondaryOpacity: 0.45,
  },
  karst_cenotes: {
    biomeId: 'karst_cenotes',
    mode: 'rising_mist',
    label: 'Rising Cenote Mist',
    primaryCount: 36,
    secondaryCount: 96,
    verticalSpeed: 1.45,
    driftSpeed: 0.75,
    primaryColors: ['#5eead4', '#ccfbf1', '#99f6e4'],
    secondaryColors: ['#ecfeff', '#ccfbf1', '#99f6e4'],
    primaryOpacity: 0.7,
    secondaryOpacity: 0.34,
  },
  wildfire_ashlands: {
    biomeId: 'wildfire_ashlands',
    mode: 'embers_and_ash',
    label: 'Glowing Embers & Floating Ash',
    primaryCount: 110,
    secondaryCount: 90,
    verticalSpeed: 2.15,
    driftSpeed: 1.45,
    primaryColors: ['#fb923c', '#f97316', '#fde047'],
    secondaryColors: ['#475569', '#64748b', '#94a3b8'],
    primaryOpacity: 0.95,
    secondaryOpacity: 0.72,
  },
  geothermal_springs: {
    biomeId: 'geothermal_springs',
    mode: 'thermal_steam',
    label: 'Thermal Steam & Sulfur Sparks',
    primaryCount: 65,
    secondaryCount: 84,
    verticalSpeed: 2.0,
    driftSpeed: 0.85,
    primaryColors: ['#fde047', '#fb923c', '#22d3ee'],
    secondaryColors: ['#fef9c3', '#fed7aa', '#cffafe'],
    primaryOpacity: 0.86,
    secondaryOpacity: 0.36,
  },
  kelp_brine: {
    biomeId: 'kelp_brine',
    mode: 'kelp_spores',
    label: 'Bioluminescent Spores & Brine Bubbles',
    primaryCount: 95,
    secondaryCount: 60,
    verticalSpeed: 1.35,
    driftSpeed: 0.95,
    primaryColors: ['#a3e635', '#34d399', '#5eead4'],
    secondaryColors: ['#99f6e4', '#ccfbf1', '#6ee7b7'],
    primaryOpacity: 0.88,
    secondaryOpacity: 0.42,
  },
};

export function getArenaBiomeParticleSpec(biomeId: ArenaBiomeId): ArenaBiomeParticleSpec {
  return ARENA_BIOME_PARTICLES[biomeId] ?? ARENA_BIOME_PARTICLES.salt_flats;
}
