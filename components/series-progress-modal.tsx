'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Check,
  Tv,
  Clock,
  Sparkles,
  RotateCcw,
  AlertCircle,
  RefreshCw,
  Bell,
  ExternalLink,
} from 'lucide-react';
import type { Movie } from '@/db/schema';
import { sendPushNotification, requestNotificationPermission } from '@/lib/push-notifications';

export type SeriesEpisodeStatus = 'To do' | 'Doing' | 'Done';

export interface EpisodeProgressRow {
  id: string;
  season: number;
  episode: number;
  status: SeriesEpisodeStatus;
  hour: number;
  minute: number;
  stremio?: string;
}

interface SeriesProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  movie: Movie;
  onUpdateMovie: (movieId: string, updates: Record<string, any>) => Promise<void>;
}

export function SeriesProgressModal({
  isOpen,
  onClose,
  movie,
  onUpdateMovie,
}: SeriesProgressModalProps) {
  const [rows, setRows] = useState<EpisodeProgressRow[]>([]);
  const [selectedSeasonFilter, setSelectedSeasonFilter] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize table rows from movie.seriesProgress or generate standard seasons & episodes
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSelectedSeasonFilter(null);

    const curSeason = movie.currentSeason || 1;
    const curEpisode = movie.currentEpisode || 1;
    const curStatus: SeriesEpisodeStatus =
      movie.status === 'DONE' ? 'Done' : movie.status === 'DOING' ? 'Doing' : 'To do';
    const curHour = movie.currentHour || 0;
    const curMin = movie.currentMinute || 0;

    const totalEps = movie.totalEpisodes || null;
    const totalSeas = movie.totalSeasons || 1;
    const epsPerSeason = totalEps && totalSeas ? Math.ceil(totalEps / totalSeas) : (totalEps || 8);

    if (movie.seriesProgress) {
      try {
        const parsed = JSON.parse(movie.seriesProgress);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const loadedRows: EpisodeProgressRow[] = parsed.map((item: any, idx: number) => ({
            id: item.id || `row-${idx}-${Date.now()}`,
            season: typeof item.season === 'number' && item.season > 0 ? item.season : 1,
            episode: typeof item.episode === 'number' && item.episode > 0 ? item.episode : 1,
            status: item.status === 'Done' ? 'Done' : item.status === 'Doing' ? 'Doing' : 'To do',
            hour: typeof item.hour === 'number' && item.hour >= 0 ? Math.min(item.hour, 99) : 0,
            minute: typeof item.minute === 'number' && item.minute >= 0 ? Math.min(item.minute, 59) : 0,
            stremio: typeof item.stremio === 'string' ? item.stremio : typeof item.stremioLink === 'string' ? item.stremioLink : '',
          }));

          setRows(loadedRows);
          return;
        }
      } catch (err) {
        console.warn('Could not parse seriesProgress JSON:', err);
      }
    }

    // Default initialization when no seriesProgress is saved:
    // Generate all seasons and episodes for the series
    const initialRows: EpisodeProgressRow[] = [];

    for (let s = 1; s <= totalSeas; s++) {
      for (let ep = 1; ep <= epsPerSeason; ep++) {
        let epStatus: SeriesEpisodeStatus = 'To do';
        let epHour = 0;
        let epMin = 0;

        if (movie.status === 'DONE') {
          epStatus = 'Done';
        } else if (movie.status === 'DOING') {
          if (s < curSeason || (s === curSeason && ep < curEpisode)) {
            epStatus = 'Done';
          } else if (s === curSeason && ep === curEpisode) {
            epStatus = curStatus;
            epHour = curHour;
            epMin = curMin;
          } else {
            epStatus = 'To do';
          }
        } else {
          epStatus = 'To do';
        }

        initialRows.push({
          id: `ep-${s}-${ep}`,
          season: s,
          episode: ep,
          status: epStatus,
          hour: epHour,
          minute: epMin,
          stremio: '',
        });
      }
    }

    setRows(
      initialRows.length > 0
        ? initialRows
        : [
            {
              id: 'ep-1-1',
              season: 1,
              episode: 1,
              status: 'To do',
              hour: 0,
              minute: 0,
              stremio: '',
            },
          ],
    );
  }, [isOpen, movie]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Escape' || e.key === 'Esc') && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleRowChange = (id: string, updates: Partial<EpisodeProgressRow>) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, ...updates };

        // If status changed away from 'Doing', reset or keep hour/minute inactive
        if (updates.status && updates.status !== 'Doing') {
          // Hour and minute are disabled/reset for non-doing
          updated.hour = 0;
          updated.minute = 0;
        }

        return updated;
      }),
    );
  };

  const handleAddRow = () => {
    const totalEps = movie.totalEpisodes || null;
    const totalSeas = movie.totalSeasons || 1;
    const epsPerSeason = totalEps && totalSeas ? Math.ceil(totalEps / totalSeas) : 8;

    // If a season filter is active, add to that season
    if (selectedSeasonFilter !== null) {
      const seasonRows = rows.filter((r) => r.season === selectedSeasonFilter);
      const maxEp = seasonRows.reduce((max, r) => Math.max(max, r.episode), 0);
      setRows((prev) => [
        ...prev,
        {
          id: `ep-${selectedSeasonFilter}-${maxEp + 1}-${Date.now()}`,
          season: selectedSeasonFilter,
          episode: maxEp + 1,
          status: 'To do',
          hour: 0,
          minute: 0,
          stremio: '',
        },
      ]);
      return;
    }

    const lastRow = rows[rows.length - 1];
    let newSeason = lastRow ? lastRow.season : (movie.currentSeason || 1);
    let newEpisode = lastRow ? lastRow.episode + 1 : 1;

    // Rollover to next season if episode exceeds the episodes per season
    if (newEpisode > epsPerSeason) {
      newSeason += 1;
      newEpisode = 1;
    }

    setRows((prev) => [
      ...prev,
      {
        id: `ep-${newSeason}-${newEpisode}-${Date.now()}`,
        season: newSeason,
        episode: newEpisode,
        status: 'To do',
        hour: 0,
        minute: 0,
        stremio: '',
      },
    ]);
  };

  const handleDeleteRow = (id: string) => {
    if (rows.length <= 1) {
      setError('You must have at least one episode entry.');
      return;
    }
    setError(null);
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleQuickPopulate = () => {
    const totalEps = movie.totalEpisodes || null;
    const totalSeas = movie.totalSeasons || 1;
    const epsPerSeason = totalEps && totalSeas ? Math.ceil(totalEps / totalSeas) : (totalEps || 8);
    const populated: EpisodeProgressRow[] = [];

    for (let s = 1; s <= totalSeas; s++) {
      for (let ep = 1; ep <= epsPerSeason; ep++) {
        const existing = rows.find((r) => r.season === s && r.episode === ep);
        if (existing) {
          populated.push(existing);
        } else {
          populated.push({
            id: `ep-${s}-${ep}`,
            season: s,
            episode: ep,
            status: 'To do',
            hour: 0,
            minute: 0,
            stremio: '',
          });
        }
      }
    }
    setRows(populated);
  };

  const handleSyncWithImdb = async () => {
    setIsSyncing(true);
    setSyncNotice(null);
    setError(null);

    // Request browser notification permission if not yet decided
    await requestNotificationPermission();

    try {
      const res = await fetch(`/api/movies/${movie.id}/sync-series`, {
        method: 'POST',
      });
      const data: any = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to sync with IMDb');
      }

      if (data.updated && data.movie?.seriesProgress) {
        try {
          const updatedRows = JSON.parse(data.movie.seriesProgress);
          setRows(updatedRows);
        } catch {
          // ignore parsing error
        }

        if (data.hasNewSeasons) {
          sendPushNotification(`🎬 New Season Alert: ${movie.title}`, {
            body: `Season ${data.movie.totalSeasons} is now available on IMDb! New episodes were added to your series progress.`,
          });

          setSyncNotice({
            type: 'success',
            message: `🎉 New Season Alert! Season ${data.movie.totalSeasons} detected on IMDb. Added ${data.newEpisodesCount} new episode(s).`,
          });
        } else {
          setSyncNotice({
            type: 'success',
            message: `Synced with IMDb! Added ${data.newEpisodesCount} new episode(s).`,
          });
        }

        await onUpdateMovie(movie.id, {
          totalSeasons: data.movie.totalSeasons,
          totalEpisodes: data.movie.totalEpisodes,
          seriesProgress: data.movie.seriesProgress,
        });
      } else {
        setSyncNotice({
          type: 'info',
          message: `Already up to date with IMDb (${data.movie?.totalSeasons || movie.totalSeasons || 1} seasons, ${data.movie?.totalEpisodes || movie.totalEpisodes || rows.length} episodes).`,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sync with IMDb');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSave = async () => {
    if (rows.length === 0) {
      setError('Please add at least one episode.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Find the active Doing episode
      const doingRow = rows.find((r) => r.status === 'Doing');
      const allDone = rows.every((r) => r.status === 'Done');
      const allToDo = rows.every((r) => r.status === 'To do');

      let newStatus: 'TO_DO' | 'DOING' | 'DONE' = movie.status;
      let newSeason = movie.currentSeason || 1;
      let newEpisode = movie.currentEpisode || 1;
      let newHour: number | null = null;
      let newMinute: number | null = null;

      if (doingRow) {
        newStatus = 'DOING';
        newSeason = doingRow.season;
        newEpisode = doingRow.episode;
        newHour = doingRow.hour;
        newMinute = doingRow.minute;
      } else if (allDone) {
        newStatus = 'DONE';
        const lastRow = rows[rows.length - 1];
        newSeason = lastRow.season;
        newEpisode = lastRow.episode;
        newHour = null;
        newMinute = null;
      } else if (allToDo) {
        newStatus = 'TO_DO';
        newSeason = rows[0].season;
        newEpisode = rows[0].episode;
        newHour = null;
        newMinute = null;
      } else {
        // Some Done, some To do: the series is in progress (DOING), next episode is the first To do episode
        newStatus = 'DOING';
        const firstToDo = rows.find((r) => r.status === 'To do');
        if (firstToDo) {
          newSeason = firstToDo.season;
          newEpisode = firstToDo.episode;
        }
        newHour = null;
        newMinute = null;
      }

      const updates: Record<string, any> = {
        status: newStatus,
        currentSeason: newSeason,
        currentEpisode: newEpisode,
        currentHour: newHour,
        currentMinute: newMinute,
        seriesProgress: JSON.stringify(
          rows.map((r) => ({
            season: r.season,
            episode: r.episode,
            status: r.status,
            hour: r.status === 'Doing' ? r.hour : 0,
            minute: r.status === 'Doing' ? r.minute : 0,
            stremio: r.stremio ? r.stremio.trim() : '',
          })),
        ),
      };

      await onUpdateMovie(movie.id, updates);
      onClose();
    } catch (err: any) {
      console.error('Failed to save series progress:', err);
      setError(err.message || 'Failed to update series progress.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const todoCount = rows.filter((r) => r.status === 'To do').length;
  const doingCount = rows.filter((r) => r.status === 'Doing').length;
  const doneCount = rows.filter((r) => r.status === 'Done').length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-neutral-800 bg-[#1A1A1A] text-white shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="series-progress-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4 bg-[#202020]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Tv className="h-5 w-5" />
            </div>
            <div>
              <h2 id="series-progress-title" className="text-base font-bold text-white">
                Series Progress Management
              </h2>
              <p className="text-xs text-neutral-400 truncate max-w-md">
                {movie.title}
                {movie.releaseYear ? ` (${movie.releaseYear})` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stats summary & helper */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800/80 px-6 py-2.5 bg-[#171717] text-xs">
          <div className="flex items-center gap-2">
            <span className="text-neutral-400">Status Summary:</span>
            <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 font-semibold text-amber-300">
              {todoCount} To do
            </span>
            <span className="rounded-md bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 font-semibold text-sky-300">
              {doingCount} Doing
            </span>
            <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 font-semibold text-emerald-300">
              {doneCount} Done
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncWithImdb}
              disabled={isSyncing}
              className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-[11px] font-semibold text-purple-300 hover:bg-purple-500/20 hover:text-white transition-all disabled:opacity-50"
              title="Sync latest seasons and episodes with IMDb"
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin text-purple-400' : 'text-purple-400'}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync with IMDb'}</span>
            </button>
            <button
              type="button"
              onClick={handleQuickPopulate}
              className="flex items-center gap-1 text-[11px] font-medium text-neutral-400 hover:text-purple-300 hover:underline transition-colors"
              title="Populate standard episodes list"
            >
              <Sparkles className="h-3 w-3" />
              Populate Episodes
            </button>
          </div>
        </div>

        {/* Sync / New Season Alert Banner */}
        {syncNotice && (
          <div
            className={`mx-6 mt-3 flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-xs ${
              syncNotice.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200'
                : 'border-sky-500/40 bg-sky-950/40 text-sky-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 shrink-0 text-amber-400 animate-bounce" />
              <span>{syncNotice.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncNotice(null)}
              className="text-neutral-400 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Season Filter Tabs (Like IMDb tabs: 1 2 3 4 5 6) */}
        {(() => {
          const availableSeasons = Array.from(new Set(rows.map((r) => r.season))).sort((a, b) => a - b);
          if (availableSeasons.length <= 1) return null;
          return (
            <div
              className="flex items-center gap-1.5 border-b border-neutral-800/80 px-6 py-2.5 bg-[#1b1b1b] overflow-x-auto shrink-0 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <span className="text-neutral-400 text-xs font-medium mr-1 shrink-0">Seasons:</span>
              <button
                type="button"
                onClick={() => setSelectedSeasonFilter(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                  selectedSeasonFilter === null
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-[#262626] text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                All ({rows.length})
              </button>
              {availableSeasons.map((s) => {
                const count = rows.filter((r) => r.season === s).length;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSeasonFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                      selectedSeasonFilter === s
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-[#262626] text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    Season {s} ({count})
                  </button>
                );
              })}
            </div>
          );
        })()}

        {/* Error notification */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/40 px-3.5 py-2.5 text-xs text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Episode Table + Fixed Toolbar */}
        <div className="flex-1 flex flex-col min-h-0 px-6 py-4 overflow-hidden">
          <div className="flex-1 overflow-y-auto rounded-xl border border-neutral-800 bg-[#222222]">
            <table className="w-full border-collapse text-left text-xs table-fixed">
              <thead className="sticky top-0 z-10 bg-[#282828] shadow-sm">
                <tr className="border-b border-neutral-800 bg-[#282828] text-neutral-300 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 w-16">Season</th>
                  <th className="py-2.5 px-3 w-16">Episode</th>
                  <th className="py-2.5 px-3 w-28">Status</th>
                  <th className="py-2.5 px-3 w-44">Hour &amp; Minute (Doing)</th>
                  <th className="py-2.5 px-3">Stremio</th>
                  <th className="py-2.5 px-2 w-12 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {(selectedSeasonFilter !== null
                  ? rows.filter((r) => r.season === selectedSeasonFilter)
                  : rows
                ).map((row) => {
                  const isDoing = row.status === 'Doing';

                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors hover:bg-neutral-800/40 ${
                        isDoing ? 'bg-sky-950/20' : ''
                      }`}
                    >
                      {/* Column 1: Season */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-neutral-500 font-medium text-[11px]">S</span>
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={row.season}
                            onChange={(e) =>
                              handleRowChange(row.id, {
                                season: Math.max(1, parseInt(e.target.value, 10) || 1),
                              })
                            }
                            className="w-12 rounded-md bg-[#161616] border border-neutral-700 px-1.5 py-1 text-center font-bold text-white focus:border-purple-500 focus:outline-none"
                          />
                        </div>
                      </td>

                      {/* Column 2: Episode */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-neutral-500 font-medium text-[11px]">Ep</span>
                          <input
                            type="number"
                            min={1}
                            max={999}
                            value={row.episode}
                            onChange={(e) =>
                              handleRowChange(row.id, {
                                episode: Math.max(1, parseInt(e.target.value, 10) || 1),
                              })
                            }
                            className="w-12 rounded-md bg-[#161616] border border-neutral-700 px-1.5 py-1 text-center font-bold text-white focus:border-purple-500 focus:outline-none"
                          />
                        </div>
                      </td>

                      {/* Column 3: Status (To do, Doing, Done) */}
                      <td className="py-2.5 px-3">
                        <select
                          value={row.status}
                          onChange={(e) =>
                            handleRowChange(row.id, {
                              status: e.target.value as SeriesEpisodeStatus,
                            })
                          }
                          className={`w-full min-w-[96px] rounded-md border px-2 py-1 text-xs font-semibold focus:outline-none transition-colors cursor-pointer ${
                            row.status === 'Done'
                              ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300 focus:border-emerald-400'
                              : row.status === 'Doing'
                              ? 'border-sky-500/60 bg-sky-950/50 text-sky-300 focus:border-sky-400 font-bold'
                              : 'border-amber-500/50 bg-amber-950/30 text-amber-300 focus:border-amber-400'
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
                      </td>

                      {/* Column 4: Hour và Minute để sử dụng khi Status là doing */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          {/* Hour Input */}
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              max={23}
                              disabled={!isDoing}
                              value={isDoing ? row.hour : 0}
                              onChange={(e) =>
                                handleRowChange(row.id, {
                                  hour: Math.min(23, Math.max(0, parseInt(e.target.value, 10) || 0)),
                                })
                              }
                              placeholder="0"
                              title={isDoing ? 'Hour' : 'Hour enabled when Doing'}
                              className={`w-12 rounded-md border px-1.5 py-1 text-center font-medium transition-all ${
                                isDoing
                                  ? 'border-sky-500/50 bg-[#161616] text-white focus:border-sky-400 focus:outline-none'
                                  : 'border-neutral-800 bg-neutral-900/60 text-neutral-600 cursor-not-allowed opacity-50'
                              }`}
                            />
                            <span
                              className={`text-[11px] font-semibold ${
                                isDoing ? 'text-sky-400' : 'text-neutral-600'
                              }`}
                            >
                              h
                            </span>
                          </div>

                          <span className={isDoing ? 'text-sky-500 font-bold' : 'text-neutral-600'}>
                            :
                          </span>

                          {/* Minute Input */}
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              max={59}
                              disabled={!isDoing}
                              value={isDoing ? row.minute : 0}
                              onChange={(e) =>
                                handleRowChange(row.id, {
                                  minute: Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0)),
                                })
                              }
                              placeholder="0"
                              title={isDoing ? 'Minute' : 'Minute enabled when Doing'}
                              className={`w-12 rounded-md border px-1.5 py-1 text-center font-medium transition-all ${
                                isDoing
                                  ? 'border-sky-500/50 bg-[#161616] text-white focus:border-sky-400 focus:outline-none'
                                  : 'border-neutral-800 bg-neutral-900/60 text-neutral-600 cursor-not-allowed opacity-50'
                              }`}
                            />
                            <span
                              className={`text-[11px] font-semibold ${
                                isDoing ? 'text-sky-400' : 'text-neutral-600'
                              }`}
                            >
                              m
                            </span>
                          </div>

                          {isDoing ? (
                            <span className="ml-1 inline-flex items-center gap-1 rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-bold text-sky-300 border border-sky-500/30">
                              <Clock className="h-2.5 w-2.5" />
                              Active
                            </span>
                          ) : (
                            <span className="text-[10px] text-neutral-600 italic ml-1">
                              (Doing only)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Column 5: Stremio link */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={row.stremio || ''}
                            onChange={(e) =>
                              handleRowChange(row.id, {
                                stremio: e.target.value,
                              })
                            }
                            placeholder="stremio link..."
                            className="w-full rounded-md bg-[#161616] border border-neutral-700/80 px-2 py-1 text-xs text-white placeholder-neutral-500 focus:border-purple-500 focus:outline-none transition-colors"
                          />
                          {row.stremio?.trim() && (
                            <button
                              type="button"
                              onClick={() => {
                                const link = row.stremio?.trim();
                                if (link && typeof window !== 'undefined') {
                                  window.open(link, '_blank', 'noopener,noreferrer');
                                }
                              }}
                              title="Open Stremio link"
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/40 hover:text-white transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Action: Delete */}
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row.id)}
                          title="Remove row"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-800 hover:text-red-400 transition-colors mx-auto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add Row Button - Always visible! */}
          <div className="mt-3 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800/80 px-3.5 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 hover:text-white transition-colors"
            >
              <Plus className="h-3.5 w-3.5 text-purple-400" />
              <span>
                Add Episode Row{selectedSeasonFilter !== null ? ` (S${selectedSeasonFilter})` : ''}
              </span>
            </button>
            <span className="text-[11px] text-neutral-400">
              {rows.length} {rows.length === 1 ? 'episode' : 'episodes'} tracked
              {selectedSeasonFilter !== null && (
                <> ({rows.filter((r) => r.season === selectedSeasonFilter).length} in Season {selectedSeasonFilter})</>
              )}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-800 px-6 py-4 bg-[#202020]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl bg-[#2C2C2C] px-4 py-2 text-xs font-semibold text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white hover:bg-purple-500 disabled:opacity-50 transition-colors shadow-md"
          >
            <Check className="h-4 w-4" />
            {isSubmitting ? 'Saving...' : 'Save Series Progress'}
          </button>
        </div>
      </div>
    </div>
  );
}
