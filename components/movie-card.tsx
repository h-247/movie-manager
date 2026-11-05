import React, { useState, useEffect } from 'react';
import { Star, Clock } from 'lucide-react';
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
  stremio?: string;
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
          stremio: typeof item.stremio === 'string' ? item.stremio : typeof item.stremioLink === 'string' ? item.stremioLink : '',
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
          stremio: '',
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

  const [rawHour, setRawHour] = useState<string>(() =>
    String(activeSeriesEpisode?.hour ?? movie.currentHour ?? 0),
  );
  const [rawMinute, setRawMinute] = useState<string>(() =>
    String(activeSeriesEpisode?.minute ?? movie.currentMinute ?? 0),
  );

  useEffect(() => {
    if (activeSeriesEpisode) {
      setRawHour(String(activeSeriesEpisode.hour ?? movie.currentHour ?? 0));
      setRawMinute(String(activeSeriesEpisode.minute ?? movie.currentMinute ?? 0));
    }
  }, [
    activeSeriesEpisode?.season,
    activeSeriesEpisode?.episode,
    activeSeriesEpisode?.hour,
    activeSeriesEpisode?.minute,
    movie.currentHour,
    movie.currentMinute,
  ]);

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

  const handleTimeUpdate = async (newH: number, newM: number) => {
    if (!onUpdateMovie || !activeSeriesEpisode) return;

    const episodes = getSeriesEpisodes(movie);
    const updatedEpisodes = episodes.map((item) => {
      if (
        item.season === activeSeriesEpisode.season &&
        item.episode === activeSeriesEpisode.episode
      ) {
        return { ...item, hour: newH, minute: newM };
      }
      return item;
    });

    await onUpdateMovie(movie.id, {
      currentHour: newH,
      currentMinute: newM,
      seriesProgress: JSON.stringify(updatedEpisodes),
    });
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRawHour(val);
    const parsed = parseInt(val);
    if (!isNaN(parsed)) {
      const clamped = Math.max(0, Math.min(99, parsed));
      handleTimeUpdate(clamped, Math.max(0, Math.min(59, parseInt(rawMinute) || 0)));
    }
  };

  const handleHourBlur = () => {
    const parsed = Math.max(0, Math.min(99, parseInt(rawHour) || 0));
    setRawHour(String(parsed));
    handleTimeUpdate(parsed, Math.max(0, Math.min(59, parseInt(rawMinute) || 0)));
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRawMinute(val);
    const parsed = parseInt(val);
    if (!isNaN(parsed)) {
      const clamped = Math.max(0, Math.min(59, parsed));
      handleTimeUpdate(Math.max(0, Math.min(99, parseInt(rawHour) || 0)), clamped);
    }
  };

  const handleMinuteBlur = () => {
    const parsed = Math.max(0, Math.min(59, parseInt(rawMinute) || 0));
    setRawMinute(String(parsed));
    handleTimeUpdate(Math.max(0, Math.min(99, parseInt(rawHour) || 0)), parsed);
  };

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
          return {
            ...item,
            status: newEpStatus,
            hour:
              newEpStatus === 'Doing'
                ? (item.hour ?? Math.max(0, Math.min(99, parseInt(rawHour) || 0)))
                : 0,
            minute:
              newEpStatus === 'Doing'
                ? (item.minute ?? Math.max(0, Math.min(59, parseInt(rawMinute) || 0)))
                : 0,
            stremio: item.stremio || '',
          };
        }
        return item;
      });

      if (!foundTarget) {
        updatedEpisodes.push({
          season: targetSeason,
          episode: targetEpisode,
          status: newEpStatus,
          hour: newEpStatus === 'Doing' ? Math.max(0, Math.min(99, parseInt(rawHour) || 0)) : 0,
          minute: newEpStatus === 'Doing' ? Math.max(0, Math.min(59, parseInt(rawMinute) || 0)) : 0,
          stremio: '',
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
      let nextHour: number | null = null;
      let nextMinute: number | null = null;

      if (newEpStatus === 'Done') {
        const doingEp = updatedEpisodes.find((ep) => ep.status === 'Doing');
        if (doingEp) {
          nextSeason = doingEp.season;
          nextEpisode = doingEp.episode;
          nextHour = doingEp.hour ?? 0;
          nextMinute = doingEp.minute ?? 0;
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
            nextHour = null;
            nextMinute = null;
          } else {
            const lastEp = updatedEpisodes[updatedEpisodes.length - 1];
            if (lastEp) {
              nextSeason = lastEp.season;
              nextEpisode = lastEp.episode;
              nextHour = null;
              nextMinute = null;
            }
          }
        }
      } else if (newEpStatus === 'Doing') {
        nextSeason = targetSeason;
        nextEpisode = targetEpisode;
        nextHour = Math.max(0, Math.min(99, parseInt(rawHour) || 0));
        nextMinute = Math.max(0, Math.min(59, parseInt(rawMinute) || 0));
      } else {
        nextSeason = targetSeason;
        nextEpisode = targetEpisode;
        nextHour = null;
        nextMinute = null;
      }

      await onUpdateMovie(movie.id, {
        status: overallStatus,
        currentSeason: nextSeason,
        currentEpisode: nextEpisode,
        currentHour: nextHour,
        currentMinute: nextMinute,
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
        {/* Card Header: Title, Series/Movie badge, Country, and Movie Status next to each other on same line */}
        <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-neutral-800/80">
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            {/* Title - click to show best trailer in YouTube */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const query = encodeURIComponent(
                  `${movie.title} ${movie.releaseYear ? `${movie.releaseYear} ` : ''}official trailer`,
                );
                if (typeof window !== 'undefined') {
                  window.open(
                    `https://www.youtube.com/results?search_query=${query}`,
                    '_blank',
                    'noopener,noreferrer',
                  );
                }
              }}
              title={`Click to show best trailer for "${movie.title}" in YouTube`}
              className="group/title text-left text-base font-bold text-white hover:text-red-400 focus:outline-none transition-colors truncate min-w-0 shrink"
            >
              <span className="truncate">{movie.title}</span>
            </button>

            {/* Series (or Movie) */}
            <button
              type="button"
              onClick={(e) => {
                if (movie.mediaType === 'SERIES') {
                  e.stopPropagation();
                  setIsSeriesModalOpen(true);
                }
              }}
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border shrink-0 whitespace-nowrap ${
                movie.mediaType === 'SERIES'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30 cursor-pointer'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
              }`}
              title={movie.mediaType === 'SERIES' ? 'Click to manage series progress' : undefined}
            >
              {movie.mediaType === 'SERIES' ? 'Series' : 'Movie'}
            </button>

            {/* Country (Full Name without truncation) */}
            {countriesList.length > 0 && (
              <span
                className="rounded bg-[#1A1A1A] border border-neutral-700/60 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300 shrink-0 whitespace-nowrap"
                title={countriesList.join(', ')}
              >
                {countriesList.join(', ')}
              </span>
            )}

            {/* Movie Status */}
            <StatusBadge
              status={displayStatus}
              size="sm"
              onClick={
                movie.mediaType !== 'SERIES'
                  ? (e) => {
                      e?.stopPropagation();
                      handleMovieStatusCycle(e);
                    }
                  : undefined
              }
            />
          </div>

          {movie.personalRating && (
            <div className="flex items-center gap-1 rounded-md bg-[#1A1A1A] px-1.5 py-0.5 text-xs font-semibold text-amber-400 border border-neutral-800 shrink-0">
              <Star className="h-3 w-3 fill-amber-400" />
              <span>{movie.personalRating}/10</span>
            </div>
          )}
        </div>

        <div>
          {/* Series Progress on Card: ONLY S1 E1 and 3 buttons To do, Doing, Done + Hour/Minute when Doing */}
          {movie.mediaType === 'SERIES' && activeSeriesEpisode && (
            <div
              className="mt-2.5 rounded-lg border border-purple-500/25 bg-purple-950/25 px-2.5 py-1.5 text-xs cursor-default overflow-hidden"
              onClick={(e) => {
                e.stopPropagation();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* Row 1: Episode badge and 3 status buttons placed next to each other */}
              <div className="flex items-center gap-2 min-w-0">
                {/* 1. Episode badge: e.g. S1 E1 or S1 E2 - click opens stremio link & marks as doing */}
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const stremioLink = activeSeriesEpisode.stremio?.trim();
                    if (stremioLink && typeof window !== 'undefined') {
                      window.open(stremioLink, '_blank', 'noopener,noreferrer');
                    }
                    if (activeSeriesEpisode.status !== 'Doing') {
                      await handleEpisodeStatusChange(
                        e,
                        activeSeriesEpisode.season,
                        activeSeriesEpisode.episode,
                        'Doing',
                      );
                    }
                    if (!stremioLink) {
                      setIsSeriesModalOpen(true);
                    }
                  }}
                  title={
                    activeSeriesEpisode.stremio
                      ? `Open Stremio & set Doing (S${activeSeriesEpisode.season} E${activeSeriesEpisode.episode})`
                      : `Set Doing & manage episodes (S${activeSeriesEpisode.season} E${activeSeriesEpisode.episode})`
                  }
                  className="rounded bg-purple-500/30 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs font-bold text-purple-200 border border-purple-500/40 hover:bg-purple-500/50 transition-colors tracking-wide shrink-0 whitespace-nowrap"
                >
                  S{activeSeriesEpisode.season} E{activeSeriesEpisode.episode}
                </button>

                {/* 2. Three status buttons: To do, Doing, Done */}
                <div className="flex items-center gap-0.5 rounded-lg bg-black/40 p-0.5 border border-purple-500/20 min-w-0">
                  {(
                    [
                      {
                        id: 'To do',
                        label: 'To do',
                        activeClass:
                          'bg-yellow-500/25 text-yellow-300 border-yellow-500/40 font-bold shadow-sm',
                      },
                      {
                        id: 'Doing',
                        label: 'Doing',
                        activeClass:
                          'bg-sky-500/25 text-sky-300 border-sky-500/40 font-bold shadow-sm',
                      },
                      {
                        id: 'Done',
                        label: 'Done',
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
                        className={`flex items-center justify-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] whitespace-nowrap transition-all border ${
                          isSelected
                            ? btn.activeClass
                            : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                        } disabled:opacity-50`}
                      >
                        <span className="whitespace-nowrap">{btn.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 2: Input hour and minute if episode status is Doing */}
              {activeSeriesEpisode.status === 'Doing' && (
                <div
                  className="mt-2 pt-2 border-t border-purple-500/20 flex items-center justify-between gap-2"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1.5 text-[11px] text-sky-300 font-medium">
                    <Clock className="h-3 w-3 text-sky-400 shrink-0" />
                    <span>Watch Time:</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={rawHour}
                        onChange={handleHourChange}
                        onBlur={handleHourBlur}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-11 rounded border border-neutral-700 bg-black/60 px-1 py-0.5 text-center font-mono text-xs text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
                      />
                      <span className="text-[11px] font-medium text-neutral-400">h</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={rawMinute}
                        onChange={handleMinuteChange}
                        onBlur={handleMinuteBlur}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-11 rounded border border-neutral-700 bg-black/60 px-1 py-0.5 text-center font-mono text-xs text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
                      />
                      <span className="text-[11px] font-medium text-neutral-400">m</span>
                    </div>
                  </div>
                </div>
              )}
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
