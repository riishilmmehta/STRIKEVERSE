import { useEffect, useMemo, useRef, useState } from 'react';
import { ClanSiegeModal } from './components/ClanSiegeModal';
import { CustomizeStudio } from './components/CustomizeStudio';
import { DailyRewardModal } from './components/DailyRewardModal';
import { DojoLeaderboardModal } from './components/DojoLeaderboardModal';
import { GameHud } from './components/GameHud';
import { GtaLoadingScreen } from './components/GtaLoadingScreen';
import { LobbyControls } from './components/LobbyControls';
import { OfflineIndicator } from './components/OfflineIndicator';
import { MatchEndModal, PauseModal } from './components/StatusModals';
import { StudioLogoCinematic } from './components/StudioLogoCinematic';
import { TitleScreen } from './components/TitleScreen';
import { TouchControls } from './components/TouchControls';
import { TradingPostModal, type TradingPostTab } from './components/TradingPostModal';
import { DEFAULT_CLAN_EMBLEM } from './game/clanEmblem';
import { getRivalClanForDojoId } from './game/clanSiege';
import type { ClanSiegeLaunchConfig } from './game/clanSiege';
import {
  AURA_HEX,
  COMBO_DECAY_DURATION,
  DEFAULT_CUSTOMIZATION,
  HERO_CLASSES,
  INITIAL_DAILY_QUESTS,
  PET_ABILITIES,
} from './game/combatRules';
import {
  DEFAULT_DAILY_STREAK_STATE,
  claimDailyReward,
  evaluateDailyStreak,
} from './game/dailyStreak';
import type { DailyStreakState } from './game/dailyStreak';
import { DEFAULT_DOJO_AUDIO_TRACK } from './game/dojoAudio';
import {
  DEFAULT_DOJO_SOCIAL_STATE,
  buildDojoLeaderboard,
  promotePlayerDojo,
  recordDojoVisit,
  toggleDojoLike,
  updatePlayerDojoName,
} from './game/dojoLeaderboard';
import type {
  DojoLeaderboardEntry,
  DojoLeaderboardSort,
  DojoSocialState,
} from './game/dojoLeaderboard';
import { DEFAULT_DOJO_BLOCKS } from './game/dojoRules';
import { StrikeverseEngine } from './game/engine';
import { DEFAULT_OWNED_EMOTES, DEFAULT_STORE_STATE } from './game/storeCatalog';
import type { StoreInventoryState } from './game/storeCatalog';
import {
  loadClanEmblem,
  loadCustomization,
  loadDailyStreakState,
  loadDojoBlocks,
  loadDojoSocialState,
  loadStoreInventory,
  saveDailyStreakState,
  saveDojoSocialState,
} from './game/storage';
import type {
  ClanEmblemConfig,
  DojoBlock,
  EmoteId,
  GamePhase,
  HeroCustomization,
  HudSnapshot,
  MatchSummary,
  WorldZone,
} from './game/types';

const INITIAL_HUD: HudSnapshot = {
  zone: 'hub',
  hp: 240,
  maxHp: 240,
  ghostHp: 240,
  stamina: 100,
  maxStamina: 100,
  ultimate: 35,
  skillCooldown: 0,
  skillMaxCooldown: 4.5,
  skillName: HERO_CLASSES.striker.skillName,
  comboCount: 0,
  comboMoveName: '',
  comboSequence: '',
  comboTimer: 0,
  comboMaxTimer: COMBO_DECAY_DURATION,
  finisherActive: false,
  finisherName: '',
  nextFinisherHint: null,
  petType: 'drone',
  petAbilityName: PET_ABILITIES.drone.abilityName,
  petCooldown: 0,
  petMaxCooldown: PET_ABILITIES.drone.cooldown,
  isBlocking: false,
  isUltimateActive: false,
  autoAssist: true,
  coins: 350,
  level: 1,
  xp: 0,
  xpToNext: 120,
  wins: 0,
  highestBossCleared: -1,
  activeBossIndex: 0,
  opponent: null,
  royaleAlive: 6,
  royaleTotal: 6,
  royaleRingRadius: 23,
  portalPrompt: null,
  callout: null,
  damagePopups: [],
  combatLog: [],
  combatArchive: [],
  milestoneFlash: null,
  emoteSpotlightName: null,
  dojoMode: 'play',
  selectedDojoBlock: 'dummy',
  selectedDummyVariant: 'kaito_duelist',
  dojoBlockCount: 8,
  activeDummyCount: 1,
  dojoWeather: 'clear_day',
  dojoWeatherCycle: false,
  unlockedDojoWeathers: ['clear_day'],
  dojoAudioTrack: DEFAULT_DOJO_AUDIO_TRACK,
  activeAudioTrack: null,
  visitingDojo: null,
  clanSiege: null,
  spectatorActive: false,
  spectatorEventLabel: 'LIVE DOJO DUEL · AUTO-CAM',
  arenaRank: {
    rank: 1,
    rankName: 'Stray',
    tier: 1,
    tierName: 'The Uncharted',
    accentHex: '#e2e8f0',
    winsInRank: 0,
    winsRequired: 1,
    totalArenaWins: 0,
    selectedBiome: 'salt_flats',
    biomeName: 'Salt Flats & Mirrors',
    biomeHazardNote: 'Zero Cover · Mirror Glare',
  },
  ownedEmotes: [...DEFAULT_OWNED_EMOTES],
  hubBotCount: 8,
  nearbyHubFighter: null,
  hubMinimap: null,
  arenaRounds: null,
  roundBanner: null,
  parryCounterReady: false,
  matchFinishOverlay: null,
  muted: false,
  dailyQuests: INITIAL_DAILY_QUESTS,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<StrikeverseEngine | null>(null);

  const [phase, setPhase] = useState<GamePhase>('title');
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [hero, setHero] = useState<HeroCustomization>(() =>
    typeof window !== 'undefined' ? loadCustomization() : DEFAULT_CUSTOMIZATION
  );
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [clanSiegeOpen, setClanSiegeOpen] = useState(false);
  const [tradingPostOpen, setTradingPostOpen] = useState(false);
  const [tradingPostTab, setTradingPostTab] = useState<TradingPostTab>('trade');
  const [storeInventory, setStoreInventory] = useState<StoreInventoryState>(() =>
    typeof window !== 'undefined' ? loadStoreInventory() : DEFAULT_STORE_STATE
  );
  const [tradeFeedback, setTradeFeedback] = useState<string | null>(null);
  const [leaderboardSort, setLeaderboardSort] = useState<DojoLeaderboardSort>('popularity');
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [promoteFeedback, setPromoteFeedback] = useState<string | null>(null);
  const [dojoSocial, setDojoSocial] = useState<DojoSocialState>(() =>
    typeof window !== 'undefined' ? loadDojoSocialState() : DEFAULT_DOJO_SOCIAL_STATE
  );
  const [playerDojoBlocks, setPlayerDojoBlocks] = useState<DojoBlock[]>(() =>
    typeof window !== 'undefined' ? loadDojoBlocks() : DEFAULT_DOJO_BLOCKS
  );
  const [dailyStreak, setDailyStreak] = useState<DailyStreakState>(() =>
    typeof window !== 'undefined' ? loadDailyStreakState() : DEFAULT_DAILY_STREAK_STATE
  );
  const [clanEmblem, setClanEmblem] = useState<ClanEmblemConfig>(() =>
    typeof window !== 'undefined' ? loadClanEmblem() : DEFAULT_CLAN_EMBLEM
  );
  const [dailyRewardOpen, setDailyRewardOpen] = useState(false);
  const [justClaimedCoins, setJustClaimedCoins] = useState<number | null>(null);
  const [matchSummary, setMatchSummary] = useState<MatchSummary | null>(null);

  const [openingStage, setOpeningStage] = useState<'studio' | 'loading' | 'ready'>(() => {
    if (typeof window === 'undefined') return 'ready';
    const params = new URLSearchParams(window.location.search);
    if (params.get('loading') === '1') return 'loading';
    if (params.get('intro') === '1') return 'studio';
    if (params.get('autostart') === '1') return 'ready';
    return 'studio';
  });
  const [holdLoadingPreview] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('loading') === '1';
  });
  const [zoneTransition, setZoneTransition] = useState<{
    id: number;
    destinationLabel: string;
  } | null>(null);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new StrikeverseEngine(mount, {
      onHudUpdate: (snapshot) => setHud(snapshot),
      onPhaseChange: (nextPhase) => {
        setPhase(nextPhase);
        if (nextPhase !== 'gameover') {
          setMatchSummary(null);
        }
      },
      onMatchEnd: (summary) => setMatchSummary(summary),
      onOpenCustomize: () => {
        setLeaderboardOpen(false);
        setClanSiegeOpen(false);
        setTradingPostOpen(false);
        engine.setLeaderboardOpen(false);
        engine.setClanSiegeOpen(false);
        engine.setTradingPostOpen(false);
        setCustomizeOpen(true);
        engine.setCustomizeOpen(true);
      },
      onCloseCustomize: () => {
        setCustomizeOpen(false);
      },
      onOpenDojoLeaderboard: () => {
        setCustomizeOpen(false);
        setClanSiegeOpen(false);
        setTradingPostOpen(false);
        engine.setCustomizeOpen(false);
        engine.setClanSiegeOpen(false);
        engine.setTradingPostOpen(false);
        setPlayerDojoBlocks(engine.getPlayerDojoBlocks());
        setPromoteFeedback(null);
        setLeaderboardOpen(true);
        engine.setLeaderboardOpen(true);
      },
      onCloseDojoLeaderboard: () => {
        setLeaderboardOpen(false);
      },
      onOpenClanSiege: () => {
        setCustomizeOpen(false);
        setLeaderboardOpen(false);
        setTradingPostOpen(false);
        engine.setCustomizeOpen(false);
        engine.setLeaderboardOpen(false);
        engine.setTradingPostOpen(false);
        setPlayerDojoBlocks(engine.getPlayerDojoBlocks());
        setClanSiegeOpen(true);
        engine.setClanSiegeOpen(true);
      },
      onCloseClanSiege: () => {
        setClanSiegeOpen(false);
      },
      onOpenTradingPost: () => {
        setCustomizeOpen(false);
        setLeaderboardOpen(false);
        setClanSiegeOpen(false);
        engine.setCustomizeOpen(false);
        engine.setLeaderboardOpen(false);
        engine.setClanSiegeOpen(false);
        setPlayerDojoBlocks(engine.getPlayerDojoBlocks());
        setStoreInventory(engine.getStoreInventory());
        setTradeFeedback(null);
        setTradingPostOpen(true);
        engine.setTradingPostOpen(true);
      },
      onCloseTradingPost: () => {
        setTradingPostOpen(false);
      },
    });
    engineRef.current = engine;
    setHero(engine.getCustomization());
    setPlayerDojoBlocks(engine.getPlayerDojoBlocks());
    setStoreInventory(engine.getStoreInventory());

    // Support ?autostart=1 for direct gameplay entry & testing
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      const targetZone = (params.get('zone') as WorldZone) || 'hub';
      engine.startGame(targetZone);
      const demo = params.get('demo');
      if (demo === 'victory' || demo === 'defeat') {
        window.setTimeout(() => {
          engine.triggerDemoMatchEnd(demo === 'victory');
        }, 280);
      }
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const launchWithLoading = (destinationLabel: string, action: () => void) => {
    action();
    setZoneTransition({
      id: Date.now(),
      destinationLabel,
    });
  };

  const handleStart = (zone: WorldZone) => {
    setCustomizeOpen(false);
    setDailyRewardOpen(false);
    engineRef.current?.setTitleModalOpen(false);
    const label = zone === 'arena' ? '1v1 Arena' : 'Nexus City';
    launchWithLoading(label, () => engineRef.current?.startGame(zone));
  };

  const handleOpenDailyReward = () => {
    setJustClaimedCoins(null);
    setDailyRewardOpen(true);
    engineRef.current?.setTitleModalOpen(true);
  };

  const handleCloseDailyReward = () => {
    setDailyRewardOpen(false);
    engineRef.current?.setTitleModalOpen(false);
  };

  const handleClaimDailyReward = () => {
    const result = claimDailyReward(dailyStreak);
    if (!result.claimed) return;
    setDailyStreak(result.state);
    saveDailyStreakState(result.state);
    setJustClaimedCoins(result.rewardCoins);
    engineRef.current?.grantBonusCoins(result.rewardCoins);
  };

  const dailyStreakSummary = useMemo(() => evaluateDailyStreak(dailyStreak), [dailyStreak]);

  useEffect(() => {
    if (!dailyRewardOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        setDailyRewardOpen(false);
        engineRef.current?.setTitleModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dailyRewardOpen]);

  const handleOpenCustomize = () => {
    if (phase === 'title') {
      engineRef.current?.startGame('hub');
    }
    setLeaderboardOpen(false);
    engineRef.current?.setLeaderboardOpen(false);
    setCustomizeOpen(true);
    engineRef.current?.setCustomizeOpen(true);
  };

  const handleCloseCustomize = () => {
    setCustomizeOpen(false);
    engineRef.current?.setCustomizeOpen(false);
  };

  const handleOpenLeaderboard = () => {
    setCustomizeOpen(false);
    setClanSiegeOpen(false);
    engineRef.current?.setCustomizeOpen(false);
    engineRef.current?.setClanSiegeOpen(false);
    if (engineRef.current) {
      setPlayerDojoBlocks(engineRef.current.getPlayerDojoBlocks());
      engineRef.current.setLeaderboardOpen(true);
    }
    setPromoteFeedback(null);
    setLeaderboardOpen(true);
  };

  const handleCloseLeaderboard = () => {
    setLeaderboardOpen(false);
    engineRef.current?.setLeaderboardOpen(false);
  };

  const handleOpenClanSiege = () => {
    setCustomizeOpen(false);
    setLeaderboardOpen(false);
    engineRef.current?.setCustomizeOpen(false);
    engineRef.current?.setLeaderboardOpen(false);
    if (engineRef.current) {
      setPlayerDojoBlocks(engineRef.current.getPlayerDojoBlocks());
      engineRef.current.setClanSiegeOpen(true);
    }
    setClanSiegeOpen(true);
  };

  const handleCloseClanSiege = () => {
    setClanSiegeOpen(false);
    engineRef.current?.setClanSiegeOpen(false);
  };

  const handleOpenTradingPost = (tab: TradingPostTab = 'trade') => {
    setCustomizeOpen(false);
    setLeaderboardOpen(false);
    setClanSiegeOpen(false);
    engineRef.current?.setCustomizeOpen(false);
    engineRef.current?.setLeaderboardOpen(false);
    engineRef.current?.setClanSiegeOpen(false);
    if (engineRef.current) {
      setPlayerDojoBlocks(engineRef.current.getPlayerDojoBlocks());
      setStoreInventory(engineRef.current.getStoreInventory());
      engineRef.current.setTradingPostOpen(true);
    }
    setTradeFeedback(null);
    setTradingPostTab(tab);
    setTradingPostOpen(true);
  };

  const handleCloseTradingPost = () => {
    setTradingPostOpen(false);
    engineRef.current?.setTradingPostOpen(false);
  };

  const handlePreviewRankEmote = (emoteId: EmoteId) => {
    setTradingPostOpen(false);
    engineRef.current?.setTradingPostOpen(false);
    engineRef.current?.previewRankEmote(emoteId);
  };

  const handlePerformRankEmote = (emoteId: EmoteId) => {
    setTradingPostOpen(false);
    engineRef.current?.setTradingPostOpen(false);
    engineRef.current?.triggerEmote(emoteId);
  };

  const handleBuyStoreItem = (itemId: string) => {
    if (!engineRef.current) return;
    const res = engineRef.current.buyStoreItem(itemId);
    setStoreInventory(res.inventory);
    setTradeFeedback(res.message);
  };

  const handleExecuteTrade = (offerId: string) => {
    if (!engineRef.current) return;
    const res = engineRef.current.tradeDojoOffer(offerId);
    setStoreInventory(res.inventory);
    setPlayerDojoBlocks(engineRef.current.getPlayerDojoBlocks());
    setTradeFeedback(res.message);
  };

  const handleLaunchClanSiege = (config: ClanSiegeLaunchConfig) => {
    setClanSiegeOpen(false);
    setLeaderboardOpen(false);
    engineRef.current?.launchClanSiege(config, dojoSocial.playerDojoName);
  };

  const handleSaveClanEmblem = (next: ClanEmblemConfig) => {
    setClanEmblem(next);
    engineRef.current?.updateClanEmblem(next);
  };

  const handleVisitNexusEntrance = () => {
    setClanSiegeOpen(false);
    engineRef.current?.setClanSiegeOpen(false);
    engineRef.current?.switchZone('hub');
  };

  const handleSiegeCommunityDojo = (entry: DojoLeaderboardEntry) => {
    const { state } = recordDojoVisit(dojoSocial, entry.id);
    updateSocial(state);
    const rival = getRivalClanForDojoId(entry.id);
    handleLaunchClanSiege({
      format: '2v2',
      rivalClanId: rival.id,
      venue: 'rival_dojo',
      customDojoId: entry.id,
      customDojoName: entry.dojoName,
      customOwnerName: entry.ownerName,
      customBlocks: entry.blocks,
    });
  };

  const handleSiegeVisitingDojo = () => {
    if (!hud.visitingDojo) return;
    const match = allLeaderboardEntries.find((e) => e.id === hud.visitingDojo?.id);
    if (match) {
      handleSiegeCommunityDojo(match);
    } else {
      handleOpenClanSiege();
    }
  };

  const updateSocial = (next: DojoSocialState) => {
    setDojoSocial(next);
    saveDojoSocialState(next);
  };

  const handleToggleDojoLike = (entryId: string) => {
    const { state } = toggleDojoLike(dojoSocial, entryId);
    updateSocial(state);
  };

  const handleVisitDojo = (entry: DojoLeaderboardEntry) => {
    const { state } = recordDojoVisit(dojoSocial, entry.id);
    updateSocial(state);
    setLeaderboardOpen(false);
    engineRef.current?.visitCommunityDojo({
      id: entry.id,
      ownerName: entry.ownerName,
      dojoName: entry.dojoName,
      themeTag: entry.themeTag,
      blocks: entry.blocks,
    });
  };

  const handleOpenMyDojo = () => {
    setLeaderboardOpen(false);
    setClanSiegeOpen(false);
    engineRef.current?.returnToMyDojo();
  };

  const handlePromoteDojo = () => {
    const blocks = engineRef.current?.getPlayerDojoBlocks() ?? playerDojoBlocks;
    setPlayerDojoBlocks(blocks);
    const { state, gainedVisits, gainedLikes } = promotePlayerDojo(dojoSocial, blocks.length);
    updateSocial(state);
    setPromoteFeedback(`+${gainedVisits} visits · +${gainedLikes} likes`);
  };

  const handleRenameMyDojo = (nextName: string) => {
    updateSocial(updatePlayerDojoName(dojoSocial, nextName));
  };

  const allLeaderboardEntries = useMemo(
    () =>
      buildDojoLeaderboard({
        social: dojoSocial,
        playerName: hero.name,
        playerClassId: hero.classId,
        playerAccentHex: AURA_HEX[hero.aura],
        playerBlocks: playerDojoBlocks,
        sortBy: leaderboardSort,
      }),
    [dojoSocial, hero.name, hero.classId, hero.aura, playerDojoBlocks, leaderboardSort]
  );

  const filteredLeaderboardEntries = useMemo(
    () =>
      buildDojoLeaderboard({
        social: dojoSocial,
        playerName: hero.name,
        playerClassId: hero.classId,
        playerAccentHex: AURA_HEX[hero.aura],
        playerBlocks: playerDojoBlocks,
        sortBy: leaderboardSort,
        searchQuery: leaderboardSearch,
      }),
    [
      dojoSocial,
      hero.name,
      hero.classId,
      hero.aura,
      playerDojoBlocks,
      leaderboardSort,
      leaderboardSearch,
    ]
  );

  const visitingLiked = hud.visitingDojo
    ? dojoSocial.likedEntryIds.includes(hud.visitingDojo.id)
    : false;

  const handleUpdateHero = (next: HeroCustomization) => {
    setHero(next);
    engineRef.current?.updateCustomization(next);
  };

  return (
    <main className="relative w-full h-full overflow-hidden bg-[#0b101b]">
      {/* Isolated WebGL canvas mount container (never torn down by React HUD re-renders) */}
      <div
        ref={canvasMountRef}
        data-testid="strikeverse-canvas"
        className="fixed inset-0 w-full h-full"
      />

      {phase === 'title' && (
        <TitleScreen
          hero={hero}
          wins={hud.wins}
          level={hud.level}
          coins={hud.coins}
          dailyStreak={dailyStreakSummary}
          onStart={handleStart}
          onOpenCustomize={handleOpenCustomize}
          onOpenDailyReward={handleOpenDailyReward}
        />
      )}

      {phase === 'title' && dailyRewardOpen && (
        <DailyRewardModal
          summary={dailyStreakSummary}
          coins={hud.coins}
          justClaimedCoins={justClaimedCoins}
          onClaim={handleClaimDailyReward}
          onEnterGame={() => handleStart('hub')}
          onClose={handleCloseDailyReward}
        />
      )}

      {phase === 'playing' && !customizeOpen && (
        <>
          <GameHud
            hud={hud}
            hero={hero}
            onSwitchZone={(z, bossIdx) => engineRef.current?.switchZone(z, bossIdx)}
            onOpenCustomize={handleOpenCustomize}
            onOpenLeaderboard={handleOpenLeaderboard}
            onOpenClanSiege={handleOpenClanSiege}
            onOpenTradingPost={() => handleOpenTradingPost('trade')}
            onOpenRankRewards={() => handleOpenTradingPost('rank_rewards')}
            onToggleMute={() => engineRef.current?.toggleMute()}
            onPause={() => engineRef.current?.setPaused(true)}
            onEmote={(em) => engineRef.current?.triggerEmote(em)}
            onPortalInteract={() => engineRef.current?.triggerPortalInteract()}
            onDojoMode={(m) => engineRef.current?.setDojoMode(m)}
            onSelectDojoBlock={(t) => engineRef.current?.setSelectedDojoBlock(t)}
            onSelectDummyVariant={(v) => engineRef.current?.setSelectedDummyVariant(v)}
            onSelectDojoWeather={(w) => engineRef.current?.setDojoWeather(w)}
            onToggleWeatherCycle={() => engineRef.current?.toggleDojoWeatherCycle()}
            onSelectDojoAudio={(t) => engineRef.current?.setDojoAudioTrack(t)}
            onToggleSpectator={() => engineRef.current?.toggleSpectatorMode()}
            onSelectArenaBiome={(b) => engineRef.current?.selectArenaBiome(b)}
            onPlaceDojoBlock={() => {
              engineRef.current?.placeDojoBlockInFront();
              if (engineRef.current) setPlayerDojoBlocks(engineRef.current.getPlayerDojoBlocks());
            }}
            onRemoveDojoBlock={() => {
              engineRef.current?.removeNearestDojoBlock();
              if (engineRef.current) setPlayerDojoBlocks(engineRef.current.getPlayerDojoBlocks());
            }}
            visitingLiked={visitingLiked}
            onToggleVisitingLike={() => {
              if (hud.visitingDojo) handleToggleDojoLike(hud.visitingDojo.id);
            }}
            onSiegeVisitingDojo={handleSiegeVisitingDojo}
            onReturnToMyDojo={handleOpenMyDojo}
          />

          {/* ARCHITECTURAL SPLIT: Lobby UI (hub) vs Battle Combat Controls (in_match) */}
          {!leaderboardOpen && !clanSiegeOpen && !tradingPostOpen && hud.zone === 'hub' && (
            <LobbyControls
              minimap={hud.hubMinimap}
              nearbyFighter={hud.nearbyHubFighter}
              hasPortalPrompt={Boolean(hud.portalPrompt)}
              ownedEmotes={hud.ownedEmotes}
              onJoystick={(dx, dz) => engineRef.current?.setJoystick(dx, dz, false)}
              onEmote={(em) => engineRef.current?.triggerEmote(em)}
              onChallengeFighter={(id) => engineRef.current?.challengeHubFighter(id)}
              onOpenTradingPost={() => handleOpenTradingPost('trade')}
              onOpenClanSiege={handleOpenClanSiege}
            />
          )}

          {!leaderboardOpen &&
            !clanSiegeOpen &&
            !tradingPostOpen &&
            hud.zone !== 'hub' &&
            !(hud.zone === 'dojo' && hud.dojoMode === 'build') &&
            !hud.spectatorActive && (
              <TouchControls
                skillCooldown={hud.skillCooldown}
                skillMaxCooldown={hud.skillMaxCooldown}
                skillName={hud.skillName}
                petEnabled={hud.petType !== 'none'}
                petCooldown={hud.petCooldown}
                petMaxCooldown={hud.petMaxCooldown}
                petAbilityName={hud.petAbilityName}
                ultimate={hud.ultimate}
                isBlocking={hud.isBlocking}
                onJoystick={(dx, dz, flick) => engineRef.current?.setJoystick(dx, dz, flick)}
                onLight={() => engineRef.current?.pressLightAttack()}
                onHeavy={() => engineRef.current?.pressHeavyAttack()}
                onSkill={() => engineRef.current?.pressSkill()}
                onPetAbility={() => engineRef.current?.pressPetAbility()}
                onBlockChange={(held) => engineRef.current?.setTouchBlock(held)}
                onJump={() => engineRef.current?.pressJump()}
                onDodge={() => engineRef.current?.pressDodge()}
                onUltimate={() => engineRef.current?.pressUltimate()}
              />
            )}
        </>
      )}

      {leaderboardOpen && (
        <DojoLeaderboardModal
          entries={filteredLeaderboardEntries}
          allEntries={allLeaderboardEntries}
          sortBy={leaderboardSort}
          searchQuery={leaderboardSearch}
          promoteFeedback={promoteFeedback}
          onSortChange={setLeaderboardSort}
          onSearchChange={setLeaderboardSearch}
          onToggleLike={handleToggleDojoLike}
          onVisitDojo={handleVisitDojo}
          onSiegeDojo={handleSiegeCommunityDojo}
          onOpenMyDojo={handleOpenMyDojo}
          onPromoteDojo={handlePromoteDojo}
          onRenameMyDojo={handleRenameMyDojo}
          onClose={handleCloseLeaderboard}
        />
      )}

      {clanSiegeOpen && (
        <ClanSiegeModal
          hero={hero}
          playerDojoName={dojoSocial.playerDojoName}
          playerBlocks={playerDojoBlocks}
          playerWeather={hud.dojoWeather}
          clanEmblem={clanEmblem}
          onSaveEmblem={handleSaveClanEmblem}
          onVisitNexusEntrance={handleVisitNexusEntrance}
          onLaunch={handleLaunchClanSiege}
          onClose={handleCloseClanSiege}
        />
      )}

      {tradingPostOpen && (
        <TradingPostModal
          coins={hud.coins}
          inventory={storeInventory}
          playerBlocks={playerDojoBlocks}
          arenaRank={hud.arenaRank}
          initialTab={tradingPostTab}
          feedback={tradeFeedback}
          onBuyItem={handleBuyStoreItem}
          onExecuteTrade={handleExecuteTrade}
          onPreviewEmote={handlePreviewRankEmote}
          onPerformEmote={handlePerformRankEmote}
          onClose={handleCloseTradingPost}
        />
      )}

      {customizeOpen && (
        <CustomizeStudio
          hero={hero}
          onChange={handleUpdateHero}
          onRotate={(delta) => engineRef.current?.rotateCustomizePreview(delta)}
          onClose={handleCloseCustomize}
        />
      )}

      {phase === 'paused' && (
        <PauseModal
          autoAssist={hud.autoAssist}
          quests={hud.dailyQuests}
          showReturnToHub={hud.zone !== 'hub'}
          onToggleAutoAssist={(enabled) => engineRef.current?.setAutoAssist(enabled)}
          onResume={() => engineRef.current?.setPaused(false)}
          onRestart={() => engineRef.current?.restartCurrentZone()}
          onReturnToHub={() => {
            engineRef.current?.setPaused(false);
            engineRef.current?.switchZone('hub');
          }}
          onReturnToTitle={() => engineRef.current?.returnToTitle()}
        />
      )}

      {phase === 'gameover' && matchSummary && (
        <MatchEndModal
          summary={matchSummary}
          combatLog={hud.combatLog}
          combatArchive={hud.combatArchive}
          onPlayAgain={() => engineRef.current?.restartCurrentZone()}
          onNextMatch={() => {
            const label =
              matchSummary.mode === 'royale'
                ? 'Battle Royale'
                : matchSummary.mode === 'clan_siege'
                  ? 'Clan Siege'
                  : '1v1 Arena · Next Match';
            launchWithLoading(label, () => engineRef.current?.startNextMatch());
          }}
          onReplayVoiceLine={(s) => engineRef.current?.replayMatchVoiceLine(s)}
          onNextBoss={(nextIdx) =>
            launchWithLoading(`Boss Trial ${nextIdx + 1}`, () =>
              engineRef.current?.switchZone('campaign', nextIdx)
            )
          }
          onReturnZone={(zone) => {
            if (zone === 'hub') {
              launchWithLoading('Nexus City', () => engineRef.current?.switchZone('hub'));
            } else {
              engineRef.current?.switchZone(zone);
            }
          }}
        />
      )}

      {/* Part A: Red Flame Games 4-second Real-Time Studio Logo Cinematic */}
      {openingStage === 'studio' && (
        <StudioLogoCinematic
          onFlameWhoosh={() => engineRef.current?.playStudioFlameWhoosh()}
          onEmberCrackle={() => engineRef.current?.playStudioEmberCrackle()}
          onBraamStamp={() => engineRef.current?.playStudioBraamStamp()}
          onComplete={() => setOpeningStage('loading')}
        />
      )}

      {/* Part B: GTA-Style Loading Screen (Cold Boot & Hub/Match Re-entry) */}
      {openingStage === 'loading' && (
        <GtaLoadingScreen
          mode="cold_boot"
          destinationLabel="STRIKEVERSE"
          holdIndefinitely={holdLoadingPreview}
          onComplete={() => setOpeningStage('ready')}
        />
      )}

      {openingStage === 'ready' && zoneTransition && (
        <GtaLoadingScreen
          key={zoneTransition.id}
          mode="zone_transition"
          destinationLabel={zoneTransition.destinationLabel}
          onComplete={() => setZoneTransition(null)}
        />
      )}

      <OfflineIndicator />
    </main>
  );
}
