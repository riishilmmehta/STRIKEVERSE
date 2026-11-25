import { useMemo, useState } from 'react';
import {
  PLAYER_CLAN_SPEC,
  RIVAL_CLANS,
  buildClanSiegeMatchPlan,
} from '../game/clanSiege';
import type { ClanSiegeLaunchConfig } from '../game/clanSiege';
import { DOJO_WEATHER_SPECS } from '../game/dojoWeather';
import type {
  ClanEmblemConfig,
  ClanSiegeFormat,
  DojoBlock,
  DojoWeatherId,
  HeroCustomization,
} from '../game/types';
import { ClanEmblemBadge, ClanEmblemDesigner } from './ClanEmblemDesigner';

interface ClanSiegeModalProps {
  hero: HeroCustomization;
  playerDojoName: string;
  playerBlocks: DojoBlock[];
  playerWeather: DojoWeatherId;
  clanEmblem: ClanEmblemConfig;
  initialRivalClanId?: string;
  onSaveEmblem: (emblem: ClanEmblemConfig) => void;
  onVisitNexusEntrance: () => void;
  onLaunch: (config: ClanSiegeLaunchConfig) => void;
  onClose: () => void;
}

export function ClanSiegeModal({
  hero,
  playerDojoName,
  playerBlocks,
  playerWeather,
  clanEmblem,
  initialRivalClanId,
  onSaveEmblem,
  onVisitNexusEntrance,
  onLaunch,
  onClose,
}: ClanSiegeModalProps) {
  const [activeTab, setActiveTab] = useState<'siege' | 'emblem'>('siege');
  const [format, setFormat] = useState<ClanSiegeFormat>('2v2');
  const [rivalClanId, setRivalClanId] = useState<string>(
    initialRivalClanId ?? RIVAL_CLANS[0].id
  );
  const [venue, setVenue] = useState<'rival_dojo' | 'player_dojo'>('rival_dojo');

  const previewPlan = useMemo(
    () =>
      buildClanSiegeMatchPlan(
        { format, rivalClanId, venue },
        playerBlocks,
        playerDojoName,
        hero.name,
        playerWeather
      ),
    [format, rivalClanId, venue, playerBlocks, playerDojoName, hero.name, playerWeather]
  );

  const weatherSpec = DOJO_WEATHER_SPECS[previewPlan.weather];
  const allyNames = [
    `${hero.name} (You)`,
    ...PLAYER_CLAN_SPEC.roster.slice(0, previewPlan.teamSize - 1).map((f) => f.name),
  ];
  const rivalClan = RIVAL_CLANS.find((c) => c.id === rivalClanId) ?? RIVAL_CLANS[0];
  const rivalNames = rivalClan.roster.slice(0, previewPlan.teamSize).map((f) => f.name);

  return (
    <div
      className="fixed inset-0 z-40 bg-[#060a14]/82 flex items-center justify-center p-3 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="clan-siege-title"
        className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#0e1526] border border-rose-500/55 clip-bevel shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <header className="px-5 sm:px-6 pt-4 pb-3 border-b border-slate-800 bg-[#0b101b] space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <ClanEmblemBadge emblem={clanEmblem} size={46} />
              <div className="min-w-0">
                <h2
                  id="clan-siege-title"
                  className="font-display font-bold text-2xl sm:text-3xl tracking-wide uppercase text-white leading-none"
                >
                  Clan Hall · {PLAYER_CLAN_SPEC.name}
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-400">
                  {activeTab === 'siege'
                    ? 'Visit rival clan Dojos or defend your plot in friendly 2v2 / 4v4 exhibitions using Dojo blocks as live obstacles.'
                    : 'Combine pre-made shapes, patterns, icons & colors to mount your Clan Banner on the Dojo entrance in Nexus City.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Clan Menu"
              className="h-10 px-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-display font-bold text-xs uppercase tracking-wider cursor-pointer shrink-0"
            >
              Close
            </button>
          </div>

          <div role="tablist" aria-label="Clan Menu Sections" className="flex items-center gap-2">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'siege'}
              onClick={() => setActiveTab('siege')}
              className={`px-3.5 py-1.5 text-xs font-display font-bold uppercase tracking-wider border cursor-pointer transition-colors ${
                activeTab === 'siege'
                  ? 'bg-rose-500 border-rose-300 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              Siege Exhibition
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'emblem'}
              onClick={() => setActiveTab('emblem')}
              className={`px-3.5 py-1.5 text-xs font-display font-bold uppercase tracking-wider border cursor-pointer transition-colors ${
                activeTab === 'emblem'
                  ? 'bg-amber-500 border-amber-300 text-slate-950'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              Emblem Designer
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-5">
          {activeTab === 'emblem' ? (
            <ClanEmblemDesigner
              emblem={clanEmblem}
              clanTag={PLAYER_CLAN_SPEC.tag}
              clanName={PLAYER_CLAN_SPEC.name}
              onSave={onSaveEmblem}
              onVisitNexusEntrance={onVisitNexusEntrance}
            />
          ) : (
            <>
              {/* Format & Venue Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section aria-label="Match Format">
              <div className="text-[11px] font-display font-bold uppercase tracking-wider text-slate-400 mb-2">
                1. Squad Format
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: '2v2', title: '2v2 Exhibition', sub: '4 Fighters · +190 Coins' },
                    { id: '4v4', title: '4v4 Full Siege', sub: '8 Fighters · +260 Coins' },
                  ] as { id: ClanSiegeFormat; title: string; sub: string }[]
                ).map((opt) => {
                  const active = format === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFormat(opt.id)}
                      className={`p-3 border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-rose-500/20 border-rose-400 text-white'
                          : 'bg-[#0b101b] border-slate-700/80 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div className="font-display font-bold text-sm uppercase tracking-wide">
                        {opt.title}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-mono-num">
                        {opt.sub}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section aria-label="Battlefield Venue">
              <div className="text-[11px] font-display font-bold uppercase tracking-wider text-slate-400 mb-2">
                2. Dojo Battlefield
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={venue === 'rival_dojo'}
                  onClick={() => setVenue('rival_dojo')}
                  className={`p-3 border text-left transition-colors cursor-pointer ${
                    venue === 'rival_dojo'
                      ? 'bg-sky-500/20 border-sky-400 text-white'
                      : 'bg-[#0b101b] border-slate-700/80 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="font-display font-bold text-sm uppercase tracking-wide">
                    Visit Rival Dojo
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {rivalClan.homeDojoName}
                  </div>
                </button>
                <button
                  type="button"
                  aria-pressed={venue === 'player_dojo'}
                  onClick={() => setVenue('player_dojo')}
                  className={`p-3 border text-left transition-colors cursor-pointer ${
                    venue === 'player_dojo'
                      ? 'bg-emerald-500/20 border-emerald-400 text-white'
                      : 'bg-[#0b101b] border-slate-700/80 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="font-display font-bold text-sm uppercase tracking-wide">
                    Defend My Dojo
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {playerDojoName} · {playerBlocks.length} blk
                  </div>
                </button>
              </div>
            </section>
          </div>

          {/* Rival Clan Selection */}
          <section aria-label="Select Rival Clan">
            <div className="text-[11px] font-display font-bold uppercase tracking-wider text-slate-400 mb-2">
              3. Challenge Rival Clan
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {RIVAL_CLANS.map((clan) => {
                const active = rivalClanId === clan.id;
                const clanWeather = DOJO_WEATHER_SPECS[clan.signatureWeather];
                return (
                  <button
                    key={clan.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setRivalClanId(clan.id)}
                    className={`p-3.5 border text-left transition-colors cursor-pointer flex flex-col justify-between gap-2 ${
                      active
                        ? 'bg-slate-800/95 border-amber-400 text-white'
                        : 'bg-[#0b101b] border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="font-mono-num text-[11px] font-bold px-1.5 py-0.5 bg-slate-900 border border-slate-700"
                          style={{ color: clan.accentHex }}
                        >
                          [{clan.tag}]
                        </span>
                        <span className="text-[10px] font-display font-bold uppercase text-slate-400">
                          {clanWeather.shortLabel}
                        </span>
                      </div>
                      <div className="mt-1.5 font-display font-bold text-base uppercase tracking-wide text-white">
                        {clan.name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        {clan.motto}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300 truncate">
                      Dojo: <span className="text-white font-medium">{clan.homeDojoName}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Matchup & Dynamic Obstacles Brief */}
          <section
            aria-label="Matchup Preview"
            className="bg-[#0b101b] border border-slate-800 p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
              <div>
                <div className="text-[10px] font-display font-bold uppercase tracking-wider text-slate-400">
                  Arena &amp; Atmosphere
                </div>
                <div className="font-display font-bold text-base text-white tracking-wide">
                  {previewPlan.venueName}{' '}
                  <span className="text-xs font-sans font-normal text-slate-400">
                    by {previewPlan.venueOwnerName}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-display font-bold uppercase tracking-wider text-slate-400">
                  Active Weather
                </div>
                <div
                  className="font-display font-bold text-xs uppercase tracking-wider"
                  style={{ color: weatherSpec.accentHex }}
                >
                  {weatherSpec.name}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center font-mono-num">
              <div className="bg-slate-900/90 border border-slate-800 py-2 px-1">
                <div className="text-sm font-bold text-cyan-300">
                  {previewPlan.obstacles.trampolines}
                </div>
                <div className="text-[10px] text-slate-400 uppercase">Bounce Pads</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 py-2 px-1">
                <div className="text-sm font-bold text-emerald-300">
                  {previewPlan.obstacles.dashpads}
                </div>
                <div className="text-[10px] text-slate-400 uppercase">Dash Pads</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 py-2 px-1">
                <div className="text-sm font-bold text-amber-300">
                  {previewPlan.obstacles.crates}
                </div>
                <div className="text-[10px] text-slate-400 uppercase">Smash Crates</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 py-2 px-1">
                <div className="text-sm font-bold text-rose-300">
                  {previewPlan.obstacles.pillars}
                </div>
                <div className="text-[10px] text-slate-400 uppercase">Bounce Pillars</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div className="bg-emerald-500/8 border border-emerald-500/35 px-3 py-2">
                <div className="font-display font-bold uppercase tracking-wider text-emerald-300">
                  [{previewPlan.allyClanTag}] {previewPlan.allyClanName} ({previewPlan.teamSize})
                </div>
                <div className="text-slate-300 mt-0.5">{allyNames.join(' · ')}</div>
              </div>
              <div className="bg-rose-500/8 border border-rose-500/35 px-3 py-2">
                <div className="font-display font-bold uppercase tracking-wider text-rose-300">
                  [{previewPlan.rivalClanTag}] {previewPlan.rivalClanName} ({previewPlan.teamSize})
                </div>
                <div className="text-slate-300 mt-0.5">{rivalNames.join(' · ')}</div>
              </div>
            </div>
              </section>
            </>
          )}
        </div>

        {/* Footer CTA (Siege tab) */}
        {activeTab === 'siege' && (
          <footer className="px-5 sm:px-6 py-3.5 border-t border-slate-800 bg-[#0b101b] flex items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              Emerald rings mark allies · Crimson rings mark rival clan fighters
            </div>
            <button
              type="button"
              onClick={() => onLaunch({ format, rivalClanId, venue })}
              className="clip-angled-sm h-11 px-6 bg-rose-500 hover:bg-rose-400 text-white font-display font-bold text-sm tracking-wider uppercase cursor-pointer whitespace-nowrap shadow-lg"
            >
              Launch {format.toUpperCase()} Siege
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
