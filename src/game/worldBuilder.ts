import * as THREE from 'three';
import { DOJO_PLOT_HALF_SIZE } from './dojoRules';
import type { DojoBlock, WorldZone } from './types';

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

export function buildZoneWorld(
  zone: WorldZone,
  dojoBlocks: DojoBlock[],
  anisotropy: number,
  enableShadows: boolean
): BuiltWorld {
  const group = new THREE.Group();
  const portals: PortalZoneData[] = [];
  const crates: SmashableCrate[] = [];
  const pillars: ArenaPillar[] = [];
  const animatedMeshes: BuiltWorld['animatedMeshes'] = [];
  const dojoMeshes = new Map<string, THREE.Group>();
  let royaleRingMesh: THREE.Mesh | null = null;

  const texturesToDispose: THREE.Texture[] = [];

  addDistantCitySkylineAndNature(group);

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
    ];

    portalDefs.forEach((p) => {
      const arch = createPortalArch(p.label, p.color, p.x, p.z, p.rotY, enableShadows);
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
  } else if (zone === 'arena' || zone === 'campaign' || zone === 'royale') {
    arenaRadius = zone === 'royale' ? 23 : 17.5;
    const isCampaign = zone === 'campaign';
    const isRoyale = zone === 'royale';
    const { map, bumpMap } = createPlazaTileTextures(
      isCampaign ? '#94a3b8' : isRoyale ? '#334155' : '#8596ab',
      isRoyale ? '#0f172a' : '#475569',
      isCampaign ? '#ef4444' : isRoyale ? '#06b6d4' : '#f59e0b',
      anisotropy
    );
    texturesToDispose.push(map, bumpMap);

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(arenaRadius + 1.8, arenaRadius + 3.4, 4.2, 40),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map,
        bumpMap,
        bumpScale: 0.05,
        roughness: 0.65,
        metalness: 0.12,
      })
    );
    floor.position.y = -2.1;
    floor.receiveShadow = enableShadows;
    group.add(floor);

    // Arena center duel medallion
    const medallion = new THREE.Mesh(
      new THREE.RingGeometry(4.2, 4.7, 36),
      new THREE.MeshStandardMaterial({
        color: isCampaign ? 0xef4444 : isRoyale ? 0x06b6d4 : 0xf59e0b,
        emissive: isCampaign ? 0xb91c1c : isRoyale ? 0x0891b2 : 0xd97706,
        emissiveIntensity: 0.75,
        roughness: 0.28,
      })
    );
    medallion.rotation.x = -Math.PI / 2;
    medallion.position.y = 0.025;
    group.add(medallion);

    // Perimeter Arena Pillars (usable for WALL BOUNCE bonus damage!) + banners
    const pillarCount = 8;
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.62, metalness: 0.3 });
    const bannerMat = new THREE.MeshStandardMaterial({
      color: isCampaign ? 0xef4444 : isRoyale ? 0x06b6d4 : 0xf59e0b,
      roughness: 0.45,
      emissive: isCampaign ? 0x7f1d1d : isRoyale ? 0x164e63 : 0x78350f,
      emissiveIntensity: 0.4,
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
      const banner = new THREE.Mesh(new THREE.BoxGeometry(0.95, 3.2, 0.08), bannerMat);
      banner.position.set(0, 4.1, 0.85);
      pGroup.add(col, cap, banner);
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
  } else if (zone === 'dojo') {
    arenaRadius = DOJO_PLOT_HALF_SIZE;
    const { map, bumpMap } = createPlazaTileTextures('#d6b98c', '#9a7b4f', '#10b981', anisotropy);
    texturesToDispose.push(map, bumpMap);

    // Sunlit timber & tatami Dojo sandbox deck
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(DOJO_PLOT_HALF_SIZE * 2 + 2, 4, DOJO_PLOT_HALF_SIZE * 2 + 2),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map,
        bumpMap,
        bumpScale: 0.04,
        roughness: 0.72,
        metalness: 0.04,
      })
    );
    deck.position.y = -2;
    deck.receiveShadow = enableShadows;
    group.add(deck);

    // Subtle build grid lines slightly offset above deck (+0.025)
    const grid = new THREE.GridHelper(DOJO_PLOT_HALF_SIZE * 2 - 2, DOJO_PLOT_HALF_SIZE - 1, 0x0f766e, 0x785a3a);
    grid.position.y = 0.025;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    group.add(grid);

    // Traditional Torii entrance arch at south border leading back to Nexus City
    const torii = createPortalArch('Nexus City', 0x10b981, 0, DOJO_PLOT_HALF_SIZE - 1.2, Math.PI, enableShadows);
    group.add(torii.group);
    texturesToDispose.push(torii.signTex);
    animatedMeshes.push({ mesh: torii.core, speed: 1.4, axis: 'y', baseY: 6.45 });
    portals.push({
      zone: 'hub',
      label: 'Nexus City',
      subtitle: 'Return to Social Hub',
      x: 0,
      z: DOJO_PLOT_HALF_SIZE - 1.2,
      radius: 3.4,
    });

    // Instantiate all player-placed Dojo blocks
    dojoBlocks.forEach((b) => {
      const m = createDojoBlockMesh(b, enableShadows);
      group.add(m);
      dojoMeshes.set(b.id, m);
      if (b.type === 'crate') {
        crates.push({ id: b.id, mesh: m, x: b.x, z: b.z, radius: 0.9, broken: false });
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
