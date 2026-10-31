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
} from 'lucide-react';
import type { Movie } from '@/db/schema';

export type SeriesEpisodeStatus = 'To do' | 'Doing' | 'Done';

export interface EpisodeProgressRow {
  id: string;
  season: number;
  episode: number;
  status: SeriesEpisodeStatus;
  hour: number;
  minute: number;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize table rows from movie.seriesProgress or fallback to movie's current progress
  useEffect(() => {
    if (!isOpen) return;
    setError(null);

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
          }));
          setRows(loadedRows);
          return;
        }
      } catch (err) {
        console.warn('Could not parse seriesProgress JSON:', err);
      }
    }

    // Default initialization when no seriesProgress is saved
    const curSeason = movie.currentSeason || 1;
    const curEpisode = movie.currentEpisode || 1;
    const curStatus: SeriesEpisodeStatus =
      movie.status === 'DONE' ? 'Done' : movie.status === 'DOING' ? 'Doing' : 'To do';
    const curHour = movie.currentHour || 0;
    const curMin = movie.currentMinute || 0;

    const initialRows: EpisodeProgressRow[] = [];

    // If curEpisode > 1, add previous completed episodes
    for (let ep = 1; ep < curEpisode; ep++) {
      initialRows.push({
        id: `ep-${curSeason}-${ep}`,
        season: curSeason,
        episode: ep,
        status: 'Done',
        hour: 0,
        minute: 0,
      });
    }

    // Current episode
    initialRows.push({
      id: `ep-${curSeason}-${curEpisode}`,
      season: curSeason,
      episode: curEpisode,
      status: curStatus,
      hour: curStatus === 'Doing' ? curHour : 0,
      minute: curStatus === 'Doing' ? curMin : 0,
    });

    // If totalEpisodes is known and > curEpisode, add remaining as To do
    const totalEps = movie.totalEpisodes || null;
    const totalSeas = movie.totalSeasons || 1;
    const epsPerSeason = totalEps && totalSeas ? Math.ceil(totalEps / totalSeas) : null;
    const maxSeasonEps = epsPerSeason || totalEps || 0;

    if (maxSeasonEps > curEpisode) {
      for (let ep = curEpisode + 1; ep <= Math.min(maxSeasonEps, curEpisode + 5); ep++) {
        initialRows.push({
          id: `ep-${curSeason}-${ep}`,
          season: curSeason,
          episode: ep,
          status: 'To do',
          hour: 0,
          minute: 0,
        });
      }
    }

    setRows(initialRows.length > 0 ? initialRows : [
      {
        id: `ep-1-1`,
        season: 1,
        episode: 1,
        status: 'To do',
        hour: 0,
        minute: 0,
      },
    ]);
  }, [isOpen, movie]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
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
    const lastRow = rows[rows.length - 1];
    const newSeason = lastRow ? lastRow.season : (movie.currentSeason || 1);
    const newEpisode = lastRow ? lastRow.episode + 1 : 1;

    setRows((prev) => [
      ...prev,
      {
        id: `ep-${newSeason}-${newEpisode}-${Date.now()}`,
        season: newSeason,
        episode: newEpisode,
        status: 'To do',
        hour: 0,
        minute: 0,
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
    const curSeason = rows[0]?.season || movie.currentSeason || 1;
    const targetCount = movie.totalEpisodes ? Math.min(movie.totalEpisodes, 24) : 10;
    const populated: EpisodeProgressRow[] = [];

    for (let ep = 1; ep <= targetCount; ep++) {
      const existing = rows.find((r) => r.season === curSeason && r.episode === ep);
      if (existing) {
        populated.push(existing);
      } else {
        populated.push({
          id: `ep-${curSeason}-${ep}`,
          season: curSeason,
          episode: ep,
          status: ep === 1 ? 'Doing' : 'To do',
          hour: 0,
          minute: 0,
        });
      }
    }
    setRows(populated);
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
        // Some Done, some To do: current episode is the first To do episode
        const firstToDo = rows.find((r) => r.status === 'To do');
        if (firstToDo) {
          newStatus = 'TO_DO';
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
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-neutral-800 bg-[#1A1A1A] text-white shadow-2xl overflow-hidden"
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
              onClick={handleQuickPopulate}
              className="flex items-center gap-1 text-[11px] font-medium text-neutral-400 hover:text-purple-300 hover:underline transition-colors"
              title="Populate standard episodes list"
            >
              <Sparkles className="h-3 w-3" />
              Populate Episodes
            </button>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/40 px-3.5 py-2.5 text-xs text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* 4-Column Table */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="rounded-xl border border-neutral-800 bg-[#222222] overflow-hidden">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-800 bg-[#282828] text-neutral-300 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-4 w-24">Season</th>
                  <th className="py-2.5 px-4 w-24">Episode</th>
                  <th className="py-2.5 px-4 w-36">Status</th>
                  <th className="py-2.5 px-4">Hour &amp; Minute (Doing)</th>
                  <th className="py-2.5 px-3 w-12 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {rows.map((row) => {
                  const isDoing = row.status === 'Doing';

                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors hover:bg-neutral-800/40 ${
                        isDoing ? 'bg-sky-950/20' : ''
                      }`}
                    >
                      {/* Column 1: Season */}
                      <td className="py-2.5 px-4">
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
                            className="w-16 rounded-md bg-[#161616] border border-neutral-700 px-2 py-1 text-center font-bold text-white focus:border-purple-500 focus:outline-none"
                          />
                        </div>
                      </td>

                      {/* Column 2: Episode */}
                      <td className="py-2.5 px-4">
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
                            className="w-16 rounded-md bg-[#161616] border border-neutral-700 px-2 py-1 text-center font-bold text-white focus:border-purple-500 focus:outline-none"
                          />
                        </div>
                      </td>

                      {/* Column 3: Status (To do, Doing, Done) */}
                      <td className="py-2.5 px-4">
                        <select
                          value={row.status}
                          onChange={(e) =>
                            handleRowChange(row.id, {
                              status: e.target.value as SeriesEpisodeStatus,
                            })
                          }
                          className={`w-full rounded-md border px-2.5 py-1 text-xs font-semibold focus:outline-none transition-colors ${
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
                      <td className="py-2.5 px-4">
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
                              className={`w-14 rounded-md border px-2 py-1 text-center font-medium transition-all ${
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
                              className={`w-14 rounded-md border px-2 py-1 text-center font-medium transition-all ${
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
                            <span className="text-[10px] text-neutral-500 italic ml-1">
                              (Only when Doing)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action: Delete */}
                      <td className="py-2.5 px-3 text-center">
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

          {/* Add Row Button */}
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800/80 px-3.5 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 hover:text-white transition-colors"
            >
              <Plus className="h-3.5 w-3.5 text-purple-400" />
              Add Episode Row
            </button>
            <span className="text-[11px] text-neutral-400">
              {rows.length} {rows.length === 1 ? 'episode' : 'episodes'} tracked
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
