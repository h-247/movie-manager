'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Film,
  Plus,
  RefreshCw,
  Info,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
  Tag,
  PanelLeft,
} from 'lucide-react';
import type { Movie, WatchStatus } from '@/db/schema';
import { Sidebar } from '@/components/sidebar';
import { MovieCard } from '@/components/movie-card';
import { MovieDetailsDialog } from '@/components/movie-details-dialog';
import { ImportDialog } from '@/components/import-dialog';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { AboutDialog } from '@/components/about-dialog';
import { ManageGenresModal } from '@/components/manage-genres-modal';

export default function HomePage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    todo: 0,
    doing: 0,
    done: 0,
    totalMovies: 0,
    totalSeries: 0,
    genres: [] as { name: string; count: number }[],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Filters and sorting state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [mediaTypeFilter, setMediaTypeFilter] = useState('ALL');
  const [genreFilter, setGenreFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [sortBy, setSortBy] = useState('added_desc');

  // Sidebar state (Default sidebar closed as requested)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modals state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isManageGenresOpen, setIsManageGenresOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [movieToDelete, setMovieToDelete] = useState<Movie | null>(null);

  // Global shortcuts:
  // - Alt+` (Backquote): Open Import Title modal
  // - Alt+1 (Digit1): Toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) return;

      const key = e.key;
      const code = e.code;

      // 1. Alt+1: Toggle sidebar
      if (key === '1' || code === 'Digit1') {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
        return;
      }

      // 2. Alt+`: Open Import Title modal
      if (key === '`' || key === '~' || code === 'Backquote') {
        e.preventDefault();
        setIsImportOpen(true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const data: any = await res.json();
        setStats(data);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchMovies = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'ALL') {
        params.set('status', statusFilter);
      }
      if (mediaTypeFilter && mediaTypeFilter !== 'ALL') {
        params.set('type', mediaTypeFilter);
      }
      if (search.trim()) {
        params.set('search', search.trim());
      }
      if (genreFilter) {
        params.set('genre', genreFilter);
      }
      if (yearFilter) {
        params.set('year', yearFilter);
      }
      if (sortBy) {
        params.set('sortBy', sortBy);
      }

      const res = await fetch(`/api/movies?${params.toString()}`);
      if (res.ok) {
        const data: any = await res.json();
        setMovies(data.movies || []);
      }
    } catch (err: any) {
      showToast('error', 'Failed to load movies.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, mediaTypeFilter, search, genreFilter, yearFilter, sortBy]);

  // Initial load and filter change
  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleStatusChange = async (
    movieId: string,
    newStatus: WatchStatus,
  ) => {
    // Optimistic UI update
    const previousMovies = [...movies];
    setMovies((prev) =>
      prev.map((m) => (m.id === movieId ? { ...m, status: newStatus } : m)),
    );

    try {
      const res = await fetch(`/api/movies/${movieId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update status on server.');
      }

      const data: any = await res.json();
      setMovies((prev) =>
        prev.map((m) => (m.id === movieId ? data.movie : m)),
      );
      if (selectedMovie && selectedMovie.id === movieId) {
        setSelectedMovie(data.movie);
      }

      fetchStats();
      showToast('success', 'Status updated successfully.');
    } catch (err: any) {
      // Rollback on failure
      setMovies(previousMovies);
      showToast('error', 'Could not update status. Reverted changes.');
    }
  };

  const handleUpdateMovie = async (
    movieId: string,
    updates: Record<string, any>,
  ) => {
    try {
      const res = await fetch(`/api/movies/${movieId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const errData: any = await res.json();
        throw new Error(errData.error || 'Failed to update movie.');
      }

      const data: any = await res.json();
      setMovies((prev) =>
        prev.map((m) => (m.id === movieId ? data.movie : m)),
      );
      if (selectedMovie && selectedMovie.id === movieId) {
        setSelectedMovie(data.movie);
      }
      fetchStats();
      showToast('success', 'Movie updated successfully.');
    } catch (err: any) {
      showToast('error', err.message || 'Update failed.');
      throw err;
    }
  };

  const handleDeleteMovie = async (movieId: string) => {
    try {
      const res = await fetch(`/api/movies/${movieId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete movie.');
      }

      setMovies((prev) => prev.filter((m) => m.id !== movieId));
      if (selectedMovie && selectedMovie.id === movieId) {
        setSelectedMovie(null);
      }
      fetchStats();
      showToast('success', 'Movie removed from watchlist.');
    } catch (err: any) {
      showToast('error', err.message || 'Delete failed.');
      throw err;
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setMediaTypeFilter('ALL');
    setGenreFilter('');
    setYearFilter('');
    setSortBy('added_desc');
  };

  return (
    <div className="min-h-screen bg-[#1E1E1E] text-[#ECECEC] flex font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border border-neutral-700 bg-[#262626] px-4 py-3 text-xs shadow-2xl animate-in slide-in-from-bottom-5">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-green-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-400" />
          )}
          <span className="font-medium text-white">{toastMessage.text}</span>
        </div>
      )}

      {/* ChatGPT-style Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen((prev) => !prev)}
        onClose={() => setIsSidebarOpen(false)}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenManageGenres={() => setIsManageGenresOpen(true)}
        stats={stats}
        isLoadingStats={isLoading && movies.length === 0}
        search={search}
        onSearchChange={setSearch}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        mediaType={mediaTypeFilter}
        onMediaTypeChange={setMediaTypeFilter}
        genre={genreFilter}
        onGenreChange={setGenreFilter}
        year={yearFilter}
        onYearChange={setYearFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        availableGenres={stats.genres}
        totalResults={movies.length}
        onResetFilters={handleResetFilters}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Floating Mobile Sidebar Toggle */}
        <button
          type="button"
          onClick={() => setIsSidebarOpen((prev) => !prev)}
          title={isSidebarOpen ? 'Close sidebar (Alt+1)' : 'Open sidebar (Alt+1)'}
          className="md:hidden fixed top-3 left-3 z-30 flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-800 bg-[#262626]/90 backdrop-blur-sm text-neutral-300 shadow-lg hover:text-white transition-colors"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        {/* Main Content Grid */}
        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6">
          <section aria-label="Movie collection">
            {isLoading && movies.length === 0 ? (
              /* Skeleton Loading Grid without photo */
              <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(330px,1fr))]">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col justify-between h-[230px] animate-pulse rounded-2xl bg-[#262626] border border-neutral-800 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-5 w-20 rounded bg-neutral-800" />
                      <div className="h-5 w-12 rounded bg-neutral-800" />
                    </div>
                    <div className="space-y-2 pt-1">
                      <div className="h-5 w-3/4 rounded bg-neutral-800" />
                      <div className="h-3 w-1/3 rounded bg-neutral-800" />
                    </div>
                    <div className="h-7 w-full rounded-lg bg-neutral-800/60 mt-auto" />
                  </div>
                ))}
              </div>
            ) : movies.length > 0 ? (
              /* Movie Cards Grid */
              <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(330px,1fr))]">
                {movies.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    onOpenDetails={(m) => setSelectedMovie(m)}
                    onStatusChange={handleStatusChange}
                    onUpdateMovie={handleUpdateMovie}
                  />
                ))}
              </div>
            ) : (
            /* Empty State */
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-neutral-800 bg-[#262626] p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 border border-neutral-800 text-neutral-500 mb-4">
                <Film className="h-7 w-7" />
              </div>

              {stats.total === 0 ? (
                <>
                  <h3 className="text-base font-semibold text-white">
                    No items yet
                  </h3>
                  <p className="mt-1 max-w-sm text-xs text-neutral-400">
                    Import an IMDb link to start your watchlist.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsImportOpen(true)}
                    className="mt-5 flex items-center gap-1.5 rounded-xl bg-white px-5 py-2.5 text-xs font-semibold text-black hover:bg-neutral-200 transition-colors shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Import Title
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-base font-semibold text-white">
                    No titles found
                  </h3>
                  <p className="mt-1 max-w-sm text-xs text-neutral-400">
                    No titles matched your current search and filter criteria.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="mt-4 rounded-xl bg-[#333333] px-4 py-2 text-xs font-medium text-neutral-200 hover:bg-neutral-700 hover:text-white transition-colors"
                  >
                    Reset Filters
                  </button>
                </>
              )}
            </div>
          )}
        </section>
      </main>
      </div>

      {/* Dialogs */}
      <ImportDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onMovieImported={() => {
          fetchMovies();
          fetchStats();
          showToast('success', 'Watchlist updated successfully!');
        }}
        onViewExistingMovie={(m) => {
          setSelectedMovie(m);
        }}
      />

      <MovieDetailsDialog
        movie={selectedMovie}
        isOpen={!!selectedMovie}
        onClose={() => setSelectedMovie(null)}
        onUpdate={handleUpdateMovie}
        onDeleteRequest={(m) => {
          setSelectedMovie(null);
          setMovieToDelete(m);
        }}
      />

      <DeleteConfirmDialog
        movie={movieToDelete}
        isOpen={!!movieToDelete}
        onClose={() => setMovieToDelete(null)}
        onConfirm={handleDeleteMovie}
      />

      <AboutDialog
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      <ManageGenresModal
        isOpen={isManageGenresOpen}
        onClose={() => setIsManageGenresOpen(false)}
        onGenresChange={() => {
          fetchStats();
          fetchMovies();
        }}
      />
    </div>
  );
}
