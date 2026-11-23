import type { DojoBlock, HeroClassId } from './types';

export type DojoLeaderboardSort = 'popularity' | 'likes' | 'visits';

export interface CommunityDojoBuilder {
  id: string;
  ownerName: string;
  dojoName: string;
  classId: HeroClassId;
  themeTag: string;
  accentHex: string;
  baseVisits: number;
  baseLikes: number;
  blocks: DojoBlock[];
}

export interface DojoSocialState {
  playerDojoName: string;
  playerVisits: number;
  playerLikes: number;
  likedEntryIds: string[];
  visitedEntryIds: string[];
  extraVisitsById: Record<string, number>;
  promotedCount: number;
}

export interface DojoLeaderboardEntry {
  id: string;
  rank: number;
  ownerName: string;
  dojoName: string;
  classId: HeroClassId;
  themeTag: string;
  accentHex: string;
  visits: number;
  likes: number;
  popularity: number;
  blockCount: number;
  isPlayer: boolean;
  likedByPlayer: boolean;
  visitedByPlayer: boolean;
  blocks: DojoBlock[];
}

export const PLAYER_DOJO_ID = 'player-dojo';

export const DEFAULT_DOJO_SOCIAL_STATE: DojoSocialState = {
  playerDojoName: 'Sunspire Training Yard',
  playerVisits: 84,
  playerLikes: 29,
  likedEntryIds: [],
  visitedEntryIds: [],
  extraVisitsById: {},
  promotedCount: 0,
};

/**
 * Curated Nexus City sandbox builders, each with a real playable 3D Dojo block layout
 * that players can visit, spar inside, and like directly from the Hub World Leaderboard.
 */
export const COMMUNITY_DOJO_BUILDERS: CommunityDojoBuilder[] = [
  {
    id: 'dojo-zara',
    ownerName: 'Zara Vance',
    dojoName: 'Neon Sky-Court',
    classId: 'phantom',
    themeTag: 'Aerial Combo Parkour',
    accentHex: '#38bdf8',
    baseVisits: 412,
    baseLikes: 168,
    blocks: [
      { id: 'z-1', type: 'trampoline', x: -6, z: 2, rotation: 0 },
      { id: 'z-2', type: 'trampoline', x: 6, z: 2, rotation: 0 },
      { id: 'z-3', type: 'trampoline', x: 0, z: -2, rotation: 0 },
      { id: 'z-4', type: 'dashpad', x: -4, z: 4, rotation: 0 },
      { id: 'z-5', type: 'dashpad', x: 4, z: 4, rotation: 0 },
      { id: 'z-6', type: 'dummy', x: -4, z: -6, rotation: 0.2 },
      { id: 'z-7', type: 'dummy', x: 0, z: -8, rotation: 0 },
      { id: 'z-8', type: 'dummy', x: 4, z: -6, rotation: -0.2 },
      { id: 'z-9', type: 'lantern', x: -10, z: -10, rotation: 0 },
      { id: 'z-10', type: 'lantern', x: 10, z: -10, rotation: 0 },
      { id: 'z-11', type: 'lantern', x: -10, z: 4, rotation: 0 },
      { id: 'z-12', type: 'lantern', x: 10, z: 4, rotation: 0 },
      { id: 'z-13', type: 'trophy', x: -2, z: -12, rotation: 0 },
      { id: 'z-14', type: 'trophy', x: 2, z: -12, rotation: 0 },
      { id: 'z-15', type: 'crate', x: -8, z: -4, rotation: 0 },
      { id: 'z-16', type: 'crate', x: 8, z: -4, rotation: 0 },
    ],
  },
  {
    id: 'dojo-ryuji',
    ownerName: 'Ryuji Sato',
    dojoName: 'Solar Strike Sanctum',
    classId: 'striker',
    themeTag: 'Grandmaster Sparring Hall',
    accentHex: '#f59e0b',
    baseVisits: 356,
    baseLikes: 149,
    blocks: [
      { id: 'r-1', type: 'dummy', x: 0, z: -4, rotation: 0 },
      { id: 'r-2', type: 'dummy', x: -4, z: -8, rotation: 0.35 },
      { id: 'r-3', type: 'dummy', x: 4, z: -8, rotation: -0.35 },
      { id: 'r-4', type: 'dashpad', x: 0, z: 2, rotation: 0 },
      { id: 'r-5', type: 'lantern', x: -8, z: -10, rotation: 0 },
      { id: 'r-6', type: 'lantern', x: 8, z: -10, rotation: 0 },
      { id: 'r-7', type: 'lantern', x: -8, z: 0, rotation: 0 },
      { id: 'r-8', type: 'lantern', x: 8, z: 0, rotation: 0 },
      { id: 'r-9', type: 'trophy', x: 0, z: -12, rotation: 0 },
      { id: 'r-10', type: 'trophy', x: -4, z: -12, rotation: 0 },
      { id: 'r-11', type: 'trophy', x: 4, z: -12, rotation: 0 },
      { id: 'r-12', type: 'crate', x: -6, z: -4, rotation: 0 },
      { id: 'r-13', type: 'crate', x: 6, z: -4, rotation: 0 },
      { id: 'r-14', type: 'trampoline', x: 0, z: -10, rotation: 0 },
    ],
  },
  {
    id: 'dojo-jax',
    ownerName: 'Iron Bull Jax',
    dojoName: 'Titan Wrecking Yard',
    classId: 'juggernaut',
    themeTag: 'Heavy Smash Gauntlet',
    accentHex: '#f97316',
    baseVisits: 298,
    baseLikes: 112,
    blocks: [
      { id: 'j-1', type: 'crate', x: -4, z: -2, rotation: 0 },
      { id: 'j-2', type: 'crate', x: 0, z: -2, rotation: 0 },
      { id: 'j-3', type: 'crate', x: 4, z: -2, rotation: 0 },
      { id: 'j-4', type: 'crate', x: -6, z: -6, rotation: 0 },
      { id: 'j-5', type: 'crate', x: 6, z: -6, rotation: 0 },
      { id: 'j-6', type: 'dummy', x: -2, z: -6, rotation: 0 },
      { id: 'j-7', type: 'dummy', x: 2, z: -6, rotation: 0 },
      { id: 'j-8', type: 'dashpad', x: -4, z: 4, rotation: 0 },
      { id: 'j-9', type: 'dashpad', x: 4, z: 4, rotation: 0 },
      { id: 'j-10', type: 'trophy', x: 0, z: -10, rotation: 0 },
      { id: 'j-11', type: 'lantern', x: -10, z: -8, rotation: 0 },
      { id: 'j-12', type: 'lantern', x: 10, z: -8, rotation: 0 },
    ],
  },
  {
    id: 'dojo-kenji',
    ownerName: 'Kenji Volt',
    dojoName: 'Zero-G Parkour Deck',
    classId: 'ranger',
    themeTag: 'Speedrun Bounce Circuit',
    accentHex: '#06b6d4',
    baseVisits: 245,
    baseLikes: 78,
    blocks: [
      { id: 'k-1', type: 'dashpad', x: -6, z: 4, rotation: 0 },
      { id: 'k-2', type: 'trampoline', x: -6, z: 0, rotation: 0 },
      { id: 'k-3', type: 'trampoline', x: -6, z: -6, rotation: 0 },
      { id: 'k-4', type: 'dashpad', x: 0, z: -8, rotation: 0 },
      { id: 'k-5', type: 'trampoline', x: 6, z: -6, rotation: 0 },
      { id: 'k-6', type: 'trampoline', x: 6, z: 0, rotation: 0 },
      { id: 'k-7', type: 'dashpad', x: 6, z: 4, rotation: 0 },
      { id: 'k-8', type: 'dummy', x: 0, z: -2, rotation: 0 },
      { id: 'k-9', type: 'lantern', x: -10, z: -10, rotation: 0 },
      { id: 'k-10', type: 'lantern', x: 10, z: -10, rotation: 0 },
      { id: 'k-11', type: 'trophy', x: 0, z: -12, rotation: 0 },
    ],
  },
  {
    id: 'dojo-nova',
    ownerName: 'Nova Chen',
    dojoName: 'Aegis Zen Pavilion',
    classId: 'support',
    themeTag: 'Lantern Courtyard',
    accentHex: '#10b981',
    baseVisits: 174,
    baseLikes: 56,
    blocks: [
      { id: 'n-1', type: 'lantern', x: -8, z: -8, rotation: 0 },
      { id: 'n-2', type: 'lantern', x: 8, z: -8, rotation: 0 },
      { id: 'n-3', type: 'lantern', x: -8, z: 0, rotation: 0 },
      { id: 'n-4', type: 'lantern', x: 8, z: 0, rotation: 0 },
      { id: 'n-5', type: 'lantern', x: 0, z: -12, rotation: 0 },
      { id: 'n-6', type: 'dummy', x: -2, z: -4, rotation: 0.15 },
      { id: 'n-7', type: 'dummy', x: 2, z: -4, rotation: -0.15 },
      { id: 'n-8', type: 'trophy', x: -4, z: -10, rotation: 0 },
      { id: 'n-9', type: 'trophy', x: 4, z: -10, rotation: 0 },
      { id: 'n-10', type: 'trampoline', x: 0, z: 2, rotation: 0 },
    ],
  },
  {
    id: 'dojo-mira',
    ownerName: 'Mira Kurosawa',
    dojoName: 'Combo Lab 09',
    classId: 'striker',
    themeTag: 'Finisher Timing Arena',
    accentHex: '#a855f7',
    baseVisits: 112,
    baseLikes: 34,
    blocks: [
      { id: 'm-1', type: 'dummy', x: -4, z: -4, rotation: 0 },
      { id: 'm-2', type: 'dummy', x: 0, z: -4, rotation: 0 },
      { id: 'm-3', type: 'dummy', x: 4, z: -4, rotation: 0 },
      { id: 'm-4', type: 'dashpad', x: 0, z: 2, rotation: 0 },
      { id: 'm-5', type: 'crate', x: -6, z: -8, rotation: 0 },
      { id: 'm-6', type: 'crate', x: 6, z: -8, rotation: 0 },
      { id: 'm-7', type: 'lantern', x: -8, z: -2, rotation: 0 },
      { id: 'm-8', type: 'lantern', x: 8, z: -2, rotation: 0 },
      { id: 'm-9', type: 'trophy', x: 0, z: -10, rotation: 0 },
    ],
  },
  {
    id: 'dojo-dante',
    ownerName: 'Dante Blaze',
    dojoName: 'Lantern Gauntlet',
    classId: 'juggernaut',
    themeTag: 'Starter Brawler Yard',
    accentHex: '#ef4444',
    baseVisits: 68,
    baseLikes: 19,
    blocks: [
      { id: 'd-1', type: 'dummy', x: 0, z: -6, rotation: 0 },
      { id: 'd-2', type: 'crate', x: -4, z: -4, rotation: 0 },
      { id: 'd-3', type: 'crate', x: 4, z: -4, rotation: 0 },
      { id: 'd-4', type: 'lantern', x: -6, z: -8, rotation: 0 },
      { id: 'd-5', type: 'lantern', x: 6, z: -8, rotation: 0 },
      { id: 'd-6', type: 'trampoline', x: 0, z: 0, rotation: 0 },
    ],
  },
];

/**
 * Pure Dojo Popularity formula:
 * Visits build foot traffic (1 pt), Likes signify strong community endorsement (3 pts).
 */
export function computeDojoPopularity(visits: number, likes: number): number {
  return Math.max(0, Math.round(visits)) + Math.max(0, Math.round(likes)) * 3;
}

export interface BuildLeaderboardParams {
  social: DojoSocialState;
  playerName: string;
  playerClassId: HeroClassId;
  playerAccentHex: string;
  playerBlocks: DojoBlock[];
  sortBy?: DojoLeaderboardSort;
  searchQuery?: string;
}

export function buildDojoLeaderboard({
  social,
  playerName,
  playerClassId,
  playerAccentHex,
  playerBlocks,
  sortBy = 'popularity',
  searchQuery = '',
}: BuildLeaderboardParams): DojoLeaderboardEntry[] {
  const likedSet = new Set(social.likedEntryIds);
  const visitedSet = new Set(social.visitedEntryIds);

  const rawEntries: Omit<DojoLeaderboardEntry, 'rank'>[] = COMMUNITY_DOJO_BUILDERS.map((builder) => {
    const likedByPlayer = likedSet.has(builder.id);
    const visitedByPlayer = visitedSet.has(builder.id);
    const visits = builder.baseVisits + (social.extraVisitsById[builder.id] ?? 0);
    const likes = builder.baseLikes + (likedByPlayer ? 1 : 0);
    return {
      id: builder.id,
      ownerName: builder.ownerName,
      dojoName: builder.dojoName,
      classId: builder.classId,
      themeTag: builder.themeTag,
      accentHex: builder.accentHex,
      visits,
      likes,
      popularity: computeDojoPopularity(visits, likes),
      blockCount: builder.blocks.length,
      isPlayer: false,
      likedByPlayer,
      visitedByPlayer,
      blocks: builder.blocks,
    };
  });

  // Add the player's own live sandbox Dojo
  const playerEntry: Omit<DojoLeaderboardEntry, 'rank'> = {
    id: PLAYER_DOJO_ID,
    ownerName: playerName.trim() || 'KAIRO',
    dojoName: social.playerDojoName.trim() || DEFAULT_DOJO_SOCIAL_STATE.playerDojoName,
    classId: playerClassId,
    themeTag: playerBlocks.length >= 12 ? 'Master Sandbox Plot' : 'Custom Builder Plot',
    accentHex: playerAccentHex,
    visits: social.playerVisits,
    likes: social.playerLikes,
    popularity: computeDojoPopularity(social.playerVisits, social.playerLikes),
    blockCount: playerBlocks.length,
    isPlayer: true,
    likedByPlayer: false,
    visitedByPlayer: false,
    blocks: playerBlocks,
  };

  const allEntries = [...rawEntries, playerEntry];

  allEntries.sort((a, b) => {
    if (sortBy === 'likes') {
      if (b.likes !== a.likes) return b.likes - a.likes;
      if (b.popularity !== a.popularity) return b.popularity - a.popularity;
    } else if (sortBy === 'visits') {
      if (b.visits !== a.visits) return b.visits - a.visits;
      if (b.popularity !== a.popularity) return b.popularity - a.popularity;
    } else {
      if (b.popularity !== a.popularity) return b.popularity - a.popularity;
      if (b.likes !== a.likes) return b.likes - a.likes;
      if (b.visits !== a.visits) return b.visits - a.visits;
    }
    return a.ownerName.localeCompare(b.ownerName);
  });

  const ranked: DojoLeaderboardEntry[] = allEntries.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }));

  const q = searchQuery.trim().toLowerCase();
  if (!q) return ranked;

  return ranked.filter(
    (entry) =>
      entry.ownerName.toLowerCase().includes(q) ||
      entry.dojoName.toLowerCase().includes(q) ||
      entry.themeTag.toLowerCase().includes(q)
  );
}

/**
 * Toggles the player's Like on a community builder's Dojo (cannot self-like own Dojo).
 */
export function toggleDojoLike(
  social: DojoSocialState,
  entryId: string
): { state: DojoSocialState; liked: boolean } {
  if (entryId === PLAYER_DOJO_ID) {
    return { state: social, liked: false };
  }
  const alreadyLiked = social.likedEntryIds.includes(entryId);
  const nextLikedIds = alreadyLiked
    ? social.likedEntryIds.filter((id) => id !== entryId)
    : [...social.likedEntryIds, entryId];

  return {
    state: {
      ...social,
      likedEntryIds: nextLikedIds,
    },
    liked: !alreadyLiked,
  };
}

/**
 * Records a visit to a community builder's Dojo.
 * First-time visits to a new builder also reward community reciprocity (+4 visits, +2 likes to your own Dojo!).
 */
export function recordDojoVisit(
  social: DojoSocialState,
  entryId: string
): { state: DojoSocialState; firstVisitBonus: boolean } {
  if (entryId === PLAYER_DOJO_ID) {
    return { state: social, firstVisitBonus: false };
  }
  const firstVisit = !social.visitedEntryIds.includes(entryId);
  const prevExtra = social.extraVisitsById[entryId] ?? 0;

  return {
    state: {
      ...social,
      visitedEntryIds: firstVisit ? [...social.visitedEntryIds, entryId] : social.visitedEntryIds,
      extraVisitsById: {
        ...social.extraVisitsById,
        [entryId]: prevExtra + 1,
      },
      playerVisits: social.playerVisits + (firstVisit ? 4 : 0),
      playerLikes: social.playerLikes + (firstVisit ? 2 : 0),
    },
    firstVisitBonus: firstVisit,
  };
}

/**
 * Promotes the player's Dojo in Nexus City Hub, generating new visits and likes
 * scaled by the craftsmanship (placed block count) of their sandbox Dojo.
 */
export function promotePlayerDojo(
  social: DojoSocialState,
  blockCount: number
): { state: DojoSocialState; gainedVisits: number; gainedLikes: number } {
  const craftTier = Math.max(1, Math.min(32, blockCount));
  const gainedVisits = 10 + Math.round(craftTier * 1.25);
  const gainedLikes = 4 + Math.floor(craftTier * 0.65);

  return {
    state: {
      ...social,
      playerVisits: social.playerVisits + gainedVisits,
      playerLikes: social.playerLikes + gainedLikes,
      promotedCount: social.promotedCount + 1,
    },
    gainedVisits,
    gainedLikes,
  };
}

export function updatePlayerDojoName(
  social: DojoSocialState,
  rawName: string
): DojoSocialState {
  const cleaned = rawName.trim().slice(0, 28);
  return {
    ...social,
    playerDojoName: cleaned || DEFAULT_DOJO_SOCIAL_STATE.playerDojoName,
  };
}
