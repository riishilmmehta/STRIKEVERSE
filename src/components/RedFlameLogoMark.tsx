import { useEffect, useState } from 'react';
import { RED_FLAME_LOGO_SRC } from '../game/openingSequence';

export interface ProcessedRedFlameLogo {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  width: number;
  height: number;
  /** Normalized [0..1, 0..1] silhouette points sampled strictly on the uploaded logo shape */
  targetPoints: Array<{ nx: number; ny: number }>;
}

let cachedLogoPromise: Promise<ProcessedRedFlameLogo> | null = null;

function buildFallbackLogo(): ProcessedRedFlameLogo {
  const w = 180;
  const h = 240;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const targetPoints: Array<{ nx: number; ny: number }> = [];
  if (ctx) {
    const grad = ctx.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, '#dc2626');
    grad.addColorStop(0.55, '#f97316');
    grad.addColorStop(1, '#facc15');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(w * 0.48, h * 0.04);
    ctx.bezierCurveTo(w * 0.72, h * 0.32, w * 0.35, h * 0.52, w * 0.45, h * 0.94);
    ctx.bezierCurveTo(w * 0.08, h * 0.75, w * 0.14, h * 0.38, w * 0.48, h * 0.04);
    ctx.fill();
    for (let i = 0; i < 220; i++) {
      const a = (i / 220) * Math.PI * 2;
      targetPoints.push({
        nx: 0.5 + Math.cos(a) * 0.25 * (0.4 + Math.random() * 0.6),
        ny: 0.5 + Math.sin(a) * 0.38 * (0.4 + Math.random() * 0.6),
      });
    }
  }
  return { canvas, dataUrl: canvas.toDataURL('image/png'), width: w, height: h, targetPoints };
}

/**
 * Loads the user's uploaded Red Flame logo (/assets/aistudio/image_a17ea6b2.png),
 * removes its solid white RGB background via chroma-red alpha extraction, auto-crops
 * tightly around the flame icon, applies the strict red -> orange -> gold brand gradient,
 * and samples exact silhouette points for real-time particle convergence.
 */
export function loadProcessedRedFlameLogo(): Promise<ProcessedRedFlameLogo> {
  if (cachedLogoPromise) return cachedLogoPromise;

  cachedLogoPromise = new Promise<ProcessedRedFlameLogo>((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve(buildFallbackLogo());
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const srcW = img.naturalWidth || img.width;
        const srcH = img.naturalHeight || img.height;
        const raw = document.createElement('canvas');
        raw.width = srcW;
        raw.height = srcH;
        const rctx = raw.getContext('2d');
        if (!rctx) {
          resolve(buildFallbackLogo());
          return;
        }
        rctx.drawImage(img, 0, 0);
        const imgData = rctx.getImageData(0, 0, srcW, srcH);
        const d = imgData.data;

        let minX = srcW;
        let minY = srcH;
        let maxX = 0;
        let maxY = 0;

        // Extract pure flame alpha by measuring chroma redness vs white background
        for (let y = 0; y < srcH; y++) {
          for (let x = 0; x < srcW; x++) {
            const idx = (y * srcW + x) * 4;
            const r = d[idx];
            const g = d[idx + 1];
            const b = d[idx + 2];
            const redness = r - Math.max(g, b);
            const alpha = Math.max(0, Math.min(255, Math.round(redness * 1.45)));
            d[idx + 3] = alpha;
            if (alpha > 24) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxX <= minX || maxY <= minY) {
          resolve(buildFallbackLogo());
          return;
        }

        const pad = 6;
        minX = Math.max(0, minX - pad);
        minY = Math.max(0, minY - pad);
        maxX = Math.min(srcW - 1, maxX + pad);
        maxY = Math.min(srcH - 1, maxY + pad);
        const cropW = maxX - minX + 1;
        const cropH = maxY - minY + 1;

        // Apply rich red -> orange -> gold vertical brand gradient strictly inside extracted flame pixels
        for (let y = minY; y <= maxY; y++) {
          const ny = (y - minY) / Math.max(1, cropH - 1); // 0 top (gold/orange) -> 1 bottom (deep red)
          // Smooth flame palette: bottom deep crimson #dc2626 -> mid blazing orange #f97316 -> tips bright gold #facc15
          let cr = 220;
          let cg = 38;
          let cb = 24;
          if (ny < 0.35) {
            const t = ny / 0.35;
            cr = Math.round(252 - t * 3);
            cg = Math.round(204 - t * 88);
            cb = Math.round(38 - t * 16);
          } else {
            const t = (ny - 0.35) / 0.65;
            cr = Math.round(249 - t * 29);
            cg = Math.round(116 - t * 84);
            cb = Math.round(22 - t * 8);
          }
          for (let x = minX; x <= maxX; x++) {
            const idx = (y * srcW + x) * 4;
            if (d[idx + 3] > 0) {
              d[idx] = cr;
              d[idx + 1] = cg;
              d[idx + 2] = cb;
            }
          }
        }

        rctx.putImageData(imgData, 0, 0);

        const cropped = document.createElement('canvas');
        cropped.width = cropW;
        cropped.height = cropH;
        const cctx = cropped.getContext('2d');
        if (!cctx) {
          resolve(buildFallbackLogo());
          return;
        }
        cctx.drawImage(raw, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

        // Sample silhouette target coordinates for real-time particle formation
        const sampled: Array<{ nx: number; ny: number }> = [];
        const step = Math.max(3, Math.floor(Math.min(cropW, cropH) / 42));
        for (let y = minY; y <= maxY; y += step) {
          for (let x = minX; x <= maxX; x += step) {
            const idx = (y * srcW + x) * 4;
            if (d[idx + 3] > 140) {
              sampled.push({
                nx: (x - minX) / cropW,
                ny: (y - minY) / cropH,
              });
            }
          }
        }

        resolve({
          canvas: cropped,
          dataUrl: cropped.toDataURL('image/png'),
          width: cropW,
          height: cropH,
          targetPoints: sampled.length > 0 ? sampled : buildFallbackLogo().targetPoints,
        });
      } catch {
        resolve(buildFallbackLogo());
      }
    };
    img.onerror = () => resolve(buildFallbackLogo());
    img.src = RED_FLAME_LOGO_SRC;
  });

  return cachedLogoPromise;
}

interface RedFlameWordmarkProps {
  compact?: boolean;
  className?: string;
}

/**
 * Static, crisp Red Flame Games studio icon + wordmark lockup for loading screens and footer credits.
 * Uses the user's uploaded flame logo cleanly extracted onto transparent alpha with strict red/orange/gold palette.
 */
export function RedFlameWordmark({ compact = false, className = '' }: RedFlameWordmarkProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadProcessedRedFlameLogo().then((res) => {
      if (active) setLogoUrl(res.dataUrl);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt="Red Flame Games Emblem"
          referrerPolicy="no-referrer"
          className={`${compact ? 'h-7' : 'h-9'} w-auto object-contain drop-shadow-[0_0_8px_rgba(249,115,22,0.55)]`}
        />
      ) : (
        <span
          aria-hidden="true"
          className={`${compact ? 'w-5 h-7' : 'w-6 h-9'} inline-block bg-gradient-to-t from-red-600 via-orange-500 to-amber-300`}
        />
      )}
      <div className="leading-none">
        <div
          className={`font-display font-bold uppercase tracking-[0.2em] bg-gradient-to-r from-amber-300 via-orange-400 to-red-500 bg-clip-text text-transparent ${
            compact ? 'text-xs' : 'text-sm'
          }`}
        >
          RED FLAME
        </div>
        <div
          className={`font-display font-semibold uppercase tracking-[0.34em] text-amber-100/75 mt-0.5 ${
            compact ? 'text-[9px]' : 'text-[10px]'
          }`}
        >
          GAMES
        </div>
      </div>
    </div>
  );
}
