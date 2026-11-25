import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

interface TouchControlsProps {
  skillCooldown: number;
  skillMaxCooldown: number;
  skillName: string;
  petEnabled: boolean;
  petCooldown: number;
  petMaxCooldown: number;
  petAbilityName: string;
  ultimate: number;
  isBlocking: boolean;
  onJoystick: (dx: number, dz: number, flickDash?: boolean) => void;
  onLight: () => void;
  onHeavy: () => void;
  onSkill: () => void;
  onPetAbility: () => void;
  onBlockChange: (held: boolean) => void;
  onJump: () => void;
  onDodge: () => void;
  onUltimate: () => void;
}

const RING_R = 18;
const RING_CIRC = 2 * Math.PI * RING_R;

function RadialProgressIcon({
  progress,
  strokeHex,
  ready,
}: {
  progress: number;
  strokeHex: string;
  ready: boolean;
}) {
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = RING_CIRC * (1 - clamped);
  return (
    <svg
      viewBox="0 0 44 44"
      aria-hidden="true"
      className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
    >
      <circle
        cx="22"
        cy="22"
        r={RING_R}
        fill="none"
        stroke="rgba(148,163,184,0.22)"
        strokeWidth="3"
      />
      <circle
        cx="22"
        cy="22"
        r={RING_R}
        fill="none"
        stroke={strokeHex}
        strokeWidth={ready ? '3.5' : '3'}
        strokeDasharray={RING_CIRC}
        strokeDashoffset={offset}
        strokeLinecap="butt"
      />
    </svg>
  );
}

export function TouchControls({
  skillCooldown,
  skillMaxCooldown,
  skillName,
  petEnabled,
  petCooldown,
  petMaxCooldown,
  petAbilityName,
  ultimate,
  isBlocking,
  onJoystick,
  onLight,
  onHeavy,
  onSkill,
  onPetAbility,
  onBlockChange,
  onJump,
  onDodge,
  onUltimate,
}: TouchControlsProps) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const swipeJumpFiredRef = useRef<boolean>(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const updateStick = (clientX: number, clientY: number, isEnd = false) => {
    const el = padRef.current;
    if (!el) return;
    if (isEnd) {
      setKnob({ x: 0, y: 0 });
      swipeJumpFiredRef.current = false;
      onJoystick(0, 0, false);
      return;
    }
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.38;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, maxR);
    const nx = dist > 0.01 ? (dx / dist) * (clamped / maxR) : 0;
    const ny = dist > 0.01 ? (dy / dist) * (clamped / maxR) : 0;

    setKnob({ x: nx * maxR, y: ny * maxR });

    const elapsed = performance.now() - startTimeRef.current;

    // Quick swipe-up triggers Jump (replaces redundant standalone JUMP button)
    if (!swipeJumpFiredRef.current && elapsed < 190 && ny < -0.82 && Math.abs(nx) < 0.48) {
      swipeJumpFiredRef.current = true;
      onJump();
      onJoystick(nx, ny, false);
      return;
    }

    // Quick horizontal/diagonal flick triggers Dodge-Dash
    const isFlick = elapsed < 140 && dist > maxR * 0.85 && ny >= -0.7;
    onJoystick(nx, ny, isFlick);
  };

  const handleStickDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    pointerIdRef.current = e.pointerId;
    startTimeRef.current = performance.now();
    swipeJumpFiredRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateStick(e.clientX, e.clientY);
  };

  const handleStickMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    updateStick(e.clientX, e.clientY);
  };

  const handleStickUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    pointerIdRef.current = null;
    updateStick(0, 0, true);
  };

  const ultReady = ultimate >= 100;
  const ultProgress = Math.max(0, Math.min(1, ultimate / 100));
  const skillReady = skillCooldown <= 0;
  const skillProgress = skillReady
    ? 1
    : Math.max(0, Math.min(1, 1 - skillCooldown / Math.max(0.1, skillMaxCooldown)));
  const petReady = petEnabled && petCooldown <= 0;
  const petProgress = petReady
    ? 1
    : Math.max(0, Math.min(1, 1 - petCooldown / Math.max(0.1, petMaxCooldown)));

  return (
    <div
      data-testid="battle-controls"
      className="fixed inset-x-0 bottom-0 z-10 pointer-events-none flex items-end justify-between px-4 pb-4 sm:px-6 sm:pb-5"
    >
      {/* Bottom-Left: Virtual Joystick (swipe-up to jump) + Quick Dash */}
      <div className="pointer-events-auto flex items-end gap-3">
        <div
          ref={padRef}
          onPointerDown={handleStickDown}
          onPointerMove={handleStickMove}
          onPointerUp={handleStickUp}
          onPointerCancel={handleStickUp}
          aria-label="Movement Joystick"
          role="application"
          className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#0b101b]/70 border-2 border-slate-500/50 flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
        >
          <div className="w-12 h-12 rounded-full border border-slate-400/30 pointer-events-none" />
          <div
            className="absolute w-11 h-11 rounded-full bg-amber-500/90 border-2 border-slate-950 shadow-md pointer-events-none transition-transform duration-75"
            style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
          />
          <span className="absolute bottom-1.5 text-[10px] font-mono-num text-slate-300/80 pointer-events-none">
            MOVE
          </span>
        </div>

        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            e.currentTarget.blur();
            onDodge();
          }}
          aria-label="Dodge Dash"
          className="w-12 h-12 rounded-full bg-[#0f172a]/85 hover:bg-slate-800 active:scale-95 border border-sky-400/60 text-sky-300 font-display font-bold text-xs flex flex-col items-center justify-center cursor-pointer"
        >
          <span>DASH</span>
          <span className="text-[9px] font-mono-num text-slate-400">SHFT</span>
        </button>
      </div>

      {/* Bottom-Right: Compact Secondary Icon Column ABOVE the 4-Button Combat Diamond */}
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        {/* ONE compact vertical column of secondary combat timers/rings (ULT % · PET timer · SKILL CD ring) */}
        <div
          aria-label="Secondary Combat Abilities"
          className="flex flex-col items-center gap-2 pr-1"
        >
          {/* Ultimate Charge Ring Icon */}
          <button
            type="button"
            tabIndex={-1}
            disabled={!ultReady}
            onClick={(e) => {
              e.stopPropagation();
              e.currentTarget.blur();
              onUltimate();
            }}
            aria-label="Ultimate Finisher"
            title={ultReady ? 'Ultimate Ready [I]' : `Ultimate ${ultimate}%`}
            className={`relative w-11 h-11 rounded-full flex flex-col items-center justify-center font-display font-bold leading-none transition-transform cursor-pointer ${
              ultReady
                ? 'bg-amber-400 text-slate-950 active:scale-95 shadow-[0_0_16px_rgba(245,158,11,0.7)]'
                : 'bg-[#0b101b]/88 text-amber-200 cursor-not-allowed'
            }`}
          >
            <RadialProgressIcon
              progress={ultProgress}
              strokeHex={ultReady ? '#fef08a' : '#f59e0b'}
              ready={ultReady}
            />
            <span className="text-[9px] tracking-wider uppercase">ULT</span>
            <span className="text-[10px] font-mono-num">
              {ultReady ? '[I]' : `${ultimate}%`}
            </span>
          </button>

          {/* Pet Power Cooldown Ring Icon */}
          {petEnabled && (
            <button
              type="button"
              tabIndex={-1}
              disabled={!petReady}
              onClick={(e) => {
                e.stopPropagation();
                e.currentTarget.blur();
                onPetAbility();
              }}
              aria-label={`Pet Power: ${petAbilityName}`}
              title={`${petAbilityName} [G]`}
              className={`relative w-11 h-11 rounded-full flex flex-col items-center justify-center font-display font-bold leading-none transition-transform cursor-pointer ${
                petReady
                  ? 'bg-emerald-400 text-slate-950 active:scale-95 shadow-[0_0_12px_rgba(52,211,153,0.55)]'
                  : 'bg-[#0b101b]/88 text-emerald-200/80 cursor-not-allowed'
              }`}
            >
              <RadialProgressIcon
                progress={petProgress}
                strokeHex={petReady ? '#bbf7d0' : '#34d399'}
                ready={petReady}
              />
              <span className="text-[9px] tracking-wider uppercase">PET</span>
              <span className="text-[10px] font-mono-num">
                {petReady ? '[G]' : `${petCooldown.toFixed(1)}s`}
              </span>
            </button>
          )}
        </div>

        {/* 4-Button Combat Diamond (Top=Skill, Left=Parry, Right=Heavy, Bottom=Light) */}
        <div
          aria-label="Combat Action Diamond"
          className="relative w-40 h-40 sm:w-44 sm:h-44"
        >
          {/* TOP: Special Skill with integrated radial cooldown circle */}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              e.currentTarget.blur();
              onSkill();
            }}
            aria-label={`Special Skill: ${skillName}`}
            title={skillName}
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-14 h-14 sm:w-15 sm:h-15 rounded-full border-2 font-display font-bold text-xs flex flex-col items-center justify-center transition-transform active:scale-90 cursor-pointer ${
              skillReady
                ? 'bg-cyan-500/90 border-cyan-200 text-slate-950 shadow-lg'
                : 'bg-[#0f172a]/90 border-slate-600 text-cyan-200'
            }`}
          >
            {!skillReady && (
              <RadialProgressIcon
                progress={skillProgress}
                strokeHex="#22d3ee"
                ready={false}
              />
            )}
            <span>{skillReady ? 'SKILL' : `${skillCooldown.toFixed(1)}s`}</span>
            <span className="text-[9px] font-mono-num opacity-80">
              {skillReady ? '[U]' : 'CD'}
            </span>
          </button>

          {/* LEFT: Block / Parry */}
          <button
            type="button"
            tabIndex={-1}
            onPointerDown={(e) => {
              e.stopPropagation();
              onBlockChange(true);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              onBlockChange(false);
            }}
            onPointerLeave={() => onBlockChange(false)}
            onPointerCancel={() => onBlockChange(false)}
            aria-label="Block or Parry"
            className={`absolute left-0 top-1/2 -translate-y-1/2 w-14 h-14 sm:w-15 sm:h-15 rounded-full border-2 font-display font-bold text-xs flex flex-col items-center justify-center transition-transform active:scale-90 cursor-pointer ${
              isBlocking
                ? 'bg-sky-400 border-white text-slate-950 scale-95'
                : 'bg-[#101c33]/90 border-sky-400/75 text-sky-200 hover:bg-[#172848]'
            }`}
          >
            <span>PARRY</span>
            <span className="text-[9px] font-mono-num opacity-80">[L]</span>
          </button>

          {/* RIGHT: Heavy Attack */}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              e.currentTarget.blur();
              onHeavy();
            }}
            aria-label="Heavy Attack"
            className="absolute right-0 top-1/2 -translate-y-1/2 w-14 h-14 sm:w-15 sm:h-15 rounded-full bg-rose-600/90 hover:bg-rose-500 active:scale-90 border-2 border-rose-200 text-white font-display font-bold text-xs flex flex-col items-center justify-center shadow-lg cursor-pointer"
          >
            <span>HEAVY</span>
            <span className="text-[9px] font-mono-num opacity-85">[K]</span>
          </button>

          {/* BOTTOM: Light Attack (Primary Combo Starter) */}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              e.currentTarget.blur();
              onLight();
            }}
            aria-label="Light Attack"
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-16 sm:w-[68px] sm:h-[68px] rounded-full bg-amber-500 hover:bg-amber-400 active:scale-90 border-2 border-amber-100 text-slate-950 font-display font-bold text-sm flex flex-col items-center justify-center shadow-xl cursor-pointer"
          >
            <span>LIGHT</span>
            <span className="text-[10px] font-mono-num opacity-85">[J]</span>
          </button>
        </div>
      </div>
    </div>
  );
}
