import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Link as LinkIcon,
  Layers,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Film,
  ExternalLink,
  Save,
  Globe,
} from 'lucide-react';
import type { Movie, WatchStatus } from '@/db/schema';
import { getFullPosterUrl, type MovieMetadata } from '@/lib/tmdb';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onMovieImported: () => void;
  onViewExistingMovie: (movie: Movie) => void;
}

export function ImportDialog({
  isOpen,
  onClose,
  onMovieImported,
  onViewExistingMovie,
}: ImportDialogProps) {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk' | 'portability'>('single');

  // Single Import State
  const [singleInput, setSingleInput] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<{
    parsed: { imdbId: string; imdbUrl: string };
    isExisting: boolean;
    existingMovie: Movie | null;
    metadata: MovieMetadata | null;
    error: string | null;
    isUnsupportedType?: boolean;
    canFallbackToManual?: boolean;
    unsupportedTitleInfo?: {
      title?: string;
      year?: number;
      posterUrl?: string;
      typeName?: string;
    } | null;
  } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Manual fallback fields (when TMDB metadata not available or manual edit requested)
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualMediaType, setManualMediaType] = useState<'MOVIE' | 'SERIES'>('MOVIE');
  const [manualYear, setManualYear] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualRuntime, setManualRuntime] = useState('');
  const [manualTotalSeasons, setManualTotalSeasons] = useState('');
  const [manualTotalEpisodes, setManualTotalEpisodes] = useState('');
  const [manualGenres, setManualGenres] = useState('');
  const [manualCountries, setManualCountries] = useState('');
  const [manualPoster, setManualPoster] = useState('');
  const [manualOverview, setManualOverview] = useState('');

  // Selected status for imported movie
  const [selectedStatus, setSelectedStatus] = useState<WatchStatus>('TO_DO');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Bulk Import State
  const [bulkInput, setBulkInput] = useState('');
  const [bulkStatus, setBulkStatus] = useState<WatchStatus>('TO_DO');
  const [isInspectingBulk, setIsInspectingBulk] = useState(false);
  const [bulkInspectionResults, setBulkInspectionResults] = useState<any[] | null>(null);
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
  const [bulkReport, setBulkReport] = useState<{
    summary: { totalLines: number; importedCount: number; skippedCount: number; failedCount: number };
    imported: Movie[];
    skipped: any[];
    failed: any[];
  } | null>(null);

  // Portability State
  const [isExporting, setIsExporting] = useState(false);
  const [isImportingJson, setIsImportingJson] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [portabilityMessage, setPortabilityMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Escape' || e.key === 'Esc') && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePreviewSingle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!singleInput.trim()) return;

    setIsPreviewing(true);
    setPreviewError(null);
    setPreviewData(null);
    setIsManualEntry(false);
    setSubmitError(null);

    try {
      const res = await fetch('/api/movies/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: singleInput.trim() }),
      });
      const data: any = await res.json();

      if (!res.ok) {
        setPreviewError(data.error || 'Failed to parse IMDb link.');
        return;
      }

      setPreviewData(data);

      if (data.metadata) {
        setManualTitle(data.metadata.title);
        setManualMediaType(data.metadata.mediaType || 'MOVIE');
        setManualYear(data.metadata.releaseYear ? String(data.metadata.releaseYear) : '');
        setManualDate(data.metadata.releaseDate || '');
        setManualRuntime(data.metadata.runtimeMinutes ? String(data.metadata.runtimeMinutes) : '');
        setManualTotalSeasons(data.metadata.totalSeasons ? String(data.metadata.totalSeasons) : '');
        setManualTotalEpisodes(data.metadata.totalEpisodes ? String(data.metadata.totalEpisodes) : '');
        setManualGenres(data.metadata.genres ? data.metadata.genres.join(', ') : '');
        setManualCountries(data.metadata.countries ? data.metadata.countries.join(', ') : '');
        setManualPoster(data.metadata.posterPath || '');
        setManualOverview(data.metadata.overview || '');
      } else if (data.unsupportedTitleInfo) {
        setManualTitle(data.unsupportedTitleInfo.title || '');
        setManualMediaType('SERIES');
        setManualYear(data.unsupportedTitleInfo.year ? String(data.unsupportedTitleInfo.year) : '');
        setManualDate(data.unsupportedTitleInfo.year ? `${data.unsupportedTitleInfo.year}-01-01` : '');
        setManualRuntime('');
        setManualTotalSeasons('');
        setManualTotalEpisodes('');
        setManualGenres('');
        setManualCountries('');
        setManualPoster(data.unsupportedTitleInfo.posterUrl || '');
        setManualOverview('');
      } else if (data.canFallbackToManual) {
        setIsManualEntry(true);
        setManualTitle('');
        setManualMediaType('MOVIE');
        setManualYear('');
        setManualDate('');
        setManualRuntime('');
        setManualTotalSeasons('');
        setManualTotalEpisodes('');
        setManualGenres('');
        setManualCountries('');
        setManualPoster('');
        setManualOverview('');
      }
    } catch (err: any) {
      setPreviewError(err.message || 'Error communicating with server.');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleConfirmSingleImport = async () => {
    if (!previewData) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let payload: any;
      if (isManualEntry || !previewData.metadata) {
        const titleToUse =
          manualTitle.trim() || previewData.unsupportedTitleInfo?.title || '';
        if (!titleToUse) {
          setSubmitError('Title is required.');
          setIsSubmitting(false);
          return;
        }

        const parsedG = manualGenres
          .split(',')
          .map((g) => g.trim())
          .filter(Boolean);

        const parsedC = manualCountries
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean);

        payload = {
          imdbId: previewData.parsed.imdbId,
          imdbUrl: previewData.parsed.imdbUrl,
          title: titleToUse,
          mediaType: manualMediaType,
          releaseYear: manualYear
            ? parseInt(manualYear, 10)
            : previewData.unsupportedTitleInfo?.year || null,
          releaseDate: manualDate.trim() || null,
          runtimeMinutes: manualRuntime ? parseInt(manualRuntime, 10) : null,
          totalSeasons: manualTotalSeasons ? parseInt(manualTotalSeasons, 10) : null,
          totalEpisodes: manualTotalEpisodes ? parseInt(manualTotalEpisodes, 10) : null,
          posterPath:
            manualPoster.trim() ||
            previewData.unsupportedTitleInfo?.posterUrl ||
            null,
          overview: manualOverview.trim() || null,
          genres: parsedG,
          countries: parsedC,
          status: selectedStatus,
        };
      } else {
        payload = {
          ...previewData.metadata,
          status: selectedStatus,
        };
      }

      const res = await fetch('/api/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data: any = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'Failed to save movie to watchlist.');
        return;
      }

      onMovieImported();
      onClose();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to import movie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInspectBulk = async () => {
    if (!bulkInput.trim()) return;
    setIsInspectingBulk(true);
    setBulkInspectionResults(null);
    setBulkReport(null);

    try {
      const res = await fetch('/api/movies/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: bulkInput,
          previewOnly: true,
        }),
      });
      const data: any = await res.json();
      if (res.ok) {
        setBulkInspectionResults(data.items);
      }
    } catch {
      // ignore
    } finally {
      setIsInspectingBulk(false);
    }
  };

  const handleExecuteBulkImport = async () => {
    if (!bulkInput.trim()) return;
    setIsSubmittingBulk(true);
    setBulkReport(null);

    try {
      const res = await fetch('/api/movies/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: bulkInput,
          defaultStatus: bulkStatus,
          previewOnly: false,
        }),
      });
      const data: any = await res.json();
      if (res.ok) {
        setBulkReport(data);
        onMovieImported();
      }
    } catch {
      // ignore
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  const handleExportJson = async () => {
    setIsExporting(true);
    setPortabilityMessage(null);
    try {
      const res = await fetch('/api/movies/export');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `watchlist-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setPortabilityMessage({ type: 'success', text: 'Watchlist exported successfully!' });
    } catch (err: any) {
      setPortabilityMessage({ type: 'error', text: err.message || 'Export failed.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingJson(true);
    setPortabilityMessage(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const moviesList = Array.isArray(parsed) ? parsed : parsed.movies;

      if (!Array.isArray(moviesList)) {
        throw new Error('Invalid JSON structure: expected an array of movies or an object with a "movies" list.');
      }

      const res = await fetch('/api/movies/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movies: moviesList,
          overwriteExisting,
        }),
      });

      const data: any = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import JSON collection.');
      }

      setPortabilityMessage({
        type: 'success',
        text: `Import complete! ${data.summary.importedCount} new, ${data.summary.updatedCount} updated, ${data.summary.skippedCount} skipped.`,
      });
      onMovieImported();
    } catch (err: any) {
      setPortabilityMessage({ type: 'error', text: err.message || 'Invalid JSON file.' });
    } finally {
      setIsImportingJson(false);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-800 bg-[#262626] shadow-2xl text-[#ECECEC]">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-neutral-800 bg-[#262626]/95 px-5 py-3.5 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-white" />
            <h3 className="text-base font-semibold text-white">Import Movies & Series</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-[#333333] hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-neutral-800 bg-[#1F1F1F] px-4">
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition-colors ${
              activeTab === 'single'
                ? 'border-white text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <LinkIcon className="h-3.5 w-3.5" />
            IMDb Link / ID
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bulk')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition-colors ${
              activeTab === 'bulk'
                ? 'border-white text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Bulk Paste
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('portability')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition-colors ${
              activeTab === 'portability'
                ? 'border-white text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Download className="h-3.5 w-3.5" />
            Export / Import
          </button>
        </div>

        {/* Tab 1: Single IMDb Import */}
        {activeTab === 'single' && (
          <div className="p-5 sm:p-6 space-y-5">
            <form onSubmit={handlePreviewSingle} className="space-y-3">
              <label className="block text-xs font-medium text-neutral-300">
                Paste IMDb URL or title ID (e.g. tt0111161 or tt2442560)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={singleInput}
                  onChange={(e) => setSingleInput(e.target.value)}
                  placeholder="https://www.imdb.com/title/tt0111161/ or tt2442560"
                  className="flex-1 rounded-lg border border-neutral-800 bg-[#1A1A1A] px-3.5 py-2 text-xs text-[#ECECEC] placeholder-neutral-500 focus:border-neutral-600 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isPreviewing || !singleInput.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-neutral-200 transition-colors disabled:opacity-50"
                >
                  {isPreviewing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    'Preview'
                  )}
                </button>
              </div>
            </form>

            {/* Error Message */}
            {previewError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                <div className="flex-1">
                  <p className="font-semibold text-red-200">Invalid Input</p>
                  <p className="mt-0.5 text-neutral-300">{previewError}</p>
                </div>
              </div>
            )}

            {/* Unsupported Title Type Notice */}
            {previewData?.isUnsupportedType && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-200">Unsupported Title Type</p>
                  <p className="mt-0.5 text-neutral-300">{previewData.error}</p>
                  <p className="mt-1 text-[11px] text-amber-300/80">
                    Watchlist Manager supports movies and TV series. You can still import this title as a manual entry below.
                  </p>
                </div>
              </div>
            )}

            {/* Duplicate Movie Warning */}
            {previewData?.isExisting && previewData.existingMovie && (
              <div className="flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3.5 text-xs text-yellow-300">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-yellow-400" />
                <div className="flex-1">
                  <p className="font-semibold text-yellow-200">
                    Already in Watchlist
                  </p>
                  <p className="mt-0.5 text-neutral-300">
                    "<strong className="text-white">{previewData.existingMovie.title}</strong>" is already in your watchlist with status{' '}
                    <strong className="text-yellow-300">
                      {previewData.existingMovie.status === 'TO_DO'
                        ? 'To do'
                        : previewData.existingMovie.status === 'DOING'
                        ? 'Doing'
                        : 'Done'}
                    </strong>
                    . Duplicate records are not allowed.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onViewExistingMovie(previewData.existingMovie!);
                      onClose();
                    }}
                    className="mt-2 inline-flex items-center gap-1 rounded bg-yellow-400 px-2.5 py-1 text-xs font-semibold text-black hover:bg-yellow-300 transition-colors"
                  >
                    View Existing Movie
                  </button>
                </div>
              </div>
            )}

            {/* Preview Card */}
            {previewData && !previewData.isExisting && (
              <div className="rounded-xl border border-neutral-700 bg-[#1A1A1A] p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    {previewData.metadata?.mediaType === 'SERIES'
                      ? 'Series Import Preview'
                      : previewData.isUnsupportedType
                      ? 'Manual Title Preview'
                      : 'Movie Import Preview'}
                  </span>
                  <a
                    href={previewData.parsed.imdbUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white"
                  >
                    {previewData.parsed.imdbId}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {isManualEntry ? (
                  /* Manual Entry Mode */
                  <div className="space-y-3 text-xs">
                    <p className="text-neutral-400">
                      Enter details manually while keeping the validated IMDb ID:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block mb-1 text-neutral-400">Type</label>
                        <select
                          value={manualMediaType}
                          onChange={(e) => setManualMediaType(e.target.value as 'MOVIE' | 'SERIES')}
                          className="w-full rounded bg-[#262626] border border-neutral-700 px-3 py-1.5 text-[#ECECEC] focus:border-white focus:outline-none"
                        >
                          <option value="MOVIE">Movie</option>
                          <option value="SERIES">TV Series</option>
                        </select>
                      </div>
                      <div>
                        <label className="block mb-1 text-neutral-400">Title *</label>
                        <input
                          type="text"
                          value={manualTitle}
                          onChange={(e) => setManualTitle(e.target.value)}
                          placeholder={manualMediaType === 'SERIES' ? 'e.g. Breaking Bad' : 'e.g. The Matrix'}
                          className="w-full rounded bg-[#262626] border border-neutral-700 px-3 py-1.5 text-[#ECECEC] focus:border-white focus:outline-none"
                        />
                      </div>
                    </div>
                    {manualMediaType === 'SERIES' ? (
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block mb-1 text-neutral-400">Release Year</label>
                          <input
                            type="number"
                            value={manualYear}
                            onChange={(e) => setManualYear(e.target.value)}
                            placeholder="e.g. 2008"
                            className="w-full rounded bg-[#262626] border border-neutral-700 px-3 py-1.5 text-[#ECECEC] focus:border-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block mb-1 text-neutral-400">Seasons</label>
                          <input
                            type="number"
                            value={manualTotalSeasons}
                            onChange={(e) => setManualTotalSeasons(e.target.value)}
                            placeholder="e.g. 5"
                            className="w-full rounded bg-[#262626] border border-neutral-700 px-3 py-1.5 text-[#ECECEC] focus:border-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block mb-1 text-neutral-400">Episodes</label>
                          <input
                            type="number"
                            value={manualTotalEpisodes}
                            onChange={(e) => setManualTotalEpisodes(e.target.value)}
                            placeholder="e.g. 62"
                            className="w-full rounded bg-[#262626] border border-neutral-700 px-3 py-1.5 text-[#ECECEC] focus:border-white focus:outline-none"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block mb-1 text-neutral-400">Release Year</label>
                          <input
                            type="number"
                            value={manualYear}
                            onChange={(e) => setManualYear(e.target.value)}
                            placeholder="e.g. 1999"
                            className="w-full rounded bg-[#262626] border border-neutral-700 px-3 py-1.5 text-[#ECECEC] focus:border-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block mb-1 text-neutral-400">Runtime (min)</label>
                          <input
                            type="number"
                            value={manualRuntime}
                            onChange={(e) => setManualRuntime(e.target.value)}
                            placeholder="e.g. 136"
                            className="w-full rounded bg-[#262626] border border-neutral-700 px-3 py-1.5 text-[#ECECEC] focus:border-white focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block mb-1 text-neutral-400">Genres (comma separated)</label>
                      <input
                        type="text"
                        value={manualGenres}
                        onChange={(e) => setManualGenres(e.target.value)}
                        placeholder="Action, Sci-Fi"
                        className="w-full rounded bg-[#262626] border border-neutral-700 px-3 py-1.5 text-[#ECECEC] focus:border-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 text-neutral-400">Countries (comma separated)</label>
                      <input
                        type="text"
                        value={manualCountries}
                        onChange={(e) => setManualCountries(e.target.value)}
                        placeholder="United States, Canada"
                        className="w-full rounded bg-[#262626] border border-neutral-700 px-3 py-1.5 text-[#ECECEC] focus:border-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 text-neutral-400">Poster Image URL (optional)</label>
                      <input
                        type="text"
                        value={manualPoster}
                        onChange={(e) => setManualPoster(e.target.value)}
                        placeholder="https://..."
                        className="w-full rounded bg-[#262626] border border-neutral-700 px-3 py-1.5 text-[#ECECEC] focus:border-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 text-neutral-400">Overview (optional)</label>
                      <textarea
                        rows={2}
                        value={manualOverview}
                        onChange={(e) => setManualOverview(e.target.value)}
                        placeholder="Short movie synopsis..."
                        className="w-full rounded bg-[#262626] border border-neutral-700 p-2.5 text-[#ECECEC] focus:border-white focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  /* Automatic Metadata Preview */
                  <div className="flex gap-4">
                    <div className="relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-lg bg-neutral-900 border border-neutral-800">
                      {previewData.metadata?.posterPath || previewData.unsupportedTitleInfo?.posterUrl ? (
                        <img
                          src={getFullPosterUrl(previewData.metadata?.posterPath || previewData.unsupportedTitleInfo?.posterUrl || null)!}
                          alt={previewData.metadata?.title || previewData.unsupportedTitleInfo?.title || 'Poster'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center p-2 text-neutral-600">
                          <Film className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-white">
                          {previewData.metadata?.title || previewData.unsupportedTitleInfo?.title}
                        </h4>
                        {previewData.metadata?.mediaType === 'SERIES' && (
                          <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-300 border border-purple-500/30">
                            TV Series
                          </span>
                        )}
                        {previewData.isUnsupportedType && (
                          <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300 border border-amber-500/30">
                            Manual Entry
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-400">
                        {previewData.metadata?.releaseYear || previewData.unsupportedTitleInfo?.year || 'Unknown year'}
                        {previewData.metadata?.mediaType === 'SERIES' ? (
                          <>
                            {previewData.metadata.totalSeasons ? ` • ${previewData.metadata.totalSeasons} Season${previewData.metadata.totalSeasons > 1 ? 's' : ''}` : ''}
                            {previewData.metadata.totalEpisodes ? ` • ${previewData.metadata.totalEpisodes} Eps` : ''}
                          </>
                        ) : (
                          previewData.metadata?.runtimeMinutes ? ` • ${previewData.metadata.runtimeMinutes} min` : ''
                        )}
                      </p>
                      {previewData.metadata?.countries && previewData.metadata.countries.length > 0 && (
                        <p className="flex items-center gap-1 text-[11px] text-neutral-400">
                          <Globe className="h-3 w-3 text-neutral-500" />
                          <span>{previewData.metadata.countries.join(', ')}</span>
                        </p>
                      )}
                      {previewData.metadata?.genres && previewData.metadata.genres.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30">
                            Main: {previewData.metadata.genres[0]}
                          </span>
                          {previewData.metadata.genres.slice(1).map((g) => (
                            <span
                              key={g}
                              className="rounded bg-[#262626] px-2 py-0.5 text-[10px] text-neutral-300 border border-neutral-700"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      )}
                      {previewData.metadata?.overview && (
                        <p className="line-clamp-2 text-neutral-300 pt-1 text-[11px] leading-relaxed">
                          {previewData.metadata.overview}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Status Selection */}
                <div className="pt-2 border-t border-neutral-800">
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                    Select Initial Watching Status
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['TO_DO', 'DOING', 'DONE'] as WatchStatus[]).map((st) => {
                      const isSelected = selectedStatus === st;
                      const labels = {
                        TO_DO: 'To do',
                        DOING: 'Doing',
                        DONE: 'Done',
                      };
                      const activeStyles = {
                        TO_DO: 'bg-yellow-400 text-black font-semibold',
                        DOING: 'bg-blue-400 text-black font-semibold',
                        DONE: 'bg-green-400 text-black font-semibold',
                      };

                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setSelectedStatus(st)}
                          className={`rounded-lg py-1.5 text-xs transition-colors ${
                            isSelected
                              ? activeStyles[st]
                              : 'bg-[#262626] text-neutral-300 border border-neutral-700 hover:bg-[#333333]'
                          }`}
                        >
                          {labels[st]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {submitError && (
                  <p className="text-xs text-red-400">{submitError}</p>
                )}

                {/* Confirm Add Button */}
                <div className="flex justify-between items-center pt-2">
                  {!isManualEntry && (
                    <button
                      type="button"
                      onClick={() => setIsManualEntry(true)}
                      className="text-[11px] text-neutral-400 hover:text-white underline"
                    >
                      Edit details manually
                    </button>
                  )}
                  {isManualEntry && (previewData.metadata || previewData.unsupportedTitleInfo) && (
                    <button
                      type="button"
                      onClick={() => setIsManualEntry(false)}
                      className="text-[11px] text-neutral-400 hover:text-white underline"
                    >
                      Use detected info
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleConfirmSingleImport}
                    className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-neutral-200 transition-colors ml-auto disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {isSubmitting
                      ? 'Adding...'
                      : isManualEntry
                      ? (manualMediaType === 'SERIES' ? 'Save Series' : 'Save Movie')
                      : (previewData.metadata?.mediaType === 'SERIES' ? 'Add Series to Watchlist' : 'Add to Watchlist')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Bulk Import */}
        {activeTab === 'bulk' && (
          <div className="p-5 sm:p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Paste IMDb links or title IDs (one per line)
              </label>
              <textarea
                rows={6}
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder={`https://www.imdb.com/title/tt0111161/\nhttps://www.imdb.com/title/tt0068646/\ntt0468569\nhttps://m.imdb.com/title/tt0109830/`}
                className="w-full rounded-lg border border-neutral-800 bg-[#1A1A1A] p-3 text-xs font-mono text-[#ECECEC] placeholder-neutral-500 focus:border-neutral-600 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400">Set Status:</span>
                <select
                  value={bulkStatus}
                  aria-label="Set status for imported movies"
                  onChange={(e) => setBulkStatus(e.target.value as WatchStatus)}
                  className="rounded-lg border border-neutral-800 bg-[#1A1A1A] py-1 px-2.5 text-xs text-neutral-300"
                >
                  <option value="TO_DO">To do</option>
                  <option value="DOING">Doing</option>
                  <option value="DONE">Done</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isInspectingBulk || !bulkInput.trim()}
                  onClick={handleInspectBulk}
                  className="rounded-lg bg-[#333333] px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-700 hover:text-white disabled:opacity-50"
                >
                  {isInspectingBulk ? 'Inspecting...' : 'Inspect Links'}
                </button>
                <button
                  type="button"
                  disabled={isSubmittingBulk || !bulkInput.trim()}
                  onClick={handleExecuteBulkImport}
                  className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-1.5 text-xs font-semibold text-black hover:bg-neutral-200 disabled:opacity-50"
                >
                  {isSubmittingBulk ? 'Importing...' : 'Import Valid Titles'}
                </button>
              </div>
            </div>

            {/* Inspection Breakdown */}
            {bulkInspectionResults && (
              <div className="rounded-xl border border-neutral-800 bg-[#1A1A1A] p-4 text-xs space-y-2">
                <h4 className="font-semibold text-white">Inspection Summary</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
                  <div className="rounded bg-[#262626] p-2">
                    <span className="block text-lg font-bold text-green-400">
                      {
                        bulkInspectionResults.filter(
                          (r) =>
                            r.parsed &&
                            !r.isDuplicateInInput &&
                            !r.isAlreadyInCollection &&
                            !r.isUnsupportedType,
                        ).length
                      }
                    </span>
                    <span className="text-[11px] text-neutral-400">Ready to Import</span>
                  </div>
                  <div className="rounded bg-[#262626] p-2">
                    <span className="block text-lg font-bold text-yellow-400">
                      {bulkInspectionResults.filter((r) => r.isAlreadyInCollection).length}
                    </span>
                    <span className="text-[11px] text-neutral-400">Already in Watchlist</span>
                  </div>
                  <div className="rounded bg-[#262626] p-2">
                    <span className="block text-lg font-bold text-neutral-400">
                      {bulkInspectionResults.filter((r) => r.isDuplicateInInput).length}
                    </span>
                    <span className="text-[11px] text-neutral-400">Duplicate in Input</span>
                  </div>
                  <div className="rounded bg-[#262626] p-2">
                    <span className="block text-lg font-bold text-red-400">
                      {bulkInspectionResults.filter((r) => !r.parsed || r.isUnsupportedType).length}
                    </span>
                    <span className="text-[11px] text-neutral-400">Invalid Links</span>
                  </div>
                </div>
              </div>
            )}

            {/* Import Execution Report */}
            {bulkReport && (
              <div className="rounded-xl border border-neutral-800 bg-[#1A1A1A] p-4 text-xs space-y-3">
                <div className="flex items-center gap-2 text-green-400 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Bulk Import Finished</span>
                </div>
                <p className="text-neutral-300">
                  Imported: <strong className="text-white">{bulkReport.summary.importedCount}</strong> | Skipped: <strong className="text-white">{bulkReport.summary.skippedCount}</strong> | Failed: <strong className="text-white">{bulkReport.summary.failedCount}</strong>
                </p>
                {bulkReport.skipped.length > 0 && (
                  <div className="text-[11px] text-neutral-400 space-y-1">
                    <p className="font-medium text-neutral-300">Skipped items:</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {bulkReport.skipped.map((s, idx) => (
                        <li key={idx}>
                          {s.imdbId}: {s.reason} {s.title ? `("${s.title}")` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Data Portability (Export & Import JSON) */}
        {activeTab === 'portability' && (
          <div className="p-5 sm:p-6 space-y-6">
            {/* Export Section */}
            <div className="rounded-xl border border-neutral-800 bg-[#1A1A1A] p-4 space-y-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Watchlist
              </h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Download your complete movie collection as a portable JSON file,
                including IMDb metadata, watching statuses, notes, and personal ratings.
              </p>
              <button
                type="button"
                disabled={isExporting}
                onClick={handleExportJson}
                className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-neutral-200 transition-colors disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                {isExporting ? 'Generating JSON...' : 'Export Collection to JSON'}
              </button>
            </div>

            {/* Import Section */}
            <div className="rounded-xl border border-neutral-800 bg-[#1A1A1A] p-4 space-y-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Restore / Import Watchlist
              </h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Restore movies from a previously exported JSON backup file.
              </p>

              <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overwriteExisting}
                  onChange={(e) => setOverwriteExisting(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-900 text-white focus:ring-0"
                />
                Overwrite existing movies if they already exist in watchlist
              </label>

              <div className="pt-2">
                <label className="inline-flex items-center gap-1.5 rounded-lg bg-[#333333] px-4 py-2 text-xs font-medium text-neutral-200 hover:bg-neutral-700 hover:text-white cursor-pointer transition-colors">
                  <Upload className="h-3.5 w-3.5" />
                  {isImportingJson ? 'Processing JSON...' : 'Select JSON File to Import'}
                  <input
                    type="file"
                    accept=".json"
                    disabled={isImportingJson}
                    onChange={handleImportJsonFile}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Status Message */}
            {portabilityMessage && (
              <div
                className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs ${
                  portabilityMessage.type === 'success'
                    ? 'border-green-500/30 bg-green-500/10 text-green-300'
                    : 'border-red-500/30 bg-red-500/10 text-red-300'
                }`}
              >
                {portabilityMessage.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-green-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                )}
                <span>{portabilityMessage.text}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
