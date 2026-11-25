import { useState } from 'react';
import { HERO_CLASSES } from '../game/combatRules';
import type {
  DojoLeaderboardEntry,
  DojoLeaderboardSort,
} from '../game/dojoLeaderboard';

interface DojoLeaderboardModalProps {
  entries: DojoLeaderboardEntry[];
  allEntries: DojoLeaderboardEntry[];
  sortBy: DojoLeaderboardSort;
  searchQuery: string;
  promoteFeedback: string | null;
  onSortChange: (sort: DojoLeaderboardSort) => void;
  onSearchChange: (q: string) => void;
  onToggleLike: (entryId: string) => void;
  onVisitDojo: (entry: DojoLeaderboardEntry) => void;
  onSiegeDojo: (entry: DojoLeaderboardEntry) => void;
  onOpenMyDojo: () => void;
  onPromoteDojo: () => void;
  onRenameMyDojo: (nextName: string) => void;
  onClose: () => void;
}

const SORT_TABS: { id: DojoLeaderboardSort; label: string }[] = [
  { id: 'popularity', label: 'Popularity' },
  { id: 'likes', label: 'Most Liked' },
  { id: 'visits', label: 'Most Visited' },
];

export function DojoLeaderboardModal({
  entries,
  allEntries,
  sortBy,
  searchQuery,
  promoteFeedback,
  onSortChange,
  onSearchChange,
  onToggleLike,
  onVisitDojo,
  onSiegeDojo,
  onOpenMyDojo,
  onPromoteDojo,
  onRenameMyDojo,
  onClose,
}: DojoLeaderboardModalProps) {
  const playerEntry = allEntries.find((e) => e.isPlayer) ?? null;
  const topThree = searchQuery.trim() ? [] : entries.slice(0, 3);

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(playerEntry?.dojoName ?? '');

  const handleStartEdit = () => {
    setDraftName(playerEntry?.dojoName ?? '');
    setEditingName(true);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    onRenameMyDojo(draftName);
    setEditingName(false);
  };

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
        aria-labelledby="dojo-leaderboard-title"
        className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#0e1526] border border-slate-700/90 clip-bevel shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-4 px-5 sm:px-6 py-4 border-b border-slate-800 bg-[#0b101b]">
          <div>
            <h2
              id="dojo-leaderboard-title"
              className="font-display font-bold text-2xl sm:text-3xl tracking-wide uppercase text-white leading-none"
            >
              Dojo Leaderboard
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
              Nexus City sandbox builder rankings · Popularity equals Visits plus 3 × Likes
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Dojo Leaderboard"
            className="h-10 px-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-display font-bold text-xs uppercase tracking-wider cursor-pointer shrink-0"
          >
            Close
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-5">
          {/* Your Dojo Standing Strip */}
          {playerEntry && (
            <section
              aria-label="Your Dojo Standing"
              className="bg-[#0b101b] border border-slate-700/80 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5 text-xs text-slate-400">
                  <span className="font-display font-bold text-amber-400 uppercase tracking-wider">
                    Your Dojo
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-num text-slate-200 font-semibold">
                    Rank #{playerEntry.rank} of {allEntries.length}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-num">{playerEntry.blockCount} blocks placed</span>
                </div>

                {editingName ? (
                  <form onSubmit={handleSaveName} className="mt-2 flex items-center gap-2">
                    <label htmlFor="my-dojo-name-input" className="sr-only">
                      Dojo Name
                    </label>
                    <input
                      id="my-dojo-name-input"
                      type="text"
                      maxLength={28}
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      autoFocus
                      className="h-9 px-3 bg-slate-900 border border-amber-400/70 text-sm text-white focus:outline-none w-56 sm:w-64"
                    />
                    <button
                      type="submit"
                      className="h-9 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-xs uppercase tracking-wider cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingName(false)}
                      className="h-9 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-display font-bold text-xs uppercase tracking-wider cursor-pointer"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="mt-1 flex items-baseline gap-2.5 flex-wrap">
                    <h3 className="font-display font-bold text-lg sm:text-xl text-white tracking-wide truncate">
                      {playerEntry.dojoName}
                    </h3>
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      className="text-xs text-sky-400 hover:text-sky-300 underline underline-offset-2 cursor-pointer"
                    >
                      Rename
                    </button>
                  </div>
                )}

                <div className="mt-1.5 flex items-center flex-wrap gap-x-3 gap-y-1 text-xs font-mono-num text-slate-300">
                  <span>
                    <strong className="text-amber-300">{playerEntry.popularity.toLocaleString()}</strong>{' '}
                    Popularity
                  </span>
                  <span className="text-slate-600" aria-hidden="true">
                    ·
                  </span>
                  <span>{playerEntry.visits.toLocaleString()} Visits</span>
                  <span className="text-slate-600" aria-hidden="true">
                    ·
                  </span>
                  <span>{playerEntry.likes.toLocaleString()} Likes</span>
                  {promoteFeedback && (
                    <>
                      <span className="text-slate-600" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-emerald-300 font-semibold">{promoteFeedback}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onPromoteDojo}
                  className="clip-angled-sm h-10 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-xs tracking-wider uppercase cursor-pointer whitespace-nowrap"
                >
                  Promote Dojo
                </button>
                <button
                  type="button"
                  onClick={onOpenMyDojo}
                  className="h-10 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-display font-bold text-xs tracking-wider uppercase cursor-pointer whitespace-nowrap"
                >
                  Open My Dojo
                </button>
              </div>
            </section>
          )}

          {/* Sort Controls & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="Sort Dojo Leaderboard"
              className="inline-flex items-center bg-[#0b101b] border border-slate-800 p-1 self-start"
            >
              {SORT_TABS.map((tab) => {
                const active = sortBy === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => onSortChange(tab.id)}
                    className={`px-3.5 py-1.5 text-xs font-display font-bold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-64">
              <label htmlFor="dojo-leaderboard-search" className="sr-only">
                Search builders or dojos
              </label>
              <input
                id="dojo-leaderboard-search"
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search builder or dojo..."
                className="w-full h-9 px-3 bg-[#0b101b] border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          {/* Top 3 Showcase */}
          {topThree.length > 0 && (
            <section aria-label="Top 3 Dojos" className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {topThree.map((entry) => {
                const rankAccent =
                  entry.rank === 1
                    ? 'text-amber-300 border-amber-400/50'
                    : entry.rank === 2
                      ? 'text-slate-200 border-slate-500/50'
                      : 'text-orange-300 border-orange-500/45';
                return (
                  <article
                    key={entry.id}
                    className={`bg-[#0b101b] border p-4 flex flex-col justify-between gap-3 ${rankAccent}`}
                  >
                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-display font-bold text-xl font-mono-num">
                          #{entry.rank}
                        </span>
                        <span className="font-mono-num text-sm font-bold text-white">
                          {entry.popularity.toLocaleString()}{' '}
                          <span className="text-[11px] font-normal text-slate-400">pts</span>
                        </span>
                      </div>

                      <h3 className="mt-1.5 font-display font-bold text-base text-white tracking-wide truncate">
                        {entry.dojoName}
                      </h3>
                      <div className="text-xs text-slate-400 truncate">
                        {entry.ownerName} · {HERO_CLASSES[entry.classId].name}
                        {entry.isPlayer ? ' · You' : ''}
                      </div>
                      <div className="mt-2 text-xs font-mono-num text-slate-300">
                        {entry.visits.toLocaleString()} visits · {entry.likes.toLocaleString()} likes
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/90">
                      {entry.isPlayer ? (
                        <button
                          type="button"
                          onClick={onOpenMyDojo}
                          className="w-full h-9 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-xs uppercase tracking-wider cursor-pointer"
                        >
                          Enter My Dojo
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => onVisitDojo(entry)}
                            aria-label={`Visit ${entry.dojoName}`}
                            className="flex-1 h-9 bg-slate-800 hover:bg-sky-500 hover:text-slate-950 text-slate-100 font-display font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            Visit
                          </button>
                          <button
                            type="button"
                            onClick={() => onSiegeDojo(entry)}
                            aria-label={`Clan Siege in ${entry.dojoName}`}
                            className="h-9 px-3 bg-rose-500 hover:bg-rose-400 text-white font-display font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            Siege
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleLike(entry.id)}
                            aria-label={
                              entry.likedByPlayer
                                ? `Unlike ${entry.dojoName}`
                                : `Like ${entry.dojoName}`
                            }
                            aria-pressed={entry.likedByPlayer}
                            className={`h-9 px-3.5 font-display font-bold text-xs uppercase tracking-wider border transition-colors cursor-pointer ${
                              entry.likedByPlayer
                                ? 'bg-rose-500 border-rose-400 text-white'
                                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-rose-400 hover:text-rose-300'
                            }`}
                          >
                            {entry.likedByPlayer ? '♥ Liked' : '♡ Like'}
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          )}

          {/* Full Rankings Table */}
          <section aria-label="All Ranked Dojos">
            {entries.length === 0 ? (
              <div className="bg-[#0b101b] border border-slate-800 py-10 px-4 text-center">
                <p className="text-sm text-slate-300">
                  No builders or dojos matched &ldquo;{searchQuery}&rdquo;.
                </p>
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="mt-3 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-display font-bold uppercase tracking-wider text-white cursor-pointer"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div className="bg-[#0b101b] border border-slate-800 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[620px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-display font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-2.5 pl-4 pr-2 w-14">Rank</th>
                      <th className="py-2.5 px-3">Dojo &amp; Builder</th>
                      <th className="py-2.5 px-3 text-right">Blocks</th>
                      <th className="py-2.5 px-3 text-right">Visits</th>
                      <th className="py-2.5 px-3 text-right">Likes</th>
                      <th className="py-2.5 px-3 text-right">Popularity</th>
                      <th className="py-2.5 pl-3 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-xs">
                    {entries.map((entry) => (
                      <tr
                        key={entry.id}
                        className={
                          entry.isPlayer
                            ? 'bg-amber-500/10'
                            : 'hover:bg-slate-800/45 transition-colors'
                        }
                      >
                        <td className="py-3 pl-4 pr-2 font-display font-bold text-sm font-mono-num">
                          <span
                            className={
                              entry.rank === 1
                                ? 'text-amber-300'
                                : entry.rank === 2
                                  ? 'text-slate-200'
                                  : entry.rank === 3
                                    ? 'text-orange-300'
                                    : 'text-slate-400'
                            }
                          >
                            #{entry.rank}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-display font-bold text-sm text-white tracking-wide">
                            {entry.dojoName}
                            {entry.isPlayer && (
                              <span className="ml-2 text-xs font-sans font-semibold text-amber-300">
                                (Your Dojo)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {entry.ownerName} · {HERO_CLASSES[entry.classId].name} · {entry.themeTag}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num text-slate-300">
                          {entry.blockCount}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num text-slate-200">
                          {entry.visits.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num text-rose-300">
                          {entry.likes.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num font-bold text-amber-300 text-sm">
                          {entry.popularity.toLocaleString()}
                        </td>
                        <td className="py-3 pl-3 pr-4 text-right whitespace-nowrap">
                          {entry.isPlayer ? (
                            <button
                              type="button"
                              onClick={onOpenMyDojo}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-[11px] uppercase tracking-wider cursor-pointer"
                            >
                              Build
                            </button>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onToggleLike(entry.id)}
                                aria-label={
                                  entry.likedByPlayer
                                    ? `Unlike ${entry.dojoName} row`
                                    : `Like ${entry.dojoName} row`
                                }
                                aria-pressed={entry.likedByPlayer}
                                className={`px-2.5 py-1.5 font-display font-bold text-[11px] uppercase tracking-wider border cursor-pointer transition-colors ${
                                  entry.likedByPlayer
                                    ? 'bg-rose-500 border-rose-400 text-white'
                                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-rose-400 hover:text-rose-300'
                                }`}
                              >
                                {entry.likedByPlayer ? '♥ Liked' : '♡ Like'}
                              </button>
                              <button
                                type="button"
                                onClick={() => onVisitDojo(entry)}
                                aria-label={`Visit ${entry.dojoName} row`}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-sky-500 hover:text-slate-950 text-slate-100 font-display font-bold text-[11px] uppercase tracking-wider cursor-pointer transition-colors"
                              >
                                Visit
                              </button>
                              <button
                                type="button"
                                onClick={() => onSiegeDojo(entry)}
                                aria-label={`Clan Siege in ${entry.dojoName} row`}
                                className="px-2.5 py-1.5 bg-rose-500 hover:bg-rose-400 text-white font-display font-bold text-[11px] uppercase tracking-wider cursor-pointer transition-colors"
                              >
                                Siege
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
