import type {
  ClanEmblemConfig,
  ClanEmblemIconId,
  ClanEmblemPatternId,
  ClanEmblemShapeId,
} from './types';

export interface EmblemOption<T extends string> {
  id: T;
  label: string;
}

export interface EmblemColorSwatch {
  hex: string;
  label: string;
}

export const CLAN_EMBLEM_SHAPES: EmblemOption<ClanEmblemShapeId>[] = [
  { id: 'shield', label: 'Shield' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'hex', label: 'Hexagon' },
  { id: 'circle', label: 'Medallion' },
  { id: 'pennant', label: 'Pennant' },
  { id: 'crest', label: 'Winged Crest' },
];

export const CLAN_EMBLEM_PATTERNS: EmblemOption<ClanEmblemPatternId>[] = [
  { id: 'solid', label: 'Solid' },
  { id: 'split', label: 'Half Split' },
  { id: 'chevron', label: 'Chevron' },
  { id: 'stripe', label: 'Center Stripe' },
  { id: 'rays', label: 'Sun Rays' },
];

export const CLAN_EMBLEM_ICONS: EmblemOption<ClanEmblemIconId>[] = [
  { id: 'katana', label: 'Twin Blades' },
  { id: 'lightning', label: 'Bolt' },
  { id: 'lotus', label: 'Lotus' },
  { id: 'fist', label: 'Strike Fist' },
  { id: 'crown', label: 'Crown' },
  { id: 'shuriken', label: 'Shuriken' },
  { id: 'dragon_claw', label: 'Claw Slash' },
  { id: 'sunburst', label: 'Solar Star' },
];

export const CLAN_EMBLEM_COLORS: EmblemColorSwatch[] = [
  { hex: '#f59e0b', label: 'Solar Gold' },
  { hex: '#ef4444', label: 'Crimson' },
  { hex: '#0ea5e9', label: 'Cyber Sky' },
  { hex: '#10b981', label: 'Jade' },
  { hex: '#a855f7', label: 'Phantom Violet' },
  { hex: '#f43f5e', label: 'Rose Strike' },
  { hex: '#0f172a', label: 'Obsidian' },
  { hex: '#f8fafc', label: 'Ivory White' },
];

export const DEFAULT_CLAN_EMBLEM: ClanEmblemConfig = {
  shape: 'shield',
  pattern: 'chevron',
  icon: 'sunburst',
  primaryColor: '#0f172a',
  secondaryColor: '#f59e0b',
  iconColor: '#f8fafc',
};

const VALID_SHAPES = new Set<ClanEmblemShapeId>(CLAN_EMBLEM_SHAPES.map((s) => s.id));
const VALID_PATTERNS = new Set<ClanEmblemPatternId>(CLAN_EMBLEM_PATTERNS.map((p) => p.id));
const VALID_ICONS = new Set<ClanEmblemIconId>(CLAN_EMBLEM_ICONS.map((i) => i.id));
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function validateClanEmblem(raw: Partial<ClanEmblemConfig> | null | undefined): ClanEmblemConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_CLAN_EMBLEM };
  }
  return {
    shape: raw.shape && VALID_SHAPES.has(raw.shape) ? raw.shape : DEFAULT_CLAN_EMBLEM.shape,
    pattern: raw.pattern && VALID_PATTERNS.has(raw.pattern) ? raw.pattern : DEFAULT_CLAN_EMBLEM.pattern,
    icon: raw.icon && VALID_ICONS.has(raw.icon) ? raw.icon : DEFAULT_CLAN_EMBLEM.icon,
    primaryColor:
      typeof raw.primaryColor === 'string' && HEX_COLOR_RE.test(raw.primaryColor)
        ? raw.primaryColor
        : DEFAULT_CLAN_EMBLEM.primaryColor,
    secondaryColor:
      typeof raw.secondaryColor === 'string' && HEX_COLOR_RE.test(raw.secondaryColor)
        ? raw.secondaryColor
        : DEFAULT_CLAN_EMBLEM.secondaryColor,
    iconColor:
      typeof raw.iconColor === 'string' && HEX_COLOR_RE.test(raw.iconColor)
        ? raw.iconColor
        : DEFAULT_CLAN_EMBLEM.iconColor,
  };
}

export function randomizeClanEmblem(seed?: number): ClanEmblemConfig {
  let s = typeof seed === 'number' ? Math.abs(Math.floor(seed)) : Math.floor(Math.random() * 100000);
  const next = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const pick = <T,>(arr: T[]): T => arr[Math.floor(next() * arr.length) % arr.length];
  const primary = pick(CLAN_EMBLEM_COLORS).hex;
  const secondaryChoices = CLAN_EMBLEM_COLORS.filter((c) => c.hex !== primary);
  const secondary = pick(secondaryChoices).hex;
  const iconChoices = CLAN_EMBLEM_COLORS.filter((c) => c.hex !== primary);
  const iconColor = pick(iconChoices).hex;

  return {
    shape: pick(CLAN_EMBLEM_SHAPES).id,
    pattern: pick(CLAN_EMBLEM_PATTERNS).id,
    icon: pick(CLAN_EMBLEM_ICONS).id,
    primaryColor: primary,
    secondaryColor: secondary,
    iconColor,
  };
}

export function formatClanEmblemSummary(emblem: ClanEmblemConfig): string {
  const shape = CLAN_EMBLEM_SHAPES.find((s) => s.id === emblem.shape)?.label ?? emblem.shape;
  const pattern = CLAN_EMBLEM_PATTERNS.find((p) => p.id === emblem.pattern)?.label ?? emblem.pattern;
  const icon = CLAN_EMBLEM_ICONS.find((i) => i.id === emblem.icon)?.label ?? emblem.icon;
  return `${shape} · ${pattern} · ${icon}`;
}

function traceShapePath(
  ctx: CanvasRenderingContext2D,
  shape: ClanEmblemShapeId,
  cx: number,
  cy: number,
  rx: number,
  ry: number
): void {
  ctx.beginPath();
  if (shape === 'shield') {
    ctx.moveTo(cx - rx * 0.92, cy - ry * 0.88);
    ctx.lineTo(cx + rx * 0.92, cy - ry * 0.88);
    ctx.lineTo(cx + rx * 0.92, cy + ry * 0.08);
    ctx.quadraticCurveTo(cx + rx * 0.85, cy + ry * 0.72, cx, cy + ry * 1.0);
    ctx.quadraticCurveTo(cx - rx * 0.85, cy + ry * 0.72, cx - rx * 0.92, cy + ry * 0.08);
    ctx.closePath();
  } else if (shape === 'diamond') {
    ctx.moveTo(cx, cy - ry);
    ctx.lineTo(cx + rx * 0.95, cy);
    ctx.lineTo(cx, cy + ry);
    ctx.lineTo(cx - rx * 0.95, cy);
    ctx.closePath();
  } else if (shape === 'hex') {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(a) * rx * 0.96;
      const py = cy + Math.sin(a) * ry * 0.96;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else if (shape === 'circle') {
    ctx.arc(cx, cy, Math.min(rx, ry) * 0.94, 0, Math.PI * 2);
    ctx.closePath();
  } else if (shape === 'pennant') {
    ctx.moveTo(cx - rx * 0.88, cy - ry * 0.94);
    ctx.lineTo(cx + rx * 0.88, cy - ry * 0.94);
    ctx.lineTo(cx + rx * 0.88, cy + ry * 0.45);
    ctx.lineTo(cx, cy + ry * 1.0);
    ctx.lineTo(cx - rx * 0.88, cy + ry * 0.45);
    ctx.closePath();
  } else {
    // Winged crest
    ctx.moveTo(cx, cy - ry * 0.98);
    ctx.lineTo(cx + rx * 0.55, cy - ry * 0.72);
    ctx.lineTo(cx + rx * 0.98, cy - ry * 0.82);
    ctx.lineTo(cx + rx * 0.86, cy + ry * 0.16);
    ctx.lineTo(cx, cy + ry * 1.0);
    ctx.lineTo(cx - rx * 0.86, cy + ry * 0.16);
    ctx.lineTo(cx - rx * 0.98, cy - ry * 0.82);
    ctx.lineTo(cx - rx * 0.55, cy - ry * 0.72);
    ctx.closePath();
  }
}

function drawPatternInsideClip(
  ctx: CanvasRenderingContext2D,
  pattern: ClanEmblemPatternId,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  secondaryColor: string
): void {
  if (pattern === 'solid') return;
  ctx.fillStyle = secondaryColor;
  if (pattern === 'split') {
    ctx.fillRect(cx, cy - ry * 1.2, rx * 1.4, ry * 2.4);
  } else if (pattern === 'stripe') {
    ctx.fillRect(cx - rx * 0.28, cy - ry * 1.2, rx * 0.56, ry * 2.4);
  } else if (pattern === 'chevron') {
    ctx.beginPath();
    ctx.moveTo(cx - rx * 1.2, cy - ry * 0.05);
    ctx.lineTo(cx, cy + ry * 0.52);
    ctx.lineTo(cx + rx * 1.2, cy - ry * 0.05);
    ctx.lineTo(cx + rx * 1.2, cy + ry * 0.36);
    ctx.lineTo(cx, cy + ry * 0.92);
    ctx.lineTo(cx - rx * 1.2, cy + ry * 0.36);
    ctx.closePath();
    ctx.fill();
  } else if (pattern === 'rays') {
    const rays = 8;
    for (let i = 0; i < rays; i++) {
      const a0 = (i / rays) * Math.PI * 2;
      const a1 = a0 + Math.PI / rays;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a0) * rx * 1.8, cy + Math.sin(a0) * ry * 1.8);
      ctx.lineTo(cx + Math.cos(a1) * rx * 1.8, cy + Math.sin(a1) * ry * 1.8);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawEmblemIcon(
  ctx: CanvasRenderingContext2D,
  icon: ClanEmblemIconId,
  cx: number,
  cy: number,
  r: number,
  color: string
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (icon === 'katana') {
    for (const sign of [-1, 1]) {
      ctx.save();
      ctx.rotate(sign * 0.68);
      ctx.fillRect(-r * 0.09, -r * 0.92, r * 0.18, r * 1.25);
      ctx.beginPath();
      ctx.moveTo(-r * 0.09, -r * 0.92);
      ctx.lineTo(0, -r * 1.12);
      ctx.lineTo(r * 0.09, -r * 0.92);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-r * 0.26, r * 0.3, r * 0.52, r * 0.14);
      ctx.fillRect(-r * 0.07, r * 0.44, r * 0.14, r * 0.44);
      ctx.restore();
    }
  } else if (icon === 'lightning') {
    ctx.beginPath();
    ctx.moveTo(r * 0.18, -r * 0.95);
    ctx.lineTo(-r * 0.52, r * 0.08);
    ctx.lineTo(r * 0.04, r * 0.08);
    ctx.lineTo(-r * 0.22, r * 0.95);
    ctx.lineTo(r * 0.55, -r * 0.14);
    ctx.lineTo(0, -r * 0.14);
    ctx.closePath();
    ctx.fill();
  } else if (icon === 'lotus') {
    const drawPetal = (angle: number, len: number, wid: number) => {
      ctx.save();
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, r * 0.55);
      ctx.quadraticCurveTo(wid, r * 0.55 - len * 0.5, 0, r * 0.55 - len);
      ctx.quadraticCurveTo(-wid, r * 0.55 - len * 0.5, 0, r * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    drawPetal(-0.82, r * 1.05, r * 0.32);
    drawPetal(0.82, r * 1.05, r * 0.32);
    drawPetal(-0.4, r * 1.25, r * 0.35);
    drawPetal(0.4, r * 1.25, r * 0.35);
    drawPetal(0, r * 1.42, r * 0.4);
    ctx.fillRect(-r * 0.55, r * 0.62, r * 1.1, r * 0.14);
  } else if (icon === 'fist') {
    // Stylized geometric martial fist
    ctx.beginPath();
    ctx.roundRect(-r * 0.58, -r * 0.52, r * 1.16, r * 0.88, r * 0.16);
    ctx.fill();
    // Knuckle dividers
    ctx.fillStyle = 'rgba(15,23,42,0.45)';
    for (const kx of [-0.28, 0, 0.28]) {
      ctx.fillRect(kx * r - r * 0.035, -r * 0.52, r * 0.07, r * 0.38);
    }
    // Wrist guard
    ctx.fillStyle = color;
    ctx.fillRect(-r * 0.42, r * 0.42, r * 0.84, r * 0.34);
  } else if (icon === 'crown') {
    ctx.beginPath();
    ctx.moveTo(-r * 0.78, r * 0.52);
    ctx.lineTo(-r * 0.88, -r * 0.45);
    ctx.lineTo(-r * 0.35, r * 0.02);
    ctx.lineTo(0, -r * 0.78);
    ctx.lineTo(r * 0.35, r * 0.02);
    ctx.lineTo(r * 0.88, -r * 0.45);
    ctx.lineTo(r * 0.78, r * 0.52);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-r * 0.76, r * 0.62, r * 1.52, r * 0.18);
  } else if (icon === 'shuriken') {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const rad = i % 2 === 0 ? r * 0.96 : r * 0.34;
      const px = Math.cos(a) * rad;
      const py = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(15,23,42,0.55)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (icon === 'dragon_claw') {
    for (const offset of [-0.46, 0, 0.46]) {
      ctx.beginPath();
      ctx.moveTo(offset * r - r * 0.28, -r * 0.86);
      ctx.quadraticCurveTo(offset * r + r * 0.18, 0, offset * r - r * 0.04, r * 0.88);
      ctx.quadraticCurveTo(offset * r - r * 0.16, 0.1, offset * r - r * 0.42, -r * 0.65);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    // Sunburst 8-point martial star
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
      const rad = i % 2 === 0 ? r * 0.96 : r * 0.44;
      const px = Math.cos(a) * rad;
      const py = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(15,23,42,0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Shared 2D renderer used both in the Clan Emblem Designer live canvas preview
 * and in Three.js CanvasTexture banners mounted on the Dojo entrance in Nexus City.
 */
export function drawClanEmblemOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  emblem: ClanEmblemConfig,
  options?: { clanTag?: string; includeClothBackdrop?: boolean }
): void {
  const safe = validateClanEmblem(emblem);
  const includeCloth = options?.includeClothBackdrop ?? true;
  const clanTag = options?.clanTag ?? 'SUN';

  ctx.clearRect(0, 0, width, height);

  if (includeCloth) {
    // Hanging vertical Dojo tapestry cloth backdrop
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#0b101b');
    grad.addColorStop(0.55, '#131c31');
    grad.addColorStop(1, '#0b101b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Outer metallic border & top hanging hem
    ctx.strokeStyle = safe.secondaryColor;
    ctx.lineWidth = Math.max(4, width * 0.03);
    ctx.strokeRect(
      ctx.lineWidth * 0.8,
      ctx.lineWidth * 0.8,
      width - ctx.lineWidth * 1.6,
      height - ctx.lineWidth * 1.6
    );

    // Top horizontal rod trim
    ctx.fillStyle = safe.secondaryColor;
    ctx.fillRect(0, 0, width, height * 0.045);
    ctx.fillRect(0, height * 0.94, width, height * 0.06);
  }

  const cx = width * 0.5;
  const cy = includeCloth ? height * 0.46 : height * 0.5;
  const rx = width * (includeCloth ? 0.36 : 0.43);
  const ry = height * (includeCloth ? 0.30 : 0.43);

  // Subtle drop shadow behind emblem shape
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = width * 0.06;
  ctx.shadowOffsetY = height * 0.015;
  traceShapePath(ctx, safe.shape, cx, cy, rx, ry);
  ctx.fillStyle = safe.primaryColor;
  ctx.fill();
  ctx.restore();

  // Clip pattern inside chosen shape
  ctx.save();
  traceShapePath(ctx, safe.shape, cx, cy, rx, ry);
  ctx.clip();
  ctx.fillStyle = safe.primaryColor;
  ctx.fillRect(0, 0, width, height);
  drawPatternInsideClip(ctx, safe.pattern, cx, cy, rx, ry, safe.secondaryColor);
  ctx.restore();

  // Crisp outer rim stroke
  ctx.save();
  traceShapePath(ctx, safe.shape, cx, cy, rx, ry);
  ctx.strokeStyle = safe.secondaryColor;
  ctx.lineWidth = Math.max(4, width * 0.028);
  ctx.stroke();
  ctx.restore();

  // Foreground martial icon centered inside the shape
  const iconRadius = Math.min(rx, ry) * 0.54;
  drawEmblemIcon(ctx, safe.icon, cx, cy - (safe.shape === 'shield' ? ry * 0.04 : 0), iconRadius, safe.iconColor);

  if (includeCloth && clanTag) {
    ctx.fillStyle = safe.secondaryColor;
    ctx.font = `900 ${Math.round(width * 0.13)}px "Chakra Petch", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`[${clanTag}]`, cx, height * 0.855);
  }
}
