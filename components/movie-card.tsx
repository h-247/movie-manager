import React, { useState } from 'react';
import { ExternalLink, Star, Globe } from 'lucide-react';
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
  onUpdateMovie?: (
    movieId: string,
    updates: Record<string, any>,
  ) => Promise<void>;
}

export function MovieCard({
  movie,
  onOpenDetails,
  onStatusChange,
  onUpdateMovie,
}: MovieCardProps) {
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);

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

  const handleEpisodeStatusChange = async (
    e: React.ChangeEvent<HTMLSelectElement> | React.MouseEvent,
    newEpStatus: 'To do' | 'Doing' | 'Done',
  ) => {
    e.stopPropagation();
    if (isUpdatingProgress || !onUpdateMovie) return;

    const curS = movie.currentSeason || 1;
    const curE = movie.currentEpisode || 1;
    const dbStatus: WatchStatus =
      newEpStatus === 'Done' ? 'DONE' : newEpStatus === 'Doing' ? 'DOING' : 'TO_DO';

    let updatedProgressJson = movie.seriesProgress;
    if (movie.seriesProgress) {
      try {
        const parsed = JSON.parse(movie.seriesProgress);
        if (Array.isArray(parsed)) {
          const updated = parsed.map((item: any) => {
            if (item.season === curS && item.episode === curE) {
              return { ...item, status: newEpStatus };
            }
            return item;
          });
          updatedProgressJson = JSON.stringify(updated);
        }
      } catch {
        // fallback
      }
    }

    try {
      setIsUpdatingProgress(true);
      await onUpdateMovie(movie.id, {
        status: dbStatus,
        seriesProgress: updatedProgressJson,
      });
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
        {/* Top row: Crew Girl, Series, Canada, 2026, To do, and IMDb Link */}
        <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-neutral-800/80">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {/* 1. Crew Girl (Title) */}
            <h3
              className="text-base font-bold text-white group-hover:text-purple-300 leading-snug transition-colors truncate"
              title={movie.title}
            >
              {movie.title}
            </h3>

            {/* 2. Series (or Movie) */}
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${
                movie.mediaType === 'SERIES'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
              }`}
            >
              {movie.mediaType === 'SERIES' ? 'Series' : 'Movie'}
            </span>

            {/* 3. Canada */}
            {countriesList.length > 0 && (
              <span className="flex items-center gap-1 rounded bg-[#1A1A1A] border border-neutral-700/60 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300">
                <Globe className="h-2.5 w-2.5 text-cyan-400 shrink-0" />
                <span>{countriesList.join(', ')}</span>
              </span>
            )}

            {/* 4. 2026 */}
            {movie.releaseYear && (
              <span className="rounded bg-[#1A1A1A] border border-neutral-700/60 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300">
                {movie.releaseYear}
              </span>
            )}

            {/* 5. To do */}
            <StatusBadge status={movie.status as WatchStatus} size="sm" />
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
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

        <div>
          {/* Series Progress on Card: shows episode, status selector, and next episode button */}
          {movie.mediaType === 'SERIES' && (() => {
            const totalSeas = movie.totalSeasons || 1;
            const totalEps = movie.totalEpisodes || null;
            const epsPerSeason = totalEps && totalSeas ? Math.ceil(totalEps / totalSeas) : (totalEps || null);
            const curSeason = Math.min(Math.max(movie.currentSeason || 1, 1), totalSeas);
            const curEpisode = epsPerSeason ? Math.min(Math.max(movie.currentEpisode || 1, 1), epsPerSeason) : (movie.currentEpisode || 1);

            let curEpStatus: 'To do' | 'Doing' | 'Done' =
              movie.status === 'DONE' ? 'Done' : movie.status === 'DOING' ? 'Doing' : 'To do';
            if (movie.seriesProgress) {
              try {
                const parsed = JSON.parse(movie.seriesProgress);
                if (Array.isArray(parsed)) {
                  const found = parsed.find(
                    (item: any) => item.season === curSeason && item.episode === curEpisode,
                  );
                  if (found?.status) {
                    curEpStatus = found.status;
                  }
                }
              } catch {
                // fallback
              }
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
                {/* 1. Episode badge (click to manage episodes table) & Episode status dropdown */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSeriesModalOpen(true);
                    }}
                    title="Click to view/manage all episodes"
                    className="rounded bg-purple-500/30 px-2 py-0.5 text-xs font-bold text-purple-200 border border-purple-500/40 hover:bg-purple-500/50 transition-colors tracking-wide"
                  >
                    S{curSeason} E{curEpisode}
                  </button>

                  <select
                    value={curEpStatus}
                    disabled={isUpdatingProgress}
                    onChange={(e) =>
                      handleEpisodeStatusChange(
                        e,
                        e.target.value as 'To do' | 'Doing' | 'Done',
                      )
                    }
                    className={`rounded border px-1.5 py-0.5 text-[11px] font-semibold focus:outline-none transition-colors ${
                      curEpStatus === 'Done'
                        ? 'border-emerald-500/50 bg-emerald-950/60 text-emerald-300'
                        : curEpStatus === 'Doing'
                        ? 'border-sky-500/60 bg-sky-950/60 text-sky-300 font-bold'
                        : 'border-amber-500/50 bg-amber-950/60 text-amber-300'
                    }`}
                  >
                    <option value="To do" className="bg-[#1A1A1A] text-amber-300">
                      To do
                    </option>
                    <option value="Doing" className="bg-[#1A1A1A] text-sky-300 font-bold">
                      Doing
                    </option>
                    <option value="Done" className="bg-[#1A1A1A] text-emerald-300">
                      Done
                    </option>
                  </select>

                  {movie.status === 'DOING' &&
                    (movie.currentHour !== null || movie.currentMinute !== null) && (
                      <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-bold text-sky-300 border border-sky-500/30">
                        {movie.currentHour || 0}h {movie.currentMinute || 0}m
                      </span>
                    )}
                </div>

                {/* 2. Next episode button */}
                <div className="flex items-center gap-1.5 ml-auto">
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
