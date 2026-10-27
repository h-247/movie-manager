import React, { useState } from 'react';
import { ExternalLink, Star, Film, ChevronDown, Check } from 'lucide-react';
import type { Movie, WatchStatus } from '@/db/schema';
import { StatusBadge } from './status-badge';
import { getFullPosterUrl } from '@/lib/tmdb';

interface MovieCardProps {
  movie: Movie;
  onOpenDetails: (movie: Movie) => void;
  onStatusChange: (movieId: string, newStatus: WatchStatus) => Promise<void>;
}

export function MovieCard({
  movie,
  onOpenDetails,
  onStatusChange,
}: MovieCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const posterUrl = getFullPosterUrl(movie.posterPath);

  let genresList: string[] = [];
  if (movie.genres) {
    try {
      const parsed = JSON.parse(movie.genres);
      if (Array.isArray(parsed)) {
        genresList = parsed;
      }
    } catch {
      // ignore
    }
  }

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
      className="group relative flex flex-col overflow-hidden rounded-xl border border-neutral-800 bg-[#262626] transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-700 hover:shadow-lg cursor-pointer"
    >
      {/* Poster Image */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-900">
        {posterUrl && !imageError ? (
          <img
            src={posterUrl}
            alt={movie.title}
            loading="lazy"
            onError={() => setImageError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-4 text-neutral-600">
            <Film className="h-12 w-12 stroke-[1.5] text-neutral-500" />
            <span className="mt-2 text-center text-xs font-medium text-neutral-400">
              No Poster Available
            </span>
          </div>
        )}

        {/* Rating Badge Top Left */}
        {movie.personalRating && (
          <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-md bg-black/80 px-2 py-0.5 text-xs font-semibold text-amber-400 backdrop-blur-sm border border-white/10">
            <Star className="h-3 w-3 fill-amber-400" />
            <span>{movie.personalRating}/10</span>
          </div>
        )}

        {/* IMDb external link top right */}
        <a
          href={movie.imdbUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="Open on IMDb"
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-md bg-black/80 text-neutral-300 backdrop-blur-sm border border-white/10 transition-colors hover:text-white hover:bg-neutral-800"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>

        {/* Status indicator pill bottom left of poster */}
        <div className="absolute bottom-2.5 left-2.5">
          <StatusBadge status={movie.status as WatchStatus} size="sm" />
        </div>
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col justify-between p-3.5">
        <div>
          <div className="flex items-start justify-between gap-1">
            <h3
              className="line-clamp-1 text-sm font-semibold text-[#ECECEC] group-hover:text-white"
              title={movie.title}
            >
              {movie.title}
            </h3>
            {movie.releaseYear && (
              <span className="shrink-0 text-xs font-medium text-neutral-400">
                {movie.releaseYear}
              </span>
            )}
          </div>

          {/* Genres Chips */}
          {genresList.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {genresList.slice(0, 2).map((genre) => (
                <span
                  key={genre}
                  className="rounded bg-[#1A1A1A] px-1.5 py-0.5 text-[11px] font-medium text-neutral-400 border border-neutral-800"
                >
                  {genre}
                </span>
              ))}
              {genresList.length > 2 && (
                <span className="rounded bg-[#1A1A1A] px-1.5 py-0.5 text-[11px] text-neutral-500 border border-neutral-800">
                  +{genresList.length - 2}
                </span>
              )}
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
