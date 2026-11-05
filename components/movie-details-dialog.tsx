import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Calendar,
  Clock,
  Trash2,
  Edit2,
  Save,
  Check,
  Film,
  Globe,
  RefreshCw,
} from 'lucide-react';
import type { Movie, WatchStatus } from '@/db/schema';
import { StatusBadge } from './status-badge';
import { getFullPosterUrl } from '@/lib/tmdb';
import { SeriesProgressModal } from './series-progress-modal';
import { sendPushNotification, requestNotificationPermission } from '@/lib/push-notifications';

function YouTubeIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

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
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncWithImdb = async () => {
    if (!movie || movie.mediaType !== 'SERIES' || isSyncing) return;
    setIsSyncing(true);

    await requestNotificationPermission();

    try {
      const res = await fetch(`/api/movies/${movie.id}/sync-series`, {
        method: 'POST',
      });
      const data: any = await res.json();

      if (res.ok && data.movie) {
        if (data.hasNewSeasons) {
          sendPushNotification(`🎬 New Season Alert: ${movie.title}`, {
            body: `Season ${data.movie.totalSeasons} is now available on IMDb!`,
          });
        }
        if (data.updated) {
          await onUpdate(movie.id, {
            totalSeasons: data.movie.totalSeasons,
            totalEpisodes: data.movie.totalEpisodes,
            seriesProgress: data.movie.seriesProgress,
          });
        }
      }
    } catch {
      // ignore
    } finally {
      setIsSyncing(false);
    }
  };
  const [imageError, setImageError] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);

  // Editable metadata fields
  const [editTitle, setEditTitle] = useState('');
  const [editOriginalTitle, setEditOriginalTitle] = useState('');
  const [editMediaType, setEditMediaType] = useState<'MOVIE' | 'SERIES'>('MOVIE');
  const [editReleaseYear, setEditReleaseYear] = useState<string>('');
  const [editReleaseDate, setEditReleaseDate] = useState('');
  const [editRuntime, setEditRuntime] = useState<string>('');
  const [editTotalSeasons, setEditTotalSeasons] = useState<string>('');
  const [editTotalEpisodes, setEditTotalEpisodes] = useState<string>('');
  const [editCurrentSeason, setEditCurrentSeason] = useState<string>('');
  const [editCurrentEpisode, setEditCurrentEpisode] = useState<string>('');
  const [editOverview, setEditOverview] = useState('');
  const [editGenres, setEditGenres] = useState('');
  const [editCountries, setEditCountries] = useState('');
  const [editPosterPath, setEditPosterPath] = useState('');

  useEffect(() => {
    if (movie) {
      setEditTitle(movie.title);
      setEditOriginalTitle(movie.originalTitle ?? '');
      setEditMediaType(movie.mediaType || 'MOVIE');
      setEditReleaseYear(movie.releaseYear ? String(movie.releaseYear) : '');
      setEditReleaseDate(movie.releaseDate ?? '');
      setEditRuntime(movie.runtimeMinutes ? String(movie.runtimeMinutes) : '');
      setEditTotalSeasons(movie.totalSeasons ? String(movie.totalSeasons) : '');
      setEditTotalEpisodes(movie.totalEpisodes ? String(movie.totalEpisodes) : '');
      setEditCurrentSeason(movie.currentSeason ? String(movie.currentSeason) : '');
      setEditCurrentEpisode(movie.currentEpisode ? String(movie.currentEpisode) : '');
      setEditOverview(movie.overview ?? '');
      setEditPosterPath(movie.posterPath ?? '');

      setEditGenres(parseListField(movie.genres).join(', '));
      setEditCountries(parseListField(movie.countries).join(', '));

      setIsEditingMetadata(false);
      setImageError(false);
    }
  }, [movie]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Escape' || e.key === 'Esc') && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !movie) return null;

  const posterUrl = getFullPosterUrl(
    isEditingMetadata ? editPosterPath : movie.posterPath,
  );

  const genresList = parseListField(movie.genres);
  const countriesList = parseListField(movie.countries);

  const handleStatusChange = async (newStatus: WatchStatus) => {
    if (newStatus === movie.status || isSaving) return;
    setIsSaving(true);
    try {
      await onUpdate(movie.id, { status: newStatus });
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

      const parsedCountries = editCountries
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      await onUpdate(movie.id, {
        title: editTitle.trim() || movie.title,
        originalTitle: editOriginalTitle.trim() || null,
        mediaType: editMediaType,
        releaseYear: editReleaseYear ? parseInt(editReleaseYear, 10) : null,
        releaseDate: editReleaseDate.trim() || null,
        runtimeMinutes: editRuntime ? parseInt(editRuntime, 10) : null,
        totalSeasons: editTotalSeasons ? parseInt(editTotalSeasons, 10) : null,
        totalEpisodes: editTotalEpisodes ? parseInt(editTotalEpisodes, 10) : null,
        currentSeason: editCurrentSeason ? parseInt(editCurrentSeason, 10) : null,
        currentEpisode: editCurrentEpisode ? parseInt(editCurrentEpisode, 10) : null,
        overview: editOverview.trim() || null,
        posterPath: editPosterPath.trim() || null,
        genres: parsedGenres,
        countries: parsedCountries,
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
            {/* Poster if available */}
            {posterUrl && !imageError && (
              <div className="relative aspect-[2/3] w-36 sm:w-48 shrink-0 overflow-hidden rounded-xl bg-neutral-900 border border-neutral-800 mx-auto sm:mx-0">
                <img
                  src={posterUrl}
                  alt={movie.title}
                  onError={() => setImageError(true)}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            {/* Details or Edit Metadata Form */}
            <div className="flex-1 space-y-3">
              {isEditingMetadata ? (
                /* Metadata Edit Form */
                <div className="space-y-3 rounded-xl border border-neutral-700 bg-[#1A1A1A] p-4 text-xs">
                  <h4 className="font-semibold text-white">
                    {movie.mediaType === 'SERIES' ? 'Edit TV Series Details' : 'Edit Movie Metadata'}
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

                  {movie.mediaType === 'SERIES' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-neutral-800">
                      <div>
                        <label className="block mb-1 text-neutral-400 font-medium">Total Seasons</label>
                        <input
                          type="number"
                          value={editTotalSeasons}
                          onChange={(e) => setEditTotalSeasons(e.target.value)}
                          placeholder="e.g. 2"
                          className="w-full rounded bg-[#262626] border border-neutral-700 px-2.5 py-1.5 text-[#ECECEC] focus:border-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-neutral-400 font-medium">Total Episodes</label>
                        <input
                          type="number"
                          value={editTotalEpisodes}
                          onChange={(e) => setEditTotalEpisodes(e.target.value)}
                          placeholder="e.g. 16"
                          className="w-full rounded bg-[#262626] border border-neutral-700 px-2.5 py-1.5 text-[#ECECEC] focus:border-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-neutral-400 font-medium">Current Season</label>
                        <input
                          type="number"
                          value={editCurrentSeason}
                          onChange={(e) => setEditCurrentSeason(e.target.value)}
                          placeholder="e.g. 1"
                          className="w-full rounded bg-[#262626] border border-neutral-700 px-2.5 py-1.5 text-[#ECECEC] focus:border-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-neutral-400 font-medium">Current Episode</label>
                        <input
                          type="number"
                          value={editCurrentEpisode}
                          onChange={(e) => setEditCurrentEpisode(e.target.value)}
                          placeholder="e.g. 1"
                          className="w-full rounded bg-[#262626] border border-neutral-700 px-2.5 py-1.5 text-[#ECECEC] focus:border-white focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

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
                      Production Countries (comma separated)
                    </label>
                    <input
                      type="text"
                      value={editCountries}
                      onChange={(e) => setEditCountries(e.target.value)}
                      placeholder="United States, Canada"
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
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
                        className="group flex items-center gap-2 text-left text-xl sm:text-2xl font-bold tracking-tight text-[#ECECEC] hover:text-red-400 transition-colors"
                      >
                        <span>{movie.title}</span>
                        <YouTubeIcon className="h-5 w-5 text-red-500 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all shrink-0" />
                      </button>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${
                          movie.mediaType === 'SERIES'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {movie.mediaType === 'SERIES' ? 'TV Series' : 'Movie'}
                      </span>
                    </div>
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
                    {countriesList.length > 0 && (
                      <span className="flex items-center gap-1" title="Production Country">
                        <Globe className="h-3.5 w-3.5 text-neutral-500" />
                        <span>{countriesList.join(', ')}</span>
                      </span>
                    )}
                    {movie.mediaType === 'SERIES' && movie.totalSeasons && (
                      <span className="rounded bg-neutral-800 px-2 py-0.5 text-neutral-300">
                        {movie.totalSeasons} Season{movie.totalSeasons > 1 ? 's' : ''}
                      </span>
                    )}
                    {movie.mediaType === 'SERIES' && movie.totalEpisodes && (
                      <span className="rounded bg-neutral-800 px-2 py-0.5 text-neutral-300">
                        {movie.totalEpisodes} Episodes
                      </span>
                    )}
                  </div>

                  {/* Series Watch Progress */}
                  {movie.mediaType === 'SERIES' && (() => {
                    const totalSeas = movie.totalSeasons || 1;
                    const totalEps = movie.totalEpisodes || null;
                    const epsPerSeason = totalEps && totalSeas ? Math.ceil(totalEps / totalSeas) : (totalEps || 50);

                    // Clamp current season between 1 and totalSeas
                    const curSeason = Math.min(Math.max(movie.currentSeason || 1, 1), totalSeas);
                    // Clamp current episode between 1 and epsPerSeason
                    const curEpisode = Math.min(Math.max(movie.currentEpisode || 1, 1), epsPerSeason);

                    const handleSeasonChange = (delta: number) => {
                      const nextS = Math.min(Math.max(curSeason + delta, 1), totalSeas);
                      if (nextS !== curSeason) {
                        onUpdate(movie.id, { currentSeason: nextS, currentEpisode: 1 });
                      }
                    };

                    const handleEpisodeChange = (delta: number) => {
                      const nextE = curEpisode + delta;
                      if (nextE > epsPerSeason) {
                        // Rollover to next season if available
                        if (curSeason < totalSeas) {
                          onUpdate(movie.id, { currentSeason: curSeason + 1, currentEpisode: 1 });
                        } else {
                          // Finished all seasons & episodes -> Mark as Done
                          onUpdate(movie.id, { status: 'DONE', currentEpisode: epsPerSeason });
                        }
                      } else if (nextE < 1) {
                        // Rollover to previous season if available
                        if (curSeason > 1) {
                          onUpdate(movie.id, { currentSeason: curSeason - 1, currentEpisode: epsPerSeason });
                        }
                      } else {
                        onUpdate(movie.id, { currentEpisode: nextE });
                      }
                    };

                    // Progress percentage across all episodes if known
                    const totalWatched = (curSeason - 1) * epsPerSeason + curEpisode;
                    const progressPercent = totalEps ? Math.min(Math.round((totalWatched / totalEps) * 100), 100) : null;

                    return (
                      <div className="rounded-xl border border-neutral-800 bg-[#1A1A1A] p-3 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                              Series Progress
                            </span>
                            {progressPercent !== null && (
                              <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-purple-300">
                                {progressPercent}%
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {(() => {
                              let curStremioLink = '';
                              if (movie.seriesProgress) {
                                try {
                                  const parsed = JSON.parse(movie.seriesProgress);
                                  const match = parsed.find(
                                    (p: any) => p.season === curSeason && p.episode === curEpisode,
                                  );
                                  if (match?.stremio) curStremioLink = match.stremio.trim();
                                } catch {}
                              }
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (curStremioLink && typeof window !== 'undefined') {
                                      window.open(curStremioLink, '_blank', 'noopener,noreferrer');
                                    }
                                    onUpdate(movie.id, { status: 'DOING' });
                                  }}
                                  title={
                                    curStremioLink
                                      ? `Open Stremio & set Doing (S${curSeason} E${curEpisode})`
                                      : `Set Doing (S${curSeason} E${curEpisode})`
                                  }
                                  className="rounded bg-purple-500/25 px-2 py-0.5 text-xs font-bold text-purple-200 border border-purple-500/40 hover:bg-purple-500/40 transition-colors tracking-wide flex items-center gap-1"
                                >
                                  <span>S{curSeason} E{curEpisode}</span>
                                  {curStremioLink && <ExternalLink className="h-3 w-3 text-purple-300 shrink-0" />}
                                </button>
                              );
                            })()}
                            <button
                              type="button"
                              onClick={handleSyncWithImdb}
                              disabled={isSyncing}
                              className="flex items-center gap-1 rounded bg-[#262626] hover:bg-purple-900/40 border border-neutral-700 hover:border-purple-500/40 px-2 py-0.5 text-[11px] font-medium text-neutral-300 hover:text-purple-300 transition-colors disabled:opacity-50"
                              title="Sync latest seasons and episodes with IMDb"
                            >
                              <RefreshCw
                                className={`h-3 w-3 ${
                                  isSyncing ? 'animate-spin text-purple-400' : 'text-purple-400'
                                }`}
                              />
                              <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsProgressModalOpen(true)}
                              className="flex items-center gap-1 rounded bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/30 px-2 py-0.5 text-[11px] font-medium text-purple-300 hover:text-white transition-colors"
                              title="Manage series progress table"
                            >
                              <Edit2 className="h-3 w-3" />
                              <span>Manage Table</span>
                            </button>
                          </div>
                        </div>

                        {progressPercent !== null && (
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                            <div
                              className="h-full rounded-full bg-purple-500 transition-all duration-300"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-800/60">
                          {/* Season Stepper */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-neutral-400 text-[11px]">Season:</span>
                            <button
                              type="button"
                              disabled={curSeason <= 1}
                              onClick={() => handleSeasonChange(-1)}
                              className="flex h-6 w-6 items-center justify-center rounded bg-[#262626] border border-neutral-700 text-neutral-300 hover:text-white disabled:opacity-40 transition-colors"
                            >
                              -
                            </button>
                            <span className="min-w-[28px] text-center font-bold text-white">
                              {curSeason}
                            </span>
                            <button
                              type="button"
                              disabled={curSeason >= totalSeas}
                              onClick={() => handleSeasonChange(1)}
                              className="flex h-6 w-6 items-center justify-center rounded bg-[#262626] border border-neutral-700 text-neutral-300 hover:text-white disabled:opacity-40 transition-colors"
                            >
                              +
                            </button>
                          </div>

                          {/* Episode Stepper */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-neutral-400 text-[11px]">Episode:</span>
                            <button
                              type="button"
                              disabled={curSeason <= 1 && curEpisode <= 1}
                              onClick={() => handleEpisodeChange(-1)}
                              className="flex h-6 w-6 items-center justify-center rounded bg-[#262626] border border-neutral-700 text-neutral-300 hover:text-white disabled:opacity-40 transition-colors"
                            >
                              -
                            </button>
                            <span className="min-w-[28px] text-center font-bold text-white">
                              {curEpisode}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleEpisodeChange(1)}
                              className="flex h-6 items-center justify-center rounded bg-purple-600 px-2 font-semibold text-white hover:bg-purple-500 transition-colors"
                            >
                              + Ep
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Genres */}
                  {genresList.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-semibold text-neutral-400 mr-0.5">Genre:</span>
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

      {/* Series Progress Modal */}
      {isProgressModalOpen && (
        <SeriesProgressModal
          isOpen={isProgressModalOpen}
          onClose={() => setIsProgressModalOpen(false)}
          movie={movie}
          onUpdateMovie={onUpdate}
        />
      )}
    </div>
  );
}
