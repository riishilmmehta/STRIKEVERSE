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
import { placeDojoBlock, removeNearestDojoBlock } from './dojoRules';
import { FrenzyPostProcess } from './frenzyPostProcess';
import { HeroRig } from './heroRig';
import type { HeroAnimState } from './heroRig';
import { HitVfxRenderer } from './hitVfxRenderer';
import {
  loadCustomization,
  loadDojoBlocks,
  loadProgress,
  saveCustomization,
  saveDojoBlocks,
  saveProgress,
} from './storage';
import type { PlayerProgress } from './storage';
import type {
  AttackInput,
  CombatCallout,
  DojoBlock,
  DojoBlockType,
  EmoteId,
  GamePhase,
  HeroClassId,
  HeroCustomization,
  HudSnapshot,
  MatchSummary,
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
  private readonly raycaster = new THREE.Raycaster();
  private readonly floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  private world: BuiltWorld | null = null;
  private player!: FighterActor;
  private actors: FighterActor[] = [];
  private customization: HeroCustomization;
  private dojoBlocks: DojoBlock[];
  private progress: PlayerProgress;

  private phase: GamePhase = 'title';
  private zone: WorldZone = 'hub';
  private activeBossIndex = 0;
  private customizeShowcase = false;
  private customizeYawOffset = 0;
  private leaderboardOpen = false;

  // Dojo sandbox state
  private dojoMode: 'play' | 'build' = 'play';
  private selectedDojoBlock: DojoBlockType = 'dummy';
  private dummyHitTimers = new Map<string, number>();
  private visitedDojo: (VisitedDojoSummary & { blocks: DojoBlock[] }) | null = null;

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
    this.progress = loadProgress();
    this.sound.setMuted(this.progress.muted);

    // Three.js Renderer configured per skill standards
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.98;
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
    container.appendChild(this.renderer.domElement);

    // Scene with sunlit stylized-realistic sky & matching horizon fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#7dd3fc');
    this.scene.fog = new THREE.Fog('#bae6fd', 42, 165);

    // Mandatory studio environment reflection map (RoomEnvironment)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 260);
    this.camera.position.copy(this.camPos);

    // Balanced warm/cool 3-point lighting rig (1 shadow caster)
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x7c2d12, 0.72);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff1d0, 1.42);
    sun.position.set(16, 28, 18);
    if (!this.isSoftwareGl) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.near = 4;
      sun.shadow.camera.far = 85;
      const d = 28;
      sun.shadow.camera.left = -d;
      sun.shadow.camera.right = d;
      sun.shadow.camera.top = d;
      sun.shadow.camera.bottom = -d;
      sun.shadow.bias = -0.0005;
      sun.shadow.normalBias = 0.02;
    }
    this.scene.add(sun);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.55);
    rimLight.position.set(-18, 12, -20);
    this.scene.add(rimLight);

    // Pooled Zero-GC Combat Hit-Spark, Starburst & Slash-Arc VFX System
    this.hitVfx = new HitVfxRenderer(this.scene);
    this.frenzyFx = new FrenzyPostProcess(width, height, this.renderer.getPixelRatio());

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
      this.renderer.render(this.scene, this.camera);
    }
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

  public getPlayerDojoBlocks(): DojoBlock[] {
    return this.dojoBlocks.map((b) => ({ ...b }));
  }

  private getActiveDojoBlocks(): DojoBlock[] {
    return this.visitedDojo ? this.visitedDojo.blocks : this.dojoBlocks;
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
    this.emitHud();
  }

  public setSelectedDojoBlock(type: DojoBlockType): void {
    this.selectedDojoBlock = type;
    this.emitHud();
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
    this.world.crates = this.world.crates.filter((c) => c.id !== res.removed!.id);
    this.pushCallout('BLOCK REMOVED', undefined, 'amber');
    this.emitHud();
  }

  private tryPlaceDojoBlockAt(x: number, z: number): void {
    if (!this.world) return;
    const res = placeDojoBlock(this.dojoBlocks, this.selectedDojoBlock, x, z, this.player.yaw);
    if (!res.placed) {
      this.pushCallout('CANNOT PLACE', res.reason, 'rose');
      return;
    }
    this.dojoBlocks = res.blocks;
    saveDojoBlocks(this.dojoBlocks);
    const mesh = createDojoBlockMesh(res.placed, !this.isSoftwareGl);
    this.world.group.add(mesh);
    this.world.dojoMeshes.set(res.placed.id, mesh);
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
    this.spawnParticles(res.placed.x, 0.8, res.placed.z, '#10b981', 12, 4.5);
    this.sound.playBounce();
    this.pushCallout('PLACED IN DOJO', `${res.placed.type.toUpperCase()}`, 'emerald');
    this.emitHud();
  }

  public triggerEmote(emote: EmoteId): void {
    if (this.phase !== 'playing' || this.player.isKo || this.player.activeMove) return;
    this.player.emote = emote;
    this.player.emoteTimer = 0;
    this.spawnShockwave(this.player.x, this.player.z, AURA_HEX[this.customization.aura], 2.0);
    this.sound.playDash();
    this.pushCallout(
      emote === 'flex'
        ? 'VICTORY FLEX'
        : emote === 'shadowbox'
          ? 'WARMUP FLOW'
          : emote === 'bow'
            ? 'DOJO BOW'
            : 'HYPE GROOVE',
      undefined,
      'cyan'
    );
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

  public triggerPortalInteract(): void {
    const p = this.findNearbyPortal();
    if (!p) return;
    if (p.zone === 'customize') {
      this.callbacks.onOpenCustomize();
    } else {
      this.switchZone(p.zone);
    }
  }

  // Touch & HUD button hooks
  public setJoystick(dx: number, dz: number, flickDash = false): void {
    this.joyX = Math.max(-1, Math.min(1, dx));
    this.joyZ = Math.max(-1, Math.min(1, dz));
    if (flickDash && this.phase === 'playing') {
      this.queueAction('dodge');
    }
  }

  public pressLightAttack(): void {
    if (this.phase !== 'playing' || this.customizeShowcase) return;
    this.sound.unlock();
    this.queueAction('L');
  }

  public pressHeavyAttack(): void {
    if (this.phase !== 'playing' || this.customizeShowcase) return;
    this.sound.unlock();
    this.queueAction('H');
  }

  public pressSkill(): void {
    if (this.phase !== 'playing' || this.customizeShowcase) return;
    this.sound.unlock();
    this.queueAction('skill');
  }

  public pressJump(): void {
    if (this.phase !== 'playing' || this.customizeShowcase) return;
    this.sound.unlock();
    this.queueAction('jump');
  }

  public pressDodge(): void {
    if (this.phase !== 'playing' || this.customizeShowcase) return;
    this.sound.unlock();
    this.queueAction('dodge');
  }

  public pressUltimate(): void {
    if (this.phase !== 'playing' || this.customizeShowcase) return;
    this.sound.unlock();
    if (this.ultimateMeter >= 100 && this.ultimateTimer <= 0 && !this.player.isKo) {
      this.activateUltimate();
    }
  }

  public pressPetAbility(): void {
    if (this.phase !== 'playing' || this.customizeShowcase) return;
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
  }

  private loadZone(zone: WorldZone): void {
    this.zone = zone;
    this.matchTimer = 0;
    this.matchMaxCombo = 0;
    this.matchParries = 0;
    this.matchDamageDealt = 0;
    this.matchEndDelay = -1;
    this.pendingSummary = null;
    this.ultimateTimer = 0;
    this.finisherSlowMoTimer = 0;
    this.finisherSlowMoName = '';
    this.petCooldown = 0;
    this.petActionTimer = 0;
    this.hitstopTimer = 0;
    this.frenzyIntensity = 0;
    this.frenzyImpactPulse = 0;
    this.dojoMode = 'play';

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

    // Atmosphere tone per zone (vibrant stylized-realistic daylight/sunset)
    if (zone === 'hub') {
      (this.scene.background as THREE.Color).set('#7dd3fc');
      (this.scene.fog as THREE.Fog).color.set('#bae6fd');
      this.sound.setCombatIntensity(0.0);
    } else if (zone === 'dojo') {
      (this.scene.background as THREE.Color).set('#fde68a');
      (this.scene.fog as THREE.Fog).color.set('#fef3c7');
      this.sound.setCombatIntensity(0.15);
    } else if (zone === 'campaign') {
      (this.scene.background as THREE.Color).set('#fca5a5');
      (this.scene.fog as THREE.Fog).color.set('#fed7aa');
      this.sound.setCombatIntensity(0.85);
    } else if (zone === 'royale') {
      (this.scene.background as THREE.Color).set('#67e8f9');
      (this.scene.fog as THREE.Fog).color.set('#a5f3fc');
      this.sound.setCombatIntensity(0.95);
    } else {
      (this.scene.background as THREE.Color).set('#93c5fd');
      (this.scene.fog as THREE.Fog).color.set('#dbeafe');
      this.sound.setCombatIntensity(0.75);
    }

    const anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.world = buildZoneWorld(zone, this.getActiveDojoBlocks(), anisotropy, !this.isSoftwareGl);
    this.scene.add(this.world.group);

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
      if (this.visitedDojo) {
        this.pushCallout(
          this.visitedDojo.dojoName.toUpperCase(),
          `VISITING ${this.visitedDojo.ownerName.toUpperCase()}'S DOJO`,
          'cyan'
        );
      } else {
        this.pushCallout('MY DOJO PLOT', 'Test combos on dummies or switch to Build Mode', 'emerald');
      }
    } else if (zone === 'arena') {
      this.player.x = 0;
      this.player.z = 1.85;
      this.player.yaw = Math.PI;
      const rivalStyles: { name: string; classId: HeroClassId; policy: AiPolicy; top: string; accent: string; hair: HeroCustomization['hairStyle']; weapon: HeroCustomization['weaponSkin'] }[] = [
        { name: 'RYUJI', classId: 'striker', policy: 'duelist', top: '#0f172a', accent: '#f59e0b', hair: 'spiky', weapon: 'tonfa' },
        { name: 'NOVA', classId: 'ranger', policy: 'ranger', top: '#0e7490', accent: '#22d3ee', hair: 'ponytail', weapon: 'staff' },
        { name: 'KRAKEN', classId: 'juggernaut', policy: 'charger', top: '#7f1d1d', accent: '#fb923c', hair: 'mohawk', weapon: 'gauntlets' },
        { name: 'SHADE', classId: 'phantom', policy: 'flanker', top: '#312e81', accent: '#a855f7', hair: 'undercut', weapon: 'katana' },
      ];
      const pick = rivalStyles[this.progress.wins % rivalStyles.length];
      const opp = this.createFighter({
        id: 'arena-rival',
        name: pick.name,
        title: `Ranked ${HERO_CLASSES[pick.classId].name}`,
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
        z: -1.35,
        yaw: 0,
        maxHpOverride: 155 + Math.min(60, this.progress.wins * 12),
      });
      this.actors.push(opp);
      this.scene.add(opp.rig.root);
      this.pushCallout('1v1 DUEL START!', `VS ${pick.name} · Land J-J-K for Skyward Launcher`, 'amber');
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
          maxHpOverride: 95,
        });
        this.actors.push(fighter);
        this.scene.add(fighter.rig.root);
      });
      this.pushCallout('LAST HERO STANDING', '6 Fighters · Stay inside the shrinking ring!', 'cyan');
    }

    // Sync player rig & snap camera immediately, then draw first frame synchronously so no zone ever flashes black!
    this.player.rig.root.position.set(this.player.x, 0, this.player.z);
    this.player.rig.root.rotation.y = this.player.yaw;
    this.camYaw = 0;
    this.camPos.set(this.player.x, 5.2, this.player.z + 9.2);
    this.camLook.set(this.player.x, 1.5, this.player.z - 2.0);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    this.renderer.render(this.scene, this.camera);
  }

  private spawnHubNpcs(): void {
    const npcs: { name: string; x: number; z: number; top: string; accent: string; hair: HeroCustomization['hairStyle']; emote: EmoteId | null }[] = [
      { name: 'SORA', x: -7.5, z: 3.5, top: '#0284c7', accent: '#38bdf8', hair: 'ponytail', emote: 'shadowbox' },
      { name: 'JAX', x: 7.5, z: 2.5, top: '#be123c', accent: '#fb7185', hair: 'locs', emote: 'flex' },
      { name: 'MIKO', x: -5.5, z: -9.0, top: '#047857', accent: '#34d399', hair: 'twinbuns', emote: 'dance' },
      { name: 'ZANE', x: 6.5, z: -8.5, top: '#4338ca', accent: '#a855f7', hair: 'undercut', emote: null },
    ];
    npcs.forEach((n, i) => {
      const npc = this.createFighter({
        id: `hub-npc-${i}`,
        name: n.name,
        title: 'Nexus Citizen',
        isPlayer: false,
        customization: {
          ...this.customization,
          name: n.name,
          topColor: n.top,
          accentColor: n.accent,
          hairStyle: n.hair,
          headgear: i % 2 === 0 ? 'visor' : 'headband',
          backAccessory: i % 2 === 0 ? 'scarf' : 'wings',
          pet: i === 0 ? 'fox' : 'none',
        },
        aiPolicy: 'hub_npc',
        x: n.x,
        z: n.z,
        yaw: Math.atan2(-n.x, -n.z),
      });
      npc.emote = n.emote;
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

  private findNearestHostile(from: FighterActor, maxRange = 22): FighterActor | null {
    let best: FighterActor | null = null;
    let bestDist = maxRange;
    for (const a of this.actors) {
      if (a.id === from.id || a.isKo || a.aiPolicy === 'hub_npc') continue;
      if (!from.isPlayer && !a.isPlayer && this.zone !== 'royale') continue;
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
    this.progress.xp += xp;
    let xpToNext = this.progress.level * 120;
    while (this.progress.xp >= xpToNext) {
      this.progress.xp -= xpToNext;
      this.progress.level += 1;
      xpToNext = this.progress.level * 120;
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

      let dx = this.getMoveInputX();
      let dz = this.getMoveInputZ();
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
      if (b.type !== 'dummy') continue;
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
      if (target.id === attacker.id || target.isKo || target.aiPolicy === 'hub_npc') continue;
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
      if (b.type !== 'dummy') continue;
      if (Math.hypot(b.x - cx, b.z - cz) <= radius + 0.6) {
        hitAny = true;
        this.dummyHitTimers.set(b.id, 0.35);
        this.player.comboCount += 1;
        this.player.comboDisplayTimer = COMBO_DECAY_DURATION;
        this.gainPlayerUltimate(10);

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

    const scaled = computeScaledDamage(
      baseDamage,
      attacker.classId,
      attacker.isPlayer ? this.customization.frame : 'balanced',
      attacker.comboCount,
      defender.staggerTimer > 0
    );

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
      this.hitstopTimer = parryVfx.hitstop;
      this.cameraTrauma = Math.min(1, this.cameraTrauma + parryVfx.shakeTrauma);
      this.cameraFovKick = Math.max(this.cameraFovKick, parryVfx.fovKick);
      this.sound.playParry();
      this.hitVfx.spawnHitImpact(contactX, contactY, contactZ, -dirX, -dirZ, parryVfx);
      this.spawnShockwave(defender.x, defender.z, '#facc15', parryVfx.shockwaveScale);
      this.spawnParticles(defender.x, 1.25, defender.z, '#fde047', 16, 7.5);
      this.pushDamagePopup(defender.x, defender.y + 2.0, defender.z, 'PARRY!', 'parry', 'STUNNED');
      if (defender.isPlayer) {
        this.gainPlayerUltimate(def.defenderUltGain);
        this.matchParries += 1;
        this.recordQuestProgress('q_parry', 1);
        this.pushCallout('PERFECT PARRY!', 'ATTACKER STUNNED · PUNISH NOW!', 'amber');
      }
      return;
    }

    defender.stamina = Math.max(0, defender.stamina - def.staminaCost);
    defender.hp = Math.max(0, defender.hp - def.finalDamage);
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

    attacker.comboCount += 1;
    attacker.comboDisplayTimer = COMBO_DECAY_DURATION;

    if (attacker.isPlayer) {
      this.matchDamageDealt += def.finalDamage;
      this.matchMaxCombo = Math.max(this.matchMaxCombo, attacker.comboCount);
      this.gainPlayerUltimate(heavyFeel ? 14 : 9);
      this.recordQuestProgress('q_combo', 1);
      if (attacker.comboCount >= 3 && heavyFeel && !attacker.activeMove?.isFinisher) {
        this.pushCallout(`${attacker.comboCount} HIT COMBO!`, attacker.lastComboName.toUpperCase(), 'amber');
      }
    } else if (defender.isPlayer) {
      this.gainPlayerUltimate(def.defenderUltGain);
      this.player.comboCount = 0;
      this.player.comboDisplayTimer = 0;
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
    this.pushDamagePopup(
      defender.x,
      defender.y + 1.9,
      defender.z,
      `${def.finalDamage}`,
      vfx.kind === 'finisher' || vfx.kind === 'ultimate'
        ? 'finisher'
        : vfx.kind === 'heavy' || vfx.kind === 'skill'
          ? 'heavy'
          : 'light',
      vfx.kind === 'finisher' ? attacker.lastComboName : vfx.kind === 'heavy' ? 'HEAVY!' : undefined
    );

    // Check KO
    if (defender.hp <= 0 && !defender.isKo) {
      defender.isKo = true;
      defender.koTimer = 0;
      defender.vy = 5.5;
      defender.grounded = false;
      this.hitstopTimer = 0.095;
      this.cameraTrauma = 0.65;
      this.spawnShockwave(defender.x, defender.z, '#ef4444', 5.2);
      this.spawnParticles(defender.x, 1.2, defender.z, '#facc15', 26, 8.5);
      if (attacker.isPlayer) {
        this.pushCallout('K.O.!', `${defender.name} DEFEATED`, 'amber');
      }
      this.checkMatchCompletion();
    }
  }

  private checkMatchCompletion(): void {
    if (this.matchEndDelay >= 0) return;
    if (this.zone === 'hub' || this.zone === 'dojo') return;

    if (this.player.isKo) {
      this.matchEndDelay = 0.65;
      this.sound.playDefeat();
      const opp = this.actors.find((a) => !a.isPlayer && !a.isKo);
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
        coinsEarned: 40,
        xpEarned: 45,
        bossIndex: this.zone === 'campaign' ? this.activeBossIndex : undefined,
      };
      this.awardXpAndCoins(45, 40);
      return;
    }

    const aliveEnemies = this.actors.filter((a) => !a.isPlayer && !a.isKo && a.aiPolicy !== 'hub_npc');
    if (aliveEnemies.length === 0) {
      this.matchEndDelay = 0.7;
      this.sound.playVictory();
      this.progress.wins += 1;
      this.recordQuestProgress('q_win', 1);

      let coins = 160;
      let xp = 120;
      let title = 'VICTORY!';
      let subtitle = 'Arena Duel Champion';
      let hasNextBoss = false;

      if (this.zone === 'campaign') {
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

      this.awardXpAndCoins(xp, coins);
      this.pendingSummary = {
        victory: true,
        mode: this.zone,
        title,
        subtitle,
        elapsedSeconds: Math.round(this.matchTimer),
        maxCombo: this.matchMaxCombo,
        parriesLanded: this.matchParries,
        damageDealt: this.matchDamageDealt,
        coinsEarned: coins,
        xpEarned: xp,
        bossIndex: this.zone === 'campaign' ? this.activeBossIndex : undefined,
        hasNextBoss,
      };
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

      // Dojo interactive functional blocks (Trampoline & Dash Pad!)
      if (this.zone === 'dojo' && actor.isPlayer) {
        for (const b of this.getActiveDojoBlocks()) {
          const d = Math.hypot(actor.x - b.x, actor.z - b.z);
          if (b.type === 'trampoline' && d < 1.25 && actor.grounded) {
            actor.vy = 14.5;
            actor.grounded = false;
            actor.squashX = 0.8;
            actor.squashY = 1.28;
            this.sound.playBounce();
            this.spawnShockwave(b.x, b.z, '#06b6d4', 2.8);
            this.pushCallout('BOUNCE PAD!', 'AIR LAUNCH', 'cyan');
          } else if (b.type === 'dashpad' && d < 1.35) {
            const fx = Math.sin(b.rotation);
            const fz = Math.cos(b.rotation);
            actor.vx = fx * 18;
            actor.vz = fz * 18;
            this.sound.playDash();
            this.spawnParticles(b.x, 0.4, b.z, '#10b981', 8, 5.0);
          }
        }
      }
    }

    // Perimeter containment
    if (this.zone === 'dojo') {
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
        actor.comboCount = 0;
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
          if (target.isPlayer || target.isKo || target.aiPolicy === 'hub_npc') continue;
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

    // Free 3rd-person directional movement
    if (p.staggerTimer <= 0 && !p.isBlocking) {
      const mx = this.getMoveInputX();
      const mz = this.getMoveInputZ();
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
          actor.aiTimer = 0.55 + Math.random() * 0.45;
        }
        continue;
      }

      if (actor.aiState === 'recover') {
        if (actor.aiTimer <= 0) {
          actor.aiState = Math.random() < 0.4 ? 'strafe' : 'approach';
          actor.aiStrafeDir = Math.random() > 0.5 ? 1 : -1;
          actor.aiTimer = 0.7 + Math.random() * 0.6;
        }
        continue;
      }

      // 4 Genuine Distinct AI Policies:
      const canAttack = activeAttackers < 2;
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
      for (const target of this.actors) {
        if (target.id === p.ownerId || target.isKo || target.aiPolicy === 'hub_npc') continue;
        if (!p.fromPlayer && !target.isPlayer && this.zone !== 'royale') continue;
        if (Math.hypot(target.x - p.x, target.z - p.z) < 0.9) {
          const owner = this.actors.find((a) => a.id === p.ownerId) ?? this.player;
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

    // Dynamic FOV with smooth impact punch + Combo Frenzy adrenaline expansion (tightens on Combo Finisher slow-mo!)
    const finisherActive = this.finisherSlowMoTimer > 0;
    const targetFov = finisherActive
      ? 42 + this.frenzyState.fovBoost * 0.6
      : 50 + this.cameraFovKick + this.frenzyState.fovBoost;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 14, dt);
      this.camera.updateProjectionMatrix();
    }

    // Crisp 3rd-person action combat chase camera framing both player & active rival
    let lookX = this.player.x;
    let lookZ = this.player.z;
    let camDist = 8.4;
    let camHeight = 4.6;

    if (this.zone === 'arena' || this.zone === 'campaign') {
      const opp = this.actors.find((a) => !a.isPlayer && !a.isKo);
      if (opp) {
        lookX = this.player.x * 0.62 + opp.x * 0.38;
        lookZ = this.player.z * 0.62 + opp.z * 0.38;
        const sep = Math.hypot(opp.x - this.player.x, opp.z - this.player.z);
        camDist = Math.max(7.2, Math.min(11.6, 5.8 + sep * 0.45));
        camHeight = 4.2 + sep * 0.08;
      }
    } else if (this.zone === 'dojo' && this.dojoMode === 'build') {
      camDist = 11.2;
      camHeight = 8.8;
    }

    const sideOffset = finisherActive ? 1.65 : 0;
    if (finisherActive) {
      camDist = Math.max(4.9, camDist - 2.3);
      camHeight = Math.max(2.35, camHeight - 1.45);
    }

    _vec3A.set(
      lookX + Math.sin(this.camYaw) * camDist + Math.cos(this.camYaw) * sideOffset,
      this.player.y + camHeight,
      lookZ + Math.cos(this.camYaw) * camDist - Math.sin(this.camYaw) * sideOffset
    );
    _vec3B.set(lookX, this.player.y + 1.35, lookZ - 0.8);

    const k = 1 - Math.exp(-(finisherActive ? 12.5 : 7.5) * dt);
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

      if (this.hitstopTimer > 0) {
        this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      } else {
        const simDt =
          this.ultimateTimer > 0
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

        if (!this.customizeShowcase && !this.leaderboardOpen) {
          this.updatePlayer(simDt);
          this.updateAiActors(simDt);
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
    const cls = HERO_CLASSES[this.player.classId];
    const mainOpp =
      this.zone === 'arena' || this.zone === 'campaign'
        ? this.actors.find((a) => !a.isPlayer && a.aiPolicy !== 'hub_npc') ?? null
        : null;
    const portal = this.zone === 'hub' || this.zone === 'dojo' ? this.findNearbyPortal() : null;
    const royaleAlive = this.actors.filter((a) => !a.isKo && a.aiPolicy !== 'hub_npc').length;

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
      xpToNext: this.progress.level * 120,
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
      dojoMode: this.dojoMode,
      selectedDojoBlock: this.selectedDojoBlock,
      dojoBlockCount: this.dojoBlocks.length,
      visitingDojo: this.visitedDojo
        ? {
            id: this.visitedDojo.id,
            ownerName: this.visitedDojo.ownerName,
            dojoName: this.visitedDojo.dojoName,
            themeTag: this.visitedDojo.themeTag,
          }
        : null,
      muted: this.progress.muted,
      dailyQuests: this.progress.dailyQuests.map((q) => ({ ...q })),
    });
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    if (this.phase === 'title') {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        this.startGame('hub');
      }
      return;
    }

    if (e.code === 'Escape' || e.code === 'KeyP') {
      e.preventDefault();
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

    if (this.leaderboardOpen) return;

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
    } else if (e.code === 'Digit1') {
      this.triggerEmote('flex');
    } else if (e.code === 'Digit2') {
      this.triggerEmote('shadowbox');
    } else if (e.code === 'Digit3') {
      this.triggerEmote('bow');
    } else if (e.code === 'Digit4') {
      this.triggerEmote('dance');
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
    if (this.phase !== 'playing' || this.customizeShowcase) return;
    this.sound.unlock();

    // In Dojo Build mode, clicking the floor directly places the selected block!
    if (this.zone === 'dojo' && this.dojoMode === 'build' && e.button === 0) {
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

    if (e.button === 0) {
      this.pressLightAttack();
    } else if (e.button === 2) {
      this.pressHeavyAttack();
    }
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
    this.renderer.domElement.removeEventListener('contextmenu', this.handleContextMenu);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);

    if (this.world) this.world.dispose();
    for (const a of this.actors) a.rig.dispose();
    this.hitVfx.dispose();
    this.frenzyFx.dispose();
    this.particleMesh.geometry.dispose();
    (this.particleMesh.material as THREE.Material).dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
