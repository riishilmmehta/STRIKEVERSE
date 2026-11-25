import * as THREE from 'three';
import { getArenaBiomeParticleSpec } from './arenaBiomeFx';
import type { ArenaBiomeId } from './types';

interface BiomeParticleSlot {
  x: number;
  y: number;
  z: number;
  phase: number;
  speedMult: number;
  scaleMult: number;
  rotSpeedX: number;
  rotSpeedY: number;
  colorIdx: number;
}

const MAX_PRIMARY = 160;
const MAX_SECONDARY = 110;
const ARENA_SPAN = 22;
const CEILING_Y = 14.5;

// Reusable scratch transforms (Zero-GC per-frame update)
const _obj = new THREE.Object3D();
const _color = new THREE.Color();

function createSoftMistTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
  grad.addColorStop(0.45, 'rgba(255, 255, 255, 0.45)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Zero-GC dual-layer Three.js InstancedMesh particle renderer for the five 1v1 Arena biomes:
 *  - Salt Flats & Mirrors: gleaming falling salt crystals
 *  - Karst Towers & Cenotes: billowing rising mist plumes
 *  - Post-Wildfire Ashlands: glowing rising embers + tumbling floating ash flakes
 *  - Geothermal Rainbow Springs: rising thermal steam + sulfur mineral sparks
 *  - Kelp Forests & Brine Pools: rising bioluminescent spores + deep-sea bubbles
 */
export class ArenaBiomeRenderer {
  private readonly primaryMesh: THREE.InstancedMesh;
  private readonly secondaryMesh: THREE.InstancedMesh;
  private readonly emberMesh: THREE.InstancedMesh;
  private readonly mistTexture: THREE.CanvasTexture;
  private readonly primarySlots: BiomeParticleSlot[] = [];
  private readonly secondarySlots: BiomeParticleSlot[] = [];
  private readonly emberSlots: BiomeParticleSlot[] = [];
  private activeBiome: ArenaBiomeId = 'salt_flats';
  private enabled = false;
  private embersEnabled = false;
  private elapsed = 0;

  constructor(scene: THREE.Scene) {
    // Primary: faceted octahedron shards (salt crystals, fiery embers, mineral sparks, spores)
    const primaryGeo = new THREE.OctahedronGeometry(0.13, 0);
    const primaryMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    this.primaryMesh = new THREE.InstancedMesh(primaryGeo, primaryMat, MAX_PRIMARY);
    this.primaryMesh.frustumCulled = false;
    this.primaryMesh.visible = false;

    // Secondary: soft radial billboard planes (Karst rising mist, geothermal steam, ash flakes, bubbles)
    this.mistTexture = createSoftMistTexture();
    const secondaryGeo = new THREE.PlaneGeometry(1, 1);
    const secondaryMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: this.mistTexture,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.secondaryMesh = new THREE.InstancedMesh(secondaryGeo, secondaryMat, MAX_SECONDARY);
    this.secondaryMesh.frustumCulled = false;
    this.secondaryMesh.visible = false;

    // Ambient Red Flame Embers & Arena Dust (present across all battle arenas for brand atmosphere)
    const emberCount = 56;
    const emberGeo = new THREE.OctahedronGeometry(0.09, 0);
    const emberMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });
    this.emberMesh = new THREE.InstancedMesh(emberGeo, emberMat, emberCount);
    this.emberMesh.frustumCulled = false;
    this.emberMesh.visible = false;
    const emberPalette = ['#f97316', '#ef4444', '#facc15'];
    for (let i = 0; i < emberCount; i++) {
      this.emberSlots.push({
        x: (Math.random() * 2 - 1) * ARENA_SPAN,
        y: 0.2 + Math.random() * 11,
        z: (Math.random() * 2 - 1) * ARENA_SPAN,
        phase: Math.random() * Math.PI * 2,
        speedMult: 0.65 + Math.random() * 0.75,
        scaleMult: 0.6 + Math.random() * 0.85,
        rotSpeedX: (Math.random() - 0.5) * 3.5,
        rotSpeedY: (Math.random() - 0.5) * 3.5,
        colorIdx: i % 3,
      });
      _obj.position.set(0, -100, 0);
      _obj.scale.setScalar(0);
      _obj.updateMatrix();
      this.emberMesh.setMatrixAt(i, _obj.matrix);
      this.emberMesh.setColorAt(i, _color.set(emberPalette[i % emberPalette.length]));
    }
    this.emberMesh.instanceMatrix.needsUpdate = true;
    if (this.emberMesh.instanceColor) this.emberMesh.instanceColor.needsUpdate = true;

    for (let i = 0; i < MAX_PRIMARY; i++) {
      this.primarySlots.push({
        x: (Math.random() * 2 - 1) * ARENA_SPAN,
        y: Math.random() * CEILING_Y,
        z: (Math.random() * 2 - 1) * ARENA_SPAN,
        phase: Math.random() * Math.PI * 2,
        speedMult: 0.72 + Math.random() * 0.65,
        scaleMult: 0.68 + Math.random() * 0.75,
        rotSpeedX: (Math.random() - 0.5) * 4.2,
        rotSpeedY: (Math.random() - 0.5) * 4.2,
        colorIdx: i % 3,
      });
      _obj.position.set(0, -100, 0);
      _obj.scale.setScalar(0);
      _obj.updateMatrix();
      this.primaryMesh.setMatrixAt(i, _obj.matrix);
      this.primaryMesh.setColorAt(i, _color.set('#ffffff'));
    }

    for (let i = 0; i < MAX_SECONDARY; i++) {
      this.secondarySlots.push({
        x: (Math.random() * 2 - 1) * ARENA_SPAN,
        y: Math.random() * CEILING_Y,
        z: (Math.random() * 2 - 1) * ARENA_SPAN,
        phase: Math.random() * Math.PI * 2,
        speedMult: 0.65 + Math.random() * 0.7,
        scaleMult: 0.75 + Math.random() * 0.85,
        rotSpeedX: (Math.random() - 0.5) * 2.8,
        rotSpeedY: (Math.random() - 0.5) * 2.8,
        colorIdx: i % 3,
      });
      _obj.position.set(0, -100, 0);
      _obj.scale.setScalar(0);
      _obj.updateMatrix();
      this.secondaryMesh.setMatrixAt(i, _obj.matrix);
      this.secondaryMesh.setColorAt(i, _color.set('#ffffff'));
    }

    this.primaryMesh.instanceMatrix.needsUpdate = true;
    this.secondaryMesh.instanceMatrix.needsUpdate = true;
    if (this.primaryMesh.instanceColor) this.primaryMesh.instanceColor.needsUpdate = true;
    if (this.secondaryMesh.instanceColor) this.secondaryMesh.instanceColor.needsUpdate = true;

    scene.add(this.primaryMesh, this.secondaryMesh, this.emberMesh);
  }

  public configure(biome: ArenaBiomeId, enabled: boolean, showRedFlameEmbers = enabled): void {
    this.activeBiome = biome;
    this.enabled = enabled;
    this.embersEnabled = showRedFlameEmbers;
    this.primaryMesh.visible = enabled;
    this.secondaryMesh.visible = enabled;
    this.emberMesh.visible = showRedFlameEmbers;
    if (!enabled) {
      if (showRedFlameEmbers) this.update(0.016);
      return;
    }

    const spec = getArenaBiomeParticleSpec(biome);
    const pMat = this.primaryMesh.material as THREE.MeshBasicMaterial;
    const sMat = this.secondaryMesh.material as THREE.MeshBasicMaterial;
    pMat.opacity = spec.primaryOpacity;
    sMat.opacity = spec.secondaryOpacity;
    // Use solid crisp flake look for Wildfire Ashlands ash, soft radial texture for mist/steam/bubbles
    sMat.map = spec.mode === 'embers_and_ash' ? null : this.mistTexture;
    sMat.needsUpdate = true;

    const pCount = Math.min(MAX_PRIMARY, spec.primaryCount);
    for (let i = 0; i < MAX_PRIMARY; i++) {
      if (i >= pCount) {
        _obj.position.set(0, -100, 0);
        _obj.scale.setScalar(0);
        _obj.updateMatrix();
        this.primaryMesh.setMatrixAt(i, _obj.matrix);
      } else {
        const s = this.primarySlots[i];
        _color.set(spec.primaryColors[s.colorIdx % spec.primaryColors.length]);
        this.primaryMesh.setColorAt(i, _color);
      }
    }

    const sCount = Math.min(MAX_SECONDARY, spec.secondaryCount);
    for (let i = 0; i < MAX_SECONDARY; i++) {
      if (i >= sCount) {
        _obj.position.set(0, -100, 0);
        _obj.scale.setScalar(0);
        _obj.updateMatrix();
        this.secondaryMesh.setMatrixAt(i, _obj.matrix);
      } else {
        const s = this.secondarySlots[i];
        _color.set(spec.secondaryColors[s.colorIdx % spec.secondaryColors.length]);
        this.secondaryMesh.setColorAt(i, _color);
      }
    }

    if (this.primaryMesh.instanceColor) this.primaryMesh.instanceColor.needsUpdate = true;
    if (this.secondaryMesh.instanceColor) this.secondaryMesh.instanceColor.needsUpdate = true;
    this.update(0.016);
  }

  public update(dt: number, cameraQuaternion?: THREE.Quaternion): void {
    if (!this.enabled && !this.embersEnabled) return;
    this.elapsed += dt;

    if (this.embersEnabled) {
      for (let i = 0; i < this.emberSlots.length; i++) {
        const s = this.emberSlots[i];
        s.y += 1.35 * s.speedMult * dt;
        s.x += Math.sin(this.elapsed * 1.6 + s.phase) * 0.9 * dt;
        s.z += Math.cos(this.elapsed * 1.3 + s.phase) * 0.8 * dt;
        if (s.y > 12.5) {
          s.y = 0.2 + Math.random() * 1.4;
          s.x = (Math.random() * 2 - 1) * ARENA_SPAN;
          s.z = (Math.random() * 2 - 1) * ARENA_SPAN;
        }
        const glow = 0.72 + 0.42 * Math.sin(this.elapsed * 8.5 + s.phase);
        _obj.position.set(s.x, s.y, s.z);
        _obj.rotation.set(this.elapsed * s.rotSpeedX, this.elapsed * s.rotSpeedY, s.phase);
        _obj.scale.setScalar(0.85 * s.scaleMult * glow);
        _obj.updateMatrix();
        this.emberMesh.setMatrixAt(i, _obj.matrix);
      }
      this.emberMesh.instanceMatrix.needsUpdate = true;
    }

    if (!this.enabled) return;
    const spec = getArenaBiomeParticleSpec(this.activeBiome);

    const pCount = Math.min(MAX_PRIMARY, spec.primaryCount);
    const sCount = Math.min(MAX_SECONDARY, spec.secondaryCount);

    // 1. Primary Particle Layer
    for (let i = 0; i < pCount; i++) {
      const s = this.primarySlots[i];
      if (spec.mode === 'salt_crystals') {
        // Falling sparkling salt crystals drifting down onto the sky-reflecting mirror flats
        s.y += spec.verticalSpeed * s.speedMult * dt;
        s.x += Math.sin(this.elapsed * 1.4 + s.phase) * spec.driftSpeed * dt;
        s.z += Math.cos(this.elapsed * 1.1 + s.phase) * spec.driftSpeed * 0.7 * dt;
        if (s.y < 0.08) {
          s.y = CEILING_Y - Math.random() * 2.5;
          s.x = (Math.random() * 2 - 1) * ARENA_SPAN;
          s.z = (Math.random() * 2 - 1) * ARENA_SPAN;
        }
        const glint = 0.78 + 0.35 * Math.sin(this.elapsed * 7.5 + s.phase);
        _obj.position.set(s.x, s.y, s.z);
        _obj.rotation.set(
          this.elapsed * s.rotSpeedX + s.phase,
          this.elapsed * s.rotSpeedY,
          s.phase
        );
        _obj.scale.set(0.95 * s.scaleMult * glint, 1.45 * s.scaleMult * glint, 0.95 * s.scaleMult * glint);
      } else if (spec.mode === 'embers_and_ash') {
        // Post-Wildfire Ashlands: glowing hot embers rising rapidly from smoldering soil
        s.y += spec.verticalSpeed * s.speedMult * dt;
        s.x += (Math.sin(this.elapsed * 2.3 + s.phase) * spec.driftSpeed + 0.55) * dt;
        s.z += Math.cos(this.elapsed * 1.8 + s.phase) * spec.driftSpeed * 0.85 * dt;
        if (s.y > CEILING_Y) {
          s.y = 0.15 + Math.random() * 1.4;
          s.x = (Math.random() * 2 - 1) * ARENA_SPAN;
          s.z = (Math.random() * 2 - 1) * ARENA_SPAN;
        }
        if (s.x > ARENA_SPAN) s.x -= ARENA_SPAN * 2;
        const flicker = 0.75 + 0.42 * Math.sin(this.elapsed * 10 + s.phase);
        _obj.position.set(s.x, s.y, s.z);
        _obj.rotation.set(this.elapsed * 2.4 + s.phase, this.elapsed * 3.1, 0);
        _obj.scale.setScalar(0.9 * s.scaleMult * flicker);
      } else if (spec.mode === 'rising_mist') {
        // Karst Cenotes: shimmering teal droplets lifting upward
        s.y += spec.verticalSpeed * 0.75 * s.speedMult * dt;
        s.x += Math.sin(this.elapsed * 0.9 + s.phase) * spec.driftSpeed * dt;
        if (s.y > CEILING_Y * 0.85) {
          s.y = 0.2 + Math.random() * 1.8;
          s.x = (Math.random() * 2 - 1) * ARENA_SPAN;
          s.z = (Math.random() * 2 - 1) * ARENA_SPAN;
        }
        _obj.position.set(s.x, s.y, s.z);
        _obj.rotation.set(0, this.elapsed + s.phase, 0);
        _obj.scale.setScalar(0.65 * s.scaleMult);
      } else if (spec.mode === 'thermal_steam') {
        // Geothermal Rainbow Springs: rising sulfur & mineral sparks
        s.y += spec.verticalSpeed * 1.15 * s.speedMult * dt;
        s.x += Math.sin(this.elapsed * 1.7 + s.phase) * spec.driftSpeed * dt;
        s.z += Math.cos(this.elapsed * 1.4 + s.phase) * spec.driftSpeed * dt;
        if (s.y > CEILING_Y) {
          s.y = 0.2 + Math.random() * 1.5;
          s.x = (Math.random() * 2 - 1) * ARENA_SPAN;
          s.z = (Math.random() * 2 - 1) * ARENA_SPAN;
        }
        _obj.position.set(s.x, s.y, s.z);
        _obj.rotation.set(this.elapsed * 2, this.elapsed * 2.6, s.phase);
        _obj.scale.setScalar(0.8 * s.scaleMult);
      } else {
        // Kelp Forests & Brine Pools: rising glowing spores drifting lazily
        s.y += spec.verticalSpeed * s.speedMult * dt;
        s.x += Math.sin(this.elapsed * 1.1 + s.phase) * spec.driftSpeed * dt;
        s.z += Math.cos(this.elapsed * 0.95 + s.phase) * spec.driftSpeed * dt;
        if (s.y > CEILING_Y) {
          s.y = 0.2 + Math.random() * 2.0;
          s.x = (Math.random() * 2 - 1) * ARENA_SPAN;
          s.z = (Math.random() * 2 - 1) * ARENA_SPAN;
        }
        const glow = 0.8 + 0.35 * Math.sin(this.elapsed * 4.5 + s.phase);
        _obj.position.set(s.x, s.y, s.z);
        _obj.rotation.set(s.phase, this.elapsed * 1.2, 0);
        _obj.scale.setScalar(0.85 * s.scaleMult * glow);
      }
      _obj.updateMatrix();
      this.primaryMesh.setMatrixAt(i, _obj.matrix);
    }

    // 2. Secondary Atmospheric Layer (Mist plumes, Floating Ash flakes, Steam clouds, Bubbles)
    for (let i = 0; i < sCount; i++) {
      const s = this.secondarySlots[i];
      if (spec.mode === 'rising_mist') {
        // Karst Towers & Cenotes: lush billowing mist rising from cenotes & weaving past limestone towers
        s.y += spec.verticalSpeed * 0.72 * s.speedMult * dt;
        s.x += Math.sin(this.elapsed * 0.55 + s.phase) * spec.driftSpeed * 1.1 * dt;
        s.z += Math.cos(this.elapsed * 0.45 + s.phase) * spec.driftSpeed * 0.9 * dt;
        if (s.y > 10.5) {
          s.y = 0.25 + Math.random() * 1.6;
          s.x = (Math.random() * 2 - 1) * (ARENA_SPAN + 2);
          s.z = (Math.random() * 2 - 1) * (ARENA_SPAN + 2);
        }
        const heightFade = Math.sin(Math.min(1, s.y / 10.5) * Math.PI);
        const puffScale = (2.1 + s.scaleMult * 1.9) * (0.45 + heightFade * 0.75);
        _obj.position.set(s.x, s.y, s.z);
        if (cameraQuaternion) _obj.quaternion.copy(cameraQuaternion);
        else _obj.rotation.set(0, s.phase, 0);
        _obj.scale.set(puffScale * 1.25, puffScale * 0.88, 1);
      } else if (spec.mode === 'embers_and_ash') {
        // Post-Wildfire Ashlands: tumbling floating charcoal/silver ash flakes drifting sideways & down
        s.y -= 0.75 * s.speedMult * dt;
        s.x += (Math.sin(this.elapsed * 1.5 + s.phase) * 1.2 + 0.95) * dt;
        s.z += Math.cos(this.elapsed * 1.2 + s.phase) * 0.85 * dt;
        if (s.y < 0.15) {
          s.y = CEILING_Y - Math.random() * 2.5;
          s.x = (Math.random() * 2 - 1) * ARENA_SPAN;
          s.z = (Math.random() * 2 - 1) * ARENA_SPAN;
        }
        if (s.x > ARENA_SPAN) s.x -= ARENA_SPAN * 2;
        _obj.position.set(s.x, s.y, s.z);
        _obj.rotation.set(
          this.elapsed * s.rotSpeedX + s.phase,
          this.elapsed * s.rotSpeedY,
          this.elapsed * 1.6
        );
        _obj.scale.set(0.28 * s.scaleMult, 0.18 * s.scaleMult, 0.28 * s.scaleMult);
      } else if (spec.mode === 'thermal_steam') {
        // Geothermal Rainbow Springs: rising sunlit steam clouds
        s.y += spec.verticalSpeed * 0.82 * s.speedMult * dt;
        s.x += Math.sin(this.elapsed * 0.7 + s.phase) * 0.7 * dt;
        if (s.y > 11.5) {
          s.y = 0.2 + Math.random() * 1.2;
          s.x = (Math.random() * 2 - 1) * ARENA_SPAN;
          s.z = (Math.random() * 2 - 1) * ARENA_SPAN;
        }
        const fade = Math.sin(Math.min(1, s.y / 11.5) * Math.PI);
        const puff = (1.6 + s.scaleMult * 1.5) * (0.4 + fade * 0.75);
        _obj.position.set(s.x, s.y, s.z);
        if (cameraQuaternion) _obj.quaternion.copy(cameraQuaternion);
        else _obj.rotation.set(0, s.phase, 0);
        _obj.scale.set(puff, puff * 1.15, 1);
      } else if (spec.mode === 'kelp_spores') {
        // Kelp Forests & Brine Pools: rising buoyant underwater bubbles
        s.y += spec.verticalSpeed * 1.25 * s.speedMult * dt;
        s.x += Math.sin(this.elapsed * 2.1 + s.phase) * 0.45 * dt;
        if (s.y > CEILING_Y) {
          s.y = 0.2 + Math.random() * 1.4;
          s.x = (Math.random() * 2 - 1) * ARENA_SPAN;
          s.z = (Math.random() * 2 - 1) * ARENA_SPAN;
        }
        const bScale = 0.36 + s.scaleMult * 0.34;
        _obj.position.set(s.x, s.y, s.z);
        if (cameraQuaternion) _obj.quaternion.copy(cameraQuaternion);
        else _obj.rotation.set(0, 0, 0);
        _obj.scale.set(bScale, bScale, 1);
      } else {
        // Salt Flats & Mirrors: subtle luminous crystal shimmer motes drifting down
        s.y += spec.verticalSpeed * 0.55 * s.speedMult * dt;
        s.x += Math.cos(this.elapsed * 0.8 + s.phase) * 0.55 * dt;
        if (s.y < 0.15) {
          s.y = CEILING_Y - Math.random() * 2.0;
          s.x = (Math.random() * 2 - 1) * ARENA_SPAN;
          s.z = (Math.random() * 2 - 1) * ARENA_SPAN;
        }
        const shimmer = 0.45 + s.scaleMult * 0.45;
        _obj.position.set(s.x, s.y, s.z);
        if (cameraQuaternion) _obj.quaternion.copy(cameraQuaternion);
        else _obj.rotation.set(0, 0, 0);
        _obj.scale.set(shimmer, shimmer, 1);
      }
      _obj.updateMatrix();
      this.secondaryMesh.setMatrixAt(i, _obj.matrix);
    }

    this.primaryMesh.instanceMatrix.needsUpdate = true;
    this.secondaryMesh.instanceMatrix.needsUpdate = true;
  }

  public dispose(): void {
    this.primaryMesh.geometry.dispose();
    (this.primaryMesh.material as THREE.Material).dispose();
    this.secondaryMesh.geometry.dispose();
    (this.secondaryMesh.material as THREE.Material).dispose();
    this.emberMesh.geometry.dispose();
    (this.emberMesh.material as THREE.Material).dispose();
    this.mistTexture.dispose();
  }
}
