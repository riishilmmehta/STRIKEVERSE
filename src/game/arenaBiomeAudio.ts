import type { ArenaBiomeId } from './types';

export type ArenaBiomeMusicId =
  | 'biome_salt_flats'
  | 'biome_karst_cenotes'
  | 'biome_wildfire_ashlands'
  | 'biome_geothermal_springs'
  | 'biome_kelp_brine';

export interface ArenaBiomeMusicSpec {
  trackId: ArenaBiomeMusicId;
  biomeId: ArenaBiomeId;
  title: string;
  instrumentTag: string;
  description: string;
  stepMs: number;
  accentHex: string;
}

export const ARENA_BIOME_MUSIC_SPECS: Record<ArenaBiomeId, ArenaBiomeMusicSpec> = {
  salt_flats: {
    trackId: 'biome_salt_flats',
    biomeId: 'salt_flats',
    title: 'Mirage Wind Chimes',
    instrumentTag: 'Haunting Wind Chimes & Glass Shimmer',
    description: 'Airy metallic chimes and open sky resonance across the mirror salt crust.',
    stepMs: 360,
    accentHex: '#38bdf8',
  },
  karst_cenotes: {
    trackId: 'biome_karst_cenotes',
    biomeId: 'karst_cenotes',
    title: 'Cenote Echoes',
    instrumentTag: 'Dripping Cave Echoes & Deep Cavern Drone',
    description: 'Reverberant water droplets and hollow limestone harmonics inside misted towers.',
    stepMs: 380,
    accentHex: '#2dd4bf',
  },
  wildfire_ashlands: {
    trackId: 'biome_wildfire_ashlands',
    biomeId: 'wildfire_ashlands',
    title: 'Ember Synth Pulse',
    instrumentTag: 'Crackling Fire & Brooding Synth Pads',
    description: 'Smoldering fire crackle layered with dark minor-key analog synth swells.',
    stepMs: 310,
    accentHex: '#f97316',
  },
  geothermal_springs: {
    trackId: 'biome_geothermal_springs',
    biomeId: 'geothermal_springs',
    title: 'Thermal Geyser Chimes',
    instrumentTag: 'Steam Vents & Vibrant Mineral Marimba',
    description: 'Rhythmic sulfur steam bursts paired with crystalline rainbow-spring percussion.',
    stepMs: 290,
    accentHex: '#c084fc',
  },
  kelp_brine: {
    trackId: 'biome_kelp_brine',
    biomeId: 'kelp_brine',
    title: 'Abyssal Brine Swell',
    instrumentTag: 'Deep Sonar Pings & Oceanic Low-Pass Pads',
    description: 'Submerged sonar resonance and slow abyssal currents drifting through kelp spires.',
    stepMs: 410,
    accentHex: '#22d3ee',
  },
};

export const BIOME_MUSIC_BY_TRACK_ID: Record<ArenaBiomeMusicId, ArenaBiomeMusicSpec> = {
  biome_salt_flats: ARENA_BIOME_MUSIC_SPECS.salt_flats,
  biome_karst_cenotes: ARENA_BIOME_MUSIC_SPECS.karst_cenotes,
  biome_wildfire_ashlands: ARENA_BIOME_MUSIC_SPECS.wildfire_ashlands,
  biome_geothermal_springs: ARENA_BIOME_MUSIC_SPECS.geothermal_springs,
  biome_kelp_brine: ARENA_BIOME_MUSIC_SPECS.kelp_brine,
};

export function isArenaBiomeMusicTrack(track: string): track is ArenaBiomeMusicId {
  return track in BIOME_MUSIC_BY_TRACK_ID;
}

export function getBiomeMusicSpec(biomeId: ArenaBiomeId): ArenaBiomeMusicSpec {
  return ARENA_BIOME_MUSIC_SPECS[biomeId] ?? ARENA_BIOME_MUSIC_SPECS.salt_flats;
}

export function getBiomeMusicTrackId(biomeId: ArenaBiomeId): ArenaBiomeMusicId {
  return getBiomeMusicSpec(biomeId).trackId;
}
