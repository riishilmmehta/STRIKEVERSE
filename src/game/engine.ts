import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SoundEngine } from './audio';
import {
  AURA_HEX,
  CAMPAIGN_BOSSES,
  COMBO_DECAY_DURATION,
  CRATE_SMASH_BONUS_DAMAGE,
  DODGE_STAMINA_COST,
  HERO_CLASSES,
  MAX_STAMINA,
  PET_ABILITIES,
  WALL_BOUNCE_BONUS_DAMAGE,
  computeFinisherMoveDamage,
  computeHeroMaxHp,
  computeHeroSpeed,
  computeScaledDamage,
  consumeBufferedInput,
  formatSequenceBadge,
  gainUltimateMeter,
  resolveComboStep,
  resolveIncomingHit,
  resolveNextFinisherHint,
  stepStamina,
} from './combatRules';
import type { BufferedInput, ComboMoveSpec } from './combatRules';
import {
  computeComboFrenzyEffect,
  decayCameraTrauma,
  resolveHitVfxProfile,
  resolveSlashArcProfile,
  sampleCameraShake,
} from './combatVfx';
import type { ComboFrenzyEffect, FloatingDamageNumber, HitImpactKind } from './combatVfx';
import { getBiomeMusicSpec, getBiomeMusicTrackId } from './arenaBiomeAudio';
import {
  ARENA_BIOMES,
  MAX_HERO_LEVEL,
  applyXpGain,
  computeXpToNextLevel,
  getArenaRankSpec,
  recordArenaWin,
} from './arenaRanks';
import type { ArenaRankProgressState } from './arenaRanks';
import {
  RANK_EMOTE_MAP,
  getNewlyUnlockedRankEmote,
  isRankEmoteId,
  mergeOwnedAndRankEmotes,
} from './rankRewards';
import {
  archiveFinisherEntry,
  createCombatLogState,
  flushCombatLogString,
  recordCombatLogHit,
} from './combatLog';
import type { CombatLogState } from './combatLog';
import {
  resolveComboMilestone,
  shouldTriggerEmoteSpotlight,
} from './comboMilestones';
import {
  CAMERA_PITCH_DEFAULT,
  applyCameraLookDelta,
  computeCameraOrbitPosition,
  dampCameraYaw,
  shouldCommitCameraDrag,
  transformMoveInputByCameraYaw,
} from './cameraLook';
import { placeDojoBlock, removeNearestDojoBlock } from './dojoRules';
import { FrenzyPostProcess } from './frenzyPostProcess';
import { HeroRig } from './heroRig';
import type { HeroAnimState } from './heroRig';
import { validateClanEmblem } from './clanEmblem';
import {
  buildClanSiegeMatchPlan,
  evaluateClanSiegeOutcome,
  getRivalClanForDojoId,
} from './clanSiege';
import type { ClanSiegeLaunchConfig, ClanSiegeMatchPlan } from './clanSiege';
import { DOJO_AUDIO_SPECS, getCommunityDojoTrack, normalizeDojoAudioTrack } from './dojoAudio';
import {
  DOJO_WEATHER_ORDER,
  DOJO_WEATHER_SPECS,
  isWeatherUnlocked,
  purchaseDojoWeather,
  selectDojoWeather,
} from './dojoWeather';
import type { DojoWeatherState, WeatherProgressSnapshot } from './dojoWeather';
import { DojoWeatherRenderer } from './dojoWeatherRenderer';
import { ArenaBiomeRenderer } from './arenaBiomeRenderer';
import { HitVfxRenderer } from './hitVfxRenderer';
import { HUB_CITY_NPCS } from './hubNpcs';
import { computeSpectatorCameraPose } from './spectatorCamera';
import type { SpectatorFocusEvent } from './spectatorCamera';
import {
  EMOTE_CATALOG,
  executeDojoTrade,
  purchaseStoreItem,
} from './storeCatalog';
import type { StoreInventoryState } from './storeCatalog';
import {
  loadArenaRankState,
  loadClanEmblem,
  loadCombatArchive,
  loadCustomization,
  loadDojoAudioTrack,
  loadDojoBlocks,
  loadDojoWeatherState,
  loadProgress,
  loadStoreInventory,
  saveArenaRankState,
  saveClanEmblem,
  saveCombatArchive,
  saveCustomization,
  saveDojoAudioTrack,
  saveDojoBlocks,
  saveDojoWeatherState,
  saveProgress,
  saveStoreInventory,
} from './storage';
import type { PlayerProgress } from './storage';
import { getDummyVariantSpec, isInteractiveDummyBlock } from './trainingDummy';
import { selectCharacterVoiceLine } from './characterVoices';
import {
  createInitialRoundState,
  resolveArenaRoundEnd,
  rollMatchItemDrop,
  selectTopReplayHighlights,
} from './roundRules';
import type {
  ArenaBiomeId,
  AttackInput,
  ClanEmblemConfig,
  CombatCallout,
  CombatLogEntry,
  ComboMilestoneFlash,
  DojoAudioTrackId,
  DojoBlock,
  DojoBlockType,
  DojoWeatherId,
  DummyVariantId,
  EmoteId,
  GamePhase,
  HeroClassId,
  HeroCustomization,
  HubMinimapBlip,
  HubMinimapState,
  HudSnapshot,
  MatchRoundState,
  MatchSummary,
  NearbyHubFighter,
  ReplayHighlightClip,
  VisitedDojoSummary,
  WorldZone,
} from './types';
import { buildZoneWorld, createDojoBlockMesh } from './worldBuilder';
import type { BuiltWorld } from './worldBuilder';

type AiPolicy = 'duelist' | 'charger' | 'ranger' | 'flanker' | 'hub_npc';

interface FighterActor {
  id: string;
  name: string;
  title: string;
  isPlayer: boolean;
  team: 'ally' | 'enemy' | 'neutral';
  classId: HeroClassId;
  aiPolicy: AiPolicy;
  rig: HeroRig;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  hp: number;
  maxHp: number;
  ghostHp: number;
  stamina: number;
  grounded: boolean;
  coyoteTimer: number;
  walkPhase: number;
  squashX: number;
  squashY: number;
  // Combat state
  activeMove: ComboMoveSpec | null;
  moveTimer: number;
  moveHitApplied: boolean;
  comboSequence: string;
  timeSinceMoveEnd: number;
  comboCount: number;
  comboDisplayTimer: number;
  lastComboName: string;
  isBlocking: boolean;
  blockHoldTime: number;
  dodgeTimer: number;
  dodgeDirX: number;
  dodgeDirZ: number;
  staggerTimer: number;
  knockdownTimer: number;
  hitFlash: number;
  isKo: boolean;
  koTimer: number;
  skillCooldown: number;
  timeSinceStaminaAction: number;
  // AI fields
  aiState: 'idle' | 'approach' | 'strafe' | 'telegraph' | 'attack' | 'recover';
  aiTimer: number;
  aiStrafeDir: number;
  aiTelegraphDuration: number;
  aiAttackDamage: number;
  aiAttackRange: number;
  aiIsCharge: boolean;
  aiIsRanged: boolean;
  // Emote
  emote: EmoteId | null;
  emoteTimer: number;
  // Hub patrol target
  patrolX: number;
  patrolZ: number;
  lessonHint?: string;
  // Dojo Campaign AI Training Dummy metadata
  isTrainingDummy?: boolean;
  dummyBlockId?: string;
  dummyVariant?: DummyVariantId;
  homeX?: number;
  homeZ?: number;
  dummyLeashRadius?: number;
  dummyEngageRadius?: number;
  dummyRecoverInterval?: number;
}

interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
  color: THREE.Color;
}

interface ProjectileBolt {
  active: boolean;
  fromPlayer: boolean;
  ownerId: string;
  mesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  damage: number;
  life: number;
}

interface ShockwaveRing {
  mesh: THREE.Mesh;
  active: boolean;
  life: number;
  maxLife: number;
  maxScale: number;
}

export interface EngineCallbacks {
  onHudUpdate: (hud: HudSnapshot) => void;
  onPhaseChange: (phase: GamePhase) => void;
  onMatchEnd: (summary: MatchSummary) => void;
  onOpenCustomize: () => void;
  onCloseCustomize: () => void;
  onOpenDojoLeaderboard: () => void;
  onCloseDojoLeaderboard: () => void;
  onOpenClanSiege: () => void;
  onCloseClanSiege: () => void;
  onOpenTradingPost: () => void;
  onCloseTradingPost: () => void;
}

// Module-scope reusable scratch objects (Zero-GC render loop)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _dummyObj = new THREE.Object3D();
const _tmpColor = new THREE.Color();

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class StrikeverseEngine {
  private readonly container: HTMLElement;
  private readonly callbacks: EngineCallbacks;
  private readonly isSoftwareGl: boolean;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly sound: SoundEngine;
  private readonly hitVfx: HitVfxRenderer;
  private readonly frenzyFx: FrenzyPostProcess;
  private readonly dojoWeatherFx: DojoWeatherRenderer;
  private readonly arenaBiomeFx: ArenaBiomeRenderer;
  private readonly hemiLight: THREE.HemisphereLight;
  private readonly sunLight: THREE.DirectionalLight;
  private readonly rimLight: THREE.DirectionalLight;
  private readonly raycaster = new THREE.Raycaster();
  private readonly floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  private world: BuiltWorld | null = null;
  private player!: FighterActor;
  private actors: FighterActor[] = [];
  private customization: HeroCustomization;
  private dojoBlocks: DojoBlock[];
  private dojoWeatherState: DojoWeatherState;
  private dojoAudioTrack: DojoAudioTrackId;
  private clanEmblem: ClanEmblemConfig;
  private progress: PlayerProgress;
  private combatArchive: CombatLogEntry[];
  private storeInventory: StoreInventoryState;
  private arenaRankState: ArenaRankProgressState;

  private phase: GamePhase = 'title';
  private zone: WorldZone = 'hub';
  private activeBossIndex = 0;
  private customizeShowcase = false;
  private customizeYawOffset = 0;
  private leaderboardOpen = false;
  private clanSiegeOpen = false;
  private tradingPostOpen = false;
  private titleModalOpen = false;

  // Dojo sandbox, weather cycle & cinematic duel spectator state
  private dojoMode: 'play' | 'build' = 'play';
  private selectedDojoBlock: DojoBlockType = 'dummy';
  private selectedDummyVariant: DummyVariantId = 'kaito_duelist';
  private dummyHitTimers = new Map<string, number>();
  private visitedDojo: (VisitedDojoSummary & { blocks: DojoBlock[] }) | null = null;
  private dojoRegenTimer = 0;
  private dojoWeatherCycle = false;
  private dojoWeatherCycleTimer = 0;
  private spectatorActive = false;
  private spectatorFocusEvent: SpectatorFocusEvent = 'normal';
  private spectatorFocusTimer = 0;
  private spectatorEventLabel = 'LIVE DOJO DUEL · AUTO-CAM';

  // Clan Siege exhibition match state
  private clanSiegePlan: ClanSiegeMatchPlan | null = null;

  // Combat Log (last 5 successful combo strings & finishers) + Milestone / Spotlight FX
  private combatLogState: CombatLogState = createCombatLogState();
  private milestoneFlash: ComboMilestoneFlash | null = null;
  private milestoneFlashTimer = 0;
  private milestoneFlashSeq = 0;
  private emoteSpotlightTimer = 0;
  private emoteSpotlightName: string | null = null;

  // Simulation timing & juice
  private frameId = 0;
  private disposed = false;
  private lastPerfTime = 0;
  private elapsed = 0;
  private hudEmitAccum = 0;
  private hitstopTimer = 0;
  private cameraTrauma = 0;
  private cameraFovKick = 0;
  private frenzyIntensity = 0;
  private frenzyImpactPulse = 0;
  private frenzyState: ComboFrenzyEffect = computeComboFrenzyEffect({ comboCount: 0, comboTimer: 0 });
  private finisherSlowMoTimer = 0;
  private finisherSlowMoScale = 0.28;
  private finisherSlowMoName = '';
  private petCooldown = 0;
  private petActionTimer = 0;
  private ultimateTimer = 0;
  private ultimateMeter = 35; // Start partially charged so players experience it smoothly
  private ultimateDamageApplied = false;
  private matchTimer = 0;
  private matchMaxCombo = 0;
  private matchParries = 0;
  private matchDamageDealt = 0;
  private matchEndDelay = -1;
  private pendingSummary: MatchSummary | null = null;

  // Best-of-3 Arena Rounds, Parry Counter window, Slow-Mo Finish & Cinematic Replay highlights
  private arenaRounds: MatchRoundState | null = null;
  private roundTransitionTimer = 0;
  private roundBanner: string | null = null;
  private roundBannerTimer = 0;
  private parryCounterTimer = 0;
  private matchFinishOverlay: 'victory' | 'defeat' | null = null;
  private matchFinishWinnerId: string | null = null;
  private replayHighlights: ReplayHighlightClip[] = [];
  private replayHighlightSeq = 0;
  private customArenaChallengerId: string | null = null;

  // Royale shrinking ring
  private royaleRingRadius = 23;
  private royaleTotal = 6;

  // Callouts & 3D-projected floating damage popups
  private calloutSeq = 0;
  private activeCallout: CombatCallout | null = null;
  private calloutTimer = 0;
  private damagePopupSeq = 0;
  private readonly damagePopups: {
    id: number;
    worldX: number;
    worldY: number;
    worldZ: number;
    value: string;
    label?: string;
    tone: FloatingDamageNumber['tone'];
    age: number;
    maxAge: number;
  }[] = [];

  // Pooled particles, projectiles, and shockwaves
  private readonly particleCapacity = 140;
  private readonly particleMesh: THREE.InstancedMesh;
  private readonly particles: ParticleSlot[] = [];
  private particleCursor = 0;
  private readonly projectiles: ProjectileBolt[] = [];
  private readonly shockwaves: ShockwaveRing[] = [];

  // Input state
  private readonly keys = new Set<string>();
  private bufferedInput: BufferedInput | null = null;
  private joyX = 0;
  private joyZ = 0;
  private touchBlockHeld = false;
  private camYaw = 0;
  private targetCamYaw = 0;
  private camPitch = CAMERA_PITCH_DEFAULT;
  private targetCamPitch = CAMERA_PITCH_DEFAULT;
  private lookPointerId: number | null = null;
  private lookStartX = 0;
  private lookStartY = 0;
  private lookLastX = 0;
  private lookLastY = 0;
  private lookPointerButton = 0;
  private lookPointerType = 'mouse';
  private lookDidDrag = false;
  private camPos = new THREE.Vector3(0, 6, 13);
  private camLook = new THREE.Vector3(0, 1.5, 0);
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareGl();
    this.sound = new SoundEngine();

    this.customization = loadCustomization();
    this.dojoBlocks = loadDojoBlocks();
    this.dojoWeatherState = loadDojoWeatherState();
    this.dojoAudioTrack = loadDojoAudioTrack();
    this.clanEmblem = loadClanEmblem();
    this.progress = loadProgress();
    this.combatArchive = loadCombatArchive();
    this.storeInventory = loadStoreInventory();
    this.arenaRankState = loadArenaRankState();
    this.sound.setMuted(this.progress.muted);

    // Three.js Renderer configured per skill standards (high-craft PBR quality)
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || window.innerWidth || 1280;
    const height = container.clientHeight || window.innerHeight || 720;
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    // Scene with sunlit stylized-realistic sky & matching horizon fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#7dd3fc');
    this.scene.fog = new THREE.Fog('#bae6fd', 42, 165);

    // Mandatory studio environment reflection map (RoomEnvironment) for crisp PBR reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 1.18;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 260);
    this.camera.position.copy(this.camPos);

    // Balanced warm/cool 3-point lighting rig (upgraded 2048px soft shadows on GPU)
    this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x7c2d12, 0.74);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1d0, 1.46);
    this.sunLight.position.set(16, 28, 18);
    if (!this.isSoftwareGl) {
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.set(2048, 2048);
      this.sunLight.shadow.camera.near = 4;
      this.sunLight.shadow.camera.far = 88;
      const d = 28;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.bias = -0.0004;
      this.sunLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.sunLight);

    this.rimLight = new THREE.DirectionalLight(0x38bdf8, 0.58);
    this.rimLight.position.set(-18, 12, -20);
    this.scene.add(this.rimLight);

    // Pooled Zero-GC Combat Hit-Spark, Starburst, Slash-Arc & Dojo Weather VFX Systems
    this.hitVfx = new HitVfxRenderer(this.scene);
    this.frenzyFx = new FrenzyPostProcess(width, height, this.renderer.getPixelRatio());
    this.dojoWeatherFx = new DojoWeatherRenderer(this.scene);
    this.arenaBiomeFx = new ArenaBiomeRenderer(this.scene);

    // Pooled Zero-GC InstancedMesh for hit sparks & shatter debris
    const pGeo = new THREE.OctahedronGeometry(0.14, 0);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, this.particleCapacity);
    this.particleMesh.frustumCulled = false;
    for (let i = 0; i < this.particleCapacity; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.4,
        scale: 0,
        color: new THREE.Color('#ffffff'),
      });
      _dummyObj.position.set(0, -100, 0);
      _dummyObj.scale.setScalar(0);
      _dummyObj.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummyObj.matrix);
      this.particleMesh.setColorAt(i, _tmpColor.set('#ffffff'));
    }
    this.scene.add(this.particleMesh);

    // Pooled Projectiles (for Ranger & Boss energy bolts)
    const boltGeo = new THREE.SphereGeometry(0.24, 8, 8);
    for (let i = 0; i < 12; i++) {
      const mesh = new THREE.Mesh(
        boltGeo,
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      mesh.visible = false;
      this.scene.add(mesh);
      this.projectiles.push({
        active: false,
        fromPlayer: true,
        ownerId: '',
        mesh,
        x: 0,
        y: 1.2,
        z: 0,
        vx: 0,
        vz: 0,
        damage: 14,
        life: 0,
      });
    }

    // Pooled Shockwaves (Parry, Ground Slam, Ultimate)
    const ringGeo = new THREE.RingGeometry(0.65, 1.0, 28);
    ringGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.shockwaves.push({
        mesh,
        active: false,
        life: 0,
        maxLife: 0.45,
        maxScale: 4,
      });
    }

    // Build initial player & Nexus City hub
    this.player = this.createFighter({
      id: 'player',
      name: this.customization.name,
      title: HERO_CLASSES[this.customization.classId].name,
      isPlayer: true,
      customization: this.customization,
      aiPolicy: 'duelist',
      x: 0,
      z: 6.5,
      yaw: Math.PI,
    });
    this.scene.add(this.player.rig.root);

    this.loadZone('hub');

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Bind listeners
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('visibilitychange', this.handleVisibility);
    this.renderer.domElement.addEventListener('pointerdown', this.handleCanvasPointerDown);
    window.addEventListener('pointermove', this.handleCanvasPointerMove);
    window.addEventListener('pointerup', this.handleCanvasPointerUp);
    window.addEventListener('pointercancel', this.handleCanvasPointerCancel);
    this.renderer.domElement.addEventListener('contextmenu', this.handleContextMenu);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    this.lastPerfTime = performance.now();
    this.emitHud();
    this.scheduleNextFrame();
  }

  private createFighter(opts: {
    id: string;
    name: string;
    title: string;
    isPlayer: boolean;
    team?: 'ally' | 'enemy' | 'neutral';
    customization: HeroCustomization;
    aiPolicy: AiPolicy;
    x: number;
    z: number;
    yaw: number;
    maxHpOverride?: number;
    lessonHint?: string;
  }): FighterActor {
    const rig = new HeroRig(opts.customization, !this.isSoftwareGl);
    rig.root.position.set(opts.x, 0, opts.z);
    rig.root.rotation.y = opts.yaw;
    const maxHp =
      opts.maxHpOverride ??
      (opts.isPlayer
        ? computeHeroMaxHp(opts.customization.classId, this.progress.level) +
          PET_ABILITIES[opts.customization.pet].maxHpBonus
        : HERO_CLASSES[opts.customization.classId].maxHp);

    return {
      id: opts.id,
      name: opts.name,
      title: opts.title,
      isPlayer: opts.isPlayer,
      team: opts.team ?? (opts.isPlayer ? 'ally' : 'enemy'),
      classId: opts.customization.classId,
      aiPolicy: opts.aiPolicy,
      rig,
      x: opts.x,
      y: 0,
      z: opts.z,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: opts.yaw,
      hp: maxHp,
      maxHp,
      ghostHp: maxHp,
      stamina: MAX_STAMINA,
      grounded: true,
      coyoteTimer: 0,
      walkPhase: 0,
      squashX: 1,
      squashY: 1,
      activeMove: null,
      moveTimer: 0,
      moveHitApplied: false,
      comboSequence: '',
      timeSinceMoveEnd: 9,
      comboCount: 0,
      comboDisplayTimer: 0,
      lastComboName: '',
      isBlocking: false,
      blockHoldTime: 0,
      dodgeTimer: 0,
      dodgeDirX: 0,
      dodgeDirZ: 0,
      staggerTimer: 0,
      knockdownTimer: 0,
      hitFlash: 0,
      isKo: false,
      koTimer: 0,
      skillCooldown: 0,
      timeSinceStaminaAction: 5,
      aiState: 'approach',
      aiTimer: 0.7 + Math.random() * 0.6,
      aiStrafeDir: Math.random() > 0.5 ? 1 : -1,
      aiTelegraphDuration: 0.52,
      aiAttackDamage: 14,
      aiAttackRange: 2.5,
      aiIsCharge: false,
      aiIsRanged: false,
      emote: null,
      emoteTimer: 0,
      patrolX: opts.x,
      patrolZ: opts.z,
      lessonHint: opts.lessonHint,
    };
  }

  public startGame(initialZone: WorldZone = 'hub'): void {
    this.sound.unlock();
    this.phase = 'playing';
    this.customizeShowcase = false;
    this.clearInputs();
    document.body.dataset.state = 'playing';
    this.callbacks.onPhaseChange('playing');
    if (initialZone !== this.zone || initialZone !== 'hub') {
      this.loadZone(initialZone);
    } else {
      // Face hero away from camera into sunlit Nexus City vista
      this.player.yaw = Math.PI;
      this.camPos.set(this.player.x, 4.9, this.player.z + 8.6);
      this.camLook.set(this.player.x, 1.45, this.player.z - 2.0);
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
      this.syncPlayerOverheadRankBadge();
      this.renderer.render(this.scene, this.camera);
    }
    this.syncPlayerOverheadRankBadge();
    this.sound.startMusic();
    this.emitHud();
  }

  public setPaused(paused: boolean): void {
    if (this.phase === 'title' || this.phase === 'gameover') return;
    this.phase = paused ? 'paused' : 'playing';
    this.clearInputs();
    document.body.dataset.state = this.phase;
    if (paused) {
      this.sound.stopMusic();
    } else {
      this.sound.startMusic();
    }
    this.callbacks.onPhaseChange(this.phase);
    this.emitHud();
  }

  public returnToTitle(): void {
    this.phase = 'title';
    this.customizeShowcase = false;
    this.clearInputs();
    this.sound.stopMusic();
    document.body.dataset.state = 'title';
    this.loadZone('hub');
    this.callbacks.onPhaseChange('title');
    this.emitHud();
  }

  public setCustomizeOpen(open: boolean): void {
    this.customizeShowcase = open;
    this.customizeYawOffset = 0;
    if (open) {
      this.clearInputs();
      this.player.emote = null;
      // Snap camera immediately to Hero's FRONT 3/4 portrait view so face, hair, and outfit are front-and-center!
      const angle = this.player.yaw + 0.25;
      this.camPos.set(
        this.player.x + Math.sin(angle) * 3.8 + Math.cos(angle) * 0.95,
        1.58,
        this.player.z + Math.cos(angle) * 3.8 - Math.sin(angle) * 0.95
      );
      this.camLook.set(
        this.player.x + Math.cos(angle) * 0.85,
        1.15,
        this.player.z - Math.sin(angle) * 0.85
      );
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
    }
  }

  public rotateCustomizePreview(deltaRad: number): void {
    this.customizeYawOffset += deltaRad;
  }

  public getCustomization(): HeroCustomization {
    return { ...this.customization };
  }

  public updateCustomization(next: HeroCustomization): void {
    this.customization = { ...next };
    saveCustomization(this.customization);
    this.player.classId = next.classId;
    this.player.name = next.name;
    this.player.title = HERO_CLASSES[next.classId].name;
    this.player.maxHp =
      computeHeroMaxHp(next.classId, this.progress.level) + PET_ABILITIES[next.pet].maxHpBonus;
    this.player.hp = Math.min(this.player.hp, this.player.maxHp);
    if (this.zone === 'hub' || this.zone === 'dojo') {
      this.player.hp = this.player.maxHp;
      this.player.ghostHp = this.player.maxHp;
    }
    this.petCooldown = Math.min(this.petCooldown, PET_ABILITIES[next.pet].cooldown);
    this.player.rig.applyCustomization(next);
    this.syncPlayerOverheadRankBadge();
    this.spawnShockwave(this.player.x, this.player.z, AURA_HEX[next.aura], 2.2);
    this.emitHud();
  }

  public setAutoAssist(enabled: boolean): void {
    this.progress.autoAssist = enabled;
    saveProgress(this.progress);
    this.emitHud();
  }

  public toggleMute(): void {
    this.progress.muted = !this.progress.muted;
    this.sound.setMuted(this.progress.muted);
    if (!this.progress.muted && this.phase === 'playing') {
      this.sound.startMusic();
    }
    saveProgress(this.progress);
    this.emitHud();
  }

  public setLeaderboardOpen(open: boolean): void {
    this.leaderboardOpen = open;
    if (open) {
      this.clearInputs();
    }
  }

  public setClanSiegeOpen(open: boolean): void {
    this.clanSiegeOpen = open;
    if (open) {
      this.clearInputs();
    }
  }

  public setTradingPostOpen(open: boolean): void {
    this.tradingPostOpen = open;
    if (open) {
      this.clearInputs();
    }
  }

  public setTitleModalOpen(open: boolean): void {
    this.titleModalOpen = open;
  }

  public getStoreInventory(): StoreInventoryState {
    return {
      ownedItemIds: [...this.storeInventory.ownedItemIds],
      ownedEmotes: [...this.storeInventory.ownedEmotes],
      completedTradeIds: [...this.storeInventory.completedTradeIds],
      tradeCount: this.storeInventory.tradeCount,
    };
  }

  public buyStoreItem(itemId: string): { ok: boolean; message: string; inventory: StoreInventoryState } {
    const res = purchaseStoreItem(this.storeInventory, itemId, this.progress.coins);
    if (!res.purchased || !res.item) {
      this.pushCallout('STORE', res.reason ?? 'Cannot purchase', 'rose');
      this.emitHud();
      return { ok: false, message: res.reason ?? 'Cannot purchase', inventory: this.getStoreInventory() };
    }
    this.storeInventory = res.state;
    this.progress.coins = res.remainingCoins;
    saveStoreInventory(this.storeInventory);
    saveProgress(this.progress);
    this.sound.unlock();
    this.sound.playVictory();
    this.spawnShockwave(this.player.x, this.player.z, res.item.accentHex, 4.8);
    this.spawnParticles(this.player.x, 1.5, this.player.z, res.item.accentHex, 24, 7.2);
    if (res.item.emoteId) {
      this.player.emote = res.item.emoteId;
      this.player.emoteTimer = 0;
      this.triggerEmoteSpotlight(res.item.name.toUpperCase(), 2.8);
    }
    this.pushCallout('UNLOCKED!', `${res.item.name.toUpperCase()} · -${res.item.priceCoins}c`, 'amber');
    this.emitHud();
    return { ok: true, message: `Unlocked ${res.item.name}!`, inventory: this.getStoreInventory() };
  }

  public tradeDojoOffer(offerId: string): { ok: boolean; message: string; inventory: StoreInventoryState } {
    const res = executeDojoTrade(this.storeInventory, offerId, this.dojoBlocks);
    if (!res.traded || !res.offer) {
      this.pushCallout('TRADE POST', res.reason ?? 'Trade unavailable', 'rose');
      this.emitHud();
      return { ok: false, message: res.reason ?? 'Trade unavailable', inventory: this.getStoreInventory() };
    }
    this.storeInventory = res.state;
    this.dojoBlocks = res.blocks;
    this.progress.coins += res.bonusCoins;
    saveStoreInventory(this.storeInventory);
    saveDojoBlocks(this.dojoBlocks);
    saveProgress(this.progress);
    this.sound.unlock();
    this.sound.playParry();
    this.spawnShockwave(this.player.x, this.player.z, res.offer.friendAccentHex, 4.6);
    if (this.zone === 'dojo' && !this.visitedDojo) {
      this.loadZone('dojo');
    }
    this.pushCallout(
      `TRADED WITH ${res.offer.friendName}!`,
      `${res.offer.receiveLabel.toUpperCase()} · +${res.bonusCoins}c`,
      'emerald'
    );
    this.emitHud();
    return {
      ok: true,
      message: `Swapped for ${res.offer.receiveLabel} (+${res.bonusCoins} Coins)!`,
      inventory: this.getStoreInventory(),
    };
  }

  public toggleDojoWeatherCycle(): void {
    this.dojoWeatherCycle = !this.dojoWeatherCycle;
    this.dojoWeatherCycleTimer = 0;
    this.sound.unlock();
    this.sound.playBounce();
    this.pushCallout(
      this.dojoWeatherCycle ? 'DYNAMIC WEATHER CYCLE ON' : 'WEATHER CYCLE PAUSED',
      this.dojoWeatherCycle ? 'AUTO-CYCLING DOJO ATMOSPHERE EVERY 14s' : 'LOCKED TO CURRENT PRESET',
      'cyan'
    );
    this.emitHud();
  }

  public selectArenaBiome(biome: ArenaBiomeId): void {
    if (!ARENA_BIOMES[biome]) return;
    this.arenaRankState = { ...this.arenaRankState, selectedBiome: biome };
    saveArenaRankState(this.arenaRankState);
    this.sound.unlock();
    this.sound.playBiomeThemeStinger(biome);
    const musicSpec = getBiomeMusicSpec(biome);
    if (this.zone === 'arena') {
      this.loadZone('arena');
    } else {
      this.switchZone('arena');
    }
    this.pushCallout(
      ARENA_BIOMES[biome].name.toUpperCase(),
      `♫ ${musicSpec.title.toUpperCase()} · ${musicSpec.instrumentTag}`,
      'cyan'
    );
    this.emitHud();
  }

  public toggleSpectatorMode(): void {
    if (this.zone !== 'dojo') return;
    this.spectatorActive = !this.spectatorActive;
    this.spectatorFocusEvent = 'normal';
    this.spectatorFocusTimer = 0;
    this.spectatorEventLabel = 'LIVE DOJO DUEL · AUTO-CAM';

    // Remove any existing spectator-spawned duelists first
    for (let i = this.actors.length - 1; i >= 0; i--) {
      const a = this.actors[i];
      if (a.id.startsWith('spectator-duel-')) {
        this.scene.remove(a.rig.root);
        a.rig.dispose();
        this.actors.splice(i, 1);
      }
    }

    if (this.spectatorActive) {
      this.dojoMode = 'play';
      const duelistA = this.createFighter({
        id: 'spectator-duel-a',
        name: 'KENJI',
        title: 'Dojo Duelist A',
        isPlayer: false,
        team: 'ally',
        customization: {
          ...this.customization,
          name: 'KENJI',
          classId: 'striker',
          topColor: '#0f172a',
          accentColor: '#38bdf8',
          hairStyle: 'spiky',
          weaponSkin: 'katana',
          aura: 'cyan',
          pet: 'none',
        },
        aiPolicy: 'duelist',
        x: -2.6,
        z: -1.5,
        yaw: Math.PI / 2,
        maxHpOverride: 180,
      });
      duelistA.rig.setTeamRing('#38bdf8');

      const duelistB = this.createFighter({
        id: 'spectator-duel-b',
        name: 'KIRA',
        title: 'Dojo Duelist B',
        isPlayer: false,
        team: 'enemy',
        customization: {
          ...this.customization,
          name: 'KIRA',
          classId: 'phantom',
          topColor: '#312e81',
          accentColor: '#f59e0b',
          hairStyle: 'ponytail',
          weaponSkin: 'tonfa',
          aura: 'solar',
          pet: 'none',
        },
        aiPolicy: 'flanker',
        x: 2.6,
        z: -1.5,
        yaw: -Math.PI / 2,
        maxHpOverride: 180,
      });
      duelistB.rig.setTeamRing('#f59e0b');

      this.actors.push(duelistA, duelistB);
      this.scene.add(duelistA.rig.root, duelistB.rig.root);

      const initPose = computeSpectatorCameraPose({
        ax: duelistA.x,
        az: duelistA.z,
        bx: duelistB.x,
        bz: duelistB.z,
        elapsed: this.elapsed,
        focusEvent: 'normal',
        focusTimer: 0,
      });
      this.camPos.set(initPose.posX, initPose.posY, initPose.posZ);
      this.camLook.set(initPose.lookX, initPose.lookY, initPose.lookZ);
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);

      this.sound.unlock();
      this.sound.playParry();
      this.pushCallout('CINEMATIC SPECTATOR', 'AUTO-PANNING & ZOOMING ON PARRIES & FINISHERS', 'amber');
    } else {
      this.pushCallout('SPECTATOR EXITED', 'CONTROL RETURNED TO HERO', 'cyan');
    }
    this.emitHud();
  }

  private triggerEmoteSpotlight(label: string, duration = 2.6): void {
    this.emoteSpotlightTimer = Math.max(this.emoteSpotlightTimer, duration);
    this.emoteSpotlightName = label;
    this.spawnShockwave(this.player.x, this.player.z, '#facc15', 3.4);
  }

  private triggerComboMilestoneCheck(prevCombo: number, nextCombo: number, x: number, z: number): void {
    const milestone = resolveComboMilestone(prevCombo, nextCombo);
    if (!milestone) return;
    this.milestoneFlashSeq += 1;
    this.milestoneFlash = {
      id: this.milestoneFlashSeq,
      threshold: milestone.threshold,
      title: milestone.title,
      subtitle: milestone.subtitle,
      primaryHex: milestone.primaryHex,
      secondaryHex: milestone.secondaryHex,
      opacity: milestone.flashOpacity,
    };
    this.milestoneFlashTimer = milestone.flashDuration;
    this.cameraTrauma = Math.min(1, this.cameraTrauma + milestone.traumaBoost);
    this.cameraFovKick = Math.max(this.cameraFovKick, milestone.fovKick);
    this.frenzyImpactPulse = 1.0;
    this.sound.playUltimate();
    for (let r = 0; r < milestone.shockwaveRings; r++) {
      this.spawnShockwave(x, z, r % 2 === 0 ? milestone.primaryHex : milestone.secondaryHex, 4.2 + r * 2.4);
    }
    this.spawnParticles(x, 1.5, z, milestone.primaryHex, milestone.sparkCount, 10.5);
    this.spawnParticles(x, 1.2, z, milestone.secondaryHex, Math.round(milestone.sparkCount * 0.5), 8.2);
    this.pushCallout(milestone.title, milestone.subtitle, 'amber');
    this.triggerEmoteSpotlight(`${milestone.threshold}x FRENZY SPOTLIGHT`, 2.8);
  }

  private archiveLatestFinisherIfNeeded(isFinisher: boolean): void {
    if (!isFinisher) return;
    const latest = this.combatLogState.entries[0];
    if (!latest || !latest.isFinisher) return;
    this.combatArchive = archiveFinisherEntry(this.combatArchive, latest);
    saveCombatArchive(this.combatArchive);
  }

  public grantBonusCoins(amount: number): void {
    const safeAmount = Math.max(0, Math.round(amount));
    if (safeAmount <= 0) return;
    this.progress.coins += safeAmount;
    saveProgress(this.progress);
    this.sound.unlock();
    this.sound.playVictory();
    this.emitHud();
  }

  private getWeatherProgressSnapshot(): WeatherProgressSnapshot {
    return {
      wins: this.progress.wins,
      highestBossCleared: this.progress.highestBossCleared,
      dojoBlockCount: this.dojoBlocks.length,
    };
  }

  public getActiveDojoWeather(): DojoWeatherId {
    return this.dojoWeatherState.activeWeather;
  }

  public setDojoWeather(weatherId: DojoWeatherId): void {
    const progressSnap = this.getWeatherProgressSnapshot();
    const spec = DOJO_WEATHER_SPECS[weatherId];
    if (!spec) return;

    if (isWeatherUnlocked(weatherId, this.dojoWeatherState, progressSnap)) {
      const res = selectDojoWeather(this.dojoWeatherState, weatherId, progressSnap);
      if (!res.selected) return;
      this.dojoWeatherState = res.state;
      saveDojoWeatherState(this.dojoWeatherState);
      if (this.zone === 'dojo' && !this.visitedDojo) {
        this.applyAtmosphereForZone('dojo');
        this.spawnShockwave(this.player.x, this.player.z, spec.accentHex, 4.2);
      }
      this.sound.unlock();
      this.sound.playBounce();
      this.pushCallout(spec.name.toUpperCase(), spec.tagline, 'cyan');
      this.emitHud();
      return;
    }

    const buy = purchaseDojoWeather(
      this.dojoWeatherState,
      weatherId,
      this.progress.coins,
      progressSnap
    );
    if (!buy.purchased) {
      this.pushCallout('WEATHER LOCKED', buy.reason ?? spec.earnRuleLabel, 'rose');
      this.emitHud();
      return;
    }

    this.progress.coins = buy.remainingCoins;
    saveProgress(this.progress);
    this.dojoWeatherState = buy.state;
    saveDojoWeatherState(this.dojoWeatherState);
    if (this.zone === 'dojo' && !this.visitedDojo) {
      this.applyAtmosphereForZone('dojo');
      this.spawnShockwave(this.player.x, this.player.z, spec.accentHex, 5.2);
      this.spawnParticles(this.player.x, 1.8, this.player.z, spec.accentHex, 18, 6.2);
    }
    this.sound.unlock();
    this.sound.playVictory();
    this.pushCallout('WEATHER UNLOCKED!', `${spec.name.toUpperCase()} · -${spec.costCoins} COINS`, 'amber');
    this.emitHud();
  }

  public getClanEmblem(): ClanEmblemConfig {
    return { ...this.clanEmblem };
  }

  public updateClanEmblem(next: ClanEmblemConfig): void {
    this.clanEmblem = validateClanEmblem(next);
    saveClanEmblem(this.clanEmblem);
    this.world?.updateClanBanner(this.clanEmblem);
    this.sound.unlock();
    this.sound.playParry();
    if (this.zone === 'hub') {
      this.spawnShockwave(-19.5, -2, this.clanEmblem.secondaryColor, 5.0);
    }
    this.pushCallout('CLAN BANNER MOUNTED!', 'DISPLAYED AT DOJO ENTRANCE IN NEXUS CITY', 'amber');
    this.emitHud();
  }

  public setDojoAudioTrack(trackId: DojoAudioTrackId): void {
    const safeTrack = normalizeDojoAudioTrack(trackId);
    this.dojoAudioTrack = safeTrack;
    saveDojoAudioTrack(safeTrack);
    const spec = DOJO_AUDIO_SPECS[safeTrack];
    this.sound.unlock();
    if (this.zone === 'dojo' && !this.visitedDojo) {
      this.sound.setMusicTrack(safeTrack);
      if (safeTrack !== 'silent' && !this.progress.muted) {
        this.sound.startMusic();
      }
    }
    this.sound.playTrackPreviewChime(safeTrack);
    this.pushCallout(
      `DOJO AUDIO: ${spec.name.toUpperCase()}`,
      `${spec.genreTag.toUpperCase()} · PLAYS FOR GUESTS VISITING YOUR PLOT`,
      'cyan'
    );
    this.emitHud();
  }

  public launchClanSiege(config: ClanSiegeLaunchConfig, playerDojoName: string): void {
    this.clanSiegePlan = buildClanSiegeMatchPlan(
      config,
      this.dojoBlocks,
      playerDojoName,
      this.customization.name,
      this.dojoWeatherState.activeWeather
    );
    this.visitedDojo = null;
    this.leaderboardOpen = false;
    this.clanSiegeOpen = false;
    if (this.phase !== 'playing') {
      this.phase = 'playing';
      document.body.dataset.state = 'playing';
      this.callbacks.onPhaseChange('playing');
    }
    this.loadZone('clan_siege');
    this.sound.unlock();
    this.sound.startMusic();
    this.emitHud();
  }

  public getPlayerDojoBlocks(): DojoBlock[] {
    return this.dojoBlocks.map((b) => ({ ...b }));
  }

  private getActiveDojoBlocks(): DojoBlock[] {
    if (this.zone === 'clan_siege' && this.clanSiegePlan) {
      return this.clanSiegePlan.blocks;
    }
    return this.visitedDojo ? this.visitedDojo.blocks : this.dojoBlocks;
  }

  private applyAtmosphereForZone(zone: WorldZone): void {
    const bg = this.scene.background as THREE.Color;
    const fog = this.scene.fog as THREE.Fog;

    if (zone === 'dojo' || zone === 'clan_siege') {
      const activeWeather: DojoWeatherId =
        zone === 'clan_siege'
          ? (this.clanSiegePlan?.weather ?? this.dojoWeatherState.activeWeather)
          : this.visitedDojo
            ? getRivalClanForDojoId(this.visitedDojo.id).signatureWeather
            : this.dojoWeatherState.activeWeather;
      const spec = DOJO_WEATHER_SPECS[activeWeather];

      bg.set(spec.skyHex);
      fog.color.set(spec.fogHex);
      fog.near = spec.fogNear;
      fog.far = spec.fogFar;
      this.hemiLight.color.set(spec.hemiSkyHex);
      this.hemiLight.groundColor.set(spec.hemiGroundHex);
      this.hemiLight.intensity = spec.hemiIntensity;
      this.sunLight.color.set(spec.sunColorHex);
      this.sunLight.intensity = spec.sunIntensity;
      this.sunLight.position.set(spec.sunPosition[0], spec.sunPosition[1], spec.sunPosition[2]);
      this.rimLight.color.set(spec.rimColorHex);
      this.rimLight.intensity = spec.rimIntensity;
      this.renderer.toneMappingExposure = spec.exposure;
      this.world?.floorMaterial?.color.set(spec.floorTintHex);
      this.dojoWeatherFx.configure(activeWeather, true);
      this.arenaBiomeFx.configure('salt_flats', false);
      const trackForPlot: DojoAudioTrackId =
        zone === 'clan_siege'
          ? this.clanSiegePlan?.isHomeDefense
            ? this.dojoAudioTrack
            : getCommunityDojoTrack(this.clanSiegePlan?.rivalClanId ?? 'dojo-zara')
          : this.visitedDojo
            ? getCommunityDojoTrack(this.visitedDojo.id)
            : this.dojoAudioTrack;
      this.sound.setMusicTrack(trackForPlot);
      this.sound.setCombatIntensity(zone === 'clan_siege' ? 0.92 : 0.15);
      return;
    }

    if (zone === 'arena') {
      const biome = ARENA_BIOMES[this.arenaRankState.selectedBiome] ?? ARENA_BIOMES.salt_flats;
      this.sound.setMusicTrack(getBiomeMusicTrackId(biome.id));
      this.dojoWeatherFx.configure('clear_day', false);
      this.arenaBiomeFx.configure(biome.id, true, true);
      bg.set(biome.skyHex);
      fog.color.set(biome.fogHex);
      fog.near = biome.fogNear;
      fog.far = biome.fogFar;
      this.hemiLight.color.set(biome.hemiSkyHex);
      this.hemiLight.groundColor.set(biome.hemiGroundHex);
      this.hemiLight.intensity = biome.hemiIntensity;
      this.sunLight.color.set(biome.sunColorHex);
      this.sunLight.intensity = biome.sunIntensity;
      this.sunLight.position.set(biome.sunPosition[0], biome.sunPosition[1], biome.sunPosition[2]);
      this.rimLight.color.set(biome.rimColorHex);
      this.rimLight.intensity = biome.rimIntensity;
      this.renderer.toneMappingExposure = biome.exposure;
      this.sound.setCombatIntensity(0.78);
      return;
    }

    // Standard daylight for Hub; dramatic themed twilight + Red Flame embers for Campaign & Royale
    this.sound.setMusicTrack('default');
    this.dojoWeatherFx.configure('clear_day', false);
    fog.near = 42;
    fog.far = 165;
    this.renderer.toneMappingExposure = 1.02;

    if (zone === 'hub') {
      this.arenaBiomeFx.configure('salt_flats', false, false);
      this.hemiLight.color.set(0xdbeafe);
      this.hemiLight.groundColor.set(0x7c2d12);
      this.hemiLight.intensity = 0.74;
      this.sunLight.color.set(0xfff1d0);
      this.sunLight.intensity = 1.46;
      this.sunLight.position.set(16, 28, 18);
      this.rimLight.color.set(0x38bdf8);
      this.rimLight.intensity = 0.58;
      bg.set('#7dd3fc');
      fog.color.set('#bae6fd');
      this.sound.setCombatIntensity(0.0);
    } else if (zone === 'campaign') {
      this.arenaBiomeFx.configure('salt_flats', false, true);
      this.hemiLight.color.set(0xfda4af);
      this.hemiLight.groundColor.set(0x1f0a14);
      this.hemiLight.intensity = 0.72;
      this.sunLight.color.set(0xffedd5);
      this.sunLight.intensity = 1.48;
      this.sunLight.position.set(16, 26, 14);
      this.rimLight.color.set(0xef4444);
      this.rimLight.intensity = 1.05;
      bg.set('#1e0a16');
      fog.color.set('#3b131e');
      this.sound.setCombatIntensity(0.85);
    } else if (zone === 'royale') {
      this.arenaBiomeFx.configure('salt_flats', false, true);
      this.hemiLight.color.set(0x7dd3fc);
      this.hemiLight.groundColor.set(0x0f172a);
      this.hemiLight.intensity = 0.74;
      this.sunLight.color.set(0xe0f2fe);
      this.sunLight.intensity = 1.42;
      this.sunLight.position.set(-14, 28, 18);
      this.rimLight.color.set(0x06b6d4);
      this.rimLight.intensity = 1.02;
      bg.set('#071222');
      fog.color.set('#0f253a');
      this.sound.setCombatIntensity(0.95);
    }
  }

  public visitCommunityDojo(dojo: VisitedDojoSummary & { blocks: DojoBlock[] }): void {
    this.visitedDojo = {
      id: dojo.id,
      ownerName: dojo.ownerName,
      dojoName: dojo.dojoName,
      themeTag: dojo.themeTag,
      blocks: dojo.blocks.map((b) => ({ ...b })),
    };
    this.leaderboardOpen = false;
    if (this.phase === 'gameover' || this.phase === 'paused') {
      this.phase = 'playing';
      document.body.dataset.state = 'playing';
      this.callbacks.onPhaseChange('playing');
    }
    this.loadZone('dojo');
    this.emitHud();
  }

  public returnToMyDojo(): void {
    this.visitedDojo = null;
    this.leaderboardOpen = false;
    this.loadZone('dojo');
    this.emitHud();
  }

  public setDojoMode(mode: 'play' | 'build'): void {
    if (this.visitedDojo) return;
    this.dojoMode = mode;
    if (mode === 'build') {
      // Return active Campaign AI sparring dummies cleanly to their pedestals while building
      for (const actor of this.actors) {
        if (!actor.isTrainingDummy) continue;
        actor.x = actor.homeX ?? actor.x;
        actor.z = actor.homeZ ?? actor.z;
        actor.vx = 0;
        actor.vz = 0;
        actor.y = 0;
        actor.vy = 0;
        actor.activeMove = null;
        actor.aiState = 'idle';
        actor.aiTimer = 0.6;
        actor.staggerTimer = 0;
        actor.hp = actor.maxHp;
        actor.ghostHp = actor.maxHp;
      }
    }
    this.emitHud();
  }

  public setSelectedDojoBlock(type: DojoBlockType): void {
    this.selectedDojoBlock = type;
    this.emitHud();
  }

  public setSelectedDummyVariant(variant: DummyVariantId): void {
    this.selectedDummyVariant = variant;
    this.selectedDojoBlock = 'dummy';
    this.emitHud();
  }

  private spawnTrainingDummyActor(block: DojoBlock): void {
    if (!isInteractiveDummyBlock(block)) return;
    const spec = getDummyVariantSpec(block.dummyVariant);
    if (!spec.aiPolicy) return;
    const actor = this.createFighter({
      id: `dummy-actor-${block.id}`,
      name: spec.actorName,
      title: spec.actorTitle,
      isPlayer: false,
      customization: {
        ...this.customization,
        ...spec.appearance,
        name: spec.actorName,
        classId: spec.classId,
        pet: 'none',
      },
      aiPolicy: spec.aiPolicy,
      x: block.x,
      z: block.z,
      yaw: block.rotation,
      maxHpOverride: spec.maxHp,
      lessonHint: spec.lessonHint,
    });
    actor.isTrainingDummy = true;
    actor.dummyBlockId = block.id;
    actor.dummyVariant = spec.id;
    actor.homeX = block.x;
    actor.homeZ = block.z;
    actor.dummyLeashRadius = spec.leashRadius;
    actor.dummyEngageRadius = spec.engageRadius;
    actor.dummyRecoverInterval = spec.recoverInterval;
    actor.aiAttackDamage = spec.attackDamage;
    actor.aiAttackRange = spec.attackRange;
    actor.aiTelegraphDuration = spec.telegraphDuration;
    actor.aiTimer = 0.85;
    this.actors.push(actor);
    this.scene.add(actor.rig.root);
  }

  private removeTrainingDummyActor(blockId: string): void {
    const idx = this.actors.findIndex((a) => a.dummyBlockId === blockId);
    if (idx === -1) return;
    const [removed] = this.actors.splice(idx, 1);
    this.scene.remove(removed.rig.root);
    removed.rig.dispose();
  }

  public placeDojoBlockInFront(): void {
    if (this.zone !== 'dojo' || this.visitedDojo) return;
    const tx = this.player.x + Math.sin(this.player.yaw) * 3.0;
    const tz = this.player.z + Math.cos(this.player.yaw) * 3.0;
    this.tryPlaceDojoBlockAt(tx, tz);
  }

  public removeNearestDojoBlock(): void {
    if (this.zone !== 'dojo' || !this.world || this.visitedDojo) return;
    const tx = this.player.x + Math.sin(this.player.yaw) * 2.4;
    const tz = this.player.z + Math.cos(this.player.yaw) * 2.4;
    const res = removeNearestDojoBlock(this.dojoBlocks, tx, tz, 3.6);
    if (!res.removed) {
      this.pushCallout('NO ITEM NEARBY', 'Walk closer to a Dojo block', 'rose');
      return;
    }
    this.dojoBlocks = res.blocks;
    saveDojoBlocks(this.dojoBlocks);
    const mesh = this.world.dojoMeshes.get(res.removed.id);
    if (mesh) {
      this.world.group.remove(mesh);
      this.world.dojoMeshes.delete(res.removed.id);
    }
    this.removeTrainingDummyActor(res.removed.id);
    this.world.crates = this.world.crates.filter((c) => c.id !== res.removed!.id);
    this.pushCallout('BLOCK REMOVED', undefined, 'amber');
    this.emitHud();
  }

  private tryPlaceDojoBlockAt(x: number, z: number): void {
    if (!this.world) return;
    const dummyVariant =
      this.selectedDojoBlock === 'dummy' ? this.selectedDummyVariant : undefined;
    const res = placeDojoBlock(
      this.dojoBlocks,
      this.selectedDojoBlock,
      x,
      z,
      this.player.yaw,
      dummyVariant
    );
    if (!res.placed) {
      this.pushCallout('CANNOT PLACE', res.reason, 'rose');
      return;
    }
    this.dojoBlocks = res.blocks;
    saveDojoBlocks(this.dojoBlocks);
    const mesh = createDojoBlockMesh(res.placed, !this.isSoftwareGl);
    this.world.group.add(mesh);
    this.world.dojoMeshes.set(res.placed.id, mesh);
    if (res.placed.type === 'dummy' && isInteractiveDummyBlock(res.placed)) {
      this.spawnTrainingDummyActor(res.placed);
    }
    if (res.placed.type === 'crate') {
      this.world.crates.push({
        id: res.placed.id,
        mesh,
        x: res.placed.x,
        z: res.placed.z,
        radius: 0.9,
        broken: false,
      });
    }
    const spec =
      res.placed.type === 'dummy' ? getDummyVariantSpec(res.placed.dummyVariant) : null;
    this.spawnParticles(
      res.placed.x,
      0.8,
      res.placed.z,
      spec ? spec.accentHex : '#10b981',
      12,
      4.5
    );
    this.sound.playBounce();
    this.pushCallout(
      'PLACED IN DOJO',
      spec ? spec.label.toUpperCase() : res.placed.type.toUpperCase(),
      'emerald'
    );
    this.emitHud();
  }

  public triggerEmote(emote: EmoteId): void {
    if (this.phase !== 'playing' || this.player.isKo || this.player.activeMove) return;
    const allOwned = mergeOwnedAndRankEmotes(
      this.storeInventory.ownedEmotes,
      this.arenaRankState.rank
    );
    if (!allOwned.includes(emote)) return;
    this.player.emote = emote;
    this.player.emoteTimer = 0;
    const spec = EMOTE_CATALOG[emote];
    const fxHex = isRankEmoteId(emote)
      ? RANK_EMOTE_MAP[emote].accentHex
      : AURA_HEX[this.customization.aura];
    this.spawnShockwave(this.player.x, this.player.z, fxHex, 2.4);
    this.sound.playDash();
    if (spec?.storeOnly || spec?.rankOnly) {
      this.triggerEmoteSpotlight(`${spec.label.toUpperCase()} SPOTLIGHT`, 2.8);
    }
    this.pushCallout(spec ? spec.label.toUpperCase() : 'EMOTE', undefined, 'cyan');
  }

  public previewRankEmote(emote: EmoteId): void {
    if (this.player.isKo) return;
    this.player.emote = emote;
    this.player.emoteTimer = 0;
    const spec = EMOTE_CATALOG[emote];
    const fxHex = isRankEmoteId(emote)
      ? RANK_EMOTE_MAP[emote].accentHex
      : AURA_HEX[this.customization.aura];
    this.spawnShockwave(this.player.x, this.player.z, fxHex, 2.6);
    this.sound.unlock();
    this.sound.playDash();
    this.triggerEmoteSpotlight(
      `PREVIEW · ${(spec?.label ?? 'RANK EMOTE').toUpperCase()}`,
      3.0
    );
    this.emitHud();
  }

  public switchZone(zone: WorldZone, bossIdx?: number): void {
    this.visitedDojo = null;
    if (typeof bossIdx === 'number') {
      this.activeBossIndex = Math.max(0, Math.min(CAMPAIGN_BOSSES.length - 1, bossIdx));
    }
    if (this.phase === 'gameover' || this.phase === 'paused') {
      this.phase = 'playing';
      document.body.dataset.state = 'playing';
      this.callbacks.onPhaseChange('playing');
    }
    this.loadZone(zone);
    this.emitHud();
  }

  public restartCurrentZone(): void {
    this.phase = 'playing';
    document.body.dataset.state = 'playing';
    this.callbacks.onPhaseChange('playing');
    this.loadZone(this.zone);
    this.sound.startMusic();
    this.emitHud();
  }

  /**
   * Launches directly into a fresh new match after victory (clears fixed hub rival & resets all 4 rounds).
   */
  public startNextMatch(): void {
    this.customArenaChallengerId = null;
    this.phase = 'playing';
    document.body.dataset.state = 'playing';
    this.callbacks.onPhaseChange('playing');
    const nextZone = this.zone === 'hub' || this.zone === 'dojo' ? 'arena' : this.zone;
    this.loadZone(nextZone);
    this.sound.startMusic();
    this.emitHud();
  }

  public replayMatchVoiceLine(summary: MatchSummary): void {
    const voice = selectCharacterVoiceLine(
      summary.voiceLine?.classId ?? this.customization.classId,
      summary.victory ? 'victory' : 'defeat',
      this.progress.wins + summary.damageDealt
    );
    this.sound.playCharacterVoiceLine({
      ...voice,
      line: summary.voiceLine?.line ?? voice.line,
    });
  }

  public playStudioFlameWhoosh(): void {
    this.sound.playStudioFlameWhoosh();
  }

  public playStudioEmberCrackle(): void {
    this.sound.playStudioEmberCrackle();
  }

  public playStudioBraamStamp(): void {
    this.sound.playStudioBraamStamp();
  }

  /** Triggered strictly by ?demo=victory|defeat URL parameter for automated end-screen verification */
  public triggerDemoMatchEnd(victory: boolean): void {
    const voice = selectCharacterVoiceLine(
      this.customization.classId,
      victory ? 'victory' : 'defeat',
      0
    );
    const rankSpec = getArenaRankSpec(this.arenaRankState.rank);
    const summary: MatchSummary = {
      victory,
      mode: this.zone === 'hub' ? 'arena' : this.zone,
      title: victory ? '1v1 ARENA VICTORY!' : 'DEFEATED',
      subtitle: victory
        ? `Rank #${rankSpec.rank} ${rankSpec.name} (${rankSpec.tierName}) · ${ARENA_BIOMES[this.arenaRankState.selectedBiome].name}`
        : 'Rival held the ring on the decisive exchange',
      elapsedSeconds: 48,
      maxCombo: victory ? 7 : 3,
      parriesLanded: victory ? 3 : 1,
      damageDealt: victory ? 640 : 390,
      coinsEarned: victory ? 185 : 40,
      xpEarned: victory ? 145 : 45,
      levelBefore: this.progress.level,
      levelAfter: this.progress.level,
      xpAfter: this.progress.xp,
      xpToNext: computeXpToNextLevel(this.progress.level),
      leveledUp: false,
      roundScore: {
        playerRounds: victory ? 3 : 1,
        opponentRounds: victory ? 1 : 3,
        maxRounds: 4,
      },
      voiceLine: {
        classId: voice.classId,
        personaLabel: voice.personaLabel,
        line: voice.line,
        accentHex: voice.accentHex,
      },
      arenaProgress: {
        rankBefore: rankSpec.rank,
        rankAfter: rankSpec.rank,
        rankNameAfter: rankSpec.name,
        tierAfter: rankSpec.tier,
        tierNameAfter: rankSpec.tierName,
        accentHex: rankSpec.accentHex,
        winsInRank: this.arenaRankState.winsInRank,
        winsRequired: rankSpec.winsRequiredToAdvance,
        rankedUp: false,
        tierChanged: false,
      },
      itemDrop: rollMatchItemDrop({
        victory,
        maxCombo: victory ? 7 : 3,
        parriesLanded: victory ? 3 : 1,
        seed: 2,
      }),
    };
    this.phase = 'gameover';
    document.body.dataset.state = 'gameover';
    this.callbacks.onPhaseChange('gameover');
    this.callbacks.onMatchEnd(summary);
    this.sound.playCharacterVoiceLine(voice);
    this.emitHud();
  }

  public triggerPortalInteract(): void {
    const p = this.findNearbyPortal();
    if (p) {
      if (p.zone === 'customize') {
        this.callbacks.onOpenCustomize();
      } else if (p.zone === 'clan_siege') {
        this.callbacks.onOpenClanSiege();
      } else {
        this.switchZone(p.zone);
      }
      return;
    }
    if (this.zone === 'hub') {
      const fighter = this.findNearbyHubFighter();
      if (fighter) {
        this.challengeHubFighter(fighter.id);
      }
    }
  }

  public challengeHubFighter(npcId: string): void {
    const npc = HUB_CITY_NPCS.find((n) => n.id === npcId);
    if (!npc) return;
    this.customArenaChallengerId = npc.id;
    this.sound.unlock();
    this.sound.playParry();
    this.switchZone('arena');
  }

  // Touch & HUD button hooks
  public setJoystick(dx: number, dz: number, flickDash = false): void {
    this.joyX = Math.max(-1, Math.min(1, dx));
    this.joyZ = Math.max(-1, Math.min(1, dz));
    if (flickDash && this.phase === 'playing' && this.zone !== 'hub') {
      this.queueAction('dodge');
    }
  }

  public pressLightAttack(): void {
    if (this.phase !== 'playing' || this.customizeShowcase || this.zone === 'hub') return;
    this.sound.unlock();
    this.queueAction('L');
  }

  public pressHeavyAttack(): void {
    if (this.phase !== 'playing' || this.customizeShowcase || this.zone === 'hub') return;
    this.sound.unlock();
    this.queueAction('H');
  }

  public pressSkill(): void {
    if (this.phase !== 'playing' || this.customizeShowcase || this.zone === 'hub') return;
    this.sound.unlock();
    this.queueAction('skill');
  }

  public pressJump(): void {
    if (this.phase !== 'playing' || this.customizeShowcase) return;
    this.sound.unlock();
    this.queueAction('jump');
  }

  public pressDodge(): void {
    if (this.phase !== 'playing' || this.customizeShowcase || this.zone === 'hub') return;
    this.sound.unlock();
    this.queueAction('dodge');
  }

  public pressUltimate(): void {
    if (this.phase !== 'playing' || this.customizeShowcase || this.zone === 'hub') return;
    this.sound.unlock();
    if (this.ultimateMeter >= 100 && this.ultimateTimer <= 0 && !this.player.isKo) {
      this.activateUltimate();
    }
  }

  public pressPetAbility(): void {
    if (this.phase !== 'playing' || this.customizeShowcase || this.zone === 'hub') return;
    if (this.customization.pet === 'none') return;
    this.sound.unlock();
    this.queueAction('pet');
  }

  public setTouchBlock(held: boolean): void {
    if (held && !this.touchBlockHeld) {
      this.player.blockHoldTime = 0;
      this.sound.unlock();
    }
    this.touchBlockHeld = held;
  }

  private queueAction(action: BufferedInput['action']): void {
    this.bufferedInput = { action, timestamp: this.elapsed };
  }

  private clearInputs(): void {
    this.keys.clear();
    this.joyX = 0;
    this.joyZ = 0;
    this.touchBlockHeld = false;
    this.bufferedInput = null;
    this.lookPointerId = null;
    this.lookDidDrag = false;
    this.renderer.domElement.style.cursor = '';
  }

  private loadZone(zone: WorldZone): void {
    this.zone = zone;
    this.matchTimer = 0;
    this.matchMaxCombo = 0;
    this.matchParries = 0;
    this.matchDamageDealt = 0;
    this.matchEndDelay = -1;
    this.pendingSummary = null;
    this.arenaRounds = null;
    this.roundTransitionTimer = 0;
    this.roundBanner = null;
    this.roundBannerTimer = 0;
    this.parryCounterTimer = 0;
    this.matchFinishOverlay = null;
    this.matchFinishWinnerId = null;
    this.replayHighlights = [];
    this.ultimateTimer = 0;
    this.finisherSlowMoTimer = 0;
    this.finisherSlowMoName = '';
    this.petCooldown = 0;
    this.petActionTimer = 0;
    this.hitstopTimer = 0;
    this.frenzyIntensity = 0;
    this.frenzyImpactPulse = 0;
    this.dojoMode = 'play';
    this.dojoRegenTimer = 0;
    this.spectatorActive = false;
    this.spectatorFocusEvent = 'normal';
    this.spectatorFocusTimer = 0;
    this.combatLogState = flushCombatLogString(this.combatLogState);

    // Dispose old world & non-player actors
    if (this.world) {
      this.scene.remove(this.world.group);
      this.world.dispose();
    }
    for (const actor of this.actors) {
      if (!actor.isPlayer) {
        this.scene.remove(actor.rig.root);
        actor.rig.dispose();
      }
    }
    this.actors = [this.player];
    for (const p of this.projectiles) {
      p.active = false;
      p.mesh.visible = false;
    }

    // Ensure default Clan Siege match plan exists if entered via ?zone=clan_siege
    if (zone === 'clan_siege' && !this.clanSiegePlan) {
      this.clanSiegePlan = buildClanSiegeMatchPlan(
        { format: '2v2', rivalClanId: 'clan-neon', venue: 'rival_dojo' },
        this.dojoBlocks,
        'My Dojo Plot',
        this.customization.name,
        this.dojoWeatherState.activeWeather
      );
    }

    const anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.world = buildZoneWorld(
      zone,
      this.getActiveDojoBlocks(),
      anisotropy,
      !this.isSoftwareGl,
      this.clanEmblem,
      this.arenaRankState.selectedBiome
    );
    this.scene.add(this.world.group);

    // Atmosphere & Dojo Weather lighting/particles/floor tint per zone
    this.applyAtmosphereForZone(zone);

    this.player.team = 'ally';
    this.player.rig.setTeamRing(zone === 'clan_siege' ? '#10b981' : null);

    // Reset player in an open path facing the central landmark / opponent
    this.player.maxHp =
      computeHeroMaxHp(this.customization.classId, this.progress.level) +
      PET_ABILITIES[this.customization.pet].maxHpBonus;
    this.player.hp = this.player.maxHp;
    this.player.ghostHp = this.player.maxHp;
    this.player.stamina = MAX_STAMINA;
    this.player.y = 0;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.vz = 0;
    this.player.grounded = true;
    this.player.activeMove = null;
    this.player.comboSequence = '';
    this.player.comboCount = 0;
    this.player.comboDisplayTimer = 0;
    this.player.staggerTimer = 0;
    this.player.knockdownTimer = 0;
    this.player.isKo = false;
    this.player.koTimer = 0;
    this.player.skillCooldown = 0;
    this.player.emote = null;
    this.ultimateMeter = zone === 'hub' ? 35 : 30;

    if (zone === 'hub') {
      this.player.x = 0.8;
      this.player.z = 7.2;
      // On Title Screen, face hero forward (+Z) toward camera so their customizable face, eyes, and armor shine!
      this.player.yaw = this.phase === 'title' ? -0.25 : Math.PI;
      this.spawnHubNpcs();
      this.pushCallout('NEXUS CITY', 'Walk to portals · [B] Dojo Rankings · [C] Style', 'cyan');
    } else if (zone === 'dojo') {
      this.player.x = 0;
      this.player.z = 4.2;
      this.player.yaw = Math.PI;
      for (const b of this.getActiveDojoBlocks()) {
        if (isInteractiveDummyBlock(b)) {
          this.spawnTrainingDummyActor(b);
        }
      }
      if (this.visitedDojo) {
        this.pushCallout(
          this.visitedDojo.dojoName.toUpperCase(),
          `VISITING ${this.visitedDojo.ownerName.toUpperCase()}'S DOJO`,
          'cyan'
        );
      } else {
        this.pushCallout(
          'MY DOJO PLOT',
          'Spar with AI Dummies to drill Parries [L] or open Build Mode',
          'emerald'
        );
      }
    } else if (zone === 'arena') {
      this.player.x = 0;
      this.player.z = 2.4;
      this.player.yaw = Math.PI;
      this.arenaRounds = createInitialRoundState();
      this.roundBanner = 'ROUND 1 · FIGHT!';
      this.roundBannerTimer = 1.2;
      const rivalStyles: { name: string; classId: HeroClassId; policy: AiPolicy; top: string; accent: string; hair: HeroCustomization['hairStyle']; weapon: HeroCustomization['weaponSkin'] }[] = [
        { name: 'RYUJI', classId: 'striker', policy: 'duelist', top: '#0f172a', accent: '#f59e0b', hair: 'spiky', weapon: 'tonfa' },
        { name: 'NOVA', classId: 'ranger', policy: 'ranger', top: '#0e7490', accent: '#22d3ee', hair: 'ponytail', weapon: 'staff' },
        { name: 'KRAKEN', classId: 'juggernaut', policy: 'charger', top: '#7f1d1d', accent: '#fb923c', hair: 'mohawk', weapon: 'gauntlets' },
        { name: 'SHADE', classId: 'phantom', policy: 'flanker', top: '#312e81', accent: '#a855f7', hair: 'undercut', weapon: 'katana' },
      ];
      const rankSpec = getArenaRankSpec(this.arenaRankState.rank);
      const biomeSpec = ARENA_BIOMES[this.arenaRankState.selectedBiome];
      const challengedNpc = this.customArenaChallengerId
        ? HUB_CITY_NPCS.find((n) => n.id === this.customArenaChallengerId) ?? null
        : null;
      this.customArenaChallengerId = null;

      if (challengedNpc) {
        const oppRank = getArenaRankSpec(challengedNpc.arenaRank);
        const oppPolicy: AiPolicy =
          challengedNpc.classId === 'ranger'
            ? 'ranger'
            : challengedNpc.classId === 'juggernaut'
              ? 'charger'
              : challengedNpc.classId === 'phantom'
                ? 'flanker'
                : 'duelist';
        const opp = this.createFighter({
          id: 'arena-rival',
          name: challengedNpc.name,
          title: `Rank #${oppRank.rank} ${oppRank.name} · ${HERO_CLASSES[challengedNpc.classId].name}`,
          isPlayer: false,
          customization: {
            ...this.customization,
            name: challengedNpc.name,
            classId: challengedNpc.classId,
            topColor: challengedNpc.topColor,
            bottomColor: challengedNpc.bottomColor,
            accentColor: challengedNpc.accentColor,
            hairStyle: challengedNpc.hairStyle,
            hairColor: challengedNpc.hairColor,
            headgear: challengedNpc.headgear,
            backAccessory: challengedNpc.backAccessory,
            weaponSkin: challengedNpc.weaponSkin,
            pet: 'none',
          },
          aiPolicy: oppPolicy,
          x: 0,
          z: -2.0,
          yaw: 0,
          maxHpOverride: 255 + Math.min(180, (oppRank.rank - 1) * 4 + this.progress.wins * 6),
        });
        this.actors.push(opp);
        this.scene.add(opp.rig.root);
        this.pushCallout(
          `DUEL CHALLENGE · VS ${challengedNpc.name}`,
          `BEST OF 3 · ${biomeSpec.name.toUpperCase()}`,
          'amber'
        );
      } else {
        const pick = rivalStyles[(this.arenaRankState.rank - 1 + this.progress.wins) % rivalStyles.length];
        const opp = this.createFighter({
          id: 'arena-rival',
          name: pick.name,
          title: `Rank #${rankSpec.rank} ${rankSpec.name} · ${HERO_CLASSES[pick.classId].name}`,
          isPlayer: false,
          customization: {
            ...this.customization,
            name: pick.name,
            classId: pick.classId,
            topColor: pick.top,
            accentColor: pick.accent,
            hairStyle: pick.hair,
            weaponSkin: pick.weapon,
            pet: 'none',
          },
          aiPolicy: pick.policy,
          x: 0,
          z: -2.0,
          yaw: 0,
          maxHpOverride: 255 + Math.min(180, (rankSpec.rank - 1) * 4 + this.progress.wins * 6),
        });
        this.actors.push(opp);
        this.scene.add(opp.rig.root);
        this.pushCallout(
          `RANK #${rankSpec.rank} ${rankSpec.name.toUpperCase()}`,
          `BEST OF 3 · ${biomeSpec.name.toUpperCase()} · VS ${pick.name}`,
          'amber'
        );
      }
    } else if (zone === 'campaign') {
      this.player.x = 0;
      this.player.z = 2.0;
      this.player.yaw = Math.PI;
      const boss = CAMPAIGN_BOSSES[this.activeBossIndex] ?? CAMPAIGN_BOSSES[0];
      const bossActor = this.createFighter({
        id: `boss-${boss.index}`,
        name: boss.name,
        title: `${boss.lessonTitle} · ${boss.title}`,
        isPlayer: false,
        customization: {
          ...this.customization,
          ...boss.appearance,
          name: boss.name,
          classId: boss.classId,
          pet: 'none',
        },
        aiPolicy: boss.aiPolicy,
        x: 0,
        z: -1.65,
        yaw: 0,
        maxHpOverride: boss.maxHp,
        lessonHint: boss.lessonHint,
      });
      bossActor.aiAttackDamage = Math.round(16 * boss.damageScale);
      this.actors.push(bossActor);
      this.scene.add(bossActor.rig.root);
      this.pushCallout(boss.lessonTitle.toUpperCase(), boss.name, 'rose');
    } else if (zone === 'royale') {
      this.player.x = 0;
      this.player.z = 11.5;
      this.player.yaw = Math.PI;
      this.royaleRingRadius = this.world.arenaRadius;
      const contenders: { name: string; classId: HeroClassId; policy: AiPolicy; color: string }[] = [
        { name: 'BLAZE', classId: 'striker', policy: 'duelist', color: '#f97316' },
        { name: 'TITAN', classId: 'juggernaut', policy: 'charger', color: '#ef4444' },
        { name: 'VOLT', classId: 'ranger', policy: 'ranger', color: '#06b6d4' },
        { name: 'MIRAGE', classId: 'phantom', policy: 'flanker', color: '#a855f7' },
        { name: 'AEGIS', classId: 'support', policy: 'duelist', color: '#10b981' },
      ];
      this.royaleTotal = contenders.length + 1;
      contenders.forEach((c, idx) => {
        const angle = (idx / contenders.length) * Math.PI * 2 + 0.4;
        const r = 12.5;
        const fighter = this.createFighter({
          id: `royale-${idx}`,
          name: c.name,
          title: HERO_CLASSES[c.classId].name,
          isPlayer: false,
          customization: {
            ...this.customization,
            name: c.name,
            classId: c.classId,
            topColor: '#1e293b',
            accentColor: c.color,
            weaponSkin: HERO_CLASSES[c.classId].defaultWeapon,
            aura: HERO_CLASSES[c.classId].defaultAura,
            pet: 'none',
          },
          aiPolicy: c.policy,
          x: Math.cos(angle) * r,
          z: Math.sin(angle) * r,
          yaw: angle + Math.PI,
          maxHpOverride: 175,
        });
        this.actors.push(fighter);
        this.scene.add(fighter.rig.root);
      });
      this.pushCallout('LAST HERO STANDING', '6 Fighters · Stay inside the shrinking ring!', 'cyan');
    } else if (zone === 'clan_siege' && this.clanSiegePlan) {
      const plan = this.clanSiegePlan;
      for (const slot of plan.spawns) {
        if (slot.isPlayer) {
          this.player.x = slot.x;
          this.player.z = slot.z;
          this.player.yaw = slot.yaw;
          this.player.team = 'ally';
          continue;
        }
        const tpl = slot.template!;
        const isAlly = slot.team === 'ally';
        const fighter = this.createFighter({
          id: slot.id,
          name: tpl.name,
          title: isAlly
            ? `[${plan.allyClanTag}] ${HERO_CLASSES[tpl.classId].name}`
            : `[${plan.rivalClanTag}] ${HERO_CLASSES[tpl.classId].name}`,
          isPlayer: false,
          team: slot.team,
          customization: {
            ...this.customization,
            name: tpl.name,
            classId: tpl.classId,
            topColor: tpl.topColor,
            bottomColor: tpl.bottomColor,
            accentColor: tpl.accentColor,
            hairStyle: tpl.hairStyle,
            hairColor: tpl.hairColor,
            headgear: tpl.headgear,
            backAccessory: tpl.backAccessory,
            weaponSkin: tpl.weaponSkin,
            aura: tpl.aura,
            pet: 'none',
          },
          aiPolicy: tpl.policy,
          x: slot.x,
          z: slot.z,
          yaw: slot.yaw,
          maxHpOverride: plan.format === '4v4' ? 210 : 240,
          lessonHint: `Use ${plan.venueName} Trampolines, Dash Pads & Crates!`,
        });
        fighter.aiAttackDamage = plan.format === '4v4' ? 12 : 14;
        fighter.rig.setTeamRing(isAlly ? '#10b981' : '#f43f5e');
        this.actors.push(fighter);
        this.scene.add(fighter.rig.root);
      }
      this.pushCallout(
        `CLAN SIEGE ${plan.format.toUpperCase()}`,
        `${plan.allyClanName.toUpperCase()} VS ${plan.rivalClanName.toUpperCase()} · ${plan.venueName.toUpperCase()}`,
        'amber'
      );
    }

    // Sync player rig, overhead rank badge & snap camera immediately, then draw first frame synchronously!
    this.syncPlayerOverheadRankBadge();
    this.player.rig.root.position.set(this.player.x, 0, this.player.z);
    this.player.rig.root.rotation.y = this.player.yaw;
    this.camYaw = 0;
    this.targetCamYaw = 0;
    this.camPitch = CAMERA_PITCH_DEFAULT;
    this.targetCamPitch = CAMERA_PITCH_DEFAULT;
    this.camPos.set(this.player.x, 5.2, this.player.z + 9.2);
    this.camLook.set(this.player.x, 1.5, this.player.z - 2.0);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    this.renderer.render(this.scene, this.camera);
  }

  private syncPlayerOverheadRankBadge(): void {
    if (this.zone === 'hub' && this.phase !== 'title') {
      this.player.rig.setOverheadRankBadge({
        name: this.customization.name,
        rank: this.arenaRankState.rank,
        isPlayer: true,
      });
    } else {
      this.player.rig.setOverheadRankBadge(null);
    }
  }

  private spawnHubNpcs(): void {
    HUB_CITY_NPCS.forEach((n) => {
      const npc = this.createFighter({
        id: n.id,
        name: n.name,
        title: n.title,
        isPlayer: false,
        customization: {
          ...this.customization,
          name: n.name,
          classId: n.classId,
          topColor: n.topColor,
          bottomColor: n.bottomColor,
          accentColor: n.accentColor,
          hairStyle: n.hairStyle,
          hairColor: n.hairColor,
          headgear: n.headgear,
          backAccessory: n.backAccessory,
          weaponSkin: n.weaponSkin,
          pet: n.pet,
        },
        aiPolicy: 'hub_npc',
        x: n.x,
        z: n.z,
        yaw: Math.atan2(-n.x, -n.z),
      });
      npc.emote = n.initialEmote;
      npc.rig.setOverheadRankBadge({
        name: n.name,
        rank: n.arenaRank,
        isPlayer: false,
      });
      this.actors.push(npc);
      this.scene.add(npc.rig.root);
    });
  }

  private pushCallout(text: string, subtext: string | undefined, tone: CombatCallout['tone']): void {
    this.activeCallout = { id: ++this.calloutSeq, text, subtext, tone };
    this.calloutTimer = 2.1;
  }

  private pushDamagePopup(
    worldX: number,
    worldY: number,
    worldZ: number,
    value: string,
    tone: FloatingDamageNumber['tone'],
    label?: string
  ): void {
    this.damagePopups.push({
      id: ++this.damagePopupSeq,
      worldX: worldX + (Math.random() - 0.5) * 0.35,
      worldY,
      worldZ: worldZ + (Math.random() - 0.5) * 0.35,
      value,
      label,
      tone,
      age: 0,
      maxAge: tone === 'finisher' || tone === 'parry' ? 0.95 : 0.72,
    });
    if (this.damagePopups.length > 10) {
      this.damagePopups.shift();
    }
  }

  private spawnParticles(
    x: number,
    y: number,
    z: number,
    hex: string,
    count: number,
    speed: number
  ): void {
    for (let i = 0; i < count; i++) {
      const slot = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % this.particleCapacity;
      const a = Math.random() * Math.PI * 2;
      const elev = (Math.random() - 0.15) * Math.PI * 0.7;
      const spd = speed * (0.45 + Math.random() * 0.75);
      slot.active = true;
      slot.x = x;
      slot.y = y;
      slot.z = z;
      slot.vx = Math.cos(a) * Math.cos(elev) * spd;
      slot.vy = Math.abs(Math.sin(elev)) * spd + 1.8;
      slot.vz = Math.sin(a) * Math.cos(elev) * spd;
      slot.life = 0;
      slot.maxLife = 0.28 + Math.random() * 0.25;
      slot.scale = 0.7 + Math.random() * 0.9;
      slot.color.set(hex);
    }
  }

  private spawnShockwave(x: number, z: number, hex: string, maxScale: number): void {
    const slot = this.shockwaves.find((s) => !s.active) ?? this.shockwaves[0];
    slot.active = true;
    slot.life = 0;
    slot.maxLife = 0.42;
    slot.maxScale = maxScale;
    slot.mesh.position.set(x, 0.08, z);
    slot.mesh.scale.setScalar(0.35);
    slot.mesh.visible = true;
    const mat = slot.mesh.material as THREE.MeshBasicMaterial;
    mat.color.set(hex);
    mat.opacity = 0.92;
  }

  private spawnProjectile(
    owner: FighterActor,
    dirX: number,
    dirZ: number,
    damage: number,
    colorHex: string,
    speed = 16
  ): void {
    const slot = this.projectiles.find((p) => !p.active);
    if (!slot) return;
    slot.active = true;
    slot.fromPlayer = owner.isPlayer;
    slot.ownerId = owner.id;
    slot.x = owner.x + dirX * 0.9;
    slot.y = owner.y + 1.25;
    slot.z = owner.z + dirZ * 0.9;
    slot.vx = dirX * speed;
    slot.vz = dirZ * speed;
    slot.damage = damage;
    slot.life = 1.6;
    slot.mesh.position.set(slot.x, slot.y, slot.z);
    (slot.mesh.material as THREE.MeshBasicMaterial).color.set(colorHex);
    slot.mesh.visible = true;
  }

  private activateUltimate(): void {
    const cls = HERO_CLASSES[this.player.classId];
    this.ultimateMeter = 0;
    this.ultimateTimer = 2.1;
    this.ultimateDamageApplied = false;
    this.player.activeMove = null;
    this.player.emote = null;
    this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.55);
    this.sound.playUltimate();
    const ultProfile = resolveHitVfxProfile({
      kindOverride: 'ultimate',
      auraHex: AURA_HEX[this.customization.aura],
      comboCount: this.player.comboCount,
    });
    this.cameraTrauma = Math.min(1, this.cameraTrauma + ultProfile.shakeTrauma * 0.7);
    this.cameraFovKick = Math.max(this.cameraFovKick, ultProfile.fovKick);
    this.hitVfx.spawnHitImpact(
      this.player.x,
      1.35,
      this.player.z,
      Math.sin(this.player.yaw),
      Math.cos(this.player.yaw),
      ultProfile
    );
    this.spawnShockwave(this.player.x, this.player.z, AURA_HEX[this.customization.aura], 8.5);
    this.spawnParticles(this.player.x, 1.3, this.player.z, AURA_HEX[this.customization.aura], 28, 9.0);
    this.pushCallout(cls.ultimateName, 'CINEMATIC FINISHER!', 'amber');
    this.emitHud();
  }

  private isHostile(attacker: FighterActor, target: FighterActor): boolean {
    if (attacker.id === target.id || target.isKo || target.aiPolicy === 'hub_npc') return false;
    if (this.zone === 'dojo' && this.spectatorActive) {
      if (attacker.isPlayer || target.isPlayer) return false;
      if (attacker.id.startsWith('spectator-duel-') && target.id.startsWith('spectator-duel-')) {
        return attacker.team !== target.team;
      }
      return false;
    }
    if (this.zone === 'clan_siege') {
      return attacker.team !== target.team;
    }
    if (this.zone === 'royale') return true;
    return attacker.isPlayer !== target.isPlayer;
  }

  private findNearestHostile(from: FighterActor, maxRange = 22): FighterActor | null {
    let best: FighterActor | null = null;
    let bestDist = maxRange;
    for (const a of this.actors) {
      if (!this.isHostile(from, a)) continue;
      const d = Math.hypot(a.x - from.x, a.z - from.z);
      if (d < bestDist) {
        bestDist = d;
        best = a;
      }
    }
    return best;
  }

  private findNearbyPortal() {
    if (!this.world) return null;
    for (const p of this.world.portals) {
      const d = Math.hypot(this.player.x - p.x, this.player.z - p.z);
      if (d <= p.radius) {
        return p;
      }
    }
    return null;
  }

  private findNearbyHubFighter(): NearbyHubFighter | null {
    if (this.zone !== 'hub') return null;
    let best: NearbyHubFighter | null = null;
    let bestDist = 3.8;
    for (const actor of this.actors) {
      if (actor.aiPolicy !== 'hub_npc') continue;
      const d = Math.hypot(actor.x - this.player.x, actor.z - this.player.z);
      if (d < bestDist) {
        bestDist = d;
        const spec = HUB_CITY_NPCS.find((n) => n.id === actor.id);
        const rSpec = getArenaRankSpec(spec?.arenaRank ?? 1);
        best = {
          id: actor.id,
          name: actor.name,
          title: HERO_CLASSES[actor.classId].name,
          arenaRank: rSpec.rank,
          rankName: rSpec.name,
          classId: actor.classId,
          accentHex: rSpec.accentHex,
        };
      }
    }
    return best;
  }

  private buildHubMinimapState(): HubMinimapState | null {
    if (this.zone !== 'hub' || !this.world) return null;
    const radius = this.world.arenaRadius || 25;
    const norm = (v: number) => Math.max(-1, Math.min(1, v / radius));
    const blips: HubMinimapBlip[] = [];
    const portalColors: Record<string, string> = {
      arena: '#f59e0b',
      campaign: '#ef4444',
      dojo: '#10b981',
      royale: '#06b6d4',
      customize: '#a855f7',
      clan_siege: '#f43f5e',
    };
    for (const p of this.world.portals) {
      blips.push({
        id: `portal-${p.zone}`,
        kind: 'portal',
        label: p.label,
        x: norm(p.x),
        z: norm(p.z),
        colorHex: portalColors[p.zone] ?? '#38bdf8',
      });
    }
    for (const a of this.actors) {
      if (a.aiPolicy !== 'hub_npc') continue;
      const spec = HUB_CITY_NPCS.find((n) => n.id === a.id);
      blips.push({
        id: a.id,
        kind: 'npc',
        label: a.name,
        x: norm(a.x),
        z: norm(a.z),
        colorHex: spec?.accentColor ?? '#f97316',
      });
    }
    return {
      playerX: norm(this.player.x),
      playerZ: norm(this.player.z),
      playerYaw: this.player.yaw,
      worldRadius: radius,
      blips,
    };
  }

  private recordReplayHighlight(
    kind: ReplayHighlightClip['kind'],
    title: string,
    detail: string,
    damage: number,
    _comboCount: number,
    score: number
  ): void {
    const accentByKind: Record<ReplayHighlightClip['kind'], string> = {
      parry: '#38bdf8',
      combo: '#f59e0b',
      finisher: '#ef4444',
      ko: '#facc15',
      ultimate: '#fb7185',
    };
    this.replayHighlights.push({
      id: ++this.replayHighlightSeq,
      timestampSec: Math.max(0, Math.round(this.matchTimer)),
      kind,
      title,
      detail,
      damage,
      impactScore: score,
      accentHex: accentByKind[kind],
    });
  }

  private startNextArenaRound(): void {
    if (!this.arenaRounds) return;
    this.player.x = 0;
    this.player.z = 2.4;
    this.player.yaw = Math.PI;
    this.player.vx = 0;
    this.player.vz = 0;
    this.player.y = 0;
    this.player.vy = 0;
    this.player.grounded = true;
    this.player.hp = this.player.maxHp;
    this.player.ghostHp = this.player.maxHp;
    this.player.stamina = MAX_STAMINA;
    this.player.isKo = false;
    this.player.koTimer = 0;
    this.player.staggerTimer = 0;
    this.player.knockdownTimer = 0;
    this.player.activeMove = null;
    this.player.comboCount = 0;
    this.player.comboSequence = '';
    this.player.comboDisplayTimer = 0;
    this.parryCounterTimer = 0;

    for (const actor of this.actors) {
      if (actor.isPlayer) continue;
      actor.x = 0;
      actor.z = -2.0;
      actor.yaw = 0;
      actor.vx = 0;
      actor.vz = 0;
      actor.y = 0;
      actor.vy = 0;
      actor.grounded = true;
      actor.hp = actor.maxHp;
      actor.ghostHp = actor.maxHp;
      actor.stamina = MAX_STAMINA;
      actor.isKo = false;
      actor.koTimer = 0;
      actor.staggerTimer = 0;
      actor.knockdownTimer = 0;
      actor.activeMove = null;
      actor.aiState = 'approach';
      actor.aiTimer = 0.7;
    }

    const label =
      this.arenaRounds.roundNumber === this.arenaRounds.maxRounds
        ? 'FINAL ROUND · FIGHT!'
        : `ROUND ${this.arenaRounds.roundNumber} · FIGHT!`;
    this.roundBanner = label;
    this.roundBannerTimer = 1.2;
    this.sound.playParry();
    this.pushCallout(label, `${this.arenaRounds.playerRounds} – ${this.arenaRounds.opponentRounds}`, 'amber');
    this.emitHud();
  }

  private recordQuestProgress(id: string, inc: number): void {
    let changed = false;
    for (const q of this.progress.dailyQuests) {
      if (q.id === id && !q.completed) {
        q.progress = Math.min(q.target, q.progress + inc);
        if (q.progress >= q.target) {
          q.completed = true;
          this.progress.coins += q.reward;
          this.pushCallout('QUEST COMPLETE!', `+${q.reward} Coins`, 'emerald');
        }
        changed = true;
      }
    }
    if (changed) saveProgress(this.progress);
  }

  private awardXpAndCoins(xp: number, coins: number): void {
    this.progress.coins += coins;
    const xpResult = applyXpGain(this.progress.level, this.progress.xp, xp);
    this.progress.level = xpResult.level;
    this.progress.xp = xpResult.xp;
    if (xpResult.leveledUp) {
      this.pushCallout(
        `LEVEL ${this.progress.level}!`,
        this.progress.level >= MAX_HERO_LEVEL ? 'MAX LEVEL 100 ACHIEVED!' : 'HERO POWER INCREASED',
        'amber'
      );
    }
    saveProgress(this.progress);
  }

  private executePlayerAction(action: BufferedInput['action']): boolean {
    const p = this.player;
    if (p.isKo || p.staggerTimer > 0 || p.knockdownTimer > 0 || this.ultimateTimer > 0) {
      return false;
    }

    if (action === 'jump') {
      if (p.grounded || p.coyoteTimer > 0) {
        p.vy = 9.4;
        p.grounded = false;
        p.coyoteTimer = 0;
        p.squashX = 0.85;
        p.squashY = 1.2;
        p.emote = null;
        this.sound.playDash();
        this.spawnParticles(p.x, 0.15, p.z, '#e2e8f0', 6, 3.2);
        return true;
      }
      return false;
    }

    if (action === 'dodge') {
      if (p.dodgeTimer > 0 || p.stamina < DODGE_STAMINA_COST) return false;
      p.stamina -= DODGE_STAMINA_COST;
      p.timeSinceStaminaAction = 0;
      p.dodgeTimer = 0.26;
      p.activeMove = null;
      p.emote = null;

      const rawDx = this.getMoveInputX();
      const rawDz = this.getMoveInputZ();
      const worldDir = transformMoveInputByCameraYaw(rawDx, rawDz, this.camYaw);
      let dx = worldDir.worldX;
      let dz = worldDir.worldZ;
      if (Math.hypot(dx, dz) < 0.15) {
        if (this.progress.autoAssist) {
          const target = this.findNearestHostile(p, 12);
          if (target) {
            // Auto-assist dash flanks around target smoothly
            const ang = Math.atan2(target.x - p.x, target.z - p.z) + 0.65;
            dx = Math.sin(ang);
            dz = Math.cos(ang);
          } else {
            dx = Math.sin(p.yaw);
            dz = Math.cos(p.yaw);
          }
        } else {
          dx = Math.sin(p.yaw);
          dz = Math.cos(p.yaw);
        }
      }
      const len = Math.hypot(dx, dz) || 1;
      p.dodgeDirX = dx / len;
      p.dodgeDirZ = dz / len;
      p.yaw = Math.atan2(p.dodgeDirX, p.dodgeDirZ);
      this.sound.playDash();
      this.spawnParticles(p.x, 0.8, p.z, AURA_HEX[this.customization.aura], 8, 4.5);
      return true;
    }

    if (action === 'skill') {
      if (p.skillCooldown > 0 || p.activeMove) return false;
      const cls = HERO_CLASSES[p.classId];
      p.skillCooldown = cls.skillCooldown;
      p.emote = null;

      // Auto-face nearest enemy for crisp feel
      const target = this.findNearestHostile(p, cls.skillRange + 4);
      if (target && this.progress.autoAssist) {
        p.yaw = Math.atan2(target.x - p.x, target.z - p.z);
      }
      const fx = Math.sin(p.yaw);
      const fz = Math.cos(p.yaw);
      const auraHex = AURA_HEX[this.customization.aura];

      this.sound.playSkill();
      this.pushCallout(cls.skillName.toUpperCase(), cls.name, 'cyan');

      if (cls.skillKind === 'dash_strike') {
        p.vx = fx * 15;
        p.vz = fz * 15;
        this.spawnShockwave(p.x, p.z, auraHex, 3.4);
        this.spawnParticles(p.x + fx, 1.1, p.z + fz, auraHex, 16, 6.5);
        this.applyAoeSkillHit(p, p.x + fx * 2.2, p.z + fz * 2.2, 3.2, cls.skillDamage, 9.5, 2.8);
      } else if (cls.skillKind === 'ground_slam') {
        this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.45);
        this.spawnShockwave(p.x, p.z, auraHex, 5.4);
        this.spawnParticles(p.x, 0.4, p.z, auraHex, 22, 7.5);
        this.applyAoeSkillHit(p, p.x, p.z, cls.skillRange, cls.skillDamage, 11.5, 5.6);
      } else if (cls.skillKind === 'blink_strike') {
        this.spawnParticles(p.x, 1.1, p.z, auraHex, 14, 5.5);
        if (target) {
          const behindX = target.x - Math.sin(target.yaw) * 1.5;
          const behindZ = target.z - Math.cos(target.yaw) * 1.5;
          p.x = behindX;
          p.z = behindZ;
          p.yaw = Math.atan2(target.x - p.x, target.z - p.z);
        } else {
          p.x += fx * 4.5;
          p.z += fz * 4.5;
        }
        this.spawnShockwave(p.x, p.z, auraHex, 3.2);
        this.applyAoeSkillHit(p, p.x, p.z, 3.4, cls.skillDamage, 7.2, 3.5);
      } else if (cls.skillKind === 'energy_volley') {
        [-0.18, 0, 0.18].forEach((spread) => {
          const a = p.yaw + spread;
          this.spawnProjectile(p, Math.sin(a), Math.cos(a), Math.round(cls.skillDamage * 0.52), auraHex, 18);
        });
        this.spawnParticles(p.x + fx, 1.2, p.z + fz, auraHex, 10, 4.5);
      } else {
        // Support Aegis Pulse + Heal
        p.hp = Math.min(p.maxHp, p.hp + 18);
        this.spawnShockwave(p.x, p.z, '#10b981', 5.2);
        this.spawnParticles(p.x, 1.2, p.z, '#10b981', 18, 6.0);
        this.applyAoeSkillHit(p, p.x, p.z, cls.skillRange, cls.skillDamage, 9.0, 2.2);
      }
      return true;
    }

    if (action === 'pet') {
      if (this.customization.pet === 'none' || this.petCooldown > 0) return false;
      this.executePetAbility(false);
      return true;
    }

    if (action === 'L' || action === 'H') {
      // Allow crisp hit-confirm combo cancel once the active strike has connected
      if (p.activeMove) {
        const cancelAt = p.activeMove.windup + p.activeMove.active * 0.6;
        if (!p.moveHitApplied || p.moveTimer < cancelAt) {
          return false;
        }
      }
      const resolved = resolveComboStep(
        p.comboSequence,
        action as AttackInput,
        p.activeMove ? 0 : p.timeSinceMoveEnd,
        this.progress.autoAssist
      );
      p.activeMove = resolved.move;
      p.comboSequence = resolved.nextSequence;
      p.moveTimer = 0;
      p.moveHitApplied = false;
      p.lastComboName = resolved.move.name;
      p.emote = null;

      // Auto-Assist auto-facing + responsive gap-closing magnetic lunge toward nearest opponent or Dojo dummy
      let gapBoost = 2.4;
      if (this.progress.autoAssist) {
        const target = this.findNearestHostile(p, 7.6);
        if (target) {
          p.yaw = Math.atan2(target.x - p.x, target.z - p.z);
          const dist = Math.hypot(target.x - p.x, target.z - p.z);
          if (dist > 1.9 && dist < 6.8) {
            gapBoost = 5.4;
            // Snappy martial-arts step-in so a beginner tapping J-J-K connects immediately
            const step = Math.min(dist - 1.55, 1.05);
            if (step > 0) {
              p.x += Math.sin(p.yaw) * step;
              p.z += Math.cos(p.yaw) * step;
            }
          }
        } else if (this.zone === 'dojo') {
          const dummy = this.findNearestDojoDummy(p.x, p.z, 5.8);
          if (dummy) {
            p.yaw = Math.atan2(dummy.x - p.x, dummy.z - p.z);
            const dist = Math.hypot(dummy.x - p.x, dummy.z - p.z);
            if (dist > 1.8 && dist < 5.2) {
              gapBoost = 4.6;
              const step = Math.min(dist - 1.5, 0.9);
              if (step > 0) {
                p.x += Math.sin(p.yaw) * step;
                p.z += Math.cos(p.yaw) * step;
              }
            }
          }
        }
      }
      const fx = Math.sin(p.yaw);
      const fz = Math.cos(p.yaw);
      p.vx = fx * resolved.move.lunge * gapBoost;
      p.vz = fz * resolved.move.lunge * gapBoost;
      this.sound.playSwing(action === 'H' || resolved.move.isFinisher);
      return true;
    }

    return false;
  }

  private findNearestDojoDummy(x: number, z: number, maxRange: number): DojoBlock | null {
    let best: DojoBlock | null = null;
    let bestD = maxRange;
    for (const b of this.getActiveDojoBlocks()) {
      if (b.type !== 'dummy' || isInteractiveDummyBlock(b)) continue;
      const d = Math.hypot(b.x - x, b.z - z);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    return best;
  }

  private applyAoeSkillHit(
    attacker: FighterActor,
    cx: number,
    cz: number,
    radius: number,
    baseDamage: number,
    knockback: number,
    launchY: number,
    kindOverride: HitImpactKind = 'skill'
  ): void {
    for (const target of this.actors) {
      if (!this.isHostile(attacker, target)) continue;
      const dist = Math.hypot(target.x - cx, target.z - cz);
      if (dist <= radius) {
        const dirX = dist > 0.01 ? (target.x - cx) / dist : Math.sin(attacker.yaw);
        const dirZ = dist > 0.01 ? (target.z - cz) / dist : Math.cos(attacker.yaw);
        this.applyHit(
          attacker,
          target,
          baseDamage,
          dirX,
          dirZ,
          knockback,
          launchY,
          0.06,
          true,
          kindOverride
        );
      }
    }
    this.checkDojoDummyHit(cx, cz, radius, baseDamage);
  }

  private gainPlayerUltimate(rawGain: number): void {
    const mult = PET_ABILITIES[this.customization.pet].ultGainMult;
    this.ultimateMeter = gainUltimateMeter(this.ultimateMeter, Math.round(rawGain * mult));
  }

  private triggerComboFinisherCinematic(move: ComboMoveSpec): void {
    this.finisherSlowMoTimer = move.slowMoDuration ?? 0.65;
    this.finisherSlowMoScale = move.slowMoTimeScale ?? 0.28;
    this.finisherSlowMoName = move.name;
    this.frenzyImpactPulse = 1.0;
    this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.55);
    this.cameraFovKick = Math.max(this.cameraFovKick, 4.8);
    this.pushCallout('COMBO FINISHER!', move.name.toUpperCase(), 'amber');

    // Companion Pet synergy: landing a Combo Finisher shaves 2s off pet cooldown & fires a free assist!
    if (this.customization.pet !== 'none') {
      this.petCooldown = Math.max(0, this.petCooldown - 2.0);
      this.executePetAbility(true);
    }
    this.emitHud();
  }

  private executePetAbility(isFinisherAssist: boolean): void {
    const pet = this.customization.pet;
    if (pet === 'none') return;

    const p = this.player;
    const spec = PET_ABILITIES[pet];
    if (!isFinisherAssist) {
      this.petCooldown = spec.cooldown;
      p.emote = null;
      p.lastComboName = spec.abilityName;
    }
    this.petActionTimer = 0.65;

    const target = this.findNearestHostile(p, 11.5);
    const dummy = !target && this.zone === 'dojo' ? this.findNearestDojoDummy(p.x, p.z, 10) : null;
    let aimYaw = p.yaw;
    if (target) {
      aimYaw = Math.atan2(target.x - p.x, target.z - p.z);
    } else if (dummy) {
      aimYaw = Math.atan2(dummy.x - p.x, dummy.z - p.z);
    }
    const aimX = Math.sin(aimYaw);
    const aimZ = Math.cos(aimYaw);

    if (pet === 'drone') {
      const spreads = isFinisherAssist ? [0] : [-0.15, 0, 0.15];
      const boltDmg = isFinisherAssist ? 10 : 11;
      for (const spread of spreads) {
        const a = aimYaw + spread;
        this.spawnProjectile(p, Math.sin(a), Math.cos(a), boltDmg, '#38bdf8', 20);
      }
      this.spawnParticles(p.x + aimX * 0.8, 1.75, p.z + aimZ * 0.8, '#38bdf8', 12, 5.5);
      this.spawnShockwave(p.x, p.z, '#38bdf8', isFinisherAssist ? 2.1 : 3.0);
      if (!isFinisherAssist) {
        this.sound.playSkill();
        this.pushCallout('PULSE DRONE', 'PHOTON BARRAGE!', 'cyan');
      }
    } else if (pet === 'fox') {
      const pounceX = target ? target.x : dummy ? dummy.x : p.x + aimX * 3.8;
      const pounceZ = target ? target.z : dummy ? dummy.z : p.z + aimZ * 3.8;
      const pounceDmg = isFinisherAssist ? 12 : 26;
      const stunDur = isFinisherAssist ? 0.6 : 1.2;

      const foxVfx = resolveHitVfxProfile({
        kindOverride: 'skill',
        auraHex: '#f59e0b',
        comboCount: p.comboCount + 1,
      });
      this.hitVfx.spawnHitImpact(pounceX, 1.25, pounceZ, aimX, aimZ, foxVfx);
      this.spawnShockwave(pounceX, pounceZ, '#f59e0b', isFinisherAssist ? 2.6 : 4.0);
      this.spawnParticles(pounceX, 1.15, pounceZ, '#fb923c', 18, 6.8);

      if (target && Math.hypot(target.x - p.x, target.z - p.z) <= 9.0) {
        this.applyHit(p, target, pounceDmg, aimX, aimZ, 6.2, 2.4, 0.05, !isFinisherAssist, 'skill');
        target.staggerTimer = Math.max(target.staggerTimer, stunDur);
        target.activeMove = null;
        target.aiState = 'recover';
        target.aiTimer = Math.max(target.aiTimer, stunDur);
      } else {
        this.checkDojoDummyHit(pounceX, pounceZ, 2.4, pounceDmg);
      }

      if (!isFinisherAssist) {
        this.sound.playSkill();
        this.pushCallout('SPIRIT FOX', 'PHANTOM POUNCE · STUN!', 'amber');
      }
    } else if (pet === 'orb') {
      const healAmt = isFinisherAssist ? 8 : 22;
      const stamAmt = isFinisherAssist ? 15 : 35;
      p.hp = Math.min(p.maxHp, p.hp + healAmt);
      p.stamina = Math.min(MAX_STAMINA, p.stamina + stamAmt);
      this.spawnShockwave(p.x, p.z, '#10b981', isFinisherAssist ? 3.2 : 5.4);
      this.spawnParticles(p.x, 1.35, p.z, '#34d399', 18, 6.0);
      this.pushDamagePopup(p.x, p.y + 2.15, p.z, `+${healAmt} HP`, 'parry', 'AEGIS NOVA');

      if (!isFinisherAssist) {
        this.applyAoeSkillHit(p, p.x, p.z, 5.4, 18, 9.5, 2.6, 'skill');
        this.sound.playSkill();
        this.pushCallout('AETHER ORB', `AEGIS NOVA · +${healAmt} HP!`, 'emerald');
      }
    }

    if (!isFinisherAssist) {
      this.emitHud();
    }
  }

  private checkDojoDummyHit(
    cx: number,
    cz: number,
    radius: number,
    damage: number,
    move?: ComboMoveSpec | null
  ): boolean {
    if (this.zone !== 'dojo') return false;
    let hitAny = false;
    for (const b of this.getActiveDojoBlocks()) {
      if (b.type !== 'dummy' || isInteractiveDummyBlock(b)) continue;
      if (Math.hypot(b.x - cx, b.z - cz) <= radius + 0.6) {
        hitAny = true;
        this.dummyHitTimers.set(b.id, 0.35);
        const prevCombo = this.player.comboCount;
        this.player.comboCount += 1;
        this.player.comboDisplayTimer = COMBO_DECAY_DURATION;
        this.gainPlayerUltimate(10);

        const isDummyFinisher = Boolean(move?.isFinisher);
        this.combatLogState = recordCombatLogHit(this.combatLogState, {
          token: move ? move.sequence.slice(-1) : 'S',
          moveName: move ? move.name : this.player.lastComboName || 'Skill Strike',
          damage,
          targetName: 'CLASSIC DUMMY',
          isFinisher: isDummyFinisher,
          comboCount: this.player.comboCount,
        });
        this.archiveLatestFinisherIfNeeded(isDummyFinisher);
        this.triggerComboMilestoneCheck(prevCombo, this.player.comboCount, b.x, b.z);
        if (shouldTriggerEmoteSpotlight(this.player.comboCount, isDummyFinisher)) {
          this.triggerEmoteSpotlight(
            isDummyFinisher ? `${(move?.name ?? 'FINISHER').toUpperCase()} SPOTLIGHT` : `${this.player.comboCount}x COMBO SPOTLIGHT`,
            2.2
          );
        }

        const vfx = resolveHitVfxProfile({
          move,
          auraHex: AURA_HEX[this.customization.aura],
          comboCount: this.player.comboCount,
        });
        const fx = Math.sin(this.player.yaw);
        const fz = Math.cos(this.player.yaw);
        this.hitVfx.spawnHitImpact(b.x, 1.32, b.z, fx, fz, vfx);
        this.spawnShockwave(b.x, b.z, vfx.secondaryColor, vfx.shockwaveScale);
        this.cameraTrauma = Math.min(1, this.cameraTrauma + vfx.shakeTrauma);
        this.cameraFovKick = Math.max(this.cameraFovKick, vfx.fovKick);
        this.frenzyImpactPulse = Math.min(
          1,
          this.frenzyImpactPulse + (vfx.kind === 'light' ? 0.25 : 0.55)
        );
        this.hitstopTimer = Math.max(this.hitstopTimer, vfx.hitstop);
        this.sound.playHit(vfx.kind !== 'light');
        this.spawnParticles(b.x, 1.35, b.z, vfx.secondaryColor, 10, 5.5);
        this.pushDamagePopup(
          b.x,
          1.85,
          b.z,
          String(damage),
          vfx.kind === 'finisher' ? 'finisher' : vfx.kind === 'heavy' ? 'heavy' : 'light',
          move?.isFinisher ? move.name : undefined
        );
        this.recordQuestProgress('q_combo', 1);
      }
    }
    return hitAny;
  }

  private applyHit(
    attacker: FighterActor,
    defender: FighterActor,
    baseDamage: number,
    dirX: number,
    dirZ: number,
    knockback: number,
    launchY: number,
    hitstop: number,
    heavyFeel: boolean,
    kindOverride?: HitImpactKind
  ): void {
    if (defender.isKo || defender.dodgeTimer > 0) return;

    const isParryCounter = attacker.isPlayer && this.parryCounterTimer > 0;
    const isCounterHit = defender.staggerTimer > 0 || isParryCounter;
    const scaled = computeScaledDamage(
      baseDamage,
      attacker.classId,
      attacker.isPlayer ? this.customization.frame : 'balanced',
      attacker.comboCount,
      isCounterHit
    );
    if (isParryCounter && !defender.isBlocking) {
      this.parryCounterTimer = 0;
    }

    const def = resolveIncomingHit({
      rawDamage: scaled,
      isBlocking: defender.isBlocking,
      timeSinceBlockPress: defender.blockHoldTime,
      defenderStamina: defender.stamina,
      autoAssist: defender.isPlayer ? this.progress.autoAssist : false,
    });

    const auraHex = attacker.isPlayer ? AURA_HEX[this.customization.aura] : '#f87171';
    const contactX = defender.x - dirX * 0.25;
    const contactY = defender.y + 1.28;
    const contactZ = defender.z - dirZ * 0.25;

    if (def.outcome === 'parry') {
      const parryVfx = resolveHitVfxProfile({
        kindOverride: 'parry',
        auraHex: '#facc15',
        comboCount: 0,
      });
      attacker.staggerTimer = def.attackerStunDuration;
      attacker.activeMove = null;
      attacker.aiState = 'recover';
      attacker.aiTimer = def.attackerStunDuration;
      defender.stamina = Math.min(MAX_STAMINA, defender.stamina + def.staminaRefund);
      this.hitstopTimer = parryVfx.hitstop;
      this.cameraTrauma = Math.min(1, this.cameraTrauma + parryVfx.shakeTrauma);
      this.cameraFovKick = Math.max(this.cameraFovKick, parryVfx.fovKick);
      this.sound.playParry();
      this.hitVfx.spawnHitImpact(contactX, contactY, contactZ, -dirX, -dirZ, parryVfx);
      this.spawnShockwave(defender.x, defender.z, '#facc15', parryVfx.shockwaveScale);
      this.spawnParticles(defender.x, 1.25, defender.z, '#fde047', 16, 7.5);
      this.pushDamagePopup(defender.x, defender.y + 2.0, defender.z, 'PARRY!', 'parry', '1.45x COUNTER');
      if (defender.isPlayer) {
        this.parryCounterTimer = 3.2;
        this.gainPlayerUltimate(def.defenderUltGain);
        this.matchParries += 1;
        this.recordQuestProgress('q_parry', 1);
        this.recordReplayHighlight(
          'parry',
          'PERFECT PARRY',
          `Deflected ${attacker.name} · 1.45x Counter Opened`,
          0,
          defender.comboCount,
          145
        );
        this.pushCallout('PERFECT PARRY!', '1.45x COUNTER READY · +25 STAM · +28 ULT', 'amber');
      } else if (this.spectatorActive) {
        this.spectatorFocusEvent = 'parry';
        this.spectatorFocusTimer = 1.65;
        this.spectatorEventLabel = `PARRY CLASH! · ${defender.name} DEFLECTS ${attacker.name}`;
      }
      return;
    }

    defender.stamina = Math.max(0, defender.stamina - def.staminaCost);
    if (this.zone === 'dojo' && defender.isPlayer) {
      // In Dojo sparring, keep player standing for uninterrupted parry & combo drills
      defender.hp = Math.max(12, defender.hp - def.finalDamage);
      this.dojoRegenTimer = 2.2;
    } else {
      defender.hp = Math.max(0, defender.hp - def.finalDamage);
    }
    defender.hitFlash = 1.0;

    if (def.outcome === 'block') {
      const blockVfx = resolveHitVfxProfile({
        kindOverride: 'block',
        auraHex: '#38bdf8',
        comboCount: 0,
      });
      defender.vx += dirX * knockback * def.knockbackMult;
      defender.vz += dirZ * knockback * def.knockbackMult;
      this.cameraTrauma = Math.min(1, this.cameraTrauma + blockVfx.shakeTrauma);
      this.sound.playBlock();
      this.hitVfx.spawnHitImpact(contactX, contactY, contactZ, dirX, dirZ, blockVfx);
      this.spawnParticles(defender.x, 1.2, defender.z, '#38bdf8', 6, 4.0);
      this.pushDamagePopup(defender.x, defender.y + 1.85, defender.z, `-${def.finalDamage}`, 'block', 'BLOCK');
      if (defender.isPlayer) {
        this.gainPlayerUltimate(def.defenderUltGain);
      }
      return;
    }

    // Clean hit landed — weight-scaled Light / Heavy / Finisher particle sparks & screen shake!
    const vfx = resolveHitVfxProfile({
      move: attacker.activeMove,
      kindOverride: kindOverride ?? (heavyFeel && !attacker.activeMove ? 'heavy' : undefined),
      auraHex,
      comboCount: attacker.comboCount + 1,
    });

    const armorResist = HERO_CLASSES[defender.classId].staggerResist;
    const kb = knockback * (1 - armorResist * 0.4);
    defender.vx = dirX * kb;
    defender.vz = dirZ * kb;
    if (launchY > 0.5) {
      defender.vy = Math.max(defender.vy, launchY);
      defender.grounded = false;
    }

    if (heavyFeel || armorResist < 0.35) {
      defender.staggerTimer = Math.max(defender.staggerTimer, heavyFeel ? 0.42 : 0.24);
      defender.activeMove = null;
      if (launchY > 4.0) {
        defender.knockdownTimer = 0.65;
      }
    }

    const prevCombo = attacker.comboCount;
    attacker.comboCount += 1;
    attacker.comboDisplayTimer = COMBO_DECAY_DURATION;

    if (attacker.isPlayer) {
      this.matchDamageDealt += def.finalDamage;
      this.matchMaxCombo = Math.max(this.matchMaxCombo, attacker.comboCount);
      this.gainPlayerUltimate(heavyFeel ? 14 : 9);
      this.recordQuestProgress('q_combo', 1);

      const logToken =
        kindOverride === 'ultimate'
          ? 'ULT'
          : kindOverride === 'skill'
            ? 'S'
            : attacker.activeMove
              ? attacker.activeMove.sequence.slice(-1)
              : 'L';
      const logMoveName =
        kindOverride === 'ultimate'
          ? HERO_CLASSES[attacker.classId].ultimateName
          : kindOverride === 'skill'
            ? HERO_CLASSES[attacker.classId].skillName
            : attacker.activeMove
              ? attacker.activeMove.name
              : attacker.lastComboName || 'Strike';
      const isFinisherHit =
        kindOverride === 'ultimate' ||
        (kindOverride !== 'skill' && Boolean(attacker.activeMove?.isFinisher));
      this.combatLogState = recordCombatLogHit(this.combatLogState, {
        token: logToken,
        moveName: logMoveName,
        damage: def.finalDamage,
        targetName: defender.name,
        isFinisher: isFinisherHit,
        comboCount: attacker.comboCount,
      });
      this.archiveLatestFinisherIfNeeded(isFinisherHit);
      this.triggerComboMilestoneCheck(prevCombo, attacker.comboCount, defender.x, defender.z);
      if (shouldTriggerEmoteSpotlight(attacker.comboCount, isFinisherHit)) {
        this.triggerEmoteSpotlight(
          isFinisherHit ? `${logMoveName.toUpperCase()} SPOTLIGHT` : `${attacker.comboCount}x COMBO SPOTLIGHT`,
          2.2
        );
      }

      if (attacker.comboCount >= 3 && heavyFeel && !attacker.activeMove?.isFinisher) {
        this.pushCallout(`${attacker.comboCount} HIT COMBO!`, attacker.lastComboName.toUpperCase(), 'amber');
      }
      if (kindOverride === 'ultimate') {
        this.recordReplayHighlight(
          'ultimate',
          logMoveName.toUpperCase(),
          `Ultimate Impact on ${defender.name}`,
          def.finalDamage,
          attacker.comboCount,
          210 + def.finalDamage
        );
      } else if (isFinisherHit) {
        this.recordReplayHighlight(
          'finisher',
          logMoveName.toUpperCase(),
          `${attacker.comboCount}-Hit Combo Finisher vs ${defender.name}`,
          def.finalDamage,
          attacker.comboCount,
          165 + attacker.comboCount * 15 + def.finalDamage
        );
      } else if (attacker.comboCount >= 4 && attacker.comboCount % 2 === 0) {
        this.recordReplayHighlight(
          'combo',
          `${attacker.comboCount}-HIT BLITZ`,
          `${logMoveName} chain vs ${defender.name}`,
          def.finalDamage,
          attacker.comboCount,
          120 + attacker.comboCount * 16
        );
      }
    } else if (defender.isPlayer) {
      this.gainPlayerUltimate(def.defenderUltGain);
      this.combatLogState = flushCombatLogString(this.combatLogState);
      this.player.comboCount = 0;
      this.player.comboDisplayTimer = 0;
    } else if (this.spectatorActive && (heavyFeel || attacker.comboCount >= 3)) {
      this.spectatorFocusEvent = 'finisher';
      this.spectatorFocusTimer = 1.75;
      this.spectatorEventLabel = `FINISHER ZOOM! · ${attacker.name} ${attacker.comboCount}x COMBO`;
    }

    this.hitstopTimer = Math.max(this.hitstopTimer, hitstop, vfx.hitstop);
    this.cameraTrauma = Math.min(1, this.cameraTrauma + vfx.shakeTrauma);
    this.cameraFovKick = Math.max(this.cameraFovKick, vfx.fovKick);
    if (attacker.isPlayer) {
      this.frenzyImpactPulse = Math.min(
        1,
        this.frenzyImpactPulse + (vfx.kind === 'finisher' ? 0.85 : vfx.kind === 'heavy' ? 0.55 : 0.28)
      );
    } else if (defender.isPlayer) {
      this.frenzyImpactPulse = Math.max(this.frenzyImpactPulse, 0.35);
    }
    this.sound.playHit(heavyFeel || vfx.kind !== 'light');

    // Trigger velocity-aligned additive hit-sparks + contact starburst flash + ground shockwave!
    this.hitVfx.spawnHitImpact(contactX, contactY, contactZ, dirX, dirZ, vfx);
    if (vfx.kind !== 'light') {
      this.spawnShockwave(defender.x, defender.z, vfx.secondaryColor, vfx.shockwaveScale);
    }
    this.spawnParticles(
      contactX,
      contactY,
      contactZ,
      vfx.secondaryColor,
      heavyFeel ? 14 : 7,
      heavyFeel ? 7.2 : 4.5
    );
    const popupLabel = isParryCounter
      ? 'COUNTER!'
      : vfx.kind === 'finisher'
        ? attacker.lastComboName
        : vfx.kind === 'heavy'
          ? 'HEAVY!'
          : undefined;
    this.pushDamagePopup(
      defender.x,
      defender.y + 1.9,
      defender.z,
      `${def.finalDamage}`,
      isParryCounter || vfx.kind === 'finisher' || vfx.kind === 'ultimate'
        ? 'finisher'
        : vfx.kind === 'heavy' || vfx.kind === 'skill'
          ? 'heavy'
          : 'light',
      popupLabel
    );

    // Check KO (Dojo Training Dummies auto-reset for continuous practice!)
    if (defender.hp <= 0 && !defender.isKo) {
      if (defender.isTrainingDummy || defender.id.startsWith('spectator-duel-')) {
        defender.hp = defender.maxHp;
        defender.ghostHp = defender.maxHp;
        defender.staggerTimer = 0.65;
        defender.activeMove = null;
        defender.aiState = 'recover';
        defender.aiTimer = 1.0;
        this.combatLogState = flushCombatLogString(this.combatLogState);
        this.spawnShockwave(defender.x, defender.z, '#10b981', 3.6);
        this.spawnParticles(defender.x, 1.25, defender.z, '#34d399', 18, 6.5);
        if (defender.isTrainingDummy) {
          this.pushCallout('DUMMY RESET!', `${defender.name} READY FOR NEXT DRILL`, 'emerald');
        }
        return;
      }
      defender.isKo = true;
      defender.koTimer = 0;
      defender.vy = 5.5;
      defender.grounded = false;
      this.hitstopTimer = 0.11;
      this.cameraTrauma = 0.72;
      this.combatLogState = flushCombatLogString(this.combatLogState);
      this.spawnShockwave(defender.x, defender.z, '#ef4444', 5.2);
      this.spawnParticles(defender.x, 1.2, defender.z, '#facc15', 28, 8.5);
      if (attacker.isPlayer) {
        this.recordReplayHighlight(
          'ko',
          `KNOCKOUT · ${defender.name}`,
          `Decisive finishing blow (${def.finalDamage} DMG)`,
          def.finalDamage,
          attacker.comboCount,
          260 + def.finalDamage
        );
        this.pushCallout('K.O.!', `${defender.name} DEFEATED`, 'amber');
      }
      this.checkMatchCompletion();
    }
  }

  private checkMatchCompletion(): void {
    if (this.matchEndDelay >= 0 || this.roundTransitionTimer > 0) return;
    if (this.zone === 'hub' || this.zone === 'dojo') return;

    // Best-of-3 Round handling in 1v1 Arena
    if (this.zone === 'arena' && this.arenaRounds) {
      const aliveEnemies = this.actors.filter((a) => !a.isPlayer && !a.isKo && a.aiPolicy !== 'hub_npc');
      if (this.player.isKo || aliveEnemies.length === 0) {
        const playerWonRound = !this.player.isKo;
        const roundRes = resolveArenaRoundEnd(
          this.arenaRounds,
          playerWonRound ? 'player' : 'opponent'
        );
        this.arenaRounds = roundRes.next;
        if (!roundRes.matchFinished) {
          this.roundTransitionTimer = 1.85;
          this.roundBanner = playerWonRound ? 'ROUND WON!' : 'ROUND LOST';
          this.roundBannerTimer = 1.8;
          if (playerWonRound) {
            this.sound.playVictory();
            this.spawnShockwave(this.player.x, this.player.z, '#facc15', 4.8);
          } else {
            this.sound.playDefeat();
          }
          this.emitHud();
          return;
        }
      }
    }

    const highlights = selectTopReplayHighlights(this.replayHighlights, 4);

    if (this.zone === 'clan_siege' && this.clanSiegePlan) {
      const allyAlive = this.actors.filter((a) => a.team === 'ally' && !a.isKo).length;
      const enemyAlive = this.actors.filter((a) => a.team === 'enemy' && !a.isKo).length;
      const outcome = evaluateClanSiegeOutcome({
        allyAlive,
        enemyAlive,
        playerKo: this.player.isKo,
        format: this.clanSiegePlan.format,
      });
      if (!outcome.finished) return;

      this.matchEndDelay = 1.45;
      this.matchFinishOverlay = outcome.victory ? 'victory' : 'defeat';
      const winnerActor = outcome.victory
        ? this.actors.find((a) => a.team === 'ally' && !a.isKo) ?? this.player
        : this.actors.find((a) => a.team === 'enemy' && !a.isKo) ?? null;
      this.matchFinishWinnerId = winnerActor?.id ?? null;

      if (outcome.victory) {
        this.sound.playVictory();
        this.progress.wins += 1;
        this.recordQuestProgress('q_win', 1);
        this.spawnParticles(this.player.x, 1.4, this.player.z, '#facc15', 36, 9.0);
        this.spawnShockwave(this.player.x, this.player.z, '#f97316', 7.5);
      } else {
        this.sound.playDefeat();
      }
      const itemDrop = rollMatchItemDrop({
        victory: outcome.victory,
        maxCombo: this.matchMaxCombo,
        parriesLanded: this.matchParries,
        seed: this.progress.wins + this.matchMaxCombo,
      });
      const totalCoins = outcome.coinsEarned;
      const levelBefore = this.progress.level;
      this.awardXpAndCoins(outcome.xpEarned, totalCoins);
      const siegeVoice = selectCharacterVoiceLine(
        this.customization.classId,
        outcome.victory ? 'victory' : 'defeat',
        this.progress.wins + this.matchDamageDealt
      );
      this.pendingSummary = {
        victory: outcome.victory,
        mode: 'clan_siege',
        title: outcome.victory
          ? `CLAN SIEGE VICTORY!`
          : `${this.clanSiegePlan.rivalClanName.toUpperCase()} PREVAILED`,
        subtitle: outcome.victory
          ? `${this.clanSiegePlan.allyClanName} defeated ${this.clanSiegePlan.rivalClanName} (${this.clanSiegePlan.format}) at ${this.clanSiegePlan.venueName}`
          : `${enemyAlive}/${this.clanSiegePlan.teamSize} rival clan fighters held ${this.clanSiegePlan.venueName}`,
        elapsedSeconds: Math.round(this.matchTimer),
        maxCombo: this.matchMaxCombo,
        parriesLanded: this.matchParries,
        damageDealt: this.matchDamageDealt,
        coinsEarned: totalCoins,
        xpEarned: outcome.xpEarned,
        levelBefore,
        levelAfter: this.progress.level,
        xpAfter: this.progress.xp,
        xpToNext: computeXpToNextLevel(this.progress.level),
        leveledUp: this.progress.level > levelBefore,
        voiceLine: {
          classId: siegeVoice.classId,
          personaLabel: siegeVoice.personaLabel,
          line: siegeVoice.line,
          accentHex: siegeVoice.accentHex,
        },
        itemDrop,
        replayHighlights: highlights,
      };
      this.emitHud();
      return;
    }

    if (this.player.isKo) {
      this.matchEndDelay = 1.4;
      this.matchFinishOverlay = 'defeat';
      const opp = this.actors.find((a) => !a.isPlayer && !a.isKo);
      this.matchFinishWinnerId = opp?.id ?? null;
      this.sound.playDefeat();
      const levelBefore = this.progress.level;
      const itemDrop = rollMatchItemDrop({
        victory: false,
        maxCombo: this.matchMaxCombo,
        parriesLanded: this.matchParries,
        seed: this.progress.wins + this.matchMaxCombo,
      });
      const totalCoins = 40;
      this.awardXpAndCoins(45, totalCoins);
      const currentRankSpec = getArenaRankSpec(this.arenaRankState.rank);
      const defeatVoice = selectCharacterVoiceLine(
        this.customization.classId,
        'defeat',
        this.progress.wins + this.matchDamageDealt
      );
      this.pendingSummary = {
        victory: false,
        mode: this.zone,
        title: 'DEFEATED',
        subtitle: opp
          ? `${opp.name} held with ${Math.ceil(opp.hp)} HP remaining`
          : 'Eliminated in the arena',
        elapsedSeconds: Math.round(this.matchTimer),
        maxCombo: this.matchMaxCombo,
        parriesLanded: this.matchParries,
        damageDealt: this.matchDamageDealt,
        coinsEarned: totalCoins,
        xpEarned: 45,
        levelBefore,
        levelAfter: this.progress.level,
        xpAfter: this.progress.xp,
        xpToNext: computeXpToNextLevel(this.progress.level),
        leveledUp: this.progress.level > levelBefore,
        arenaProgress:
          this.zone === 'arena'
            ? {
                rankBefore: currentRankSpec.rank,
                rankAfter: currentRankSpec.rank,
                rankNameAfter: currentRankSpec.name,
                tierAfter: currentRankSpec.tier,
                tierNameAfter: currentRankSpec.tierName,
                accentHex: currentRankSpec.accentHex,
                winsInRank: this.arenaRankState.winsInRank,
                winsRequired: currentRankSpec.winsRequiredToAdvance,
                rankedUp: false,
                tierChanged: false,
              }
            : undefined,
        roundScore: this.arenaRounds
          ? {
              playerRounds: this.arenaRounds.playerRounds,
              opponentRounds: this.arenaRounds.opponentRounds,
              maxRounds: this.arenaRounds.maxRounds,
            }
          : undefined,
        voiceLine: {
          classId: defeatVoice.classId,
          personaLabel: defeatVoice.personaLabel,
          line: defeatVoice.line,
          accentHex: defeatVoice.accentHex,
        },
        itemDrop,
        replayHighlights: highlights,
        bossIndex: this.zone === 'campaign' ? this.activeBossIndex : undefined,
      };
      this.emitHud();
      return;
    }

    const aliveEnemies = this.actors.filter((a) => !a.isPlayer && !a.isKo && a.aiPolicy !== 'hub_npc');
    if (aliveEnemies.length === 0) {
      this.matchEndDelay = 1.45;
      this.matchFinishOverlay = 'victory';
      this.matchFinishWinnerId = this.player.id;
      this.sound.playVictory();
      this.spawnParticles(this.player.x, 1.45, this.player.z, '#facc15', 38, 9.2);
      this.spawnParticles(this.player.x, 1.25, this.player.z, '#f97316', 24, 7.6);
      this.spawnShockwave(this.player.x, this.player.z, '#f59e0b', 7.8);
      this.progress.wins += 1;
      this.recordQuestProgress('q_win', 1);

      let coins = 160;
      let xp = 120;
      let title = 'VICTORY!';
      let subtitle = 'Arena Duel Champion';
      let hasNextBoss = false;
      let arenaProgress: MatchSummary['arenaProgress'];

      if (this.zone === 'arena') {
        const rankBefore = this.arenaRankState.rank;
        const rankRes = recordArenaWin(this.arenaRankState);
        this.arenaRankState = rankRes.next;
        saveArenaRankState(this.arenaRankState);
        this.syncPlayerOverheadRankBadge();
        const rSpec = rankRes.newRankSpec;
        const newlyUnlockedEmote = getNewlyUnlockedRankEmote(rankBefore, rSpec.rank);
        coins = 160 + rSpec.tier * 25;
        xp = 135 + rSpec.rank * 4;
        title = rankRes.rankedUp
          ? `RANK UP · #${rSpec.rank} ${rSpec.name.toUpperCase()}!`
          : '1v1 ARENA VICTORY!';
        subtitle = newlyUnlockedEmote
          ? `Unlocked Tier ${rSpec.tier} Rank Emote: ${newlyUnlockedEmote.name}!`
          : rankRes.tierChanged
            ? `Entered Tier ${rSpec.tier}: ${rSpec.tierName} · Unlocked ${ARENA_BIOMES[rSpec.biomeId].name}`
            : `Rank #${rSpec.rank} ${rSpec.name} (${rSpec.tierName}) · ${ARENA_BIOMES[this.arenaRankState.selectedBiome].name}`;
        arenaProgress = {
          rankBefore,
          rankAfter: rSpec.rank,
          rankNameAfter: rSpec.name,
          tierAfter: rSpec.tier,
          tierNameAfter: rSpec.tierName,
          accentHex: rSpec.accentHex,
          winsInRank: this.arenaRankState.winsInRank,
          winsRequired: rSpec.winsRequiredToAdvance,
          rankedUp: rankRes.rankedUp,
          tierChanged: rankRes.tierChanged,
          unlockedEmoteName: newlyUnlockedEmote?.name,
        };
      } else if (this.zone === 'campaign') {
        const boss = CAMPAIGN_BOSSES[this.activeBossIndex];
        coins = boss.rewardCoins;
        xp = 150 + this.activeBossIndex * 40;
        title = `${boss.name} DEFEATED!`;
        subtitle = `${boss.lessonTitle} Cleared`;
        this.progress.highestBossCleared = Math.max(
          this.progress.highestBossCleared,
          this.activeBossIndex
        );
        hasNextBoss = this.activeBossIndex < CAMPAIGN_BOSSES.length - 1;
      } else if (this.zone === 'royale') {
        coins = 280;
        xp = 200;
        title = 'LAST HERO STANDING!';
        subtitle = `Outlasted all ${this.royaleTotal - 1} rivals`;
      }

      const itemDrop = rollMatchItemDrop({
        victory: true,
        maxCombo: this.matchMaxCombo,
        parriesLanded: this.matchParries,
        seed: this.progress.wins + this.matchMaxCombo,
      });
      const totalCoins = coins;
      const levelBefore = this.progress.level;
      this.awardXpAndCoins(xp, totalCoins);
      const victoryVoice = selectCharacterVoiceLine(
        this.customization.classId,
        'victory',
        this.progress.wins + this.matchDamageDealt
      );
      this.pendingSummary = {
        victory: true,
        mode: this.zone,
        title,
        subtitle,
        elapsedSeconds: Math.round(this.matchTimer),
        maxCombo: this.matchMaxCombo,
        parriesLanded: this.matchParries,
        damageDealt: this.matchDamageDealt,
        coinsEarned: totalCoins,
        xpEarned: xp,
        levelBefore,
        levelAfter: this.progress.level,
        xpAfter: this.progress.xp,
        xpToNext: computeXpToNextLevel(this.progress.level),
        leveledUp: this.progress.level > levelBefore,
        arenaProgress,
        roundScore: this.arenaRounds
          ? {
              playerRounds: this.arenaRounds.playerRounds,
              opponentRounds: this.arenaRounds.opponentRounds,
              maxRounds: this.arenaRounds.maxRounds,
            }
          : undefined,
        voiceLine: {
          classId: victoryVoice.classId,
          personaLabel: victoryVoice.personaLabel,
          line: victoryVoice.line,
          accentHex: victoryVoice.accentHex,
        },
        itemDrop,
        replayHighlights: highlights,
        bossIndex: this.zone === 'campaign' ? this.activeBossIndex : undefined,
        hasNextBoss,
      };
      this.emitHud();
    }
  }

  private getMoveInputX(): number {
    let x = this.joyX;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    return Math.max(-1, Math.min(1, x));
  }

  private getMoveInputZ(): number {
    let z = this.joyZ;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;
    return Math.max(-1, Math.min(1, z));
  }

  private updateActorPhysics(actor: FighterActor, dt: number): void {
    const worldRadius = this.world ? this.world.arenaRadius : 20;

    // Gravity & landing
    if (!actor.grounded) {
      actor.vy -= 26.5 * dt;
      actor.y += actor.vy * dt;
      if (actor.y <= 0) {
        actor.y = 0;
        actor.vy = 0;
        actor.grounded = true;
        actor.squashX = 1.2;
        actor.squashY = 0.8;
      }
    } else {
      actor.coyoteTimer = 0.1;
    }

    // Damped squash & stretch recovery
    actor.squashX = THREE.MathUtils.damp(actor.squashX, 1, 14, dt);
    actor.squashY = THREE.MathUtils.damp(actor.squashY, 1, 14, dt);

    // Move
    actor.x += actor.vx * dt;
    actor.z += actor.vz * dt;

    // Friction
    const dampRate = actor.staggerTimer > 0 ? 5.0 : 11.5;
    actor.vx = THREE.MathUtils.damp(actor.vx, 0, dampRate, dt);
    actor.vz = THREE.MathUtils.damp(actor.vz, 0, dampRate, dt);

    // Check Smashable Crates collision (environmental knockback bonus!)
    if (this.world) {
      for (const crate of this.world.crates) {
        if (crate.broken) continue;
        const dx = actor.x - crate.x;
        const dz = actor.z - crate.z;
        const dist = Math.hypot(dx, dz);
        const minDist = crate.radius + 0.55;
        if (dist < minDist) {
          const speed = Math.hypot(actor.vx, actor.vz);
          if (actor.staggerTimer > 0 && speed > 4.0) {
            crate.broken = true;
            crate.mesh.visible = false;
            actor.hp = Math.max(0, actor.hp - CRATE_SMASH_BONUS_DAMAGE);
            actor.hitFlash = 1.0;
            this.hitstopTimer = 0.065;
            this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.45);
            this.sound.playCrateBreak();
            this.spawnParticles(crate.x, 0.8, crate.z, '#d97706', 22, 8.2);
            this.pushCallout('CRATE SMASH!', `+${CRATE_SMASH_BONUS_DAMAGE} BONUS DAMAGE`, 'amber');
            if (actor.hp <= 0 && !actor.isKo) {
              actor.isKo = true;
              actor.koTimer = 0;
              this.checkMatchCompletion();
            }
          } else {
            const nx = dist > 0.001 ? dx / dist : 1;
            const nz = dist > 0.001 ? dz / dist : 0;
            actor.x = crate.x + nx * minDist;
            actor.z = crate.z + nz * minDist;
          }
        }
      }

      // Arena Pillars (WALL BOUNCE bonus damage!)
      for (const p of this.world.pillars) {
        const dx = actor.x - p.x;
        const dz = actor.z - p.z;
        const dist = Math.hypot(dx, dz);
        const minDist = p.radius + 0.55;
        if (dist < minDist) {
          const nx = dist > 0.001 ? dx / dist : 1;
          const nz = dist > 0.001 ? dz / dist : 0;
          actor.x = p.x + nx * minDist;
          actor.z = p.z + nz * minDist;
          const speed = Math.hypot(actor.vx, actor.vz);
          if (actor.staggerTimer > 0 && speed > 5.0 && !actor.isPlayer && !actor.isKo) {
            actor.vx = nx * 5.2;
            actor.vz = nz * 5.2;
            actor.vy = 4.6;
            actor.grounded = false;
            actor.hp = Math.max(0, actor.hp - WALL_BOUNCE_BONUS_DAMAGE);
            actor.hitFlash = 1.0;
            this.hitstopTimer = 0.07;
            this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.42);
            this.sound.playHit(true);
            this.spawnShockwave(p.x, p.z, '#f59e0b', 3.4);
            this.pushCallout('WALL BOUNCE!', `+${WALL_BOUNCE_BONUS_DAMAGE} JUGGLE EXTEND`, 'amber');
            if (actor.hp <= 0 && !actor.isKo) {
              actor.isKo = true;
              actor.koTimer = 0;
              this.checkMatchCompletion();
            }
          }
        }
      }

      // Dojo interactive functional blocks (Trampoline & Dash Pad!) — dynamic for ALL fighters in Clan Siege!
      if (
        (this.zone === 'dojo' && actor.isPlayer) ||
        (this.zone === 'clan_siege' && !actor.isKo)
      ) {
        for (const b of this.getActiveDojoBlocks()) {
          const d = Math.hypot(actor.x - b.x, actor.z - b.z);
          if (b.type === 'trampoline' && d < 1.25 && actor.grounded) {
            actor.vy = 14.5;
            actor.grounded = false;
            actor.squashX = 0.8;
            actor.squashY = 1.28;
            if (actor.isPlayer) {
              this.sound.playBounce();
              this.pushCallout('BOUNCE PAD!', 'AIR LAUNCH', 'cyan');
            }
            this.spawnShockwave(b.x, b.z, '#06b6d4', 2.8);
          } else if (b.type === 'dashpad' && d < 1.35) {
            const fx = Math.sin(b.rotation);
            const fz = Math.cos(b.rotation);
            actor.vx = fx * 18;
            actor.vz = fz * 18;
            if (actor.isPlayer) {
              this.sound.playDash();
            }
            this.spawnParticles(b.x, 0.4, b.z, '#10b981', 8, 5.0);
          }
        }
      }
    }

    // Perimeter containment
    if (this.zone === 'dojo' || this.zone === 'clan_siege') {
      const lim = worldRadius - 1.0;
      actor.x = Math.max(-lim, Math.min(lim, actor.x));
      actor.z = Math.max(-lim, Math.min(lim, actor.z));
    } else {
      const distFromCenter = Math.hypot(actor.x, actor.z);
      const maxR = worldRadius - 0.85;
      if (distFromCenter > maxR) {
        const nx = actor.x / distFromCenter;
        const nz = actor.z / distFromCenter;
        actor.x = nx * maxR;
        actor.z = nz * maxR;
      }
    }

    // Ghost HP bar smooth trailing drain
    actor.ghostHp = THREE.MathUtils.damp(actor.ghostHp, actor.hp, 4.5, dt);
    actor.hitFlash = Math.max(0, actor.hitFlash - dt * 5.5);
    actor.skillCooldown = Math.max(0, actor.skillCooldown - dt);
    actor.timeSinceStaminaAction += dt;
    actor.stamina = stepStamina(actor.stamina, dt, actor.isBlocking, actor.timeSinceStaminaAction);

    if (actor.comboDisplayTimer > 0) {
      actor.comboDisplayTimer = Math.max(0, actor.comboDisplayTimer - dt);
      if (actor.comboDisplayTimer <= 0) {
        if (actor.isPlayer) {
          this.combatLogState = flushCombatLogString(this.combatLogState);
        }
        actor.comboCount = 0;
      }
    }

    // Smooth Dojo practice HP recovery after stepping back from sparring dummies
    if (actor.isPlayer && this.zone === 'dojo' && actor.hp < actor.maxHp) {
      if (this.dojoRegenTimer > 0) {
        this.dojoRegenTimer = Math.max(0, this.dojoRegenTimer - dt);
      } else {
        actor.hp = Math.min(actor.maxHp, actor.hp + 24 * dt);
      }
    }

    if (actor.isKo) {
      actor.koTimer += dt * 2.2;
    }
    if (actor.staggerTimer > 0) actor.staggerTimer = Math.max(0, actor.staggerTimer - dt);
    if (actor.knockdownTimer > 0) actor.knockdownTimer = Math.max(0, actor.knockdownTimer - dt);
    if (actor.emote) {
      actor.emoteTimer += dt;
      if (actor.isPlayer && actor.emoteTimer > 3.2) {
        actor.emote = null;
      }
    }

    // Sync Rig transform & animation
    actor.rig.root.position.set(actor.x, actor.y, actor.z);
    actor.rig.root.rotation.y = actor.yaw;
    actor.rig.contactShadow.position.y = -actor.y + 0.018;
    const shadowScale = Math.max(0.45, 1 - actor.y * 0.08);
    actor.rig.contactShadow.scale.setScalar(shadowScale);

    const moveTotal = actor.activeMove
      ? actor.activeMove.windup + actor.activeMove.active + actor.activeMove.recovery
      : 1;
    const speedMag = Math.hypot(actor.vx, actor.vz);
    const maxSpeed = computeHeroSpeed(actor.classId, 'balanced');

    const animState: HeroAnimState = {
      time: this.elapsed,
      walkPhase: actor.walkPhase,
      speedNorm: Math.min(1, speedMag / maxSpeed),
      grounded: actor.grounded,
      vy: actor.vy,
      attackMove: actor.activeMove,
      attackProgress: actor.activeMove ? Math.min(1, actor.moveTimer / moveTotal) : 0,
      isBlocking: actor.isBlocking,
      isDodging: actor.dodgeTimer > 0,
      isStaggered: actor.staggerTimer > 0,
      isKnockedDown: actor.knockdownTimer > 0,
      isKo: actor.isKo,
      koProgress: actor.koTimer,
      telegraphGlow:
        !actor.isPlayer && actor.aiState === 'telegraph'
          ? Math.min(1, 1 - actor.aiTimer / Math.max(0.05, actor.aiTelegraphDuration))
          : 0,
      hitFlash: actor.hitFlash,
      emote: actor.emote,
      emoteTimer: actor.emoteTimer,
      isUltimate: actor.isPlayer && this.ultimateTimer > 0,
      squashX: actor.squashX,
      squashY: actor.squashY,
      petActionPulse: actor.isPlayer && this.petActionTimer > 0 ? this.petActionTimer / 0.65 : 0,
    };
    actor.rig.updateAnimation(animState);
  }

  private updatePlayer(dt: number): void {
    const p = this.player;
    if (p.isKo) return;

    // Handle active Ultimate cinematic finisher
    if (this.ultimateTimer > 0) {
      this.ultimateTimer -= dt;
      if (!this.ultimateDamageApplied && this.ultimateTimer <= 1.05) {
        this.ultimateDamageApplied = true;
        this.cameraTrauma = 0.85;
        this.hitstopTimer = 0.09;
        this.spawnShockwave(p.x, p.z, AURA_HEX[this.customization.aura], 9.5);
        this.spawnParticles(p.x, 1.4, p.z, '#fde047', 34, 10.5);
        this.applyAoeSkillHit(p, p.x, p.z, 8.8, 52, 13.5, 6.2, 'ultimate');
      }
      return;
    }

    // Blocking / Parry state
    const blockPressed = this.keys.has('KeyL') || this.keys.has('KeyQ') || this.touchBlockHeld;
    if (blockPressed && !p.activeMove && p.dodgeTimer <= 0 && p.staggerTimer <= 0 && p.stamina > 4) {
      if (!p.isBlocking) {
        p.blockHoldTime = 0;
      }
      p.isBlocking = true;
      p.blockHoldTime += dt;
      p.emote = null;
    } else {
      p.isBlocking = false;
      p.blockHoldTime = 0;
    }

    // Consume buffered action (150ms / 220ms with Auto-Assist)
    const buffered = consumeBufferedInput(this.bufferedInput, this.elapsed, this.progress.autoAssist);
    if (buffered) {
      if (this.executePlayerAction(buffered)) {
        this.bufferedInput = null;
      }
    }

    // Active Dodge-Dash movement
    if (p.dodgeTimer > 0) {
      p.dodgeTimer -= dt;
      p.vx = p.dodgeDirX * 15.5;
      p.vz = p.dodgeDirZ * 15.5;
      return;
    }

    // Active Combo Move execution (windup -> active hitbox + 3D slash arc -> recovery)
    if (p.activeMove) {
      p.moveTimer += dt * HERO_CLASSES[p.classId].attackSpeed;
      const m = p.activeMove;
      if (!p.moveHitApplied && p.moveTimer >= m.windup) {
        p.moveHitApplied = true;
        // Trigger synchronized 3D weapon slash-arc trail right on the active frame!
        this.hitVfx.spawnSlashArc(
          p.x,
          p.y,
          p.z,
          p.yaw,
          resolveSlashArcProfile(m),
          AURA_HEX[this.customization.aura]
        );
        const fx = Math.sin(p.yaw);
        const fz = Math.cos(p.yaw);
        const hitX = p.x + fx * (m.range * 0.55);
        const hitZ = p.z + fz * (m.range * 0.55);
        const moveDamage = computeFinisherMoveDamage(m);
        let finisherLanded = false;

        for (const target of this.actors) {
          if (!this.isHostile(p, target)) continue;
          const d = Math.hypot(target.x - hitX, target.z - hitZ);
          if (d <= m.range * 0.78) {
            const wasDodging = target.dodgeTimer > 0;
            this.applyHit(
              p,
              target,
              moveDamage,
              fx,
              fz,
              m.knockback,
              m.launchY,
              m.hitstop,
              m.isFinisher || m.damage >= 18
            );
            if (m.isFinisher && !wasDodging) {
              finisherLanded = true;
            }
          }
        }
        const hitDummy = this.checkDojoDummyHit(hitX, hitZ, m.range * 0.78, moveDamage, m);
        if (m.isFinisher && (finisherLanded || hitDummy)) {
          this.triggerComboFinisherCinematic(m);
        }
      }
      const total = m.windup + m.active + m.recovery;
      if (p.moveTimer >= total) {
        p.activeMove = null;
        p.timeSinceMoveEnd = 0;
      }
      return;
    }

    p.timeSinceMoveEnd += dt;

    // Free 3rd-person directional movement aligned with the current camera look view
    if (p.staggerTimer <= 0 && !p.isBlocking) {
      const rawMx = this.getMoveInputX();
      const rawMz = this.getMoveInputZ();
      const { worldX: mx, worldZ: mz } = transformMoveInputByCameraYaw(rawMx, rawMz, this.camYaw);
      const mag = Math.hypot(mx, mz);
      if (mag > 0.08) {
        p.emote = null;
        const speed =
          computeHeroSpeed(p.classId, this.customization.frame) *
          PET_ABILITIES[this.customization.pet].speedBonusMult;
        const nx = mx / Math.max(1, mag);
        const nz = mz / Math.max(1, mag);
        p.vx = THREE.MathUtils.damp(p.vx, nx * speed, 15, dt);
        p.vz = THREE.MathUtils.damp(p.vz, nz * speed, 15, dt);
        const targetYaw = Math.atan2(nx, nz);
        let diff = targetYaw - p.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        p.yaw += diff * Math.min(1, dt * 14);
        p.walkPhase += Math.hypot(p.vx, p.vz) * dt * 2.0;
      }
    }
  }

  private updateAiActors(dt: number): void {
    // Attack token pool: max 2 simultaneous attackers in Royale so multi-fighter brawls stay fair & readable
    let activeAttackers = 0;
    for (const a of this.actors) {
      if (!a.isPlayer && (a.aiState === 'telegraph' || a.aiState === 'attack')) {
        activeAttackers++;
      }
    }

    for (const actor of this.actors) {
      if (actor.isPlayer || actor.isKo) continue;

      // Nexus City ambient NPCs roam & emote peacefully
      if (actor.aiPolicy === 'hub_npc') {
        actor.aiTimer -= dt;
        if (actor.aiTimer <= 0) {
          actor.aiTimer = 3.5 + Math.random() * 4.0;
          if (Math.random() < 0.45) {
            const emotes: EmoteId[] = ['flex', 'shadowbox', 'bow', 'dance'];
            actor.emote = emotes[Math.floor(Math.random() * emotes.length)];
            actor.emoteTimer = 0;
          } else {
            actor.emote = null;
            const ang = Math.random() * Math.PI * 2;
            const r = 6 + Math.random() * 11;
            actor.patrolX = Math.cos(ang) * r;
            actor.patrolZ = Math.sin(ang) * r;
          }
        }
        if (!actor.emote) {
          const dx = actor.patrolX - actor.x;
          const dz = actor.patrolZ - actor.z;
          const d = Math.hypot(dx, dz);
          if (d > 1.0) {
            actor.vx = THREE.MathUtils.damp(actor.vx, (dx / d) * 2.8, 8, dt);
            actor.vz = THREE.MathUtils.damp(actor.vz, (dz / d) * 2.8, 8, dt);
            actor.yaw = Math.atan2(dx, dz);
            actor.walkPhase += 2.8 * dt * 2.1;
          }
        }
        continue;
      }

      if (actor.staggerTimer > 0 || actor.knockdownTimer > 0) continue;

      // Dojo Campaign AI Training Dummy build-mode pause & leash tether
      if (actor.isTrainingDummy) {
        const hx = actor.homeX ?? actor.x;
        const hz = actor.homeZ ?? actor.z;
        if (this.dojoMode === 'build') {
          actor.activeMove = null;
          actor.aiState = 'idle';
          actor.vx = THREE.MathUtils.damp(actor.vx, 0, 14, dt);
          actor.vz = THREE.MathUtils.damp(actor.vz, 0, 14, dt);
          const toPlayerYaw = Math.atan2(this.player.x - actor.x, this.player.z - actor.z);
          actor.yaw = toPlayerYaw;
          continue;
        }
        const playerToHome = Math.hypot(this.player.x - hx, this.player.z - hz);
        const actorToHome = Math.hypot(actor.x - hx, actor.z - hz);
        const engageR = actor.dummyEngageRadius ?? 8.5;
        const leashR = actor.dummyLeashRadius ?? 7.5;
        if (playerToHome > engageR || actorToHome > leashR + 2.0) {
          actor.activeMove = null;
          actor.aiState = 'idle';
          actor.hp = Math.min(actor.maxHp, actor.hp + 25 * dt);
          if (actorToHome > 0.35) {
            const rx = (hx - actor.x) / actorToHome;
            const rz = (hz - actor.z) / actorToHome;
            const retSpeed = 4.6;
            actor.vx = THREE.MathUtils.damp(actor.vx, rx * retSpeed, 10, dt);
            actor.vz = THREE.MathUtils.damp(actor.vz, rz * retSpeed, 10, dt);
            actor.yaw = Math.atan2(rx, rz);
            actor.walkPhase += retSpeed * dt * 1.8;
          } else {
            actor.yaw = Math.atan2(this.player.x - actor.x, this.player.z - actor.z);
          }
          continue;
        }
      }

      const target = this.findNearestHostile(actor, 35);
      if (!target) continue;

      const dx = target.x - actor.x;
      const dz = target.z - actor.z;
      const dist = Math.hypot(dx, dz);
      const dirX = dist > 0.01 ? dx / dist : 0;
      const dirZ = dist > 0.01 ? dz / dist : 1;
      const desiredYaw = Math.atan2(dirX, dirZ);

      // Smooth facing
      let diff = desiredYaw - actor.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      actor.yaw += diff * Math.min(1, dt * 10);

      const moveSpeed = computeHeroSpeed(actor.classId, 'balanced') * 0.78;
      actor.aiTimer -= dt;

      if (actor.aiState === 'telegraph') {
        // In Spectator Mode, defenders occasionally flash a crisp block/parry stance for dramatic duel zooms!
        if (this.spectatorActive && actor.id.startsWith('spectator-duel-')) {
          if (Math.random() < dt * 1.4 && !target.isBlocking) {
            target.isBlocking = true;
            target.blockHoldTime = 0.04;
          }
        }
        if (actor.aiTimer <= 0) {
          actor.aiState = 'attack';
          actor.aiTimer = 0.28;
          actor.moveHitApplied = false;
          actor.activeMove = {
            sequence: 'H',
            name: 'Strike',
            damage: actor.aiAttackDamage,
            windup: 0.05,
            active: 0.14,
            recovery: 0.16,
            range: actor.aiAttackRange,
            knockback: actor.aiIsCharge ? 9.5 : 5.5,
            launchY: actor.aiIsCharge ? 2.5 : 0,
            hitstop: 0.04,
            lunge: actor.aiIsCharge ? 5.2 : 2.2,
            isFinisher: actor.aiIsCharge,
            animStyle: actor.aiIsCharge ? 'slam' : 'cross',
          };
          actor.moveTimer = 0;

          if (actor.aiIsRanged) {
            this.spawnProjectile(actor, Math.sin(actor.yaw), Math.cos(actor.yaw), actor.aiAttackDamage, '#38bdf8', 13.5);
            this.sound.playSkill();
          } else {
            const burst = actor.aiIsCharge ? 14.5 : 6.0;
            actor.vx = Math.sin(actor.yaw) * burst;
            actor.vz = Math.cos(actor.yaw) * burst;
            this.sound.playSwing(actor.aiIsCharge);
          }
        }
        continue;
      }

      if (actor.aiState === 'attack') {
        actor.moveTimer += dt;
        if (!actor.moveHitApplied && !actor.aiIsRanged && actor.moveTimer >= 0.08) {
          actor.moveHitApplied = true;
          if (dist <= actor.aiAttackRange) {
            this.applyHit(
              actor,
              target,
              actor.aiAttackDamage,
              dirX,
              dirZ,
              actor.aiIsCharge ? 9.2 : 5.2,
              actor.aiIsCharge ? 2.5 : 0,
              0.045,
              actor.aiIsCharge
            );
          }
        }
        if (actor.aiTimer <= 0) {
          actor.activeMove = null;
          actor.aiState = 'recover';
          actor.aiTimer = actor.isTrainingDummy
            ? (actor.dummyRecoverInterval ?? 1.05)
            : 0.55 + Math.random() * 0.45;
        }
        continue;
      }

      if (actor.aiState === 'recover') {
        if (actor.aiTimer <= 0) {
          actor.aiState = Math.random() < 0.4 ? 'strafe' : 'approach';
          actor.aiStrafeDir = Math.random() > 0.5 ? 1 : -1;
          actor.aiTimer = actor.isTrainingDummy
            ? 0.45 + Math.random() * 0.3
            : 0.7 + Math.random() * 0.6;
        }
        continue;
      }

      // 4 Genuine Distinct AI Policies:
      const canAttack = activeAttackers < (this.zone === 'clan_siege' ? 4 : 2);
      if (actor.aiPolicy === 'ranger') {
        // Kiter/Ranger: maintains 6–10m spacing, backs up if player gets close, fires telegraphed bolts
        if (dist < 5.0) {
          actor.vx = THREE.MathUtils.damp(actor.vx, -dirX * moveSpeed * 0.9, 10, dt);
          actor.vz = THREE.MathUtils.damp(actor.vz, -dirZ * moveSpeed * 0.9, 10, dt);
          actor.walkPhase += moveSpeed * dt * 1.8;
        } else if (dist > 10.5) {
          actor.vx = THREE.MathUtils.damp(actor.vx, dirX * moveSpeed, 10, dt);
          actor.vz = THREE.MathUtils.damp(actor.vz, dirZ * moveSpeed, 10, dt);
          actor.walkPhase += moveSpeed * dt * 1.8;
        } else {
          // Orbit strafe
          actor.vx = THREE.MathUtils.damp(actor.vx, -dirZ * actor.aiStrafeDir * moveSpeed * 0.7, 10, dt);
          actor.vz = THREE.MathUtils.damp(actor.vz, dirX * actor.aiStrafeDir * moveSpeed * 0.7, 10, dt);
          actor.walkPhase += moveSpeed * dt * 1.5;
          if (actor.aiTimer <= 0 && canAttack) {
            actor.aiState = 'telegraph';
            actor.aiTelegraphDuration = 0.55;
            actor.aiTimer = actor.aiTelegraphDuration;
            actor.aiIsCharge = false;
            actor.aiIsRanged = true;
            actor.aiAttackRange = 11;
            activeAttackers++;
            this.sound.playTelegraph();
          }
        }
      } else if (actor.aiPolicy === 'charger') {
        // Line-of-Sight Charger (Iron Bull): closes to 6.5m then winds up a heavy armored charge
        if (dist > 6.5) {
          actor.vx = THREE.MathUtils.damp(actor.vx, dirX * moveSpeed * 0.85, 8, dt);
          actor.vz = THREE.MathUtils.damp(actor.vz, dirZ * moveSpeed * 0.85, 8, dt);
          actor.walkPhase += moveSpeed * dt * 1.6;
        } else if (actor.aiTimer <= 0 && canAttack) {
          actor.aiState = 'telegraph';
          actor.aiTelegraphDuration = 0.68;
          actor.aiTimer = actor.aiTelegraphDuration;
          actor.aiIsCharge = true;
          actor.aiIsRanged = false;
          actor.aiAttackRange = 3.2;
          activeAttackers++;
          this.sound.playTelegraph();
        }
      } else if (actor.aiPolicy === 'flanker') {
        // Teleporting Phantom Flanker: circles fast, occasionally blinks behind player with readable telegraph
        if (dist > 4.2 && actor.aiTimer <= 0 && canAttack) {
          this.spawnParticles(actor.x, 1.1, actor.z, '#a855f7', 12, 5.0);
          actor.x = target.x - Math.sin(target.yaw) * 2.1;
          actor.z = target.z - Math.cos(target.yaw) * 2.1;
          actor.yaw = Math.atan2(target.x - actor.x, target.z - actor.z);
          this.spawnParticles(actor.x, 1.1, actor.z, '#c084fc', 12, 5.0);
          actor.aiState = 'telegraph';
          actor.aiTelegraphDuration = 0.5;
          actor.aiTimer = actor.aiTelegraphDuration;
          actor.aiIsCharge = false;
          actor.aiIsRanged = false;
          actor.aiAttackRange = 2.7;
          activeAttackers++;
          this.sound.playTelegraph();
        } else {
          const strafe = actor.aiState === 'strafe' ? 0.85 : 0.35;
          actor.vx = THREE.MathUtils.damp(actor.vx, (dirX * 0.7 - dirZ * actor.aiStrafeDir * strafe) * moveSpeed * 1.1, 12, dt);
          actor.vz = THREE.MathUtils.damp(actor.vz, (dirZ * 0.7 + dirX * actor.aiStrafeDir * strafe) * moveSpeed * 1.1, 12, dt);
          actor.walkPhase += moveSpeed * dt * 2.2;
          if (dist < 2.6 && actor.aiTimer <= 0 && canAttack) {
            actor.aiState = 'telegraph';
            actor.aiTelegraphDuration = 0.46;
            actor.aiTimer = actor.aiTelegraphDuration;
            actor.aiIsCharge = false;
            actor.aiIsRanged = false;
            actor.aiAttackRange = 2.6;
            activeAttackers++;
            this.sound.playTelegraph();
          }
        }
      } else {
        // Balanced Duelist: advances, weaves, telegraphs crisp sword/fist strikes (great for learning Parry!)
        if (dist > 2.55) {
          actor.vx = THREE.MathUtils.damp(actor.vx, (dirX + -dirZ * actor.aiStrafeDir * 0.25) * moveSpeed, 10, dt);
          actor.vz = THREE.MathUtils.damp(actor.vz, (dirZ + dirX * actor.aiStrafeDir * 0.25) * moveSpeed, 10, dt);
          actor.walkPhase += moveSpeed * dt * 1.9;
        } else if (actor.aiTimer <= 0 && canAttack) {
          actor.aiState = 'telegraph';
          actor.aiTelegraphDuration = 0.56;
          actor.aiTimer = actor.aiTelegraphDuration;
          actor.aiIsCharge = false;
          actor.aiIsRanged = false;
          actor.aiAttackRange = 2.75;
          activeAttackers++;
          this.sound.playTelegraph();
        }
      }
    }
  }

  private updateProjectilesAndEffects(dt: number): void {
    // Projectiles
    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.life -= dt;
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.mesh.position.set(p.x, p.y, p.z);
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      const owner = this.actors.find((a) => a.id === p.ownerId) ?? this.player;
      for (const target of this.actors) {
        if (!this.isHostile(owner, target)) continue;
        if (Math.hypot(target.x - p.x, target.z - p.z) < 0.9) {
          const spd = Math.hypot(p.vx, p.vz) || 1;
          this.applyHit(owner, target, p.damage, p.vx / spd, p.vz / spd, 4.5, 0, 0.03, false, 'skill');
          p.active = false;
          p.mesh.visible = false;
          break;
        }
      }
      if (p.active && p.fromPlayer && this.zone === 'dojo') {
        if (this.checkDojoDummyHit(p.x, p.z, 0.75, p.damage)) {
          p.active = false;
          p.mesh.visible = false;
        }
      }
    }

    // Shockwave rings
    for (const s of this.shockwaves) {
      if (!s.active) continue;
      s.life += dt;
      const t = s.life / s.maxLife;
      if (t >= 1) {
        s.active = false;
        s.mesh.visible = false;
      } else {
        const ease = 1 - (1 - t) * (1 - t);
        s.mesh.scale.setScalar(0.35 + ease * s.maxScale);
        (s.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.85;
      }
    }

    // Pooled InstancedMesh particles (Zero GC)
    let dirty = false;
    for (let i = 0; i < this.particleCapacity; i++) {
      const slot = this.particles[i];
      if (!slot.active) continue;
      dirty = true;
      slot.life += dt;
      if (slot.life >= slot.maxLife) {
        slot.active = false;
        _dummyObj.position.set(0, -100, 0);
        _dummyObj.scale.setScalar(0);
        _dummyObj.updateMatrix();
        this.particleMesh.setMatrixAt(i, _dummyObj.matrix);
        continue;
      }
      slot.vy -= 14 * dt;
      slot.x += slot.vx * dt;
      slot.y = Math.max(0.05, slot.y + slot.vy * dt);
      slot.z += slot.vz * dt;
      const sc = slot.scale * (1 - slot.life / slot.maxLife);
      _dummyObj.position.set(slot.x, slot.y, slot.z);
      _dummyObj.rotation.set(slot.life * 8, slot.life * 6, 0);
      _dummyObj.scale.setScalar(sc);
      _dummyObj.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummyObj.matrix);
      this.particleMesh.setColorAt(i, slot.color);
    }
    if (dirty) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    }

    // World animated landmarks & Dojo dummy wobble
    if (this.world) {
      for (const item of this.world.animatedMeshes) {
        if (item.axis === 'y') {
          item.mesh.rotation.y += item.speed * dt;
        }
      }
      if (this.zone === 'dojo') {
        this.dummyHitTimers.forEach((rem, id) => {
          const next = rem - dt;
          const m = this.world?.dojoMeshes.get(id);
          if (m) {
            if (next <= 0) {
              m.rotation.z = 0;
              this.dummyHitTimers.delete(id);
            } else {
              m.rotation.z = Math.sin(next * 42) * next * 0.9;
              this.dummyHitTimers.set(id, next);
            }
          }
        });
      }
    }
  }

  private updateCamera(dt: number): void {
    this.cameraTrauma = decayCameraTrauma(this.cameraTrauma, dt);
    this.cameraFovKick = THREE.MathUtils.damp(this.cameraFovKick, 0, 11, dt);
    this.frenzyImpactPulse = Math.max(0, this.frenzyImpactPulse - dt * 3.8);

    const activePlay = this.phase === 'playing' && !this.customizeShowcase;
    const rawFrenzy = activePlay
      ? computeComboFrenzyEffect({
          comboCount: this.player.comboCount,
          comboTimer: this.player.comboDisplayTimer,
          maxDuration: COMBO_DECAY_DURATION,
          impactPulse: this.frenzyImpactPulse,
          isUltimate: this.ultimateTimer > 0 || this.finisherSlowMoTimer > 0,
        })
      : computeComboFrenzyEffect({ comboCount: 0, comboTimer: 0 });

    const dampSpeed = rawFrenzy.intensity > this.frenzyIntensity ? 11.0 : 4.2;
    this.frenzyIntensity = THREE.MathUtils.damp(
      this.frenzyIntensity,
      rawFrenzy.intensity,
      dampSpeed,
      dt
    );
    this.frenzyState = {
      ...rawFrenzy,
      intensity: this.frenzyIntensity,
      chromaticOffset: this.frenzyIntensity * 0.0115,
      distortionStrength: this.frenzyIntensity * 0.088,
      vignetteStrength: this.frenzyIntensity * 0.34,
      fovBoost: this.frenzyIntensity * 4.8,
    };

    const shakeSample = sampleCameraShake(this.cameraTrauma, this.elapsed);

    if (this.phase === 'title') {
      // Live 3D Hero Front Showcase + Sunlit Nexus City Spire framed right-of-center!
      this.player.yaw = -0.25 + Math.sin(this.elapsed * 0.35) * 0.16;
      const sway = Math.sin(this.elapsed * 0.25) * 0.55;
      _vec3A.set(
        this.player.x - 0.55 + sway,
        1.95 + Math.sin(this.elapsed * 0.45) * 0.1,
        this.player.z + 4.45
      );
      _vec3B.set(this.player.x - 1.15, 1.32, this.player.z - 1.2);
      this.camPos.lerp(_vec3A, 1 - Math.exp(-5.0 * dt));
      this.camLook.lerp(_vec3B, 1 - Math.exp(-5.5 * dt));
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
      return;
    }

    if (this.customizeShowcase) {
      // Hero Identity Studio live close-up FRONT portrait showcase (left-center while drawer sits on right)
      const angle = this.player.yaw + 0.25 + this.customizeYawOffset;
      _vec3A.set(
        this.player.x + Math.sin(angle) * 3.8 + Math.cos(angle) * 0.95,
        1.58,
        this.player.z + Math.cos(angle) * 3.8 - Math.sin(angle) * 0.95
      );
      _vec3B.set(
        this.player.x + Math.cos(angle) * 0.85,
        1.15,
        this.player.z - Math.sin(angle) * 0.85
      );
      this.camPos.lerp(_vec3A, 1 - Math.exp(-12 * dt));
      this.camLook.lerp(_vec3B, 1 - Math.exp(-12 * dt));
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
      return;
    }

    if (this.matchEndDelay > 0 && this.matchFinishOverlay) {
      // Dramatic slow-mo camera push orbiting onto the winning fighter!
      const winner =
        this.actors.find((a) => a.id === this.matchFinishWinnerId) ?? this.player;
      const orbit = winner.yaw + 0.35 + (1.45 - this.matchEndDelay) * 0.65;
      _vec3A.set(
        winner.x + Math.sin(orbit) * 4.1,
        winner.y + 1.88,
        winner.z + Math.cos(orbit) * 4.1
      );
      _vec3B.set(winner.x, winner.y + 1.28, winner.z);
      this.camPos.lerp(_vec3A, 1 - Math.exp(-8.5 * dt));
      this.camLook.lerp(_vec3B, 1 - Math.exp(-9.5 * dt));
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 37, 8, dt);
      this.camera.updateProjectionMatrix();
      this.camera.position.set(
        this.camPos.x + shakeSample.offsetX,
        this.camPos.y + shakeSample.offsetY,
        this.camPos.z + shakeSample.offsetZ
      );
      this.camera.lookAt(this.camLook);
      this.camera.rotation.z += shakeSample.rollZ;
      return;
    }

    if (this.ultimateTimer > 0) {
      // Dramatic 2.1s orbital close-up cinematic Ultimate Finisher camera!
      const orbit = (2.1 - this.ultimateTimer) * 2.8;
      _vec3A.set(
        this.player.x + Math.sin(orbit) * 4.8,
        2.3 + Math.sin(orbit * 0.7) * 0.6,
        this.player.z + Math.cos(orbit) * 4.8
      );
      _vec3B.set(this.player.x, 1.35, this.player.z);
      this.camPos.lerp(_vec3A, 1 - Math.exp(-10 * dt));
      this.camLook.lerp(_vec3B, 1 - Math.exp(-10 * dt));
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 40, 8, dt);
      this.camera.updateProjectionMatrix();
      this.camera.position.set(
        this.camPos.x + shakeSample.offsetX,
        this.camPos.y + shakeSample.offsetY,
        this.camPos.z + shakeSample.offsetZ
      );
      this.camera.lookAt(this.camLook);
      this.camera.rotation.z += shakeSample.rollZ;
      return;
    }

    if (this.zone === 'dojo' && this.spectatorActive) {
      const duelistA = this.actors.find((a) => a.id === 'spectator-duel-a') ?? this.player;
      const duelistB =
        this.actors.find((a) => a.id === 'spectator-duel-b') ??
        this.actors.find((a) => !a.isPlayer && !a.isKo) ??
        this.player;
      const pose = computeSpectatorCameraPose({
        ax: duelistA.x,
        az: duelistA.z,
        bx: duelistB.x,
        bz: duelistB.z,
        elapsed: this.elapsed,
        focusEvent: this.spectatorFocusEvent,
        focusTimer: this.spectatorFocusTimer,
      });
      _vec3A.set(pose.posX, pose.posY, pose.posZ);
      _vec3B.set(pose.lookX, pose.lookY, pose.lookZ);
      const smooth = 1 - Math.exp(-(this.spectatorFocusTimer > 0 ? 11.5 : 6.0) * dt);
      this.camPos.lerp(_vec3A, smooth);
      this.camLook.lerp(_vec3B, smooth);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, pose.fov, 10, dt);
      this.camera.updateProjectionMatrix();
      this.camera.position.set(
        this.camPos.x + shakeSample.offsetX,
        this.camPos.y + shakeSample.offsetY,
        this.camPos.z + shakeSample.offsetZ
      );
      this.camera.lookAt(this.camLook);
      this.camera.rotation.z += shakeSample.rollZ;
      return;
    }

    // Dynamic FOV with smooth impact punch + Combo Frenzy adrenaline expansion (tightens on Combo Finisher slow-mo!)
    const finisherActive = this.finisherSlowMoTimer > 0;
    const targetFov = finisherActive
      ? 42 + this.frenzyState.fovBoost * 0.6
      : 50 + this.cameraFovKick + this.frenzyState.fovBoost;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 14, dt);
      this.camera.updateProjectionMatrix();
    }

    // Smoothly damp camera look yaw & pitch toward user drag targets
    this.camYaw = dampCameraYaw(this.camYaw, this.targetCamYaw, 22, dt);
    this.camPitch = THREE.MathUtils.damp(this.camPitch, this.targetCamPitch, 22, dt);

    // Crisp 3rd-person action combat chase camera framing both player & active rival
    let lookX = this.player.x;
    let lookZ = this.player.z;
    let camDist = 9.0;
    let pitchBias = 0;

    if (this.zone === 'arena' || this.zone === 'campaign') {
      const opp = this.actors.find((a) => !a.isPlayer && !a.isKo);
      if (opp) {
        lookX = this.player.x * 0.62 + opp.x * 0.38;
        lookZ = this.player.z * 0.62 + opp.z * 0.38;
        const sep = Math.hypot(opp.x - this.player.x, opp.z - this.player.z);
        camDist = Math.max(7.6, Math.min(12.2, 6.4 + sep * 0.46));
      }
    } else if (this.zone === 'dojo' && this.dojoMode === 'build') {
      camDist = 14.0;
      pitchBias = 0.24;
    }

    const sideOffset = finisherActive ? 1.65 : 0;
    if (finisherActive) {
      camDist = Math.max(5.2, camDist - 2.4);
      pitchBias -= 0.14;
    }

    const orbitPose = computeCameraOrbitPosition({
      anchorX: lookX,
      anchorY: this.player.y + 1.35,
      anchorZ: lookZ,
      yaw: this.camYaw,
      pitch: this.camPitch + pitchBias,
      distance: camDist,
      sideOffset,
      forwardLead: 0.8,
      minCameraY: 0.85,
    });

    _vec3A.set(orbitPose.x, orbitPose.y, orbitPose.z);
    _vec3B.set(orbitPose.lookX, orbitPose.lookY, orbitPose.lookZ);

    const k = 1 - Math.exp(-(finisherActive ? 12.5 : this.lookDidDrag ? 18.0 : 9.0) * dt);
    this.camPos.lerp(_vec3A, k);
    this.camLook.lerp(_vec3B, k);

    this.camera.position.set(
      this.camPos.x + shakeSample.offsetX,
      this.camPos.y + shakeSample.offsetY,
      this.camPos.z + shakeSample.offsetZ
    );
    this.camera.lookAt(this.camLook);
    this.camera.rotation.z += shakeSample.rollZ;
  }

  private tick = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = (now - this.lastPerfTime) / 1000;
    this.lastPerfTime = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
    this.elapsed += dt;

    if (this.phase === 'playing') {
      if (this.calloutTimer > 0) {
        this.calloutTimer -= dt;
        if (this.calloutTimer <= 0) {
          this.activeCallout = null;
        }
      }

      if (this.matchEndDelay >= 0) {
        this.matchEndDelay -= dt;
        if (this.matchEndDelay <= 0 && this.pendingSummary) {
          const summary = this.pendingSummary;
          this.pendingSummary = null;
          this.matchEndDelay = -1;
          this.phase = 'gameover';
          document.body.dataset.state = 'gameover';
          this.callbacks.onPhaseChange('gameover');
          this.callbacks.onMatchEnd(summary);
          // Trigger character-specific Victory or Defeat voice line right as MatchEndModal appears
          const voice = selectCharacterVoiceLine(
            summary.voiceLine?.classId ?? this.customization.classId,
            summary.victory ? 'victory' : 'defeat',
            this.progress.wins + summary.damageDealt
          );
          this.sound.playCharacterVoiceLine({
            ...voice,
            line: summary.voiceLine?.line ?? voice.line,
          });
          this.emitHud();
        }
      }

      // Advance floating hit numbers and hit-spark VFX even during hitstop freeze for maximum punch!
      for (let i = this.damagePopups.length - 1; i >= 0; i--) {
        this.damagePopups[i].age += dt;
        if (this.damagePopups[i].age >= this.damagePopups[i].maxAge) {
          this.damagePopups.splice(i, 1);
        }
      }
      this.hitVfx.update(dt);

      // Advance Combo Finisher slow-motion & Pet cooldown/animation in real time
      if (this.finisherSlowMoTimer > 0) {
        this.finisherSlowMoTimer = Math.max(0, this.finisherSlowMoTimer - dt);
        if (this.finisherSlowMoTimer <= 0) {
          this.finisherSlowMoName = '';
        }
      }
      if (this.petCooldown > 0) {
        this.petCooldown = Math.max(0, this.petCooldown - dt);
      }
      if (this.petActionTimer > 0) {
        this.petActionTimer = Math.max(0, this.petActionTimer - dt);
      }

      // Advance Combo Milestone screen-flash, Emote Spotlight beam, Spectator focus & Dynamic Weather Cycle
      if (this.milestoneFlashTimer > 0) {
        this.milestoneFlashTimer = Math.max(0, this.milestoneFlashTimer - dt);
        if (this.milestoneFlashTimer <= 0) {
          this.milestoneFlash = null;
        }
      }
      if (this.emoteSpotlightTimer > 0) {
        this.emoteSpotlightTimer = Math.max(0, this.emoteSpotlightTimer - dt);
        if (this.emoteSpotlightTimer <= 0) {
          this.emoteSpotlightName = null;
        }
      }
      this.player.rig.setEmoteSpotlight(
        this.emoteSpotlightTimer > 0,
        AURA_HEX[this.customization.aura],
        this.elapsed
      );
      if (this.spectatorFocusTimer > 0) {
        this.spectatorFocusTimer = Math.max(0, this.spectatorFocusTimer - dt);
        if (this.spectatorFocusTimer <= 0) {
          this.spectatorFocusEvent = 'normal';
          this.spectatorEventLabel = 'LIVE DOJO DUEL · AUTO-CAM';
        }
      }
      if (this.zone === 'dojo' && !this.visitedDojo && this.dojoWeatherCycle) {
        this.dojoWeatherCycleTimer += dt;
        if (this.dojoWeatherCycleTimer >= 14.0) {
          this.dojoWeatherCycleTimer = 0;
          const idx = DOJO_WEATHER_ORDER.indexOf(this.dojoWeatherState.activeWeather);
          const nextWeather = DOJO_WEATHER_ORDER[(idx + 1) % DOJO_WEATHER_ORDER.length];
          this.dojoWeatherState = {
            ...this.dojoWeatherState,
            activeWeather: nextWeather,
          };
          this.applyAtmosphereForZone('dojo');
          const spec = DOJO_WEATHER_SPECS[nextWeather];
          this.pushCallout(`WEATHER CYCLE · ${spec.name.toUpperCase()}`, spec.tagline, 'cyan');
        }
      }

      if (this.roundBannerTimer > 0) {
        this.roundBannerTimer = Math.max(0, this.roundBannerTimer - dt);
        if (this.roundBannerTimer <= 0) {
          this.roundBanner = null;
        }
      }
      if (this.parryCounterTimer > 0) {
        this.parryCounterTimer = Math.max(0, this.parryCounterTimer - dt);
      }
      if (this.roundTransitionTimer > 0) {
        this.roundTransitionTimer = Math.max(0, this.roundTransitionTimer - dt);
        if (this.roundTransitionTimer <= 0) {
          this.startNextArenaRound();
        }
      }

      if (this.hitstopTimer > 0) {
        this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      } else {
        const simDt =
          this.matchEndDelay > 0
            ? dt * 0.28
            : this.ultimateTimer > 0
              ? dt * 0.35
              : this.finisherSlowMoTimer > 0
                ? dt * this.finisherSlowMoScale
                : dt;
        this.matchTimer += simDt;

        // Shrinking Battle Royale ring hazard
        if (this.zone === 'royale' && this.world?.royaleRingMesh) {
          this.royaleRingRadius = Math.max(4.5, this.royaleRingRadius - simDt * 0.42);
          this.world.royaleRingMesh.scale.set(this.royaleRingRadius, 1, this.royaleRingRadius);
          for (const a of this.actors) {
            if (a.isKo) continue;
            if (Math.hypot(a.x, a.z) > this.royaleRingRadius) {
              a.hp = Math.max(0, a.hp - 11 * simDt);
              if (a.hp <= 0) {
                a.isKo = true;
                a.koTimer = 0;
                this.checkMatchCompletion();
              }
            }
          }
        }

        if (
          !this.customizeShowcase &&
          !this.leaderboardOpen &&
          !this.tradingPostOpen &&
          !this.clanSiegeOpen &&
          this.roundTransitionTimer <= 0 &&
          this.matchEndDelay < 0
        ) {
          if (!this.spectatorActive) {
            this.updatePlayer(simDt);
          }
          this.updateAiActors(simDt);
        }
        // Reset temporary AI spectator blocks cleanly
        if (this.spectatorActive) {
          for (const a of this.actors) {
            if (a.id.startsWith('spectator-duel-') && a.isBlocking) {
              a.blockHoldTime += simDt;
              if (a.blockHoldTime > 0.35) {
                a.isBlocking = false;
                a.blockHoldTime = 0;
              }
            }
          }
        }
        for (const a of this.actors) {
          this.updateActorPhysics(a, simDt);
        }
        this.updateProjectilesAndEffects(simDt);
      }
    } else if (this.phase === 'title') {
      // Gentle living world idle animations during Title Tour
      for (const a of this.actors) {
        this.updateActorPhysics(a, dt);
      }
      this.updateProjectilesAndEffects(dt);
    }

    this.dojoWeatherFx.update(dt);
    this.arenaBiomeFx.update(dt, this.camera.quaternion);
    this.updateCamera(dt);
    this.frenzyFx.render(this.renderer, this.scene, this.camera, {
      intensity: this.frenzyState.intensity,
      chromaticOffset: this.frenzyState.chromaticOffset,
      distortionStrength: this.frenzyState.distortionStrength,
      vignetteStrength: this.frenzyState.vignetteStrength,
      timeSec: this.elapsed,
      auraHex: AURA_HEX[this.customization.aura],
    });

    // Throttled HUD emission (<= 20Hz during active combo / finisher / pet cooldown, <= 12Hz idle)
    this.hudEmitAccum += dt;
    const emitInterval =
      this.player.comboCount > 0 || this.finisherSlowMoTimer > 0 || this.petCooldown > 0
        ? 0.05
        : 0.085;
    if (this.hudEmitAccum >= emitInterval) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }

    this.scheduleNextFrame();
  };

  private scheduleNextFrame(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
    gl.flush();
    if (!sync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const poll = () => {
      if (this.disposed) {
        gl.deleteSync(sync);
        return;
      }
      const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private emitHud(): void {
    this.renderer.domElement.dataset.camYaw = this.camYaw.toFixed(3);
    this.renderer.domElement.dataset.camPitch = this.camPitch.toFixed(3);
    const cls = HERO_CLASSES[this.player.classId];
    let mainOpp: FighterActor | null = null;
    if (this.zone === 'arena' || this.zone === 'campaign') {
      mainOpp = this.actors.find((a) => !a.isPlayer && a.aiPolicy !== 'hub_npc') ?? null;
    } else if (this.zone === 'clan_siege') {
      mainOpp = this.findNearestHostile(this.player, 26);
    } else if (this.zone === 'dojo' && this.dojoMode === 'play') {
      // Lock HUD telemetry onto the nearest active Campaign AI Training Dummy when sparring
      let bestDist = 10.5;
      for (const a of this.actors) {
        if (!a.isTrainingDummy) continue;
        const d = Math.hypot(a.x - this.player.x, a.z - this.player.z);
        if (d < bestDist) {
          bestDist = d;
          mainOpp = a;
        }
      }
    }
    const activeDummyCount = this.actors.filter((a) => a.isTrainingDummy).length;
    const portal = this.zone === 'hub' || this.zone === 'dojo' ? this.findNearbyPortal() : null;
    const royaleAlive = this.actors.filter((a) => !a.isKo && a.aiPolicy !== 'hub_npc').length;
    const weatherProgress = this.getWeatherProgressSnapshot();
    const unlockedDojoWeathers = DOJO_WEATHER_ORDER.filter((id) =>
      isWeatherUnlocked(id, this.dojoWeatherState, weatherProgress)
    );
    const clanSiegeHud =
      this.zone === 'clan_siege' && this.clanSiegePlan
        ? {
            format: this.clanSiegePlan.format,
            allyClanName: this.clanSiegePlan.allyClanName,
            allyClanTag: this.clanSiegePlan.allyClanTag,
            allyAccentHex: this.clanSiegePlan.allyAccentHex,
            allyAlive: this.actors.filter((a) => a.team === 'ally' && !a.isKo).length,
            allyTotal: this.clanSiegePlan.teamSize,
            rivalClanName: this.clanSiegePlan.rivalClanName,
            rivalClanTag: this.clanSiegePlan.rivalClanTag,
            rivalAccentHex: this.clanSiegePlan.rivalAccentHex,
            enemyAlive: this.actors.filter((a) => a.team === 'enemy' && !a.isKo).length,
            enemyTotal: this.clanSiegePlan.teamSize,
            venueName: this.clanSiegePlan.venueName,
            venueOwnerName: this.clanSiegePlan.venueOwnerName,
            isHomeDefense: this.clanSiegePlan.isHomeDefense,
            weather: this.clanSiegePlan.weather,
            obstacleSummary: `${this.clanSiegePlan.obstacles.trampolines} Bounce · ${this.clanSiegePlan.obstacles.dashpads} Dash · ${this.clanSiegePlan.obstacles.crates} Crates · ${this.clanSiegePlan.obstacles.pillars} Pillars`,
          }
        : null;

    const projectedPopups: FloatingDamageNumber[] = [];
    for (const pop of this.damagePopups) {
      _vec3A.set(pop.worldX, pop.worldY, pop.worldZ);
      _vec3A.project(this.camera);
      if (_vec3A.z >= -1 && _vec3A.z <= 1) {
        projectedPopups.push({
          id: pop.id,
          value: pop.value,
          label: pop.label,
          screenX: Math.max(8, Math.min(92, (_vec3A.x * 0.5 + 0.5) * 100)),
          screenY: Math.max(12, Math.min(86, (-_vec3A.y * 0.5 + 0.5) * 100)),
          tone: pop.tone,
          age: pop.age,
          maxAge: pop.maxAge,
        });
      }
    }

    const rankSpec = getArenaRankSpec(this.arenaRankState.rank);
    const biomeSpec = ARENA_BIOMES[this.arenaRankState.selectedBiome] ?? ARENA_BIOMES.salt_flats;

    this.callbacks.onHudUpdate({
      zone: this.zone,
      hp: Math.round(this.player.hp),
      maxHp: Math.round(this.player.maxHp),
      ghostHp: Math.round(this.player.ghostHp),
      stamina: Math.round(this.player.stamina),
      maxStamina: MAX_STAMINA,
      ultimate: Math.round(this.ultimateMeter),
      skillCooldown: Number(this.player.skillCooldown.toFixed(1)),
      skillMaxCooldown: cls.skillCooldown,
      skillName: cls.skillName,
      comboCount: this.player.comboCount,
      comboMoveName: this.player.lastComboName,
      comboSequence: formatSequenceBadge(this.player.comboSequence),
      comboTimer: this.player.comboDisplayTimer,
      comboMaxTimer: COMBO_DECAY_DURATION,
      finisherActive: this.finisherSlowMoTimer > 0,
      finisherName: this.finisherSlowMoName,
      nextFinisherHint:
        this.player.comboDisplayTimer > 0
          ? resolveNextFinisherHint(this.player.comboSequence)
          : null,
      petType: this.customization.pet,
      petAbilityName: PET_ABILITIES[this.customization.pet].abilityName,
      petCooldown: Number(this.petCooldown.toFixed(1)),
      petMaxCooldown: PET_ABILITIES[this.customization.pet].cooldown,
      isBlocking: this.player.isBlocking,
      isUltimateActive: this.ultimateTimer > 0,
      autoAssist: this.progress.autoAssist,
      coins: this.progress.coins,
      level: this.progress.level,
      xp: this.progress.xp,
      xpToNext: computeXpToNextLevel(this.progress.level),
      wins: this.progress.wins,
      highestBossCleared: this.progress.highestBossCleared,
      activeBossIndex: this.activeBossIndex,
      opponent: mainOpp
        ? {
            name: mainOpp.name,
            title: mainOpp.title,
            hp: Math.round(mainOpp.hp),
            maxHp: Math.round(mainOpp.maxHp),
            ghostHp: Math.round(mainOpp.ghostHp),
            staggered: mainOpp.staggerTimer > 0,
            telegraphing: mainOpp.aiState === 'telegraph',
            lessonHint: mainOpp.lessonHint,
          }
        : null,
      royaleAlive,
      royaleTotal: this.royaleTotal,
      royaleRingRadius: Math.round(this.royaleRingRadius),
      portalPrompt: portal
        ? { zone: portal.zone, label: portal.label, subtitle: portal.subtitle }
        : null,
      callout: this.activeCallout,
      damagePopups: projectedPopups,
      combatLog: this.combatLogState.entries,
      combatArchive: this.combatArchive,
      milestoneFlash: this.milestoneFlash,
      emoteSpotlightName: this.emoteSpotlightName,
      dojoMode: this.dojoMode,
      selectedDojoBlock: this.selectedDojoBlock,
      selectedDummyVariant: this.selectedDummyVariant,
      dojoBlockCount: this.dojoBlocks.length,
      activeDummyCount,
      dojoWeather: this.dojoWeatherState.activeWeather,
      dojoWeatherCycle: this.dojoWeatherCycle,
      unlockedDojoWeathers,
      dojoAudioTrack: this.dojoAudioTrack,
      activeAudioTrack:
        this.zone === 'dojo'
          ? this.visitedDojo
            ? getCommunityDojoTrack(this.visitedDojo.id)
            : this.dojoAudioTrack
          : this.zone === 'clan_siege'
            ? this.clanSiegePlan?.isHomeDefense
              ? this.dojoAudioTrack
              : getCommunityDojoTrack(this.clanSiegePlan?.rivalClanId ?? 'dojo-zara')
            : null,
      visitingDojo: this.visitedDojo
        ? {
            id: this.visitedDojo.id,
            ownerName: this.visitedDojo.ownerName,
            dojoName: this.visitedDojo.dojoName,
            themeTag: this.visitedDojo.themeTag,
          }
        : null,
      clanSiege: clanSiegeHud,
      spectatorActive: this.spectatorActive,
      spectatorEventLabel: this.spectatorEventLabel,
      arenaRank: {
        rank: rankSpec.rank,
        rankName: rankSpec.name,
        tier: rankSpec.tier,
        tierName: rankSpec.tierName,
        accentHex: rankSpec.accentHex,
        winsInRank: this.arenaRankState.winsInRank,
        winsRequired: rankSpec.winsRequiredToAdvance,
        totalArenaWins: this.arenaRankState.totalArenaWins,
        selectedBiome: biomeSpec.id,
        biomeName: biomeSpec.name,
        biomeHazardNote: biomeSpec.hazardNote,
      },
      ownedEmotes: mergeOwnedAndRankEmotes(
        this.storeInventory.ownedEmotes,
        this.arenaRankState.rank
      ),
      hubBotCount: this.actors.filter((a) => a.aiPolicy === 'hub_npc').length,
      nearbyHubFighter: this.findNearbyHubFighter(),
      hubMinimap: this.buildHubMinimapState(),
      arenaRounds: this.arenaRounds ? { ...this.arenaRounds } : null,
      roundBanner: this.roundBanner,
      parryCounterReady: this.parryCounterTimer > 0,
      matchFinishOverlay: this.matchFinishOverlay,
      muted: this.progress.muted,
      dailyQuests: this.progress.dailyQuests.map((q) => ({ ...q })),
    });
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    if (this.phase === 'title') {
      if (this.titleModalOpen) return;
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        this.startGame('hub');
      }
      return;
    }

    if (e.code === 'Escape' || e.code === 'KeyP') {
      e.preventDefault();
      if (this.tradingPostOpen) {
        this.setTradingPostOpen(false);
        this.callbacks.onCloseTradingPost();
        return;
      }
      if (this.clanSiegeOpen) {
        this.setClanSiegeOpen(false);
        this.callbacks.onCloseClanSiege();
        return;
      }
      if (this.leaderboardOpen) {
        this.setLeaderboardOpen(false);
        this.callbacks.onCloseDojoLeaderboard();
        return;
      }
      if (this.customizeShowcase) {
        this.setCustomizeOpen(false);
        this.callbacks.onCloseCustomize();
        return;
      }
      if (this.phase === 'playing') this.setPaused(true);
      else if (this.phase === 'paused') this.setPaused(false);
      return;
    }

    if (this.leaderboardOpen || this.clanSiegeOpen || this.tradingPostOpen) return;

    if (e.code === 'KeyM') {
      this.toggleMute();
      return;
    }

    if (this.phase !== 'playing' || this.customizeShowcase) return;

    const alreadyHeld = this.keys.has(e.code);
    this.keys.add(e.code);
    if (alreadyHeld) return;

    if (e.code === 'KeyJ') {
      this.pressLightAttack();
    } else if (e.code === 'KeyK') {
      this.pressHeavyAttack();
    } else if (e.code === 'KeyU' || e.code === 'KeyE') {
      this.pressSkill();
    } else if (e.code === 'KeyG' || e.code === 'KeyO') {
      this.pressPetAbility();
    } else if (e.code === 'KeyI' || e.code === 'KeyR') {
      this.pressUltimate();
    } else if (e.code === 'Space') {
      e.preventDefault();
      this.pressJump();
    } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.pressDodge();
    } else if (e.code === 'KeyF') {
      this.triggerPortalInteract();
    } else if (e.code === 'KeyC') {
      this.callbacks.onOpenCustomize();
    } else if (e.code === 'KeyB' && (this.zone === 'hub' || this.zone === 'dojo')) {
      this.callbacks.onOpenDojoLeaderboard();
    } else if (e.code === 'KeyT' && (this.zone === 'hub' || this.zone === 'dojo')) {
      this.callbacks.onOpenTradingPost();
    } else if (e.code === 'KeyV' && this.zone === 'dojo') {
      this.toggleSpectatorMode();
    } else if (e.code === 'Digit1') {
      this.triggerEmote('flex');
    } else if (e.code === 'Digit2') {
      this.triggerEmote('shadowbox');
    } else if (e.code === 'Digit3') {
      this.triggerEmote('bow');
    } else if (e.code === 'Digit4') {
      this.triggerEmote('dance');
    } else if (e.code === 'Digit5') {
      this.triggerEmote('backflip');
    } else if (e.code === 'Digit6') {
      this.triggerEmote('meditate');
    } else if (e.code === 'Digit7') {
      this.triggerEmote('lightning_pose');
    } else if (e.code === 'Digit8') {
      this.triggerEmote('dragon_roar');
    } else if (e.code === 'Digit9') {
      this.triggerEmote('throne_salute');
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private handleBlur = (): void => {
    this.clearInputs();
  };

  private handleVisibility = (): void => {
    if (document.hidden) this.clearInputs();
  };

  private handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
  };

  private handleCanvasPointerDown = (e: PointerEvent): void => {
    if (this.phase !== 'playing' && !this.customizeShowcase) return;
    if (this.zone === 'dojo' && this.spectatorActive && !this.customizeShowcase) return;
    this.sound.unlock();

    // Allow primary/secondary mouse drag or single-finger touch/pen drag for Camera Look
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;
    if (this.lookPointerId !== null) return;

    this.lookPointerId = e.pointerId;
    this.lookStartX = e.clientX;
    this.lookStartY = e.clientY;
    this.lookLastX = e.clientX;
    this.lookLastY = e.clientY;
    this.lookPointerButton = e.button;
    this.lookPointerType = e.pointerType || 'mouse';
    this.lookDidDrag = false;

    try {
      this.renderer.domElement.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic pointer events in automated browsers may not support capture
    }
  };

  private handleCanvasPointerMove = (e: PointerEvent): void => {
    if (this.lookPointerId !== e.pointerId) return;

    const dx = e.clientX - this.lookLastX;
    const dy = e.clientY - this.lookLastY;
    this.lookLastX = e.clientX;
    this.lookLastY = e.clientY;

    if (
      !this.lookDidDrag &&
      shouldCommitCameraDrag(this.lookStartX, this.lookStartY, e.clientX, e.clientY)
    ) {
      this.lookDidDrag = true;
      this.renderer.domElement.style.cursor = 'grabbing';
    }

    if (!this.lookDidDrag) return;

    if (this.customizeShowcase) {
      this.customizeYawOffset += dx * 0.009;
      return;
    }

    const updated = applyCameraLookDelta(
      { yaw: this.targetCamYaw, pitch: this.targetCamPitch },
      dx,
      dy,
      this.lookPointerType
    );
    this.targetCamYaw = updated.yaw;
    this.targetCamPitch = updated.pitch;
  };

  private handleCanvasPointerUp = (e: PointerEvent): void => {
    if (this.lookPointerId !== e.pointerId) return;

    const wasDrag = this.lookDidDrag;
    const button = this.lookPointerButton;
    const pointerType = this.lookPointerType;
    this.lookPointerId = null;
    this.lookDidDrag = false;
    this.renderer.domElement.style.cursor = '';

    try {
      if (this.renderer.domElement.hasPointerCapture(e.pointerId)) {
        this.renderer.domElement.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore release errors on synthetic events
    }

    if (wasDrag || this.phase !== 'playing' || this.customizeShowcase) return;

    // Short tap/click in Dojo Build mode places the selected block on the floor
    if (this.zone === 'dojo' && this.dojoMode === 'build' && button === 0) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
      const hit = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.floorPlane, hit)) {
        this.tryPlaceDojoBlockAt(hit.x, hit.z);
      }
      return;
    }

    // Social Hub (Nexus City) is strictly non-combat: clicking the canvas never throws attacks
    if (this.zone === 'hub') return;

    // Desktop mouse clicks still trigger quick Light / Heavy attacks; touch uses the action diamond
    if (pointerType === 'mouse') {
      if (button === 0) {
        this.pressLightAttack();
      } else if (button === 2) {
        this.pressHeavyAttack();
      }
    }
  };

  private handleCanvasPointerCancel = (e: PointerEvent): void => {
    if (this.lookPointerId !== e.pointerId) return;
    this.lookPointerId = null;
    this.lookDidDrag = false;
    this.renderer.domElement.style.cursor = '';
  };

  private handleResize(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    if (w <= 0 || h <= 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.frenzyFx.resize(w, h, this.renderer.getPixelRatio());
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.sound.stopMusic();
    this.resizeObserver.disconnect();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    this.renderer.domElement.removeEventListener('pointerdown', this.handleCanvasPointerDown);
    window.removeEventListener('pointermove', this.handleCanvasPointerMove);
    window.removeEventListener('pointerup', this.handleCanvasPointerUp);
    window.removeEventListener('pointercancel', this.handleCanvasPointerCancel);
    this.renderer.domElement.removeEventListener('contextmenu', this.handleContextMenu);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);

    if (this.world) this.world.dispose();
    for (const a of this.actors) a.rig.dispose();
    this.hitVfx.dispose();
    this.frenzyFx.dispose();
    this.dojoWeatherFx.dispose();
    this.arenaBiomeFx.dispose();
    this.particleMesh.geometry.dispose();
    (this.particleMesh.material as THREE.Material).dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
