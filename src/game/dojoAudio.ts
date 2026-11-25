import type { DojoAudioTrackId } from './types';

export interface DojoAudioTrackSpec {
  id: DojoAudioTrackId;
  name: string;
  shortLabel: string;
  genreTag: string;
  description: string;
  accentHex: string;
  bpm: number;
  stepMs: number;
}

export const DOJO_AUDIO_ORDER: DojoAudioTrackId[] = [
  'zen_garden',
  'heavy_beat',
  'stormy_dojo',
  'cyber_pulse',
  'silent',
];

export const DOJO_AUDIO_SPECS: Record<DojoAudioTrackId, DojoAudioTrackSpec> = {
  zen_garden: {
    id: 'zen_garden',
    name: 'Zen Garden',
    shortLabel: 'Zen Garden',
    genreTag: 'Ambient',
    description: 'Serene pentatonic koto plucks & warm courtyard chimes for guests.',
    accentHex: '#34d399',
    bpm: 75,
    stepMs: 420,
  },
  heavy_beat: {
    id: 'heavy_beat',
    name: 'Heavy Beat',
    shortLabel: 'Heavy Beat',
    genreTag: 'Lo-Fi',
    description: 'Punchy dusty lo-fi boom-bap drums with mellow minor chord stabs.',
    accentHex: '#f59e0b',
    bpm: 88,
    stepMs: 340,
  },
  stormy_dojo: {
    id: 'stormy_dojo',
    name: 'Stormy Dojo',
    shortLabel: 'Stormy Dojo',
    genreTag: 'Taiko & Rain',
    description: 'Rolling taiko war drums layered over rain swells & flute tension.',
    accentHex: '#60a5fa',
    bpm: 102,
    stepMs: 295,
  },
  cyber_pulse: {
    id: 'cyber_pulse',
    name: 'Cyber Pulse',
    shortLabel: 'Cyber Pulse',
    genreTag: 'Synthwave',
    description: 'Electric neon arpeggios and crisp sub-bass for night spars.',
    accentHex: '#e879f9',
    bpm: 115,
    stepMs: 260,
  },
  silent: {
    id: 'silent',
    name: 'Quiet Courtyard',
    shortLabel: 'Quiet',
    genreTag: 'SFX Only',
    description: 'Pauses background music while keeping parry & impact SFX crisp.',
    accentHex: '#94a3b8',
    bpm: 0,
    stepMs: 400,
  },
};

export const DEFAULT_DOJO_AUDIO_TRACK: DojoAudioTrackId = 'zen_garden';

const VALID_TRACKS = new Set<DojoAudioTrackId>(DOJO_AUDIO_ORDER);

export function isValidDojoAudioTrack(id: unknown): id is DojoAudioTrackId {
  return typeof id === 'string' && VALID_TRACKS.has(id as DojoAudioTrackId);
}

export function normalizeDojoAudioTrack(raw: unknown): DojoAudioTrackId {
  return isValidDojoAudioTrack(raw) ? raw : DEFAULT_DOJO_AUDIO_TRACK;
}

const COMMUNITY_DOJO_TRACK_MAP: Record<string, DojoAudioTrackId> = {
  'dojo-zara': 'cyber_pulse',
  'dojo-nova': 'zen_garden',
  'dojo-jax': 'heavy_beat',
  'dojo-kai': 'stormy_dojo',
  'dojo-mira': 'zen_garden',
  'dojo-ren': 'heavy_beat',
};

export function getCommunityDojoTrack(dojoId: string): DojoAudioTrackId {
  if (COMMUNITY_DOJO_TRACK_MAP[dojoId]) {
    return COMMUNITY_DOJO_TRACK_MAP[dojoId];
  }
  const playable: DojoAudioTrackId[] = ['zen_garden', 'heavy_beat', 'stormy_dojo', 'cyber_pulse'];
  let hash = 0;
  for (let i = 0; i < dojoId.length; i++) {
    hash = (hash * 31 + dojoId.charCodeAt(i)) | 0;
  }
  return playable[Math.abs(hash) % playable.length];
}
