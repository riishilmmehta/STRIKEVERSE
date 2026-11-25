import { useEffect, useRef, useState } from 'react';
import {
  STUDIO_LOGO_TOTAL_SEC,
  getStudioCinematicState,
} from '../game/openingSequence';
import {
  loadProcessedRedFlameLogo,
  type ProcessedRedFlameLogo,
} from './RedFlameLogoMark';

interface StudioLogoCinematicProps {
  onFlameWhoosh: () => void;
  onEmberCrackle: () => void;
  onBraamStamp: () => void;
  onComplete: () => void;
}

interface LogoParticle {
  /** Starting scatter position during flame wipe */
  startX: number;
  startY: number;
  /** Target normalized coordinate on the uploaded logo silhouette */
  nx: number;
  ny: number;
  size: number;
  delay: number;
  color: string;
  phase: number;
}

interface DriftEmber {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

const FLAME_COLORS = ['#dc2626', '#ef4444', '#f97316', '#f59e0b', '#facc15', '#fef08a'];

export function StudioLogoCinematic({
  onFlameWhoosh,
  onEmberCrackle,
  onBraamStamp,
  onComplete,
}: StudioLogoCinematicProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const completedRef = useRef(false);
  const canSkipRef = useRef(false);
  const [canSkip, setCanSkip] = useState(false);
  const [wordmarkOpacity, setWordmarkOpacity] = useState(0);
  const [wordmarkPulse, setWordmarkPulse] = useState(0);
  const [fadeOverlay, setFadeOverlay] = useState(0);

  const callbacksRef = useRef({
    onFlameWhoosh,
    onEmberCrackle,
    onBraamStamp,
    onComplete,
  });
  callbacksRef.current = {
    onFlameWhoosh,
    onEmberCrackle,
    onBraamStamp,
    onComplete,
  };

  const finishNow = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    callbacksRef.current.onComplete();
  };

  const handleSkipAttempt = () => {
    if (!canSkipRef.current) return;
    finishNow();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
        if (canSkipRef.current) {
          e.preventDefault();
          finishNow();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let logoAsset: ProcessedRedFlameLogo | null = null;
    const logoParticles: LogoParticle[] = [];
    const driftEmbers: DriftEmber[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
      canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const buildParticlesForLogo = (asset: ProcessedRedFlameLogo) => {
      logoParticles.length = 0;
      const pts = asset.targetPoints;
      const count = Math.min(340, Math.max(220, pts.length));
      for (let i = 0; i < count; i++) {
        const pt = pts[Math.floor((i / count) * pts.length) % pts.length];
        logoParticles.push({
          startX: -0.25 + Math.random() * 0.45,
          startY: 0.25 + Math.random() * 0.5,
          nx: pt.nx,
          ny: pt.ny,
          size: 1.6 + Math.random() * 3.1,
          delay: Math.random() * 1.35,
          color: FLAME_COLORS[i % FLAME_COLORS.length],
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    loadProcessedRedFlameLogo().then((loaded) => {
      logoAsset = loaded;
      buildParticlesForLogo(loaded);
    });

    const startTime = performance.now();
    let prevTime = startTime;
    let elapsed = 0;
    let firedWhoosh = false;
    let firedCrackle = false;
    let firedBraam = false;
    let lastReactSync = 0;

    const spawnEdgeEmber = (
      logoX: number,
      logoY: number,
      logoW: number,
      logoH: number
    ) => {
      if (driftEmbers.length > 95) return;
      let ex = logoX + logoW * (0.2 + Math.random() * 0.6);
      let ey = logoY + logoH * (0.15 + Math.random() * 0.75);
      if (logoAsset && logoAsset.targetPoints.length > 0) {
        const pt =
          logoAsset.targetPoints[
            Math.floor(Math.random() * logoAsset.targetPoints.length)
          ];
        ex = logoX + pt.nx * logoW;
        ey = logoY + pt.ny * logoH;
      }
      driftEmbers.push({
        x: ex,
        y: ey,
        vx: (Math.random() - 0.5) * 18,
        vy: -(14 + Math.random() * 28),
        size: 1.3 + Math.random() * 2.4,
        life: 0,
        maxLife: 1.8 + Math.random() * 2.1,
        color: FLAME_COLORS[2 + Math.floor(Math.random() * 4)],
      });
    };

    const tick = (now: number) => {
      if (completedRef.current) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - prevTime) / 1000));
      prevTime = now;

      elapsed += dt;
      const st = getStudioCinematicState(elapsed);

      // Sync exact audio cues to 20s slow-burn shot timestamps
      if (!firedWhoosh && elapsed >= 4.0) {
        firedWhoosh = true;
        callbacksRef.current.onFlameWhoosh();
      }
      if (!firedCrackle && elapsed >= 8.0) {
        firedCrackle = true;
        callbacksRef.current.onEmberCrackle();
      }
      if (!firedBraam && elapsed >= 15.0) {
        firedBraam = true;
        callbacksRef.current.onBraamStamp();
      }

      if (st.canSkip && !canSkipRef.current) {
        canSkipRef.current = true;
        setCanSkip(true);
      }

      // Throttled React sync (~20Hz) for crisp DOM wordmark burn-in & fade overlay
      if (now - lastReactSync > 45 || st.finished) {
        lastReactSync = now;
        setWordmarkOpacity(st.wordmarkReveal);
        setWordmarkPulse(st.lockupPulse);
        setFadeOverlay(st.fadeToBlack);
      }

      const w = window.innerWidth;
      const h = window.innerHeight;
      const cx = w * 0.5;
      const logoH = Math.min(230, Math.max(135, h * 0.28));
      const logoAspect = logoAsset ? logoAsset.width / Math.max(1, logoAsset.height) : 0.72;
      const logoW = logoH * logoAspect;
      const logoX = cx - logoW * 0.5;
      const logoY = h * 0.43 - logoH * 0.5;

      // 0. Pure black canvas background (#000000)
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = 'lighter';

      // ------------------------------------------------------------------
      // SHOT 1 (0.0s - 0.8s): Breathing dying coal ember at center of frame
      // ------------------------------------------------------------------
      if (st.emberGlow > 0.01) {
        const emberY = h * 0.47;
        const radius = 14 + st.emberGlow * 28;
        const halo = ctx.createRadialGradient(cx, emberY, 1, cx, emberY, radius * 4.5);
        halo.addColorStop(0, `rgba(254, 240, 138, ${0.95 * st.emberGlow})`);
        halo.addColorStop(0.22, `rgba(249, 115, 22, ${0.72 * st.emberGlow})`);
        halo.addColorStop(0.55, `rgba(220, 38, 38, ${0.32 * st.emberGlow})`);
        halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(cx, emberY, radius * 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Hot incandescent coal core
        ctx.fillStyle = `rgba(255, 245, 195, ${0.9 * st.emberGlow})`;
        ctx.beginPath();
        ctx.arc(cx, emberY, 3.5 + st.emberGlow * 3.5, 0, Math.PI * 2);
        ctx.fill();

        if (Math.random() < 0.22) {
          driftEmbers.push({
            x: cx + (Math.random() - 0.5) * 20,
            y: emberY + (Math.random() - 0.5) * 14,
            vx: (Math.random() - 0.5) * 10,
            vy: -(10 + Math.random() * 18),
            size: 1.1 + Math.random() * 1.6,
            life: 0,
            maxLife: 1.6,
            color: '#f97316',
          });
        }
      }

      // ------------------------------------------------------------------
      // SHOT 2 (4.0s - 8.0s): Slow dramatic fire sheet rips across left-to-right
      // ------------------------------------------------------------------
      if (elapsed >= 3.85 && elapsed <= 8.75) {
        const wp = st.wipeProgress;
        const frontX = -w * 0.15 + wp * (w * 1.45);
        const tailWidth = w * 0.62;
        const wipeIntensity =
          elapsed < 7.8
            ? Math.min(1, (elapsed - 3.85) / 0.55)
            : Math.max(0, 1 - (elapsed - 7.8) / 0.95);

        // Layered motion-blurred horizontal flame ribbons (strictly red -> orange -> gold)
        const ribbons = 9;
        for (let r = 0; r < ribbons; r++) {
          const ry = h * (0.12 + (r / (ribbons - 1)) * 0.76);
          const wave = Math.sin(elapsed * 5.5 + r * 1.7) * 26;
          const rFront = frontX - (r % 3) * 55 + wave;
          const rTail = rFront - tailWidth * (0.75 + (r % 4) * 0.12);
          const thickness = 38 + (r % 3) * 32;

          const grad = ctx.createLinearGradient(rTail, ry, rFront, ry);
          grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
          grad.addColorStop(0.28, `rgba(185, 28, 28, ${0.42 * wipeIntensity})`);
          grad.addColorStop(0.62, `rgba(234, 88, 12, ${0.72 * wipeIntensity})`);
          grad.addColorStop(0.86, `rgba(250, 204, 21, ${0.88 * wipeIntensity})`);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.ellipse(
            (rFront + rTail) * 0.5,
            ry + Math.cos(elapsed * 4.2 + r) * 14,
            Math.max(10, (rFront - rTail) * 0.52),
            thickness,
            -0.06,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }

        // Smooth motion-blurred fire streaks sweeping rightward
        for (let s = 0; s < 26; s++) {
          const sx = frontX - ((s * 43 + elapsed * 95) % (tailWidth * 0.95));
          const sy = h * ((s * 0.193) % 1);
          const len = 65 + (s % 5) * 32;
          ctx.strokeStyle =
            s % 3 === 0
              ? `rgba(254, 240, 138, ${0.65 * wipeIntensity})`
              : `rgba(249, 115, 22, ${0.55 * wipeIntensity})`;
          ctx.lineWidth = 1.5 + (s % 3);
          ctx.beginPath();
          ctx.moveTo(sx - len, sy + 4);
          ctx.lineTo(sx, sy);
          ctx.stroke();
        }
      }

      // ------------------------------------------------------------------
      // SHOTS 3-5 (8.0s - 18.0s): Slow particle logo formation + uploaded flame icon
      // ------------------------------------------------------------------
      if (elapsed >= 7.2) {
        const resolveT = st.logoResolve;
        const ambientGlow = 0.24 + st.lockupPulse * 0.36;

        // Warm ambient red-orange-gold aura behind the settled logo (single pulse at 15.0-18.0s)
        const auraR = logoH * (0.95 + st.lockupPulse * 0.28);
        const aura = ctx.createRadialGradient(
          cx,
          logoY + logoH * 0.52,
          logoH * 0.08,
          cx,
          logoY + logoH * 0.52,
          auraR
        );
        aura.addColorStop(0, `rgba(250, 204, 21, ${ambientGlow * resolveT * 0.55})`);
        aura.addColorStop(0.42, `rgba(234, 88, 12, ${ambientGlow * resolveT * 0.5})`);
        aura.addColorStop(0.75, `rgba(185, 28, 28, ${ambientGlow * resolveT * 0.25})`);
        aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(cx, logoY + logoH * 0.52, auraR, 0, Math.PI * 2);
        ctx.fill();

        // Draw the user's actual uploaded Red Flame logo resolving smoothly out of the fire particles
        if (logoAsset && resolveT > 0.15) {
          ctx.save();
          ctx.globalCompositeOperation = 'source-over';
          const iconAlpha = Math.min(1, Math.max(0, (resolveT - 0.15) / 0.85));
          const scaleBump = 1 + st.lockupPulse * 0.035;
          ctx.globalAlpha = iconAlpha;
          ctx.shadowColor = st.lockupPulse > 0.05 ? '#facc15' : '#f97316';
          ctx.shadowBlur = 18 + st.lockupPulse * 24;
          const dw = logoW * scaleBump;
          const dh = logoH * scaleBump;
          ctx.drawImage(
            logoAsset.canvas,
            cx - dw * 0.5,
            logoY + logoH * 0.5 - dh * 0.5,
            dw,
            dh
          );
          ctx.restore();
          ctx.globalCompositeOperation = 'lighter';
        }

        // Settling fire & ember particles forming the silhouette of the uploaded logo slowly
        const particleSparkFade = elapsed < 13.0 ? 1 : Math.max(0.2, 1 - (elapsed - 13.0) * 0.22);
        for (let i = 0; i < logoParticles.length; i++) {
          const p = logoParticles[i];
          const localT = Math.max(0, Math.min(1, (elapsed - 7.2 - p.delay) / 3.6));
          const ease = 1 - Math.pow(1 - localT, 3);
          const sx = p.startX * w;
          const sy = p.startY * h;
          const tx = logoX + p.nx * logoW;
          const ty = logoY + p.ny * logoH;
          const swirl = (1 - ease) * Math.sin(elapsed * 2.4 + p.phase) * 38;
          const px = sx + (tx - sx) * ease;
          const py = sy + (ty - sy) * ease + swirl;

          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.min(1, localT * 1.4) * particleSparkFade;
          ctx.beginPath();
          ctx.arc(px, py, p.size * (1.25 - ease * 0.45), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Continuous rising embers drifting upward off the edges of the logo
        if (elapsed < 18.6 && Math.random() < 0.48) {
          spawnEdgeEmber(logoX, logoY, logoW, logoH);
        }
      }

      // Update & draw rising drifting embers
      for (let i = driftEmbers.length - 1; i >= 0; i--) {
        const e = driftEmbers[i];
        e.life += dt;
        if (e.life >= e.maxLife) {
          driftEmbers.splice(i, 1);
          continue;
        }
        e.x += (e.vx + Math.sin(elapsed * 2.2 + i) * 10) * dt;
        e.y += e.vy * dt;
        const alpha = (1 - e.life / e.maxLife) * (1 - st.fadeToBlack);
        ctx.fillStyle = e.color;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * (1 - (e.life / e.maxLife) * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (st.finished || elapsed >= STUDIO_LOGO_TOTAL_SEC) {
        finishNow();
        return;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div
      data-testid="studio-logo-cinematic"
      onClick={handleSkipAttempt}
      role="presentation"
      className="fixed inset-0 z-50 bg-black overflow-hidden select-none cursor-pointer"
    >
      {/* Hidden SVG turbulence filter for subtle rough-edged heat-shimmer around "RED FLAME GAMES" */}
      <svg aria-hidden="true" className="absolute w-0 h-0 pointer-events-none">
        <defs>
          <filter id="rfg-heat-shimmer" x="-8%" y="-25%" width="116%" height="150%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.018 0.08"
              numOctaves="2"
              seed="7"
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                values="0.018 0.08;0.024 0.11;0.018 0.08"
                dur="1.4s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="2.6"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Real-time resolution-independent flame & logo particle canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full block" />

      {/* 2.4s-3.6s: "RED FLAME GAMES" singed burn-in wordmark with subtle heat shimmer */}
      <div
        className="fixed inset-x-0 flex flex-col items-center pointer-events-none"
        style={{
          top: '61%',
          opacity: wordmarkOpacity,
          transform: `translateY(${(1 - wordmarkOpacity) * 10}px) scale(${1 + wordmarkPulse * 0.025})`,
          transition: 'transform 100ms ease-out',
        }}
      >
        <h1
          className="font-display font-bold uppercase text-3xl sm:text-5xl tracking-[0.26em] text-center bg-gradient-to-b from-amber-200 via-orange-400 to-red-600 bg-clip-text text-transparent px-4"
          style={{
            filter: 'url(#rfg-heat-shimmer) drop-shadow(0 0 18px rgba(234, 88, 12, 0.72))',
          }}
        >
          RED FLAME GAMES
        </h1>
        <div
          className="mt-2.5 h-[2px] w-44 sm:w-64 bg-gradient-to-r from-transparent via-orange-500 to-transparent"
          style={{ opacity: 0.65 + wordmarkPulse * 0.35 }}
        />
      </div>

      {/* Subtle skippable affordance after 1.0s only */}
      {canSkip && fadeOverlay < 0.5 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            finishNow();
          }}
          aria-label="Skip Studio Intro"
          className="fixed bottom-6 right-6 z-20 px-3 py-1.5 text-[11px] font-display font-semibold uppercase tracking-[0.22em] text-amber-200/70 hover:text-amber-100 transition-colors cursor-pointer"
        >
          Tap to Skip
        </button>
      )}

      {/* 3.6s-4.0s Smooth fade to pure black */}
      {fadeOverlay > 0.01 && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-black pointer-events-none"
          style={{ opacity: fadeOverlay }}
        />
      )}
    </div>
  );
}
