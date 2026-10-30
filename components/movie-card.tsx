import React, { useState, useEffect } from 'react';
import { ExternalLink, Star, Film, ChevronDown, Check, Globe, Edit2, X } from 'lucide-react';
import type { Movie, WatchStatus } from '@/db/schema';
import { StatusBadge } from './status-badge';
import { getFullPosterUrl } from '@/lib/tmdb';

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
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // Series progress edit state on card
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [editSeasonVal, setEditSeasonVal] = useState<number | string>(movie.currentSeason || 1);
  const [editEpisodeVal, setEditEpisodeVal] = useState<number | string>(movie.currentEpisode || 1);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);

  useEffect(() => {
    setEditSeasonVal(movie.currentSeason || 1);
    setEditEpisodeVal(movie.currentEpisode || 1);
  }, [movie.currentSeason, movie.currentEpisode]);

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

    try {
      setIsUpdatingProgress(true);
      await onUpdateMovie(movie.id, {
        currentSeason: validS,
        currentEpisode: validEp,
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
    setShowStatusMenu(false);
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
        {/* Card Header Row: Status, Type, Rating, IMDb Link */}
        <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-neutral-800/80">
          <div className="flex items-center gap-1.5">
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
          </div>

          <div className="flex items-center gap-1.5">
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
            <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
              {movie.mediaType === 'SERIES' && (
                <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-purple-300 border border-purple-500/30">
                  S{movie.currentSeason || 1} E{movie.currentEpisode || 1}
                </span>
              )}
              {movie.releaseYear && (
                <span className="shrink-0 text-xs font-medium text-neutral-400">
                  {movie.releaseYear}
                </span>
              )}
            </div>
          </div>

          {/* Production Country - Only name of country */}
          {countriesList.length > 0 && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-neutral-300">
              <Globe className="h-3 w-3 text-cyan-400 shrink-0" />
              <span className="truncate font-medium">{countriesList.join(', ')}</span>
            </div>
          )}

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
                    <span className="font-semibold text-purple-200">Edit Series Progress</span>
                    <span className="rounded bg-purple-900/60 px-1.5 py-0.5 text-[10px] font-bold text-purple-200 border border-purple-500/30">
                      S{curSeason} E{curEpisode}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-0.5">Season:</label>
                      <input
                        type="number"
                        min={1}
                        max={movie.totalSeasons || 99}
                        value={editSeasonVal}
                        onChange={(e) => setEditSeasonVal(e.target.value)}
                        className="w-full rounded bg-[#1A1A1A] border border-neutral-700 px-2 py-1 text-xs text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-0.5">Current Episode:</label>
                      <input
                        type="number"
                        min={1}
                        max={epsPerSeason || 999}
                        value={editEpisodeVal}
                        onChange={(e) => setEditEpisodeVal(e.target.value)}
                        className="w-full rounded bg-[#1A1A1A] border border-neutral-700 px-2 py-1 text-xs text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>
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
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-purple-300">Series Progress:</span>
                  <span className="rounded bg-purple-500/30 px-2 py-0.5 text-xs font-bold text-purple-200 border border-purple-500/40 tracking-wide">
                    S{curSeason} E{curEpisode}
                  </span>
                </div>

                {/* 2. Edit button & 3. Next episode button */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingProgress(true);
                    }}
                    title="Edit Series Progress"
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

          {/* Genre Tags (Updated from Main Genre to Genre) */}
          {genresList.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-neutral-400 text-[10px] font-semibold">Genre:</span>
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

        {/* Quick Status Control at bottom of card */}
        <div className="mt-3.5 border-t border-neutral-800/80 pt-2.5">
          <div className="relative">
            <button
              type="button"
              disabled={isChangingStatus}
              onClick={(e) => {
                e.stopPropagation();
                setShowStatusMenu(!showStatusMenu);
              }}
              className="flex w-full items-center justify-between rounded-lg bg-[#1A1A1A] px-2.5 py-1.5 text-xs text-neutral-300 border border-neutral-800 hover:border-neutral-700 hover:text-white transition-colors"
            >
              <span className="text-[11px] text-neutral-400">Status:</span>
              <span className="flex items-center gap-1 font-medium text-[#ECECEC]">
                {movie.status === 'TO_DO'
                  ? 'To do'
                  : movie.status === 'DOING'
                  ? 'Doing'
                  : 'Done'}
                <ChevronDown className="h-3 w-3 text-neutral-500" />
              </span>
            </button>

            {/* Quick Status Dropdown Menu */}
            {showStatusMenu && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowStatusMenu(false);
                  }}
                />
                <div className="absolute bottom-full left-0 right-0 z-30 mb-1 rounded-lg border border-neutral-700 bg-[#262626] p-1 shadow-xl">
                  {(['TO_DO', 'DOING', 'DONE'] as WatchStatus[]).map((st) => {
                    const isSelected = movie.status === st;
                    const labels = {
                      TO_DO: 'To do',
                      DOING: 'Doing',
                      DONE: 'Done',
                    };
                    const dotColors = {
                      TO_DO: 'bg-yellow-400',
                      DOING: 'bg-blue-400',
                      DONE: 'bg-green-400',
                    };

                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={(e) => handleQuickStatus(e, st)}
                        className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-xs transition-colors ${
                          isSelected
                            ? 'bg-neutral-800 text-white font-medium'
                            : 'text-neutral-300 hover:bg-[#333333] hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${dotColors[st]}`}
                          />
                          {labels[st]}
                        </span>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
