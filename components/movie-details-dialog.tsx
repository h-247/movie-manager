import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Star,
  Calendar,
  Clock,
  Trash2,
  Edit2,
  Save,
  Check,
  Film,
  RotateCcw,
} from 'lucide-react';
import type { Movie, WatchStatus } from '@/db/schema';
import { StatusBadge } from './status-badge';
import { getFullPosterUrl } from '@/lib/tmdb';

interface MovieDetailsDialogProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (
    movieId: string,
    updates: Record<string, any>,
  ) => Promise<void>;
  onDeleteRequest: (movie: Movie) => void;
}

export function MovieDetailsDialog({
  movie,
  isOpen,
  onClose,
  onUpdate,
  onDeleteRequest,
}: MovieDetailsDialogProps) {
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Editable fields
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [startedDate, setStartedDate] = useState('');
  const [completedDate, setCompletedDate] = useState('');

  // Editable metadata fields
  const [editTitle, setEditTitle] = useState('');
  const [editOriginalTitle, setEditOriginalTitle] = useState('');
  const [editReleaseYear, setEditReleaseYear] = useState<string>('');
  const [editReleaseDate, setEditReleaseDate] = useState('');
  const [editRuntime, setEditRuntime] = useState<string>('');
  const [editOverview, setEditOverview] = useState('');
  const [editGenres, setEditGenres] = useState('');
  const [editPosterPath, setEditPosterPath] = useState('');

  useEffect(() => {
    if (movie) {
      setRating(movie.personalRating ?? null);
      setNotes(movie.notes ?? '');
      setStartedDate(movie.startedAt ? movie.startedAt.slice(0, 10) : '');
      setCompletedDate(movie.completedAt ? movie.completedAt.slice(0, 10) : '');

      setEditTitle(movie.title);
      setEditOriginalTitle(movie.originalTitle ?? '');
      setEditReleaseYear(movie.releaseYear ? String(movie.releaseYear) : '');
      setEditReleaseDate(movie.releaseDate ?? '');
      setEditRuntime(movie.runtimeMinutes ? String(movie.runtimeMinutes) : '');
      setEditOverview(movie.overview ?? '');
      setEditPosterPath(movie.posterPath ?? '');

      let parsedG: string[] = [];
      try {
        if (movie.genres) parsedG = JSON.parse(movie.genres);
      } catch {
        // ignore
      }
      setEditGenres(parsedG.join(', '));
      setIsEditingMetadata(false);
      setImageError(false);
    }
  }, [movie]);

  if (!isOpen || !movie) return null;

  const posterUrl = getFullPosterUrl(
    isEditingMetadata ? editPosterPath : movie.posterPath,
  );

  let genresList: string[] = [];
  try {
    if (movie.genres) genresList = JSON.parse(movie.genres);
  } catch {
    // ignore
  }

  const handleStatusChange = async (newStatus: WatchStatus) => {
    if (newStatus === movie.status || isSaving) return;
    setIsSaving(true);
    try {
      await onUpdate(movie.id, { status: newStatus });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotesAndDates = async () => {
    setIsSaving(true);
    try {
      await onUpdate(movie.id, {
        personalRating: rating,
        notes: notes || null,
        startedAt: startedDate ? new Date(startedDate).toISOString() : null,
        completedAt: completedDate ? new Date(completedDate).toISOString() : null,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMetadata = async () => {
    setIsSaving(true);
    try {
      const parsedGenres = editGenres
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean);

      await onUpdate(movie.id, {
        title: editTitle.trim() || movie.title,
        originalTitle: editOriginalTitle.trim() || null,
        releaseYear: editReleaseYear ? parseInt(editReleaseYear, 10) : null,
        releaseDate: editReleaseDate.trim() || null,
        runtimeMinutes: editRuntime ? parseInt(editRuntime, 10) : null,
        overview: editOverview.trim() || null,
        posterPath: editPosterPath.trim() || null,
        genres: parsedGenres,
      });
      setIsEditingMetadata(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Dialog Window */}
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-800 bg-[#262626] shadow-2xl text-[#ECECEC]">
        {/* Header Action Bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-neutral-800 bg-[#262626]/95 px-5 py-3.5 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <StatusBadge status={movie.status as WatchStatus} size="md" />
            <span className="text-xs text-neutral-400 font-mono">
              {movie.imdbId}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditingMetadata(!isEditingMetadata)}
              title="Edit movie metadata"
              className="flex items-center gap-1.5 rounded-lg bg-[#333333] px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {isEditingMetadata ? 'Cancel Edit' : 'Edit Info'}
              </span>
            </button>

            <a
              href={movie.imdbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg bg-[#333333] px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">IMDb</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-[#333333] hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Main Info: Poster + Meta */}
          <div className="flex flex-col sm:flex-row gap-5">
            {/* Poster */}
            <div className="relative aspect-[2/3] w-36 sm:w-48 shrink-0 overflow-hidden rounded-xl bg-neutral-900 border border-neutral-800 mx-auto sm:mx-0">
              {posterUrl && !imageError ? (
                <img
                  src={posterUrl}
                  alt={movie.title}
                  onError={() => setImageError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center p-4 text-neutral-600">
                  <Film className="h-10 w-10 text-neutral-500" />
                  <span className="mt-2 text-center text-[11px] text-neutral-400">
                    No Poster
                  </span>
                </div>
              )}
            </div>

            {/* Details or Edit Metadata Form */}
            <div className="flex-1 space-y-3">
              {isEditingMetadata ? (
                /* Metadata Edit Form */
                <div className="space-y-3 rounded-xl border border-neutral-700 bg-[#1A1A1A] p-4 text-xs">
                  <h4 className="font-semibold text-white">
                    Edit Movie Metadata
                  </h4>
                  <div>
                    <label className="block mb-1 text-neutral-400 font-medium">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded bg-[#262626] border border-neutral-700 px-2.5 py-1.5 text-[#ECECEC] focus:border-white focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block mb-1 text-neutral-400 font-medium">
                        Original Title
                      </label>
                      <input
                        type="text"
                        value={editOriginalTitle}
                        onChange={(e) => setEditOriginalTitle(e.target.value)}
                        className="w-full rounded bg-[#262626] border border-neutral-700 px-2.5 py-1.5 text-[#ECECEC] focus:border-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 text-neutral-400 font-medium">
                        Release Year
                      </label>
                      <input
                        type="number"
                        value={editReleaseYear}
                        onChange={(e) => setEditReleaseYear(e.target.value)}
                        className="w-full rounded bg-[#262626] border border-neutral-700 px-2.5 py-1.5 text-[#ECECEC] focus:border-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block mb-1 text-neutral-400 font-medium">
                        Release Date (YYYY-MM-DD)
                      </label>
                      <input
                        type="text"
                        value={editReleaseDate}
                        onChange={(e) => setEditReleaseDate(e.target.value)}
                        className="w-full rounded bg-[#262626] border border-neutral-700 px-2.5 py-1.5 text-[#ECECEC] focus:border-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 text-neutral-400 font-medium">
                        Runtime (minutes)
                      </label>
                      <input
                        type="number"
                        value={editRuntime}
                        onChange={(e) => setEditRuntime(e.target.value)}
                        className="w-full rounded bg-[#262626] border border-neutral-700 px-2.5 py-1.5 text-[#ECECEC] focus:border-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 text-neutral-400 font-medium">
                      Genres (comma separated)
                    </label>
                    <input
                      type="text"
                      value={editGenres}
                      onChange={(e) => setEditGenres(e.target.value)}
                      placeholder="Drama, Crime, Action"
                      className="w-full rounded bg-[#262626] border border-neutral-700 px-2.5 py-1.5 text-[#ECECEC] focus:border-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-neutral-400 font-medium">
                      Poster Image URL or Path
                    </label>
                    <input
                      type="text"
                      value={editPosterPath}
                      onChange={(e) => setEditPosterPath(e.target.value)}
                      placeholder="https://... or /path.jpg"
                      className="w-full rounded bg-[#262626] border border-neutral-700 px-2.5 py-1.5 text-[#ECECEC] focus:border-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-neutral-400 font-medium">
                      Overview / Synopsis
                    </label>
                    <textarea
                      rows={3}
                      value={editOverview}
                      onChange={(e) => setEditOverview(e.target.value)}
                      className="w-full rounded bg-[#262626] border border-neutral-700 p-2.5 text-[#ECECEC] focus:border-white focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingMetadata(false)}
                      className="rounded bg-[#333333] px-3 py-1.5 text-neutral-300 hover:bg-neutral-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleSaveMetadata}
                      className="flex items-center gap-1.5 rounded bg-white px-3 py-1.5 font-semibold text-black hover:bg-neutral-200"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save Metadata
                    </button>
                  </div>
                </div>
              ) : (
                /* Metadata View */
                <>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#ECECEC]">
                      {movie.title}
                    </h2>
                    {movie.originalTitle &&
                      movie.originalTitle !== movie.title && (
                        <p className="text-xs text-neutral-400 italic">
                          Original: {movie.originalTitle}
                        </p>
                      )}
                  </div>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                    {movie.releaseYear && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                        {movie.releaseDate || movie.releaseYear}
                      </span>
                    )}
                    {movie.runtimeMinutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-neutral-500" />
                        {movie.runtimeMinutes} min
                      </span>
                    )}
                  </div>

                  {/* Genres */}
                  {genresList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {genresList.map((g) => (
                        <span
                          key={g}
                          className="rounded-full bg-[#1A1A1A] px-2.5 py-0.5 text-xs text-neutral-300 border border-neutral-800"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Overview */}
                  {movie.overview && (
                    <div className="pt-2">
                      <p className="text-sm leading-relaxed text-neutral-300">
                        {movie.overview}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Status Switcher Buttons */}
              <div className="pt-3">
                <span className="text-xs font-medium uppercase tracking-wider text-neutral-400 block mb-2">
                  Watching Status
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['TO_DO', 'DOING', 'DONE'] as WatchStatus[]).map((st) => {
                    const isSelected = movie.status === st;
                    const labels = {
                      TO_DO: 'To do',
                      DOING: 'Doing',
                      DONE: 'Done',
                    };
                    const activeStyles = {
                      TO_DO: 'bg-yellow-400 text-black font-semibold shadow-sm',
                      DOING: 'bg-blue-400 text-black font-semibold shadow-sm',
                      DONE: 'bg-green-400 text-black font-semibold shadow-sm',
                    };

                    return (
                      <button
                        key={st}
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleStatusChange(st)}
                        className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs transition-colors ${
                          isSelected
                            ? activeStyles[st]
                            : 'bg-[#1A1A1A] text-neutral-300 border border-neutral-800 hover:bg-[#333333] hover:text-white'
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                        {labels[st]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information Section: Rating, Dates, Notes */}
          <div className="rounded-xl border border-neutral-800 bg-[#1A1A1A] p-4 sm:p-5 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-300">
              Personal Tracking
            </h3>

            {/* Personal Rating (1-10) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-neutral-400">
                  Personal Rating
                </span>
                {rating !== null && (
                  <button
                    type="button"
                    onClick={() => setRating(null)}
                    className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-red-400"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Clear Rating
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((starVal) => {
                  const isFilled = rating !== null && starVal <= rating;
                  return (
                    <button
                      key={starVal}
                      type="button"
                      onClick={() => setRating(starVal)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold transition-all ${
                        isFilled
                          ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                          : 'border-neutral-800 bg-[#262626] text-neutral-400 hover:border-neutral-700 hover:text-white'
                      }`}
                    >
                      {starVal}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Viewing Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Started Watching (Doing Date)
                </label>
                <input
                  type="date"
                  value={startedDate}
                  onChange={(e) => setStartedDate(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-[#262626] px-3 py-1.5 text-xs text-[#ECECEC] focus:border-neutral-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Finished Watching (Done Date)
                </label>
                <input
                  type="date"
                  value={completedDate}
                  onChange={(e) => setCompletedDate(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-[#262626] px-3 py-1.5 text-xs text-[#ECECEC] focus:border-neutral-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                Personal Notes
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write your thoughts, memorable quotes, or viewing plans..."
                className="w-full rounded-lg border border-neutral-800 bg-[#262626] p-3 text-xs text-[#ECECEC] placeholder-neutral-500 focus:border-neutral-600 focus:outline-none"
              />
            </div>

            {/* Save Personal Tracking Button */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveNotesAndDates}
                className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-neutral-200 transition-colors"
              >
                <Save className="h-3.5 w-3.5" />
                Save Notes & Tracking
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-neutral-800 bg-[#262626] px-5 py-3.5">
          <button
            type="button"
            onClick={() => onDeleteRequest(movie)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete from Watchlist
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#333333] px-4 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
