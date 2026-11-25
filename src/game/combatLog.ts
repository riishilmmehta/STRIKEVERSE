import { computeComboMeterState } from './combatRules';
import type { CombatLogEntry } from './types';

export const MAX_COMBAT_LOG_ENTRIES = 5;

export interface ActiveComboString {
  tokens: string[];
  lastMoveName: string;
  hits: number;
  totalDamage: number;
  targetName: string;
  peakComboCount: number;
}

export interface CombatLogState {
  entries: CombatLogEntry[];
  active: ActiveComboString | null;
  nextId: number;
}

export interface RecordCombatHitParams {
  token: string;
  moveName: string;
  damage: number;
  targetName: string;
  isFinisher: boolean;
  comboCount: number;
}

export function createCombatLogState(): CombatLogState {
  return {
    entries: [],
    active: null,
    nextId: 1,
  };
}

function buildEntry(
  id: number,
  active: ActiveComboString,
  isFinisher: boolean
): CombatLogEntry {
  const rank = computeComboMeterState(Math.max(1, active.peakComboCount), 1).rank;
  return {
    id,
    sequence: active.tokens.join(''),
    tokens: [...active.tokens],
    moveName: active.lastMoveName || 'Combo String',
    hits: active.hits,
    totalDamage: Math.max(1, Math.round(active.totalDamage)),
    isFinisher,
    targetName: active.targetName || 'Rival',
    rank,
  };
}

/**
 * Records a landed hit into the active combo string tracker.
 * When a Combo Finisher or Ultimate Finisher lands, immediately commits a CombatLogEntry
 * to the top of the 5-entry scrolling log so players see instant effectiveness feedback.
 */
export function recordCombatLogHit(
  state: CombatLogState,
  params: RecordCombatHitParams
): CombatLogState {
  const safeDamage = Math.max(0, Math.round(params.damage));
  const cleanToken = (params.token || 'L').toUpperCase();
  const prev = state.active;

  const nextActive: ActiveComboString = prev
    ? {
        tokens: [...prev.tokens, cleanToken].slice(-6),
        lastMoveName: params.moveName || prev.lastMoveName,
        hits: prev.hits + 1,
        totalDamage: prev.totalDamage + safeDamage,
        targetName: params.targetName || prev.targetName,
        peakComboCount: Math.max(prev.peakComboCount, params.comboCount),
      }
    : {
        tokens: [cleanToken],
        lastMoveName: params.moveName || 'Strike',
        hits: 1,
        totalDamage: safeDamage,
        targetName: params.targetName || 'Rival',
        peakComboCount: Math.max(1, params.comboCount),
      };

  if (params.isFinisher) {
    const entry = buildEntry(state.nextId, nextActive, true);
    return {
      entries: [entry, ...state.entries].slice(0, MAX_COMBAT_LOG_ENTRIES),
      active: null,
      nextId: state.nextId + 1,
    };
  }

  return {
    ...state,
    active: nextActive,
  };
}

/**
 * Finalizes an in-progress combo string when the combo window expires,
 * the opponent is defeated, or the player is interrupted.
 * Only multi-hit strings (2+ landed hits) are committed so single stray pokes never spam the log.
 */
export function flushCombatLogString(state: CombatLogState): CombatLogState {
  if (!state.active) return state;
  if (state.active.hits < 2) {
    return {
      ...state,
      active: null,
    };
  }
  const entry = buildEntry(state.nextId, state.active, false);
  return {
    entries: [entry, ...state.entries].slice(0, MAX_COMBAT_LOG_ENTRIES),
    active: null,
    nextId: state.nextId + 1,
  };
}

/**
 * Returns the peak totalDamage among the currently displayed Combat Log entries,
 * enabling relative-effectiveness bars and TOP sequence highlighting.
 */
export function getCombatLogPeakDamage(entries: CombatLogEntry[]): number {
  let peak = 0;
  for (const e of entries) {
    if (e.totalDamage > peak) peak = e.totalDamage;
  }
  return peak;
}

export const MAX_COMBAT_ARCHIVE_ENTRIES = 10;

/**
 * Prepends a Finisher entry into the persistent Combat Archive (capped at last 10 finishers).
 * Non-finisher entries are ignored so the archive stays dedicated to high-impact Finishers.
 */
export function archiveFinisherEntry(
  archive: CombatLogEntry[],
  entry: CombatLogEntry
): CombatLogEntry[] {
  if (!entry.isFinisher) return archive;
  const deduped = archive.filter((existing) => existing.id !== entry.id);
  return [{ ...entry, tokens: [...entry.tokens] }, ...deduped].slice(0, MAX_COMBAT_ARCHIVE_ENTRIES);
}

export function normalizeCombatArchive(raw: unknown): CombatLogEntry[] {
  if (!Array.isArray(raw)) return [];
  const validRanks = new Set<CombatLogEntry['rank']>(['C', 'B', 'A', 'S', 'S+']);
  const out: CombatLogEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Partial<CombatLogEntry>;
    if (typeof obj.moveName !== 'string' || typeof obj.totalDamage !== 'number') continue;
    out.push({
      id: typeof obj.id === 'number' ? obj.id : out.length + 1,
      sequence: typeof obj.sequence === 'string' ? obj.sequence : 'LLH',
      tokens: Array.isArray(obj.tokens)
        ? obj.tokens.filter((t): t is string => typeof t === 'string').slice(0, 6)
        : ['L', 'L', 'H'],
      moveName: obj.moveName,
      hits: typeof obj.hits === 'number' ? Math.max(1, Math.round(obj.hits)) : 3,
      totalDamage: Math.max(1, Math.round(obj.totalDamage)),
      isFinisher: true,
      targetName: typeof obj.targetName === 'string' ? obj.targetName : 'Rival',
      rank: obj.rank && validRanks.has(obj.rank) ? obj.rank : 'A',
    });
    if (out.length >= MAX_COMBAT_ARCHIVE_ENTRIES) break;
  }
  return out;
}

export function getTopArchivedFinishers(
  archive: CombatLogEntry[],
  limit = 3
): CombatLogEntry[] {
  return [...archive]
    .sort((a, b) => b.totalDamage - a.totalDamage || b.hits - a.hits)
    .slice(0, Math.max(1, limit));
}

