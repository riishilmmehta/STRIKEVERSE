import * as THREE from 'three';
import type { HitVfxProfile, SlashArcProfile } from './combatVfx';

interface SparkSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  baseScale: number;
  isStreak: boolean;
  colorStart: THREE.Color;
  colorEnd: THREE.Color;
}

interface ImpactFlashSlot {
  group: THREE.Group;
  coreMat: THREE.MeshBasicMaterial;
  crossMat: THREE.MeshBasicMaterial;
  ringMat: THREE.MeshBasicMaterial;
  active: boolean;
  life: number;
  maxLife: number;
  maxScale: number;
}

interface SlashArcSlot {
  group: THREE.Group;
  outerMat: THREE.MeshBasicMaterial;
  innerMat: THREE.MeshBasicMaterial;
  active: boolean;
  life: number;
  maxLife: number;
  baseYaw: number;
  sweepDir: 1 | -1;
  tiltX: number;
  tiltZ: number;
}

// Pre-allocated Zero-GC math scratch helpers
const _dummy = new THREE.Object3D();
const _velDir = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();
const _color = new THREE.Color();

/**
 * Zero-GC pooled Three.js Combat Hit-Spark, Impact Starburst, and Dual-Layer Melee Slash-Arc system.
 * Uses high-contrast NormalBlending with bright white hot cores + saturated colored outer blades so
 * Light, Heavy, Finisher, and Parry impacts pop vividly even over bright sunlit arenas.
 */
export class HitVfxRenderer {
  private readonly scene: THREE.Scene;
  private readonly sparkCapacity = 240;
  private readonly sparkMesh: THREE.InstancedMesh;
  private readonly sparks: SparkSlot[] = [];
  private sparkCursor = 0;

  private readonly flashes: ImpactFlashSlot[] = [];
  private readonly slashArcs: SlashArcSlot[] = [];
  private readonly sharedGeos: THREE.BufferGeometry[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 1. Velocity-aligned elongated hit-spark needles (InstancedMesh, vivid NormalBlending)
    const sparkGeo = new THREE.OctahedronGeometry(0.11, 0);
    sparkGeo.scale(0.68, 4.1, 0.68); // Crisp elongated spark needle along +Y
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.96,
      blending: THREE.NormalBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.sparkMesh = new THREE.InstancedMesh(sparkGeo, sparkMat, this.sparkCapacity);
    this.sparkMesh.frustumCulled = false;
    this.sparkMesh.renderOrder = 8;

    for (let i = 0; i < this.sparkCapacity; i++) {
      this.sparks.push({
        active: false,
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.34,
        baseScale: 1,
        isStreak: true,
        colorStart: new THREE.Color('#fef08a'),
        colorEnd: new THREE.Color('#ea580c'),
      });
      _dummy.position.set(0, -100, 0);
      _dummy.scale.setScalar(0);
      _dummy.updateMatrix();
      this.sparkMesh.setMatrixAt(i, _dummy.matrix);
      this.sparkMesh.setColorAt(i, _color.set('#f59e0b'));
    }
    this.scene.add(this.sparkMesh);

    // 2. Impact Contact Starburst Flash Pool (8 high-contrast white-core + vivid cross-blade + impact ring clusters)
    const starCoreGeo = new THREE.OctahedronGeometry(0.32, 0);
    const bladeGeo = new THREE.PlaneGeometry(1.75, 0.22);
    const burstRingGeo = new THREE.RingGeometry(0.68, 0.94, 24);
    this.sharedGeos.push(starCoreGeo, bladeGeo, burstRingGeo);

    for (let i = 0; i < 8; i++) {
      const group = new THREE.Group();
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.NormalBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const crossMat = new THREE.MeshBasicMaterial({
        color: 0xf97316,
        transparent: true,
        opacity: 0,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      });
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      });

      const core = new THREE.Mesh(starCoreGeo, coreMat);
      const bladeA = new THREE.Mesh(bladeGeo, crossMat);
      const bladeB = new THREE.Mesh(bladeGeo, crossMat);
      bladeB.rotation.z = Math.PI / 2;
      const bladeC = new THREE.Mesh(bladeGeo, crossMat);
      bladeC.rotation.y = Math.PI / 2;
      bladeC.rotation.x = Math.PI / 4;
      const bladeD = new THREE.Mesh(bladeGeo, crossMat);
      bladeD.rotation.z = Math.PI / 4;
      bladeD.scale.set(0.82, 0.82, 1);
      const ring = new THREE.Mesh(burstRingGeo, ringMat);

      group.add(core, bladeA, bladeB, bladeC, bladeD, ring);
      group.visible = false;
      group.renderOrder = 9;
      this.scene.add(group);

      this.flashes.push({
        group,
        coreMat,
        crossMat,
        ringMat,
        active: false,
        life: 0,
        maxLife: 0.18,
        maxScale: 1.6,
      });
    }

    // 3. Dual-Layer Melee Weapon Slash-Arc Trail Pool (6 saturated outer arc + bright white inner core)
    const outerArcGeo = new THREE.RingGeometry(0.58, 1.0, 24, 1, -Math.PI * 0.58, Math.PI * 1.16);
    outerArcGeo.rotateX(-Math.PI / 2);
    const innerArcGeo = new THREE.RingGeometry(0.76, 0.96, 24, 1, -Math.PI * 0.52, Math.PI * 1.04);
    innerArcGeo.rotateX(-Math.PI / 2);
    this.sharedGeos.push(outerArcGeo, innerArcGeo);

    for (let i = 0; i < 6; i++) {
      const group = new THREE.Group();
      const outerMat = new THREE.MeshBasicMaterial({
        color: 0xf97316,
        transparent: true,
        opacity: 0,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      });
      const innerMat = new THREE.MeshBasicMaterial({
        color: 0xfffbeb,
        transparent: true,
        opacity: 0,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      });
      const outerMesh = new THREE.Mesh(outerArcGeo, outerMat);
      const innerMesh = new THREE.Mesh(innerArcGeo, innerMat);
      innerMesh.position.y = 0.025;
      group.add(outerMesh, innerMesh);
      group.visible = false;
      group.renderOrder = 7;
      this.scene.add(group);
      this.slashArcs.push({
        group,
        outerMat,
        innerMat,
        active: false,
        life: 0,
        maxLife: 0.22,
        baseYaw: 0,
        sweepDir: 1,
        tiltX: 0,
        tiltZ: 0,
      });
    }
  }

  public spawnSlashArc(
    x: number,
    y: number,
    z: number,
    yaw: number,
    profile: SlashArcProfile,
    colorHex: string
  ): void {
    const slot = this.slashArcs.find((s) => !s.active) ?? this.slashArcs[0];
    slot.active = true;
    slot.life = 0;
    slot.maxLife = profile.duration;
    slot.baseYaw = yaw;
    slot.sweepDir = profile.sweepDir;
    slot.tiltX = profile.tiltX;
    slot.tiltZ = profile.tiltZ;

    slot.group.position.set(x, y + profile.yOffset, z);
    slot.group.scale.setScalar(profile.radius);
    slot.group.rotation.order = 'YXZ';
    slot.group.rotation.set(profile.tiltX, yaw - profile.sweepDir * 0.72, profile.tiltZ);
    slot.outerMat.color.set(colorHex);
    slot.outerMat.opacity = 0.92;
    slot.innerMat.opacity = 0.96;
    slot.group.visible = true;
  }

  public spawnHitImpact(
    x: number,
    y: number,
    z: number,
    dirX: number,
    dirZ: number,
    profile: HitVfxProfile
  ): void {
    // A. Bright Contact Starburst Flash + Ring right at impact point
    const flash = this.flashes.find((f) => !f.active) ?? this.flashes[0];
    flash.active = true;
    flash.life = 0;
    flash.maxLife = profile.kind === 'light' ? 0.16 : 0.24;
    flash.maxScale = profile.flashScale * 1.15;
    flash.group.position.set(x, y, z);
    flash.group.rotation.set(
      (Math.random() - 0.5) * 0.5,
      Math.atan2(dirX, dirZ),
      Math.random() * Math.PI
    );
    flash.group.scale.setScalar(0.45);
    flash.coreMat.color.set('#ffffff');
    flash.coreMat.opacity = 1.0;
    flash.crossMat.color.set(profile.secondaryColor);
    flash.crossMat.opacity = 0.96;
    flash.ringMat.color.set(profile.secondaryColor);
    flash.ringMat.opacity = 0.88;
    flash.group.visible = true;

    // B. Directional Spray + Radial Ring of Velocity-Aligned Hit-Sparks
    const count = profile.sparkCount;
    for (let i = 0; i < count; i++) {
      const slot = this.sparks[this.sparkCursor];
      this.sparkCursor = (this.sparkCursor + 1) % this.sparkCapacity;

      const isConeSpray = i < count * 0.68;
      let vx: number;
      let vy: number;
      let vz: number;

      if (isConeSpray) {
        // Directional impact spray biased along strike direction
        const spreadAngle = (Math.random() - 0.5) * 1.5;
        const cosA = Math.cos(spreadAngle);
        const sinA = Math.sin(spreadAngle);
        const rx = dirX * cosA - dirZ * sinA;
        const rz = dirX * sinA + dirZ * cosA;
        const spd = profile.sparkSpeed * (0.55 + Math.random() * 0.78);
        vx = rx * spd;
        vz = rz * spd;
        vy = (Math.random() - 0.1) * spd * 0.85 + 2.4;
      } else {
        // Full 360-degree explosive impact burst
        const ang = (i / Math.max(1, count * 0.32)) * Math.PI * 2 + Math.random() * 0.35;
        const spd = profile.sparkSpeed * (0.42 + Math.random() * 0.58);
        vx = Math.cos(ang) * spd;
        vz = Math.sin(ang) * spd;
        vy = 1.8 + Math.random() * spd * 0.65;
      }

      slot.active = true;
      slot.x = x + (Math.random() - 0.5) * 0.24;
      slot.y = y + (Math.random() - 0.5) * 0.24;
      slot.z = z + (Math.random() - 0.5) * 0.24;
      slot.vx = vx;
      slot.vy = vy;
      slot.vz = vz;
      slot.life = 0;
      slot.maxLife = (profile.kind === 'light' ? 0.28 : 0.42) + Math.random() * 0.2;
      slot.baseScale = (profile.kind === 'light' ? 0.95 : 1.35) + Math.random() * 0.55;
      slot.isStreak = isConeSpray;
      // Blend from bright gold/primary to vivid saturated secondary so sparks pop against daylight floors
      slot.colorStart.set(i % 3 === 0 ? profile.primaryColor : profile.secondaryColor);
      slot.colorEnd.set(profile.secondaryColor);
    }
  }

  public update(dt: number): void {
    // 1. Update Dual-Layer Slash-Arc Sweeps
    for (const s of this.slashArcs) {
      if (!s.active) continue;
      s.life += dt;
      const t = s.life / s.maxLife;
      if (t >= 1) {
        s.active = false;
        s.group.visible = false;
      } else {
        const ease = 1 - (1 - t) * (1 - t);
        s.group.rotation.y = s.baseYaw + s.sweepDir * (-0.75 + ease * 1.95);
        const fade = 1 - t * t;
        s.outerMat.opacity = fade * 0.9;
        s.innerMat.opacity = fade * 0.95;
      }
    }

    // 2. Update Contact Starburst Flashes
    for (const f of this.flashes) {
      if (!f.active) continue;
      f.life += dt;
      const t = f.life / f.maxLife;
      if (t >= 1) {
        f.active = false;
        f.group.visible = false;
      } else {
        const pop = Math.sin(Math.min(1, t * 2.2) * (Math.PI / 2));
        f.group.scale.setScalar(0.42 + pop * f.maxScale);
        f.group.rotation.z += dt * 7.5;
        const fade = 1 - t * t;
        f.coreMat.opacity = fade;
        f.crossMat.opacity = fade * 0.94;
        f.ringMat.opacity = (1 - t) * 0.85;
      }
    }

    // 3. Update Velocity-Aligned Hit-Sparks (Zero-GC InstancedMesh)
    let dirty = false;
    for (let i = 0; i < this.sparkCapacity; i++) {
      const slot = this.sparks[i];
      if (!slot.active) continue;
      dirty = true;
      slot.life += dt;
      const t = slot.life / slot.maxLife;
      if (t >= 1) {
        slot.active = false;
        _dummy.position.set(0, -100, 0);
        _dummy.scale.setScalar(0);
        _dummy.updateMatrix();
        this.sparkMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }

      // Gravity + drag + crisp ground ricochet
      slot.vy -= 18.5 * dt;
      const drag = Math.exp(-3.1 * dt);
      slot.vx *= drag;
      slot.vz *= drag;
      slot.x += slot.vx * dt;
      slot.y += slot.vy * dt;
      slot.z += slot.vz * dt;
      if (slot.y < 0.06) {
        slot.y = 0.06;
        slot.vy = Math.abs(slot.vy) * 0.44;
      }

      _velDir.set(slot.vx, slot.vy, slot.vz);
      const spd = _velDir.length();
      if (spd > 0.01) {
        _velDir.divideScalar(spd);
        _quat.setFromUnitVectors(_upAxis, _velDir);
      } else {
        _quat.identity();
      }

      const fade = 1 - t * 0.85;
      const thickness = slot.baseScale * fade;
      const lengthStretch = slot.isStreak
        ? Math.max(0.65, Math.min(2.6, spd * 0.18)) * slot.baseScale * fade
        : thickness;

      _dummy.position.set(slot.x, slot.y, slot.z);
      _dummy.quaternion.copy(_quat);
      _dummy.scale.set(thickness, lengthStretch, thickness);
      _dummy.updateMatrix();
      this.sparkMesh.setMatrixAt(i, _dummy.matrix);

      _color.copy(slot.colorStart).lerp(slot.colorEnd, Math.min(1, t * 1.6));
      this.sparkMesh.setColorAt(i, _color);
    }

    if (dirty) {
      this.sparkMesh.instanceMatrix.needsUpdate = true;
      if (this.sparkMesh.instanceColor) {
        this.sparkMesh.instanceColor.needsUpdate = true;
      }
    }
  }

  public dispose(): void {
    this.scene.remove(this.sparkMesh);
    this.sparkMesh.geometry.dispose();
    (this.sparkMesh.material as THREE.Material).dispose();

    for (const f of this.flashes) {
      this.scene.remove(f.group);
      f.coreMat.dispose();
      f.crossMat.dispose();
      f.ringMat.dispose();
    }
    for (const s of this.slashArcs) {
      this.scene.remove(s.group);
      s.outerMat.dispose();
      s.innerMat.dispose();
    }
    for (const g of this.sharedGeos) {
      g.dispose();
    }
  }
}
