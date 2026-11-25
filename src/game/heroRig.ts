import * as THREE from 'three';
import { AURA_HEX, BODY_FRAMES } from './combatRules';
import type { ComboMoveSpec } from './combatRules';
import { drawRankEmblemOnCanvas, getRankEmblemSpec } from './rankEmblems';
import type { EmoteId, HeroCustomization } from './types';

export interface HeroAnimState {
  time: number;
  walkPhase: number;
  speedNorm: number;
  grounded: boolean;
  vy: number;
  attackMove: ComboMoveSpec | null;
  attackProgress: number; // 0..1
  isBlocking: boolean;
  isDodging: boolean;
  isStaggered: boolean;
  isKnockedDown: boolean;
  isKo: boolean;
  koProgress: number;
  telegraphGlow: number; // 0..1
  hitFlash: number; // 0..1
  emote: EmoteId | null;
  emoteTimer: number;
  isUltimate: boolean;
  squashX: number;
  squashY: number;
  petActionPulse?: number; // 0..1
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(6, 10, 20, 0.65)');
  grad.addColorStop(0.55, 'rgba(6, 10, 20, 0.28)');
  grad.addColorStop(1, 'rgba(6, 10, 20, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let sharedShadowTex: THREE.CanvasTexture | null = null;
function getContactShadowTexture(): THREE.CanvasTexture {
  if (!sharedShadowTex) {
    sharedShadowTex = createContactShadowTexture();
  }
  return sharedShadowTex;
}

/**
 * Fully-rendered, visible 3rd-person humanoid hero rig (never a shadow silhouette).
 * Built as a 16+ part hierarchical THREE.Group with varied PBR roughness/metalness,
 * articulated joints, facial features, hairstyles, streetwear outfit, weapons, auras, and pet companion.
 */
export class HeroRig {
  public readonly root: THREE.Group;
  private readonly bodyPivot: THREE.Group;
  private readonly hips: THREE.Group;
  private readonly torso: THREE.Group;
  private readonly headGroup: THREE.Group;
  private readonly leftArm: THREE.Group;
  private readonly leftForearm: THREE.Group;
  private readonly rightArm: THREE.Group;
  private readonly rightForearm: THREE.Group;
  private readonly leftLeg: THREE.Group;
  private readonly leftShin: THREE.Group;
  private readonly rightLeg: THREE.Group;
  private readonly rightShin: THREE.Group;
  private readonly hairGroup: THREE.Group;
  private readonly headgearGroup: THREE.Group;
  private readonly backGroup: THREE.Group;
  private readonly weaponLeftGroup: THREE.Group;
  private readonly weaponRightGroup: THREE.Group;
  private readonly petGroup: THREE.Group;
  private readonly auraRingLeft: THREE.Mesh;
  private readonly auraRingRight: THREE.Mesh;
  private readonly blockShield: THREE.Mesh;
  private readonly telegraphHalo: THREE.Mesh;
  public readonly teamRing: THREE.Mesh;
  public readonly contactShadow: THREE.Mesh;
  private readonly spotlightGroup: THREE.Group;
  private readonly spotlightConeMat: THREE.MeshBasicMaterial;
  private readonly spotlightRing: THREE.Mesh;
  private readonly spotlightRingMat: THREE.MeshBasicMaterial;
  private rankBadgeSprite: THREE.Sprite | null = null;
  private rankBadgeTexture: THREE.CanvasTexture | null = null;

  private skinMat: THREE.MeshStandardMaterial;
  private hairMat: THREE.MeshStandardMaterial;
  private topMat: THREE.MeshStandardMaterial;
  private bottomMat: THREE.MeshStandardMaterial;
  private accentMat: THREE.MeshStandardMaterial;
  private metalMat: THREE.MeshStandardMaterial;
  private auraMat: THREE.MeshStandardMaterial;
  private bootMat: THREE.MeshStandardMaterial;
  private config: HeroCustomization;

  constructor(config: HeroCustomization, enableShadows = true) {
    this.config = { ...config };
    this.root = new THREE.Group();

    // Contact shadow anchored at bottom-center (y = 0.018)
    const shadowGeo = new THREE.CircleGeometry(0.68, 24);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: getContactShadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.72,
    });
    this.contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.contactShadow.position.y = 0.018;
    this.root.add(this.contactShadow);

    // Subtle ground Team Aura Ring (activated during 2v2 / 4v4 Clan Siege exhibition matches)
    const teamRingGeo = new THREE.RingGeometry(0.62, 0.78, 24);
    teamRingGeo.rotateX(-Math.PI / 2);
    const teamRingMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.teamRing = new THREE.Mesh(teamRingGeo, teamRingMat);
    this.teamRing.position.y = 0.028;
    this.teamRing.visible = false;
    this.root.add(this.teamRing);

    // Volumetric Emote Spotlight beam cone + ground halo (ignites on high-level combos & finishers)
    this.spotlightGroup = new THREE.Group();
    this.spotlightGroup.visible = false;
    const coneGeo = new THREE.CylinderGeometry(0.42, 1.55, 6.2, 24, 1, true);
    this.spotlightConeMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const coneMesh = new THREE.Mesh(coneGeo, this.spotlightConeMat);
    coneMesh.position.y = 3.1;

    const spotRingGeo = new THREE.RingGeometry(0.95, 1.38, 28);
    spotRingGeo.rotateX(-Math.PI / 2);
    this.spotlightRingMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.spotlightRing = new THREE.Mesh(spotRingGeo, this.spotlightRingMat);
    this.spotlightRing.position.y = 0.04;
    this.spotlightGroup.add(coneMesh, this.spotlightRing);
    this.root.add(this.spotlightGroup);

    // Distinct PBR materials with >= 0.25 roughness spread across skin, cloth, armor, and metal
    this.skinMat = new THREE.MeshStandardMaterial({
      color: config.skinColor,
      roughness: 0.62,
      metalness: 0.04,
    });
    this.hairMat = new THREE.MeshStandardMaterial({
      color: config.hairColor,
      roughness: 0.48,
      metalness: 0.08,
    });
    this.topMat = new THREE.MeshStandardMaterial({
      color: config.topColor,
      roughness: 0.78,
      metalness: 0.06,
    });
    this.bottomMat = new THREE.MeshStandardMaterial({
      color: config.bottomColor,
      roughness: 0.82,
      metalness: 0.05,
    });
    this.accentMat = new THREE.MeshStandardMaterial({
      color: config.accentColor,
      roughness: 0.32,
      metalness: 0.35,
    });
    this.metalMat = new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      roughness: 0.22,
      metalness: 0.85,
    });
    this.bootMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.42,
      metalness: 0.18,
    });
    this.auraMat = new THREE.MeshStandardMaterial({
      color: AURA_HEX[config.aura],
      emissive: AURA_HEX[config.aura],
      emissiveIntensity: 1.6,
      roughness: 0.18,
      metalness: 0.2,
      transparent: true,
      opacity: 0.85,
    });

    this.bodyPivot = new THREE.Group();
    this.root.add(this.bodyPivot);

    // Hips / Waist
    this.hips = new THREE.Group();
    this.hips.position.y = 0.94;
    this.bodyPivot.add(this.hips);

    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.19, 0.26), this.bottomMat);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.075, 0.29), this.accentMat);
    belt.position.y = 0.08;
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.085, 0.06), this.metalMat);
    buckle.position.set(0, 0.08, 0.145);
    this.hips.add(pelvis, belt, buckle);

    // Torso (layered athletic streetwear jacket + collar + shoulder armor trim)
    this.torso = new THREE.Group();
    this.torso.position.y = 0.1;
    this.hips.add(this.torso);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.54, 0.29), this.topMat);
    chest.position.y = 0.28;
    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.32), this.accentMat);
    chestPlate.position.set(0, 0.36, 0.01);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.12, 12), this.accentMat);
    collar.position.y = 0.57;
    const coreCrest = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), this.auraMat);
    coreCrest.position.set(0, 0.37, 0.18);
    this.torso.add(chest, chestPlate, collar, coreCrest);

    this.backGroup = new THREE.Group();
    this.backGroup.position.set(0, 0.44, -0.17);
    this.torso.add(this.backGroup);

    // Head with visible expressive eyes, brows, nose bridge, and jawline
    this.headGroup = new THREE.Group();
    this.headGroup.position.y = 0.64;
    this.torso.add(this.headGroup);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.095, 0.12, 10), this.skinMat);
    neck.position.y = 0.02;
    const headBase = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.29), this.skinMat);
    headBase.position.y = 0.2;
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.24), this.skinMat);
    jaw.position.set(0, 0.06, 0.02);

    // Eyes & eyebrows (clearly visible face — not a shadow!)
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 });
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15 });
    const leftEyeW = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.044, 0.02), eyeWhiteMat);
    leftEyeW.position.set(-0.072, 0.21, 0.145);
    const rightEyeW = leftEyeW.clone();
    rightEyeW.position.x = 0.072;
    const leftPupil = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.036, 0.024), pupilMat);
    leftPupil.position.set(-0.07, 0.21, 0.149);
    const rightPupil = leftPupil.clone();
    rightPupil.position.x = 0.07;

    const leftBrow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.022, 0.025), this.hairMat);
    leftBrow.position.set(-0.072, 0.255, 0.152);
    leftBrow.rotation.z = -0.14;
    const rightBrow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.022, 0.025), this.hairMat);
    rightBrow.position.set(0.072, 0.255, 0.152);
    rightBrow.rotation.z = 0.14;

    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.055, 0.04), this.skinMat);
    nose.position.set(0, 0.165, 0.155);

    this.headGroup.add(
      neck,
      headBase,
      jaw,
      leftEyeW,
      rightEyeW,
      leftPupil,
      rightPupil,
      leftBrow,
      rightBrow,
      nose
    );

    this.hairGroup = new THREE.Group();
    this.hairGroup.position.y = 0.24;
    this.headGroup.add(this.hairGroup);

    this.headgearGroup = new THREE.Group();
    this.headgearGroup.position.y = 0.24;
    this.headGroup.add(this.headgearGroup);

    // Arms (articulated shoulder + elbow + combat gauntlet + weapon mount + aura ring)
    const buildArm = (side: -1 | 1) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.34, 0.48, 0);
      this.torso.add(shoulder);

      const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.17, 0.21), this.accentMat);
      pauldron.position.set(side * 0.02, 0.01, 0);
      const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.07, 0.3, 10), this.topMat);
      upperArm.position.y = -0.16;
      shoulder.add(pauldron, upperArm);

      const forearm = new THREE.Group();
      forearm.position.y = -0.31;
      shoulder.add(forearm);

      const lowerArm = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.062, 0.26, 10), this.skinMat);
      lowerArm.position.y = -0.13;
      const gauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.17, 0.15), this.metalMat);
      gauntlet.position.y = -0.22;
      const fist = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.11, 0.12), this.accentMat);
      fist.position.y = -0.33;

      const auraRing = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.02, 8, 18), this.auraMat);
      auraRing.rotation.x = Math.PI / 2;
      auraRing.position.y = -0.24;

      const weaponMount = new THREE.Group();
      weaponMount.position.set(0, -0.34, 0.05);

      forearm.add(lowerArm, gauntlet, fist, auraRing, weaponMount);
      return { shoulder, forearm, auraRing, weaponMount };
    };

    const lArm = buildArm(-1);
    const rArm = buildArm(1);
    this.leftArm = lArm.shoulder;
    this.leftForearm = lArm.forearm;
    this.auraRingLeft = lArm.auraRing;
    this.weaponLeftGroup = lArm.weaponMount;

    this.rightArm = rArm.shoulder;
    this.rightForearm = rArm.forearm;
    this.auraRingRight = rArm.auraRing;
    this.weaponRightGroup = rArm.weaponMount;

    // Legs (thigh + knee pad + shin + athletic streetwear sneaker)
    const buildLeg = (side: -1 | 1) => {
      const hip = new THREE.Group();
      hip.position.set(side * 0.14, -0.06, 0);
      this.hips.add(hip);

      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.088, 0.42, 10), this.bottomMat);
      thigh.position.y = -0.21;
      const kneePad = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.15), this.accentMat);
      kneePad.position.set(0, -0.41, 0.03);
      hip.add(thigh, kneePad);

      const shin = new THREE.Group();
      shin.position.y = -0.43;
      hip.add(shin);

      const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.068, 0.39, 10), this.bottomMat);
      calf.position.y = -0.19;
      const sneaker = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.13, 0.28), this.bootMat);
      sneaker.position.set(0, -0.4, 0.055);
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.045, 0.3), this.accentMat);
      sole.position.set(0, -0.45, 0.055);
      shin.add(calf, sneaker, sole);

      return { hip, shin };
    };

    const lLeg = buildLeg(-1);
    const rLeg = buildLeg(1);
    this.leftLeg = lLeg.hip;
    this.leftShin = lLeg.shin;
    this.rightLeg = rLeg.hip;
    this.rightShin = rLeg.shin;

    // Block / Parry translucent kinetic shield
    const shieldGeo = new THREE.CylinderGeometry(0.72, 0.72, 1.35, 6, 1, true, -Math.PI * 0.35, Math.PI * 0.7);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.4,
      transparent: true,
      opacity: 0.42,
      roughness: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.blockShield = new THREE.Mesh(shieldGeo, shieldMat);
    this.blockShield.position.set(0, 1.15, 0.4);
    this.blockShield.visible = false;
    this.root.add(this.blockShield);

    // Enemy Telegraph Warning Ring / Glint (bright readable parry cue!)
    const haloGeo = new THREE.RingGeometry(0.68, 0.96, 24);
    haloGeo.rotateX(-Math.PI / 2);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.telegraphHalo = new THREE.Mesh(haloGeo, haloMat);
    this.telegraphHalo.position.y = 0.04;
    this.root.add(this.telegraphHalo);

    // Orbiting Companion Pet
    this.petGroup = new THREE.Group();
    this.petGroup.position.set(-0.95, 1.8, -0.4);
    this.root.add(this.petGroup);

    this.applyCustomization(config);

    if (enableShadows) {
      this.root.traverse((obj) => {
        const isVfxOverlay =
          obj === this.contactShadow ||
          obj === this.blockShield ||
          obj === this.telegraphHalo ||
          obj === this.teamRing ||
          obj.parent === this.spotlightGroup;
        if ((obj as THREE.Mesh).isMesh && !isVfxOverlay) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
    }
  }

  private clearGroup(group: THREE.Group): void {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      child.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
    }
  }

  public applyCustomization(next: HeroCustomization): void {
    this.config = { ...next };
    const frame = BODY_FRAMES[next.frame];
    const auraHex = AURA_HEX[next.aura];

    this.skinMat.color.set(next.skinColor);
    this.hairMat.color.set(next.hairColor);
    this.topMat.color.set(next.topColor);
    this.bottomMat.color.set(next.bottomColor);
    this.accentMat.color.set(next.accentColor);
    this.auraMat.color.set(auraHex);
    this.auraMat.emissive.set(auraHex);

    this.torso.scale.set(frame.torsoWidth, 1, 0.94 + (frame.torsoWidth - 1) * 0.6);
    this.leftArm.scale.setScalar(frame.limbScale);
    this.rightArm.scale.setScalar(frame.limbScale);

    // Rebuild Hair Geometry
    this.clearGroup(this.hairGroup);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.31), this.hairMat);
    cap.position.y = 0.1;
    this.hairGroup.add(cap);

    if (next.hairStyle === 'spiky') {
      for (let i = 0; i < 6; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.26, 5), this.hairMat);
        const angle = (i / 6) * Math.PI * 2;
        spike.position.set(Math.cos(angle) * 0.09, 0.18 + (i % 2) * 0.04, Math.sin(angle) * 0.08 - 0.03);
        spike.rotation.set(-0.45 + Math.sin(angle) * 0.35, 0, -Math.cos(angle) * 0.45);
        this.hairGroup.add(spike);
      }
    } else if (next.hairStyle === 'undercut') {
      const sweep = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.36), this.hairMat);
      sweep.position.set(0.03, 0.16, -0.02);
      sweep.rotation.z = -0.14;
      this.hairGroup.add(sweep);
    } else if (next.hairStyle === 'ponytail') {
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.46, 7), this.hairMat);
      tail.position.set(0, 0.02, -0.26);
      tail.rotation.x = -0.95;
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 6, 12), this.accentMat);
      tie.position.set(0, 0.12, -0.17);
      this.hairGroup.add(tail, tie);
    } else if (next.hairStyle === 'locs') {
      for (let i = -2; i <= 2; i++) {
        const loc = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.38, 6), this.hairMat);
        loc.position.set(i * 0.072, -0.03, -0.15);
        loc.rotation.x = 0.2;
        this.hairGroup.add(loc);
      }
    } else if (next.hairStyle === 'mohawk') {
      const crest = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.24, 0.38), this.hairMat);
      crest.position.set(0, 0.22, -0.02);
      this.hairGroup.add(crest);
    } else if (next.hairStyle === 'twinbuns') {
      const bunL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), this.hairMat);
      bunL.position.set(-0.18, 0.18, -0.04);
      const bunR = bunL.clone();
      bunR.position.x = 0.18;
      this.hairGroup.add(bunL, bunR);
    }

    // Rebuild Headgear
    this.clearGroup(this.headgearGroup);
    if (next.headgear === 'visor') {
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.18), this.auraMat);
      visor.position.set(0, -0.02, 0.1);
      this.headgearGroup.add(visor);
    } else if (next.headgear === 'headband') {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.065, 0.32), this.accentMat);
      band.position.set(0, 0.06, 0);
      const tail1 = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.28, 0.02), this.accentMat);
      tail1.position.set(-0.05, -0.04, -0.2);
      tail1.rotation.set(0.55, 0, -0.18);
      const tail2 = tail1.clone();
      tail2.position.x = 0.05;
      tail2.rotation.z = 0.22;
      this.headgearGroup.add(band, tail1, tail2);
    } else if (next.headgear === 'horns') {
      const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.24, 6), this.metalMat);
      hornL.position.set(-0.14, 0.2, 0.04);
      hornL.rotation.set(0.25, 0, 0.45);
      const hornR = hornL.clone();
      hornR.position.x = 0.14;
      hornR.rotation.z = -0.45;
      this.headgearGroup.add(hornL, hornR);
    }

    // Rebuild Back Accessory
    this.clearGroup(this.backGroup);
    if (next.backAccessory === 'scarf') {
      const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.68, 0.04), this.accentMat);
      scarf.position.set(0, -0.28, -0.06);
      scarf.rotation.x = 0.24;
      this.backGroup.add(scarf);
    } else if (next.backAccessory === 'wings') {
      [-1, 1].forEach((side) => {
        const wingMain = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.18, 0.04), this.auraMat);
        wingMain.position.set(side * 0.4, 0.06, -0.08);
        wingMain.rotation.set(0, side * -0.25, side * 0.35);
        const wingSub = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.11, 0.04), this.metalMat);
        wingSub.position.set(side * 0.32, -0.14, -0.06);
        wingSub.rotation.set(0, side * -0.25, side * 0.12);
        this.backGroup.add(wingMain, wingSub);
      });
    } else if (next.backAccessory === 'thrusters') {
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.16), this.metalMat);
      const jetL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.22, 8), this.accentMat);
      jetL.position.set(-0.11, -0.18, -0.02);
      const jetR = jetL.clone();
      jetR.position.x = 0.11;
      const flameL = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 8), this.auraMat);
      flameL.position.set(-0.11, -0.34, -0.02);
      flameL.rotation.x = Math.PI;
      const flameR = flameL.clone();
      flameR.position.x = 0.11;
      this.backGroup.add(pack, jetL, jetR, flameL, flameR);
    }

    // Rebuild Weapon Skins
    this.clearGroup(this.weaponLeftGroup);
    this.clearGroup(this.weaponRightGroup);

    if (next.weaponSkin === 'tonfa') {
      const buildTonfa = () => {
        const g = new THREE.Group();
        const rod = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.58), this.metalMat);
        rod.position.set(0, 0.05, -0.12);
        const edge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.48), this.auraMat);
        edge.position.set(0, 0.09, -0.12);
        g.add(rod, edge);
        return g;
      };
      this.weaponLeftGroup.add(buildTonfa());
      this.weaponRightGroup.add(buildTonfa());
    } else if (next.weaponSkin === 'katana') {
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.26, 8), this.accentMat);
      hilt.rotation.x = Math.PI / 2;
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.03), this.metalMat);
      guard.position.z = 0.14;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.075, 1.05), this.metalMat);
      blade.position.z = 0.68;
      const glow = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.03, 1.02), this.auraMat);
      glow.position.set(0, 0.04, 0.68);
      this.weaponRightGroup.add(hilt, guard, blade, glow);
    } else if (next.weaponSkin === 'gauntlets') {
      const buildClaw = () => {
        const g = new THREE.Group();
        const shell = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.24), this.metalMat);
        const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.1), this.auraMat);
        knuckle.position.set(0, -0.04, 0.12);
        g.add(shell, knuckle);
        return g;
      };
      this.weaponLeftGroup.add(buildClaw());
      this.weaponRightGroup.add(buildClaw());
    } else if (next.weaponSkin === 'staff') {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 1.85, 8), this.metalMat);
      shaft.rotation.x = Math.PI / 2;
      const tipA = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), this.auraMat);
      tipA.position.z = 0.94;
      const tipB = tipA.clone();
      tipB.position.z = -0.94;
      this.weaponRightGroup.add(shaft, tipA, tipB);
    }

    // Rebuild Companion Pet
    this.clearGroup(this.petGroup);
    if (next.pet === 'drone') {
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 1), this.metalMat);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.025, 8, 18), this.auraMat);
      ring.rotation.x = Math.PI / 2.2;
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), this.auraMat);
      eye.position.z = 0.15;
      this.petGroup.add(core, ring, eye);
    } else if (next.pet === 'fox') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.34), this.accentMat);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.2), this.accentMat);
      head.position.set(0, 0.11, 0.2);
      const earL = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 4), this.auraMat);
      earL.position.set(-0.07, 0.24, 0.2);
      const earR = earL.clone();
      earR.position.x = 0.07;
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.34, 6), this.auraMat);
      tail.position.set(0, 0.08, -0.26);
      tail.rotation.x = -1.1;
      this.petGroup.add(body, head, earL, earR, tail);
    } else if (next.pet === 'orb') {
      const sphere = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 1), this.auraMat);
      const halo1 = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.018, 6, 20), this.metalMat);
      const halo2 = halo1.clone();
      halo2.rotation.y = Math.PI / 2;
      this.petGroup.add(sphere, halo1, halo2);
    }
  }

  public getConfig(): HeroCustomization {
    return this.config;
  }

  public updateAnimation(state: HeroAnimState): void {
    const t = state.time;

    // Squash & stretch
    this.bodyPivot.scale.set(state.squashX, state.squashY, state.squashX);

    // Hit emissive flash
    const flash = state.hitFlash;
    this.topMat.emissive.setRGB(flash * 0.9, flash * 0.9, flash * 0.9);
    this.accentMat.emissive.setRGB(
      flash * 0.9 + state.telegraphGlow * 0.85,
      flash * 0.9 + state.telegraphGlow * 0.65,
      flash * 0.9
    );

    // Telegraph ring readability
    const haloMat = this.telegraphHalo.material as THREE.MeshBasicMaterial;
    haloMat.opacity = state.telegraphGlow * 0.82;
    const haloScale = 1 + state.telegraphGlow * 0.45;
    this.telegraphHalo.scale.setScalar(haloScale);

    // Block shield visibility
    this.blockShield.visible = state.isBlocking && !state.isKo;

    // Aura shimmer
    this.auraRingLeft.rotation.z = t * 4.5;
    this.auraRingRight.rotation.z = -t * 4.5;
    const auraScale = state.attackMove || state.isUltimate ? 1.35 : 0.95 + Math.sin(t * 4) * 0.08;
    this.auraRingLeft.scale.setScalar(auraScale);
    this.auraRingRight.scale.setScalar(auraScale);

    // Companion Pet floating bob + ability lunge animation
    if (this.petGroup.children.length > 0) {
      const pulse = Math.max(0, Math.min(1, state.petActionPulse ?? 0));
      const lunge = Math.sin(pulse * Math.PI);
      this.petGroup.position.set(
        THREE.MathUtils.lerp(-0.95 + Math.sin(t * 1.6) * 0.16, 0, lunge * 0.85),
        1.78 + Math.sin(t * 3.1) * 0.14 + lunge * 0.34,
        -0.35 + Math.cos(t * 1.4) * 0.15 + lunge * 2.25
      );
      this.petGroup.rotation.y = Math.sin(t * 1.2) * 0.35 + pulse * Math.PI * 4.0;
      this.petGroup.scale.setScalar(1 + lunge * 0.48);
    }

    // Reset default pose
    this.hips.position.set(0, 0.94, 0);
    this.hips.rotation.set(0, 0, 0);
    this.torso.rotation.set(0, 0, 0);
    this.headGroup.rotation.set(0, 0, 0);
    this.leftArm.rotation.set(0.15, 0, 0.18);
    this.leftForearm.rotation.set(-0.55, 0, 0);
    this.rightArm.rotation.set(0.15, 0, -0.18);
    this.rightForearm.rotation.set(-0.55, 0, 0);
    this.leftLeg.rotation.set(0, 0, 0);
    this.leftShin.rotation.set(0, 0, 0);
    this.rightLeg.rotation.set(0, 0, 0);
    this.rightShin.rotation.set(0, 0, 0);

    // KO topple transition
    if (state.isKo) {
      const k = Math.min(1, state.koProgress);
      this.hips.position.y = THREE.MathUtils.lerp(0.94, 0.22, k);
      this.hips.rotation.x = -k * (Math.PI * 0.48);
      this.leftArm.rotation.z = 0.85 * k;
      this.rightArm.rotation.z = -0.85 * k;
      return;
    }

    // Knockdown / Stagger hit reaction
    if (state.isStaggered || state.isKnockedDown) {
      const tilt = state.isKnockedDown ? -0.68 : -0.35;
      this.torso.rotation.x = tilt;
      this.headGroup.rotation.x = -0.25;
      this.leftArm.rotation.set(-0.5, 0, 0.75);
      this.rightArm.rotation.set(-0.5, 0, -0.75);
      this.hips.position.y = state.isKnockedDown ? 0.74 : 0.88;
      return;
    }

    // Dodge-dash lean
    if (state.isDodging) {
      this.hips.position.y = 0.76;
      this.torso.rotation.x = 0.58;
      this.leftArm.rotation.set(0.85, 0, 0.35);
      this.rightArm.rotation.set(0.85, 0, -0.35);
      this.leftLeg.rotation.x = -0.45;
      this.rightLeg.rotation.x = 0.55;
      return;
    }

    // Ultimate cinematic power pose
    if (state.isUltimate) {
      this.hips.position.y = 1.15 + Math.sin(t * 16) * 0.08;
      this.torso.rotation.x = -0.22;
      this.leftArm.rotation.set(-2.3, 0, 0.65);
      this.rightArm.rotation.set(-2.3, 0, -0.65);
      this.leftLeg.rotation.x = 0.25;
      this.rightLeg.rotation.x = -0.25;
      return;
    }

    // Attack swing choreography (clear windup -> snap strike -> follow-through silhouette!)
    if (state.attackMove) {
      const p = state.attackProgress;
      const wind = p < 0.28 ? p / 0.28 : 1;
      const snap = p < 0.28 ? 0 : Math.min(1, (p - 0.28) / 0.32);
      const recover = p > 0.6 ? (p - 0.6) / 0.4 : 0;
      const strikeArc = snap * (1 - recover * 0.65);

      switch (state.attackMove.animStyle) {
        case 'jab':
          this.torso.rotation.y = -0.35 * wind + 0.85 * strikeArc;
          this.leftArm.rotation.set(-1.55 * strikeArc - 0.2, 0, 0.15);
          this.leftForearm.rotation.set(-0.15 * (1 - strikeArc), 0, 0);
          this.rightArm.rotation.set(-0.6, 0, -0.3);
          break;
        case 'cross':
          this.torso.rotation.y = 0.45 * wind - 1.05 * strikeArc;
          this.rightArm.rotation.set(-1.65 * strikeArc - 0.15, 0, -0.15);
          this.rightForearm.rotation.set(-0.1, 0, 0);
          this.leftArm.rotation.set(-0.55, 0, 0.4);
          break;
        case 'flurry':
          this.torso.rotation.y = Math.sin(p * Math.PI * 4) * 0.85;
          this.leftArm.rotation.set(-1.45 + Math.sin(p * Math.PI * 4) * 0.4, 0, 0.2);
          this.rightArm.rotation.set(-1.45 - Math.sin(p * Math.PI * 4) * 0.4, 0, -0.2);
          break;
        case 'uppercut':
          this.hips.position.y = 0.82 + strikeArc * 0.38;
          this.torso.rotation.x = 0.32 * wind - 0.42 * strikeArc;
          this.torso.rotation.y = 0.55 * wind - 1.15 * strikeArc;
          this.rightArm.rotation.set(-2.6 * strikeArc + 0.4 * wind, 0, -0.25);
          this.leftArm.rotation.set(0.4, 0, 0.5);
          break;
        case 'sweep':
          this.hips.position.y = 0.72;
          this.hips.rotation.y = p * Math.PI * 2;
          this.rightLeg.rotation.set(-1.35 * strikeArc, 0, -0.5);
          this.leftArm.rotation.z = 0.9;
          this.rightArm.rotation.z = -0.9;
          break;
        case 'spin_kick':
          this.hips.position.y = 1.02;
          this.hips.rotation.y = p * Math.PI * 2;
          this.leftLeg.rotation.set(-1.55 * strikeArc, 0, 0.35);
          break;
        case 'heavy_slash':
        case 'slam':
          this.hips.position.y = 0.94 + Math.sin(wind * Math.PI * 0.5) * 0.22 - strikeArc * 0.24;
          this.torso.rotation.x = -0.38 * wind + 0.65 * strikeArc;
          this.rightArm.rotation.set(-2.5 * wind + 1.85 * strikeArc, 0, -0.2);
          this.leftArm.rotation.set(-2.2 * wind + 1.55 * strikeArc, 0, 0.2);
          break;
      }
      return;
    }

    // Block Guard Stance
    if (state.isBlocking) {
      this.hips.position.y = 0.86;
      this.torso.rotation.y = -0.25;
      this.leftArm.rotation.set(-1.25, 0.45, 0.35);
      this.leftForearm.rotation.set(-1.2, 0, 0);
      this.rightArm.rotation.set(-1.25, -0.45, -0.35);
      this.rightForearm.rotation.set(-1.2, 0, 0);
      return;
    }

    // Emotes (Core 4 + 5 Tiered Store Emotes)
    if (state.emote) {
      const et = state.emoteTimer;
      if (state.emote === 'flex') {
        this.torso.rotation.x = -0.14;
        this.leftArm.rotation.set(-0.9, 0, 1.35);
        this.leftForearm.rotation.set(-1.55, 0, 0);
        this.rightArm.rotation.set(-0.9, 0, -1.35);
        this.rightForearm.rotation.set(-1.55, 0, 0);
        this.hips.position.y = 0.94 + Math.abs(Math.sin(et * 6)) * 0.05;
      } else if (state.emote === 'shadowbox') {
        const s = Math.sin(et * 12);
        this.hips.position.y = 0.9 + Math.abs(s) * 0.06;
        this.torso.rotation.y = s * 0.55;
        this.leftArm.rotation.set(-1.35 - Math.max(0, s) * 0.5, 0, 0.2);
        this.rightArm.rotation.set(-1.35 - Math.max(0, -s) * 0.5, 0, -0.2);
      } else if (state.emote === 'bow') {
        const bowAmt = Math.sin(Math.min(1, et / 1.5) * Math.PI);
        this.torso.rotation.x = bowAmt * 0.72;
        this.leftArm.rotation.set(-0.6 * bowAmt, 0.4, 0.15);
        this.rightArm.rotation.set(-0.6 * bowAmt, -0.4, -0.15);
      } else if (state.emote === 'dance') {
        const d = Math.sin(et * 9);
        this.hips.position.y = 0.92 + Math.abs(d) * 0.14;
        this.hips.rotation.y = d * 0.45;
        this.leftArm.rotation.set(-1.6 + d * 0.7, 0, 0.65);
        this.rightArm.rotation.set(-1.6 - d * 0.7, 0, -0.65);
        this.leftLeg.rotation.x = d * 0.4;
        this.rightLeg.rotation.x = -d * 0.4;
      } else if (state.emote === 'backflip') {
        const flipP = Math.min(1, (et % 1.15) / 0.85);
        const arc = Math.sin(flipP * Math.PI);
        this.hips.position.y = 0.94 + arc * 1.15;
        this.hips.rotation.x = -flipP * Math.PI * 2;
        this.leftArm.rotation.set(-1.9, 0, 0.45);
        this.rightArm.rotation.set(-1.9, 0, -0.45);
        this.leftLeg.rotation.x = -0.85 * arc;
        this.leftShin.rotation.x = 1.2 * arc;
        this.rightLeg.rotation.x = -0.85 * arc;
        this.rightShin.rotation.x = 1.2 * arc;
      } else if (state.emote === 'meditate') {
        this.hips.position.y = 1.38 + Math.sin(et * 3.2) * 0.14;
        this.hips.rotation.y = Math.sin(et * 1.1) * 0.25;
        this.leftArm.rotation.set(-0.55, 0.35, 0.75);
        this.leftForearm.rotation.set(-1.1, 0, 0);
        this.rightArm.rotation.set(-0.55, -0.35, -0.75);
        this.rightForearm.rotation.set(-1.1, 0, 0);
        this.leftLeg.rotation.set(-1.2, 0.5, 0.65);
        this.leftShin.rotation.x = 1.55;
        this.rightLeg.rotation.set(-1.2, -0.5, -0.65);
        this.rightShin.rotation.x = 1.55;
      } else if (state.emote === 'lightning_pose') {
        const pulse = Math.sin(et * 18);
        this.hips.position.y = 0.98 + Math.abs(pulse) * 0.08;
        this.torso.rotation.x = -0.18;
        this.leftArm.rotation.set(-2.55, 0, 0.35 + pulse * 0.08);
        this.rightArm.rotation.set(-2.55, 0, -0.35 - pulse * 0.08);
        this.leftLeg.rotation.z = 0.24;
        this.rightLeg.rotation.z = -0.24;
      } else if (state.emote === 'dragon_roar') {
        const roar = Math.sin(Math.min(1, et / 0.55) * Math.PI * 0.5);
        const shake = Math.sin(et * 22) * 0.05;
        this.hips.position.y = 0.86 + roar * 0.16;
        this.torso.rotation.x = -0.34 * roar;
        this.headGroup.rotation.x = -0.38 * roar;
        this.leftArm.rotation.set(-0.65 + shake, 0, 1.35 * roar);
        this.leftForearm.rotation.set(-0.9, 0, 0);
        this.rightArm.rotation.set(-0.65 - shake, 0, -1.35 * roar);
        this.rightForearm.rotation.set(-0.9, 0, 0);
        this.leftLeg.rotation.set(-0.22, 0, 0.22);
        this.rightLeg.rotation.set(0.22, 0, -0.22);
      } else if (state.emote === 'throne_salute') {
        const ascend = Math.sin(et * 2.4) * 0.08;
        this.hips.position.y = 1.24 + ascend;
        this.torso.rotation.y = Math.sin(et * 1.4) * 0.22;
        this.rightArm.rotation.set(-2.25, 0, -0.25);
        this.rightForearm.rotation.set(-0.25, 0, 0);
        this.leftArm.rotation.set(-0.85, 0.55, 0.35);
        this.leftForearm.rotation.set(-1.35, 0, 0);
      } else if (state.emote === 'rank_uncharted_flex') {
        // Tier 1: The Uncharted — pioneer double-guard power flex & compass torso sway
        const pump = Math.sin(et * 7.5);
        this.hips.position.y = 0.94 + Math.abs(pump) * 0.06;
        this.torso.rotation.x = -0.18;
        this.torso.rotation.y = Math.sin(et * 2.4) * 0.28;
        this.headGroup.rotation.x = -0.14;
        this.leftArm.rotation.set(-0.75 + pump * 0.12, 0.2, 1.45);
        this.leftForearm.rotation.set(-1.75, 0, 0);
        this.rightArm.rotation.set(-0.75 - pump * 0.12, -0.2, -1.45);
        this.rightForearm.rotation.set(-1.75, 0, 0);
        this.leftLeg.rotation.set(-0.14, 0, 0.22);
        this.rightLeg.rotation.set(0.14, 0, -0.22);
      } else if (state.emote === 'rank_wilds_prowl') {
        // Tier 2: The Wilds — predatory stalker crouch with alternating claw swipes
        const stalk = Math.sin(et * 5.2);
        const swipe = Math.sin(et * 10.4);
        this.hips.position.y = 0.72 + Math.abs(stalk) * 0.08;
        this.torso.rotation.x = 0.42;
        this.torso.rotation.y = stalk * 0.45;
        this.headGroup.rotation.x = -0.32;
        this.leftArm.rotation.set(-1.25 - Math.max(0, swipe) * 0.55, 0.3, 0.55);
        this.leftForearm.rotation.set(-0.95, 0, 0);
        this.rightArm.rotation.set(-1.25 - Math.max(0, -swipe) * 0.55, -0.3, -0.55);
        this.rightForearm.rotation.set(-0.95, 0, 0);
        this.leftLeg.rotation.set(-0.62, 0, 0.26);
        this.leftShin.rotation.x = 0.85;
        this.rightLeg.rotation.set(-0.38, 0, -0.26);
        this.rightShin.rotation.x = 0.72;
      } else if (state.emote === 'rank_frontier_salute') {
        // Tier 3: The Frontier — vanguard fist-to-chest salute then blazing sky thrust
        const phase = Math.min(1, et / 0.85);
        const thrust = et > 0.9 ? Math.min(1, (et - 0.9) / 0.35) : 0;
        this.hips.position.y = 0.94 + thrust * 0.12;
        this.torso.rotation.x = -0.12 * thrust;
        this.torso.rotation.y = -0.25 * phase + 0.38 * thrust;
        this.rightArm.rotation.set(-1.25 * phase - 1.45 * thrust, -0.55 * (1 - thrust), -0.25);
        this.rightForearm.rotation.set(-1.45 * (1 - thrust) - 0.15 * thrust, 0, 0);
        this.leftArm.rotation.set(-0.35, 0.2, 0.38 + thrust * 0.32);
        this.leftForearm.rotation.set(-0.65, 0, 0);
        this.leftLeg.rotation.z = 0.2;
        this.rightLeg.rotation.z = -0.2;
      } else if (state.emote === 'rank_mythic_ascension') {
        // Tier 4: The Mythic — weightless sovereign ascension with wide mystic arm spread
        const hover = Math.sin(et * 3.6) * 0.12;
        this.hips.position.y = 1.44 + hover;
        this.hips.rotation.y = Math.sin(et * 1.4) * 0.32;
        this.torso.rotation.x = -0.2;
        this.headGroup.rotation.x = -0.22;
        this.leftArm.rotation.set(-0.35, 0, 1.38 + Math.sin(et * 4.5) * 0.1);
        this.leftForearm.rotation.set(-0.22, 0, 0);
        this.rightArm.rotation.set(-0.35, 0, -1.38 - Math.sin(et * 4.5) * 0.1);
        this.rightForearm.rotation.set(-0.22, 0, 0);
        this.leftLeg.rotation.set(0.18, 0, 0.12);
        this.leftShin.rotation.x = 0.38;
        this.rightLeg.rotation.set(-0.22, 0, -0.12);
        this.rightShin.rotation.x = 0.55;
      } else if (state.emote === 'rank_cosmic_meditation') {
        // Tier 5: The Cosmic — transcendent high-altitude astral lotus meditation with slow celestial orbit
        const floatY = Math.sin(et * 2.4) * 0.16;
        this.hips.position.y = 1.62 + floatY;
        this.hips.rotation.y = et * 0.65;
        this.torso.rotation.x = -0.06;
        this.headGroup.rotation.x = -0.08;
        this.leftArm.rotation.set(-0.48, 0.42, 0.86);
        this.leftForearm.rotation.set(-1.18, 0, 0);
        this.rightArm.rotation.set(-0.48, -0.42, -0.86);
        this.rightForearm.rotation.set(-1.18, 0, 0);
        this.leftLeg.rotation.set(-1.28, 0.58, 0.72);
        this.leftShin.rotation.x = 1.68;
        this.rightLeg.rotation.set(-1.28, -0.58, -0.72);
        this.rightShin.rotation.x = 1.68;
      }
      return;
    }

    // Airborne pose
    if (!state.grounded) {
      this.hips.position.y = 0.98;
      this.torso.rotation.x = state.vy > 0 ? -0.12 : 0.18;
      this.leftArm.rotation.set(-0.9, 0, 0.55);
      this.rightArm.rotation.set(-0.9, 0, -0.55);
      this.leftLeg.rotation.x = -0.55;
      this.leftShin.rotation.x = 0.75;
      this.rightLeg.rotation.x = 0.35;
      this.rightShin.rotation.x = 0.45;
      return;
    }

    // Gait-synced run / walk or martial arts idle stance
    if (state.speedNorm > 0.06) {
      const s = Math.sin(state.walkPhase);
      const c = Math.cos(state.walkPhase);
      const amp = Math.min(1, state.speedNorm);
      this.hips.position.y = 0.92 + Math.abs(c) * 0.075 * amp;
      this.torso.rotation.x = 0.16 * amp;
      this.torso.rotation.y = -s * 0.18 * amp;

      this.leftLeg.rotation.x = s * 0.85 * amp;
      this.leftShin.rotation.x = Math.max(0, -c) * 0.85 * amp;
      this.rightLeg.rotation.x = -s * 0.85 * amp;
      this.rightShin.rotation.x = Math.max(0, c) * 0.85 * amp;

      this.leftArm.rotation.x = -s * 0.85 * amp;
      this.leftForearm.rotation.x = -0.75;
      this.rightArm.rotation.x = s * 0.85 * amp;
      this.rightForearm.rotation.x = -0.75;
    } else {
      // Ready martial-arts breathing stance
      const breath = Math.sin(t * 2.8);
      this.hips.position.y = 0.94 + breath * 0.02;
      this.torso.rotation.y = -0.16;
      this.leftArm.rotation.set(-0.68 + breath * 0.05, 0.12, 0.25);
      this.leftForearm.rotation.set(-0.95, 0, 0);
      this.rightArm.rotation.set(-0.55 - breath * 0.05, -0.12, -0.25);
      this.rightForearm.rotation.set(-1.05, 0, 0);
      this.leftLeg.rotation.x = -0.1;
      this.rightLeg.rotation.x = 0.1;
    }
  }

  public setTeamRing(colorHex: string | null): void {
    if (!colorHex) {
      this.teamRing.visible = false;
      return;
    }
    const mat = this.teamRing.material as THREE.MeshBasicMaterial;
    mat.color.set(colorHex);
    this.teamRing.visible = true;
  }

  public setEmoteSpotlight(active: boolean, colorHex = '#facc15', elapsed = 0): void {
    this.spotlightGroup.visible = active;
    if (!active) return;
    this.spotlightConeMat.color.set(colorHex);
    this.spotlightRingMat.color.set(colorHex);
    const pulse = 0.85 + Math.sin(elapsed * 9) * 0.15;
    this.spotlightConeMat.opacity = 0.24 * pulse;
    this.spotlightRingMat.opacity = 0.78 * pulse;
    this.spotlightRing.rotation.z = elapsed * 2.6;
    this.spotlightRing.scale.setScalar(0.96 + Math.sin(elapsed * 6) * 0.08);
  }

  public setOverheadRankBadge(
    info: { name: string; rank: number; isPlayer?: boolean } | null
  ): void {
    if (!info) {
      if (this.rankBadgeSprite) {
        this.root.remove(this.rankBadgeSprite);
        (this.rankBadgeSprite.material as THREE.SpriteMaterial).dispose();
        this.rankBadgeSprite = null;
      }
      if (this.rankBadgeTexture) {
        this.rankBadgeTexture.dispose();
        this.rankBadgeTexture = null;
      }
      return;
    }

    const emblem = getRankEmblemSpec(info.rank);
    const canvas = document.createElement('canvas');
    canvas.width = 440;
    canvas.height = 120;
    const ctx = canvas.getContext('2d')!;

    // Clipped athletic background plate
    ctx.clearRect(0, 0, 440, 120);
    ctx.beginPath();
    ctx.moveTo(14, 6);
    ctx.lineTo(434, 6);
    ctx.lineTo(426, 114);
    ctx.lineTo(6, 114);
    ctx.closePath();
    ctx.fillStyle = info.isPlayer ? 'rgba(15, 23, 42, 0.94)' : 'rgba(9, 14, 26, 0.9)';
    ctx.fill();

    // Glowing Tier or Player Gold border
    ctx.lineWidth = info.isPlayer ? 4 : 3;
    ctx.strokeStyle = info.isPlayer ? '#facc15' : emblem.primaryHex;
    ctx.stroke();

    // Top accent bar
    ctx.fillStyle = emblem.primaryHex;
    ctx.fillRect(14, 6, 420, 5);

    // Draw bespoke Tier / Apex / Omni Emblem on left
    drawRankEmblemOnCanvas(ctx, 62, 62, 36, emblem);

    // Fighter Name + (YOU) badge
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '800 30px sans-serif';
    ctx.fillStyle = '#ffffff';
    const displayName = info.isPlayer
      ? `${info.name.toUpperCase()} (YOU)`
      : info.name.toUpperCase();
    ctx.fillText(displayName.slice(0, 18), 114, 38);

    // Rank #N · RankName
    ctx.font = '800 24px monospace';
    ctx.fillStyle = emblem.primaryHex;
    ctx.fillText(`#${emblem.rank} ${emblem.rankName.toUpperCase()}`, 114, 70);

    // Tier Label
    ctx.font = '700 16px sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`TIER ${emblem.tier} · ${emblem.tierName.toUpperCase()}`, 114, 96);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;

    if (this.rankBadgeTexture) {
      this.rankBadgeTexture.dispose();
    }
    this.rankBadgeTexture = tex;

    if (!this.rankBadgeSprite) {
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
      });
      this.rankBadgeSprite = new THREE.Sprite(mat);
      this.rankBadgeSprite.position.set(0, 2.55, 0);
      this.rankBadgeSprite.scale.set(2.35, 0.64, 1);
      this.rankBadgeSprite.renderOrder = 12;
      this.root.add(this.rankBadgeSprite);
    } else {
      const mat = this.rankBadgeSprite.material as THREE.SpriteMaterial;
      mat.map = tex;
      mat.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.setOverheadRankBadge(null);
    this.root.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    (this.teamRing.material as THREE.Material).dispose();
    this.spotlightConeMat.dispose();
    this.spotlightRingMat.dispose();
    this.skinMat.dispose();
    this.hairMat.dispose();
    this.topMat.dispose();
    this.bottomMat.dispose();
    this.accentMat.dispose();
    this.metalMat.dispose();
    this.auraMat.dispose();
    this.bootMat.dispose();
  }
}
