'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  Tv,
  Bell,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Calendar,
  Layers,
  Search,
  Filter,
} from 'lucide-react';
import type { Movie } from '@/db/schema';
import type { SyncSeriesResultItem } from '@/lib/movies/service';
import { sendPushNotification, requestNotificationPermission } from '@/lib/push-notifications';
import { SeriesProgressModal } from '@/components/series-progress-modal';

export default function SyncResultsPage() {
  const [items, setItems] = useState<SyncSeriesResultItem[]>([]);
  const [seriesList, setSeriesList] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'ALL' | 'NEW_SEASONS' | 'UPDATED' | 'UP_TO_DATE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [selectedMovieForProgress, setSelectedMovieForProgress] = useState<Movie | null>(null);

  // Check notification permission state
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Fetch all series initially
  const loadInitialSeries = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/movies/sync-all-series');
      if (res.ok) {
        const data: any = await res.json();
        const list: Movie[] = data.series || [];
        setSeriesList(list);

        // Pre-populate items with current series data
        const initialItems: SyncSeriesResultItem[] = list.map((s) => ({
          id: s.id,
          title: s.title,
          imdbId: s.imdbId,
          imdbUrl: s.imdbUrl,
          releaseYear: s.releaseYear,
          oldSeasons: s.totalSeasons || 1,
          newSeasons: s.totalSeasons || 1,
          oldEpisodes: s.totalEpisodes || 0,
          newEpisodes: s.totalEpisodes || 0,
          hasNewSeasons: false,
          hasNewEpisodes: false,
          newEpisodesCount: 0,
          status: 'UP_TO_DATE',
        }));
        setItems(initialItems);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialSeries();
  }, [loadInitialSeries]);

  // Execute Sync with IMDb
  const handleExecuteSync = async () => {
    setIsSyncing(true);
    // Request permission if not yet decided
    const granted = await requestNotificationPermission();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    try {
      const res = await fetch('/api/movies/sync-all-series', {
        method: 'POST',
      });
      const data: any = await res.json();

      if (res.ok && data.success) {
        setItems(data.items || []);
        setSyncedAt(data.syncedAt || new Date().toISOString());

        // Send push notification for any series with new seasons
        if (data.seriesWithNewSeasons && data.seriesWithNewSeasons.length > 0) {
          for (const s of data.seriesWithNewSeasons) {
            sendPushNotification(`🎬 New Season Alert: ${s.title}`, {
              body: `Season ${s.newSeasons} is now available on IMDb!`,
            });
          }
        }

        // Refresh underlying series list
        const refreshRes = await fetch('/api/movies/sync-all-series');
        if (refreshRes.ok) {
          const refreshData: any = await refreshRes.json();
          setSeriesList(refreshData.series || []);
        }
      }
    } catch {
      // error handling
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEnableNotifications = async () => {
    await requestNotificationPermission();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  };

  // Filtered items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.imdbId.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterTab === 'NEW_SEASONS') return item.hasNewSeasons;
    if (filterTab === 'UPDATED') return item.hasNewEpisodes && !item.hasNewSeasons;
    if (filterTab === 'UP_TO_DATE') return !item.hasNewSeasons && !item.hasNewEpisodes;
    return true;
  });

  const newSeasonsCount = items.filter((i) => i.hasNewSeasons).length;
  const episodesUpdatedCount = items.filter((i) => i.hasNewEpisodes && !i.hasNewSeasons).length;
  const upToDateCount = items.filter((i) => !i.hasNewSeasons && !i.hasNewEpisodes && i.status !== 'ERROR').length;

  return (
    <div className="min-h-screen bg-[#1E1E1E] text-[#ECECEC] flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-neutral-800 bg-[#171717]/95 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-xl border border-neutral-700/80 bg-[#262626] px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Watchlist</span>
          </Link>
          <div className="h-4 w-px bg-neutral-800 hidden sm:block" />
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Tv className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>IMDb Series Sync Results</span>
                <span className="rounded-full bg-purple-500/20 px-2 py-0.2 text-[10px] font-semibold text-purple-300 border border-purple-500/30">
                  {items.length} Series
                </span>
              </h1>
              {syncedAt && (
                <p className="text-[11px] text-neutral-400">
                  Last synced: {new Date(syncedAt).toLocaleTimeString()} ({new Date(syncedAt).toLocaleDateString()})
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {notificationPermission !== 'granted' && (
            <button
              type="button"
              onClick={handleEnableNotifications}
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors"
              title="Enable browser notifications for newly detected seasons"
            >
              <Bell className="h-3.5 w-3.5" />
              <span>Enable Alerts</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExecuteSync}
            disabled={isSyncing}
            className="flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white shadow-md disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing with IMDb...' : 'Sync All Series Now'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* KPI Stats Overview Cards */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-neutral-800 bg-[#262626] p-4 flex flex-col justify-between">
            <span className="text-xs text-neutral-400 font-medium">Total Series</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white">{items.length}</span>
              <Tv className="h-4 w-4 text-neutral-500" />
            </div>
          </div>

          <div
            className={`rounded-2xl border p-4 flex flex-col justify-between transition-all ${
              newSeasonsCount > 0
                ? 'border-amber-500/40 bg-amber-950/20 ring-1 ring-amber-500/30'
                : 'border-neutral-800 bg-[#262626]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-300">New Seasons</span>
              {newSeasonsCount > 0 && (
                <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-amber-300">{newSeasonsCount}</span>
              <Sparkles className="h-4 w-4 text-amber-400" />
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-[#262626] p-4 flex flex-col justify-between">
            <span className="text-xs text-sky-300 font-medium">Episodes Added</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-sky-300">{episodesUpdatedCount}</span>
              <Layers className="h-4 w-4 text-sky-400" />
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-[#262626] p-4 flex flex-col justify-between">
            <span className="text-xs text-emerald-300 font-medium">Up to Date</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-emerald-300">{upToDateCount}</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
        </section>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div
            className="flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-[#1A1A1A] p-1 overflow-x-auto [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <button
              type="button"
              onClick={() => setFilterTab('ALL')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                filterTab === 'ALL'
                  ? 'bg-[#2E2E2E] text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              All Series ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('NEW_SEASONS')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                filterTab === 'NEW_SEASONS'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-neutral-400 hover:text-amber-300 hover:bg-neutral-800'
              }`}
            >
              New Seasons ({newSeasonsCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('UPDATED')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                filterTab === 'UPDATED'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'text-neutral-400 hover:text-sky-300 hover:bg-neutral-800'
              }`}
            >
              Episodes Updated ({episodesUpdatedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('UP_TO_DATE')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                filterTab === 'UP_TO_DATE'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-neutral-400 hover:text-emerald-300 hover:bg-neutral-800'
              }`}
            >
              Up to date ({upToDateCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by series title..."
              className="w-full rounded-xl border border-neutral-800 bg-[#1A1A1A] pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Results List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-2xl border border-neutral-800 bg-[#262626] animate-pulse"
              />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800 bg-[#262626] p-12 text-center">
            <Tv className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">No Series Match Filter</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
              {items.length === 0
                ? 'You do not have any TV series in your watchlist yet.'
                : 'No series found for the selected filter.'}
            </p>
            {items.length === 0 ? (
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 mt-4 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500 transition-colors"
              >
                Go to Watchlist to Import Series
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setFilterTab('ALL');
                  setSearchQuery('');
                }}
                className="mt-4 rounded-xl bg-[#333333] px-3.5 py-1.5 text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const matchedMovie = seriesList.find((s) => s.id === item.id);

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border bg-[#262626] p-4 sm:p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    item.hasNewSeasons
                      ? 'border-amber-500/50 bg-gradient-to-r from-amber-950/20 via-[#262626] to-[#262626] shadow-lg shadow-amber-950/10'
                      : item.hasNewEpisodes
                      ? 'border-sky-500/40 bg-gradient-to-r from-sky-950/20 via-[#262626] to-[#262626]'
                      : 'border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  {/* Left Column: Title & Metadata */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-white tracking-tight">
                        {item.title}
                      </h2>
                      {item.releaseYear && (
                        <span className="flex items-center gap-1 text-xs text-neutral-400">
                          <Calendar className="h-3 w-3 text-neutral-500" />
                          {item.releaseYear}
                        </span>
                      )}
                      <a
                        href={item.imdbUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded bg-[#1A1A1A] border border-neutral-700 px-1.5 py-0.5 text-[10px] text-neutral-300 hover:text-white hover:border-neutral-500 transition-colors"
                      >
                        <span>{item.imdbId}</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>

                    {/* Seasons and Episodes details */}
                    <div className="flex items-center gap-3 text-xs text-neutral-300 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-neutral-500">Seasons:</span>
                        {item.hasNewSeasons ? (
                          <span className="font-semibold text-amber-300">
                            {item.oldSeasons} → {item.newSeasons} Seasons (+
                            {item.newSeasons - item.oldSeasons} new!)
                          </span>
                        ) : (
                          <span className="font-medium text-neutral-200">
                            {item.newSeasons} {item.newSeasons === 1 ? 'Season' : 'Seasons'}
                          </span>
                        )}
                      </div>

                      <span className="text-neutral-600">•</span>

                      <div className="flex items-center gap-1.5">
                        <span className="text-neutral-500">Episodes:</span>
                        {item.newEpisodesCount > 0 ? (
                          <span className="font-semibold text-sky-300">
                            {item.newEpisodes} Episodes (+{item.newEpisodesCount} added)
                          </span>
                        ) : (
                          <span className="font-medium text-neutral-200">
                            {item.newEpisodes} Episodes
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Status Badges and Actions */}
                  <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                    {/* Status Badge */}
                    {item.hasNewSeasons ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300 shadow-sm">
                        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                        <span>New Season Detected!</span>
                      </span>
                    ) : item.hasNewEpisodes ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/50 bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-300">
                        <Layers className="h-3.5 w-3.5 text-sky-400" />
                        <span>Episodes Updated</span>
                      </span>
                    ) : item.status === 'ERROR' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-950/40 px-3 py-1 text-xs font-semibold text-red-300">
                        <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                        <span>{item.errorMessage || 'Sync Issue'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Up to date</span>
                      </span>
                    )}

                    {/* Manage Series Progress Button */}
                    {matchedMovie && (
                      <button
                        type="button"
                        onClick={() => setSelectedMovieForProgress(matchedMovie)}
                        className="flex items-center gap-1 rounded-xl border border-neutral-700 bg-[#1e1e1e] px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:text-white hover:bg-neutral-800 transition-colors"
                      >
                        <Tv className="h-3.5 w-3.5 text-purple-400" />
                        <span>View Episodes</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Inline Series Progress Modal */}
      {selectedMovieForProgress && (
        <SeriesProgressModal
          isOpen={!!selectedMovieForProgress}
          movie={selectedMovieForProgress}
          onClose={() => setSelectedMovieForProgress(null)}
          onUpdateMovie={async (id, updates) => {
            try {
              const res = await fetch(`/api/movies/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
              });
              if (res.ok) {
                const data: any = await res.json();
                setSelectedMovieForProgress(data.movie);
                loadInitialSeries();
              }
            } catch {
              // ignore
            }
          }}
        />
      )}
    </div>
  );
}
