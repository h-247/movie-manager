import React, { useState, useEffect } from 'react';
import { ExternalLink, Star, Film, Check, Globe, Edit2, X } from 'lucide-react';
import type { Movie, WatchStatus } from '@/db/schema';
import { StatusBadge } from './status-badge';
import { getFullPosterUrl } from '@/lib/tmdb';
import { SeriesProgressModal } from './series-progress-modal';

function parseListField(val: string | null | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed.map(String).map((s) => s.trim()).filter(Boolean);
    if (typeof parsed === 'string' && parsed.trim()) return [parsed.trim()];
  } catch {
    // fallback
  }
  const cleaned = String(val).replace(/[\[\]"'\\]/g, '').trim();
  if (cleaned) {
    return cleaned.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

interface MovieCardProps {
  movie: Movie;
  onOpenDetails: (movie: Movie) => void;
  onStatusChange: (movieId: string, newStatus: WatchStatus) => Promise<void>;
  onUpdateMovie?: (movieId: string, updates: Record<string, any>) => Promise<void>;
}

export function MovieCard({
  movie,
  onOpenDetails,
  onStatusChange,
  onUpdateMovie,
}: MovieCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  // Series progress edit state on card
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [editSeasonVal, setEditSeasonVal] = useState<number | string>(movie.currentSeason || 1);
  const [editEpisodeVal, setEditEpisodeVal] = useState<number | string>(movie.currentEpisode || 1);
  const [editStatusVal, setEditStatusVal] = useState<'To do' | 'Doing' | 'Done'>(
    movie.status === 'DONE' ? 'Done' : movie.status === 'DOING' ? 'Doing' : 'To do',
  );
  const [editHourVal, setEditHourVal] = useState<number | string>(movie.currentHour || 0);
  const [editMinuteVal, setEditMinuteVal] = useState<number | string>(movie.currentMinute || 0);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);

  useEffect(() => {
    setEditSeasonVal(movie.currentSeason || 1);
    setEditEpisodeVal(movie.currentEpisode || 1);
    setEditStatusVal(movie.status === 'DONE' ? 'Done' : movie.status === 'DOING' ? 'Doing' : 'To do');
    setEditHourVal(movie.currentHour || 0);
    setEditMinuteVal(movie.currentMinute || 0);
  }, [movie.currentSeason, movie.currentEpisode, movie.status, movie.currentHour, movie.currentMinute]);

  const posterUrl = getFullPosterUrl(movie.posterPath);

  const genresList = parseListField(movie.genres);
  const countriesList = parseListField(movie.countries);

  const handleStepSeason = async (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    if (isUpdatingProgress || !onUpdateMovie) return;
    const totalSeas = movie.totalSeasons || 1;
    const curS = movie.currentSeason || 1;
    const nextS = Math.min(Math.max(curS + delta, 1), totalSeas);
    if (nextS === curS) return;

    try {
      setIsUpdatingProgress(true);
      await onUpdateMovie(movie.id, { currentSeason: nextS, currentEpisode: 1 });
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  const handleStepEpisode = async (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    if (isUpdatingProgress || !onUpdateMovie) return;
    const totalSeas = movie.totalSeasons || 1;
    const totalEps = movie.totalEpisodes || null;
    const epsPerSeason = totalEps && totalSeas ? Math.ceil(totalEps / totalSeas) : (totalEps || 50);

    const curS = Math.min(Math.max(movie.currentSeason || 1, 1), totalSeas);
    const curE = Math.min(Math.max(movie.currentEpisode || 1, 1), epsPerSeason);
    const nextE = curE + delta;

    try {
      setIsUpdatingProgress(true);
      if (nextE > epsPerSeason) {
        if (curS < totalSeas) {
          await onUpdateMovie(movie.id, { currentSeason: curS + 1, currentEpisode: 1 });
        } else {
          await onUpdateMovie(movie.id, { status: 'DONE', currentEpisode: epsPerSeason });
        }
      } else if (nextE < 1) {
        if (curS > 1) {
          await onUpdateMovie(movie.id, { currentSeason: curS - 1, currentEpisode: epsPerSeason });
        }
      } else {
        await onUpdateMovie(movie.id, { currentEpisode: nextE });
      }
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  const handleSaveDirectProgress = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUpdatingProgress || !onUpdateMovie) return;
    const totalSeas = movie.totalSeasons || 99;
    const totalEps = movie.totalEpisodes || null;
    const epsPerSeason = totalEps && movie.totalSeasons ? Math.ceil(totalEps / movie.totalSeasons) : (totalEps || 999);

    const s = parseInt(String(editSeasonVal), 10);
    const ep = parseInt(String(editEpisodeVal), 10);

    const validS = isNaN(s) ? 1 : Math.min(Math.max(1, s), totalSeas);
    const validEp = isNaN(ep) ? 1 : Math.min(Math.max(1, ep), epsPerSeason);
    const isDoing = editStatusVal === 'Doing';
    const isDone = editStatusVal === 'Done';
    const newDbStatus: 'TO_DO' | 'DOING' | 'DONE' = isDone ? 'DONE' : isDoing ? 'DOING' : 'TO_DO';
    const newHour = isDoing ? Math.min(23, Math.max(0, parseInt(String(editHourVal), 10) || 0)) : null;
    const newMinute = isDoing ? Math.min(59, Math.max(0, parseInt(String(editMinuteVal), 10) || 0)) : null;

    try {
      setIsUpdatingProgress(true);
      await onUpdateMovie(movie.id, {
        currentSeason: validS,
        currentEpisode: validEp,
        status: newDbStatus,
        currentHour: newHour,
        currentMinute: newMinute,
      });
      setIsEditingProgress(false);
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  const handleQuickStatus = async (
    e: React.MouseEvent,
    newStatus: WatchStatus,
  ) => {
    e.stopPropagation();
    if (newStatus === movie.status || isChangingStatus) return;

    try {
      setIsChangingStatus(true);
      await onStatusChange(movie.id, newStatus);
    } finally {
      setIsChangingStatus(false);
    }
  };

  return (
    <div
      onClick={() => onOpenDetails(movie)}
      className="group relative flex flex-col justify-between rounded-2xl border border-neutral-800 bg-[#262626] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-700 hover:shadow-xl hover:shadow-black/50 cursor-pointer"
    >
      <div>
        {/* Card Header Row: Status, Type, Canada, 2026, Rating, IMDb Link */}
        <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-neutral-800/80">
          <div className="flex items-center gap-1.5 flex-wrap">
            <StatusBadge status={movie.status as WatchStatus} size="sm" />
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${
                movie.mediaType === 'SERIES'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
              }`}
            >
              {movie.mediaType === 'SERIES' ? 'Series' : 'Movie'}
            </span>

            {/* Canada next to Series */}
            {countriesList.length > 0 && (
              <span className="flex items-center gap-1 rounded bg-[#1A1A1A] border border-neutral-700/60 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300">
                <Globe className="h-2.5 w-2.5 text-cyan-400 shrink-0" />
                <span>{countriesList.join(', ')}</span>
              </span>
            )}

            {/* 2026 next to Series */}
            {movie.releaseYear && (
              <span className="rounded bg-[#1A1A1A] border border-neutral-700/60 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300">
                {movie.releaseYear}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {movie.personalRating && (
              <div className="flex items-center gap-1 rounded-md bg-[#1A1A1A] px-1.5 py-0.5 text-xs font-semibold text-amber-400 border border-neutral-800">
                <Star className="h-3 w-3 fill-amber-400" />
                <span>{movie.personalRating}/10</span>
              </div>
            )}
            <a
              href={movie.imdbUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Open on IMDb"
              className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1A1A1A] text-neutral-400 hover:text-white border border-neutral-800 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Card Content Header */}
        <div>
          <div className="flex items-start justify-between gap-1.5">
            <h3
              className="text-base font-bold text-white group-hover:text-purple-300 leading-snug transition-colors line-clamp-2"
              title={movie.title}
            >
              {movie.title}
            </h3>
            {movie.mediaType === 'SERIES' && (
              <span className="shrink-0 pt-0.5 rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-purple-300 border border-purple-500/30">
                S{movie.currentSeason || 1} E{movie.currentEpisode || 1}
              </span>
            )}
          </div>

          {/* Series Progress on Card (Editable) */}
          {movie.mediaType === 'SERIES' && (() => {
            const totalSeas = movie.totalSeasons || 1;
            const totalEps = movie.totalEpisodes || null;
            const epsPerSeason = totalEps && totalSeas ? Math.ceil(totalEps / totalSeas) : (totalEps || null);
            const curSeason = Math.min(Math.max(movie.currentSeason || 1, 1), totalSeas);
            const curEpisode = epsPerSeason ? Math.min(Math.max(movie.currentEpisode || 1, 1), epsPerSeason) : (movie.currentEpisode || 1);

            const totalWatched = epsPerSeason ? (curSeason - 1) * epsPerSeason + curEpisode : null;
            const progressPercent = (totalEps && totalWatched) ? Math.min(Math.round((totalWatched / totalEps) * 100), 100) : null;

            if (isEditingProgress) {
              return (
                <div
                  className="mt-2.5 rounded-lg border border-purple-500/40 bg-purple-950/40 p-2.5 text-xs space-y-2 cursor-default"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseUp={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-purple-200">Manage Series Progress</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingProgress(false);
                        setIsSeriesModalOpen(true);
                      }}
                      className="text-[10px] text-purple-300 hover:text-white underline"
                    >
                      Full Table ↗
                    </button>
                  </div>

                  {/* 4-column Table: Season, Episode, Status, Hour & Minute */}
                  <div className="overflow-x-auto rounded border border-neutral-700/60 bg-[#161616]">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-neutral-700/60 bg-[#222222] text-neutral-300 text-[10px]">
                          <th className="py-1 px-1.5 font-semibold">Season</th>
                          <th className="py-1 px-1.5 font-semibold">Episode</th>
                          <th className="py-1 px-1.5 font-semibold">Status</th>
                          <th className="py-1 px-1.5 font-semibold">Hour &amp; Minute (Doing)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {/* 1. Season */}
                          <td className="py-1 px-1.5">
                            <input
                              type="number"
                              min={1}
                              max={movie.totalSeasons || 99}
                              value={editSeasonVal}
                              onChange={(e) => setEditSeasonVal(e.target.value)}
                              className="w-10 rounded bg-[#222222] border border-neutral-700 px-1 py-0.5 text-center text-xs text-white focus:border-purple-500 focus:outline-none"
                            />
                          </td>

                          {/* 2. Episode */}
                          <td className="py-1 px-1.5">
                            <input
                              type="number"
                              min={1}
                              max={epsPerSeason || 999}
                              value={editEpisodeVal}
                              onChange={(e) => setEditEpisodeVal(e.target.value)}
                              className="w-10 rounded bg-[#222222] border border-neutral-700 px-1 py-0.5 text-center text-xs text-white focus:border-purple-500 focus:outline-none"
                            />
                          </td>

                          {/* 3. Status */}
                          <td className="py-1 px-1.5">
                            <select
                              value={editStatusVal}
                              onChange={(e) => setEditStatusVal(e.target.value as any)}
                              className={`rounded border px-1 py-0.5 text-[11px] font-semibold focus:outline-none ${
                                editStatusVal === 'Done'
                                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                                  : editStatusVal === 'Doing'
                                  ? 'bg-sky-950/60 border-sky-500/50 text-sky-300 font-bold'
                                  : 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                              }`}
                            >
                              <option value="To do">To do</option>
                              <option value="Doing">Doing</option>
                              <option value="Done">Done</option>
                            </select>
                          </td>

                          {/* 4. Hour và Minute để sử dụng khi Status là doing */}
                          <td className="py-1 px-1.5">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={23}
                                disabled={editStatusVal !== 'Doing'}
                                value={editStatusVal === 'Doing' ? editHourVal : 0}
                                onChange={(e) => setEditHourVal(e.target.value)}
                                placeholder="0"
                                className={`w-8 rounded border px-0.5 py-0.5 text-center text-xs ${
                                  editStatusVal === 'Doing'
                                    ? 'border-sky-500/60 bg-[#222222] text-white focus:border-sky-400'
                                    : 'border-neutral-800 bg-neutral-900 text-neutral-600 opacity-50 cursor-not-allowed'
                                }`}
                              />
                              <span className={`text-[10px] ${editStatusVal === 'Doing' ? 'text-sky-400 font-bold' : 'text-neutral-600'}`}>h</span>
                              <input
                                type="number"
                                min={0}
                                max={59}
                                disabled={editStatusVal !== 'Doing'}
                                value={editStatusVal === 'Doing' ? editMinuteVal : 0}
                                onChange={(e) => setEditMinuteVal(e.target.value)}
                                placeholder="0"
                                className={`w-8 rounded border px-0.5 py-0.5 text-center text-xs ${
                                  editStatusVal === 'Doing'
                                    ? 'border-sky-500/60 bg-[#222222] text-white focus:border-sky-400'
                                    : 'border-neutral-800 bg-neutral-900 text-neutral-600 opacity-50 cursor-not-allowed'
                                }`}
                              />
                              <span className={`text-[10px] ${editStatusVal === 'Doing' ? 'text-sky-400 font-bold' : 'text-neutral-600'}`}>m</span>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingProgress(false);
                      }}
                      className="rounded bg-[#262626] px-2 py-1 text-[11px] text-neutral-300 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isUpdatingProgress}
                      onClick={handleSaveDirectProgress}
                      className="flex items-center gap-1 rounded bg-purple-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-purple-500"
                    >
                      <Check className="h-3 w-3" />
                      Save
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                className="mt-2.5 flex items-center justify-between rounded-lg border border-purple-500/25 bg-purple-950/25 px-2.5 py-1.5 text-xs cursor-default"
                onClick={(e) => {
                  e.stopPropagation();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {/* 1. Current episode */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-semibold text-purple-300">Series Progress:</span>
                  <span className="rounded bg-purple-500/30 px-2 py-0.5 text-xs font-bold text-purple-200 border border-purple-500/40 tracking-wide">
                    S{curSeason} E{curEpisode}
                  </span>
                  {movie.status === 'DOING' && (movie.currentHour !== null || movie.currentMinute !== null) && (
                    <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-bold text-sky-300 border border-sky-500/30">
                      {movie.currentHour || 0}h {movie.currentMinute || 0}m
                    </span>
                  )}
                </div>

                {/* 2. Edit button & 3. Next episode button */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSeriesModalOpen(true);
                    }}
                    title="Manage Series Progress"
                    className="flex items-center gap-1 text-[11px] font-medium text-purple-300 hover:text-white bg-purple-900/40 hover:bg-purple-800/60 px-2 py-1 rounded transition-colors"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    disabled={isUpdatingProgress}
                    onClick={(e) => handleStepEpisode(e, 1)}
                    title="Next Episode"
                    className="flex items-center justify-center rounded bg-purple-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-purple-500 disabled:opacity-40 transition-colors shadow-sm"
                  >
                    + Ep
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Genre Tags (without word Genre) */}
          {genresList.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
              {genresList.map((genre) => (
                <span
                  key={genre}
                  className="rounded bg-[#1A1A1A] px-2 py-0.5 font-medium text-neutral-300 border border-neutral-800"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Three Status Buttons: To do, Doing, Done */}
        <div className="mt-3.5 border-t border-neutral-800/80 pt-2.5">
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#1A1A1A] border border-neutral-800">
            {(
              [
                {
                  id: 'TO_DO',
                  label: 'To do',
                  dot: 'bg-yellow-400',
                  activeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 font-bold shadow-sm',
                },
                {
                  id: 'DOING',
                  label: 'Doing',
                  dot: 'bg-blue-400',
                  activeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold shadow-sm',
                },
                {
                  id: 'DONE',
                  label: 'Done',
                  dot: 'bg-green-400',
                  activeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold shadow-sm',
                },
              ] as const
            ).map((item) => {
              const isSelected = movie.status === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isChangingStatus}
                  onClick={(e) => handleQuickStatus(e, item.id as WatchStatus)}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs transition-all border ${
                    isSelected
                      ? item.activeClass
                      : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                  } disabled:opacity-50`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${item.dot} ${
                      isSelected ? 'ring-2 ring-current ring-opacity-30' : 'opacity-60'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Series Progress Modal */}
      {isSeriesModalOpen && onUpdateMovie && (
        <SeriesProgressModal
          isOpen={isSeriesModalOpen}
          onClose={() => setIsSeriesModalOpen(false)}
          movie={movie}
          onUpdateMovie={onUpdateMovie}
        />
      )}
    </div>
  );
}
