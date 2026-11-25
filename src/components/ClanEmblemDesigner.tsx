import { useEffect, useRef, useState } from 'react';
import {
  CLAN_EMBLEM_COLORS,
  CLAN_EMBLEM_ICONS,
  CLAN_EMBLEM_PATTERNS,
  CLAN_EMBLEM_SHAPES,
  DEFAULT_CLAN_EMBLEM,
  drawClanEmblemOnCanvas,
  formatClanEmblemSummary,
  randomizeClanEmblem,
} from '../game/clanEmblem';
import type { ClanEmblemConfig } from '../game/types';

interface ClanEmblemDesignerProps {
  emblem: ClanEmblemConfig;
  clanTag: string;
  clanName: string;
  onSave: (next: ClanEmblemConfig) => void;
  onVisitNexusEntrance?: () => void;
}

export function ClanEmblemBadge({
  emblem,
  size = 44,
}: {
  emblem: ClanEmblemConfig;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawClanEmblemOnCanvas(ctx, canvas.width, canvas.height, emblem, {
      includeClothBackdrop: false,
    });
  }, [emblem]);

  return (
    <canvas
      ref={canvasRef}
      width={128}
      height={128}
      style={{ width: size, height: size }}
      aria-label="Clan Emblem Preview"
      className="shrink-0"
    />
  );
}

export function ClanEmblemDesigner({
  emblem,
  clanTag,
  clanName,
  onSave,
  onVisitNexusEntrance,
}: ClanEmblemDesignerProps) {
  const [draft, setDraft] = useState<ClanEmblemConfig>(() => ({ ...emblem }));
  const [savedNotice, setSavedNotice] = useState(false);
  const previewRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setDraft({ ...emblem });
  }, [emblem]);

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawClanEmblemOnCanvas(ctx, canvas.width, canvas.height, draft, {
      clanTag,
      includeClothBackdrop: true,
    });
  }, [draft, clanTag]);

  const updateDraft = (patch: Partial<ClanEmblemConfig>) => {
    setSavedNotice(false);
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const handleSave = () => {
    onSave(draft);
    setSavedNotice(true);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[232px_1fr] gap-5 items-start">
      {/* Left: Live Hanging Banner Preview */}
      <div className="bg-[#0b101b] border border-slate-800 p-4 flex flex-col items-center gap-3">
        <div className="text-[10px] font-display font-bold uppercase tracking-widest text-amber-400">
          Dojo Entrance Banner
        </div>
        <div className="relative p-1.5 bg-slate-950 border border-slate-700/80 shadow-xl">
          <canvas
            ref={previewRef}
            width={220}
            height={310}
            data-testid="clan-emblem-preview"
            aria-label={`Live banner preview for ${clanName}: ${formatClanEmblemSummary(draft)}`}
            className="block w-[176px] h-[248px]"
          />
        </div>
        <div className="text-center">
          <div className="font-display font-bold text-xs uppercase tracking-wider text-white">
            [{clanTag}] {clanName}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {formatClanEmblemSummary(draft)}
          </div>
        </div>

        <div className="w-full grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setSavedNotice(false);
              setDraft(randomizeClanEmblem());
            }}
            className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-display font-bold text-[11px] uppercase tracking-wider cursor-pointer"
          >
            Randomize
          </button>
          <button
            type="button"
            onClick={() => {
              setSavedNotice(false);
              setDraft({ ...DEFAULT_CLAN_EMBLEM });
            }}
            className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-display font-bold text-[11px] uppercase tracking-wider cursor-pointer"
          >
            Reset
          </button>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="w-full clip-angled-sm h-10 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-xs tracking-wider uppercase cursor-pointer shadow-lg"
        >
          Save &amp; Mount Banner
        </button>

        {savedNotice && (
          <div className="w-full text-center text-[11px] font-display font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/12 border border-emerald-500/40 px-2 py-1">
            Mounted on Dojo Entrance in Nexus City!
          </div>
        )}

        {onVisitNexusEntrance && (
          <button
            type="button"
            onClick={onVisitNexusEntrance}
            className="w-full py-1.5 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/50 text-sky-200 font-display font-bold text-[11px] uppercase tracking-wider cursor-pointer"
          >
            View in Nexus City
          </button>
        )}
      </div>

      {/* Right: Pre-Made Shapes, Patterns, Icons & Colors */}
      <div className="space-y-4">
        {/* Shapes */}
        <section aria-label="Banner Shape">
          <div className="text-[11px] font-display font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            1. Banner Shape
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {CLAN_EMBLEM_SHAPES.map((opt) => {
              const active = draft.shape === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => updateDraft({ shape: opt.id })}
                  className={`py-2 px-2 border text-[11px] font-display font-bold uppercase tracking-wide cursor-pointer transition-colors ${
                    active
                      ? 'bg-amber-500 text-slate-950 border-amber-300'
                      : 'bg-[#0b101b] text-slate-300 border-slate-700/80 hover:border-slate-500'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Patterns */}
        <section aria-label="Backdrop Pattern">
          <div className="text-[11px] font-display font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            2. Banner Pattern
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {CLAN_EMBLEM_PATTERNS.map((opt) => {
              const active = draft.pattern === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => updateDraft({ pattern: opt.id })}
                  className={`py-2 px-2 border text-[11px] font-display font-bold uppercase tracking-wide cursor-pointer transition-colors ${
                    active
                      ? 'bg-sky-400 text-slate-950 border-sky-200'
                      : 'bg-[#0b101b] text-slate-300 border-slate-700/80 hover:border-slate-500'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Icons */}
        <section aria-label="Clan Icon">
          <div className="text-[11px] font-display font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            3. Martial Icon
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {CLAN_EMBLEM_ICONS.map((opt) => {
              const active = draft.icon === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => updateDraft({ icon: opt.id })}
                  className={`py-2 px-2.5 border text-[11px] font-display font-bold uppercase tracking-wide cursor-pointer transition-colors ${
                    active
                      ? 'bg-rose-500 text-white border-rose-300'
                      : 'bg-[#0b101b] text-slate-300 border-slate-700/80 hover:border-slate-500'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Colors */}
        <section aria-label="Banner Colors" className="bg-[#0b101b] border border-slate-800 p-3.5 space-y-3">
          <div className="text-[11px] font-display font-bold uppercase tracking-wider text-slate-400">
            4. Banner Palette
          </div>

          {(
            [
              { key: 'primaryColor', label: 'Base Field' },
              { key: 'secondaryColor', label: 'Pattern & Trim' },
              { key: 'iconColor', label: 'Emblem Icon' },
            ] as { key: 'primaryColor' | 'secondaryColor' | 'iconColor'; label: string }[]
          ).map((row) => (
            <div key={row.key} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-display font-bold uppercase tracking-wide text-slate-200 w-32">
                {row.label}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {CLAN_EMBLEM_COLORS.map((swatch) => {
                  const active = draft[row.key].toLowerCase() === swatch.hex.toLowerCase();
                  return (
                    <button
                      key={`${row.key}-${swatch.hex}`}
                      type="button"
                      aria-label={`${row.label}: ${swatch.label}`}
                      aria-pressed={active}
                      title={swatch.label}
                      onClick={() => updateDraft({ [row.key]: swatch.hex })}
                      className={`w-7 h-7 border-2 cursor-pointer transition-transform ${
                        active
                          ? 'border-white scale-110 shadow-md'
                          : 'border-slate-700 hover:border-slate-400'
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
