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
} from 'lucide-react';
import type { Movie, WatchStatus } from '@/db/schema';
import { DashboardStats } from '@/components/dashboard-stats';
import { SearchFilters } from '@/components/search-filters';
import { MovieCard } from '@/components/movie-card';
import { MovieDetailsDialog } from '@/components/movie-details-dialog';
import { ImportDialog } from '@/components/import-dialog';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { AboutDialog } from '@/components/about-dialog';

export default function HomePage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    todo: 0,
    doing: 0,
    done: 0,
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
  const [genreFilter, setGenreFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [sortBy, setSortBy] = useState('added_desc');

  // Modals state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [movieToDelete, setMovieToDelete] = useState<Movie | null>(null);

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
  }, [statusFilter, search, genreFilter, yearFilter, sortBy]);

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
      setSelectedMovie(data.movie);
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
    setGenreFilter('');
    setYearFilter('');
    setSortBy('added_desc');
  };

  return (
    <div className="min-h-screen bg-[#212121] text-[#ECECEC] flex flex-col">
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

      {/* Main Top Header */}
      <header className="sticky top-0 z-30 border-b border-neutral-800 bg-[#212121]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 sm:py-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black shadow-sm">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                Movie Watchlist Manager
              </h1>
              <p className="hidden sm:block text-[11px] text-neutral-400">
                Personal movie tracking with IMDb imports
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsAboutOpen(true)}
              title="About and TMDB Credits"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-800 bg-[#262626] text-neutral-400 hover:border-neutral-700 hover:text-white transition-colors"
            >
              <Info className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                fetchMovies();
                fetchStats();
              }}
              title="Refresh watchlist"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-800 bg-[#262626] text-neutral-400 hover:border-neutral-700 hover:text-white transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Prominent Import Movie Button */}
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-black shadow-sm hover:bg-neutral-200 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Import Movie</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        {/* 1. Dashboard Summary Counters */}
        <section aria-label="Watchlist statistics">
          <DashboardStats
            stats={stats}
            activeStatus={statusFilter}
            onSelectStatus={(st) => setStatusFilter(st)}
            isLoading={isLoading && movies.length === 0}
          />
        </section>

        {/* 2. Search, Filters, and Sorting Bar */}
        <section aria-label="Search and filter movies">
          <SearchFilters
            search={search}
            onSearchChange={setSearch}
            status={statusFilter}
            onStatusChange={setStatusFilter}
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
        </section>

        {/* 3. Responsive Movie Collection Grid */}
        <section aria-label="Movie collection" className="pt-2">
          {isLoading && movies.length === 0 ? (
            /* Skeleton Loading Grid */
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-[2/3] animate-pulse rounded-xl bg-[#262626] border border-neutral-800"
                />
              ))}
            </div>
          ) : movies.length > 0 ? (
            /* Movie Cards Grid */
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
              {movies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onOpenDetails={(m) => setSelectedMovie(m)}
                  onStatusChange={handleStatusChange}
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
                    No movies yet
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
                    Import Movie
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-base font-semibold text-white">
                    No movies found
                  </h3>
                  <p className="mt-1 max-w-sm text-xs text-neutral-400">
                    No movies matched your current search and filter criteria.
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

      {/* Footer */}
      <footer className="mt-auto border-t border-neutral-800/80 bg-[#1C1C1C] py-6 text-center text-xs text-neutral-400">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6">
          <p>© {new Date().getFullYear()} Movie Watchlist Manager. All rights reserved.</p>
          <p className="text-[11px] text-neutral-400">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
        </div>
      </footer>

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
    </div>
  );
}
