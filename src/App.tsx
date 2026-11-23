import { useEffect, useMemo, useRef, useState } from 'react';
import { CustomizeStudio } from './components/CustomizeStudio';
import { DojoLeaderboardModal } from './components/DojoLeaderboardModal';
import { GameHud } from './components/GameHud';
import { MatchEndModal, PauseModal } from './components/StatusModals';
import { TitleScreen } from './components/TitleScreen';
import { TouchControls } from './components/TouchControls';
import {
  AURA_HEX,
  COMBO_DECAY_DURATION,
  DEFAULT_CUSTOMIZATION,
  HERO_CLASSES,
  INITIAL_DAILY_QUESTS,
  PET_ABILITIES,
} from './game/combatRules';
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
import {
  loadCustomization,
  loadDojoBlocks,
  loadDojoSocialState,
  saveDojoSocialState,
} from './game/storage';
import type {
  DojoBlock,
  GamePhase,
  HeroCustomization,
  HudSnapshot,
  MatchSummary,
  WorldZone,
} from './game/types';

const INITIAL_HUD: HudSnapshot = {
  zone: 'hub',
  hp: 120,
  maxHp: 120,
  ghostHp: 120,
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
  dojoMode: 'play',
  selectedDojoBlock: 'dummy',
  dojoBlockCount: 8,
  visitingDojo: null,
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
  const [leaderboardSort, setLeaderboardSort] = useState<DojoLeaderboardSort>('popularity');
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [promoteFeedback, setPromoteFeedback] = useState<string | null>(null);
  const [dojoSocial, setDojoSocial] = useState<DojoSocialState>(() =>
    typeof window !== 'undefined' ? loadDojoSocialState() : DEFAULT_DOJO_SOCIAL_STATE
  );
  const [playerDojoBlocks, setPlayerDojoBlocks] = useState<DojoBlock[]>(() =>
    typeof window !== 'undefined' ? loadDojoBlocks() : DEFAULT_DOJO_BLOCKS
  );
  const [matchSummary, setMatchSummary] = useState<MatchSummary | null>(null);

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
        engine.setLeaderboardOpen(false);
        setCustomizeOpen(true);
        engine.setCustomizeOpen(true);
      },
      onCloseCustomize: () => {
        setCustomizeOpen(false);
      },
      onOpenDojoLeaderboard: () => {
        setCustomizeOpen(false);
        engine.setCustomizeOpen(false);
        setPlayerDojoBlocks(engine.getPlayerDojoBlocks());
        setPromoteFeedback(null);
        setLeaderboardOpen(true);
        engine.setLeaderboardOpen(true);
      },
      onCloseDojoLeaderboard: () => {
        setLeaderboardOpen(false);
      },
    });
    engineRef.current = engine;
    setHero(engine.getCustomization());
    setPlayerDojoBlocks(engine.getPlayerDojoBlocks());

    // Support ?autostart=1 for direct gameplay entry & testing
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      const targetZone = (params.get('zone') as WorldZone) || 'hub';
      engine.startGame(targetZone);
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleStart = (zone: WorldZone) => {
    setCustomizeOpen(false);
    engineRef.current?.startGame(zone);
  };

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
    engineRef.current?.setCustomizeOpen(false);
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
          onStart={handleStart}
          onOpenCustomize={handleOpenCustomize}
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
            onToggleMute={() => engineRef.current?.toggleMute()}
            onPause={() => engineRef.current?.setPaused(true)}
            onEmote={(em) => engineRef.current?.triggerEmote(em)}
            onPortalInteract={() => engineRef.current?.triggerPortalInteract()}
            onDojoMode={(m) => engineRef.current?.setDojoMode(m)}
            onSelectDojoBlock={(t) => engineRef.current?.setSelectedDojoBlock(t)}
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
            onReturnToMyDojo={handleOpenMyDojo}
          />

          {!leaderboardOpen && (
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
          onOpenMyDojo={handleOpenMyDojo}
          onPromoteDojo={handlePromoteDojo}
          onRenameMyDojo={handleRenameMyDojo}
          onClose={handleCloseLeaderboard}
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
          onToggleAutoAssist={(enabled) => engineRef.current?.setAutoAssist(enabled)}
          onResume={() => engineRef.current?.setPaused(false)}
          onRestart={() => engineRef.current?.restartCurrentZone()}
          onReturnToTitle={() => engineRef.current?.returnToTitle()}
        />
      )}

      {phase === 'gameover' && matchSummary && (
        <MatchEndModal
          summary={matchSummary}
          onPlayAgain={() => engineRef.current?.restartCurrentZone()}
          onNextBoss={(nextIdx) => engineRef.current?.switchZone('campaign', nextIdx)}
          onReturnZone={(zone) => engineRef.current?.switchZone(zone)}
        />
      )}
    </main>
  );
}
