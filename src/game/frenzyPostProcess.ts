import * as THREE from 'three';

export interface FrenzyRenderParams {
  intensity: number;
  chromaticOffset: number;
  distortionStrength: number;
  vignetteStrength: number;
  timeSec: number;
  auraHex: string;
}

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float uIntensity;
  uniform float uChromatic;
  uniform float uDistortion;
  uniform float uVignette;
  uniform float uTime;
  uniform vec3 uAuraColor;

  varying vec2 vUv;

  void main() {
    vec2 centered = vUv - 0.5;
    float dist = length(centered);
    float r2 = dist * dist;

    // Subtle radial barrel distortion that scales with combo frenzy while keeping center sharp.
    // Slightly zooms inward proportional to distortion so edges never clamp-smear.
    float zoomComp = 1.0 - uDistortion * 0.22;
    vec2 warpedUv = 0.5 + centered * zoomComp * (1.0 + uDistortion * r2 * 2.5);

    // Radial chromatic aberration (RGB channel split strongest toward peripheral edges)
    vec2 radialDir = dist > 0.0001 ? centered / dist : vec2(0.0);
    float shimmer = 1.0 + sin(uTime * 14.0 + dist * 9.0) * 0.08 * uIntensity;
    float edgeWeight = 0.18 + pow(clamp(dist * 1.42, 0.0, 1.0), 1.35) * 1.32;
    vec2 caShift = radialDir * (uChromatic * edgeWeight * shimmer);

    vec2 uvR = clamp(warpedUv + caShift, vec2(0.001), vec2(0.999));
    vec2 uvG = clamp(warpedUv, vec2(0.001), vec2(0.999));
    vec2 uvB = clamp(warpedUv - caShift, vec2(0.001), vec2(0.999));

    float r = texture2D(tDiffuse, uvR).r;
    float g = texture2D(tDiffuse, uvG).g;
    float b = texture2D(tDiffuse, uvB).b;
    vec3 color = vec3(r, g, b);

    // Subtle peripheral frenzy energy focus + aura rim pulse at higher combo chains
    float rimMask = smoothstep(0.30, 0.88, dist);
    float pulse = 0.88 + 0.12 * sin(uTime * 10.5);
    color *= 1.0 - rimMask * uVignette * 0.58;
    color += uAuraColor * (rimMask * rimMask * uVignette * 0.32 * pulse);

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/**
 * Zero-GC lightweight post-processing pass for Combo Frenzy camera barrel distortion
 * and radial chromatic aberration. Automatically bypasses to a direct screen draw when
 * frenzy intensity is near zero so idle exploration pays zero extra GPU cost.
 */
export class FrenzyPostProcess {
  private target: THREE.WebGLRenderTarget;
  private readonly postScene: THREE.Scene;
  private readonly postCamera: THREE.OrthographicCamera;
  private readonly material: THREE.ShaderMaterial;
  private readonly quad: THREE.Mesh;
  private readonly auraColor = new THREE.Color('#f59e0b');

  constructor(width: number, height: number, pixelRatio: number) {
    const rtW = Math.max(1, Math.floor(width * pixelRatio));
    const rtH = Math.max(1, Math.floor(height * pixelRatio));

    this.target = new THREE.WebGLRenderTarget(rtW, rtH, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false,
    });
    this.target.texture.colorSpace = THREE.LinearSRGBColorSpace;

    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.target.texture },
        uIntensity: { value: 0 },
        uChromatic: { value: 0 },
        uDistortion: { value: 0 },
        uVignette: { value: 0 },
        uTime: { value: 0 },
        uAuraColor: { value: this.auraColor },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      depthTest: false,
      depthWrite: false,
      toneMapped: true,
    });

    const geo = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(geo, this.material);
    this.quad.frustumCulled = false;
    this.postScene.add(this.quad);
  }

  public resize(width: number, height: number, pixelRatio: number): void {
    const rtW = Math.max(1, Math.floor(width * pixelRatio));
    const rtH = Math.max(1, Math.floor(height * pixelRatio));
    this.target.setSize(rtW, rtH);
  }

  public render(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    params: FrenzyRenderParams
  ): void {
    if (params.intensity <= 0.002) {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
      return;
    }

    // 1. Render 3D scene into offscreen linear target
    renderer.setRenderTarget(this.target);
    renderer.render(scene, camera);

    // 2. Apply radial distortion + chromatic aberration + ACES tone mapping to screen
    this.auraColor.set(params.auraHex);
    this.material.uniforms.uIntensity.value = params.intensity;
    this.material.uniforms.uChromatic.value = params.chromaticOffset;
    this.material.uniforms.uDistortion.value = params.distortionStrength;
    this.material.uniforms.uVignette.value = params.vignetteStrength;
    this.material.uniforms.uTime.value = params.timeSec;

    renderer.setRenderTarget(null);
    renderer.render(this.postScene, this.postCamera);
  }

  public dispose(): void {
    this.target.dispose();
    this.quad.geometry.dispose();
    this.material.dispose();
  }
}
