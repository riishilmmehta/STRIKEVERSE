import type { EmoteId } from './types';

export type RankEmoteId =
  | 'rank_uncharted_flex'
  | 'rank_wilds_prowl'
  | 'rank_frontier_salute'
  | 'rank_mythic_ascension'
  | 'rank_cosmic_meditation';

export interface RankEmoteRewardSpec {
  id: RankEmoteId;
  tier: 1 | 2 | 3 | 4 | 5;
  requiredRank: number;
  tierName: string;
  name: string;
  shortLabel: string;
  hotkey: string;
  accentHex: string;
  secondaryHex: string;
  description: string;
  poseCue: string;
  choreographySteps: string[];
}

export const RANK_EMOTE_REWARDS: RankEmoteRewardSpec[] = [
  {
    id: 'rank_uncharted_flex',
    tier: 1,
    requiredRank: 1,
    tierName: 'The Uncharted',
    name: 'Uncharted Flex',
    shortLabel: 'Uncharted Flex',
    hotkey: 'R1',
    accentHex: '#38bdf8',
    secondaryHex: '#0284c7',
    description:
      'Auto-unlocked upon entering Tier 1: The Uncharted. Confident pioneer stance with rhythmic twin-bicep flex and skyward chin tilt.',
    poseCue: 'DOUBLE-GUARD FLEX · COMPASS STANCE',
    choreographySteps: ['Wide pioneer footwork', 'Twin-bicep power flex', 'Compass pulse surge'],
  },
  {
    id: 'rank_wilds_prowl',
    tier: 2,
    requiredRank: 11,
    tierName: 'The Wilds',
    name: 'Wilds Prowl',
    shortLabel: 'Wilds Prowl',
    hotkey: 'R2',
    accentHex: '#34d399',
    secondaryHex: '#059669',
    description:
      'Auto-unlocked at Rank #11 (Seeker). Predatory low-crouch stalker stance with sweeping claw strikes and coiled leap sway.',
    poseCue: 'LOW PREDATOR CROUCH · CLAW SWEEP',
    choreographySteps: ['Coiled ambush crouch', 'Alternating fang slashes', 'Emerald aura surge'],
  },
  {
    id: 'rank_frontier_salute',
    tier: 3,
    requiredRank: 21,
    tierName: 'The Frontier',
    name: 'Frontier Salute',
    shortLabel: 'Frontier Salute',
    hotkey: 'R3',
    accentHex: '#f59e0b',
    secondaryHex: '#d97706',
    description:
      'Auto-unlocked at Rank #21 (Pioneer). Commanding warlord fist-to-chest salute followed by a blazing skyward victory thrust.',
    poseCue: 'VANGUARD FIST SALUTE · SKY THRUST',
    choreographySteps: ['Chest-strike salute', 'Ground shock stomp', 'Skyward warlord fist'],
  },
  {
    id: 'rank_mythic_ascension',
    tier: 4,
    requiredRank: 31,
    tierName: 'The Mythic',
    name: 'Mythic Ascension',
    shortLabel: 'Mythic Ascend',
    hotkey: 'R4',
    accentHex: '#c084fc',
    secondaryHex: '#7e22ce',
    description:
      'Auto-unlocked at Rank #31 (Harbinger). Levitate with outstretched mystic arms as twin violet rings spiral around your frame.',
    poseCue: 'LEVITATING SOVEREIGN · HALO SPREAD',
    choreographySteps: ['Weightless vertical lift', 'Wide archon arm spread', 'Orbiting mythic resonance'],
  },
  {
    id: 'rank_cosmic_meditation',
    tier: 5,
    requiredRank: 41,
    tierName: 'The Cosmic',
    name: 'Cosmic Meditation',
    shortLabel: 'Cosmic Meditate',
    hotkey: 'R5',
    accentHex: '#facc15',
    secondaryHex: '#38bdf8',
    description:
      'Auto-unlocked at Rank #41 (Ascendant). Transcendent high-altitude lotus levitation with serene orbiting solar-astral symmetry.',
    poseCue: 'ASTRAL LOTUS LEVITATION · OMNI BALANCE',
    choreographySteps: ['High-altitude lotus float', 'Twin palm cosmic mudra', 'Slow celestial rotation'],
  },
];

export const RANK_EMOTE_MAP: Record<RankEmoteId, RankEmoteRewardSpec> = {
  rank_uncharted_flex: RANK_EMOTE_REWARDS[0],
  rank_wilds_prowl: RANK_EMOTE_REWARDS[1],
  rank_frontier_salute: RANK_EMOTE_REWARDS[2],
  rank_mythic_ascension: RANK_EMOTE_REWARDS[3],
  rank_cosmic_meditation: RANK_EMOTE_REWARDS[4],
};

export function isRankEmoteId(emoteId: EmoteId): emoteId is RankEmoteId {
  return emoteId in RANK_EMOTE_MAP;
}

export function getUnlockedRankEmotes(arenaRank: number): RankEmoteId[] {
  const clamped = Math.max(1, Math.floor(arenaRank));
  return RANK_EMOTE_REWARDS.filter((r) => clamped >= r.requiredRank).map((r) => r.id);
}

export function isRankEmoteUnlocked(emoteId: RankEmoteId, arenaRank: number): boolean {
  const spec = RANK_EMOTE_MAP[emoteId];
  return Math.max(1, Math.floor(arenaRank)) >= spec.requiredRank;
}

export function getNewlyUnlockedRankEmote(
  prevRank: number,
  nextRank: number
): RankEmoteRewardSpec | null {
  const prev = Math.max(1, Math.floor(prevRank));
  const next = Math.max(1, Math.floor(nextRank));
  if (next <= prev) return null;
  for (const spec of RANK_EMOTE_REWARDS) {
    if (prev < spec.requiredRank && next >= spec.requiredRank) {
      return spec;
    }
  }
  return null;
}

export function getNextRankEmoteReward(arenaRank: number): RankEmoteRewardSpec | null {
  const clamped = Math.max(1, Math.floor(arenaRank));
  return RANK_EMOTE_REWARDS.find((r) => r.requiredRank > clamped) ?? null;
}

export function mergeOwnedAndRankEmotes(
  ownedEmotes: EmoteId[],
  arenaRank: number
): EmoteId[] {
  const rankUnlocked = getUnlockedRankEmotes(arenaRank);
  return Array.from(new Set<EmoteId>([...ownedEmotes, ...rankUnlocked]));
}
