import { useEffect, useState } from 'react';
import {
  RANK_EMOTE_REWARDS,
  getUnlockedRankEmotes,
  isRankEmoteUnlocked,
  type RankEmoteId,
} from '../game/rankRewards';
import {
  DOJO_TRADE_OFFERS,
  STORE_ITEMS,
  STORE_TIER_META,
  STORE_TIER_ORDER,
} from '../game/storeCatalog';
import type { StoreInventoryState } from '../game/storeCatalog';
import type { ArenaRankHudState, DojoBlock, EmoteId, StoreTierId } from '../game/types';
import { RankEmblemIcon } from './RankEmblemIcon';

export type TradingPostTab = 'trade' | 'store' | 'rank_rewards';

interface TradingPostModalProps {
  coins: number;
  inventory: StoreInventoryState;
  playerBlocks: DojoBlock[];
  arenaRank: ArenaRankHudState;
  initialTab?: TradingPostTab;
  feedback: string | null;
  onBuyItem: (itemId: string) => void;
  onExecuteTrade: (offerId: string) => void;
  onPreviewEmote: (emoteId: EmoteId) => void;
  onPerformEmote: (emoteId: EmoteId) => void;
  onClose: () => void;
}

function RankPoseIllustration({
  emoteId,
  accentHex,
  secondaryHex,
}: {
  emoteId: RankEmoteId;
  accentHex: string;
  secondaryHex: string;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      className="w-28 h-28 shrink-0"
      aria-hidden="true"
    >
      {/* Stylized kinetic backdrop rings */}
      <circle
        cx="60"
        cy="60"
        r="50"
        fill="#070c18"
        stroke={accentHex}
        strokeWidth="1.5"
        strokeOpacity="0.45"
        strokeDasharray="6 4"
      />
      <circle
        cx="60"
        cy="60"
        r="36"
        fill="none"
        stroke={secondaryHex}
        strokeWidth="1.2"
        strokeOpacity="0.45"
      />

      {emoteId === 'rank_uncharted_flex' && (
        <g stroke={accentHex} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* Twin-bicep power flex silhouette */}
          <circle cx="60" cy="30" r="9" fill={accentHex} stroke="none" />
          <path d="M60 41 L60 72" />
          <path d="M60 47 L36 44 L31 28" />
          <path d="M60 47 L84 44 L89 28" />
          <path d="M60 72 L45 100" />
          <path d="M60 72 L75 100" />
          <path d="M22 36 L27 32 M98 36 L93 32" stroke="#f8fafc" strokeWidth="2.2" />
        </g>
      )}

      {emoteId === 'rank_wilds_prowl' && (
        <g stroke={accentHex} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* Coiled low predator prowl stance */}
          <circle cx="68" cy="42" r="8.5" fill={accentHex} stroke="none" />
          <path d="M64 52 L48 70" />
          <path d="M58 56 L86 58 L95 48" />
          <path d="M54 60 L78 74 L89 70" />
          <path d="M48 70 L32 88 L42 100" />
          <path d="M48 70 L66 86 L62 100" />
          <path d="M90 42 L103 38 M94 52 L106 50" stroke="#f8fafc" strokeWidth="2.2" />
        </g>
      )}

      {emoteId === 'rank_frontier_salute' && (
        <g stroke={accentHex} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* Vanguard fist-to-chest & skyward salute */}
          <circle cx="60" cy="30" r="8.5" fill={accentHex} stroke="none" />
          <path d="M60 41 L60 74" />
          <path d="M60 48 L44 56 L56 60" />
          <path d="M60 48 L78 32 L82 16" />
          <path d="M60 74 L46 101" />
          <path d="M60 74 L74 101" />
          <path d="M82 10 L82 4 M74 14 L69 10 M90 14 L95 10" stroke="#fef08a" strokeWidth="2.4" />
        </g>
      )}

      {emoteId === 'rank_mythic_ascension' && (
        <g stroke={accentHex} strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* Levitating archon arm spread */}
          <ellipse cx="60" cy="96" rx="28" ry="6" stroke={secondaryHex} strokeWidth="2" />
          <circle cx="60" cy="24" r="8.5" fill={accentHex} stroke="none" />
          <path d="M60 35 L60 66" />
          <path d="M60 42 L26 36" />
          <path d="M60 42 L94 36" />
          <path d="M60 66 L50 86" />
          <path d="M60 66 L70 84" />
          <circle cx="60" cy="24" r="14" stroke="#f5d0fe" strokeWidth="1.6" strokeDasharray="3 3" />
        </g>
      )}

      {emoteId === 'rank_cosmic_meditation' && (
        <g stroke={accentHex} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* Transcendent astral lotus levitation */}
          <ellipse cx="60" cy="94" rx="34" ry="7" stroke={secondaryHex} strokeWidth="2" />
          <ellipse cx="60" cy="54" rx="44" ry="13" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="5 4" />
          <circle cx="60" cy="27" r="8.5" fill={accentHex} stroke="none" />
          <path d="M60 37 L60 64" />
          <path d="M60 44 L40 54 L33 49" />
          <path d="M60 44 L80 54 L87 49" />
          <path d="M60 64 L40 76 L62 78" />
          <path d="M60 64 L80 76 L58 78" />
          <circle cx="28" cy="48" r="3" fill="#fef08a" stroke="none" />
          <circle cx="92" cy="48" r="3" fill="#fef08a" stroke="none" />
        </g>
      )}
    </svg>
  );
}

export function TradingPostModal({
  coins,
  inventory,
  playerBlocks,
  arenaRank,
  initialTab = 'trade',
  feedback,
  onBuyItem,
  onExecuteTrade,
  onPreviewEmote,
  onPerformEmote,
  onClose,
}: TradingPostModalProps) {
  const [activeTab, setActiveTab] = useState<TradingPostTab>(initialTab);
  const [tierFilter, setTierFilter] = useState<'all' | StoreTierId>('all');
  const [previewEmoteId, setPreviewEmoteId] = useState<RankEmoteId>('rank_uncharted_flex');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const unlockedRankEmotes = getUnlockedRankEmotes(arenaRank.rank);
  const selectedRankEmote =
    RANK_EMOTE_REWARDS.find((r) => r.id === previewEmoteId) ?? RANK_EMOTE_REWARDS[0];
  const selectedRankEmoteUnlocked = isRankEmoteUnlocked(selectedRankEmote.id, arenaRank.rank);

  const filteredItems =
    tierFilter === 'all'
      ? STORE_ITEMS
      : STORE_ITEMS.filter((item) => item.tier === tierFilter);

  return (
    <div className="fixed inset-0 z-40 bg-[#060a14]/82 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Dojo Trading Post & Nexus Store"
        className="w-full max-w-4xl max-h-[88vh] bg-[#0e1526] border border-slate-700 clip-bevel shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-[#090e1a] border-b border-slate-800">
          <div>
            <div className="font-display font-bold text-2xl tracking-wider uppercase text-white">
              Dojo Trading Post &amp; Store
            </div>
            <p className="text-xs text-slate-400">
              Swap Dojo blocks, unlock tiered Emotes &amp; VIP collectibles, or preview exclusive 1v1 Rank Emote Rewards
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-slate-900 border border-amber-400/50 text-amber-300 font-mono-num text-sm font-bold">
              {coins} COINS
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Trading Post"
              className="w-9 h-9 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-display font-bold text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-[#0b1120] border-b border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Store Sections">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'trade'}
              onClick={() => setActiveTab('trade')}
              className={`px-3.5 py-1.5 font-display font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors ${
                activeTab === 'trade'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700'
              }`}
            >
              Friend Trading Post ({inventory.tradeCount} Swaps)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'store'}
              onClick={() => setActiveTab('store')}
              className={`px-3.5 py-1.5 font-display font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors ${
                activeTab === 'store'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700'
              }`}
            >
              Nexus Tiered Store ({inventory.ownedItemIds.length}/{STORE_ITEMS.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'rank_rewards'}
              onClick={() => setActiveTab('rank_rewards')}
              className={`px-3.5 py-1.5 font-display font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors flex items-center gap-1.5 ${
                activeTab === 'rank_rewards'
                  ? 'bg-sky-400 text-slate-950'
                  : 'bg-slate-900 text-sky-200 hover:bg-slate-800 border border-sky-500/50'
              }`}
            >
              <span>Rank Rewards ({unlockedRankEmotes.length}/{RANK_EMOTE_REWARDS.length})</span>
            </button>
          </div>

          {feedback && (
            <div className="text-xs font-display font-bold uppercase tracking-wide text-emerald-300 truncate">
              {feedback}
            </div>
          )}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'trade' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 bg-slate-900/70 border border-slate-800 px-3.5 py-2">
                <span>Your Active Dojo Inventory ({playerBlocks.length} placed blocks)</span>
                <span className="font-mono-num text-emerald-300">
                  Swaps exchange your Dojo block directly + award bonus Coins
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {DOJO_TRADE_OFFERS.map((offer) => {
                  const ownedCount = playerBlocks.filter((b) => b.type === offer.giveBlockType).length;
                  const canSwap = ownedCount > 0;
                  const doneBefore = inventory.completedTradeIds.includes(offer.id);
                  return (
                    <div
                      key={offer.id}
                      className="bg-slate-900/90 border border-slate-700/90 clip-bevel p-4 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              aria-hidden="true"
                              className="w-2.5 h-2.5 inline-block"
                              style={{ backgroundColor: offer.friendAccentHex }}
                            />
                            <span className="font-display font-bold text-sm uppercase text-white tracking-wider">
                              {offer.friendName}
                            </span>
                            <span className="text-[11px] text-slate-400">{offer.friendTitle}</span>
                          </div>
                          {doneBefore && (
                            <span className="px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-display font-bold text-[10px] uppercase">
                              Traded
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 italic mb-3">“{offer.pitch}”</p>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-950/90 border border-slate-800 px-2.5 py-2">
                            <div className="text-[10px] uppercase text-slate-400">You Give</div>
                            <div className="font-display font-bold text-rose-300">
                              {offer.giveLabel}
                            </div>
                            <div className="font-mono-num text-[10px] text-slate-400 mt-0.5">
                              In Dojo: {ownedCount}
                            </div>
                          </div>
                          <div className="bg-slate-950/90 border border-emerald-500/40 px-2.5 py-2">
                            <div className="text-[10px] uppercase text-slate-400">You Receive</div>
                            <div className="font-display font-bold text-emerald-300">
                              {offer.receiveLabel}
                            </div>
                            <div className="font-mono-num text-[10px] text-amber-300 mt-0.5">
                              +{offer.bonusCoins} Bonus Coins
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!canSwap}
                        onClick={() => onExecuteTrade(offer.id)}
                        className={`clip-angled-sm w-full py-2 font-display font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors ${
                          canSwap
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {canSwap
                          ? `Confirm Swap with ${offer.friendName}`
                          : `Place ${offer.giveLabel} in Dojo First`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'store' && (
            <div className="space-y-4">
              {/* 5-Category Store Tier Filter: Basic, Costly, Expensive, Very Expensive, VIP */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTierFilter('all')}
                  className={`px-3 py-1 text-xs font-display font-bold uppercase cursor-pointer border ${
                    tierFilter === 'all'
                      ? 'bg-white text-slate-950 border-white'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  All Tiers ({STORE_ITEMS.length})
                </button>
                {STORE_TIER_ORDER.map((tierId) => {
                  const meta = STORE_TIER_META[tierId];
                  const active = tierFilter === tierId;
                  return (
                    <button
                      key={tierId}
                      type="button"
                      onClick={() => setTierFilter(tierId)}
                      className={`px-3 py-1 text-xs font-display font-bold uppercase cursor-pointer border transition-colors ${
                        active
                          ? 'bg-amber-400 text-slate-950 border-amber-200'
                          : meta.badgeClass
                      }`}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredItems.map((item) => {
                  const owned = inventory.ownedItemIds.includes(item.id);
                  const canAfford = coins >= item.priceCoins;
                  const tierMeta = STORE_TIER_META[item.tier];
                  return (
                    <div
                      key={item.id}
                      className={`bg-slate-900/90 border clip-bevel p-4 flex flex-col justify-between gap-3 ${
                        item.tier === 'vip'
                          ? 'border-amber-400/70'
                          : owned
                            ? 'border-emerald-500/60'
                            : 'border-slate-700/80'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span
                            className={`px-2 py-0.5 border text-[10px] font-display font-bold uppercase tracking-wider ${tierMeta.badgeClass}`}
                          >
                            {tierMeta.label}
                          </span>
                          <span className="text-[10px] font-mono-num uppercase text-slate-400">
                            {item.kind === 'emote'
                              ? 'EMOTE'
                              : item.kind === 'dojo_decor'
                                ? 'DOJO DECOR'
                                : 'VIP COSMETIC'}
                          </span>
                        </div>
                        <div className="font-display font-bold text-base uppercase text-white tracking-wide">
                          {item.name}
                        </div>
                        <p className="text-xs text-slate-300 mt-1">{item.description}</p>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
                        <span className="font-mono-num text-sm font-bold text-amber-300">
                          {item.priceCoins} COINS
                        </span>
                        <button
                          type="button"
                          disabled={owned || !canAfford}
                          onClick={() => onBuyItem(item.id)}
                          className={`clip-angled-sm px-4 py-1.5 font-display font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors ${
                            owned
                              ? 'bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 cursor-default'
                              : canAfford
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {owned ? 'Owned' : canAfford ? 'Purchase' : 'Need Coins'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'rank_rewards' && (
            <div className="space-y-5">
              {/* Current Arena Tier Banner + Interactive Preview Stage */}
              <div
                aria-label="Rank Emote Preview Stage"
                className="bg-slate-950/90 border clip-bevel p-4 sm:p-5 flex flex-col md:flex-row items-center gap-5"
                style={{ borderColor: `${selectedRankEmote.accentHex}88` }}
              >
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <RankPoseIllustration
                    emoteId={selectedRankEmote.id}
                    accentHex={selectedRankEmote.accentHex}
                    secondaryHex={selectedRankEmote.secondaryHex}
                  />
                  <div className="flex items-center gap-1.5 text-[10px] font-mono-num uppercase text-slate-300">
                    <RankEmblemIcon rank={selectedRankEmote.requiredRank} size={18} />
                    <span>Tier {selectedRankEmote.tier} Emblem</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 text-[10px] font-display font-bold uppercase tracking-wider border bg-slate-900"
                        style={{
                          color: selectedRankEmote.accentHex,
                          borderColor: `${selectedRankEmote.accentHex}80`,
                        }}
                      >
                        Tier {selectedRankEmote.tier}: {selectedRankEmote.tierName}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-display font-bold uppercase ${
                          selectedRankEmoteUnlocked
                            ? 'bg-emerald-500/20 border border-emerald-400/60 text-emerald-300'
                            : 'bg-slate-800 border border-slate-600 text-slate-300'
                        }`}
                      >
                        {selectedRankEmoteUnlocked
                          ? 'Auto-Unlocked'
                          : `Unlocks at Rank #${selectedRankEmote.requiredRank}`}
                      </span>
                    </div>
                    <span className="font-mono-num text-[11px] text-slate-400">
                      Your Rank: #{arenaRank.rank} {arenaRank.rankName}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-xl uppercase tracking-wider text-white">
                    {selectedRankEmote.name}
                  </h3>
                  <div
                    className="text-[11px] font-mono-num font-bold uppercase tracking-wider mb-1.5"
                    style={{ color: selectedRankEmote.accentHex }}
                  >
                    {selectedRankEmote.poseCue}
                  </div>
                  <p className="text-xs text-slate-300 mb-3">{selectedRankEmote.description}</p>

                  {/* Choreography beats */}
                  <div className="flex flex-wrap gap-1.5 mb-3.5">
                    {selectedRankEmote.choreographySteps.map((stepLabel, idx) => (
                      <span
                        key={stepLabel}
                        className="px-2 py-0.5 bg-slate-900 border border-slate-700 text-[10px] font-mono-num text-slate-200"
                      >
                        {idx + 1}. {stepLabel}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedRankEmoteUnlocked) {
                          onPerformEmote(selectedRankEmote.id);
                        } else {
                          onPreviewEmote(selectedRankEmote.id);
                        }
                      }}
                      className="clip-angled-sm px-4 py-2 font-display font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors text-slate-950"
                      style={{ backgroundColor: selectedRankEmote.accentHex }}
                    >
                      {selectedRankEmoteUnlocked
                        ? `Perform ${selectedRankEmote.name} on 3D Hero`
                        : `Preview ${selectedRankEmote.name} on 3D Hero`}
                    </button>
                    <span className="text-[11px] text-slate-400">
                      {selectedRankEmoteUnlocked
                        ? 'Available anytime in your Emote Bar with Emote Spotlight FX.'
                        : `Win 1v1 Arena matches to reach Rank #${selectedRankEmote.requiredRank} and auto-unlock.`}
                    </span>
                  </div>
                </div>
              </div>

              {/* All 5 Exclusive Tier Rank Emote Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {RANK_EMOTE_REWARDS.map((reward) => {
                  const unlocked = isRankEmoteUnlocked(reward.id, arenaRank.rank);
                  const isPreviewing = previewEmoteId === reward.id;
                  return (
                    <div
                      key={reward.id}
                      className={`bg-slate-900/90 border clip-bevel p-3.5 flex flex-col justify-between gap-3 transition-colors ${
                        isPreviewing
                          ? 'border-sky-400 bg-slate-900'
                          : unlocked
                            ? 'border-emerald-500/55'
                            : 'border-slate-700/80'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <RankEmblemIcon rank={reward.requiredRank} size={26} />
                            <div className="leading-tight">
                              <div
                                className="text-[10px] font-display font-bold uppercase tracking-wider"
                                style={{ color: reward.accentHex }}
                              >
                                Tier {reward.tier} · {reward.tierName}
                              </div>
                              <div className="text-[10px] font-mono-num text-slate-400">
                                Rank #{reward.requiredRank}+
                              </div>
                            </div>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-display font-bold uppercase ${
                              unlocked
                                ? 'bg-emerald-500/20 border border-emerald-400/60 text-emerald-300'
                                : 'bg-slate-800 border border-slate-700 text-slate-400'
                            }`}
                          >
                            {unlocked ? 'Unlocked' : 'Locked'}
                          </span>
                        </div>

                        <div className="font-display font-bold text-sm uppercase text-white tracking-wide">
                          {reward.name}
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">
                          {reward.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => setPreviewEmoteId(reward.id)}
                          aria-label={`Preview ${reward.name}`}
                          className={`flex-1 py-1.5 text-[11px] font-display font-bold uppercase tracking-wider cursor-pointer border transition-colors ${
                            isPreviewing
                              ? 'bg-sky-400 text-slate-950 border-sky-200'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-600'
                          }`}
                        >
                          {isPreviewing ? 'Inspecting' : 'Preview'}
                        </button>
                        {unlocked && (
                          <button
                            type="button"
                            onClick={() => onPerformEmote(reward.id)}
                            aria-label={`Use ${reward.name}`}
                            className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-display font-bold uppercase tracking-wider cursor-pointer"
                          >
                            Use
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
