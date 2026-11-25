import * as THREE from 'three';
import { DOJO_WEATHER_SPECS } from './dojoWeather';
import type { DojoWeatherId } from './types';

interface WeatherParticleSlot {
  x: number;
  y: number;
  z: number;
  phase: number;
  speedMult: number;
  rotSpeedX: number;
  rotSpeedZ: number;
  colorIdx: number;
}

const MAX_WEATHER_PARTICLES = 180;
const WEATHER_HALF_SPAN = 20;
const WEATHER_CEILING_Y = 14.5;

// Reusable scratch transforms (Zero-GC per-frame update)
const _wObj = new THREE.Object3D();
const _wColor = new THREE.Color();

/**
 * Zero-GC pooled Three.js InstancedMesh ambient weather system for Dojo plots.
 * Supports Cherry Blossom Rain petals, Sunset Gloom drifting embers, and Neon Night rain streaks.
 */
export class DojoWeatherRenderer {
  private readonly mesh: THREE.InstancedMesh;
  private readonly slots: WeatherParticleSlot[] = [];
  private activeWeather: DojoWeatherId = 'clear_day';
  private enabled = false;
  private elapsed = 0;

  constructor(scene: THREE.Scene) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX_WEATHER_PARTICLES);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;

    for (let i = 0; i < MAX_WEATHER_PARTICLES; i++) {
      this.slots.push({
        x: (Math.random() * 2 - 1) * WEATHER_HALF_SPAN,
        y: Math.random() * WEATHER_CEILING_Y,
        z: (Math.random() * 2 - 1) * WEATHER_HALF_SPAN,
        phase: Math.random() * Math.PI * 2,
        speedMult: 0.72 + Math.random() * 0.62,
        rotSpeedX: (Math.random() - 0.5) * 3.8,
        rotSpeedZ: (Math.random() - 0.5) * 3.8,
        colorIdx: i % 3,
      });
      _wObj.position.set(0, -100, 0);
      _wObj.scale.setScalar(0);
      _wObj.updateMatrix();
      this.mesh.setMatrixAt(i, _wObj.matrix);
      this.mesh.setColorAt(i, _wColor.set('#ffffff'));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    scene.add(this.mesh);
  }

  public configure(weather: DojoWeatherId, enabled: boolean): void {
    this.activeWeather = weather;
    this.enabled = enabled;
    const spec = DOJO_WEATHER_SPECS[weather];
    const shouldShow = enabled && spec.particleMode !== 'none' && spec.particleCount > 0;
    this.mesh.visible = shouldShow;

    if (!shouldShow) return;

    const mat = this.mesh.material as THREE.MeshBasicMaterial;
    mat.opacity =
      spec.particleMode === 'neon_rain'
        ? 0.78
        : spec.particleMode === 'embers'
          ? 0.9
          : 0.92;

    const count = Math.min(MAX_WEATHER_PARTICLES, spec.particleCount);
    for (let i = 0; i < MAX_WEATHER_PARTICLES; i++) {
      if (i >= count) {
        _wObj.position.set(0, -100, 0);
        _wObj.scale.setScalar(0);
        _wObj.updateMatrix();
        this.mesh.setMatrixAt(i, _wObj.matrix);
      } else {
        const s = this.slots[i];
        _wColor.set(spec.particleColors[s.colorIdx % spec.particleColors.length]);
        this.mesh.setColorAt(i, _wColor);
      }
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.update(0.016);
  }

  public update(dt: number): void {
    if (!this.enabled || !this.mesh.visible) return;
    const spec = DOJO_WEATHER_SPECS[this.activeWeather];
    const count = Math.min(MAX_WEATHER_PARTICLES, spec.particleCount);
    if (count <= 0 || spec.particleMode === 'none') return;

    this.elapsed += dt;
    const mode = spec.particleMode;

    for (let i = 0; i < count; i++) {
      const s = this.slots[i];
      if (mode === 'petals') {
        // Gentle fluttering sakura petals spiraling down
        s.y -= spec.fallSpeed * s.speedMult * dt;
        s.x += (Math.sin(this.elapsed * 1.6 + s.phase) * spec.driftSpeed + 0.65) * dt;
        s.z += Math.cos(this.elapsed * 1.3 + s.phase * 1.4) * spec.driftSpeed * 0.75 * dt;
        if (s.y < 0.08) {
          s.y = WEATHER_CEILING_Y - Math.random() * 2.0;
          s.x = (Math.random() * 2 - 1) * WEATHER_HALF_SPAN;
          s.z = (Math.random() * 2 - 1) * WEATHER_HALF_SPAN;
        }
        _wObj.position.set(s.x, s.y, s.z);
        _wObj.rotation.set(
          this.elapsed * s.rotSpeedX + s.phase,
          this.elapsed * 0.9 + s.phase,
          this.elapsed * s.rotSpeedZ
        );
        _wObj.scale.set(0.24, 0.035, 0.17);
      } else if (mode === 'embers') {
        // Sunset Gloom: warm rising/drifting embers & twilight sparks
        s.y += (Math.sin(this.elapsed * 0.8 + s.phase) * 0.55 + 0.52) * spec.fallSpeed * s.speedMult * dt;
        s.x += (spec.driftSpeed * 0.65 + Math.sin(this.elapsed * 1.9 + s.phase) * 0.7) * dt;
        s.z += Math.cos(this.elapsed * 1.1 + s.phase) * 0.85 * dt;
        if (s.y > WEATHER_CEILING_Y || s.y < 0.15) {
          s.y = 0.25 + Math.random() * 3.5;
          s.x = (Math.random() * 2 - 1) * WEATHER_HALF_SPAN;
          s.z = (Math.random() * 2 - 1) * WEATHER_HALF_SPAN;
        }
        if (s.x > WEATHER_HALF_SPAN) s.x -= WEATHER_HALF_SPAN * 2;
        const pulse = 0.75 + 0.35 * Math.sin(this.elapsed * 5.2 + s.phase);
        _wObj.position.set(s.x, s.y, s.z);
        _wObj.rotation.set(s.phase, this.elapsed * 1.8, s.phase * 0.5);
        _wObj.scale.set(0.11 * pulse, 0.11 * pulse, 0.11 * pulse);
      } else {
        // Neon Night: crisp diagonal cyberpunk rain streaks
        s.y -= spec.fallSpeed * s.speedMult * dt;
        s.x += spec.driftSpeed * dt;
        if (s.y < 0.15) {
          s.y = WEATHER_CEILING_Y + Math.random() * 3.0;
          s.x = (Math.random() * 2 - 1) * WEATHER_HALF_SPAN;
          s.z = (Math.random() * 2 - 1) * WEATHER_HALF_SPAN;
        }
        if (s.x > WEATHER_HALF_SPAN) s.x -= WEATHER_HALF_SPAN * 2;
        _wObj.position.set(s.x, s.y, s.z);
        _wObj.rotation.set(0, 0, -0.14);
        _wObj.scale.set(0.036, 0.92, 0.036);
      }
      _wObj.updateMatrix();
      this.mesh.setMatrixAt(i, _wObj.matrix);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
