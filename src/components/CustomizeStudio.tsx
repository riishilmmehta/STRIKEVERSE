import { useState } from 'react';
import { AURA_HEX, BODY_FRAMES, HERO_CLASSES, PET_ABILITIES } from '../game/combatRules';
import type {
  AuraColorId,
  BackAccessoryId,
  BodyFrameId,
  HairStyleId,
  HeadgearId,
  HeroClassId,
  HeroCustomization,
  PetTypeId,
  WeaponSkinId,
} from '../game/types';

interface CustomizeStudioProps {
  hero: HeroCustomization;
  onChange: (next: HeroCustomization) => void;
  onRotate: (deltaRad: number) => void;
  onClose: () => void;
}

const SKIN_SWATCHES = ['#f5d0b5', '#e2ad86', '#c68657', '#9b623c', '#693f26', '#4a2c1c'];
const HAIR_SWATCHES = ['#0f172a', '#7c2d12', '#f59e0b', '#e2e8f0', '#dc2626', '#06b6d4', '#a855f7'];
const OUTFIT_SWATCHES = ['#f8fafc', '#1e293b', '#1d4ed8', '#b91c1c', '#047857', '#6d28d9', '#d97706'];
const ACCENT_SWATCHES = ['#f59e0b', '#38bdf8', '#f43f5e', '#10b981', '#a855f7', '#facc15'];

const HAIR_STYLES: { id: HairStyleId; label: string }[] = [
  { id: 'spiky', label: 'Spiky' },
  { id: 'undercut', label: 'Undercut' },
  { id: 'ponytail', label: 'Ponytail' },
  { id: 'locs', label: 'Locs' },
  { id: 'mohawk', label: 'Mohawk' },
  { id: 'twinbuns', label: 'Twin Buns' },
];

const HEADGEAR_OPTS: { id: HeadgearId; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'headband', label: 'Headband' },
  { id: 'visor', label: 'Cyber Visor' },
  { id: 'horns', label: 'Oni Horns' },
];

const BACK_OPTS: { id: BackAccessoryId; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'scarf', label: 'Hero Scarf' },
  { id: 'wings', label: 'Holo Wings' },
  { id: 'thrusters', label: 'Thrusters' },
];

const WEAPON_OPTS: { id: WeaponSkinId; label: string }[] = [
  { id: 'tonfa', label: 'Energy Tonfa' },
  { id: 'katana', label: 'Plasma Katana' },
  { id: 'gauntlets', label: 'Kinetic Gauntlets' },
  { id: 'staff', label: 'Pulse Bo-Staff' },
];

const PET_OPTS: { id: PetTypeId; label: string }[] = [
  { id: 'drone', label: 'Mini Drone' },
  { id: 'fox', label: 'Holo-Fox' },
  { id: 'orb', label: 'Spirit Orb' },
  { id: 'none', label: 'None' },
];

export function CustomizeStudio({
  hero,
  onChange,
  onRotate,
  onClose,
}: CustomizeStudioProps) {
  const [tab, setTab] = useState<'class' | 'identity' | 'gear'>('class');
  const activeClass = HERO_CLASSES[hero.classId];

  const patch = (partial: Partial<HeroCustomization>) => {
    onChange({ ...hero, ...partial });
  };

  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex justify-between items-stretch">
      {/* Left/Center Live 3D Hero Turn Controls (Viewport remains unobstructed!) */}
      <div className="flex-1 flex flex-col justify-between p-6">
        <div className="pointer-events-auto inline-flex items-center gap-3 self-start bg-[#0b101b]/90 border border-slate-700 px-4 py-2">
          <span className="font-display font-bold text-lg tracking-wider text-white">
            STYLE STUDIO
          </span>
          <span className="text-slate-500">·</span>
          <span className="text-xs text-amber-400 font-semibold uppercase">
            Live 3rd-Person Hero
          </span>
        </div>

        <div className="pointer-events-auto self-center flex items-center gap-2 bg-[#0b101b]/90 border border-slate-700 p-1.5">
          <button
            type="button"
            onClick={() => onRotate(-0.6)}
            aria-label="Rotate Hero Left"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-display font-bold uppercase text-white cursor-pointer"
          >
            Rotate Left
          </button>
          <button
            type="button"
            onClick={() => onRotate(0.6)}
            aria-label="Rotate Hero Right"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-display font-bold uppercase text-white cursor-pointer"
          >
            Rotate Right
          </button>
        </div>
      </div>

      {/* Right-Anchored Studio Drawer */}
      <aside className="pointer-events-auto w-full max-w-sm sm:max-w-[400px] bg-[#0b101b]/96 border-l border-slate-700/90 flex flex-col h-full shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h2 className="font-display font-bold text-lg tracking-wider text-white uppercase">
              Hero Identity
            </h2>
            <p className="text-xs text-slate-400">
              Zero pay-to-win cosmetics · Visible in all combat & zones
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Style Studio"
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-xs uppercase cursor-pointer"
          >
            Done
          </button>
        </div>

        {/* Section Tabs */}
        <div className="grid grid-cols-3 border-b border-slate-800">
          {(
            [
              ['class', 'Class & Frame'],
              ['identity', 'Face & Hair'],
              ['gear', 'Outfit & Gear'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`py-2.5 text-xs font-display font-bold uppercase tracking-wide cursor-pointer border-b-2 transition-colors ${
                tab === id
                  ? 'border-amber-400 text-amber-300 bg-slate-900/70'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {tab === 'class' && (
            <>
              <div>
                <label
                  htmlFor="hero-name-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5"
                >
                  Hero Callsign
                </label>
                <input
                  id="hero-name-input"
                  type="text"
                  maxLength={14}
                  value={hero.name}
                  onChange={(e) => patch({ name: e.target.value.toUpperCase() || 'HERO' })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-sm font-display font-bold tracking-wider text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Fighting Class (Shared Control Scheme)
                </div>
                <div className="space-y-2">
                  {(Object.keys(HERO_CLASSES) as HeroClassId[]).map((id) => {
                    const c = HERO_CLASSES[id];
                    const selected = hero.classId === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() =>
                          patch({
                            classId: id,
                            weaponSkin: c.defaultWeapon,
                            aura: c.defaultAura,
                            accentColor: c.signatureColor,
                          })
                        }
                        className={`w-full text-left p-3 border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-slate-800/95 border-amber-400'
                            : 'bg-slate-900/70 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-display font-bold text-sm text-white uppercase">
                            {c.name}
                          </span>
                          <span className="text-[11px] font-mono-num text-amber-300">
                            HP {c.maxHp} · {c.skillName}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{c.role}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2.5 p-2.5 bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
                  <span className="text-cyan-300 font-semibold">Skill: {activeClass.skillName}</span>
                  {' — '}
                  {activeClass.skillDesc}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Body Frame
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(BODY_FRAMES) as BodyFrameId[]).map((fId) => {
                    const f = BODY_FRAMES[fId];
                    const active = hero.frame === fId;
                    return (
                      <button
                        key={fId}
                        type="button"
                        onClick={() => patch({ frame: fId })}
                        className={`py-2 px-2 text-xs font-display font-bold uppercase border cursor-pointer ${
                          active
                            ? 'bg-amber-500 text-slate-950 border-amber-300'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {tab === 'identity' && (
            <>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Skin Tone
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {SKIN_SWATCHES.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      aria-label={`Skin tone ${hex}`}
                      onClick={() => patch({ skinColor: hex })}
                      className={`w-9 h-9 rounded-full border-2 cursor-pointer ${
                        hero.skinColor === hex ? 'border-amber-400 scale-110' : 'border-slate-700'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Hairstyle
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {HAIR_STYLES.map((hs) => (
                    <button
                      key={hs.id}
                      type="button"
                      onClick={() => patch({ hairStyle: hs.id })}
                      className={`py-2 px-2 text-xs font-display font-bold uppercase border cursor-pointer ${
                        hero.hairStyle === hs.id
                          ? 'bg-amber-500 text-slate-950 border-amber-300'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {hs.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Hair Color
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {HAIR_SWATCHES.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      aria-label={`Hair color ${hex}`}
                      onClick={() => patch({ hairColor: hex })}
                      className={`w-9 h-9 rounded-full border-2 cursor-pointer ${
                        hero.hairColor === hex ? 'border-amber-400 scale-110' : 'border-slate-700'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Headgear
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {HEADGEAR_OPTS.map((hg) => (
                    <button
                      key={hg.id}
                      type="button"
                      onClick={() => patch({ headgear: hg.id })}
                      className={`py-2 px-2 text-xs font-display font-bold uppercase border cursor-pointer ${
                        hero.headgear === hg.id
                          ? 'bg-sky-400 text-slate-950 border-sky-200'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {hg.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'gear' && (
            <>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Weapon Skin
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {WEAPON_OPTS.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => patch({ weaponSkin: w.id })}
                      className={`py-2 px-2 text-xs font-display font-bold uppercase border cursor-pointer ${
                        hero.weaponSkin === w.id
                          ? 'bg-amber-500 text-slate-950 border-amber-300'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Back Accessory
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {BACK_OPTS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => patch({ backAccessory: b.id })}
                      className={`py-2 px-2 text-xs font-display font-bold uppercase border cursor-pointer ${
                        hero.backAccessory === b.id
                          ? 'bg-sky-400 text-slate-950 border-sky-200'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Companion Pet &amp; Active Power [G]
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {PET_OPTS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => patch({ pet: p.id })}
                      className={`py-2 px-2 text-xs font-display font-bold uppercase border cursor-pointer ${
                        hero.pet === p.id
                          ? 'bg-emerald-400 text-slate-950 border-emerald-200'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {(() => {
                  const petSpec = PET_ABILITIES[hero.pet];
                  return (
                    <div className="mt-2.5 p-2.5 bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display font-bold uppercase text-emerald-300">
                          {petSpec.kind === 'none'
                            ? 'No Companion Ability'
                            : `Power: ${petSpec.abilityName}`}
                        </span>
                        <span className="font-mono-num text-[11px] text-amber-300">
                          {petSpec.passiveLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        {petSpec.description}
                        {petSpec.cooldown > 0 ? ` (${petSpec.cooldown}s CD · Auto-assists on Finishers)` : ''}
                      </p>
                    </div>
                  );
                })()}
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Combat Fist Aura
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {(Object.keys(AURA_HEX) as AuraColorId[]).map((aId) => (
                    <button
                      key={aId}
                      type="button"
                      aria-label={`Aura ${aId}`}
                      onClick={() => patch({ aura: aId })}
                      className={`w-9 h-9 rounded-full border-2 cursor-pointer ${
                        hero.aura === aId ? 'border-white scale-110' : 'border-slate-700'
                      }`}
                      style={{ backgroundColor: AURA_HEX[aId] }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Jacket & Accent Colors
                </div>
                <div className="space-y-2.5">
                  <div className="flex flex-wrap gap-2">
                    {OUTFIT_SWATCHES.map((hex) => (
                      <button
                        key={`top-${hex}`}
                        type="button"
                        aria-label={`Jacket color ${hex}`}
                        onClick={() => patch({ topColor: hex })}
                        className={`w-8 h-8 rounded border-2 cursor-pointer ${
                          hero.topColor === hex ? 'border-amber-400 scale-110' : 'border-slate-700'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ACCENT_SWATCHES.map((hex) => (
                      <button
                        key={`acc-${hex}`}
                        type="button"
                        aria-label={`Accent color ${hex}`}
                        onClick={() => patch({ accentColor: hex })}
                        className={`w-8 h-8 rounded border-2 cursor-pointer ${
                          hero.accentColor === hex ? 'border-white scale-110' : 'border-slate-700'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
