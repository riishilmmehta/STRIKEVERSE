import type { MatchItemDrop, MatchRoundState, ReplayHighlightClip } from './types';

export const ARENA_ROUNDS_TO_WIN = 3;
export const ARENA_MAX_ROUNDS = 4;

export function createInitialRoundState(): MatchRoundState {
  return {
    roundNumber: 1,
    playerRounds: 0,
    opponentRounds: 0,
    roundsToWin: ARENA_ROUNDS_TO_WIN,
    maxRounds: ARENA_MAX_ROUNDS,
    bannerText: null,
  };
}

export interface RoundResolution {
  next: MatchRoundState;
  matchFinished: boolean;
  playerWonMatch: boolean;
  roundWinner: 'player' | 'opponent';
}

export function resolveArenaRoundEnd(
  state: MatchRoundState,
  roundWinner: 'player' | 'opponent'
): RoundResolution {
  const playerRounds = state.playerRounds + (roundWinner === 'player' ? 1 : 0);
  const opponentRounds = state.opponentRounds + (roundWinner === 'opponent' ? 1 : 0);
  const roundsCompleted = playerRounds + opponentRounds;

  const reachedWinThreshold =
    playerRounds >= state.roundsToWin || opponentRounds >= state.roundsToWin;
  const reachedMaxRounds = roundsCompleted >= state.maxRounds;
  const matchFinished = reachedWinThreshold || reachedMaxRounds;

  // If 4 rounds finish tied 2-2, the decisive Round 4 winner takes the final clutch tiebreak
  const playerWonMatch = matchFinished
    ? playerRounds !== opponentRounds
      ? playerRounds > opponentRounds
      : roundWinner === 'player'
    : false;

  const nextRoundNumber = matchFinished
    ? state.roundNumber
    : Math.min(state.maxRounds, state.roundNumber + 1);

  const isFinalRoundNext = !matchFinished && nextRoundNumber === state.maxRounds;

  return {
    next: {
      ...state,
      roundNumber: nextRoundNumber,
      playerRounds,
      opponentRounds,
      bannerText: matchFinished
        ? playerWonMatch
          ? playerRounds === opponentRounds
            ? 'FINAL CLUTCH VICTORY!'
            : 'MATCH VICTORY!'
          : 'MATCH DEFEAT'
        : isFinalRoundNext
          ? 'FINAL ROUND · FIGHT!'
          : `ROUND ${nextRoundNumber} · FIGHT!`,
    },
    matchFinished,
    playerWonMatch,
    roundWinner,
  };
}

const ITEM_DROP_POOL: MatchItemDrop[] = [
  {
    id: 'drop-red-flame-ember',
    name: 'Red Flame Ember Core',
    rarity: 'Epic',
    accentHex: '#f97316',
    description: 'Glowing arena trophy essence forged in the Nexus Colosseum.',
  },
  {
    id: 'drop-parry-sigil',
    name: 'Aegis Parry Sigil',
    rarity: 'Rare',
    accentHex: '#38bdf8',
    description: 'Precision counter-timing crest awarded to tactical duelists.',
  },
  {
    id: 'drop-colosseum-banner',
    name: 'Colosseum Victor Pennant',
    rarity: 'Epic',
    accentHex: '#facc15',
    description: 'Ceremonial Red Flame banner fragment earned from multi-round victories.',
  },
  {
    id: 'drop-umbra-shard',
    name: 'Hollow Umbra Shard',
    rarity: 'Legendary',
    accentHex: '#c084fc',
    description: 'Resonant obsidian relic humming with rival martial aura.',
  },
];

export function rollMatchItemDrop(params: {
  victory: boolean;
  maxCombo: number;
  parriesLanded: number;
  seed: number;
}): MatchItemDrop | undefined {
  if (!params.victory) return undefined;
  if (params.parriesLanded >= 2) {
    return ITEM_DROP_POOL[1];
  }
  if (params.maxCombo >= 6) {
    return ITEM_DROP_POOL[3];
  }
  const idx = Math.abs(Math.floor(params.seed)) % ITEM_DROP_POOL.length;
  return ITEM_DROP_POOL[idx];
}

export function selectTopReplayHighlights(
  clips: ReplayHighlightClip[],
  maxCount = 4
): ReplayHighlightClip[] {
  if (clips.length <= maxCount) return clips.slice();
  const sorted = [...clips].sort((a, b) => b.impactScore - a.impactScore);
  const picked = sorted.slice(0, maxCount);
  return picked.sort((a, b) => a.timestampSec - b.timestampSec);
}
