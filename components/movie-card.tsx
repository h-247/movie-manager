import React, { useState } from 'react';
import { ExternalLink, Star, Globe } from 'lucide-react';
import type { Movie, WatchStatus } from '@/db/schema';
import { StatusBadge } from './status-badge';
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

export interface EpisodeItem {
  season: number;
  episode: number;
  status: 'To do' | 'Doing' | 'Done';
  hour?: number;
  minute?: number;
}

export function getSeriesEpisodes(movie: Movie): EpisodeItem[] {
  const totalSeas = movie.totalSeasons || 1;
  const totalEps = movie.totalEpisodes || null;
  const epsPerSeason = totalEps && totalSeas ? Math.ceil(totalEps / totalSeas) : (totalEps || 8);

  let list: EpisodeItem[] = [];

  if (movie.seriesProgress) {
    try {
      const parsed = JSON.parse(movie.seriesProgress);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed.map((item: any) => ({
          season: typeof item.season === 'number' && item.season > 0 ? item.season : 1,
          episode: typeof item.episode === 'number' && item.episode > 0 ? item.episode : 1,
          status: item.status === 'Done' ? 'Done' : item.status === 'Doing' ? 'Doing' : 'To do',
          hour: typeof item.hour === 'number' && item.hour >= 0 ? Math.min(item.hour, 99) : 0,
          minute: typeof item.minute === 'number' && item.minute >= 0 ? Math.min(item.minute, 59) : 0,
        }));
      }
    } catch {
      // ignore
    }
  }

  if (list.length === 0) {
    for (let s = 1; s <= totalSeas; s++) {
      for (let e = 1; e <= epsPerSeason; e++) {
        const curS = movie.currentSeason || 1;
        const curE = movie.currentEpisode || 1;
        let epStatus: 'To do' | 'Doing' | 'Done' = 'To do';
        if (movie.status === 'DONE') {
          epStatus = 'Done';
        } else if (movie.status === 'DOING') {
          if (s < curS || (s === curS && e < curE)) {
            epStatus = 'Done';
          } else if (s === curS && e === curE) {
            epStatus = 'Doing';
          } else {
            epStatus = 'To do';
          }
        }
        list.push({
          season: s,
          episode: e,
          status: epStatus,
          hour: 0,
          minute: 0,
        });
      }
    }
  }

  list.sort((a, b) => a.season - b.season || a.episode - b.episode);
  return list;
}

export function getActiveSeriesEpisode(movie: Movie, episodes: EpisodeItem[]): EpisodeItem {
  if (episodes.length === 0) {
    return {
      season: movie.currentSeason || 1,
      episode: movie.currentEpisode || 1,
      status: 'To do',
      hour: 0,
      minute: 0,
    };
  }

  // 1. If an episode is currently 'Doing', that is the active episode
  const doingEp = episodes.find((ep) => ep.status === 'Doing');
  if (doingEp) return doingEp;

  // 2. If movie has a currentSeason/currentEpisode and that episode is 'To do', use it
  const curS = movie.currentSeason || 1;
  const curE = movie.currentEpisode || 1;
  const matchingCur = episodes.find(
    (ep) => ep.season === curS && ep.episode === curE && ep.status === 'To do',
  );
  if (matchingCur) return matchingCur;

  // 3. Otherwise, next episode to watch is the first 'To do' episode
  const firstToDo = episodes.find((ep) => ep.status === 'To do');
  if (firstToDo) return firstToDo;

  // 4. If no 'Doing' and no 'To do', all episodes are 'Done' -> return the last episode
  return episodes[episodes.length - 1];
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

  const seriesEpisodes = movie.mediaType === 'SERIES' ? getSeriesEpisodes(movie) : [];
  const activeSeriesEpisode =
    movie.mediaType === 'SERIES'
      ? getActiveSeriesEpisode(movie, seriesEpisodes)
      : null;

  const displayStatus: WatchStatus = (() => {
    if (movie.mediaType === 'SERIES' && seriesEpisodes.length > 0) {
      if (seriesEpisodes.every((ep) => ep.status === 'Done')) return 'DONE';
      if (seriesEpisodes.some((ep) => ep.status === 'Doing' || ep.status === 'Done')) {
        return 'DOING';
      }
      return 'TO_DO';
    }
    return movie.status as WatchStatus;
  })();

  const handleEpisodeStatusChange = async (
    e: React.MouseEvent,
    targetSeason: number,
    targetEpisode: number,
    newEpStatus: 'To do' | 'Doing' | 'Done',
  ) => {
    e.stopPropagation();
    if (isUpdatingProgress || !onUpdateMovie) return;

    try {
      setIsUpdatingProgress(true);

      const episodes = getSeriesEpisodes(movie);
      let foundTarget = false;
      const updatedEpisodes = episodes.map((item) => {
        if (item.season === targetSeason && item.episode === targetEpisode) {
          foundTarget = true;
          return { ...item, status: newEpStatus };
        }
        return item;
      });

      if (!foundTarget) {
        updatedEpisodes.push({
          season: targetSeason,
          episode: targetEpisode,
          status: newEpStatus,
          hour: 0,
          minute: 0,
        });
        updatedEpisodes.sort((a, b) => a.season - b.season || a.episode - b.episode);
      }

      const allDone =
        updatedEpisodes.length > 0 && updatedEpisodes.every((ep) => ep.status === 'Done');
      const hasDoing = updatedEpisodes.some((ep) => ep.status === 'Doing');
      const hasDone = updatedEpisodes.some((ep) => ep.status === 'Done');

      let overallStatus: WatchStatus = 'TO_DO';
      if (allDone) {
        overallStatus = 'DONE';
      } else if (hasDoing || hasDone) {
        overallStatus = 'DOING';
      } else {
        overallStatus = 'TO_DO';
      }

      let nextSeason = targetSeason;
      let nextEpisode = targetEpisode;

      if (newEpStatus === 'Done') {
        const doingEp = updatedEpisodes.find((ep) => ep.status === 'Doing');
        if (doingEp) {
          nextSeason = doingEp.season;
          nextEpisode = doingEp.episode;
        } else {
          const nextToDo =
            updatedEpisodes.find(
              (ep) =>
                ep.status === 'To do' &&
                (ep.season > targetSeason ||
                  (ep.season === targetSeason && ep.episode > targetEpisode)),
            ) || updatedEpisodes.find((ep) => ep.status === 'To do');

          if (nextToDo) {
            nextSeason = nextToDo.season;
            nextEpisode = nextToDo.episode;
          } else {
            const lastEp = updatedEpisodes[updatedEpisodes.length - 1];
            if (lastEp) {
              nextSeason = lastEp.season;
              nextEpisode = lastEp.episode;
            }
          }
        }
      } else {
        nextSeason = targetSeason;
        nextEpisode = targetEpisode;
      }

      await onUpdateMovie(movie.id, {
        status: overallStatus,
        currentSeason: nextSeason,
        currentEpisode: nextEpisode,
        seriesProgress: JSON.stringify(updatedEpisodes),
      });
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  const handleMovieStatusCycle = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (movie.mediaType === 'SERIES' || isChangingStatus) return;
    const nextStatusMap: Record<WatchStatus, WatchStatus> = {
      TO_DO: 'DOING',
      DOING: 'DONE',
      DONE: 'TO_DO',
    };
    const next = nextStatusMap[movie.status as WatchStatus] || 'TO_DO';
    try {
      setIsChangingStatus(true);
      await onStatusChange(movie.id, next);
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
        {/* Top row: Title, Series, Country, Year, and IMDb Link */}
        <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-neutral-800/80">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {/* 1. Title */}
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

            {/* 3. Country */}
            {countriesList.length > 0 && (
              <span className="flex items-center gap-1 rounded bg-[#1A1A1A] border border-neutral-700/60 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300">
                <Globe className="h-2.5 w-2.5 text-cyan-400 shrink-0" />
                <span>{countriesList.join(', ')}</span>
              </span>
            )}

            {/* 4. Year */}
            {movie.releaseYear && (
              <span className="rounded bg-[#1A1A1A] border border-neutral-700/60 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300">
                {movie.releaseYear}
              </span>
            )}
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
          {/* Series Progress on Card: ONLY S1 E1 (or current episode) and 3 buttons To do, Doing, Done */}
          {movie.mediaType === 'SERIES' && activeSeriesEpisode && (
            <div
              className="mt-2.5 flex items-center justify-between rounded-lg border border-purple-500/25 bg-purple-950/25 px-2.5 py-1.5 text-xs cursor-default"
              onClick={(e) => {
                e.stopPropagation();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* 1. Episode badge: e.g. S1 E1 or S1 E2 */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSeriesModalOpen(true);
                }}
                title="Click to view/manage all episodes"
                className="rounded bg-purple-500/30 px-2.5 py-1 text-xs font-bold text-purple-200 border border-purple-500/40 hover:bg-purple-500/50 transition-colors tracking-wide"
              >
                S{activeSeriesEpisode.season} E{activeSeriesEpisode.episode}
              </button>

              {/* 2. Three status buttons: To do, Doing, Done */}
              <div className="flex items-center gap-1 rounded-lg bg-black/40 p-0.5 border border-purple-500/20">
                {(
                  [
                    {
                      id: 'To do',
                      label: 'To do',
                      dot: 'bg-yellow-400',
                      activeClass:
                        'bg-yellow-500/25 text-yellow-300 border-yellow-500/40 font-bold shadow-sm',
                    },
                    {
                      id: 'Doing',
                      label: 'Doing',
                      dot: 'bg-blue-400',
                      activeClass:
                        'bg-sky-500/25 text-sky-300 border-sky-500/40 font-bold shadow-sm',
                    },
                    {
                      id: 'Done',
                      label: 'Done',
                      dot: 'bg-green-400',
                      activeClass:
                        'bg-emerald-500/25 text-emerald-300 border-emerald-500/40 font-bold shadow-sm',
                    },
                  ] as const
                ).map((btn) => {
                  const isSelected = activeSeriesEpisode.status === btn.id;
                  return (
                    <button
                      key={btn.id}
                      type="button"
                      disabled={isUpdatingProgress}
                      onClick={(e) =>
                        handleEpisodeStatusChange(
                          e,
                          activeSeriesEpisode.season,
                          activeSeriesEpisode.episode,
                          btn.id,
                        )
                      }
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] transition-all border ${
                        isSelected
                          ? btn.activeClass
                          : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                      } disabled:opacity-50`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${btn.dot} ${
                          isSelected ? 'ring-1 ring-current' : 'opacity-60'
                        }`}
                      />
                      <span>{btn.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Genre Tags */}
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

        {/* Movie Status at bottom of card */}
        <div className="mt-3.5 border-t border-neutral-800/80 pt-2.5 flex items-center justify-between">
          <StatusBadge
            status={displayStatus}
            size="sm"
            onClick={movie.mediaType !== 'SERIES' ? () => { handleMovieStatusCycle(); } : undefined}
          />
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
