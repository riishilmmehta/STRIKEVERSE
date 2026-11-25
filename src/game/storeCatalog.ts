import type { DojoBlock, DojoBlockType, EmoteId, StoreTierId } from './types';

export interface StoreItemSpec {
  id: string;
  name: string;
  tier: StoreTierId;
  kind: 'emote' | 'dojo_decor' | 'cosmetic';
  priceCoins: number;
  description: string;
  accentHex: string;
  emoteId?: EmoteId;
  decorBlockType?: DojoBlockType;
}

export interface DojoTradeOffer {
  id: string;
  friendName: string;
  friendTitle: string;
  friendAccentHex: string;
  giveBlockType: DojoBlockType;
  giveLabel: string;
  receiveItemId: string;
  receiveLabel: string;
  receiveKind: 'block' | 'decor';
  receiveBlockType: DojoBlockType;
  bonusCoins: number;
  pitch: string;
}

export interface StoreInventoryState {
  ownedItemIds: string[];
  ownedEmotes: EmoteId[];
  completedTradeIds: string[];
  tradeCount: number;
}

export const STORE_TIER_META: Record<
  StoreTierId,
  { id: StoreTierId; label: string; accentHex: string; badgeClass: string }
> = {
  basic: {
    id: 'basic',
    label: 'Basic',
    accentHex: '#94a3b8',
    badgeClass: 'bg-slate-700/80 text-slate-100 border-slate-500',
  },
  costly: {
    id: 'costly',
    label: 'Costly',
    accentHex: '#38bdf8',
    badgeClass: 'bg-sky-500/20 text-sky-200 border-sky-400/60',
  },
  expensive: {
    id: 'expensive',
    label: 'Expensive',
    accentHex: '#a855f7',
    badgeClass: 'bg-purple-500/20 text-purple-200 border-purple-400/60',
  },
  very_expensive: {
    id: 'very_expensive',
    label: 'Very Expensive',
    accentHex: '#f97316',
    badgeClass: 'bg-orange-500/20 text-orange-200 border-orange-400/60',
  },
  vip: {
    id: 'vip',
    label: 'VIP',
    accentHex: '#facc15',
    badgeClass: 'bg-amber-500/25 text-amber-200 border-amber-400',
  },
};

export const STORE_TIER_ORDER: StoreTierId[] = [
  'basic',
  'costly',
  'expensive',
  'very_expensive',
  'vip',
];

export const DEFAULT_OWNED_EMOTES: EmoteId[] = ['flex', 'shadowbox', 'bow', 'dance'];

export const EMOTE_CATALOG: Record<
  EmoteId,
  { id: EmoteId; label: string; key: string; storeOnly?: boolean; rankOnly?: boolean; rankTier?: 1 | 2 | 3 | 4 | 5 }
> = {
  flex: { id: 'flex', label: 'Flex', key: '1' },
  shadowbox: { id: 'shadowbox', label: 'Warmup', key: '2' },
  bow: { id: 'bow', label: 'Dojo Bow', key: '3' },
  dance: { id: 'dance', label: 'Hype', key: '4' },
  backflip: { id: 'backflip', label: 'Sky Flip', key: '5', storeOnly: true },
  meditate: { id: 'meditate', label: 'Zen Float', key: '6', storeOnly: true },
  lightning_pose: { id: 'lightning_pose', label: 'Volt Surge', key: '7', storeOnly: true },
  dragon_roar: { id: 'dragon_roar', label: 'Dragon Roar', key: '8', storeOnly: true },
  throne_salute: { id: 'throne_salute', label: 'Omni Crown', key: '9', storeOnly: true },
  rank_uncharted_flex: { id: 'rank_uncharted_flex', label: 'Uncharted Flex', key: 'R1', rankOnly: true, rankTier: 1 },
  rank_wilds_prowl: { id: 'rank_wilds_prowl', label: 'Wilds Prowl', key: 'R2', rankOnly: true, rankTier: 2 },
  rank_frontier_salute: { id: 'rank_frontier_salute', label: 'Frontier Salute', key: 'R3', rankOnly: true, rankTier: 3 },
  rank_mythic_ascension: { id: 'rank_mythic_ascension', label: 'Mythic Ascend', key: 'R4', rankOnly: true, rankTier: 4 },
  rank_cosmic_meditation: { id: 'rank_cosmic_meditation', label: 'Cosmic Meditate', key: 'R5', rankOnly: true, rankTier: 5 },
};

export const STORE_ITEMS: StoreItemSpec[] = [
  // BASIC
  {
    id: 'emote-backflip',
    name: 'Sky Flip Emote',
    tier: 'basic',
    kind: 'emote',
    priceCoins: 110,
    description: 'Acrobatic mid-air somersault emote for Hub & Spotlight combos.',
    accentHex: '#38bdf8',
    emoteId: 'backflip',
  },
  {
    id: 'decor-paper-lantern',
    name: 'Crimson Festival Lantern',
    tier: 'basic',
    kind: 'dojo_decor',
    priceCoins: 90,
    description: 'Hand-crafted glowing Dojo lantern for courtyard corners.',
    accentHex: '#f43f5e',
    decorBlockType: 'lantern',
  },
  // COSTLY
  {
    id: 'emote-meditate',
    name: 'Zen Float Emote',
    tier: 'costly',
    kind: 'emote',
    priceCoins: 240,
    description: 'Levitate cross-legged in golden martial focus.',
    accentHex: '#34d399',
    emoteId: 'meditate',
  },
  {
    id: 'decor-jade-bonsai',
    name: 'Jade Bonsai Shrine',
    tier: 'costly',
    kind: 'dojo_decor',
    priceCoins: 280,
    description: 'Sculpted ceremonial centerpiece trophy for your Dojo.',
    accentHex: '#10b981',
    decorBlockType: 'trophy',
  },
  // EXPENSIVE
  {
    id: 'emote-lightning',
    name: 'Volt Surge Emote',
    tier: 'expensive',
    kind: 'emote',
    priceCoins: 480,
    description: 'Crackling stance channeling twin sky-bolts through your fists.',
    accentHex: '#a855f7',
    emoteId: 'lightning_pose',
  },
  {
    id: 'decor-sonic-pad',
    name: 'Turbo Neon Dash Pad',
    tier: 'expensive',
    kind: 'dojo_decor',
    priceCoins: 540,
    description: 'High-output Dojo velocity pad for rapid Clan Siege flanks.',
    accentHex: '#22d3ee',
    decorBlockType: 'dashpad',
  },
  // VERY EXPENSIVE
  {
    id: 'emote-dragon-roar',
    name: 'Dragon Roar Emote',
    tier: 'very_expensive',
    kind: 'emote',
    priceCoins: 880,
    description: 'Unleash a towering martial aura roar that shakes the plaza.',
    accentHex: '#f97316',
    emoteId: 'dragon_roar',
  },
  {
    id: 'cosmetic-astral-crest',
    name: 'Solar Forge Trophy Pack',
    tier: 'very_expensive',
    kind: 'cosmetic',
    priceCoins: 1050,
    description: 'Prestige golden Dojo trophy & elite sparring badge.',
    accentHex: '#fb923c',
    decorBlockType: 'trophy',
  },
  // VIP
  {
    id: 'emote-throne-salute',
    name: 'Omni Crown Salute',
    tier: 'vip',
    kind: 'emote',
    priceCoins: 1650,
    description: 'VIP Apex sovereign emote with ascending halo pose.',
    accentHex: '#facc15',
    emoteId: 'throne_salute',
  },
  {
    id: 'vip-celestial-vault',
    name: 'VIP Celestial Dojo Vault',
    tier: 'vip',
    kind: 'cosmetic',
    priceCoins: 2200,
    description: 'VIP prestige collection: Grand Trophy + Kinetic Bounce Pad.',
    accentHex: '#fde047',
    decorBlockType: 'trampoline',
  },
];

export const DOJO_TRADE_OFFERS: DojoTradeOffer[] = [
  {
    id: 'trade-sora-pad',
    friendName: 'SORA',
    friendTitle: 'Nexus Striker',
    friendAccentHex: '#38bdf8',
    giveBlockType: 'crate',
    giveLabel: '1x Breakable Crate',
    receiveItemId: 'trade-reward-trampoline',
    receiveLabel: '1x Kinetic Trampoline',
    receiveKind: 'block',
    receiveBlockType: 'trampoline',
    bonusCoins: 35,
    pitch: 'Need crates for my juggle drill — trade you a fresh Trampoline + 35c!',
  },
  {
    id: 'trade-miko-lantern',
    friendName: 'MIKO',
    friendTitle: 'Zen Decorator',
    friendAccentHex: '#34d399',
    giveBlockType: 'lantern',
    giveLabel: '1x Dojo Lantern',
    receiveItemId: 'trade-reward-trophy',
    receiveLabel: '1x Golden Honor Trophy',
    receiveKind: 'decor',
    receiveBlockType: 'trophy',
    bonusCoins: 45,
    pitch: 'Swapping my extra Honor Trophy for a courtyard Lantern!',
  },
  {
    id: 'trade-jax-dash',
    friendName: 'JAX',
    friendTitle: 'Iron Titan',
    friendAccentHex: '#fb7185',
    giveBlockType: 'trampoline',
    giveLabel: '1x Kinetic Trampoline',
    receiveItemId: 'trade-reward-dashpad',
    receiveLabel: '1x Velocity Dash Pad',
    receiveKind: 'block',
    receiveBlockType: 'dashpad',
    bonusCoins: 40,
    pitch: 'Trade me a Trampoline and take my heavy-duty Velocity Dash Pad.',
  },
  {
    id: 'trade-ren-dummy',
    friendName: 'REN',
    friendTitle: 'Dojo Scout',
    friendAccentHex: '#fbbf24',
    giveBlockType: 'dashpad',
    giveLabel: '1x Velocity Dash Pad',
    receiveItemId: 'trade-reward-dummy',
    receiveLabel: '1x AI Sparring Dummy',
    receiveKind: 'block',
    receiveBlockType: 'dummy',
    bonusCoins: 50,
    pitch: 'Want another sparring partner? Swap a Dash Pad for my calibrated Dummy.',
  },
];

export const DEFAULT_STORE_STATE: StoreInventoryState = {
  ownedItemIds: [],
  ownedEmotes: [...DEFAULT_OWNED_EMOTES],
  completedTradeIds: [],
  tradeCount: 0,
};

export function normalizeStoreState(
  raw: Partial<StoreInventoryState> | null | undefined
): StoreInventoryState {
  if (!raw || typeof raw !== 'object') {
    return {
      ownedItemIds: [],
      ownedEmotes: [...DEFAULT_OWNED_EMOTES],
      completedTradeIds: [],
      tradeCount: 0,
    };
  }
  const ownedItemIds = Array.isArray(raw.ownedItemIds)
    ? raw.ownedItemIds.filter((s): s is string => typeof s === 'string')
    : [];
  const rawEmotes = Array.isArray(raw.ownedEmotes)
    ? raw.ownedEmotes.filter((e): e is EmoteId => Boolean(EMOTE_CATALOG[e as EmoteId]))
    : [];
  const ownedEmotes = Array.from(new Set([...DEFAULT_OWNED_EMOTES, ...rawEmotes]));
  const completedTradeIds = Array.isArray(raw.completedTradeIds)
    ? raw.completedTradeIds.filter((s): s is string => typeof s === 'string')
    : [];
  const tradeCount =
    typeof raw.tradeCount === 'number' && Number.isFinite(raw.tradeCount)
      ? Math.max(0, Math.floor(raw.tradeCount))
      : 0;
  return { ownedItemIds, ownedEmotes, completedTradeIds, tradeCount };
}

export function purchaseStoreItem(
  state: StoreInventoryState,
  itemId: string,
  currentCoins: number
): {
  purchased: boolean;
  state: StoreInventoryState;
  remainingCoins: number;
  item?: StoreItemSpec;
  reason?: string;
} {
  const item = STORE_ITEMS.find((i) => i.id === itemId);
  if (!item) {
    return { purchased: false, state, remainingCoins: currentCoins, reason: 'Item not found' };
  }
  if (state.ownedItemIds.includes(item.id)) {
    return { purchased: false, state, remainingCoins: currentCoins, item, reason: 'Already owned' };
  }
  if (currentCoins < item.priceCoins) {
    return {
      purchased: false,
      state,
      remainingCoins: currentCoins,
      item,
      reason: `Need ${item.priceCoins - currentCoins} more coins`,
    };
  }
  const nextEmotes =
    item.emoteId && !state.ownedEmotes.includes(item.emoteId)
      ? [...state.ownedEmotes, item.emoteId]
      : state.ownedEmotes;

  return {
    purchased: true,
    state: {
      ...state,
      ownedItemIds: [...state.ownedItemIds, item.id],
      ownedEmotes: nextEmotes,
    },
    remainingCoins: currentCoins - item.priceCoins,
    item,
  };
}

export function executeDojoTrade(
  state: StoreInventoryState,
  offerId: string,
  dojoBlocks: DojoBlock[]
): {
  traded: boolean;
  state: StoreInventoryState;
  blocks: DojoBlock[];
  bonusCoins: number;
  offer?: DojoTradeOffer;
  reason?: string;
} {
  const offer = DOJO_TRADE_OFFERS.find((o) => o.id === offerId);
  if (!offer) {
    return { traded: false, state, blocks: dojoBlocks, bonusCoins: 0, reason: 'Offer not found' };
  }

  const swapIdx = dojoBlocks.findIndex((b) => b.type === offer.giveBlockType);
  if (swapIdx < 0) {
    return {
      traded: false,
      state,
      blocks: dojoBlocks,
      bonusCoins: 0,
      offer,
      reason: `Place ${offer.giveLabel} in your Dojo first`,
    };
  }

  // Swap the matched Dojo block cleanly in-place into the received block/decoration!
  const updatedBlocks = dojoBlocks.map((b, idx) =>
    idx === swapIdx
      ? {
          ...b,
          id: `traded-${offer.receiveBlockType}-${Date.now()}-${idx}`,
          type: offer.receiveBlockType,
          dummyVariant: offer.receiveBlockType === 'dummy' ? ('kaito_duelist' as const) : undefined,
        }
      : { ...b }
  );

  const nextCompleted = state.completedTradeIds.includes(offer.id)
    ? state.completedTradeIds
    : [...state.completedTradeIds, offer.id];

  return {
    traded: true,
    state: {
      ...state,
      completedTradeIds: nextCompleted,
      tradeCount: state.tradeCount + 1,
    },
    blocks: updatedBlocks,
    bonusCoins: offer.bonusCoins,
    offer,
  };
}
