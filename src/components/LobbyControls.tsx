import { useRef, useState } from 'react';
import { EMOTE_CATALOG } from '../game/storeCatalog';
import type { EmoteId, HubMinimapState, NearbyHubFighter } from '../game/types';
import { RankEmblemIcon } from './RankEmblemIcon';

interface LobbyControlsProps {
  minimap: HubMinimapState | null;
  nearbyFighter: NearbyHubFighter | null;
  hasPortalPrompt: boolean;
  ownedEmotes: EmoteId[];
  onJoystick: (dx: number, dz: number) => void;
  onEmote: (emote: EmoteId) => void;
  onChallengeFighter: (npcId: string) => void;
  onOpenTradingPost: () => void;
  onOpenClanSiege: () => void;
}

const COMPASS_LABELS = [
  { label: 'N', x: '50%', y: '7%' },
  { label: 'S', x: '50%', y: '93%' },
  { label: 'W', x: '8%', y: '50%' },
  { label: 'E', x: '92%', y: '50%' },
];

export function LobbyControls({
  minimap,
  nearbyFighter,
  hasPortalPrompt,
  ownedEmotes,
  onJoystick,
  onEmote,
  onChallengeFighter,
  onOpenTradingPost,
  onOpenClanSiege,
}: LobbyControlsProps) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [wheelOpen, setWheelOpen] = useState(false);

  const availableEmotes = ownedEmotes
    .map((id) => EMOTE_CATALOG[id])
    .filter((spec): spec is NonNullable<typeof spec> => Boolean(spec));

  const updateStick = (clientX: number, clientY: number) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.36;
    const rawX = clientX - cx;
    const rawY = clientY - cy;
    const dist = Math.hypot(rawX, rawY);
    const clamped = Math.min(dist, maxR);
    const nx = dist > 0.01 ? (rawX / dist) * (clamped / maxR) : 0;
    const ny = dist > 0.01 ? (rawY / dist) * (clamped / maxR) : 0;
    setKnob({ x: nx * maxR, y: ny * maxR });
    onJoystick(nx, ny);
  };

  const resetStick = () => {
    pointerIdRef.current = null;
    setKnob({ x: 0, y: 0 });
    onJoystick(0, 0);
  };

  // Player heading degrees for compass arrow (Three.js yaw = 0 faces +Z / South, Math.PI faces -Z / North)
  const headingDeg = minimap ? ((-minimap.playerYaw * 180) / Math.PI) + 180 : 0;

  return (
    <div
      data-testid="lobby-controls"
      aria-label="Nexus City Lobby Controls"
      className="fixed inset-0 z-20 pointer-events-none select-none"
    >
      {/* BOTTOM-LEFT: Minimal Movement Joystick ONLY (zero combat buttons in Nexus City!) */}
      <div className="pointer-events-auto fixed bottom-5 left-5">
        <div
          ref={padRef}
          aria-label="Lobby Movement Joystick"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            pointerIdRef.current = e.pointerId;
            updateStick(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (pointerIdRef.current !== e.pointerId) return;
            updateStick(e.clientX, e.clientY);
          }}
          onPointerUp={resetStick}
          onPointerCancel={resetStick}
          className="relative w-28 h-28 rounded-full bg-slate-950/65 border-2 border-slate-600/80 flex items-center justify-center touch-none shadow-lg"
        >
          <div className="w-10 h-10 rounded-full border border-slate-700/80" />
          <div
            className="absolute w-11 h-11 rounded-full bg-amber-400/90 border-2 border-amber-100 shadow-lg"
            style={{
              transform: `translate(${knob.x}px, ${knob.y}px)`,
            }}
          />
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 font-display font-bold text-[10px] tracking-[0.2em] uppercase text-slate-300 hud-text-shadow whitespace-nowrap">
            MOVE
          </span>
        </div>
      </div>

      {/* BOTTOM-CENTER: Contextual Challenge / Duel Prompt (ONLY appears when standing near another Hub fighter) */}
      {nearbyFighter && !hasPortalPrompt && (
        <div
          data-testid="hub-challenge-prompt"
          className="pointer-events-auto fixed bottom-6 left-1/2 -translate-x-1/2 animate-combo-pop"
        >
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onChallengeFighter(nearbyFighter.id);
            }}
            className="clip-angled px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-display font-bold text-sm tracking-wider uppercase shadow-2xl flex items-center gap-3 cursor-pointer whitespace-nowrap border border-amber-200/70"
          >
            <RankEmblemIcon rank={nearbyFighter.arenaRank} size={22} />
            <div className="text-left leading-tight">
              <div>CHALLENGE {nearbyFighter.name}</div>
              <div className="text-[10px] font-mono-num text-slate-900/90">
                RANK #{nearbyFighter.arenaRank} {nearbyFighter.rankName} · 1v1 DUEL
              </div>
            </div>
            <span className="text-xs font-mono-num bg-slate-950/20 px-1.5 py-0.5">[F]</span>
          </button>
        </div>
      )}

      {/* BOTTOM-RIGHT: Nexus City Minimap + Compass & Social Action Cluster */}
      <div className="pointer-events-auto fixed bottom-5 right-5 flex flex-col items-end gap-2.5">
        {/* Interactive Emote Wheel Popover */}
        {wheelOpen && (
          <div
            aria-label="Emote Wheel"
            className="bg-[#0b101b]/95 border border-amber-400/65 clip-bevel p-3 w-72 shadow-2xl animate-combo-pop"
          >
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800">
              <span className="font-display font-bold text-xs uppercase tracking-wider text-amber-300">
                Emote Wheel
              </span>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  setWheelOpen(false);
                }}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
              {availableEmotes.map((em) => (
                <button
                  key={em.id}
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onEmote(em.id);
                    setWheelOpen(false);
                  }}
                  className={`px-2.5 py-1.5 text-[11px] font-display font-bold uppercase text-left cursor-pointer border transition-colors truncate ${
                    em.rankOnly
                      ? 'bg-sky-500/20 border-sky-400/70 text-sky-200 hover:bg-sky-400 hover:text-slate-950'
                      : em.storeOnly
                        ? 'bg-amber-500/20 border-amber-400/70 text-amber-200 hover:bg-amber-400 hover:text-slate-950'
                        : 'bg-slate-900 border-slate-700 text-slate-100 hover:bg-amber-500 hover:text-slate-950'
                  }`}
                >
                  {em.rankOnly ? `★ ${em.label}` : em.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Nexus City Minimap & Compass */}
        {minimap && (
          <div
            aria-label="Nexus City Minimap"
            className="relative w-32 h-32 rounded-full bg-[#080d17]/90 border-2 border-slate-700/90 shadow-2xl overflow-hidden"
          >
            {/* Concentric plaza radar rings */}
            <div className="absolute inset-3 rounded-full border border-slate-700/60" />
            <div className="absolute inset-8 rounded-full border border-amber-400/35" />
            <div className="absolute inset-x-0 top-1/2 h-px bg-slate-800/70" />
            <div className="absolute inset-y-0 left-1/2 w-px bg-slate-800/70" />

            {/* Compass N/E/S/W */}
            {COMPASS_LABELS.map((c) => (
              <span
                key={c.label}
                className={`absolute -translate-x-1/2 -translate-y-1/2 font-display font-bold text-[9px] leading-none ${
                  c.label === 'N' ? 'text-amber-400' : 'text-slate-400'
                }`}
                style={{ left: c.x, top: c.y }}
              >
                {c.label}
              </span>
            ))}

            {/* Portals (diamonds) & Hub Fighters (dots) */}
            {minimap.blips.map((blip) => {
              const leftPct = 50 + blip.x * 39;
              const topPct = 50 + blip.z * 39;
              return (
                <div
                  key={blip.id}
                  title={blip.label}
                  className={
                    blip.kind === 'portal'
                      ? 'absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-white/80'
                      : 'absolute w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full'
                  }
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    backgroundColor: blip.colorHex,
                  }}
                />
              );
            })}

            {/* Player directional triangle arrow */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${50 + minimap.playerX * 39}%`,
                top: `${50 + minimap.playerZ * 39}%`,
                transform: `translate(-50%, -50%) rotate(${headingDeg}deg)`,
              }}
            >
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5">
                <polygon points="8,1 14,14 8,11 2,14" fill="#ffffff" stroke="#f59e0b" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
        )}

        {/* Social Action Bar: Emote Wheel · Trade & Store · Clan */}
        <div className="flex items-center gap-1.5 bg-[#0b101b]/92 border border-slate-700/85 clip-bevel p-1.5 shadow-xl">
          <button
            type="button"
            tabIndex={-1}
            aria-expanded={wheelOpen}
            onClick={(e) => {
              e.currentTarget.blur();
              setWheelOpen((v) => !v);
            }}
            className={`px-3 py-2 text-xs font-display font-bold uppercase tracking-wider cursor-pointer border transition-colors whitespace-nowrap ${
              wheelOpen
                ? 'bg-amber-400 text-slate-950 border-amber-200'
                : 'bg-slate-900 hover:bg-slate-800 text-amber-200 border-amber-500/55'
            }`}
          >
            Emotes
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenTradingPost();
            }}
            className="px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500 text-emerald-200 hover:text-slate-950 border border-emerald-400/60 text-xs font-display font-bold uppercase tracking-wider cursor-pointer transition-colors whitespace-nowrap"
          >
            Trade &amp; Store
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenClanSiege();
            }}
            className="px-3 py-2 bg-rose-500/15 hover:bg-rose-500 text-rose-200 hover:text-white border border-rose-400/60 text-xs font-display font-bold uppercase tracking-wider cursor-pointer transition-colors whitespace-nowrap"
          >
            Clan
          </button>
        </div>
      </div>
    </div>
  );
}
