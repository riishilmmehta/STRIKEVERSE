import * as THREE from 'three';
import { DEFAULT_CLAN_EMBLEM, drawClanEmblemOnCanvas } from './clanEmblem';
import { DOJO_PLOT_HALF_SIZE } from './dojoRules';
import { getDummyVariantSpec } from './trainingDummy';
import type { ArenaBiomeId, ClanEmblemConfig, DojoBlock, WorldZone } from './types';

export interface PortalZoneData {
  zone: WorldZone | 'customize';
  label: string;
  subtitle: string;
  x: number;
  z: number;
  radius: number;
}

export interface SmashableCrate {
  id: string;
  mesh: THREE.Group;
  x: number;
  z: number;
  radius: number;
  broken: boolean;
}

export interface ArenaPillar {
  x: number;
  z: number;
  radius: number;
}

export interface BuiltWorld {
  group: THREE.Group;
  arenaRadius: number;
  portals: PortalZoneData[];
  crates: SmashableCrate[];
  pillars: ArenaPillar[];
  royaleRingMesh: THREE.Mesh | null;
  animatedMeshes: { mesh: THREE.Object3D; speed: number; axis: 'y' | 'bob'; baseY: number }[];
  dojoMeshes: Map<string, THREE.Group>;
  floorMaterial: THREE.MeshStandardMaterial | null;
  updateClanBanner: (emblem: ClanEmblemConfig) => void;
  dispose: () => void;
}

function createPlazaTileTextures(
  baseHex: string,
  lineHex: string,
  accentHex: string,
  anisotropy: number
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  // Subtle stone grain
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(15,23,42,0.045)';
    ctx.fillRect(x, y, 3, 3);
  }

  // Tile seams
  ctx.strokeStyle = lineHex;
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, size - 4, size - 4);
  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(size / 2, size);
  ctx.moveTo(0, size / 2);
  ctx.lineTo(size, size / 2);
  ctx.stroke();

  // Accent corner diamonds
  ctx.fillStyle = accentHex;
  ctx.fillRect(size / 2 - 5, size / 2 - 5, 10, 10);

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(16, 16);
  map.anisotropy = anisotropy;

  const bc = document.createElement('canvas');
  bc.width = size;
  bc.height = size;
  const bctx = bc.getContext('2d')!;
  bctx.fillStyle = '#c8c8c8';
  bctx.fillRect(0, 0, size, size);
  bctx.strokeStyle = '#404040';
  bctx.lineWidth = 4;
  bctx.strokeRect(2, 2, size - 4, size - 4);
  bctx.beginPath();
  bctx.moveTo(size / 2, 0);
  bctx.lineTo(size / 2, size);
  bctx.moveTo(0, size / 2);
  bctx.lineTo(size, size / 2);
  bctx.stroke();

  const bumpMap = new THREE.CanvasTexture(bc);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(16, 16);
  bumpMap.anisotropy = anisotropy;

  return { map, bumpMap };
}

function createPortalSignTexture(label: string, colorHex: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 96);
  const hexStr = '#' + colorHex.toString(16).padStart(6, '0');
  ctx.fillStyle = hexStr;
  ctx.fillRect(0, 82, 512, 14);
  ctx.fillRect(0, 0, 512, 8);
  ctx.font = '700 42px sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label.toUpperCase(), 256, 46);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPortalArch(
  label: string,
  colorHex: number,
  x: number,
  z: number,
  rotY: number,
  enableShadows: boolean
): { group: THREE.Group; core: THREE.Mesh; signTex: THREE.CanvasTexture } {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.72, metalness: 0.2 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.55 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 1.5,
    roughness: 0.2,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
  });

  // Solid architectural plinth + flanking pillars (grounded & framed, never freestanding floating door)
  const base = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.36, 2.2), stoneMat);
  base.position.y = 0.18;
  const pillarL = new THREE.Mesh(new THREE.BoxGeometry(0.95, 5.2, 1.3), stoneMat);
  pillarL.position.set(-2.15, 2.6, 0);
  const pillarR = pillarL.clone();
  pillarR.position.x = 2.15;

  const capL = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.35, 1.5), trimMat);
  capL.position.set(-2.15, 5.2, 0);
  const capR = capL.clone();
  capR.position.x = 2.15;

  const lintel = new THREE.Mesh(new THREE.BoxGeometry(5.9, 0.9, 1.45), stoneMat);
  lintel.position.set(0, 5.55, 0);

  // Crisp readable front & back portal sign plaque
  const signTex = createPortalSignTexture(label, colorHex);
  const signMat = new THREE.MeshBasicMaterial({ map: signTex });
  const signFront = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.82), signMat);
  signFront.position.set(0, 5.55, 0.75);
  const signBack = signFront.clone();
  signBack.rotation.y = Math.PI;
  signBack.position.z = -0.75;

  const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), glowMat);
  crest.position.set(0, 6.45, 0);

  const portalPlane = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 4.7), glowMat);
  portalPlane.position.set(0, 2.7, 0);

  const ringMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 1.2,
    roughness: 0.25,
  });
  const padRing = new THREE.Mesh(new THREE.RingGeometry(1.75, 2.1, 24), ringMat);
  padRing.rotation.x = -Math.PI / 2;
  padRing.position.set(0, 0.04, 1.55);

  g.add(base, pillarL, pillarR, capL, capR, lintel, signFront, signBack, crest, portalPlane, padRing);

  if (enableShadows) {
    g.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && o !== portalPlane && o !== padRing && o !== signFront && o !== signBack) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }

  return { group: g, core: crest, signTex };
}

function createCrateProp(x: number, z: number, enableShadows: boolean): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const woodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.82, metalness: 0.06 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.38, metalness: 0.65 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.8,
    roughness: 0.25,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.25, 1.25), woodMat);
  body.position.y = 0.625;
  const bandH = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.16, 1.32), frameMat);
  bandH.position.y = 0.625;
  const capTop = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.12, 1.32), frameMat);
  capTop.position.y = 1.22;
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 1.35), glowMat);
  badge.position.y = 0.625;

  g.add(body, bandH, capTop, badge);
  if (enableShadows) {
    g.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }
  return g;
}

export function createDojoBlockMesh(block: DojoBlock, enableShadows: boolean): THREE.Group {
  const g = new THREE.Group();
  g.position.set(block.x, 0, block.z);
  g.rotation.y = block.rotation;

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.78, metalness: 0.05 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3, metalness: 0.75 });

  if (block.type === 'dummy') {
    const spec = getDummyVariantSpec(block.dummyVariant);
    if (spec.aiPolicy !== null) {
      // Grounded Training Automaton Sparring Pad (the live 3D boss-mimic rig spawns on top of this anchor!)
      const padColor = new THREE.Color(spec.accentHex);
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.92, 1.05, 0.14, 16),
        metalMat
      );
      base.position.y = 0.07;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.68, 0.88, 24),
        new THREE.MeshStandardMaterial({
          color: padColor,
          emissive: padColor,
          emissiveIntensity: 1.2,
          roughness: 0.25,
          side: THREE.DoubleSide,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.15;
      const chevron = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.34, 4),
        new THREE.MeshStandardMaterial({
          color: padColor,
          emissive: padColor,
          emissiveIntensity: 0.8,
          roughness: 0.3,
        })
      );
      chevron.rotation.x = Math.PI / 2;
      chevron.position.set(0, 0.16, 0.72);
      g.add(base, ring, chevron);
    } else {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.22, 12), metalMat);
      base.position.y = 0.11;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 1.55, 10), woodMat);
      post.position.y = 0.92;
      const chest = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.28, 0.62, 12),
        new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.65 })
      );
      chest.position.y = 1.24;
      const armBar = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.14, 0.14), woodMat);
      armBar.position.y = 1.35;
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.55 })
      );
      head.position.y = 1.8;
      g.add(base, post, chest, armBar, head);
    }
  } else if (block.type === 'trampoline') {
    const frame = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, 0.28, 16), metalMat);
    frame.position.y = 0.14;
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(1.02, 1.02, 0.08, 16),
      new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x0891b2,
        emissiveIntensity: 1.1,
        roughness: 0.25,
      })
    );
    pad.position.y = 0.3;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.12, 0.06, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.28;
    g.add(frame, pad, ring);
  } else if (block.type === 'dashpad') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.16, 2.2), metalMat);
    base.position.y = 0.08;
    const arrowMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 1.35,
      roughness: 0.22,
    });
    const strip1 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.35), arrowMat);
    strip1.position.set(0, 0.18, 0.45);
    const strip2 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.35), arrowMat);
    strip2.position.set(0, 0.18, -0.35);
    g.add(base, strip1, strip2);
  } else if (block.type === 'crate') {
    return createCrateProp(block.x, block.z, enableShadows);
  } else if (block.type === 'lantern') {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.35, 0.65), metalMat);
    plinth.position.y = 0.175;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 1.5, 8), woodMat);
    pillar.position.y = 1.05;
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.52, 0.42),
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.6,
        roughness: 0.25,
      })
    );
    lamp.position.y = 2.02;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.32, 4), metalMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 2.42;
    g.add(plinth, pillar, lamp, roof);
  } else {
    // Trophy pedestal
    const ped = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), metalMat);
    ped.position.y = 0.55;
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xca8a04,
      emissiveIntensity: 0.45,
      roughness: 0.2,
      metalness: 0.9,
    });
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.14, 0.55, 12), goldMat);
    cup.position.y = 1.45;
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), goldMat);
    star.position.y = 1.92;
    g.add(ped, cup, star);
  }

  if (enableShadows) {
    g.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }
  return g;
}

function addDistantCitySkylineAndNature(group: THREE.Group): void {
  // Stylized-realistic distant Nexus City towers + coastal horizon hills (never a dark boxed room!)
  const towerGeo = new THREE.BoxGeometry(1, 1, 1);
  const towerMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.35 });
  const count = 34;
  const towers = new THREE.InstancedMesh(towerGeo, towerMat, count);
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const dist = 62 + (i % 4) * 14;
    const h = 16 + ((i * 19) % 34);
    const w = 5 + ((i * 7) % 6);
    dummy.position.set(Math.cos(angle) * dist, h * 0.5 - 6, Math.sin(angle) * dist);
    dummy.scale.set(w, h, w);
    dummy.rotation.y = angle;
    dummy.updateMatrix();
    towers.setMatrixAt(i, dummy.matrix);
    tint.setHSL(0.58 + (i % 3) * 0.03, 0.24, 0.32 + (i % 4) * 0.06);
    towers.setColorAt(i, tint);
  }
  towers.instanceMatrix.needsUpdate = true;
  if (towers.instanceColor) towers.instanceColor.needsUpdate = true;
  towers.computeBoundingSphere();
  group.add(towers);

  // Extended sunlit sea / sky-plaza apron extending far into horizon fog
  const sea = new THREE.Mesh(
    new THREE.CircleGeometry(210, 48),
    new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.28,
      metalness: 0.25,
    })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -4.2;
  group.add(sea);

  // Stylized blossom / coastal trees around outer deck using InstancedMesh
  const trunkGeo = new THREE.CylinderGeometry(0.24, 0.36, 3.2, 7);
  const crownGeo = new THREE.DodecahedronGeometry(1.85, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.88 });
  const crownMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72 });

  const treeCount = 24;
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const crowns = new THREE.InstancedMesh(crownGeo, crownMat, treeCount);
  for (let i = 0; i < treeCount; i++) {
    const angle = (i / treeCount) * Math.PI * 2 + 0.13;
    const dist = 28.5 + (i % 2) * 3.5;
    const scale = 0.88 + (i % 3) * 0.14;
    dummy.position.set(Math.cos(angle) * dist, 1.5 * scale - 0.1, Math.sin(angle) * dist);
    dummy.scale.setScalar(scale);
    dummy.rotation.y = i * 1.1;
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);

    dummy.position.set(Math.cos(angle) * dist, 3.55 * scale, Math.sin(angle) * dist);
    dummy.scale.set(scale * 1.1, scale * 0.85, scale * 1.1);
    dummy.updateMatrix();
    crowns.setMatrixAt(i, dummy.matrix);

    // Vibrant sakura pink + emerald coastal foliage palette
    if (i % 3 === 0) {
      tint.set('#f472b6');
    } else if (i % 3 === 1) {
      tint.set('#10b981');
    } else {
      tint.set('#34d399');
    }
    crowns.setColorAt(i, tint);
  }
  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
  trunks.computeBoundingSphere();
  crowns.computeBoundingSphere();
  group.add(trunks, crowns);
}

function createGradientSkyDome(
  topHex: string,
  midHex: string,
  horizonHex: string,
  texturesToDispose: THREE.Texture[]
): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, topHex);
  grad.addColorStop(0.38, midHex);
  grad.addColorStop(0.54, horizonHex);
  grad.addColorStop(0.72, midHex);
  grad.addColorStop(1.0, topHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  texturesToDispose.push(tex);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(165, 28, 20),
    new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    })
  );
  return dome;
}

export function buildZoneWorld(
  zone: WorldZone,
  dojoBlocks: DojoBlock[],
  anisotropy: number,
  enableShadows: boolean,
  clanEmblem: ClanEmblemConfig = DEFAULT_CLAN_EMBLEM,
  arenaBiome: ArenaBiomeId = 'salt_flats'
): BuiltWorld {
  const group = new THREE.Group();
  const portals: PortalZoneData[] = [];
  const crates: SmashableCrate[] = [];
  const pillars: ArenaPillar[] = [];
  const animatedMeshes: BuiltWorld['animatedMeshes'] = [];
  const dojoMeshes = new Map<string, THREE.Group>();
  let royaleRingMesh: THREE.Mesh | null = null;
  let floorMaterial: THREE.MeshStandardMaterial | null = null;
  let updateClanBanner: (emblem: ClanEmblemConfig) => void = () => {};

  const texturesToDispose: THREE.Texture[] = [];

  if (zone !== 'arena') {
    addDistantCitySkylineAndNature(group);
  }

  let arenaRadius = 24;

  if (zone === 'hub') {
    arenaRadius = 25;
    const { map, bumpMap } = createPlazaTileTextures('#94a3b8', '#475569', '#f59e0b', anisotropy);
    texturesToDispose.push(map, bumpMap);

    // Main elevated Nexus City sunlit plaza
    const deck = new THREE.Mesh(
      new THREE.CylinderGeometry(27, 29, 4.2, 48),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map,
        bumpMap,
        bumpScale: 0.05,
        roughness: 0.74,
        metalness: 0.08,
      })
    );
    deck.position.y = -2.1;
    deck.receiveShadow = enableShadows;
    group.add(deck);

    // Central raised golden-trimmed compass ring (disjoint Y +0.025 to prevent z-fighting)
    const centerRing = new THREE.Mesh(
      new THREE.RingGeometry(4.6, 5.3, 40),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.45,
        roughness: 0.32,
      })
    );
    centerRing.rotation.x = -Math.PI / 2;
    centerRing.position.y = 0.025;
    group.add(centerRing);

    // Tall Landmark Monument framed cleanly inside the initial spawn camera vista: Nexus Martial Spire
    const spireGroup = new THREE.Group();
    spireGroup.position.set(0, 0, -6.5);
    const spireBase = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.8, 0.65, 8),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.35 })
    );
    spireBase.position.y = 0.325;
    const spireShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 1.05, 4.8, 8),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.4 })
    );
    spireShaft.position.y = 2.9;
    const spireCrystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.95, 0),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 1.35,
        roughness: 0.15,
        metalness: 0.3,
      })
    );
    spireCrystal.position.y = 6.55;
    const spireHalo = new THREE.Mesh(
      new THREE.TorusGeometry(1.45, 0.09, 10, 32),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.9,
        roughness: 0.25,
      })
    );
    spireHalo.position.y = 6.55;
    spireHalo.rotation.x = 0.45;
    spireGroup.add(spireBase, spireShaft, spireCrystal, spireHalo);
    group.add(spireGroup);
    pillars.push({ x: 0, z: -6.5, radius: 2.5 });
    animatedMeshes.push(
      { mesh: spireCrystal, speed: 1.1, axis: 'y', baseY: 6.55 },
      { mesh: spireHalo, speed: -0.9, axis: 'y', baseY: 6.55 }
    );

    // 4 Framed Portal Pavilions around Nexus City Plaza
    const portalDefs: {
      zone: WorldZone | 'customize';
      label: string;
      subtitle: string;
      color: number;
      x: number;
      z: number;
      rotY: number;
    }[] = [
      {
        zone: 'arena',
        label: 'PvP Colosseum',
        subtitle: '1v1 Ranked Duel Arena',
        color: 0xf59e0b,
        x: 0,
        z: -19.5,
        rotY: 0,
      },
      {
        zone: 'campaign',
        label: 'Campaign Trials',
        subtitle: '3 Story Boss Battles',
        color: 0xef4444,
        x: 19.5,
        z: -2,
        rotY: -Math.PI / 2,
      },
      {
        zone: 'dojo',
        label: 'My Dojo Plot',
        subtitle: 'Build & Train Sandbox',
        color: 0x10b981,
        x: -19.5,
        z: -2,
        rotY: Math.PI / 2,
      },
      {
        zone: 'royale',
        label: 'Last Hero Standing',
        subtitle: 'Shrinking Ring Brawl',
        color: 0x06b6d4,
        x: 13.5,
        z: 14.5,
        rotY: -Math.PI * 0.75,
      },
      {
        zone: 'customize',
        label: 'Style Studio',
        subtitle: 'Customize Hero & Class',
        color: 0xa855f7,
        x: -13.5,
        z: 14.5,
        rotY: Math.PI * 0.75,
      },
      {
        zone: 'clan_siege',
        label: 'Clan Siege',
        subtitle: '2v2 & 4v4 Dojo Exhibitions',
        color: 0xf43f5e,
        x: 0,
        z: 18.8,
        rotY: Math.PI,
      },
    ];

    portalDefs.forEach((p) => {
      const arch = createPortalArch(p.label, p.color, p.x, p.z, p.rotY, enableShadows);

      // Mount Player Clan Banner Standards & Crest Medallion on the Dojo Entrance in Nexus City
      if (p.zone === 'dojo') {
        const bannerCanvas = document.createElement('canvas');
        bannerCanvas.width = 256;
        bannerCanvas.height = 384;
        const bannerCtx = bannerCanvas.getContext('2d');
        const bannerTex = new THREE.CanvasTexture(bannerCanvas);
        bannerTex.colorSpace = THREE.SRGBColorSpace;
        bannerTex.anisotropy = Math.min(4, anisotropy);

        const crestCanvas = document.createElement('canvas');
        crestCanvas.width = 256;
        crestCanvas.height = 256;
        const crestCtx = crestCanvas.getContext('2d');
        const crestTex = new THREE.CanvasTexture(crestCanvas);
        crestTex.colorSpace = THREE.SRGBColorSpace;
        crestTex.anisotropy = Math.min(4, anisotropy);

        const redrawBanners = (nextEmblem: ClanEmblemConfig) => {
          if (bannerCtx) {
            drawClanEmblemOnCanvas(bannerCtx, 256, 384, nextEmblem, {
              clanTag: 'SUN',
              includeClothBackdrop: true,
            });
            bannerTex.needsUpdate = true;
          }
          if (crestCtx) {
            drawClanEmblemOnCanvas(crestCtx, 256, 256, nextEmblem, {
              clanTag: 'SUN',
              includeClothBackdrop: false,
            });
            crestTex.needsUpdate = true;
          }
        };
        redrawBanners(clanEmblem);
        updateClanBanner = redrawBanners;
        texturesToDispose.push(bannerTex, crestTex);

        const poleMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          roughness: 0.45,
          metalness: 0.55,
        });
        const goldCapMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0x92400e,
          emissiveIntensity: 0.45,
          roughness: 0.28,
          metalness: 0.72,
        });
        const clothMat = new THREE.MeshStandardMaterial({
          map: bannerTex,
          roughness: 0.58,
          metalness: 0.08,
          side: THREE.DoubleSide,
        });

        // Two tall flanking Clan Banner Standards beside the Dojo archway
        for (const side of [-1, 1]) {
          const stand = new THREE.Group();
          stand.position.set(side * 3.65, 0, 1.05);

          const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.42, 0.9), poleMat);
          plinth.position.y = 0.21;
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 5.4, 8), poleMat);
          pole.position.y = 2.9;
          const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), goldCapMat);
          finial.position.y = 5.72;
          const crossBar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.05, 8), goldCapMat);
          crossBar.rotation.z = Math.PI / 2;
          crossBar.position.set(0, 5.15, 0.14);

          const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 2.85), clothMat);
          cloth.position.set(0, 3.65, 0.18);

          const hemBar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.9, 8), goldCapMat);
          hemBar.rotation.z = Math.PI / 2;
          hemBar.position.set(0, 2.22, 0.18);

          stand.add(plinth, pole, finial, crossBar, cloth, hemBar);
          if (enableShadows) {
            plinth.castShadow = true;
            plinth.receiveShadow = true;
            pole.castShadow = true;
          }
          arch.group.add(stand);
        }

        // Overhead Clan Crest Shield Medallion centered atop the Dojo entrance lintel
        const crestBacking = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.24, 16), poleMat);
        crestBacking.rotation.x = Math.PI / 2;
        crestBacking.position.set(0, 7.25, 0);
        const crestMat = new THREE.MeshBasicMaterial({ map: crestTex, transparent: true });
        const crestFront = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 1.75), crestMat);
        crestFront.position.set(0, 7.25, 0.14);
        const crestBack = crestFront.clone();
        crestBack.rotation.y = Math.PI;
        crestBack.position.z = -0.14;
        arch.group.add(crestBacking, crestFront, crestBack);
      }

      group.add(arch.group);
      texturesToDispose.push(arch.signTex);
      animatedMeshes.push({ mesh: arch.core, speed: 1.8, axis: 'y', baseY: 6.45 });
      portals.push({
        zone: p.zone,
        label: p.label,
        subtitle: p.subtitle,
        x: p.x,
        z: p.z,
        radius: 3.8,
      });
    });

    // Warm plaza benches & training crates on outer flanks
    [
      [-9, -11],
      [9, -11],
    ].forEach(([cx, cz], idx) => {
      const crateMesh = createCrateProp(cx, cz, enableShadows);
      group.add(crateMesh);
      crates.push({ id: `hub-crate-${idx}`, mesh: crateMesh, x: cx, z: cz, radius: 0.9, broken: false });
    });
  } else if (zone === 'arena') {
    arenaRadius = 18.5;

    // Dramatic gradient sky dome per biome so no arena ever sits in a flat void
    const skyPalettes: Record<ArenaBiomeId, [string, string, string]> = {
      salt_flats: ['#0c0e1d', '#1e1b3a', '#9a3412'],
      karst_cenotes: ['#042f2e', '#0f766e', '#5eead4'],
      wildfire_ashlands: ['#14080e', '#3b0f1c', '#ea580c'],
      geothermal_springs: ['#1a0b2e', '#7c2d12', '#f59e0b'],
      kelp_brine: ['#02131d', '#064e3b', '#10b981'],
    };
    const [skyTop, skyMid, skyHorizon] = skyPalettes[arenaBiome];
    group.add(createGradientSkyDome(skyTop, skyMid, skyHorizon, texturesToDispose));

    if (arenaBiome === 'salt_flats') {
      // BIOME 1: Nexus City Colosseum · Salt Mirror Ring (tiered stands, crowd silhouettes, Red Flame banners & braziers, zero interior cover!)
      const { map, bumpMap } = createPlazaTileTextures('#64748b', '#334155', '#f97316', anisotropy);
      texturesToDispose.push(map, bumpMap);
      const mirrorMat = new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        map,
        bumpMap,
        bumpScale: 0.03,
        roughness: 0.16,
        metalness: 0.34,
        emissive: 0x1e293b,
        emissiveIntensity: 0.18,
      });
      floorMaterial = mirrorMat;
      const saltDeck = new THREE.Mesh(
        new THREE.CylinderGeometry(arenaRadius + 1.6, arenaRadius + 2.8, 3.6, 56),
        mirrorMat
      );
      saltDeck.position.y = -1.8;
      saltDeck.receiveShadow = enableShadows;
      group.add(saltDeck);

      // Outer obsidian colosseum apron extending under the stands
      const stadiumFloor = new THREE.Mesh(
        new THREE.CircleGeometry(78, 48),
        new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          roughness: 0.68,
          metalness: 0.25,
        })
      );
      stadiumFloor.rotation.x = -Math.PI / 2;
      stadiumFloor.position.y = -0.22;
      group.add(stadiumFloor);

      // Central Red-Flame Colosseum tournament crest ring
      const centerCrest = new THREE.Mesh(
        new THREE.RingGeometry(4.1, 4.7, 48),
        new THREE.MeshStandardMaterial({
          color: 0xf97316,
          emissive: 0xea580c,
          emissiveIntensity: 1.05,
          roughness: 0.24,
        })
      );
      centerCrest.rotation.x = -Math.PI / 2;
      centerCrest.position.y = 0.024;
      group.add(centerCrest);

      const innerMirrorDisc = new THREE.Mesh(
        new THREE.CircleGeometry(4.08, 40),
        new THREE.MeshStandardMaterial({
          color: 0x94a3b8,
          roughness: 0.08,
          metalness: 0.55,
          emissive: 0x334155,
          emissiveIntensity: 0.22,
        })
      );
      innerMirrorDisc.rotation.x = -Math.PI / 2;
      innerMirrorDisc.position.y = 0.018;
      group.add(innerMirrorDisc);

      // Glowing Red-Flame arena containment boundary ring + low segmented curb wall
      const rimRing = new THREE.Mesh(
        new THREE.RingGeometry(arenaRadius - 0.35, arenaRadius + 0.18, 64),
        new THREE.MeshStandardMaterial({
          color: 0xf97316,
          emissive: 0xdc2626,
          emissiveIntensity: 1.35,
          roughness: 0.2,
          side: THREE.DoubleSide,
        })
      );
      rimRing.rotation.x = -Math.PI / 2;
      rimRing.position.y = 0.028;
      group.add(rimRing);

      const curbMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.55,
        metalness: 0.45,
      });
      const goldTrimMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xb45309,
        emissiveIntensity: 0.6,
        roughness: 0.28,
        metalness: 0.65,
      });
      const curbWall = new THREE.Mesh(
        new THREE.TorusGeometry(arenaRadius + 0.55, 0.36, 8, 64),
        curbMat
      );
      curbWall.rotation.x = Math.PI / 2;
      curbWall.position.y = 0.32;
      group.add(curbWall);

      // Tiered Circular Colosseum Stadium Stands (5 ascending tiers surrounding the ring)
      const standMat = new THREE.MeshStandardMaterial({
        color: 0x181825,
        roughness: 0.78,
        metalness: 0.18,
      });
      const standAccentMat = new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        emissive: 0x991b1b,
        emissiveIntensity: 0.55,
        roughness: 0.35,
      });
      for (let tier = 0; tier < 5; tier++) {
        const rIn = arenaRadius + 2.8 + tier * 2.15;
        const h = 1.65 + tier * 1.45;
        const ringWall = new THREE.Mesh(
          new THREE.CylinderGeometry(rIn + 2.0, rIn, h, 48, 1, true),
          standMat
        );
        ringWall.position.y = h * 0.5;
        ringWall.material.side = THREE.DoubleSide;
        group.add(ringWall);

        const seatTop = new THREE.Mesh(
          new THREE.RingGeometry(rIn, rIn + 2.1, 48),
          standMat
        );
        seatTop.rotation.x = -Math.PI / 2;
        seatTop.position.y = h;
        group.add(seatTop);

        if (tier === 0 || tier === 2 || tier === 4) {
          const trimRing = new THREE.Mesh(
            new THREE.TorusGeometry(rIn + 0.08, 0.09, 6, 64),
            tier === 4 ? goldTrimMat : standAccentMat
          );
          trimRing.rotation.x = Math.PI / 2;
          trimRing.position.y = h + 0.06;
          group.add(trimRing);
        }
      }

      // Instanced Stylized Crowd Silhouettes + Glowing Red Flame Cheer Torches across the Colosseum tiers
      const crowdCount = 210;
      const crowdGeo = new THREE.CapsuleGeometry(0.28, 0.72, 4, 6);
      const crowdMat = new THREE.MeshStandardMaterial({
        color: 0x0b0f1a,
        roughness: 0.85,
        metalness: 0.1,
      });
      const crowdMesh = new THREE.InstancedMesh(crowdGeo, crowdMat, crowdCount);
      const torchGeo = new THREE.OctahedronGeometry(0.14, 0);
      const torchMat = new THREE.MeshBasicMaterial({ color: 0xfb923c });
      const torchMesh = new THREE.InstancedMesh(torchGeo, torchMat, 48);

      const dummy = new THREE.Object3D();
      const shadeCol = new THREE.Color();
      let torchIdx = 0;
      for (let i = 0; i < crowdCount; i++) {
        const tier = i % 5;
        const angle = ((i * 2.39996) % (Math.PI * 2)); // golden-angle spread around bowl
        const r = arenaRadius + 3.6 + tier * 2.15 + ((i % 3) - 1) * 0.25;
        const y = 1.65 + tier * 1.45 + 0.62;
        dummy.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
        dummy.rotation.set(0, -angle + Math.PI / 2, 0);
        const s = 0.88 + (i % 5) * 0.06;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        crowdMesh.setMatrixAt(i, dummy.matrix);
        shadeCol.setHSL(0.64, 0.18, 0.09 + (i % 4) * 0.025);
        crowdMesh.setColorAt(i, shadeCol);

        if (torchIdx < 48 && i % 4 === 0) {
          dummy.position.set(Math.cos(angle) * (r - 0.35), y + 0.52, Math.sin(angle) * (r - 0.35));
          dummy.scale.setScalar(1.0);
          dummy.updateMatrix();
          torchMesh.setMatrixAt(torchIdx++, dummy.matrix);
        }
      }
      crowdMesh.instanceMatrix.needsUpdate = true;
      if (crowdMesh.instanceColor) crowdMesh.instanceColor.needsUpdate = true;
      torchMesh.instanceMatrix.needsUpdate = true;
      group.add(crowdMesh, torchMesh);

      // 8 Monumental Colosseum Banner Pillars with Crimson/Gold Red Flame Banners & Glowing Braziers (outside playable ring so interior remains zero-cover!)
      const pillarMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.48,
        metalness: 0.42,
      });
      const bannerClothMat = new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        emissive: 0x7f1d1d,
        emissiveIntensity: 0.48,
        roughness: 0.5,
        side: THREE.DoubleSide,
      });
      const flameMat = new THREE.MeshBasicMaterial({
        color: 0xfb923c,
      });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const px = Math.cos(a) * (arenaRadius + 2.1);
        const pz = Math.sin(a) * (arenaRadius + 2.1);
        const pGroup = new THREE.Group();
        pGroup.position.set(px, 0, pz);
        pGroup.rotation.y = -a + Math.PI / 2;

        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.92, 9.2, 8), pillarMat);
        col.position.y = 4.6;
        const cap = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 1.9), goldTrimMat);
        cap.position.y = 9.35;
        const brazierBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.55, 0.65, 8), curbMat);
        brazierBowl.position.y = 9.9;
        const flameCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.68, 0), flameMat);
        flameCore.position.y = 10.65;
        animatedMeshes.push({ mesh: flameCore, speed: 2.8 + (i % 3) * 0.6, axis: 'y', baseY: 10.65 });

        const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 4.4), bannerClothMat);
        banner.position.set(0, 5.4, 0.96);
        const bannerStripe = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 4.2), goldTrimMat);
        bannerStripe.position.set(0, 5.4, 0.99);

        pGroup.add(col, cap, brazierBowl, flameCore, banner, bannerStripe);
        if (enableShadows) {
          col.castShadow = true;
          col.receiveShadow = true;
        }
        group.add(pGroup);
      }
    } else if (arenaBiome === 'karst_cenotes') {
      // BIOME 2: Karst Towers & Cenotes — Steep jagged limestone pillars & glowing underwater sinkhole ring
      const { map, bumpMap } = createPlazaTileTextures('#9ca3af', '#57534e', '#14b8a6', anisotropy);
      texturesToDispose.push(map, bumpMap);
      const stoneMat = new THREE.MeshStandardMaterial({
        color: 0xd6d3d1,
        map,
        bumpMap,
        bumpScale: 0.07,
        roughness: 0.78,
        metalness: 0.08,
      });
      floorMaterial = stoneMat;
      const karstDeck = new THREE.Mesh(
        new THREE.CylinderGeometry(arenaRadius + 1.4, arenaRadius + 3.0, 4.0, 32),
        stoneMat
      );
      karstDeck.position.y = -2.0;
      karstDeck.receiveShadow = enableShadows;
      group.add(karstDeck);

      // Deep flooded emerald-teal cenote water surrounding the limestone shelf
      const cenoteWater = new THREE.Mesh(
        new THREE.CircleGeometry(120, 40),
        new THREE.MeshStandardMaterial({
          color: 0x0d9488,
          emissive: 0x0f766e,
          emissiveIntensity: 0.52,
          roughness: 0.12,
          metalness: 0.48,
        })
      );
      cenoteWater.rotation.x = -Math.PI / 2;
      cenoteWater.position.y = -0.65;
      group.add(cenoteWater);

      // Glowing submerged sinkhole rings on arena floor
      const cenoteRing = new THREE.Mesh(
        new THREE.RingGeometry(4.4, 5.2, 36),
        new THREE.MeshStandardMaterial({
          color: 0x2dd4bf,
          emissive: 0x14b8a6,
          emissiveIntensity: 0.9,
          roughness: 0.2,
        })
      );
      cenoteRing.rotation.x = -Math.PI / 2;
      cenoteRing.position.y = 0.026;
      group.add(cenoteRing);

      // Jagged limestone karst pillars around the perimeter (wall bounce capable!) + distant mist towers
      const limestoneMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.85, metalness: 0.05 });
      const mossCapMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8, metalness: 0.02 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.22;
        const px = Math.cos(a) * (arenaRadius - 0.7);
        const pz = Math.sin(a) * (arenaRadius - 0.7);
        const h = 5.4 + (i % 3) * 2.2;
        const tower = new THREE.Group();
        tower.position.set(px, 0, pz);
        const rock = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 1.15, h, 7), limestoneMat);
        rock.position.y = h * 0.5;
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.4, 7), mossCapMat);
        cap.position.y = h + 0.55;
        tower.add(rock, cap);
        if (enableShadows) {
          rock.castShadow = true;
          rock.receiveShadow = true;
        }
        group.add(tower);
        pillars.push({ x: px, z: pz, radius: 1.1 });
      }
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const dist = 34 + (i % 3) * 14;
        const h = 16 + (i % 4) * 7;
        const peak = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 5.2, h, 7), limestoneMat);
        peak.position.set(Math.cos(a) * dist, h * 0.45 - 1, Math.sin(a) * dist);
        const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(3.1, 0), mossCapMat);
        foliage.position.set(Math.cos(a) * dist, h * 0.9 - 0.6, Math.sin(a) * dist);
        group.add(peak, foliage);
      }
    } else if (arenaBiome === 'wildfire_ashlands') {
      // BIOME 3: Post-Wildfire Ashlands — Charred black trunks, neon wildflowers & smoldering ember fissures
      const { map, bumpMap } = createPlazaTileTextures('#27272a', '#18181b', '#f97316', anisotropy);
      texturesToDispose.push(map, bumpMap);
      const ashMat = new THREE.MeshStandardMaterial({
        color: 0x3f3f46,
        map,
        bumpMap,
        bumpScale: 0.08,
        roughness: 0.88,
        metalness: 0.06,
      });
      floorMaterial = ashMat;
      const ashDeck = new THREE.Mesh(
        new THREE.CylinderGeometry(arenaRadius + 1.8, arenaRadius + 3.6, 4.0, 36),
        ashMat
      );
      ashDeck.position.y = -2.0;
      ashDeck.receiveShadow = enableShadows;
      group.add(ashDeck);

      const wasteland = new THREE.Mesh(
        new THREE.CircleGeometry(130, 36),
        new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.92 })
      );
      wasteland.rotation.x = -Math.PI / 2;
      wasteland.position.y = -0.35;
      group.add(wasteland);

      // Smoldering glowing ember veins beneath the ash crust
      const emberMat = new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xea580c,
        emissiveIntensity: 1.55,
        roughness: 0.25,
      });
      const emberRing = new THREE.Mesh(new THREE.RingGeometry(4.0, 4.45, 36), emberMat);
      emberRing.rotation.x = -Math.PI / 2;
      emberRing.position.y = 0.025;
      group.add(emberRing);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 12.5), emberMat);
        crack.rotation.x = -Math.PI / 2;
        crack.rotation.z = a;
        crack.position.set(Math.cos(a) * 10.5, 0.022, Math.sin(a) * 10.5);
        group.add(crack);
      }

      // Charred black tree trunks + bright neon magenta/cyan/gold wildflowers sprouting around roots
      const charMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.92, metalness: 0.08 });
      const flowerColors = [0xf43f5e, 0xe879f9, 0x22d3ee, 0xfacc15];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.15;
        const px = Math.cos(a) * (arenaRadius - 0.8);
        const pz = Math.sin(a) * (arenaRadius - 0.8);
        const trunkGroup = new THREE.Group();
        trunkGroup.position.set(px, 0, pz);
        const h = 4.6 + (i % 3) * 1.9;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.62, h, 7), charMat);
        trunk.position.y = h * 0.5;
        trunk.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.09;
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.24, 2.2, 6), charMat);
        branch.position.set(0.65, h * 0.72, 0);
        branch.rotation.z = -0.82;
        trunkGroup.add(trunk, branch);

        // Bright fast-growing neon wildflowers at the charred trunk base
        const fColor = flowerColors[i % flowerColors.length];
        const bloomMat = new THREE.MeshStandardMaterial({
          color: fColor,
          emissive: fColor,
          emissiveIntensity: 1.35,
          roughness: 0.25,
        });
        for (let f = 0; f < 4; f++) {
          const fa = (f / 4) * Math.PI * 2;
          const bloom = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), bloomMat);
          bloom.position.set(Math.cos(fa) * 0.95, 0.34, Math.sin(fa) * 0.95);
          trunkGroup.add(bloom);
        }
        if (enableShadows) trunk.castShadow = true;
        group.add(trunkGroup);
        pillars.push({ x: px, z: pz, radius: 0.88 });
      }
    } else if (arenaBiome === 'geothermal_springs') {
      // BIOME 4: Geothermal Rainbow Springs — Boiling geysers, sulfur vents & vibrant rainbow mineral terraces
      const { map, bumpMap } = createPlazaTileTextures('#f59e0b', '#92400e', '#06b6d4', anisotropy);
      texturesToDispose.push(map, bumpMap);
      const mineralMat = new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        map,
        bumpMap,
        bumpScale: 0.05,
        roughness: 0.38,
        metalness: 0.22,
      });
      floorMaterial = mineralMat;
      const springDeck = new THREE.Mesh(
        new THREE.CylinderGeometry(arenaRadius + 1.8, arenaRadius + 3.4, 4.0, 44),
        mineralMat
      );
      springDeck.position.y = -2.0;
      springDeck.receiveShadow = enableShadows;
      group.add(springDeck);

      // Concentric Grand-Prismatic Rainbow mineral rings
      const rainbowRings: [number, number, number, number][] = [
        [2.6, 4.4, 0x06b6d4, 0x0891b2],
        [4.45, 6.2, 0x10b981, 0x059669],
        [6.25, 8.1, 0xfacc15, 0xca8a04],
        [8.15, 10.2, 0xf97316, 0xc2410c],
      ];
      rainbowRings.forEach(([rIn, rOut, col, emi], idx) => {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(rIn, rOut, 40),
          new THREE.MeshStandardMaterial({
            color: col,
            emissive: emi,
            emissiveIntensity: 0.58,
            roughness: 0.2,
            metalness: 0.3,
          })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.02 + idx * 0.003;
        group.add(ring);
      });

      const sulfurBasin = new THREE.Mesh(
        new THREE.CircleGeometry(125, 40),
        new THREE.MeshStandardMaterial({
          color: 0x0e7490,
          emissive: 0x155e75,
          emissiveIntensity: 0.45,
          roughness: 0.16,
          metalness: 0.42,
        })
      );
      sulfurBasin.rotation.x = -Math.PI / 2;
      sulfurBasin.position.y = -0.45;
      group.add(sulfurBasin);

      // Boiling sulfur geyser chimneys & glowing steam plumes around perimeter
      const ventRockMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.78 });
      const sulfurCrustMat = new THREE.MeshStandardMaterial({
        color: 0xfde047,
        emissive: 0xca8a04,
        emissiveIntensity: 0.72,
        roughness: 0.35,
      });
      const steamMat = new THREE.MeshBasicMaterial({
        color: 0xecfeff,
        transparent: true,
        opacity: 0.36,
        depthWrite: false,
      });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.3;
        const px = Math.cos(a) * (arenaRadius - 0.8);
        const pz = Math.sin(a) * (arenaRadius - 0.8);
        const vent = new THREE.Group();
        vent.position.set(px, 0, pz);
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.3, 2.2, 8), ventRockMat);
        cone.position.y = 1.1;
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.14, 7, 14), sulfurCrustMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 2.2;
        const plume = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.45, 5.2, 10, 1, true), steamMat);
        plume.position.y = 4.8;
        vent.add(cone, rim, plume);
        animatedMeshes.push({ mesh: plume, speed: 1.5 + (i % 3) * 0.4, axis: 'y', baseY: 4.8 });
        if (enableShadows) cone.castShadow = true;
        group.add(vent);
        pillars.push({ x: px, z: pz, radius: 1.1 });
      }
    } else {
      // BIOME 5: Kelp Forests & Brine Pools — Towering underwater kelp canopy + toxic neon-lime brine pools
      const { map, bumpMap } = createPlazaTileTextures('#134e4a', '#042f2e', '#84cc16', anisotropy);
      texturesToDispose.push(map, bumpMap);
      const seabedMat = new THREE.MeshStandardMaterial({
        color: 0x115e59,
        map,
        bumpMap,
        bumpScale: 0.07,
        roughness: 0.72,
        metalness: 0.14,
      });
      floorMaterial = seabedMat;
      const seabedDeck = new THREE.Mesh(
        new THREE.CylinderGeometry(arenaRadius + 2.0, arenaRadius + 3.8, 4.0, 40),
        seabedMat
      );
      seabedDeck.position.y = -2.0;
      seabedDeck.receiveShadow = enableShadows;
      group.add(seabedDeck);

      // Dense glowing toxic "underwater lakes" (brine pools) across the seabed floor
      const brineMat = new THREE.MeshStandardMaterial({
        color: 0xa3e635,
        emissive: 0x65a30d,
        emissiveIntensity: 1.05,
        roughness: 0.1,
        metalness: 0.55,
      });
      const brineSpots: [number, number, number][] = [
        [-8.5, -6.5, 3.1],
        [9.0, -5.5, 2.8],
        [-7.5, 8.2, 2.9],
        [8.4, 7.6, 3.2],
      ];
      brineSpots.forEach(([bx, bz, r]) => {
        const pool = new THREE.Mesh(new THREE.CircleGeometry(r, 24), brineMat);
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(bx, 0.025, bz);
        group.add(pool);
      });

      const oceanFloor = new THREE.Mesh(
        new THREE.CircleGeometry(130, 36),
        new THREE.MeshStandardMaterial({ color: 0x042f2e, roughness: 0.85 })
      );
      oceanFloor.rotation.x = -Math.PI / 2;
      oceanFloor.position.y = -0.45;
      group.add(oceanFloor);

      // Towering underwater kelp stalks & glowing bioluminescent spores forming a canopy maze
      const kelpStemMat = new THREE.MeshStandardMaterial({
        color: 0x059669,
        emissive: 0x064e3b,
        emissiveIntensity: 0.45,
        roughness: 0.52,
      });
      const kelpFrondMat = new THREE.MeshStandardMaterial({
        color: 0x34d399,
        emissive: 0x10b981,
        emissiveIntensity: 0.65,
        roughness: 0.35,
      });
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const px = Math.cos(a) * (arenaRadius - 0.65);
        const pz = Math.sin(a) * (arenaRadius - 0.65);
        const kelpTower = new THREE.Group();
        kelpTower.position.set(px, 0, pz);
        const h = 11.5 + (i % 3) * 3.5;
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.42, h, 7), kelpStemMat);
        stalk.position.y = h * 0.5;
        kelpTower.add(stalk);
        for (let leaf = 0; leaf < 5; leaf++) {
          const frond = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.16, 0.55), kelpFrondMat);
          frond.position.set(
            Math.cos(leaf * 1.4) * 0.65,
            2.2 + leaf * 1.95,
            Math.sin(leaf * 1.4) * 0.65
          );
          frond.rotation.y = leaf * 1.4;
          frond.rotation.z = 0.25;
          kelpTower.add(frond);
        }
        animatedMeshes.push({ mesh: kelpTower, speed: 0.35 + (i % 3) * 0.12, axis: 'y', baseY: 0 });
        group.add(kelpTower);
        pillars.push({ x: px, z: pz, radius: 0.78 });
      }
    }

    // Glowing containment ring for non-salt_flats biomes so players feel grounded in the arena
    if (arenaBiome !== 'salt_flats') {
      const biomeRingColors: Record<ArenaBiomeId, number> = {
        salt_flats: 0xf97316,
        karst_cenotes: 0x2dd4bf,
        wildfire_ashlands: 0xf97316,
        geothermal_springs: 0xfacc15,
        kelp_brine: 0x84cc16,
      };
      const boundaryRing = new THREE.Mesh(
        new THREE.RingGeometry(arenaRadius - 0.3, arenaRadius + 0.16, 60),
        new THREE.MeshStandardMaterial({
          color: biomeRingColors[arenaBiome],
          emissive: biomeRingColors[arenaBiome],
          emissiveIntensity: 0.95,
          roughness: 0.25,
          side: THREE.DoubleSide,
        })
      );
      boundaryRing.rotation.x = -Math.PI / 2;
      boundaryRing.position.y = 0.026;
      group.add(boundaryRing);
    }

    // Smashable crates only on biomes with cover (Salt Flats & Mirrors has zero cover!)
    if (arenaBiome !== 'salt_flats') {
      const crateSpots: [number, number][] = [
        [-6.5, -5.5],
        [6.5, -5.5],
        [-7.5, 4.5],
        [7.5, 4.5],
      ];
      crateSpots.forEach(([cx, cz], idx) => {
        const mesh = createCrateProp(cx, cz, enableShadows);
        group.add(mesh);
        crates.push({ id: `arena-crate-${idx}`, mesh, x: cx, z: cz, radius: 0.92, broken: false });
      });
    }
  } else if (zone === 'campaign' || zone === 'royale') {
    arenaRadius = zone === 'royale' ? 23 : 17.5;
    const isCampaign = zone === 'campaign';
    const isRoyale = zone === 'royale';

    // Gradient sky dome: Hollow/Umbra crimson twilight for Campaign, Phantom Neon Rooftop night for Royale
    group.add(
      createGradientSkyDome(
        isCampaign ? '#090612' : '#050b18',
        isCampaign ? '#2a0a18' : '#0f172a',
        isCampaign ? '#7c2d12' : '#164e63',
        texturesToDispose
      )
    );

    const { map, bumpMap } = createPlazaTileTextures(
      isCampaign ? '#475569' : '#334155',
      isRoyale ? '#0f172a' : '#1e293b',
      isCampaign ? '#ef4444' : '#06b6d4',
      anisotropy
    );
    texturesToDispose.push(map, bumpMap);

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(arenaRadius + 1.8, arenaRadius + 3.4, 4.2, 48),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map,
        bumpMap,
        bumpScale: 0.05,
        roughness: 0.52,
        metalness: 0.2,
      })
    );
    floor.position.y = -2.1;
    floor.receiveShadow = enableShadows;
    group.add(floor);

    // Glowing arena perimeter containment ring
    const outerRim = new THREE.Mesh(
      new THREE.RingGeometry(arenaRadius - 0.32, arenaRadius + 0.18, 60),
      new THREE.MeshStandardMaterial({
        color: isCampaign ? 0xef4444 : 0x06b6d4,
        emissive: isCampaign ? 0xdc2626 : 0x0891b2,
        emissiveIntensity: 1.15,
        roughness: 0.22,
        side: THREE.DoubleSide,
      })
    );
    outerRim.rotation.x = -Math.PI / 2;
    outerRim.position.y = 0.026;
    group.add(outerRim);

    // Arena center duel medallion
    const medallion = new THREE.Mesh(
      new THREE.RingGeometry(4.2, 4.7, 36),
      new THREE.MeshStandardMaterial({
        color: isCampaign ? 0xef4444 : 0x06b6d4,
        emissive: isCampaign ? 0xb91c1c : 0x0891b2,
        emissiveIntensity: 0.85,
        roughness: 0.28,
      })
    );
    medallion.rotation.x = -Math.PI / 2;
    medallion.position.y = 0.025;
    group.add(medallion);

    // Perimeter Arena Pillars (usable for WALL BOUNCE bonus damage!) + banners + glowing braziers
    const pillarCount = 8;
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.56, metalness: 0.35 });
    const bannerMat = new THREE.MeshStandardMaterial({
      color: isCampaign ? 0xef4444 : 0x06b6d4,
      roughness: 0.42,
      emissive: isCampaign ? 0x991b1b : 0x164e63,
      emissiveIntensity: 0.55,
    });
    const torchCoreMat = new THREE.MeshBasicMaterial({
      color: isCampaign ? 0xf97316 : 0x22d3ee,
    });
    for (let i = 0; i < pillarCount; i++) {
      const a = (i / pillarCount) * Math.PI * 2 + Math.PI / 8;
      const px = Math.cos(a) * (arenaRadius - 0.6);
      const pz = Math.sin(a) * (arenaRadius - 0.6);
      const pGroup = new THREE.Group();
      pGroup.position.set(px, 0, pz);
      pGroup.rotation.y = -a + Math.PI / 2;

      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.88, 6.2, 8), pillarMat);
      col.position.y = 3.1;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.48, 1.9), bannerMat);
      cap.position.y = 6.3;
      const flameOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), torchCoreMat);
      flameOrb.position.y = 7.15;
      animatedMeshes.push({ mesh: flameOrb, speed: 2.2 + (i % 3) * 0.4, axis: 'y', baseY: 7.15 });
      const banner = new THREE.Mesh(new THREE.BoxGeometry(0.95, 3.2, 0.08), bannerMat);
      banner.position.set(0, 4.1, 0.85);
      pGroup.add(col, cap, flameOrb, banner);
      if (enableShadows) {
        col.castShadow = true;
        col.receiveShadow = true;
      }
      group.add(pGroup);
      pillars.push({ x: px, z: pz, radius: 1.05 });
    }

    // Smashable Physics Crates positioned for tactical knockback combos
    const crateSpots: [number, number][] = [
      [-6.5, -5.5],
      [6.5, -5.5],
      [-7.5, 4.5],
      [7.5, 4.5],
      [0, -10.5],
    ];
    crateSpots.forEach(([cx, cz], idx) => {
      const mesh = createCrateProp(cx, cz, enableShadows);
      group.add(mesh);
      crates.push({ id: `arena-crate-${idx}`, mesh, x: cx, z: cz, radius: 0.92, broken: false });
    });

    // Shrinking Battle Royale energy ring
    if (isRoyale) {
      const ringGeo = new THREE.CylinderGeometry(1, 1, 5.5, 40, 1, true);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      royaleRingMesh = new THREE.Mesh(ringGeo, ringMat);
      royaleRingMesh.position.y = 2.75;
      royaleRingMesh.scale.set(arenaRadius, 1, arenaRadius);
      group.add(royaleRingMesh);
    }
  } else if (zone === 'dojo' || zone === 'clan_siege') {
    const isClanSiege = zone === 'clan_siege';
    arenaRadius = DOJO_PLOT_HALF_SIZE;
    const { map, bumpMap } = createPlazaTileTextures(
      isClanSiege ? '#c8a97e' : '#d6b98c',
      '#8b6d43',
      isClanSiege ? '#f43f5e' : '#10b981',
      anisotropy
    );
    texturesToDispose.push(map, bumpMap);

    // Sunlit timber & tatami Dojo sandbox deck
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map,
      bumpMap,
      bumpScale: 0.04,
      roughness: 0.72,
      metalness: 0.04,
    });
    floorMaterial = deckMat;
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(DOJO_PLOT_HALF_SIZE * 2 + 2, 4, DOJO_PLOT_HALF_SIZE * 2 + 2),
      deckMat
    );
    deck.position.y = -2;
    deck.receiveShadow = enableShadows;
    group.add(deck);

    // Subtle build grid lines slightly offset above deck (+0.025)
    const grid = new THREE.GridHelper(
      DOJO_PLOT_HALF_SIZE * 2 - 2,
      DOJO_PLOT_HALF_SIZE - 1,
      isClanSiege ? 0xe11d48 : 0x0f766e,
      0x785a3a
    );
    grid.position.y = 0.025;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = isClanSiege ? 0.25 : 0.35;
    group.add(grid);

    if (isClanSiege) {
      // Clan Siege central exhibition clash medallion
      const siegeMedallion = new THREE.Mesh(
        new THREE.RingGeometry(3.4, 3.85, 36),
        new THREE.MeshStandardMaterial({
          color: 0xf43f5e,
          emissive: 0xbe123c,
          emissiveIntensity: 0.85,
          roughness: 0.28,
        })
      );
      siegeMedallion.rotation.x = -Math.PI / 2;
      siegeMedallion.position.y = 0.032;
      group.add(siegeMedallion);
    }

    // Traditional Torii entrance arch at south border leading back to Nexus City
    const torii = createPortalArch(
      'Nexus City',
      isClanSiege ? 0xf43f5e : 0x10b981,
      0,
      DOJO_PLOT_HALF_SIZE - 1.2,
      Math.PI,
      enableShadows
    );
    group.add(torii.group);
    texturesToDispose.push(torii.signTex);
    animatedMeshes.push({ mesh: torii.core, speed: 1.4, axis: 'y', baseY: 6.45 });
    if (!isClanSiege) {
      portals.push({
        zone: 'hub',
        label: 'Nexus City',
        subtitle: 'Return to Social Hub',
        x: 0,
        z: DOJO_PLOT_HALF_SIZE - 1.2,
        radius: 3.4,
      });
    }

    // Instantiate all Dojo blocks — in Clan Siege, crates smash for bonus dmg & pillars trigger Wall Bounce!
    dojoBlocks.forEach((b) => {
      // In Clan Siege, render dummies as solid wooden obstacle posts (no training-dummy AI clash with squad battle)
      const renderBlock =
        isClanSiege && b.type === 'dummy'
          ? { ...b, dummyVariant: 'static' as const }
          : b;
      const m = createDojoBlockMesh(renderBlock, enableShadows);
      group.add(m);
      dojoMeshes.set(b.id, m);
      if (b.type === 'crate') {
        crates.push({ id: b.id, mesh: m, x: b.x, z: b.z, radius: 0.9, broken: false });
      } else if (isClanSiege && (b.type === 'lantern' || b.type === 'trophy' || b.type === 'dummy')) {
        pillars.push({ x: b.x, z: b.z, radius: b.type === 'trophy' ? 0.85 : 0.72 });
      }
    });
  }

  return {
    group,
    arenaRadius,
    portals,
    crates,
    pillars,
    royaleRingMesh,
    animatedMeshes,
    dojoMeshes,
    floorMaterial,
    updateClanBanner,
    dispose: () => {
      group.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material.dispose();
          }
        }
      });
      texturesToDispose.forEach((t) => t.dispose());
    },
  };
}
